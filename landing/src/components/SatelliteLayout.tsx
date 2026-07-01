import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { DomainRole } from "@/utils/domain";
import { appLinkProps, detectPlatform } from "@/config";
import Footer from "./Footer";

// Shared chrome for the satellite domains (unipool.to, .today, .best,
// etc). Matches the main launch site's navbar + footer so every UniPool
// surface wears the same head and tail, while each domain owns its body.
export default function SatelliteLayout({ domain: _domain }: { domain: DomainRole }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  // Desktop can't install a phone app, so the header CTA offers the web
  // app there; on mobile it stays "Get the app" (opens the app or store).
  const ctaLabel = detectPlatform() === "desktop" ? "Open on web" : "Get the app";

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-forest">
      <header className="border-b border-forest/10 bg-cream">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" aria-label="UniPool home">
            <span className="text-xl font-extrabold tracking-tight text-forest">
              UniPool
            </span>
          </Link>
          <a
            {...appLinkProps()}
            className="inline-flex items-center justify-center rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-lime transition hover:bg-forest-700"
          >
            {ctaLabel}
          </a>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer external />
    </div>
  );
}
