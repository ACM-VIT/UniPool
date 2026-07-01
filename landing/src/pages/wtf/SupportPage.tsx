import { useDocumentTitle } from "@/utils/useDocumentTitle";

export default function SupportPage() {
  useDocumentTitle(
    "Support & safety · UniPool",
    "Report a problem, check safety info, or reach the UniPool team.",
  );
  return (
    <section className="min-h-[calc(100svh-4rem)] bg-cream px-6 py-10 sm:py-14">
      <div className="container-x max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-[34px]">
          Something wrong?
        </h1>
        <p className="mt-2 text-[15px] text-forest/60">
          Report a problem, check safety info, or reach us directly.
        </p>

        <div className="mt-7 space-y-2.5">
          <SupportCard
            icon={<ShieldIcon />}
            title="Report a safety concern"
            body="Felt unsafe on a ride? Report the user from their profile in the app. For anything urgent, email us."
            action="safety@unipool.acmvit.in"
            actionHref="mailto:safety@unipool.acmvit.in"
          />
          <SupportCard
            icon={<BugIcon />}
            title="Report a bug"
            body="Found something broken? Tell us what happened and we'll fix it."
            action="hello@unipool.acmvit.in"
            actionHref="mailto:hello@unipool.acmvit.in?subject=Bug%20report"
          />
          <SupportCard
            icon={<UserIcon />}
            title="Account help"
            body="Locked out, deleting your account, or a question about your data. Email from your registered address."
            action="hello@unipool.acmvit.in"
            actionHref="mailto:hello@unipool.acmvit.in?subject=Account%20help"
          />
          <SupportCard
            icon={<ChatIcon />}
            title="Everything else"
            body="Any other question. We read every email."
            action="hello@unipool.acmvit.in"
            actionHref="mailto:hello@unipool.acmvit.in"
          />
        </div>

        <div className="mt-6 rounded-[20px] bg-forest px-6 py-6">
          <h2 className="text-lg font-extrabold text-cream">How UniPool keeps rides safe</h2>
          <ul className="mt-4 space-y-3 text-[14px] text-cream/70">
            <Item text="Everyone signs in with Google or Apple. No anonymous accounts." />
            <Item text="A verified badge means the host confirmed their university email." />
            <Item text="Female hosts can make a ride women-only. Enforced on the server." />
            <Item text="Report a user from their profile. We review every report." />
            <Item text="Trip chat is built in, so you never share your personal number." />
          </ul>
        </div>

        <p className="mt-6 text-center text-[14px] text-forest/45">
          Looking for the FAQ?{" "}
          <a href="https://unipool.in/faq" className="font-bold text-forest underline decoration-lime decoration-2 underline-offset-4">
            Read it here
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function SupportCard({
  icon, title, body, action, actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-[20px] bg-white px-5 py-4 shadow-card">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime/25 text-forest">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold text-forest">{title}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-forest/55">{body}</p>
          <a href={actionHref} className="mt-1.5 inline-block text-[13px] font-bold text-forest underline decoration-lime decoration-2 underline-offset-4">
            {action}
          </a>
        </div>
      </div>
    </div>
  );
}

function Item({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
      <span>{text}</span>
    </li>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2z" />
    </svg>
  );
}
function BugIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="11" r="4" />
      <path d="M9 7V4M5.5 8.5L3 7M12.5 8.5L15 7M5.5 13.5L3 15M12.5 13.5L15 15" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="3" />
      <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h12a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V5a1 1 0 011-1z" />
    </svg>
  );
}
