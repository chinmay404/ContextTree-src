"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Network, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Network className="h-6 w-6 text-primary transition-transform group-hover:scale-110 duration-300" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-[0.8] group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              </div>
              <span className="font-semibold text-lg tracking-tight relative">
                ContextTree
                <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-0.5 bg-primary transition-all duration-300"></span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {["Features", "How It Works", "Demo", "Pricing"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="relative px-4 py-2 text-sm font-medium hover:text-primary transition-colors group"
              >
                {item}
                <span className="absolute bottom-0 left-1/2 w-0 group-hover:w-4/5 h-0.5 bg-primary/50 -translate-x-1/2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="outline" size="sm" className="hidden sm:flex border-primary/20 hover:bg-primary/5">
              Sign In
            </Button>
            <Link href="/canvas">
              <Button size="sm" className="shadow-glow-sm hover:shadow-glow-hover-sm transition-all duration-500">
                Try It Now
              </Button>
            </Link>
            <button
              className="p-1 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden bg-background/95 backdrop-blur-md border-t border-border/20"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="container mx-auto px-4 py-4 space-y-1">
              {["Features", "How It Works", "Demo", "Pricing"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-border/20">
                <Button variant="outline" size="sm" className="w-full border-primary/20 hover:bg-primary/5">
                  Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
