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
// file extension pass straight through.
function isPageRequest(path: string): boolean {
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
  const ct = res.headers.get("content-type") || "";
  if (!og || !ct.includes("text/html")) return res;

  const out = rewrite(res, og, url.origin);
  // Let social crawlers cache the rendered card briefly, but keep it fresh.
  out.headers.set("cache-control", "public, max-age=0, s-maxage=300");
  return out;
};
