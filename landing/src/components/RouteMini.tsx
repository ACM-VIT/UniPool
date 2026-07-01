// The app's canonical route block, ported to the web: an outlined
// circle for the origin, a short column of vertical dashes, and a
// filled circle for the destination. Same idiom as RouteStack /
// RideCard / ActiveTripCard in the native app so a ride on the web
// reads identically to one in the app.
export default function RouteMini({
  start,
  end,
  tone = "light",
  className = "",
}: {
  start: string;
  end: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  // Explicit per-tone classes (no runtime string splitting) so Tailwind
  // sees every literal and the mapping stays obvious.
  const originBorder = tone === "dark" ? "border-lime" : "border-forest";
  const destFill = tone === "dark" ? "bg-lime" : "bg-forest";
  const dashFill = tone === "dark" ? "bg-lime/45" : "bg-forest/35";
  const textColor = tone === "dark" ? "text-cream" : "text-forest";

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className={`block h-3 w-3 shrink-0 rounded-full border-2 bg-transparent ${originBorder}`} />
        <span className={`truncate text-[15px] font-bold tracking-[-0.01em] ${textColor}`}>{start}</span>
      </div>
      <div className="my-1 ml-[5px] flex flex-col gap-[3px]">
        <span className={`block h-1.5 w-[2px] rounded-full ${dashFill}`} />
        <span className={`block h-1.5 w-[2px] rounded-full ${dashFill}`} />
        <span className={`block h-1.5 w-[2px] rounded-full ${dashFill}`} />
      </div>
      <div className="flex items-center gap-3">
        <span className={`block h-3 w-3 shrink-0 rounded-full ${destFill}`} />
        <span className={`truncate text-[15px] font-bold tracking-[-0.01em] ${textColor}`}>{end}</span>
      </div>
    </div>
  );
}
