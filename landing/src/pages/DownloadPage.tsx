import { Link } from "react-router-dom";
import { APP_STORE_URL, PLAY_STORE_URL, WEBAPP_URL, appLinkProps } from "@/config";

/**
 * /download (and unipool.download) — a calm choice page rather than an
 * instant store bounce: use UniPool right now in the browser, install the
 * native app, or (if it's already installed) open it. Everything a visitor
 * who got a "download it" link might want, without guessing for them.
 */
export default function DownloadPage() {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-forest px-6 py-16 text-cream sm:py-24">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          Get UniPool
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-base text-cream/65">
          Use it right away in your browser, or install the app.
        </p>

        <div className="mt-9 flex flex-col items-stretch gap-3">
          {/* Web first — it works instantly, no install. */}
          <a
            href={WEBAPP_URL}
            className="rounded-full bg-lime px-7 py-3 text-sm font-extrabold text-forest transition hover:bg-lime-500"
          >
            Open in web
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-cream/20 px-7 py-3 text-sm font-bold text-cream transition hover:bg-cream/10"
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-cream/20 px-7 py-3 text-sm font-bold text-cream transition hover:bg-cream/10"
          >
            Get it on Google Play
          </a>
        </div>

        {/* If the app is already installed, jump straight into it (falls
            back to the store on its own if it isn't). */}
        <a
          {...appLinkProps()}
          className="mt-5 inline-block text-sm font-semibold text-cream/70 underline-offset-2 transition hover:text-lime"
        >
          Already have the app? Open it
        </a>

        <p className="mt-10 text-xs text-cream/40">
          Got a ride link from a friend?{" "}
          <Link to="/" className="text-cream/70 underline-offset-2 hover:underline">
            Learn what UniPool is first
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
