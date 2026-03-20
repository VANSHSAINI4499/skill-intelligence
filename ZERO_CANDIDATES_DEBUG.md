# 🔍 ZERO CANDIDATES DEBUG CHECKLIST

## Step 1: Check if Students Exist

### Open Browser Console (F12):
```javascript
// 1. Test the students API
fetch('/api/admin/students?activeOnly=false')
  .then(res => res.json())
  .then(data => {
    console.log("Total students:", data.students?.length || 0);
    if (data.students?.length > 0) {
      console.log("Sample student:", data.students[0]);

      // Check what batches exist
      const batches = data.students.map(s => s.batch);
      console.log("Available batches:", [...new Set(batches)]);

      // Check required fields
      const missingRole = data.students.filter(s => !s.role).length;
      const missingActive = data.students.filter(s => s.isActive === undefined).length;

      console.log(`Students missing 'role' field: ${missingRole}`);
      console.log(`Students missing 'isActive' field: ${missingActive}`);

      // Check active students
      const activeStudents = data.students.filter(s =>
        s.role === 'student' && s.isActive === true
      );
      console.log(`Active students: ${activeStudents.length}/${data.students.length}`);
    } else {
      console.log("❌ NO STUDENTS IN DATABASE!");
    }
  });
```

---

## Step 2: Check Company Requirements

```javascript
// 2. Check GOOGLE company requirements
fetch('/api/admin/company-requirements')
  .then(res => res.json())
  .then(companies => {
    const google = companies.find(c => c.companyName === 'GOOGLE');
    if (google) {
      console.log("GOOGLE requirements:", {
        minCGPA: google.minCGPA,
        minLeetCodeHard: google.minLeetCodeHard,
        minRepos: google.minRepos,
        requiredTopics: google.requiredTopics
      });
    }
  });
```

---

## Step 3: Test with Relaxed Criteria

### Temporarily Lower Company Requirements:
1. Go to **Admin → Company Requirements**
2. Edit GOOGLE company:
   - **Min CGPA:** `0.0` (instead of 7.0)
   - **Min LeetCode Hard:** `0` (instead of 50)
   - **Min Repos:** `0` (instead of 5)
   - **Required Topics:** `[]` (empty array)
3. **Save** and try shortlist again

---

## Common Issues & Fixes:

### ❌ Issue #1: No Students Created
**Symptom:** Console shows "Total students: 0"
**Fix:** Add students to your database first
- Go to your student registration flow
- Create some test students

### ❌ Issue #2: Students Missing Required Fields
**Symptom:** Students exist but missing `role: "student"` or `isActive: true`
**Fix:** Update student records in Firestore:
```javascript
// Manual fix if needed
universities/{universityId}/students/{studentId}
{
  ...existingData,
  "role": "student",
  "isActive": true
}
```

### ❌ Issue #3: Batch Format Mismatch
**Symptom:** You enter "2023" but students have batch "2023-2024"
**Check:** In console output, compare:
- **What you entered:** "2023"
- **Student batch formats:** ["2023-2024", "2024-2025"]
**Fix:** Enter the exact format that students have

### ❌ Issue #4: Too Strict Company Requirements
**Symptom:** All students filtered out by CGPA/LeetCode/repos
**Fix:** Lower the requirements temporarily to test

---

## Quick Manual Test:

### Direct Database Query:
If you have Firebase access, check:
```
universities/{your-university-id}/students/
```

Look for documents with:
```json
{
  "batch": "2023",           // or "2023-2024" format?
  "role": "student",         // exactly this value
  "isActive": true,          // exactly true, not "true" string
  "cgpa": 8.5,              // number ≥ your min requirement
  "leetcodeHardCount": 45,   // number ≥ your min requirement
  "githubRepoCount": 3       // number ≥ your min requirement
}
```

## 🎯 Most Likely Fix:

The issue is probably **batch format**. Try these:
- If students have `"batch": "2023-2024"`, enter `"2023-2024"`
- If students have `"batch": "2023"`, enter `"2023"`
- If students have `"batch": "Batch 2023"`, enter `"Batch 2023"`

**Match the EXACT format in your database!**