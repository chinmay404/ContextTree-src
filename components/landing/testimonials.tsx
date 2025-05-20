"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import AnimateInView from "./animate-in-view"

const testimonials = [
  {
    quote:
      "ContextTree has completely transformed how I conduct my research. Being able to branch conversations and explore tangential topics without losing my main thread is invaluable.",
    author: "Dr. Sarah Chen",
    title: "AI Researcher at Stanford University",
    avatar: "/professional-woman-portrait.png",
  },
  {
    quote:
      "As a PhD student juggling multiple research directions, ContextTree helps me keep everything organized. The visual canvas makes it easy to see connections between different conversation threads.",
    author: "Michael Rodriguez",
    title: "PhD Candidate in Computer Science",
    avatar: "/young-man-glasses-portrait.png",
  },
  {
    quote:
      "The ability to create branches and connect related concepts has been a game-changer for my literature review process. I can explore different papers while maintaining the overall structure.",
    author: "Dr. Emily Johnson",
    title: "Professor of Cognitive Science",
    avatar: "/female-professor-portrait.png",
  },
  {
    quote:
      "I use ContextTree daily for my technical writing. Being able to branch off to explore different approaches while keeping the main thread intact has improved my productivity tremendously.",
    author: "James Wilson",
    title: "Technical Writer & Researcher",
    avatar: "/professional-man-portrait.png",
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  const next = () => {
    setCurrent((current + 1) % testimonials.length)
  }

  const prev = () => {
    setCurrent((current - 1 + testimonials.length) % testimonials.length)
  }

  useEffect(() => {
    if (!autoplay) return

    const interval = setInterval(() => {
      next()
    }, 5000)

    return () => clearInterval(interval)
  }, [current, autoplay])

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] translate-x-1/2" />
      <div className="absolute bottom-1/3 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] -translate-x-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Quote className="h-4 w-4 mr-2" />
            <span>Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">What Our Users Say</h2>
          <p className="text-lg text-muted-foreground">
            Researchers and professionals trust ContextTree to organize their complex conversations.
          </p>
        </AnimateInView>

        <div className="relative max-w-4xl mx-auto">
          <div
            className="absolute top-1/2 -left-4 md:-left-12 transform -translate-y-1/2 z-10"
            onMouseEnter={() => setAutoplay(false)}
          >
            <button
              onClick={prev}
              className="h-10 w-10 rounded-full bg-background border border-border/40 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          <div
            className="absolute top-1/2 -right-4 md:-right-12 transform -translate-y-1/2 z-10"
            onMouseEnter={() => setAutoplay(false)}
          >
            <button
              onClick={next}
              className="h-10 w-10 rounded-full bg-background border border-border/40 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="relative h-[300px] md:h-[250px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-4"
                onMouseEnter={() => setAutoplay(false)}
                onMouseLeave={() => setAutoplay(true)}
              >
                <div className="text-primary mb-6 opacity-80">
                  <Quote className="h-10 w-10" />
                </div>
                <blockquote className="text-center mb-6">
                  <p className="text-lg md:text-xl italic text-foreground max-w-2xl">"{testimonials[current].quote}"</p>
                </blockquote>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                    <img
                      src={testimonials[current].avatar || "/placeholder.svg"}
                      alt={testimonials[current].author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{testimonials[current].author}</div>
                    <div className="text-sm text-muted-foreground">{testimonials[current].title}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrent(index)
                  setAutoplay(false)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-8">
          {["Stanford University", "MIT", "Google Research", "OpenAI", "Harvard"].map((org, index) => (
            <div key={index} className="text-muted-foreground/60 font-medium text-sm md:text-base">
              {org}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
