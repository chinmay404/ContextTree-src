import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import DevelopmentBanner from "@/components/landing/development-banner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ContextTree",
  description: "An interactive, node-based canvas for AI conversations",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DevelopmentBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
