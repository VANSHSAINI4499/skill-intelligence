# 🧪 Test Cases: Skill Intelligence Platform

## 📋 Test Categories Overview

### **1. Authentication & Access Control**
### **2. Company Requirements Management**
### **3. Shortlist Generation**
### **4. AI Chat System**
### **5. Student Analytics**
### **6. Data Integrity & Security**
### **7. Performance & Scalability**

---

## 1. 🔐 Authentication & Access Control Tests

### **TC-001: Student Login**
**Scenario:** Valid student attempts to log in
- **Given:** Valid student credentials
- **When:** User submits login form
- **Then:** Redirected to student dashboard
- **Expected:** Access to student-only features

### **TC-002: Admin Login**
**Scenario:** Valid admin attempts to log in
- **Given:** Valid admin credentials
- **When:** User submits login form
- **Then:** Redirected to admin dashboard
- **Expected:** Access to admin-only features

### **TC-003: Cross-Role Access Prevention**
**Scenario:** Student tries to access admin routes
- **Given:** Logged-in student user
- **When:** Navigate to `/admin/shortlists`
- **Then:** Redirect to student dashboard or show 403 error
- **Expected:** Admin features remain inaccessible

### **TC-004: University Isolation**
**Scenario:** Admin from University A tries to see University B data
- **Given:** Admin logged in from University A
- **When:** API calls made for student data
- **Then:** Only University A data returned
- **Expected:** Complete data isolation between universities

---

## 2. 🏢 Company Requirements Management Tests

### **TC-005: Create Company Requirement - Happy Path**
**Scenario:** Admin creates new company requirement successfully
- **Given:** Admin on requirements page
- **When:** Fill form: Name="GOOGLE", CGPA=7.0, Hard=50, Repos=5
- **Then:** Company saved with correct values (not "—")
- **Expected:** Company appears in saved requirements list

### **TC-006: Form Validation**
**Scenario:** Submit empty company name
- **Given:** Admin on requirements page
- **When:** Submit form with empty company name
- **Then:** Error message "Company name is required"
- **Expected:** Form not submitted

### **TC-007: Numerical Input Validation**
**Scenario:** Enter invalid CGPA values
- **Given:** Admin editing company requirements
- **When:** Enter CGPA = 15 (max 10), Hard = -5 (min 0)
- **Then:** Form prevents invalid values or shows validation error
- **Expected:** Only valid ranges accepted

### **TC-008: Edit Existing Company**
**Scenario:** Update existing company requirements
- **Given:** GOOGLE company exists with CGPA=7.0
- **When:** Edit CGPA to 6.5 and save
- **Then:** Updated values reflected in both display and database
- **Expected:** Shortlists use new criteria

### **TC-009: Delete Company Requirement**
**Scenario:** Admin removes company requirement
- **Given:** Multiple companies exist
- **When:** Click delete on specific company
- **Then:** Company removed from list and database
- **Expected:** Associated shortlists marked as inactive

---

## 3. 📊 Shortlist Generation Tests

### **TC-010: Generate Shortlist - Happy Path**
**Scenario:** Generate shortlist for batch with matching students
- **Given:** 27 students in batch "2023-2027", GOOGLE company exists
- **When:** Select GOOGLE, batch "2023-2027", generate shortlist
- **Then:** Returns ranked list of qualifying students
- **Expected:** Students sorted by score, proper grades assigned

### **TC-011: No Matching Students**
**Scenario:** Company requirements too strict
- **Given:** GOOGLE requires CGPA=9.5, Hard=200, Repos=50
- **When:** Generate shortlist for batch "2023-2027"
- **Then:** "0 candidates match criteria" message
- **Expected:** Clear explanation of why no students qualify

### **TC-012: Batch Format Validation**
**Scenario:** Enter incorrect batch format
- **Given:** Students stored as "2023-2027"
- **When:** Enter batch "2023" in shortlist form
- **Then:** 0 candidates found or format suggestion
- **Expected:** User guidance on correct batch format

### **TC-013: CSV Export Functionality**
**Scenario:** Export generated shortlist
- **Given:** Shortlist with 15 students generated
- **When:** Click "Export CSV" button
- **Then:** Download CSV file with student data
- **Expected:** File contains: Rank, Name, Email, Score, Grade, CGPA, etc.

### **TC-014: Multiple Company Comparison**
**Scenario:** Generate shortlists for different companies
- **Given:** GOOGLE (strict) and STARTUP (relaxed) requirements
- **When:** Generate both shortlists for same batch
- **Then:** Different student counts and rankings
- **Expected:** Stricter requirements = fewer candidates

---

## 4. 🤖 AI Chat System Tests

### **TC-015: Intent Detection - Gap Analysis**
**Scenario:** Student asks about weaknesses
- **Given:** Logged-in student with performance data
- **When:** Send message "What are my weak topics?"
- **Then:** AI detects "gap_analysis" mode
- **Expected:** Response includes specific weak areas and batch comparison

### **TC-016: Intent Detection - Upgrade Plan**
**Scenario:** Student requests improvement plan
- **Given:** Student with Grade C performance
- **When:** Send message "How can I improve my score to Grade A?"
- **Then:** AI detects "upgrade_plan" mode
- **Expected:** 4-week study plan with specific milestones

### **TC-017: Intent Detection - Interview Mode**
**Scenario:** Student wants coding practice
- **Given:** Student data shows weak in "Dynamic Programming"
- **When:** Send message "Give me a coding question"
- **Then:** AI detects "interview" mode
- **Expected:** DP question with hint and expected approach

### **TC-018: Intent Detection - General Chat**
**Scenario:** Casual conversation and greetings
- **Given:** Any logged-in student
- **When:** Send messages "hello", "hi", "what is Big O notation"
- **Then:** AI detects "general_chat" mode
- **Expected:** Friendly response, no forced analytics

### **TC-019: AI Response Quality**
**Scenario:** Verify AI gives relevant, personalized responses
- **Given:** Student with specific weak topics (Arrays, Graphs)
- **When:** Ask "What should I study this week?"
- **Then:** Response mentions Arrays and Graphs specifically
- **Expected:** No generic advice, actual student data referenced

### **TC-020: Chat History & Context**
**Scenario:** Multi-turn conversation
- **Given:** Ongoing chat about interview preparation
- **When:** Follow-up question without context
- **Then:** AI maintains conversation context
- **Expected:** Coherent multi-message conversation flow

---

## 5. 📈 Student Analytics Tests

### **TC-021: Gap Analysis Generation**
**Scenario:** Generate performance gap report
- **Given:** Student with LeetCode and GitHub data
- **When:** Navigate to dashboard gap analysis
- **Then:** Shows percentile, weak topics, batch comparison
- **Expected:** Accurate percentile calculation and meaningful insights

### **TC-022: Batch Comparison Accuracy**
**Scenario:** Verify student ranking within batch
- **Given:** 27 students in same batch with scores
- **When:** View individual student's batch position
- **Then:** Correct percentile and ranking displayed
- **Expected:** Top student shows 100th percentile, bottom shows ~4th percentile

### **TC-023: Real-time Data Updates**
**Scenario:** Student improves LeetCode score externally
- **Given:** Student has 50 Hard problems solved
- **When:** Student solves 10 more on LeetCode platform
- **Then:** Analytics update within 24 hours (or next sync)
- **Expected:** Updated score, improved ranking, updated gap analysis

### **TC-024: Missing Data Handling**
**Scenario:** Student with incomplete profile
- **Given:** Student with no LeetCode or GitHub username
- **When:** Generate gap analysis
- **Then:** Graceful handling with suggestions to add accounts
- **Expected:** Partial analysis with improvement suggestions

---

## 6. 🔒 Data Integrity & Security Tests

### **TC-025: SQL Injection Prevention**
**Scenario:** Malicious input in search fields
- **Given:** Any form input (company name, chat message)
- **When:** Enter SQL injection strings like `'; DROP TABLE students; --`
- **Then:** Input sanitized, no database corruption
- **Expected:** System remains secure and functional

### **TC-026: Cross-Site Scripting (XSS) Prevention**
**Scenario:** Script injection in text fields
- **Given:** Company name field or chat input
- **When:** Enter `<script>alert('XSS')</script>`
- **Then:** Script not executed, content safely displayed
- **Expected:** No JavaScript execution from user input

### **TC-027: Data Validation**
**Scenario:** API receives malformed data
- **Given:** Direct API calls with invalid JSON
- **When:** Send requests with wrong data types
- **Then:** 400 Bad Request with validation errors
- **Expected:** Clear error messages, system stability maintained

### **TC-028: Rate Limiting**
**Scenario:** Prevent API abuse
- **Given:** Authenticated user making requests
- **When:** Send 1000 requests in 1 minute
- **Then:** Rate limiting kicks in after reasonable threshold
- **Expected:** 429 Too Many Requests response

---

## 7. ⚡ Performance & Scalability Tests

### **TC-029: Large Dataset Handling**
**Scenario:** University with 1000+ students
- **Given:** Large student dataset loaded
- **When:** Generate shortlists and analytics
- **Then:** Operations complete within 10 seconds
- **Expected:** Responsive performance regardless of student count

### **TC-030: Concurrent User Load**
**Scenario:** Multiple admins generating shortlists simultaneously
- **Given:** 5 admins logged in from same university
- **When:** All generate shortlists at same time
- **Then:** All operations succeed without data conflicts
- **Expected:** System handles concurrent operations gracefully

### **TC-031: Memory Usage**
**Scenario:** Extended usage without memory leaks
- **Given:** Application running for several hours
- **When:** Continuous navigation and API calls
- **Then:** Memory usage remains stable
- **Expected:** No progressive memory increase

---

## 🎯 Edge Cases & Error Scenarios

### **TC-032: Network Failure Handling**
**Scenario:** Internet connection lost during operation
- **Given:** User generating shortlist
- **When:** Network disconnects mid-operation
- **Then:** Graceful error message with retry option
- **Expected:** User can retry when connection restored

### **TC-033: Empty Database States**
**Scenario:** New university with no data
- **Given:** Fresh university setup
- **When:** Admin tries to generate shortlists
- **Then:** Clear messaging about adding students first
- **Expected:** Helpful onboarding guidance

### **TC-034: Browser Compatibility**
**Scenario:** Platform works across different browsers
- **Given:** Chrome, Firefox, Safari, Edge browsers
- **When:** Access all platform features
- **Then:** Consistent functionality across browsers
- **Expected:** No browser-specific bugs or missing features

---

## 📝 User Acceptance Test Scenarios

### **TC-035: End-to-End Student Journey**
**Scenario:** Complete student workflow
1. Student logs in → sees dashboard
2. Checks gap analysis → identifies weak areas
3. Asks AI for study plan → gets personalized roadmap
4. Practices coding questions → improves ranking
5. Views updated analytics → sees improvement

### **TC-036: End-to-End Admin Placement Workflow**
**Scenario:** Complete admin placement process
1. Admin creates company requirements → saves successfully
2. Generates shortlist for company → gets ranked candidates
3. Exports CSV → shares with placement team
4. Updates algorithm weights → shortlists reflect changes
5. Monitors student progress → tracks batch performance

### **TC-037: Multi-University Scenario**
**Scenario:** Platform scales across institutions
1. University A and B both use platform
2. Each sees only their data
3. Admins manage respective students
4. AI provides university-specific insights
5. No data leakage between institutions

---

## 🚀 Automation Test Scripts

### **API Testing Commands:**

```bash
# Test company creation
curl -X POST http://localhost:5000/api/admin/company-requirements \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"GOOGLE","minCGPA":7.0,"minLeetCodeHard":50,"minRepos":5}'

# Test shortlist generation
curl -X POST http://localhost:5000/api/admin/shortlists \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyId":"uuid-here","batch":"2023-2027","limit":20}'

# Test AI chat
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are my weak topics?"}'
```

### **Frontend Testing:**
```javascript
// Test company form submission
cy.visit('/admin/requirements');
cy.get('input[placeholder="e.g. Google"]').type('GOOGLE');
cy.get('input[type="number"]').first().type('7.0');
cy.get('button').contains('Save Requirement').click();
cy.contains('GOOGLE').should('be.visible');

// Test shortlist generation
cy.visit('/admin/shortlists');
cy.get('select').select('GOOGLE');
cy.get('input[placeholder="e.g. 2026"]').type('2023-2027');
cy.get('button').contains('Generate Shortlist').click();
cy.contains('candidates').should('be.visible');
```

## ✅ Expected Test Results Summary

**🎯 Success Criteria:**
- ✅ All authentication flows work correctly
- ✅ Company requirements save all values (no more "—")
- ✅ Shortlists generate with proper student filtering
- ✅ AI correctly detects intent and provides relevant responses
- ✅ Analytics show accurate student comparisons
- ✅ Security measures prevent common vulnerabilities
- ✅ Performance remains acceptable under load
- ✅ Cross-university data isolation maintained

**📊 Coverage Goals:**
- **Functional:** 95%+ of features work as specified
- **Security:** No critical vulnerabilities
- **Performance:** <5 second response times
- **Usability:** Intuitive workflows for both students and admins