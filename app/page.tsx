import type { Metadata } from "next"
import Navbar from "@/components/landing/navbar"
import Hero from "@/components/landing/hero"
import ProblemSection from "@/components/landing/problem-section"
import SolutionSection from "@/components/landing/solution-section"
import Features from "@/components/landing/features"
import CTA from "@/components/landing/cta"
import EnhancedFooter from "@/components/landing/enhanced-footer"

export const metadata: Metadata = {
  title: "ContextTree - Keep Every Thread in Sight",
  description: "An interactive, node-based canvas that preserves your main chat while you explore side-conversations.",
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <Features />
        <CTA />
      </main>
      <EnhancedFooter />
    </>
  )
}
