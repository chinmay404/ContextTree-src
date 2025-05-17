"use client"

import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function CTA() {
  const { data: session } = useSession()

  return (
    <section className="py-20 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your conversations?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Start exploring branched conversations with ContextTree today. No more lost threads or context switching.
        </p>
        {session ? (
          <Link href="/canvas">
            <Button size="lg" className="px-8">
              Go to Canvas
            </Button>
          </Link>
        ) : (
          <Link href="/auth/signup">
            <Button size="lg" className="px-8">
              Get Started for Free
            </Button>
          </Link>
        )}
      </div>
    </section>
  )
}
