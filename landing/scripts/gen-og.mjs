// Build-time Open Graph image generator. Renders branded 1200x630 cards
// (the lime "boarding-pass" aesthetic from og-template.html) to PNGs, one
// per surface: each domain landing, each destination, each best route,
// plus a generic shared-ride card. The edge OG middleware points
// og:image at these static PNGs, so social crawlers always get a real,
// on-brand image with zero runtime cost.
//
// Rasterized with @resvg/resvg-js + the bundled Nunito Sans, so it doesn't
// depend on system fonts or a globally installed binary. Run via `pnpm gen:og`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { DESTINATIONS } from "../src/utils/destinations.ts";
import { BEST_ROUTES } from "../src/utils/routes.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/og");
const fontFile = resolve(here, "fonts/NunitoSans.ttf");

const LIME = "#b5d750";
const FOREST = "#263b33";
const FOREST_60 = "#263b3399";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const truncate = (s, n) => {
  s = String(s).trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
};

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="44%" r="60%">
      <stop offset="0" stop-color="#9dc03a" stop-opacity="0.5"/>
      <stop offset="0.62" stop-color="#b5d750" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${LIME}"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="90" y="112" font-family="Nunito Sans" font-weight="800" font-size="40" letter-spacing="-1" fill="${FOREST}">UniPool</text>
  ${inner}
  <text x="90" y="566" font-family="Nunito Sans" font-weight="700" font-size="24" letter-spacing="1" fill="${FOREST_60}">{{WM}}</text>
</svg>`;
}

function dashes(x, y0, y1) {
  let d = "";
  for (let y = y0; y <= y1 - 10; y += 20) {
    d += `<rect x="${x - 2}" y="${y}" width="4" height="10" rx="2" fill="${FOREST}"/>`;
  }
  return d;
}

// Route card: open dot → dashed connector → filled dot, with From / To.
function routeCard({ from, to, sub, wm }) {
  const f = truncate(from, 24);
  const t = truncate(to, 24);
  const longest = Math.max(f.length, t.length);
  const size = longest > 20 ? 60 : longest > 14 ? 72 : 84;
  const mx = 110;
  const tx = 168;
  const y1 = 266;
  const y2 = y1 + 132;
  const inner = `
  <circle cx="${mx}" cy="${y1}" r="16" fill="none" stroke="${FOREST}" stroke-width="6"/>
  ${dashes(mx, y1 + 30, y2 - 30)}
  <circle cx="${mx}" cy="${y2}" r="16" fill="${FOREST}"/>
  <text x="${tx}" y="${y1}" font-family="Nunito Sans" font-weight="800" font-size="${size}" letter-spacing="-2" fill="${FOREST}" dominant-baseline="middle">${esc(f)}</text>
  <text x="${tx}" y="${y2}" font-family="Nunito Sans" font-weight="800" font-size="${size}" letter-spacing="-2" fill="${FOREST}" dominant-baseline="middle">${esc(t)}</text>
  ${sub ? `<text x="90" y="476" font-family="Nunito Sans" font-weight="700" font-size="30" fill="${FOREST_60}">${esc(sub)}</text>` : ""}`;
  return frame(inner).replace("{{WM}}", esc(wm));
}

// Title card: a big headline with a small route glyph beneath.
function titleCard({ title, sub, wm }) {
  const size = title.length > 16 ? 84 : title.length > 10 ? 108 : 128;
  const inner = `
  <text x="90" y="330" font-family="Nunito Sans" font-weight="800" font-size="${size}" letter-spacing="-4" fill="${FOREST}">${esc(title)}</text>
  ${sub ? `<text x="90" y="398" font-family="Nunito Sans" font-weight="700" font-size="32" fill="${FOREST_60}">${esc(sub)}</text>` : ""}
  <g transform="translate(92, 452)">
    <circle cx="12" cy="12" r="11" fill="none" stroke="${FOREST}" stroke-width="4"/>
    <rect x="40" y="10" width="180" height="4" rx="2" fill="${FOREST}" opacity="0.5"/>
    <circle cx="250" cy="12" r="11" fill="${FOREST}"/>
  </g>`;
  return frame(inner).replace("{{WM}}", esc(wm));
}

function render(name, svg) {
  const pngPath = resolve(outDir, `${name}.png`);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      fontFiles: [fontFile],
      defaultFontFamily: "Nunito Sans",
      loadSystemFonts: false,
    },
  });
  writeFileSync(pngPath, resvg.render().asPng());
  console.log("  og/" + name + ".png");
}

// ---- surfaces ----
mkdirSync(outDir, { recursive: true });
console.log("Generating OG cards →");

// Domain landings / indexes.
render("main", titleCard({ title: "UniPool", sub: "Carpool with your campus", wm: "unipool.in" }));
render("to", titleCard({ title: "Where to?", sub: "Find student rides to your destination", wm: "unipool.to" }));
render("best", titleCard({ title: "Popular routes", sub: "The rides students share most", wm: "unipool.best" }));
render("today", titleCard({ title: "Leaving today", sub: "Live student carpools, updated every minute", wm: "unipool.today" }));
render("wtf", titleCard({ title: "Support & safety", sub: "Report a problem or reach the team", wm: "unipool.wtf" }));
render("download", titleCard({ title: "Get UniPool", sub: "App Store · Google Play · Web", wm: "unipool.download" }));

// Generic shared-ride card (fallback when a ride's destination isn't a hub).
render("ride", titleCard({ title: "A shared ride", sub: "Open to see the route, seats & fare", wm: "unipool.in" }));

// Destinations — "VIT Vellore → {dest}", except VIT itself.
for (const d of DESTINATIONS) {
  if (d.slug === "home") continue;
  if (d.slug === "vit") {
    render(`dest-${d.slug}`, titleCard({ title: "Rides to VIT", sub: d.subtitle, wm: "unipool.to" }));
  } else {
    render(`dest-${d.slug}`, routeCard({ from: "VIT Vellore", to: d.name, sub: "See live rides on UniPool", wm: "unipool.to" }));
  }
}

// Best routes — from → to.
for (const r of BEST_ROUTES) {
  render(`route-${r.slug}`, routeCard({ from: r.from, to: r.to, sub: "Carpool route on UniPool", wm: "unipool.best" }));
}

console.log("Done.");
