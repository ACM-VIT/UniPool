// Web variant of the search-results screen. Carpool inventory is sparse,
// so the web is list-first (a search bar over a readable list of rides),
// not a map split-pane. It reads the from/to the search box passed in the
// URL and hands them to WebRideSearch.
import React from "react";
import { useDecodedLocalSearchParams } from "../../navigation/routes";
import WebShell from "../../components/web/WebShell";
import WebRideSearch from "../../components/web/WebRideSearch";

const AvailableRideScreenWeb: React.FC = () => {
  const params = useDecodedLocalSearchParams<{ fromLocation?: string; toLocation?: string }>();
  return (
    <WebShell active="HomeScreen" contained={false}>
      <WebRideSearch initialFrom={params.fromLocation ?? ""} initialTo={params.toLocation ?? ""} />
    </WebShell>
  );
};

export default AvailableRideScreenWeb;
