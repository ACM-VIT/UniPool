import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

// Simple top navbar. Mirrors the original launch site: real logo on
// the left, lightweight nav links, single download CTA on the right.
// No floating-pill trickery, no scroll-state shenanigans — a clean
// strip across the top with a thin divider so it sits cleanly on
// either the cream marketing canvas or the forest about/download
// sections.
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goToDownload = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setOpen(false);
    if (pathname === "/") {
      document
        .getElementById("download")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#download");
      setTimeout(() => {
        document
          .getElementById("download")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  return (
    <header className="border-b border-forest/10 bg-cream">
      <div className="container-x flex h-16 items-center justify-between">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          aria-label="UniPool home"
        >
          {/* Wordmark only. The legacy favicon.svg is a base64 PNG
              that couldn't be rethemed automatically, so it would
              ship the old purple in the nav — wordmark sidesteps
              that and reads cleaner anyway. */}
          <span className="text-xl font-extrabold tracking-tight text-forest">
            UniPool
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavItem to="/about">About</NavItem>
          <NavItem to="/faq">FAQ</NavItem>
        </nav>

        <div className="hidden md:block">
          <a
            href="/#download"
            onClick={goToDownload}
            className="inline-flex items-center justify-center rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-lime transition hover:bg-forest-700"
          >
            Download
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-forest md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Burger open={open} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-forest/10 md:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            <MobileItem to="/about" onSelect={() => setOpen(false)}>
              About
            </MobileItem>
            <MobileItem to="/faq" onSelect={() => setOpen(false)}>
              FAQ
            </MobileItem>
            <a
              href="/#download"
              onClick={goToDownload}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-bold text-lime"
            >
              Download
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "text-sm font-semibold transition",
          isActive ? "text-forest" : "text-forest/65 hover:text-forest",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

function MobileItem({
  to,
  children,
  onSelect,
}: {
  to: string;
  children: string;
  onSelect: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onSelect}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-2 text-base font-semibold",
          isActive ? "bg-forest/5 text-forest" : "text-forest/80",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="17" y2="17" />
          <line x1="17" y1="5" x2="5" y2="17" />
        </>
      ) : (
        <>
          <line x1="4" y1="8" x2="18" y2="8" />
          <line x1="4" y1="14" x2="18" y2="14" />
        </>
      )}
    </svg>
  );
}
