import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseAuthOptions {
  required?: boolean;
  redirectTo?: string;
  onUnauthenticated?: () => void;
}

export function useAuth({
  required = false,
  redirectTo = "/auth/signin",
  onUnauthenticated = () => {},
}: UseAuthOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (required && !session) {
      onUnauthenticated();
      router.push(redirectTo);
    }
  }, [session, status, required, redirectTo, router, onUnauthenticated]);

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === "loading",
    user: session?.user,
  };
}

export function requireAuth() {
  return useAuth({ required: true });
}
