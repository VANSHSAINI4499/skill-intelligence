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
      const cgpaNum    = parseFloat(cgpa) || 0;
      const semesterNum = parseInt(semester) || 1;

      // 1. Persist form fields to Firestore immediately
      await firebaseService.updateUserProfile(userProfile.uid, {
        githubUsername,
        leetcodeUsername,
        cgpa: cgpaNum,
        semester: semesterNum,
      });

      // 2. Hit FastAPI — backend writes grade/score/analytics back to Firestore
      await apiService.analyzeStudent({
        userId: userProfile.uid,
        githubUsername,
        leetcodeUsername,
        cgpa: cgpaNum,
        semester: semesterNum,
      });

      // 3. Re-fetch the enriched profile + analytics (grade + score now set by backend)
      const [fresh, freshAnalytics] = await Promise.all([
        firebaseService.getUserProfile(userProfile.uid),
        firebaseService.getUserAnalytics(userProfile.uid),
      ]);
      if (fresh) setUserProfile(fresh);
      if (freshAnalytics) setAnalytics(freshAnalytics);

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
