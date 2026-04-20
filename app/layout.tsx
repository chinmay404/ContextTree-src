import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import { AOSProvider } from "@/components/aos-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ContextTree - Visual Canvas for LLM Conversations",
  description:
    "Branch your AI chats, compare models side-by-side, and never lose context. The visual canvas for thoughtful LLM exploration.",
  keywords: ["AI", "LLM", "ChatGPT", "Claude", "Llama", "conversation", "branching", "context", "comparison"],
  icons: {
    icon: "/tree-icon.svg",
    shortcut: "/tree-icon.svg",
    apple: "/tree-icon.svg",
  },
  openGraph: {
    title: "ContextTree - Visual Canvas for LLM Conversations",
    description: "Branch your AI chats, compare models side-by-side, and never lose context.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextTree - Visual Canvas for LLM Conversations",
    description: "Branch your AI chats, compare models side-by-side, and never lose context.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} bg-background`}>
      <head>
        <style>{`
html {
  font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
}
        `}</style>
      </head>
      <body className="bg-background text-foreground antialiased">
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
