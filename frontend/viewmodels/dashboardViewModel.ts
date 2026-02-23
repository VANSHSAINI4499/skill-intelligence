import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { apiService } from '@/services/apiService';
import { UserProfile, AnalyticsData } from '@/models/types';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

export function useDashboardViewModel() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form states
  const [githubUsername, setGithubUsername] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [cgpa, setCgpa] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

  const loadUserData = async (uid: string) => {
    const [profile, analyticsData] = await Promise.all([
      firebaseService.getUserProfile(uid),
      firebaseService.getUserAnalytics(uid),
    ]);
    if (profile) {
      setUserProfile(profile);
      setGithubUsername(profile.githubUsername || '');
      setLeetcodeUsername(profile.leetcodeUsername || '');
      setCgpa(profile.cgpa?.toString() || '');
      setSemester(profile.semester?.toString() || '');
    }
    if (analyticsData) setAnalytics(analyticsData);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await loadUserData(user.uid);
        } catch (err) {
          console.error("Error fetching profile", err);
          setError("Failed to load profile");
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const updateProfile = async () => {
    if (!userProfile) return;
    setAnalyzing(true);
    setError(null);
    try {
      const cgpaNum     = parseFloat(cgpa) || 0;
      const semesterNum = parseInt(semester) || 1;

      // 1. Persist form fields to Firestore immediately
      await firebaseService.updateUserProfile(userProfile.uid, {
        githubUsername,
        leetcodeUsername,
        cgpa: cgpaNum,
        semester: semesterNum,
      });

      // 2. Hit FastAPI — fetches GitHub/LeetCode, scores the student,
      //    and writes grade + score back to Firestore; response has everything we need
      const result = await apiService.analyzeStudent({
        userId: userProfile.uid,
        githubUsername,
        leetcodeUsername,
        cgpa: cgpaNum,
        semester: semesterNum,
      });

      // 3. Apply the API response directly to state — no Firestore re-fetch required
      //    (avoids the window where Firestore write hasn't propagated yet)
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              grade: result.grade,
              score: result.score,
              githubUsername,
              leetcodeUsername,
              cgpa: cgpaNum,
              semester: semesterNum,
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
    semester, setSemester,
    updateProfile,
    handleLogout
  };
}
