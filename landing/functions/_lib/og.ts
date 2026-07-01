// Shared Open Graph resolver for the edge. Given the request host + path,
// returns the OG metadata for that surface (domain landing, destination
// hub, best-route page, or an individual ride). Used by the head-rewrite
// middleware. Image URLs point at pre-rendered static cards under
// /og/*.png (see scripts/gen-og.mjs).
//
// Data comes from the same modules the app renders from, so titles/routes
// never drift from the pages themselves.
import { DESTINATIONS } from "../../src/utils/destinations";
import { BEST_ROUTES } from "../../src/utils/routes";

export type OgMeta = {
  title: string;
  description: string;
  /** Path to a pre-rendered card under /og/*.png, or an absolute URL. */
  image: string;
  canonical: string;
  type: "website" | "article";
};

type DomainRole =
  | "main" | "to" | "today" | "download" | "click" | "best" | "wtf" | "taxi" | "lol";

const HOST_ROLES: Record<string, DomainRole> = {
  "unipool.to": "to",
  "unipool.today": "today",
  "unipool.download": "download",
  "unipool.click": "click",
  "unipool.best": "best",
  "unipool.wtf": "wtf",
  "unipool.taxi": "taxi",
  "unipool.lol": "lol",
};

const DEFAULT_DESC =
  "A campus carpool app built by students, for students. Find a verified ride, split the fare, and get there together.";

function roleForHost(host: string): DomainRole {
  const h = host.replace(/^www\./, "").toLowerCase();
  for (const [domain, role] of Object.entries(HOST_ROLES)) {
    if (h === domain || h.endsWith("." + domain)) return role;
  }
  return "main";
}

function shorten(s: string): string {
  return (s.split(",")[0] || "").trim() || s;
}

// Match a location string to a destination hub so a ride can reuse that
// hub's pre-rendered card (most shared rides go to/from a known hub).
function destImageForLocation(loc: string): string | null {
  const l = (loc || "").toLowerCase();
  const hit = DESTINATIONS.find(
    (d) => d.slug !== "home" && d.endTerms.some((t) => l.includes(t.toLowerCase())),
  );
  return hit ? `/og/dest-${hit.slug}.png` : null;
}

// Ride preview shape from GET /ride/preview/:id.
type RidePreview = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  seats_available: number;
  price_per_seat: number;
  host_first_name: string;
};

const RIDE_PREVIEW_TIMEOUT_MS = 1500;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return fmt.format(d);
  } catch {
    return "";
  }
}

async function rideOg(
  origin: string,
  id: string,
  apiBase: string,
): Promise<OgMeta> {
  const canonical = `${origin}/r/${id}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RIDE_PREVIEW_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBase}/ride/preview/${encodeURIComponent(id)}`, {
      cf: { cacheTtl: 120, cacheEverything: true },
      signal: controller.signal,
    } as RequestInit);
    if (res.ok) {
      const r = (await res.json()) as RidePreview;
      const from = shorten(r.start_location);
      const to = shorten(r.end_location);
      const when = formatWhen(r.start_time);
      const seats = Math.max(0, Math.floor(r.seats_available || 0));
      const seatLabel =
        seats <= 0 ? "Ride full" : `${seats} seat${seats === 1 ? "" : "s"} left`;
      const priceBit = r.price_per_seat ? `₹${r.price_per_seat}/seat` : "";
      const descParts = [when, priceBit, seatLabel].filter(Boolean);
      return {
        title: `${from} → ${to} · UniPool`,
        description: `${descParts.join(" · ")}. Hosted by ${
          r.host_first_name || "a student"
        }. Book this campus carpool on UniPool.`,
        image: destImageForLocation(to) || "/og/ride.png",
        canonical,
        type: "article",
      };
    }
  } catch {
    /* fall through to generic ride card */
  } finally {
    clearTimeout(timeout);
  }
  return {
    title: "Shared ride · UniPool",
    description:
      "Someone shared a campus carpool with you. Open UniPool to see the route, seats, and fare.",
    image: "/og/ride.png",
    canonical,
    type: "article",
  };
}

export async function resolveOg(
  url: URL,
  apiBase: string,
): Promise<OgMeta | null> {
  const origin = url.origin;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const seg = path.split("/").filter(Boolean); // ["r","abc"] etc.

  // Rides work on any domain (share links live at /r/:id and /ride/:id).
  if ((seg[0] === "r" || seg[0] === "ride") && seg[1]) {
    return rideOg(origin, seg[1], apiBase);
  }

  const role = roleForHost(url.hostname);

  if (role === "to") {
    if (seg.length === 0) {
      return {
        title: "Where to? · UniPool",
        description:
          "Pick a destination and see student carpools heading that way — Bangalore, Chennai airport, VIT, Katpadi and more.",
        image: "/og/to.png",
        canonical: `${origin}/`,
        type: "website",
      };
    }
    const dest = DESTINATIONS.find((d) => d.slug === seg[0]);
    if (dest) {
      return {
        title: `Rides to ${dest.name} · UniPool`,
        description: `Find student carpools to ${dest.name} (${dest.subtitle}). Typical fare ${dest.fareEstimate}. See live rides and split the fare on UniPool.`,
        image: `/og/dest-${dest.slug}.png`,
        canonical: `${origin}/${dest.slug}`,
        type: "website",
      };
    }
  }

  if (role === "best") {
    if (seg.length === 0) {
      return {
        title: "Best carpool routes · UniPool",
        description:
          "The most shared student carpool routes with typical fares, drive times, and live rides.",
        image: "/og/best.png",
        canonical: `${origin}/`,
        type: "website",
      };
    }
    const route = BEST_ROUTES.find((r) => r.slug === seg[0]);
    if (route) {
      return {
        title: `${route.from} → ${route.to} · UniPool`,
        description: `Carpool from ${route.from} to ${route.to}. ${route.tagline}. See typical fares, times, and live rides on UniPool.`,
        image: `/og/route-${route.slug}.png`,
        canonical: `${origin}/${route.slug}`,
        type: "website",
      };
    }
  }

  if (role === "today") {
    return {
      title: "Leaving today · UniPool",
      description:
        "Every student carpool departing today, updated live. Find a seat or post your own.",
      image: "/og/today.png",
      canonical: `${origin}/`,
      type: "website",
    };
  }

  if (role === "wtf") {
    return {
      title: "Support & safety · UniPool",
      description: "Report a problem, check safety info, or reach the UniPool team.",
      image: "/og/wtf.png",
      canonical: `${origin}/`,
      type: "website",
    };
  }

  if (role === "download") {
    return {
      title: "Get UniPool",
      description: "Download UniPool on the App Store or Google Play, or open it in your browser.",
      image: "/og/download.png",
      canonical: `${origin}/`,
      type: "website",
    };
  }

  if (role === "click" && seg.length > 0) {
    // Campaign slugs — a themed but generic card is fine.
    return {
      title: "UniPool",
      description: DEFAULT_DESC,
      image: "/og/main.png",
      canonical: `${origin}/${seg[0]}`,
      type: "website",
    };
  }

  // Main site: landing + the static content pages get a clean branded card.
  if (role === "main" || role === "taxi" || role === "lol" || role === "click" || role === "download") {
    return {
      title: "UniPool · Carpool with your campus",
      description: DEFAULT_DESC,
      image: "/og/main.png",
      canonical: `${origin}${path === "/" ? "/" : path}`,
      type: "website",
    };
  }

  // Unknown role/path — let the static index.html defaults stand.
  return null;
}
