import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import {
  FileSpreadsheet, Download, Filter, GraduationCap, Users, UserCheck, BookOpen,
  Loader2, Eye, RefreshCw, AlertCircle,
} from 'lucide-react'
import { apiExportAcademicReport, apiGetReportPreview, apiListUsers, type ApiUser, type ApiReportPreviewRow } from '../../lib/api'

interface ReportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userDepartment?: string | null
}

const ACCESS_TOKEN_KEY = 'murrs_access_token'

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ReportExportModal({ open, onOpenChange, userDepartment }: ReportExportModalProps) {
  const [degreeLevel, setDegreeLevel] = useState<string>('all')
  const [department, setDepartment] = useState<string>(userDepartment || 'all')
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
      .catch((err) => {
        console.error('Failed to load users for filter:', err)
      })
  }, [open])

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
          department: department !== 'all' ? department : undefined,
          lecturer_id: parsedLecId,
          student_id: parsedStuId,
          status_filter: statusFilter !== 'all' ? statusFilter : undefined,
        },
        token,
      )
      // The backend returns the same shape as report_rows (list of dicts)
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
  }, [degreeLevel, department, lecturerId, selectedStudentId, statusFilter])

  // Automatically load preview on modal open and whenever filters change
  useEffect(() => {
    if (open) {
      void handlePreview()
    }
  }, [open, degreeLevel, department, lecturerId, selectedStudentId, statusFilter, handlePreview])

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

      setSuccess(`✓ Successfully downloaded ${filename}!`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    } finally {
      setDownloading(null)
    }
  }

  const handleResetFilters = () => {
    setDegreeLevel('all')
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
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <FileSpreadsheet className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Academic Evaluation &amp; Reports Hub</DialogTitle>
              <DialogDescription className="text-xs">
                Filter and preview student thesis assessments, then export as Excel or CSV.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {success}
            </div>
          )}

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/30">
            {/* Filter 1: Degree Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <GraduationCap className="size-3.5 text-primary" />
                Degree Level / Certification
              </Label>
              <Select value={degreeLevel} onValueChange={setDegreeLevel}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="All Degree Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🎓 All Degree Levels (All Tracks)</SelectItem>
                  <SelectItem value="bsc">📘 BSc (Bachelor of Science)</SelectItem>
                  <SelectItem value="ba">📘 BA (Bachelor of Arts)</SelectItem>
                  <SelectItem value="diploma">📘 Diploma</SelectItem>
                  <SelectItem value="msc">📙 MSc (Master of Science)</SelectItem>
                  <SelectItem value="mba">📙 MBA (Master of Business Administration)</SelectItem>
                  <SelectItem value="ma">📙 MA (Master of Arts)</SelectItem>
                  <SelectItem value="meng">📙 MEng (Master of Engineering)</SelectItem>
                  <SelectItem value="mphil">📗 MPhil (Master of Philosophy)</SelectItem>
                  <SelectItem value="phd">📕 PhD / Doctorate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Workflow Stage / Phase */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Filter className="size-3.5 text-primary" />
                Workflow Phase / Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 All Workflow Stages</SelectItem>
                  <SelectItem value="phase1_proposal_submitted">Phase 1: Topic Submitted</SelectItem>
                  <SelectItem value="phase2_pending_supervisor">Phase 2: Proposal In Review</SelectItem>
                  <SelectItem value="phase3_chapters">Phase 2: Chapter Steps Progress</SelectItem>
                  <SelectItem value="phase4_marking">Phase 3: Under Examination (Marking)</SelectItem>
                  <SelectItem value="phase5_corrections">Phase 4: Post-Exam Corrections</SelectItem>
                  <SelectItem value="phase5_pending_coordinator">Phase 4: Final Sign-off</SelectItem>
                  <SelectItem value="phase5_approved_for_library">Phase 5: Approved for Library</SelectItem>
                  <SelectItem value="approved">Phase 5: Published in Catalog</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Lecturer / Supervisor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <UserCheck className="size-3.5 text-primary" />
                Lecturer / Supervisor / Examiner
              </Label>
              <Select value={lecturerId} onValueChange={setLecturerId}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="All Lecturers" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">👥 All Lecturers &amp; Supervisors</SelectItem>
                  {lecturers.map((lec) => (
                    <SelectItem key={lec.id} value={String(lec.id)}>
                      {lec.full_name} ({lec.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Department / Program */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <BookOpen className="size-3.5 text-primary" />
                Department / Discipline
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Departments</SelectItem>
                  <SelectItem value="computer science">Computer Science &amp; Information Systems</SelectItem>
                  <SelectItem value="business">Business Administration</SelectItem>
                  <SelectItem value="public administration">Public Administration</SelectItem>
                  <SelectItem value="technology">School of Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 5: Individual Student Selector */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold flex items-center justify-between text-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Individual Student Filter (Optional)
                </span>
                {selectedStudentId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId('all')}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Clear Student Selection
                  </button>
                )}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Search student by name or index..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="text-xs h-9 bg-background"
                />
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="text-xs h-9 bg-background">
                    <SelectValue placeholder="Choose specific student" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">🎓 All Students (Batch Report)</SelectItem>
                    {filteredStudents.slice(0, 30).map((stu) => (
                      <SelectItem key={stu.id} value={String(stu.id)}>
                        {stu.full_name} ({stu.school_id || stu.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filter Summary Tags */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Applied Filters:</span>
            <Badge variant="outline" className="text-[11px] font-normal">
              Degree: <strong className="ml-1 uppercase">{degreeLevel}</strong>
            </Badge>
            <Badge variant="outline" className="text-[11px] font-normal">
              Stage: <strong className="ml-1">{statusFilter.replace(/_/g, ' ')}</strong>
            </Badge>
            {lecturerId !== 'all' && (
              <Badge variant="outline" className="text-[11px] font-normal">
                Lecturer: <strong className="ml-1">{lecturers.find((l) => String(l.id) === lecturerId)?.full_name || lecturerId}</strong>
              </Badge>
            )}
            {selectedStudentId !== 'all' && (
              <Badge variant="outline" className="text-[11px] font-normal bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                Student: <strong className="ml-1">{students.find((s) => String(s.id) === selectedStudentId)?.full_name || selectedStudentId}</strong>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground ml-auto"
            >
              Reset Filters
            </Button>
          </div>

          {/* Preview Section */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
              <div className="flex items-center gap-2">
                <Eye className="size-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Data Preview
                  {previewLoaded && (
                    <span className="ml-2 text-muted-foreground font-normal">
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
                className="h-7 text-[11px] flex items-center gap-1.5 px-3"
              >
                {previewing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                {previewing ? 'Loading...' : previewLoaded ? 'Refresh Preview' : 'Load Preview'}
              </Button>
            </div>

            {/* Preview body */}
            <div className="min-h-[120px] max-h-64 overflow-auto">
              {previewError && (
                <div className="flex items-center gap-2 p-4 text-xs text-destructive">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  {previewError}
                </div>
              )}
              {!previewLoaded && !previewing && !previewError && (
                <div className="flex flex-col items-center justify-center h-28 text-xs text-muted-foreground gap-1.5">
                  <Eye className="size-5 opacity-40" />
                  <span>Click <strong>Load Preview</strong> to see data before downloading</span>
                </div>
              )}
              {previewing && (
                <div className="flex items-center justify-center h-28 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Fetching report data...
                </div>
              )}
              {previewLoaded && !previewing && previewRows.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-xs text-muted-foreground gap-1">
                  <AlertCircle className="size-5 opacity-40" />
                  <span>No records match the selected filters.</span>
                </div>
              )}
              {previewLoaded && !previewing && previewRows.length > 0 && (
                <table className="w-full text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      {['#', 'Index No.', 'Student Name', 'Program', 'Degree', 'Supervisor', 'Status', 'Grade', 'Submitted'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-b">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{row.index_number}</td>
                        <td className="px-3 py-2 font-medium max-w-[140px] truncate" title={row.student_name}>{row.student_name}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate" title={row.program}>{row.program}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-normal">{row.degree_level}</Badge>
                        </td>
                        <td className="px-3 py-2 max-w-[120px] truncate" title={row.supervisor}>{row.supervisor}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-medium">
                          {row.final_grade || '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.submission_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleDownload('csv')}
              disabled={downloading !== null}
              className="w-full sm:w-auto text-xs flex items-center gap-1.5"
            >
              {downloading === 'csv' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Export CSV (.csv)
            </Button>
            <Button
              size="sm"
              onClick={() => void handleDownload('xlsx')}
              disabled={downloading !== null}
              className="w-full sm:w-auto text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              {downloading === 'xlsx' ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
              Download Master Excel Report (.xlsx)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
