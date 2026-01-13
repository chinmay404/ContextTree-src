import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateCanvasTitle(): string {
  const adjs = ["Creative", "Logical", "Deep", "Rapid", "Structured", "Abstract", "Linear", "Complex", "Simple", "Draft"];
  const nouns = ["Flow", "Sequence", "Prompt", "Dialogue", "Process", "Logic", "Tree", "System", "Model", "Concept"];
  const types = ["Exploration", "Design", "Test", "Iteration", "Study", "Analysis"];

  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // 30% chance of adding a type suffix
  if (Math.random() > 0.7) {
     const type = types[Math.floor(Math.random() * types.length)];
     return `${adj} ${noun} ${type}`;
  }
  
  return `${adj} ${noun}`;
}
