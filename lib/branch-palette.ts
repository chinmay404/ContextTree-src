// Branch color palette — the 8 hues a user can pin to any branch. The chosen
// color flows down to every descendant, fading with depth (see canvas.tsx
// effectiveColorOf). Hexes are tuned for the dark canvas; they read as the
// node's lineage stripe and its edge color.
export const BRANCH_PALETTE: readonly string[] = [
  "#5b8def", // blue
  "#7c66dc", // violet
  "#d453a8", // pink
  "#e3564a", // red
  "#e3a44a", // amber
  "#3fa66a", // green
  "#2fb6c7", // teal
  "#8a92a8", // slate
];
