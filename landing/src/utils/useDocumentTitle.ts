import { useEffect } from "react";

// Sets document.title (and the OG/description meta) for a page, then
// restores the previous values on unmount. No SSR here, but Google runs
// JS on crawl and social unfurlers read the live tags, so per-page
// titles still earn their keep for the .best / .to landing pages.
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let descEl: HTMLMetaElement | null = null;
    let prevDesc: string | null = null;
    if (description) {
      descEl = document.querySelector('meta[name="description"]');
      if (descEl) {
        prevDesc = descEl.getAttribute("content");
        descEl.setAttribute("content", description);
      }
    }

    return () => {
      document.title = prevTitle;
      if (descEl && prevDesc !== null) descEl.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}
