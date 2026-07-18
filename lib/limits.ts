// Hard cap on nodes per canvas. Past ~50 the canvas JSON payload, dagre
// relayout, and tree legibility all degrade; real trees rarely pass ~30.
// Enforced server-side in the nodes POST route; every client-side node
// creator preflights it for a friendly error before hitting the API.
export const MAX_NODES_PER_CANVAS = 50;
