"use client";

import { useAdminViewModel } from "@/viewmodels/adminViewModel";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

export default function AdminPage() {
  const {
    students,
    loading,
    filterGrade, setFilterGrade,
    minRepos, setMinRepos,
    minHard, setMinHard,
    handleLogout
  } = useAdminViewModel();

  const getGradeColor = (grade?: string) => {
    switch(grade) {
      case 'A': return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200';
      case 'C': return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200';
      case 'D': return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole="admin" userName="Administrator" onLogout={handleLogout}>
      <div className="space-y-6">
        
        {/* Filters */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Filter Students</CardTitle>
            <CardDescription>Narrow down student list based on performance metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade</label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Repos</label>
                <Input 
                  type="number" 
                  value={minRepos} 
                  onChange={(e) => setMinRepos(Number(e.target.value))} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Hard Problems</label>
                <Input 
                  type="number" 
                  value={minHard} 
                  onChange={(e) => setMinHard(Number(e.target.value))} 
                />
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Student Directory</CardTitle>
                <CardDescription>Showing {students.length} students matching criteria</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">GitHub Repos</TableHead>
                        <TableHead className="text-right">LeetCode Hard</TableHead>
                        <TableHead className="text-right">Semester</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map((student) => (
                            <TableRow key={student.uid}>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell className="text-slate-500">{student.email}</TableCell>
                                <TableCell>
                                <Badge variant="outline" className={getGradeColor(student.grade)}>
                                    {student.grade || 'N/A'}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right">{student.githubRepoCount || 0}</TableCell>
                                <TableCell className="text-right">{student.leetcodeHardCount || 0}</TableCell>
                                <TableCell className="text-right">{student.semester || '-'}</TableCell>
                            </TableRow>
                            ))
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
