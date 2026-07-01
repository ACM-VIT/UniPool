import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SHARE_HOST, APP_STORE_URL, PLAY_STORE_URL, WEBAPP_URL } from "@/config";

const YEAR = new Date().getFullYear();

// Footer. Forest band with a soft trees-and-hills illustration washed in
// at low opacity — an outdoor-campus feel that reads behind the content
// without fighting it (same treatment as the app marketing site). The
// `external` variant swaps the in-app react-router links for absolute
// unipool.in links, so the satellite domains (unipool.to, .today, …) can
// reuse the exact same footer while still pointing About/FAQ/etc. at the
// main host where those pages live.
export default function Footer({ external = false }: { external?: boolean }) {
  return (
    <footer className="relative overflow-hidden border-t border-forest/10 bg-forest text-cream">
      {/* Landscape wash. `object-bottom` keeps the treeline/hills anchored
          to the base of the band; opacity keeps it a texture, not an
          image. Decorative, so hidden from the a11y tree. */}
      <img
        src="/brand/trees-footer.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom opacity-[0.18]"
      />

      <div className="container-x relative py-11 sm:py-14">
        {/* Two-up on mobile so the link columns sit side by side (Legal on
            the right) instead of stacking into a tall list; opens up to a
            single row on large screens. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <span className="text-xl font-extrabold tracking-tight text-lime">
              UniPool
            </span>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-cream/70">
              Carpool with your campus. Match a ride, split the fare, and get
              there together.
            </p>
          </div>

          {/* Explore */}
          <FooterCol title="Explore">
            <FootLink external={external} to="/">Home</FootLink>
            <FootLink external={external} to="/about">About</FootLink>
            <FootLink external={external} to="/faq">FAQ</FootLink>
          </FooterCol>

          {/* Legal — sits in the right column on mobile */}
          <FooterCol title="Legal">
            <FootLink external={external} to="/privacy">Privacy</FootLink>
            <FootLink external={external} to="/terms">Terms</FootLink>
            <a
              href="mailto:hello@unipool.acmvit.in"
              className="text-sm text-cream/70 transition hover:text-lime"
            >
              Contact
            </a>
          </FooterCol>

          {/* Get the app */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/45">
              Get the app
            </h3>
            <div className="mt-4 flex flex-row flex-wrap gap-2.5 lg:flex-col">
              <StoreButton
                href={APP_STORE_URL}
                sub="Download on the"
                name="App Store"
                icon={<AppleGlyph />}
              />
              <StoreButton
                href={PLAY_STORE_URL}
                sub="Get it on"
                name="Google Play"
                icon={<PlayGlyph />}
              />
            </div>
            {/* No install needed on desktop — open the app in the browser. */}
            <a
              href={WEBAPP_URL}
              className="mt-3 inline-block text-[13px] font-semibold text-cream/60 underline-offset-2 transition hover:text-lime"
            >
              Open in your browser
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-cream/10 pt-6 text-xs text-cream/55 sm:flex-row sm:justify-between">
          <span>© {YEAR} UniPool. All rights reserved.</span>
          <span>
            Made with love by{" "}
            <a
              href="https://acmvit.in"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-lime hover:underline"
            >
              ACM-VIT
            </a>
            .
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/45">
        {title}
      </h3>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FootLink({
  to,
  external,
  children,
}: {
  to: string;
  external: boolean;
  children: ReactNode;
}) {
  const cls = "text-sm text-cream/70 transition hover:text-lime";
  if (external) {
    return (
      <a href={`${SHARE_HOST}${to}`} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

function StoreButton({
  href,
  sub,
  name,
  icon,
}: {
  href: string;
  sub: string;
  name: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2.5 rounded-xl border border-cream/15 bg-cream/10 px-3.5 py-2 backdrop-blur-sm transition hover:bg-cream/15"
    >
      <span className="text-cream">{icon}</span>
      <span className="flex flex-col leading-none">
        <span className="text-[9px] text-cream/60">{sub}</span>
        <span className="mt-0.5 text-[13px] font-bold text-cream">{name}</span>
      </span>
    </a>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.9-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.37 1.02-4.27 2.59-1.82 3.16-.47 7.83 1.3 10.4.86 1.26 1.89 2.68 3.24 2.63 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.29 3.15-2.55.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.72-1.05-2.75-4.15zM14.7 4.5c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.59 3.04-1.46z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 3.2v17.6c0 .5.54.82.98.58l15.3-8.8c.44-.25.44-.9 0-1.16L4.98 2.62A.67.67 0 0 0 4 3.2z" />
    </svg>
  );
}
