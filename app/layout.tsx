import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import { AOSProvider } from "@/components/aos-provider";
import { Toaster } from "@/components/ui/toaster";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://contexttree.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ContextTree - Branching AI Chat and Multi-Model AI Canvas",
    template: "%s | ContextTree",
  },
  description:
    "ContextTree is a branching AI chat workspace and multi-model AI canvas for forking conversations, comparing LLMs, and avoiding context drift.",
  keywords: [
    "branching AI chat",
    "AI conversation tree",
    "fork AI conversation",
    "AI branching canvas",
    "multi-branch LLM chat",
    "ChatGPT alternative",
    "multi model AI chat tool",
    "organize AI conversations",
    "AI chat context window problem",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ContextTree - Branching AI Chat and Multi-Model AI Canvas",
    description:
      "Fork AI conversations, compare models side by side, and keep long-running work organized on a visual conversation tree.",
    url: "/",
    siteName: "ContextTree",
    images: [
      {
        url: "/contexttree-ui-screenshot.png",
        width: 1200,
        height: 630,
        alt: "ContextTree branching AI chat canvas",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextTree - Branching AI Chat and Multi-Model AI Canvas",
    description:
      "A visual AI conversation tree for branching chats, comparing LLMs, and avoiding context drift.",
    images: ["/contexttree-ui-screenshot.png"],
  },
  icons: {
    icon: "/tree-icon.svg",
    shortcut: "/tree-icon.svg",
    apple: "/tree-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <style>{`
html {
  font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
}
        `}</style>
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AOSProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </AOSProvider>
      </body>
    </html>
  );
}
