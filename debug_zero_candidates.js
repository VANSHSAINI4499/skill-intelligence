/**
 * Quick Debug Script for Zero Candidates Issue
 * Add this to your browser console on the admin shortlists page
 */

console.log("🔍 Debugging Zero Candidates Issue...");

// Step 1: Check what batch format you're using
console.log("📅 BATCH FORMAT CHECK:");
console.log("What year did you enter?", prompt("What batch year are you testing? (e.g., 2023, 2024)"));

// Step 2: Check students endpoint
console.log("👥 CHECKING STUDENTS DATA...");

// Simulate API call to check students
fetch('/api/admin/students')
  .then(res => res.json())
  .then(data => {
    console.log("📊 Students API Response:", data);

    if (!data.students || data.students.length === 0) {
      console.log("❌ NO STUDENTS FOUND!");
      console.log("SOLUTION: Add students to your database first");
      return;
    }

    console.log(`✅ Found ${data.students.length} students`);

    // Check batch formats
    const batches = [...new Set(data.students.map(s => s.batch))];
    console.log("📅 Available batch formats:", batches);

    // Check required fields
    const sampleStudent = data.students[0];
    console.log("👤 Sample student data:");
    console.log("- Batch:", sampleStudent.batch);
    console.log("- Role:", sampleStudent.role);
    console.log("- IsActive:", sampleStudent.isActive);
    console.log("- CGPA:", sampleStudent.cgpa);
    console.log("- LeetCode Hard:", sampleStudent.leetcodeHardCount);
    console.log("- GitHub Repos:", sampleStudent.githubRepoCount);

    // Check if any student meets basic criteria
    const activeStudents = data.students.filter(s => s.role === 'student' && s.isActive === true);
    console.log(`🔍 Active students: ${activeStudents.length}/${data.students.length}`);

    if (activeStudents.length === 0) {
      console.log("❌ ISSUE: No students have role='student' AND isActive=true");
      console.log("SOLUTION: Update student records to have these fields");
    }

  })
  .catch(err => {
    console.log("❌ Failed to fetch students:", err);
    console.log("SOLUTION: Check if /api/admin/students endpoint works");
  });

// Step 3: Check company requirements
console.log("🏢 CHECKING COMPANY REQUIREMENTS...");

fetch('/api/admin/company-requirements')
  .then(res => res.json())
  .then(companies => {
    console.log("📊 Companies:", companies);

    const google = companies.find(c => c.companyName === 'GOOGLE');
    if (google) {
      console.log("🎯 GOOGLE requirements:");
      console.log("- Min CGPA:", google.minCGPA);
      console.log("- Min LeetCode Hard:", google.minLeetCodeHard);
      console.log("- Min Repos:", google.minRepos);
      console.log("- Required Topics:", google.requiredTopics);

      if (google.minCGPA > 8.0) {
        console.log("⚠️ WARNING: CGPA requirement might be too high!");
      }
      if (google.minLeetCodeHard > 50) {
        console.log("⚠️ WARNING: LeetCode requirement might be too high!");
      }
    }
  })
  .catch(err => console.log("❌ Failed to fetch companies:", err));

console.log("🚀 Debug complete! Check the output above for issues.");
console.log("📝 Common fixes:");
console.log("1. Make sure students exist in database");
console.log("2. Check batch format matches (e.g., '2023' vs '2023-2024')");
console.log("3. Ensure students have role='student' and isActive=true");
console.log("4. Lower company requirements if they're too strict");