// ─── Premium gating (Founding license) ───────────────────────
// Single source of truth for premium checks. UI that gates features on
// premium should import from here so wiring billing later is one change.

export const isPremiumUser = () => false; // TODO: wire to billing

export const PREMIUM_TOOLTIP = "Founding license — coming soon";
