# GIMPA PhD Programme & Doctoral Research Hub
## Comprehensive System, User, and Operational Documentation

---

## 1. Executive Overview & Institutional Purpose

The **GIMPA PhD Programme & Doctoral Research Hub** is a specialized module engineered within the GIMPA Institutional Thesis & Repository Platform. It serves as the primary system of record for managing doctoral education, doctoral supervision, milestone compliance, and institutional quality assurance.

The module aligns with the postgraduate regulations of the **Ghana Institute of Management and Public Administration (GIMPA)** and national accreditation standards established by the **Ghana Tertiary Education Commission (GTEC)**.

### Core Objectives
1. **Milestone Tracking:** End-to-end monitoring of doctoral candidates across coursework, comprehensive examinations, seminars, teaching practice, and dissertation stages.
2. **Supervision Governance:** Regular logging of monthly supervisory sessions across 12 defined doctoral research stages.
3. **Regulatory Inactivity Early-Warning System:** Automated detection and email notifications when doctoral candidates exceed 60 days without recorded supervisory contact.
4. **Reaccreditation Filing (18 Standard Folders):** Continuous archival of academic, administrative, and curriculum evidence required for institutional reaccreditation and external quality audits.

---

## 2. System Architecture & Role-Based Access Control (RBAC)

Access to the PhD Hub is strictly partitioned to protect student academic records, supervisory assessments, and faculty workload data.

### Stakeholder Role Matrix

| User Role | Access Scope | Can View | Can Create / Log | Can Dispatch Reminders |
| :--- | :--- | :--- | :--- | :--- |
| **PhD Candidate / Student** | Self Only | Own dossier, meeting logs, exam status, teaching hours, progress reviews | Seminars attended/presented, Teaching practice submissions | No |
| **PhD Research Supervisor** | Assigned Supervisees Only | Supervisee dossiers, logs, seminar attendance, exam results, teaching | Monthly 12-stage supervision logs, 6-month progress evaluations | Yes (To own supervisees) |
| **Project Coordinator** | Departmental | All PhD candidates within the coordinator's department | Comprehensive exam results, Reaccreditation files | Yes (Department-wide) |
| **Head of Department (HOD)** | Departmental | All PhD candidates within the department, faculty workloads | Exam records, Departmental compliance files | Yes (Department-wide) |
| **Dean of School** | School-wide | All PhD candidates across all departments within the school | School reaccreditation evidence, compliance audit | Yes (School-wide) |
| **System Administrator / Rector** | Institution-wide | All candidates across all schools and departments | All records, folder templates, institutional overrides | Yes (Institution-wide) |

> **Note on Non-PhD Users:** Undergraduate and Master's students, general university members, and standard library staff receive an HTTP 403 Forbidden message if they attempt to access the PhD Hub.

---

## 3. The 12-Stage Doctoral Research Lifecycle

Every doctoral dissertation tracked in the Hub follows a sequential 12-stage framework:

1. **Stage 1: Proposal Preparation** — Conceptualization of research question, problem statement, and initial literature review.
2. **Stage 2: Proposal Defence & Ethics Sign-Off** — Formal presentation before departmental committee and review by the GIMPA Research Ethics Board.
3. **Stage 3: Literature Review & Theoretical Framework** — In-depth critical synthesis of scholarship and grounding in relevant organizational theories.
4. **Stage 4: Methodology & Research Design** — Philosophical positioning, research paradigms, sampling frames, and analytical strategies.
5. **Stage 5: Instrument Development & Pilot Study** — Drafting survey questionnaires, interview protocols, or econometric models, followed by pilot testing.
6. **Stage 6: Data Collection & Fieldwork** — Primary empirical field engagements, organizational data gathering, or archival extractions.
7. **Stage 7: Data Analysis & Interpretation** — Quantitative statistical modeling (e.g., PLS-SEM, regression) or qualitative coding (e.g., thematic analysis).
8. **Stage 8: Empirical Findings & Discussion** — Articulation of analytical insights, hypothesis testing, and theoretical contributions.
9. **Stage 9: Full Draft Synthesis & Turnitin Plagiarism Check** — Consolidation of all chapters into a single doctoral monograph; originality check adhering to the university similarity ceiling.
10. **Stage 10: Departmental Seminar / Internal Review** — Formal presentation of complete dissertation findings to faculty and doctoral colleagues.
11. **Stage 11: External Examination Submission** — Dispatch of dissertation to external examiners appointed by the Academic Board.
12. **Stage 12: Oral Examination (Viva Voce) & Final Corrections** — Public defense before the Oral Examination Board, followed by sign-off on final bound copies.

---

## 4. The 7 Core Hub Sections & How to Use Them

### Section 1: PhD Student Dossiers & Progress Overview
The **Dossiers** view serves as the central command dashboard.
- **Top Summary Cards:**
  - *Enrolled PhD Students:* Total candidates within the user's authorized scope.
  - *Doctoral Candidates:* Count of students who have passed comprehensive exams and advanced to candidacy.
  - *60-Day Inactivity Flag:* Number of students with no supervisory meetings logged in over 60 days.
  - *Teaching Practice / Reaccreditation:* Status of teaching requirements and 18 accreditation folders.
- **Dossier Cards:** Displays candidate photo/initials, degree program, specialization (e.g., Management, Finance, Public Policy), current research stage, candidacy badge, seminar attendance counters, teaching completion badge, assigned supervisors, and last meeting date.
- **Search & Filter:** Search by student name, email, department, or research stage.

---

### Section 2: 12-Stage Supervision Logs
Doctoral regulations mandate at least one formal supervisory session per month.
- **Logged Meeting Details:**
  - Meeting date and mode (*In-Person*, *Zoom / Virtual*, *Hybrid*).
  - Current research stage (Stages 1 through 12).
  - Candidate deliverables submitted prior to meeting.
  - Critique, qualitative feedback, and methodological guidance provided.
  - Assigned next task and target deadline.
  - Progress rating: *Satisfactory*, *Needs Improvement*, or *Critical Concern*.
  - Supervisor concerns and required corrective actions.
- **Who logs this:** Supervisors. When a meeting is logged, an automated in-app notification is sent to the candidate.
- **Student View:** Candidates can view the full chronological history of feedback and assigned deliverables to guide their revisions.

---

### Section 3: 7-Type Research Seminars Tracker
Doctoral candidates are required to build scholarly engagement by participating in 7 mandated categories of academic seminars:
1. *Departmental Research Seminar*
2. *GIMPA Doctoral Colloquium*
3. *National / GAAS Academic Conference*
4. *International Peer-Reviewed Conference*
5. *Methodology / Quantitative Workshop*
6. *Proposal Defence Seminar*
7. *Pre-Viva / Final Results Seminar*

- **Tracking Attributes:** Date, seminar category, presentation title, role (*Presenter* vs. *Attendee*), venue/URL, evaluator name, feedback remarks, and verdict (*Pass*, *Distinction*, *Minor Corrections*).
- **Who records this:** Both students (submitting their seminar participation) and faculty evaluators/coordinators.

---

### Section 4: Comprehensive Examination & Candidacy
The comprehensive examination tests foundational mastery, research methodology, and domain specialization.
- **Exam Structure:**
  - Part 1: Major Field & Theory
  - Part 2: Research Methodology & Analytical Tools
  - Part 3: Minor / Area of Specialization
- **Results Tracking:** Sitting attempt number (Attempt 1, Attempt 2), exam date, score (0–100), verdict (*Pass*, *Fail*, *Resit*), examination committee members, and remedial instructions.
- **Automated Candidacy Advancement:** When a student achieves a *Pass* result, the system automatically elevates their institutional status from **Pre-Candidacy** to **PhD Candidate**.

---

### Section 5: Teaching Practice Requirement
As part of doctoral pedagogical preparation, candidates must complete supervised undergraduate or graduate teaching practice.
- **Recorded Details:** Course code (e.g., BBA 301), course title, academic year, semester, contact hours logged (e.g., 45 hours), description of duties (tutoring, seminar facilitation, grading assistance), supervising faculty member, and qualitative feedback.
- **Completion Sign-off:** Marked as completed once the student fulfills institutional hour quotas and receives satisfactory observation ratings.

---

### Section 6: Six-Month Progress Evaluations
Bi-annual formal review conducted by the supervisory committee and department leadership to evaluate the trajectory of the student.
- **Evaluation Criteria:**
  - Evaluation period (e.g., *Semester 1, 2025/2026*).
  - Coursework GPA summary.
  - Dissertation chapter milestones achieved during the semester.
  - Seminar presentations and conferences completed.
  - Supervised teaching hours delivered.
  - Overall standing: *Satisfactory*, *Marginal*, or *Unsatisfactory*.
  - Strategic 6-month action plan and agreed follow-up milestone date.

---

### Section 7: 18 Reaccreditation Folders
Standardized digital repository organized according to regulatory accreditation specifications:
1. *Programme Approval & Accreditation Documents*
2. *Curriculum, Syllabi & Course Outlines*
3. *Admission Records & Interview Rubrics*
4. *Enrolment & Specialization Registers*
5. *Course Registration & Grade Submissions*
6. *Comprehensive Examination Records*
7. *Thesis Proposal Approvals & Ethics Sign-Off*
8. *Supervision Meeting Logs & Workload Reports*
9. *Research Seminar Registers (7 Types)*
10. *Teaching Requirement Observation Reports*
11. *Six-Month Student Progress Evaluation Reports*
12. *Thesis Examination, Viva & Examiner Reports*
13. *Graduate Output, Titles & Completions*
14. *Staff Profiles, PhD Qualifications & Ranks*
15. *Faculty Research Publications & Grants*
16. *Library Holdings, Databases & Facility Resources*
17. *Student Satisfaction & Supervision Surveys*
18. *Quality Assurance Audits & Action Plans*

- **File Upload & Verification:** Department coordinators, deans, and quality assurance officers upload PDFs, Word documents, and spreadsheets tagged by academic year and status (*Verified*, *Pending Review*, *Archived*).

---

## 5. Regulatory 60-Day Inactivity Early-Warning System

To eliminate student abandonment and supervisory stalling, the system tracks the elapsed days since the candidate's last recorded meeting:

1. **Trigger Condition:** Elapsed days since last meeting $> 60$ days, or no meeting ever logged for an enrolled candidate.
2. **Visual Indicators:** An amber **Alert: >60d Inactive** badge appears on the candidate's dossier, alongside a prominent notification banner at the top of the PhD Hub.
3. **Automated Reminders Button:** Supervisors, Coordinators, HODs, Deans, and Admins can click **"Dispatch Regulatory Reminders (Email)"**.
4. **Dual-Recipient Notifications:**
   - **Student Notice:** Explains the GIMPA doctoral regulation requiring monthly meetings, alerts them to dormancy risks, and prompts them to immediately contact their supervisor.
   - **Supervisor Alert:** Informs the supervisor of the supervisee's dormancy, references institutional compliance guidelines, and requests an immediate consultation session.

---

## 6. Step-by-Step User Guides by Role

### Guide for PhD Candidates
1. **Accessing the Hub:** Log into the portal. In the sidebar or top navigation, click **PhD Hub**.
2. **Reviewing Candidacy & Stage:** On the **My PhD Dossier** tab, inspect your current research stage, assigned supervisors, and comprehensive exam status.
3. **Viewing Supervisor Guidance:** Open the **12-Stage Supervision Logs** tab to read specific comments, critiques, and next assignments logged by your supervisor.
4. **Logging Seminars:** Open the **7-Type Research Seminars** tab, click **Record Seminar**, select the category, enter your topic/paper title, specify whether you presented or attended, and submit.
5. **Submitting Teaching Hours:** Open the **Teaching Practice** tab, click **Record Teaching Requirement**, enter the course code, assigned duties, and contact hours.

### Guide for PhD Supervisors
1. **Accessing Supervisees:** Log in and open **PhD Hub**. Only your assigned doctoral supervisees will appear in the dossier directory.
2. **Logging a Monthly Meeting:**
   - Click the **12-Stage Supervision Logs** tab.
   - Click **Record Supervision Meeting**.
   - Select the supervisee, date, and meeting mode (*In-Person*, *Zoom*, *Hybrid*).
   - Set the current research stage (Stages 1 through 12).
   - Enter details of work submitted, feedback given, next task deadline, and progress rating.
   - Click **Save Supervision Log**.
3. **Conducting 6-Month Evaluations:** Open **6-Month Progress Reviews**, select the student, review their milestones, enter the overall rating, specify the action plan, and submit.
4. **Resolving Inactivity Warnings:** If a candidate shows a $>60$ day flag, click **Email Supervisee Reminder** to dispatch an automated notification.

### Guide for Project Coordinators & HODs
1. **Departmental Oversight:** Open **PhD Hub** to view all doctoral candidates in your department.
2. **Recording Comprehensive Exam Results:**
   - Click the **Comprehensive Exam & Candidacy** tab.
   - Click **Record Comprehensive Exam Result**.
   - Select the candidate, attempt number, exam date, score, result (*Pass*, *Fail*, *Resit*), and committee members.
   - If marked *Pass*, the system updates the candidate to *PhD Candidate* status.
3. **Department Reminders:** Click **Dispatch Regulatory Reminders (Email)** to notify all stalled students and their supervisors across the department.
4. **Accreditation Documentation:** Open **18 Reaccreditation Folders**, choose the appropriate folder (e.g., Folder 6 for Comp Exam records, Folder 8 for Supervision logs), and upload supporting evidence.

### Guide for Deans & Executive Leadership
1. **School-Wide Analytics:** Access high-level statistics across all departments in the school.
2. **Quality Assurance Monitoring:** Inspect the ratio of pre-candidacy to doctoral candidates, verify that supervision logs are actively maintained, and track 60-day inactivity trends.
3. **Reaccreditation Audit:** Review and verify documents across all 18 folders ahead of external GTEC or institutional quality audits.

---

## 7. Technical Endpoints Reference

| Endpoint | Method | Role Restrictions | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/phd/dossiers` | `GET` | All PhD Stakeholders | List student dossiers scoped by user RBAC |
| `/api/v1/phd/supervision-logs` | `GET`, `POST` | Supervisor (Write), Student (Read) | Fetch and create monthly supervisory logs |
| `/api/v1/phd/seminars` | `GET`, `POST` | Student, Faculty, Leadership | Record and retrieve 7-type research seminars |
| `/api/v1/phd/comprehensive-exams` | `GET`, `POST` | Coordinator, HOD, Admin (Write) | Track comprehensive exam sittings and scores |
| `/api/v1/phd/teaching-requirements` | `GET`, `POST` | Student, Faculty, Leadership | Manage doctoral teaching practice hours |
| `/api/v1/phd/progress-evaluations` | `GET`, `POST` | Supervisor, Coordinator (Write) | Record formal 6-month progress reviews |
| `/api/v1/phd/reaccreditation-folders` | `GET`, `POST` | Leadership, Admin (Write) | Manage 18 accreditation evidence folders |
| `/api/v1/phd/regulatory-reminders` | `POST` | Leadership, Supervisor, Admin | Dispatch 60-day inactivity email reminders |

---
*Document Version: 1.0 — Approved for GIMPA Institutional Thesis Repository System*
