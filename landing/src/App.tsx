import { Route, Routes } from "react-router-dom";
import { detectDomain } from "@/utils/domain";
import SiteLayout from "@/components/SiteLayout";
import SatelliteLayout from "@/components/SatelliteLayout";
import LandingPage from "@/pages/LandingPage";
import SharePage from "@/pages/SharePage";
import AboutPage from "@/pages/AboutPage";
import FaqPage from "@/pages/FaqPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import DownloadPage from "@/pages/DownloadPage";
import NotFoundPage from "@/pages/NotFoundPage";
import DestinationIndex from "@/pages/to/DestinationIndex";
import DestinationPage from "@/pages/to/DestinationPage";
import TodayBoard from "@/pages/today/TodayBoard";
import CampaignLanding, { CampaignIndex } from "@/pages/click/CampaignLanding";
import BestIndex from "@/pages/best/BestIndex";
import BestRoutePage from "@/pages/best/BestRoutePage";
import SupportPage from "@/pages/wtf/SupportPage";

const domain = detectDomain();

export default function App() {
  return (
    <Routes>
      {domain === "main" ? <Route element={<SiteLayout />}>{mainRoutes()}</Route> : null}
      {domain === "to" ? <Route element={<SatelliteLayout domain="to" />}>{toRoutes()}</Route> : null}
      {domain === "today" ? <Route element={<SatelliteLayout domain="today" />}>{todayRoutes()}</Route> : null}
      {domain === "download" ? <Route element={<SatelliteLayout domain="download" />}>{downloadRoutes()}</Route> : null}
      {domain === "click" ? <Route element={<SatelliteLayout domain="click" />}>{clickRoutes()}</Route> : null}
      {domain === "best" ? <Route element={<SatelliteLayout domain="best" />}>{bestRoutes()}</Route> : null}
      {domain === "wtf" ? <Route element={<SatelliteLayout domain="wtf" />}>{wtfRoutes()}</Route> : null}
      {/* taxi mirrors the canonical app; lol is reserved for share /
          referral experiments and mirrors main until it has its own
          surface. Both get a canonical tag / redirect at the edge. */}
      {domain === "taxi" || domain === "lol" ? <Route element={<SiteLayout />}>{mainRoutes()}</Route> : null}
    </Routes>
  );
}

function mainRoutes() {
  return (
    <>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/r/:rideId" element={<SharePage />} />
      <Route path="/ride/:rideId" element={<SharePage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

function toRoutes() {
  return (
    <>
      <Route path="/" element={<DestinationIndex />} />
      <Route path="/r/:rideId" element={<SharePage />} />
      <Route path="/ride/:rideId" element={<SharePage />} />
      <Route path="/:slug" element={<DestinationPage />} />
    </>
  );
}

function todayRoutes() {
  return (
    <>
      <Route path="/" element={<TodayBoard />} />
      <Route path="/r/:rideId" element={<SharePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

function downloadRoutes() {
  return (
    <>
      <Route path="/" element={<DownloadPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

function clickRoutes() {
  return (
    <>
      <Route path="/" element={<CampaignIndex />} />
      <Route path="/:slug" element={<CampaignLanding />} />
    </>
  );
}

function bestRoutes() {
  return (
    <>
      <Route path="/" element={<BestIndex />} />
      <Route path="/:slug" element={<BestRoutePage />} />
    </>
  );
}

function wtfRoutes() {
  return (
    <>
      <Route path="/" element={<SupportPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}
