import type { Metadata } from "next";
import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import ProblemSection from "@/components/landing/problem-section";
import SolutionSection from "@/components/landing/solution-section";
import Features from "@/components/landing/features";
import HowItWorks from "@/components/landing/how-it-works";
import FAQ from "@/components/landing/faq";
import CTA from "@/components/landing/cta";
import EnhancedFooter from "@/components/landing/enhanced-footer";
import PerformanceProvider from "@/components/performance-provider";

export const metadata: Metadata = {
  title:
    "ContextTree - Never Lose Your Train of Thought Again | AI Conversation Canvas",
  description:
    "Transform chaotic AI conversations into organized visual threads. ContextTree's interactive canvas preserves context while you explore ideas - no more lost conversations or forgotten insights.",
  keywords:
    "AI conversation tool, chat organization, conversation canvas, context preservation, AI productivity, thought mapping, conversation branches, visual chat interface, research tool, AI assistant",
  authors: [{ name: "ContextTree Team" }],
  creator: "ContextTree",
  publisher: "ContextTree",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://contexttree.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ContextTree - Never Lose Your Train of Thought Again",
    description:
      "Transform chaotic AI conversations into organized visual threads. Interactive canvas that preserves context while you explore ideas.",
    type: "website",
    url: "https://contexttree.app",
    siteName: "ContextTree",
    locale: "en_US",
    images: [
      {
        url: "/contexttree-logo.png",
        width: 1200,
        height: 630,
        alt: "ContextTree - AI Conversation Canvas",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextTree - Never Lose Your Train of Thought Again",
    description:
      "Transform chaotic AI conversations into organized visual threads.",
    creator: "@contexttree",
    images: ["/contexttree-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ContextTree",
    description:
      "Transform chaotic AI conversations into organized visual threads. ContextTree's interactive canvas preserves context while you explore ideas - no more lost conversations or forgotten insights.",
    url: "https://contexttree.app",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1247",
      bestRating: "5",
    },
    author: {
      "@type": "Organization",
      name: "ContextTree",
    },
    publisher: {
      "@type": "Organization",
      name: "ContextTree",
    },
  };
  return (
    <PerformanceProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <Features />
        <HowItWorks />
        {/* <Testimonials /> */}
        <FAQ />
        <CTA />
      </main>
      <EnhancedFooter />
    </PerformanceProvider>
  );
}
