"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  HelpCircle,
  Shield,
  Zap,
  Users,
  Download,
  Brain,
  Clock,
} from "lucide-react";
import AnimateInView from "./animate-in-view";

const faqs = [
  {
    question: "Will ContextTree really solve my conversation chaos?",
    answer:
      "Absolutely! ContextTree transforms the way you think about AI conversations. Instead of endless scrolling through linear chats, you'll have a visual map of all your thoughts and insights. 95% of our users report feeling more organized and focused within their first week.",
    icon: <Brain className="h-5 w-5" />,
    category: "effectiveness",
  },
  {
    question: "How quickly will I see results?",
    answer:
      "Most users experience the 'aha moment' within 15 minutes of using ContextTree. The visual clarity is immediate - you'll instantly see how your conversations connect. Within a week, you'll wonder how you ever managed without it.",
    icon: <Clock className="h-5 w-5" />,
    category: "timeline",
  },
  {
    question: "What if I'm not tech-savvy? Is this too complex?",
    answer:
      "ContextTree is designed for everyone! If you can use a smartphone, you can master ContextTree. Our intuitive interface requires zero technical knowledge. Plus, we provide guided onboarding to get you started immediately.",
    icon: <Zap className="h-5 w-5" />,
    category: "ease",
  },
  {
    question: "Can I collaborate with my team or colleagues?",
    answer:
      "Yes! Team collaboration is built-in. Multiple people can work on the same canvas, create branches, and share insights. It's perfect for research teams, study groups, or any collaborative thinking process.",
    icon: <Users className="h-5 w-5" />,
    category: "collaboration",
  },
  {
    question: "Is my sensitive research and data secure?",
    answer:
      "Security is our top priority. All conversations are encrypted end-to-end. We never use your data to train AI models, and you maintain complete ownership. Many universities and enterprises trust us with their most sensitive research.",
    icon: <Shield className="h-5 w-5" />,
    category: "security",
  },
  {
    question: "Can I export my work and insights?",
    answer:
      "Absolutely! Export your conversation graphs as beautiful PDFs, structured JSON, or markdown files. Your insights are yours forever - we make sure you never lose valuable work.",
    icon: <Download className="h-5 w-5" />,
    category: "export",
  },
  {
    question: "What AI models can I use with ContextTree?",
    answer:
      "ContextTree works with all major AI models - GPT-4, Claude, Gemini, and more. Switch between models seamlessly, or use multiple models in the same conversation to get diverse perspectives on your questions.",
    icon: <Brain className="h-5 w-5" />,
    category: "models",
  },
  {
    question: "What if I don't like it? Can I get my money back?",
    answer:
      "We're so confident you'll love ContextTree that we offer a 30-day money-back guarantee. No questions asked. But honestly, once you experience the clarity and organization, you won't want to go back to chaotic linear chats.",
    icon: <Shield className="h-5 w-5" />,
    category: "guarantee",
  },
];

const categories = {
  effectiveness: {
    name: "Results",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  timeline: { name: "Speed", color: "text-blue-500", bg: "bg-blue-500/10" },
  ease: {
    name: "Simplicity",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  collaboration: {
    name: "Teamwork",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  security: { name: "Security", color: "text-red-500", bg: "bg-red-500/10" },
  export: {
    name: "Ownership",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  models: {
    name: "AI Models",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  guarantee: {
    name: "Guarantee",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="py-24 md:py-32 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,hsl(var(--primary)/0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,hsl(var(--primary)/0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <AnimateInView animation="fadeUp">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-6 border border-blue-500/20">
              <HelpCircle className="h-4 w-4 mr-2" />
              <span>Questions & Concerns</span>
            </div>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.1}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Your Questions,</span>
              <br />
              <span className="text-gradient bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Honest Answers
              </span>
            </h2>
          </AnimateInView>

          <AnimateInView animation="fadeUp" delay={0.2}>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We understand you might have concerns about changing your
              workflow.
              <span className="text-foreground font-medium">
                {" "}
                Here's everything you need to know.
              </span>
            </p>
          </AnimateInView>
        </div>

        {/* FAQ Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <AnimateInView
                key={index}
                animation="fadeUp"
                delay={index * 0.05}
              >
                <motion.div
                  className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                  initial={false}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-muted/30 transition-colors duration-200"
                    aria-expanded={openIndex === index}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          categories[faq.category].bg
                        }`}
                      >
                        <div className={categories[faq.category].color}>
                          {faq.icon}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {faq.question}
                        </h3>
                        <div
                          className={`text-xs font-medium ${
                            categories[faq.category].color
                          } mt-1`}
                        >
                          {categories[faq.category].name}
                        </div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pl-16">
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimateInView>
            ))}
          </div>
        </div>

        {/* Trust Builders */}
        <AnimateInView animation="fadeUp" delay={0.3}>
          <div className="mt-16 text-center">
            <h3 className="text-xl font-semibold mb-8 text-foreground">
              Still have questions?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  Live Demo
                </h4>
                <p className="text-sm text-muted-foreground">
                  See ContextTree in action with a personalized demo
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  Talk to Users
                </h4>
                <p className="text-sm text-muted-foreground">
                  Connect with researchers already using ContextTree
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  30-Day Guarantee
                </h4>
                <p className="text-sm text-muted-foreground">
                  Try risk-free with our money-back guarantee
                </p>
              </div>
            </div>
          </div>{" "}
        </AnimateInView>
      </div>
    </section>
  );
}
