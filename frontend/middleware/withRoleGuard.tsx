"use client";
/**
 * withRoleGuard.tsx
 * ──────────────────
 * Higher-order component that wraps a page and enforces a role requirement.
 *
 * Usage (in a page or layout):
 *
 *   export default withRoleGuard(MyAdminPage, "admin");
 *   export default withRoleGuard(MyStudentPage, "student");
 *
 * Behaviour:
 *   - loading   → renders a full-screen spinner
 *   - not authed → redirects to /login
 *   - wrong role → redirects to the correct dashboard
 *   - correct role → renders the wrapped component
 */

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole,
) {
  const Guarded = (props: P) => {
    const { loading, user, role } = useAuth({ required: requiredRole });

    // Still resolving — show spinner
    if (loading || !user || role !== requiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    return <Component {...props} />;
  };

  Guarded.displayName = `withRoleGuard(${Component.displayName ?? Component.name})`;
  return Guarded;
}
