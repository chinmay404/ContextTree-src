"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Network, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import AnimateInView from "./animate-in-view"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started and exploring the basics.",
    price: "$0",
    period: "forever",
    features: ["5 conversation nodes", "Basic branching", "Standard AI models", "7-day history", "Community support"],
    cta: "Get Started",
    popular: false,
    color: "from-blue-400/80 to-blue-600",
    hoverColor: "group-hover:from-blue-400 group-hover:to-blue-600",
  },
  {
    name: "Pro",
    description: "For researchers who need more power and flexibility.",
    price: "$12",
    period: "per month",
    features: [
      "Unlimited conversation nodes",
      "Advanced branching & merging",
      "Premium AI models",
      "Unlimited history",
      "Priority support",
      "Export & sharing",
      "Custom templates",
    ],
    cta: "Upgrade to Pro",
    popular: true,
    color: "from-primary/80 to-primary",
    hoverColor: "group-hover:from-primary/90 group-hover:to-primary",
  },
  {
    name: "Team",
    description: "Collaborative features for research teams.",
    price: "$29",
    period: "per user/month",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Shared workspaces",
      "Admin controls",
      "Usage analytics",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
    color: "from-purple-400/80 to-purple-600",
    hoverColor: "group-hover:from-purple-400 group-hover:to-purple-600",
  },
]

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] translate-x-1/2" />
      <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -translate-x-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Network className="h-4 w-4 mr-2" />
            <span>Simple Pricing</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Choose Your Plan</h2>
          <p className="text-lg text-muted-foreground">Start for free and upgrade as your research needs grow.</p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center p-1 bg-muted/50 rounded-full">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                billingPeriod === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                billingPeriod === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly <span className="text-xs text-primary">Save 20%</span>
            </button>
          </div>
        </AnimateInView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <AnimateInView key={index} animation="fadeUp" delay={index * 0.1}>
              <motion.div
                className={`relative rounded-xl overflow-hidden border border-border/40 transition-all duration-300 group ${
                  plan.popular ? "md:-mt-4 md:mb-4" : ""
                }`}
                whileHover={{
                  y: -5,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/80 to-primary"></div>
                )}

                <div className="p-6 md:p-8 bg-background">
                  {plan.popular && (
                    <div className="absolute top-6 right-6">
                      <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">
                        {billingPeriod === "yearly"
                          ? `$${Math.floor(Number.parseInt(plan.price.replace("$", "")) * 0.8 * 12)}`
                          : plan.price}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {billingPeriod === "yearly" ? "/year" : `/${plan.period}`}
                      </span>
                    </div>
                    {billingPeriod === "yearly" && plan.price !== "$0" && (
                      <p className="text-xs text-primary mt-1">Save 20% with annual billing</p>
                    )}
                  </div>

                  <div className="mb-8">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="ml-3 text-sm">{feature}</span>

                          {feature.includes("Premium AI") && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="ml-1 text-muted-foreground">
                                    <HelpCircle className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-[200px]">
                                    Access to GPT-4, Claude, and other premium AI models
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className={`w-full rounded-lg relative overflow-hidden group ${
                      plan.popular ? "shadow-glow hover:shadow-glow-hover" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <span className="relative z-10">{plan.cta}</span>
                    <span
                      className={`absolute inset-0 bg-gradient-to-r ${plan.color} opacity-0 ${plan.hoverColor} transition-opacity duration-300 ${plan.popular ? "opacity-100" : "opacity-0"}`}
                    ></span>
                  </Button>
                </div>
              </motion.div>
            </AnimateInView>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">Need a custom plan for your enterprise?</p>
          <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/5">
            Contact Our Sales Team
          </Button>
        </div>
      </div>
    </section>
  )
}
