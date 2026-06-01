// Web variant of the Privacy Policy. Static content rendered through the
// shared LegalPage layout. Mirrors the sections of the mobile screen.
import React from "react";
import LegalPage, { LegalSection } from "../components/web/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Introduction",
    paragraphs: [
      "UniPool helps university students share rides safely. This policy explains how we collect, use, disclose, and safeguard your information.",
    ],
  },
  {
    heading: "2. Information We Collect",
    subblocks: [
      {
        label: "Personal information",
        body: "Your name (from Google or Apple sign in), email, phone number, and optionally your year of birth, gender, and profile picture.",
      },
      {
        label: "Location data",
        body: "Used to show rides near you, display pickup and drop-off points, calculate routes, and improve the service.",
      },
      {
        label: "Usage data",
        body: "Rides you create or book, how you use the app, and basic device information.",
      },
    ],
  },
  {
    heading: "3. How We Use Your Information",
    paragraphs: [
      "To provide the service, match riders with drivers, enable communication between them, send notifications, improve the experience, keep people safe and prevent fraud, and comply with the law.",
    ],
  },
  {
    heading: "4. Information Sharing",
    paragraphs: [
      "We share limited details (such as your name and contact) with users you are matched with, and with service providers like Firebase that help run the app. We share information when the law requires it. We do not sell your personal information.",
    ],
  },
  {
    heading: "5. Data Security",
    paragraphs: [
      "We use technical and organisational measures to protect your data. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "6. Your Rights",
    paragraphs: [
      "You can access and correct your information, delete your account and data, and opt out of marketing. You can do this from Account Settings or by contacting us.",
    ],
  },
  {
    heading: "7. Data Retention",
    paragraphs: [
      "We keep your data while your account is active or as needed to provide the service. You can delete your account at any time from Account Settings.",
    ],
  },
  {
    heading: "8. Children's Privacy",
    paragraphs: [
      "UniPool is intended for university students and is not directed at anyone under 16. We do not knowingly collect information from children under 16.",
    ],
  },
  {
    heading: "9. Changes to This Policy",
    paragraphs: [
      "We may update this policy. When we do, we will post the new version and update the date above.",
    ],
  },
  {
    heading: "10. Contact",
    paragraphs: ["For questions about this policy, reach us at:"],
  },
];

const PrivacyPolicyScreenWeb: React.FC = () => (
  <LegalPage
    title="Privacy Policy"
    intro="This policy explains what UniPool collects and how we use and protect it. UniPool is a student carpooling platform by ACM-VIT."
    lastUpdated="Last updated: December 1, 2025"
    sections={SECTIONS}
  />
);

export default PrivacyPolicyScreenWeb;
