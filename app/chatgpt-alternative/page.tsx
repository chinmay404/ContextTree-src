import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  GitBranch,
  Layers,
  MessageSquare,
  Split,
  X,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ChatGPT Alternative for Branching AI Conversations",
  description:
    "Compare ContextTree with linear chat tools. Fork AI conversations, organize long-running work, and compare multiple LLMs on a visual branching canvas.",
  alternates: {
    canonical: "/chatgpt-alternative",
  },
  openGraph: {
    title: "ContextTree vs ChatGPT - Branching AI Chat Alternative",
    description:
      "A ChatGPT alternative for AI power users who need conversation trees, context isolation, and multi-model comparison.",
    url: "/chatgpt-alternative",
    images: [
      {
        url: "/contexttree-ui-screenshot.png",
        width: 1200,
        height: 630,
        alt: "ContextTree multi-branch AI chat canvas",
      },
    ],
  },
};

const comparisonRows = [
  {
    feature: "Fork conversations from any message",
    chatgpt: false,
    contexttree: true,
  },
  {
    feature: "Visual AI conversation tree",
    chatgpt: false,
    contexttree: true,
  },
  {
    feature: "Isolated branch context",
    chatgpt: false,
    contexttree: true,
  },
  {
    feature: "Multi-model comparison in one canvas",
    chatgpt: false,
    contexttree: true,
  },
  {
    feature: "Fast single-thread chat",
    chatgpt: true,
    contexttree: true,
  },
];

const useCases = [
  {
    icon: GitBranch,
    title: "Prompt experiments",
    copy: "Try different instructions from the same starting point without copying the whole conversation again.",
  },
  {
    icon: Layers,
    title: "Long research sessions",
    copy: "Keep hypotheses, source notes, and alternative paths organized instead of buried in one timeline.",
  },
  {
    icon: Split,
    title: "Model comparison",
    copy: "Run the same question through different LLMs and keep the strongest answer path.",
  },
];

export default function ChatGPTAlternativePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-slate-900">
              ContextTree
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_0.86fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            ChatGPT alternative for branching AI chat
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
            A ChatGPT alternative for conversations that branch.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            ChatGPT is strong for linear chat. ContextTree is built for AI power
            users who need an AI conversation tree: fork any message, compare
            multiple models, and keep long-running work from drifting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Start branching
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              See product
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4" />
            Why people switch
          </div>
          <div className="space-y-3">
            {[
              "ChatGPT loses context in long conversations.",
              "Copying prompts between chats creates messy workflows.",
              "Comparing model answers manually takes too much time.",
              "One linear thread makes research and prompt testing hard to audit.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              ContextTree vs ChatGPT
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Use ChatGPT when you need a simple answer. Use ContextTree when
              the work needs branching, comparison, and durable context.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr] bg-slate-50 text-sm font-semibold text-slate-700">
              <div className="border-r border-slate-200 p-4">Capability</div>
              <div className="border-r border-slate-200 p-4 text-center">
                ChatGPT
              </div>
              <div className="p-4 text-center">ContextTree</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1.4fr_0.7fr_0.7fr] border-t border-slate-200 bg-white text-sm"
              >
                <div className="border-r border-slate-200 p-4 font-medium text-slate-800">
                  {row.feature}
                </div>
                <div className="flex items-center justify-center border-r border-slate-200 p-4">
                  {row.chatgpt ? (
                    <Check className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <X className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <div className="flex items-center justify-center p-4">
                  {row.contexttree ? (
                    <Check className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <X className="h-5 w-5 text-slate-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Built for AI workflows ChatGPT was not designed to organize.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {useCases.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
