"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cloneEmptyProviderKeyStatus,
  type ProviderKeyStatusMap,
} from "@/lib/byok";

export function useByokStatus() {
  const [statuses, setStatuses] = useState<ProviderKeyStatusMap>(
    cloneEmptyProviderKeyStatus()
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/user-api-keys", {
        cache: "no-store",
      });

      if (!response.ok) {
        setStatuses(cloneEmptyProviderKeyStatus());
        return;
      }

      const data = await response.json();
      setStatuses({
        ...cloneEmptyProviderKeyStatus(),
        ...(data?.providers || {}),
      });
    } catch {
      setStatuses(cloneEmptyProviderKeyStatus());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    statuses,
    isLoading,
    refresh,
    setStatuses,
  };
}
