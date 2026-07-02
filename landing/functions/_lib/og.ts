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

// Ride preview shape from GET /ride/preview/:id (internal rides).
type RidePreview = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  seats_available: number;
  price_per_seat: number;
  host_first_name: string;
};

// External-ride preview shape from GET /external/preview/:id. Off-platform
// rides carry no set fare and a full "Name 24XYZ0000" host string.
type ExternalPreview = {
  id: string;
  pickup_point: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  host_name: string;
};

// What both preview shapes boil down to for a card.
type RideFacts = {
  from: string;
  to: string;
  when: string;
  seats: number;
  price: number | null;
  host: string;
};

const RIDE_PREVIEW_TIMEOUT_MS = 1500;

// External host names carry a VIT registration suffix ("Subhi Garg 24BCE0907").
// Strip it and take the first name so the card reads like an internal ride
// ("Hosted by Subhi"), matching the app's ExternalRideCard.
function firstNameFromHost(name: string): string {
  const stripped = (name || "").replace(/\s+\d{2}[A-Z]{3}\d{4,}$/, "").trim();
  return (stripped.split(/\s+/)[0] || "").trim();
}

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

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(url, {
    cf: { cacheTtl: 120, cacheEverything: true },
    signal,
  } as RequestInit);
  return res.ok ? ((await res.json()) as T) : null;
}

async function internalFacts(apiBase: string, id: string, signal: AbortSignal): Promise<RideFacts | null> {
  const r = await fetchJson<RidePreview>(`${apiBase}/ride/preview/${encodeURIComponent(id)}`, signal);
  if (!r) return null;
  return {
    from: shorten(r.start_location),
    to: shorten(r.end_location),
    when: formatWhen(r.start_time),
    seats: Math.max(0, Math.floor(r.seats_available || 0)),
    price: r.price_per_seat || null,
    host: (r.host_first_name || "").trim(),
  };
}

async function externalFacts(apiBase: string, id: string, signal: AbortSignal): Promise<RideFacts | null> {
  const r = await fetchJson<ExternalPreview>(`${apiBase}/external/preview/${encodeURIComponent(id)}`, signal);
  if (!r) return null;
  return {
    from: shorten(r.pickup_point),
    to: shorten(r.destination),
    when: formatWhen(r.departure_time),
    seats: Math.max(0, Math.floor(r.available_seats || 0)),
    price: null, // external rides have no set fare
    host: firstNameFromHost(r.host_name),
  };
}

// Internal ride ids are UUIDs (dashed); external ids are Firebase push ids
// (no dashes). Try the likely endpoint first, fall back to the other so a
// misclassified id still resolves.
async function rideFacts(apiBase: string, id: string, signal: AbortSignal): Promise<RideFacts | null> {
  const lookups = id.includes("-")
    ? [internalFacts, externalFacts]
    : [externalFacts, internalFacts];
  for (const lookup of lookups) {
    try {
      const facts = await lookup(apiBase, id, signal);
      if (facts) return facts;
    } catch {
      /* try the next source */
    }
  }
  return null;
}

async function rideOg(id: string, apiBase: string, canonical: string): Promise<OgMeta> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RIDE_PREVIEW_TIMEOUT_MS);
  try {
    const facts = await rideFacts(apiBase, id, controller.signal);
    if (facts) {
      const seatLabel =
        facts.seats <= 0 ? "Ride full" : `${facts.seats} seat${facts.seats === 1 ? "" : "s"} left`;
      const priceBit = facts.price ? `₹${facts.price}/seat` : "";
      const descParts = [facts.when, priceBit, seatLabel].filter(Boolean);
      return {
        title: `${facts.from} → ${facts.to} · UniPool`,
        description: `${descParts.join(" · ")}. Hosted by ${
          facts.host || "a student"
        }. Book this campus carpool on UniPool.`,
        image: destImageForLocation(facts.to) || "/og/ride.png",
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

  // Rides work on any domain: short links at /r/:id and /ride/:id, and the
  // same ride-detail page mounted under the /app expo build at /app/ride/:id.
  if ((seg[0] === "r" || seg[0] === "ride") && seg[1]) {
    return rideOg(seg[1], apiBase, `${origin}/r/${seg[1]}`);
  }
  if (seg[0] === "app" && (seg[1] === "ride" || seg[1] === "r") && seg[2]) {
    return rideOg(seg[2], apiBase, `${origin}/app/ride/${seg[2]}`);
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
