// Web home.
//
// The UniPool app opens straight into a live map with a search — the
// product, not a marketing page. The web mirrors that: both guests and
// signed-in users land in the search experience (a search panel beside a
// live map of rides), the same way Uber's web home and Spotify's web
// player drop you into the product. There is no separate brochure to
// maintain; one home, for everyone.
import React from "react";
import WebShell from "../components/web/WebShell";
import WebSearchDashboard from "../components/web/WebSearchDashboard";

const HomeScreenWeb: React.FC = () => (
  <WebShell active="HomeScreen" contained={false}>
    <WebSearchDashboard />
  </WebShell>
);

export default HomeScreenWeb;
