import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { openInApp, WEBAPP_URL } from "@/config";
// QR rendered as a remote SVG image. Two reasons over a JS library:
//   1. Zero runtime dependency — survives lockfile cleanups and
//      keeps the website's prod bundle smaller.
//   2. `api.qrserver.com` lets us pin foreground/background colours,
//      so the code can be brand-tinted forest-on-cream instead of
//      stark black-on-white without a custom render path.
// Privacy note: the QR's payload is the same public share URL the
// recipient is already viewing in their address bar, so handing it
// to the QR service leaks nothing additional.
function buildQrSrc(text: string, size = 320): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: text,
    color: "263B33",
    bgcolor: "FFFDF4",
    margin: "0",
    qzone: "1",
    format: "svg",
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/**
 * Public API host. Same backend the mobile app talks to. The
 * `/ride/preview/:id` endpoint is the only public ride surface — it
 * returns a sanitised subset of the ride (route, time, seats, price,
 * host first name) so the share poster reads as a real ride without
 * leaking any of the gated PII /ride/details exposes to signed-in
 * callers.
 */
const API_BASE = "https://unidev.acmvit.in";

/**
 * Where deep links bounce back to. Mirrors `SHARE_HOST` inside the
 * in-app ShareRideSheet so the URL the QR encodes is the same string
 * the host saw when they shared.
 */
const SHARE_HOST = "https://unipool.acmvit.in";

// Store URLs. iOS shipped to the App Store (v2.0.10), so iOS visitors
// now get the App Store link instead of being dumped on Google Play.
const APP_STORE_URL = "https://apps.apple.com/app/id6756426249";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.carpoolitapp&hl=en_IN";

type RidePreview = {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  seats_available: number;
  total_price: number;
  price_per_seat: number;
  is_same_gender: boolean;
  host_first_name: string;
  host_institute_name?: string;
};

/**
 * Ride share landing — UniPool boarding pass.
 *
 * Design intent: the page IS the ticket. A single confident cream
 * card on the brand lime canvas, asymmetric two-column layout on
 * desktop (main info + right stub), stacked on mobile. The whole
 * surface speaks UniPool: a tiny leaf brand mark in the corner, the
 * UniPool wordmark sized like a logo, JetBrains Mono in the stub for
 * the airline-ticket data (route shorthand, ride id, price, seats),
 * and the destination set big and editorial as the hero. The QR
 * on the stub lets a recipient on a desktop scan with their phone
 * to open the deep link directly in the installed app.
 *
 * Behaviour:
 *   - On a phone, attempt to hand the URL off to the installed app
 *     (`unipool://ride/<id>` scheme jump). If the OS resolves the
 *     universal link first, the user never sees this page. If the
 *     app isn't installed, the deep-link no-ops silently and we
 *     reveal the full card after a 1.2s grace period.
 *   - On desktop, no auto-redirect — the card renders immediately
 *     so links shared into Slack / Discord / DMs preview properly.
 */
export default function SharePage() {
  const { rideId } = useParams<{ rideId: string }>();
  const [isMobile] = useState(detectMobile);
  const [isIOS] = useState(detectIOS);
  const [revealed, setRevealed] = useState(!isMobile);

  const [preview, setPreview] = useState<RidePreview | null>(null);
  const [previewError, setPreviewError] = useState<"not-found" | "network" | null>(null);

  useEffect(() => {
    if (!rideId) return;
    if (isMobile) {
      window.location.assign(`unipool://ride/${rideId}`);
      const t = setTimeout(() => setRevealed(true), 1200);
      return () => clearTimeout(t);
    }
  }, [rideId, isMobile]);

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    fetch(`${API_BASE}/ride/preview/${rideId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setPreviewError("not-found");
          return;
        }
        if (!res.ok) {
          setPreviewError("network");
          return;
        }
        const data = (await res.json()) as RidePreview;
        setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreviewError("network");
      });
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  if (!revealed) {
    return <Opening />;
  }

  return (
    <section className="relative bg-lime">

      <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        {previewError === "not-found" ? (
          <ErrorCard
            eyebrow="Ride not found"
            title="This ride is no longer available"
            body="It might have been cancelled, or the trip already happened."
            ctaLabel="Find another ride"
            ctaHref={WEBAPP_URL}
          />
        ) : preview ? (
          <BoardingPass
            ride={preview}
            rideId={rideId ?? preview.id}
            isMobile={isMobile}
            isIOS={isIOS}
          />
        ) : previewError === "network" ? (
          <ErrorCard
            eyebrow="Couldn't load"
            title="We can't reach UniPool right now"
            body="Check your connection and refresh the page."
          />
        ) : (
          <BoardingPassSkeleton />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// BoardingPass — the whole experience
// ---------------------------------------------------------------------
function BoardingPass({
  ride,
  rideId,
  isMobile,
  isIOS,
}: {
  ride: RidePreview;
  rideId: string;
  isMobile: boolean;
  isIOS: boolean;
}) {
  // Store fallback — App Store on iOS, Play Store everywhere else.
  const storeUrl = isIOS ? APP_STORE_URL : PLAY_STORE_URL;
  // `formatShareDate` left out here — the friendly weekday label is
  // not used in the compressed layout (the mono date stamp does the
  // job). Restore if a "Sat 23 May" line is added back.
  const timeLabel = useMemo(() => formatShareTime(ride.start_time), [ride.start_time]);
  const dateMono = useMemo(() => formatShareDateMono(ride.start_time), [ride.start_time]);

  const startDisplay = displayLocation(ride.start_location, "Pickup point");
  const endDisplay = displayLocation(ride.end_location, "Destination");

  // Airline-style route shorthand for the stub: first three letters
  // of each city name, all caps. "VEL → KAT" reads more confidently
  // than the full address strings on the right column.
  const routeCode = useMemo(
    () => `${cityCode(startDisplay)}  →  ${cityCode(endDisplay)}`,
    [startDisplay, endDisplay],
  );

  const rideCode = useMemo(() => {
    const hex = rideId.replace(/-/g, "").slice(0, 6).toUpperCase();
    return `UP-${hex}`;
  }, [rideId]);

  const deepLink = `${SHARE_HOST}/ride/${rideId}`;

  // Desktop can't run the native app, so its primary action opens the ride
  // in the web app (same origin, /app/ride/:id). Mobile tries the native
  // app via the onClick below, with the store as the no-JS href fallback.
  const webRideLink = `${WEBAPP_URL}/ride/${rideId}`;
  const ctaHref = isMobile ? storeUrl : webRideLink;
  const ctaLabel = isMobile ? "Open in UniPool" : "Open on web";

  const altActionHref = storeUrl;
  const altActionLabel = isMobile ? "Don't have the app yet?" : "Get the app";

  const hostBadgeName = ride.host_first_name || "A UniPool host";
  const hostInitial = (ride.host_first_name?.[0] || "U").toUpperCase();
  const passengerCapacity = Math.max(0, Math.floor(ride.total_seats || 0) - 1);
  const seatsValue = `${ride.seats_available}/${passengerCapacity}`;

  return (
    <article
      aria-label="Ride invitation"
      className="relative w-full max-w-[880px] overflow-visible"
    >
      <div className="relative grid grid-cols-1 overflow-hidden rounded-[24px] bg-cream shadow-[0_24px_60px_-28px_rgba(38,59,51,0.35)] md:grid-cols-[1fr_240px]">

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[240px] hidden w-px md:block"
        >
          <span className="absolute left-1/2 top-[-12px] z-10 h-6 w-6 -translate-x-1/2 rounded-full bg-lime" />
          <span className="absolute left-1/2 bottom-[-12px] z-10 h-6 w-6 -translate-x-1/2 rounded-full bg-lime" />
          <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 border-l border-dashed border-forest/25" />
        </div>

        <div className="relative px-6 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6 md:px-10 md:pt-8 md:pb-9">

          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold tracking-tight text-forest">
              UniPool
            </span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-forest/55">
              Boarding pass
            </span>
          </div>

          {/* Host badge — tight one-row sender card. */}
          <div className="mt-5 flex items-center gap-2.5">
            <span
              className="grid h-7 w-7 place-items-center rounded-full bg-forest text-[12px] font-black text-lime"
              aria-hidden
            >
              {hostInitial}
            </span>
            <p className="text-[13px] font-extrabold leading-tight text-forest">
              {hostBadgeName}
              {ride.host_institute_name ? (
                <span className="font-semibold text-forest/55">
                  {"  ·  "}
                  {ride.host_institute_name}
                </span>
              ) : null}
            </p>
          </div>

          <h1 className="mt-4 text-3xl font-black uppercase leading-[0.92] tracking-[-0.025em] text-forest sm:text-4xl md:text-[44px]">
            {shortenDestination(endDisplay)}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-forest/55 sm:text-base">
            via {ride.is_same_gender ? "same-gender " : ""}carpool from{" "}
            <span className="text-forest">{shortenDestination(startDisplay)}</span>
          </p>

          <div className="mt-5 h-px w-full bg-forest/10" />

          <div className="mt-4 grid grid-cols-3 gap-4 sm:gap-6">
            <Field label="Departs" value={timeLabel || "TBA"} sub={dateMono} />
            <Field
              label="Per seat"
              value={`₹${ride.price_per_seat}`}
              sub="per rider"
            />
            <Field
              label="Seats"
              value={seatsValue}
              sub={ride.seats_available === 0 ? "Full" : "Available"}
            />
          </div>

          {/* Route block — no inner card wrapper; sits on the
              cream surface as a hairline-divided block so it
              doesn't add a third visual layer. */}
          <div className="mt-4 border-t border-forest/10 pt-4">
            <RouteRow start={startDisplay} end={endDisplay} />
          </div>

          {/* CTA — single confident pill. Shorter than the original
              h-16 so the card stays one-screen-tall. */}
          <a
            href={ctaHref}
            onClick={
              isMobile
                ? (e) => {
                    e.preventDefault();
                    openInApp(`ride/${rideId}`);
                  }
                : undefined
            }
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-forest text-sm font-extrabold tracking-wide text-lime transition hover:bg-forest-700 active:scale-[0.99]"
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
          <a
            href={altActionHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center text-[12px] font-semibold text-forest/55 transition hover:text-forest"
          >
            {altActionLabel}
          </a>
        </div>

        {/* ----- STUB (desktop only) ----- */}
        <div className="hidden px-7 pb-7 pt-7 md:block md:px-7 md:pt-8 md:pb-8">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-forest/55">
            Ride
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-forest">{rideCode}</p>

          <p className="mt-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-forest/55">
            Route
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-forest">{routeCode}</p>

          <div className="mt-4">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-forest/55">
              Scan with phone
            </p>
            <div className="mt-2 inline-flex rounded-xl bg-cream p-2 shadow-[inset_0_0_0_1px_rgba(38,59,51,0.08)]">
              <img
                src={buildQrSrc(deepLink, 240)}
                alt="QR code for this ride"
                width={120}
                height={120}
                className="h-[120px] w-[120px]"
              />
            </div>
            <p className="mt-2 max-w-[170px] font-mono text-[9.5px] leading-relaxed text-forest/55">
              Opens this ride in UniPool on your phone.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-forest/55">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black leading-tight text-forest sm:text-xl">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 font-mono text-[10.5px] text-forest/55">{sub}</p>
      ) : null}
    </div>
  );
}

function RouteRow({ start, end }: { start: string; end: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="block h-3 w-3 shrink-0 rounded-full border-[2.5px] border-forest" />
        <p className="truncate text-[15px] font-bold text-forest">{start}</p>
      </div>
      <div className="ml-[5.5px] my-1 flex flex-col gap-[3px] py-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="block h-1.5 w-[2px] rounded-full bg-forest/40"
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <ArrowDiagonal className="ml-[-1px] shrink-0 text-forest" />
        <p className="truncate text-[15px] font-bold text-forest">{end}</p>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden className={className}>
      <path
        d="M3 9 H 14 M 10 5 L 14 9 L 10 13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDiagonal({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden className={className}>
      <path
        d="M3 15 L 14 4 M 14 4 H 6.5 M 14 4 V 11.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------
// State variants
// ---------------------------------------------------------------------

function BoardingPassSkeleton() {
  return (
    <div className="w-full max-w-[880px]" aria-busy aria-label="Loading ride">
      <div className="grid grid-cols-1 overflow-hidden rounded-[24px] bg-cream shadow-[0_24px_60px_-28px_rgba(38,59,51,0.35)] md:grid-cols-[1fr_240px]">
        <div className="animate-[ticket-pulse_1.4s_ease-in-out_infinite] space-y-4 px-6 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6 md:px-10 md:pt-8 md:pb-9">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-forest/15" />
            <div className="h-3 w-20 rounded-full bg-forest/15" />
          </div>
          <div className="h-6 w-44 rounded-full bg-forest/15" />
          <div className="h-9 w-3/4 rounded-full bg-forest/15" />
          <div className="h-px w-full bg-forest/10" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-2 w-12 rounded-full bg-forest/15" />
                <div className="h-5 w-16 rounded-full bg-forest/15" />
              </div>
            ))}
          </div>
          <div className="h-16 w-full rounded-xl bg-forest/10" />
          <div className="h-12 w-full rounded-full bg-forest/15" />
        </div>
        <div className="hidden animate-[ticket-pulse_1.4s_ease-in-out_infinite] space-y-3 md:block md:px-7 md:pt-8 md:pb-8">
          <div className="h-2.5 w-10 rounded-full bg-forest/15" />
          <div className="h-4 w-20 rounded-full bg-forest/15" />
          <div className="h-2.5 w-10 rounded-full bg-forest/15" />
          <div className="h-4 w-24 rounded-full bg-forest/15" />
          <div className="h-[136px] w-[136px] rounded-xl bg-forest/10" />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <article className="w-full max-w-[480px] rounded-[28px] bg-cream px-9 pb-10 pt-10 text-center shadow-[0_30px_80px_-30px_rgba(38,59,51,0.35)] sm:px-12 sm:pt-12">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-forest/55">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-[-0.02em] text-forest sm:text-4xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-base text-forest/60">{body}</p>
      {ctaLabel && ctaHref ? (
        <a
          href={ctaHref}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-forest px-6 text-sm font-extrabold tracking-wide text-lime transition hover:bg-forest-700"
        >
          {ctaLabel}
        </a>
      ) : null}
    </article>
  );
}

function Opening() {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-lime px-6">
      <div className="flex flex-col items-center gap-4 text-forest">
        <span
          aria-hidden
          className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-forest/20 border-t-forest"
        />
        <p className="text-base font-semibold">Opening UniPool…</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function formatShareTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Mono-friendly date stamp: "23 MAY 2026". Used in stub and footer.
function formatShareDateMono(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
  } catch {
    return "";
  }
}

// First non-empty word of a location, uppercased and trimmed to 3
// letters — gives the ticket stub an airline-style route code without
// needing a city-name dictionary. "Vellore Institute of Technology"
// → "VEL", "Katpadi Junction" → "KAT".
function cityCode(s: string): string {
  const first = (s.split(/[ ,]+/).find((w) => w.length > 0) || s).trim();
  return first.slice(0, 3).toUpperCase() || "—";
}

// Take the first comma-separated segment of an address — the
// editorial headline reads better with "Mumbai CSMT" than "Mumbai
// CSMT, Anik Wadala Road, Cotton Green, ...". Full string still
// shows inside the route block.
function shortenDestination(s: string): string {
  const first = (s.split(",")[0] || "").trim();
  return first || s;
}

// Title-case while preserving existing uppercase letters. Same helper
// the in-app RouteStack uses so the geocoder's lowercase city tails
// ("VIT University, vellore") read as "VIT University, Vellore" here
// too.
function titleCaseLocation(s: string): string {
  return s.replace(/(^|[\s,.'\-/(])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

// Swallow the legacy "Current location" literal that the app sends
// when the host didn't pick a specific pickup, and fall through to a
// nicer placeholder. Same pattern as `displayRideLocation` in the
// in-app codebase, ported inline so the website doesn't have to
// depend on it.
function displayLocation(value: string | null | undefined, fallback: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return fallback;
  if (/^current location$/i.test(trimmed)) return fallback;
  return titleCaseLocation(trimmed);
}

// SSR-safe mobile detection. Treats iPad as mobile too — Safari on
// iPadOS ships a desktop UA by default, so fall back to a touch-
// points check for that case.
function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
  const isTouchMac =
    /Mac/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return isTouchMac;
}

// iOS / iPadOS detection — used to send store fallbacks to the App
// Store rather than Google Play. iPadOS 13+ reports a Mac UA, so the
// touch-Mac heuristic is folded in here too.
function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return (
    /Mac/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1
  );
}
