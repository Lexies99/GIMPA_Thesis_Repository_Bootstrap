import React, { useState, useEffect } from 'react'
import {
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  Award,
  FileCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  FolderOpen,
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  Filter,
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
  const isSupervisorOrStaff =
    user?.role === 'system_admin' ||
    user?.role === 'hod' ||
    user?.role === 'project_coordinator' ||
    user?.role === 'dean' ||
    user?.role === 'project_supervisor' ||
    user?.role === 'lecturer' ||
    userRoles.some((r) => ['system_admin', 'hod', 'project_coordinator', 'dean', 'project_supervisor', 'lecturer'].includes(r))

  const [activeSubTab, setActiveSubTab] = useState<
    'dossiers' | 'supervision' | 'seminars' | 'exams' | 'teaching' | 'reviews' | 'folders'
  >('dossiers')

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
      const [dossierRes, logsRes, semRes, examRes, teachRes, evalRes, foldRes] = await Promise.all([
        apiGetPhdDossiers(token).catch(() => []),
        apiGetSupervisionLogs(token, selectedStudentId).catch(() => []),
        apiGetPhdSeminars(token, selectedStudentId).catch(() => []),
        apiGetComprehensiveExams(token, selectedStudentId).catch(() => []),
        apiGetTeachingRequirements(token, selectedStudentId).catch(() => []),
        apiGetProgressEvaluations(token, selectedStudentId).catch(() => []),
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

  useEffect(() => {
    void loadAll()
  }, [token, selectedStudentId])

  // Count inactive students (>= 60 days without supervision log)
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

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* Top Banner */}
      <div
        className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e3f6d 0%, #2A528A 60%, #4338ca 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/10 text-amber-300">
                <GraduationCap className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white m-0">
                GIMPA Business School — PhD Programme Hub
              </h1>
            </div>
            <p className="text-white/80 text-xs mt-1.5 max-w-3xl leading-relaxed">
              Doctor of Philosophy in Business Administration: Coursework, 7-Type Research Seminars, Comprehensive Examination, 12-Stage Supervision Logs, Teaching Practice, 6-Month Review & 18 Reaccreditation Folders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={loadAll}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 rounded-xl px-3.5 py-2 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Summary Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
              Enrolled PhD Students
            </span>
            <span className="text-2xl font-black text-white mt-1 block">{dossiers.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
              Doctoral Candidates
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">{candidacyCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
              60-Day Inactivity Flag
            </span>
            <span
              className={`text-2xl font-black mt-1 block ${
                inactiveCount > 0 ? 'text-red-300' : 'text-emerald-300'
              }`}
            >
              {inactiveCount}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-white/70 block uppercase tracking-wider">
              Reaccreditation Folders
            </span>
            <span className="text-2xl font-black text-white mt-1 block">18 Standard</span>
          </div>
        </div>
      </div>

      {/* Inactivity Alert Callout if any */}
      {inactiveCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-800 m-0">
              Regulatory Early-Warning: {inactiveCount} PhD student(s) have no logged supervision activity in the past 60 days.
            </p>
            <p className="text-amber-700 m-0 mt-0.5">
              GIMPA accreditation guidelines mandate monthly research supervision meetings and records to avoid student stalling or abandonment.
            </p>
          </div>
        </div>
      )}

      {/* Subtab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-slate-200">
        {[
          { key: 'dossiers', label: 'PhD Student Dossiers', icon: UserCheck },
          { key: 'supervision', label: '12-Stage Supervision Logs', icon: Calendar },
          { key: 'seminars', label: '7-Type Research Seminars', icon: BookOpen },
          { key: 'exams', label: 'Comprehensive Exam & Candidacy', icon: Award },
          { key: 'teaching', label: 'Teaching Practice', icon: FileCheck },
          { key: 'reviews', label: '6-Month Progress Reviews', icon: Clock },
          { key: 'folders', label: '18 Reaccreditation Folders', icon: FolderOpen },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PhD Student Dossiers */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'dossiers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, email, specialization..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredDossiers.length} of {dossiers.length} PhD Students
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDossiers.map((student) => (
              <div
                key={student.student_id}
                className={`bg-white rounded-xl border p-4.5 space-y-3 shadow-sm transition-all hover:shadow-md relative overflow-hidden ${
                  student.inactivity_alert ? 'border-amber-400/80 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                {student.inactivity_alert && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    Inactivity &gt;60d
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0 leading-tight">
                      {student.student_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">{student.student_email}</p>
                    <p className="text-[11px] font-semibold text-blue-900 m-0 mt-0.5">
                      {student.specialization || 'PhD in Business Administration'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Candidacy Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                        student.candidacy_status === 'PhD Candidate'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {student.candidacy_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Comprehensive Exam</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                        student.comprehensive_result === 'Pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {student.comprehensive_result}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Current Stage:</span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={student.research_stage}>
                      {student.research_stage}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Seminars Attended/Presented:</span>
                    <span className="font-semibold text-slate-800">
                      {student.seminars_attended_count} / {student.seminars_presented_count}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Teaching Completed:</span>
                    <span className={`font-semibold ${student.teaching_completed ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {student.teaching_completed ? '✓ Signed Off' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Last Supervision Meeting:</span>
                    <span className={`font-bold ${student.inactivity_alert ? 'text-amber-700' : 'text-slate-700'}`}>
                      {student.last_meeting_date ? `${student.last_meeting_date} (${student.days_since_last_meeting}d ago)` : 'None Logged'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    size="sm"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg py-1.5"
                    onClick={() => {
                      setSelectedStudentId(student.student_id)
                      setLogForm((f) => ({ ...f, student_id: student.student_id }))
                      setActiveSubTab('supervision')
                    }}
                  >
                    View Supervision Logs
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredDossiers.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500">
              No PhD students found matching search.
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. Supervision Logs (12 Doctoral Stages) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'supervision' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Monthly Research Supervision Logs</h2>
              <p className="text-xs text-slate-500 m-0">
                12-stage milestone tracking, mode of meeting, supervisor feedback, next tasks, and progress ratings.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowLogModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Log Supervision Meeting
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Supervisor</th>
                    <th className="px-4 py-3 font-bold">Mode</th>
                    <th className="px-4 py-3 font-bold">Research Stage</th>
                    <th className="px-4 py-3 font-bold">Rating</th>
                    <th className="px-4 py-3 font-bold">Feedback / Next Task</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supervisionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{log.meeting_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{log.student_name || `ID #${log.student_id}`}</td>
                      <td className="px-4 py-3 text-slate-600">{log.supervisor_name || 'Assigned Supervisor'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {log.meeting_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-900 max-w-xs">{log.research_stage}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.progress_rating === 'Exceptional' || log.progress_rating === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.progress_rating}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-sm">
                        {log.feedback_given && <p className="m-0 text-[11px]"><strong className="text-slate-800">Feedback:</strong> {log.feedback_given}</p>}
                        {log.next_task && <p className="m-0 text-[11px] mt-0.5"><strong className="text-blue-800">Next Task:</strong> {log.next_task}</p>}
                      </td>
                    </tr>
                  ))}
                  {supervisionLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No supervision meeting logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. Research Seminars (7 Mandated Types) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'seminars' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">7-Type Doctoral Research Seminars</h2>
              <p className="text-xs text-slate-500 m-0">
                Departmental Colloquia, GAAS Conferences, International Peer-Reviewed Venues, and Proposal/Pre-Viva Seminars.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowSeminarModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Record Seminar Participation
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Seminar Title</th>
                    <th className="px-4 py-3 font-bold">Role</th>
                    <th className="px-4 py-3 font-bold">Verdict / Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seminars.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{s.seminar_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.student_name || `ID #${s.student_id}`}</td>
                      <td className="px-4 py-3 font-semibold text-blue-900">{s.seminar_category}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-sm">{s.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.is_presenter ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.is_presenter ? 'Presenter' : 'Attendee'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {s.score_or_verdict || 'Recorded'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {seminars.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        No seminar records added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. Comprehensive Exam & Candidacy */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Comprehensive Examination & Candidacy Milestone</h2>
              <p className="text-xs text-slate-500 m-0">
                Major Field, Research Methods, Attempt 1/2 tracking, and formal advancement to PhD Candidacy status.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowExamModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Record Comprehensive Exam
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Exam Date</th>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Exam Part</th>
                    <th className="px-4 py-3 font-bold">Attempt #</th>
                    <th className="px-4 py-3 font-bold">Score</th>
                    <th className="px-4 py-3 font-bold">Result</th>
                    <th className="px-4 py-3 font-bold">Candidacy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exams.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{e.exam_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{e.student_name || `ID #${e.student_id}`}</td>
                      <td className="px-4 py-3 font-semibold text-blue-900">{e.paper_part || 'Full Exam'}</td>
                      <td className="px-4 py-3 font-mono font-bold">Attempt {e.attempt_number}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{e.score ? `${e.score}%` : 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            e.result === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {e.result}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            e.advanced_to_candidacy || e.result === 'Pass'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {e.advanced_to_candidacy || e.result === 'Pass' ? '★ PhD Candidate' : 'Pre-Candidacy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No comprehensive examination records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. Teaching Practice Requirement */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'teaching' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Doctoral Teaching Practice Requirement</h2>
              <p className="text-xs text-slate-500 m-0">
                Minimum 45 contact hours of undergraduate teaching, tutoring, seminar facilitation and supervising faculty evaluation.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowTeachingModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Record Teaching Requirement
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Academic Year / Sem</th>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Course</th>
                    <th className="px-4 py-3 font-bold">Contact Hours</th>
                    <th className="px-4 py-3 font-bold">Faculty Rating</th>
                    <th className="px-4 py-3 font-bold">Supervising Faculty</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachingList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {t.academic_year} — {t.semester}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.student_name || `ID #${t.student_id}`}</td>
                      <td className="px-4 py-3 font-semibold text-blue-900">
                        {t.course_code}: {t.course_title}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">{t.contact_hours} hrs</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {t.evaluation_rating || 'Satisfactory'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.supervising_faculty_name || 'Course Lecturer'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.is_completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.is_completed ? '✓ Completed' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {teachingList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No teaching practice records entered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 6. Six-Month Progress Reviews */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Six-Month Student Progress Evaluations</h2>
              <p className="text-xs text-slate-500 m-0">
                Mandatory biannual review of doctoral progress across coursework, research, seminars, and teaching.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowEvalModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Conduct 6-Month Review
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Review Period</th>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Overall Rating</th>
                    <th className="px-4 py-3 font-bold">Evaluator</th>
                    <th className="px-4 py-3 font-bold">Action Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluations.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{ev.evaluation_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{ev.evaluation_period}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{ev.student_name || `ID #${ev.student_id}`}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.overall_rating === 'Exceptional' || ev.overall_rating === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ev.overall_rating}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ev.evaluator_name || 'Doctoral Committee'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-sm">{ev.action_plan || 'N/A'}</td>
                    </tr>
                  ))}
                  {evaluations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        No 6-month evaluations recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 7. 18 Reaccreditation Folders */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'folders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">18 Reaccreditation Evidence Folders</h2>
              <p className="text-xs text-slate-500 m-0">
                Official statutory repositories for GHTEC, GIMPA Academic Board, and international accreditation audits.
              </p>
            </div>
            {isSupervisorOrStaff && (
              <Button
                onClick={() => setShowFolderModal(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Evidence Document
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {REACCREDITATION_FOLDERS.map((f) => {
              const uploadedDocs = folders.filter((doc) => doc.folder_number === f.num)
              return (
                <div
                  key={f.num}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-black text-xs">
                          {f.num}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folder #{f.num}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {uploadedDocs.length} File(s)
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 m-0 leading-snug">{f.name}</h4>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    {uploadedDocs.length > 0 ? (
                      uploadedDocs.slice(0, 2).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-[11px] text-slate-600">
                          <span className="truncate max-w-[190px] font-medium" title={doc.file_name}>
                            📄 {doc.file_name}
                          </span>
                          <span className="text-slate-400 text-[10px]">{doc.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 italic m-0">No evidence uploaded yet</p>
                    )}

                    {isSupervisorOrStaff && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold py-1 rounded-lg"
                        onClick={() => {
                          setFolderForm((prev) => ({
                            ...prev,
                            folder_number: f.num,
                            folder_name: f.name,
                          }))
                          setShowFolderModal(true)
                        }}
                      >
                        + Add Document to Folder #{f.num}
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
      {/* MODAL 1: Log Supervision Meeting */}
      {/* ────────────────────────────────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-900" />
                Log PhD Research Supervision Meeting
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student</label>
                <select
                  value={logForm.student_id}
                  onChange={(e) => setLogForm({ ...logForm, student_id: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value={0}>-- Select PhD Student --</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name} ({d.student_email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meeting Date</label>
                  <input
                    type="date"
                    value={logForm.meeting_date}
                    onChange={(e) => setLogForm({ ...logForm, meeting_date: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meeting Mode</label>
                  <select
                    value={logForm.meeting_mode}
                    onChange={(e) => setLogForm({ ...logForm, meeting_mode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <option value="In-Person">In-Person (Office)</option>
                    <option value="Online / Zoom">Online / Zoom</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Email Review">Email Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">12-Stage Research Milestone</label>
                <select
                  value={logForm.research_stage}
                  onChange={(e) => setLogForm({ ...logForm, research_stage: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-medium"
                >
                  {RESEARCH_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Submitted by Student</label>
                <input
                  type="text"
                  placeholder="e.g. Draft Chapter 3 methodology and interview instrument"
                  value={logForm.work_submitted || ''}
                  onChange={(e) => setLogForm({ ...logForm, work_submitted: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Supervisor Feedback Given</label>
                <textarea
                  rows={2}
                  placeholder="Specific critical evaluation and corrections required..."
                  value={logForm.feedback_given || ''}
                  onChange={(e) => setLogForm({ ...logForm, feedback_given: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Agreed Next Task & Deadline</label>
                <input
                  type="text"
                  placeholder="e.g. Complete pilot test with 10 senior managers by Oct 15"
                  value={logForm.next_task || ''}
                  onChange={(e) => setLogForm({ ...logForm, next_task: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Progress Rating</label>
                <select
                  value={logForm.progress_rating}
                  onChange={(e) => setLogForm({ ...logForm, progress_rating: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                >
                  <option value="Exceptional">Exceptional</option>
                  <option value="Satisfactory">Satisfactory</option>
                  <option value="Needs Improvement">Needs Improvement</option>
                  <option value="Unsatisfactory">Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowLogModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
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
                Save Supervision Log
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Record Seminar */}
      {/* ────────────────────────────────────────────────────────── */}
      {showSeminarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">Record Doctoral Research Seminar</h3>
              <button onClick={() => setShowSeminarModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student</label>
                <select
                  value={seminarForm.student_id}
                  onChange={(e) => setSeminarForm({ ...seminarForm, student_id: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value={0}>-- Select Student --</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">7 Mandated Seminar Categories</label>
                <select
                  value={seminarForm.seminar_category}
                  onChange={(e) => setSeminarForm({ ...seminarForm, seminar_category: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                >
                  {SEMINAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Seminar / Paper Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mediating Effects of FinTech Innovation on Bank Performance"
                  value={seminarForm.title}
                  onChange={(e) => setSeminarForm({ ...seminarForm, title: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={seminarForm.seminar_date}
                    onChange={(e) => setSeminarForm({ ...seminarForm, seminar_date: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role</label>
                  <select
                    value={seminarForm.is_presenter ? 'Presenter' : 'Attendee'}
                    onChange={(e) => setSeminarForm({ ...seminarForm, is_presenter: e.target.value === 'Presenter' })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <option value="Presenter">Presenter</option>
                    <option value="Attendee">Attendee</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowSeminarModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                onClick={async () => {
                  if (!seminarForm.student_id || !seminarForm.title) {
                    alert('Please select student and specify title')
                    return
                  }
                  try {
                    await apiRecordPhdSeminar(token, seminarForm)
                    setShowSeminarModal(false)
                    await loadAll()
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to record seminar')
                  }
                }}
              >
                Record Seminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Record Comprehensive Exam */}
      {/* ────────────────────────────────────────────────────────── */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">Record Comprehensive Examination</h3>
              <button onClick={() => setShowExamModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student</label>
                <select
                  value={examForm.student_id}
                  onChange={(e) => setExamForm({ ...examForm, student_id: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value={0}>-- Select Student --</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={examForm.exam_date}
                    onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Attempt #</label>
                  <select
                    value={examForm.attempt_number}
                    onChange={(e) => setExamForm({ ...examForm, attempt_number: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <option value={1}>Attempt 1</option>
                    <option value={2}>Attempt 2 (Final Retake)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Result</label>
                  <select
                    value={examForm.result}
                    onChange={(e) => setExamForm({ ...examForm, result: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    <option value="Pass">Pass (Advances to PhD Candidacy)</option>
                    <option value="Conditional Pass">Conditional Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Score (%)</label>
                  <input
                    type="number"
                    value={examForm.score || 0}
                    onChange={(e) => setExamForm({ ...examForm, score: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowExamModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
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
                Record Exam & Milestone
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Record Teaching Requirement */}
      {/* ────────────────────────────────────────────────────────── */}
      {showTeachingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">Record Teaching Practice</h3>
              <button onClick={() => setShowTeachingModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student</label>
                <select
                  value={teachingForm.student_id}
                  onChange={(e) => setTeachingForm({ ...teachingForm, student_id: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value={0}>-- Select Student --</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MGT 301"
                    value={teachingForm.course_code}
                    onChange={(e) => setTeachingForm({ ...teachingForm, course_code: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Hours</label>
                  <input
                    type="number"
                    value={teachingForm.contact_hours || 45}
                    onChange={(e) => setTeachingForm({ ...teachingForm, contact_hours: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Principles of Organizational Leadership"
                  value={teachingForm.course_title}
                  onChange={(e) => setTeachingForm({ ...teachingForm, course_title: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowTeachingModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                onClick={async () => {
                  if (!teachingForm.student_id || !teachingForm.course_code) {
                    alert('Please select student and course')
                    return
                  }
                  try {
                    await apiRecordTeachingRequirement(token, teachingForm)
                    setShowTeachingModal(false)
                    await loadAll()
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to record teaching')
                  }
                }}
              >
                Sign Off Teaching
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 5: 6-Month Review */}
      {/* ────────────────────────────────────────────────────────── */}
      {showEvalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">Conduct Six-Month Progress Review</h3>
              <button onClick={() => setShowEvalModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student</label>
                <select
                  value={evalForm.student_id}
                  onChange={(e) => setEvalForm({ ...evalForm, student_id: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value={0}>-- Select Student --</option>
                  {dossiers.map((d) => (
                    <option key={d.student_id} value={d.student_id}>
                      {d.student_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Review Period</label>
                  <input
                    type="text"
                    placeholder="e.g. Semester 2, 2025/2026"
                    value={evalForm.evaluation_period}
                    onChange={(e) => setEvalForm({ ...evalForm, evaluation_period: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Overall Rating</label>
                  <select
                    value={evalForm.overall_rating}
                    onChange={(e) => setEvalForm({ ...evalForm, overall_rating: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    <option value="Exceptional">Exceptional</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                    <option value="Unsatisfactory">Unsatisfactory</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Action Plan & Recommendations</label>
                <textarea
                  rows={3}
                  value={evalForm.action_plan || ''}
                  onChange={(e) => setEvalForm({ ...evalForm, action_plan: e.target.value })}
                  placeholder="Doctoral Committee guidelines and next milestone expectations..."
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowEvalModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
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
                Submit Review Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 6: Upload Reaccreditation Document */}
      {/* ────────────────────────────────────────────────────────── */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0">Upload Reaccreditation Evidence</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target 18 Folder</label>
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
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                >
                  {REACCREDITATION_FOLDERS.map((f) => (
                    <option key={f.num} value={f.num}>
                      Folder #{f.num}: {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Document Title / File Name</label>
                <input
                  type="text"
                  placeholder="e.g. GHTEC_PhD_Business_Accreditation_Certificate_2025.pdf"
                  value={folderForm.file_name}
                  onChange={(e) => setFolderForm({ ...folderForm, file_name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">File URL / Internal Path</label>
                <input
                  type="text"
                  placeholder="e.g. /uploads/reaccreditation/folder_1/accreditation.pdf"
                  value={folderForm.file_url}
                  onChange={(e) => setFolderForm({ ...folderForm, file_url: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Brief note on what this audit artifact confirms..."
                  value={folderForm.description || ''}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setShowFolderModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
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
                Upload to Folder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
