# GIMPA Thesis Management & Repository System
### Full System Design & Build Documentation

---

## 1. Overview

This system digitizes the full lifecycle of a GIMPA thesis — from topic
submission to final publication in a student-facing repository — and
replaces email/paper-based handoffs between Student, Supervisor, HOD /
Project Coordinator, Dean, Internal & External Examiners, and the
Librarian with one tracked workflow.

**Stack**

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + TailwindCSS | Fast dev, component-based dashboards per role |
| Backend | Python (FastAPI) | Async, strong typing (Pydantic), easy file/zip handling |
| Database | MySQL 8 | Relational integrity across users/roles/phases/files, required by brief |
| Auth | JWT (access + refresh) | Stateless, role claims embedded in token |
| File storage | Local disk (`/storage`) in dev, S3-compatible bucket in prod | Proposals, step files, marks, zips, published PDFs |
| Document editing/commenting | Google Docs API (Drive) — recommended | Real collaborative commenting without building a Word editor from scratch |
| Notifications | In-app table (polled or WebSocket) + optional email (SMTP) | HOD/Dean/Student alerts |

---

## 2. Roles

| Role | Key powers |
|---|---|
| **Student** | Submit topic, submit proposal, submit Steps, view comments, correct work, view published repository |
| **Supervisor** | Approve/reject proposal, approve/revise each Step, click "Finish Steps", approve/revise Phase 4 corrections, write external comments |
| **HOD / Project Coordinator** | Approve topic + assign supervisor (Phase 1), assign examiners (Phase 3), relay examiner comments, department dashboard, final Phase 4/5 approval |
| **Dean** | Read-only school-wide dashboard (all departments in their school) |
| **Internal Examiner** | Download assigned ZIP, upload marks (Excel) + comments |
| **External Examiner** | Same as internal examiner, external account (no department dashboard access) |
| **Librarian** | Final publish action → makes thesis visible in public repository |
| **Admin** | User/role/department/school management |

A thesis can have **multiple examiners** (2+ internal and/or external), so
marks/comments are stored per *assignment*, not per thesis.

---

## 3. Phase Workflow (state machine)

```
 PHASE 1 — Topic & Supervisor Assignment
   Student submits Topic
     → HOD/Coordinator: Approve / Reject Topic
     → HOD/Coordinator: Assign Supervisor
     → advances to Phase 2

 PHASE 2 — Proposal & Steps
   Student submits Proposal
     → Supervisor: Approve / Revise
     (loops until Approved)
     → Student submits Step N (N is NOT fixed at 5)
     → Supervisor: Approve / Revise each Step
     (loops per step until Approved)
     → Supervisor clicks "Finish Steps" (supervisor-only action, any step count)
     → advances to Phase 3

 PHASE 3 — Examination
   HOD/Coordinator notified "Steps finished"
     → HOD/Coordinator assigns Internal + External Examiner(s)
     → System builds ZIP of assigned student(s) work per examiner
     → Examiner downloads ZIP
     → Examiner uploads marks (Excel) + comments
     → HOD/Coordinator reviews all examiner comments
     → HOD/Coordinator forwards consolidated comments to student
     → advances to Phase 4

 PHASE 4 — Correction
   Student corrects work against examiner comments
     → Supervisor: Approve / Revise (loops, same pattern as Steps)
     → once Supervisor approves → HOD/Coordinator approval
     → BOTH must approve → advances to Phase 5

 PHASE 5 — Publication
   Both approvals recorded
     → sent to Librarian queue
     → Librarian publishes
     → Thesis appears in public Thesis Repository (read/view only)
```

Every phase transition, approval, and revision is written to `phase_history`
and `audit_log` so HOD/Dean dashboards are just queries over real state,
not a second source of truth.

---

## 4. Database Schema (MySQL)

Core tables (full SQL is in `backend/database/schema.sql`):

- `schools`, `departments` — org structure (Dean ↔ school, HOD ↔ department)
- `users` — single table, `role` enum, `department_id`/`school_id` nullable by role
- `theses` — one row per student thesis; holds `current_phase`, `topic_status`
- `topics` — Phase 1 topic text + HOD decision
- `proposals` — Phase 2 proposal file + supervisor decision
- `steps` — Phase 2 "Steps" (replaces fixed chapters); `step_number`, file, `status`, `is_final` flag set when supervisor clicks Finish Steps
- `examiner_assignments` — many-to-many thesis↔examiner, `type` internal/external
- `examiner_marks` — one row per assignment: Excel file path + comments
- `corrections` — Phase 4 rounds: student response file, supervisor decision, HOD decision, coordinator decision
- `comments` — polymorphic: `entity_type`/`entity_id`, `comment_scope` = `inline` (inside the doc, via Google Docs comments) or `external` (shown to student as a separate "Supervisor Remarks" panel outside the document)
- `notifications` — per-user, `is_read`, deep link
- `publications` — final PDF, abstract, keywords, `is_public`
- `audit_log` — every state-changing action, for accountability

Relationships are enforced with foreign keys and `ON DELETE RESTRICT` so a
thesis's history can never be silently lost.

---

## 5. Document Editing & Commenting (Word/Google Docs requirement)

Building a Word editor from scratch is not realistic or necessary. Recommended approach:

1. Student uploads `.docx` → backend uploads it to a **Google Drive service
   account folder** via the Drive API and converts it to a native Google Doc.
2. The system stores the returned `google_doc_id` on the `steps`/`proposals`/`corrections` row.
3. Frontend embeds the doc in an iframe using the Drive embed URL, with the
   student/supervisor granted commenter or editor access via Drive
   permissions scoped to that file only.
4. Supervisors add **inline comments directly in the Google Doc** (native
   Drive commenting) — this satisfies "open the student's work in Word/Google
   Docs form to add comments."
5. Separately, the supervisor fills an **"External Remarks" panel** in the
   React app (stored in `comments` with `comment_scope='external'`) — this is
   the comment surface *outside* the document that the student sees on
   their dashboard, per the brief.
6. On approval, the Doc is exported back to `.docx`/PDF via the Drive
   `export` endpoint and archived as the immutable submitted version.

(Microsoft Graph API + Office Online is a valid alternative if GIMPA prefers
a Word-native flow; the abstraction in `DocumentViewer.jsx` is provider-agnostic.)

---

## 6. Examiner ZIP flow

1. HOD/Coordinator assigns N students to an examiner (`examiner_assignments`).
2. `POST /examiners/{id}/generate-zip` builds a zip in `storage/zips/` containing
   each assigned student's latest approved Step/Proposal file, named
   `{student_id}_{name}.docx`.
3. Examiner calls `GET /examiners/{id}/download-zip` to fetch it.
4. Examiner uploads one Excel file of marks + free-text comments per student
   via `POST /examiners/assignments/{assignment_id}/marks` (Excel parsed with
   `openpyxl`/`pandas`, validated, stored raw + parsed).
5. HOD/Coordinator dashboard aggregates all assignments for a thesis
   (2+ examiners) before comments are relayed to the student.

---

## 7. Dashboards

- **HOD/Project Coordinator**: every thesis in their `department_id`, current
  phase, pending action, SLA/age indicator, examiner assignment tool, notification inbox.
- **Dean**: same view, aggregated across all departments in their `school_id`, read-only.
- **Student**: their own thesis timeline, current phase, action needed, external remarks.
- **Supervisor**: queue of proposals/steps/corrections awaiting their decision.
- **Examiner**: assigned students, zip download, marks upload status.
- **Librarian**: Phase-5 queue ready to publish + the live public repository.

---

## 8. Thesis Repository (the page the librarian publishes to)

- Public-within-university page, no auth required to *browse/read* (or
  GIMPA-login-only, configurable).
- Filters: school, department, year, supervisor, keyword search.
- Each entry: title, abstract, author, year, department, and a **read-only**
  embedded viewer (PDF.js) — download disabled or watermarked depending on
  GIMPA's IP policy (recommend configurable per thesis).
- Only rows in `publications` with `is_public=1` are ever queryable — set
  exclusively by the Librarian action, never by students/supervisors.

---

## 9. Notifications

Triggered server-side on: topic decision, supervisor assignment, step
decision, "Finish Steps," examiner assignment, marks uploaded, comments
relayed, correction decision, HOD/Coordinator dual approval, publication.
Stored in `notifications`, surfaced via a bell icon polling
`GET /notifications/unread`, optionally mirrored to email.

---

## 10. Security & audit

- JWT with role claim; every route checks role + ownership (`student_id == current_user.id`, `department_id == hod.department_id`, etc.) — never trust the frontend.
- File uploads validated by MIME + extension allow-list (`.docx`, `.pdf`, `.xlsx`).
- All approvals/revisions/publishes write to `audit_log(user_id, action, entity, entity_id, timestamp)` — this is what makes the HOD/Dean dashboards trustworthy.
- Google Drive file permissions scoped per-document, never folder-wide to "anyone with the link."

---

## 11. Suggested additions beyond the brief

1. **Deadline/SLA tracking** per phase so HOD dashboards can flag theses stuck too long.
2. **Versioning** — every Step/Proposal/Correction submission keeps its prior file, not just an overwrite, so nothing is lost if a "revise" round happens.
3. **Plagiarism-check hook** (Turnitin/other) before Phase 3 examiner assignment — stubbed as an integration point, not built, since it needs a paid API key.
4. **Multi-examiner consensus view** for HOD — side-by-side marks/comments when 2+ examiners graded one thesis.
5. **Audit log** as described above — accountability across 5 phases and ~7 roles is otherwise very hard to reconstruct later.

---

## 12. Build order (recommended)

1. MySQL schema (`backend/database/schema.sql`) → run it, seed schools/departments/roles.
2. Auth + role middleware.
3. Phase 1 & 2 endpoints + Student/Supervisor dashboards (this is the core loop — get it solid before anything else).
4. Phase 3 examiner + zip flow.
5. Phase 4 correction loop (reuses the same approve/revise pattern as Steps).
6. Phase 5 + Librarian + public Thesis Repository page.
7. Notifications + Dean/HOD aggregate dashboards last, since they're read-only views over data the earlier phases already produce.

---

## 13. What's included in the provided code scaffold

- Full MySQL schema, ready to run.
- FastAPI backend: auth, models, and routers for topics, proposals, steps, examiners, corrections, library/publication, notifications, dashboards.
- React frontend: login, role-based dashboards for all 7 roles, the public Thesis Repository page, a reusable `PhaseTracker` component, and a `DocumentViewer` component stubbed for Google Docs embedding.
- This is a **working, runnable scaffold** — wire in real Google/SMTP credentials and finish any TODOs marked in code before production use.
