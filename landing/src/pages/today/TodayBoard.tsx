import { useCallback, useEffect, useState } from "react";
import RouteMini from "@/components/RouteMini";
import { useDocumentTitle } from "@/utils/useDocumentTitle";
import { appLinkProps, rideLink } from "@/config";
import {
  type Ride,
  fetchUpcomingRides,
  shortenLocation,
  firstName,
  seatsLabel,
  perSeat,
  timeOnly,
} from "@/utils/rides";

export default function TodayBoard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useDocumentTitle(
    "Leaving today · UniPool",
    "Every student carpool departing today, updated live. Find a seat or post your own.",
  );

  const refresh = useCallback(() => {
    setLoading(true);
    fetchUpcomingRides()
      .then((all) => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        setRides(all.filter((r) => new Date(r.start_time).getTime() <= end.getTime()));
        setLastRefresh(new Date());
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60_000);
    return () => clearInterval(iv);
  }, [refresh]);

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-9 sm:py-12">
      <div className="container-x max-w-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-500" />
          </span>
          <span className="text-[13px] font-bold text-forest/55">Updating live</span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Leaving today
        </h1>
        <p className="mt-2 text-[15px] text-forest/55">
          Every ride departing today, refreshed each minute.
        </p>

        <div className="mt-7">
          {loading && rides.length === 0 ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <RideSkeleton key={i} />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <EmptyToday />
          ) : (
            <ul className="space-y-2.5">
              {rides.map((ride) => (
                <li key={ride.id}>
                  <a
                    href={rideLink(ride.id)}
                    className="block rounded-[20px] bg-white px-5 py-4 shadow-card transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <RouteMini className="min-w-0 flex-1" start={shortenLocation(ride.start_location)} end={shortenLocation(ride.end_location)} />
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-extrabold text-forest">{timeOnly(ride.start_time)}</p>
                        <p className="mt-0.5 text-[13px] text-forest/50">₹{perSeat(ride)} pp</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] text-forest/45">
                      Hosted by {firstName(ride.host_user_name)} · {seatsLabel(ride)}
                      {ride.created_at && isRecent(ride.created_at) ? (
                        <span className="ml-2 font-bold text-accentorange">Just listed</span>
                      ) : null}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rides.length > 0 ? (
          <div className="mt-7 flex items-center justify-between">
            <a {...appLinkProps("post")} className="inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3 text-[15px] font-extrabold text-lime transition active:scale-[0.98]">
              Post a ride
            </a>
            {lastRefresh ? (
              <span className="text-[12px] text-forest/35">
                Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// Loading placeholder shaped like the real ride card (route on the left,
// time/price on the right, host line below) so the list resolves in place
// instead of a generic grey blob.
function RideSkeleton() {
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className="skeleton h-3 w-3 shrink-0 rounded-full" />
            <span className="skeleton h-3.5 w-28 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <span className="skeleton h-3 w-3 shrink-0 rounded-full" />
            <span className="skeleton h-3.5 w-40 rounded-full" />
          </div>
        </div>
        <div className="shrink-0 space-y-2">
          <span className="skeleton ml-auto block h-3.5 w-16 rounded-full" />
          <span className="skeleton ml-auto block h-3 w-12 rounded-full" />
        </div>
      </div>
      <div className="skeleton mt-4 h-3 w-44 rounded-full" />
    </div>
  );
}

// Empty board. Friendly, branded, and reassures that the board is live.
function EmptyToday() {
  return (
    <div className="rounded-[24px] bg-white px-6 py-12 text-center shadow-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime/25">
        <CarIcon />
      </div>
      <p className="mt-5 text-[18px] font-extrabold tracking-tight text-forest">
        Nothing leaving today, yet
      </p>
      <p className="mx-auto mt-1.5 max-w-[17rem] text-[14px] leading-relaxed text-forest/50">
        Be the first to post a ride for today. Anyone heading your way can hop in.
      </p>
      <a
        {...appLinkProps("post")}
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3 text-[15px] font-extrabold text-lime transition active:scale-[0.98]"
      >
        Post a ride
      </a>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-forest/35">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-500" />
        </span>
        Checking for new rides every minute
      </p>
    </div>
  );
}

function CarIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-forest"
      aria-hidden
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function isRecent(iso: string): boolean {
  try { return Date.now() - new Date(iso).getTime() < 30 * 60_000; } catch { return false; }
}
