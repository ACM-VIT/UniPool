import { Link } from "react-router-dom";
import { APP_STORE_URL, PLAY_STORE_URL, detectPlatform, storeUrlForPlatform, WEBAPP_URL } from "@/config";

// Landing page modelled on the original launch site: split-screen
// hero (text + CTA on the left, illustration on the right), forest
// download band below.
//
// Mobile hero: locked to the viewport (`100svh - nav`) so the whole
// hero fits in one screen. `svh` over `dvh` because `dvh` expands
// when the browser's address bar collapses and causes layout to
// reflow as the user scrolls — `svh` stays stable.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Download />
    </>
  );
}

function Hero() {
  // Device-aware primary CTA. Mobile visitors can install the native
  // app, so "Download" jumps straight to the right store. Desktop
  // visitors can't install a phone app, so the primary action opens
  // the web app they can actually use right now; "Learn more" stays as
  // the secondary route to the about page.
  const isDesktop = detectPlatform() === "desktop";
  const primaryHref = isDesktop ? WEBAPP_URL : storeUrlForPlatform();
  const primaryLabel = isDesktop ? "Open the web app" : "Download";
  // The web app is same-origin (/app), so open it in the same tab; store
  // links go to an external site, so those open in a new tab.
  const primaryExternal = !isDesktop;

  return (
    <section className="flex h-[calc(100svh-4rem)] min-h-[600px] flex-col md:h-[calc(100dvh-4rem)] md:min-h-[640px] md:flex-row">
      {/* Left half — text + CTA on cream. flex-1 on mobile so it
          shares the viewport with the lime illustration half. */}
      <div className="flex w-full flex-1 flex-col items-start justify-center px-6 py-6 md:w-1/2 md:flex-none md:px-14 md:py-20 lg:px-20">
        <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-forest sm:text-6xl lg:text-7xl">
          UniPool
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-forest/75 sm:mt-5 sm:text-lg">
          A carpooling app by university students, for university
          students.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
          <a
            href={primaryHref}
            target={primaryExternal ? "_blank" : undefined}
            rel={primaryExternal ? "noreferrer" : undefined}
            className="rounded-full bg-forest px-7 py-3 text-sm font-bold text-lime transition hover:bg-forest-700"
          >
            {primaryLabel}
          </a>
          {/* Secondary CTA. Desktop keeps "Learn more" (its primary is
              already the web app); mobile offers the web app here since
              its primary is the store download. */}
          {isDesktop ? (
            <Link
              to="/about"
              className="rounded-full border border-forest/20 px-7 py-3 text-sm font-bold text-forest transition hover:border-forest/40"
            >
              Learn more
            </Link>
          ) : (
            <a
              href={WEBAPP_URL}
              className="rounded-full border border-forest/20 px-7 py-3 text-sm font-bold text-forest transition hover:border-forest/40"
            >
              Open in web
            </a>
          )}
        </div>
        <p className="mt-6 text-sm font-semibold text-forest/55 sm:mt-10">
          Made with care by ACM-VIT.
        </p>
      </div>

      {/* Right half — illustration on soft lime. flex-1 on mobile so
          it gets the remaining viewport space; the image uses
          `max-h-full object-contain` so it scales down to whatever
          space is available instead of overflowing. */}
      <div className="flex w-full flex-1 items-center justify-center overflow-hidden bg-lime/25 px-8 py-6 md:w-1/2 md:flex-none md:px-14 md:py-16">
        <img
          src="/unipool-main-logo.svg"
          alt="UniPool"
          className="h-full max-h-full w-auto max-w-md object-contain"
        />
      </div>
    </section>
  );
}

function Download() {
  return (
    <section
      id="download"
      className="border-t border-forest/10 bg-forest px-6 py-14 text-cream sm:py-20 md:px-14"
    >
      <div className="container-x text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-cream sm:text-4xl">
          Download the app
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-[15px] text-cream/70 sm:mt-3 sm:text-base">
          Available on the App Store and Google Play.
        </p>
        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-full bg-lime px-7 py-3 text-sm font-bold text-forest transition hover:bg-lime-500 sm:w-auto"
          >
            App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-full border border-cream/20 px-7 py-3 text-sm font-bold text-cream transition hover:bg-cream/10 sm:w-auto"
          >
            Google Play
          </a>
        </div>
        <p className="mt-6 text-sm text-cream/55">
          Prefer the browser?{" "}
          <a
            href={WEBAPP_URL}
            className="font-semibold text-lime underline-offset-2 hover:underline"
          >
            Open the web app
          </a>
          .
        </p>
      </div>
    </section>
  );
}
