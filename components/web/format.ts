// Small display helpers for the web surfaces.

// Capitalises the first letter of each word so backend-stored locations
// like "Chennai International Airport, chennai" read cleanly on a
// public page. The rest of each word is left untouched, so acronyms
// such as "VIT" stay as they are.
export const titleCaseLocation = (value: string | undefined | null): string =>
  (value ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
