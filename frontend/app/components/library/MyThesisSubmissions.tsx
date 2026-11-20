import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAuth } from '../../context/AuthContext'
import {
  apiGetMyPapers,
  apiStudentUpdateChecklist,
  apiUploadCombinedThesis,
  apiUploadCorrections,
  apiSubmitProposal,
  apiSubmitStep,
  type ApiPaper,
} from '../../lib/api'
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  ExternalLink,
  MessageSquare,
  GraduationCap,
  Award,
  RefreshCw,
  Upload,
} from 'lucide-react'

export const COMPLETED_THESIS_STATUSES = new Set([
  'approved',
  'published',
  'phase5_published',
  'phase5_certified',
  'phase5_approved_for_library',
  'approved_for_library',
])

export function isSubmissionCompleted(status: string): boolean {
  return COMPLETED_THESIS_STATUSES.has((status || '').trim().toLowerCase())
}

export function isSubmissionRejected(status: string): boolean {
  return (status || '').trim().toLowerCase() === 'rejected'
}

export function isSubmissionActive(status: string): boolean {
  const s = (status || '').trim().toLowerCase()
  return !isSubmissionCompleted(s) && !isSubmissionRejected(s)
}

function getPhaseRank(status: string): number {
  const s = (status || '').toLowerCase()
  if (s.startsWith('phase5')) return 5
  if (s.startsWith('phase4')) return 4
  if (s.startsWith('phase3')) return 3
  if (s.startsWith('phase2')) return 2
  if (s.startsWith('phase1')) return 1
  return 1
}

function getStatusDetails(status: string) {
  switch (status) {
    case 'phase1_proposal_submitted':
      return {
        phase: 1,
        title: 'Phase 1: Thesis Topic Submitted',
        desc: 'Your thesis topic has been submitted and is awaiting review and supervisor assignment by the Head of Department (HOD) / Project Coordinator.',
      }
    case 'phase1_topic_accepted':
    case 'phase2_pending_supervisor':
    case 'phase2_supervisor_assigned':
      return {
        phase: 2,
        title: 'Phase 2: Topic Accepted & Supervisor Allocated',
        desc: 'Your thesis topic is approved and a Project Supervisor has been assigned. Upload your full Project Proposal document below for supervisor review.',
      }
    case 'phase2_proposal_submitted':
      return {
        phase: 2,
        title: 'Phase 2: Project Proposal Awaiting Supervisor Review',
        desc: 'Your Project Proposal has been uploaded and is awaiting your supervisor’s decision.',
      }
    case 'phase2_proposal_accepted':
    case 'phase3_chapters':
    case 'phase3_steps_in_progress':
    case 'phase3_chapters_in_progress':
      return {
        phase: 3,
        title: 'Phase 3: Chapter Writing & Supervisor Feedback',
        desc: 'Work directly with your supervisor using ONLYOFFICE in-browser annotations. Upload chapter steps or tick off chapters as you complete them.',
      }
    case 'phase3_combined_submitted':
    case 'phase3_all_steps_approved':
      return {
        phase: 3,
        title: 'Phase 3: Complete Thesis Submitted for Examination Readiness',
        desc: 'Your chapters have been submitted and are undergoing Turnitin verification and final supervisor sign-off.',
      }
    case 'phase4_pending_examiners':
    case 'phase4_marking':
    case 'phase4_examination':
    case 'phase4_examination_completed':
      return {
        phase: 4,
        title: 'Phase 4: Defense & Examiner Assessment',
        desc: 'Your thesis is currently under evaluation by assigned Examiners.',
      }
    case 'phase5_corrections':
    case 'revision':
      return {
        phase: 5,
        title: 'Phase 5: Post-Defense Corrections Required',
        desc: 'Please implement the required post-defense corrections in ONLYOFFICE or upload your revised thesis file below for supervisor clearance.',
      }
    case 'phase5_pending_supervisor':
    case 'phase5_pending_coordinator':
    case 'phase5_pending_hod':
    case 'phase5_pending_hod_and_coordinator':
      return {
        phase: 5,
        title: 'Phase 5: Final Sign-off in Progress (Supervisor / Coordinator / HOD)',
        desc: 'Your corrected thesis has been submitted and is undergoing final institutional sign-off before library certification.',
      }
    case 'phase5_approved_for_library':
    case 'approved_for_library':
    case 'phase5_certified':
    case 'phase5_published':
    case 'approved':
    case 'published':
      return {
        phase: 5,
        title: 'Phase 5: Certified & Published in GIMPA Repository',
        desc: 'Congratulations! This thesis submission is complete and permanently archived. You may now start a new thesis submission if you advance to a new degree program.',
      }
    default:
      return {
        phase: getPhaseRank(status),
        title: status.replace(/_/g, ' ').toUpperCase(),
        desc: 'Active workflow milestone in the GIMPA repository pipeline.',
      }
  }
}

interface ActiveSubmissionCardProps {
  paper: ApiPaper
  token: string
  onUpdate: () => void
}

function ActiveSubmissionCard({ paper, token, onUpdate }: ActiveSubmissionCardProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [combinedFile, setCombinedFile] = useState<File | null>(null)
  const [proposalFile, setProposalFile] = useState<File | null>(null)
  const [stepTitle, setStepTitle] = useState('')
  const [stepNumber, setStepNumber] = useState<number>((paper.steps?.length || 0) + 1)
  const [stepFile, setStepFile] = useState<File | null>(null)

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
    setStepNumber((paper.steps?.length || 0) + 1)
  }, [
    paper.ch1_student_done,
    paper.ch2_student_done,
    paper.ch3_student_done,
    paper.ch4_student_done,
    paper.ch5_student_done,
    paper.steps?.length,
  ])

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

  const handleProposalUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposalFile) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiSubmitProposal(paper.id, proposalFile, token)
      setSuccess('Project Proposal uploaded successfully! Sent to your supervisor for review.')
      setProposalFile(null)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proposal upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStepUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stepFile) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiSubmitStep(
        paper.id,
        stepNumber,
        stepTitle.trim() || `Chapter ${stepNumber}`,
        stepFile,
        token,
      )
      setSuccess(`Chapter / Step ${stepNumber} uploaded successfully!`)
      setStepFile(null)
      setStepTitle('')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Step upload failed')
    } finally {
      setSubmitting(false)
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
    const activeToken =
      token ||
      localStorage.getItem('gimpa_access_token') ||
      localStorage.getItem('murrs_access_token') ||
      ''
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { apiSubmitInSystemCorrections } = await import('../../lib/api')
      await apiSubmitInSystemCorrections(paper.id, activeToken)
      setSuccess('In-system ONLYOFFICE corrections submitted! Awaiting supervisor clearance.')
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
    const activeToken =
      token ||
      localStorage.getItem('gimpa_access_token') ||
      localStorage.getItem('murrs_access_token') ||
      ''
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await apiUploadCorrections(paper.id, file, activeToken)
      setSuccess('Revised thesis uploaded successfully. Awaiting supervisor clearance.')
      setFile(null)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const details = getStatusDetails(paper.status)
  const phases = [
    { num: 1, label: 'Phase 1: Topic' },
    { num: 2, label: 'Phase 2: Proposal' },
    { num: 3, label: 'Phase 3: Chapters' },
    { num: 4, label: 'Phase 4: Defense' },
    { num: 5, label: 'Phase 5: Certified' },
  ]

  return (
    <div className="fp-card space-y-5">
      {/* Header Row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="secondary">PAPER #{paper.id}</Badge>
            <Badge variant="default">{paper.degree_level || 'Academic Degree'}</Badge>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {paper.discipline || 'Computer Science'} · Mode: {paper.work_mode || 'Individual'}
            </span>
          </div>
          <h3 className="text-[18px] font-bold m-0" style={{ color: 'var(--text-main)' }}>
            {paper.title}
          </h3>
        </div>
        <Badge variant="default" className="self-start sm:self-center">
          {paper.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* 5-Phase Visual Milestone Tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {phases.map((p) => {
          const isCurrent = details.phase === p.num
          const isDone = details.phase > p.num || isSubmissionCompleted(paper.status)
          return (
            <div
              key={p.num}
              className="px-3 py-2 rounded-lg border text-[12px] font-semibold flex items-center gap-2"
              style={{
                backgroundColor: isCurrent
                  ? 'var(--fp-olive)'
                  : isDone
                  ? 'var(--fp-sage)'
                  : 'var(--bg-main)',
                borderColor: isCurrent ? 'var(--fp-olive)' : 'var(--border-color)',
                color: isCurrent
                  ? '#ffffff'
                  : isDone
                  ? 'var(--fp-sage-text)'
                  : 'var(--text-muted)',
              }}
            >
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span className="truncate">{p.label}</span>
            </div>
          )
        })}
      </div>

      {/* Current Milestone Banner */}
      <div
        className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#dce7d0] flex items-center justify-center text-[#1a1d1a] shrink-0">
            <FileText className="size-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[14px] font-bold m-0" style={{ color: 'var(--text-main)' }}>
              {details.title}
            </h4>
            <p className="text-[13px] leading-relaxed m-0" style={{ color: 'var(--text-muted)' }}>
              {details.desc}
            </p>
          </div>
        </div>

        {/* ONLYOFFICE Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/editor?paperId=${paper.id}&type=paper`, '_blank')}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            Open in ONLYOFFICE
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/editor?paperId=${paper.id}&type=comments`, '_blank')}
          >
            <MessageSquare className="size-3.5 mr-1.5" />
            View Feedback
          </Button>
        </div>
      </div>

      {/* Supervisor / Examiner Feedback Box (if present) */}
      {(paper.review_comments || paper.examiner_corrections) && (
        <div
          className="p-4 rounded-xl border space-y-1.5 text-[13px]"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
        >
          <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
            <MessageSquare className="size-4" />
            <span>Supervisor & Examiner Remarks</span>
          </div>
          {paper.review_comments && (
            <p className="m-0 whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
              {paper.review_comments}
            </p>
          )}
          {paper.examiner_corrections && (
            <p className="m-0 whitespace-pre-wrap pt-1" style={{ color: 'var(--text-main)' }}>
              {paper.examiner_corrections}
            </p>
          )}
        </div>
      )}

      {/* Phase 2: Project Proposal Document Upload */}
      {(paper.status === 'phase1_topic_accepted' ||
        paper.status === 'phase2_pending_supervisor' ||
        paper.status === 'phase2_supervisor_assigned') && (
        <div
          className="border rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-[13.5px] font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Upload className="size-4" /> Upload Phase 2 Project Proposal (.docx / .pdf)
          </p>
          <form onSubmit={handleProposalUpload} className="flex flex-col sm:flex-row gap-2.5 items-center">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setProposalFile(e.target.files?.[0] || null)}
              className="h-10 text-xs"
              required
            />
            <Button type="submit" size="sm" disabled={submitting || !proposalFile}>
              {submitting ? 'Uploading...' : 'Submit Project Proposal'}
            </Button>
          </form>
        </div>
      )}

      {/* Phase 3: Chapter Checklist & Step Upload */}
      {(paper.status === 'phase2_proposal_accepted' ||
        paper.status === 'phase3_chapters' ||
        paper.status === 'phase3_steps_in_progress' ||
        paper.status === 'phase3_chapters_in_progress') && (
        <div
          className="border rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-[13.5px] font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
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
              <label
                key={ch.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <input
                  type="checkbox"
                  checked={ch.val}
                  onChange={(e) => void handleCheckboxChange(ch.id, e.target.checked)}
                  className="rounded accent-[#5a6552] h-4 w-4"
                />
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-main)' }}>
                  {ch.label}
                </span>
              </label>
            ))}
          </div>

          {/* Upload Individual Chapter Step */}
          <div className="pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-[12.5px] font-semibold m-0" style={{ color: 'var(--text-main)' }}>
              Upload Chapter / Step Draft for Supervisor Review
            </p>
            <form onSubmit={handleStepUpload} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
              <Input
                type="number"
                min={1}
                max={10}
                value={stepNumber}
                onChange={(e) => setStepNumber(Number(e.target.value) || 1)}
                placeholder="Step #"
                className="h-10 text-xs"
              />
              <Input
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                placeholder="e.g. Chapter 1: Introduction"
                className="h-10 text-xs"
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setStepFile(e.target.files?.[0] || null)}
                className="h-10 text-xs"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !stepFile}>
                {submitting ? 'Uploading...' : `Upload Step ${stepNumber}`}
              </Button>
            </form>
          </div>

          {/* Submit Complete Combined Thesis */}
          <div
            className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <p className="text-[13px] m-0" style={{ color: 'var(--text-muted)' }}>
              Ready to submit all chapters (1–5) as a combined thesis for defense examination?
            </p>
            <form onSubmit={handleCombinedSubmit} className="flex gap-2.5 items-center">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCombinedFile(e.target.files?.[0] || null)}
                className="h-10 text-xs"
                required
              />
              <Button type="submit" size="sm" disabled={submitting || !combinedFile}>
                {submitting ? 'Uploading...' : 'Submit Complete Thesis'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Phase 5: Post-Defense Corrections */}
      {(paper.status === 'phase5_corrections' || paper.status === 'revision') && (
        <div
          className="border rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-[13px] font-bold text-[#c93b2b] flex items-center gap-1.5 m-0">
            <AlertCircle className="size-4" /> Submit Revised Thesis
          </p>
          <form onSubmit={handleUploadCorrections} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-center">
              <Input
                id={`file-corrections-${paper.id}`}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFile(e.target.files?.[0] || null)
                }
                className="h-10 text-xs"
              />
              <Button type="submit" size="sm" disabled={submitting} className="shrink-0">
                {submitting
                  ? 'Submitting...'
                  : file
                  ? 'Submit Uploaded File'
                  : 'Submit In-System Corrections'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="text-xs text-[#c93b2b] font-medium m-0">{error}</p>}
      {success && <p className="text-xs text-[#3b7a57] font-medium m-0">{success}</p>}
    </div>
  )
}

export function MyThesisSubmissions() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [papers, setPapers] = useState<ApiPaper[]>([])
  const [loading, setLoading] = useState(true)

  const accessToken =
    typeof window !== 'undefined'
      ? localStorage.getItem('murrs_access_token') ||
        localStorage.getItem('gimpa_access_token') ||
        ''
      : ''

  const loadSubmissions = async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiGetMyPapers(accessToken)
      setPapers(list)
    } catch {
      setPapers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSubmissions()
  }, [])

  // Partition into active (in-progress) vs completed/archived prior degree submissions
  const activeCandidates = papers
    .filter((p) => isSubmissionActive(p.status))
    .sort((a, b) => getPhaseRank(b.status) - getPhaseRank(a.status) || b.id - a.id)

  // Enforce 1 Active Submission at a time: only the primary active submission is shown as active
  const currentActiveSubmission = activeCandidates[0] || null
  const completedSubmissions = papers.filter((p) => isSubmissionCompleted(p.status))

  return (
    <div className="space-y-8">
      {/* Top FinPlanner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight m-0" style={{ color: 'var(--text-main)' }}>
            My Thesis Submissions
          </h1>
          <p className="text-[14px] mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
            Manage your active thesis project across all 5 phases. Students work on{' '}
            <strong>1 submission at a time</strong> until completion before starting a new degree submission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm" variant="outline" onClick={() => void loadSubmissions()} disabled={loading}>
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {currentActiveSubmission ? (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[12.5px] font-semibold"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-muted)',
              }}
              title="Complete your current active submission before starting another degree thesis"
            >
              <Lock className="size-3.5" />
              <span>1 Active Submission in Progress (Locked for new topic)</span>
            </div>
          ) : (
            <Button onClick={() => navigate('/submit-proposal')}>
              <Plus className="size-4 mr-1.5" />
              {completedSubmissions.length > 0
                ? 'Start Next Degree Submission (Master’s / PhD)'
                : 'Submit Thesis Topic'}
            </Button>
          )}
        </div>
      </div>

      {/* Institutional 1-Submission-at-a-Time Policy Notice */}
      <div
        className="fp-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-start gap-3.5">
          <div className="fp-avatar">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold m-0" style={{ color: 'var(--text-main)' }}>
              Sequential Degree Progression Policy (1 Active Submission at a Time)
            </h3>
            <p className="text-[13px] mt-0.5 m-0 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {currentActiveSubmission
                ? `You are currently working on "${currentActiveSubmission.title}" (Paper #${currentActiveSubmission.id}). Once this thesis completes Phase 5 certification, you will be automatically unlocked to start a new submission for your next academic degree program (e.g., progressing from Undergraduate to Master's or PhD under ${user?.name || 'your account'}).`
                : completedSubmissions.length > 0
                ? `Your previous degree thesis (${completedSubmissions[0].title}) is complete and certified! You are now unlocked to start your next degree submission (e.g., Master's or PhD).`
                : 'You do not have an active submission in progress. Click "Submit Thesis Topic" to begin Phase 1.'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fp-card py-12 text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Loading your thesis submission workspace...
        </div>
      ) : (
        <>
          {/* SECTION 1: CURRENT ACTIVE SUBMISSION (Strictly 1 at a time) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold m-0" style={{ color: 'var(--text-main)' }}>
                Current Active Submission
              </h2>
              <Badge variant={currentActiveSubmission ? 'secondary' : 'outline'}>
                {currentActiveSubmission ? '1 of 1 Active Slot Used' : '0 of 1 Active Slot Used'}
              </Badge>
            </div>

            {currentActiveSubmission ? (
              <ActiveSubmissionCard
                paper={currentActiveSubmission}
                token={accessToken}
                onUpdate={() => void loadSubmissions()}
              />
            ) : (
              <div className="fp-card py-12 text-center space-y-4">
                <p className="text-[14px] m-0" style={{ color: 'var(--text-muted)' }}>
                  You have no active in-progress thesis submission right now.
                </p>
                <Button onClick={() => navigate('/submit-proposal')}>
                  <Plus className="size-4 mr-1.5" />
                  {completedSubmissions.length > 0
                    ? 'Start Next Degree Thesis Submission'
                    : 'Submit Your First Thesis Topic'}
                </Button>
              </div>
            )}
          </div>

          {/* SECTION 2: COMPLETED PRIOR DEGREE SUBMISSIONS (Undergraduate -> Master's -> PhD History) */}
          {completedSubmissions.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-[18px] font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Award className="size-5 text-[#3b7a57]" />
                Completed Prior Degree Submissions ({completedSubmissions.length})
              </h2>

              <div className="space-y-3">
                {completedSubmissions.map((paper) => (
                  <div key={paper.id} className="fp-entity-row flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="fp-avatar">
                        <Award className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default">Certified & Completed</Badge>
                          <Badge variant="outline">{paper.degree_level || 'Completed Degree'}</Badge>
                        </div>
                        <div className="text-[15px] font-bold" style={{ color: 'var(--text-main)' }}>
                          {paper.title}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          Paper #{paper.id} · {paper.discipline} · Year: {paper.year}
                          {paper.doi ? ` · DOI: ${paper.doi}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/paper/${paper.id}`)}
                      >
                        View in Catalog
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
