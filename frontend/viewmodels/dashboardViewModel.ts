import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { studentService } from '@/services/studentService';
import { UserProfile, AnalyticsData } from '@/models/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function useDashboardViewModel() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
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
    const [profile, analyticsData] = await Promise.all([
      studentService.getProfile(),
      firebaseService.getUserAnalytics(user!.uid),
    ]);
    if (profile) {
      setUserProfile(profile);
      setGithubUsername(profile.githubUsername || '');
      setLeetcodeUsername(profile.leetcodeUsername || '');
      setCgpa(profile.cgpa?.toString() || '');
      setBatch(profile.batch || '');
      setBranch(profile.branch || '');
    }
    if (analyticsData) setAnalytics(analyticsData);
  };

  useEffect(() => {
    if (authLoading || !user) return;  // wait for auth to resolve
    setLoading(true);
    loadUserData()
      .catch((err) => setError(err.message || "Failed to load profile"))
      .finally(() => setLoading(false));
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

    } catch (err: any) {
      setError(err.message || "Failed to update profile");
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
    loading,
    analyzing,
    error,
    githubUsername, setGithubUsername,
    leetcodeUsername, setLeetcodeUsername,
    cgpa, setCgpa,
    batch, setBatch,
    branch, setBranch,
    updateProfile,
    handleLogout
  };
}
