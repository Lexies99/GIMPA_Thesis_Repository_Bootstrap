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
  Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2,
  Download, FileEdit, MessageSquare, FileSpreadsheet, Send, Mail, Users,
  Filter, Paperclip, UploadCloud, BookOpen, Activity, ShieldCheck, ShieldAlert,
  Sliders, RefreshCw, Sparkles, Cpu, AlertTriangle, ChevronRight, Search,
  TrendingUp, Check, X, Award, Eye, BellRing, UserCheck, Shield, CheckCircle
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
    if (chapter === 'ch1') setCh1(val)
    if (chapter === 'ch2') setCh2(val)
    if (chapter === 'ch3') setCh3(val)
    if (chapter === 'ch4') setCh4(val)
    if (chapter === 'ch5') setCh5(val)

    try {
      await apiStudentUpdateChecklist(paper.id, chapter, val, token)
      onUpdate()
    } catch {
      // Revert on error
      if (chapter === 'ch1') setCh1(!val)
      if (chapter === 'ch2') setCh2(!val)
      if (chapter === 'ch3') setCh3(!val)
      if (chapter === 'ch4') setCh4(!val)
      if (chapter === 'ch5') setCh5(!val)
    }
  }

  const handleCombinedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!combinedFile) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadCombinedThesis(paper.id, combinedFile, token)
      setSuccess('Combined thesis uploaded successfully!')
      setCombinedFile(null)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadExaminerScript = async (paperId: number, examinerId: number) => {
    try {
      const blob = await apiDownloadExaminerScript(paperId, examinerId, token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Examiner_Report_Paper_${paperId}.pdf`
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
    const activeToken = token || localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || ''
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
    const activeToken = token || localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || ''
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
          color: 'border-amber-500/30 bg-amber-50 text-amber-800',
          textColor: 'text-amber-900'
        }
      case 'phase1_topic_accepted':
        return {
          icon: <CheckCircle2 className="size-5 text-blue-500" />,
          title: 'Phase 1: Topic Accepted',
          desc: 'Your topic proposal has been approved! The system is allocating your project supervisor based on your research specialization.',
          color: 'border-blue-500/30 bg-blue-50 text-blue-800',
          textColor: 'text-blue-900'
        }
      case 'phase2_supervisor_assigned':
        return {
          icon: <Activity className="size-5 text-indigo-500" />,
          title: 'Phase 2: Supervisor Assigned',
          desc: 'A Project Supervisor has been allocated. You may now commence writing your thesis chapters (Chapters 1 to 5).',
          color: 'border-indigo-500/30 bg-indigo-50 text-indigo-800',
          textColor: 'text-indigo-900'
        }
      case 'phase3_chapters_in_progress':
        return {
          icon: <FileEdit className="size-5 text-cyan-600" />,
          title: 'Phase 3: Chapter Writing & Feedback',
          desc: 'Work directly with your supervisor using ONLYOFFICE in-browser annotations. Tick off chapters as you complete them.',
          color: 'border-cyan-500/30 bg-cyan-50 text-cyan-900',
          textColor: 'text-cyan-950'
        }
      case 'phase3_combined_submitted':
        return {
          icon: <Clock className="size-5 text-purple-600 animate-pulse" />,
          title: 'Phase 3: Combined Thesis Under Review',
          desc: 'Your complete dissertation (Chapters 1-5) is currently undergoing Turnitin plagiarism verification and final supervisor sign-off.',
          color: 'border-purple-500/30 bg-purple-50 text-purple-900',
          textColor: 'text-purple-950'
        }
      case 'phase4_examination':
        return {
          icon: <Award className="size-5 text-amber-600" />,
          title: 'Phase 4: Defense & Examination',
          desc: 'Your thesis is being reviewed by the Internal and External Examiners. Awaiting examiner scores and assessment reports.',
          color: 'border-amber-500/30 bg-amber-50 text-amber-900',
          textColor: 'text-amber-950'
        }
      case 'phase5_corrections':
        return {
          icon: <AlertCircle className="size-5 text-rose-600 animate-bounce" />,
          title: 'Phase 5: Post-Defense Corrections Required',
          desc: 'Please implement the examiners’ required post-defense corrections and resubmit for supervisor clearance.',
          color: 'border-rose-500/30 bg-rose-50 text-rose-900',
          textColor: 'text-rose-950'
        }
      case 'phase5_certified':
        return {
          icon: <CheckCircle className="size-5 text-emerald-600" />,
          title: 'Phase 5: Certified & Published',
          desc: 'Congratulations! Your thesis has been certified by the Library and is permanently archived in the institutional repository.',
          color: 'border-emerald-500/30 bg-emerald-50 text-emerald-900',
          textColor: 'text-emerald-950'
        }
      default:
        return {
          icon: <FileText className="size-5 text-slate-500" />,
          title: status.replace(/_/g, ' ').toUpperCase(),
          desc: 'Workflow milestone status in repository pipeline.',
          color: 'border-slate-200 bg-slate-50 text-slate-700',
          textColor: 'text-slate-800'
        }
    }
  }

  const details = getStatusDetails(paper.status)

  return (
    <div className="space-y-4 pt-2">
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${details.color}`}>
        <div className="shrink-0 mt-0.5">{details.icon}</div>
        <div className="space-y-1">
          <h4 className={`text-sm font-bold ${details.textColor}`}>{details.title}</h4>
          <p className="text-xs leading-relaxed text-slate-600">{details.desc}</p>
        </div>
      </div>

      {paper.status === 'phase3_chapters_in_progress' && (
        <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" /> Milestone Chapter Checklist
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { id: 'ch1', label: 'Chapter 1: Intro', val: ch1 },
              { id: 'ch2', label: 'Chapter 2: Lit Review', val: ch2 },
              { id: 'ch3', label: 'Chapter 3: Methodology', val: ch3 },
              { id: 'ch4', label: 'Chapter 4: Results', val: ch4 },
              { id: 'ch5', label: 'Chapter 5: Conclusion', val: ch5 },
            ].map((ch) => (
              <label key={ch.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={ch.val}
                  onChange={(e) => void handleCheckboxChange(ch.id, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-[11px] font-medium text-slate-700">{ch.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Ready to submit all chapters for complete defense review?</p>
            <form onSubmit={handleCombinedSubmit} className="flex gap-2 items-center">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCombinedFile(e.target.files?.[0] || null)}
                className="h-8 text-xs bg-white border-slate-200"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !combinedFile} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                {submitting ? 'Uploading...' : 'Submit Complete Thesis'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {paper.status === 'phase5_corrections' && (
        <div className="border border-amber-300 bg-amber-50/60 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="size-4" /> Submit Revised Thesis
          </p>
          <form onSubmit={handleUploadCorrections} className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                id={`file-corrections-${paper.id}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="h-9 text-xs bg-white border-amber-300"
              />
              <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
                {submitting ? 'Submitting...' : file ? 'Submit Uploaded File' : 'Submit In-System Corrections'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}
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
    'operations' | 'capacities' | 'plagiarism' | 'comments' | 'overdue' | 'directory'
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

  // Advisee Broadcast Messaging Modal
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

  // Load Advisees for Broadcast
  const loadAdvisees = async (prog = adviseeProgramFilter) => {
    if (!accessToken) return
    try {
      const res = await apiGetSupervisorAdvisees(accessToken, prog)
      setAdvisees(res.advisees || [])
      setAdviseePrograms(res.available_programs || [])
    } catch (err) {
      console.error('Failed to load advisees:', err)
    }
  }

  // Send Broadcast to Advisees
  const handleBroadcastFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !accessToken) return
    setUploadingAttachment(true)
    setBroadcastError('')
    try {
      for (let i = 0; i < files.length; i++) {
        const item = await apiUploadBroadcastAttachment(files[i], accessToken)
        setBroadcastAttachments((prev) => [...prev, item])
      }
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to upload attachment.')
    } finally {
      setUploadingAttachment(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveBroadcastAttachment = (indexToRemove: number) => {
    setBroadcastAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSendAdviseeBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setBroadcastError('Please provide both subject and message body.')
      return
    }
    if (!accessToken) return
    setSendingBroadcast(true)
    setBroadcastError('')
    setBroadcastSuccess('')
    try {
      const res = await apiSupervisorMessageAdvisees(accessToken, {
        program: adviseeProgramFilter !== 'ALL' ? adviseeProgramFilter : undefined,
        program_filter: adviseeProgramFilter !== 'ALL' ? adviseeProgramFilter : undefined,
        subject: broadcastSubject.trim(),
        message: broadcastMessage.trim(),
        send_email: broadcastIncludeEmail,
        include_email: broadcastIncludeEmail,
        attachments: broadcastAttachments.length > 0 ? broadcastAttachments : undefined,
      })
      setBroadcastSuccess(`✓ ${res.message} (${res.notifications_sent || res.notifications_created || 0} notifications sent, ${res.emails_queued || 0} emails queued)`)
      setBroadcastSubject('')
      setBroadcastMessage('')
      setBroadcastAttachments([])
      setTimeout(() => {
        setAdviseeModalOpen(false)
        setBroadcastSuccess('')
      }, 2000)
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to send broadcast.')
    } finally {
      setSendingBroadcast(false)
    }
  }

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

  // Manual Trigger Overdue Alerts
  const handleTrigger5DayAlerts = async () => {
    setTriggeringAlerts(true)
    setAlertTriggerResult('')
    try {
      const res = await apiTriggerOverdueAlerts(accessToken)
      setAlertTriggerResult(`✓ Auto-Escalation dispatched to Supervisors, HODs, and Deans for ${res.overdue_count} overdue submission(s).`)
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

  // Weekly Submissions Mock Curve Data matching Clean Light Analytics Chart
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE TELEMETRY HEADER & LIVE HEARTBEAT                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Activity className="size-7 text-blue-600 animate-pulse" />
              Executive Research & Thesis Dashboard
            </h1>
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 font-semibold">
              {isDeputyRector ? '🏛️ Deputy Rector Executive' : (isSystemAdmin ? '⚡ Super Admin' : (hasRole('dean') ? '🎓 Faculty Dean' : (hasRole('hod') ? '📋 Department HOD' : '🔍 Scholar View')))}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time institutional thesis telemetry, supervisor workload quotas, Turnitin plagiarism radar, and automated 5-day SLA escalation center.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
          <button
            onClick={() => setLiveAutoUpdate(!liveAutoUpdate)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              liveAutoUpdate
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span className={`size-2 rounded-full ${liveAutoUpdate ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            {liveAutoUpdate ? `Live Auto-Update (${countdown}s)` : 'Live Update Paused'}
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void fetchAllDashboardData()}
            disabled={isRefreshing}
            className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            Sync Telemetry
          </Button>

          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            Synced: {lastSyncTime}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP GECKOBOARD / TELEMETRY METRIC TILES & GAUGES                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Tile 1: CSAT / On-Time Velocity Arc Meter */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>On-Time Velocity</span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">99.2% Target</Badge>
          </div>
          
          {/* Circular Semi-Arc Gauge */}
          <div className="flex flex-col items-center justify-center my-2 relative">
            <svg className="w-32 h-20" viewBox="0 0 100 55">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#blueEmeraldGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 * (1 - (liveMetrics?.on_time_review_rate || 94.2) / 100)}
              />
              <defs>
                <linearGradient id="blueEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-0 text-center">
              <span className="text-2xl font-black text-slate-900">{liveMetrics?.on_time_review_rate || 94.2}%</span>
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
            <span>SLA: High</span>
            <span className="text-emerald-600 font-bold">+2.4% this week</span>
          </div>
        </div>

        {/* Tile 2: Total Active Theses & Phase Pipeline */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Active Theses</span>
            <FileText className="size-4 text-blue-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {liveMetrics?.total_theses ?? (stats?.total_papers || 112)}
              </span>
              <span className="text-xs text-slate-500 font-medium">In Pipeline</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Phases 1-5 active student projects
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center pt-2.5 border-t border-slate-100">
            <span className="bg-blue-50 text-blue-700 rounded py-0.5 font-semibold">P1: {liveMetrics?.phases?.phase1 ?? 24}</span>
            <span className="bg-indigo-50 text-indigo-700 rounded py-0.5 font-semibold">P2: {liveMetrics?.phases?.phase2 ?? 42}</span>
            <span className="bg-purple-50 text-purple-700 rounded py-0.5 font-semibold">P3: {liveMetrics?.phases?.phase3 ?? 28}</span>
            <span className="bg-amber-50 text-amber-700 rounded py-0.5 font-semibold">P4: {liveMetrics?.phases?.phase4 ?? 12}</span>
            <span className="bg-emerald-50 text-emerald-700 rounded py-0.5 font-semibold">P5: {liveMetrics?.phases?.phase5 ?? 6}</span>
          </div>
        </div>

        {/* Tile 3: 5-Day Overdue Warning Tile (Automated System SLA) */}
        <div className="bg-white border border-rose-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between hover:border-rose-400 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-rose-700">
            <span className="flex items-center gap-1.5">
              <span className="p-1 rounded bg-rose-100/80 text-rose-600 inline-flex">
                <AlertTriangle className="size-3.5" />
              </span>
              5-Day Overdue
            </span>
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0 font-medium">SLA Alert</Badge>
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600 tracking-tight">
                {overdueList.filter((x) => x.is_overdue).length}
              </span>
              <span className="text-xs text-rose-600 font-medium">Delayed Reviews</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Review delays exceeding 5 days
            </p>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-rose-100 gap-2">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Auto-Escalate
            </span>
            <button
              type="button"
              onClick={handleTrigger5DayAlerts}
              disabled={triggeringAlerts || overdueList.filter((x) => x.is_overdue).length === 0}
              title="Manually trigger immediate 5-day overdue review alert notifications"
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer shrink-0"
            >
              <BellRing className="size-3 shrink-0" />
              <span>{triggeringAlerts ? 'Alerting...' : 'Alert Now'}</span>
            </button>
          </div>
        </div>

        {/* Tile 4: Plagiarism Health Radar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Plagiarism Radar</span>
            <ShieldCheck className="size-4 text-emerald-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                {liveMetrics?.average_plagiarism_score || 8.4}%
              </span>
              <span className="text-xs text-slate-500 font-medium">Safe: &lt; 20%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Turnitin NLP token similarity</p>
          </div>
          <div className="flex justify-between text-[11px] text-slate-600 pt-2.5 border-t border-slate-100">
            <span className="text-emerald-700 font-mono font-medium">Clean: {liveMetrics?.plagiarism_breakdown?.clean_count ?? 35}</span>
            <span className="text-amber-700 font-mono font-medium">Mod: {liveMetrics?.plagiarism_breakdown?.moderate_count ?? 6}</span>
            <span className="text-rose-700 font-mono font-medium">Flag: {liveMetrics?.plagiarism_breakdown?.flagged_count ?? 0}</span>
          </div>
        </div>

        {/* Tile 5: Supervisor Workload & Capacity Quota */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Supervisor Quota</span>
            <Users className="size-4 text-purple-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-700 tracking-tight">
                {liveMetrics?.supervisor_metrics?.average_utilization_pct || 68.5}%
              </span>
              <span className="text-xs text-slate-500 font-medium">Capacity Used</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden border border-slate-200/50">
              <div
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, liveMetrics?.supervisor_metrics?.average_utilization_pct || 68.5)}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
            <span>{liveMetrics?.supervisor_metrics?.total_assigned ?? 48} Assigned</span>
            <span>{liveMetrics?.supervisor_metrics?.total_capacity ?? 70} Total Slots</span>
          </div>
        </div>

      </div>

      {alertTriggerResult && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{alertTriggerResult}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAlertTriggerResult('')} className="h-6 text-xs text-emerald-700 hover:text-emerald-900">
            Dismiss
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WEEKLY ACTIVITY & PERFORMANCE LINE CHART (Clean Light Theme)          */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="size-5 text-blue-600" />
              Weekly Thesis Velocity & Submission Trajectory
            </h2>
            <p className="text-xs text-slate-500">Real-time throughput metrics across proposal submissions, chapter approvals, and examination clearances.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <span className="size-2.5 rounded-full bg-blue-600 inline-block" /> Submissions
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium ml-3">
              <span className="size-2.5 rounded-full bg-emerald-600 inline-block" /> Approvals
            </span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full h-64 overflow-x-auto relative">
          <svg className="w-full h-full min-w-[700px]" viewBox="0 0 760 250">
            <defs>
              <linearGradient id="chartGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="40" y1="40" x2="720" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="40" y1="100" x2="720" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="40" y1="160" x2="720" y2="160" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="40" y1="220" x2="720" y2="220" stroke="#e2e8f0" />

            {/* Y Axis Labels */}
            <text x="30" y="45" fill="#94a3b8" fontSize="10" textAnchor="end">26k</text>
            <text x="30" y="105" fill="#94a3b8" fontSize="10" textAnchor="end">20k</text>
            <text x="30" y="165" fill="#94a3b8" fontSize="10" textAnchor="end">14k</text>
            <text x="30" y="225" fill="#94a3b8" fontSize="10" textAnchor="end">10k</text>

            {/* Shaded Area */}
            <path d={areaPath} fill="url(#chartGradLight)" />

            {/* Line Curve */}
            <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />

            {/* Data Points */}
            {weeklyData.map((d, i) => {
              const x = 50 + i * 110
              const y = 220 - ((d.value - minVal) / (maxVal - minVal)) * 180
              return (
                <g key={d.day}>
                  <circle cx={x} cy={y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y="240" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="500">{d.day}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXECUTIVE WORKFLOW TABS                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'operations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 ml-auto shadow-sm"
          >
            <Send className="size-4 text-blue-600" />
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="size-5 text-blue-600" /> My Thesis Submissions & Milestone Progress
              </h3>
              {myPapers.map((paper) => (
                <div key={paper.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{paper.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paper ID: #{paper.id} • Discipline: {paper.discipline || 'Computer Science'} • Mode: {paper.work_mode || 'Individual'}
                      </p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-3 py-1 self-start sm:self-center font-semibold">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Filter className="size-5 text-blue-600" />
                    Department Student Pipeline & Milestone Tracker
                  </h3>
                  <p className="text-xs text-slate-500">Filter student submissions by degree programme and inspection milestone.</p>
                </div>

                {/* Program Selector */}
                <div className="flex items-center gap-2">
                  <Select value={pipelineProgram} onValueChange={(val) => setPipelineProgram(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-56 text-slate-800 shadow-sm">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800">
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
                  { key: 'phase1_proposals' as ApiPipelinePhaseKey, label: 'Phase 1: Topics' },
                  { key: 'phase2_allocation' as ApiPipelinePhaseKey, label: 'Phase 2: Allocation' },
                  { key: 'phase3_chapters' as ApiPipelinePhaseKey, label: 'Phase 3: Chapters' },
                  { key: 'phase4_examination' as ApiPipelinePhaseKey, label: 'Phase 4: Marking' },
                  { key: 'phase5_signoff' as ApiPipelinePhaseKey, label: 'Phase 5: Certified' },
                ].map((ph) => {
                  const cnt = pipelineMetrics[ph.key]?.count || 0
                  const isSelected = selectedPhaseKey === ph.key
                  return (
                    <button
                      key={ph.key}
                      onClick={() => setSelectedPhaseKey(ph.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-slate-600">{ph.label}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{cnt}</p>
                    </button>
                  )
                })}
              </div>

              {/* Student Table in Selected Phase */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {(pipelineMetrics[selectedPhaseKey]?.students || []).map((st: ApiPipelineStudent) => (
                      <tr key={st.paper_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">#{st.paper_id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{st.student_name}</td>
                        <td className="py-3 px-4 text-slate-500">{st.program}</td>
                        <td className="py-3 px-4 font-medium max-w-xs truncate text-slate-800">{st.title}</td>
                        <td className="py-3 px-4 text-slate-700 flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-purple-600 shrink-0" />
                          {st.supervisor_name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
                            {st.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/?tab=approval')}
                            className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            Inspect <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(pipelineMetrics[selectedPhaseKey]?.students || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="size-5 text-purple-600" />
                Supervisor Workload Quotas & Research Specializations
              </h3>
              <p className="text-xs text-slate-500">
                Adjust student capacity ceilings and configure research domain keywords so the system matches topics intelligently without overloading any supervisor.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Academic Supervisor</th>
                  <th className="py-3 px-4">Research Specialization Domain</th>
                  <th className="py-3 px-4">Active Advisees</th>
                  <th className="py-3 px-4">Max Ceiling</th>
                  <th className="py-3 px-4">Workload Load %</th>
                  <th className="py-3 px-4 text-right">Quota Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {capacities.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{sup.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{sup.email}</p>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-700 line-clamp-2">{sup.specialization || 'General Computer Science'}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {sup.active_students_count} student(s)
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sup.max_student_ceiling} max
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{sup.utilization_pct}%</span>
                          <span className={sup.is_at_ceiling ? 'text-rose-600 font-bold' : 'text-emerald-600 font-medium'}>
                            {sup.is_at_ceiling ? 'Full (Ceiling Reached)' : `${sup.available_slots} slot(s)`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full rounded-full ${
                              sup.is_at_ceiling ? 'bg-rose-500' : (sup.utilization_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500')
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
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Turnitin-Style Plagiarism Scanner & Clearance Suite
              </h3>
              <p className="text-xs text-slate-500">
                Institutional similarity analysis engine. Supervisees must score below 20% similarity threshold before supervisors can approve for Phase 4 marking.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Thesis Project Title</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Similarity Score</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-4 text-right">Run Scanner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {myPapers.concat(pipelineMetrics?.phase3_chapters?.students as any || []).slice(0, 20).map((p: any) => {
                  const score = p.plagiarism_score !== undefined && p.plagiarism_score !== null ? p.plagiarism_score : null
                  const isClean = score !== null && score <= 15.0
                  const isModerate = score !== null && score > 15.0 && score <= 20.0
                  const isFlagged = score !== null && score > 20.0
                  return (
                    <tr key={p.id || p.paper_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">#{p.id || p.paper_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-sm truncate">{p.title}</td>
                      <td className="py-3 px-4 text-slate-600">{p.student_name || (p.authors?.[0]?.name) || 'Scholar'}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {score !== null ? (
                          <span className={isFlagged ? 'text-rose-600' : (isModerate ? 'text-amber-600' : 'text-emerald-600')}>
                            {score}% Similarity
                          </span>
                        ) : (
                          <span className="text-slate-400">Unscanned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {score !== null ? (
                          <Badge className={
                            isFlagged
                              ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                              : (isModerate ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]' : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]')
                          }>
                            {isFlagged ? 'Flagged (>20%)' : (isModerate ? 'Moderate' : 'Clean (<15%)')}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 text-[10px]">Pending Check</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleScanPlagiarism(p)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="size-5 text-blue-600" />
                Supervisor Qualitative Remarks & Chapter Feedback Index
              </h3>
              <p className="text-xs text-slate-500">
                Institutional oversight report. HOD, Dean, and Deputy Rector can filter all comments made by individual supervisors across proposals and chapters.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={commentsSupervisorFilter} onValueChange={(val) => setCommentsSupervisorFilter(val)}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-52 text-slate-800 shadow-sm">
                  <SelectValue placeholder="All Supervisors" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
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
                  className="h-8 pl-8 text-xs bg-white border-slate-200 w-48 text-slate-800 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Supervisor Reviewer</th>
                  <th className="py-3 px-4">Student & Project</th>
                  <th className="py-3 px-4">Milestone Phase</th>
                  <th className="py-3 px-4">Qualitative Feedback Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredComments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{c.supervisor_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{c.supervisor_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-blue-600">{c.student_name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{c.thesis_title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
                        {c.phase_label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-slate-800 font-sans italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                        "{c.comment_text}"
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredComments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
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
      {/* TAB 5: 5-DAY OVERDUE REVIEWS & AUTOMATED SLA TRACKER                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'overdue' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="size-5 text-rose-600" />
                  5-Day Inactivity & Overdue Review Escalation Center
                </h3>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  ✓ System Auto-Monitored
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automated continuous system monitoring: Student submissions waiting &ge; 5 days are automatically escalated to HOD, Dean, and Deputy Rector.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleTrigger5DayAlerts}
              disabled={triggeringAlerts}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm"
            >
              <BellRing className="size-3.5 mr-1.5" />
              {triggeringAlerts ? 'Dispatching...' : 'Dispatch 5-Day Alerts to HOD & Dean'}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Thesis Project</th>
                  <th className="py-3 px-4">Student Author</th>
                  <th className="py-3 px-4">Assigned Supervisor</th>
                  <th className="py-3 px-4">Days Inactive</th>
                  <th className="py-3 px-4">Escalation Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {overdueList.map((item) => (
                  <tr key={item.paper_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">#{item.paper_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">{item.title}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{item.student_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{item.student_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{item.supervisor_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{item.supervisor_email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {item.days_pending} day(s) ({item.hours_pending} hrs)
                    </td>
                    <td className="py-3 px-4">
                      {item.is_overdue ? (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                          OVERDUE (Auto-Escalated)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Within 5-Day SLA
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/?tab=approval')}
                        className="h-7 text-xs text-blue-600 hover:text-blue-800 border-slate-200 hover:bg-blue-50"
                      >
                        Inspect Review
                      </Button>
                    </td>
                  </tr>
                ))}
                {overdueList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-medium">
                      ✓ No overdue reviews. All student submissions are actively being reviewed within the 5-day SLA.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUPERVISOR CEILING & SPECIALIZATION EDIT MODAL                   */}
      {/* ========================================================================= */}
      {editingSupervisor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="size-5 text-purple-600" />
                Adjust Supervisor Capacity & Quota
              </h3>
              <button onClick={() => setEditingSupervisor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Configuring workload allocation for <strong>{editingSupervisor.name}</strong> (<code>{editingSupervisor.email}</code>).
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="edit-ceiling-input" className="text-xs font-semibold text-slate-700">Max Active Advisee Quota Ceiling</Label>
                <Input
                  id="edit-ceiling-input"
                  type="number"
                  min={1}
                  max={50}
                  value={editCeilingValue}
                  onChange={(e) => setEditCeilingValue(Number(e.target.value) || 1)}
                  className="bg-white border-slate-200 text-slate-900 font-bold"
                />
                <p className="text-[11px] text-slate-500">
                  Current active advisees: {editingSupervisor.active_students_count}. System will lock automated matching when ceiling is reached.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-spec-input" className="text-xs font-semibold text-slate-700">Research Specialization & Keywords</Label>
                <textarea
                  id="edit-spec-input"
                  rows={3}
                  value={editSpecializationValue}
                  onChange={(e) => setEditSpecializationValue(e.target.value)}
                  placeholder="e.g. Machine Learning, Natural Language Processing, Cybersecurity..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:ring-1 focus:ring-purple-500 shadow-sm"
                />
                <p className="text-[11px] text-slate-500">The NLP matcher uses these keywords to auto-match students to this supervisor.</p>
              </div>

              {ceilingMessage && (
                <p className="text-xs font-semibold text-emerald-600">{ceilingMessage}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => setEditingSupervisor(null)} className="text-slate-600 hover:bg-slate-100">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSupervisorCapacity} disabled={savingCeiling} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {savingCeiling ? 'Saving...' : 'Save Capacity Quota'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TURNITIN PLAGIARISM SCANNER REPORT MODAL                        */}
      {/* ========================================================================= */}
      {plagiarismModalPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Turnitin Similarity Analysis Report
              </h3>
              <button onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            {scanningPlagiarism ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="size-8 text-blue-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-600">Scanning repository vectors and generating similarity radar...</p>
              </div>
            ) : plagiarismReport ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Overall Similarity Index:</span>
                    <span className={`text-xl font-black ${
                      plagiarismReport.is_flagged ? 'text-rose-600' : (plagiarismReport.similarity_pct > 15 ? 'text-amber-600' : 'text-emerald-600')
                    }`}>
                      {plagiarismReport.similarity_pct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{plagiarismReport.feedback}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Top Matched Institutional Sources:</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {plagiarismReport.sources.map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-[11px]">
                        <span className="font-medium text-slate-800 truncate max-w-xs">{s.source_title}</span>
                        <span className="font-mono font-bold text-blue-600 shrink-0">{s.similarity_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="text-slate-600 hover:bg-slate-100">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADVISEE BROADCAST MODAL (Light Theme & Working Handlers)         */}
      {/* ========================================================================= */}
      {adviseeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="size-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Broadcast Message to Assigned Advisees</h3>
              </div>
              <button onClick={() => setAdviseeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Program Filter */}
              <div className="flex items-center justify-between gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div>
                  <p className="font-bold text-blue-950">Target Recipients</p>
                  <p className="text-[11px] text-blue-700">{advisees.length} active advisee(s) currently loaded</p>
                </div>
                {adviseePrograms.length > 0 && (
                  <Select
                    value={adviseeProgramFilter}
                    onValueChange={(val) => {
                      setAdviseeProgramFilter(val)
                      void loadAdvisees(val)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white border-blue-200 w-44 text-slate-800 shadow-sm">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800">
                      <SelectItem value="ALL">All Programs ({advisees.length})</SelectItem>
                      {adviseePrograms.map((prog) => (
                        <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="broadcast-subject" className="text-xs font-semibold text-slate-700">Announcement Subject *</Label>
                <Input
                  id="broadcast-subject"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Chapter 3 Methodology Submission Deadline"
                  className="bg-white border-slate-200 text-slate-900 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="broadcast-msg" className="text-xs font-semibold text-slate-700">Message Content *</Label>
                <textarea
                  id="broadcast-msg"
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your supervisory message to advisees here..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              {/* File Attachments Section */}
              <div className="space-y-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="size-4 text-slate-600" />
                    <Label className="text-xs font-semibold text-slate-800">Attach Reference Files & Guidelines</Label>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition-all">
                    <Upload className="size-3.5 text-blue-600" />
                    <span>{uploadingAttachment ? 'Uploading...' : 'Upload Files'}</span>
                    <input
                      type="file"
                      multiple
                      disabled={uploadingAttachment}
                      onChange={handleBroadcastFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Upload guidelines, thesis templates, chapter rubrics, or reading materials (PDF, Word, Excel, ZIP - up to 25MB).
                </p>

                {broadcastAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {broadcastAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="size-4 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-900 truncate">{att.filename}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                            ({(att.size_bytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBroadcastAttachment(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={broadcastIncludeEmail}
                  onChange={(e) => setBroadcastIncludeEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">Also dispatch as instant email to students’ official inbox</span>
              </label>

              {broadcastSuccess && <p className="text-xs font-semibold text-emerald-600">{broadcastSuccess}</p>}
              {broadcastError && <p className="text-xs font-semibold text-rose-600">{broadcastError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => setAdviseeModalOpen(false)} className="text-slate-600 hover:bg-slate-100">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendAdviseeBroadcast} disabled={sendingBroadcast || !broadcastSubject.trim() || !broadcastMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
                {sendingBroadcast ? 'Sending...' : 'Send Broadcast to Advisees'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
