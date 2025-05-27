"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"
import AnimateInView from "./animate-in-view"

const faqs = [
  {
    question: "What makes ContextTree different from regular chat interfaces?",
    answer:
      "ContextTree provides a visual, node-based canvas that allows you to branch conversations and explore multiple threads simultaneously. Unlike linear chat interfaces, ContextTree preserves context across different conversation branches, making it ideal for complex research and exploration.",
  },
  {
    question: "Can I use my own AI models with ContextTree?",
    answer:
      "Yes! ContextTree supports integration with various AI models. The Free plan includes standard models, while Pro and Team plans offer access to premium models like GPT-4 and Claude. Enterprise customers can also connect their own custom models.",
  },
  {
    question: "How does branching work?",
    answer:
      "When you encounter a tangential topic you want to explore without derailing your main conversation, simply create a branch. This spawns a new conversation node that maintains the context from the parent conversation but allows you to explore the new direction independently.",
  },
  {
    question: "Can I collaborate with others on the same canvas?",
    answer:
      "Yes, collaboration features are available on our Team plan. Multiple researchers can work on the same canvas, create branches, and connect nodes. Each user's contributions are tracked, and you can leave notes for team members.",
  },
  {
    question: "Is my data secure and private?",
    answer:
      "Absolutely. We take data security and privacy seriously. All conversations are encrypted, and we do not use your data to train AI models. You retain full ownership of your content, and we offer data export options for all plans.",
  },
  {
    question: "Can I export my conversation graphs?",
    answer:
      "Yes, Pro and Team plans include export functionality. You can export your entire conversation graph as JSON, PDF, or markdown files. You can also share specific nodes or branches with colleagues via secure links.",
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 md:py-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-x-1/2" />
      <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] translate-x-1/2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <AnimateInView animation="fadeUp" className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <HelpCircle className="h-4 w-4 mr-2" />
            <span>Common Questions</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about ContextTree and how it can help your research.
          </p>
        </AnimateInView>

        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <AnimateInView key={index} animation="fadeUp" delay={index * 0.05}>
                <motion.div
                  className="border border-border/40 rounded-xl overflow-hidden bg-background"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <button
                    className="flex justify-between items-center w-full p-6 text-left"
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={openIndex === index}
                  >
                    <h3 className="text-lg font-medium">{faq.question}</h3>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex-shrink-0 ml-4 p-1 rounded-full ${
                        openIndex === index ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 text-muted-foreground">
                          <div className="border-t border-border/40 pt-4">{faq.answer}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimateInView>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">Still have questions?</p>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-muted/50 text-foreground">
            <span>Contact us at </span>
            <a href="mailto:support@contexttree.app" className="ml-1 text-primary hover:underline">
              support@contexttree.app
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
