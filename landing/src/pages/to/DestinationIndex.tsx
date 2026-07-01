import { Link } from "react-router-dom";
import { DESTINATIONS } from "@/utils/destinations";
import { appLinkProps } from "@/config";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

export default function DestinationIndex() {
  useDocumentTitle(
    "Where to? · UniPool",
    "Pick a destination and see student carpools heading that way. Bangalore, Chennai airport, VIT, Katpadi and more.",
  );
  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-10 sm:py-14">
      <div className="container-x max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Where to?
        </h1>
        <p className="mt-2 text-[15px] text-forest/60">
          Pick a destination. See who's heading that way.
        </p>

        <div className="mt-7 space-y-2.5">
          {DESTINATIONS.filter((d) => d.slug !== "home").map((dest) => (
            <Link
              key={dest.slug}
              to={`/${dest.slug}`}
              className="flex items-center gap-3.5 rounded-[20px] bg-white px-4 py-4 shadow-card transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime/25 text-[13px] font-extrabold text-forest">
                {dest.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold text-forest">
                  {dest.name}
                </span>
                <span className="mt-0.5 block text-[13px] text-forest/50">
                  {dest.subtitle}
                </span>
              </span>
              <Chevron />
            </Link>
          ))}
        </div>

        <div className="mt-7 rounded-[20px] bg-forest px-6 py-7 text-center">
          <p className="text-lg font-extrabold text-cream">Going somewhere else?</p>
          <p className="mx-auto mt-1 max-w-[15rem] text-[13px] text-cream/55">
            Search any route inside the app.
          </p>
          <a
            {...appLinkProps()}
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-lime px-6 py-3 text-[15px] font-extrabold text-forest transition active:scale-[0.98]"
          >
            Open UniPool
          </a>
        </div>
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
