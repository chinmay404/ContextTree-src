import { useEffect, useState } from "react";

import { fetchMyRole, isPremiumRole } from "@/lib/premium";

// Reactive entitlement: fetches the caller's role once (fetchMyRole caches at
// the module level) and reports whether they are entitled to Founding features.
export function usePremium(): { role: string | null; isPremium: boolean; loading: boolean } {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyRole().then((r) => {
      if (active) setRole(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return { role, isPremium: isPremiumRole(role), loading: role === null };
}
