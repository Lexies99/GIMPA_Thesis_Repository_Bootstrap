import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  apiGetDepartmentSupervisorReviewSummary,
  apiGetMyPapers,
  apiGetPaperStats,
  apiListStudents,
  apiListUsers,
  apiGetPipelineMetrics,
  apiGetSupervisorAdvisees,
  apiSupervisorMessageAdvisees,
  apiUploadBroadcastAttachment,
  apiStudentUpdateChecklist,
  apiUploadCombinedThesis,
  apiDownloadExaminerScript,
  apiUploadCorrections,
  apiGetSupervisorCapacities,
  apiUpdateSupervisorCapacity,
  apiCheckPlagiarism,
  apiGetSupervisorCommentsReport,
  apiGetOverdueReviews,
  apiTriggerOverdueAlerts,
  apiGetDashboardLiveMetrics,
} from '../../lib/api'
import type {
  ApiPaper,
  ApiPaperStats,
  ApiStudent,
  ApiSupervisorReviewSummary,
  ApiUser,
  ApiPipelineMetrics,
  ApiPipelinePhaseKey,
  ApiPipelineStudent,
  ApiSupervisorAdvisee,
  BroadcastAttachmentItem,
  ApiSupervisorCapacityItem,
  ApiPlagiarismReport,
  ApiSupervisorCommentEntry,
  ApiOverdueReviewItem,
  ApiDashboardLiveMetrics,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import {
  Upload, FileText, CheckCircle2, Clock, AlertCircle, Trash2,
  FileEdit, MessageSquare, Send, Users,
  Filter, Paperclip, BookOpen, Activity, ShieldCheck,
  Sliders, RefreshCw, AlertTriangle, ChevronRight, Search,
  TrendingUp, Check, X, Award, BellRing, UserCheck, CheckCircle,
  ExternalLink, FolderOpen, BarChart3, ArrowUpRight, ArrowDownRight, User
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
          title: 'Phase 1: Topic Submitted',
          desc: 'Your thesis topic has been submitted and is awaiting review by the Head of Department (HOD) / Project Coordinator.',
        }
      case 'phase1_topic_accepted':
        return {
          title: 'Phase 1: Topic Accepted',
          desc: 'Your topic proposal has been approved. The system is allocating your project supervisor.',
        }
      case 'phase2_supervisor_assigned':
        return {
          title: 'Phase 2: Supervisor Assigned',
          desc: 'A Project Supervisor has been allocated. You may now commence writing your thesis chapters (Chapters 1 to 5).',
        }
      case 'phase3_chapters_in_progress':
        return {
          title: 'Phase 3: Chapter Writing & Feedback',
          desc: 'Work directly with your supervisor using ONLYOFFICE in-browser annotations. Tick off chapters as you complete them.',
        }
      case 'phase3_combined_submitted':
        return {
          title: 'Phase 3: Combined Thesis Under Review',
          desc: 'Your complete dissertation (Chapters 1-5) is undergoing Turnitin verification and final supervisor sign-off.',
        }
      case 'phase4_examination':
        return {
          title: 'Phase 4: Defense & Examination',
          desc: 'Your thesis is being reviewed by Internal and External Examiners.',
        }
      case 'phase5_corrections':
        return {
          title: 'Phase 5: Post-Defense Corrections Required',
          desc: 'Please implement the examiners’ required post-defense corrections and resubmit for supervisor clearance.',
        }
      case 'phase5_certified':
        return {
          title: 'Phase 5: Certified & Published',
          desc: 'Congratulations! Your thesis has been certified by the Library and is permanently archived in the institutional repository.',
        }
      default:
        return {
          title: status.replace(/_/g, ' ').toUpperCase(),
          desc: 'Workflow milestone status in repository pipeline.',
        }
    }
  }

  const details = getStatusDetails(paper.status)

  return (
    <div className="space-y-4 pt-2">
      <div className="p-4 rounded-xl bg-white border border-[#eaece4] flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#dce7d0] flex items-center justify-center text-[#1a1d1a] shrink-0">
          <FileText className="size-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[14px] font-bold text-[#1a1d1a]">{details.title}</h4>
          <p className="text-[13px] leading-relaxed text-[#6e766b]">{details.desc}</p>
        </div>
      </div>

      {paper.status === 'phase3_chapters_in_progress' && (
        <div className="border border-[#eaece4] bg-white rounded-xl p-5 space-y-4">
          <p className="text-[13px] font-bold text-[#1a1d1a] flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#3b7a57]" /> Milestone Chapter Checklist
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            {[
              { id: 'ch1', label: 'Chapter 1: Intro', val: ch1 },
              { id: 'ch2', label: 'Chapter 2: Lit Review', val: ch2 },
              { id: 'ch3', label: 'Chapter 3: Methodology', val: ch3 },
              { id: 'ch4', label: 'Chapter 4: Results', val: ch4 },
              { id: 'ch5', label: 'Chapter 5: Conclusion', val: ch5 },
            ].map((ch) => (
              <label key={ch.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#fafbf8] border border-[#eaece4] cursor-pointer hover:bg-[#f0f4ea] transition-colors">
                <input
                  type="checkbox"
                  checked={ch.val}
                  onChange={(e) => void handleCheckboxChange(ch.id, e.target.checked)}
                  className="rounded text-[#5a6552] focus:ring-[#5a6552] h-4 w-4"
                />
                <span className="text-[12px] font-medium text-[#1a1d1a]">{ch.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-[#eaece4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[13px] text-[#6e766b]">Ready to submit all chapters for complete defense review?</p>
            <form onSubmit={handleCombinedSubmit} className="flex gap-2.5 items-center">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCombinedFile(e.target.files?.[0] || null)}
                className="h-9 text-xs bg-white"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !combinedFile}>
                {submitting ? 'Uploading...' : 'Submit Complete Thesis'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {paper.status === 'phase5_corrections' && (
        <div className="border border-[#eaece4] bg-white rounded-xl p-5 space-y-3">
          <p className="text-[13px] font-bold text-[#c93b2b] flex items-center gap-1.5">
            <AlertCircle className="size-4" /> Submit Revised Thesis
          </p>
          <form onSubmit={handleUploadCorrections} className="space-y-3">
            <div className="flex gap-2.5 items-center">
              <Input
                id={`file-corrections-${paper.id}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="h-9 text-xs bg-white"
              />
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Submitting...' : file ? 'Submit Uploaded File' : 'Submit In-System Corrections'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="text-xs text-[#c93b2b] font-medium">{error}</p>}
      {success && <p className="text-xs text-[#3b7a57] font-medium">{success}</p>}
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

  // Active Sub-Tab matching FinPlanner pills
  const [activeSubTab, setActiveSubTab] = useState<
    'welcome' | 'reporting' | 'operations' | 'capacities' | 'plagiarism' | 'comments' | 'overdue'
  >('welcome')

  // Live Telemetry Auto-Update Engine
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
  const [pipelineAllPrograms, setPipelineAllPrograms] = useState<string[]>([])
  const [commentsSupervisorFilter, setCommentsSupervisorFilter] = useState<string>('ALL')
  const [commentsSearch, setCommentsSearch] = useState('')

  // Ceiling Edit Modal
  const [editingSupervisor, setEditingSupervisor] = useState<ApiSupervisorCapacityItem | null>(null)
  const [editCeilingValue, setEditCeilingValue] = useState<number>(5)
  const [editSpecializationValue, setEditSpecializationValue] = useState<string>('')
  const [savingCeiling, setSavingCeiling] = useState(false)
  const [ceilingMessage, setCeilingMessage] = useState('')

  // Plagiarism Scanner Modal
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

  useEffect(() => {
    void fetchAllDashboardData()
  }, [])

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

  // Summary numbers
  const p1Count = liveMetrics?.phases?.phase1 ?? 24
  const p2Count = liveMetrics?.phases?.phase2 ?? 42
  const p3Count = liveMetrics?.phases?.phase3 ?? 28
  const p4Count = liveMetrics?.phases?.phase4 ?? 12
  const p5Count = liveMetrics?.phases?.phase5 ?? 6
  const totalTheses = liveMetrics?.total_theses ?? (stats?.total_papers || (p1Count + p2Count + p3Count + p4Count + p5Count))
  const overdueCount = overdueList.filter((x) => x.is_overdue).length

  // Stacked vertical bar data for Image 4 ("Inflow & Income" -> "Submissions & Approvals")
  const monthlyBarData = [
    { label: '1/26', bottomPct: 38, topPct: 28 },
    { label: '2/26', bottomPct: 48, topPct: 26 },
    { label: '3/26', bottomPct: 56, topPct: 32 },
    { label: '4/26', bottomPct: 35, topPct: 22 },
    { label: '5/26', bottomPct: 62, topPct: 28 },
    { label: '6/26', bottomPct: 42, topPct: 30 },
    { label: '7/26', bottomPct: 32, topPct: 34 },
    { label: '8/26', bottomPct: 45, topPct: 28 },
    { label: '9/26', bottomPct: 58, topPct: 24 },
    { label: '10/26', bottomPct: 28, topPct: 30 },
    { label: '11/26', bottomPct: 64, topPct: 26 },
    { label: '12/26', bottomPct: 40, topPct: 34 },
  ]

  // Recent / Upcoming items for Image 4 top-right card
  const recentActivityRows = useMemo(() => {
    const items: Array<{
      date: string
      metric: string
      isNegative: boolean
      author: string
      tag: string
      darkTag: boolean
    }> = []

    myPapers.slice(0, 3).forEach((p) => {
      items.push({
        date: p.publication_date ? new Date(p.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '14/11/26',
        metric: `+ID #${p.id}`,
        isNegative: p.status === 'rejected' || p.status === 'phase5_corrections',
        author: p.authors?.[0]?.name || user?.name || 'Scholar',
        tag: p.status.replace(/^phase\d_/, '').replace(/_/g, ' '),
        darkTag: p.status.includes('combined') || p.status.includes('examination'),
      })
    })

    overdueList.slice(0, 3).forEach((o) => {
      if (items.length < 5) {
        items.push({
          date: '15/11/26',
          metric: `-${o.days_pending}d SLA`,
          isNegative: true,
          author: o.student_name,
          tag: 'Overdue',
          darkTag: true,
        })
      }
    })

    const defaults = [
      { date: '14/11/26', metric: '+92% Sim.', isNegative: false, author: 'K. Boateng', tag: 'Approved', darkTag: false },
      { date: '14/11/26', metric: '+Ch. 1-3', isNegative: false, author: 'A. Mensah', tag: 'Proposal', darkTag: false },
      { date: '15/11/26', metric: '-5d Delay', isNegative: true, author: 'E. Osei', tag: 'Review', darkTag: true },
      { date: '15/11/26', metric: '+Ch. 1-5', isNegative: false, author: 'M. Appiah', tag: 'Defense', darkTag: true },
      { date: '15/11/26', metric: '+Certified', isNegative: false, author: 'D. Asante', tag: 'Archive', darkTag: false },
    ]

    while (items.length < 5) {
      items.push(defaults[items.length])
    }
    return items.slice(0, 5)
  }, [myPapers, overdueList, user?.name])

  return (
    <div className="space-y-8">
      {/* ── PAGE HEADER & SUB-NAVIGATION PILLS (FinPlanner Images 4 & 7) ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
            {activeSubTab === 'welcome' ? 'Welcome!' : activeSubTab === 'reporting' ? 'Reporting' : 'Repository Operations'}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSupervisor && (
              <Button
                size="sm"
                onClick={() => {
                  void loadAdvisees()
                  setAdviseeModalOpen(true)
                }}
              >
                + Broadcast to advisees
              </Button>
            )}

            <button
              type="button"
              onClick={() => void fetchAllDashboardData()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#fafbf8] hover:bg-[#f0f4ea] border border-[#eaece4] text-[12px] font-semibold text-[#6e766b] hover:text-[#1a1d1a] transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-[#5a6552]' : ''}`} />
              <span>{liveAutoUpdate ? `Synced (${countdown}s)` : 'Sync now'}</span>
            </button>
          </div>
        </div>

        {/* FinPlanner Sub-Navigation Pills (Image 7) */}
        <div className="flex flex-wrap items-center gap-2.5 pb-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('welcome')}
            className={`fp-subnav-pill ${activeSubTab === 'welcome' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
          >
            <BookOpen className="size-3.5" />
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reporting')}
            className={`fp-subnav-pill ${activeSubTab === 'reporting' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
          >
            <BarChart3 className="size-3.5" />
            Reporting & KPIs
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('operations')}
            className={`fp-subnav-pill ${activeSubTab === 'operations' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
          >
            <FolderOpen className="size-3.5" />
            Phase Pipeline
          </button>

          {canManageCeilings && (
            <button
              type="button"
              onClick={() => setActiveSubTab('capacities')}
              className={`fp-subnav-pill ${activeSubTab === 'capacities' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <Sliders className="size-3.5" />
              Supervisor Quotas ({capacities.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('plagiarism')}
            className={`fp-subnav-pill ${activeSubTab === 'plagiarism' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
          >
            <ShieldCheck className="size-3.5" />
            Plagiarism Radar
          </button>

          {canManageCeilings && (
            <button
              type="button"
              onClick={() => setActiveSubTab('comments')}
              className={`fp-subnav-pill ${activeSubTab === 'comments' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <MessageSquare className="size-3.5" />
              Remarks ({commentsReport.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('overdue')}
            className={`fp-subnav-pill ${activeSubTab === 'overdue' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
          >
            <Clock className="size-3.5" />
            5-Day SLA ({overdueCount})
          </button>
        </div>
      </div>

      {alertTriggerResult && (
        <div className="p-4 rounded-xl bg-[#dce7d0] text-[#1a1d1a] text-[13px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-[#3b7a57] shrink-0" />
            <span className="font-medium">{alertTriggerResult}</span>
          </div>
          <button onClick={() => setAlertTriggerResult('')} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: WELCOME! BENTO GRID (Matches FinPlanner Image 4)                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'welcome' && (
        <div className="space-y-8">
          {/* Top Row of 2x2 Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top-Left Card: "My accounts" style summary breakdown */}
            <div className="fp-card flex flex-col justify-between">
              <h2 className="text-[18px] font-bold text-[#1a1d1a] mb-6">
                Repository pipeline
              </h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#1a1d1a]">Proposals & Topics (Phase 1–2)</span>
                  <span className="text-[20px] font-bold text-[#1a1d1a]">{p1Count + p2Count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#1a1d1a]">Chapters in Progress (Phase 3)</span>
                  <span className="text-[20px] font-bold text-[#1a1d1a]">{p3Count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#1a1d1a]">Examination & Marking (Phase 4)</span>
                  <span className="text-[20px] font-bold text-[#1a1d1a]">{p4Count}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#eaece4]">
                  <span className="text-[14px] font-medium text-[#1a1d1a]">Total Active Theses</span>
                  <span className="text-[20px] font-bold text-[#1a1d1a]">{totalTheses}</span>
                </div>
              </div>
            </div>

            {/* Top-Right Card: "Upcoming transactions" style list */}
            <div className="fp-card flex flex-col justify-between">
              <h2 className="text-[18px] font-bold text-[#1a1d1a] mb-6">
                Recent & upcoming submissions
              </h2>
              <div className="space-y-4">
                {recentActivityRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 items-center gap-2 text-[13px]">
                    <span className="text-[#1a1d1a]">{row.date}</span>
                    <span className={`font-semibold ${row.isNegative ? 'text-[#c93b2b]' : 'text-[#3b7a57]'}`}>
                      {row.metric}
                    </span>
                    <span className="text-[#1a1d1a] truncate">{row.author}</span>
                    <div className="flex justify-end">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-0.5 rounded-md text-[11px] font-semibold capitalize ${
                          row.darkTag
                            ? 'bg-[#5a6552] text-white'
                            : 'bg-[#dce7d0] text-[#1a1d1a]'
                        }`}
                      >
                        {row.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row of 2x2 Bento Grid (60% Chart / 40% Quick Access) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bottom-Left Card: "Inflow & Income" vertical stacked bar chart */}
            <div className="fp-card lg:col-span-7 flex flex-col justify-between">
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <h2 className="text-[18px] font-bold text-[#1a1d1a]">
                  Submissions & Approvals
                </h2>
                <div className="flex items-center gap-4 text-[12px] text-[#6e766b]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#5a6552] inline-block" />
                    Submissions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#a6be95] inline-block" />
                    Approvals
                  </span>
                </div>
              </div>

              {/* Stacked Vertical Pill Bars */}
              <div className="pt-4 pb-2">
                <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-[#eaece4]">
                  {monthlyBarData.map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center h-full justify-end">
                      <div className="w-3 sm:w-3.5 flex flex-col justify-end h-full">
                        {/* Top segment (light sage #a6be95) */}
                        <div
                          className="w-full bg-[#a6be95] rounded-t-full"
                          style={{ height: `${bar.topPct}%` }}
                        />
                        {/* Bottom segment (dark olive #5a6552) */}
                        <div
                          className="w-full bg-[#5a6552] -mt-1 rounded-t-sm"
                          style={{ height: `${bar.bottomPct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 sm:gap-3 px-2 pt-2.5">
                  {monthlyBarData.map((bar) => (
                    <span key={bar.label} className="flex-1 text-center text-[10px] text-[#6e766b]">
                      {bar.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom-Right Card: "Quick access" (Matches Image 4) */}
            <div className="fp-card lg:col-span-5 flex flex-col justify-between">
              <h2 className="text-[18px] font-bold text-[#1a1d1a] mb-5">
                Quick access
              </h2>
              <div className="space-y-3.5">
                {[
                  {
                    icon: User,
                    label: 'My Profile & Account',
                    onClick: () => navigate('/?tab=profile'),
                  },
                  {
                    icon: FolderOpen,
                    label: 'Submit Proposal / Thesis',
                    onClick: () => navigate('/submit-proposal'),
                  },
                  {
                    icon: TrendingUp,
                    label: 'Review & Approval Queue',
                    onClick: () => navigate('/?tab=approval'),
                  },
                  {
                    icon: BookOpen,
                    label: 'Public Thesis Catalog',
                    onClick: () => navigate('/?tab=catalog'),
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="w-full flex items-center justify-between py-1.5 group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-lg border border-[#dcdfd6] bg-white flex items-center justify-center text-[#1a1d1a] group-hover:bg-[#dce7d0] group-hover:border-[#c5d4b2] transition-colors">
                          <Icon className="size-4 stroke-[1.8]" />
                        </div>
                        <span className="text-[14px] font-medium text-[#1a1d1a] group-hover:underline">
                          {item.label}
                        </span>
                      </div>
                      <ExternalLink className="size-4 text-[#6e766b] group-hover:text-[#1a1d1a]" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Student's Personal Workflow Card (if student has papers) */}
          {myPapers.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-[20px] font-bold text-[#1a1d1a]">
                My Thesis Submissions
              </h2>
              {myPapers.map((paper) => (
                <div key={paper.id} className="fp-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#eaece4]">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1a1d1a]">{paper.title}</h3>
                      <p className="text-[13px] text-[#6e766b] mt-0.5">
                        Paper ID: #{paper.id} · Discipline: {paper.discipline || 'Computer Science'} · Mode: {paper.work_mode || 'Individual'}
                      </p>
                    </div>
                    <Badge variant="default" className="self-start sm:self-center">
                      {paper.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <StudentPaperWorkflow paper={paper} token={accessToken} onUpdate={() => void fetchAllDashboardData()} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REPORTING & ANALYTICS (Matches FinPlanner Image 7)                */}
      {/* ========================================================================= */}
      {activeSubTab === 'reporting' && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">On-Time Review Rate</span>
                <TrendingUp className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">
                  {liveMetrics?.on_time_review_rate || 94}%
                </span>
                <ArrowUpRight className="size-5 text-[#3b7a57] stroke-[2.5]" />
              </div>
              <p className="text-[12px] text-[#8c9489]">vs. previous month</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Delayed SLA Reviews</span>
                <Clock className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">
                  {overdueCount}
                </span>
                <ArrowDownRight className="size-5 text-[#c93b2b] stroke-[2.5]" />
              </div>
              <p className="text-[12px] text-[#8c9489]">exceeding 5-day threshold</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Avg. Originality Score</span>
                <ShieldCheck className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">
                  {(100 - (liveMetrics?.average_plagiarism_score || 8.4)).toFixed(1)}%
                </span>
                <ArrowUpRight className="size-5 text-[#3b7a57] stroke-[2.5]" />
              </div>
              <p className="text-[12px] text-[#8c9489]">Turnitin verified clearance</p>
            </div>
          </div>

          {/* Middle Row: Departmental Overview Chart (Left) + Dark Olive Recent Activity Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="fp-card lg:col-span-8 flex flex-col justify-between">
              <h3 className="text-[16px] font-bold text-[#1a1d1a] mb-6">
                Departmental Overview
              </h3>

              <div className="space-y-2">
                {[8, 6, 4, 2, 0].map((tick) => (
                  <div key={tick} className="flex items-center gap-4">
                    <span className="w-4 text-[11px] text-[#6e766b] text-right">{tick * 10}</span>
                    <div className="flex-1 border-b border-[#eaece4]" />
                  </div>
                ))}
              </div>

              {/* Overlay Bars */}
              <div className="relative -mt-36 h-36 flex items-end justify-around pl-8 pr-4">
                {[
                  { dept: 'CS', olive: 65, sage: 30 },
                  { dept: 'MIS', olive: 48, sage: 45 },
                  { dept: 'Bus.', olive: 66, sage: 28 },
                  { dept: 'Law', olive: 34, sage: 58 },
                  { dept: 'Gov.', olive: 82, sage: 15 },
                  { dept: 'Econ.', olive: 58, sage: 36 },
                ].map((d) => (
                  <div key={d.dept} className="flex flex-col items-center h-full justify-end w-10">
                    <div className="w-3.5 h-full flex flex-col justify-end">
                      <div className="w-full bg-[#a6be95] rounded-t-full" style={{ height: `${d.sage}%` }} />
                      <div className="w-full bg-[#5a6552]" style={{ height: `${d.olive}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-around pl-8 pr-4 pt-3">
                {['CS', 'MIS', 'Bus.', 'Law', 'Gov.', 'Econ.'].map((dept) => (
                  <span key={dept} className="text-[12px] text-[#1a1d1a] w-10 text-center">
                    {dept}
                  </span>
                ))}
              </div>
            </div>

            {/* Dark Olive Recent Activity Card (Matches Image 7) */}
            <div className="fp-olive-card lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="text-[18px] font-medium text-white mb-6">
                  Recent Activity
                </h3>

                <div className="space-y-6">
                  {(commentsReport.length > 0 ? commentsReport.slice(0, 2) : [
                    {
                      id: 1,
                      created_at: new Date().toISOString(),
                      phase_label: 'New Thesis Proposal Submitted',
                      comment_text: 'Check the proposal details and ensure supervisor allocation.',
                    },
                    {
                      id: 2,
                      created_at: new Date().toISOString(),
                      phase_label: 'Chapter Review Logged',
                      comment_text: 'Check the chapter annotations and approve for examination.',
                    },
                  ]).map((act: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[11px] text-[#dce7d0]/80">
                        {act.created_at ? new Date(act.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/?tab=approval')}
                        className="text-[14px] font-bold text-white flex items-center gap-1.5 hover:underline cursor-pointer text-left"
                      >
                        <span>{act.phase_label || 'Thesis Milestone Updated'}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                      </button>
                      <p className="text-[12px] text-[#e6eedc]/85 line-clamp-2 leading-relaxed">
                        {act.comment_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Total Active Theses</span>
                <BookOpen className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">{totalTheses}</span>
                <ArrowUpRight className="size-5 text-[#3b7a57] stroke-[2.5]" />
              </div>
              <p className="text-[12px] text-[#8c9489]">vs. previous semester</p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Supervisor Utilization</span>
                <Users className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">
                  {liveMetrics?.supervisor_metrics?.average_utilization_pct || 68.5}%
                </span>
              </div>
              <p className="text-[12px] text-[#8c9489]">
                {liveMetrics?.supervisor_metrics?.total_assigned ?? 48} of {liveMetrics?.supervisor_metrics?.total_capacity ?? 70} slots assigned
              </p>
            </div>

            <div className="fp-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-medium text-[#1a1d1a]">Certified & Published</span>
                <Award className="size-4 text-[#5a6552]" />
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[26px] font-bold text-[#1a1d1a]">{p5Count}</span>
                <ArrowUpRight className="size-5 text-[#3b7a57] stroke-[2.5]" />
              </div>
              <p className="text-[12px] text-[#8c9489]">archived in repository</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: PHASE PIPELINE TABLE (Matches FinPlanner Images 1 & 3)            */}
      {/* ========================================================================= */}
      {activeSubTab === 'operations' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'phase1_proposals' as ApiPipelinePhaseKey, label: `Phase 1: Topics (${pipelineMetrics?.phase1_proposals?.count ?? p1Count})` },
                { key: 'phase2_allocation' as ApiPipelinePhaseKey, label: `Phase 2: Allocation (${pipelineMetrics?.phase2_allocation?.count ?? p2Count})` },
                { key: 'phase3_chapters' as ApiPipelinePhaseKey, label: `Phase 3: Chapters (${pipelineMetrics?.phase3_chapters?.count ?? p3Count})` },
                { key: 'phase4_examination' as ApiPipelinePhaseKey, label: `Phase 4: Marking (${pipelineMetrics?.phase4_examination?.count ?? p4Count})` },
                { key: 'phase5_signoff' as ApiPipelinePhaseKey, label: `Phase 5: Certified (${pipelineMetrics?.phase5_signoff?.count ?? p5Count})` },
              ].map((ph) => {
                const isSelected = selectedPhaseKey === ph.key
                return (
                  <button
                    key={ph.key}
                    type="button"
                    onClick={() => setSelectedPhaseKey(ph.key)}
                    className={`fp-subnav-pill ${isSelected ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
                  >
                    {ph.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <Select value={pipelineProgram} onValueChange={(val) => setPipelineProgram(val)}>
                <SelectTrigger className="h-9 text-xs w-52 bg-white">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Academic Programs</SelectItem>
                  {pipelineAllPrograms.map((prog) => (
                    <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Minimalist FinPlanner Table */}
          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Thesis nr.</th>
                  <th>Student author</th>
                  <th>Programme</th>
                  <th>Topic</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(pipelineMetrics?.[selectedPhaseKey]?.students || []).map((st: ApiPipelineStudent) => (
                  <tr key={st.paper_id}>
                    <td className="font-medium">#{st.paper_id}</td>
                    <td className="font-medium">{st.student_name}</td>
                    <td className="text-[#6e766b]">{st.program}</td>
                    <td className="max-w-xs truncate">{st.title}</td>
                    <td>{st.supervisor_name || 'Unassigned'}</td>
                    <td>
                      <Badge variant="default">{st.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate('/?tab=approval')}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!pipelineMetrics || (pipelineMetrics[selectedPhaseKey]?.students || []).length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#6e766b]">
                      No student thesis records in this milestone phase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: SUPERVISOR QUOTAS & SPECIALIZATIONS (FinPlanner Table)            */}
      {/* ========================================================================= */}
      {activeSubTab === 'capacities' && canManageCeilings && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[14px] text-[#6e766b]">
              Adjust student capacity ceilings and configure research domain keywords for intelligent supervisor matching.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Academic supervisor</th>
                  <th>Specialization domain</th>
                  <th>Active advisees</th>
                  <th>Max ceiling</th>
                  <th>Utilization</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {capacities.map((sup) => (
                  <tr key={sup.id}>
                    <td>
                      <div className="font-semibold text-[#1a1d1a]">{sup.name}</div>
                      <div className="text-[12px] text-[#6e766b]">{sup.email}</div>
                    </td>
                    <td className="max-w-sm text-[#6e766b]">
                      {sup.specialization || 'General Academic Research'}
                    </td>
                    <td className="font-semibold text-[#3b7a57]">
                      +{sup.active_students_count} student(s)
                    </td>
                    <td className="font-semibold">
                      {sup.max_student_ceiling} max
                    </td>
                    <td>
                      <Badge variant={sup.is_at_ceiling ? 'secondary' : 'default'}>
                        {sup.utilization_pct}% ({sup.is_at_ceiling ? 'Full' : `${sup.available_slots} open`})
                      </Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingSupervisor(sup)
                          setEditCeilingValue(sup.max_student_ceiling)
                          setEditSpecializationValue(sup.specialization)
                        }}
                      >
                        + Adjust quota
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
      {/* VIEW 5: TURNITIN PLAGIARISM RADAR (Matches FinPlanner Image 3 Table)      */}
      {/* ========================================================================= */}
      {activeSubTab === 'plagiarism' && (
        <div className="space-y-6">
          <p className="text-[14px] text-[#6e766b]">
            Institutional similarity analysis engine. Submissions must score below 20% similarity before advancing to Phase 4 examination.
          </p>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Thesis nr.</th>
                  <th>Similarity</th>
                  <th>Author</th>
                  <th>Title</th>
                  <th>Tag</th>
                  <th className="text-right">Scanner</th>
                </tr>
              </thead>
              <tbody>
                {myPapers.concat((pipelineMetrics?.phase3_chapters?.students as any) || []).slice(0, 20).map((p: any) => {
                  const score = p.plagiarism_score !== undefined && p.plagiarism_score !== null ? p.plagiarism_score : null
                  const isFlagged = score !== null && score > 20.0
                  return (
                    <tr key={p.id || p.paper_id}>
                      <td className="font-medium">#{p.id || p.paper_id}</td>
                      <td className={`font-semibold ${isFlagged ? 'text-[#c93b2b]' : 'text-[#3b7a57]'}`}>
                        {score !== null ? `${score}%` : 'Unscanned'}
                      </td>
                      <td>{p.student_name || p.authors?.[0]?.name || 'Scholar'}</td>
                      <td className="max-w-sm truncate">{p.title}</td>
                      <td>
                        <Badge variant={isFlagged ? 'secondary' : 'default'}>
                          {score !== null ? (isFlagged ? 'Flagged' : 'Clean') : 'Pending'}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Button size="sm" onClick={() => handleScanPlagiarism(p)}>
                          + Scan similarity
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
      {/* VIEW 6: SUPERVISOR COMMENTS REPORT                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'comments' && canManageCeilings && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={commentsSupervisorFilter} onValueChange={(val) => setCommentsSupervisorFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-56 bg-[#5a6552] text-white border-[#5a6552]">
                <SelectValue placeholder="All Supervisors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Supervisors ({supervisorsSummaryList.length})</SelectItem>
                {supervisorsSummaryList.map((s) => (
                  <SelectItem key={s.supervisor_id} value={String(s.supervisor_id)}>
                    {s.name} ({s.total_comments})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 text-[#8c9489] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search supervisor remarks and actions"
                value={commentsSearch}
                onChange={(e) => setCommentsSearch(e.target.value)}
                className="w-full h-9 pl-10 pr-4 rounded-full border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supervisor</th>
                  <th>Student</th>
                  <th>Remark</th>
                  <th>Phase</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((c) => (
                  <tr key={c.id}>
                    <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : 'Recent'}</td>
                    <td className="font-medium">{c.supervisor_name}</td>
                    <td>{c.student_name}</td>
                    <td className="max-w-md text-[#6e766b]">"{c.comment_text}"</td>
                    <td>
                      <Badge variant="default">{c.phase_label}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredComments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#6e766b]">
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
      {/* VIEW 7: 5-DAY OVERDUE REVIEWS                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'overdue' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-[#6e766b]">
              Student submissions waiting ≥ 5 days are automatically escalated to the HOD, Dean, and Deputy Rector.
            </p>
            <Button size="sm" variant="olive" onClick={handleTrigger5DayAlerts} disabled={triggeringAlerts}>
              <BellRing className="size-3.5 mr-1.5" />
              {triggeringAlerts ? 'Dispatching...' : 'Dispatch 5-Day SLA Alerts'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Thesis nr.</th>
                  <th>Delay</th>
                  <th>Student author</th>
                  <th>Assigned supervisor</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((item) => (
                  <tr key={item.paper_id}>
                    <td className="font-medium">#{item.paper_id}</td>
                    <td className="font-semibold text-[#c93b2b]">
                      -{item.days_pending} days ({item.hours_pending}h)
                    </td>
                    <td>{item.student_name}</td>
                    <td>{item.supervisor_name}</td>
                    <td>
                      <Badge variant={item.is_overdue ? 'secondary' : 'default'}>
                        {item.is_overdue ? 'Overdue' : 'On Track'}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate('/?tab=approval')}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
                {overdueList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#3b7a57] font-medium">
                      ✓ All student submissions are actively being reviewed within the 5-day SLA.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUPERVISOR CEILING MODAL (Matches FinPlanner Image 2)            */}
      {/* ========================================================================= */}
      {editingSupervisor && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#eaece4] rounded-2xl max-w-md w-full p-8 space-y-5 shadow-xl text-[#1a1d1a]">
            <div className="flex justify-between items-center">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">
                Adjust quota
              </h3>
              <button onClick={() => setEditingSupervisor(null)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[13px] text-[#6e766b]">
                Configuring workload ceiling for <strong>{editingSupervisor.name}</strong>
              </p>

              <div>
                <Label htmlFor="edit-ceiling-input">Max Advisee Quota Ceiling</Label>
                <Input
                  id="edit-ceiling-input"
                  type="number"
                  min={1}
                  max={50}
                  value={editCeilingValue}
                  onChange={(e) => setEditCeilingValue(Number(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="edit-spec-input">Research Specialization Keywords</Label>
                <textarea
                  id="edit-spec-input"
                  rows={3}
                  value={editSpecializationValue}
                  onChange={(e) => setEditSpecializationValue(e.target.value)}
                  placeholder="e.g. Machine Learning, Cybersecurity, Public Policy..."
                  className="w-full bg-white border border-[#e2e5dc] rounded-lg p-3 text-[#1a1d1a] text-[13px] focus:outline-none focus:border-[#5a6552]"
                />
              </div>

              {ceilingMessage && (
                <p className="text-xs font-semibold text-[#3b7a57]">{ceilingMessage}</p>
              )}

              <Button onClick={handleSaveSupervisorCapacity} disabled={savingCeiling} className="w-full h-11 font-bold">
                {savingCeiling ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TURNITIN PLAGIARISM REPORT MODAL                                 */}
      {/* ========================================================================= */}
      {plagiarismModalPaper && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#eaece4] rounded-2xl max-w-lg w-full p-8 space-y-5 shadow-xl text-[#1a1d1a]">
            <div className="flex justify-between items-center">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">
                Similarity report
              </h3>
              <button onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            {scanningPlagiarism ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="size-7 text-[#5a6552] animate-spin" />
                <p className="text-[13px] text-[#6e766b]">Scanning repository vectors...</p>
              </div>
            ) : plagiarismReport ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#fafbf8] border border-[#eaece4] flex justify-between items-center">
                  <span className="text-[14px] font-medium text-[#1a1d1a]">Overall Similarity Index</span>
                  <span className={`text-[22px] font-bold ${plagiarismReport.is_flagged ? 'text-[#c93b2b]' : 'text-[#3b7a57]'}`}>
                    {plagiarismReport.similarity_pct}%
                  </span>
                </div>
                <p className="text-[13px] text-[#6e766b]">{plagiarismReport.feedback}</p>

                <div className="space-y-2">
                  <h4 className="text-[13px] font-bold text-[#1a1d1a]">Matched Institutional Sources</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {plagiarismReport.sources.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#fafbf8] border border-[#eaece4] flex justify-between items-center text-[13px]">
                        <span className="truncate max-w-xs">{s.source_title}</span>
                        <span className="font-bold text-[#5a6552]">{s.similarity_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <Button onClick={() => { setPlagiarismModalPaper(null); setPlagiarismReport(null); }} className="w-full h-11 font-bold">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADVISEE BROADCAST MODAL (Matches FinPlanner Image 10)            */}
      {/* ========================================================================= */}
      {adviseeModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#5a6552]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-[#eaece4] rounded-2xl max-w-xl w-full p-8 space-y-5 shadow-xl text-[#1a1d1a]">
            <div className="flex justify-between items-center">
              <h3 className="text-[22px] font-bold text-[#1a1d1a]">
                Broadcast to advisees
              </h3>
              <button onClick={() => setAdviseeModalOpen(false)} className="text-[#6e766b] hover:text-[#1a1d1a] cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 p-3.5 bg-[#fafbf8] rounded-xl border border-[#eaece4]">
                <div>
                  <p className="text-[13px] font-bold text-[#1a1d1a]">Target Recipients</p>
                  <p className="text-[12px] text-[#6e766b]">{advisees.length} active advisee(s)</p>
                </div>
                {adviseePrograms.length > 0 && (
                  <Select
                    value={adviseeProgramFilter}
                    onValueChange={(val) => {
                      setAdviseeProgramFilter(val)
                      void loadAdvisees(val)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white w-44">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Programs ({advisees.length})</SelectItem>
                      {adviseePrograms.map((prog) => (
                        <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="broadcast-subject">Subject</Label>
                <Input
                  id="broadcast-subject"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Chapter 3 Methodology Submission Deadline"
                />
              </div>

              <div>
                <Label htmlFor="broadcast-msg">Message</Label>
                <textarea
                  id="broadcast-msg"
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your supervisory message to advisees here..."
                  className="w-full bg-white border border-[#e2e5dc] rounded-lg p-3 text-[#1a1d1a] text-[13px] focus:outline-none focus:border-[#5a6552]"
                />
              </div>

              <div className="space-y-2 p-3.5 bg-[#fafbf8] rounded-xl border border-[#eaece4]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1a1d1a] flex items-center gap-1.5">
                    <Paperclip className="size-4 text-[#6e766b]" /> Attach Reference Files
                  </span>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dce7d0] hover:bg-[#ceddc0] text-[#1a1d1a] text-xs font-semibold transition-colors">
                    <Upload className="size-3.5" />
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

                {broadcastAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {broadcastAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#eaece4] text-xs">
                        <span className="truncate font-medium">{att.filename}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBroadcastAttachment(idx)}
                          className="text-[#6e766b] hover:text-[#c93b2b] cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={broadcastIncludeEmail}
                  onChange={(e) => setBroadcastIncludeEmail(e.target.checked)}
                  className="rounded text-[#5a6552] h-4 w-4"
                />
                <span className="text-[13px] text-[#6e766b]">Also send as email to students’ official inbox</span>
              </label>

              {broadcastSuccess && <p className="text-xs font-semibold text-[#3b7a57]">{broadcastSuccess}</p>}
              {broadcastError && <p className="text-xs font-semibold text-[#c93b2b]">{broadcastError}</p>}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSendAdviseeBroadcast}
                  disabled={sendingBroadcast || !broadcastSubject.trim() || !broadcastMessage.trim()}
                  className="px-8"
                >
                  {sendingBroadcast ? 'Sending...' : 'Send broadcast'}
                </Button>
                <Button variant="outline" onClick={() => setAdviseeModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
