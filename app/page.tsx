import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { LandingV3 } from "@/components/shell/landing/LandingV3";
import { V3_METADATA, isV3 } from "@/components/shell/landing/metadata";
import HomeClient from "./home-client";

export async function generateMetadata(): Promise<Metadata> {
  return isV3() ? V3_METADATA : {};
}

/**
 * V3 flag (NEXT_PUBLIC_BOARD_V3=1): signed-in users go to /boards, everyone else gets the server-rendered landing.
 * Flag unset: the V2 studio, unchanged.
 */
export default async function Page() {
  if (!isV3()) return <HomeClient />;
  if (await getCurrentUser()) redirect("/boards");
  return <LandingV3 />;
}
