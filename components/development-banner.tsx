"use client"

import { motion } from "framer-motion"
import { Construction, X } from "lucide-react"
import { useState } from "react"

export default function DevelopmentBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 backdrop-blur-sm border-b border-amber-500/20"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Construction className="h-4 w-4 text-amber-500 mr-2" />
            <p className="text-sm text-amber-600">
              <span className="font-medium">ContextTree is under active development.</span> Some features may be limited
              or change over time.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-amber-500 hover:text-amber-600 transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
