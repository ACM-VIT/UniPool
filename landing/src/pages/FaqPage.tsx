import { useState } from "react";

// FAQ. Accordion cards grouped by topic. Refined pass:
//   - No top eyebrow on the page; the headline carries it.
//   - Topic dividers use a thin hairline + bold label instead of a
//     small uppercase eyebrow, so each group reads as a section
//     break, not a sticker.
//   - Card surface is borderless at rest, gains a hairline border
//     on hover, and lifts into shadow when open. The chevron flips
//     to lime when open, matching the rest of the brand's active
//     states.
type FaqItem = { q: string; a: string };
type FaqGroup = { topic: string; items: FaqItem[] };

const FAQ: FaqGroup[] = [
  {
    topic: "Getting started",
    items: [
      {
        q: "Who can use UniPool?",
        a: "Anyone can sign in with Google or Apple. Verifying your university email is optional and unlocks the verified checkmark next to your name, which other riders see on every ride card.",
      },
      {
        q: "Which platforms is the app on?",
        a: "Available now on both the App Store (iOS) and Google Play (Android).",
      },
      {
        q: "Does UniPool charge a fee?",
        a: "No. Hosts keep the entire fare. UniPool does not take a commission.",
      },
    ],
  },
  {
    topic: "Safety",
    items: [
      {
        q: "Are there women-only rides?",
        a: "Yes. Female hosts can mark a ride as women-only and only female passengers can request to join. The check runs server-side, not just in the UI.",
      },
      {
        q: "How do I know a host is a real student?",
        a: "Look for the verified checkmark on the host's ride card. That means we've confirmed their university email matches their institute.",
      },
      {
        q: "What if I feel unsafe during a ride?",
        a: "You can report a user from their profile and leave the trip chat at any time. Live trip-status sharing and an SOS button are next on the list.",
      },
    ],
  },
  {
    topic: "Payments",
    items: [
      {
        q: "How do payments work?",
        a: "Passengers pay the host directly over UPI. Tap Pay on the passenger profile sheet and your UPI app opens with the host's VPA prefilled.",
      },
      {
        q: "Does UniPool hold the money?",
        a: "No. UniPool never touches the money. There is no card capture and no platform fee. The fare moves directly between the two of you.",
      },
    ],
  },
  {
    topic: "Your account",
    items: [
      {
        q: "How do I delete my account?",
        a: "Email hello@unipool.acmvit.in from your registered address. We remove your profile within 30 days and anonymise your past bookings.",
      },
      {
        q: "Where is the app data stored?",
        a: "On our servers, encrypted in transit and at rest. We do not run third-party advertising or analytics trackers, and we do not sell data.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">
            Frequently asked
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-forest/65">
            Short, honest answers. Can't find what you're looking for?{" "}
            <a
              href="mailto:hello@unipool.acmvit.in"
              className="font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4"
            >
              Email us
            </a>
            .
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl space-y-14">
          {FAQ.map((group) => (
            <Group key={group.topic} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Group({ group }: { group: FaqGroup }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-forest">{group.topic}</h2>
        <span aria-hidden className="h-px flex-1 bg-forest/10" />
      </div>
      <ul className="mt-3 space-y-2">
        {group.items.map((it, i) => (
          <Card key={i} item={it} />
        ))}
      </ul>
    </div>
  );
}

function Card({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={[
          "group flex w-full items-center justify-between gap-6 rounded-2xl px-5 py-4 text-left transition",
          open
            ? "bg-cream-warm shadow-[0_10px_24px_-16px_rgba(38,59,51,0.18)]"
            : "bg-transparent hover:bg-cream-warm/60",
        ].join(" ")}
      >
        <span className="text-[15px] font-semibold leading-snug text-forest">
          {item.q}
        </span>
        <span
          aria-hidden
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center text-forest transition-transform",
            open ? "rotate-180 text-lime" : "text-forest/45",
          ].join(" ")}
        >
          <Chevron />
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5 pt-1 text-[15px] leading-relaxed text-forest/70">
          {item.a}
        </div>
      ) : null}
    </li>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5l4 4 4-4" />
    </svg>
  );
}
