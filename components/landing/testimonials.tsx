"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  Star,
  Heart,
  Zap,
} from "lucide-react";
import AnimateInView from "./animate-in-view";

const testimonials = [
  {
    quote:
      "ContextTree saved my PhD! I was drowning in scattered research conversations until I found this. Now I can actually see how everything connects. It's like having a superpower for organizing thoughts.",
    author: "Dr. Sarah Chen",
    title: "AI Researcher at Stanford University",
    avatar: "/professional-woman-portrait.png",
    emotion: "Relief & Empowerment",
    before: "Overwhelmed researcher",
    after: "Organized thought leader",
    impact: "3x faster literature reviews",
  },
  {
    quote:
      "I went from constantly losing track of important insights to having every brilliant idea perfectly preserved and connected. ContextTree doesn't just organize conversations - it amplifies intelligence.",
    author: "Michael Rodriguez",
    title: "PhD Candidate in Computer Science",
    avatar: "/young-man-glasses-portrait.png",
    emotion: "Confidence & Clarity",
    before: "Forgetful student",
    after: "Insightful researcher",
    impact: "Zero lost insights",
  },
  {
    quote:
      "The visual canvas is pure magic. Watching my scattered thoughts transform into a beautiful, connected knowledge graph gives me actual chills. This is the future of human-AI collaboration.",
    author: "Dr. Emily Johnson",
    title: "Professor of Cognitive Science",
    avatar: "/female-professor-portrait.png",
    emotion: "Wonder & Excitement",
    before: "Linear thinker",
    after: "Systems thinker",
    impact: "Revolutionary teaching methods",
  },
  {
    quote:
      "I used to dread complex AI conversations because I'd always lose context. Now I look forward to them! ContextTree turned my biggest frustration into my secret weapon.",
    author: "James Wilson",
    title: "Technical Writer & Content Strategist",
    avatar: "/professional-man-portrait.png",
    emotion: "Joy & Anticipation",
    before: "Frustrated writer",
    after: "Confident creator",
    impact: "5x more productive",
  },
  {
    quote:
      "This tool literally changed how my brain works. I can now think in networks instead of lines. My clients are amazed by the depth and connection of my insights.",
    author: "Lisa Martinez",
    title: "Innovation Consultant",
    avatar: "/diverse-avatars.png",
    emotion: "Transformation & Pride",
    before: "Good consultant",
    after: "Extraordinary strategist",
    impact: "Client retention up 90%",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const next = () => {
    setCurrent((current + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrent((current - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      next();
    }, 6000);

    return () => clearInterval(interval);
  }, [current, autoplay]);

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.05),transparent_70%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium mb-6 border border-yellow-500/20">
              <Star className="h-4 w-4 mr-2" />
              <span>Real Transformations</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className="text-foreground">From Chaos to Clarity:</span>
              <br />
              <span className="text-gradient bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                Life-Changing Stories
              </span>
            </h2>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Discover how ContextTree has transformed the way thousands of
              people think, learn, and create.
              <span className="text-foreground font-medium">
                {" "}
                These aren't just testimonials - they're transformation stories.
              </span>
            </p>
          </AnimateInView>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
              >
                {/* Left: Testimonial Content */}
                <div className="space-y-8">
                  {/* Quote */}
                  <div className="relative">
                    <Quote className="absolute -top-4 -left-4 h-8 w-8 text-primary/20" />
                    <blockquote className="text-lg md:text-xl leading-relaxed text-foreground italic pl-8">
                      "{testimonials[current].quote}"
                    </blockquote>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20 border-2 border-primary/30 overflow-hidden">
                      <img
                        src={testimonials[current].avatar}
                        alt={testimonials[current].author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {testimonials[current].author}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {testimonials[current].title}
                      </div>
                    </div>
                  </div>

                  {/* Emotional Impact */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-5 w-5 text-pink-500" />
                      <span className="font-semibold text-foreground">
                        Emotional Transformation
                      </span>
                    </div>
                    <div className="text-pink-600 font-medium text-lg italic">
                      "{testimonials[current].emotion}"
                    </div>
                  </div>
                </div>

                {/* Right: Transformation Visual */}
                <div className="space-y-6">
                  {/* Before/After */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="font-semibold text-red-600">
                          Before ContextTree
                        </span>
                      </div>
                      <div className="text-foreground font-medium">
                        {testimonials[current].before}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-gradient-to-r from-primary to-green-500 p-2 rounded-full">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-semibold text-green-600">
                          After ContextTree
                        </span>
                      </div>
                      <div className="text-foreground font-medium">
                        {testimonials[current].after}
                      </div>
                    </div>
                  </div>

                  {/* Measurable Impact */}
                  <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 rounded-xl p-6 text-center">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Measurable Impact
                    </div>
                    <div className="text-2xl font-bold text-gradient bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                      {testimonials[current].impact}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={() => {
                  setAutoplay(false);
                  prev();
                }}
                className="p-3 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Dots indicator */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setAutoplay(false);
                      setCurrent(index);
                    }}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === current
                        ? "bg-primary scale-125"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  setAutoplay(false);
                  next();
                }}
                className="p-3 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Social Proof Stats */}
        <AnimateInView animation="fadeUp" delay={0.3}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                10,000+
              </div>
              <div className="text-sm text-muted-foreground">
                Transformed Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-500 mb-2">
                95%
              </div>
              <div className="text-sm text-muted-foreground">
                Report Better Focus
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-500 mb-2">
                4.9★
              </div>
              <div className="text-sm text-muted-foreground">
                Average Rating
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-2">
                75%
              </div>
              <div className="text-sm text-muted-foreground">
                Productivity Increase
              </div>
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  );
}
