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
  apiDeleteThesis,
  apiDeleteStep,
  apiDownloadStepFile,
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
  ApiPipelineStudent,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { DocumentCommentViewer } from './DocumentCommentViewer'
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle, Trash2, Download } from 'lucide-react'

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
          title: 'Phase 1: Topic Submitted',
          desc: 'Your thesis topic has been submitted successfully. It is currently awaiting review and acceptance by the Head of Department (HOD) / Project Coordinator.',
          color: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10',
          textColor: 'text-amber-800 dark:text-amber-300'
        }
      case 'phase1_topic_accepted':
        return {
          icon: <CheckCircle2 className="size-5 text-green-500" />,
          title: 'Phase 2: Project Proposal Submission Required',
          desc: 'Your topic was accepted and a supervisor has been assigned! Please upload your full Project Proposal below for supervisor review.',
          color: 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10',
          textColor: 'text-green-800 dark:text-green-300'
        }
      case 'phase1_topic_rejected':
      case 'phase1_proposal_rejected':
        return {
          icon: <AlertCircle className="size-5 text-destructive" />,
          title: 'Phase 1: Topic Rejected',
          desc: 'Your topic was rejected by the HOD. Please review feedback comments and resubmit.',
          color: 'border-destructive/20 bg-destructive/5',
          textColor: 'text-destructive'
        }
      case 'phase2_proposal_submitted':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 2: Proposal Submitted — Awaiting Supervisor Review',
          desc: 'Your project proposal has been submitted to your assigned supervisor for review and approval.',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase3_chapters':
      case 'phase3_steps_in_progress':
      case 'phase2_proposal_accepted':
        return {
          icon: <FileText className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 2: Dynamic Steps Progress',
          desc: 'Proposal accepted! Please submit your thesis steps/chapters for supervisor review below. Your supervisor will advance you to Phase 3 (Examination) when all steps are complete.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'phase4_pending_examiners':
        return {
          icon: <CheckCircle2 className="size-5 text-green-500" />,
          title: 'Phase 3: Awaiting Examiner Assignment',
          desc: 'Your supervisor has marked all steps complete! Currently awaiting assignment of Internal and External Examiners by the HOD/Project Coordinator.',
          color: 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10',
          textColor: 'text-green-800 dark:text-green-300'
        }
      case 'phase4_marking':
        return {
          icon: <Clock className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 3: Examination Underway',
          desc: 'Your thesis is currently under marking and evaluation by assigned Internal and External Examiners. You will be notified when examiner feedback is available.',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'revision':
        return {
          icon: <AlertCircle className="size-5 text-amber-500 animate-pulse" />,
          title: 'Step Revision Required',
          desc: 'Your supervisor requested revisions on a submitted step. Please check comments and upload your revised step file.',
          color: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10',
          textColor: 'text-amber-800 dark:text-amber-300'
        }
      case 'phase5_corrections':
        return {
          icon: <FileText className="size-5 text-orange-500 animate-pulse" />,
          title: 'Phase 4: Post-Examination Corrections Required',
          desc: 'Examiner feedback has been compiled by the HOD. Please review the comments and upload your corrected document for dual sign-off (Supervisor → HOD/Coordinator).',
          color: 'border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/10',
          textColor: 'text-orange-800 dark:text-orange-300'
        }
      case 'phase5_pending_supervisor':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 4: Corrections — Awaiting Supervisor Review',
          desc: 'Corrections submitted. Currently awaiting review and approval from your Supervisor (Sign-off 1 of 2).',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_coordinator':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 4: Corrections — Awaiting Coordinator Sign-off',
          desc: 'Supervisor approved! Currently awaiting review and sign-off from the Project Coordinator (Sign-off 2 of 2).',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_hod':
        return {
          icon: <Clock className="size-5 text-blue-500 animate-pulse" />,
          title: 'Phase 4: Corrections — Awaiting HOD Sign-off',
          desc: 'Supervisor approved! Currently awaiting final review and sign-off from the Head of Department (Sign-off 2 of 2).',
          color: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10',
          textColor: 'text-blue-800 dark:text-blue-300'
        }
      case 'phase5_pending_hod_and_coordinator':
        return {
          icon: <Clock className="size-5 text-indigo-500 animate-pulse" />,
          title: 'Phase 4: Corrections — Awaiting HOD & Coordinator Sign-off',
          desc: 'Supervisor approved! Currently awaiting clearance sign-offs from the Project Coordinator and HOD (dual sign-off gate).',
          color: 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/10',
          textColor: 'text-indigo-800 dark:text-indigo-300'
        }
      case 'phase5_approved_for_library':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          title: 'Phase 5: Approved — Awaiting Library Publication',
          desc: 'Dual sign-off (Supervisor + HOD/Coordinator) complete! Your thesis is awaiting final review and publication by the Librarian.',
          color: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10',
          textColor: 'text-emerald-800 dark:text-emerald-300'
        }
      case 'phase5_published':
      case 'approved':
        return {
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
          title: 'Phase 5: Published in GIMPA Thesis Repository',
          desc: 'Congratulations! Your thesis has been officially published by the Librarian in the GIMPA Institutional Repository.',
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
      {/* PHASE 2 — PROJECT PROPOSAL UPLOAD SECTION */}
      {(paper.status === 'phase1_topic_accepted' || paper.status === 'phase2_proposal_submitted') && (
        <div className="space-y-3 border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phase 2: Submit Project Proposal
              </p>
              <p className="text-[11px] text-muted-foreground">
                {paper.status === 'phase2_proposal_submitted'
                  ? 'Your Project Proposal has been submitted to your supervisor. You may upload a revised document below if needed.'
                  : 'Upload your complete Project Proposal document (PDF or DOCX) for your supervisor review. Once accepted, you will proceed to thesis steps.'}
              </p>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!draftFile) return
              setSubmitting(true)
              try {
                const { apiSubmitProposal } = await import('../../lib/api')
                await apiSubmitProposal(paper.id, draftFile, token)
                setSuccess('Project Proposal submitted successfully for supervisor review!')
                setDraftFile(null)
                onUpdate()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Proposal submission failed')
              } finally {
                setSubmitting(false)
              }
            }}
            className="space-y-2"
          >
            <div className="flex gap-2 items-center">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                className="h-9 text-xs"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !draftFile} className="bg-primary text-primary-foreground font-semibold">
                {submitting ? 'Submitting...' : 'Upload Project Proposal'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {(paper.status === 'phase3_chapters' || paper.status === 'phase3_steps_in_progress' || paper.status === 'phase2_proposal_accepted' || paper.status === 'revision') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phase 2: Dynamic Steps Progress
              </p>
              <p className="text-[11px] text-muted-foreground">
                Submit your thesis steps/chapters for supervisor review. Your supervisor will mark all steps as finished to advance you to Phase 3 (Examination).
              </p>
            </div>
          </div>

          {/* List of Dynamic Steps */}
          {paper.steps && paper.steps.length > 0 ? (
            <div className="space-y-2">
              {paper.steps.map((st) => (
                <div key={st.id} className="border rounded-md p-2.5 bg-background text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Step {st.step_number}: {st.title || `Step ${st.step_number}`}
                    </span>
                    <Badge variant={st.status === 'approved' ? 'default' : st.status === 'revise' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                      {st.status}
                    </Badge>
                  </div>
                  {st.supervisor_comment && (
                    <div className="bg-muted/50 rounded p-1.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold">Supervisor Feedback:</span> {st.supervisor_comment}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`/editor?stepId=${st.id}`, '_blank')
                      }}
                      className="h-7 text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
                    >
                      📝 View & Edit Step {st.step_number} in Editor
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={async () => {
                        try {
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
                    >
                      <Download className="size-3 mr-1" /> Download
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] text-primary border-primary/30 font-semibold"
                      onClick={async () => {
                        // Submit the currently edited step file as the next step (works like Upload Step File)
                        try {
                          setError('')
                          setSuccess('')
                          // download current step file
                          const { blob, filename } = await apiDownloadStepFile(st.id, token)
                          // wrap blob in File and call apiSubmitStep
                          const file = new File([blob], filename, { type: blob.type })
                          const nextStepNum = (paper.steps?.length || 0) + 1
                          const { apiSubmitStep } = await import('../../lib/api')
                          setSubmitting(true)
                          await apiSubmitStep(paper.id, nextStepNum, `Step ${nextStepNum}`, file, token)
                          setSuccess(`Edited Step ${st.step_number} submitted as Step ${nextStepNum} successfully!`)
                          onUpdate()
                        } catch (err) {
                          window.alert(err instanceof Error ? err.message : 'Submit Edited Step failed')
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                    >
                      📝 Submit Edited Step File
                    </Button>
                    {st.status !== 'approved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={async () => {
                          if (!window.confirm(`Delete Step ${st.step_number}? This cannot be undone.`)) return
                          try {
                            await apiDeleteStep(st.id, token)
                            onUpdate()
                          } catch (err) {
                            window.alert(err instanceof Error ? err.message : 'Failed to delete step')
                          }
                        }}
                      >
                        <Trash2 className="size-3 mr-1" /> Delete
                      </Button>
                    )}
                  </div>

                  
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed rounded p-3 text-center text-xs text-muted-foreground">
              No steps submitted yet. Upload your first step below.
            </div>
          )}

          {/* Form to submit step */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Submit Next Thesis Step</p>
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
              className="space-y-2"
            >
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                  className="h-9 text-xs"
                  required
                />
                <Button type="submit" size="sm" disabled={submitting || !draftFile}>
                  {submitting ? 'Submitting...' : 'Upload Step File'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(paper.status.startsWith('phase5') || paper.status.startsWith('phase4')) && (
        <div className="space-y-3">
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
                  <span className="font-semibold block mb-1">Compiled Examiner Comments:</span>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          paper.status === 'approved' || paper.status === 'phase5_published' ? 'default' :
                          paper.status === 'revision' || paper.status === 'phase1_topic_rejected' || paper.status === 'phase1_proposal_rejected' ? 'destructive' :
                          paper.status === 'phase5_approved_for_library' || paper.status === 'phase5_published' ? 'default' :
                          paper.status.startsWith('phase5') ? 'secondary' : 'outline'
                        } className="text-[10px] whitespace-nowrap">
                          {paper.status === 'phase1_proposal_submitted' ? 'Phase 1 — Awaiting HOD Review' :
                           paper.status === 'phase1_topic_accepted' ? 'Phase 2 — Proposal Required' :
                           paper.status === 'phase1_topic_rejected' || paper.status === 'phase1_proposal_rejected' ? 'Phase 1 — Topic Rejected' :
                           paper.status === 'phase2_proposal_submitted' ? 'Phase 2 — Proposal Submitted' :
                           paper.status === 'phase2_proposal_accepted' ? 'Phase 2 — Proposal Accepted' :
                           paper.status === 'phase3_chapters' || paper.status === 'phase3_steps_in_progress' ? 'Phase 2 — Steps in Progress' :
                           paper.status === 'phase4_pending_examiners' ? 'Phase 3 — Awaiting Examiners' :
                           paper.status === 'phase4_marking' ? 'Phase 3 — Under Examination' :
                           paper.status === 'phase5_corrections' ? 'Phase 4 — Corrections Required' :
                           paper.status === 'phase5_pending_supervisor' ? 'Phase 4 — Awaiting Supervisor' :
                           paper.status === 'phase5_pending_coordinator' ? 'Phase 4 — Awaiting Coordinator' :
                           paper.status === 'phase5_pending_hod' ? 'Phase 4 — Awaiting HOD' :
                           paper.status === 'phase5_pending_hod_and_coordinator' ? 'Phase 4 — Awaiting Coord & HOD' :
                           paper.status === 'phase5_approved_for_library' ? 'Phase 5 — Ready for Publication' :
                           paper.status === 'phase5_published' || paper.status === 'approved' ? '✓ Published' :
                           paper.status}
                        </Badge>
                        {(paper.status === 'phase1_proposal_submitted' || paper.status === 'phase1_topic_rejected') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Delete this submission"
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this thesis submission? This action cannot be undone.')) return
                              const tok = localStorage.getItem('murrs_access_token') || ''
                              try {
                                await apiDeleteThesis(paper.id, tok)
                                loadData()
                              } catch (err) {
                                window.alert(err instanceof Error ? err.message : 'Failed to delete submission')
                              }
                            }}
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
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
