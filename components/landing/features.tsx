"use client"

import { GitBranch, Network, MessageSquare, Zap, Link2, ImageIcon } from "lucide-react"
import AnimateInView from "./animate-in-view"
import { motion } from "framer-motion"

const features = [
  {
    icon: <Network className="h-6 w-6 text-primary" />,
    title: "Interactive Canvas",
    description: "Visualize your conversations as an interconnected network of thoughts and ideas.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: <GitBranch className="h-6 w-6 text-orange-500" />,
    title: "Branch Conversations",
    description: "Create branches to explore tangential topics without losing your main thread.",
    color: "from-orange-500/20 to-orange-500/5",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-blue-500" />,
    title: "Context Preservation",
    description: "Never lose context again. Each node maintains its own conversation history.",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: <Link2 className="h-6 w-6 text-green-500" />,
    title: "Connect Related Thoughts",
    description: "Link related conversation nodes to create a knowledge graph of your discussions.",
    color: "from-green-500/20 to-green-500/5",
  },
  {
    icon: <ImageIcon className="h-6 w-6 text-purple-500" />,
    title: "Rich Media Support",
    description: "Add images and other media to your conversation nodes for visual context.",
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    title: "Multiple AI Models",
    description: "Switch between different AI models for specialized knowledge and capabilities.",
    color: "from-yellow-500/20 to-yellow-500/5",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Network className="h-4 w-4 mr-2" />
            <span>Key Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">The Researcher's Tab Manager for Chats</h2>
          <p className="text-lg text-muted-foreground">
            ContextTree helps you organize complex conversations and explore multiple threads without losing focus.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <AnimateInView key={index} animation="fadeUp" delay={index * 0.1}>
              <motion.div
                className="bg-background rounded-xl p-6 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 h-full"
                whileHover={{
                  y: -5,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-sm`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            </AnimateInView>
          ))}
        </div>

        <div className="mt-16 text-center">
          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <a href="#how-it-works" className="inline-flex items-center text-primary font-medium hover:underline">
              <span>See how it works</span>
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
