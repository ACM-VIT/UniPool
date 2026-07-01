import { Link } from "react-router-dom";
import RouteMini from "@/components/RouteMini";
import { useDocumentTitle } from "@/utils/useDocumentTitle";
import { BEST_ROUTES } from "@/utils/routes";

const ROUTES = BEST_ROUTES;

export { BEST_ROUTES };

export default function BestIndex() {
  useDocumentTitle(
    "Best carpool routes · UniPool",
    "The most shared student carpool routes: VIT to Chennai airport, VIT to Bangalore, and more. Typical fares, times, and live rides.",
  );
  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-10 sm:py-14">
      <div className="container-x max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Popular routes
        </h1>
        <p className="mt-2 text-[15px] text-forest/60">
          The rides students share most, with typical fares and times.
        </p>

        <ul className="mt-7 space-y-2.5">
          {ROUTES.map((route) => (
            <li key={route.slug}>
              <Link
                to={`/${route.slug}`}
                className="flex items-center gap-4 rounded-[20px] bg-white px-5 py-4 shadow-card transition active:scale-[0.99]"
              >
                <RouteMini className="min-w-0 flex-1" start={route.from} end={route.to} />
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 shrink-0 text-forest/25">
      <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
