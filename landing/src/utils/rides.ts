import { API_BASE } from "@/config";

export type Ride = {
  id: string;
  host_user_name: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  created_at?: string;
};

// The backend `/ride/search` text filter is a naive substring match on
// the stored location strings ("Bengaluru East City Corporation", not
// "Bangalore"), so filtering server-side by a friendly name misses
// most rides. Instead we pull a batch of upcoming rides once and match
// them against alias terms on the client.
export async function fetchUpcomingRides(limit = 50): Promise<Ride[]> {
  const params = new URLSearchParams({ limit: String(limit), sort_by: "time" });
  const res = await fetch(`${API_BASE}/ride/search?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  const rides: Ride[] = Array.isArray(data) ? data : data.rides || [];
  const now = Date.now();
  return rides.filter((r) => new Date(r.start_time).getTime() >= now);
}

function normalize(s: string): string {
  return (s || "").toLowerCase();
}

export function matchesTerms(location: string, terms: string[]): boolean {
  const l = normalize(location);
  return terms.some((t) => l.includes(t.toLowerCase()));
}

// A ride matches a destination when its end location hits one of the
// destination's alias terms.
export function ridesToDestination(rides: Ride[], endTerms: string[]): Ride[] {
  return rides.filter((r) => matchesTerms(r.end_location, endTerms));
}

// A ride matches a route when the start hits the start terms AND the
// end hits the end terms.
export function ridesOnRoute(
  rides: Ride[],
  startTerms: string[],
  endTerms: string[],
): Ride[] {
  return rides.filter(
    (r) => matchesTerms(r.start_location, startTerms) && matchesTerms(r.end_location, endTerms),
  );
}

export function shortenLocation(s: string): string {
  return (s.split(",")[0] || "").trim() || s;
}

export function firstName(s: string): string {
  return (s || "").trim().split(/\s+/)[0] || s;
}

// Passenger capacity excludes the host, so seats-left is
// (total_seats - 1) - booked_seats. Mirrors the app's
// seatMath.passengerSeatsLeft.
export function seatsLeft(ride: Ride): number {
  const cap = Math.max(0, Math.floor(ride.total_seats || 0) - 1);
  return Math.max(0, cap - (ride.booked_seats || 0));
}

export function isFull(ride: Ride): boolean {
  return seatsLeft(ride) <= 0;
}

// Per-person fare divides the total trip cost across EVERY seat
// including the host's (the host pays a share too). This matches the
// app's seatMath.perSeatFare exactly: round(total_fare / total_seats).
// Dividing by passenger count instead would overstate the fare.
export function perSeat(ride: Ride): number {
  const seats = Math.floor(ride.total_seats || 0);
  if (seats <= 0) return 0;
  return Math.round((ride.total_price || 0) / seats);
}

// "N seats left" / "1 seat left" / "Full", matching the app's label.
export function seatsLabel(ride: Ride): string {
  const left = seatsLeft(ride);
  if (left <= 0) return "Full";
  return `${left} seat${left === 1 ? "" : "s"} left`;
}

// Real per-seat fare range across a set of rides, e.g. "₹450" or
// "₹450 to ₹750". Returns null when there's nothing to compute from,
// so callers can fall back to a static estimate. This is what keeps
// the "typical fare" on the hub pages honest: it reflects what hosts
// are actually charging right now, not a guessed range.
export function fareRangeLabel(rides: Ride[]): string | null {
  const fares = rides.map(perSeat).filter((f) => f > 0);
  if (fares.length === 0) return null;
  const min = Math.min(...fares);
  const max = Math.max(...fares);
  return min === max ? `₹${min}` : `₹${min} to ₹${max}`;
}

export function timeOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function dateAndTime(iso: string): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${date}, ${time}`;
  } catch {
    return "";
  }
}
