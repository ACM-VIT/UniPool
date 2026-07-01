// Canonical "best routes" data. Kept as a pure module (no React) so both
// the app pages and the edge OG function can import it — one source of
// truth for the popular routes.
export type BestRoute = {
  slug: string;
  from: string;
  to: string;
  tagline: string;
  startTerms: string[];
  endTerms: string[];
};

const VIT = ["vit"];
const BLR = ["bengaluru", "bangalore", "bellandur", "kempegowda"];
const MAA = ["chennai international airport", "chennai airport"];
const CHENNAI = ["chennai", "egmore", "tambaram"];
const KATPADI = ["katpadi"];

export const BEST_ROUTES: BestRoute[] = [
  { slug: "vit-to-chennai-airport", from: "VIT Vellore", to: "Chennai Airport", tagline: "The most shared route on UniPool", startTerms: VIT, endTerms: MAA },
  { slug: "vit-to-bangalore", from: "VIT Vellore", to: "Bangalore", tagline: "Weekends, breaks, and going home", startTerms: VIT, endTerms: BLR },
  { slug: "vit-to-katpadi", from: "VIT Vellore", to: "Katpadi Junction", tagline: "Quick hop to the railway station", startTerms: VIT, endTerms: KATPADI },
  { slug: "vit-to-chennai", from: "VIT Vellore", to: "Chennai", tagline: "Central, Egmore, anywhere in the city", startTerms: VIT, endTerms: CHENNAI },
  { slug: "chennai-airport-to-vit", from: "Chennai Airport", to: "VIT Vellore", tagline: "Land and head straight to campus", startTerms: MAA, endTerms: VIT },
  { slug: "bangalore-to-vit", from: "Bangalore", to: "VIT Vellore", tagline: "Back to campus after the break", startTerms: BLR, endTerms: VIT },
];

export function findRoute(slug: string): BestRoute | undefined {
  return BEST_ROUTES.find((r) => r.slug === slug);
}
