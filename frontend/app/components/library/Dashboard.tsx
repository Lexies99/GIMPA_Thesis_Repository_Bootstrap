import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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
  apiStudentUpdateChecklist,
  apiUploadCombinedThesis,
  apiUploadDraft,
  apiDownloadExaminerScript,
  apiUploadCorrections,
} from '../../lib/api'
import type {
  ApiPaper,
  ApiPaperAnnotation,
  ApiPaperStats,
  ApiStudent,
  ApiSupervisorReviewSummary,
  ApiUser,
  ApiPipelineMetrics,
  ApiPipelineStudent,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { DocumentCommentViewer } from './DocumentCommentViewer'
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react'

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

  const handleUploadCorrections = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadCorrections(paper.id, file, token)
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
          title: 'Phase 1: Proposal Submitted',
          desc: 'Your project proposal has been submitted successfully. It is currently awaiting review and approval by the Head of Department (HOD).',
          color: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10',
          textColor: 'text-amber-800 dark:text-amber-300'
        }
      case 'phase1_proposal_rejected':
        return {
          icon: <AlertCircle className="size-5 text-destructive" />,
          title: 'Phase 1: Proposal Rejected',
          desc: 'Your project proposal was rejected by the HOD. Please review the feedback comments and upload a revised version in the Upload tab.',
          color: 'border-destructive/20 bg-destructive/5',
          textColor: 'text-destructive'
        }
      case 'phase2_pending_coordinator':
        return {
          icon: <CheckCircle2 className="size-5 text-green-500 animate-bounce" />,
          title: 'Phase 2: Coordinator Assignment',
          desc: 'Your proposal has been accepted! Currently awaiting the HOD to assign your Project Coordinator.',
          color: 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10',
          textColor: 'text-green-800 dark:text-green-300'
        }
      case 'phase2_pending_supervisor':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 2: Supervisor Assignment',
          desc: 'Project Coordinator assigned. Currently awaiting supervisor assignment to oversee your thesis chapters.',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase4_pending_examiners':
        return {
          icon: <CheckCircle2 className="size-5 text-green-500" />,
          title: 'Phase 4: Examiner Assignment',
          desc: 'All 5 chapters have been completed and approved by your supervisor! Currently awaiting assignment of Internal and External Examiners.',
          color: 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10',
          textColor: 'text-green-800 dark:text-green-300'
        }
      case 'phase4_marking':
        return {
          icon: <Clock className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 4: Thesis Assessment',
          desc: 'Your thesis is currently under review, marking, and grading by the assigned examiners.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'phase3_chapters':
        return {
          icon: <FileText className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 3: Chapters Review',
          desc: 'Your supervisor has been assigned! You are now in Phase 3 (Chapters writing). Please work on your chapter drafts and update your progress below.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'revision':
        return {
          icon: <AlertCircle className="size-5 text-amber-500 animate-pulse" />,
          title: 'Revision Required',
          desc: 'Your supervisor has requested revisions on one or more chapters. Please check the feedback comments, upload the corrected drafts, and check them off when ready.',
          color: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10',
          textColor: 'text-amber-800 dark:text-amber-300'
        }
      case 'phase5_corrections':
        return {
          icon: <FileText className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 5: Post-Defense Corrections',
          desc: 'Your thesis assessment has been completed. Please review the examiner feedback, make the necessary corrections, and upload your final document.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'phase5_pending_coordinator':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 5: Coordinator Sign-off',
          desc: 'Your corrections have been uploaded successfully. Awaiting final review and sign-off by the Project Coordinator.',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_hod':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 5: HOD Sign-off',
          desc: 'Your corrections have been approved by the coordinator. Awaiting final approval and sign-off by the Head of Department (HOD).',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_supervisor':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 5: Corrections Review',
          desc: 'Your examiner corrections have been uploaded successfully. Awaiting your supervisor\'s final review and approval.',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_hod_and_coordinator':
        return {
          icon: <Clock className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 5: Final Departmental Review',
          desc: 'Your supervisor approved the corrections! Awaiting final verification and clearance from the HOD and Project Coordinator.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'phase5_approved_for_library':
      case 'approved':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          title: 'Approved for Publication',
          desc: 'Congratulations! Your thesis has been fully approved by the department. It is now published in the repository.',
          color: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10',
          textColor: 'text-emerald-800 dark:text-emerald-300'
        }
      default:
        return null
    }
  }

  const statusDetails = getStatusDetails(paper.status)

  return (
    <div className="mt-3 border border-border/60 rounded-lg p-3 bg-muted/20 space-y-3">
      {(paper.status === 'phase3_chapters' || paper.status === 'revision') && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chapters Progress (Student Checklist)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Check chapters once you have finished drafts for them. Your supervisor must approve all 5 chapters to proceed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
            {[
              { id: 'ch1', name: 'Chapter 1', val: ch1, sup: paper.ch1_supervisor_approved, enabled: true },
              { id: 'ch2', name: 'Chapter 2', val: ch2, sup: paper.ch2_supervisor_approved, enabled: !!paper.ch1_supervisor_approved },
              { id: 'ch3', name: 'Chapter 3', val: ch3, sup: paper.ch3_supervisor_approved, enabled: !!paper.ch2_supervisor_approved },
              { id: 'ch4', name: 'Chapter 4', val: ch4, sup: paper.ch4_supervisor_approved, enabled: !!paper.ch3_supervisor_approved },
              { id: 'ch5', name: 'Chapter 5', val: ch5, sup: paper.ch5_supervisor_approved, enabled: !!paper.ch4_supervisor_approved },
            ].map((ch) => {
              const isDisabled = !ch.enabled;
              return (
                <div 
                  key={ch.id} 
                  className={`border rounded p-2 flex flex-col justify-between gap-2 transition-all ${
                    isDisabled 
                      ? 'bg-muted/50 border-muted opacity-60 text-muted-foreground' 
                      : 'bg-background hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`student-${paper.id}-${ch.id}`}
                      checked={ch.val}
                      disabled={isDisabled}
                      onChange={(e) => void handleCheckboxChange(ch.id, e.target.checked)}
                      className="rounded border-gray-300 disabled:opacity-50"
                    />
                    <label 
                      htmlFor={`student-${paper.id}-${ch.id}`} 
                      className={`text-xs font-medium ${isDisabled ? 'cursor-not-allowed text-muted-foreground/80' : 'cursor-pointer'}`}
                    >
                      {ch.name}
                    </label>
                  </div>
                  <div className="text-[10px]">
                    <span className={isDisabled ? 'text-muted-foreground/80' : 'text-muted-foreground'}>Approved:</span>{' '}
                    {ch.sup ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : (
                      <span className={isDisabled ? 'text-muted-foreground/80 font-medium' : 'text-amber-600 font-semibold'}>
                        {isDisabled ? 'Locked' : 'No'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!paper.ch5_supervisor_approved && (
            <div className="space-y-3 mt-4 border-t pt-3 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upload Draft/Working Chapter Document
              </p>
              <p className="text-[11px] text-muted-foreground">
                Upload your chapter draft/updated document. Your supervisor will be notified to review it.
              </p>
              <form onSubmit={handleUploadDraft} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    id={`draft-file-${paper.id}`}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs"
                    required
                  />
                  <Button type="submit" size="sm" disabled={submitting || !draftFile}>
                    {submitting ? 'Uploading...' : 'Upload Draft'}
                  </Button>
                </div>
              </form>
            </div>
          )}
          {paper.ch5_supervisor_approved && !paper.combined_thesis_student_done && (
            <div className="space-y-3 mt-4 border-t pt-3 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upload Combined Thesis Document
              </p>
              <p className="text-[11px] text-muted-foreground">
                All 5 chapters have been approved by your supervisor. Please upload the complete, combined thesis document below for final sign-off.
              </p>
              <form onSubmit={handleUploadCombinedThesis} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    id={`combined-file-${paper.id}`}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCombinedFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs"
                    required
                  />
                  <Button type="submit" size="sm" disabled={submitting || !combinedFile}>
                    {submitting ? 'Uploading...' : 'Upload Combined Thesis'}
                  </Button>
                </div>
              </form>
            </div>
          )}
          {paper.ch5_supervisor_approved && paper.combined_thesis_student_done && !paper.combined_thesis_supervisor_approved && (
            <div className="space-y-3 mt-4 border-t pt-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3 border border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10 rounded-lg p-3">
                <div className="mt-0.5"><Clock className="size-5 text-blue-500 animate-pulse" /></div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Combined Thesis Review</p>
                  <p className="text-xs text-blue-800 dark:text-blue-300">Combined thesis uploaded. Awaiting supervisor approval.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {paper.status === 'phase5_corrections' && (
        <div className="space-y-3">
          {(paper.internal_result_file_name || paper.external_result_file_name) && (
            <div className="space-y-2 border-b pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Download Examiner Marked Scripts
              </p>
              <div className="flex flex-wrap gap-2">
                {paper.internal_result_file_name && (
                  <Button size="sm" variant="outline" onClick={() => void handleDownloadExaminerScript('internal')} className="flex items-center gap-1.5 text-xs">
                    <FileText className="size-4" />
                    Internal Examiner Script
                  </Button>
                )}
                {paper.external_result_file_name && (
                  <Button size="sm" variant="outline" onClick={() => void handleDownloadExaminerScript('external')} className="flex items-center gap-1.5 text-xs">
                    <FileText className="size-4" />
                    External Examiner Script
                  </Button>
                )}
              </div>
            </div>
          )}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Upload Examiner Corrections
          </p>
          {paper.examiner_corrections && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2.5 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold block mb-1">Corrections Required:</span>
              <p className="whitespace-pre-line">{paper.examiner_corrections}</p>
            </div>
          )}
          <form onSubmit={handleUploadCorrections} className="space-y-2">
            <Label htmlFor={`file-corrections-${paper.id}`} className="text-xs font-medium">
              Select corrected thesis document (PDF/DOCX)
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id={`file-corrections-${paper.id}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="h-9 text-xs"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !file}>
                {submitting ? 'Uploading...' : 'Submit Corrections'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {statusDetails && (
        <div className={`flex items-start gap-3 border rounded-lg p-3 ${statusDetails.color} animate-in fade-in slide-in-from-top-1 duration-200`}>
          <div className="mt-0.5">{statusDetails.icon}</div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{statusDetails.title}</p>
            <p className={`text-xs ${statusDetails.textColor}`}>{statusDetails.desc}</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600 font-medium">{success}</p>}
    </div>
  )
}

interface DashboardProps {
  userRole: string
}

export function Dashboard({ userRole }: DashboardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userRole === 'system_admin' || userRole === 'librarian' || userRole === 'head_library'
  const userRoles = (user?.roles || []) as string[]
  const isHodOrCoordinator =
    userRole === 'hod' ||
    userRole === 'project_coordinator' ||
    userRole === 'dean' ||
    userRoles.includes('hod') ||
    userRoles.includes('project_coordinator') ||
    userRoles.includes('dean')
  const showPipeline = isAdmin || isHodOrCoordinator
  const [stats, setStats] = useState<ApiPaperStats | null>(null)
  const [myPapers, setMyPapers] = useState<ApiPaper[]>([])
  const [supervisorReviewSummary, setSupervisorReviewSummary] = useState<ApiSupervisorReviewSummary[]>([])
  const [hasReviewedByPaper, setHasReviewedByPaper] = useState<Record<number, boolean>>({})
  const [annotationsByPaper, setAnnotationsByPaper] = useState<Record<number, ApiPaperAnnotation[]>>({})
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<ApiPipelineMetrics | null>(null)
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<keyof ApiPipelineMetrics>('phase1_proposals')

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const loadData = () => setRefreshTrigger((prev) => prev + 1)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const accessToken = localStorage.getItem('murrs_access_token')
        const [s, mine, userItems, studentItems, supervisorSummaryItems, pipe] = await Promise.all([
          apiGetPaperStats(),
          accessToken ? apiGetMyPapers(accessToken) : Promise.resolve([]),
          accessToken && isAdmin ? apiListUsers(accessToken, { limit: 500 }) : Promise.resolve([]),
          accessToken && isAdmin ? apiListStudents(accessToken, { limit: 500 }) : Promise.resolve([]),
          accessToken && isHodOrCoordinator ? apiGetDepartmentSupervisorReviewSummary(accessToken) : Promise.resolve([]),
          accessToken && showPipeline ? apiGetPipelineMetrics(accessToken) : Promise.resolve(null),
        ])
        if (cancelled) return
        setStats(s)
        setMyPapers(
          [...mine].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          ),
        )
        setUsers(userItems)
        setStudents(studentItems)
        setSupervisorReviewSummary(
          [...supervisorSummaryItems].sort(
            (a, b) =>
              b.reviews_done - a.reviews_done ||
              b.approvals_done - a.approvals_done ||
              (a.supervisor_email || '').localeCompare(b.supervisor_email || ''),
          ),
        )
        if (pipe) {
          setPipelineMetrics(pipe)
        }
      } catch {
        if (!cancelled) {
          setStats({ total_papers: 0, total_views: 0, total_downloads: 0, pending_reviews: 0 })
          setMyPapers([])
          setUsers([])
          setStudents([])
          setSupervisorReviewSummary([])
          setPipelineMetrics(null)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isAdmin, isHodOrCoordinator, showPipeline, userRole, refreshTrigger])

  useEffect(() => {
    if (!(userRole === 'member' || userRole === 'student')) return
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken || myPapers.length === 0) {
      setHasReviewedByPaper({})
      return
    }
    let cancelled = false
    const run = async () => {
      const entries = await Promise.all(
        myPapers.map(async (paper) => {
          try {
            const ok = await apiHasReviewedPaperFile(paper.id, accessToken)
            return [paper.id, ok] as const
          } catch {
            return [paper.id, false] as const
          }
        }),
      )
      if (cancelled) return
      setHasReviewedByPaper(Object.fromEntries(entries))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [myPapers, userRole])

  const roleCount = (role: string) =>
    users.filter((u) => (u.roles || [u.role]).map((r) => String(r).toLowerCase()).includes(role)).length

  const handleDownloadPaper = async (paperId: number) => {
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken) return
    try {
      let blob: Blob
      let filename: string
      try {
        const reviewed = await apiDownloadReviewedPaperFile(paperId, accessToken)
        blob = reviewed.blob
        filename = reviewed.filename
      } catch {
        // Fallback for papers that do not yet have a supervisor-reviewed version.
        const latest = await apiDownloadPaperFile(paperId, accessToken)
        blob = latest.blob
        filename = latest.filename
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file'
      window.alert(message)
    }
  }

  const [activeViewerPaperId, setActiveViewerPaperId] = useState<number | null>(null)

  const handleLoadAnnotations = async (paperId: number) => {
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken) return
    setActiveViewerPaperId((prev) => (prev === paperId ? null : paperId))
    try {
      const rows = await apiGetPaperAnnotations(paperId, accessToken)
      setAnnotationsByPaper((prev) => ({ ...prev, [paperId]: rows }))
    } catch {
      setAnnotationsByPaper((prev) => ({ ...prev, [paperId]: [] }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats?.total_papers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats?.total_views?.toLocaleString() ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats?.total_downloads?.toLocaleString() ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats?.pending_reviews ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {showPipeline && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle>Department Student Pipeline (Phases 1 to 5)</CardTitle>
            <CardDescription>
              Click any phase summary card to view and filter active student records in that phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 4.1 Pipeline Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'phase1_proposals', label: 'Phase 1: Proposals' },
                { key: 'phase2_allocation', label: 'Phase 2: Allocation' },
                { key: 'phase3_chapters', label: 'Phase 3: Chapters' },
                { key: 'phase4_examination', label: 'Phase 4: Examination' },
                { key: 'phase5_signoff', label: 'Phase 5: Sign-off' },
              ].map((phase) => {
                const phaseData = pipelineMetrics?.[phase.key as keyof ApiPipelineMetrics]
                const count = phaseData?.count ?? 0
                const isSelected = selectedPhaseKey === phase.key
                return (
                  <button
                    key={phase.key}
                    type="button"
                    onClick={() => setSelectedPhaseKey(phase.key as keyof ApiPipelineMetrics)}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {phase.label}
                    </p>
                    <p className="text-2xl font-bold mt-1">{count} Students</p>
                  </button>
                )
              })}
            </div>

            {/* 4.2 Drilled-Down Student Data Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold">
                  Students in {
                    selectedPhaseKey === 'phase1_proposals' ? 'Phase 1 — Proposals' :
                    selectedPhaseKey === 'phase2_allocation' ? 'Phase 2 — Allocation' :
                    selectedPhaseKey === 'phase3_chapters' ? 'Phase 3 — Chapter Review' :
                    selectedPhaseKey === 'phase4_examination' ? 'Phase 4 — Examination' : 'Phase 5 — Final Sign-off'
                  }
                </h4>
                <Badge variant="outline">
                  {pipelineMetrics?.[selectedPhaseKey]?.students.length ?? 0} Active
                </Badge>
              </div>

              {(!pipelineMetrics?.[selectedPhaseKey]?.students || pipelineMetrics[selectedPhaseKey].students.length === 0) ? (
                <div className="p-8 border rounded-lg text-center text-muted-foreground bg-muted/20">
                  No active students currently in this phase.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Index Number</th>
                        <th className="px-4 py-3">Student Full Name</th>
                        <th className="px-4 py-3">Program / Class</th>
                        <th className="px-4 py-3">Assigned Supervisor</th>
                        <th className="px-4 py-3">Current Milestone Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pipelineMetrics[selectedPhaseKey].students.map((st) => (
                        <tr key={st.paper_id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium">{st.index_number}</td>
                          <td className="px-4 py-3 font-medium">{st.student_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{st.program}</td>
                          <td className="px-4 py-3">{st.supervisor_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{st.milestone_status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Students (Imported)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{students.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lecturers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{roleCount('lecturer')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">HODs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{roleCount('hod')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Project Supervisors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{roleCount('project_supervisor')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Project Coordinators</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl">{roleCount('project_coordinator')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>People Overview</CardTitle>
              <CardDescription>Recent students and staff in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Recent Students</p>
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No student records uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {students.slice(0, 8).map((s) => (
                      <div key={s.student_id} className="text-sm border rounded px-3 py-2 flex items-center justify-between gap-2">
                        <span>{s.full_name} ({s.student_id})</span>
                        <span className="text-muted-foreground">{s.department || '-'} / {s.year || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Recent Staff Accounts</p>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff accounts found.</p>
                ) : (
                  <div className="space-y-2">
                    {users.slice(0, 8).map((u) => (
                      <div key={u.id} className="text-sm border rounded px-3 py-2 flex items-center justify-between gap-2">
                        <span>{u.full_name || u.email}</span>
                        <span className="text-muted-foreground">{(u.roles && u.roles.length ? u.roles : [u.role]).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {(userRole === 'member' || userRole === 'student') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>My Submissions</CardTitle>
              <CardDescription>Supervisor decisions and feedback on your work</CardDescription>
            </div>
            {myPapers.length > 0 && (
              <Button size="sm" onClick={() => navigate('/submit-proposal')}>
                Submit New Proposal
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myPapers.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed rounded-lg bg-muted/20 space-y-4">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Upload className="size-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Phase 1: Submit Your Thesis Topic</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Submit your proposed thesis topic title and short description to receive HOD approval and get assigned your supervisor.
                    </p>
                  </div>
                  <Button onClick={() => navigate('/submit-proposal')} className="flex items-center gap-2 mx-auto">
                    <Upload className="size-4" />
                    Submit Thesis Topic (Phase 1)
                  </Button>
                </div>
              ) : (
                myPapers.map((paper) => (
                  <div key={paper.id} className="p-3 border rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{paper.title}</p>
                      <Badge variant={paper.status === 'approved' ? 'default' : paper.status === 'revision' ? 'secondary' : 'outline'}>
                        {paper.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {paper.created_at ? new Date(paper.created_at).toLocaleString() : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reviewed file uploaded: {hasReviewedByPaper[paper.id] ? 'Yes' : 'No'}
                    </p>
                    {paper.review_comments && (
                      <p className="text-xs bg-muted rounded p-2">
                        Feedback: {paper.review_comments}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => void handleDownloadPaper(paper.id)}>
                        Download Reviewed File
                      </Button>
                      <Button
                        size="sm"
                        variant={activeViewerPaperId === paper.id ? 'default' : 'secondary'}
                        onClick={() => void handleLoadAnnotations(paper.id)}
                      >
                        {activeViewerPaperId === paper.id ? 'Hide Visual Comments' : 'View Supervisor Comments & Abstract'}
                      </Button>
                    </div>

                    {activeViewerPaperId === paper.id && (
                      <div className="pt-2">
                        <DocumentCommentViewer
                          paper={paper}
                          annotations={annotationsByPaper[paper.id] || []}
                          isSupervisor={false}
                        />
                      </div>
                    )}

                    {localStorage.getItem('murrs_access_token') && (
                      <StudentPaperWorkflow
                        paper={paper}
                        token={localStorage.getItem('murrs_access_token') || ''}
                        onUpdate={loadData}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isHodOrCoordinator && (
        <Card>
          <CardHeader>
            <CardTitle>Project Supervisor Performance</CardTitle>
            <CardDescription>
              All project supervisors in your department with review and approval totals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Project Supervisors</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl">{supervisorReviewSummary.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Reviews Done</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl">
                    {supervisorReviewSummary.reduce((sum, row) => sum + row.reviews_done, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl">{supervisorReviewSummary.reduce((sum, row) => sum + row.approvals_done, 0)}</p>
                </CardContent>
              </Card>
            </div>
            {supervisorReviewSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No project supervisors were found for your department yet.
              </p>
            ) : (
              <div className="space-y-2">
                {supervisorReviewSummary.map((row) => (
                  <div key={row.supervisor_user_id} className="text-sm border rounded px-3 py-2 flex items-center justify-between gap-2">
                    <span className="truncate">{row.supervisor_name || row.supervisor_email}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Reviews: {row.reviews_done}</Badge>
                      <Badge variant="secondary">Approved: {row.approvals_done}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
