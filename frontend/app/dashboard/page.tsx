"use client";

import { useDashboardViewModel } from "@/viewmodels/dashboardViewModel";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Github, Code2, Award, BookOpen } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardPage() {
  const {
    userProfile,
    loading,
    analyzing,
    githubUsername, setGithubUsername,
    leetcodeUsername, setLeetcodeUsername,
    cgpa, setCgpa,
    semester, setSemester,
    updateProfile,
    handleLogout
  } = useDashboardViewModel();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  // --- Chart Data Configuration ---
  const barData = {
    labels: ['Easy', 'Medium', 'Hard'],
    datasets: [
      {
        label: 'LeetCode Problems',
        data: [
          15, // Mock data for demo since not in model
          30, // Mock data
          userProfile?.leetcodeHardCount || 0
        ],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 205, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      },
    ],
  };

  const pieData = {
    labels: ['JavaScript', 'Python', 'Java', 'C++'],
    datasets: [
      {
        data: [45, 25, 20, 10], // Mock distribution
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // --- Badge Color Logic ---
  const getGradeColor = (grade?: string) => {
    switch(grade) {
      case 'A': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'B': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'C': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      case 'D': return 'bg-red-100 text-red-700 hover:bg-red-200';
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    }
  };

  return (
    <DashboardLayout 
      userRole={userProfile?.role} 
      userName={userProfile?.name} 
      onLogout={handleLogout}
    >
      <div className="grid gap-6">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Current Grade</CardTitle>
              <Award className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold px-3 py-1 rounded inline-block ${getGradeColor(userProfile?.grade)}`}>
                {userProfile?.grade || 'N/A'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Overall Score</CardTitle>
              <div className="text-slate-500 font-bold">%</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.score || 0}</div>
              <p className="text-xs text-slate-500">Based on CGPA & Skills</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">GitHub Repos</CardTitle>
              <Github className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.githubRepoCount || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">LeetCode Hard</CardTitle>
              <Code2 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.leetcodeHardCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Profile Form */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your academic and coding profiles to recalculate your score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <Input value={semester} onChange={(e) => setSemester(e.target.value)} type="number" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CGPA</label>
                <Input value={cgpa} onChange={(e) => setCgpa(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub Username</label>
                <Input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="username" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">LeetCode Username</label>
                <Input value={leetcodeUsername} onChange={(e) => setLeetcodeUsername(e.target.value)} placeholder="username" />
              </div>
              
              <Button onClick={updateProfile} className="w-full bg-slate-900 hover:bg-slate-800" disabled={analyzing}>
                {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {analyzing ? 'Analyzing...' : 'Update & Analyze'}
              </Button>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Skill distribution across platforms.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="h-[250px] flex items-center justify-center">
                 <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="h-[250px] flex items-center justify-center">
                 <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}
