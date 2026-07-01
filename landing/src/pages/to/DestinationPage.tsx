import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findDestination } from "@/utils/destinations";
import { rideLink, appLinkProps } from "@/config";
import RouteMini from "@/components/RouteMini";
import { useDocumentTitle } from "@/utils/useDocumentTitle";
import {
  type Ride,
  fetchUpcomingRides,
  ridesToDestination,
  fareRangeLabel,
  shortenLocation,
  firstName,
  seatsLabel,
  perSeat,
  dateAndTime,
} from "@/utils/rides";

export default function DestinationPage() {
  const { slug } = useParams<{ slug: string }>();
  const dest = slug ? findDestination(slug) : undefined;
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(
    dest ? `Rides to ${dest.name} · UniPool` : "UniPool",
    dest ? `Student carpools to ${dest.name}. ${dest.subtitle}. See upcoming rides, fares, and seats.` : undefined,
  );

  useEffect(() => {
    if (!dest || dest.endTerms.length === 0) { setLoading(false); return; }
    let cancelled = false;
    fetchUpcomingRides()
      .then((all) => {
        if (cancelled) return;
        setRides(ridesToDestination(all, dest.endTerms).slice(0, 6));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dest]);

  if (!dest) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-6 py-20">
        <div className="max-w-xs text-center">
          <h1 className="text-xl font-extrabold text-forest">Unknown destination</h1>
          <p className="mt-2 text-[14px] text-forest/50">No page for that route yet.</p>
          <Link to="/" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3 text-[15px] font-extrabold text-lime">
            All destinations
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-9 sm:py-12">
      <div className="container-x max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Rides to {dest.name}
        </h1>
        <p className="mt-2 text-[15px] text-forest/55">{dest.subtitle}</p>

        {(dest.distance || dest.fareEstimate || dest.popular) ? (
          <div className="mt-6 rounded-[20px] bg-white px-5 py-4 shadow-card">
            <div className="divide-y divide-forest/8 text-[14px]">
              {dest.distance ? <Row label="Distance" value={dest.distance} /> : null}
              {dest.fareEstimate ? (
                <Row
                  label="Typical fare"
                  value={fareRangeLabel(rides) ?? dest.fareEstimate}
                  hint={fareRangeLabel(rides) ? "per seat, live" : "per seat, estimate"}
                />
              ) : null}
              {dest.popular ? <Row label="Busiest" value={dest.popular} /> : null}
            </div>
          </div>
        ) : null}

        <h2 className="mb-3 mt-8 text-lg font-extrabold text-forest">Upcoming rides</h2>

        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-[ticket-pulse_1.4s_ease-in-out_infinite] rounded-[20px] bg-white p-5 shadow-card">
                <div className="h-3.5 w-40 rounded-full bg-forest/8" />
                <div className="mt-4 h-3 w-24 rounded-full bg-forest/8" />
              </div>
            ))}
          </div>
        ) : rides.length > 0 ? (
          <ul className="space-y-2.5">
            {rides.map((ride) => (
              <li key={ride.id}>
                <a
                  href={rideLink(ride.id)}
                  className="block rounded-[20px] bg-white px-5 py-4 shadow-card transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <RouteMini
                      className="min-w-0 flex-1"
                      start={shortenLocation(ride.start_location)}
                      end={shortenLocation(ride.end_location)}
                    />
                    <div className="shrink-0 text-right">
                      <p className="text-[14px] font-extrabold text-forest">{dateAndTime(ride.start_time)}</p>
                      <p className="mt-0.5 text-[13px] text-forest/50">₹{perSeat(ride)} pp</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] text-forest/45">
                    Hosted by {firstName(ride.host_user_name)} · {seatsLabel(ride)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[20px] bg-white px-6 py-9 text-center shadow-card">
            <p className="text-[15px] font-extrabold text-forest">No rides to {dest.name} yet</p>
            <p className="mt-1 text-[13px] text-forest/45">Post the first one and others can join.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <a {...appLinkProps("search")} className="flex items-center justify-center rounded-2xl bg-forest px-5 py-3.5 text-[15px] font-extrabold text-lime transition active:scale-[0.98]">
            Find a ride
          </a>
          <a {...appLinkProps("post")} className="flex items-center justify-center rounded-2xl bg-white px-5 py-3.5 text-[15px] font-extrabold text-forest shadow-card transition active:scale-[0.98]">
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
      <span className="text-forest/50">{label}</span>
      <span className="text-right">
        <span className="block font-bold text-forest">{value}</span>
        {hint ? <span className="block text-[11px] text-forest/40">{hint}</span> : null}
      </span>
    </div>
  );
}
