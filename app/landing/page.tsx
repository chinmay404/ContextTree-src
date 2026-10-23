import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { LandingV3 } from "@/components/shell/landing/LandingV3";
import { V3_METADATA, isV3 } from "@/components/shell/landing/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return isV3() ? V3_METADATA : {};
}

// Stable marketing URL: renders the landing page directly, no session check.
export default function LandingPage() {
  return isV3() ? <LandingV3 /> : <Landing />;
}
