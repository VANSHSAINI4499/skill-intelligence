import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { UserProfile } from '@/models/types';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

export function useAdminViewModel() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const data = await firebaseService.getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesGrade = filterGrade === 'All' || student.grade === filterGrade;
    const matchesRepos = (student.githubRepoCount || 0) >= minRepos;
    const matchesHard = (student.leetcodeHardCount || 0) >= minHard;
    return matchesGrade && matchesRepos && matchesHard;
  });

  const handleLogout = async () => {
    await firebaseService.logout();
    router.push('/login');
  };

  return {
    students: filteredStudents,
    loading,
    filterGrade, setFilterGrade,
    minRepos, setMinRepos,
    minHard, setMinHard,
    handleLogout
  };
}
