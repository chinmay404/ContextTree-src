"use client"

import { motion } from "framer-motion"

export default function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-1 p-2">
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          times: [0, 0.5, 1],
        }}
      />
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          times: [0, 0.5, 1],
          delay: 0.2,
        }}
      />
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          times: [0, 0.5, 1],
          delay: 0.4,
        }}
      />
      <span className="ml-2 text-sm text-muted-foreground">Thinking...</span>
    </div>
  )
}
