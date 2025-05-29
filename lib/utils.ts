import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mergeArraysById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const existingMap = new Map(existing.map((item) => [item.id, item]))

  // Add or update items from incoming array
  incoming.forEach((item) => {
    existingMap.set(item.id, item)
  })

  return Array.from(existingMap.values())
}
