import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import { AOSProvider } from "@/components/aos-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ContextTree - Conversational Flow Builder",
  description:
    "Build and test conversational flows with visual nodes and AI integration",
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
