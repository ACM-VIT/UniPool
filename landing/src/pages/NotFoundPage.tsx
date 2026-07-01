import { Link } from "react-router-dom";

// 404. Restrained, not theatrical. Forest "404" instead of giant
// lime so the page doesn't shout. Single CTA back home, a quiet
// secondary link to the FAQ.
export default function NotFoundPage() {
  return (
    <section className="py-28 sm:py-36">
      <div className="container-x text-center text-forest">
        <p className="text-7xl font-extrabold leading-none tracking-tight text-forest sm:text-8xl">
          404
        </p>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          We can't find that page.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-base text-forest/60">
          The link might be from an old build, or the page may have
          moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-forest px-7 py-3 text-sm font-bold text-lime transition hover:bg-forest-700"
          >
            Back to UniPool
          </Link>
          <Link
            to="/faq"
            className="text-sm font-semibold text-forest/55 hover:text-forest"
          >
            Read the FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
