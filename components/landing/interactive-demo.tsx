"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Move, ZoomIn, Plus, Cpu, RotateCcw } from "lucide-react"
import Link from "next/link"
import AnimateInView from "./animate-in-view"

export default function InteractiveDemo() {
  const [isLoaded, setIsLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isInView, setIsInView] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if the section is in view for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
      },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  const handleIframeLoad = () => {
    setIsLoaded(true)
  }

  return (
    <section ref={containerRef} className="py-24 bg-background" id="interactive-demo">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Try It Yourself</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Experience ContextTree's interactive canvas right here. Pan, zoom, and create branches to see how it works.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Interactive Canvas (60% width on desktop) */}
          <div className="lg:col-span-3 relative">
            <AnimateInView animation="fadeRight">
              <div className="bg-muted rounded-xl p-4 shadow-sm border border-border">
                <div
                  className="relative bg-background rounded-lg border border-border overflow-hidden"
                  style={{ minHeight: "500px" }}
                >
                  {/* Loading state */}
                  {(!isLoaded || !isInView) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                      <div className="flex flex-col items-center">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                          <div
                            className="absolute inset-0 border-4 border-primary rounded-full animate-spin"
                            style={{ borderTopColor: "transparent", animationDuration: "1.5s" }}
                          ></div>
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">Loading interactive canvas...</p>
                      </div>
                    </div>
                  )}

                  {/* Iframe with sandbox */}
                  {isInView && (
                    <iframe
                      ref={iframeRef}
                      src="/canvas"
                      title="ContextTree Interactive Canvas Sandbox"
                      loading="lazy"
                      width="100%"
                      height="600"
                      style={{ border: "none", minHeight: "500px" }}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      onLoad={handleIframeLoad}
                      aria-label="Interactive demo of ContextTree's canvas interface"
                      aria-describedby="demo-description"
                    ></iframe>
                  )}

                  {/* Fallback for no JavaScript */}
                  <noscript>
                    <div className="p-8 text-center">
                      <img
                        src="/placeholder-xd1rg.png"
                        alt="ContextTree Canvas Interface"
                        className="mx-auto mb-4 rounded-lg border border-border"
                      />
                      <p className="text-muted-foreground mb-4">JavaScript is required to view the interactive demo.</p>
                      <Link href="/canvas" className="text-primary underline">
                        Open the full application instead
                      </Link>
                    </div>
                  </noscript>
                </div>
              </div>
            </AnimateInView>
          </div>

          {/* Instructions (40% width on desktop) */}
          <div className="lg:col-span-2">
            <AnimateInView animation="fadeLeft">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold" id="demo-description">
                  Try the Interactive Canvas
                </h3>
                <p className="text-base text-muted-foreground">
                  Pan, zoom, and branch off in real-time. Experiment with subgraphs and switch LLM models—all within
                  this live sandbox.
                </p>

                <div className="bg-muted/30 p-5 rounded-lg border border-border">
                  <h4 className="text-base font-medium mb-3">Quick Tips</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                        <Move className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pan the Canvas</p>
                        <p className="text-xs text-muted-foreground">Click & drag or use arrow keys to move around.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                        <ZoomIn className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Zoom In/Out</p>
                        <p className="text-xs text-muted-foreground">Use scroll wheel or pinch on touch devices.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Create Subgraphs</p>
                        <p className="text-xs text-muted-foreground">Hover over a node and click "+" to branch off.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                        <Cpu className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Switch Models</p>
                        <p className="text-xs text-muted-foreground">Use the model dropdown in any branch header.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                        <RotateCcw className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reset View</p>
                        <p className="text-xs text-muted-foreground">Double-click empty canvas space to center view.</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm mb-2">
                    <span className="font-medium">Pro Tip:</span> Try creating multiple branches from the same node to
                    compare different approaches to a problem.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This is especially useful when exploring complex topics with multiple angles.
                  </p>
                </div>
              </div>
            </AnimateInView>
          </div>
        </div>

        {/* CTA Button */}
        <AnimateInView animation="fadeUp" className="mt-10 text-center">
          <Link href="/canvas">
            <Button size="lg" className="px-8">
              Open Full-Screen Demo
            </Button>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">No sign-up required. Jump right in and start exploring.</p>
        </AnimateInView>
      </div>
    </section>
  )
}
