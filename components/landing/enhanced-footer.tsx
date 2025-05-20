"use client"

import type React from "react"

import Link from "next/link"
import { Network, Twitter, Github, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { motion } from "framer-motion"

export default function EnhancedFooter() {
  const [email, setEmail] = useState("")
  const [isHovered, setIsHovered] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle the newsletter subscription
    alert(`Thanks for subscribing with ${email}!`)
    setEmail("")
  }

  return (
    <footer className="bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-200 py-20 border-t border-zinc-800/50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] opacity-20" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[150px] opacity-20" />

      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* About Column */}
          <div>
            <Link href="/" className="flex items-center gap-2 group mb-6">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Network className="h-6 w-6 text-primary transition-transform group-hover:scale-110 duration-300" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-[0.8] group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">ContextTree</span>
            </Link>
            <p className="text-sm text-zinc-400 mb-6">Research-grade chat canvas for complex conversations</p>
            <Link
              href="mailto:support@contexttree.app"
              className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center"
            >
              support@contexttree.app
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-medium text-white mb-6 text-lg">Product</h4>
            <ul className="space-y-4">
              {["Features", "How It Works", "Demo", "Pricing"].map((item, i) => (
                <li key={i}>
                  <Link
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-primary mr-0 group-hover:mr-2 transition-all duration-300"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-medium text-white mb-6 text-lg">Resources</h4>
            <ul className="space-y-4">
              {["Documentation", "Blog", "API Reference", "Tutorials"].map((item, i) => (
                <li key={i}>
                  <Link
                    href="#"
                    className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-primary mr-0 group-hover:mr-2 transition-all duration-300"></span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community & Newsletter Column */}
          <div>
            <h4 className="font-medium text-white mb-6 text-lg">Stay Connected</h4>
            <div className="flex space-x-4 mb-8">
              {[
                { icon: <Twitter className="h-5 w-5" />, label: "Twitter", href: "https://twitter.com" },
                { icon: <Github className="h-5 w-5" />, label: "GitHub", href: "https://github.com" },
                { icon: <MessageSquare className="h-5 w-5" />, label: "Discord", href: "https://discord.com" },
              ].map((social, i) => (
                <motion.div key={i} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`ContextTree on ${social.label}`}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 hover:bg-primary/20 text-zinc-400 hover:text-primary transition-colors"
                  >
                    {social.icon}
                  </Link>
                </motion.div>
              ))}
            </div>

            <h4 className="font-medium text-white mb-4 text-lg">Newsletter</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    type="email"
                    placeholder="Your email address"
                    className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 h-11 pr-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email for newsletter"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    className="whitespace-nowrap shadow-glow-sm hover:shadow-glow-hover-sm transition-all duration-500 h-11"
                  >
                    Subscribe
                  </Button>
                </motion.div>
              </div>
              <p className="text-xs text-zinc-500">We'll never share your email. Unsubscribe anytime.</p>
            </form>
          </div>
        </div>

        {/* Legal Bar */}
        <div className="pt-8 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-500">© {new Date().getFullYear()} ContextTree. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item, i) => (
                <Link key={i} href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
