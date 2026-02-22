import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { apiService } from '@/services/apiService';
import { UserProfile } from '@/models/types';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

export function useDashboardViewModel() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form states
  const [githubUsername, setGithubUsername] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [cgpa, setCgpa] = useState<string>('');
  const [semester, setSemester] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            setGithubUsername(profile.githubUsername || '');
            setLeetcodeUsername(profile.leetcodeUsername || '');
            setCgpa(profile.cgpa?.toString() || '');
            setSemester(profile.semester?.toString() || '');
          }
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
    try {
      const updatedData: Partial<UserProfile> = {
        githubUsername,
        leetcodeUsername,
        cgpa: parseFloat(cgpa) || 0,
        semester: parseInt(semester) || 1,
      };

      // 1. Save local changes
      await firebaseService.updateUserProfile(userProfile.uid, updatedData);
      
      // 2. Call Analysis API
      const analysisResult = await apiService.analyzeStudent({ ...userProfile, ...updatedData });
      
      // 3. Save Analysis results
      const finalData = {
        ...updatedData,
        ...analysisResult
      };
      
      await firebaseService.updateUserProfile(userProfile.uid, finalData);
      
      // 4. Update local state
      setUserProfile({ ...userProfile, ...finalData });

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
