// About. Forest canvas with three real iPhone screenshots from the
// app, each in a thin device frame with a small numbered caption.
// No eyebrow chip above the headline — the page IS the about page,
// the URL says so, the headline doesn't need a label on top of it.
const SCREENS = [
  {
    n: "01",
    src: "/shot-home.png",
    title: "Your campus, on a map",
    body: "Rides leaving near you, your next trip, and what you've booked — all on one home screen.",
  },
  {
    n: "02",
    src: "/shot-search.png",
    title: "Find a ride that fits",
    body: "Search by pickup and destination. Each result shows the host, fare, and walking distance.",
  },
  {
    n: "03",
    src: "/shot-pay.png",
    title: "Pay your share over UPI",
    body: "When the trip wraps, tap Pay on the active ride card. Your UPI app opens with the host's VPA filled in.",
  },
];

export default function AboutPage() {
  return (
    <section className="bg-forest pb-28 pt-20 text-cream sm:pb-36 sm:pt-28">
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          {/* `whitespace-nowrap` on the desktop breakpoint forces the
              headline to sit on one line — "Carpool with your campus"
              breaking after "your" was reading as a tagline-by-
              accident. Mobile keeps the natural wrap because there
              isn't horizontal room for the line. */}
          <h1 className="text-4xl font-extrabold tracking-tight text-cream sm:text-5xl md:whitespace-nowrap">
            Carpool with{" "}
            <span className="text-lime">your campus</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-cream/65 sm:text-lg">
            UniPool is a coordination tool for students who are
            heading the same way. Verifying your university email is
            optional, and unlocks the trust badge next to your name.
          </p>
        </div>

        <ul className="mx-auto mt-24 grid max-w-5xl gap-x-10 gap-y-20 lg:grid-cols-3">
          {SCREENS.map((s) => (
            <li key={s.src} className="flex flex-col items-center">
              <PhoneFrame src={s.src} alt={s.title} />
              <div className="mt-10 flex items-baseline gap-3">
                <span className="font-mono text-xs font-bold text-lime/55">
                  {s.n}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-cream">
                  {s.title}
                </h3>
              </div>
              <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-cream/60">
                {s.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Thin device frame around a real iPhone screenshot. Minimal bezel,
// no glowing halo (was reading as fake-glassy). A soft drop shadow
// below the device gives just enough lift on the forest canvas.
function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[200px]">
      <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[34px] bg-cream/8 p-[5px] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.55)] ring-1 ring-cream/10">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full rounded-[28px] object-cover"
        />
      </div>
    </div>
  );
}
