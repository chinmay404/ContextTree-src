"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  GitBranch,
  CheckCircle,
  Clock,
  Users,
  Star,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AnimateInView from "./animate-in-view";
import { useState, useEffect } from "react";

export default function CTA() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 32,
  });

  // Simulate countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Limited Time Offer Banner */}
          {/* <AnimateInView animation="fadeUp">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-400 text-sm font-medium mb-4">
                <Clock className="h-4 w-4 mr-2" />
                <span>Limited Time: Early Access Pricing</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-orange-400">
                <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
                <span>:</span>
                <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
                <span>:</span>
                <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
              </div>
            </div>
          </AnimateInView> */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Pricing Details Coming Soon
            </h2>
            <p className="text-lg text-muted-foreground">
              We're working on our pricing plans. Join the waitlist to be the
              first to know when we launch.
            </p>
          </div>

          <div className="bg-background/80 backdrop-blur-md rounded-2xl border border-border/40 shadow-xl overflow-hidden">
            <div className="p-8 md:p-12">
              <AnimateInView animation="fadeUp">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                    <GitBranch className="h-4 w-4 mr-2" />
                    <span>Join 10,000+ Researchers</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Stop Losing Your Best Ideas
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                    Every minute you wait is another breakthrough conversation
                    lost to chaos. ContextTree users report{" "}
                    <span className="text-primary font-semibold">
                      3x more insights
                    </span>{" "}
                    and
                    <span className="text-primary font-semibold">
                      {" "}
                      50% less frustration
                    </span>{" "}
                    in their research.
                  </p>
                </div>

                {/* Social proof stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold text-primary">
                        10,000+
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Active researchers
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-2xl font-bold text-yellow-500">
                        4.9/5
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      User satisfaction
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Zap className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-2xl font-bold text-orange-500">
                        3x
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      More insights captured
                    </p>
                  </div>
                </div>

                {/* Value propositions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Never lose context mid-conversation</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Explore multiple ideas simultaneously</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Visual organization that makes sense</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>Export and share your research</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href="/canvas">
                      <Button
                        size="lg"
                        className="px-12 py-4 text-lg rounded-full shadow-glow hover:shadow-glow-hover transition-all duration-500 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        Start Your Free Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </motion.div>
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 text-lg rounded-full border-primary/20 hover:bg-primary/5"
                  >
                    Watch 2-Min Demo
                  </Button>
                </div>

                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-green-500 mr-1" />
                      <span>No credit card required</span>
                    </div>
                    <span className="text-border">•</span>
                    <span>Free plan forever</span>
                    <span className="text-border">•</span>
                    <span>Cancel anytime</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    Join researchers from Stanford, MIT, and Harvard who trust
                    ContextTree
                  </p>
                </div>
              </AnimateInView>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-primary/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2" />
            <div className="absolute top-1/2 left-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl -translate-x-1/2" />
          </div>
        </div>
      </div>
    </section>
  );
}
