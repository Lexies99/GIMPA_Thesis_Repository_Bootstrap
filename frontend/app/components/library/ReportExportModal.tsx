import { useEffect, useState, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import {
  FileSpreadsheet,
  Download,
  Filter,
  GraduationCap,
  Users,
  UserCheck,
  Loader2,
  Eye,
  RefreshCw,
  AlertCircle,
  Layers,
} from 'lucide-react'
import {
  apiExportAcademicReport,
  apiGetReportPreview,
  apiListUsers,
  type ApiUser,
  type ApiReportPreviewRow,
} from '../../lib/api'

interface ReportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userDepartment?: string | null
}

const ACCESS_TOKEN_KEY = 'murrs_access_token'

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const DEFAULT_PROGRAMMES = [
  'MSc Information Technology and Law',
  'MSc. Digital Forensics and Cybersecurity',
  'MSc. Management Information Systems',
  'BSc. Computer Science',
  'BSc. Information Technology',
  'Master of Science in Information Technology',
  'Business Administration',
  'Public Administration',
]

export function ReportExportModal({ open, onOpenChange }: ReportExportModalProps) {
  const [degreeLevel, setDegreeLevel] = useState<string>('all')
  const [program, setProgram] = useState<string>('all')
  const [department, setDepartment] = useState<string>('all')
  const [lecturerId, setLecturerId] = useState<string>('all')
  const [studentSearch, setStudentSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [lecturers, setLecturers] = useState<ApiUser[]>([])
  const [students, setStudents] = useState<ApiUser[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')

  const [previewRows, setPreviewRows] = useState<ApiReportPreviewRow[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewLoaded, setPreviewLoaded] = useState(false)

  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return

    apiListUsers(token)
      .then((users) => {
        const lecs = users.filter((u) => {
          const roles = (u.roles || [u.role]).map((r) => String(r).toLowerCase())
          return roles.some((r) => ['lecturer', 'hod', 'project_coordinator', 'dean'].includes(r))
        })
        const studs = users.filter((u) => {
          const roles = (u.roles || [u.role]).map((r) => String(r).toLowerCase())
          return roles.includes('student') || roles.includes('member')
        })
        setLecturers(lecs)
        setStudents(studs)
      })
      .catch(() => {})
  }, [open])

  const availablePrograms = useMemo(() => {
    const progs = new Set<string>(DEFAULT_PROGRAMMES)
    students.forEach((s) => {
      if (s.program && s.program.trim()) {
        progs.add(s.program.trim())
      }
    })
    return Array.from(progs).sort()
  }, [students])

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true
    const term = studentSearch.toLowerCase()
    return (
      (s.full_name || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      (s.school_id || '').toLowerCase().includes(term)
    )
  })

  const handlePreview = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    setPreviewError('')
    setPreviewing(true)
    setPreviewLoaded(false)
    try {
      const parsedLecId = lecturerId !== 'all' ? Number(lecturerId) : undefined
      const parsedStuId = selectedStudentId !== 'all' ? Number(selectedStudentId) : undefined
      const rows = await apiGetReportPreview(
        {
          degree_level: degreeLevel !== 'all' ? degreeLevel : undefined,
          program: program !== 'all' ? program : undefined,
          department: department !== 'all' ? department : undefined,
          lecturer_id: parsedLecId,
          student_id: parsedStuId,
          status_filter: statusFilter !== 'all' ? statusFilter : undefined,
        },
        token,
      )
      const mapped: ApiReportPreviewRow[] = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        index_number: r.student_id || '-',
        student_name: r.student_name || '-',
        program: r.discipline || '-',
        degree_level: r.degree_level || '-',
        supervisor: r.supervisor || '-',
        thesis_title: r.title || '-',
        status: r.status || '-',
        department: r.discipline || '-',
        submission_date: r.created_at || '-',
        examiner_internal: r.internal_examiner,
        examiner_external: r.external_examiner,
        final_grade: r.grade !== 'N/A' ? `${r.final_mark ?? ''} — ${r.grade ?? ''}` : undefined,
      }))
      setPreviewRows(mapped)
      setPreviewLoaded(true)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setPreviewing(false)
    }
  }, [degreeLevel, program, department, lecturerId, selectedStudentId, statusFilter])

  useEffect(() => {
    if (open) {
      void handlePreview()
    }
  }, [open, degreeLevel, program, department, lecturerId, selectedStudentId, statusFilter, handlePreview])

  const handleDownload = async (format: 'xlsx' | 'csv') => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return
    setError('')
    setSuccess('')
    setDownloading(format)

    try {
      const parsedLecId = lecturerId !== 'all' ? Number(lecturerId) : undefined
      const parsedStuId = selectedStudentId !== 'all' ? Number(selectedStudentId) : undefined

      const { blob, filename } = await apiExportAcademicReport(
        {
          degree_level: degreeLevel !== 'all' ? degreeLevel : undefined,
          program: program !== 'all' ? program : undefined,
          department: department !== 'all' ? department : undefined,
          lecturer_id: parsedLecId,
          student_id: parsedStuId,
          status_filter: statusFilter !== 'all' ? statusFilter : undefined,
          format,
        },
        token,
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setSuccess(`Successfully downloaded ${filename}`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    } finally {
      setDownloading(null)
    }
  }

  const handleResetFilters = () => {
    setDegreeLevel('all')
    setProgram('all')
    setDepartment('all')
    setLecturerId('all')
    setSelectedStudentId('all')
    setStudentSearch('')
    setStatusFilter('all')
    setError('')
    setSuccess('')
    setPreviewRows([])
    setPreviewLoaded(false)
    setPreviewError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Academic Evaluation & Reports Hub</DialogTitle>
          <DialogDescription>
            Filter and preview student thesis assessments by programme, then export as Excel or CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {error && (
            <div className="p-3 rounded-lg bg-[#fbeae8] text-[12px] text-[#c93b2b] font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[#e6eedc] text-[12px] text-[#3b7a57] font-semibold">
              {success}
            </div>
          )}

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-xl border border-[#eaece4] bg-[#fafbf8]">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-[#5a6552]" />
                Academic Programme
              </Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programmes" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Programmes (All Disciplines)</SelectItem>
                  {availablePrograms.map((prog) => (
                    <SelectItem key={prog} value={prog}>
                      {prog}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="size-3.5 text-[#5a6552]" />
                Degree Level / Track
              </Label>
              <Select value={degreeLevel} onValueChange={setDegreeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Degree Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Degree Levels</SelectItem>
                  <SelectItem value="bsc">BSc (Bachelor of Science)</SelectItem>
                  <SelectItem value="ba">BA (Bachelor of Arts)</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                  <SelectItem value="msc">MSc (Master of Science)</SelectItem>
                  <SelectItem value="mba">MBA (Master of Business Administration)</SelectItem>
                  <SelectItem value="ma">MA (Master of Arts)</SelectItem>
                  <SelectItem value="meng">MEng (Master of Engineering)</SelectItem>
                  <SelectItem value="mphil">MPhil (Master of Philosophy)</SelectItem>
                  <SelectItem value="phd">PhD / Doctorate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-[#5a6552]" />
                Workflow Phase / Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workflow Stages</SelectItem>
                  <SelectItem value="phase1_proposal_submitted">Phase 1: Topic Submitted</SelectItem>
                  <SelectItem value="phase2_proposal_submitted">
                    Phase 2: Supervisor Allocated
                  </SelectItem>
                  <SelectItem value="phase2_pending_supervisor">
                    Phase 2: Proposal In Review
                  </SelectItem>
                  <SelectItem value="phase3_chapters">Phase 3: Chapter Steps Progress</SelectItem>
                  <SelectItem value="phase4_marking">Phase 4: Under Examination</SelectItem>
                  <SelectItem value="phase5_corrections">Phase 5: Post-Exam Corrections</SelectItem>
                  <SelectItem value="phase5_pending_coordinator">Phase 5: Final Sign-off</SelectItem>
                  <SelectItem value="phase5_approved_for_library">
                    Phase 5: Approved for Library
                  </SelectItem>
                  <SelectItem value="approved">Phase 5: Published in Catalog</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-[#5a6552]" />
                Lecturer / Supervisor
              </Label>
              <Select value={lecturerId} onValueChange={setLecturerId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Lecturers" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Lecturers & Supervisors</SelectItem>
                  {lecturers.map((lec) => (
                    <SelectItem key={lec.id} value={String(lec.id)}>
                      {lec.full_name} ({lec.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-[#5a6552]" />
                  Individual Student Filter (Optional)
                </span>
                {selectedStudentId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId('all')}
                    className="text-[11px] text-[#3b7a57] hover:underline cursor-pointer"
                  >
                    Clear Student Selection
                  </button>
                )}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Search student by name or index..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose specific student" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Students (Batch Report)</SelectItem>
                    {filteredStudents.slice(0, 50).map((stu) => (
                      <SelectItem key={stu.id} value={String(stu.id)}>
                        {stu.full_name} ({stu.school_id || stu.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-[#6e746b] font-medium">Applied Filters:</span>
            {program !== 'all' && <Badge variant="default">Programme: {program}</Badge>}
            <Badge variant="outline">Degree: {degreeLevel.toUpperCase()}</Badge>
            <Badge variant="outline">Stage: {statusFilter.replace(/_/g, ' ')}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="ml-auto text-[12px]"
            >
              Reset Filters
            </Button>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl border border-[#eaece4] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#fafbf8] border-b border-[#eaece4]">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-[#5a6552]" />
                <span className="text-[13px] font-bold text-[#1a1d1a]">
                  Data Preview
                  {previewLoaded && (
                    <span className="ml-2 text-[#3b7a57] font-bold">
                      — {previewRows.length} record{previewRows.length !== 1 ? 's' : ''} found
                    </span>
                  )}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handlePreview()}
                disabled={previewing}
              >
                {previewing ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="size-3.5 mr-1.5" />
                )}
                Refresh Preview
              </Button>
            </div>

            <div className="min-h-[120px] max-h-64 overflow-auto bg-[#ffffff]">
              {previewError && (
                <div className="flex items-center gap-2 p-4 text-[12px] text-[#c93b2b]">
                  <AlertCircle className="size-4 shrink-0" />
                  {previewError}
                </div>
              )}
              {previewing && (
                <div className="flex items-center justify-center h-28 gap-2 text-[13px] text-[#6e746b]">
                  <Loader2 className="size-4 animate-spin" />
                  Fetching report data...
                </div>
              )}
              {previewLoaded && !previewing && previewRows.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-[13px] text-[#6e746b] gap-1">
                  <span>No records match the selected filters.</span>
                </div>
              )}
              {previewLoaded && !previewing && previewRows.length > 0 && (
                <table className="fp-table">
                  <thead>
                    <tr>
                      {[
                        '#',
                        'Index No.',
                        'Student Name',
                        'Programme',
                        'Degree',
                        'Supervisor',
                        'Status',
                        'Grade',
                        'Submitted',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        <td className="text-[#6e746b]">{i + 1}</td>
                        <td className="font-mono text-[12px]">{row.index_number}</td>
                        <td className="font-semibold text-[#1a1d1a]">{row.student_name}</td>
                        <td>{row.program}</td>
                        <td>
                          <Badge variant="outline">{row.degree_level}</Badge>
                        </td>
                        <td>{row.supervisor}</td>
                        <td>
                          <Badge variant="default">{statusLabel(row.status)}</Badge>
                        </td>
                        <td className="font-bold text-[#3b7a57]">{row.final_grade || '—'}</td>
                        <td className="text-[#6e746b]">{row.submission_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-[#eaece4]">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownload('csv')}
              disabled={downloading !== null}
            >
              <Download className="size-3.5 mr-1.5" />
              Export CSV (.csv)
            </Button>
            <Button
              onClick={() => void handleDownload('xlsx')}
              disabled={downloading !== null}
            >
              <FileSpreadsheet className="size-3.5 mr-1.5" />
              Download Master Excel Report (.xlsx)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
