import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, Clock, FileText, Eye, MessageSquare, AlertCircle, ExternalLink, Shield, CheckSquare, Award, Download } from 'lucide-react'
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
  apiSupervisorApproveCombinedThesis,
  apiListDepartments,
  apiDownloadApprovedZip,
  apiDownloadExaminerResultsZip,
  apiDownloadExaminerAssignedZip,
} from '../../lib/api'
import type { ApiPaper, ApiUser } from '../../lib/api'

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
      return 'Phase 3 — Chapter Review (Steps in Progress)'
    case 'phase3_steps_in_progress':
      return 'Phase 3 — Steps in Progress'
    case 'phase3_all_steps_approved':
      return 'Phase 3 — All Steps Approved'
    case 'phase4_pending_examiners':
      return 'Phase 4 — Awaiting Examiner Assignment'
    case 'phase4_marking':
      return 'Phase 4 — Under Examination / Marking'
    case 'phase4_examination_completed':
      return 'Phase 4 — Examination Completed'
    case 'phase5_corrections':
      return 'Phase 5 — Post-Defense Corrections'
    case 'phase5_pending_supervisor':
      return 'Phase 5 — Corrections Awaiting Supervisor Review'
    case 'phase5_pending_coordinator':
      return 'Phase 5 — Corrections Awaiting Coordinator Approval'
    case 'phase5_pending_hod':
      return 'Phase 5 — Corrections Awaiting HOD Approval'
    case 'phase5_pending_hod_and_coordinator':
      return 'Phase 5 — Corrections Awaiting HOD & Coordinator Approval'
    case 'phase5_approved_for_library':
      return 'Phase 5 — Approved for Library Publication'
    case 'phase5_published':
      return 'Phase 5 — Published in Library Repository'
    default:
      return status
  }
}

function formatDocumentTypeLabel(docType: string | null, status: string): string {
  if (status === 'phase1_proposal_submitted' || docType === 'thesis_topic') {
    return 'Thesis Topic Submission (Phase 1)'
  }
  if (status.startsWith('phase2') || docType === 'proposal') {
    return 'Project Proposal (Phase 2)'
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
  const [resultsFile, setResultsFile] = useState<File | null>(null)

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
          return userRoles.some(r => ['project_supervisor', 'lecturer', 'hod', 'project_coordinator'].includes(r))
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

    // Reset dropdowns
    setSelectedSupervisorId('')
    setSelectedInternalId('')
    setSelectedExternalId('')
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
          {pendingSubmissions.some(p => p.status === 'phase4_marking' && (p.internal_examiner_id === user?.id || p.external_examiner_id === user?.id)) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Assigned Marking Works</h4>
                  <p className="text-xs text-muted-foreground">You are assigned as examiner for papers listed below. Download all files to mark offline.</p>
                </div>
                <Button size="sm" onClick={handleDownloadExaminerAssignedZip} disabled={downloadingZip}>
                  {downloadingZip ? 'Downloading...' : 'Download All Assigned Papers ZIP'}
                </Button>
              </CardContent>
            </Card>
          )}

          {pendingSubmissions.map((paper) => (
            <Card key={paper.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">PAPER-{paper.id}</Badge>
                      <Badge>{isLibrarian ? 'Ready to Publish' : 'Pending'}</Badge>
                    </div>
                    <CardTitle className="mb-2">{paper.title}</CardTitle>
                    <CardDescription>
                      Submitted by {paper.authors.map((a) => a.name).join(', ') || 'Unknown'} • {paper.discipline || 'General'} • {formatDocumentTypeLabel(paper.document_type, paper.status)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      Submitted {paper.created_at ? new Date(paper.created_at).toLocaleDateString() : '-'}
                    </span>
                    <span>Status: {formatStatusLabel(paper.status)}</span>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => openReviewDialog(paper)}>
                    <Eye className="size-4 mr-2" />
                    {isLibrarian ? 'Review & Publish' : 'Review Paper'}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Author</p>
                  <p className="text-sm text-muted-foreground">{selectedPaper.authors.map((a) => a.name).join(', ') || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <p className="text-sm text-muted-foreground">{selectedPaper.discipline || 'General'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Submission ID</p>
                  <p className="text-sm text-muted-foreground">PAPER-{selectedPaper.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Document Type</p>
                  <p className="text-sm text-muted-foreground">{formatDocumentTypeLabel(selectedPaper.document_type, selectedPaper.status)}</p>
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-white dark:bg-card space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <FileText className="size-5" />
                  <span>
                    {selectedPaper.status === 'phase1_proposal_submitted' || selectedPaper.document_type === 'thesis_topic'
                      ? 'Thesis Topic Description / Problem Statement'
                      : 'Abstract preview'}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {selectedPaper.abstract || 'No description provided.'}
                </p>
                {selectedPaper.file_name && (
                  <div className="flex w-full items-center justify-start gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[120px]"
                      onClick={() => void handleDownloadDocument(selectedPaper.id)}
                      disabled={!isAuthenticated || documentLoading}
                    >
                      {documentLoading ? 'Downloading...' : 'Download File'}
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
                  {(documentMimeType || '').toLowerCase().includes('pdf') ? (
                    <iframe
                      src={documentViewerUrl}
                      title="Paper Document Viewer"
                      className="w-full h-[70vh] rounded border bg-white"
                    />
                  ) : (
                    <div className="rounded border p-3 text-sm text-muted-foreground">
                      This file format may not render inline in all browsers. Download to review and edit.
                    </div>
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
                            if (reviewComments.trim()) {
                              await apiReviewPaper(selectedPaper.id, 'approve', reviewComments, token)
                            }
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

              {selectedPaper.status === 'phase3_chapters' && (isSupervisor || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <CheckSquare className="size-4" />
                    Phase 3: Chapter Review (Supervisor)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Review one chapter at a time. Accepting the current chapter unlocks the next chapter for review.
                  </p>

                  {(() => {
                    const currentChapter = getCurrentChapter(supChecklist)
                    const studentDoneKey = `ch${currentChapter}_student_done` as keyof ApiPaper
                    const currentChapterName = chapterLabel(currentChapter)
                    const acceptedAllChapters = supChecklist.ch1 && supChecklist.ch2 && supChecklist.ch3 && supChecklist.ch4 && supChecklist.ch5

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((chapter) => {
                            const key = `ch${chapter}` as ChapterKey
                            const isCurrent = chapter === currentChapter && !acceptedAllChapters
                            return (
                              <div
                                key={chapter}
                                className={`rounded-md border p-3 text-xs ${isCurrent ? 'border-primary bg-primary/10' : 'bg-background/60'}`}
                              >
                                <p className="font-semibold">Chapter {chapter}</p>
                                <Badge variant={supChecklist[key] ? 'default' : isCurrent ? 'outline' : 'secondary'} className="mt-2 text-[10px]">
                                  {supChecklist[key] ? 'Accepted' : isCurrent ? 'In Review' : 'Locked'}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>

                        <div className="rounded-lg border bg-background/70 p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {acceptedAllChapters ? 'All chapters accepted' : `Chapter ${currentChapter}: Chapter ${currentChapterName}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {acceptedAllChapters
                                  ? 'Move this thesis to examiner assignment.'
                                  : selectedPaper[studentDoneKey]
                                    ? `The student marked Chapter ${currentChapter} as ready for review.`
                                    : `Chapter ${currentChapter} is waiting for the student to mark it ready.`}
                              </p>
                            </div>
                            {!acceptedAllChapters && (
                              <Badge variant={selectedPaper[studentDoneKey] ? 'default' : 'secondary'}>
                                {selectedPaper[studentDoneKey] ? 'Student Ready' : 'Student Pending'}
                              </Badge>
                            )}
                          </div>

                          {!acceptedAllChapters && (
                            <div className="space-y-2">
                              <Label htmlFor="chapter-feedback-comments">Feedback Comments (Optional)</Label>
                              <Textarea
                                id="chapter-feedback-comments"
                                placeholder="Add any feedback for the student..."
                                value={reviewComments}
                                onChange={(e) => setReviewComments(e.target.value)}
                                rows={3}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                  {reviewError && (
                    <p className="text-xs text-destructive">{reviewError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    {(() => {
                      const currentChapter = getCurrentChapter(supChecklist)
                      const currentKey = `ch${currentChapter}` as ChapterKey
                      const currentChapterName = chapterLabel(currentChapter)
                      const acceptedAllChapters = supChecklist.ch1 && supChecklist.ch2 && supChecklist.ch3 && supChecklist.ch4 && supChecklist.ch5
                      const nextChecklist = { ...supChecklist, [currentKey]: true }

                      return (
                        <>
                          {!acceptedAllChapters && (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                setSubmittingReview(true)
                                try {
                                  await apiSupervisorUpdateChecklist(selectedPaper.id, supChecklist, token, reviewComments, currentChapter)
                                  setReviewError('')
                                  setReviewComments('')
                                } catch (err) {
                                  setReviewError(err instanceof Error ? err.message : 'Rejection failed')
                                } finally {
                                  setSubmittingReview(false)
                                }
                              }}
                              disabled={submittingReview}
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              Reject Chapter {currentChapterName}
                            </Button>
                          )}
                          {!acceptedAllChapters && (
                            <Button
                              onClick={async () => {
                                const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                                if (!token) return
                                setSubmittingReview(true)
                                try {
                                  const updated = await apiSupervisorUpdateChecklist(selectedPaper.id, nextChecklist, token, reviewComments)
                                  setSupChecklist(nextChecklist)
                                  setSelectedPaper(updated)
                                  setReviewError('')
                                  setReviewComments('')
                                  if (currentChapter === 5) {
                                    await apiCompletePhase3(selectedPaper.id, token)
                                    setDialogOpen(false)
                                    setSelectedPaper(null)
                                    await loadAll()
                                  }
                                } catch (err) {
                                  setReviewError(err instanceof Error ? err.message : 'Approval failed')
                                } finally {
                                  setSubmittingReview(false)
                                }
                              }}
                              disabled={submittingReview}
                            >
                              {submittingReview ? 'Processing...' : `Accept Chapter ${currentChapterName}`}
                            </Button>
                          )}
                          {acceptedAllChapters && (
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
                                  setReviewError(err instanceof Error ? err.message : 'Completion failed')
                                } finally {
                                  setSubmittingReview(false)
                                }
                              }}
                              disabled={submittingReview}
                            >
                              {submittingReview ? 'Completing...' : 'Move to Examiner Assignment'}
                            </Button>
                          )}
                        </>
                      )
                    })()}
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        setReviewComments('')
                      }}
                      disabled={submittingReview}
                    >
                      Clear Feedback
                    </Button>
                  </div>
                </div>
              )}

              {selectedPaper.status === 'phase4_pending_examiners' && (isHOD || isCoordinator || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Shield className="size-4" />
                    Phase 4: Assign Examiners (HOD / Coordinator)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Assign one internal and one external examiner to mark this thesis.
                  </p>
                  
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
                  {reviewError && (
                    <p className="text-xs text-destructive">{reviewError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button 
                      onClick={async () => {
                        if (!selectedInternalId || !selectedExternalId) return
                        if (selectedInternalId === selectedExternalId) {
                          setReviewError('Internal and External examiners must be different users')
                          return
                        }
                        if (selectedPaper.supervisor_id && (Number(selectedInternalId) === selectedPaper.supervisor_id || Number(selectedExternalId) === selectedPaper.supervisor_id)) {
                          setReviewError('Conflict of interest: A supervisor cannot be assigned as an examiner for their own supervisee')
                          return
                        }
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) return
                        setSubmittingReview(true)
                        try {
                          await apiAssignExaminers(selectedPaper.id, Number(selectedInternalId), Number(selectedExternalId), token)
                          setDialogOpen(false)
                          setSelectedPaper(null)
                          await loadAll()
                        } catch (err) {
                          setReviewError(err instanceof Error ? err.message : 'Assignment failed')
                        } finally {
                          setSubmittingReview(false)
                        }
                      }} 
                      disabled={!selectedInternalId || !selectedExternalId || submittingReview}
                    >
                      {submittingReview ? 'Assigning...' : 'Assign Examiners'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedPaper.status === 'phase4_marking' && (isSupervisor || isAdmin || isHOD || isCoordinator || selectedPaper.internal_examiner_id === user?.id || selectedPaper.external_examiner_id === user?.id) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <Award className="size-4" />
                    Phase 4: Examiner Marking & Feedback
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Submit grades and corrections feedback for this student's thesis.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs min-w-[120px]"
                      onClick={() => void handleDownloadDocument(selectedPaper.id)}
                      disabled={documentLoading}
                    >
                      {documentLoading ? 'Downloading...' : 'Download Thesis File'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(isAdmin || isHOD || isCoordinator || selectedPaper.internal_examiner_id === user?.id) && (
                      <div className="space-y-2">
                        <Label htmlFor="internal-score-input">Internal Examiner Score (0-100) *</Label>
                        <Input 
                          id="internal-score-input"
                          type="number" 
                          min="0"
                          max="100"
                          value={internalScore} 
                          onChange={(e) => setInternalScore(e.target.value)} 
                          placeholder="e.g. 85"
                        />
                      </div>
                    )}
                    {(isAdmin || isHOD || isCoordinator || selectedPaper.external_examiner_id === user?.id) && (
                      <div className="space-y-2">
                        <Label htmlFor="external-score-input">External Examiner Score (0-100) *</Label>
                        <Input 
                          id="external-score-input"
                          type="number" 
                          min="0"
                          max="100"
                          value={externalScore} 
                          onChange={(e) => setExternalScore(e.target.value)} 
                          placeholder="e.g. 78"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="corrections-feedback">Corrections & Feedback to Student *</Label>
                    <Textarea 
                      id="corrections-feedback"
                      rows={4}
                      value={examinerCorrections} 
                      onChange={(e) => setExaminerCorrections(e.target.value)} 
                      placeholder="Specify corrections needed before final publication..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="results-file-input">Marking Sheet / Feedback File (Optional PDF/DOCX)</Label>
                    <Input 
                      id="results-file-input"
                      type="file" 
                      accept=".pdf,.doc,.docx"
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
                        
                        let score1: number | undefined = undefined
                        let score2: number | undefined = undefined
                        
                        if (isUserInternal) {
                          if (!internalScore.trim()) {
                            setReviewError('Internal Examiner Score is required')
                            return
                          }
                          score1 = parseFloat(internalScore)
                          if (isNaN(score1) || score1 < 0 || score1 > 100) {
                            setReviewError('Internal Score must be a valid number between 0 and 100')
                            return
                          }
                        }
                        if (isUserExternal) {
                          if (!externalScore.trim()) {
                            setReviewError('External Examiner Score is required')
                            return
                          }
                          score2 = parseFloat(externalScore)
                          if (isNaN(score2) || score2 < 0 || score2 > 100) {
                            setReviewError('External Score must be a valid number between 0 and 100')
                            return
                          }
                        }
                        if (!examinerCorrections.trim()) {
                          setReviewError('Corrections feedback is required')
                          return
                        }
                        const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                        if (!token) return
                        setSubmittingReview(true)
                        try {
                          await apiUploadResults(selectedPaper.id, {
                            internalScore: score1,
                            externalScore: score2,
                            examinerCorrections: examinerCorrections.trim(),
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
                      {submittingReview ? 'Submitting...' : 'Submit Results & Feedback'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedPaper.status === 'phase5_pending_supervisor' && (isSupervisor || isAdmin) && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                  <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                    <CheckCircle className="size-4" />
                    Phase 5: Supervisor Approve Corrections
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
                    Phase 5: Departmental Sign-off
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

                  {canViewScores && selectedPaper.internal_score !== null && (
                    <div className="border rounded p-3 text-xs bg-background/50 space-y-1">
                      <p className="font-semibold text-muted-foreground">Examiner Score Summary (Visible Only to Coordinator, HOD, Dean, Admin):</p>
                      <div className="flex gap-4 text-muted-foreground">
                        <span>Internal Score: <strong className="text-foreground">{selectedPaper.internal_score}%</strong></span>
                        <span>External Score: <strong className="text-foreground">{selectedPaper.external_score}%</strong></span>
                      </div>
                    </div>
                  )}

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
                              await apiReviewPaper(selectedPaper.id, 'revision', reviewComments || 'Revision requested in HOD/Coordinator final sign-off', token)
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
                              await apiReviewPaper(selectedPaper.id, 'approve', reviewComments, token)
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
                          {submittingReview ? 'Signing...' : selectedPaper.status === 'phase5_pending_coordinator' ? 'Sign as Project Coordinator' : 'Sign & Approve Final Work (HOD)'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-3 rounded-lg">
                      {selectedPaper.status === 'phase5_pending_coordinator'
                        ? 'Currently awaiting the Project Coordinator signature.'
                        : 'Currently awaiting the HOD signature.'}
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
