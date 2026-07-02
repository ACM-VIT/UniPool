// Edge middleware: rewrites the document <head> so every surface — domain
// landings, destination hubs, best-route pages, and individual shared
// rides — gets its own Open Graph / Twitter card, without shipping a
// server. It wraps the normal static response (index.html via the SPA
// fallback) and swaps the meta tags with HTMLRewriter, which streams and
// never buffers the whole body.
import { resolveOg, type OgMeta } from "./_lib/og";

const DEFAULT_API_BASE = "https://unidev.acmvit.in";

interface Env {
  API_BASE?: string;
}

// Only rewrite real HTML page navigations. Assets, the /app expo build
// (which owns its own head), the /og image function, and anything with a
// file extension pass straight through. The one exception under /app is the
// ride-detail page, which we enrich with per-ride OG so shared links (incl.
// external rides) get a real card.
function isPageRequest(path: string): boolean {
  if (path.startsWith("/app/ride/") || path.startsWith("/app/r/")) return true;
  if (
    path.startsWith("/app") ||
    path.startsWith("/og") ||
    path.startsWith("/assets/") ||
    path.startsWith("/brand/") ||
    path.startsWith("/_expo/") ||
    path.startsWith("/.well-known")
  ) {
    return false;
  }
  if (/\.[a-z0-9]+$/i.test(path)) return false; // has a file extension
  return true;
}

const setContent = (value: string) => ({
  element(el: Element) {
    el.setAttribute("content", value);
  },
});

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The /app expo shell ships no OG tags (only a <title>), so there's nothing to
// modify in place — append a fresh, self-contained set to <head> instead.
function rewriteAppend(res: Response, og: OgMeta, origin: string): Response {
  const image = og.image.startsWith("http") ? og.image : `${origin}${og.image}`;
  const block = [
    `<meta name="description" content="${esc(og.description)}" />`,
    `<meta property="og:title" content="${esc(og.title)}" />`,
    `<meta property="og:description" content="${esc(og.description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${esc(og.canonical)}" />`,
    `<meta property="og:type" content="${og.type}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(og.title)}" />`,
    `<meta name="twitter:description" content="${esc(og.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<link rel="canonical" href="${esc(og.canonical)}" />`,
  ].join("");
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(og.title);
      },
    })
    .on("head", {
      element(el) {
        el.append(block, { html: true });
      },
    })
    .transform(res);
}

function rewrite(res: Response, og: OgMeta, origin: string): Response {
  const image = og.image.startsWith("http") ? og.image : `${origin}${og.image}`;
  const canonicalSafe = og.canonical.replace(/"/g, "&quot;").replace(/</g, "&lt;");

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(og.title);
      },
    })
    .on('meta[name="description"]', setContent(og.description))
    .on('meta[property="og:title"]', setContent(og.title))
    .on('meta[property="og:description"]', setContent(og.description))
    .on('meta[property="og:image"]', setContent(image))
    .on('meta[property="og:url"]', setContent(og.canonical))
    .on('meta[property="og:type"]', setContent(og.type))
    .on('meta[name="twitter:title"]', setContent(og.title))
    .on('meta[name="twitter:description"]', setContent(og.description))
    .on('meta[name="twitter:image"]', setContent(image))
    // Canonical link isn't in the static template; add one per page.
    .on("head", {
      element(el) {
        el.append(`<link rel="canonical" href="${canonicalSafe}" />`, { html: true });
      },
    })
    .transform(res);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (request.method !== "GET" || !isPageRequest(url.pathname)) {
    return next();
  }

  // Resolve OG first so a slow/broken preview fetch can't block the page:
  // if resolution throws we just serve the untouched static response.
  let og: OgMeta | null = null;
  try {
    og = await resolveOg(url, env.API_BASE || DEFAULT_API_BASE);
  } catch {
    og = null;
  }

  const res = await next();
  if (!og) return res;

  // Marketing pages are always served as text/html. The /app SPA-fallback
  // shell can come back mislabelled (the extensionless _index target is served
  // as application/octet-stream in some environments), so there we trust
  // isPageRequest's path gate and normalise the type rather than skipping.
  const isApp = url.pathname.startsWith("/app");
  const ct = res.headers.get("content-type") || "";
  if (!isApp && !ct.includes("text/html")) return res;

  // The /app expo shell has no OG tags to modify, so append a fresh set;
  // the marketing template already ships them, so modify those in place.
  const out = isApp ? rewriteAppend(res, og, url.origin) : rewrite(res, og, url.origin);
  if (isApp) out.headers.set("content-type", "text/html; charset=utf-8");
  // Let social crawlers cache the rendered card briefly, but keep it fresh.
  out.headers.set("cache-control", "public, max-age=0, s-maxage=300");
  return out;
};
