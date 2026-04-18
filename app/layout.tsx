import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import { AOSProvider } from "@/components/aos-provider";
import { Toaster } from "@/components/ui/toaster";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContextTree — Learn Anything Deeply with AI",
  description:
    "A visual canvas for studying with AI. Branch for every rabbit hole. Never lose your main thread. Works with Claude, GPT-4, Gemini, and open-source models.",
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}>
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
