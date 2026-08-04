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
  apiResubmitEditedStep,
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
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle, Trash2, Download, FileEdit, MessageSquare } from 'lucide-react'

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

                    {st.status !== 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-primary border-primary/30 font-semibold"
                        onClick={async () => {
                          try {
                            setError('')
                            setSuccess('')
                            setSubmitting(true)
                            await apiResubmitEditedStep(st.id, token)
                            setSuccess(`Edited Step ${st.step_number} submitted successfully!`)
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
                    )}

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
            <div className="space-y-4">
              {/* ONLYOFFICE & Download Tools Panel for Student Revisions */}
              <div className="border border-primary/20 bg-primary/5 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <FileEdit className="size-4" />
                  ONLYOFFICE In-App Revision & Examiner Feedback Tools
                </p>
                <p className="text-xs text-muted-foreground">
                  Read examiner remarks, work on corrections directly inside ONLYOFFICE Word, or download marked scripts offline:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.open(`/editor?paperId=${paper.id}&type=paper`, '_blank')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                  >
                    <FileEdit className="size-3.5 text-slate-200" />
                    📝 Edit & Work on Thesis in ONLYOFFICE
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`/editor?paperId=${paper.id}&type=comments`, '_blank')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow-sm transition-colors cursor-pointer"
                  >
                    <MessageSquare className="size-3.5 text-slate-200" />
                    💬 View Comments Document (ONLYOFFICE Word)
                  </button>
                  <button
                    type="button"
                    onClick={handleInSystemCorrectionsSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-colors cursor-pointer border border-emerald-500 disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3.5 text-white" />
                    {submitting ? 'Submitting...' : '🚀 Submit In-System ONLYOFFICE Edits'}
                  </button>
                  {paper.internal_result_file_name && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleDownloadExaminerScript('internal')} className="flex items-center gap-1.5 text-xs">
                      <FileText className="size-3.5" />
                      📥 Download Internal Examiner Script
                    </Button>
                  )}
                  {paper.external_result_file_name && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleDownloadExaminerScript('external')} className="flex items-center gap-1.5 text-xs">
                      <FileText className="size-3.5" />
                      📥 Download External Examiner Script
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleUploadCorrections} className="space-y-2">
                <Label htmlFor={`file-corrections-${paper.id}`} className="text-xs font-medium">
                  Upload corrected thesis file (Optional if edited directly in ONLYOFFICE)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id={`file-corrections-${paper.id}`}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs"
                  />
                  <Button type="submit" size="sm" disabled={submitting} className="whitespace-nowrap">
                    {submitting ? 'Submitting...' : file ? 'Submit Uploaded File' : 'Submit In-System Corrections'}
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
          const phaseKeys: (keyof ApiPipelineMetrics)[] = ['phase1_proposals', 'phase2_allocation', 'phase3_chapters', 'phase4_examination', 'phase5_signoff']
          const activeKey = phaseKeys.find((k) => (pipe[k]?.count ?? 0) > 0)
          if (activeKey) {
            setSelectedPhaseKey(activeKey)
          }
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

      {/* 4 TrendyAdmin Metric Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1 */}
        <div className="ta-stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500">
              <FileText className="size-5" />
            </div>
            <span className="badge-ta-green text-xs font-semibold px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
              ↗ 12.5%
            </span>
          </div>
          <p className="text-2xl font-black m-0 tracking-tight" style={{color:'var(--text-main)'}}>{stats?.total_papers ?? 0}</p>
          <p className="text-xs font-medium m-0 mt-1" style={{color:'var(--text-muted)'}}>Total Submissions</p>
          {/* Decorative bar chart dots */}
          <div className="flex items-end gap-1.5 mt-4 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
            <div className="w-2.5 h-2 rounded-full bg-purple-500/30" />
            <div className="w-2.5 h-3 rounded-full bg-purple-500/50" />
            <div className="w-2.5 h-5 rounded-full bg-purple-500/70" />
            <div className="w-2.5 h-3 rounded-full bg-purple-500/40" />
            <div className="w-2.5 h-6 rounded-full bg-purple-500" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="ta-stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <Clock className="size-5" />
            </div>
            <span className="badge-ta-cyan text-xs font-semibold px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
              ↗ 8.2%
            </span>
          </div>
          <p className="text-2xl font-black m-0 tracking-tight" style={{color:'var(--text-main)'}}>{stats?.pending_reviews ?? 0}</p>
          <p className="text-xs font-medium m-0 mt-1" style={{color:'var(--text-muted)'}}>Pending Reviews</p>
          <div className="flex items-end gap-1.5 mt-4 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
            <div className="w-2.5 h-3 rounded-full bg-cyan-500/30" />
            <div className="w-2.5 h-5 rounded-full bg-cyan-500/60" />
            <div className="w-2.5 h-2 rounded-full bg-cyan-500/40" />
            <div className="w-2.5 h-6 rounded-full bg-cyan-500" />
            <div className="w-2.5 h-4 rounded-full bg-cyan-500/70" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="ta-stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Download className="size-5" />
            </div>
            <span className="badge-ta-amber text-xs font-semibold px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
              ↘ 3.1%
            </span>
          </div>
          <p className="text-2xl font-black m-0 tracking-tight" style={{color:'var(--text-main)'}}>{stats?.total_downloads?.toLocaleString() ?? 0}</p>
          <p className="text-xs font-medium m-0 mt-1" style={{color:'var(--text-muted)'}}>Paper Downloads</p>
          <div className="flex items-end gap-1.5 mt-4 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
            <div className="w-2.5 h-5 rounded-full bg-amber-500/40" />
            <div className="w-2.5 h-2 rounded-full bg-amber-500/30" />
            <div className="w-2.5 h-6 rounded-full bg-amber-500" />
            <div className="w-2.5 h-4 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-3 rounded-full bg-amber-500/50" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="ta-stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="size-5" />
            </div>
            <span className="badge-ta-green text-xs font-semibold px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
              ↗ 5.8%
            </span>
          </div>
          <p className="text-2xl font-black m-0 tracking-tight" style={{color:'var(--text-main)'}}>{stats?.total_views?.toLocaleString() ?? 0}</p>
          <p className="text-xs font-medium m-0 mt-1" style={{color:'var(--text-muted)'}}>Repository Views</p>
          <div className="flex items-end gap-1.5 mt-4 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
            <div className="w-2.5 h-3 rounded-full bg-emerald-500/30" />
            <div className="w-2.5 h-4 rounded-full bg-emerald-500/50" />
            <div className="w-2.5 h-2 rounded-full bg-emerald-500/40" />
            <div className="w-2.5 h-5 rounded-full bg-emerald-500/80" />
            <div className="w-2.5 h-6 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Primary Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Department Student Pipeline Section */}
          {showPipeline && (
            <div className="ta-card p-5 space-y-5">
              <div className="flex items-center justify-between border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <div>
                  <h3 className="text-base font-bold m-0 flex items-center gap-2" style={{color:'var(--text-main)'}}>
                    Department Student Pipeline
                    <span className="badge-ta-purple text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                      Phases 1-5
                    </span>
                  </h3>
                  <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
                    Click any phase card to inspect active student records in that milestone.
                  </p>
                </div>
              </div>

              {/* 5 Phase Summary Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {[
                  { key: 'phase1_proposals', label: 'P1: Proposals' },
                  { key: 'phase2_allocation', label: 'P2: Allocation' },
                  { key: 'phase3_chapters', label: 'P3: Chapters' },
                  { key: 'phase4_examination', label: 'P4: Examination' },
                  { key: 'phase5_signoff', label: 'P5: Sign-off' },
                ].map((phase) => {
                  const phaseData = pipelineMetrics?.[phase.key as keyof ApiPipelineMetrics]
                  const count = phaseData?.count ?? 0
                  const isSelected = selectedPhaseKey === phase.key
                  return (
                    <button
                      key={phase.key}
                      type="button"
                      onClick={() => setSelectedPhaseKey(phase.key as keyof ApiPipelineMetrics)}
                      className="p-3 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-input)',
                        borderColor: isSelected ? '#8b5cf6' : 'var(--border-color)',
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider m-0 truncate" style={{color: isSelected ? '#8b5cf6' : 'var(--text-muted)'}}>
                        {phase.label}
                      </p>
                      <p className="text-lg font-black m-0 mt-1" style={{color:'var(--text-main)'}}>{count}</p>
                      <p className="text-[10px] m-0" style={{color:'var(--text-muted)'}}>Students</p>
                    </button>
                  )
                })}
              </div>

              {/* Drilled-Down Student Data Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider m-0" style={{color:'var(--text-sub)'}}>
                    Active Students in {
                      selectedPhaseKey === 'phase1_proposals' ? 'Phase 1 — Proposals' :
                      selectedPhaseKey === 'phase2_allocation' ? 'Phase 2 — Allocation' :
                      selectedPhaseKey === 'phase3_chapters' ? 'Phase 3 — Chapter Review' :
                      selectedPhaseKey === 'phase4_examination' ? 'Phase 4 — Examination' : 'Phase 5 — Final Sign-off'
                    }
                  </h4>
                  <span className="badge-ta-purple text-xs px-3 py-1 rounded-full font-mono font-bold">
                    {pipelineMetrics?.[selectedPhaseKey]?.students.length ?? 0} Active
                  </span>
                </div>

                {(!pipelineMetrics?.[selectedPhaseKey]?.students || pipelineMetrics[selectedPhaseKey].students.length === 0) ? (
                  <div className="p-8 border border-dashed rounded-xl text-center text-xs" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)',color:'var(--text-muted)'}}>
                    No active students currently in this phase.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead style={{backgroundColor:'var(--bg-subtle)',color:'var(--text-muted)'}} className="text-[11px] uppercase tracking-wider">
                        <tr className="border-b" style={{borderColor:'var(--border-color)'}}>
                          <th className="px-4 py-3 font-bold">Index #</th>
                          <th className="px-4 py-3 font-bold">Student Name</th>
                          <th className="px-4 py-3 font-bold">Program</th>
                          <th className="px-4 py-3 font-bold">Supervisor</th>
                          <th className="px-4 py-3 font-bold">Milestone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{borderColor:'var(--border-color)'}}>
                        {pipelineMetrics[selectedPhaseKey].students.map((st) => (
                          <tr key={st.paper_id} className="transition-colors hover:bg-purple-500/5">
                            <td className="px-4 py-3 font-mono font-semibold text-purple-500">{st.index_number}</td>
                            <td className="px-4 py-3 font-bold" style={{color:'var(--text-main)'}}>{st.student_name}</td>
                            <td className="px-4 py-3 font-medium" style={{color:'var(--text-sub)'}}>{st.program}</td>
                            <td className="px-4 py-3 font-medium" style={{color:'var(--text-sub)'}}>{st.supervisor_name || 'Unassigned'}</td>
                            <td className="px-4 py-3">
                              <span className="badge-ta-purple text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                                {st.milestone_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Student Submissions Section */}
          {(userRole === 'member' || userRole === 'student') && (
            <div id="my-submissions-section" className="ta-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <div>
                  <h3 className="text-base font-bold m-0 flex items-center gap-2" style={{color:'var(--text-main)'}}>
                    My Submissions & Workflow
                    <span className="badge-ta-green text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                      {myPapers.length} Papers
                    </span>
                  </h3>
                  <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
                    Track topic approval, chapter step uploads, ONLYOFFICE editor status, and supervisor comments.
                  </p>
                </div>
                {myPapers.length > 0 && (
                  <Button
                    size="sm"
                    className="btn-ta-purple text-xs"
                    onClick={() => navigate('/submit-proposal')}
                  >
                    + Submit New Proposal
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {myPapers.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed rounded-2xl space-y-4" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
                      <Upload className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold m-0" style={{color:'var(--text-main)'}}>Phase 1: Submit Your Thesis Topic</p>
                      <p className="text-xs max-w-md mx-auto m-0" style={{color:'var(--text-muted)'}}>
                        Submit your proposed thesis topic title and abstract to receive HOD approval and get assigned your supervisor.
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate('/submit-proposal')}
                      className="btn-ta-purple text-xs flex items-center gap-2 mx-auto"
                    >
                      <Upload className="size-4" />
                      Submit Thesis Topic (Phase 1)
                    </Button>
                  </div>
                ) : (
                  myPapers.map((paper) => (
                    <div key={paper.id} className="p-4 rounded-2xl border space-y-3" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                        <div>
                          <h4 className="text-sm font-bold m-0 leading-tight" style={{color:'var(--text-main)'}}>{paper.title}</h4>
                          <p className="text-[11px] m-0 mt-1" style={{color:'var(--text-muted)'}}>
                            Submitted: {paper.created_at ? new Date(paper.created_at).toLocaleString() : '-'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            paper.status === 'approved' || paper.status === 'phase5_published'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : paper.status.includes('rejected') || paper.status === 'revision'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}>
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
                          </span>

                          {(paper.status === 'phase1_proposal_submitted' || paper.status === 'phase1_topic_rejected') && (
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 text-xs p-1"
                              title="Delete submission"
                              onClick={async () => {
                                if (!window.confirm('Delete this thesis submission?')) return
                                const tok = localStorage.getItem('murrs_access_token') || ''
                                try {
                                  await apiDeleteThesis(paper.id, tok)
                                  loadData()
                                } catch (err) {
                                  window.alert(err instanceof Error ? err.message : 'Failed to delete')
                                }
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {paper.review_comments && (
                        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
                          <strong className="text-purple-300 font-semibold">Supervisor Remark: </strong>
                          {paper.review_comments}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="btn-ta-glass text-xs"
                          onClick={() => void handleDownloadPaper(paper.id)}
                        >
                          <Download className="size-3.5 mr-1" />
                          Download Latest File
                        </Button>

                        <Button
                          size="sm"
                          className="btn-ta-glass text-xs"
                          onClick={() => void handleLoadAnnotations(paper.id)}
                        >
                          {activeViewerPaperId === paper.id ? 'Hide Comments' : '💬 View Comments & Abstract'}
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

                      {/* Detailed Step Workflow Form */}
                      <StudentPaperWorkflow
                        paper={paper}
                        token={localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || ''}
                        onUpdate={loadData}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Supervisor Performance (for HOD / Coordinator) */}
          {isHodOrCoordinator && (
            <div className="ta-card p-5 space-y-4">
              <div className="border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <h3 className="text-base font-bold m-0" style={{color:'var(--text-main)'}}>Project Supervisor Performance</h3>
                <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
                  Review and approval metrics across department supervisors.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Supervisors</p>
                  <p className="text-xl font-bold m-0 mt-1" style={{color:'var(--text-main)'}}>{supervisorReviewSummary.length}</p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Total Reviews</p>
                  <p className="text-xl font-bold text-purple-400 m-0 mt-1">
                    {supervisorReviewSummary.reduce((sum, row) => sum + row.reviews_done, 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Total Approvals</p>
                  <p className="text-xl font-bold text-emerald-400 m-0 mt-1">
                    {supervisorReviewSummary.reduce((sum, row) => sum + row.approvals_done, 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {supervisorReviewSummary.map((row) => (
                  <div key={row.supervisor_user_id} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <span className="font-semibold" style={{color:'var(--text-sub)'}}>{row.supervisor_name || row.supervisor_email}</span>
                    <div className="flex items-center gap-2">
                      <span className="badge-ta-purple text-[10px] px-2 py-0.5 rounded-full">Reviews: {row.reviews_done}</span>
                      <span className="badge-ta-green text-[10px] px-2 py-0.5 rounded-full">Approved: {row.approvals_done}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System People Overview (for Admin) */}
          {isAdmin && (
            <div className="ta-card p-5 space-y-4">
              <div className="border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <h3 className="text-base font-bold m-0" style={{color:'var(--text-main)'}}>People & User Directory</h3>
                <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>Overview of registered students and academic staff accounts.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Students</p>
                  <p className="text-lg font-bold m-0 mt-1" style={{color:'var(--text-main)'}}>{students.length}</p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Lecturers</p>
                  <p className="text-lg font-bold m-0 mt-1" style={{color:'var(--text-main)'}}>{roleCount('lecturer')}</p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>Supervisors</p>
                  <p className="text-lg font-bold m-0 mt-1" style={{color:'var(--text-main)'}}>{roleCount('project_supervisor')}</p>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                  <p className="text-[10px] uppercase font-bold m-0" style={{color:'var(--text-muted)'}}>HODs</p>
                  <p className="text-lg font-bold m-0 mt-1" style={{color:'var(--text-main)'}}>{roleCount('hod')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Secondary Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Goal Progress Target Widget */}
          <div className="ta-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{borderColor:'var(--border-color)'}}>
              <h3 className="text-sm font-bold m-0" style={{color:'var(--text-main)'}}>Repository Target Goal</h3>
              <span className="badge-ta-purple text-[10px] px-2 py-0.5 rounded-full font-mono">Monthly</span>
            </div>

            <div className="text-center py-3">
              <div className="w-24 h-24 rounded-full border-4 border-purple-500 border-t-indigo-400 border-r-purple-400 flex flex-col items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                <span className="text-xl font-black text-purple-500">85%</span>
                <span className="text-[9px] text-purple-400 uppercase font-semibold">Completed</span>
              </div>
              <p className="text-xs font-semibold m-0 mt-3" style={{color:'var(--text-main)'}}>85% of Semester Thesis Approvals Reached</p>
              <p className="text-[11px] m-0 mt-1" style={{color:'var(--text-muted)'}}>12 theses currently undergoing examiner review</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
