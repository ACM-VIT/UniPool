// Terms. Companion to /privacy in shape and tone. Same refinement
// pass: no screaming uppercase last-updated tag, no eyebrow chip.
export default function TermsPage() {
  return (
    <article className="py-20 sm:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-forest">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Terms
          </h1>
          <p className="mt-3 text-sm italic text-forest/50">
            Last updated May 2026
          </p>

          <div className="mt-10 space-y-6 text-[16px] leading-relaxed text-forest/80">
            <p>
              By signing in to UniPool you agree to these terms. The
              spirit: be honest, respect each other, and follow the
              law.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Who can use UniPool
            </h2>
            <p>
              You must be a student or staff member at a supported
              university, signing in with your institute email. You
              must be old enough to drive (if hosting) or to travel
              solo by ride (if riding) under your local laws.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              What UniPool is
            </h2>
            <p>
              UniPool is a coordination tool. It helps students post
              and find carpool rides on their own campus. UniPool is
              not a transportation provider, a taxi service, or a
              payment processor. It does not employ drivers.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Your responsibilities
            </h2>
            <p>
              Use a real name and a real photo. Hosts must have a
              valid driving license and a roadworthy vehicle. Pay your
              share. Do not no-show without notice. Treat other riders
              with respect.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Women-only rides
            </h2>
            <p>
              Female hosts may flag rides as women-only. Misuse of
              gender flags to access a restricted ride is grounds for
              removal.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Payments and refunds
            </h2>
            <p>
              Payments happen between rider and host directly over
              UPI. UniPool does not collect, hold, or refund money.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Reports and bans
            </h2>
            <p>
              Report a user from their profile if they break these
              rules. We review and act, typically within 48 hours.
            </p>

            <h2 className="pt-4 text-xl font-bold text-forest">
              Liability
            </h2>
            <p>
              UniPool is provided as-is. To the maximum extent the law
              allows, the project, ACM-VIT, and its maintainers are
              not liable for any loss, damage, or injury arising from
              your use of the app or the rides you take through it.
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
              .
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
