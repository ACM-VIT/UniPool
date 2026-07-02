import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findDestination, destSearchTerm } from "@/utils/destinations";
import { rideLink, appLinkProps, WEBAPP_URL } from "@/config";
import RideCard from "@/components/RideCard";
import { useDocumentTitle } from "@/utils/useDocumentTitle";
import {
  type Ride,
  type ExternalRide,
  fetchUpcoming,
  ridesToDestination,
  externalsToDestination,
  fareRangeLabel,
  shortenLocation,
  firstName,
  stripReg,
  seatsLabel,
  externalSeatsLabel,
  perSeat,
  dayLabel,
  clockLabel,
} from "@/utils/rides";

// One list item, normalised from either a first-party or external ride so the
// two interleave by departure time in a single grid.
type Item = {
  id: string;
  href: string;
  origin: string;
  destination: string;
  timeMs: number;
  day: string;
  time: string;
  seats: string;
  price: number | null;
  host: string;
  seatCount: number;
};

export default function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const dest = slug ? findDestination(slug) : undefined;
  const [rides, setRides] = useState<Ride[]>([]);
  const [external, setExternal] = useState<ExternalRide[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(
    dest ? `Rides to ${dest.name} · UniPool` : "UniPool",
    dest ? `Student carpools to ${dest.name}. ${dest.subtitle}. See upcoming rides, fares, and seats.` : undefined,
  );

  useEffect(() => {
    if (!dest || dest.endTerms.length === 0) { setLoading(false); return; }
    let cancelled = false;
    fetchUpcoming()
      .then(({ rides, external }) => {
        if (cancelled) return;
        setRides(ridesToDestination(rides, dest.endTerms));
        setExternal(externalsToDestination(external, dest.endTerms));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dest]);

  const items = useMemo<Item[]>(() => {
    const fromRides: Item[] = rides.map((r) => ({
      id: r.id,
      href: rideLink(r.id),
      origin: shortenLocation(r.start_location),
      destination: shortenLocation(r.end_location),
      timeMs: new Date(r.start_time).getTime(),
      day: dayLabel(r.start_time),
      time: clockLabel(r.start_time),
      seats: seatsLabel(r),
      price: perSeat(r) || null,
      host: firstName(r.host_user_name),
      seatCount: r.total_seats,
    }));
    const fromExternal: Item[] = external.map((e) => ({
      id: e.id,
      href: `${WEBAPP_URL}/ride/${e.id}`,
      origin: shortenLocation(e.pickup_point),
      destination: shortenLocation(e.destination),
      timeMs: new Date(e.departure_time).getTime(),
      day: dayLabel(e.departure_time),
      time: clockLabel(e.departure_time),
      seats: externalSeatsLabel(e),
      price: null, // external rides carry no set fare
      host: firstName(stripReg(e.host_name)),
      seatCount: e.total_seats,
    }));
    return [...fromRides, ...fromExternal].sort((a, b) => a.timeMs - b.timeMs).slice(0, 8);
  }, [rides, external]);

  if (!dest) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-lime px-6 py-20">
        <div className="max-w-xs text-center">
          <h1 className="text-xl font-extrabold text-forest">Unknown destination</h1>
          <p className="mt-2 text-[14px] text-forest/55">No page for that route yet.</p>
          <Link to="/" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3 text-[15px] font-extrabold text-lime">
            All destinations
          </Link>
        </div>
      </section>
    );
  }

  const liveFare = fareRangeLabel(rides);

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-lime px-6 py-9 sm:py-12">
      <div className="container-x max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Rides to {dest.name}
        </h1>
        <p className="mt-2 text-[15px] font-medium text-forest/60">{dest.subtitle}</p>

        {(dest.distance || dest.fareEstimate || dest.popular) ? (
          <div className="mt-6 rounded-[20px] border border-forest/10 bg-cream px-5 py-4 shadow-card">
            <div className="divide-y divide-forest/10 text-[14px]">
              {dest.distance ? <Row label="Distance" value={dest.distance} /> : null}
              {dest.fareEstimate ? (
                <Row
                  label="Typical fare"
                  value={liveFare ?? dest.fareEstimate}
                  hint={liveFare ? "per seat, live" : "per seat, estimate"}
                />
              ) : null}
              {dest.popular ? <Row label="Busiest" value={dest.popular} /> : null}
            </div>
          </div>
        ) : null}

        <h2 className="mb-3 mt-8 text-lg font-extrabold text-forest">Upcoming rides</h2>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-[ticket-pulse_1.4s_ease-in-out_infinite] rounded-[20px] border border-forest/10 bg-cream p-5 shadow-card">
                <div className="h-3.5 w-40 rounded-full bg-forest/10" />
                <div className="mt-5 h-4 w-52 rounded-full bg-forest/10" />
                <div className="mt-3 h-4 w-44 rounded-full bg-forest/10" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <RideCard
                  href={item.href}
                  origin={item.origin}
                  destination={item.destination}
                  dayLabel={item.day}
                  timeLabel={item.time}
                  seatsLabel={item.seats}
                  price={item.price}
                  hostName={item.host}
                  seats={item.seatCount}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[20px] border border-forest/10 bg-cream px-6 py-9 text-center shadow-card">
            <p className="text-[15px] font-extrabold text-forest">No rides to {dest.name} yet</p>
            <p className="mt-1 text-[13px] text-forest/50">Post the first one and others can join.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <a
            href={`${WEBAPP_URL}/search?toLocation=${encodeURIComponent(destSearchTerm(dest))}`}
            className="flex items-center justify-center rounded-2xl bg-forest px-5 py-3.5 text-[15px] font-extrabold text-lime transition hover:bg-forest-700 active:scale-[0.98]"
          >
            Find a ride
          </a>
          <a {...appLinkProps("post")} className="flex items-center justify-center rounded-2xl border border-forest/10 bg-cream px-5 py-3.5 text-[15px] font-extrabold text-forest shadow-card transition hover:border-forest/20 active:scale-[0.98]">
            Post a ride
          </a>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <span className="text-forest/55">{label}</span>
      <span className="text-right">
        <span className="block font-bold text-forest">{value}</span>
        {hint ? <span className="block text-[11px] text-forest/45">{hint}</span> : null}
      </span>
    </div>
  );
}
