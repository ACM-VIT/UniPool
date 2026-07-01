// Privacy. Plain document, single narrow column. Refined pass:
// no screaming uppercase tag, no eyebrow chip. A small italic
// "Last updated" line under the heading is enough.
export default function PrivacyPage() {
  return (
    <article className="py-20 sm:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-forest">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Privacy
          </h1>
          <p className="mt-3 text-sm italic text-forest/50">
            Last updated May 2026
          </p>

          <div className="mt-10 space-y-6 text-[16px] leading-relaxed text-forest/80">
            <p>
              UniPool collects what is needed to make rides work
              between students. We do not run third-party advertising
              or analytics trackers, and we do not sell data.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              What we collect
            </h2>
            <p>
              Account details from your sign-in (name, email, photo)
              and the university email we verify against your
              institute, if you choose to verify. Optional profile
              fields such as phone number, UPI VPA, gender, and year
              of birth. Approximate device location when you grant
              permission. Rides, bookings, and trip-chat messages.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Who sees what
            </h2>
            <p>
              Your name, photo, institute, and rating are visible to
              other users on every ride card. Your phone number and
              UPI VPA become visible to a host only after you request
              to join their ride. Your settings, location history,
              and raw chat data stay private to your account.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Payments
            </h2>
            <p>
              UniPool does not process payments. Money moves directly
              between you and the other rider over UPI.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Deletion
            </h2>
            <p>
              Email{" "}
              <a
                href="mailto:hello@unipool.acmvit.in"
                className="font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4"
              >
                hello@unipool.acmvit.in
              </a>{" "}
              from your registered address. Your profile is removed
              and past bookings are anonymised within 30 days.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Contact
            </h2>
            <p>
              <a
                href="mailto:hello@unipool.acmvit.in"
                className="font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4"
              >
                hello@unipool.acmvit.in
              </a>
              . The project is maintained by{" "}
              <a
                href="https://acmvit.in"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4"
              >
                ACM-VIT
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
