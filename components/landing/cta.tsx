"use client"

import { motion } from "framer-motion"
import { ArrowRight, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AnimateInView from "./animate-in-view"

export default function CTA() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl border border-border/40 shadow-xl overflow-hidden">
          <div className="p-8 md:p-12">
            <AnimateInView animation="fadeUp">
              <div className="text-center mb-8">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <GitBranch className="h-4 w-4 mr-2" />
                  <span>Get Started Today</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                  Ready to Transform Your Research Process?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of researchers who use ContextTree to organize complex conversations and explore
                  multiple threads without losing focus.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/canvas">
                    <Button
                      size="lg"
                      className="px-8 rounded-full shadow-glow hover:shadow-glow-hover transition-all duration-500"
                    >
                      Try It Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
                <Button variant="outline" size="lg" className="px-8 rounded-full border-primary/20 hover:bg-primary/5">
                  Watch Demo
                </Button>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                No credit card required. Free plan available forever.
              </div>
            </AnimateInView>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-primary/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2" />
        </div>
      </div>
    </section>
  )
}
