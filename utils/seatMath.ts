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
 * Screens that gate bookings, show seats left, or compute per-seat fare should
 * use this module so the frontend stays aligned with backend seat arithmetic.
 */

/** Smallest legal total_seats value: host plus one passenger. */
export const MIN_TOTAL_SEATS = 2;

/** UI sanity cap for total_seats. Matches backend MaxTotalSeats. */
export const MAX_TOTAL_SEATS = 20;

/**
 * Returns how many passenger seats a ride has, given total_seats.
 * Always non-negative; a row with total_seats=0 reads as no
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
 * Per-person fare for a ride, given the total trip cost.
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
 * "X/Y" seat availability string for ride cards.
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
 * Compact seat availability label for tight spaces.
 */
function seatsLeftLabel(
  totalSeats: number,
  bookedSeats: number,
): string {
  const left = passengerSeatsLeft(totalSeats, bookedSeats);
  if (left <= 0) return "Full";
  return `${left} seat${left === 1 ? "" : "s"} left`;
}
