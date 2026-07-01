import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BEST_ROUTES } from "./BestIndex";
import { appLinkProps } from "@/config";
import RouteMini from "@/components/RouteMini";
import { useDocumentTitle } from "@/utils/useDocumentTitle";
import { type Ride, fetchUpcomingRides, ridesOnRoute, fareRangeLabel } from "@/utils/rides";

// Distance and drive time are geographic facts (accurate estimates by
// road). `fareEstimate` is only a fallback when there are no live rides
// to derive a real per-seat range from — see the live `fareRangeLabel`
// wired into the component below.
const ROUTE_DATA: Record<
  string,
  { distance: string; fareEstimate: string; duration: string; tips: string }
> = {
  "vit-to-chennai-airport": {
    distance: "~135 km",
    fareEstimate: "₹200 to ₹350",
    duration: "2.5 to 3.5 hours",
    tips: "Rides fill fastest on Fridays before long weekends. Post early to lock a seat.",
  },
  "vit-to-bangalore": {
    distance: "~210 km",
    fareEstimate: "₹450 to ₹750",
    duration: "4 to 5 hours",
    tips: "NH48 via Ambur is the usual route. Friday evening departures are the most common.",
  },
  "vit-to-katpadi": {
    distance: "~8 km",
    fareEstimate: "₹20 to ₹40",
    duration: "15 to 20 minutes",
    tips: "Short ride, usually from the main gate. Busy on Sunday evenings.",
  },
  "vit-to-chennai": {
    distance: "~140 km",
    fareEstimate: "₹150 to ₹300",
    duration: "2.5 to 3 hours",
    tips: "Most rides drop at Chennai Central or Egmore. Tell the host your stop when you join.",
  },
  "chennai-airport-to-vit": {
    distance: "~135 km",
    fareEstimate: "₹200 to ₹350",
    duration: "2.5 to 3.5 hours",
    tips: "Share your landing time with the host. Most drivers wait 15 to 20 minutes.",
  },
  "bangalore-to-vit": {
    distance: "~210 km",
    fareEstimate: "₹450 to ₹750",
    duration: "4 to 5 hours",
    tips: "Sunday afternoon departures are the most popular slot for this direction.",
  },
};

export default function BestRoutePage() {
  const { slug } = useParams<{ slug: string }>();
  const route = BEST_ROUTES.find((r) => r.slug === slug);
  const data = slug ? ROUTE_DATA[slug] : undefined;
  const [routeRides, setRouteRides] = useState<Ride[] | null>(null);

  useDocumentTitle(
    route ? `${route.from} to ${route.to} carpool · UniPool` : "UniPool",
    route && data
      ? `Carpool from ${route.from} to ${route.to}. ${data.distance}, around ${data.duration}. See live rides and fares on UniPool.`
      : undefined,
  );

  useEffect(() => {
    if (!route) return;
    let cancelled = false;
    fetchUpcomingRides()
      .then((all) => {
        if (cancelled) return;
        setRouteRides(ridesOnRoute(all, route.startTerms, route.endTerms));
      })
      .catch(() => { if (!cancelled) setRouteRides([]); });
    return () => { cancelled = true; };
  }, [route]);

  const liveFare = routeRides ? fareRangeLabel(routeRides) : null;

  if (!route || !data) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-6 py-20">
        <div className="max-w-xs text-center">
          <h1 className="text-xl font-extrabold text-forest">Route not found</h1>
          <p className="mt-2 text-[14px] text-forest/50">No data for this route yet.</p>
          <Link to="/" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3 text-[15px] font-extrabold text-lime">
            All routes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-9 sm:py-12">
      <div className="container-x max-w-xl">
        <div className="rounded-[20px] bg-forest px-6 py-6">
          <RouteMini tone="dark" start={route.from} end={route.to} />
          <p className="mt-3 text-[13px] text-cream/55">{route.tagline}</p>
        </div>

        <div className="mt-5 rounded-[20px] bg-white px-5 py-4 shadow-card">
          <div className="divide-y divide-forest/8 text-[14px]">
            <Row label="Distance" value={data.distance} />
            <Row
              label="Typical fare"
              value={liveFare ?? data.fareEstimate}
              hint={liveFare ? "per seat, live" : "per seat, estimate"}
            />
            <Row label="Drive time" value={data.duration} />
            <Row label="Active rides" value={routeRides ? String(routeRides.length) : "—"} />
          </div>
        </div>

        <div className="mt-4 rounded-[20px] bg-white px-5 py-4 shadow-card">
          <p className="text-[13px] font-extrabold text-forest">Good to know</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-forest/65">{data.tips}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <a {...appLinkProps("search")} className="flex items-center justify-center rounded-2xl bg-forest px-5 py-3.5 text-[15px] font-extrabold text-lime transition active:scale-[0.98]">
            Find this ride
          </a>
          <a {...appLinkProps("post")} className="flex items-center justify-center rounded-2xl bg-white px-5 py-3.5 text-[15px] font-extrabold text-forest shadow-card transition active:scale-[0.98]">
            Post this ride
          </a>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <span className="text-forest/50">{label}</span>
      <span className="text-right">
        <span className="block font-bold text-forest">{value}</span>
        {hint ? <span className="block text-[11px] text-forest/40">{hint}</span> : null}
      </span>
    </div>
  );
}
