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
  Mail,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  X,
  GraduationCap,
  CheckCircle2,
  Lock,
  ShieldCheck,
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
  apiGetPhdCoursework,
  apiRecordPhdCoursework,
  apiGetPhdProgression,
  apiUpdatePhdProgression,
  apiGetPhdFaculty,
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
  ApiPhDCourseworkRecord,
  ApiPhDCourseworkRecordCreate,
  ApiPhDProgressionPipeline,
  ApiPhDFacultyOption,
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
  const isSupervisorOrStaff = !isStudent

  const [activeSubTab, setActiveSubTab] = useState<
    'dossiers' | 'coursework' | 'progression' | 'seminars' | 'viva' | 'supervision' | 'calendar' | 'teaching' | 'reviews' | 'folders'
  >('dossiers')

  const [calendarDate, setCalendarDate] = useState(() => new Date())

  const [dossiers, setDossiers] = useState<ApiPhDStudentDossier[]>([])
  const [courseworkList, setCourseworkList] = useState<ApiPhDCourseworkRecord[]>([])
  const [progressions, setProgressions] = useState<ApiPhDProgressionPipeline[]>([])
  const [facultyOptions, setFacultyOptions] = useState<ApiPhDFacultyOption[]>([])
  const [supervisionLogs, setSupervisionLogs] = useState<ApiPhDSupervisionLog[]>([])
  const [seminars, setSeminars] = useState<ApiPhDSeminar[]>([])
  const [exams, setExams] = useState<ApiPhDComprehensiveExam[]>([])
  const [teachingList, setTeachingList] = useState<ApiPhDTeachingRequirement[]>([])
  const [evaluations, setEvaluations] = useState<ApiPhDProgressEvaluation[]>([])
  const [folders, setFolders] = useState<ApiPhDReaccreditationFolder[]>([])

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined)
  const [actionBanner, setActionBanner] = useState<{ text: string; isError?: boolean } | null>(null)

  // Dialog states
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showSeminarModal, setShowSeminarModal] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [showTeachingModal, setShowTeachingModal] = useState(false)
  const [showEvalModal, setShowEvalModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)

  // Stage 1: Coursework Form
  const [courseForm, setCourseForm] = useState<ApiPhDCourseworkRecordCreate>({
    student_id: 0,
    advisor_id: undefined,
    advisor_name: '',
    course_code: 'PHD 701',
    course_title: 'Advanced Quantitative & Qualitative Research Methods',
    academic_year: '2025/2026',
    semester: 'Semester 1',
    credit_hours: 3,
    assignment_score: 34,
    coursework_score: 17,
    exam_score: 34,
    advisor_cleared: false,
    remarks: 'Completed doctoral coursework module & assignments',
  })

  // Stage 2 & 3: Progression Gate Forms (Advisor -> Assessor -> Comp Exam -> Supervisor)
  const [gateStudentId, setGateStudentId] = useState<number>(0)
  const [advisorNameInput, setAdvisorNameInput] = useState('')
  const [assessorIdInput, setAssessorIdInput] = useState<number | undefined>(undefined)
  const [assessorNameInput, setAssessorNameInput] = useState('')
  const [compScoreInput, setCompScoreInput] = useState<number>(78)
  const [compResultInput, setCompResultInput] = useState<string>('Pass')
  const [compRemarksInput, setCompRemarksInput] = useState('')
  const [supervisorIdInput, setSupervisorIdInput] = useState<number | undefined>(undefined)
  const [supervisorNameInput, setSupervisorNameInput] = useState('')
  const [coSupervisorNameInput, setCoSupervisorNameInput] = useState('')

  // Stage 5 & 6: Pre-Viva, External Viva & Defense Marks Forms
  const [vivaStudentId, setVivaStudentId] = useState<number>(0)
  const [previvaExaminerId, setPrevivaExaminerId] = useState<number | undefined>(undefined)
  const [previvaExaminerName, setPrevivaExaminerName] = useState('')
  const [previvaScore, setPrevivaScore] = useState<number>(80)
  const [previvaStatus, setPrevivaStatus] = useState<string>('Cleared for External Viva')
  const [previvaRemarks, setPrevivaRemarks] = useState('')

  const [extExaminerId, setExtExaminerId] = useState<number | undefined>(undefined)
  const [extExaminerName, setExtExaminerName] = useState('')
  const [extExaminerInst, setExtExaminerInst] = useState('University of Ghana / External University')
  const [vivaDate, setVivaDate] = useState(new Date().toISOString().split('T')[0])
  const [internalMark, setInternalMark] = useState<number>(82)
  const [externalMark, setExternalMark] = useState<number>(80)
  const [oralVivaMark, setOralVivaMark] = useState<number>(84)
  const [vivaVerdict, setVivaVerdict] = useState<string>('Pass with Minor Corrections')
  const [defenseRemarks, setDefenseRemarks] = useState('')

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
    is_presenter: true,
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
    score: 78,
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
      const [dossierRes, cwRes, progRes, facRes, logsRes, semRes, examRes, teachRes, evalRes, foldRes] = await Promise.all([
        apiGetPhdDossiers(token).catch(() => []),
        apiGetPhdCoursework(token, targetStudentId).catch(() => []),
        apiGetPhdProgression(token, targetStudentId).catch(() => []),
        apiGetPhdFaculty(token).catch(() => []),
        apiGetSupervisionLogs(token, targetStudentId).catch(() => []),
        apiGetPhdSeminars(token, targetStudentId).catch(() => []),
        apiGetComprehensiveExams(token, targetStudentId).catch(() => []),
        apiGetTeachingRequirements(token, targetStudentId).catch(() => []),
        apiGetProgressEvaluations(token, targetStudentId).catch(() => []),
        apiGetReaccreditationFolders(token).catch(() => []),
      ])
      setDossiers(dossierRes)
      setCourseworkList(cwRes)
      setProgressions(progRes)
      setFacultyOptions(facRes)
      setSupervisionLogs(logsRes)
      setSeminars(semRes)
      setExams(examRes)
      setTeachingList(teachRes)
      setEvaluations(evalRes)
      setFolders(foldRes)

      if (dossierRes.length > 0) {
        const firstId = targetStudentId || dossierRes[0].student_id
        setGateStudentId((prev) => prev || firstId)
        setVivaStudentId((prev) => prev || firstId)
        setCourseForm((prev) => ({ ...prev, student_id: prev.student_id || firstId }))
      }
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
      setGateStudentId(user.id)
      setVivaStudentId(user.id)
      setCourseForm((f) => ({ ...f, student_id: user.id }))
      setLogForm((f) => ({ ...f, student_id: user.id }))
      setSeminarForm((f) => ({ ...f, student_id: user.id }))
      setTeachingForm((f) => ({ ...f, student_id: user.id }))
      setExamForm((f) => ({ ...f, student_id: user.id }))
      setEvalForm((f) => ({ ...f, student_id: user.id }))
    }
  }, [isStudent, user?.id])

  useEffect(() => {
    void loadAll()
  }, [token, selectedStudentId, isStudent, user?.id])

  // Sync selected progression student fields into form controls
  const activeGatePipe = useMemo(
    () => progressions.find((p) => p.student_id === gateStudentId) || progressions[0] || null,
    [progressions, gateStudentId]
  )

  useEffect(() => {
    if (activeGatePipe) {
      setAdvisorNameInput(activeGatePipe.advisor_name || '')
      setAssessorNameInput(activeGatePipe.assessor_name || '')
      setCompScoreInput(activeGatePipe.comp_exam_score ?? 78)
      setCompResultInput(activeGatePipe.comp_exam_status === 'Fail' ? 'Fail' : 'Pass')
      setCompRemarksInput(activeGatePipe.comp_exam_remarks || '')
      setSupervisorNameInput(activeGatePipe.supervisor_name || '')
      setCoSupervisorNameInput(activeGatePipe.co_supervisor_name || '')
    }
  }, [activeGatePipe?.student_id, activeGatePipe?.updated_at])

  const activeVivaPipe = useMemo(
    () => progressions.find((p) => p.student_id === vivaStudentId) || progressions[0] || null,
    [progressions, vivaStudentId]
  )

  useEffect(() => {
    if (activeVivaPipe) {
      setPrevivaExaminerName(activeVivaPipe.previva_examiner_name || '')
      setPrevivaScore(activeVivaPipe.previva_score ?? 80)
      setPrevivaStatus(
        activeVivaPipe.previva_status && activeVivaPipe.previva_status !== 'Pending'
          ? activeVivaPipe.previva_status
          : 'Cleared for External Viva'
      )
      setPrevivaRemarks(activeVivaPipe.previva_remarks || '')
      setExtExaminerName(activeVivaPipe.external_examiner_name || '')
      setExtExaminerInst(activeVivaPipe.external_examiner_institution || 'University of Ghana / External University')
      setInternalMark(activeVivaPipe.internal_examiner_mark ?? 82)
      setExternalMark(activeVivaPipe.external_examiner_mark ?? 80)
      setOralVivaMark(activeVivaPipe.oral_defense_viva_mark ?? 84)
      setVivaVerdict(
        activeVivaPipe.viva_verdict && activeVivaPipe.viva_verdict !== 'Pending'
          ? activeVivaPipe.viva_verdict
          : 'Pass with Minor Corrections'
      )
      setDefenseRemarks(activeVivaPipe.defense_remarks || '')
    }
  }, [activeVivaPipe?.student_id, activeVivaPipe?.updated_at])

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

  const internalFacultyOptions = useMemo(
    () => facultyOptions.filter((f) => f.role !== 'external_examiner'),
    [facultyOptions]
  )
  const externalExaminerOptions = useMemo(
    () => {
      const ext = facultyOptions.filter((f) => f.role === 'external_examiner')
      return ext.length > 0 ? ext : facultyOptions
    },
    [facultyOptions]
  )

  // Calendar Grid generator
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

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      cells.push({ day: d, isCurrentMonth: false, dateStr: '', events: [] })
    }

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

      if (supervisionLogs.length === 0 && seminars.length === 0) {
        if (d === 4) dayEvents.push({ label: '-60d Alert', isPositive: false })
        if (d === 7) {
          dayEvents.push({ label: '+Colloquium', isPositive: true })
          dayEvents.push({ label: '+Pre-Viva', isPositive: true })
        }
        if (d === 10) dayEvents.push({ label: '+Supervision', isPositive: true })
        if (d === 15) {
          dayEvents.push({ label: '+Seminar', isPositive: true })
          dayEvents.push({ label: '-SLA Due', isPositive: false })
        }
        if (d === 21) dayEvents.push({ label: '+Comp. Exam', isPositive: true })
        if (d === 27) dayEvents.push({ label: '+Viva Voce', isPositive: true })
      }

      cells.push({ day: d, isCurrentMonth: true, dateStr, events: dayEvents })
    }

    const remaining = (35 - cells.length + 7) % 7
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false, dateStr: '', events: [] })
    }

    return cells
  }, [calendarDate, supervisionLogs, seminars])

  return (
    <div className="space-y-8">
      {/* ── PAGE TITLE & SUB-NAVIGATION PILLS ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
              {activeSubTab === 'calendar' ? 'Calendar' : isStudent ? 'My Doctoral Dossier & Pipeline' : 'PhD Hub & 6-Stage Doctoral Pipeline'}
            </h1>
            <p className="text-[13px] text-[#6e766b] mt-1">
              1. Coursework & Advisor → 2. Assign Assessor → 3. Pass Comp. Exam → Assign Supervisor → 4. Seminars → 5. Pre-Viva Examiner → 6. External Examiner Viva & Defense Marks
            </p>
          </div>

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

        {/* Sub-Navigation Pills in Exact 6-Stage Progression Order */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'dossiers', label: isStudent ? 'My Dossier & Pipeline' : '1. Dossiers & Pipeline', icon: UserCheck },
            { key: 'coursework', label: '2. Coursework, Grades & Advisor', icon: GraduationCap },
            { key: 'progression', label: '3. Assessor, Comp. Exam & Supervisor Gate', icon: Award },
            { key: 'seminars', label: '4. Seminars', icon: BookOpen },
            { key: 'viva', label: '5. Pre-Viva, External Viva & Defense Marks', icon: ShieldCheck },
            { key: 'supervision', label: '6. Supervision Logs (12 Stages)', icon: Clock },
            { key: 'teaching', label: 'Teaching Practice', icon: FileCheck },
            { key: 'reviews', label: '6-Month Reviews', icon: Clock },
            { key: 'calendar', label: 'Calendar', icon: Calendar },
            { key: 'folders', label: '18 Accreditation Folders', icon: FolderOpen },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActionBanner(null)
                  setActiveSubTab(tab.key as any)
                }}
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

      {actionBanner && (
        <div
          className={`p-4 rounded-xl text-[13px] font-medium flex items-center justify-between border ${
            actionBanner.isError
              ? 'bg-[#fdf2f0] border-[#f5d0ca] text-[#c93b2b]'
              : 'bg-[#dce7d0] border-[#c5d4b2] text-[#1a1d1a]'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button onClick={() => setActionBanner(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: PhD Student Dossiers & Visual 6-Stage Progression Pipeline   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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
              <p className="text-[12px] text-[#8c9489] mt-1">tracked from coursework to viva voce</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Candidacy Achieved (Comp. Exam Pass)</span>
                <Award className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[#1a1d1a]">
                  {isStudent ? (dossiers[0]?.candidacy_status || 'Pre-Candidacy') : candidacyCount}
                </span>
                <ArrowUpRight className="size-5 text-[#3b7a57]" />
              </div>
              <p className="text-[12px] text-[#8c9489] mt-1">passed assessor comprehensive exam → unlocked supervisor</p>
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
              <p className="text-[12px] text-[#8c9489] mt-1">monthly supervision meeting SLA</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {isSupervisorOrStaff && (
                <>
                  <Button onClick={() => setShowCourseModal(true)}>
                    + Add Course & Grade
                  </Button>
                  <Button variant="outline" onClick={() => setActiveSubTab('progression')}>
                    Assign Assessor / Supervisor Gate →
                  </Button>
                  <Button variant="outline" onClick={() => setActiveSubTab('viva')}>
                    Pre-Viva & External Viva Marks →
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowSeminarModal(true)}>
                + Record Seminar
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

          {/* Candidate Dossier Cards with 6-Stage Pipeline Tracker */}
          <div className="space-y-4">
            {filteredDossiers.map((student) => {
              const initial = (student.student_name || 'S').trim().charAt(0).toUpperCase()
              const compPassed = student.candidacy_status === 'PhD Candidate' || student.comprehensive_result === 'Pass'
              const previvaCleared = student.previva_status === 'Cleared for External Viva'

              return (
                <div
                  key={student.student_id}
                  className="fp-card space-y-4"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Left: Avatar + Name */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                      <div className="fp-avatar">
                        {initial}
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-[#1a1d1a] leading-snug">
                          {student.student_name}
                        </div>
                        <div className="text-[12px] text-[#6e766b]">
                          {student.student_email} · {student.specialization}
                        </div>
                      </div>
                    </div>

                    {/* Middle Summary Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={compPassed ? 'default' : 'secondary'}>
                        {student.candidacy_status} ({student.comprehensive_result})
                      </Badge>
                      <Badge variant="outline">
                        Courses: {student.courses_count || 0} (CGPA: {student.cgpa ? student.cgpa.toFixed(2) : 'N/A'})
                      </Badge>
                      <Badge variant="outline">
                        Seminars: {(student.seminars_presented_count || 0) + (student.seminars_attended_count || 0)}
                      </Badge>
                      {student.final_defense_mark != null && (
                        <Badge variant="default">
                          Viva Defense: {student.final_defense_mark}% ({student.viva_verdict})
                        </Badge>
                      )}
                    </div>

                    {/* Right Quick Stage Action Buttons */}
                    {isSupervisorOrStaff && (
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGateStudentId(student.student_id)
                            setActiveSubTab('progression')
                          }}
                        >
                          Assessor & Supervisor Gate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVivaStudentId(student.student_id)
                            setActiveSubTab('viva')
                          }}
                        >
                          Pre-Viva & Viva Marks
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 6-Stage Sequential Doctoral Progression Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-3 border-t border-[#eaece4]">
                    {/* Stage 1: Coursework & Advisor */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>1. Coursework & Advisor</span>
                        {student.advisor_work_completed ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate">
                        Advisor: {student.advisor_name || 'Pending'}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        {student.courses_count || 0} course(s) · {student.advisor_work_completed ? 'Cleared for Assessor' : 'In Progress'}
                      </div>
                    </div>

                    {/* Stage 2: Assign Assessor */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>2. Comp. Exam Assessor</span>
                        {student.assessor_name ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : !student.advisor_work_completed ? (
                          <Lock className="size-3.5 text-[#8c9489]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate">
                        {student.assessor_name || (student.advisor_work_completed ? 'Ready to Assign' : 'Locked (Finish Advisor Work)')}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        Comprehensive Exam Assessor
                      </div>
                    </div>

                    {/* Stage 3: Pass Comp Exam -> Assign Supervisor */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>3. Comp. Exam → Supervisor</span>
                        {student.supervisor_name ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : !compPassed ? (
                          <Lock className="size-3.5 text-[#8c9489]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate">
                        {student.supervisor_name || (compPassed ? 'Comp. Passed — Assign Now' : 'Locked (Pass Comp. Exam)')}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        Exam: {student.comprehensive_result} {student.comp_exam_score != null ? `(${student.comp_exam_score}%)` : ''}
                      </div>
                    </div>

                    {/* Stage 4: Seminars & Supervision */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>4. Seminars & Research</span>
                        {student.seminars_presented_count > 0 ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate" title={student.research_stage}>
                        {student.research_stage}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        {student.seminars_presented_count} presented · {student.seminars_attended_count} attended
                      </div>
                    </div>

                    {/* Stage 5: Pre-Viva Examiner */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>5. Pre-Viva Assessment</span>
                        {previvaCleared ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate">
                        {student.previva_examiner_name || 'Not Assigned'}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        {student.previva_status || 'Pending'} {student.previva_score != null ? `(${student.previva_score}%)` : ''}
                      </div>
                    </div>

                    {/* Stage 6: External Examiner Viva & Defense Marks */}
                    <div className="p-3 rounded-xl border border-[#eaece4] bg-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#5a6552]">
                        <span>6. External Viva & Marks</span>
                        {student.final_defense_mark != null ? (
                          <CheckCircle2 className="size-3.5 text-[#3b7a57]" />
                        ) : !previvaCleared ? (
                          <Lock className="size-3.5 text-[#8c9489]" />
                        ) : (
                          <Clock className="size-3.5 text-[#8c9489]" />
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#1a1d1a] truncate">
                        {student.external_examiner_name || (previvaCleared ? 'Ready for External Viva' : 'Locked (Pass Pre-Viva)')}
                      </div>
                      <div className="text-[11px] text-[#6e766b]">
                        {student.final_defense_mark != null
                          ? `Defense Mark: ${student.final_defense_mark}% (${student.viva_verdict})`
                          : student.viva_verdict || 'Pending'}
                      </div>
                    </div>
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: STAGE 1 — ENROLLMENT, COURSEWORK, ASSIGNMENTS, EXAMS & GRADES */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'coursework' && (
        <div className="space-y-6">
          <div className="fp-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                Stage 1: Doctoral Coursework, Assignments, Exams & Grades (Advisor Phase)
              </h3>
              <p className="text-[13px] text-[#6e766b] mt-1">
                Track all courses a PhD student takes upon enrollment—including assignment marks (/40), coursework (/20), exam score (/40), automatic grade & GPA calculation, and Academic Advisor clearance.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button onClick={() => setShowCourseModal(true)}>
                + Add Course, Marks & Grade
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>PhD Student</th>
                  <th>Course Code & Title</th>
                  <th>Year / Semester</th>
                  <th>Assignments (/40)</th>
                  <th>Coursework (/20)</th>
                  <th>Exam (/40)</th>
                  <th>Total & Grade</th>
                  <th>Academic Advisor</th>
                  <th>Advisor Status</th>
                </tr>
              </thead>
              <tbody>
                {courseworkList.map((cw) => (
                  <tr key={cw.id}>
                    <td className="font-medium">{cw.student_name || `ID #${cw.student_id}`}</td>
                    <td>
                      <div className="font-bold text-[#1a1d1a]">{cw.course_code}</div>
                      <div className="text-[12px] text-[#6e766b]">{cw.course_title} ({cw.credit_hours} cr)</div>
                    </td>
                    <td>{cw.academic_year} · {cw.semester}</td>
                    <td className="font-semibold">{cw.assignment_score} / 40</td>
                    <td className="font-semibold">{cw.coursework_score} / 20</td>
                    <td className="font-semibold">{cw.exam_score} / 40</td>
                    <td>
                      <span className="font-bold text-[#3b7a57]">
                        {cw.total_score}% ({cw.letter_grade} · {cw.grade_point.toFixed(1)} GP)
                      </span>
                    </td>
                    <td>{cw.advisor_name || 'Assigned Advisor'}</td>
                    <td>
                      <Badge variant={cw.advisor_cleared ? 'default' : 'secondary'}>
                        {cw.advisor_cleared ? 'Advisor Cleared' : 'Course Logged'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {courseworkList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#6e766b]">
                      No doctoral coursework, assignment, or exam grade records logged yet. Click <strong>+ Add Course, Marks & Grade</strong> to enroll courses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: STAGES 2 & 3 — ASSESSOR, COMP EXAM & SUPERVISOR ALLOCATION    */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'progression' && (
        <div className="space-y-6">
          <div className="fp-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                Stages 2 & 3: Advisor Completion → Assign Assessor → Pass Comp. Exam → Assign Supervisor
              </h3>
              <p className="text-[13px] text-[#6e766b] mt-1">
                Strict academic gatekeeper: 1) Complete coursework with Academic Advisor → 2) Assign Comprehensive Exam Assessor → 3) Pass Comprehensive Exam → 4) Assign Dissertation Supervisor.
              </p>
            </div>

            {!isStudent && dossiers.length > 0 && (
              <div className="w-full sm:w-72">
                <Label>Select PhD Candidate</Label>
                <select
                  value={gateStudentId}
                  onChange={(e) => setGateStudentId(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] font-semibold text-[#1a1d1a]"
                >
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name} ({d.candidacy_status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeGatePipe ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* STEP 1: Advisor Coursework Completion Clearance */}
              <div className="fp-card flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552]">
                      Gate 1 · Academic Advisor
                    </span>
                    <Badge variant={activeGatePipe.advisor_work_completed ? 'default' : 'secondary'}>
                      {activeGatePipe.advisor_work_completed ? '✓ Advisor Cleared' : 'In Progress'}
                    </Badge>
                  </div>
                  <h4 className="text-[17px] font-bold text-[#1a1d1a]">
                    Complete Work with Academic Advisor
                  </h4>
                  <p className="text-[12.5px] text-[#6e766b]">
                    Courses Logged: <strong>{activeGatePipe.courses_count}</strong> · Cumulative GPA: <strong>{activeGatePipe.cgpa.toFixed(2)}</strong>
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#eaece4]">
                  <div>
                    <Label>Academic Advisor</Label>
                    <select
                      disabled={isStudent}
                      value=""
                      onChange={(e) => {
                        const f = internalFacultyOptions.find((x) => String(x.id) === e.target.value)
                        if (f) setAdvisorNameInput(f.name)
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                    >
                      <option value="">Choose from GIMPA Faculty...</option>
                      {internalFacultyOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.department || f.role})
                        </option>
                      ))}
                    </select>
                    <Input
                      disabled={isStudent}
                      value={advisorNameInput}
                      onChange={(e) => setAdvisorNameInput(e.target.value)}
                      placeholder="Academic Advisor Name"
                    />
                  </div>

                  {isSupervisorOrStaff && (
                    <Button
                      className="w-full"
                      onClick={async () => {
                        try {
                          await apiUpdatePhdProgression(token, {
                            student_id: activeGatePipe.student_id,
                            action: 'advisor_clearance',
                            advisor_name: advisorNameInput || user?.name || 'Academic Advisor',
                            advisor_work_completed: true,
                          })
                          setActionBanner({
                            text: `✓ Academic Advisor work certified complete for ${activeGatePipe.student_name}. Gate 2 (Assign Assessor) is now unlocked!`,
                          })
                          await loadAll()
                        } catch (err: any) {
                          setActionBanner({ text: err?.message || 'Failed to update advisor clearance.', isError: true })
                        }
                      }}
                    >
                      ✓ Certify Advisor Work Complete
                    </Button>
                  )}
                </div>
              </div>

              {/* STEP 2: Assign Comprehensive Exam Assessor & Grade Exam */}
              <div className="fp-card flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552]">
                      Gate 2 · Comprehensive Exam Assessor
                    </span>
                    <Badge
                      variant={
                        activeGatePipe.comp_exam_status === 'Pass'
                          ? 'default'
                          : activeGatePipe.assessor_name
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {activeGatePipe.comp_exam_status === 'Pass'
                        ? `✓ Passed (${activeGatePipe.comp_exam_score ?? 78}%)`
                        : activeGatePipe.assessor_name
                          ? 'Assessor Assigned'
                          : 'Awaiting Gate 1'}
                    </Badge>
                  </div>
                  <h4 className="text-[17px] font-bold text-[#1a1d1a]">
                    Assign Assessor & Grade Comp. Exam
                  </h4>
                  <p className="text-[12.5px] text-[#6e766b]">
                    Assign the Assessor after Advisor clearance, then record the Assessor’s Comprehensive Exam grade.
                  </p>
                </div>

                {!activeGatePipe.advisor_work_completed ? (
                  <div className="p-4 rounded-xl bg-white border border-[#eaece4] text-[12.5px] text-[#6e766b] flex items-center gap-2.5">
                    <Lock className="size-4 text-[#c93b2b] shrink-0" />
                    <span>Locked until the student completes their coursework and work with their Academic Advisor (Gate 1).</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-[#eaece4]">
                    <div>
                      <Label>Assign Comprehensive Exam Assessor *</Label>
                      <select
                        disabled={isStudent}
                        value={assessorIdInput || ''}
                        onChange={(e) => {
                          const id = Number(e.target.value)
                          setAssessorIdInput(id || undefined)
                          const f = internalFacultyOptions.find((x) => x.id === id)
                          if (f) setAssessorNameInput(f.name)
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                      >
                        <option value="">Choose Assessor from Faculty...</option>
                        {internalFacultyOptions.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.department || f.role})
                          </option>
                        ))}
                      </select>
                      <Input
                        disabled={isStudent}
                        value={assessorNameInput}
                        onChange={(e) => setAssessorNameInput(e.target.value)}
                        placeholder="Assessor Full Name"
                      />
                    </div>

                    {isSupervisorOrStaff && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            await apiUpdatePhdProgression(token, {
                              student_id: activeGatePipe.student_id,
                              action: 'assign_assessor',
                              assessor_id: assessorIdInput,
                              assessor_name: assessorNameInput,
                            })
                            setActionBanner({
                              text: `✓ Assessor (${assessorNameInput}) assigned to ${activeGatePipe.student_name}.`,
                            })
                            await loadAll()
                          } catch (err: any) {
                            setActionBanner({ text: err?.message || 'Failed to assign assessor.', isError: true })
                          }
                        }}
                      >
                        Assign Assessor
                      </Button>
                    )}

                    {/* Grade Comprehensive Exam */}
                    <div className="pt-3 border-t border-[#eaece4] space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <Label>Comp. Exam Verdict</Label>
                          <select
                            disabled={isStudent}
                            value={compResultInput}
                            onChange={(e) => setCompResultInput(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                          >
                            <option value="Pass">Pass (Advance to Candidacy)</option>
                            <option value="Conditional Pass">Conditional Pass</option>
                            <option value="Fail">Fail (Resit Required)</option>
                          </select>
                        </div>
                        <div>
                          <Label>Assessor Score (%)</Label>
                          <Input
                            disabled={isStudent}
                            type="number"
                            min={0}
                            max={100}
                            value={compScoreInput}
                            onChange={(e) => setCompScoreInput(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {isSupervisorOrStaff && (
                        <Button
                          className="w-full"
                          onClick={async () => {
                            try {
                              await apiUpdatePhdProgression(token, {
                                student_id: activeGatePipe.student_id,
                                action: 'grade_comp_exam',
                                assessor_name: assessorNameInput || activeGatePipe.assessor_name || user?.name || 'Assigned Assessor',
                                comp_exam_status: compResultInput,
                                comp_exam_score: compScoreInput,
                                comp_exam_remarks: compRemarksInput,
                              })
                              setActionBanner({
                                text: `✓ Comprehensive Exam graded (${compResultInput} · ${compScoreInput}%). ${
                                  compResultInput === 'Pass'
                                    ? 'Gate 3 (Assign Dissertation Supervisor) is now UNLOCKED!'
                                    : ''
                                }`,
                              })
                              await loadAll()
                            } catch (err: any) {
                              setActionBanner({ text: err?.message || 'Failed to grade comprehensive exam.', isError: true })
                            }
                          }}
                        >
                          Record Assessor Comp. Exam Grade
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: Assign Dissertation Supervisor (Unlocked ONLY after Passing Comprehensive Exam) */}
              <div className="fp-card flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552]">
                      Gate 3 · Dissertation Supervisor
                    </span>
                    <Badge variant={activeGatePipe.supervisor_name ? 'default' : 'outline'}>
                      {activeGatePipe.supervisor_name ? '✓ Supervisor Assigned' : 'Awaiting Comp. Exam Pass'}
                    </Badge>
                  </div>
                  <h4 className="text-[17px] font-bold text-[#1a1d1a]">
                    Assign Dissertation Supervisor
                  </h4>
                  <p className="text-[12.5px] text-[#6e766b]">
                    Unlocked strictly after the student passes the Comprehensive Exam graded by their Assessor.
                  </p>
                </div>

                {activeGatePipe.comp_exam_status !== 'Pass' ? (
                  <div className="p-4 rounded-xl bg-white border border-[#eaece4] text-[12.5px] text-[#6e766b] flex items-center gap-2.5">
                    <Lock className="size-4 text-[#c93b2b] shrink-0" />
                    <span>
                      <strong>Locked:</strong> The student must first pass the Comprehensive Exam graded by their Assessor in Gate 2 before a Dissertation Supervisor can be assigned.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-[#eaece4]">
                    <div>
                      <Label>Lead Dissertation Supervisor *</Label>
                      <select
                        disabled={isStudent}
                        value={supervisorIdInput || ''}
                        onChange={(e) => {
                          const id = Number(e.target.value)
                          setSupervisorIdInput(id || undefined)
                          const f = internalFacultyOptions.find((x) => x.id === id)
                          if (f) setSupervisorNameInput(f.name)
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                      >
                        <option value="">Choose Lead Supervisor from Faculty...</option>
                        {internalFacultyOptions.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.specialization || f.department || f.role})
                          </option>
                        ))}
                      </select>
                      <Input
                        disabled={isStudent}
                        value={supervisorNameInput}
                        onChange={(e) => setSupervisorNameInput(e.target.value)}
                        placeholder="Lead Dissertation Supervisor Name"
                      />
                    </div>

                    <div>
                      <Label>Co-Supervisor (Optional)</Label>
                      <Input
                        disabled={isStudent}
                        value={coSupervisorNameInput}
                        onChange={(e) => setCoSupervisorNameInput(e.target.value)}
                        placeholder="Co-Supervisor Full Name"
                      />
                    </div>

                    {isSupervisorOrStaff && (
                      <Button
                        className="w-full"
                        onClick={async () => {
                          try {
                            await apiUpdatePhdProgression(token, {
                              student_id: activeGatePipe.student_id,
                              action: 'assign_supervisor',
                              supervisor_id: supervisorIdInput,
                              supervisor_name: supervisorNameInput,
                              co_supervisor_name: coSupervisorNameInput,
                            })
                            setActionBanner({
                              text: `✓ Dissertation Supervisor (${supervisorNameInput}) assigned to ${activeGatePipe.student_name}!`,
                            })
                            await loadAll()
                          } catch (err: any) {
                            setActionBanner({ text: err?.message || 'Failed to assign supervisor.', isError: true })
                          }
                        }}
                      >
                        ✓ Assign Dissertation Supervisor
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="fp-card py-10 text-center text-[#6e766b]">
              No PhD candidate selected.
            </div>
          )}

          {/* Historical Comprehensive Exam Sittings Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[16px] font-bold text-[#1a1d1a]">
              Comprehensive Examination Sittings Register
            </h4>
            <div className="overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Exam Date</th>
                    <th>Assessor Score & Verdict</th>
                    <th>PhD Student</th>
                    <th>Assessor / Committee</th>
                    <th>Attempt</th>
                    <th>Candidacy Status</th>
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
                      <td>{e.committee_members || 'Assigned Assessor'}</td>
                      <td>Attempt {e.attempt_number}</td>
                      <td>
                        <Badge variant={e.advanced_to_candidacy || e.result === 'Pass' ? 'default' : 'secondary'}>
                          {e.advanced_to_candidacy || e.result === 'Pass' ? 'PhD Candidate (Supervisor Unlocked)' : 'Pre-Candidacy'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6e766b]">
                        No comprehensive examination sittings recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: STAGE 4 — RESEARCH SEMINARS                                  */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'seminars' && (
        <div className="space-y-6">
          <div className="fp-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                Stage 4: Doctoral Seminars (Proposal, Progress, Colloquium & Pre-Viva Seminars)
              </h3>
              <p className="text-[13px] text-[#6e766b] mt-1">
                Track mandatory doctoral seminar presentations, panel verdicts, and attendance across the 7 mandated categories.
              </p>
            </div>
            {(isSupervisorOrStaff || isStudent) && (
              <Button
                onClick={() => {
                  if (isStudent && user?.id) {
                    setSeminarForm((f) => ({ ...f, student_id: user.id }))
                  }
                  setShowSeminarModal(true)
                }}
              >
                + Record Seminar Presentation / Attendance
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Verdict / Remarks</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Seminar Title</th>
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: STAGES 5 & 6 — PRE-VIVA, EXTERNAL EXAMINER VIVA & MARKS       */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'viva' && (
        <div className="space-y-6">
          <div className="fp-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                Stages 5 & 6: Pre-Viva Examiner Assignment → External Examiner Viva Dispatch & Defense Marks
              </h3>
              <p className="text-[13px] text-[#6e766b] mt-1">
                Assign the Pre-Viva Examiner and record Pre-Viva clearance first; once cleared, dispatch the Viva dissertation to the External Examiner and record official Defense Marks.
              </p>
            </div>

            {!isStudent && dossiers.length > 0 && (
              <div className="w-full sm:w-72">
                <Label>Select PhD Candidate</Label>
                <select
                  value={vivaStudentId}
                  onChange={(e) => setVivaStudentId(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] font-semibold text-[#1a1d1a]"
                >
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name} ({d.previva_status || 'Pending'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeVivaPipe ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* STAGE 5: PRE-VIVA EXAMINER ASSIGNMENT & CLEARANCE */}
              <div className="fp-card space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552]">
                      Stage 5 · Pre-Viva Assessment
                    </span>
                    <Badge
                      variant={
                        activeVivaPipe.previva_status === 'Cleared for External Viva'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {activeVivaPipe.previva_status}
                    </Badge>
                  </div>
                  <h4 className="text-[18px] font-bold text-[#1a1d1a]">
                    Assign Pre-Viva Examiner & Record Pre-Viva Clearance
                  </h4>
                  <p className="text-[12.5px] text-[#6e766b]">
                    Assign an internal Pre-Viva Examiner to evaluate the full doctoral draft and clear it for dispatch to the External Examiner.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2 border-t border-[#eaece4]">
                  <div>
                    <Label>Pre-Viva (Internal) Examiner *</Label>
                    <select
                      disabled={isStudent}
                      value={previvaExaminerId || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value)
                        setPrevivaExaminerId(id || undefined)
                        const f = internalFacultyOptions.find((x) => x.id === id)
                        if (f) setPrevivaExaminerName(f.name)
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                    >
                      <option value="">Choose Pre-Viva Examiner from Faculty...</option>
                      {internalFacultyOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.department || f.role})
                        </option>
                      ))}
                    </select>
                    <Input
                      disabled={isStudent}
                      value={previvaExaminerName}
                      onChange={(e) => setPrevivaExaminerName(e.target.value)}
                      placeholder="Pre-Viva Examiner Full Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Pre-Viva Score (%)</Label>
                      <Input
                        disabled={isStudent}
                        type="number"
                        min={0}
                        max={100}
                        value={previvaScore}
                        onChange={(e) => setPrevivaScore(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Pre-Viva Decision</Label>
                      <select
                        disabled={isStudent}
                        value={previvaStatus}
                        onChange={(e) => setPrevivaStatus(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                      >
                        <option value="Examiner Assigned">Examiner Assigned</option>
                        <option value="Cleared for External Viva">Cleared for External Viva (Unlock Stage 6)</option>
                        <option value="Revisions Required">Revisions Required</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Pre-Viva Examiner Remarks & Required Corrections</Label>
                    <textarea
                      disabled={isStudent}
                      rows={2}
                      value={previvaRemarks}
                      onChange={(e) => setPrevivaRemarks(e.target.value)}
                      placeholder="Enter Pre-Viva panel remarks..."
                      className="w-full p-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                    />
                  </div>

                  {isSupervisorOrStaff && (
                    <Button
                      className="w-full"
                      onClick={async () => {
                        try {
                          await apiUpdatePhdProgression(token, {
                            student_id: activeVivaPipe.student_id,
                            action: 'record_previva',
                            previva_examiner_id: previvaExaminerId,
                            previva_examiner_name: previvaExaminerName || user?.name || 'Internal Examiner',
                            previva_score: previvaScore,
                            previva_status: previvaStatus,
                            previva_remarks: previvaRemarks,
                          })
                          setActionBanner({
                            text: `✓ Pre-Viva Examiner & Clearance (${previvaStatus} · ${previvaScore}%) saved for ${activeVivaPipe.student_name}!`,
                          })
                          await loadAll()
                        } catch (err: any) {
                          setActionBanner({ text: err?.message || 'Failed to save Pre-Viva record.', isError: true })
                        }
                      }}
                    >
                      ✓ Save Pre-Viva Examiner & Clearance
                    </Button>
                  )}
                </div>
              </div>

              {/* STAGE 6: EXTERNAL EXAMINER VIVA DISPATCH & DEFENSE MARKS */}
              <div className="fp-card space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552]">
                      Stage 6 · External Viva & Defense Marks
                    </span>
                    <Badge
                      variant={
                        activeVivaPipe.final_defense_mark != null
                          ? 'default'
                          : activeVivaPipe.previva_status === 'Cleared for External Viva'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {activeVivaPipe.final_defense_mark != null
                        ? `Final Defense: ${activeVivaPipe.final_defense_mark}%`
                        : activeVivaPipe.viva_verdict}
                    </Badge>
                  </div>
                  <h4 className="text-[18px] font-bold text-[#1a1d1a]">
                    Dispatch Viva to External Examiner & Record Defense Marks
                  </h4>
                  <p className="text-[12.5px] text-[#6e766b]">
                    Assign the External Examiner, send the dissertation for Viva examination, and record Internal, External, and Oral Viva Defense Marks.
                  </p>
                </div>

                {activeVivaPipe.previva_status !== 'Cleared for External Viva' ? (
                  <div className="p-4 rounded-xl bg-white border border-[#eaece4] text-[12.5px] text-[#6e766b] flex items-center gap-2.5">
                    <Lock className="size-4 text-[#c93b2b] shrink-0" />
                    <span>
                      <strong>Locked:</strong> The candidate must first pass Stage 5 Pre-Viva (status: <em>Cleared for External Viva</em>) before the Viva thesis can be dispatched to the External Examiner.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-2 border-t border-[#eaece4]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Assign External Examiner *</Label>
                        <select
                          disabled={isStudent}
                          value={extExaminerId || ''}
                          onChange={(e) => {
                            const id = Number(e.target.value)
                            setExtExaminerId(id || undefined)
                            const f = externalExaminerOptions.find((x) => x.id === id)
                            if (f) setExtExaminerName(f.name)
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                        >
                          <option value="">Choose External Examiner...</option>
                          {externalExaminerOptions.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.role})
                            </option>
                          ))}
                        </select>
                        <Input
                          disabled={isStudent}
                          value={extExaminerName}
                          onChange={(e) => setExtExaminerName(e.target.value)}
                          placeholder="External Examiner Full Name"
                        />
                      </div>
                      <div>
                        <Label>External Examiner Institution & Viva Date</Label>
                        <Input
                          disabled={isStudent}
                          value={extExaminerInst}
                          onChange={(e) => setExtExaminerInst(e.target.value)}
                          placeholder="e.g. University of Ghana"
                          className="mb-2"
                        />
                        <Input
                          disabled={isStudent}
                          type="date"
                          value={vivaDate}
                          onChange={(e) => setVivaDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Itemized Defense Marks */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#eaece4] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-bold text-[#1a1d1a]">
                          Official Doctoral Defense Marks (/100)
                        </span>
                        <span className="text-[14px] font-bold text-[#3b7a57]">
                          Computed Final Mark: {((Number(internalMark || 0) + Number(externalMark || 0) + Number(oralVivaMark || 0)) / 3).toFixed(1)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <Label>Internal Examiner (/100)</Label>
                          <Input
                            disabled={isStudent}
                            type="number"
                            min={0}
                            max={100}
                            value={internalMark}
                            onChange={(e) => setInternalMark(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>External Examiner (/100)</Label>
                          <Input
                            disabled={isStudent}
                            type="number"
                            min={0}
                            max={100}
                            value={externalMark}
                            onChange={(e) => setExternalMark(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Oral Defense / Viva (/100)</Label>
                          <Input
                            disabled={isStudent}
                            type="number"
                            min={0}
                            max={100}
                            value={oralVivaMark}
                            onChange={(e) => setOralVivaMark(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Viva Voce Final Verdict</Label>
                        <select
                          disabled={isStudent}
                          value={vivaVerdict}
                          onChange={(e) => setVivaVerdict(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                        >
                          <option value="Dispatched to External Examiner">Dispatched to External Examiner (Awaiting Viva)</option>
                          <option value="Pass with Distinction">Pass with Distinction (No Corrections)</option>
                          <option value="Pass with Minor Corrections">Pass with Minor Corrections</option>
                          <option value="Pass with Major Corrections">Pass with Major Corrections</option>
                          <option value="Repeat Viva / Fail">Repeat Viva / Fail</option>
                        </select>
                      </div>
                      <div>
                        <Label>Viva Board Remarks</Label>
                        <Input
                          disabled={isStudent}
                          value={defenseRemarks}
                          onChange={(e) => setDefenseRemarks(e.target.value)}
                          placeholder="External & Viva panel summary..."
                        />
                      </div>
                    </div>

                    {isSupervisorOrStaff && (
                      <Button
                        className="w-full"
                        onClick={async () => {
                          try {
                            await apiUpdatePhdProgression(token, {
                              student_id: activeVivaPipe.student_id,
                              action: 'record_defense_marks',
                              external_examiner_id: extExaminerId,
                              external_examiner_name: extExaminerName || 'External Examiner',
                              external_examiner_institution: extExaminerInst,
                              viva_date: vivaDate,
                              internal_examiner_mark: internalMark,
                              external_examiner_mark: externalMark,
                              oral_defense_viva_mark: oralVivaMark,
                              viva_verdict: vivaVerdict,
                              defense_remarks: defenseRemarks,
                            })
                            setActionBanner({
                              text: `✓ External Examiner Viva & Official Defense Marks saved for ${activeVivaPipe.student_name}!`,
                            })
                            await loadAll()
                          } catch (err: any) {
                            setActionBanner({ text: err?.message || 'Failed to save Viva & Defense Marks.', isError: true })
                          }
                        }}
                      >
                        ✓ Dispatch to External Examiner & Save Defense Marks
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Summary Table of All Candidates' Pre-Viva, External Viva & Defense Marks */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[16px] font-bold text-[#1a1d1a]">
              Doctoral Pre-Viva, External Examiner Viva & Defense Marks Register
            </h4>
            <div className="overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>PhD Candidate</th>
                    <th>Pre-Viva Examiner</th>
                    <th>Pre-Viva Status & Score</th>
                    <th>External Examiner</th>
                    <th>Internal Mark</th>
                    <th>External Mark</th>
                    <th>Oral Viva Mark</th>
                    <th>Final Defense Mark</th>
                    <th>Viva Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {progressions.map((p) => (
                    <tr key={p.student_id}>
                      <td className="font-medium">{p.student_name}</td>
                      <td>{p.previva_examiner_name || 'Unassigned'}</td>
                      <td>
                        <Badge variant={p.previva_status === 'Cleared for External Viva' ? 'default' : 'secondary'}>
                          {p.previva_status} {p.previva_score != null ? `(${p.previva_score}%)` : ''}
                        </Badge>
                      </td>
                      <td>
                        <div>{p.external_examiner_name || 'Unassigned'}</div>
                        {p.external_examiner_institution && (
                          <div className="text-[11px] text-[#6e766b]">{p.external_examiner_institution}</div>
                        )}
                      </td>
                      <td className="font-semibold">{p.internal_examiner_mark != null ? `${p.internal_examiner_mark}%` : '-'}</td>
                      <td className="font-semibold">{p.external_examiner_mark != null ? `${p.external_examiner_mark}%` : '-'}</td>
                      <td className="font-semibold">{p.oral_defense_viva_mark != null ? `${p.oral_defense_viva_mark}%` : '-'}</td>
                      <td className="font-bold text-[#3b7a57]">
                        {p.final_defense_mark != null ? `${p.final_defense_mark}%` : '-'}
                      </td>
                      <td>
                        <Badge variant={p.final_defense_mark != null ? 'default' : 'outline'}>
                          {p.viva_verdict}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: SUPERVISION LOGS (12 DOCTORAL STAGES)                         */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 7: CALENDAR VIEW                                                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
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

          <div className="border border-[#eaece4] rounded-xl overflow-hidden bg-[#fafbf8]">
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 8: TEACHING PRACTICE REQUIREMENT                                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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
                    <td>{t.semester}</td>
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 9: SIX-MONTH PROGRESS REVIEWS                                    */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TAB 10: 18 REACCREDITATION FOLDERS                                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 0: Add Coursework, Assignments, Exam Marks & Advisor Clearance */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl border border-[#eaece4]">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">
                Add PhD Course, Assignments, Exam & Grade
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[68vh] overflow-y-auto pr-1">
              <div>
                <Label>Doctoral Student *</Label>
                <select
                  value={courseForm.student_id}
                  onChange={(e) => setCourseForm({ ...courseForm, student_id: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
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
                  <Label>Course Code *</Label>
                  <Input
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                    placeholder="e.g. PHD 701"
                  />
                </div>
                <div>
                  <Label>Credit Hours</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={courseForm.credit_hours}
                    onChange={(e) => setCourseForm({ ...courseForm, credit_hours: Number(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <div>
                <Label>Course Title *</Label>
                <Input
                  value={courseForm.course_title}
                  onChange={(e) => setCourseForm({ ...courseForm, course_title: e.target.value })}
                  placeholder="e.g. Advanced Quantitative Research Methods"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Academic Year</Label>
                  <Input
                    value={courseForm.academic_year}
                    onChange={(e) => setCourseForm({ ...courseForm, academic_year: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Semester</Label>
                  <select
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Year 2 · Semester 1">Year 2 · Semester 1</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-[#fafbf8] border border-[#eaece4]">
                <div>
                  <Label>Assignments (/40)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={courseForm.assignment_score}
                    onChange={(e) => setCourseForm({ ...courseForm, assignment_score: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Coursework (/20)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={courseForm.coursework_score}
                    onChange={(e) => setCourseForm({ ...courseForm, coursework_score: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Final Exam (/40)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={courseForm.exam_score}
                    onChange={(e) => setCourseForm({ ...courseForm, exam_score: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Academic Advisor</Label>
                <select
                  value={courseForm.advisor_id || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    const f = internalFacultyOptions.find((x) => x.id === id)
                    setCourseForm({
                      ...courseForm,
                      advisor_id: id || undefined,
                      advisor_name: f ? f.name : courseForm.advisor_name,
                    })
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] mb-2"
                >
                  <option value="">Select Academic Advisor from Faculty...</option>
                  {internalFacultyOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department || f.role})
                    </option>
                  ))}
                </select>
                <Input
                  value={courseForm.advisor_name || ''}
                  onChange={(e) => setCourseForm({ ...courseForm, advisor_name: e.target.value })}
                  placeholder="Or type Academic Advisor Name"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fafbf8] border border-[#eaece4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={courseForm.advisor_cleared}
                  onChange={(e) => setCourseForm({ ...courseForm, advisor_cleared: e.target.checked })}
                  className="h-4 w-4 rounded text-[#5a6552]"
                />
                <span className="text-[12.5px] font-semibold text-[#1a1d1a]">
                  Student has completed required coursework & Advisor work (Unlock Comprehensive Exam Assessor Assignment)
                </span>
              </label>
            </div>

            <Button
              className="w-full h-11 font-bold"
              onClick={async () => {
                if (!courseForm.student_id || !courseForm.course_code || !courseForm.course_title) {
                  alert('Please select a student and enter course code & title.')
                  return
                }
                try {
                  await apiRecordPhdCoursework(token, courseForm)
                  setShowCourseModal(false)
                  setActionBanner({
                    text: `✓ Course ${courseForm.course_code} & grade saved${
                      courseForm.advisor_cleared ? ' and Advisor Clearance unlocked Assessor assignment!' : '!'
                    }`,
                  })
                  await loadAll()
                } catch (err: any) {
                  alert(err?.message || 'Failed to save coursework record')
                }
              }}
            >
              Save Course & Grade
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Log Supervision Meeting                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Record Seminar                                              */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

              <div>
                <Label>Panel Verdict / Score</Label>
                <Input
                  placeholder="e.g. Pass / Approved with Minor Revisions"
                  value={seminarForm.score_or_verdict || ''}
                  onChange={(e) => setSeminarForm({ ...seminarForm, score_or_verdict: e.target.value })}
                />
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Record Comprehensive Exam                                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Record Teaching Practice                                    */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: 6-Month Review                                              */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: Upload Reaccreditation Document                             */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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
                  placeholder="e.g. GTEC_Accreditation_2026.pdf"
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
                  await apiUploadReaccreditationFolderDoc(token, {
                    ...folderForm,
                    file_url: folderForm.file_url || `/uploads/reaccreditation/${folderForm.file_name}`,
                  })
                  setShowFolderModal(false)
                  await loadAll()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to upload evidence')
                }
              }}
            >
              Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
