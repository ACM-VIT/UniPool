/**
 * Single source of truth for seat semantics across the UniPool
 * frontend. Mirrors `helpers/seats.go` on the backend.
 *
 * Contract (as of backend migration 00004_seats_include_host):
 *
 *   total_seats   total people in the car, host + passengers
 *   booked_seats  confirmed passenger bookings only (host never
 *                 counted)
 *
 *   passenger capacity      = total_seats - 1
 *   seats left for booking  = (total_seats - 1) - booked_seats
 *   per-person fare         = total_fare / total_seats
 *                             (host pays this from their own pocket;
 *                              passengers reimburse the rest)
 *
 * Every screen that gates a booking, shows "X seats left", or
 * computes a per-seat split MUST go through this module. The
 * pre-migration codebase had four different inline "passengers
 * left" formulas spread across CreateRide, RideDetails,
 * AvailableRideScreen and BookingScreen, which made the
 * total_seats-includes-host migration a 30-touch search-and-replace
 * instead of a one-import diff. Don't drift back into that.
 */

/** Smallest legal value for a new ride's total_seats — host + one
 *  passenger. Smaller than this means no passenger slot to offer. */
export const MIN_TOTAL_SEATS = 2;

/** Sanity cap on total_seats. Matches the backend's MaxTotalSeats.
 *  Set at 20 so the stepper covers everything from a hatchback up to
 *  a full-size Tempo Traveller / minibus (driver + ~19 passengers).
 *  20 is also the threshold at which CreateRide swaps the vehicle
 *  art over to the UFO Easter-egg fallback, so it's the largest
 *  count that still maps to a real-vehicle image. */
export const MAX_TOTAL_SEATS = 20;

/**
 * Returns how many passenger seats a ride has, given total_seats.
 * Always non-negative — a row with total_seats=0 reads as no
 * passenger capacity rather than -1.
 */
export function passengerCapacity(totalSeats: number): number {
  if (!Number.isFinite(totalSeats) || totalSeats < 1) return 0;
  return Math.max(0, Math.floor(totalSeats) - 1);
}

/**
 * Passenger seats still available for booking. Clamped at zero so
 * a row with `booked_seats > capacity` (shouldn't happen, but be
 * defensive) reads as full rather than negative.
 */
export function passengerSeatsLeft(
  totalSeats: number,
  bookedSeats: number,
): number {
  const cap = passengerCapacity(totalSeats);
  const booked = Math.max(0, Math.floor(bookedSeats || 0));
  return Math.max(0, cap - booked);
}

/**
 * `true` iff at least one passenger slot is still bookable. Use this
 * as the gate before any "Request seat" CTA renders.
 */
export function hasSeatsLeft(
  totalSeats: number,
  bookedSeats: number,
): boolean {
  return passengerSeatsLeft(totalSeats, bookedSeats) > 0;
}

/**
 * The per-seat fare for a ride, given the total trip cost. Every
 * person in the car — host AND passengers — pays this amount. The
 * value stored on the booking (total_price) is what each PASSENGER
 * pays; the host's share is implicit (they fund it from their
 * pocket and get reimbursed by passengers at the same rate).
 */
export function perSeatFare(
  totalFare: number,
  totalSeats: number,
): number {
  if (!Number.isFinite(totalFare) || !Number.isFinite(totalSeats)) return 0;
  if (totalSeats <= 0) return 0;
  return Math.round(totalFare / totalSeats);
}

/**
 * "X / Y seats" string used on ride cards. X = seats left for the
 * viewer to book; Y = total passenger seats (excludes the host
 * driver's seat). Wrapped in this helper so the format is
 * consistent everywhere — pre-migration the codebase had three
 * subtly different versions ("3/4 seats", "3 of 4", "3 seats left").
 */
export function seatsAvailableLabel(
  totalSeats: number,
  bookedSeats: number,
): string {
  const left = passengerSeatsLeft(totalSeats, bookedSeats);
  const cap = passengerCapacity(totalSeats);
  return `${left}/${cap}`;
}

/**
 * "3 seats left", "1 seat left", "Full". Used where space is tight
 * and the "X/Y" form is too noisy. Always says "seats" (plural form
 * adjusted for 1) so the meaning is unambiguous.
 */
export function seatsLeftLabel(
  totalSeats: number,
  bookedSeats: number,
): string {
  const left = passengerSeatsLeft(totalSeats, bookedSeats);
  if (left <= 0) return "Full";
  return `${left} seat${left === 1 ? "" : "s"} left`;
}
