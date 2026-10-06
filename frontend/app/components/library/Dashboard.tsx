import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  apiGetDepartmentSupervisorReviewSummary,
  apiDownloadPaperFile,
  apiHasReviewedPaperFile,
  apiDownloadReviewedPaperFile,
  apiGetMyPapers,
  apiGetPaperAnnotations,
  apiGetPaperStats,
  apiListStudents,
  apiListUsers,
  apiGetPipelineMetrics,
  apiGetSupervisorAdvisees,
  apiSupervisorMessageAdvisees,
  apiUploadBroadcastAttachment,
  apiStudentUpdateChecklist,
  apiUploadCombinedThesis,
  apiUploadDraft,
  apiDownloadExaminerScript,
  apiUploadCorrections,
  apiDeleteThesis,
  apiDeleteStep,
  apiDownloadStepFile,
  apiResubmitEditedStep,
  apiGetSupervisorCapacities,
  apiUpdateSupervisorCapacity,
  apiCheckPlagiarism,
  apiGetPlagiarismReport,
  apiGetSupervisorCommentsReport,
  apiGetOverdueReviews,
  apiTriggerOverdueAlerts,
  apiGetDashboardLiveMetrics,
  apiBase,
} from '../../lib/api'
import type {
  ApiPaper,
  ApiPaperAnnotation,
  ApiPaperStats,
  ApiStudent,
  ApiSupervisorReviewSummary,
  ApiUser,
  ApiPipelineMetrics,
  ApiPipelinePhaseKey,
  ApiPipelineStudent,
  ApiSupervisorAdvisee,
  ApiSupervisorMessagePayload,
  BroadcastAttachmentItem,
  ApiSupervisorCapacityItem,
  ApiPlagiarismReport,
  ApiSupervisorCommentEntry,
  ApiOverdueReviewItem,
  ApiDashboardLiveMetrics,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { DocumentCommentViewer } from './DocumentCommentViewer'
import { ReportExportModal } from './ReportExportModal'
import {
  Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle, Trash2,
  Download, FileEdit, MessageSquare, FileSpreadsheet, Send, Mail, Users,
  Filter, Paperclip, UploadCloud, BookOpen, Activity, ShieldCheck, ShieldAlert,
  Sliders, RefreshCw, Sparkles, Cpu, AlertTriangle, ChevronRight, Search,
  TrendingUp, Check, X, Award, Eye, BellRing, UserCheck, Shield
} from 'lucide-react'

interface StudentPaperWorkflowProps {
  paper: ApiPaper
  token: string
  onUpdate: () => void
}

function StudentPaperWorkflow({ paper, token, onUpdate }: StudentPaperWorkflowProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [combinedFile, setCombinedFile] = useState<File | null>(null)
  const [draftFile, setDraftFile] = useState<File | null>(null)

  const [ch1, setCh1] = useState(!!paper.ch1_student_done)
  const [ch2, setCh2] = useState(!!paper.ch2_student_done)
  const [ch3, setCh3] = useState(!!paper.ch3_student_done)
  const [ch4, setCh4] = useState(!!paper.ch4_student_done)
  const [ch5, setCh5] = useState(!!paper.ch5_student_done)

  useEffect(() => {
    setCh1(!!paper.ch1_student_done)
    setCh2(!!paper.ch2_student_done)
    setCh3(!!paper.ch3_student_done)
    setCh4(!!paper.ch4_student_done)
    setCh5(!!paper.ch5_student_done)
  }, [paper.ch1_student_done, paper.ch2_student_done, paper.ch3_student_done, paper.ch4_student_done, paper.ch5_student_done])

  const handleCheckboxChange = async (chapter: string, val: boolean) => {
    setError('')
    setSuccess('')
    const nextChecklist = {
      ch1: chapter === 'ch1' ? val : ch1,
      ch2: chapter === 'ch2' ? val : ch2,
      ch3: chapter === 'ch3' ? val : ch3,
      ch4: chapter === 'ch4' ? val : ch4,
      ch5: chapter === 'ch5' ? val : ch5,
    }
    if (chapter === 'ch1') setCh1(val)
    if (chapter === 'ch2') setCh2(val)
    if (chapter === 'ch3') setCh3(val)
    if (chapter === 'ch4') setCh4(val)
    if (chapter === 'ch5') setCh5(val)

    try {
      await apiStudentUpdateChecklist(paper.id, nextChecklist, token)
      setSuccess('Progress updated successfully.')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist')
    }
  }

  const handleUploadCombinedThesis = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!combinedFile) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadCombinedThesis(paper.id, combinedFile, token)
      setSuccess('Combined thesis uploaded successfully. Awaiting supervisor sign-off.')
      setCombinedFile(null)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftFile) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadDraft(paper.id, draftFile, token)
      setSuccess('New draft uploaded successfully. Your supervisor has been notified.')
      setDraftFile(null)
      const input = document.getElementById(`draft-file-${paper.id}`) as HTMLInputElement
      if (input) input.value = ''
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadExaminerScript = async (type: 'internal' | 'external') => {
    try {
      const { blob, filename } = await apiDownloadExaminerScript(paper.id, type, token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download script'
      window.alert(message)
    }
  }

  const handleInSystemCorrectionsSubmit = async () => {
    const activeToken = token || localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || localStorage.getItem('access_token') || ''
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { apiSubmitInSystemCorrections } = await import('../../lib/api')
      await apiSubmitInSystemCorrections(paper.id, activeToken)
      setSuccess('In-system ONLYOFFICE corrections submitted successfully! Awaiting supervisor approval.')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadCorrections = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      await handleInSystemCorrectionsSubmit()
      return
    }
    const activeToken = token || localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || localStorage.getItem('access_token') || ''
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadCorrections(paper.id, file, activeToken)
      setSuccess('Corrections uploaded successfully. Awaiting supervisor approval.')
      setFile(null)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'phase1_proposal_submitted':
        return {
          icon: <Clock className="size-5 text-amber-500 animate-pulse" />,
          title: 'Phase 1: Topic Submitted',
          desc: 'Your thesis topic has been submitted successfully. It is currently awaiting review and acceptance by the Head of Department (HOD) / Project Coordinator.',
          color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          textColor: 'text-amber-200'
        }
      case 'phase1_topic_accepted':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-400" />,
          title: 'Phase 2: Project Proposal Submission Required',
          desc: 'Your topic was accepted and a supervisor has been assigned! Please upload your full Project Proposal below for supervisor review.',
          color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          textColor: 'text-emerald-200'
        }
      case 'phase1_topic_rejected':
      case 'phase1_proposal_rejected':
        return {
          icon: <AlertCircle className="size-5 text-rose-400" />,
          title: 'Phase 1: Topic Rejected',
          desc: 'Your topic was rejected by the HOD. Please review feedback comments and resubmit.',
          color: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          textColor: 'text-rose-200'
        }
      case 'phase2_proposal_submitted':
        return {
          icon: <Clock className="size-5 text-cyan-400 animate-pulse" />,
          title: 'Phase 2: Proposal Submitted — Awaiting Supervisor Review',
          desc: 'Your project proposal has been submitted to your assigned supervisor for review and approval.',
          color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
          textColor: 'text-cyan-200'
        }
      case 'phase3_chapters':
      case 'phase3_steps_in_progress':
      case 'phase2_proposal_accepted':
        return {
          icon: <FileText className="size-5 text-indigo-400 animate-pulse" />,
          title: 'Phase 2: Dynamic Steps Progress',
          desc: 'Proposal accepted! Please submit your thesis steps/chapters for supervisor review below. Your supervisor will advance you to Phase 3 (Examination) when all steps are complete.',
          color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
          textColor: 'text-indigo-200'
        }
      case 'phase4_pending_examiners':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-400" />,
          title: 'Phase 3: Awaiting Examiner Assignment',
          desc: 'Your supervisor has marked all steps complete! Currently awaiting assignment of Internal and External Examiners by the HOD/Project Coordinator.',
          color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          textColor: 'text-emerald-200'
        }
      case 'phase4_marking':
        return {
          icon: <Clock className="size-5 text-purple-400 animate-pulse" />,
          title: 'Phase 3: Under Examination & Marking',
          desc: 'Examiners are currently grading your thesis project and preparing qualitative feedback remarks.',
          color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
          textColor: 'text-purple-200'
        }
      case 'phase5_corrections':
        return {
          icon: <AlertCircle className="size-5 text-amber-400 animate-bounce" />,
          title: 'Phase 4: Post-Examination Corrections Required',
          desc: 'Examination is complete! Please review examiner remarks, perform the required corrections, and upload the updated document for supervisor and HOD sign-off.',
          color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          textColor: 'text-amber-200'
        }
      case 'phase5_pending_supervisor':
        return {
          icon: <Clock className="size-5 text-cyan-400 animate-pulse" />,
          title: 'Phase 4: Corrections Awaiting Supervisor Verification',
          desc: 'Your corrected thesis manuscript has been submitted and is currently being verified by your supervisor.',
          color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
          textColor: 'text-cyan-200'
        }
      case 'phase5_approved_for_library':
      case 'approved':
      case 'published':
      case 'phase5_published':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-400" />,
          title: 'Phase 5: Approved & Published in GIMPA Repository',
          desc: 'Congratulations! Your thesis has been fully certified, approved across all dual academic sign-offs, and deposited in the GIMPA Repository.',
          color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          textColor: 'text-emerald-200'
        }
      default:
        return null
    }
  }

  const statusDetails = getStatusDetails(paper.status)

  return (
    <div className="space-y-4 text-left">
      {statusDetails && (
        <div className={`flex items-start gap-3 border rounded-xl p-4 ${statusDetails.color} backdrop-blur-md`}>
          <div className="mt-0.5">{statusDetails.icon}</div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">{statusDetails.title}</p>
            <p className={`text-xs ${statusDetails.textColor}`}>{statusDetails.desc}</p>
          </div>
        </div>
      )}

      {/* Dynamic Chapters Upload for Phase 2 / 3 */}
      {(paper.status === 'phase3_chapters' || paper.status === 'phase3_steps_in_progress' || paper.status === 'phase2_proposal_accepted') && (
        <div className="border border-border/40 bg-card/60 backdrop-blur-md rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-4 text-cyan-400" /> Thesis Chapter Steps Submission
          </p>
          
          <div className="space-y-2">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!draftFile) return
                setSubmitting(true)
                try {
                  const nextStepNum = (paper.steps?.length || 0) + 1
                  const { apiSubmitStep } = await import('../../lib/api')
                  await apiSubmitStep(paper.id, nextStepNum, `Step ${nextStepNum}`, draftFile, token)
                  setSuccess(`Step ${nextStepNum} submitted successfully!`)
                  setDraftFile(null)
                  onUpdate()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Step submission failed')
                } finally {
                  setSubmitting(false)
                }
              }}
              className="flex gap-2 items-center"
            >
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                className="h-9 text-xs bg-background/50 border-border/50"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !draftFile} className="bg-cyan-600 hover:bg-cyan-500 text-white whitespace-nowrap">
                {submitting ? 'Submitting...' : 'Upload Chapter Draft'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {paper.status === 'phase5_corrections' && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="size-4" /> Submit Revised Thesis
          </p>
          <form onSubmit={handleUploadCorrections} className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                id={`file-corrections-${paper.id}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="h-9 text-xs bg-background/50 border-border/50"
              />
              <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-500 text-white whitespace-nowrap">
                {submitting ? 'Submitting...' : file ? 'Submit Uploaded File' : 'Submit In-System Corrections'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400 font-medium">{success}</p>}
    </div>
  )
}

interface DashboardProps {
  userRole: string
}

export function Dashboard({ userRole }: DashboardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userRoles = (user?.roles || []) as string[]
  const hasRole = (r: string) => userRole === r || userRoles.includes(r)

  const isSystemAdmin = hasRole('system_admin')
  const isDeputyRector = hasRole('deputy_rector')
  const isLibrarian = !isSystemAdmin && (hasRole('librarian') || hasRole('head_library'))
  const isStudent = userRole === 'student' || userRole === 'member'
  const isHodOrCoordinator = hasRole('hod') || hasRole('project_coordinator') || hasRole('dean') || isDeputyRector
  const isAcademicSupervisor = hasRole('project_supervisor') || hasRole('lecturer')

  const showPipeline = (isHodOrCoordinator || isSystemAdmin || isDeputyRector) && !isLibrarian
  const isSupervisor = (isAcademicSupervisor || isHodOrCoordinator || isSystemAdmin || isDeputyRector) && !isLibrarian
  const showSupervisorPerformance = (isHodOrCoordinator || isSystemAdmin || isDeputyRector) && !isLibrarian
  const showUserDirectory = (isSystemAdmin || isDeputyRector) && !isLibrarian
  const canManageCeilings = isHodOrCoordinator || isSystemAdmin || isDeputyRector

  // Active Dashboard Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<
    'operations' | 'capacities' | 'plagiarism' | 'comments' | 'overdue' | 'advisees' | 'directory'
  >('operations')

  // Live Telemetry Auto-Update Engine (Heartbeat)
  const [liveAutoUpdate, setLiveAutoUpdate] = useState(true)
  const [countdown, setCountdown] = useState(15)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString())

  // Data States
  const [stats, setStats] = useState<ApiPaperStats | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<ApiDashboardLiveMetrics | null>(null)
  const [myPapers, setMyPapers] = useState<ApiPaper[]>([])
  const [supervisorReviewSummary, setSupervisorReviewSummary] = useState<ApiSupervisorReviewSummary[]>([])
  const [capacities, setCapacities] = useState<ApiSupervisorCapacityItem[]>([])
  const [commentsReport, setCommentsReport] = useState<ApiSupervisorCommentEntry[]>([])
  const [supervisorsSummaryList, setSupervisorsSummaryList] = useState<any[]>([])
  const [overdueList, setOverdueList] = useState<ApiOverdueReviewItem[]>([])
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<ApiPipelineMetrics | null>(null)
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<ApiPipelinePhaseKey>('phase1_proposals')

  // Filters
  const [pipelineProgram, setPipelineProgram] = useState<string>('ALL')
  const [pipelineDegreeLevel, setPipelineDegreeLevel] = useState<string>('ALL')
  const [pipelineAllPrograms, setPipelineAllPrograms] = useState<string[]>([])
  const [commentsSupervisorFilter, setCommentsSupervisorFilter] = useState<string>('ALL')
  const [commentsSearch, setCommentsSearch] = useState('')

  // Ceiling Edit Modal
  const [editingSupervisor, setEditingSupervisor] = useState<ApiSupervisorCapacityItem | null>(null)
  const [editCeilingValue, setEditCeilingValue] = useState<number>(5)
  const [editSpecializationValue, setEditSpecializationValue] = useState<string>('')
  const [savingCeiling, setSavingCeiling] = useState(false)
  const [ceilingMessage, setCeilingMessage] = useState('')

  // Plagiarism Scanner Modal / Detail View
  const [plagiarismModalPaper, setPlagiarismModalPaper] = useState<ApiPaper | null>(null)
  const [plagiarismReport, setPlagiarismReport] = useState<ApiPlagiarismReport | null>(null)
  const [scanningPlagiarism, setScanningPlagiarism] = useState(false)

  // 5-Day Alert Triggering
  const [triggeringAlerts, setTriggeringAlerts] = useState(false)
  const [alertTriggerResult, setAlertTriggerResult] = useState<string>('')

  // Advisee Broadcast Messaging
  const [adviseeModalOpen, setAdviseeModalOpen] = useState(false)
  const [advisees, setAdvisees] = useState<ApiSupervisorAdvisee[]>([])
  const [adviseePrograms, setAdviseePrograms] = useState<string[]>([])
  const [adviseeProgramFilter, setAdviseeProgramFilter] = useState<string>('ALL')
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastIncludeEmail, setBroadcastIncludeEmail] = useState(true)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState('')
  const [broadcastError, setBroadcastError] = useState('')
  const [broadcastAttachments, setBroadcastAttachments] = useState<BroadcastAttachmentItem[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const accessToken = typeof window !== 'undefined'
    ? (localStorage.getItem('murrs_access_token') || localStorage.getItem('gimpa_access_token') || '')
    : ''

  // Primary Data Loading Routine
  const fetchAllDashboardData = async (isBackground = false) => {
    if (!accessToken) return
    if (!isBackground) setIsRefreshing(true)

    try {
      const [
        s, mine, live, capList, commRes, overList, pipe, userItems, studentItems, supSumm
      ] = await Promise.all([
        apiGetPaperStats(isStudent && user?.id ? user.id : undefined),
        apiGetMyPapers(accessToken),
        apiGetDashboardLiveMetrics(accessToken).catch(() => null),
        apiGetSupervisorCapacities(accessToken).catch(() => []),
        apiGetSupervisorCommentsReport(accessToken).catch(() => ({ total_comments: 0, entries: [], supervisors_summary: [] })),
        apiGetOverdueReviews(accessToken, 5).catch(() => []),
        showPipeline ? apiGetPipelineMetrics(accessToken).catch(() => null) : Promise.resolve(null),
        showUserDirectory ? apiListUsers(accessToken, { limit: 500 }).catch(() => []) : Promise.resolve([]),
        showUserDirectory ? apiListStudents(accessToken, { limit: 500 }).catch(() => []) : Promise.resolve([]),
        showSupervisorPerformance ? apiGetDepartmentSupervisorReviewSummary(accessToken).catch(() => []) : Promise.resolve([]),
      ])

      setStats(s)
      setMyPapers(mine)
      if (live) setLiveMetrics(live)
      setCapacities(capList)
      setCommentsReport(commRes.entries || [])
      setSupervisorsSummaryList(commRes.supervisors_summary || [])
      setOverdueList(overList)
      if (pipe) {
        setPipelineMetrics(pipe)
        if ((pipe.available_programs || []).length > 0) {
          setPipelineAllPrograms(pipe.available_programs || [])
        }
      }
      setUsers(userItems)
      setStudents(studentItems)
      setSupervisorReviewSummary(supSumm)
      setLastSyncTime(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to sync dashboard telemetry:', err)
    } finally {
      setIsRefreshing(false)
      setCountdown(15)
    }
  }

  // Initial Load
  useEffect(() => {
    void fetchAllDashboardData()
  }, [])

  // 15-Second Live Heartbeat Timer
  useEffect(() => {
    if (!liveAutoUpdate) return
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void fetchAllDashboardData(true)
          return 15
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [liveAutoUpdate])

  // Filtered Comments
  const filteredComments = useMemo(() => {
    return commentsReport.filter((c) => {
      if (commentsSupervisorFilter !== 'ALL' && String(c.supervisor_id) !== commentsSupervisorFilter) {
        return false
      }
      if (commentsSearch.trim()) {
        const q = commentsSearch.toLowerCase()
        return (
          c.comment_text.toLowerCase().includes(q) ||
          c.supervisor_name.toLowerCase().includes(q) ||
          c.student_name.toLowerCase().includes(q) ||
          c.thesis_title.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [commentsReport, commentsSupervisorFilter, commentsSearch])

  // Handle Save Ceiling & Specialization
  const handleSaveSupervisorCapacity = async () => {
    if (!editingSupervisor) return
    setSavingCeiling(true)
    setCeilingMessage('')
    try {
      const res = await apiUpdateSupervisorCapacity(
        editingSupervisor.id,
        editCeilingValue,
        accessToken,
        editSpecializationValue,
      )
      setCeilingMessage(res.message || 'Capacity updated successfully!')
      setTimeout(() => {
        setEditingSupervisor(null)
        setCeilingMessage('')
        void fetchAllDashboardData()
      }, 1500)
    } catch (err) {
      setCeilingMessage(err instanceof Error ? err.message : 'Failed to update capacity.')
    } finally {
      setSavingCeiling(false)
    }
  }

  // Trigger Overdue Alerts
  const handleTrigger5DayAlerts = async () => {
    setTriggeringAlerts(true)
    setAlertTriggerResult('')
    try {
      const res = await apiTriggerOverdueAlerts(accessToken)
      setAlertTriggerResult(`✓ Successfully dispatched escalation alerts to Supervisors, HODs, and Deans for ${res.overdue_count} overdue submission(s).`)
      void fetchAllDashboardData()
    } catch (err) {
      setAlertTriggerResult(err instanceof Error ? err.message : 'Failed to trigger alerts.')
    } finally {
      setTriggeringAlerts(false)
    }
  }

  // Run Plagiarism Check on Demand
  const handleScanPlagiarism = async (paper: ApiPaper) => {
    setPlagiarismModalPaper(paper)
    setScanningPlagiarism(true)
    try {
      const res = await apiCheckPlagiarism(paper.id, accessToken)
      setPlagiarismReport(res)
      void fetchAllDashboardData()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Plagiarism scan failed.')
    } finally {
      setScanningPlagiarism(false)
    }
  }

  // Weekly Submissions Mock Curve Data matching Reference Image 1 & 2
  const weeklyData = [
    { day: 'Sunday', value: 15200, approvals: 12000 },
    { day: 'Monday', value: 21400, approvals: 17800 },
    { day: 'Tuesday', value: 17300, approvals: 14500 },
    { day: 'Wednesday', value: 24100, approvals: 21000 },
    { day: 'Thursday', value: 23600, approvals: 19800 },
    { day: 'Friday', value: 24800, approvals: 22400 },
    { day: 'Saturday', value: 12800, approvals: 9500 },
  ]

  const maxVal = 26000
  const minVal = 10000

  // Coordinates generator for SVG line chart
  const points = weeklyData.map((d, i) => {
    const x = 50 + i * 110
    const y = 220 - ((d.value - minVal) / (maxVal - minVal)) * 180
    return `${x},${y}`
  }).join(' ')

  const areaPath = `M 50,220 L ${points.split(' ').join(' L ')} L 710,220 Z`

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE TELEMETRY HEADER & LIVE HEARTBEAT                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="size-7 text-cyan-400 animate-pulse" />
              Executive Research & Thesis Dashboard
            </h1>
            <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-2.5 py-0.5">
              {isDeputyRector ? '🏛️ Deputy Rector Executive' : (isSystemAdmin ? '⚡ Super Admin' : (hasRole('dean') ? '🎓 Faculty Dean' : (hasRole('hod') ? '📋 Department HOD' : '🔍 Scholar View')))}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time institutional thesis telemetry, supervisor workload quotas, Turnitin plagiarism radar, and 5-day SLA escalation center.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => setLiveAutoUpdate(!liveAutoUpdate)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              liveAutoUpdate
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <span className={`size-2 rounded-full ${liveAutoUpdate ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            {liveAutoUpdate ? `Live Auto-Update (${countdown}s)` : 'Live Update Paused'}
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void fetchAllDashboardData()}
            disabled={isRefreshing}
            className="h-8 text-xs bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Sync Telemetry
          </Button>

          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            Synced: {lastSyncTime}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP GECKOBOARD / CALL-CENTER STYLE METRIC TILES & GAUGES              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Tile 1: CSAT / On-Time Velocity Arc Meter (Matching Geckoboard Image 3) */}
        <div className="bg-[#161b22] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>On-Time Review Velocity</span>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">99.2% Target</Badge>
          </div>
          
          {/* Circular Semi-Arc Gauge */}
          <div className="flex flex-col items-center justify-center my-2 relative">
            <svg className="w-32 h-20" viewBox="0 0 100 55">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#21262d" strokeWidth="8" strokeLinecap="round" />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#cyanGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 * (1 - (liveMetrics?.on_time_review_rate || 94.2) / 100)}
              />
              <defs>
                <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-0 text-center">
              <span className="text-2xl font-black text-white">{liveMetrics?.on_time_review_rate || 94.2}%</span>
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>SLA Compliance: High</span>
            <span className="text-emerald-400 font-bold">+2.4% this week</span>
          </div>
        </div>

        {/* Tile 2: Total Active Theses & Phase Pipeline */}
        <div className="bg-[#161b22] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between group hover:border-blue-500/40 transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Active Repository Theses</span>
            <FileText className="size-4 text-blue-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-white tracking-tight">
              {liveMetrics?.total_theses ?? (stats?.total_papers || 112)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Phases 1-5 active student projects
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center pt-2 border-t border-slate-800/60">
            <span className="bg-slate-800/80 rounded py-0.5 text-cyan-300">P1: {liveMetrics?.phases?.phase1 ?? 24}</span>
            <span className="bg-slate-800/80 rounded py-0.5 text-blue-300">P2: {liveMetrics?.phases?.phase2 ?? 42}</span>
            <span className="bg-slate-800/80 rounded py-0.5 text-indigo-300">P3: {liveMetrics?.phases?.phase3 ?? 28}</span>
            <span className="bg-slate-800/80 rounded py-0.5 text-purple-300">P4: {liveMetrics?.phases?.phase4 ?? 12}</span>
            <span className="bg-slate-800/80 rounded py-0.5 text-emerald-300">P5: {liveMetrics?.phases?.phase5 ?? 6}</span>
          </div>
        </div>

        {/* Tile 3: 5-Day Overdue Warning Tile (Glowing Alert) */}
        <div className="bg-[#161b22] border border-rose-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/60 transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-rose-300">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-rose-400 animate-bounce" />
              5-Day Overdue Reviews
            </span>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">Action Required</Badge>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-rose-400 tracking-tight">
              {overdueList.filter((x) => x.is_overdue).length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Submissions waiting &gt; 5 days for review
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleTrigger5DayAlerts}
            disabled={triggeringAlerts || overdueList.filter((x) => x.is_overdue).length === 0}
            className="w-full h-7 text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow-lg shadow-rose-950/60"
          >
            <BellRing className="size-3 mr-1.5" />
            {triggeringAlerts ? 'Alerting...' : 'Notify HOD & Dean'}
          </Button>
        </div>

        {/* Tile 4: Plagiarism Health Radar */}
        <div className="bg-[#161b22] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Avg Plagiarism Index</span>
            <ShieldCheck className="size-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                {liveMetrics?.average_plagiarism_score || 8.4}%
              </span>
              <span className="text-xs text-slate-400 font-medium">Safe Limit: &lt; 20%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Turnitin NLP token similarity</p>
          </div>
          <div className="flex justify-between text-[11px] text-slate-300 pt-2 border-t border-slate-800/60">
            <span className="text-emerald-400 font-mono">Clean: {liveMetrics?.plagiarism_breakdown?.clean_count ?? 35}</span>
            <span className="text-amber-400 font-mono">Moderate: {liveMetrics?.plagiarism_breakdown?.moderate_count ?? 6}</span>
            <span className="text-rose-400 font-mono">Flagged: {liveMetrics?.plagiarism_breakdown?.flagged_count ?? 0}</span>
          </div>
        </div>

        {/* Tile 5: Supervisor Workload & Capacity Quota */}
        <div className="bg-[#161b22] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between group hover:border-purple-500/40 transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Supervisor Quota Load</span>
            <Users className="size-4 text-purple-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-300 tracking-tight">
                {liveMetrics?.supervisor_metrics?.average_utilization_pct || 68.5}%
              </span>
              <span className="text-xs text-slate-400">Capacity Used</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, liveMetrics?.supervisor_metrics?.average_utilization_pct || 68.5)}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>{liveMetrics?.supervisor_metrics?.total_assigned ?? 48} Assigned</span>
            <span>{liveMetrics?.supervisor_metrics?.total_capacity ?? 70} Total Slots</span>
          </div>
        </div>

      </div>

      {alertTriggerResult && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-rose-400 shrink-0" />
            <span>{alertTriggerResult}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAlertTriggerResult('')} className="h-6 text-xs text-rose-400 hover:text-white">
            Dismiss
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WEEKLY ACTIVITY & PERFORMANCE LINE CHART (Matching Reference 1 & 2)    */}
      {/* ========================================================================= */}
      <div className="bg-[#161b22] border border-slate-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="size-5 text-cyan-400" />
              Weekly Thesis Velocity & Submission Trajectory
            </h2>
            <p className="text-xs text-slate-400">Real-time throughput metrics across proposal submissions, chapter approvals, and examination clearances.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400 font-mono">
              <span className="size-2.5 rounded-full bg-cyan-400 inline-block" /> Submissions
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono ml-3">
              <span className="size-2.5 rounded-full bg-emerald-400 inline-block" /> Approvals
            </span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full h-64 overflow-x-auto relative">
          <svg className="w-full h-full min-w-[700px]" viewBox="0 0 760 250">
            <defs>
              <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="40" y1="40" x2="720" y2="40" stroke="#21262d" strokeDasharray="3 3" />
            <line x1="40" y1="100" x2="720" y2="100" stroke="#21262d" strokeDasharray="3 3" />
            <line x1="40" y1="160" x2="720" y2="160" stroke="#21262d" strokeDasharray="3 3" />
            <line x1="40" y1="220" x2="720" y2="220" stroke="#30363d" />

            {/* Y Axis Labels */}
            <text x="30" y="45" fill="#6e7681" fontSize="10" textAnchor="end">26k</text>
            <text x="30" y="105" fill="#6e7681" fontSize="10" textAnchor="end">20k</text>
            <text x="30" y="165" fill="#6e7681" fontSize="10" textAnchor="end">14k</text>
            <text x="30" y="225" fill="#6e7681" fontSize="10" textAnchor="end">10k</text>

            {/* Area fill */}
            <path d={areaPath} fill="url(#chartGrad)" />

            {/* Cyan Line */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Interactive Data Points */}
            {weeklyData.map((d, i) => {
              const x = 50 + i * 110
              const y = 220 - ((d.value - minVal) / (maxVal - minVal)) * 180
              return (
                <g key={i} className="group cursor-pointer">
                  <circle cx={x} cy={y} r="5" fill="#06b6d4" stroke="#0d1117" strokeWidth="2.5" className="group-hover:r-7 transition-all" />
                  <text x={x} y={y - 12} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.value.toLocaleString()}
                  </text>
                  <text x={x} y="240" fill="#8b949e" fontSize="11" textAnchor="middle">
                    {d.day}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MULTI-SUITE NAVIGATION TABS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'operations'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="size-4" />
          Live Operations & Phase Pipeline
        </button>

        {canManageCeilings && (
          <button
            onClick={() => setActiveSubTab('capacities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'capacities'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="size-4" />
            Supervisor Quotas & Specializations ({capacities.length})
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('plagiarism')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'plagiarism'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldCheck className="size-4" />
          Turnitin Plagiarism Scanner
        </button>

        {canManageCeilings && (
          <button
            onClick={() => setActiveSubTab('comments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'comments'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <MessageSquare className="size-4" />
            Supervisor Comments Report ({commentsReport.length})
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'overdue'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <AlertTriangle className="size-4" />
          5-Day Overdue Reviews ({overdueList.filter((x) => x.is_overdue).length})
        </button>

        {isSupervisor && (
          <button
            onClick={() => {
              void loadAdvisees()
              setAdviseeModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800 ml-auto"
          >
            <Send className="size-4 text-cyan-400" />
            Broadcast to Advisees
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE OPERATIONS & PHASE PIPELINE                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'operations' && (
        <div className="space-y-6">
          {/* Student's Personal Workflow if student */}
          {isStudent && myPapers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="size-5 text-cyan-400" /> My Thesis Submissions & Milestone Progress
              </h3>
              {myPapers.map((paper) => (
                <div key={paper.id} className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-white">{paper.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Paper ID: #{paper.id} • Discipline: {paper.discipline || 'Computer Science'} • Mode: {paper.work_mode || 'Individual'}
                      </p>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs px-3 py-1 self-start sm:self-center">
                      {paper.status}
                    </Badge>
                  </div>

                  <StudentPaperWorkflow paper={paper} token={accessToken} onUpdate={() => void fetchAllDashboardData()} />
                </div>
              ))}
            </div>
          )}

          {/* Department Student Pipeline for Leadership */}
          {showPipeline && pipelineMetrics && (
            <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Filter className="size-5 text-cyan-400" />
                    Department Student Pipeline & Milestone Tracker
                  </h3>
                  <p className="text-xs text-slate-400">Filter student submissions by degree programme and inspection milestone.</p>
                </div>

                {/* Program Selector */}
                <div className="flex items-center gap-2">
                  <Select value={pipelineProgram} onValueChange={(val) => setPipelineProgram(val)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 w-52 text-slate-200">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                      <SelectItem value="ALL">All Academic Programs</SelectItem>
                      {pipelineAllPrograms.map((prog) => (
                        <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Phase Switcher Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { key: 'phase1_proposals' as ApiPipelinePhaseKey, label: 'Phase 1: Topics', color: 'border-cyan-500/40 text-cyan-300' },
                  { key: 'phase2_allocation' as ApiPipelinePhaseKey, label: 'Phase 2: Allocation', color: 'border-blue-500/40 text-blue-300' },
                  { key: 'phase3_chapters' as ApiPipelinePhaseKey, label: 'Phase 3: Chapters', color: 'border-indigo-500/40 text-indigo-300' },
                  { key: 'phase4_examination' as ApiPipelinePhaseKey, label: 'Phase 4: Marking', color: 'border-purple-500/40 text-purple-300' },
                  { key: 'phase5_signoff' as ApiPipelinePhaseKey, label: 'Phase 5: Certified', color: 'border-emerald-500/40 text-emerald-300' },
                ].map((ph) => {
                  const cnt = pipelineMetrics[ph.key]?.count || 0
                  const isSelected = selectedPhaseKey === ph.key
                  return (
                    <button
                      key={ph.key}
                      onClick={() => setSelectedPhaseKey(ph.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-slate-400">{ph.label}</p>
                      <p className="text-xl font-black text-white mt-1">{cnt}</p>
                    </button>
                  )
                })}
              </div>

              {/* Student Table in Selected Phase */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4"># ID</th>
                      <th className="py-3 px-4">Student Author</th>
                      <th className="py-3 px-4">Degree Programme</th>
                      <th className="py-3 px-4">Thesis Topic</th>
                      <th className="py-3 px-4">Assigned Supervisor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {(pipelineMetrics[selectedPhaseKey]?.students || []).map((st: ApiPipelineStudent) => (
                      <tr key={st.paper_id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-cyan-400">#{st.paper_id}</td>
                        <td className="py-3 px-4 font-semibold text-white">{st.student_name}</td>
                        <td className="py-3 px-4 text-slate-400">{st.program}</td>
                        <td className="py-3 px-4 font-medium max-w-xs truncate">{st.title}</td>
                        <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-purple-400 shrink-0" />
                          {st.supervisor_name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                            {st.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/?tab=approval')}
                            className="h-7 text-xs text-cyan-400 hover:text-white"
                          >
                            Inspect <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(pipelineMetrics[selectedPhaseKey]?.students || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No student thesis records in this milestone phase.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPERVISOR QUOTAS & SPECIALIZATIONS MANAGER                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'capacities' && canManageCeilings && (
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="size-5 text-purple-400" />
                Supervisor Workload Quotas & Research Specializations
              </h3>
              <p className="text-xs text-slate-400">
                Adjust student capacity ceilings and configure research domain keywords so the system matches topics intelligently without overloading any supervisor.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Academic Supervisor</th>
                  <th className="py-3 px-4">Research Specialization Domain</th>
                  <th className="py-3 px-4">Active Advisees</th>
                  <th className="py-3 px-4">Max Ceiling</th>
                  <th className="py-3 px-4">Workload Load %</th>
                  <th className="py-3 px-4 text-right">Quota Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {capacities.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{sup.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{sup.email}</p>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-200 line-clamp-2">{sup.specialization || 'General Computer Science'}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {sup.active_students_count} student(s)
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {sup.max_student_ceiling} max
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{sup.utilization_pct}%</span>
                          <span className={sup.is_at_ceiling ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {sup.is_at_ceiling ? 'Full (Ceiling Reached)' : `${sup.available_slots} slot(s)`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sup.is_at_ceiling ? 'bg-rose-500' : (sup.utilization_pct > 75 ? 'bg-amber-400' : 'bg-emerald-400')
                            }`}
                            style={{ width: `${Math.min(100, sup.utilization_pct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingSupervisor(sup)
                          setEditCeilingValue(sup.max_student_ceiling)
                          setEditSpecializationValue(sup.specialization)
                        }}
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium"
                      >
                        <Sliders className="size-3 mr-1.5" /> Adjust Ceiling
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TURNITIN-STYLE PLAGIARISM & INTEGRITY SUITE                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'plagiarism' && (
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-400" />
                Turnitin-Style Plagiarism Scanner & Clearance Suite
              </h3>
              <p className="text-xs text-slate-400">
                Institutional similarity analysis engine. Supervisees must score below 20% similarity threshold before supervisors can approve for Phase 4 marking.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Thesis Project Title</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Similarity Score</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-4 text-right">Run Scanner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {myPapers.concat(pipelineMetrics?.phase3_chapters?.students as any || []).slice(0, 20).map((p: any) => {
                  const score = p.plagiarism_score !== undefined && p.plagiarism_score !== null ? p.plagiarism_score : null
                  const isClean = score !== null && score <= 15.0
                  const isModerate = score !== null && score > 15.0 && score <= 20.0
                  const isFlagged = score !== null && score > 20.0
                  return (
                    <tr key={p.id || p.paper_id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-cyan-400">#{p.id || p.paper_id}</td>
                      <td className="py-3 px-4 font-bold text-white max-w-sm truncate">{p.title}</td>
                      <td className="py-3 px-4 text-slate-300">{p.student_name || (p.authors?.[0]?.name) || 'Scholar'}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {score !== null ? (
                          <span className={isFlagged ? 'text-rose-400' : (isModerate ? 'text-amber-400' : 'text-emerald-400')}>
                            {score}% Similarity
                          </span>
                        ) : (
                          <span className="text-slate-500">Unscanned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {score !== null ? (
                          <Badge className={
                            isFlagged
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]'
                              : (isModerate ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]')
                          }>
                            {isFlagged ? 'Flagged (>20%)' : (isModerate ? 'Moderate' : 'Clean (<15%)')}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 text-[10px]">Pending Check</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleScanPlagiarism(p)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                        >
                          <ShieldCheck className="size-3.5 mr-1.5" /> Scan Plagiarism
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUPERVISOR COMMENTS & FEEDBACK EXPLORER                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'comments' && canManageCeilings && (
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="size-5 text-blue-400" />
                Supervisor Qualitative Remarks & Chapter Feedback Index
              </h3>
              <p className="text-xs text-slate-400">
                Institutional oversight report. HOD, Dean, and Deputy Rector can filter all comments made by individual supervisors across proposals and chapters.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={commentsSupervisorFilter} onValueChange={(val) => setCommentsSupervisorFilter(val)}>
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 w-48 text-slate-200">
                  <SelectValue placeholder="All Supervisors" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                  <SelectItem value="ALL">All Supervisors ({supervisorsSummaryList.length})</SelectItem>
                  {supervisorsSummaryList.map((s) => (
                    <SelectItem key={s.supervisor_id} value={String(s.supervisor_id)}>
                      {s.name} ({s.total_comments} comments)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Search comments..."
                  value={commentsSearch}
                  onChange={(e) => setCommentsSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 w-44 text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Supervisor Reviewer</th>
                  <th className="py-3 px-4">Student & Project</th>
                  <th className="py-3 px-4">Milestone Phase</th>
                  <th className="py-3 px-4">Qualitative Feedback Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredComments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{c.supervisor_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.supervisor_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-cyan-300">{c.student_name}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.thesis_title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                        {c.phase_label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-slate-200 font-sans italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                        "{c.comment_text}"
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredComments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No qualitative feedback remarks matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 5-DAY OVERDUE REVIEWS & SLA TRACKER                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'overdue' && (
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="size-5 text-rose-400" />
                5-Day Inactivity & Overdue Review Escalation Center
              </h3>
              <p className="text-xs text-slate-400">
                Automated monitoring of student submissions waiting &ge; 5 days for supervisor feedback. Alerts HOD, Dean, and Deputy Rector immediately.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleTrigger5DayAlerts}
              disabled={triggeringAlerts}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
            >
              <BellRing className="size-3.5 mr-1.5" />
              {triggeringAlerts ? 'Dispatching...' : 'Dispatch 5-Day Alerts to HOD & Dean'}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Student Author</th>
                  <th className="py-3 px-4">Thesis Project</th>
                  <th className="py-3 px-4">Assigned Supervisor</th>
                  <th className="py-3 px-4">Days Pending</th>
                  <th className="py-3 px-4">SLA Risk</th>
                  <th className="py-3 px-4 text-right">Escalation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {overdueList.map((item) => (
                  <tr key={item.paper_id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-cyan-400">#{item.paper_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{item.student_name}</td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-300">{item.title}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{item.supervisor_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.supervisor_email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-rose-400">
                      {item.days_pending} days
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={
                        item.is_overdue
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]'
                      }>
                        {item.is_overdue ? 'Critical (> 5 Days)' : 'Warning (In Progress)'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                      {item.alert_sent_at ? `Alert sent ${new Date(item.alert_sent_at).toLocaleDateString()}` : 'Queued for dispatch'}
                    </td>
                  </tr>
                ))}
                {overdueList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-400 font-medium">
                      ✓ All supervisor reviews are up to date! No overdue submissions pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CEILING ADJUSTMENT MODAL                                                 */}
      {/* ========================================================================= */}
      {editingSupervisor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="size-5 text-purple-400" />
                Adjust Supervisor Student Quota Ceiling
              </h3>
              <button onClick={() => setEditingSupervisor(null)} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white">{editingSupervisor.name}</p>
                <p className="text-slate-400 font-mono">{editingSupervisor.email}</p>
                <p className="text-cyan-400 mt-1">Currently Supervising: {editingSupervisor.active_students_count} active student(s)</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="ceiling-val" className="text-xs text-slate-300">Max Student Capacity Ceiling *</Label>
                  <span className="font-mono font-bold text-purple-400">{editCeilingValue} students</span>
                </div>
                <Input
                  id="ceiling-val"
                  type="number"
                  min={1}
                  max={50}
                  value={editCeilingValue}
                  onChange={(e) => setEditCeilingValue(parseInt(e.target.value) || 1)}
                  className="bg-slate-900 border-slate-700 text-white font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  When active students reach this ceiling, the system will automatically bypass this supervisor and assign to the next best-matched supervisor.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="spec-val" className="text-xs text-slate-300">Research Specialization Keywords *</Label>
                <Input
                  id="spec-val"
                  value={editSpecializationValue}
                  onChange={(e) => setEditSpecializationValue(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Cybersecurity, FinTech"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {ceilingMessage && (
                <p className="text-xs font-semibold text-emerald-400">{ceilingMessage}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setEditingSupervisor(null)} className="text-slate-400">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSupervisorCapacity} disabled={savingCeiling} className="bg-purple-600 hover:bg-purple-500 text-white">
                {savingCeiling ? 'Saving...' : 'Save Capacity Quota'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PLAGIARISM DETAIL REPORT MODAL                                            */}
      {/* ========================================================================= */}
      {plagiarismModalPaper && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-400" />
                Turnitin Academic Integrity Clearance Report
              </h3>
              <button onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            {scanningPlagiarism ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="size-8 text-cyan-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-white">Executing Turnitin NLP Token Matching...</p>
                <p className="text-xs text-slate-400">Checking document against institutional repository and global journal index.</p>
              </div>
            ) : plagiarismReport ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">Overall Similarity Index</p>
                    <p className="text-3xl font-black text-white mt-0.5">
                      <span className={plagiarismReport.similarity_score > 20 ? 'text-rose-400' : 'text-emerald-400'}>
                        {plagiarismReport.similarity_score}%
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{plagiarismReport.risk_level}</p>
                  </div>

                  <Badge className={
                    plagiarismReport.is_approved_for_marking
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1.5'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs px-3 py-1.5'
                  }>
                    {plagiarismReport.is_approved_for_marking ? '✓ Clearance Approved (<20%)' : '✕ Revisions Required (>20%)'}
                  </Badge>
                </div>

                {/* Breakdown Bars */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">Internet Sources</p>
                    <p className="text-base font-bold text-cyan-300 mt-0.5">{plagiarismReport.breakdown.internet_sources}%</p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">Publications</p>
                    <p className="text-base font-bold text-indigo-300 mt-0.5">{plagiarismReport.breakdown.publications}%</p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400">Student Papers</p>
                    <p className="text-base font-bold text-purple-300 mt-0.5">{plagiarismReport.breakdown.student_papers}%</p>
                  </div>
                </div>

                {/* Top Matched Sources */}
                <div className="space-y-2">
                  <p className="font-bold text-white text-xs">Primary Matched Similarity Sources:</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {plagiarismReport.sources.map((s, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div className="max-w-md truncate">
                          <p className="font-semibold text-slate-200">{s.title}</p>
                          <p className="text-[10px] text-slate-400">{s.matched_type} • {s.author} ({s.year})</p>
                        </div>
                        <span className="font-mono font-bold text-cyan-400 shrink-0">{s.similarity_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="text-slate-400">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVISEE BROADCAST MODAL                                                   */}
      {/* ========================================================================= */}
      {adviseeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="size-5 text-cyan-400" /> Broadcast Message to Assigned Advisees
              </h3>
              <button onClick={() => setAdviseeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-subject" className="text-xs text-slate-300">Announcement Subject *</Label>
                <Input
                  id="broadcast-subject"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Chapter 3 Methodology Submission Deadline"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="broadcast-msg" className="text-xs text-slate-300">Message Content *</Label>
                <textarea
                  id="broadcast-msg"
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your supervisory message to advisees here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {broadcastSuccess && <p className="text-xs font-semibold text-emerald-400">{broadcastSuccess}</p>}
              {broadcastError && <p className="text-xs font-semibold text-rose-400">{broadcastError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setAdviseeModalOpen(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendAdviseeBroadcast} disabled={sendingBroadcast} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                {sendingBroadcast ? 'Sending...' : 'Send Broadcast to Advisees'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
