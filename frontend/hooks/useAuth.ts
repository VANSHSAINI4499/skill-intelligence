/**
 * useAuth.ts
 * ──────────
 * Thin wrapper around AuthContext.
 * Handles role-based route protection in a single hook.
 *
 * Usage (inside any page component):
 *
 *   // Require "admin" role — redirects to /dashboard if student, /login if not authed
 *   const { user, role, universityId } = useAuth({ required: "admin" });
 *
 *   // Just read auth state with no redirect
 *   const { user, role } = useAuth();
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext, UserRole } from "@/context/AuthContext";

interface UseAuthOptions {
  /** If set, the hook will redirect if the user doesn't have this role. */
  required?: UserRole;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { user, role, universityId, loading, refreshClaims } = useAuthContext();
  const router = useRouter();
  const { required } = options;

  useEffect(() => {
    if (loading) return;  // wait for the first auth check

    if (!user) {
      router.replace("/login");
      return;
    }

    if (required && role !== required) {
      // Wrong role — send to their own dashboard
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [loading, user, role, required, router]);

  return { user, role, universityId, loading, refreshClaims };
}
