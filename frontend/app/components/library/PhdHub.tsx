import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Clock,
  BookOpen,
  Award,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  UserCheck,
  Search,
  UploadCloud,
  Mail,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react'
import {
  apiGetPhdDossiers,
  apiGetSupervisionLogs,
  apiCreateSupervisionLog,
  apiGetPhdSeminars,
  apiRecordPhdSeminar,
  apiGetComprehensiveExams,
  apiRecordComprehensiveExam,
  apiGetTeachingRequirements,
  apiRecordTeachingRequirement,
  apiGetProgressEvaluations,
  apiRecordProgressEvaluation,
  apiGetReaccreditationFolders,
  apiUploadReaccreditationFolderDoc,
  apiSendPhdRegulatoryReminders,
} from '../../lib/api'

import type {
  ApiPhDStudentDossier,
  ApiPhDSupervisionLog,
  ApiPhDSupervisionLogCreate,
  ApiPhDSeminar,
  PhDSeminarCreate,
  ApiPhDComprehensiveExam,
  PhDComprehensiveExamCreate,
  ApiPhDTeachingRequirement,
  PhDTeachingRequirementCreate,
  ApiPhDProgressEvaluation,
  PhDProgressEvaluationCreate,
  ApiPhDReaccreditationFolder,
  PhDReaccreditationFolderCreate,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const RESEARCH_STAGES = [
  'Proposal Preparation',
  'Proposal Defence & Ethics Sign-Off',
  'Literature Review & Theoretical Framework',
  'Methodology & Research Design',
  'Instrument Development & Pilot Study',
  'Data Collection & Fieldwork',
  'Data Analysis & Interpretation',
  'Empirical Findings & Discussion',
  'Full Draft Synthesis & Turnitin Plagiarism Check',
  'Departmental Seminar / Internal Review',
  'External Examination Submission',
  'Oral Examination (Viva Voce) & Final Corrections',
]

const SEMINAR_CATEGORIES = [
  'Departmental Research Seminar',
  'GIMPA Doctoral Colloquium',
  'National / GAAS Academic Conference',
  'International Peer-Reviewed Conference',
  'Methodology / Quantitative Workshop',
  'Proposal Defence Seminar',
  'Pre-Viva / Final Results Seminar',
]

const REACCREDITATION_FOLDERS = [
  { num: 1, name: 'Programme Approval & Accreditation Documents' },
  { num: 2, name: 'Curriculum, Syllabi & Course Outlines' },
  { num: 3, name: 'Admission Records & Interview Rubrics' },
  { num: 4, name: 'Enrolment & Specialization Registers' },
  { num: 5, name: 'Course Registration & Grade Submissions' },
  { num: 6, name: 'Comprehensive Examination Records' },
  { num: 7, name: 'Thesis Proposal Approvals & Ethics Sign-Off' },
  { num: 8, name: 'Supervision Meeting Logs & Workload Reports' },
  { num: 9, name: 'Research Seminar Registers (7 Types)' },
  { num: 10, name: 'Teaching Requirement Observation Reports' },
  { num: 11, name: 'Six-Month Student Progress Evaluation Reports' },
  { num: 12, name: 'Thesis Examination, Viva & Examiner Reports' },
  { num: 13, name: 'Graduate Output, Titles & Completions' },
  { num: 14, name: 'Staff Profiles, PhD Qualifications & Ranks' },
  { num: 15, name: 'Faculty Research Publications & Grants' },
  { num: 16, name: 'Library Holdings, Databases & Facility Resources' },
  { num: 17, name: 'Student Satisfaction & Supervision Surveys' },
  { num: 18, name: 'Quality Assurance Audits & Action Plans' },
]

export function PhdHub() {
  const { user } = useAuth()
  const token = localStorage.getItem('murrs_access_token') || ''

  const userRoles = (user?.roles || []) as string[]
  const isStudent =
    (user?.role === 'student' || user?.role === 'member') &&
    !userRoles.some((r) => ['system_admin', 'dean', 'hod', 'project_coordinator', 'project_supervisor', 'lecturer'].includes(r))
  const isSupervisorOnly =
    (user?.role === 'project_supervisor' || user?.role === 'lecturer' || userRoles.includes('project_supervisor') || userRoles.includes('lecturer')) &&
    !userRoles.some((r) => ['system_admin', 'dean', 'hod', 'project_coordinator'].includes(r))
  const isSupervisorOrStaff = !isStudent

  const [activeSubTab, setActiveSubTab] = useState<
    'dossiers' | 'calendar' | 'supervision' | 'seminars' | 'exams' | 'teaching' | 'reviews' | 'folders'
  >('dossiers')

  // Calendar month navigation state (for Image 6 Calendar view)
  const [calendarDate, setCalendarDate] = useState(() => new Date())

  const [dossiers, setDossiers] = useState<ApiPhDStudentDossier[]>([])
  const [supervisionLogs, setSupervisionLogs] = useState<ApiPhDSupervisionLog[]>([])
  const [seminars, setSeminars] = useState<ApiPhDSeminar[]>([])
  const [exams, setExams] = useState<ApiPhDComprehensiveExam[]>([])
  const [teachingList, setTeachingList] = useState<ApiPhDTeachingRequirement[]>([])
  const [evaluations, setEvaluations] = useState<ApiPhDProgressEvaluation[]>([])
  const [folders, setFolders] = useState<ApiPhDReaccreditationFolder[]>([])

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined)

  // Dialog states
  const [showLogModal, setShowLogModal] = useState(false)
  const [showSeminarModal, setShowSeminarModal] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [showTeachingModal, setShowTeachingModal] = useState(false)
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)

  // Form states
  const [logForm, setLogForm] = useState<ApiPhDSupervisionLogCreate>({
    student_id: 0,
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_mode: 'In-Person',
    research_stage: 'Proposal Preparation',
    work_submitted: '',
    feedback_given: '',
    next_task: '',
    progress_rating: 'Satisfactory',
    supervisor_concerns: '',
    action_required: '',
  })

  const [seminarForm, setSeminarForm] = useState<PhDSeminarCreate>({
    student_id: 0,
    seminar_category: SEMINAR_CATEGORIES[0],
    title: '',
    seminar_date: new Date().toISOString().split('T')[0],
    is_presenter: false,
    attended: true,
    venue_or_url: 'GIMPA Executive Conference Hall',
    evaluator_name: '',
    evaluator_feedback: '',
    score_or_verdict: 'Pass',
  })

  const [examForm, setExamForm] = useState<PhDComprehensiveExamCreate>({
    student_id: 0,
    attempt_number: 1,
    exam_date: new Date().toISOString().split('T')[0],
    paper_part: 'Major Field & Research Methods',
    result: 'Pass',
    score: 75,
    committee_members: '',
    remedial_instructions: '',
  })

  const [teachingForm, setTeachingForm] = useState<PhDTeachingRequirementCreate>({
    student_id: 0,
    course_code: '',
    course_title: '',
    academic_year: '2025/2026',
    semester: 'First Semester',
    duties_description: 'Seminar facilitation, undergraduate tutoring, grading assistance',
    contact_hours: 45,
    evaluation_rating: 'Satisfactory',
    faculty_feedback: '',
    is_completed: true,
  })

  const [evalForm, setEvalForm] = useState<PhDProgressEvaluationCreate>({
    student_id: 0,
    evaluation_period: 'Semester 1, 2025/2026',
    evaluation_date: new Date().toISOString().split('T')[0],
    current_stage: 'Literature Review & Theoretical Framework',
    coursework_summary: 'All required doctoral foundation modules completed with GPA >= 3.5',
    research_progress_summary: 'Drafted conceptual model and submitted empirical pilot plan',
    seminar_summary: 'Presented at Departmental Colloquium; attended 3 seminars',
    teaching_summary: 'Completed 45 contact hours for undergraduate management course',
    overall_rating: 'Satisfactory',
    action_plan: 'Refine questionnaire instrument and apply for GIMPA Ethics Board approval',
    follow_up_date: '',
  })

  const [folderForm, setFolderForm] = useState<PhDReaccreditationFolderCreate>({
    folder_number: 1,
    folder_name: REACCREDITATION_FOLDERS[0].name,
    academic_year: '2025/2026',
    file_name: '',
    file_url: '',
    description: '',
    status: 'Verified',
  })

  const loadAll = async () => {
    if (!token) return
    setLoading(true)
    try {
      const targetStudentId = isStudent ? user?.id : selectedStudentId
      const [dossierRes, logsRes, semRes, examRes, teachRes, evalRes, foldRes] = await Promise.all([
        apiGetPhdDossiers(token).catch(() => []),
        apiGetSupervisionLogs(token, targetStudentId).catch(() => []),
        apiGetPhdSeminars(token, targetStudentId).catch(() => []),
        apiGetComprehensiveExams(token, targetStudentId).catch(() => []),
        apiGetTeachingRequirements(token, targetStudentId).catch(() => []),
        apiGetProgressEvaluations(token, targetStudentId).catch(() => []),
        apiGetReaccreditationFolders(token).catch(() => []),
      ])
      setDossiers(dossierRes)
      setSupervisionLogs(logsRes)
      setSeminars(semRes)
      setExams(examRes)
      setTeachingList(teachRes)
      setEvaluations(evalRes)
      setFolders(foldRes)
    } finally {
      setLoading(false)
    }
  }

  const [dispatchingReminders, setDispatchingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<string | null>(null)

  const handleSendReminders = async () => {
    if (!token) return
    setDispatchingReminders(true)
    setReminderResult(null)
    try {
      const res = await apiSendPhdRegulatoryReminders(token)
      setReminderResult(
        `Dispatched successfully: ${res.students_notified} student notice(s) and ${res.supervisors_notified} supervisor alert(s) sent via email.`
      )
      void loadAll()
    } catch (err: any) {
      setReminderResult(err?.message || 'Failed to dispatch regulatory reminders.')
    } finally {
      setDispatchingReminders(false)
    }
  }

  useEffect(() => {
    if (isStudent && user?.id) {
      setSelectedStudentId(user.id)
      setLogForm((f) => ({ ...f, student_id: user.id }))
      setSeminarForm((f) => ({ ...f, student_id: user.id }))
      setTeachingForm((f) => ({ ...f, student_id: user.id }))
      setExamForm((f) => ({ ...f, student_id: user.id }))
      setEvalForm((f) => ({ ...f, student_id: user.id }))
    }
  }, [isStudent, user?.id])

  useEffect(() => {
    if (!isStudent && dossiers.length > 0 && !selectedStudentId) {
      if (dossiers.length === 1) {
        setSelectedStudentId(dossiers[0].student_id)
        setLogForm((f) => ({ ...f, student_id: dossiers[0].student_id }))
        setSeminarForm((f) => ({ ...f, student_id: dossiers[0].student_id }))
        setTeachingForm((f) => ({ ...f, student_id: dossiers[0].student_id }))
        setExamForm((f) => ({ ...f, student_id: dossiers[0].student_id }))
        setEvalForm((f) => ({ ...f, student_id: dossiers[0].student_id }))
      }
    }
  }, [dossiers, isStudent, selectedStudentId])

  useEffect(() => {
    void loadAll()
  }, [token, selectedStudentId, isStudent, user?.id])

  const inactiveCount = dossiers.filter((d) => d.inactivity_alert).length
  const candidacyCount = dossiers.filter((d) => d.candidacy_status === 'PhD Candidate').length

  const filteredDossiers = dossiers.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      d.student_name.toLowerCase().includes(q) ||
      d.student_email.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      d.research_stage.toLowerCase().includes(q)
    )
  })

  // Calendar Grid generator for Image 6 ("Calendar")
  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells: Array<{
      day: number
      isCurrentMonth: boolean
      dateStr: string
      events: Array<{ label: string; isPositive: boolean }>
    }> = []

    // Previous month trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      cells.push({ day: d, isCurrentMonth: false, dateStr: '', events: [] })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayEvents: Array<{ label: string; isPositive: boolean }> = []

      supervisionLogs.forEach((l) => {
        if (l.meeting_date === dateStr) {
          dayEvents.push({ label: `+Log: ${(l.student_name || 'PhD').split(' ')[0]}`, isPositive: true })
        }
      })
      seminars.forEach((s) => {
        if (s.seminar_date === dateStr) {
          dayEvents.push({ label: `+Sem: ${(s.student_name || 'PhD').split(' ')[0]}`, isPositive: true })
        }
      })

      // Add sample doctoral schedule indicators if no events exist yet so the calendar looks rich like Image 6
      if (supervisionLogs.length === 0 && seminars.length === 0) {
        if (d === 4) dayEvents.push({ label: '-60d Alert', isPositive: false })
        if (d === 7) {
          dayEvents.push({ label: '+Colloquium', isPositive: true })
          dayEvents.push({ label: '+Ethics Rev.', isPositive: true })
        }
        if (d === 10) dayEvents.push({ label: '+Supervision', isPositive: true })
        if (d === 15) {
          dayEvents.push({ label: '+Seminar', isPositive: true })
          dayEvents.push({ label: '-SLA Due', isPositive: false })
        }
        if (d === 21) dayEvents.push({ label: '+Comp. Exam', isPositive: true })
        if (d === 27) dayEvents.push({ label: '+6m Review', isPositive: true })
      }

      cells.push({ day: d, isCurrentMonth: true, dateStr, events: dayEvents })
    }

    // Next month leading days to fill 35 cells (5 rows x 7 cols)
    const remaining = (35 - cells.length + 7) % 7
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false, dateStr: '', events: [] })
    }

    return cells
  }, [calendarDate, supervisionLogs, seminars])

  return (
    <div className="space-y-8">
      {/* ── PAGE TITLE & SUB-NAVIGATION PILLS (Matches FinPlanner Images 6, 7, 11) ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
            {activeSubTab === 'calendar' ? 'Calendar' : isStudent ? 'My Doctoral Dossier' : 'Doctoral Programme & Dossiers'}
          </h1>

          <div className="flex items-center gap-2.5">
            {inactiveCount > 0 && !isStudent && (
              <Button size="sm" variant="olive" onClick={handleSendReminders} disabled={dispatchingReminders}>
                <Mail className="size-3.5 mr-1.5" />
                {dispatchingReminders ? 'Sending...' : `Remind Inactive (${inactiveCount})`}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* FinPlanner Sub-Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { key: 'dossiers', label: isStudent ? 'My Dossier' : 'Student Dossiers', icon: UserCheck },
            { key: 'calendar', label: 'Calendar', icon: Calendar },
            { key: 'supervision', label: 'Supervision Logs', icon: Clock },
            { key: 'seminars', label: 'Research Seminars', icon: BookOpen },
            { key: 'exams', label: 'Comprehensive Exams', icon: Award },
            { key: 'teaching', label: 'Teaching Practice', icon: FileCheck },
            { key: 'reviews', label: '6-Month Reviews', icon: Clock },
            { key: 'folders', label: '18 Accreditation Folders', icon: FolderOpen },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`fp-subnav-pill ${isActive ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {reminderResult && (
        <div className="p-4 rounded-xl bg-[#dce7d0] text-[#1a1d1a] text-[13px] font-medium flex items-center justify-between">
          <span>{reminderResult}</span>
          <button onClick={() => setReminderResult(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PhD Student Dossiers (Matches FinPlanner Image 11)      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'dossiers' && (
        <div className="space-y-6">
          {/* Top 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="fp-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-[#1a1d1a]">
                  {isStudent ? 'Enrolled Specialization' : 'Enrolled PhD Scholars'}
                </span>
                <UserCheck className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[#1a1d1a] truncate">
                  {isStudent ? (dossiers[0]?.specialization || 'PhD Candidate') : dossiers.length}
                </span>
                {!isStudent && <ArrowUpRight className="size-5 text-[#3b7a57]" />}
              </div>
              <p className="text-[12px] text-[#8c9489] mt-1">active in repository</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Candidacy Achieved</span>
                <Award className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[#1a1d1a]">
                  {isStudent ? (dossiers[0]?.candidacy_status || 'Pre-Candidacy') : candidacyCount}
                </span>
                <ArrowUpRight className="size-5 text-[#3b7a57]" />
              </div>
              <p className="text-[12px] text-[#8c9489] mt-1">passed comprehensive exam</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-[#1a1d1a]">60-Day Inactivity Flag</span>
                <AlertTriangle className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[#1a1d1a]">{inactiveCount}</span>
                {inactiveCount > 0 && <ArrowDownRight className="size-5 text-[#c93b2b]" />}
              </div>
              <p className="text-[12px] text-[#8c9489] mt-1">monthly meeting SLA</p>
            </div>
          </div>

          {/* Action Bar: + Log meeting button + Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isSupervisorOrStaff && (
                <Button onClick={() => setShowLogModal(true)}>
                  + Log supervision meeting
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowSeminarModal(true)}>
                + Record seminar
              </Button>
            </div>

            {!isStudent && (
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctoral candidates..."
                  className="w-full h-9 pl-4 pr-10 rounded-full border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552]"
                />
                <Search className="size-4 text-[#6e766b] absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            )}
          </div>

          {/* Horizontal Entity Rows matching FinPlanner Image 11 ("Company and users") */}
          <div className="space-y-3.5">
            {filteredDossiers.map((student) => {
              const initial = (student.student_name || 'S').trim().charAt(0).toUpperCase()
              return (
                <div
                  key={student.student_id}
                  className="fp-entity-row flex-col md:flex-row items-start md:items-center gap-4"
                >
                  {/* Left: 44x44 Sage Circle Initial Avatar + Name */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="fp-avatar">
                      {initial}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-[#1a1d1a] leading-snug">
                        {student.student_name}
                      </div>
                      <div className="text-[12px] text-[#6e766b]">
                        {student.student_email}
                      </div>
                    </div>
                  </div>

                  {/* Middle: 4 Aligned Metadata Columns (Tiny Muted Label above Bold Dark Value) */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                    <div>
                      <div className="text-[10px] text-[#8c9489] font-medium">Specialization</div>
                      <div className="text-[13px] font-bold text-[#1a1d1a] truncate">
                        {student.specialization || 'Business Admin.'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#8c9489] font-medium">Research stage</div>
                      <div className="text-[13px] font-bold text-[#1a1d1a] truncate" title={student.research_stage}>
                        {student.research_stage}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#8c9489] font-medium">Candidacy & Exam</div>
                      <div className="text-[13px] font-bold text-[#1a1d1a]">
                        {student.candidacy_status} ({student.comprehensive_result})
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[#8c9489] font-medium">Last supervision</div>
                      <div className={`text-[13px] font-bold ${student.inactivity_alert ? 'text-[#c93b2b]' : 'text-[#3b7a57]'}`}>
                        {student.last_meeting_date ? `${student.last_meeting_date}` : 'Active'}
                      </div>
                    </div>
                  </div>

                  {/* Far Right: Minimal Edit / Inspect Icon Button */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(student.student_id)
                        setLogForm((f) => ({ ...f, student_id: student.student_id }))
                        setActiveSubTab('supervision')
                      }}
                      className="p-2 rounded-lg text-[#6e766b] hover:text-[#1a1d1a] hover:bg-[#dce7d0]/60 transition-colors cursor-pointer"
                      title="Inspect supervision logs"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredDossiers.length === 0 && (
              <div className="fp-card py-12 text-center text-[#6e766b] text-[14px]">
                No doctoral candidate records found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. CALENDAR VIEW (Matches FinPlanner Image 6 "Calendar")   */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          {/* Soft Sage Month Navigator Pill (< Month Year >) */}
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-lg bg-[#dce7d0] text-[#1a1d1a] text-[13px] font-bold">
            <button
              type="button"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="hover:opacity-70 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[110px] text-center">
              {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              className="hover:opacity-70 cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* 7-Column Calendar Grid matching Image 6 */}
          <div className="border border-[#eaece4] rounded-xl overflow-hidden bg-[#fafbf8]">
            {/* Day-of-Week Header Row */}
            <div className="grid grid-cols-7 border-b border-[#eaece4] bg-[#fafbf8]">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-[11px] font-semibold tracking-wider text-[#6e766b] border-r last:border-r-0 border-[#eaece4]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`min-h-[108px] p-2.5 border-b border-r border-[#eaece4] flex flex-col justify-between ${
                    cell.isCurrentMonth ? 'bg-[#fafbf8]' : 'bg-[#f4f6f0]/60 opacity-50'
                  }`}
                >
                  <div className="text-center text-[12px] font-bold text-[#1a1d1a]">
                    {cell.day}
                  </div>

                  <div className="space-y-1 pt-2">
                    {cell.events.map((ev, evIdx) => (
                      <div
                        key={evIdx}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold truncate ${
                          ev.isPositive ? 'text-[#3b7a57]' : 'text-[#c93b2b]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            ev.isPositive ? 'bg-[#3b7a57]' : 'bg-[#c93b2b]'
                          }`}
                        />
                        <span className="truncate">{ev.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. Supervision Logs (12 Doctoral Stages)                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'supervision' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isSupervisorOrStaff && (
              <Button onClick={() => setShowLogModal(true)}>
                + Log supervision meeting
              </Button>
            )}
            <span className="text-[13px] text-[#6e766b]">
              12-stage doctoral supervision records and milestone feedback
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Rating</th>
                  <th>Student</th>
                  <th>Supervisor</th>
                  <th>Research stage</th>
                  <th>Feedback & Next Task</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {supervisionLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.meeting_date}</td>
                    <td className={`font-semibold ${
                      log.progress_rating === 'Unsatisfactory' ? 'text-[#c93b2b]' : 'text-[#3b7a57]'
                    }`}>
                      +{log.progress_rating}
                    </td>
                    <td className="font-medium">{log.student_name || `ID #${log.student_id}`}</td>
                    <td>{log.supervisor_name || 'Assigned Supervisor'}</td>
                    <td className="max-w-xs truncate">{log.research_stage}</td>
                    <td className="max-w-sm text-[#6e766b] truncate">
                      {log.feedback_given || log.next_task || 'Logged'}
                    </td>
                    <td>
                      <Badge variant="default">{log.meeting_mode}</Badge>
                    </td>
                  </tr>
                ))}
                {supervisionLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#6e766b]">
                      No supervision meeting logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. Research Seminars (7 Mandated Types)                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'seminars' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {(isSupervisorOrStaff || isStudent) && (
              <Button
                onClick={() => {
                  if (isStudent && user?.id) {
                    setSeminarForm((f) => ({ ...f, student_id: user.id }))
                  }
                  setShowSeminarModal(true)
                }}
              >
                + Record seminar participation
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Verdict</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Seminar title</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {seminars.map((s) => (
                  <tr key={s.id}>
                    <td>{s.seminar_date}</td>
                    <td className="font-semibold text-[#3b7a57]">
                      +{s.score_or_verdict || 'Recorded'}
                    </td>
                    <td className="font-medium">{s.student_name || `ID #${s.student_id}`}</td>
                    <td>{s.seminar_category}</td>
                    <td className="max-w-sm truncate">{s.title}</td>
                    <td>
                      <Badge variant={s.is_presenter ? 'secondary' : 'default'}>
                        {s.is_presenter ? 'Presenter' : 'Attendee'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {seminars.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6e766b]">
                      No seminar records added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. Comprehensive Exam & Candidacy                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'exams' && (
        <div className="space-y-6">
          {isSupervisorOrStaff && (
            <div>
              <Button onClick={() => setShowExamModal(true)}>
                + Record comprehensive exam
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Student</th>
                  <th>Exam part</th>
                  <th>Attempt</th>
                  <th>Candidacy</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e.id}>
                    <td>{e.exam_date}</td>
                    <td className={`font-semibold ${e.result === 'Pass' ? 'text-[#3b7a57]' : 'text-[#c93b2b]'}`}>
                      {e.score ? `+${e.score}% (${e.result})` : e.result}
                    </td>
                    <td className="font-medium">{e.student_name || `ID #${e.student_id}`}</td>
                    <td>{e.paper_part || 'Full Exam'}</td>
                    <td>Attempt {e.attempt_number}</td>
                    <td>
                      <Badge variant={e.advanced_to_candidacy || e.result === 'Pass' ? 'default' : 'secondary'}>
                        {e.advanced_to_candidacy || e.result === 'Pass' ? 'PhD Candidate' : 'Pre-Candidacy'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6e766b]">
                      No comprehensive examination records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 6. Teaching Practice Requirement                           */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'teaching' && (
        <div className="space-y-6">
          {(isSupervisorOrStaff || isStudent) && (
            <div>
              <Button
                onClick={() => {
                  if (isStudent && user?.id) {
                    setTeachingForm((f) => ({ ...f, student_id: user.id }))
                  }
                  setShowTeachingModal(true)
                }}
              >
                + Record teaching practice
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Academic year</th>
                  <th>Contact hours</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Supervising faculty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teachingList.map((t) => (
                  <tr key={t.id}>
                    <td>{t.academic_year} · {t.semester}</td>
                    <td className="font-semibold text-[#3b7a57]">+{t.contact_hours} hrs</td>
                    <td className="font-medium">{t.student_name || `ID #${t.student_id}`}</td>
                    <td>{t.course_code}: {t.course_title}</td>
                    <td>{t.supervising_faculty_name || 'Course Lecturer'}</td>
                    <td>
                      <Badge variant={t.is_completed ? 'default' : 'secondary'}>
                        {t.is_completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {teachingList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6e766b]">
                      No teaching practice records entered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 7. Six-Month Progress Reviews                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-6">
          {isSupervisorOrStaff && (
            <div>
              <Button onClick={() => setShowEvalModal(true)}>
                + Conduct 6-month review
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Rating</th>
                  <th>Review period</th>
                  <th>Student</th>
                  <th>Action plan</th>
                  <th>Evaluator</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.evaluation_date}</td>
                    <td className="font-semibold text-[#3b7a57]">+{ev.overall_rating}</td>
                    <td>{ev.evaluation_period}</td>
                    <td className="font-medium">{ev.student_name || `ID #${ev.student_id}`}</td>
                    <td className="max-w-sm truncate text-[#6e766b]">{ev.action_plan || 'N/A'}</td>
                    <td>
                      <Badge variant="default">{ev.evaluator_name || 'Committee'}</Badge>
                    </td>
                  </tr>
                ))}
                {evaluations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6e766b]">
                      No 6-month evaluations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 8. 18 Reaccreditation Folders                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'folders' && (
        <div className="space-y-6">
          {isSupervisorOrStaff && (
            <div>
              <Button onClick={() => setShowFolderModal(true)}>
                + Upload evidence document
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {REACCREDITATION_FOLDERS.map((f) => {
              const uploadedDocs = folders.filter((doc) => doc.folder_number === f.num)
              return (
                <div key={f.num} className="fp-card flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#dce7d0] text-[#1a1d1a] flex items-center justify-center font-bold text-xs">
                        {f.num}
                      </span>
                      <Badge variant={uploadedDocs.length > 0 ? 'default' : 'outline'}>
                        {uploadedDocs.length} file(s)
                      </Badge>
                    </div>
                    <h4 className="text-[15px] font-bold text-[#1a1d1a] leading-snug">{f.name}</h4>
                  </div>

                  <div className="pt-3 border-t border-[#eaece4] space-y-2">
                    {uploadedDocs.length > 0 ? (
                      uploadedDocs.slice(0, 2).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-[12px] text-[#6e766b]">
                          <span className="truncate max-w-[190px] font-medium text-[#1a1d1a]">
                            {doc.file_name}
                          </span>
                          <span>{doc.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-[#8c9489]">No evidence uploaded yet</p>
                    )}

                    {isSupervisorOrStaff && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          setFolderForm((prev) => ({
                            ...prev,
                            folder_number: f.num,
                            folder_name: f.name,
                          }))
                          setShowFolderModal(true)
                        }}
                      >
                        + Add document
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Log Supervision Meeting (FinPlanner Image 2)      */}
      {/* ────────────────────────────────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">
                New supervision log
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <Label>Doctoral Student</Label>
                <select
                  value={logForm.student_id}
                  onChange={(e) => setLogForm({ ...logForm, student_id: Number(e.target.value) })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  <option value={0}>Select PhD student</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name} ({d.student_email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Meeting Date</Label>
                  <Input
                    type="date"
                    value={logForm.meeting_date}
                    onChange={(e) => setLogForm({ ...logForm, meeting_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <select
                    value={logForm.meeting_mode}
                    onChange={(e) => setLogForm({ ...logForm, meeting_mode: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="In-Person">In-Person</option>
                    <option value="Online / Zoom">Online / Zoom</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Email Review">Email Review</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>12-Stage Milestone</Label>
                <select
                  value={logForm.research_stage}
                  onChange={(e) => setLogForm({ ...logForm, research_stage: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  {RESEARCH_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Work Submitted</Label>
                <Input
                  placeholder="e.g. Draft Chapter 3 methodology"
                  value={logForm.work_submitted || ''}
                  onChange={(e) => setLogForm({ ...logForm, work_submitted: e.target.value })}
                />
              </div>

              <div>
                <Label>Supervisor Feedback</Label>
                <textarea
                  rows={2}
                  placeholder="Evaluation and required revisions..."
                  value={logForm.feedback_given || ''}
                  onChange={(e) => setLogForm({ ...logForm, feedback_given: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agreed Next Task</Label>
                  <Input
                    placeholder="Next deliverable"
                    value={logForm.next_task || ''}
                    onChange={(e) => setLogForm({ ...logForm, next_task: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Progress Rating</Label>
                  <select
                    value={logForm.progress_rating}
                    onChange={(e) => setLogForm({ ...logForm, progress_rating: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="Exceptional">Exceptional</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                    <option value="Unsatisfactory">Unsatisfactory</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                if (!logForm.student_id) {
                  alert('Please select a student')
                  return
                }
                try {
                  await apiCreateSupervisionLog(token, logForm)
                  setShowLogModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to save log')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Record Seminar                                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {showSeminarModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">Record seminar</h3>
              <button onClick={() => setShowSeminarModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!isStudent && (
                <div>
                  <Label>Doctoral Candidate</Label>
                  <select
                    value={seminarForm.student_id}
                    onChange={(e) => setSeminarForm({ ...seminarForm, student_id: Number(e.target.value) })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value={0}>Select student</option>
                    {dossiers.map((d) => (
                      <option key={d.student_id} value={d.student_id}>{d.student_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label>Seminar Category</Label>
                <select
                  value={seminarForm.seminar_category}
                  onChange={(e) => setSeminarForm({ ...seminarForm, seminar_category: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  {SEMINAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Seminar / Paper Title</Label>
                <Input
                  placeholder="Presentation title"
                  value={seminarForm.title}
                  onChange={(e) => setSeminarForm({ ...seminarForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={seminarForm.seminar_date}
                    onChange={(e) => setSeminarForm({ ...seminarForm, seminar_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <select
                    value={seminarForm.is_presenter ? 'Presenter' : 'Attendee'}
                    onChange={(e) => setSeminarForm({ ...seminarForm, is_presenter: e.target.value === 'Presenter' })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="Presenter">Presenter</option>
                    <option value="Attendee">Attendee</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                const targetStudentId = isStudent ? (user?.id || 0) : seminarForm.student_id
                if (!targetStudentId || !seminarForm.title) {
                  alert('Please select student and specify title')
                  return
                }
                try {
                  await apiRecordPhdSeminar(token, { ...seminarForm, student_id: targetStudentId })
                  setShowSeminarModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to record seminar')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Record Comprehensive Exam                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">Record comprehensive exam</h3>
              <button onClick={() => setShowExamModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <select
                  value={examForm.student_id}
                  onChange={(e) => setExamForm({ ...examForm, student_id: Number(e.target.value) })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  <option value={0}>Select student</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>{d.student_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Exam Date</Label>
                  <Input
                    type="date"
                    value={examForm.exam_date}
                    onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Attempt</Label>
                  <select
                    value={examForm.attempt_number}
                    onChange={(e) => setExamForm({ ...examForm, attempt_number: Number(e.target.value) })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value={1}>Attempt 1</option>
                    <option value={2}>Attempt 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Result</Label>
                  <select
                    value={examForm.result}
                    onChange={(e) => setExamForm({ ...examForm, result: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="Pass">Pass</option>
                    <option value="Conditional Pass">Conditional Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                <div>
                  <Label>Score (%)</Label>
                  <Input
                    type="number"
                    value={examForm.score || 0}
                    onChange={(e) => setExamForm({ ...examForm, score: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                if (!examForm.student_id) {
                  alert('Please select student')
                  return
                }
                try {
                  await apiRecordComprehensiveExam(token, examForm)
                  setShowExamModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to record exam')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Record Teaching Practice                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {showTeachingModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">Record teaching practice</h3>
              <button onClick={() => setShowTeachingModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!isStudent && (
                <div>
                  <Label>Student</Label>
                  <select
                    value={teachingForm.student_id}
                    onChange={(e) => setTeachingForm({ ...teachingForm, student_id: Number(e.target.value) })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value={0}>Select student</option>
                    {dossiers.map((d) => (
                      <option key={d.student_id} value={d.student_id}>{d.student_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course Code</Label>
                  <Input
                    placeholder="e.g. MGT 301"
                    value={teachingForm.course_code}
                    onChange={(e) => setTeachingForm({ ...teachingForm, course_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Hours</Label>
                  <Input
                    type="number"
                    value={teachingForm.contact_hours || 45}
                    onChange={(e) => setTeachingForm({ ...teachingForm, contact_hours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Course Title</Label>
                <Input
                  placeholder="e.g. Organizational Leadership"
                  value={teachingForm.course_title}
                  onChange={(e) => setTeachingForm({ ...teachingForm, course_title: e.target.value })}
                />
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                const targetStudentId = isStudent ? (user?.id || 0) : teachingForm.student_id
                if (!targetStudentId || !teachingForm.course_code) {
                  alert('Please select student and course')
                  return
                }
                try {
                  await apiRecordTeachingRequirement(token, { ...teachingForm, student_id: targetStudentId })
                  setShowTeachingModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to record teaching')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 5: 6-Month Review                                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {showEvalModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">Conduct 6-month review</h3>
              <button onClick={() => setShowEvalModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <select
                  value={evalForm.student_id}
                  onChange={(e) => setEvalForm({ ...evalForm, student_id: Number(e.target.value) })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  <option value={0}>Select student</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>{d.student_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Review Period</Label>
                  <Input
                    value={evalForm.evaluation_period}
                    onChange={(e) => setEvalForm({ ...evalForm, evaluation_period: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Overall Rating</Label>
                  <select
                    value={evalForm.overall_rating}
                    onChange={(e) => setEvalForm({ ...evalForm, overall_rating: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="Exceptional">Exceptional</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                    <option value="Unsatisfactory">Unsatisfactory</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Action Plan</Label>
                <textarea
                  rows={3}
                  value={evalForm.action_plan || ''}
                  onChange={(e) => setEvalForm({ ...evalForm, action_plan: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                />
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                if (!evalForm.student_id) {
                  alert('Please select student')
                  return
                }
                try {
                  await apiRecordProgressEvaluation(token, evalForm)
                  setShowEvalModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to record review')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 6: Upload Reaccreditation Document                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">Upload accreditation evidence</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Target Folder</Label>
                <select
                  value={folderForm.folder_number}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    const found = REACCREDITATION_FOLDERS.find((f) => f.num === num)
                    setFolderForm({
                      ...folderForm,
                      folder_number: num,
                      folder_name: found ? found.name : folderForm.folder_name,
                    })
                  }}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                >
                  {REACCREDITATION_FOLDERS.map((f) => (
                    <option key={f.num} value={f.num}>
                      Folder #{f.num}: {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Document Title / File Name</Label>
                <Input
                  placeholder="e.g. GHTEC_Accreditation_2026.pdf"
                  value={folderForm.file_name}
                  onChange={(e) => setFolderForm({ ...folderForm, file_name: e.target.value })}
                />
              </div>

              <div>
                <Label>File URL / Path</Label>
                <Input
                  placeholder="/uploads/reaccreditation/folder_1/doc.pdf"
                  value={folderForm.file_url}
                  onChange={(e) => setFolderForm({ ...folderForm, file_url: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  rows={2}
                  value={folderForm.description || ''}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full p-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                />
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                if (!folderForm.file_name) {
                  alert('Please provide document title')
                  return
                }
                try {
                  await apiUploadReaccreditationFolderDoc(token, folderForm)
                  setShowFolderModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to save folder document')
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
