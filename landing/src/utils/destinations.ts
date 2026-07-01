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
