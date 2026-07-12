import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The plain-language terms for using ContextTree: BYOK responsibility, acceptable use, the Founding license, and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Context Tree
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12 pb-24">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Plain-language version — the legally binding text will be reviewed
          before paid launch.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Effective date: July 12, 2026
        </p>

        <h2 className="mt-8 text-lg font-semibold">What ContextTree is</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          ContextTree is a branching AI-chat studio: a canvas where
          conversations fork into branches, each branch sees only its own
          history, and any branch can run on a different AI model. You sign in
          with Google and, on the free tier, bring your own API key for the
          model providers you want to use. By using ContextTree you agree to
          these terms.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Bring your own key</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          When you add your own provider API key, requests to that provider are
          billed by the provider directly to you. Your provider costs are your
          own: we do not set, cap, or reimburse them. Keep an eye on your
          provider dashboard and set spending limits there — a runaway
          conversation is still your bill. Your keys are stored encrypted and
          used only to make the requests you initiate.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Acceptable use</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Keep it legal and keep it fair:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            No unlawful content or use — nothing that breaks the law or the
            terms of the model providers you route requests to.
          </li>
          <li>
            No abusing free-tier quotas — no scripting, multi-accounting, or
            other tricks to extract more free usage than intended.
          </li>
          <li>
            No attacking the service — no attempts to break, overload, or gain
            unauthorized access to ContextTree or other users&apos; data.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We may suspend or close accounts that break these rules.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Founding license</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The Founding license is a planned one-time payment that unlocks the
          features described at the point of purchase. It is not a
          subscription: you pay once and the license does not expire. It covers
          the features described when you buy — not every future feature we
          might ever build. Purchasing is not live yet; these terms will be
          updated when it is.
        </p>

        <h2 className="mt-8 text-lg font-semibold">No warranty</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          ContextTree is provided as-is. We work hard to keep it fast,
          reliable, and correct, but we cannot promise it will always be
          available, bug-free, or that AI model output will be accurate or
          suitable for any particular purpose. Do not rely on it for anything
          where an outage or a wrong answer would cause serious harm.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Limitation of liability</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          In plain words: to the maximum extent the law allows, we are not
          liable for indirect damage — lost profits, lost data, provider bills
          you ran up, or consequences of acting on model output. If we are ever
          liable for something, our total liability is capped at what you paid
          us in the twelve months before the claim (which, on the free tier, is
          nothing).
        </p>

        <h2 className="mt-8 text-lg font-semibold">Changes to these terms</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We may update these terms as the product evolves — for example when
          the Founding license goes live. For meaningful changes we will update
          the effective date at the top and, where we reasonably can, notify
          you in the app or by email. Continuing to use ContextTree after a
          change means you accept the updated terms.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Governing law</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          These terms are governed by the laws of the Netherlands (placeholder
          — to be confirmed in the legal review before paid launch).
        </p>

        <h2 className="mt-8 text-lg font-semibold">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Questions about these terms:{" "}
          <a
            href="mailto:chinmay@contexttree.tech"
            className="text-primary hover:underline"
          >
            chinmay@contexttree.tech
          </a>
          .
        </p>
      </main>
    </div>
  );
}
