"use client"

import type React from "react"

import Link from "next/link"
import { Network, Twitter, Github, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function EnhancedFooter() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle the newsletter subscription
    alert(`Thanks for subscribing with ${email}!`)
    setEmail("")
  }

  return (
    <footer className="bg-zinc-900 text-zinc-200 py-16 border-t border-zinc-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About Column */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Network className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg tracking-tight text-white">ContextTree</span>
            </Link>
            <p className="text-sm text-zinc-400 mb-4">Research-grade chat canvas for complex conversations</p>
            <Link
              href="mailto:support@contexttree.app"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              support@contexttree.app
            </Link>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-medium text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#interactive-demo" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#demo" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Demo
                </Link>
              </li>
              <li>
                <Link href="/canvas" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Try Canvas
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-medium text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Tutorials
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Newsletter Column */}
          <div>
            <h4 className="font-medium text-white mb-4">Community</h4>
            <div className="flex space-x-4 mb-6">
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ContextTree on Twitter"
                className="text-zinc-400 hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ContextTree on GitHub"
                className="text-zinc-400 hover:text-primary transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ContextTree on Discord"
                className="text-zinc-400 hover:text-primary transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
              </Link>
            </div>

            <h4 className="font-medium text-white mb-3">Stay Updated</h4>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Your email address"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email for newsletter"
                />
                <Button type="submit" className="whitespace-nowrap">
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-zinc-500">We'll never share your email. Unsubscribe anytime.</p>
            </form>
          </div>
        </div>

        {/* Legal Bar */}
        <div className="pt-8 border-t border-zinc-800 text-center">
          <p className="text-sm text-zinc-500">© {new Date().getFullYear()} ContextTree. All rights reserved.</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Link href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
