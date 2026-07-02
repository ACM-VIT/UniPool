export type Destination = {
  slug: string;
  name: string;
  code: string;
  subtitle: string;
  distance: string;
  /** Fallback fare shown only when there are no live rides to derive a
   *  real range from. Kept conservative and grounded in observed fares. */
  fareEstimate: string;
  popular: string;
  /** "Going to" term handed to the web app search. Defaults to `name`;
   *  set it where the friendly name doesn't substring-match stored
   *  locations (e.g. "Bangalore" vs the stored "Bengaluru"). */
  searchName?: string;
  /** Alias substrings matched against a ride's end location. */
  endTerms: string[];
};

export const DESTINATIONS: Destination[] = [
  {
    slug: "blr",
    name: "Bangalore",
    code: "BLR",
    subtitle: "Bengaluru via NH48",
    distance: "~210 km from VIT",
    fareEstimate: "₹450 to ₹750",
    popular: "Friday and Sunday evenings",
    searchName: "Bengaluru",
    endTerms: ["bengaluru", "bangalore", "bellandur", "kempegowda", "blr"],
  },
  {
    slug: "maa",
    name: "Chennai Airport",
    code: "MAA",
    subtitle: "Chennai International Airport",
    distance: "~135 km from VIT",
    fareEstimate: "₹200 to ₹350",
    popular: "Before holidays and long weekends",
    searchName: "Chennai International Airport",
    endTerms: ["chennai international airport", "chennai airport", "maa"],
  },
  {
    slug: "chennai",
    name: "Chennai",
    code: "CHN",
    subtitle: "Chennai Central and surrounds",
    distance: "~140 km from VIT",
    fareEstimate: "₹150 to ₹300",
    popular: "Weekends and semester breaks",
    endTerms: ["chennai", "egmore", "tambaram"],
  },
  {
    slug: "vit",
    name: "VIT Vellore",
    code: "VIT",
    subtitle: "Vellore Institute of Technology",
    distance: "Campus",
    fareEstimate: "Varies by origin",
    popular: "Start and end of semester",
    endTerms: ["vit"],
  },
  {
    slug: "katpadi",
    name: "Katpadi Junction",
    code: "KPD",
    subtitle: "Nearest railway station to VIT",
    distance: "~8 km from VIT",
    fareEstimate: "₹20 to ₹40",
    popular: "Sunday evenings, Friday mornings",
    searchName: "Katpadi",
    endTerms: ["katpadi"],
  },
  {
    slug: "airport",
    name: "Airport",
    code: "AIR",
    subtitle: "MAA or BLR, whichever you need",
    distance: "135 to 210 km",
    fareEstimate: "₹200 to ₹750",
    popular: "Before any break",
    endTerms: ["airport", "kempegowda"],
  },
  {
    slug: "home",
    name: "Home",
    code: "HME",
    subtitle: "Wherever that is",
    distance: "",
    fareEstimate: "Split it fair",
    popular: "Always",
    endTerms: [],
  },
];

export function findDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

// The "going to" term to pre-fill the web app search with for this hub.
export function destSearchTerm(d: Destination): string {
  return d.searchName ?? d.name;
}
