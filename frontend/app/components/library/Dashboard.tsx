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
  apiGetSupervisorAdvisees,
  apiSupervisorMessageAdvisees,
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
  ApiSupervisorAdvisee,
  ApiSupervisorMessagePayload,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { DocumentCommentViewer } from './DocumentCommentViewer'
import { ReportExportModal } from './ReportExportModal'
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, HelpCircle, Trash2, Download, FileEdit, MessageSquare, FileSpreadsheet, Send, Mail, Users, Filter } from 'lucide-react'

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
              {paper.examiner_corrections && (
                <div className="border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-3.5 space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 m-0">
                    <MessageSquare className="size-4 text-amber-600" />
                    Examiner Evaluation Feedback & Required Corrections
                  </p>
                  <div className="p-3 rounded-md bg-background border border-amber-200 dark:border-amber-900/60 text-xs font-normal whitespace-pre-wrap leading-relaxed text-foreground">
                    {paper.examiner_corrections}
                  </div>
                </div>
              )}

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
  const isSupervisor =
    userRole === 'project_supervisor' ||
    userRole === 'lecturer' ||
    userRoles.includes('project_supervisor') ||
    userRoles.includes('lecturer') ||
    isAdmin ||
    isHodOrCoordinator

  const [stats, setStats] = useState<ApiPaperStats | null>(null)
  const [myPapers, setMyPapers] = useState<ApiPaper[]>([])
  const [supervisorReviewSummary, setSupervisorReviewSummary] = useState<ApiSupervisorReviewSummary[]>([])
  const [hasReviewedByPaper, setHasReviewedByPaper] = useState<Record<number, boolean>>({})
  const [annotationsByPaper, setAnnotationsByPaper] = useState<Record<number, ApiPaperAnnotation[]>>({})
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<ApiPipelineMetrics | null>(null)
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<keyof ApiPipelineMetrics>('phase1_proposals')

  // Pipeline Filter States
  const [pipelineProgram, setPipelineProgram] = useState<string>('ALL')
  const [pipelineDegreeLevel, setPipelineDegreeLevel] = useState<string>('ALL')

  // Advisee Broadcast Messaging States
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

  const loadPipelineFiltered = async (prog?: string, deg?: string) => {
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken || !showPipeline) return
    const pProg = prog !== undefined ? prog : pipelineProgram
    const pDeg = deg !== undefined ? deg : pipelineDegreeLevel
    try {
      const pipe = await apiGetPipelineMetrics(
        accessToken,
        pProg === 'ALL' ? undefined : pProg,
        pDeg === 'ALL' ? undefined : pDeg,
      )
      setPipelineMetrics(pipe)
    } catch {}
  }

  const loadAdvisees = async (prog?: string) => {
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken || !isSupervisor) return
    try {
      const targetProg = prog !== undefined ? prog : adviseeProgramFilter
      const res = await apiGetSupervisorAdvisees(accessToken, targetProg)
      setAdvisees(res.advisees || [])
      setAdviseePrograms(res.programs || [])
    } catch {}
  }

  const handleSendAdviseeBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setBroadcastError('Please provide both subject and message.')
      return
    }
    const accessToken = localStorage.getItem('murrs_access_token')
    if (!accessToken) return
    setSendingBroadcast(true)
    setBroadcastError('')
    setBroadcastSuccess('')
    try {
      const res = await apiSupervisorMessageAdvisees(accessToken, {
        subject: broadcastSubject.trim(),
        message: broadcastMessage.trim(),
        program_filter: adviseeProgramFilter === 'ALL' ? undefined : adviseeProgramFilter,
        include_email: broadcastIncludeEmail,
      })
      setBroadcastSuccess(
        `✓ Broadcast sent to ${res.recipients_count} advisee(s)! (${res.emails_queued} email(s) queued with portal link).`
      )
      setBroadcastSubject('')
      setBroadcastMessage('')
      setTimeout(() => {
        setAdviseeModalOpen(false)
        setBroadcastSuccess('')
      }, 3000)
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Failed to send broadcast.')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const loadData = () => setRefreshTrigger((prev) => prev + 1)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const accessToken = localStorage.getItem('murrs_access_token')
        const isUserScoped = userRole === 'student' || userRole === 'member' || (!isAdmin && !isHodOrCoordinator)
        const [s, mine, userItems, studentItems, supervisorSummaryItems, pipe] = await Promise.all([
          apiGetPaperStats(isUserScoped && user?.id ? user.id : undefined),
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

  const handleDownloadDepartmentReport = () => {
    if (!pipelineMetrics) return

    const rows: string[][] = [
      ['GIMPA THESIS SYSTEM - DEPARTMENT PIPELINE REPORT'],
      ['Generated Date', new Date().toLocaleString()],
      ['Department', user?.department || 'Departmental Overview'],
      [''],
      ['STUDENT THESIS RECORDS (PHASES 1-5)'],
      ['Index Number', 'Student Name', 'Program', 'Supervisor', 'Thesis Title', 'Phase Milestone', 'Current Status']
    ]

    const phaseKeys: (keyof ApiPipelineMetrics)[] = [
      'phase1_proposals',
      'phase2_allocation',
      'phase3_chapters',
      'phase4_examination',
      'phase5_signoff'
    ]

    phaseKeys.forEach((key) => {
      const phase = pipelineMetrics[key]
      if (phase && phase.students) {
        phase.students.forEach((st) => {
          rows.push([
            st.index_number || '',
            st.student_name || '',
            st.program || '',
            st.supervisor_name || 'Unassigned',
            `"${(st.title || '').replace(/"/g, '""')}"`,
            st.milestone_status || '',
            st.status || ''
          ])
        })
      }
    })

    rows.push([''])
    rows.push(['PROJECT SUPERVISOR PERFORMANCE SUMMARY'])
    rows.push(['Supervisor Name / Email', 'Assigned Students', 'Reviews Done', 'Approvals Done'])

    supervisorReviewSummary.forEach((sup) => {
      rows.push([
        sup.supervisor_name || sup.supervisor_email || '',
        String(sup.students_count || 0),
        String(sup.reviews_done || 0),
        String(sup.approvals_done || 0)
      ])
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Department_Thesis_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
  const [exportModalOpen, setExportModalOpen] = useState(false)

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

      {/* 4 Clean Stat Cards Row */}
      {(() => {
        const isUserScoped = userRole === 'student' || userRole === 'member' || (!isAdmin && !isHodOrCoordinator)
        
        const userTotalSubmissions = myPapers.length
        const userPendingCount = myPapers.filter(
          (p) => !['approved', 'phase5_published'].includes(p.status)
        ).length
        const userDownloads = myPapers.reduce((sum, p) => sum + (p.downloads || 0), 0)
        const userViews = myPapers.reduce((sum, p) => sum + (p.views || 0), 0)

        const totalSubs = isUserScoped ? userTotalSubmissions : (stats?.total_papers ?? 0)
        const pendingCount = isUserScoped ? userPendingCount : (stats?.pending_reviews ?? 0)
        const downloadsCount = isUserScoped ? userDownloads : (stats?.total_downloads ?? 0)
        const viewsCount = isUserScoped ? userViews : (stats?.total_views ?? 0)

        const labelSubmissions = isUserScoped ? 'My Submissions' : 'Total Submissions'
        const labelPending = isUserScoped ? 'In Review / Active' : 'Pending Reviews'
        const labelDownloads = isUserScoped ? 'My Paper Downloads' : 'Paper Downloads'
        const labelViews = isUserScoped ? 'My Paper Views' : 'Repository Views'

        const badgeSubmissions = isUserScoped ? `${userTotalSubmissions} Total` : '+12.5%'
        const badgePending = isUserScoped ? `${userPendingCount} Active` : '+8.2%'
        const badgeDownloads = isUserScoped ? 'Downloads' : '↘ 3.1%'
        const badgeViews = isUserScoped ? 'Views' : '+5.8%'

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Card 1 – Total Submissions */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 6px rgba(42,82,138,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText style={{ width: 20, height: 20, color: '#7c3aed' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 999, padding: '3px 9px' }}>{badgeSubmissions}</span>
              </div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{totalSubs}</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 500, color: '#64748b' }}>{labelSubmissions}</p>
            </div>

            {/* Card 2 – Pending Reviews */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 6px rgba(42,82,138,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ width: 20, height: 20, color: '#0284c7' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', borderRadius: 999, padding: '3px 9px' }}>{badgePending}</span>
              </div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{pendingCount}</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 500, color: '#64748b' }}>{labelPending}</p>
            </div>

            {/* Card 3 – Downloads */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 6px rgba(42,82,138,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Download style={{ width: 20, height: 20, color: '#d97706' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 999, padding: '3px 9px' }}>{badgeDownloads}</span>
              </div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{downloadsCount.toLocaleString()}</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 500, color: '#64748b' }}>{labelDownloads}</p>
            </div>

            {/* Card 4 – Repository Views */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 6px rgba(42,82,138,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 style={{ width: 20, height: 20, color: '#16a34a' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 999, padding: '3px 9px' }}>{badgeViews}</span>
              </div>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{viewsCount.toLocaleString()}</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, fontWeight: 500, color: '#64748b' }}>{labelViews}</p>
            </div>
          </div>
        )
      })()}

      {/* Main Content Layout */}
      <div className="space-y-6">
        {/* Primary Column (full width) */}
        <div className="space-y-6">

          {/* Supervisor Broadcast Messaging Launcher Card */}
          {isSupervisor && (
            <div className="ta-card p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 flex-shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                      Supervisor Advisee Broadcast Messaging
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Send in-app notifications and background emails with the portal login link to all your assigned students.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    void loadAdvisees()
                    setAdviseeModalOpen(true)
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  Broadcast to Advisees
                </Button>
              </div>
            </div>
          )}

          {/* Department Student Pipeline Section */}
          {showPipeline && (
            <div className="ta-card p-5 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b pb-4 gap-4" style={{borderColor:'var(--border-color)'}}>
                <div>
                  <h3 className="text-base font-bold m-0 flex items-center gap-2" style={{color:'var(--text-main)'}}>
                    Department Student Pipeline
                    <span className="badge-ta-purple text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                      Phases 1-5
                    </span>
                  </h3>
                  <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
                    Filter by specific academic degree programme to inspect milestone progress.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Programme Filter Dropdown */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600">Programme:</span>
                    <select
                      value={pipelineProgram}
                      onChange={(e) => {
                        const val = e.target.value
                        setPipelineProgram(val)
                        void loadPipelineFiltered(val, pipelineDegreeLevel)
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-purple-500/30 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-sm"
                    >
                      <option value="ALL">All Programmes</option>
                      {(pipelineMetrics?.available_programs || []).map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setExportModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Filter & Export Reports
                  </Button>
                  {isHodOrCoordinator && (
                    <Button
                      type="button"
                      onClick={handleDownloadDepartmentReport}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Quick Dept Report
                    </Button>
                  )}
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
                          className="btn-ta-purple text-xs font-semibold flex items-center gap-1.5"
                          onClick={() => window.open(`/editor?paperId=${paper.id}&type=comments`, '_blank')}
                        >
                          <FileEdit className="size-3.5" />
                          📝 Open in ONLYOFFICE (View Comments & Feedback)
                        </Button>

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
                          {activeViewerPaperId === paper.id ? 'Hide Comments & Abstract' : '💬 View Comments & Abstract'}
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
              <div className="flex items-center justify-between border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                <div>
                  <h3 className="text-base font-bold m-0" style={{color:'var(--text-main)'}}>Project Supervisor Performance</h3>
                  <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
                    Review and approval metrics across department supervisors.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleDownloadDepartmentReport}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Report
                </Button>
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
                      <span className="badge-ta-blue text-[10px] px-2 py-0.5 rounded-full font-bold">Students: {row.students_count ?? 0}</span>
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
      </div>


      <ReportExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        userDepartment={user?.department}
      />

      {/* Supervisor Advisee Broadcast Messaging Modal */}
      {adviseeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">Broadcast to Assigned Advisees</h3>
                  <p className="text-[11px] text-slate-500 m-0">Send instant in-app alerts and emails with the portal link.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdviseeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>

            {broadcastSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                {broadcastSuccess}
              </div>
            )}

            {broadcastError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {broadcastError}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Program Filter */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Filter Advisees by Programme</label>
                <select
                  value={adviseeProgramFilter}
                  onChange={(e) => {
                    const prog = e.target.value
                    setAdviseeProgramFilter(prog)
                    void loadAdvisees(prog)
                  }}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="ALL">All Advisees (Across all programmes)</option>
                  {adviseePrograms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-700 font-semibold mt-1">
                  ✓ Target audience: {advisees.length} student(s) currently assigned to you.
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Message Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 3 Draft Submission & Progress Review Reminder"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Message Content</label>
                <textarea
                  rows={4}
                  placeholder="Type your message to students here. They will receive this notification immediately in their thesis portal and via email..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              {/* Include Email Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="include-email-check"
                  checked={broadcastIncludeEmail}
                  onChange={(e) => setBroadcastIncludeEmail(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="include-email-check" className="text-slate-600 text-[11px] leading-tight cursor-pointer">
                  <strong>Send automated email notifications</strong> with login portal link (<code>https://thesis.manamatechnologies.com/login</code>) in the email footer.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                disabled={sendingBroadcast}
                onClick={() => setAdviseeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sendingBroadcast}
                onClick={handleSendAdviseeBroadcast}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingBroadcast ? 'Dispatching...' : `Send to ${advisees.length} Advisees`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
