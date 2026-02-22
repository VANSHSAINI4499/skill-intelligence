import { UserProfile } from "@/models/types";

// Mock implementation since there is no actual backend URL provided in the prompt.
// This service would normally call an endpoint like /analyze-student
export const apiService = {
  async analyzeStudent(profile: UserProfile): Promise<{ score: number; grade: string; githubRepoCount: number; leetcodeHardCount: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock logic for "Analysis"
    const githubRepoCount = Math.floor(Math.random() * 50);
    const leetcodeHardCount = Math.floor(Math.random() * 20);
    
    let score = (profile.cgpa || 0) * 10 + githubRepoCount + (leetcodeHardCount * 2);
    if (score > 100) score = 100;

    let grade = 'C';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    
    // In a real app, this would return detailed analysis data
    return {
      score,
      grade,
      githubRepoCount,
      leetcodeHardCount
    };
  }
};
