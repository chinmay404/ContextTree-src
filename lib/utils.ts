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

/**
 * Derive a short, human-readable node title from the user's first message.
 *
 * Strategy (cheap, client-side — no extra model call needed):
 *   1. Take the first sentence (cut at `.`, `!`, `?`, newline).
 *   2. Drop common filler prefixes ("can you", "please", "I want to" …).
 *   3. Strip URLs and code blocks.
 *   4. Capitalise the first letter, collapse whitespace.
 *   5. Cap to `maxLen` chars on a word boundary.
 */
const FILLER_PREFIXES = [
  "can you", "could you", "would you", "please", "kindly", "i want to",
  "i'd like to", "i would like to", "i need to", "help me", "let's", "lets",
  "tell me", "explain", "write", "make", "create", "build", "give me",
  "i wonder", "hey", "hi", "hello",
];

export function deriveNodeNameFromPrompt(
  prompt: string,
  maxLen = 44
): string {
  if (!prompt) return "";
  let text = String(prompt)
    // strip fenced code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // strip urls
    .replace(/https?:\/\/\S+/g, " ")
    // strip inline code
    .replace(/`[^`]*`/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  // First sentence only
  const firstSentence = text.split(/(?<=[.!?])\s+|\n+/)[0] || text;
  text = firstSentence.trim();

  // Drop common filler prefixes (case-insensitive, repeated stripping)
  const lower = text.toLowerCase();
  for (const p of FILLER_PREFIXES) {
    if (lower.startsWith(p + " ") || lower === p) {
      text = text.slice(p.length).replace(/^[\s,:?-]+/, "");
      break;
    }
  }

  // Trim trailing punctuation
  text = text.replace(/[.?!,;:\s]+$/g, "").trim();
  if (!text) return "";

  // Cap at maxLen on a word boundary
  if (text.length > maxLen) {
    const cut = text.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(" ");
    text = (lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}
