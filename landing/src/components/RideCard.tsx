// Ride card for the destination/route hubs, matching the app's web ride card
// (components/web/RideResultCard.tsx): a cream tile floating on the lime
// canvas, leading with date + a lime price pill (or a muted "Ask host" chip
// for off-platform rides that carry no set fare), the app's dot→square route
// stack, a host avatar, and the little vehicle tucked into the corner.

// Vehicle by seat count, mirroring the app's getVehicle(). The PNGs are
// 254×271 with transparent padding top/bottom, so we render them oversized and
// let the card's overflow-hidden clip the wheels flush to the bottom edge.
function vehicleFor(seats: number): string {
  if (seats <= 2) return "/vehicles/motorcycle.png";
  if (seats === 3) return "/vehicles/taxi.png";
  if (seats === 4) return "/vehicles/racer.png";
  if (seats < 8) return "/vehicles/wagon.png";
  if (seats < 11) return "/vehicles/foodvan.png";
  return "/vehicles/bus.png";
}

export type RideCardProps = {
  href: string;
  origin: string;
  destination: string;
  dayLabel: string; // "Sat, 4 Jul"
  timeLabel: string; // "8:00 am"
  seatsLabel: string; // "2 seats left" / "Full"
  /** Per-seat fare, or null for off-platform rides with no set fare. */
  price: number | null;
  hostName: string;
  seats: number;
};

export default function RideCard({
  href,
  origin,
  destination,
  dayLabel,
  timeLabel,
  seatsLabel,
  price,
  hostName,
  seats,
}: RideCardProps) {
  const host = (hostName || "").trim();
  return (
    <a
      href={href}
      className="group relative block overflow-hidden rounded-[20px] border border-forest/10 bg-cream p-5 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-forest/20"
    >
      {/* Decorative vehicle. A 138×74 window with the oversized art pushed
          down (bottom -42) clips the wheels flush to the card — same trick as
          the app's RideResultCard vehicleWrap. */}
      <div className="pointer-events-none absolute bottom-0 right-0.5 h-[74px] w-[138px] overflow-hidden">
        <img
          src={vehicleFor(seats)}
          alt=""
          aria-hidden
          className="absolute -bottom-[42px] right-0 h-[146px] w-[138px] select-none object-contain"
        />
      </div>

      {/* Date + price/seats */}
      <div className="relative flex items-start justify-between gap-3">
        <p className="pt-1 text-[13.5px] font-bold text-forest/55">
          {dayLabel} · {timeLabel}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {typeof price === "number" ? (
            <span className="flex h-9 items-center rounded-full bg-lime px-3.5">
              <span className="text-[13px] font-extrabold text-forest">₹</span>
              <span className="text-[18px] font-extrabold leading-none tracking-[-0.01em] text-forest">{price}</span>
              <span className="ml-0.5 text-[11.5px] font-bold text-forest/70">/seat</span>
            </span>
          ) : (
            <span className="flex h-9 items-center rounded-full bg-forest/[0.08] px-3.5 text-[13px] font-bold text-forest/70">
              Ask host
            </span>
          )}
          <span className="text-[12.5px] font-bold text-midolive">{seatsLabel}</span>
        </div>
      </div>

      {/* Route stack: outlined dot → connecting line → filled square. Sits
          above the vehicle (later in the DOM), so labels stay readable and use
          the full width, truncating only when genuinely long — like the app. */}
      <div className="relative mt-4">
        <span className="absolute bottom-[9px] left-[5px] top-[9px] w-0.5 bg-forest/25" />
        <div className="flex items-center gap-3.5">
          <span className="h-[11px] w-[11px] shrink-0 rounded-full border-[3px] border-forest bg-cream" />
          <span className="truncate text-[16px] font-bold tracking-[-0.01em] text-forest">{origin}</span>
        </div>
        <div className="mt-4 flex items-center gap-3.5">
          <span className="ml-[1px] h-2.5 w-2.5 shrink-0 rounded-[2px] bg-forest" />
          <span className="truncate text-[16px] font-bold tracking-[-0.01em] text-forest">{destination}</span>
        </div>
      </div>

      {/* Host */}
      <div className="relative mt-4 flex items-center gap-2.5 border-t border-forest/10 pt-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-[12px] font-extrabold text-lime">
          {(host || "U").charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-[13.5px] font-semibold text-forest/90">{host || "Student host"}</span>
      </div>
    </a>
  );
}
