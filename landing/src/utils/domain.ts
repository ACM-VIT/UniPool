export type DomainRole =
  | "main"
  | "to"
  | "today"
  | "download"
  | "click"
  | "best"
  | "wtf"
  | "taxi"
  | "lol";

const DOMAIN_MAP: Record<string, DomainRole> = {
  "unipool.to": "to",
  "unipool.today": "today",
  "unipool.download": "download",
  "unipool.click": "click",
  "unipool.best": "best",
  "unipool.wtf": "wtf",
  "unipool.taxi": "taxi",
  "unipool.lol": "lol",
};

// Which product surface to render, decided by hostname. A `?domain=`
// query override drives local development (one dev server can preview
// every domain). Anything unrecognised falls back to the main site.
export function detectDomain(): DomainRole {
  if (typeof window === "undefined") return "main";

  const params = new URLSearchParams(window.location.search);
  const override = params.get("domain");
  if (override && override in DOMAIN_MAP) return DOMAIN_MAP[override];

  const host = window.location.hostname;
  for (const [domain, role] of Object.entries(DOMAIN_MAP)) {
    if (host === domain || host.endsWith(`.${domain}`)) return role;
  }
  return "main";
}
