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
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle, Trash2, Download, FileEdit, GraduationCap, Award, TrendingUp, BarChart3, Users, CheckCircle, Sparkles } from 'lucide-react'

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
    <div className="container-fluid px-0 space-y-6">
      {/* 1. GIMPA Academic Hero Banner */}
      <div className="gimpa-hero-banner rounded-4 p-4 p-md-5 text-white position-relative overflow-hidden">
        <div className="row align-items-center position-relative z-1">
          <div className="col-lg-8 space-y-2">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className="badge gimpa-gold-badge px-3 py-1.5 rounded-pill text-uppercase">
                <GraduationCap className="size-3.5 inline mr-1" />
                GIMPA Academic Repository Portal
              </span>
              <span className="badge bg-primary/20 text-blue-200 border border-blue-400/30 px-3 py-1.5 rounded-pill capitalize">
                {userRole.replace('_', ' ')}
              </span>
            </div>
            <h1 className="h2 font-extrabold text-white tracking-tight mb-1">
              Welcome, {user?.full_name || 'Academic Member'}
            </h1>
            <p className="text-slate-300 text-sm mb-0 max-w-2xl">
              Track project milestones, conduct online ONLYOFFICE thesis reviews, manage examiner feedback, and oversee department sign-offs.
            </p>
          </div>
          <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <button
              type="button"
              onClick={() => navigate('/submit-proposal')}
              className="btn btn-warning fw-bold px-4 py-2.5 rounded-3 shadow-lg hover:shadow-xl text-slate-900 border-0 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="size-4" />
              Submit New Proposal
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bootstrap Stat Cards Grid */}
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="gimpa-stat-card gimpa-stat-blue h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Submissions</p>
                <h3 className="h2 font-extrabold text-white mb-0">{stats?.total_papers ?? 0}</h3>
              </div>
              <div className="p-3 rounded-3 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FileText className="size-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="gimpa-stat-card gimpa-stat-violet h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Views</p>
                <h3 className="h2 font-extrabold text-white mb-0">{stats?.total_views?.toLocaleString() ?? 0}</h3>
              </div>
              <div className="p-3 rounded-3 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Eye className="size-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="gimpa-stat-card gimpa-stat-emerald h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Downloads</p>
                <h3 className="h2 font-extrabold text-white mb-0">{stats?.total_downloads?.toLocaleString() ?? 0}</h3>
              </div>
              <div className="p-3 rounded-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Download className="size-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="gimpa-stat-card gimpa-stat-amber h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Reviews</p>
                <h3 className="h2 font-extrabold text-white mb-0">{stats?.pending_reviews ?? 0}</h3>
              </div>
              <div className="p-3 rounded-3 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="size-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Department Student Pipeline (Phases 1 to 5) */}
      {showPipeline && (
        <div className="card border-0 gimpa-card p-4 space-y-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom border-slate-700/50 pb-3">
            <div>
              <h3 className="h5 font-bold text-white mb-1 flex items-center gap-2">
                <BarChart3 className="size-5 text-blue-400" />
                Department Student Pipeline (Phases 1 to 5)
              </h3>
              <p className="text-xs text-slate-400 mb-0">
                Click any phase summary card to filter and inspect active student records in that milestone phase.
              </p>
            </div>
            <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-pill text-xs font-semibold">
              Live Department Metrics
            </span>
          </div>

          {/* Pipeline Metric Cards */}
          <div className="row g-3">
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
                <div key={phase.key} className="col">
                  <button
                    type="button"
                    onClick={() => setSelectedPhaseKey(phase.key as keyof ApiPipelineMetrics)}
                    className={`w-100 p-3 rounded-3 text-start transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-400'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {phase.label}
                    </p>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="h4 font-extrabold text-white mb-0">{count}</span>
                      <span className={`badge ${count > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                        {count > 0 ? `${count} Active` : 'Empty'}
                      </span>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Drilled-Down Student Data Table */}
          <div className="pt-2 space-y-3">
            <div className="d-flex align-items-center justify-content-between">
              <h4 className="text-sm font-bold text-slate-200 mb-0 flex items-center gap-2">
                <Users className="size-4 text-blue-400" />
                Active Students in {
                  selectedPhaseKey === 'phase1_proposals' ? 'Phase 1 — Proposals' :
                  selectedPhaseKey === 'phase2_allocation' ? 'Phase 2 — Allocation' :
                  selectedPhaseKey === 'phase3_chapters' ? 'Phase 3 — Chapter Review' :
                  selectedPhaseKey === 'phase4_examination' ? 'Phase 4 — Examination' : 'Phase 5 — Final Sign-off'
                }
              </h4>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                {pipelineMetrics?.[selectedPhaseKey]?.students.length ?? 0} Students Found
              </Badge>
            </div>

            {(!pipelineMetrics?.[selectedPhaseKey]?.students || pipelineMetrics[selectedPhaseKey].students.length === 0) ? (
              <div className="p-4 border border-dashed border-slate-700 rounded-3 text-center text-slate-400 bg-slate-800/30 text-xs">
                No active student records currently in this phase.
              </div>
            ) : (
              <div className="table-responsive rounded-3 border border-slate-700/60 overflow-hidden">
                <table className="table table-dark table-hover mb-0 text-xs align-middle">
                  <thead className="table-dark border-bottom border-slate-700 text-slate-400 text-uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Index Number</th>
                      <th className="px-3 py-2.5">Student Full Name</th>
                      <th className="px-3 py-2.5">Program / Discipline</th>
                      <th className="px-3 py-2.5">Assigned Supervisor</th>
                      <th className="px-3 py-2.5">Milestone Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {pipelineMetrics[selectedPhaseKey].students.map((st) => (
                      <tr key={st.paper_id} className="transition-colors">
                        <td className="px-3 py-2.5 font-mono font-semibold text-blue-400">{st.index_number}</td>
                        <td className="px-3 py-2.5 font-semibold text-white">{st.student_name}</td>
                        <td className="px-3 py-2.5 text-slate-300">{st.program}</td>
                        <td className="px-3 py-2.5 text-slate-300">{st.supervisor_name}</td>
                        <td className="px-3 py-2.5">
                          <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold px-2.5 py-1 rounded-pill">
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

      {/* 4. Admin Account Overview Cards */}
      {isAdmin && (
        <div className="row g-3">
          <div className="col">
            <div className="card gimpa-card p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Students</p>
              <h4 className="h3 font-extrabold text-white mb-0">{students.length}</h4>
            </div>
          </div>
          <div className="col">
            <div className="card gimpa-card p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Lecturers</p>
              <h4 className="h3 font-extrabold text-white mb-0">{roleCount('lecturer')}</h4>
            </div>
          </div>
          <div className="col">
            <div className="card gimpa-card p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">HODs</p>
              <h4 className="h3 font-extrabold text-white mb-0">{roleCount('hod')}</h4>
            </div>
          </div>
          <div className="col">
            <div className="card gimpa-card p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Coordinators</p>
              <h4 className="h3 font-extrabold text-white mb-0">{roleCount('project_coordinator')}</h4>
            </div>
          </div>
          <div className="col">
            <div className="card gimpa-card p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">System Admins</p>
              <h4 className="h3 font-extrabold text-white mb-0">{roleCount('system_admin')}</h4>
            </div>
          </div>
        </div>
      )}

      {/* 5. Submissions List & Workflow Cards */}
      <div className="card border-0 gimpa-card p-4 space-y-4">
        <div className="d-flex align-items-center justify-content-between border-bottom border-slate-700/50 pb-3">
          <div>
            <h3 className="h5 font-bold text-white mb-1 flex items-center gap-2">
              <FileText className="size-5 text-blue-400" />
              My Submissions & Thesis Workflows
            </h3>
            <p className="text-xs text-slate-400 mb-0">
              Supervisor decisions, ONLYOFFICE Word tools, and active progress tracking on your submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/submit-proposal')}
            className="btn btn-sm btn-outline-light rounded-pill px-3 text-xs font-semibold"
          >
            + Submit New Proposal
          </button>
        </div>

        {myPapers.length === 0 ? (
          <div className="p-5 border border-dashed border-slate-700 rounded-3 text-center bg-slate-800/30">
            <FileText className="size-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300 mb-1">No Submissions Found</p>
            <p className="text-xs text-slate-500 mb-3">You have not submitted any project proposal or thesis yet.</p>
            <button
              type="button"
              onClick={() => navigate('/submit-proposal')}
              className="btn btn-sm btn-primary rounded-3 text-xs font-bold px-4"
            >
              Submit New Proposal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myPapers.map((paper) => (
              <div key={paper.id} className="border border-slate-700/70 rounded-3 p-3 p-md-4 bg-slate-800/50 space-y-3 shadow-sm hover:border-blue-500/40 transition-all">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom border-slate-700/40 pb-3">
                  <div>
                    <h4 className="h6 font-bold text-white mb-1">{paper.title}</h4>
                    <p className="text-xs text-slate-400 mb-0">
                      Submitted: {paper.created_at ? new Date(paper.created_at).toLocaleString() : '-'} | Discipline: {paper.discipline || 'Computer Science'}
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-pill text-xs font-semibold">
                      {paper.status === 'phase1_proposal_submitted' ? 'Phase 1 — Awaiting HOD Review' :
                       paper.status === 'phase1_topic_accepted' ? 'Phase 2 — Proposal Required' :
                       paper.status === 'phase1_topic_rejected' || paper.status === 'phase1_topic_rejected' ? 'Phase 1 — Topic Rejected' :
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
                        className="btn btn-sm btn-outline-danger py-1 px-2 text-xs"
                        title="Delete submission"
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this thesis submission?')) return
                          const tok = localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || ''
                          try {
                            await apiDeleteThesis(paper.id, tok)
                            loadData()
                          } catch (err) {
                            window.alert(err instanceof Error ? err.message : 'Failed to delete submission')
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 inline mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {paper.review_comments && (
                  <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-3 text-xs text-slate-300">
                    <strong className="text-amber-400">Supervisor Feedback:</strong> {paper.review_comments}
                  </div>
                )}

                <div className="d-flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPaper(paper.id)}
                    className="btn btn-sm btn-outline-light text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Download Reviewed File
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLoadAnnotations(paper.id)}
                    className={`btn btn-sm text-xs font-semibold inline-flex items-center gap-1.5 ${
                      activeViewerPaperId === paper.id ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    <Eye className="size-3.5" />
                    {activeViewerPaperId === paper.id ? 'Hide Visual Comments' : 'View Supervisor Comments & Abstract'}
                  </button>
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

                <StudentPaperWorkflow
                  paper={paper}
                  token={localStorage.getItem('gimpa_access_token') || localStorage.getItem('murrs_access_token') || ''}
                  onUpdate={loadData}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Project Supervisor Performance Leaderboard */}
      {isHodOrCoordinator && (
        <div className="card border-0 gimpa-card p-4 space-y-4">
          <div className="d-flex align-items-center justify-content-between border-bottom border-slate-700/50 pb-3">
            <div>
              <h3 className="h5 font-bold text-white mb-1 flex items-center gap-2">
                <Award className="size-5 text-amber-400" />
                Project Supervisor Performance Leaderboard
              </h3>
              <p className="text-xs text-slate-400 mb-0">
                Department supervisors with total active reviews and sign-off completions.
              </p>
            </div>
            <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-pill text-xs font-semibold">
              Department Overview
            </span>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Supervisors</p>
                <h3 className="h2 font-extrabold text-white mb-0">{supervisorReviewSummary.length}</h3>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Reviews Done</p>
                <h3 className="h2 font-extrabold text-blue-400 mb-0">
                  {supervisorReviewSummary.reduce((sum, row) => sum + row.reviews_done, 0)}
                </h3>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="p-3 rounded-3 bg-slate-800/70 border border-slate-700/60 text-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Approvals</p>
                <h3 className="h2 font-extrabold text-emerald-400 mb-0">
                  {supervisorReviewSummary.reduce((sum, row) => sum + row.approvals_done, 0)}
                </h3>
              </div>
            </div>
          </div>

          {supervisorReviewSummary.length === 0 ? (
            <p className="text-xs text-slate-400 mb-0">
              No project supervisors were found for your department yet.
            </p>
          ) : (
            <div className="row g-2 pt-2">
              {supervisorReviewSummary.map((row) => (
                <div key={row.supervisor_user_id} className="col-12 col-md-6">
                  <div className="p-3 rounded-3 bg-slate-800/50 border border-slate-700/60 d-flex align-items-center justify-content-between gap-2 hover:border-blue-500/40 transition-all">
                    <div className="truncate">
                      <p className="text-xs font-bold text-white mb-0 truncate">
                        {row.supervisor_name || row.supervisor_email}
                      </p>
                      <p className="text-[11px] text-slate-400 mb-0 truncate">
                        {row.department || 'Computer Science & Information Systems'}
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                      <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-[11px] font-semibold">
                        Reviews: {row.reviews_done}
                      </span>
                      <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold">
                        Approved: {row.approvals_done}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
