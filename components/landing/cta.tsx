import Link from "next/link"
import { Button } from "@/components/ui/button"
import AnimateInView from "./animate-in-view"

export default function CTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView animation="fadeUp">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to Transform Your Conversations?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start organizing your thoughts and exploring ideas without losing context. ContextTree makes complex
              conversations manageable.
            </p>
            <div className="mt-8">
              <Link href="/canvas">
                <Button size="lg" className="px-8">
                  Try ContextTree Now
                </Button>
              </Link>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
