import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import type { AdminRegisterRequest, StudentRegisterRequest } from '@/services/authService';

/**
 * Auth ViewModel
 * ──────────────
 * Handles login + registration flows.
 * Role-based redirects use Firebase custom claims — no Firestore lookup.
 *
 * Redirect contract (always via redirectByRole):
 *  1. getIdToken(true)       — force-refresh so backend-set claims are in the JWT
 *  2. getIdTokenResult()     — read role + universityId from the fresh token
 *  3. explicit role branch:
 *       "admin"   → router.replace("/admin")
 *       "student" → router.replace("/dashboard")
 *       unknown   → router.replace("/dashboard")   ← plain Firebase signup, no backend claims yet
 *
 * router.replace (not push) prevents the back-button looping through loading states.
 * AuthContext.refreshClaims() is called after so the rest of the app sees the new role.
 * The redirect itself reads the token directly — it does NOT wait for React state sync.
 */

export function useAuthViewModel() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const router            = useRouter();
  const { refreshClaims } = useAuthContext();

  /**
   * Single, authoritative redirect function.
   * Always force-refreshes the token before reading role — never trusts cached claims.
   */
  const redirectByRole = async () => {
    const user = auth.currentUser;
    if (!user) { router.replace('/login'); return; }

    // 1. Force token refresh so backend-set custom claims are included
    await user.getIdToken(/* forceRefresh= */ true);

    // 2. Read the fresh token result directly from the SDK (synchronous after refresh)
    const tokenResult = await user.getIdTokenResult(/* forceRefresh= */ false);
    const role = tokenResult.claims.role as string | undefined;

    // 3. Update AuthContext so every component sees the correct role immediately
    await refreshClaims();

    // 4. Redirect based on claim — explicit branches, no implicit fallback
    if (role === 'admin') {
      router.replace('/admin');
    } else if (role === 'student') {
      router.replace('/dashboard');
    } else {
      // New user created directly via Firebase (no backend call) — no claims yet.
      // Safe default: student dashboard. They will be prompted to complete onboarding.
      router.replace('/dashboard');
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole();
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // ── Plain student register (no universityId — no custom claims) ───────────
  // Used by the default /register page. No claims will be set by this path;
  // redirectByRole falls through to /dashboard.

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Token has no custom claims yet — redirectByRole sends to /dashboard
      await redirectByRole();
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  // ── Admin register (backend creates university + sets role="admin" claim) ──

  const handleAdminRegister = async (payload: AdminRegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Backend: create Firebase user + university doc + set custom claims
      await authService.registerAdmin(payload);

      // 2. Sign in to get a Firebase session for this new user
      await signInWithEmailAndPassword(auth, payload.email, payload.password);

      // 3. redirectByRole will force-refresh the token (picks up the admin claim)
      //    and push to /admin
      await redirectByRole();
    } catch (err: any) {
      setError(err.message || 'Failed to register admin');
    } finally {
      setLoading(false);
    }
  };

  // ── Student register (backend creates student doc + sets role="student" claim) ─

  const handleStudentRegister = async (payload: StudentRegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Backend: create Firebase user + student doc + set custom claims
      await authService.registerStudent(payload);

      // 2. Sign in
      await signInWithEmailAndPassword(auth, payload.email, payload.password);

      // 3. redirectByRole force-refreshes and pushes to /dashboard
      await redirectByRole();
    } catch (err: any) {
      setError(err.message || 'Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  return {
    email,    setEmail,
    password, setPassword,
    name,     setName,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleAdminRegister,
    handleStudentRegister,
  };
}
