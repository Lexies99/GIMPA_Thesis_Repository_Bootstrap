import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, Clock, FileText, Eye, MessageSquare, AlertCircle, ExternalLink, Shield, CheckSquare, Award, Download, Upload, FileSpreadsheet, FileCheck, FileEdit } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import {
  apiDownloadPaperFile,
  apiGetPendingPapers,
  apiGetRevisionPapers,
  apiGetReviewedPapers,
  apiReviewPaper,
  apiUploadCorrectedPaperFile,
  apiListUsers,
  apiAssignSupervisor,
  apiSupervisorUpdateChecklist,
  apiCompletePhase3,
  apiAssignExaminers,
  apiUploadResults,
  apiSupervisorApproveCorrections,
  apiCoordinatorApproveCorrections,
  apiHodApproveCorrections,
  apiStepDecision,
  apiSupervisorApproveCombinedThesis,
  apiListDepartments,
  apiDownloadApprovedZip,
  apiDownloadExaminerResultsZip,
  apiDownloadExaminerAssignedZip,
  apiProposalDecision,
  apiBase,
  apiBulkAssignExaminers,
  apiDownloadBulkExaminerTemplate,
  apiSubmitExaminerGrading,
  apiGetStudentFeedback,
  apiGetAdminExaminationMarks,
  apiAssignThirdExaminer,
} from '../../lib/api'
import { DocxViewer } from './DocxViewer'
import type { ApiPaper, ApiUser, ApiBulkAssignSummary, ApiStudentFeedbackResponse, ApiAdminMarkSheetResponse } from '../../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'
type ChapterKey = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5'

const chapterNames = ['One', 'Two', 'Three', 'Four', 'Five']

function getCurrentChapter(checklist: Record<ChapterKey, boolean>): number {
  const chapters: ChapterKey[] = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5']
  const nextIndex = chapters.findIndex((chapter) => !checklist[chapter])
  return nextIndex === -1 ? 5 : nextIndex + 1
}

function chapterLabel(chapterNumber: number): string {
  return chapterNames[chapterNumber - 1] || String(chapterNumber)
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'phase1_proposal_submitted':
      return 'Phase 1 — Topic Submitted (Awaiting HOD/Coordinator Review)'
    case 'phase1_topic_accepted':
      return 'Phase 1 — Topic Accepted (Supervisor Assigned)'
    case 'phase2_pending_coordinator':
      return 'Phase 2 — Pending Coordinator Assignment'
    case 'phase2_pending_supervisor':
      return 'Phase 2 — Pending Supervisor Assignment'
    case 'phase2_proposal_submitted':
      return 'Phase 2 — Proposal Submitted (Awaiting Supervisor Review)'
    case 'phase2_proposal_accepted':
      return 'Phase 2 — Proposal Accepted'
    case 'phase3_chapters':
      return 'Phase 2 — Steps in Progress (Chapter Submissions)'
    case 'phase3_steps_in_progress':
      return 'Phase 2 — Steps in Progress'
    case 'phase3_all_steps_approved':
      return 'Phase 2 — All Steps Approved (Ready for Examination)'
    case 'phase4_pending_examiners':
      return 'Phase 3 — Awaiting Examiner Assignment'
    case 'phase4_marking':
      return 'Phase 3 — Under Examination / Marking'
    case 'phase4_examination_completed':
      return 'Phase 3 — Examination Completed'
    case 'phase5_corrections':
      return 'Phase 4 — Post-Examination Corrections Required'
    case 'phase5_pending_supervisor':
      return 'Phase 4 — Corrections Awaiting Supervisor Approval'
    case 'phase5_pending_coordinator':
      return 'Phase 4 — Corrections Awaiting Coordinator Sign-off'
    case 'phase5_pending_hod':
      return 'Phase 4 — Corrections Awaiting HOD Sign-off'
    case 'phase5_pending_hod_and_coordinator':
      return 'Phase 4 — Corrections Awaiting HOD & Coordinator Sign-off'
    case 'phase5_approved_for_library':
      return 'Phase 5 — Approved for Library Publication'
    case 'phase5_published':
      return 'Phase 5 — Published in GIMPA Thesis Repository'
    default:
      return status
  }
}

function formatDocumentTypeLabel(docType: string | null, status: string): string {
  if (status === 'phase1_proposal_submitted' || docType === 'thesis_topic') {
    return 'Thesis Topic Submission (Phase 1)'
  }
  if (status === 'phase2_proposal_submitted' || status === 'phase2_proposal_accepted' || status === 'phase2_pending_supervisor' || status === 'phase2_pending_coordinator') {
    return 'Project Proposal (Phase 2)'
  }
  if (status === 'phase3_chapters' || status === 'phase3_steps_in_progress' || status === 'phase3_all_steps_approved') {
    return 'Steps / Chapter Review (Phase 2 — Continuation)'
  }
  if (status === 'phase4_pending_examiners' || status === 'phase4_marking' || status === 'phase4_examination_completed') {
    return 'Examination (Phase 3)'
  }
  if (status === 'phase5_corrections' || status === 'phase5_pending_supervisor' || status === 'phase5_pending_coordinator' || status === 'phase5_pending_hod' || status === 'phase5_pending_hod_and_coordinator') {
    return 'Corrections & Dual Approval (Phase 4)'
  }
  if (status === 'phase5_approved_for_library' || status === 'phase5_published') {
    return 'Library Publication (Phase 5)'
  }
  if (docType === 'proposal') {
    return 'Project Proposal'
  }
  return docType || 'Research Paper'
}

export function ApprovalWorkflow() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [pendingSubmissions, setPendingSubmissions] = useState<ApiPaper[]>([])
  const [approvedPapers, setApprovedPapers] = useState<ApiPaper[]>([])
  const [revisionRequested, setRevisionRequested] = useState<ApiPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [classFilter, setClassFilter] = useState('')
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<ApiPaper | null>(null)
  const [reviewDecision, setReviewDecision] = useState('')
  const [reviewComments, setReviewComments] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [correctedFile, setCorrectedFile] = useState<File | null>(null)
  const [correctedNote, setCorrectedNote] = useState('')
  const [uploadingCorrectedFile, setUploadingCorrectedFile] = useState(false)
  const [documentViewerUrl, setDocumentViewerUrl] = useState<string | null>(null)
  const [documentViewerName, setDocumentViewerName] = useState<string>('')
  const [documentMimeType, setDocumentMimeType] = useState<string>('')
  const [documentLoading, setDocumentLoading] = useState(false)
  const isLibrarian = user?.role === 'librarian'
  const canUploadCorrection = user?.role === 'lecturer' || user?.role === 'project_supervisor'
  const correctedFileInputRef = useRef<HTMLInputElement | null>(null)

  const roles = user?.roles || (user?.role ? [user.role] : [])
  const isHOD = roles.includes('hod')
  const isCoordinator = roles.includes('project_coordinator')
  const isSupervisor = roles.includes('project_supervisor') || roles.includes('lecturer') || roles.includes('hod')
  const isDean = roles.includes('dean')
  const isAdmin = roles.includes('system_admin')
  const canViewScores = roles.includes('hod') || roles.includes('project_coordinator') || roles.includes('dean') || roles.includes('system_admin')

  // User lists for dropdowns
  const [supervisorsList, setSupervisorsList] = useState<ApiUser[]>([])

  // Selection states
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('')
  const [selectedInternalId, setSelectedInternalId] = useState<string>('')
  const [selectedExternalId, setSelectedExternalId] = useState<string>('')

  // Checklist for supervisor
  const [supChecklist, setSupChecklist] = useState({
    ch1: false,
    ch2: false,
    ch3: false,
    ch4: false,
    ch5: false,
  })

  // Examiner marking state
  const [internalScore, setInternalScore] = useState<string>('')
  const [externalScore, setExternalScore] = useState<string>('')
  const [examinerCorrections, setExaminerCorrections] = useState<string>('')
  const [examinerRecommendation, setExaminerRecommendation] = useState<string>('Pass')
  const [resultsFile, setResultsFile] = useState<File | null>(null)

  // Bulk Examiner Assignment states
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<ApiBulkAssignSummary | null>(null)

  // Role-gated feedback and mark sheet data
  const [studentFeedbackData, setStudentFeedbackData] = useState<ApiStudentFeedbackResponse | null>(null)
  const [adminMarksData, setAdminMarksData] = useState<ApiAdminMarkSheetResponse | null>(null)
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [assigningThird, setAssigningThird] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    const userRoles = user?.roles || (user?.role ? [user.role] : [])
    const hasPrivilege = userRoles.includes('hod') || userRoles.includes('project_coordinator') || userRoles.includes('system_admin') || userRoles.includes('dean')
    
    if (hasPrivilege) {
      apiListUsers(token, { limit: 1000 }).then((list) => {
        // Filter supervisors/lecturers, HODs, and project coordinators
        const sups = list.filter(u => {
          const userRoles = u.roles || [u.role]
          return userRoles.some(r => ['project_supervisor', 'lecturer', 'hod', 'project_coordinator', 'dean', 'external_examiner'].includes(r))
        })
        setSupervisorsList(sups)
      }).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token || !user?.department) return
    apiListDepartments(token).then((depts) => {
      const matched = depts.find(d => (d.name || '').trim().toLowerCase() === (user.department || '').trim().toLowerCase())
      if (matched) {
        setDepartmentId(matched.id)
      }
    }).catch(() => {})
  }, [user])

  const handleDownloadAllApprovedZip = async () => {
    if (!departmentId) {
      window.alert("Department not resolved. Please contact administrator.")
      return
    }
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    setDownloadingZip(true)
    try {
      const { blob, filename } = await apiDownloadApprovedZip(departmentId, token, classFilter)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadExaminerResultsZip = async () => {
    if (!departmentId) {
      window.alert("Department not resolved. Please contact administrator.")
      return
    }
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    setDownloadingZip(true)
    try {
      const { blob, filename } = await apiDownloadExaminerResultsZip(departmentId, token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadExaminerAssignedZip = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    setDownloadingZip(true)
    try {
      const { blob, filename } = await apiDownloadExaminerAssignedZip(token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloadingZip(false)
    }
  }

  const handleDownloadPaper = async (paperId: number) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    try {
      const { blob, filename } = await apiDownloadPaperFile(paperId, token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const loadAll = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      setError('Missing auth token.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [pending, approved, revision] = await Promise.all([
        apiGetPendingPapers(token),
        apiGetReviewedPapers(token),
        apiGetRevisionPapers(token),
      ])
      setPendingSubmissions(pending)
      setApprovedPapers(approved)
      setRevisionRequested(revision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const clearDocumentViewer = () => {
    if (documentViewerUrl) {
      URL.revokeObjectURL(documentViewerUrl)
    }
    setDocumentViewerUrl(null)
    setDocumentViewerName('')
    setDocumentMimeType('')
  }

  const handleDownloadDocument = async (paperId: number) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      navigate('/login')
      return
    }

    setDocumentLoading(true)
    try {
      const { blob, filename } = await apiDownloadPaperFile(paperId, token)
      const resolvedName =
        (filename && !/^paper-\d+$/i.test(filename) ? filename : '') ||
        selectedPaper?.file_name ||
        selectedPaper?.title ||
        `paper-${paperId}`
      const resolvedMime = blob.type || selectedPaper?.mime_type || ''
      const url = URL.createObjectURL(blob)
      setDocumentViewerUrl(url)
      setDocumentViewerName(resolvedName)
      setDocumentMimeType(resolvedMime)

      const a = document.createElement('a')
      a.href = url
      a.download = resolvedName
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download paper')
    } finally {
      setDocumentLoading(false)
    }
  }

  const handleReview = async () => {
    if (!selectedPaper || !reviewDecision) return
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      setReviewError('Missing auth token.')
      return
    }
    setReviewError('')
    setSubmittingReview(true)
    try {
      if (canUploadCorrection && correctedFile) {
        setUploadingCorrectedFile(true)
        const updated = await apiUploadCorrectedPaperFile(selectedPaper.id, correctedFile, correctedNote, token)
        setSelectedPaper(updated)
        setCorrectedFile(null)
        setCorrectedNote('')
        setUploadingCorrectedFile(false)
      }
      const decisionForApi = (isLibrarian && reviewDecision === 'publish' ? 'approve' : reviewDecision) as 'approve' | 'revision' | 'reject'
      await apiReviewPaper(selectedPaper.id, decisionForApi, reviewComments, token)
      setDialogOpen(false)
      setSelectedPaper(null)
      setReviewComments('')
      setReviewDecision('')
      await loadAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit review'
      setError(message)
      setReviewError(message)
      setUploadingCorrectedFile(false)
    } finally {
      setSubmittingReview(false)
    }
  }

  const openReviewDialog = (paper: ApiPaper) => {
    setSelectedPaper(paper)
    setDialogOpen(true)
    setReviewError('')
    setReviewComments('')
    setReviewDecision('')
    setCorrectedFile(null)
    setCorrectedNote('')

    // Initialize chapter checklist from paper values
    setSupChecklist({
      ch1: !!paper.ch1_supervisor_approved,
      ch2: !!paper.ch2_supervisor_approved,
      ch3: !!paper.ch3_supervisor_approved,
      ch4: !!paper.ch4_supervisor_approved,
      ch5: !!paper.ch5_supervisor_approved,
    })

    // Initialize examiner marking fields if paper is in phase4_marking
    setInternalScore(paper.internal_score !== null && paper.internal_score !== undefined ? String(paper.internal_score) : '')
    setExternalScore(paper.external_score !== null && paper.external_score !== undefined ? String(paper.external_score) : '')
    setExaminerCorrections(paper.examiner_corrections || '')
    setResultsFile(null)

    // Reset dropdowns and feedback states
    setSelectedSupervisorId(paper.supervisor_id ? String(paper.supervisor_id) : '')
    setSelectedInternalId(paper.internal_examiner_id ? String(paper.internal_examiner_id) : '')
    setSelectedExternalId(paper.external_examiner_id ? String(paper.external_examiner_id) : '')
    setStudentFeedbackData(null)
    setAdminMarksData(null)

    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      if (canViewScores) {
        apiGetAdminExaminationMarks(paper.id, token).then(setAdminMarksData).catch(() => setAdminMarksData(null))
      }
      apiGetStudentFeedback(paper.id, token).then(setStudentFeedbackData).catch(() => setStudentFeedbackData(null))
    }
  }

  const handleCancel = () => {
    clearDocumentViewer()
    setDialogOpen(false)
    setSelectedPaper(null)
    setReviewError('')
    setReviewComments('')
    setReviewDecision('')
    setCorrectedFile(null)
    setCorrectedNote('')
  }

  useEffect(() => {
    if (!dialogOpen) {
      clearDocumentViewer()
    }
  }, [dialogOpen])

  const handlePickCorrectedFile = () => {
    correctedFileInputRef.current?.click()
  }

  const handleCorrectedFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCorrectedFile(file)
    e.currentTarget.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">{isLibrarian ? 'Publication Workflow' : 'Approval Workflow'}</h2>
        <p className="text-muted-foreground">
          {isLibrarian
            ? 'Publish fully approved research papers'
            : 'Review and manage research paper submissions'}
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">Loading workflow data...</CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="size-4" />
            {isLibrarian ? 'Ready to Publish' : 'Pending Review'}
            <Badge variant="destructive" className="ml-1">
              {pendingSubmissions.length}
            </Badge>
          </TabsTrigger>
          {!isLibrarian && (
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="size-4" />
              Approved
              <Badge variant="secondary" className="ml-1">
                {approvedPapers.length}
              </Badge>
            </TabsTrigger>
          )}
          {!isLibrarian && (
            <TabsTrigger value="revision" className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Revision Requested
              <Badge variant="secondary" className="ml-1">
                {revisionRequested.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {(isHOD || isCoordinator || isDean || isAdmin) && (
            <div className="ta-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 m-0">
                  <Award className="size-4 text-purple-400" />
                  {isDean ? 'School & Department Master Results Hub' : 'Department Examiner Results Hub'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 m-0">
                  Open ONLYOFFICE Excel workbooks with dedicated tabs for each Certification Type (Undergraduate, Masters, MPhil, PhD).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(isHOD || isCoordinator || isAdmin) && (
                  <Button
                    size="sm"
                    className="btn-ta-glass text-xs"
                    onClick={() => window.open('/editor?type=dept_results_excel', '_blank')}
                  >
                    📊 Department Results (ONLYOFFICE Excel)
                  </Button>
                )}
                {(isDean || isAdmin) && (
                  <Button
                    size="sm"
                    className="btn-ta-glass text-xs"
                    onClick={() => window.open('/editor?type=dean_results_excel', '_blank')}
                  >
                    🎓 School Master Results (ONLYOFFICE Excel)
                  </Button>
                )}
                <Button
                  size="sm"
                  className="btn-ta-glass text-xs"
                  onClick={() => window.open('/editor?type=examiner_results_excel', '_blank')}
                >
                  📝 My Examiner Sheet (ONLYOFFICE Excel)
                </Button>
              </div>
            </div>
          )}

          {pendingSubmissions.some(p => p.status === 'phase4_marking' && (p.internal_examiner_id === user?.id || p.external_examiner_id === user?.id)) && !(isHOD || isCoordinator || isDean || isAdmin) && (
            <div className="ta-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 m-0">
                  <Award className="size-4 text-purple-400" />
                  Assigned Marking Works
                </h4>
                <p className="text-xs text-slate-400 mt-1 m-0">
                  You are assigned as examiner for papers listed below. Mark inline via ONLYOFFICE, use Excel results sheets, or download files offline.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="btn-ta-glass text-xs"
                  onClick={() => window.open('/editor?type=examiner_results_excel', '_blank')}
                >
                  📊 Open Results Spreadsheet (ONLYOFFICE Excel)
                </Button>
                <Button size="sm" className="btn-ta-purple text-xs" onClick={handleDownloadExaminerAssignedZip} disabled={downloadingZip}>
                  {downloadingZip ? 'Downloading...' : 'Download All Assigned Papers ZIP'}
                </Button>
              </div>
            </div>
          )}

          {pendingSubmissions.map((paper) => (
            <div key={paper.id} className="ta-card p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                      PAPER-{paper.id}
                    </span>
                    <span className="badge-ta-purple text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {isLibrarian ? 'Ready to Publish' : 'Pending'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{paper.title}</h3>
                  <p className="text-xs text-slate-400 m-0">
                    Submitted by <strong className="text-slate-200">{paper.authors.map((a) => a.name).join(', ') || 'Unknown'}</strong> • {paper.discipline || 'General'} • {formatDocumentTypeLabel(paper.document_type, paper.status)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-purple-400" />
                    Submitted {paper.created_at ? new Date(paper.created_at).toLocaleDateString() : '-'}
                  </span>
                  <span>Status: <strong className="text-purple-300">{formatStatusLabel(paper.status)}</strong></span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    className="btn-ta-purple text-xs flex items-center gap-1.5"
                    onClick={() => {
                      setSelectedPaper(paper)
                      setDialogOpen(true)
                    }}
                  >
                    <Eye className="size-3.5" />
                    <span>Review Paper</span>
                  </Button>
                  <Button
                    size="sm"
                    className="btn-ta-glass text-xs flex items-center gap-1.5"
                    onClick={() => window.open(`/editor?paperId=${paper.id}&type=paper`, '_blank')}
                  >
                    <FileText className="size-3.5 text-purple-400" />
                    <span>View Work (ONLYOFFICE)</span>
                  </Button>
                  <Button
                    size="sm"
                    className="btn-ta-glass text-xs flex items-center gap-1.5"
                    onClick={() => window.open(`/editor?paperId=${paper.id}&type=comments`, '_blank')}
                  >
                    <MessageSquare className="size-3.5 text-purple-400" />
                    <span>Open Comments (ONLYOFFICE)</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {!isLibrarian && (
          <TabsContent value="approved" className="space-y-4">
            {(isHOD || isCoordinator || isAdmin) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Download className="size-4 text-primary" />
                    Bulk Department Downloads
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Download all student works or examiner marked scripts for your department as a ZIP file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="class-filter" className="text-xs">Filter by Class/Program (Optional, e.g. BSc. Computer Science)</Label>
                      <Input
                        id="class-filter"
                        placeholder="e.g. BSc. Computer Science"
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleDownloadAllApprovedZip} disabled={downloadingZip}>
                        {downloadingZip ? 'Downloading...' : 'Download Approved Works ZIP'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadExaminerResultsZip} disabled={downloadingZip}>
                        {downloadingZip ? 'Downloading...' : 'Download Examiner Marked ZIP'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {approvedPapers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No approved papers found.
                </CardContent>
              </Card>
            ) : (
              approvedPapers.map((paper) => (
                <Card key={paper.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PAPER-{paper.id}</Badge>
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="size-3 mr-1" />
                            Approved
                          </Badge>
                        </div>
                        <CardTitle className="mb-2">{paper.title}</CardTitle>
                        <CardDescription>
                          Author: {paper.authors.map((a) => a.name).join(', ') || 'Unknown'} • {paper.discipline || 'General'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>Downloads: {paper.downloads}</span>
                      <span>•</span>
                      <span>Views: {paper.views}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {!isLibrarian && (
          <TabsContent value="revision" className="space-y-4">
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Revision requested items are waiting for the student to resubmit an updated version. Reviewers cannot approve these until resubmission.
            </CardContent>
          </Card>
          {revisionRequested.map((paper) => (
            <Card key={paper.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">PAPER-{paper.id}</Badge>
                      <Badge variant="secondary">
                        <AlertCircle className="size-3 mr-1" />
                        Revision Requested
                      </Badge>
                    </div>
                    <CardTitle className="mb-2">{paper.title}</CardTitle>
                    <CardDescription>
                      Author: {paper.authors.map((a) => a.name).join(', ') || 'Unknown'} • {paper.discipline || 'General'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm flex items-start gap-2">
                      <MessageSquare className="size-4 mt-0.5 shrink-0 text-orange-600" />
                      <span>{paper.review_comments || 'No review comments provided.'}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title || 'Review Paper'}</DialogTitle>
            <DialogDescription>
              {isLibrarian ? 'Finalize publication for this submission' : 'Review and provide feedback for this submission'}
            </DialogDescription>
          </DialogHeader>

          {selectedPaper && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                <div>
                  <p className="text-xs font-semibold m-0" style={{ color: 'var(--text-muted)' }}>Author</p>
                  <p className="text-sm font-bold m-0 mt-0.5" style={{ color: 'var(--text-main)' }}>{selectedPaper.authors.map((a) => a.name).join(', ') || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold m-0" style={{ color: 'var(--text-muted)' }}>Department</p>
                  <p className="text-sm font-bold m-0 mt-0.5" style={{ color: 'var(--text-main)' }}>{selectedPaper.discipline || 'General'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold m-0" style={{ color: 'var(--text-muted)' }}>Submission ID</p>
                  <p className="text-sm font-mono font-bold m-0 mt-0.5 text-purple-500">PAPER-{selectedPaper.id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold m-0" style={{ color: 'var(--text-muted)' }}>Document Type</p>
                  <p className="text-sm font-bold m-0 mt-0.5" style={{ color: 'var(--text-main)' }}>{formatDocumentTypeLabel(selectedPaper.document_type, selectedPaper.status)}</p>
                </div>
              </div>

              <div className="border rounded-xl p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 text-sm font-bold text-purple-500">
                  <FileText className="size-5 text-purple-500" />
                  <span>
                    {selectedPaper.status === 'phase1_proposal_submitted' || selectedPaper.document_type === 'thesis_topic'
                      ? 'Phase 1 — Thesis Topic Description'
                      : selectedPaper.status === 'phase2_proposal_submitted' || selectedPaper.status === 'phase2_proposal_accepted'
                      ? 'Phase 2 — Project Proposal Preview'
                      : 'Thesis Abstract / Summary'}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed m-0 font-normal" style={{ color: 'var(--text-main)' }}>
                  {selectedPaper.abstract || 'No description provided.'}
                </p>
                {selectedPaper.file_name && (
                  <div className="flex flex-wrap w-full items-center justify-start gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[160px] btn-ta-purple text-xs"
                      onClick={() => void handleDownloadDocument(selectedPaper.id)}
                      disabled={!isAuthenticated || documentLoading}
                    >
                      <Download className="size-3.5 mr-1" />
                      {documentLoading ? 'Downloading...' :
                        selectedPaper.status === 'phase1_proposal_submitted' || selectedPaper.document_type === 'thesis_topic'
                          ? 'Download Topic Submission'
                          : selectedPaper.status === 'phase2_proposal_submitted' || selectedPaper.status === 'phase2_proposal_accepted'
                          ? 'Download Project Proposal'
                          : 'Download Thesis Document'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[160px] text-xs font-semibold"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      onClick={() => window.open(`/editor?paperId=${selectedPaper.id}`, '_blank')}
                    >
                      📝 Edit in Document Editor
                    </Button>
                  </div>
                )}
              </div>

              {documentViewerUrl && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      Document Workspace: {selectedPaper.title} ({documentViewerName || 'Document'})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(documentViewerUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="size-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                  {(documentMimeType || '').toLowerCase().includes('pdf') || (documentViewerName || '').toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={documentViewerUrl}
                      title="Paper Document Viewer"
                      className="w-full h-[70vh] rounded border bg-white"
                    />
                  ) : (
                    <DocxViewer
                      fileUrl={documentViewerUrl}
                      token={localStorage.getItem(ACCESS_TOKEN_KEY)}
                      filename={documentViewerName || selectedPaper.file_name || 'Document.docx'}
                    />
                  )}
                </div>
              )}

              {canUploadCorrection && (
                <div className="space-y-2">
                  <input
                    ref={correctedFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleCorrectedFileSelected}
                  />
                  <Button
                    variant="outline"
                    onClick={handlePickCorrectedFile}
                    disabled={uploadingCorrectedFile}
                  >
                    {correctedFile ? 'Change Corrected File' : 'Upload Corrected Version'}
                  </Button>
                  {correctedFile && (
                    <p className="text-xs text-muted-foreground">
                      Attached: {correctedFile.name} (will send on Submit Review)
                    </p>
                  )}
                </div>
              )}

              {/* Custom Phase 1 Workflow Components */}
              {selectedPaper.status === 'phase1_proposal_submitted' && !selectedPaper.supervisor_id && (isHOD || isCoordinator || isAdmin) && (() => {
                const paperDeptName = (selectedPaper.discipline || '').trim().toLowerCase()
                const displaySups = supervisorsList.filter(u => {
                  const supDept = (u.department || '').trim().toLowerCase()
                  return supDept && paperDeptName && supDept === paperDeptName
                })
                const listToRender = displaySups.length > 0 ? displaySups : supervisorsList

                return (
                  <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                    <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                      <Shield className="size-4" />
                      Phase 1 — Thesis Topic Review (HOD & Coordinator)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Accept or Reject the student's submitted topic (title & short description), and assign a supervisor from their department.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="assign-sup-select">Select Supervisor *</Label>
                      <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Supervisor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {listToRender.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.full_name || s.email} ({(s.roles && s.roles.length ? s.roles : [s.role]).join(', ')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposal-comments">Feedback Comments (Optional)</Label>
                      <Textarea 
                        id="proposal-comments"
                        placeholder="Add any topic feedback or guidance for the student..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={3}
                      />
                    </div>
                    {reviewError && (
                      <p className="text-xs text-destructive">{reviewError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          setSubmittingReview(true)
                          try {
                            await apiReviewPaper(selectedPaper.id, 'reject', reviewComments || 'Thesis topic rejected by HOD', token)
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            await loadAll()
                          } catch (err) {
                            setReviewError(err instanceof Error ? err.message : 'Rejection failed')
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                        disabled={submittingReview}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        Reject Topic
                      </Button>
                      <Button 
                        onClick={async () => {
                          if (!selectedSupervisorId) {
                            setReviewError('Please select a supervisor before accepting the topic.')
                            return
                          }
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          setSubmittingReview(true)
                          try {
                            // Assign supervisor & transition status to phase1_topic_accepted -> Phase 2
                            await apiAssignSupervisor(selectedPaper.id, Number(selectedSupervisorId), token)
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            await loadAll()
                          } catch (err) {
                            setReviewError(err instanceof Error ? err.message : 'Topic acceptance failed')
                          } finally {
                            setSubmittingReview(false)
                          }
                        }} 
                        disabled={!selectedSupervisorId || submittingReview}
                      >
                        {submittingReview ? 'Processing...' : 'Accept Topic & Assign Supervisor'}
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {selectedPaper.status === 'phase2_pending_supervisor' && (isHOD || isCoordinator || isAdmin) && (() => {
                const paperDeptName = (selectedPaper.discipline || '').trim().toLowerCase()
                const displaySups = supervisorsList.filter(u => {
                  const supDept = (u.department || '').trim().toLowerCase()
                  return supDept && paperDeptName && supDept === paperDeptName
                })
                const listToRender = displaySups.length > 0 ? displaySups : supervisorsList

                return (
                  <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                    <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                      <Shield className="size-4" />
                      Phase 2: Assign Supervisor (HOD & Coordinator)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Assign a supervisor from the student's department to supervise chapter submissions.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="assign-sup-select">Select Supervisor *</Label>
                      <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Supervisor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {listToRender.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.full_name || s.email} ({(s.roles && s.roles.length ? s.roles : [s.role]).join(', ')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposal-comments">Feedback Comments (Optional)</Label>
                      <Textarea 
                        id="proposal-comments"
                        placeholder="Add any feedback for the student..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={3}
                      />
                    </div>
                    {reviewError && (
                      <p className="text-xs text-destructive">{reviewError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          setSubmittingReview(true)
                          try {
                            await apiReviewPaper(selectedPaper.id, 'reject', reviewComments || 'Proposal rejected by HOD', token)
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            await loadAll()
                          } catch (err) {
                            setReviewError(err instanceof Error ? err.message : 'Rejection failed')
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                        disabled={submittingReview}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        Reject Proposal
                      </Button>
                      <Button 
                        onClick={async () => {
                          if (!selectedSupervisorId) return
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          setSubmittingReview(true)
                          try {
                            // Assign supervisor & transition status to phase3_chapters
                            await apiAssignSupervisor(selectedPaper.id, Number(selectedSupervisorId), token)
                            if (reviewComments.trim()) {
                              await apiReviewPaper(selectedPaper.id, 'approve', reviewComments, token)
                            }
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            await loadAll()
                          } catch (err) {
                            setReviewError(err instanceof Error ? err.message : 'Assignment failed')
                          } finally {
                            setSubmittingReview(false)
                          }
                        }} 
                        disabled={!selectedSupervisorId || submittingReview}
                      >
                        {submittingReview ? 'Processing...' : 'Approve & Assign Supervisor'}
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {/* ====================================================
               * PHASE 2 — SUPERVISOR: Proposal Accept / Revise Panel
               * Shows when student has submitted their project proposal
               * and it is awaiting the supervisor's decision.
               * ==================================================== */}
              {selectedPaper.status === 'phase2_proposal_submitted' && (isSupervisor || isAdmin) && (
                <div className="border-2 border-amber-400/40 rounded-xl p-5 bg-amber-50/50 dark:bg-amber-950/10 space-y-4">
                  <h4 className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <FileText className="size-4" />
                    Phase 2: Project Proposal Review (Supervisor Action Required)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    The student has submitted their <strong>Project Proposal</strong> for your review. Download the document above, 
                    then choose to <strong>Accept</strong> the proposal (which will allow the student to begin submitting thesis steps) 
                    or <strong>Request Revision</strong> (which sends it back to the student with your feedback).
                  </p>

                  {/* Show previous supervisor comment if any */}
                  {selectedPaper.review_comments && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Previous Feedback Sent to Student:</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{selectedPaper.review_comments}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Feedback / Comments for Student</Label>
                    <Textarea
                      placeholder="Enter your feedback for the student (required when requesting revision, optional when accepting)..."
                      value={reviewComments}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReviewComments(e.target.value)}
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs text-destructive font-medium">{reviewError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-end pt-3 border-t border-amber-300/30">
                    <Button
                      variant="outline"
                      className="border-amber-500 text-amber-600 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-500/70 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold shadow-sm"
                      disabled={submittingReview || !reviewComments.trim()}
                      onClick={async () => {
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token || !selectedPaper) return
                        setSubmittingReview(true)
                        setReviewError('')
                        try {
                          await apiProposalDecision(selectedPaper.id, 'revise', reviewComments, token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          setReviewComments('')
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Failed to request revision')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }}
                    >
                      {submittingReview ? 'Sending...' : '↺ Request Revision (Send Back)'}
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white font-bold shadow-md border-0"
                      disabled={submittingReview}
                      onClick={async () => {
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token || !selectedPaper) return
                        setSubmittingReview(true)
                        setReviewError('')
                        try {
                          await apiProposalDecision(selectedPaper.id, 'accepted', reviewComments, token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          setReviewComments('')
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Failed to accept proposal')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }}
                    >
                      {submittingReview ? 'Processing...' : '✓ Accept Proposal (Advance to Steps Phase)'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ====================================================
               * PHASE 2 — SUPERVISOR: Dynamic Steps Review Panel
               * Shows when proposal is accepted & student submits steps.
               * ==================================================== */}
              {(selectedPaper.status === 'phase3_chapters' || selectedPaper.status === 'phase3_steps_in_progress') && (isSupervisor || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <CheckSquare className="size-4" />
                    Phase 2: Dynamic Steps Review (Supervisor)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Review thesis steps/chapters submitted by the student. Approve or request revisions per step, and click <strong>Finish Steps</strong> when all required work is completed to advance to Phase 3 (Examination).
                  </p>

                  {/* List of Student Steps */}
                  {selectedPaper.steps && selectedPaper.steps.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPaper.steps.map((st) => (
                        <div key={st.id} className="rounded-lg border bg-background p-3 text-xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              Step {st.step_number}: {st.title || `Step ${st.step_number}`}
                            </span>
                            <Badge variant={st.status === 'approved' ? 'default' : st.status === 'revise' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                              {st.status}
                            </Badge>
                          </div>
                          {st.supervisor_comment && (
                            <p className="text-muted-foreground bg-muted/40 p-2 rounded text-[11px]">
                              <strong className="text-foreground">Feedback:</strong> {st.supervisor_comment}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                try {
                                  const { apiDownloadStepFile } = await import('../../lib/api')
                                  const { blob, filename } = await apiDownloadStepFile(st.id, token)
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = filename
                                  document.body.appendChild(a)
                                  a.click()
                                  a.remove()
                                  window.URL.revokeObjectURL(url)
                                } catch (err) {
                                  window.alert(err instanceof Error ? err.message : 'Download failed')
                                }
                              }}
                              className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                            >
                              <Download className="size-3 mr-1" /> Download Step {st.step_number} File
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(`/editor?stepId=${st.id}`, '_blank')
                              }}
                              className="text-xs h-8 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
                            >
                              📝 View & Edit Step {st.step_number} in Editor
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                setSubmittingReview(true)
                                try {
                                  await apiStepDecision(st.id, 'approved', reviewComments, token)
                                  setReviewComments('')
                                  await loadAll()
                                } catch (err) {
                                  setReviewError(err instanceof Error ? err.message : 'Step approval failed')
                                } finally {
                                  setSubmittingReview(false)
                                }
                              }}
                              disabled={submittingReview}
                              className="text-xs h-8 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/40 font-semibold"
                            >
                              ✓ Approve Step {st.step_number}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                setSubmittingReview(true)
                                try {
                                  await apiStepDecision(st.id, 'revise', reviewComments || 'Revision requested on step', token)
                                  setReviewComments('')
                                  await loadAll()
                                } catch (err) {
                                  setReviewError(err instanceof Error ? err.message : 'Step revision failed')
                                } finally {
                                  setSubmittingReview(false)
                                }
                              }}
                              disabled={submittingReview}
                              className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-600 dark:hover:text-amber-300"
                            >
                              Request Step Revision
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded p-3 text-center text-xs text-muted-foreground">
                      No steps submitted by student yet.
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="step-overall-comments">Step Feedback Comments (Optional)</Label>
                    <Textarea
                      id="step-overall-comments"
                      placeholder="Add feedback notes when approving or requesting revisions on a step..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs text-destructive">{reviewError}</p>
                  )}

                  <div className="flex justify-end border-t pt-3">
                    <Button
                      onClick={async () => {
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) return
                        setSubmittingReview(true)
                        try {
                          await apiCompletePhase3(selectedPaper.id, token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Finish steps failed')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }}
                      disabled={submittingReview}
                      className="bg-primary text-primary-foreground font-semibold"
                    >
                      {submittingReview ? 'Completing...' : 'Finish Steps (Advance to Phase 3 — Examination)'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedPaper.status === 'phase4_pending_examiners' && (isHOD || isCoordinator || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Shield className="size-4" />
                    Phase 3: Assign Examiners (HOD / Coordinator)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Assign one internal and one external examiner individually or via automated batch mapping.
                  </p>

                  {/* Individual Examiner Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assign-internal-select">Select Internal Examiner *</Label>
                      <Select value={selectedInternalId} onValueChange={setSelectedInternalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Internal Examiner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisorsList.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.full_name || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assign-external-select">Select External Examiner *</Label>
                      <Select value={selectedExternalId} onValueChange={setSelectedExternalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose External Examiner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisorsList.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.full_name || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <Button 
                      onClick={async () => {
                        setReviewError('')
                        if (!selectedInternalId || !selectedExternalId) {
                          setReviewError('Please select both an Internal and External examiner.')
                          return
                        }
                        if (selectedInternalId === selectedExternalId) {
                          setReviewError('Internal and External examiners must be different users')
                          return
                        }
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) {
                          setReviewError('Authentication token missing. Please log in again.')
                          return
                        }
                        setSubmittingReview(true)
                        try {
                          await apiAssignExaminers(selectedPaper.id, Number(selectedInternalId), Number(selectedExternalId), token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          await loadAll()
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : 'Assignment failed'
                          if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Failed to execute')) {
                            setReviewError('Unable to connect to the backend server. Please refresh the page or ensure the backend server is active.')
                          } else {
                            try {
                              const parsed = JSON.parse(msg)
                              setReviewError(parsed.detail || msg)
                            } catch {
                              setReviewError(msg)
                            }
                          }
                        } finally {
                          setSubmittingReview(false)
                        }
                      }} 
                      disabled={!selectedInternalId || !selectedExternalId || submittingReview}
                    >
                      {submittingReview ? 'Assigning...' : 'Assign Examiners'}
                    </Button>
                    {reviewError && (
                      <p className="text-xs font-semibold text-destructive mt-1">{reviewError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 4: Examiner Marking & Evaluation Panel */}
              {selectedPaper.status === 'phase4_marking' && (isSupervisor || isAdmin || isHOD || isCoordinator || selectedPaper.internal_examiner_id === user?.id || selectedPaper.external_examiner_id === user?.id) && (
                <div className="border rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <h4 className="font-bold text-sm text-purple-500 flex items-center gap-2 m-0">
                      <Award className="size-4 text-purple-500" />
                      Phase 4: Examiner In-System Grading & Feedback
                    </h4>
                    <Button
                      size="sm"
                      className="btn-ta-purple text-xs flex items-center gap-1.5"
                      onClick={() => void handleDownloadDocument(selectedPaper.id)}
                      disabled={documentLoading}
                    >
                      <Download className="size-3.5" />
                      {documentLoading ? 'Downloading...' : 'Download Thesis File'}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-sub)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Step 1:</strong> Use the ONLYOFFICE tools below to view the student's work, author comments in ONLYOFFICE Word, or enter scores in ONLYOFFICE Excel.<br />
                    <strong style={{ color: 'var(--text-main)' }}>Step 2:</strong> Once finished in ONLYOFFICE, click <strong className="text-purple-500">"Submit In-System Evaluation"</strong> below to finalize.
                  </p>

                  {/* ONLYOFFICE Evaluation Tools Panel */}
                  <div className="border rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                    <h5 className="font-semibold text-xs text-purple-500 flex items-center gap-1.5 m-0">
                      <FileEdit className="size-4 text-purple-500" />
                      ONLYOFFICE In-App Marking & Feedback Tools
                    </h5>
                    <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                      Click below to view the student's submitted thesis, write qualitative feedback in ONLYOFFICE Word, or edit marks in ONLYOFFICE Excel:
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=paper`, '_blank')}
                      >
                        📝 View / Edit Student Work (ONLYOFFICE)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=comments`, '_blank')}
                      >
                        💬 Open Comments Document (ONLYOFFICE Word)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=excel`, '_blank')}
                      >
                        📊 Open Marks Sheet (ONLYOFFICE Excel)
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="examiner-score-input" className="text-xs font-semibold">
                        Numerical Score (0 – 100%)
                      </Label>
                      <Input
                        id="examiner-score-input"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g. 85"
                        value={selectedPaper.internal_examiner_id === user?.id ? internalScore : (selectedPaper.external_examiner_id === user?.id ? externalScore : (internalScore || externalScore))}
                        onChange={(e) => {
                          setInternalScore(e.target.value)
                          setExternalScore(e.target.value)
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="examiner-recommendation-select" className="text-xs font-semibold">
                        Recommendation
                      </Label>
                      <Select value={examinerRecommendation} onValueChange={setExaminerRecommendation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recommendation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pass">Pass</SelectItem>
                          <SelectItem value="Pass with Revisions">Pass with Revisions</SelectItem>
                          <SelectItem value="Fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="examiner-comments-input" className="text-xs font-semibold">
                      Qualitative Remarks & Corrections
                    </Label>
                    <Textarea
                      id="examiner-comments-input"
                      rows={3}
                      placeholder="Enter specific feedback, corrections, or instructions for the student..."
                      value={examinerCorrections}
                      onChange={(e) => setExaminerCorrections(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="results-file-input">Annotated Script / Mark Sheet (Optional File Upload)</Label>
                    <Input 
                      id="results-file-input"
                      type="file" 
                      accept=".pdf,.doc,.docx,.xlsx"
                      onChange={(e) => setResultsFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  {reviewError && (
                    <p className="text-xs text-destructive">{reviewError}</p>
                  )}
                  <div className="flex justify-end">
                    <Button 
                      onClick={async () => {
                        const isUserInternal = isAdmin || isHOD || isCoordinator || selectedPaper.internal_examiner_id === user?.id
                        const isUserExternal = isAdmin || isHOD || isCoordinator || selectedPaper.external_examiner_id === user?.id

                        const enteredScoreStr = isUserInternal ? internalScore : externalScore
                        const parsedScore = enteredScoreStr.trim() !== '' ? parseFloat(enteredScoreStr) : NaN

                        let scoreVal: number | undefined = !isNaN(parsedScore) ? parsedScore : undefined
                        if (scoreVal === undefined) {
                          if (isUserInternal && selectedPaper.internal_score !== undefined && selectedPaper.internal_score !== null) {
                            scoreVal = selectedPaper.internal_score
                          } else if (isUserExternal && selectedPaper.external_score !== undefined && selectedPaper.external_score !== null) {
                            scoreVal = selectedPaper.external_score
                          }
                        }
                        
                        const commentsVal = examinerCorrections.trim() || 'Qualitative feedback and evaluation completed in ONLYOFFICE Document & Excel Editors'
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) return
                        setSubmittingReview(true)
                        try {
                          await apiSubmitExaminerGrading(selectedPaper.id, {
                            score: scoreVal,
                            recommendation: examinerRecommendation || 'Pass',
                            general_comments: commentsVal,
                            file: resultsFile || undefined,
                          }, token)
                          
                          // Also trigger upload results for paper compatibility
                          await apiUploadResults(selectedPaper.id, {
                            internalScore: isUserInternal ? (scoreVal ?? selectedPaper.internal_score ?? undefined) : (selectedPaper.internal_score ?? undefined),
                            externalScore: isUserExternal ? (scoreVal ?? selectedPaper.external_score ?? undefined) : (selectedPaper.external_score ?? undefined),
                            examinerCorrections: commentsVal,
                            file: resultsFile || undefined
                          }, token)

                          setDialogOpen(false)
                          setSelectedPaper(null)
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Submission failed')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }}
                      disabled={submittingReview}
                    >
                      {submittingReview ? 'Submitting...' : 'Submit In-System Evaluation'}
                    </Button>
                  </div>
                </div>
              )}



              {/* Student Feedback View (Role-Based Privacy: Numerical Marks Omitted) */}
              {studentFeedbackData && !canViewScores && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                    <MessageSquare className="size-3.5" />
                    Examiner Feedback & Revision Instructions
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Status:</span>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {studentFeedbackData.revision_status || 'Under Examination'}
                    </Badge>
                  </div>

                  {studentFeedbackData.compiled_comments && (
                    <div className="bg-background border rounded-lg p-3 text-xs space-y-1">
                      <p className="font-semibold text-muted-foreground">Compiled Examiner Feedback:</p>
                      <p className="whitespace-pre-line text-foreground">{studentFeedbackData.compiled_comments}</p>
                    </div>
                  )}

                  {studentFeedbackData.qualitative_feedback.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Examiner Comments:</p>
                      {studentFeedbackData.qualitative_feedback.map((fb, i) => (
                        <div key={i} className="p-2.5 bg-background border rounded-lg text-xs space-y-1">
                          <div className="flex justify-between items-center text-[11px] text-muted-foreground font-medium">
                            <span className="capitalize">{fb.examiner_type} Examiner</span>
                            <span>{fb.recommendation}</span>
                          </div>
                          {fb.general_comments && (
                            <p className="text-foreground">{fb.general_comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedPaper.status === 'phase5_pending_supervisor' && (isSupervisor || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <CheckCircle className="size-4" />
                    Phase 4: Supervisor — Review Corrections
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    The student has uploaded their corrected thesis file. Review the changes and approve them to pass to HOD/Coordinator.
                  </p>

                  {selectedPaper.examiner_corrections && (
                    <div className="bg-background/80 border rounded p-3 text-xs space-y-1">
                      <p className="font-semibold text-muted-foreground">Original Corrections Specified:</p>
                      <p className="text-muted-foreground whitespace-pre-line">{selectedPaper.examiner_corrections}</p>
                    </div>
                  )}

                  {/* ONLYOFFICE & Download Tools Panel for Supervisor Review */}
                  <div className="bg-background border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <FileEdit className="size-4" />
                      ONLYOFFICE In-App Inspection & Verification Tools
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inspect the student's corrected thesis in ONLYOFFICE Word to verify their edits, or review the compiled examiner feedback document:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=paper`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-colors cursor-pointer border border-emerald-500"
                      >
                        <FileEdit className="size-3.5 text-white" />
                        📝 View Student's Corrected Thesis (ONLYOFFICE Word)
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=comments`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                      >
                        <MessageSquare className="size-3.5 text-slate-200" />
                        💬 View Examiners' Comments Document (ONLYOFFICE Word)
                      </button>
                      {(selectedPaper as any).file_path && (
                        <button
                          type="button"
                          onClick={() => void handleDownloadPaper(selectedPaper.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                        >
                          <Download className="size-3.5 text-slate-200" />
                          📥 Download Corrected File
                        </button>
                      )}
                    </div>
                  </div>
                  {reviewError && (
                    <p className="text-xs text-destructive">{reviewError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button 
                      onClick={async () => {
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) return
                        setSubmittingReview(true)
                        try {
                          await apiSupervisorApproveCorrections(selectedPaper.id, token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Approval failed')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }} 
                      disabled={submittingReview}
                    >
                      {submittingReview ? 'Approving...' : 'Approve Corrections & Forward to HOD/Coordinator'}
                    </Button>
                  </div>
                </div>
              )}

              {(selectedPaper.status === 'phase5_pending_coordinator' || selectedPaper.status === 'phase5_pending_hod') && (isHOD || isCoordinator || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Shield className="size-4" />
                    Phase 4: Dual Sign-off (HOD & Coordinator)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Supervisor approved. HOD and Coordinator must sign off to send the corrected thesis to the Librarian for publication.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="border rounded p-2 bg-background/50">
                      <span className="font-semibold text-muted-foreground">Coordinator Signed:</span>{' '}
                      {selectedPaper.project_coordinator_approved_at || selectedPaper.status === 'phase5_pending_hod' ? (
                        <span className="text-green-600 font-semibold">Yes ({selectedPaper.project_coordinator_approved_at ? new Date(selectedPaper.project_coordinator_approved_at).toLocaleDateString() : 'Signed'})</span>
                      ) : (
                        <span className="text-red-500 font-semibold">Awaiting Coordinator Signature</span>
                      )}
                    </div>
                    <div className="border rounded p-2 bg-background/50">
                      <span className="font-semibold text-muted-foreground">HOD Signed:</span>{' '}
                      {selectedPaper.hod_approved_at ? (
                        <span className="text-green-600 font-semibold">Yes ({new Date(selectedPaper.hod_approved_at).toLocaleDateString()})</span>
                      ) : (
                        <span className="text-red-500 font-semibold">Awaiting Signature</span>
                      )}
                    </div>
                  </div>

                  {canViewScores && (
                    <div className="border rounded-lg p-3 text-xs bg-background/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Award className="size-4 text-primary" />
                          Examiner Score Breakdown & Degree Rules:
                        </p>
                        {adminMarksData?.degree_level && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {adminMarksData.degree_level}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-1">
                        <div className="border rounded p-1.5 bg-background text-center">
                          <span className="block text-[10px] uppercase font-medium">Internal Examiner</span>
                          <strong className="text-foreground text-sm">
                            {adminMarksData?.internal_score !== null && adminMarksData?.internal_score !== undefined
                              ? `${adminMarksData.internal_score}%`
                              : selectedPaper.internal_score !== null && selectedPaper.internal_score !== undefined
                              ? `${selectedPaper.internal_score}%`
                              : 'Pending'}
                          </strong>
                        </div>
                        <div className="border rounded p-1.5 bg-background text-center">
                          <span className="block text-[10px] uppercase font-medium">External Examiner</span>
                          <strong className="text-foreground text-sm">
                            {adminMarksData?.external_score !== null && adminMarksData?.external_score !== undefined
                              ? `${adminMarksData.external_score}%`
                              : selectedPaper.external_score !== null && selectedPaper.external_score !== undefined
                              ? `${selectedPaper.external_score}%`
                              : 'Pending'}
                          </strong>
                        </div>
                        <div className="border rounded p-1.5 bg-background text-center">
                          <span className="block text-[10px] uppercase font-medium">3rd Examiner</span>
                          <strong className="text-foreground text-sm">
                            {adminMarksData?.third_examiner_score !== null && adminMarksData?.third_examiner_score !== undefined
                              ? `${adminMarksData.third_examiner_score}%`
                              : 'N/A'}
                          </strong>
                        </div>
                        <div className="border rounded p-1.5 bg-primary/10 border-primary/20 text-center">
                          <span className="block text-[10px] uppercase font-bold text-primary">Final Average Score</span>
                          <strong className="text-primary text-sm font-black">
                            {adminMarksData?.average_score !== null && adminMarksData?.average_score !== undefined
                              ? `${adminMarksData.average_score}%`
                              : 'Pending'}
                          </strong>
                        </div>
                      </div>

                      {adminMarksData?.calculation_note && (
                        <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded border">
                          ℹ️ {adminMarksData.calculation_note}
                        </p>
                      )}

                      {adminMarksData?.requires_third_examiner && (
                        <div className="p-3 border border-amber-500/40 bg-amber-500/10 rounded-md space-y-2">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                            <AlertTriangle className="size-4" />
                            <span>Score Difference exceeds 20 Marks ({adminMarksData.score_difference} marks)! 3rd Examiner Required.</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Per regulation rules, when the difference between examiner scores exceeds 20 marks, a 3rd examiner must evaluate the work. The final score will be the average of all 3 scores.
                          </p>
                          {(isHOD || isCoordinator || isAdmin) && (
                            <div className="flex items-center gap-2 pt-1">
                              <Select value={selectedThirdId} onValueChange={setSelectedThirdId}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue placeholder="Select 3rd Examiner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {supervisorsList.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                      {u.full_name || u.email} ({u.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 text-xs shrink-0"
                                disabled={!selectedThirdId || assigningThird}
                                onClick={async () => {
                                  if (!selectedPaper || !selectedThirdId) return
                                  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                  if (!token) return
                                  setAssigningThird(true)
                                  try {
                                    await apiAssignThirdExaminer(selectedPaper.id, Number(selectedThirdId), token)
                                    const updated = await apiGetAdminExaminationMarks(selectedPaper.id, token)
                                    setAdminMarksData(updated)
                                    setSelectedThirdId('')
                                    await loadAll()
                                  } catch (err) {
                                    setReviewError(err instanceof Error ? err.message : 'Failed to assign 3rd examiner')
                                  } finally {
                                    setAssigningThird(false)
                                  }
                                }}
                              >
                                {assigningThird ? 'Assigning...' : 'Assign 3rd Examiner'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ONLYOFFICE & Download Tools Panel for Dual Sign-off */}
                  <div className="bg-background border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <FileEdit className="size-4" />
                      ONLYOFFICE In-App Inspection & Verification Tools
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inspect the student's corrected thesis in ONLYOFFICE Word before final sign-off, or view the compiled examiner feedback document:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=paper`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-colors cursor-pointer border border-emerald-500"
                      >
                        <FileEdit className="size-3.5 text-white" />
                        📝 View Student's Corrected Thesis (ONLYOFFICE Word)
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/editor?paperId=${selectedPaper.id}&type=comments`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                      >
                        <MessageSquare className="size-3.5 text-slate-200" />
                        💬 View Examiners' Comments Document (ONLYOFFICE Word)
                      </button>
                      {(selectedPaper as any).file_path && (
                        <button
                          type="button"
                          onClick={() => void handleDownloadPaper(selectedPaper.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                        >
                          <Download className="size-3.5 text-slate-200" />
                          📥 Download Corrected File
                        </button>
                      )}
                    </div>
                  </div>

                  {((selectedPaper.status === 'phase5_pending_coordinator' && (isCoordinator || isAdmin)) ||
                    (selectedPaper.status === 'phase5_pending_hod' && (isHOD || isAdmin))) ? (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="final-sig-comments">Approval/Revision Comments</Label>
                        <Textarea 
                          id="final-sig-comments"
                          rows={3}
                          value={reviewComments} 
                          onChange={(e) => setReviewComments(e.target.value)} 
                          placeholder="Add comments or instructions..."
                        />
                      </div>
                      {reviewError && (
                        <p className="text-xs text-destructive">{reviewError}</p>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline"
                          onClick={async () => {
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              if (isCoordinator) {
                                await apiCoordinatorApproveCorrections(selectedPaper.id, 'revise', reviewComments || 'Revision requested by Project Coordinator', token)
                              } else {
                                await apiHodApproveCorrections(selectedPaper.id, 'revise', reviewComments || 'Revision requested by HOD', token)
                              }
                              setDialogOpen(false)
                              setSelectedPaper(null)
                              await loadAll()
                            } catch (err) {
                              setReviewError(err instanceof Error ? err.message : 'Submission failed')
                            } finally {
                              setSubmittingReview(false)
                            }
                          }} 
                          disabled={submittingReview}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          Request Revisions
                        </Button>
                        <Button 
                          onClick={async () => {
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              if (isCoordinator) {
                                await apiCoordinatorApproveCorrections(selectedPaper.id, 'approved', reviewComments, token)
                              } else {
                                await apiHodApproveCorrections(selectedPaper.id, 'approved', reviewComments, token)
                              }
                              setDialogOpen(false)
                              setSelectedPaper(null)
                              await loadAll()
                            } catch (err) {
                              setReviewError(err instanceof Error ? err.message : 'Approval failed')
                            } finally {
                              setSubmittingReview(false)
                            }
                          }} 
                          disabled={submittingReview}
                        >
                          {submittingReview ? 'Signing...' : isCoordinator ? 'Sign as Project Coordinator' : 'Sign & Approve Final Work (HOD)'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3 rounded-lg">
                      Awaiting sign-off signatures from Supervisor, Project Coordinator, and HOD.
                    </div>
                  )}
                </div>
              )}

              {!selectedPaper.status.startsWith('phase') && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="decision">{isLibrarian ? 'Publication Decision' : 'Review Decision'}</Label>
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger>
                        <SelectValue placeholder={isLibrarian ? 'Select publication action' : 'Select decision'} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLibrarian ? (
                          <>
                            <SelectItem value="publish">Publish</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="approve">Approve</SelectItem>
                            <SelectItem value="revision">Request Revisions</SelectItem>
                            <SelectItem value="reject">Reject</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="comments">{isLibrarian ? 'Publication Notes' : 'Review Comments'}</Label>
                    <Textarea
                      id="comments"
                      placeholder={isLibrarian ? 'Optional notes for the author regarding publication...' : 'Provide detailed feedback for the author...'}
                      rows={6}
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    {reviewError && (
                      <p className="mr-auto text-sm text-destructive">{reviewError}</p>
                    )}
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={() => void handleReview()} disabled={!reviewDecision || submittingReview}>
                      {submittingReview ? 'Submitting...' : isLibrarian ? 'Publish Work' : 'Submit Review'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
