import { useEffect, useState } from 'react'
import { CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useAuth } from '../../context/AuthContext'
import {
  getValidAccessToken,
  apiImportAccounts,
  apiAdminCreateUser,
  apiCreateExternalExaminer,
  apiActivateUser,
  apiAddDepartmentSupervisors,
  apiAssignUserRole,
  apiAssignDepartmentDean,
  apiAssignDepartmentHod,
  apiDeleteUser,
  apiListDepartments,
  apiSyncDefaultDepartments,
  apiListDepartmentSupervisors,
  apiListUsers,
  apiRemoveUserRole,
  apiRemoveDepartmentSupervisor,
  apiUpdateUserRole,
  apiAdminUpdateUser,
  apiAdminResetPassword,
  apiAdminBroadcastPreview,
  apiAdminSendBroadcast,
  apiUploadBroadcastAttachment,
  apiPreviewBroadcastCsv,
  apiBulkAssignExaminers,
  type ApiDepartment,
  type ApiDepartmentSupervisor,
  type ApiImportAccountsSummary,
  type ApiBulkAssignSummary,
  type ApiUser,
  type ApiUserRole,
  type ApiUserUpdatePayload,
  type ApiAdminPasswordResetResponse,
  type ApiAdminCreateUserResult,
  type ApiBroadcastRecipientPreview,
  type BroadcastAttachmentItem,
  type BroadcastCsvPreviewResponse,
} from '../../lib/api'
import {
  Users,
  Trash2,
  CheckCircle,
  Lock,
  Upload,
  FileText,
  FileSpreadsheet,
  FileCheck,
  Download,
  Edit3,
  Key,
  Send,
  Megaphone,
  Mail,
  Search,
  Filter,
  Check,
  Copy,
  AlertCircle,
  Eye,
  Paperclip,
  UploadCloud,
  GraduationCap,
  Building2,
  Sliders,
  Pencil,
} from 'lucide-react'

interface ManagedAccount {
  id: number
  email: string
  schoolId: string
  school: string
  name: string
  department: string
  program: string
  specialization?: string
  researchInterests?: string
  maxStudentCeiling?: number
  role: ApiUserRole
  roles: ApiUserRole[]
  isActive: boolean
  mustChangePassword?: boolean
  createdAt: string
}

const ACCESS_TOKEN_KEY = 'murrs_access_token'
const DEFAULT_SCHOOL_OPTIONS = [
  'GIMPA Business School',
  'School of Public Service and Governance',
  'Faculty of Law',
  'School of Technology and Social Sciences (SOTSS)',
]

const GIMPA_DEPARTMENTS_BY_SCHOOL: Record<string, string[]> = {
  'GIMPA Business School': [
    'Accounting and Finance',
    'Business Management',
    'Management Science',
  ],
  'School of Public Service and Governance': [
    'Development Policy',
    'Public Management & International Relations',
  ],
  'Faculty of Law': [
    'Law',
  ],
  'School of Technology and Social Sciences (SOTSS)': [
    'Computer Science and Information Systems',
    'Economics and Applied Mathematics',
    'Liberal Arts and Hospitality Studies',
  ],
}

const getDepartmentsForSchool = (schoolName: string, loadedDepartments: ApiDepartment[]): string[] => {
  const matching = loadedDepartments.filter(
    (d) => (d.institution_name || '').trim().toLowerCase() === (schoolName || '').trim().toLowerCase()
  )
  if (matching.length > 0) {
    return matching.map((d) => d.name)
  }
  return GIMPA_DEPARTMENTS_BY_SCHOOL[schoolName] || []
}

function mapApiUser(user: ApiUser): ManagedAccount {
  const normalizedRoles = (user.roles && user.roles.length > 0 ? user.roles : [user.role]).filter(Boolean) as ApiUserRole[]
  return {
    id: user.id,
    email: user.email,
    schoolId: user.school_id || '-',
    school: user.school || '-',
    name: user.full_name || user.email.split('@')[0],
    department: user.department || '-',
    program: user.program || '-',
    specialization: user.specialization || '',
    researchInterests: user.research_interests || '',
    maxStudentCeiling: user.max_student_ceiling ?? 5,
    role: user.role || (user.is_admin ? 'librarian' : 'student'),
    roles: normalizedRoles,
    isActive: user.is_active,
    mustChangePassword: user.must_change_password,
    createdAt: user.created_at || '-',
  }
}

function roleChipLabel(role: ApiUserRole): string {
  if (role === 'deputy_rector') return 'Deputy Rector'
  if (role === 'project_supervisor') return 'Project Supervisor'
  if (role === 'project_coordinator') return 'Project Coordinator'
  if (role === 'system_admin') return 'System Admin'
  if (role === 'head_library') return 'Head Library'
  if (role === 'hod') return 'HOD'
  if (role === 'external_examiner') return 'External Examiner'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function extractErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Request failed'
  const msg = err.message || ''
  if (msg.includes('524') || msg.includes('timeout occurred') || msg.toLowerCase().includes('<!doctype') || msg.toLowerCase().includes('<html')) {
    return 'The request timed out waiting for the server (Cloudflare 524). Background operations may still be running. Please refresh the page in a moment to see updated records.'
  }
  if (msg.includes('502') || msg.includes('Bad Gateway') || msg.includes('504')) {
    return 'The server is temporarily unavailable. Please check back shortly.'
  }
  try {
    const parsed = JSON.parse(msg) as { detail?: string }
    return parsed.detail || msg
  } catch {
    return msg
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function AccountManagement() {
  const { user } = useAuth()
  const hasRole = (role: ApiUserRole) => !!user && (user.role === role || (user.roles || []).includes(role))
  const canManageAccounts = hasRole('system_admin') || hasRole('deputy_rector')
  const canBatchAssignExaminers = hasRole('hod') || hasRole('project_coordinator') || hasRole('system_admin') || hasRole('deputy_rector')
  const canCreateExternalExaminer = hasRole('hod') || hasRole('project_coordinator') || hasRole('system_admin') || hasRole('deputy_rector')
  const isHodOrCoordOnly = (hasRole('hod') || hasRole('project_coordinator')) && !hasRole('system_admin') && !hasRole('deputy_rector')
  const canAssignDean = hasRole('system_admin') || hasRole('deputy_rector')
  const canAssignHod = hasRole('dean') || hasRole('deputy_rector') || hasRole('system_admin')
  const canAssignCoordinators = hasRole('hod') || hasRole('deputy_rector') || hasRole('system_admin')
  const canAssignSupervisors = hasRole('project_coordinator') || hasRole('hod') || hasRole('system_admin') || hasRole('deputy_rector')
  const canManageAssignments = canAssignDean || canAssignHod || canAssignCoordinators || canAssignSupervisors
  const canViewAssignments = hasRole('system_admin') || hasRole('deputy_rector') || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator') || hasRole('lecturer')
  const canManage = canManageAccounts || canManageAssignments || canViewAssignments || canBatchAssignExaminers

  // Active sub-tab to keep the page spacious and uncluttered
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'assignments' | 'schools' | 'bulk'>(
    canManageAccounts ? 'users' : canManageAssignments ? 'assignments' : 'schools'
  )

  const [accounts, setAccounts] = useState<ManagedAccount[]>([])
  const [candidateUsers, setCandidateUsers] = useState<ApiUser[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [departmentSupervisors, setDepartmentSupervisors] = useState<ApiDepartmentSupervisor[]>([])
  const [selectedSchoolKey, setSelectedSchoolKey] = useState<string>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [selectedDeanUserId, setSelectedDeanUserId] = useState<string>('')
  const [selectedHodUserId, setSelectedHodUserId] = useState<string>('')
  const [selectedCoordinatorUserId, setSelectedCoordinatorUserId] = useState<string>('')
  const [selectedSupervisorUserId, setSelectedSupervisorUserId] = useState<string>('')
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<ManagedAccount | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createMessage, setCreateMessage] = useState('')
  const [createdAccountResult, setCreatedAccountResult] = useState<ApiAdminCreateUserResult | null>(null)
  const [copiedCreatedPass, setCopiedCreatedPass] = useState(false)
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    role: 'student' as ApiUserRole,
    school_id: '',
    school: '',
    department: '',
    program: '',
    specialization: '',
    research_interests: '',
    max_student_ceiling: 5,
    certification_type: 'Undergraduate',
    block_code: 'A1',
    year: String(new Date().getFullYear()),
  })

  // Bulk upload state
  const [studentsFile, setStudentsFile] = useState<File | null>(null)
  const [lecturersFile, setLecturersFile] = useState<File | null>(null)
  const [libraryFile, setLibraryFile] = useState<File | null>(null)
  const [bulkUploadMessage, setBulkUploadMessage] = useState('')
  const [bulkSummary, setBulkSummary] = useState<ApiImportAccountsSummary | null>(null)
  const [isBulkUploading, setIsBulkUploading] = useState(false)

  // Examiner batch upload state
  const [examinerFile, setExaminerFile] = useState<File | null>(null)
  const [isExaminerBulkUploading, setIsExaminerBulkUploading] = useState(false)
  const [examinerBulkMessage, setExaminerBulkMessage] = useState('')
  const [examinerBulkSummary, setExaminerBulkSummary] = useState<ApiBulkAssignSummary | null>(null)

  // Account list filters
  const [accountSearchTerm, setAccountSearchTerm] = useState('')
  const [accountRoleFilter, setAccountRoleFilter] = useState('ALL')
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL')

  // Edit Account state
  const [editAccount, setEditAccount] = useState<ManagedAccount | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    school_id: '',
    school: '',
    department: '',
    program: '',
    specialization: '',
    research_interests: '',
    max_student_ceiling: 5,
    role: 'student' as ApiUserRole,
    roles: [] as ApiUserRole[],
    is_active: true,
  })
  const [editingBusy, setEditingBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Reset Password state
  const [resetAccount, setResetAccount] = useState<ManagedAccount | null>(null)
  const [resetForm, setResetForm] = useState({
    custom_password: '',
    auto_generate: true,
    must_change_password: true,
    send_email: true,
  })
  const [resettingBusy, setResettingBusy] = useState(false)
  const [resetResult, setResetResult] = useState<ApiAdminPasswordResetResponse | null>(null)
  const [resetError, setResetError] = useState('')
  const [copiedPass, setCopiedPass] = useState(false)

  // Bulk Broadcast Messaging state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false)
  const [broadcastTargetMode, setBroadcastTargetMode] = useState<'filter' | 'csv'>('filter')
  const [broadcastFilter, setBroadcastFilter] = useState({
    role: 'all',
    school: 'all',
    department: 'all',
    program: 'all',
    phase: 'all',
    search: '',
  })
  const [broadcastRecipients, setBroadcastRecipients] = useState<ApiBroadcastRecipientPreview[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState('general')
  const [broadcastIncludeEmail, setBroadcastIncludeEmail] = useState(true)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState('')
  const [broadcastError, setBroadcastError] = useState('')

  // Attachment & CSV Upload states
  const [broadcastAttachments, setBroadcastAttachments] = useState<BroadcastAttachmentItem[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [csvUploadFile, setCsvUploadFile] = useState<File | null>(null)
  const [csvPreviewResult, setCsvPreviewResult] = useState<BroadcastCsvPreviewResponse | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)

  const filteredAccounts = accounts.filter((acc) => {
    if (accountRoleFilter !== 'ALL') {
      const primaryRole = (acc.role || '').toLowerCase()
      if (accountRoleFilter === 'student') {
        if (primaryRole !== 'student' && primaryRole !== 'member') return false
      } else if (accountRoleFilter === 'librarian') {
        if (primaryRole !== 'librarian' && primaryRole !== 'head_library') return false
      } else if (accountRoleFilter === 'system_admin') {
        if (primaryRole !== 'system_admin' && primaryRole !== 'deputy_rector') return false
      } else {
        if (primaryRole !== accountRoleFilter) return false
      }
    }
    if (accountStatusFilter === 'ACTIVE' && !acc.isActive) return false
    if (accountStatusFilter === 'PENDING' && acc.isActive) return false
    if (accountSearchTerm.trim()) {
      const q = accountSearchTerm.trim().toLowerCase()
      const match =
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.schoolId.toLowerCase().includes(q) ||
        acc.department.toLowerCase().includes(q) ||
        acc.program.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const handleOpenEditAccount = (account: ManagedAccount) => {
    setEditAccount(account)
    setEditForm({
      full_name: account.name === account.email.split('@')[0] ? '' : account.name,
      email: account.email,
      school_id: account.schoolId === '-' ? '' : account.schoolId,
      school: account.school === '-' ? '' : account.school,
      department: account.department === '-' ? '' : account.department,
      program: account.program === '-' ? '' : account.program,
      specialization: account.specialization || '',
      research_interests: account.researchInterests || '',
      max_student_ceiling: account.maxStudentCeiling ?? 5,
      role: account.role,
      roles: account.roles,
      is_active: account.isActive,
    })
    setEditError('')
    setEditSuccess('')
  }

  const handleSaveEditAccount = async () => {
    if (!editAccount) return
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setEditingBusy(true)
    setEditError('')
    setEditSuccess('')
    try {
      const payload: ApiUserUpdatePayload = {
        full_name: editForm.full_name.trim() || undefined,
        email: editForm.email.trim().toLowerCase(),
        school_id: editForm.school_id.trim() || undefined,
        school: editForm.school.trim() || undefined,
        department: editForm.department.trim() || undefined,
        program: editForm.program.trim() || undefined,
        specialization: editForm.specialization.trim(),
        research_interests: editForm.research_interests.trim(),
        max_student_ceiling: Number(editForm.max_student_ceiling) || 5,
        role: editForm.role,
        roles: editForm.roles,
        is_active: editForm.is_active,
      }
      const updated = await apiAdminUpdateUser(editAccount.id, payload, accessToken)
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? mapApiUser(updated) : a)))
      setEditSuccess('Account details successfully updated!')
      setTimeout(() => {
        setEditAccount(null)
        setEditSuccess('')
      }, 900)
    } catch (err) {
      setEditError(extractErrorMessage(err))
    } finally {
      setEditingBusy(false)
    }
  }

  const handleOpenResetPassword = (account: ManagedAccount) => {
    setResetAccount(account)
    setResetForm({
      custom_password: '',
      auto_generate: true,
      must_change_password: true,
      send_email: true,
    })
    setResetResult(null)
    setResetError('')
    setCopiedPass(false)
  }

  const handleExecuteResetPassword = async () => {
    if (!resetAccount) return
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setResettingBusy(true)
    setResetError('')
    try {
      const res = await apiAdminResetPassword(
        resetAccount.id,
        {
          new_password: resetForm.auto_generate ? undefined : resetForm.custom_password.trim() || undefined,
          must_change_password: resetForm.must_change_password,
          send_email: resetForm.send_email,
        },
        accessToken
      )
      setResetResult(res)
    } catch (err) {
      setResetError(extractErrorMessage(err))
    } finally {
      setResettingBusy(false)
    }
  }

  const fetchBroadcastPreview = async (filtersToUse = broadcastFilter) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setLoadingPreview(true)
    try {
      const res = await apiAdminBroadcastPreview(
        {
          roles: filtersToUse.role === 'all' ? undefined : [filtersToUse.role],
          schools: filtersToUse.school === 'all' ? undefined : [filtersToUse.school],
          departments: filtersToUse.department === 'all' ? undefined : [filtersToUse.department],
          programs: filtersToUse.program === 'all' ? undefined : [filtersToUse.program],
          phases: filtersToUse.phase === 'all' ? undefined : [filtersToUse.phase],
          search: filtersToUse.search.trim() || undefined,
        },
        accessToken
      )
      setBroadcastRecipients(res.recipients)
      setSelectedRecipientIds(res.recipients.map((r) => r.id))
    } catch (err) {
      console.error('Failed to load preview recipients', err)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleOpenBroadcastModal = () => {
    setBroadcastModalOpen(true)
    setBroadcastSuccess('')
    setBroadcastError('')
    setBroadcastTargetMode('filter')
    setBroadcastAttachments([])
    setCsvUploadFile(null)
    setCsvPreviewResult(null)
    void fetchBroadcastPreview(broadcastFilter)
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return

    setUploadingAttachment(true)
    setBroadcastError('')
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploaded = await apiUploadBroadcastAttachment(file, accessToken)
        setBroadcastAttachments((prev) => [...prev, uploaded])
      }
    } catch (err) {
      setBroadcastError(extractErrorMessage(err) || 'Failed to upload attachment.')
    } finally {
      setUploadingAttachment(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveAttachment = (fileUrl: string) => {
    setBroadcastAttachments((prev) => prev.filter((att) => att.file_url !== fileUrl))
  }

  const handleProcessCsvFile = async (file: File) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setUploadingCsv(true)
    setCsvUploadFile(file)
    setBroadcastError('')
    try {
      const res = await apiPreviewBroadcastCsv(file, accessToken)
      setCsvPreviewResult(res)
      if (res.matched_recipients.length > 0) {
        setBroadcastRecipients(res.matched_recipients)
        setSelectedRecipientIds(res.matched_recipients.map((r) => r.id))
      }
    } catch (err) {
      setBroadcastError(extractErrorMessage(err) || 'Failed to parse recipients from CSV.')
    } finally {
      setUploadingCsv(false)
    }
  }

  const handleSendAdminBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setBroadcastError('Please provide both subject and message body.')
      return
    }
    if (selectedRecipientIds.length === 0) {
      setBroadcastError('Please select at least one recipient.')
      return
    }
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setSendingBroadcast(true)
    setBroadcastError('')
    setBroadcastSuccess('')
    try {
      const res = await apiAdminSendBroadcast(
        {
          recipient_ids: selectedRecipientIds,
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
          announcement_type: broadcastType,
          include_email: broadcastIncludeEmail,
          attachments: broadcastAttachments.length > 0 ? broadcastAttachments : undefined,
        },
        accessToken
      )
      setBroadcastSuccess(
        `✓ ${res.message} (${res.notifications_created} notifications created, ${res.emails_queued} emails queued)`
      )
      setBroadcastSubject('')
      setBroadcastMessage('')
      setBroadcastAttachments([])
      setCsvUploadFile(null)
      setCsvPreviewResult(null)
    } catch (err) {
      setBroadcastError(extractErrorMessage(err))
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setBulkUploadMessage('')
    setBulkSummary(null)

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setBulkUploadMessage('Please sign in to continue.')
      return
    }
    if (!studentsFile && !lecturersFile && !libraryFile) {
      setBulkUploadMessage('Attach at least one file to import.')
      return
    }

    setIsBulkUploading(true)
    try {
      const summary = await apiImportAccounts(accessToken, {
        studentsFile: studentsFile || undefined,
        lecturersFile: lecturersFile || undefined,
        libraryFile: libraryFile || undefined,
      })
      setBulkSummary(summary)
      setBulkUploadMessage('Import completed successfully.')
      await loadAccounts()
    } catch (err) {
      setBulkUploadMessage(extractErrorMessage(err))
    } finally {
      setIsBulkUploading(false)
    }
  }

  const fileInput = (label: string, file: File | null, setFile: (f: File | null) => void) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-xs"
        />
        {file && (
          <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )

  const loadAccounts = async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setLoadingError('Missing or expired session token. Please sign in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadingError('')
    try {
      const users = await apiListUsers(accessToken, { limit: 200 })
      setAccounts(users.map(mapApiUser))
    } catch (err) {
      setLoadingError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const loadAssignmentData = async () => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setLoadingError('Missing or expired session token. Please sign in again.')
      return
    }

    try {
      let [deptItems, users] = await Promise.all([
        apiListDepartments(accessToken),
        apiListUsers(accessToken, { limit: 200, is_active: true }),
      ])

      if (deptItems.length === 0) {
        try {
          deptItems = await apiSyncDefaultDepartments(accessToken)
        } catch {}
      }

      setDepartments(deptItems)
      setCandidateUsers(users)

      if (deptItems.length > 0) {
        setSelectedDepartmentId((prev) => {
          if (prev && deptItems.some((d) => String(d.id) === prev)) return prev
          return String(deptItems[0].id)
        })
      }
    } catch (err) {
      setLoadingError(extractErrorMessage(err))
    }
  }

  const loadDepartmentSupervisors = async (departmentId: number) => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) return
    try {
      const rows = await apiListDepartmentSupervisors(departmentId, accessToken)
      setDepartmentSupervisors(rows.filter((r) => r.active))
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    }
  }

  useEffect(() => {
    if (canManageAccounts) {
      void loadAccounts()
    } else {
      setLoading(false)
    }
    if (canManageAssignments || canViewAssignments) {
      void loadAssignmentData()
    }
  }, [canManageAccounts, canManageAssignments, canViewAssignments])

  useEffect(() => {
    const deptId = Number(selectedDepartmentId)
    if (canManageAssignments && Number.isFinite(deptId) && deptId > 0) {
      void loadDepartmentSupervisors(deptId)
    } else {
      setDepartmentSupervisors([])
    }
  }, [selectedDepartmentId, canManageAssignments])

  const handleDeleteAccount = async (id: number) => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setLoadingError('Missing or expired session token. Please sign in again.')
      return
    }
    setDeletingId(id)
    try {
      await apiDeleteUser(id, accessToken)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setLoadingError(extractErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const handleActivateAccount = async (id: number) => {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setLoadingError('Missing or expired session token. Please sign in again.')
      return
    }
    setActivatingId(id)
    try {
      const updated = await apiActivateUser(id, accessToken)
      setAccounts((prev) => prev.map((a) => (a.id === id ? mapApiUser(updated) : a)))
    } catch (err) {
      setLoadingError(extractErrorMessage(err))
    } finally {
      setActivatingId(null)
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      full_name: '',
      email: '',
      role: isHodOrCoordOnly ? 'external_examiner' : 'student',
      school_id: '',
      school: '',
      department: '',
      program: '',
      certification_type: 'Undergraduate',
      block_code: 'A1',
      year: String(new Date().getFullYear()),
      specialization: '',
      research_interests: '',
      max_student_ceiling: 5,
    })
  }

  const handleCreateAccount = async () => {
    setCreateBusy(true)
    setCreateMessage('')
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setCreateMessage('Your session has expired. Please sign in again.')
      setCreateBusy(false)
      return
    }
    if (!createForm.email.trim()) {
      setCreateMessage('Email is required.')
      setCreateBusy(false)
      return
    }
    if (!createForm.full_name.trim()) {
      setCreateMessage('Full name is required.')
      setCreateBusy(false)
      return
    }

    const isStudentRole = createForm.role === 'student' || createForm.role === 'member'
    const isAcademicStaffRole = ['lecturer', 'staff', 'project_supervisor', 'project_coordinator', 'hod', 'dean'].includes(createForm.role)
    const isLibraryRole = createForm.role === 'librarian' || createForm.role === 'head_library'

    if (isStudentRole && (!createForm.school.trim() || !createForm.department.trim() || !createForm.school_id.trim())) {
      setCreateMessage('Student ID, School, and Department are required for students.')
      setCreateBusy(false)
      return
    }
    if (isAcademicStaffRole && (!createForm.school.trim() || !createForm.department.trim())) {
      setCreateMessage('School and Department are required for lecturers and academic faculty.')
      setCreateBusy(false)
      return
    }

    try {
      const payload = {
        email: createForm.email.trim(),
        role: createForm.role,
        full_name: createForm.full_name.trim(),
        school_id: createForm.school_id.trim() || undefined,
        school: createForm.school.trim() || (isLibraryRole ? 'GIMPA Library' : undefined),
        department: createForm.department.trim() || (isLibraryRole ? 'Library Services' : undefined),
        program: isStudentRole ? (createForm.program.trim() || undefined) : undefined,
        certification_type: isStudentRole ? (createForm.certification_type.trim() || undefined) : undefined,
        block_code: isStudentRole ? (createForm.block_code.trim() || undefined) : undefined,
        year: (isStudentRole || isAcademicStaffRole) && createForm.year ? Number(createForm.year) : undefined,
        specialization: isAcademicStaffRole ? (createForm.specialization.trim() || undefined) : undefined,
        research_interests: isAcademicStaffRole ? (createForm.research_interests.trim() || undefined) : undefined,
        max_student_ceiling: isAcademicStaffRole ? (Number(createForm.max_student_ceiling) || 5) : undefined,
      }
      const result = isHodOrCoordOnly
        ? await apiCreateExternalExaminer(payload, accessToken)
        : await apiAdminCreateUser(payload, accessToken)
      setCreatedAccountResult(result)
      setCreateMessage('')
      await loadAccounts()
      resetCreateForm()
    } catch (err) {
      setCreateMessage(extractErrorMessage(err))
    } finally {
      setCreateBusy(false)
    }
  }

  const refreshDepartment = async (departmentId: number) => {
    await loadAssignmentData()
    await loadDepartmentSupervisors(departmentId)
  }

  const handleAssignDeanBySchool = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const userId = Number(selectedDeanUserId)
    if (!accessToken || !selectedSchoolKey || !userId) {
      setAssignmentMessage('Select school and dean to continue.')
      return
    }
    const selectedSchoolNormalized = selectedSchoolKey.trim().toLowerCase()
    const schoolDepartments = departments.filter((d) => {
      const idMatch = String(d.institution_id) === selectedSchoolKey
      const nameMatch = (d.institution_name || '').trim().toLowerCase() === selectedSchoolNormalized
      return idMatch || nameMatch
    })
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      if (schoolDepartments.length > 0) {
        for (const dept of schoolDepartments) {
          await apiAssignDepartmentDean(dept.id, userId, accessToken)
        }
      }
      await apiUpdateUserRole(userId, 'dean', accessToken)
      await loadAssignmentData()
      setAssignmentMessage(
        schoolDepartments.length > 0
          ? 'Dean assigned to selected school successfully.'
          : 'Dean role assigned. No departments are mapped to that school yet.',
      )
      setSelectedDeanUserId('')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAssignHod = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const departmentId = Number(selectedDepartmentId)
    const userId = Number(selectedHodUserId)
    if (!accessToken || !departmentId || !userId) {
      setAssignmentMessage('Select department and HOD to continue.')
      return
    }
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      await apiAssignDepartmentHod(departmentId, userId, accessToken)
      await refreshDepartment(departmentId)
      setAssignmentMessage('HOD assigned successfully.')
      setSelectedHodUserId('')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAddSupervisor = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const departmentId = Number(selectedDepartmentId)
    const userId = Number(selectedSupervisorUserId)
    if (!accessToken || !departmentId || !userId) {
      setAssignmentMessage('Select department and supervisor to continue.')
      return
    }
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      await apiAddDepartmentSupervisors(departmentId, [userId], accessToken)
      await loadDepartmentSupervisors(departmentId)
      setAssignmentMessage('Project supervisor appointed successfully.')
      setSelectedSupervisorUserId('')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAddCoordinator = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const userId = Number(selectedCoordinatorUserId)
    if (!accessToken || !userId) {
      setAssignmentMessage('Select project coordinator to continue.')
      return
    }
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      await apiAssignUserRole(userId, 'project_coordinator', accessToken)
      await loadAssignmentData()
      setAssignmentMessage('Project coordinator appointed successfully.')
      setSelectedCoordinatorUserId('')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleRemoveCoordinator = async (userId: number) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) return
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      await apiRemoveUserRole(userId, 'project_coordinator', accessToken)
      await loadAssignmentData()
      setAssignmentMessage('Project coordinator removed.')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleRemoveSupervisor = async (supervisorUserId: number) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const departmentId = Number(selectedDepartmentId)
    if (!accessToken || !departmentId) return
    setSavingAssignment(true)
    setAssignmentMessage('')
    try {
      await apiRemoveDepartmentSupervisor(departmentId, supervisorUserId, accessToken)
      await loadDepartmentSupervisors(departmentId)
      setAssignmentMessage('Project supervisor removed.')
    } catch (err) {
      setAssignmentMessage(extractErrorMessage(err))
    } finally {
      setSavingAssignment(false)
    }
  }

  const displayNameByUserId = (userId: number | null | undefined): string => {
    if (!userId) return '-'
    const found = candidateUsers.find((u) => u.id === userId)
    if (!found) return `User #${userId}`
    return `${found.full_name || found.email} (${found.email})`
  }

  const actorDepartment = normalizeText(user?.department)
  const actorSchool = normalizeText(user?.school)
  const isSuperAdminOrRector = hasRole('system_admin') || hasRole('deputy_rector')

  const visibleDepartments = departments.filter((d) => {
    if (isSuperAdminOrRector) {
      if (!selectedSchoolKey) return true
      const selectedSchoolNormalized = selectedSchoolKey.trim().toLowerCase()
      const idMatch = String(d.institution_id) === selectedSchoolKey
      const nameMatch = (d.institution_name || '').trim().toLowerCase() === selectedSchoolNormalized
      return idMatch || nameMatch
    }
    if (hasRole('dean')) {
      const mapped = d.dean_user_id === user?.id
      const deptSchool = normalizeText(d.institution_name)
      const sameSchool = !!actorSchool && (
        deptSchool === actorSchool ||
        deptSchool.includes(actorSchool) ||
        actorSchool.includes(deptSchool)
      )
      return mapped || sameSchool
    }
    if (hasRole('hod') || hasRole('project_coordinator')) {
      const sameDepartment = normalizeText(d.name) === actorDepartment
      const mapped = d.hod_user_id === user?.id
      return sameDepartment || mapped
    }
    return false
  })
  const selectedDepartment = visibleDepartments.find((d) => String(d.id) === selectedDepartmentId) || null

  const schoolOptions = Array.from(
    new Map(
      departments.map((d) => [
        String(d.institution_id),
        d.institution_name || `School #${d.institution_id}`,
      ]),
    ).entries(),
  ).map(([id, label]) => ({ id, label }))
  const effectiveSchoolOptions = schoolOptions.length > 0
    ? schoolOptions
    : DEFAULT_SCHOOL_OPTIONS.map((label) => ({ id: label, label }))
  const selectedSchoolOption = effectiveSchoolOptions.find((s) => s.id === selectedSchoolKey) || null
  const selectedSchoolName = normalizeText(selectedSchoolOption?.label || selectedSchoolKey)
  const matchesSelectedSchool = (school: string | null | undefined): boolean => {
    if (!isSuperAdminOrRector) return true
    if (!selectedSchoolKey) return true
    return normalizeText(school) === selectedSchoolName
  }
  const deanCandidates = candidateUsers.filter((u) => {
    const roles = [u.role, ...(u.roles || [])]
    const lecturerOnly = roles.includes('lecturer')
    return lecturerOnly && matchesSelectedSchool(u.school)
  })
  const schoolDeanSummary = Array.from(
    new Map(
      departments.map((d) => [String(d.institution_id), d.institution_name || `School #${d.institution_id}`]),
    ).entries(),
  ).map(([institutionId, schoolName]) => {
    const schoolDepartments = departments.filter((d) => String(d.institution_id) === institutionId)
    const deanIds = Array.from(new Set(schoolDepartments.map((d) => d.dean_user_id).filter((v): v is number => typeof v === 'number')))
    const deanLabel =
      deanIds.length === 0
        ? 'Not assigned'
        : deanIds.length === 1
          ? displayNameByUserId(deanIds[0])
          : 'Multiple assignments'
    return { institutionId, schoolName, deanLabel }
  })

  const userSchoolNormalized = normalizeText(user?.school)
  const schoolsOverviewData = Array.from(
    new Map(
      departments.map((d) => [String(d.institution_id), d.institution_name || `School #${d.institution_id}`]),
    ).entries(),
  ).map(([institutionId, schoolName]) => {
    const schoolKey = normalizeText(schoolName)
    const schoolDepartments = departments.filter((d) => String(d.institution_id) === institutionId)
    const deanIds = Array.from(
      new Set(
        schoolDepartments
          .map((d) => d.dean_user_id)
          .filter((v): v is number => typeof v === 'number')
      )
    )
    return {
      institutionId,
      schoolName,
      schoolKey,
      deanIds,
      depts: schoolDepartments,
    }
  }).filter((school) => {
    if (!isSuperAdminOrRector) {
      const isDeanOfThisSchool = !!user?.id && school.deanIds.includes(user.id)
      const matchesSchoolName = !!userSchoolNormalized && (
        school.schoolKey === userSchoolNormalized ||
        school.schoolKey.includes(userSchoolNormalized) ||
        userSchoolNormalized.includes(school.schoolKey)
      )
      return isDeanOfThisSchool || matchesSchoolName
    }
    return true
  })

  const userHasRole = (u: ApiUser, role: ApiUserRole) =>
    (u.role === role) || ((u.roles || []).includes(role))
  const targetDepartmentName = (normalizeText(selectedDepartment?.name) || actorDepartment)
  const hodCandidates = candidateUsers.filter((u) => {
    const isAcademicFaculty = ['lecturer', 'project_supervisor', 'project_coordinator', 'hod', 'staff'].some((r) =>
      userHasRole(u, r as ApiUserRole)
    )
    if (!isAcademicFaculty) return false

    const candDept = normalizeText(u.department)
    const candSchool = normalizeText(u.school)
    const targetDept = targetDepartmentName.toLowerCase()
    const targetSchool = normalizeText(selectedDepartment?.institution_name)

    const matchesDept = candDept && targetDept ? (candDept === targetDept || candDept.includes(targetDept) || targetDept.includes(candDept)) : false
    const matchesSchool = candSchool && targetSchool ? (candSchool === targetSchool || candSchool.includes(targetSchool) || targetSchool.includes(candSchool)) : false

    return matchesDept || matchesSchool || !candDept
  })
  const supervisorCandidates = candidateUsers.filter((u) => {
    const lecturerOnly = userHasRole(u, 'lecturer')
    const notAlreadyAssigned = !departmentSupervisors.some((s) => s.supervisor_user_id === u.id)
    if (!lecturerOnly || !notAlreadyAssigned) return false
    return normalizeText(u.department) === targetDepartmentName
  })

  const coordinatorCandidates = candidateUsers.filter((u) => {
    const lecturerOnly = userHasRole(u, 'lecturer')
    const sameDepartment = normalizeText(u.department) === targetDepartmentName
    const alreadyCoordinator = userHasRole(u, 'project_coordinator')
    return lecturerOnly && sameDepartment && !alreadyCoordinator
  })

  const currentDepartmentCoordinators = candidateUsers.filter((u) => {
    const sameDepartment = normalizeText(u.department) === targetDepartmentName
    return sameDepartment && userHasRole(u, 'project_coordinator')
  })

  useEffect(() => {
    if (!hasRole('system_admin')) return
    if (selectedSchoolKey) return
    if (schoolOptions.length > 0) {
      setSelectedSchoolKey(schoolOptions[0].id)
      return
    }
    if (DEFAULT_SCHOOL_OPTIONS.length > 0) {
      setSelectedSchoolKey(DEFAULT_SCHOOL_OPTIONS[0])
    }
  }, [departments.length, selectedSchoolKey])

  useEffect(() => {
    if (visibleDepartments.length === 0) {
      if (selectedDepartmentId) setSelectedDepartmentId('')
      return
    }
    const isCurrentVisible = visibleDepartments.some((d) => String(d.id) === selectedDepartmentId)
    if (!isCurrentVisible) {
      setSelectedDepartmentId(String(visibleDepartments[0].id))
    }
  }, [visibleDepartments, selectedDepartmentId])

  if (!canManage) {
    return (
      <div className="fp-card flex items-center gap-3 text-[#c93b2b]">
        <Lock className="h-5 w-5" />
        <div>
          <p className="font-bold">Access Denied</p>
          <p className="text-xs text-[#6e766b]">Only system admins, deans, HODs, and project coordinators can access this area.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── PAGE HEADER & SUB-NAVIGATION PILLS (Matches FinPlanner Image 11 & 7) ── */}
      <div className="space-y-5">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1d1a] leading-tight">
          Company and users
        </h1>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageAccounts && (
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`fp-subnav-pill ${activeSubTab === 'users' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <Users className="size-3.5" />
              Users & Accounts ({accounts.length})
            </button>
          )}

          {canManageAssignments && (
            <button
              type="button"
              onClick={() => setActiveSubTab('assignments')}
              className={`fp-subnav-pill ${activeSubTab === 'assignments' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <Sliders className="size-3.5" />
              Role Assignments
            </button>
          )}

          {canViewAssignments && (
            <button
              type="button"
              onClick={() => setActiveSubTab('schools')}
              className={`fp-subnav-pill ${activeSubTab === 'schools' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <Building2 className="size-3.5" />
              Schools & Faculties
            </button>
          )}

          {(canManageAccounts || canBatchAssignExaminers) && (
            <button
              type="button"
              onClick={() => setActiveSubTab('bulk')}
              className={`fp-subnav-pill ${activeSubTab === 'bulk' ? 'fp-subnav-pill-active' : 'fp-subnav-pill-inactive'}`}
            >
              <Upload className="size-3.5" />
              Bulk Import & Examiner Mapping
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY AND USERS (Matches FinPlanner Image 11 Layout)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-8">
          {/* Top Organization Entity Section (Matches "Cat Company Ltd." in Image 11) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {canManageAssignments && (
                <Button onClick={() => setActiveSubTab('assignments')}>
                  + Assign institutional roles
                </Button>
              )}
              {canManageAccounts && (
                <Button variant="outline" onClick={handleOpenBroadcastModal}>
                  <Megaphone className="size-3.5 mr-1.5" />
                  + Broadcast announcement
                </Button>
              )}
            </div>

            <div className="fp-entity-row flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-4 min-w-[260px]">
                <div className="fp-avatar">
                  <Building2 className="size-5 text-[#1a1d1a]" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-[#1a1d1a]">
                    GIMPA Institutional Repository
                  </div>
                  <div className="text-[12px] text-[#6e766b]">
                    4 Academic Faculties · Digital Archive
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                <div>
                  <div className="text-[10px] text-[#8c9489] font-medium">Total accounts</div>
                  <div className="text-[14px] font-bold text-[#1a1d1a]">{accounts.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8c9489] font-medium">Active users</div>
                  <div className="text-[14px] font-bold text-[#1a1d1a]">
                    {accounts.filter((a) => a.isActive).length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8c9489] font-medium">Pending activation</div>
                  <div className="text-[14px] font-bold text-[#1a1d1a]">
                    {accounts.filter((a) => !a.isActive).length}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('schools')}
                className="p-2 rounded-lg text-[#6e766b] hover:text-[#1a1d1a] hover:bg-[#dce7d0]/60 transition-colors cursor-pointer self-end md:self-center"
                title="View schools overview"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          </div>

          {/* Second Section: Users List (Matches "Ben German", "Phillipa Jones", "Dan Brown" in Image 11) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {canCreateExternalExaminer && (
                  <Button onClick={() => { setCreateDialogOpen(true); setCreateMessage('') }}>
                    + Add user
                  </Button>
                )}
              </div>

              {/* Clean Search & Role Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={accountSearchTerm}
                    onChange={(e) => setAccountSearchTerm(e.target.value)}
                    className="w-full h-9 pl-4 pr-9 rounded-full border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552]"
                  />
                  <Search className="size-4 text-[#6e766b] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <Select value={accountRoleFilter} onValueChange={setAccountRoleFilter}>
                  <SelectTrigger className="h-9 text-xs w-[140px] rounded-full bg-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="lecturer">Lecturers</SelectItem>
                    <SelectItem value="project_supervisor">Supervisors</SelectItem>
                    <SelectItem value="project_coordinator">Coordinators</SelectItem>
                    <SelectItem value="hod">HODs</SelectItem>
                    <SelectItem value="dean">Deans</SelectItem>
                    <SelectItem value="librarian">Librarians</SelectItem>
                    <SelectItem value="external_examiner">External Examiners</SelectItem>
                    <SelectItem value="system_admin">System Admins</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                  <SelectTrigger className="h-9 text-xs w-[130px] rounded-full bg-[#5a6552] text-white border-[#5a6552]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* User Entity Rows */}
            {loading ? (
              <div className="fp-card py-12 text-center text-[#6e766b]">Loading accounts...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="fp-card py-12 text-center text-[#6e766b]">
                No accounts match the current filter criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAccounts.map((account) => {
                  const initial = (account.name || 'U').trim().charAt(0).toUpperCase()
                  return (
                    <div
                      key={account.id}
                      className="fp-entity-row flex-col md:flex-row items-start md:items-center gap-4"
                    >
                      {/* Left: 44x44 Soft Sage Avatar + Name & Email */}
                      <div className="flex items-center gap-4 min-w-[260px]">
                        <div className="fp-avatar">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-[#1a1d1a] truncate">
                            {account.name}
                          </div>
                          <div className="text-[12px] text-[#6e766b] truncate">
                            {account.email}
                          </div>
                        </div>
                      </div>

                      {/* Middle: 3 Aligned Columns matching Image 11 ("Employment type", "Position", "Access") */}
                      <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                        <div>
                          <div className="text-[10px] text-[#8c9489] font-medium">Department / School</div>
                          <div className="text-[13px] font-bold text-[#1a1d1a] truncate">
                            {account.department !== '-' ? account.department : account.school}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#8c9489] font-medium">Position</div>
                          <div className="text-[13px] font-bold text-[#1a1d1a] truncate">
                            {roleChipLabel(account.role)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-[#8c9489] font-medium">Access</div>
                          <div className={`text-[13px] font-bold ${account.isActive ? 'text-[#1a1d1a]' : 'text-[#c93b2b]'}`}>
                            {account.isActive ? 'Full' : 'Pending'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Minimal Action Icons */}
                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                        {!account.isActive && (
                          <Button
                            size="sm"
                            onClick={() => void handleActivateAccount(account.id)}
                            disabled={activatingId === account.id}
                          >
                            {activatingId === account.id ? '...' : 'Activate'}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedAccount(account)}
                          className="p-2 rounded-lg text-[#6e766b] hover:text-[#1a1d1a] hover:bg-[#dce7d0]/50 transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(account)}
                          className="p-2 rounded-lg text-[#6e766b] hover:text-[#1a1d1a] hover:bg-[#dce7d0]/50 transition-colors cursor-pointer"
                          title="Edit account"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(account)}
                          className="p-2 rounded-lg text-[#6e766b] hover:text-[#1a1d1a] hover:bg-[#dce7d0]/50 transition-colors cursor-pointer"
                          title="Reset password"
                        >
                          <Key className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAccount(account.id)}
                          disabled={deletingId === account.id}
                          className="p-2 rounded-lg text-[#6e766b] hover:text-[#c93b2b] hover:bg-[#fdf2f0] transition-colors cursor-pointer"
                          title="Delete account"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE ASSIGNMENTS                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'assignments' && canManageAssignments && (
        <div className="space-y-6">
          {loadingError && (
            <div className="p-4 rounded-xl bg-[#fdf2f0] border border-[#f5d0ca] text-xs text-[#c93b2b]">
              {loadingError}
            </div>
          )}
          {assignmentMessage && (
            <div className="p-4 rounded-xl bg-[#dce7d0] text-[#1a1d1a] text-xs font-semibold">
              {assignmentMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {canAssignDean && (
              <div className="fp-card space-y-4">
                <h3 className="text-[18px] font-bold text-[#1a1d1a]">Assign School Dean</h3>
                <p className="text-[13px] text-[#6e766b]">
                  Select an academic school and appoint a faculty member as Dean.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>School</Label>
                    <Select value={selectedSchoolKey} onValueChange={setSelectedSchoolKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {effectiveSchoolOptions.map((school) => (
                          <SelectItem key={school.id} value={school.id}>{school.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Dean Candidate</Label>
                    <Select value={selectedDeanUserId} onValueChange={setSelectedDeanUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lecturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {deanCandidates.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name || u.email} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => void handleAssignDeanBySchool()} disabled={savingAssignment}>
                    Save Dean Assignment
                  </Button>
                </div>
              </div>
            )}

            {visibleDepartments.length > 0 && (
              <div className="fp-card space-y-4">
                <h3 className="text-[18px] font-bold text-[#1a1d1a]">Department Leadership</h3>
                <div>
                  <Label>Select Department</Label>
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name} {dept.institution_name ? `(${dept.institution_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDepartment && (
                  <div className="p-4 rounded-xl bg-white border border-[#eaece4] space-y-1.5 text-[13px]">
                    <div><span className="text-[#6e766b]">Current Dean:</span> <strong>{displayNameByUserId(selectedDepartment.dean_user_id)}</strong></div>
                    <div><span className="text-[#6e766b]">Current HOD:</span> <strong>{displayNameByUserId(selectedDepartment.hod_user_id)}</strong></div>
                  </div>
                )}

                {canAssignHod && selectedDepartment && (
                  <div className="space-y-3 pt-2 border-t border-[#eaece4]">
                    <Label>Assign Head of Department (HOD)</Label>
                    <Select value={selectedHodUserId} onValueChange={setSelectedHodUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HOD user" />
                      </SelectTrigger>
                      <SelectContent>
                        {hodCandidates.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name || u.email} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => void handleAssignHod()} disabled={savingAssignment}>
                      Assign HOD
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Supervisors & Coordinators Cards */}
          {visibleDepartments.length > 0 && selectedDepartment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {canAssignSupervisors && (
                <div className="fp-card space-y-4">
                  <h3 className="text-[18px] font-bold text-[#1a1d1a]">Project Supervisors</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedSupervisorUserId} onValueChange={setSelectedSupervisorUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supervisor user" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisorCandidates.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.full_name || u.email} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => void handleAddSupervisor()} disabled={savingAssignment}>
                      + Add
                    </Button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {departmentSupervisors.length === 0 ? (
                      <p className="text-xs text-[#6e766b]">No supervisors assigned yet.</p>
                    ) : (
                      departmentSupervisors.map((item) => {
                        const targetAcc = accounts.find((a) => a.id === item.supervisor_user_id)
                        return (
                          <div key={item.id} className="p-3.5 rounded-xl bg-white border border-[#eaece4] flex items-center justify-between gap-2 text-xs">
                            <div>
                              <div className="font-bold text-[#1a1d1a]">{displayNameByUserId(item.supervisor_user_id)}</div>
                              {targetAcc && (
                                <div className="text-[#6e766b] mt-0.5">
                                  Ceiling: {targetAcc.maxStudentCeiling ?? 5} · {targetAcc.specialization || 'General'}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {targetAcc && (
                                <Button size="sm" variant="outline" onClick={() => handleOpenEditAccount(targetAcc)}>
                                  Quota
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => void handleRemoveSupervisor(item.supervisor_user_id)}>
                                <Trash2 className="size-3.5 text-[#c93b2b]" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {canAssignCoordinators && (
                <div className="fp-card space-y-4">
                  <h3 className="text-[18px] font-bold text-[#1a1d1a]">Project Coordinators</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedCoordinatorUserId} onValueChange={setSelectedCoordinatorUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project coordinator" />
                        </SelectTrigger>
                        <SelectContent>
                          {coordinatorCandidates.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.full_name || u.email} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => void handleAddCoordinator()} disabled={savingAssignment}>
                      + Add
                    </Button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {currentDepartmentCoordinators.length === 0 ? (
                      <p className="text-xs text-[#6e766b]">No project coordinators assigned yet.</p>
                    ) : (
                      currentDepartmentCoordinators.map((item) => (
                        <div key={item.id} className="p-3.5 rounded-xl bg-white border border-[#eaece4] flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1a1d1a]">{item.full_name || item.email} ({item.email})</span>
                          <Button size="sm" variant="ghost" onClick={() => void handleRemoveCoordinator(item.id)}>
                            <Trash2 className="size-3.5 text-[#c93b2b]" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCHOOLS & FACULTIES OVERVIEW                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'schools' && canViewAssignments && (
        <div className="space-y-6">
          {schoolsOverviewData.map((schoolInfo) => (
            <div key={schoolInfo.schoolName} className="fp-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eaece4] pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <div className="fp-avatar">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[16px] text-[#1a1d1a]">{schoolInfo.schoolName}</h4>
                    <p className="text-[12px] text-[#6e766b]">
                      Dean: {schoolInfo.deanIds.length === 0 ? 'Not assigned' : schoolInfo.deanIds.map(uid => displayNameByUserId(uid)).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schoolInfo.depts.map((dept) => (
                  <div key={dept.id} className="rounded-xl bg-white border border-[#eaece4] p-4 flex flex-col justify-between">
                    <span className="font-bold text-[14px] text-[#1a1d1a]">{dept.name}</span>
                    <div className="text-[12px] mt-2 pt-2 border-t border-[#eaece4] text-[#6e766b]">
                      HOD: <strong className="text-[#1a1d1a]">{dept.hod_user_id ? displayNameByUserId(dept.hod_user_id) : 'Not assigned'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BULK IMPORT & EXAMINER MAPPING                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {canManageAccounts && (
            <div className="fp-card space-y-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                  Bulk Data Upload (Students, Lecturers & Library Staff)
                </h3>
                <p className="text-[13px] text-[#6e766b] mt-1">
                  Upload CSV/XLSX files to bulk create or update students, lecturers, and library staff. All columns match the single <strong>+ Add user</strong> form.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/templates/students_template.xlsx"
                  download="students_template.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dcdfd6] text-xs font-medium text-[#1a1d1a] hover:bg-[#f0f4ea]"
                >
                  <Download className="size-3.5" /> Students Template (.xlsx)
                </a>
                <a
                  href="/templates/lecturers_template.xlsx"
                  download="lecturers_template.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dcdfd6] text-xs font-medium text-[#1a1d1a] hover:bg-[#f0f4ea]"
                >
                  <Download className="size-3.5" /> Lecturers Template (.xlsx)
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = [
                      'Full Name,Staff ID,Email,Role,School,Department',
                      'Akosua Boateng,LIB-1001,akosua.boateng@gimpa.edu.gh,librarian,GIMPA Library,Library Services',
                      'Kwesi Mensah,LIB-1002,kwesi.mensah@gimpa.edu.gh,head_library,GIMPA Library,Library Services',
                    ].join('\n')
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'library_staff_template.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dcdfd6] text-xs font-medium text-[#1a1d1a] hover:bg-[#f0f4ea] cursor-pointer"
                >
                  <Download className="size-3.5" /> Library Staff Template (.csv)
                </button>
              </div>

              {/* Column Requirements Guide matching + Add user */}
              <div className="p-3.5 rounded-xl bg-white border border-[#eaece4] space-y-2.5 text-[12px]">
                <div className="font-bold text-[#1a1d1a]">
                  Required & Supported Columns (Identical to + Add User):
                </div>
                <div className="space-y-1.5 text-[#6e766b]">
                  <div>
                    <strong className="text-[#1a1d1a]">1. Students:</strong>{' '}
                    <code>Student Name</code>*, <code>Student ID</code>*, <code>School Email</code>* (<code>@gimpa.edu.gh</code> / <code>@st.gimpa.edu.gh</code>), <code>School</code>*, <code>Department</code>*, <code>Programme</code>, <code>Certification Type</code> (Undergraduate / Master's / PhD), <code>Block Code</code> (e.g. A1), <code>Year</code>
                  </div>
                  <div>
                    <strong className="text-[#1a1d1a]">2. Lecturers:</strong>{' '}
                    <code>Lecturer Name</code>*, <code>Lecturer ID</code> (Staff ID), <code>Lecturer Email</code>* (<code>@gimpa.edu.gh</code>), <code>School</code>*, <code>Department</code>*, <code>Role</code> (optional, e.g. <code>lecturer|project_supervisor</code>), <code>Specialization</code>, <code>Research Interests</code>, <code>Max Student Ceiling</code> (default 5), <code>Year</code>
                  </div>
                  <div>
                    <strong className="text-[#1a1d1a]">3. Library Staff:</strong>{' '}
                    <code>Full Name</code>*, <code>Staff ID</code>, <code>Email</code>* (<code>@gimpa.edu.gh</code>), <code>Role</code> (<code>librarian</code> or <code>head_library</code>), <code>School</code> (defaults to <em>GIMPA Library</em>), <code>Department</code> (defaults to <em>Library Services</em>)
                  </div>
                </div>
              </div>

              <form onSubmit={handleBulkImport} className="space-y-4">
                {fileInput('Students File (.csv / .xlsx)', studentsFile, setStudentsFile)}
                {fileInput('Lecturers File (.csv / .xlsx)', lecturersFile, setLecturersFile)}
                {fileInput('Library Staff File (.csv / .xlsx)', libraryFile, setLibraryFile)}
                <Button type="submit" disabled={isBulkUploading}>
                  {isBulkUploading ? 'Importing...' : '+ Run bulk import'}
                </Button>
                {bulkUploadMessage && <p className="text-xs font-semibold text-[#3b7a57]">{bulkUploadMessage}</p>}
                {bulkSummary && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#eaece4] space-y-2 text-xs">
                    {(['students', 'lecturers', 'library'] as const).map((key) => {
                      const part = bulkSummary[key]
                      if (!part || (part.imported_or_updated === 0 && part.errors.length === 0)) return null
                      return (
                        <div key={key} className="space-y-1">
                          <div className="font-bold capitalize text-[#1a1d1a]">
                            {key}: {part.imported_or_updated} imported/updated · {part.emailed_sent} welcome email(s) queued
                          </div>
                          {part.errors.length > 0 && (
                            <ul className="list-disc pl-4 text-[#c93b2b] space-y-0.5 max-h-28 overflow-y-auto">
                              {part.errors.slice(0, 10).map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </form>
            </div>
          )}

          {canBatchAssignExaminers && (
            <div className="fp-card space-y-5">
              <div>
                <h3 className="text-[18px] font-bold text-[#1a1d1a]">
                  Automated Batch Examiner Mapping
                </h3>
                <p className="text-[13px] text-[#6e766b] mt-1">
                  Upload a batch file mapping Student_ID, Internal_Examiner_ID, and External_Examiner_ID.
                </p>
              </div>

              <div className="flex gap-2">
                <a
                  href="/templates/examiner_batch_mapping_template.xlsx"
                  download="examiner_batch_mapping_template.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dcdfd6] text-xs font-medium text-[#1a1d1a] hover:bg-[#f0f4ea]"
                >
                  <Download className="size-3.5" /> Examiner Template (.xlsx)
                </a>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!examinerFile) return
                  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                  if (!token) return
                  setIsExaminerBulkUploading(true)
                  setExaminerBulkMessage('')
                  setExaminerBulkSummary(null)
                  try {
                    const res = await apiBulkAssignExaminers(examinerFile, token)
                    setExaminerBulkSummary(res)
                    setExaminerBulkMessage(`Successfully processed ${res.successful} out of ${res.total_processed} examiner assignments!`)
                  } catch (err) {
                    setExaminerBulkMessage(extractErrorMessage(err))
                  } finally {
                    setIsExaminerBulkUploading(false)
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="examiner-batch-file">Batch Examiner Mapping File (.csv / .xlsx)</Label>
                  <Input
                    id="examiner-batch-file"
                    type="file"
                    accept=".csv,.xlsx,.xlsm"
                    onChange={(e) => setExaminerFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button type="submit" disabled={!examinerFile || isExaminerBulkUploading}>
                  {isExaminerBulkUploading ? 'Mapping...' : '+ Upload & map examiners'}
                </Button>
                {examinerBulkMessage && <p className="text-xs font-semibold text-[#3b7a57]">{examinerBulkMessage}</p>}
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOGS (Matches FinPlanner Image 2 & 10 Clean White Modals)              */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => { if (!open) setSelectedAccount(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Account details</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4 text-[13px] pt-2" style={{ color: 'var(--text-main)' }}>
              {/* Top User Summary Row */}
              <div
                className="flex items-center justify-between gap-4 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="fp-avatar">
                    {(selectedAccount.name || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold truncate" style={{ color: 'var(--text-main)' }}>
                      {selectedAccount.name}
                    </div>
                    <div className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {selectedAccount.email}
                    </div>
                  </div>
                </div>
                <Badge variant={selectedAccount.isActive ? 'default' : 'destructive'}>
                  {selectedAccount.isActive ? 'Active' : 'Pending'}
                </Badge>
              </div>

              {/* Structured Details Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Primary Role / Position
                  </span>
                  <span className="font-bold text-[13.5px]" style={{ color: 'var(--text-main)' }}>
                    {roleChipLabel(selectedAccount.role)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Student / Staff ID
                  </span>
                  <span className="font-mono font-bold text-[13.5px]" style={{ color: 'var(--text-main)' }}>
                    {selectedAccount.schoolId}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    School / Faculty
                  </span>
                  <span className="font-semibold text-[13px]" style={{ color: 'var(--text-main)' }}>
                    {selectedAccount.school}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Department
                  </span>
                  <span className="font-semibold text-[13px]" style={{ color: 'var(--text-main)' }}>
                    {selectedAccount.department}
                  </span>
                </div>

                {selectedAccount.program && selectedAccount.program !== '-' && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                      Programme
                    </span>
                    <span className="font-semibold text-[13px]" style={{ color: 'var(--text-main)' }}>
                      {selectedAccount.program}
                    </span>
                  </div>
                )}

                {selectedAccount.specialization && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                      Specialization Domain
                    </span>
                    <span className="font-semibold text-[13px]" style={{ color: 'var(--text-main)' }}>
                      {selectedAccount.specialization}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Assigned Roles
                  </span>
                  <span className="font-semibold text-[12.5px]" style={{ color: 'var(--text-main)' }}>
                    {Array.from(
                      new Set(
                        (selectedAccount.roles.length > 0 ? selectedAccount.roles : [selectedAccount.role])
                          .filter((r) => !(selectedAccount.role !== 'student' && r === 'student'))
                          .map(roleChipLabel)
                      )
                    ).join(', ')}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Created Date
                  </span>
                  <span className="font-semibold text-[12.5px]" style={{ color: 'var(--text-main)' }}>
                    {selectedAccount.createdAt !== '-'
                      ? new Date(selectedAccount.createdAt).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const acc = selectedAccount
                    setSelectedAccount(null)
                    handleOpenResetPassword(acc)
                  }}
                >
                  <Key className="size-3.5 mr-1.5" />
                  Reset Password
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const acc = selectedAccount
                    setSelectedAccount(null)
                    handleOpenEditAccount(acc)
                  }}
                >
                  <Pencil className="size-3.5 mr-1.5" />
                  Edit Account
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) {
            resetCreateForm()
            setCreateMessage('')
            setCreatedAccountResult(null)
            setCopiedCreatedPass(false)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createdAccountResult ? 'Account credentials' : 'New user'}
            </DialogTitle>
          </DialogHeader>

          {createdAccountResult ? (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-[#fafbf8] border border-[#eaece4] space-y-3">
                <div className="flex items-center gap-2 text-[#3b7a57] font-bold text-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>Account Created Successfully</span>
                </div>
                <p className="text-[#6e766b]">
                  Registered <strong>{createdAccountResult.user.full_name || createdAccountResult.user.email}</strong> ({createdAccountResult.user.email}).
                </p>

                {createdAccountResult.temporary_password && (
                  <div className="space-y-1.5">
                    <Label>Temporary Sign-in Password</Label>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#e2e5dc]">
                      <span className="font-mono font-bold text-sm text-[#1a1d1a]">
                        {createdAccountResult.temporary_password}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (createdAccountResult.temporary_password) {
                            navigator.clipboard.writeText(createdAccountResult.temporary_password)
                            setCopiedCreatedPass(true)
                            setTimeout(() => setCopiedCreatedPass(false), 2000)
                          }
                        }}
                      >
                        {copiedCreatedPass ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setCreateDialogOpen(false)
                  setCreatedAccountResult(null)
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="create-full-name">Full Name *</Label>
                  <Input
                    id="create-full-name"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="e.g. Ama Mensah"
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">
                    {createForm.role === 'external_examiner' ? 'Email Address *' : 'School / Official Email *'}
                  </Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder={createForm.role === 'student' ? 'name@st.gimpa.edu.gh' : 'name@gimpa.edu.gh'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role *</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value) => {
                      const nextRole = value as ApiUserRole
                      setCreateForm((prev) => ({
                        ...prev,
                        role: nextRole,
                        school:
                          nextRole === 'librarian' || nextRole === 'head_library'
                            ? prev.school || 'GIMPA Library'
                            : prev.school === 'GIMPA Library'
                              ? ''
                              : prev.school,
                        department:
                          nextRole === 'librarian' || nextRole === 'head_library'
                            ? prev.department || 'Library Services'
                            : prev.department === 'Library Services'
                              ? ''
                              : prev.department,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {isHodOrCoordOnly ? (
                        <SelectItem value="external_examiner">External Examiner</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="project_supervisor">Project Supervisor</SelectItem>
                          <SelectItem value="project_coordinator">Project Coordinator</SelectItem>
                          <SelectItem value="hod">HOD</SelectItem>
                          <SelectItem value="dean">Dean</SelectItem>
                          <SelectItem value="deputy_rector">Deputy Rector</SelectItem>
                          <SelectItem value="librarian">Librarian (Library Staff)</SelectItem>
                          <SelectItem value="head_library">Head Librarian</SelectItem>
                          <SelectItem value="external_examiner">External Examiner</SelectItem>
                          <SelectItem value="system_admin">System Admin</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-school-id">
                    {createForm.role === 'student' ? 'Student ID *' : 'Staff / Lecturer ID'}
                  </Label>
                  <Input
                    id="create-school-id"
                    value={createForm.school_id}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, school_id: e.target.value }))}
                    placeholder={createForm.role === 'student' ? 'e.g. 22001122' : 'e.g.LEC-104 or LIB-101'}
                  />
                </div>
              </div>

              {/* School & Department for Students and Lecturers/Faculty */}
              {['student', 'member', 'lecturer', 'project_supervisor', 'project_coordinator', 'hod', 'dean'].includes(createForm.role) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>School *</Label>
                    <Select
                      value={createForm.school}
                      onValueChange={(value) => setCreateForm((prev) => ({ ...prev, school: value, department: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {effectiveSchoolOptions.map((school) => (
                          <SelectItem key={school.id} value={school.label}>{school.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department *</Label>
                    <Select
                      value={createForm.department}
                      onValueChange={(value) => setCreateForm((prev) => ({ ...prev, department: value }))}
                      disabled={!createForm.school}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDepartmentsForSchool(createForm.school, departments).map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Student-Specific Fields (Matches Students Bulk Upload Columns) */}
              {(createForm.role === 'student' || createForm.role === 'member') && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="create-program">Programme</Label>
                      <Input
                        id="create-program"
                        value={createForm.program}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, program: e.target.value }))}
                        placeholder="e.g. BSc Computer Science / MSc IT"
                      />
                    </div>
                    <div>
                      <Label>Certification Type</Label>
                      <Select
                        value={createForm.certification_type}
                        onValueChange={(value) => setCreateForm((prev) => ({ ...prev, certification_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                          <SelectItem value="Master's">Master's</SelectItem>
                          <SelectItem value="Postgraduate Diploma">Postgraduate Diploma</SelectItem>
                          <SelectItem value="PhD">PhD / Doctoral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="create-block-code">Block Code</Label>
                      <Input
                        id="create-block-code"
                        value={createForm.block_code}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, block_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. A1, A2, B1, F1, T1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-year">Academic Year</Label>
                      <Input
                        id="create-year"
                        type="number"
                        value={createForm.year}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, year: e.target.value }))}
                        placeholder="e.g. 2026"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer / Academic Faculty Specific Fields (Matches Lecturers Bulk Upload Columns) */}
              {['lecturer', 'project_supervisor', 'project_coordinator', 'hod', 'dean'].includes(createForm.role) && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="create-specialization">Specialization Domain</Label>
                      <Input
                        id="create-specialization"
                        value={createForm.specialization}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, specialization: e.target.value }))}
                        placeholder="e.g. Machine Learning, Cybersecurity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-ceiling">Max Student Ceiling (Quota)</Label>
                      <Input
                        id="create-ceiling"
                        type="number"
                        min={1}
                        max={50}
                        value={createForm.max_student_ceiling}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, max_student_ceiling: Number(e.target.value) || 5 }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="create-interests">Research Interests</Label>
                      <Input
                        id="create-interests"
                        value={createForm.research_interests}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, research_interests: e.target.value }))}
                        placeholder="e.g. AI, Cloud Computing, Governance"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-lec-year">Year</Label>
                      <Input
                        id="create-lec-year"
                        type="number"
                        value={createForm.year}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, year: e.target.value }))}
                        placeholder="e.g. 2026"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Library Staff Specific Fields (Matches Library Staff Bulk Upload Columns) */}
              {(createForm.role === 'librarian' || createForm.role === 'head_library') && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="create-lib-school">School / Unit</Label>
                    <Input
                      id="create-lib-school"
                      value={createForm.school}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, school: e.target.value }))}
                      placeholder="GIMPA Library"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-lib-dept">Department</Label>
                    <Input
                      id="create-lib-dept"
                      value={createForm.department}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))}
                      placeholder="Library Services"
                    />
                  </div>
                </div>
              )}

              {createMessage && (
                <p className="text-xs text-[#c93b2b] font-medium">{createMessage}</p>
              )}

              <Button onClick={() => void handleCreateAccount()} disabled={createBusy} className="w-full h-11 font-bold">
                {createBusy ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Account Dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editAccount && (
            <div className="space-y-4 pt-2">
              {editError && <p className="text-xs text-[#c93b2b]">{editError}</p>}
              {editSuccess && <p className="text-xs text-[#3b7a57] font-semibold">{editSuccess}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Primary Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val) => {
                      const newPrimary = val as ApiUserRole
                      setEditForm((prev) => ({
                        ...prev,
                        role: newPrimary,
                        roles: Array.from(new Set([newPrimary, ...prev.roles])),
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="project_supervisor">Project Supervisor</SelectItem>
                      <SelectItem value="project_coordinator">Project Coordinator</SelectItem>
                      <SelectItem value="hod">HOD</SelectItem>
                      <SelectItem value="dean">Dean</SelectItem>
                      <SelectItem value="deputy_rector">Deputy Rector</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="external_examiner">External Examiner</SelectItem>
                      <SelectItem value="system_admin">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, is_active: val === 'active' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {['lecturer', 'project_supervisor'].includes(editForm.role) && (
                <div className="p-4 rounded-xl bg-[#fafbf8] border border-[#eaece4] space-y-3">
                  <div>
                    <Label>Specialization Domain</Label>
                    <Input
                      value={editForm.specialization}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, specialization: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Max Advisee Quota Ceiling</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={editForm.max_student_ceiling}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, max_student_ceiling: Number(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleSaveEditAccount} disabled={editingBusy} className="w-full h-11 font-bold">
                {editingBusy ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetAccount} onOpenChange={(open) => { if (!open) setResetAccount(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          {resetAccount && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-[#fafbf8] border border-[#eaece4]">
                <p className="font-bold text-[#1a1d1a]">{resetAccount.name}</p>
                <p className="text-[#6e766b]">{resetAccount.email}</p>
              </div>

              {resetError && <p className="text-[#c93b2b]">{resetError}</p>}

              {resetResult ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#dce7d0] space-y-2">
                    <p className="font-bold text-[#1a1d1a]">{resetResult.message}</p>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#eaece4]">
                      <span className="font-mono font-bold text-sm">{resetResult.new_password}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(resetResult.new_password)
                          setCopiedPass(true)
                          setTimeout(() => setCopiedPass(false), 2000)
                        }}
                      >
                        {copiedPass ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => setResetAccount(null)}>Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetForm.send_email}
                      onChange={(e) => setResetForm((prev) => ({ ...prev, send_email: e.target.checked }))}
                    />
                    <span>Send new credentials via email</span>
                  </label>
                  <Button className="w-full h-11 font-bold" onClick={handleExecuteResetPassword} disabled={resettingBusy}>
                    {resettingBusy ? 'Resetting...' : 'Reset password'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Broadcast Dialog */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Broadcast announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {broadcastError && <p className="text-xs text-[#c93b2b]">{broadcastError}</p>}
            {broadcastSuccess && <p className="text-xs text-[#3b7a57] font-semibold">{broadcastSuccess}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role Filter</Label>
                <Select
                  value={broadcastFilter.role}
                  onValueChange={(val) => {
                    const updated = { ...broadcastFilter, role: val }
                    setBroadcastFilter(updated)
                    void fetchBroadcastPreview(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="lecturer">Lecturers / Supervisors</SelectItem>
                    <SelectItem value="hod">HODs</SelectItem>
                    <SelectItem value="dean">Deans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matched Recipients</Label>
                <div className="h-11 px-3.5 rounded-lg bg-[#fafbf8] border border-[#eaece4] flex items-center text-[13px] font-bold text-[#1a1d1a]">
                  {selectedRecipientIds.length} recipient(s) selected
                </div>
              </div>
            </div>

            <div>
              <Label>Subject</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Announcement subject..."
              />
            </div>

            <div>
              <Label>Message</Label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type announcement message..."
                className="w-full p-3 rounded-lg border border-[#e2e5dc] bg-white text-[13px] text-[#1a1d1a]"
              />
            </div>

            <Button
              onClick={handleSendAdminBroadcast}
              disabled={sendingBroadcast || selectedRecipientIds.length === 0 || !broadcastSubject.trim() || !broadcastMessage.trim()}
              className="w-full h-11 font-bold"
            >
              {sendingBroadcast ? 'Sending...' : `Send to ${selectedRecipientIds.length} recipient(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
