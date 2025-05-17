"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Network } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession } from "next-auth/react"

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { data: session } = useSession()

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
            <Link href="/" className="flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg tracking-tight">ContextTree</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#demo" className="text-sm font-medium hover:text-primary transition-colors">
              Demo
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {session ? (
              <Link href="/canvas">
                <Button size="sm">Go to Canvas</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Try It Now</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
