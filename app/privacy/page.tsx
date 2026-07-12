import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What ContextTree collects, where it is stored, who processes it, and how to get your data out.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
            href="/terms"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12 pb-24">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Plain-language version — the legally binding text will be reviewed
          before paid launch.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Effective date: July 12, 2026
        </p>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          ContextTree is a branching AI-chat studio. This page explains, in
          plain words, what data we collect when you use it, where that data
          lives, who touches it, and how you get it out or delete it.
        </p>

        <h2 className="mt-8 text-lg font-semibold">What we collect</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Your Google account basics</span>{" "}
            — name, email address, and avatar — used only to sign you in and
            identify your account. We never see your Google password.
          </li>
          <li>
            <span className="text-foreground">Your conversations and canvases</span>{" "}
            — the messages, branches, and canvas structures you create. That is
            the product; we store it so your work is there when you come back.
          </li>
          <li>
            <span className="text-foreground">Your provider API keys</span> —
            if you bring your own key (OpenAI, Anthropic, Google, Groq), it is
            encrypted at rest before it is stored.
          </li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold">Where it is stored</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Conversations, canvases, and account data are stored in a Postgres
          database hosted by Supabase in the EU. API keys are encrypted at rest
          in the same database.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Who processes your data</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We run on a small set of infrastructure providers, and your messages
          go to the AI model you choose:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Vercel</span> — hosts the web
            application.
          </li>
          <li>
            <span className="text-foreground">Railway</span> — hosts backend
            services.
          </li>
          <li>
            <span className="text-foreground">Supabase</span> — hosts the
            database (EU).
          </li>
          <li>
            <span className="text-foreground">LLM providers you select</span> —
            when you send a message, that message and its branch context are
            sent to the model provider you picked (e.g. OpenAI, Anthropic,
            Google, Groq) so it can generate a reply. Their handling of that
            request is governed by their own terms.
          </li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold">What we do not do</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>No ads.</li>
          <li>No selling your data — to anyone, ever.</li>
          <li>No third-party analytics or tracking scripts at present. If
            that changes, this page changes first.</li>
          <li>No training AI models on your conversations.</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold">Retention and deletion</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We keep your data until you delete your account — nothing is kept
          longer than it needs to be. Self-serve export and account deletion
          are being built; until they ship, email us and we will export
          everything you have or delete your account and all of its data,
          usually within a few days.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Questions, export requests, deletion requests:{" "}
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
