// Signed-in web home: the search dashboard, which is the split-pane
// search (form + results beside a live map). With no route preset it
// opens on rides near the viewer.
import React from "react";
import WebRideSearch from "./WebRideSearch";

const WebSearchDashboard: React.FC = () => <WebRideSearch />;

export default WebSearchDashboard;
