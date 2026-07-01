import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { SHARE_HOST, appLinkProps } from "@/config";
import { useDocumentTitle } from "@/utils/useDocumentTitle";

type Campaign = {
  slug: string;
  title: string;
  subtitle: string;
};

const CAMPAIGNS: Campaign[] = [
  { slug: "vit-airport", title: "VIT to the airport", subtitle: "Find a ride to MAA or BLR straight from campus." },
  { slug: "freshers", title: "Welcome to VIT", subtitle: "UniPool is how students here get around. Free to use." },
  { slug: "airport-weekend", title: "Weekend airport runs", subtitle: "Heading out this weekend? Split the cab with someone going your way." },
  { slug: "acm", title: "Built by ACM-VIT", subtitle: "We made UniPool for students like you. Take it for a spin." },
  { slug: "semester-end", title: "Going home?", subtitle: "End-of-semester rides fill up fast. Grab a seat early." },
];

function findCampaign(slug: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.slug === slug);
}

export default function CampaignLanding() {
  const { slug } = useParams<{ slug: string }>();
  const campaign = slug ? findCampaign(slug) : undefined;

  useDocumentTitle(campaign ? `${campaign.title} · UniPool` : "UniPool", campaign?.subtitle);

  useEffect(() => {
    if (slug && typeof window !== "undefined") {
      try { sessionStorage.setItem("up_campaign", slug); } catch {}
    }
  }, [slug]);

  if (!campaign) return <CampaignIndex />;

  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <img src="/unipool-main-logo.svg" alt="UniPool" className="mx-auto h-28 w-auto" />
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-forest">
          {campaign.title}
        </h1>
        <p className="mx-auto mt-2.5 max-w-xs text-[15px] leading-relaxed text-forest/60">
          {campaign.subtitle}
        </p>
        <a
          {...appLinkProps()}
          className="mt-7 flex w-full items-center justify-center rounded-2xl bg-forest px-6 py-3.5 text-[15px] font-extrabold text-lime transition active:scale-[0.98]"
        >
          Get UniPool
        </a>
        <a href="https://unipool.in/about" className="mt-3 inline-block text-[14px] font-semibold text-forest/45 transition hover:text-forest">
          What is UniPool?
        </a>
      </div>
    </section>
  );
}

export function CampaignIndex() {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-forest">
          Looking for a specific link?
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[14px] text-forest/50">
          Links from posters, QR codes, and referrals land here. Head to the main site to get going.
        </p>
        <a href={SHARE_HOST} className="mt-6 inline-flex items-center justify-center rounded-2xl bg-forest px-6 py-3.5 text-[15px] font-extrabold text-lime">
          Go to UniPool
        </a>
      </div>
    </section>
  );
}
