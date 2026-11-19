import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import {
  CheckCircle,
  Clock,
  FileText,
  Eye,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Shield,
  CheckSquare,
  Award,
  Download,
  FileEdit,
} from 'lucide-react'
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
  apiCompletePhase3,
  apiAssignExaminers,
  apiUploadResults,
  apiSupervisorApproveCorrections,
  apiSupervisorRejectCorrections,
  apiCoordinatorApproveCorrections,
  apiHodApproveCorrections,
  apiStepDecision,
  apiListDepartments,
  apiDownloadApprovedZip,
  apiDownloadExaminerResultsZip,
  apiDownloadExaminerAssignedZip,
  apiProposalDecision,
  apiSubmitExaminerGrading,
  apiGetStudentFeedback,
  apiGetAdminExaminationMarks,
  apiAssignThirdExaminer,
} from '../../lib/api'
import { DocxViewer } from './DocxViewer'
import { convertTextOrTopicToPdf } from '../../lib/pdfGenerator'
import { ProjectAssessmentReportDialog } from './ProjectAssessmentReportDialog'
import { ReportExportModal } from './ReportExportModal'
import type {
  ApiPaper,
  ApiUser,
  ApiBulkAssignSummary,
  ApiStudentFeedbackResponse,
  ApiAdminMarkSheetResponse,
} from '../../lib/api'

const ACCESS_TOKEN_KEY = 'murrs_access_token'
type ChapterKey = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5'

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
  if (
    status === 'phase2_proposal_submitted' ||
    status === 'phase2_proposal_accepted' ||
    status === 'phase2_pending_supervisor' ||
    status === 'phase2_pending_coordinator'
  ) {
    return 'Project Proposal (Phase 2)'
  }
  if (
    status === 'phase3_chapters' ||
    status === 'phase3_steps_in_progress' ||
    status === 'phase3_all_steps_approved'
  ) {
    return 'Steps / Chapter Review (Phase 2 — Continuation)'
  }
  if (
    status === 'phase4_pending_examiners' ||
    status === 'phase4_marking' ||
    status === 'phase4_examination_completed'
  ) {
    return 'Examination (Phase 3)'
  }
  if (
    status === 'phase5_corrections' ||
    status === 'phase5_pending_supervisor' ||
    status === 'phase5_pending_coordinator' ||
    status === 'phase5_pending_hod' ||
    status === 'phase5_pending_hod_and_coordinator'
  ) {
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
  const [reportExportOpen, setReportExportOpen] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [correctedFile, setCorrectedFile] = useState<File | null>(null)
  const [correctedNote, setCorrectedNote] = useState('')
  const [uploadingCorrectedFile, setUploadingCorrectedFile] = useState(false)
  const [documentViewerUrl, setDocumentViewerUrl] = useState<string | null>(null)
  const [documentViewerName, setDocumentViewerName] = useState<string>('')
  const [documentMimeType, setDocumentMimeType] = useState<string>('')
  const [documentLoading, setDocumentLoading] = useState(false)

  const roles = user?.roles || (user?.role ? [user.role] : [])
  const isLibrarian =
    roles.includes('librarian') ||
    roles.includes('head_library') ||
    user?.role === 'librarian' ||
    user?.role === 'head_library'
  const canUploadCorrection =
    roles.includes('lecturer') ||
    roles.includes('project_supervisor') ||
    user?.role === 'lecturer' ||
    user?.role === 'project_supervisor'
  const correctedFileInputRef = useRef<HTMLInputElement | null>(null)

  const isHOD = roles.includes('hod')
  const isCoordinator = roles.includes('project_coordinator')
  const isSupervisor =
    roles.includes('project_supervisor') || roles.includes('lecturer') || roles.includes('hod')
  const isDean = roles.includes('dean')
  const isAdmin = roles.includes('system_admin')
  const canViewScores =
    roles.includes('hod') ||
    roles.includes('project_coordinator') ||
    roles.includes('dean') ||
    roles.includes('system_admin')

  const [supervisorsList, setSupervisorsList] = useState<ApiUser[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('')
  const [selectedInternalId, setSelectedInternalId] = useState<string>('')
  const [selectedExternalId, setSelectedExternalId] = useState<string>('')

  const [, setSupChecklist] = useState<Record<ChapterKey, boolean>>({
    ch1: false,
    ch2: false,
    ch3: false,
    ch4: false,
    ch5: false,
  })

  const [, setInternalScore] = useState<string>('')
  const [, setExternalScore] = useState<string>('')
  const [, setExaminerCorrections] = useState<string>('')
  const [, setResultsFile] = useState<File | null>(null)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [activeExaminerRole, setActiveExaminerRole] = useState<
    'Internal Examiner' | 'External Examiner' | 'Third Examiner' | 'Coordinator / HOD'
  >('Internal Examiner')

  const [, setBulkSummary] = useState<ApiBulkAssignSummary | null>(null)
  const [studentFeedbackData, setStudentFeedbackData] = useState<ApiStudentFeedbackResponse | null>(null)
  const [adminMarksData, setAdminMarksData] = useState<ApiAdminMarkSheetResponse | null>(null)
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [assigningThird, setAssigningThird] = useState(false)
  const [selectedDegreeTier, setSelectedDegreeTier] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    const userRoles = user?.roles || (user?.role ? [user.role] : [])
    const hasPrivilege =
      userRoles.includes('hod') ||
      userRoles.includes('project_coordinator') ||
      userRoles.includes('system_admin') ||
      userRoles.includes('dean')

    if (hasPrivilege) {
      apiListUsers(token, { limit: 1000 })
        .then((list) => {
          const sups = list.filter((u) => {
            const uRoles = u.roles || [u.role]
            return uRoles.some((r) =>
              [
                'project_supervisor',
                'lecturer',
                'hod',
                'project_coordinator',
                'dean',
                'external_examiner',
              ].includes(r),
            )
          })
          setSupervisorsList(sups)
        })
        .catch(() => {})
    }
  }, [user])

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token || !user?.department) return
    apiListDepartments(token)
      .then((depts) => {
        const matched = depts.find(
          (d) => (d.name || '').trim().toLowerCase() === (user.department || '').trim().toLowerCase(),
        )
        if (matched) {
          setDepartmentId(matched.id)
        }
      })
      .catch(() => {})
  }, [user])

  const handleDownloadAllApprovedZip = async () => {
    if (!departmentId) {
      window.alert('Department not resolved. Please contact administrator.')
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
      window.alert('Department not resolved. Please contact administrator.')
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
      const { blob: rawBlob, filename: rawFilename } = await apiDownloadPaperFile(paperId, token)

      const authorDisplay =
        selectedPaper?.authors?.map((a) => a.name).filter(Boolean).join(', ') || 'Student'

      const { blob, filename } = await convertTextOrTopicToPdf(rawBlob, rawFilename, {
        title: selectedPaper?.title,
        abstract: selectedPaper?.abstract,
        author: authorDisplay,
        department: selectedPaper?.discipline,
        discipline: selectedPaper?.discipline,
        id: selectedPaper?.id,
        created_at: selectedPaper?.created_at,
        document_type: selectedPaper?.document_type,
        status: selectedPaper?.status,
      })

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
        const updated = await apiUploadCorrectedPaperFile(
          selectedPaper.id,
          correctedFile,
          correctedNote,
          token,
        )
        setSelectedPaper(updated)
        setCorrectedFile(null)
        setCorrectedNote('')
        setUploadingCorrectedFile(false)
      }
      const decisionForApi = (
        isLibrarian && reviewDecision === 'publish' ? 'approve' : reviewDecision
      ) as 'approve' | 'revision' | 'reject'
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
    setReviewDecision(isLibrarian ? 'publish' : '')
    setCorrectedFile(null)
    setCorrectedNote('')
    setBulkSummary(null)

    setSupChecklist({
      ch1: !!paper.ch1_supervisor_approved,
      ch2: !!paper.ch2_supervisor_approved,
      ch3: !!paper.ch3_supervisor_approved,
      ch4: !!paper.ch4_supervisor_approved,
      ch5: !!paper.ch5_supervisor_approved,
    })

    setInternalScore(
      paper.internal_score !== null && paper.internal_score !== undefined
        ? String(paper.internal_score)
        : '',
    )
    setExternalScore(
      paper.external_score !== null && paper.external_score !== undefined
        ? String(paper.external_score)
        : '',
    )
    setExaminerCorrections(paper.examiner_corrections || '')
    setResultsFile(null)

    setSelectedSupervisorId(paper.supervisor_id ? String(paper.supervisor_id) : '')
    setSelectedInternalId(paper.internal_examiner_id ? String(paper.internal_examiner_id) : '')
    setSelectedExternalId(paper.external_examiner_id ? String(paper.external_examiner_id) : '')
    setStudentFeedbackData(null)
    setAdminMarksData(null)

    const initialTier =
      paper.degree_level ||
      (paper.publication_type?.toLowerCase().includes('undergrad') ||
      paper.document_type?.toLowerCase().includes('undergrad') ||
      paper.discipline?.toLowerCase().includes('b.sc') ||
      paper.discipline?.toLowerCase().includes('bsc')
        ? 'Undergraduate'
        : paper.publication_type?.toLowerCase().includes('mphil')
        ? 'MPhil'
        : paper.publication_type?.toLowerCase().includes('phd') ||
          paper.document_type?.toLowerCase().includes('phd') ||
          paper.document_type?.toLowerCase().includes('doctoral')
        ? 'PhD'
        : 'Masters')
    setSelectedDegreeTier(initialTier)

    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      if (canViewScores) {
        apiGetAdminExaminationMarks(paper.id, token)
          .then(setAdminMarksData)
          .catch(() => setAdminMarksData(null))
      }
      apiGetStudentFeedback(paper.id, token)
        .then(setStudentFeedbackData)
        .catch(() => setStudentFeedbackData(null))
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
    setSelectedDegreeTier('')
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
    <div className="space-y-8">
      {/* FinPlanner Top Heading */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1a1d1a] mb-1">
          {isLibrarian ? 'Publication Workflow' : 'Approval Workflow'}
        </h1>
        <p className="text-[14px] text-[#6e746b]">
          {isLibrarian
            ? 'Publish fully approved research papers and assign official repository metadata.'
            : 'Review, assign supervisors & examiners, and manage thesis submissions across all 5 phases.'}
        </p>
      </div>

      {loading && (
        <div className="fp-card py-8 text-center text-[#6e746b] text-[13px]">
          Loading workflow submissions...
        </div>
      )}
      {error && (
        <div className="fp-card border-[#c93b2b]/30 bg-[#fbeae8]/40 text-[#c93b2b] text-[13px] font-medium">
          {error}
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="size-3.5" />
            <span>{isLibrarian ? 'Ready to Publish' : 'Pending Review'}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ffffff]/20">
              {pendingSubmissions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="size-3.5" />
            <span>{isLibrarian ? 'Published Repository Catalog' : 'Approved'}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ffffff]/20">
              {approvedPapers.length}
            </span>
          </TabsTrigger>
          {!isLibrarian && (
            <TabsTrigger value="revision" className="flex items-center gap-2">
              <AlertCircle className="size-3.5" />
              <span>Revision Requested</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ffffff]/20">
                {revisionRequested.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {(isHOD || isCoordinator || isDean || isAdmin) && (
            <div className="fp-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h4 className="text-[15px] font-bold text-[#1a1d1a] flex items-center gap-2 m-0">
                  <Award className="size-4 text-[#3b7a57]" />
                  {isDean
                    ? 'School & Department Master Results Hub'
                    : 'Department Examiner Results Hub'}
                </h4>
                <p className="text-[13px] text-[#6e746b] mt-1 m-0">
                  Open ONLYOFFICE Excel workbooks or export filtered reports by programme and certification tier.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="sm" onClick={() => setReportExportOpen(true)}>
                  Export Filtered Reports (Excel / CSV)
                </Button>
                {(isHOD || isCoordinator || isAdmin) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/editor?type=dept_results_excel', '_blank')}
                  >
                    Department Results (ONLYOFFICE)
                  </Button>
                )}
                {(isDean || isAdmin) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/editor?type=dean_results_excel', '_blank')}
                  >
                    School Master Results (ONLYOFFICE)
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="olive"
                  onClick={() => window.open('/editor?type=examiner_results_excel', '_blank')}
                >
                  My Examiner Sheet
                </Button>
              </div>
            </div>
          )}

          {pendingSubmissions.some(
            (p) =>
              p.status === 'phase4_marking' &&
              (p.internal_examiner_id === user?.id || p.external_examiner_id === user?.id),
          ) &&
            !(isHOD || isCoordinator || isDean || isAdmin) && (
              <div className="fp-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-[15px] font-bold text-[#1a1d1a] flex items-center gap-2 m-0">
                    <Award className="size-4 text-[#3b7a57]" />
                    Assigned Marking Works
                  </h4>
                  <p className="text-[13px] text-[#6e746b] mt-1 m-0">
                    You are assigned as examiner for papers listed below. Mark inline via ONLYOFFICE or download files offline.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/editor?type=examiner_results_excel', '_blank')}
                  >
                    Open Results Spreadsheet (ONLYOFFICE)
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadExaminerAssignedZip}
                    disabled={downloadingZip}
                  >
                    {downloadingZip ? 'Downloading...' : 'Download All Assigned Papers ZIP'}
                  </Button>
                </div>
              </div>
            )}

          {pendingSubmissions.length === 0 ? (
            <div className="fp-card py-12 text-center text-[#6e746b] text-[14px]">
              No pending submissions awaiting review.
            </div>
          ) : (
            <div className="space-y-3.5">
              {pendingSubmissions.map((paper) => (
                <div key={paper.id} className="fp-card space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-[#eaece4] pb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary">PAPER-{paper.id}</Badge>
                        <Badge variant="default">
                          {isLibrarian ? 'Ready to Publish' : 'Pending Review'}
                        </Badge>
                        <span className="text-[12px] text-[#6e746b]">
                          {formatDocumentTypeLabel(paper.document_type, paper.status)}
                        </span>
                      </div>
                      <h3 className="text-[17px] font-bold text-[#1a1d1a] mb-1">{paper.title}</h3>
                      <p className="text-[13px] text-[#6e746b] m-0">
                        Submitted by{' '}
                        <strong className="text-[#1a1d1a]">
                          {paper.authors.map((a) => a.name).join(', ') || 'Unknown'}
                        </strong>{' '}
                        • {paper.discipline || 'General'}
                      </p>
                    </div>
                    <div className="text-left md:text-right shrink-0">
                      <span className="text-[11px] uppercase tracking-wider text-[#6e746b] block">
                        Submitted
                      </span>
                      <span className="text-[13px] font-bold text-[#1a1d1a]">
                        {paper.created_at ? new Date(paper.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-[13px] text-[#6e746b]">
                      Current Stage:{' '}
                      <strong className="text-[#3b7a57]">{formatStatusLabel(paper.status)}</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => openReviewDialog(paper)}>
                        <Eye className="size-3.5 mr-1" />
                        <span>{isLibrarian ? 'Publish / Review Work' : 'Review Paper'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/editor?paperId=${paper.id}&type=paper`, '_blank')
                        }
                      >
                        <FileText className="size-3.5 mr-1 text-[#5a6552]" />
                        <span>View Work (ONLYOFFICE)</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/editor?paperId=${paper.id}&type=comments`, '_blank')
                        }
                      >
                        <MessageSquare className="size-3.5 mr-1 text-[#5a6552]" />
                        <span>Open Comments</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {(isHOD || isCoordinator || isAdmin) && (
            <div className="fp-card space-y-4">
              <div>
                <h4 className="text-[15px] font-bold text-[#1a1d1a] flex items-center gap-2 m-0">
                  <Download className="size-4 text-[#3b7a57]" />
                  Bulk Department Downloads
                </h4>
                <p className="text-[13px] text-[#6e746b] mt-1 m-0">
                  Download all student works or examiner marked scripts for your department as a ZIP archive.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-1.5 flex-1 w-full">
                  <Label htmlFor="class-filter">
                    Filter by Class / Programme (Optional, e.g. BSc. Computer Science)
                  </Label>
                  <Input
                    id="class-filter"
                    placeholder="e.g. BSc. Computer Science"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleDownloadAllApprovedZip} disabled={downloadingZip}>
                    {downloadingZip ? 'Downloading...' : 'Download Approved Works ZIP'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadExaminerResultsZip}
                    disabled={downloadingZip}
                  >
                    {downloadingZip ? 'Downloading...' : 'Download Examiner Marked ZIP'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {approvedPapers.length === 0 ? (
            <div className="fp-card py-12 text-center text-[#6e746b] text-[14px]">
              No approved papers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Author(s)</th>
                    <th>Department</th>
                    <th>Views / Downloads</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPapers.map((paper) => (
                    <tr key={paper.id}>
                      <td className="font-mono text-[12px] text-[#6e746b]">PAPER-{paper.id}</td>
                      <td className="font-semibold text-[#1a1d1a] max-w-md">{paper.title}</td>
                      <td>{paper.authors.map((a) => a.name).join(', ') || 'Unknown'}</td>
                      <td className="text-[#6e746b]">{paper.discipline || 'General'}</td>
                      <td className="text-[#6e746b]">
                        {paper.views} views • {paper.downloads} downloads
                      </td>
                      <td>
                        <Badge variant="default">Approved</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {!isLibrarian && (
          <TabsContent value="revision" className="space-y-4">
            <div className="fp-card text-[13px] text-[#6e746b]">
              Revision requested items are waiting for the student to resubmit an updated version.
            </div>
            {revisionRequested.length === 0 ? (
              <div className="fp-card py-12 text-center text-[#6e746b] text-[14px]">
                No papers currently awaiting student revision.
              </div>
            ) : (
              revisionRequested.map((paper) => (
                <div key={paper.id} className="fp-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline">PAPER-{paper.id}</Badge>
                        <Badge variant="destructive">Revision Requested</Badge>
                      </div>
                      <h4 className="text-[16px] font-bold text-[#1a1d1a]">{paper.title}</h4>
                      <p className="text-[13px] text-[#6e746b]">
                        Author: {paper.authors.map((a) => a.name).join(', ') || 'Unknown'} •{' '}
                        {paper.discipline || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#ffffff] border border-[#eaece4] rounded-lg text-[13px] text-[#1a1d1a] flex items-start gap-2.5">
                    <MessageSquare className="size-4 mt-0.5 shrink-0 text-[#c93b2b]" />
                    <span>{paper.review_comments || 'No review comments provided.'}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Clean White FinPlanner Review Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title || 'Review Paper'}</DialogTitle>
            <DialogDescription>
              {isLibrarian
                ? 'Finalize publication for this submission'
                : 'Review and provide feedback for this submission'}
            </DialogDescription>
          </DialogHeader>

          {selectedPaper && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#fafbf8] border border-[#eaece4]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e746b] m-0">
                    Author
                  </p>
                  <p className="text-[14px] font-bold text-[#1a1d1a] m-0 mt-0.5">
                    {selectedPaper.authors.map((a) => a.name).join(', ') || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e746b] m-0">
                    Department
                  </p>
                  <p className="text-[14px] font-bold text-[#1a1d1a] m-0 mt-0.5">
                    {selectedPaper.discipline || 'General'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e746b] m-0">
                    Submission ID
                  </p>
                  <p className="text-[13px] font-mono font-bold text-[#5a6552] m-0 mt-0.5">
                    PAPER-{selectedPaper.id}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e746b] m-0">
                    Document Type
                  </p>
                  <p className="text-[13px] font-bold text-[#1a1d1a] m-0 mt-0.5">
                    {formatDocumentTypeLabel(selectedPaper.document_type, selectedPaper.status)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-5 bg-[#fafbf8] border border-[#eaece4] space-y-3">
                <div className="flex items-center gap-2 text-[14px] font-bold text-[#1a1d1a]">
                  <FileText className="size-4 text-[#5a6552]" />
                  <span>
                    {selectedPaper.status === 'phase1_proposal_submitted' ||
                    selectedPaper.document_type === 'thesis_topic'
                      ? 'Phase 1 — Thesis Topic Description'
                      : selectedPaper.status === 'phase2_proposal_submitted' ||
                        selectedPaper.status === 'phase2_proposal_accepted'
                      ? 'Phase 2 — Project Proposal Preview'
                      : 'Thesis Abstract / Summary'}
                  </span>
                </div>
                <p className="text-[13px] text-[#1a1d1a] whitespace-pre-wrap leading-relaxed m-0">
                  {selectedPaper.abstract || 'No description provided.'}
                </p>
                {selectedPaper.file_name && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#eaece4]">
                    <Button
                      size="sm"
                      onClick={() => void handleDownloadDocument(selectedPaper.id)}
                      disabled={!isAuthenticated || documentLoading}
                    >
                      <Download className="size-3.5 mr-1" />
                      {documentLoading
                        ? 'Downloading...'
                        : selectedPaper.status === 'phase1_proposal_submitted' ||
                          selectedPaper.document_type === 'thesis_topic'
                        ? 'Download Topic Submission'
                        : selectedPaper.status === 'phase2_proposal_submitted' ||
                          selectedPaper.status === 'phase2_proposal_accepted'
                        ? 'Download Project Proposal'
                        : 'Download Thesis Document'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/editor?paperId=${selectedPaper.id}`, '_blank')}
                    >
                      Edit in Document Editor
                    </Button>
                  </div>
                )}
              </div>

              {documentViewerUrl && (
                <div className="space-y-2 rounded-xl border border-[#eaece4] p-4 bg-[#fafbf8]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-[#1a1d1a]">
                      Document Workspace: {selectedPaper.title} ({documentViewerName || 'Document'})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(documentViewerUrl, '_blank', 'noopener,noreferrer')
                      }
                    >
                      <ExternalLink className="size-3.5 mr-1.5" />
                      Open in New Tab
                    </Button>
                  </div>
                  {(documentMimeType || '').toLowerCase().includes('pdf') ||
                  (documentViewerName || '').toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={documentViewerUrl}
                      title="Paper Document Viewer"
                      className="w-full h-[65vh] rounded-lg border border-[#eaece4] bg-white"
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
                    size="sm"
                    onClick={handlePickCorrectedFile}
                    disabled={uploadingCorrectedFile}
                  >
                    {correctedFile ? 'Change Corrected File' : 'Upload Corrected Version'}
                  </Button>
                  {correctedFile && (
                    <p className="text-[12px] text-[#6e746b]">
                      Attached: {correctedFile.name} (will send on Submit Review)
                    </p>
                  )}
                </div>
              )}

              {/* Leadership Oversight History */}
              {selectedPaper &&
                (isHOD || isCoordinator || isDean || isAdmin || isSupervisor) &&
                (Boolean(selectedPaper.review_comments) ||
                  Boolean(selectedPaper.steps && selectedPaper.steps.length > 0) ||
                  Boolean(selectedPaper.examiner_corrections)) && (
                  <div className="border border-[#eaece4] rounded-xl p-4 bg-[#fafbf8] space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#eaece4] pb-2">
                      <h5 className="font-bold text-[13px] flex items-center gap-1.5 text-[#1a1d1a] m-0">
                        <MessageSquare className="size-4 text-[#5a6552]" />
                        Student Submission & Supervisor Feedback History
                      </h5>
                      <Badge variant="outline">Institutional Oversight</Badge>
                    </div>

                    {selectedPaper.review_comments && (
                      <div className="rounded-lg border border-[#eaece4] bg-[#ffffff] p-3 space-y-1 text-[12px]">
                        <span className="font-semibold text-[#6e746b] block">
                          Supervisor / Reviewer Feedback:
                        </span>
                        <p className="text-[#1a1d1a] whitespace-pre-wrap leading-relaxed m-0">
                          {selectedPaper.review_comments}
                        </p>
                      </div>
                    )}

                    {selectedPaper.steps && selectedPaper.steps.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-[#6e746b] uppercase tracking-wider block">
                          Dynamic Step Progress & Supervisor Remarks ({selectedPaper.steps.length}{' '}
                          Steps):
                        </span>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {selectedPaper.steps.map((st) => (
                            <div
                              key={st.id}
                              className="rounded-lg border border-[#eaece4] bg-[#ffffff] p-3 text-[12px] space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[#1a1d1a]">
                                  Step {st.step_number}: {st.title || `Chapter ${st.step_number}`}
                                </span>
                                <Badge
                                  variant={
                                    st.status === 'approved'
                                      ? 'default'
                                      : st.status === 'revise'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {st.status}
                                </Badge>
                              </div>
                              {st.supervisor_comment && (
                                <div className="bg-[#fafbf8] border border-[#eaece4] rounded p-2 text-[11px] text-[#1a1d1a]">
                                  <span className="font-semibold text-[#3b7a57]">
                                    Supervisor Feedback:
                                  </span>{' '}
                                  {st.supervisor_comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPaper.examiner_corrections && canViewScores && (
                      <div className="rounded-lg border border-[#eaece4] bg-[#ffffff] p-3 space-y-1 text-[12px]">
                        <span className="font-semibold text-[#5a6552] flex items-center gap-1">
                          <Award className="size-3.5" />
                          <span>Examiner Evaluations & Corrections:</span>
                        </span>
                        <p className="text-[#1a1d1a] whitespace-pre-wrap leading-relaxed m-0">
                          {selectedPaper.examiner_corrections}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Phase 1 — HOD & Coordinator Supervisor Assignment */}
              {selectedPaper.status === 'phase1_proposal_submitted' &&
                !selectedPaper.supervisor_id &&
                (isHOD || isCoordinator || isAdmin) &&
                (() => {
                  const paperDeptName = (selectedPaper.discipline || '').trim().toLowerCase()
                  const displaySups = supervisorsList.filter((u) => {
                    const supDept = (u.department || '').trim().toLowerCase()
                    return supDept && paperDeptName && supDept === paperDeptName
                  })
                  const listToRender = displaySups.length > 0 ? displaySups : supervisorsList

                  return (
                    <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                      <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                        <Shield className="size-4 text-[#3b7a57]" />
                        Phase 1 — Thesis Topic Review (HOD & Coordinator)
                      </h4>
                      <p className="text-[13px] text-[#6e746b] m-0">
                        Accept or reject the student's submitted topic and assign a supervisor from their department.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="assign-sup-select">Select Supervisor *</Label>
                        <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose Supervisor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {listToRender.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.full_name || s.email} (
                                {(s.roles && s.roles.length ? s.roles : [s.role]).join(', ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="proposal-comments">Feedback Comments (Optional)</Label>
                        <Textarea
                          id="proposal-comments"
                          placeholder="Add any topic feedback or guidance for the student..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          rows={3}
                        />
                      </div>
                      {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              await apiReviewPaper(
                                selectedPaper.id,
                                'reject',
                                reviewComments || 'Thesis topic rejected by HOD',
                                token,
                              )
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
                          className="text-[#c93b2b] border-[#c93b2b]/30"
                        >
                          Reject Topic
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!selectedSupervisorId) {
                              setReviewError(
                                'Please select a supervisor before accepting the topic.',
                              )
                              return
                            }
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              await apiAssignSupervisor(
                                selectedPaper.id,
                                Number(selectedSupervisorId),
                                token,
                              )
                              setDialogOpen(false)
                              setSelectedPaper(null)
                              await loadAll()
                            } catch (err) {
                              setReviewError(
                                err instanceof Error ? err.message : 'Topic acceptance failed',
                              )
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

              {/* Phase 2 — Pending Supervisor */}
              {selectedPaper.status === 'phase2_pending_supervisor' &&
                (isHOD || isCoordinator || isAdmin) &&
                (() => {
                  const paperDeptName = (selectedPaper.discipline || '').trim().toLowerCase()
                  const displaySups = supervisorsList.filter((u) => {
                    const supDept = (u.department || '').trim().toLowerCase()
                    return supDept && paperDeptName && supDept === paperDeptName
                  })
                  const listToRender = displaySups.length > 0 ? displaySups : supervisorsList

                  return (
                    <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                      <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                        <Shield className="size-4 text-[#3b7a57]" />
                        Phase 2: Assign Supervisor (HOD & Coordinator)
                      </h4>
                      <div className="space-y-1.5">
                        <Label htmlFor="assign-sup-select">Select Supervisor *</Label>
                        <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose Supervisor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {listToRender.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.full_name || s.email} (
                                {(s.roles && s.roles.length ? s.roles : [s.role]).join(', ')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="proposal-comments">Feedback Comments (Optional)</Label>
                        <Textarea
                          id="proposal-comments"
                          placeholder="Add any feedback for the student..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          rows={3}
                        />
                      </div>
                      {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              await apiReviewPaper(
                                selectedPaper.id,
                                'reject',
                                reviewComments || 'Proposal rejected by HOD',
                                token,
                              )
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
                          className="text-[#c93b2b]"
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
                              await apiAssignSupervisor(
                                selectedPaper.id,
                                Number(selectedSupervisorId),
                                token,
                              )
                              if (reviewComments.trim()) {
                                await apiReviewPaper(
                                  selectedPaper.id,
                                  'approve',
                                  reviewComments,
                                  token,
                                )
                              }
                              setDialogOpen(false)
                              setSelectedPaper(null)
                              await loadAll()
                            } catch (err) {
                              setReviewError(
                                err instanceof Error ? err.message : 'Assignment failed',
                              )
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

              {/* Phase 2 — Supervisor Proposal Accept / Revise */}
              {selectedPaper.status === 'phase2_proposal_submitted' &&
                (isSupervisor || isAdmin) && (
                  <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                    <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                      <FileText className="size-4 text-[#3b7a57]" />
                      Phase 2: Project Proposal Review (Supervisor Action Required)
                    </h4>
                    <p className="text-[13px] text-[#6e746b] m-0">
                      Review the student's Project Proposal and choose to Accept (advancing to thesis chapters) or Request Revision.
                    </p>

                    <div className="space-y-1.5">
                      <Label>Feedback / Comments for Student</Label>
                      <Textarea
                        placeholder="Enter your feedback for the student (required when requesting revision)..."
                        value={reviewComments}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          setReviewComments(e.target.value)
                        }
                        rows={4}
                      />
                    </div>

                    {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}

                    <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
                      <Button
                        variant="outline"
                        disabled={submittingReview || !reviewComments.trim()}
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token || !selectedPaper) return
                          setSubmittingReview(true)
                          setReviewError('')
                          try {
                            await apiProposalDecision(
                              selectedPaper.id,
                              'revise',
                              reviewComments,
                              token,
                            )
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            setReviewComments('')
                            await loadAll()
                          } catch (err) {
                            setReviewError(
                              err instanceof Error ? err.message : 'Failed to request revision',
                            )
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                      >
                        {submittingReview ? 'Sending...' : 'Request Revision'}
                      </Button>
                      <Button
                        disabled={submittingReview}
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token || !selectedPaper) return
                          setSubmittingReview(true)
                          setReviewError('')
                          try {
                            await apiProposalDecision(
                              selectedPaper.id,
                              'accepted',
                              reviewComments,
                              token,
                            )
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            setReviewComments('')
                            await loadAll()
                          } catch (err) {
                            setReviewError(
                              err instanceof Error ? err.message : 'Failed to accept proposal',
                            )
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                      >
                        {submittingReview ? 'Processing...' : 'Accept Proposal'}
                      </Button>
                    </div>
                  </div>
                )}

              {/* Phase 2 — Dynamic Steps Review */}
              {(selectedPaper.status === 'phase3_chapters' ||
                selectedPaper.status === 'phase3_steps_in_progress' ||
                (selectedPaper.steps && selectedPaper.steps.length > 0)) &&
                (isSupervisor || isAdmin || isHOD || isCoordinator || isDean) && (
                  <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                        <CheckSquare className="size-4 text-[#3b7a57]" />
                        Phase 2: Dynamic Steps Review & Oversight
                      </h4>
                      {!(isSupervisor || isAdmin) && (
                        <Badge variant="outline">Leadership View</Badge>
                      )}
                    </div>

                    {selectedPaper.steps && selectedPaper.steps.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPaper.steps.map((st) => (
                          <div
                            key={st.id}
                            className="rounded-lg border border-[#eaece4] bg-[#ffffff] p-3.5 text-[12px] space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-[#1a1d1a] text-[13px]">
                                Step {st.step_number}: {st.title || `Step ${st.step_number}`}
                              </span>
                              <Badge
                                variant={
                                  st.status === 'approved'
                                    ? 'default'
                                    : st.status === 'revise'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {st.status}
                              </Badge>
                            </div>
                            {st.supervisor_comment && (
                              <p className="text-[#6e746b] bg-[#fafbf8] p-2 rounded text-[11px] m-0">
                                <strong className="text-[#1a1d1a]">Feedback:</strong>{' '}
                                {st.supervisor_comment}
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
                                    const { blob, filename } = await apiDownloadStepFile(
                                      st.id,
                                      token,
                                    )
                                    const url = window.URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = filename
                                    document.body.appendChild(a)
                                    a.click()
                                    a.remove()
                                    window.URL.revokeObjectURL(url)
                                  } catch (err) {
                                    window.alert(
                                      err instanceof Error ? err.message : 'Download failed',
                                    )
                                  }
                                }}
                              >
                                <Download className="size-3 mr-1" /> Download Step {st.step_number}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/editor?stepId=${st.id}`, '_blank')}
                              >
                                View & Edit in Editor
                              </Button>
                              {(isSupervisor || isAdmin) && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                      if (!token) return
                                      setSubmittingReview(true)
                                      try {
                                        await apiStepDecision(
                                          st.id,
                                          'approved',
                                          reviewComments,
                                          token,
                                        )
                                        setReviewComments('')
                                        await loadAll()
                                      } catch (err) {
                                        setReviewError(
                                          err instanceof Error
                                            ? err.message
                                            : 'Step approval failed',
                                        )
                                      } finally {
                                        setSubmittingReview(false)
                                      }
                                    }}
                                    disabled={submittingReview}
                                  >
                                    Approve Step {st.step_number}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                      if (!token) return
                                      setSubmittingReview(true)
                                      try {
                                        await apiStepDecision(
                                          st.id,
                                          'revise',
                                          reviewComments || 'Revision requested on step',
                                          token,
                                        )
                                        setReviewComments('')
                                        await loadAll()
                                      } catch (err) {
                                        setReviewError(
                                          err instanceof Error
                                            ? err.message
                                            : 'Step revision request failed',
                                        )
                                      } finally {
                                        setSubmittingReview(false)
                                      }
                                    }}
                                    disabled={submittingReview}
                                    className="text-[#c93b2b]"
                                  >
                                    Revise Step {st.step_number}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#eaece4] rounded-lg p-4 text-center text-[12px] text-[#6e746b]">
                        No steps submitted by student yet.
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-[#eaece4]">
                      <Label htmlFor="step-overall-comments">Step Feedback Comments (Optional)</Label>
                      <Textarea
                        id="step-overall-comments"
                        placeholder="Add feedback notes when approving or requesting revisions on a step..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}

                    <div className="flex justify-end border-t border-[#eaece4] pt-3">
                      <Button
                        variant="olive"
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
                            setReviewError(
                              err instanceof Error ? err.message : 'Finish steps failed',
                            )
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                        disabled={submittingReview}
                      >
                        {submittingReview
                          ? 'Completing...'
                          : 'Finish Steps (Advance to Phase 3 — Examination)'}
                      </Button>
                    </div>
                  </div>
                )}

              {/* Phase 3 — Examiner Assignment */}
              {selectedPaper.status === 'phase4_pending_examiners' &&
                (isHOD || isCoordinator || isDean || isAdmin) &&
                (() => {
                  const currentTier =
                    selectedDegreeTier ||
                    selectedPaper.degree_level ||
                    (selectedPaper.publication_type?.toLowerCase().includes('undergrad') ||
                    selectedPaper.document_type?.toLowerCase().includes('undergrad') ||
                    selectedPaper.discipline?.toLowerCase().includes('b.sc') ||
                    selectedPaper.discipline?.toLowerCase().includes('bsc')
                      ? 'Undergraduate'
                      : selectedPaper.publication_type?.toLowerCase().includes('mphil')
                      ? 'MPhil'
                      : selectedPaper.publication_type?.toLowerCase().includes('phd') ||
                        selectedPaper.document_type?.toLowerCase().includes('phd') ||
                        selectedPaper.document_type?.toLowerCase().includes('doctoral')
                      ? 'PhD'
                      : 'Masters')

                  const isUndergrad = currentTier === 'Undergraduate'
                  const isMPhilOrPhD = currentTier === 'PhD' || currentTier === 'MPhil'
                  const isMasters = !isUndergrad && !isMPhilOrPhD

                  const internalFacultyList = supervisorsList.filter(
                    (s) => s.role !== 'external_examiner',
                  )
                  const externalFacultyList = supervisorsList.filter(
                    (s) =>
                      s.role === 'external_examiner' || s.roles?.includes('external_examiner'),
                  )
                  const externalOptionsList =
                    externalFacultyList.length > 0 ? externalFacultyList : supervisorsList

                  return (
                    <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#eaece4]">
                        <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                          <Shield className="size-4 text-[#3b7a57]" />
                          {isUndergrad
                            ? 'Phase 3: Undergraduate Examination (Single Internal Examiner)'
                            : isMasters
                            ? "Phase 3: Master's Examination (Two Internal Examiners)"
                            : 'Phase 3: Postgraduate Examination (1 Internal + 1 External)'}
                        </h4>
                        <div className="inline-flex rounded-lg border border-[#eaece4] p-0.5 bg-[#ffffff] text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedDegreeTier('Undergraduate')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              isUndergrad
                                ? 'bg-[#5a6552] text-white'
                                : 'text-[#6e746b] hover:text-[#1a1d1a]'
                            }`}
                          >
                            Undergraduate
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDegreeTier('Masters')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              isMasters
                                ? 'bg-[#5a6552] text-white'
                                : 'text-[#6e746b] hover:text-[#1a1d1a]'
                            }`}
                          >
                            Masters
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDegreeTier('PhD')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              isMPhilOrPhD
                                ? 'bg-[#5a6552] text-white'
                                : 'text-[#6e746b] hover:text-[#1a1d1a]'
                            }`}
                          >
                            MPhil / PhD
                          </button>
                        </div>
                      </div>

                      <div
                        className={`grid grid-cols-1 ${
                          isUndergrad ? 'md:grid-cols-1' : 'md:grid-cols-2'
                        } gap-4`}
                      >
                        <div className="space-y-1.5">
                          <Label>
                            {isUndergrad
                              ? 'Select Project Supervisor / Internal Examiner *'
                              : isMasters
                              ? 'Select Internal Examiner 1 *'
                              : 'Select Internal Examiner *'}
                          </Label>
                          <Select
                            value={
                              selectedInternalId ||
                              (isUndergrad && selectedPaper.supervisor_id
                                ? String(selectedPaper.supervisor_id)
                                : '')
                            }
                            onValueChange={setSelectedInternalId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose Examiner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(isMasters ? internalFacultyList : supervisorsList).map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.full_name || s.email}{' '}
                                  {selectedPaper.supervisor_id === s.id
                                    ? '(Assigned Supervisor)'
                                    : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {!isUndergrad && (
                          <div className="space-y-1.5">
                            <Label>
                              {isMasters
                                ? 'Select Internal Examiner 2 *'
                                : 'Select External Examiner *'}
                            </Label>
                            <Select value={selectedExternalId} onValueChange={setSelectedExternalId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Second Examiner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(isMasters ? internalFacultyList : externalOptionsList).map(
                                  (s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.full_name || s.email}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          onClick={async () => {
                            setReviewError('')
                            const effectiveInternalId =
                              selectedInternalId ||
                              (isUndergrad && selectedPaper.supervisor_id
                                ? String(selectedPaper.supervisor_id)
                                : '')
                            if (!effectiveInternalId) {
                              setReviewError('Please select the primary examiner.')
                              return
                            }
                            if (!isUndergrad && !selectedExternalId) {
                              setReviewError('Please select the second examiner.')
                              return
                            }
                            if (!isUndergrad && effectiveInternalId === selectedExternalId) {
                              setReviewError('Both examiners must be different faculty members.')
                              return
                            }
                            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                            if (!token) return
                            setSubmittingReview(true)
                            try {
                              await apiAssignExaminers(
                                selectedPaper.id,
                                Number(effectiveInternalId),
                                isUndergrad ? null : Number(selectedExternalId),
                                token,
                                currentTier,
                              )
                              setDialogOpen(false)
                              setSelectedPaper(null)
                              await loadAll()
                            } catch (err) {
                              setReviewError(
                                err instanceof Error ? err.message : 'Assignment failed',
                              )
                            } finally {
                              setSubmittingReview(false)
                            }
                          }}
                          disabled={
                            submittingReview ||
                            (!isUndergrad && (!selectedInternalId || !selectedExternalId))
                          }
                        >
                          {submittingReview ? 'Assigning...' : 'Assign Examiners & Advance'}
                        </Button>
                        {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}
                      </div>
                    </div>
                  )
                })()}

              {/* Phase 4: Marking & Assessment */}
              {selectedPaper.status === 'phase4_marking' &&
                (isSupervisor ||
                  isAdmin ||
                  isHOD ||
                  isCoordinator ||
                  isDean ||
                  selectedPaper.internal_examiner_id === user?.id ||
                  selectedPaper.external_examiner_id === user?.id) && (
                  <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eaece4]">
                      <div>
                        <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                          <Award className="size-4 text-[#3b7a57]" />
                          Phase 4: Official Project Assessment & Examiner Evaluation
                        </h4>
                        <p className="text-[12px] text-[#6e746b] m-0 mt-0.5">
                          GIMPA Official Marking & Assessment Rubric
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDownloadDocument(selectedPaper.id)}
                        disabled={documentLoading}
                      >
                        <Download className="size-3.5 mr-1" />
                        {documentLoading ? 'Downloading...' : 'Download Student Thesis'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-lg border border-[#eaece4] bg-[#ffffff] space-y-1">
                        <span className="text-[11px] font-semibold text-[#6e746b] uppercase tracking-wider">
                          Examiner 1 Score
                        </span>
                        <div className="text-[15px] font-bold text-[#1a1d1a]">
                          {selectedPaper.internal_score !== null &&
                          selectedPaper.internal_score !== undefined
                            ? `${selectedPaper.internal_score} / 100`
                            : 'Pending'}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-lg border border-[#eaece4] bg-[#ffffff] space-y-1">
                        <span className="text-[11px] font-semibold text-[#6e746b] uppercase tracking-wider">
                          Examiner 2 Score
                        </span>
                        <div className="text-[15px] font-bold text-[#1a1d1a]">
                          {selectedPaper.external_score !== null &&
                          selectedPaper.external_score !== undefined
                            ? `${selectedPaper.external_score} / 100`
                            : 'Pending'}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-lg border border-[#eaece4] bg-[#ffffff] space-y-1">
                        <span className="text-[11px] font-semibold text-[#6e746b] uppercase tracking-wider">
                          Average Status
                        </span>
                        <div className="text-[14px] font-bold text-[#3b7a57]">
                          {selectedPaper.internal_score !== null &&
                          selectedPaper.external_score !== null
                            ? `${(
                                (Number(selectedPaper.internal_score) +
                                  Number(selectedPaper.external_score)) /
                                2
                              ).toFixed(1)}%`
                            : 'In Progress'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#eaece4] bg-[#ffffff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-[13px] text-[#1a1d1a] m-0">
                          Official Project Assessment Report Form
                        </h5>
                        <p className="text-[12px] text-[#6e746b] m-0 mt-0.5">
                          Complete the 8-part rubric, enter qualitative feedback, and generate the official Word report.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const isInternal = selectedPaper.internal_examiner_id === user?.id
                          const isExternal = selectedPaper.external_examiner_id === user?.id
                          setActiveExaminerRole(
                            isInternal
                              ? 'Internal Examiner'
                              : isExternal
                              ? 'External Examiner'
                              : isHOD || isCoordinator
                              ? 'Coordinator / HOD'
                              : 'Internal Examiner',
                          )
                          setAssessmentModalOpen(true)
                        }}
                      >
                        <FileEdit className="size-3.5 mr-1.5" />
                        Fill Assessment Report
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/editor?paperId=${selectedPaper.id}&type=paper`, '_blank')
                        }
                      >
                        View / Edit Work (ONLYOFFICE)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/editor?paperId=${selectedPaper.id}&type=comments`, '_blank')
                        }
                      >
                        Open Comments (ONLYOFFICE)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/editor?paperId=${selectedPaper.id}&type=excel`, '_blank')
                        }
                      >
                        Open Marks Sheet (ONLYOFFICE)
                      </Button>
                    </div>
                  </div>
                )}

              {/* Student Feedback View */}
              {studentFeedbackData && !canViewScores && (
                <div className="border border-[#eaece4] rounded-xl p-4 bg-[#fafbf8] space-y-3">
                  <h4 className="font-bold text-[12px] uppercase tracking-wider text-[#1a1d1a] flex items-center gap-2 m-0">
                    <MessageSquare className="size-3.5 text-[#5a6552]" />
                    Examiner Feedback & Revision Instructions
                  </h4>
                  {studentFeedbackData.compiled_comments && (
                    <div className="bg-[#ffffff] border border-[#eaece4] rounded-lg p-3 text-[12px] space-y-1">
                      <p className="font-semibold text-[#6e746b] m-0">Compiled Examiner Feedback:</p>
                      <p className="whitespace-pre-line text-[#1a1d1a] m-0">
                        {studentFeedbackData.compiled_comments}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 5 — Supervisor Corrections Approval */}
              {(selectedPaper.status === 'phase5_pending_supervisor' ||
                selectedPaper.status === 'phase5_corrections') &&
                (isSupervisor || isAdmin || isHOD || isCoordinator || isDean) && (
                  <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                    <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                      <CheckCircle className="size-4 text-[#3b7a57]" />
                      Phase 4: Supervisor — Confirm or Deny Corrected Work
                    </h4>
                    <div className="space-y-1.5">
                      <Label>Supervisor Feedback / Revision Instructions</Label>
                      <Textarea
                        placeholder="Enter specific guidance if requesting further changes..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={3}
                      />
                    </div>
                    {reviewError && <p className="text-[12px] text-[#c93b2b]">{reviewError}</p>}
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          if (!reviewComments.trim()) {
                            setReviewError('Please provide revision notes.')
                            return
                          }
                          setSubmittingReview(true)
                          try {
                            await apiSupervisorRejectCorrections(
                              selectedPaper.id,
                              reviewComments.trim(),
                              token,
                            )
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            setReviewComments('')
                            await loadAll()
                          } catch (err) {
                            setReviewError(
                              err instanceof Error ? err.message : 'Denial action failed',
                            )
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                        disabled={submittingReview}
                        className="text-[#c93b2b]"
                      >
                        Deny & Request Further Revisions
                      </Button>
                      <Button
                        onClick={async () => {
                          const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                          if (!token) return
                          setSubmittingReview(true)
                          try {
                            await apiSupervisorApproveCorrections(selectedPaper.id, token)
                            setDialogOpen(false)
                            setSelectedPaper(null)
                            setReviewComments('')
                            await loadAll()
                          } catch (err) {
                            setReviewError(err instanceof Error ? err.message : 'Approval failed')
                          } finally {
                            setSubmittingReview(false)
                          }
                        }}
                        disabled={submittingReview}
                      >
                        Confirm & Approve Corrections
                      </Button>
                    </div>
                  </div>
                )}

              {/* Phase 5 — HOD & Coordinator Dual Sign-off */}
              {(selectedPaper.status === 'phase5_pending_coordinator' ||
                selectedPaper.status === 'phase5_pending_hod') &&
                (isHOD || isCoordinator || isDean || isAdmin) && (
                  <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
                    <h4 className="font-bold text-[14px] text-[#1a1d1a] flex items-center gap-2 m-0">
                      <Shield className="size-4 text-[#3b7a57]" />
                      Phase 4: Dual Sign-off (HOD & Coordinator)
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-[12px]">
                      <div className="border border-[#eaece4] rounded-lg p-3 bg-[#ffffff]">
                        <span className="font-semibold text-[#6e746b]">Coordinator Signed:</span>{' '}
                        {selectedPaper.project_coordinator_approved_at ||
                        selectedPaper.status === 'phase5_pending_hod' ? (
                          <span className="text-[#3b7a57] font-bold">Signed</span>
                        ) : (
                          <span className="text-[#c93b2b] font-bold">Awaiting Signature</span>
                        )}
                      </div>
                      <div className="border border-[#eaece4] rounded-lg p-3 bg-[#ffffff]">
                        <span className="font-semibold text-[#6e746b]">HOD Signed:</span>{' '}
                        {selectedPaper.hod_approved_at ? (
                          <span className="text-[#3b7a57] font-bold">Signed</span>
                        ) : (
                          <span className="text-[#c93b2b] font-bold">Awaiting Signature</span>
                        )}
                      </div>
                    </div>

                    {canViewScores && adminMarksData?.requires_third_examiner && (
                      <div className="p-3.5 border border-[#c93b2b]/30 bg-[#fbeae8]/30 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-[#c93b2b] font-bold text-[12px]">
                          <AlertTriangle className="size-4" />
                          <span>
                            Score Difference exceeds 20 Marks ({adminMarksData.score_difference}{' '}
                            marks)! 3rd Examiner Required.
                          </span>
                        </div>
                        {(isHOD || isCoordinator || isAdmin) && (
                          <div className="flex items-center gap-2 pt-1">
                            <Select value={selectedThirdId} onValueChange={setSelectedThirdId}>
                              <SelectTrigger className="h-9 text-xs bg-[#ffffff]">
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
                              disabled={!selectedThirdId || assigningThird}
                              onClick={async () => {
                                if (!selectedPaper || !selectedThirdId) return
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                setAssigningThird(true)
                                try {
                                  await apiAssignThirdExaminer(
                                    selectedPaper.id,
                                    Number(selectedThirdId),
                                    token,
                                  )
                                  const updated = await apiGetAdminExaminationMarks(
                                    selectedPaper.id,
                                    token,
                                  )
                                  setAdminMarksData(updated)
                                  setSelectedThirdId('')
                                  await loadAll()
                                } catch (err) {
                                  setReviewError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Failed to assign 3rd examiner',
                                  )
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

                    {((selectedPaper.status === 'phase5_pending_coordinator' &&
                      (isCoordinator || isAdmin)) ||
                      (selectedPaper.status === 'phase5_pending_hod' && (isHOD || isAdmin))) && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="final-sig-comments">Approval / Revision Comments</Label>
                          <Textarea
                            id="final-sig-comments"
                            rows={3}
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            placeholder="Add comments or instructions..."
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                              if (!token) return
                              setSubmittingReview(true)
                              try {
                                if (isCoordinator) {
                                  await apiCoordinatorApproveCorrections(
                                    selectedPaper.id,
                                    'revise',
                                    reviewComments || 'Revision requested by Coordinator',
                                    token,
                                  )
                                } else {
                                  await apiHodApproveCorrections(
                                    selectedPaper.id,
                                    'revise',
                                    reviewComments || 'Revision requested by HOD',
                                    token,
                                  )
                                }
                                setDialogOpen(false)
                                setSelectedPaper(null)
                                await loadAll()
                              } catch (err) {
                                setReviewError(
                                  err instanceof Error ? err.message : 'Submission failed',
                                )
                              } finally {
                                setSubmittingReview(false)
                              }
                            }}
                            disabled={submittingReview}
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
                                  await apiCoordinatorApproveCorrections(
                                    selectedPaper.id,
                                    'approved',
                                    reviewComments,
                                    token,
                                  )
                                } else {
                                  await apiHodApproveCorrections(
                                    selectedPaper.id,
                                    'approved',
                                    reviewComments,
                                    token,
                                  )
                                }
                                setDialogOpen(false)
                                setSelectedPaper(null)
                                await loadAll()
                              } catch (err) {
                                setReviewError(
                                  err instanceof Error ? err.message : 'Approval failed',
                                )
                              } finally {
                                setSubmittingReview(false)
                              }
                            }}
                            disabled={submittingReview}
                          >
                            {submittingReview
                              ? 'Signing...'
                              : isCoordinator
                              ? 'Sign as Project Coordinator'
                              : 'Sign & Approve Final Work (HOD)'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {(!selectedPaper.status.startsWith('phase') ||
                isLibrarian ||
                selectedPaper.status === 'phase5_approved_for_library') && (
                <div className="space-y-4">
                  {isLibrarian ? (
                    <div className="p-4 rounded-xl border border-[#eaece4] bg-[#fafbf8] space-y-1.5">
                      <h4 className="text-[14px] font-bold text-[#3b7a57] flex items-center gap-1.5 m-0">
                        <CheckCircle className="size-4" />
                        Final Publication to GIMPA Public Repository Catalog
                      </h4>
                      <p className="text-[12px] text-[#6e746b] m-0 leading-relaxed">
                        Publishing will convert the submission to official PDF, assign a repository DOI, and make it discoverable in the public catalog.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="decision">Review Decision</Label>
                      <Select value={reviewDecision} onValueChange={setReviewDecision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select decision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">Approve</SelectItem>
                          <SelectItem value="revision">Request Revisions</SelectItem>
                          <SelectItem value="reject">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="comments">
                      {isLibrarian ? 'Publication / Archival Notes (Optional)' : 'Review Comments'}
                    </Label>
                    <Textarea
                      id="comments"
                      placeholder={
                        isLibrarian
                          ? 'Optional notes regarding publication...'
                          : 'Provide detailed feedback for the author...'
                      }
                      rows={4}
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    {reviewError && (
                      <p className="mr-auto text-[13px] text-[#c93b2b]">{reviewError}</p>
                    )}
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void handleReview()}
                      disabled={(!reviewDecision && !isLibrarian) || submittingReview}
                    >
                      {submittingReview
                        ? 'Publishing...'
                        : isLibrarian
                        ? 'Publish Work to Public Catalog'
                        : 'Submit Review'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedPaper && (
        <ProjectAssessmentReportDialog
          open={assessmentModalOpen}
          onOpenChange={setAssessmentModalOpen}
          paper={selectedPaper}
          examinerName={user?.name || user?.email || 'Nana Assyne'}
          examinerRole={activeExaminerRole}
          onSaveReport={async (totalScore, comments, docxFile) => {
            const isUserInternal =
              activeExaminerRole === 'Internal Examiner' ||
              (!roles.includes('external_examiner') &&
                selectedPaper.internal_examiner_id === user?.id)
            const isUserExternal =
              activeExaminerRole === 'External Examiner' ||
              roles.includes('external_examiner') ||
              selectedPaper.external_examiner_id === user?.id
            const token = localStorage.getItem(ACCESS_TOKEN_KEY)
            if (!token) return

            await apiUploadResults(
              selectedPaper.id,
              {
                internalScore: isUserInternal
                  ? totalScore
                  : selectedPaper.internal_score ?? undefined,
                externalScore: isUserExternal
                  ? totalScore
                  : selectedPaper.external_score ?? undefined,
                examinerCorrections: comments,
                file: docxFile,
              },
              token,
            )

            await apiSubmitExaminerGrading(
              selectedPaper.id,
              {
                score: totalScore,
                recommendation: 'Pass',
                general_comments: comments,
                file: docxFile,
              },
              token,
            )

            await loadAll()
            setSelectedPaper((prev) =>
              prev
                ? {
                    ...prev,
                    internal_score: isUserInternal ? totalScore : prev.internal_score,
                    external_score: isUserExternal ? totalScore : prev.external_score,
                    examiner_result_file_name: docxFile.name,
                    examiner_corrections: comments,
                  }
                : null,
            )
          }}
        />
      )}

      <ReportExportModal
        open={reportExportOpen}
        onOpenChange={setReportExportOpen}
        userDepartment={user?.department}
      />
    </div>
  )
}
