import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { apiService } from '@/services/apiService';
import { UserProfile } from '@/models/types';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

export function useAdminViewModel() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>('All');
  const [minRepos, setMinRepos] = useState<number>(0);
  const [minHard, setMinHard] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await firebaseService.getUserProfile(user.uid);
        if (profile?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        fetchStudents();
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.filterStudents({ grade: filterGrade, minRepos, minHard });
      setStudents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => fetchStudents();

  const handleLogout = async () => {
    await firebaseService.logout();
    router.push('/login');
  };

  return {
    students,
    loading,
    error,
    filterGrade, setFilterGrade,
    minRepos, setMinRepos,
    minHard, setMinHard,
    applyFilters,
    handleLogout,
  };
}
