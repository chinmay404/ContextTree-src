"use client"

import { GitBranch, Network, MessageSquare, Zap, Link2, ImageIcon } from "lucide-react"
import AnimateInView from "./animate-in-view"

const features = [
  {
    icon: <Network className="h-6 w-6 text-primary" />,
    title: "Interactive Canvas",
    description: "Visualize your conversations as an interconnected network of thoughts and ideas.",
  },
  {
    icon: <GitBranch className="h-6 w-6 text-orange-500" />,
    title: "Branch Conversations",
    description: "Create branches to explore tangential topics without losing your main thread.",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-blue-500" />,
    title: "Context Preservation",
    description: "Never lose context again. Each node maintains its own conversation history.",
  },
  {
    icon: <Link2 className="h-6 w-6 text-green-500" />,
    title: "Connect Related Thoughts",
    description: "Link related conversation nodes to create a knowledge graph of your discussions.",
  },
  {
    icon: <ImageIcon className="h-6 w-6 text-purple-500" />,
    title: "Rich Media Support",
    description: "Add images and other media to your conversation nodes for visual context.",
  },
  {
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    title: "Multiple AI Models",
    description: "Switch between different AI models for specialized knowledge and capabilities.",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">The Researcher's Tab Manager for Chats</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            ContextTree helps you organize complex conversations and explore multiple threads without losing focus.
          </p>
        </AnimateInView>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <AnimateInView key={index} animation="fadeUp" delay={index * 0.1}>
              <div className="bg-background rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="bg-muted/50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
