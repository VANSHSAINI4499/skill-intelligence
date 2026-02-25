import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { studentService } from '@/services/studentService';
import { UserProfile, AnalyticsData } from '@/models/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * loadingStep tracks real progress through the startup pipeline:
 *  0 — waiting for Firebase auth to resolve
 *  1 — auth done, fetching profile from backend
 *  2 — profile received, fetching stored analytics
 *  3 — analytics received, applying state
 *  4 — all done — show the dashboard
 */
const STEP_PCT:   Record<number, number> = { 0: 5,  1: 30, 2: 60, 3: 85, 4: 100 };
const STEP_LABEL: Record<number, string> = {
  0: "Authenticating…",
  1: "Connecting to server…",
  2: "Loading profile…",
  3: "Loading analytics…",
  4: "Ready!",
};

export function useDashboardViewModel() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  // 0-4 steps; page is gated until step === 4
  const [loadingStep, setLoadingStep] = useState<number>(0);
  // Separate fatal-load error (shown on the loading screen, page stays gated)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Enforce student-only access. Redirects to /login or /admin if wrong role.
  const { user, loading: authLoading } = useAuth({ required: "student" });

  // Form states
  const [githubUsername, setGithubUsername] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [cgpa, setCgpa] = useState<string>('');
  const [batch, setBatch] = useState<string>('');
  const [branch, setBranch] = useState<string>('');

  const loadUserData = async () => {
    setLoadError(null);

    // Step 1 — profile (sequential so each step advances the ring)
    setLoadingStep(1);
    const profile = await studentService.getProfile(); // throws on 401/network
    setLoadingStep(2);

    // Step 2 — analytics (non-fatal: absent before first Analyze run)
    let savedAnalytics: AnalyticsData | undefined;
    try {
      savedAnalytics = await studentService.getAnalytics();
    } catch {
      // analytics doc may not exist yet — not a fatal error, continue
    }
    setLoadingStep(3);

    // Apply state
    setUserProfile(profile);
    setGithubUsername(profile.githubUsername || '');
    setLeetcodeUsername(profile.leetcodeUsername || '');
    setCgpa(profile.cgpa?.toString() || '');
    setBatch(profile.batch || '');
    setBranch(profile.branch || '');
    if (savedAnalytics) setAnalytics(savedAnalytics);

    // Only set 100 % AFTER everything is applied — page unblocks here
    setLoadingStep(4);
  };

  // Retry: reset step back to 0 and re-run the pipeline
  const retryLoad = () => {
    setLoadingStep(0);
    setLoadError(null);
    loadUserData().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setLoadError(msg);
      // intentionally do NOT advance to step 4 — page stays on error screen
    });
  };

  useEffect(() => {
    if (authLoading || !user) return;  // wait for auth to resolve
    loadUserData().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setLoadError(msg);
      // intentionally do NOT advance to step 4 — page stays gated
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const updateProfile = async () => {
    if (!userProfile) return;
    setAnalyzing(true);
    setError(null);
    try {
      const cgpaNum = parseFloat(cgpa) || 0;

      // Single API call — server fetches GitHub/LeetCode, scores, writes Firestore
      const result = await studentService.analyze({
        githubUsername,
        leetcodeUsername,
        cgpa: cgpaNum,
        batch,
        branch,
      });

      // Apply API response to state immediately (no Firestore re-fetch needed)
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              grade: result.grade,
              score: result.score,
              githubUsername,
              leetcodeUsername,
              cgpa: cgpaNum,
              batch,
              branch,
              githubRepoCount: result.analytics.github_totalRepos,
              leetcodeHardCount: result.analytics.leetcode_hard,
            }
          : prev
      );
      setAnalytics(result.analytics);

    } catch (err: unknown) {
      // Show the most useful part of the error to the user
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    router.push('/login');
  };

  return {
    userProfile,
    analytics,
    loadingStep,
    loadError,
    retryLoad,
    analyzing,
    error,
    githubUsername, setGithubUsername,
    leetcodeUsername, setLeetcodeUsername,
    cgpa, setCgpa,
    batch, setBatch,
    branch, setBranch,
    updateProfile,
    handleLogout,
    // convenience: percent + label for driving the loading screen
    loadingPct:   STEP_PCT[loadingStep]   ?? 5,
    loadingLabel: STEP_LABEL[loadingStep] ?? "Loading…",
  };
}
