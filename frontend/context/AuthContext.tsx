"use client";
/**
 * AuthContext.tsx
 * ───────────────
 * Single source of truth for Firebase authentication state + custom claims.
 *
 * Provides:
 *   user          — Firebase User | null
 *   role          — "admin" | "student" | null  (from custom claims)
 *   universityId  — string | null               (from custom claims)
 *   loading       — true while the initial onAuthStateChanged fires
 *
 * How claims are read:
 *   Firebase custom claims are embedded in the ID token.
 *   We call getIdTokenResult() (NOT Firestore) to read them.
 *   After registration, the backend sets claims; the client must call
 *   getIdToken(true) to force a token refresh before claims are visible.
 *
 * Usage:
 *   const { user, role, universityId, loading } = useAuthContext();
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "student" | null;

export interface AuthState {
  user:         User | null;
  role:         UserRole;
  universityId: string | null;
  loading:      boolean;
  /** Force-refresh the ID token and re-read claims. Call after registration. */
  refreshClaims: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user:          null,
  role:          null,
  universityId:  null,
  loading:       true,
  refreshClaims: async () => {},
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]         = useState<User | null>(null);
  const [role,         setRole]         = useState<UserRole>(null);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);

  /** Read role + universityId out of the JWT custom claims. */
  const readClaims = useCallback(async (u: User, forceRefresh = false) => {
    const result = await u.getIdTokenResult(forceRefresh);
    setRole((result.claims.role as UserRole) ?? null);
    setUniversityId((result.claims.universityId as string) ?? null);
  }, []);

  /** Public: force-refresh token then re-read claims. */
  const refreshClaims = useCallback(async () => {
    if (auth.currentUser) {
      await readClaims(auth.currentUser, /* forceRefresh= */ true);
    }
  }, [readClaims]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await readClaims(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
        setUniversityId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [readClaims]);

  return (
    <AuthContext.Provider
      value={{ user, role, universityId, loading, refreshClaims }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
