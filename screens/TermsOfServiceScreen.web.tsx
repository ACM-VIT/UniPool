// Web variant of the Terms of Service. Static content rendered through
// the shared LegalPage layout. Mirrors the sections of the mobile screen.
import React from "react";
import LegalPage, { LegalSection } from "../components/web/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Acceptance of Terms",
    paragraphs: [
      "By using UniPool, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use the service.",
    ],
  },
  {
    heading: "2. Description of Service",
    paragraphs: [
      "UniPool is a carpooling platform that connects university students travelling in the same direction. UniPool is a technology platform only and does not provide transportation services itself.",
    ],
  },
  {
    heading: "3. Eligibility",
    paragraphs: [
      "You must be at least 16 years old and a university student to use UniPool. Drivers must hold a valid driver's licence. You agree to provide accurate information when you register.",
    ],
  },
  {
    heading: "4. User Responsibilities",
    subblocks: [
      {
        label: "For drivers",
        body: "Maintain a valid licence and insurance, keep your vehicle safe and roadworthy, follow all traffic laws, arrive on time, and treat your passengers with respect.",
      },
      {
        label: "For riders",
        body: "Be ready at the agreed time, treat your driver and fellow passengers with respect, wear your seatbelt, and avoid disruptive behaviour.",
      },
    ],
  },
  {
    heading: "5. Prohibited Conduct",
    paragraphs: [
      "You may not provide false information, harass other users, use the service for anything illegal, solicit for commercial purposes, create multiple accounts, or share your account credentials.",
    ],
  },
  {
    heading: "6. Safety Disclaimer",
    paragraphs: [
      "UniPool connects users but does not guarantee anyone's safety. You participate at your own risk. Verify who you are riding with, share your trip details with someone you trust, and trust your instincts.",
    ],
  },
  {
    heading: "7. Limitation of Liability",
    paragraphs: [
      "UniPool and ACM-VIT are not liable for any damages, injury, property damage, the actions of other users, or interruptions to the service.",
    ],
  },
  {
    heading: "8. Intellectual Property",
    paragraphs: [
      "All content in UniPool is owned by ACM-VIT and protected by intellectual property law. You may not copy or modify it without permission.",
    ],
  },
  {
    heading: "9. Account Termination",
    paragraphs: [
      "UniPool may suspend or terminate accounts that violate these terms. You can delete your own account at any time from Account Settings.",
    ],
  },
  {
    heading: "10. Modifications to Terms",
    paragraphs: [
      "UniPool may update these terms from time to time. Continued use of the service after a change means you accept the updated terms.",
    ],
  },
  {
    heading: "11. Governing Law",
    paragraphs: [
      "These terms are governed by the laws of India. Any disputes will be resolved in the courts of Vellore, Tamil Nadu.",
    ],
  },
  {
    heading: "12. Contact",
    paragraphs: ["For questions about these terms, reach us at:"],
  },
];

const TermsOfServiceScreenWeb: React.FC = () => (
  <LegalPage
    title="Terms of Service"
    intro="These terms govern your use of UniPool, the student carpooling platform by ACM-VIT. Please read them carefully."
    lastUpdated="Last updated: December 1, 2025"
    sections={SECTIONS}
  />
);

export default TermsOfServiceScreenWeb;
