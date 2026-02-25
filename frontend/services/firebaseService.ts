/**
 * firebaseService.ts — Firebase Auth helpers (client-side only)
 * ──────────────────────────────────────────────────────────────
 * In the new multi-tenant architecture all Firestore reads/writes are
 * performed by the FastAPI backend (routers/auth.py, routers/student.py,
 * routers/admin.py).  The client is responsible only for:
 *
 *   • logout()    — sign out of Firebase Auth
 *
 * Registration  → authService.ts  (POST /api/auth/*)
 * Profile read  → studentService.ts (GET /api/student/profile)
 * Profile write → studentService.ts (PUT /api/student/profile)
 * All admin ops → adminService.ts
 */

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const firebaseService = {
  /** Sign the current user out of Firebase Auth. */
  async logout(): Promise<void> {
    await signOut(auth);
  },
};

