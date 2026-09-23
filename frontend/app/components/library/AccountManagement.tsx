import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useAuth } from '../../context/AuthContext'
import {
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
  apiListDepartmentSupervisors,
  apiListUsers,
  apiRemoveUserRole,
  apiRemoveDepartmentSupervisor,
  apiUpdateUserRole,
  apiAdminUpdateUser,
  apiAdminResetPassword,
  apiAdminBroadcastPreview,
  apiAdminSendBroadcast,
  apiBulkAssignExaminers,
  apiDownloadBulkExaminerTemplate,
  apiDownloadStudentsTemplate,
  apiDownloadLecturersTemplate,
  type ApiDepartment,
  type ApiDepartmentSupervisor,
  type ApiImportAccountsSummary,
  type ApiBulkAssignSummary,
  type ApiUser,
  type ApiUserRole,
  type ApiUserUpdatePayload,
  type ApiAdminPasswordResetResponse,
  type ApiBroadcastRecipientPreview,
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
  Sparkles,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react'

interface ManagedAccount {
  id: number
  email: string
  schoolId: string
  school: string
  name: string
  department: string
  program: string
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
    role: user.role || (user.is_admin ? 'librarian' : 'student'),
    roles: normalizedRoles,
    isActive: user.is_active,
    mustChangePassword: user.must_change_password,
    createdAt: user.created_at || '-',
  }
}

function roleChipLabel(role: ApiUserRole): string {
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
  const canManageAccounts = hasRole('system_admin')
  const canBatchAssignExaminers = hasRole('hod') || hasRole('project_coordinator') || hasRole('system_admin')
  const canCreateExternalExaminer = hasRole('hod') || hasRole('project_coordinator') || hasRole('system_admin')
  const isHodOrCoordOnly = (hasRole('hod') || hasRole('project_coordinator')) && !hasRole('system_admin')
  const canAssignDean = hasRole('system_admin')
  const canAssignHod = hasRole('dean')
  const canAssignCoordinators = hasRole('hod')
  const canAssignSupervisors = hasRole('project_coordinator') || hasRole('hod') || hasRole('system_admin')
  const canManageAssignments = canAssignDean || canAssignHod || canAssignCoordinators || canAssignSupervisors
  const canViewAssignments = hasRole('system_admin') || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator') || hasRole('lecturer')
  const canManage = canManageAccounts || canManageAssignments || canViewAssignments || canBatchAssignExaminers
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
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    role: 'student' as ApiUserRole,
    school_id: '',
    school: '',
    department: '',
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

  const filteredAccounts = accounts.filter((acc) => {
    if (accountRoleFilter !== 'ALL') {
      const matchRole = acc.role === accountRoleFilter || acc.roles.includes(accountRoleFilter as ApiUserRole)
      if (!matchRole) return false
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
    void fetchBroadcastPreview(broadcastFilter)
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
        },
        accessToken
      )
      setBroadcastSuccess(
        `✓ ${res.message} (${res.notifications_created} notifications created, ${res.emails_queued} emails queued)`
      )
      setBroadcastSubject('')
      setBroadcastMessage('')
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
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-xs"
        />
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )

  const loadAccounts = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setLoadingError('Missing session token. Please sign in again.')
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
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setLoadingError('Missing session token. Please sign in again.')
      return
    }

    try {
      const [deptItems, users] = await Promise.all([
        apiListDepartments(accessToken),
        apiListUsers(accessToken, { limit: 200, is_active: true }),
      ])
      setDepartments(deptItems)
      setCandidateUsers(users)

      if (!selectedDepartmentId && deptItems.length > 0) {
        setSelectedDepartmentId(String(deptItems[0].id))
      }
    } catch (err) {
      setLoadingError(extractErrorMessage(err))
    }
  }

  const loadDepartmentSupervisors = async (departmentId: number) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
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
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setLoadingError('Missing session token. Please sign in again.')
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
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setLoadingError('Missing session token. Please sign in again.')
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
      certification_type: 'Undergraduate',
      block_code: 'A1',
      year: String(new Date().getFullYear()),
    })
  }

  const handleCreateAccount = async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setCreateMessage('Missing session token. Please sign in again.')
      return
    }
    if (!createForm.email.trim()) {
      setCreateMessage('Email is required.')
      return
    }
    if (!createForm.full_name.trim()) {
      setCreateMessage('Full name is required.')
      return
    }

    const needsSchoolAndId = createForm.role === 'student' || createForm.role === 'member'
    const needsDepartment = ['lecturer', 'staff', 'project_coordinator', 'hod'].includes(createForm.role)
    if (needsSchoolAndId && (!createForm.school.trim() || !createForm.school_id.trim())) {
      setCreateMessage('School and School ID are required for students.')
      return
    }
    if (needsDepartment && (!createForm.school.trim() || !createForm.department.trim())) {
      setCreateMessage('School and Department are required for this role.')
      return
    }

    setCreateBusy(true)
    setCreateMessage('')
    try {
      const payload = {
        email: createForm.email.trim(),
        role: createForm.role,
        full_name: createForm.full_name.trim(),
        school_id: createForm.school_id.trim() || undefined,
        school: createForm.school.trim() || undefined,
        department: createForm.department.trim() || undefined,
        certification_type: createForm.certification_type.trim() || undefined,
        block_code: createForm.block_code.trim() || undefined,
        year: createForm.year ? Number(createForm.year) : undefined,
      }
      const result = isHodOrCoordOnly
        ? await apiCreateExternalExaminer(payload, accessToken)
        : await apiAdminCreateUser(payload, accessToken)
      setCreateMessage(
        result.email_sent
          ? `Account created for ${result.user.email}. Login details were sent by email.`
          : `Account created for ${result.user.email}, but email delivery failed. Check SMTP settings.`,
      )
      await loadAccounts()
      resetCreateForm()
      setCreateDialogOpen(false)
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
  const deanVisibleSchools = new Set(
    candidateUsers
      .map((u) => normalizeText(u.school))
      .filter((s) => !!s),
  )
  const deanMappedDepartments = departments.filter((d) => d.dean_user_id === user?.id)
  const visibleDepartments = departments.filter((d) => {
    if (hasRole('system_admin')) {
      if (!selectedSchoolKey) return true
      const selectedSchoolNormalized = selectedSchoolKey.trim().toLowerCase()
      const idMatch = String(d.institution_id) === selectedSchoolKey
      const nameMatch = (d.institution_name || '').trim().toLowerCase() === selectedSchoolNormalized
      return idMatch || nameMatch
    }
    if (hasRole('dean')) {
      const mapped = d.dean_user_id === user?.id
      const schoolName = normalizeText(d.institution_name)
      const sameSchool = !!actorSchool && schoolName === actorSchool
      const inDeanVisibleSchool = schoolName ? deanVisibleSchools.has(schoolName) : false
      if (mapped) return true
      if (actorSchool) return schoolName === actorSchool
      if (inDeanVisibleSchool) return true
      return deanMappedDepartments.length === 0
    }
    if (hasRole('hod') || hasRole('project_coordinator')) {
      const sameDepartment = normalizeText(d.name) === actorDepartment
      const mapped = d.hod_user_id === user?.id
      return sameDepartment || mapped
    }
    return true
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
    if (!hasRole('system_admin')) return true
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
  const isOverviewPrivileged = hasRole('system_admin') || hasRole('dean')
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
    if (!isOverviewPrivileged && userSchoolNormalized) {
      return school.schoolKey === userSchoolNormalized
    }
    return true
  })
  const userHasRole = (u: ApiUser, role: ApiUserRole) =>
    (u.role === role) || ((u.roles || []).includes(role))
  const targetDepartmentName = (normalizeText(selectedDepartment?.name) || actorDepartment)
  const hodCandidates = candidateUsers.filter((u) => {
    const lecturerOnly = userHasRole(u, 'lecturer')
    if (!lecturerOnly) return false

    const sameDepartment = normalizeText(u.department) === targetDepartmentName

    if (hasRole('dean')) {
      // Dean assigns HOD from lecturers in the selected department.
      return sameDepartment
    }
    return sameDepartment
  })
  const supervisorCandidates = candidateUsers.filter((u) => {
    const lecturerOnly = userHasRole(u, 'lecturer')
    const notAlreadyAssigned = !departmentSupervisors.some((s) => s.supervisor_user_id === u.id)

    if (!lecturerOnly || !notAlreadyAssigned) return false
    if (hasRole('project_coordinator')) {
      // Project Coordinator appoints supervisors from lecturers in selected department.
      return normalizeText(u.department) === targetDepartmentName
    }
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
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <Lock className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold">Access Denied</p>
              <p className="text-sm text-muted-foreground">Only system admins, deans, HODs, and project coordinators can access this area</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Administration
          </h2>
          <p className="text-muted-foreground mt-1">Manage accounts and department role assignment workflow.</p>
        </div>
      </div>

      {canManageAccounts && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Bulk Data Upload (Students & Lecturers)
                </h3>
                <CardDescription>
                  Upload CSV/XLSX spreadsheet files to bulk create or update students, lecturers, and librarians.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/templates/students_template.xlsx"
                  download="students_template.xlsx"
                  className="btn btn-outline-secondary btn-sm text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  Students Template (.xlsx)
                </a>
                <a
                  href="/templates/students_template.csv"
                  download="students_template.csv"
                  className="btn btn-outline-secondary btn-sm text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  Students Template (.csv)
                </a>
                <a
                  href="/templates/lecturers_template.xlsx"
                  download="lecturers_template.xlsx"
                  className="btn btn-outline-secondary btn-sm text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-purple-500" />
                  Lecturers Template (.xlsx)
                </a>
                <a
                  href="/templates/lecturers_template.csv"
                  download="lecturers_template.csv"
                  className="btn btn-outline-secondary btn-sm text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-500" />
                  Lecturers Template (.csv)
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkImport} className="space-y-4">
              {fileInput(
                'Students File (Student Name, Student ID, School Email, School, Department, Certification Type, Block Code, Year)',
                studentsFile,
                setStudentsFile,
              )}
              {fileInput('Lecturers File (Lecturer Name, Lecturer ID, School Email, School, Department)', lecturersFile, setLecturersFile)}
              {fileInput('Library Staff File (Name, School Email, Staff ID, Role)', libraryFile, setLibraryFile)}
              <p className="text-xs text-muted-foreground">
                Staff passwords are auto-generated by the system and sent by email. Users must change password on first login.
              </p>
              <Button type="submit" disabled={isBulkUploading} size="sm">
                {isBulkUploading ? 'Importing Data...' : 'Run Bulk Import'}
              </Button>
              {bulkUploadMessage && (
                <p className="text-sm font-medium text-primary mt-2">{bulkUploadMessage}</p>
              )}
              {bulkSummary && (
                <div className="text-sm space-y-2 border rounded-md p-3 bg-muted/30 mt-3">
                  {bulkSummary.students && (
                    <div>
                      <p className="font-semibold text-xs">
                        Students: {bulkSummary.students.imported_or_updated} imported/updated, emailed: {bulkSummary.students.emailed_sent || 0}
                      </p>
                      {bulkSummary.students.errors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                          {bulkSummary.students.errors.slice(0, 10).map((err, idx) => (
                            <li key={`student-err-${idx}`}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {bulkSummary.lecturers && (
                    <div>
                      <p className="font-semibold text-xs">
                        Lecturers: {bulkSummary.lecturers.imported_or_updated} imported/updated, emailed: {bulkSummary.lecturers.emailed_sent || 0}
                      </p>
                      {bulkSummary.lecturers.errors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                          {bulkSummary.lecturers.errors.slice(0, 10).map((err, idx) => (
                            <li key={`lecturer-err-${idx}`}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {canBatchAssignExaminers && (
        <div className="ta-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-3">
            <div>
              <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-400" />
                Phase 3: Automated Batch Examiner Mapping (CSV / Excel)
              </h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Upload a batch file mapping Student_ID (or Thesis ID), Internal_Examiner_ID, and External_Examiner_ID to automatically assign examiners and route theses into examination.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/templates/examiner_batch_mapping_template.xlsx"
                download="examiner_batch_mapping_template.xlsx"
                className="btn-ta-glass text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-200 hover:bg-white/10 no-underline font-medium"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                Template (.xlsx)
              </a>
              <a
                href="/templates/examiner_batch_mapping_template.csv"
                download="examiner_batch_mapping_template.csv"
                className="btn-ta-glass text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-200 hover:bg-white/10 no-underline font-medium"
              >
                <Download className="h-3.5 w-3.5 text-purple-400" />
                Template (.csv)
              </a>
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="examiner-batch-file" className="text-xs font-semibold text-slate-300">
                Select Batch Examiner Mapping File (.csv or .xlsx)
              </Label>
              <Input
                id="examiner-batch-file"
                type="file"
                accept=".csv,.xlsx,.xlsm"
                onChange={(e) => setExaminerFile(e.target.files?.[0] || null)}
                className="h-10 text-xs"
              />
            </div>
            <Button type="submit" disabled={!examinerFile || isExaminerBulkUploading} className="btn-ta-purple text-xs">
              {isExaminerBulkUploading ? 'Mapping Examiners...' : 'Upload & Map Examiner Batch'}
            </Button>
            {examinerBulkMessage && (
              <p className="text-xs font-medium text-purple-300 m-0 mt-2">{examinerBulkMessage}</p>
            )}
            {examinerBulkSummary && (
              <div className="text-xs space-y-2 border border-purple-500/30 rounded-xl p-3 bg-purple-950/20 text-slate-200 mt-3">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <FileCheck className="h-4 w-4" />
                  Examiner Batch Mapping Summary: {examinerBulkSummary.successful} / {examinerBulkSummary.total_processed} successfully mapped!
                </div>
                {examinerBulkSummary.errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs text-red-300 max-h-36 overflow-y-auto">
                    {examinerBulkSummary.errors.map((err, idx) => (
                      <li key={`exam-err-${idx}`}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {canViewAssignments && (
        <div className="ta-card p-5 space-y-4">
          <div className="border-b pb-3" style={{borderColor:'var(--border-color)'}}>
            <h3 className="text-base font-bold m-0" style={{color:'var(--text-main)'}}>Institutional Role Overview</h3>
            <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>
              Overview of Deans and Head of Departments (HODs) across schools.
            </p>
          </div>

          <div className="space-y-4">
            {schoolsOverviewData.map((schoolInfo) => (
              <div key={schoolInfo.schoolName} className="rounded-xl border p-4 space-y-3" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-1" style={{borderColor:'var(--border-color)'}}>
                  <h4 className="font-bold text-sm text-purple-500 m-0">{schoolInfo.schoolName}</h4>
                  <div className="text-xs">
                    <span style={{color:'var(--text-muted)'}}>Dean: </span>
                    <span className="font-semibold" style={{color:'var(--text-main)'}}>
                      {schoolInfo.deanIds.length === 0
                        ? 'Not assigned'
                        : schoolInfo.deanIds.map(uid => displayNameByUserId(uid)).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {schoolInfo.depts.map((dept) => (
                    <div key={dept.id} className="rounded-xl border p-3 flex flex-col justify-between" style={{backgroundColor:'var(--bg-subtle)',borderColor:'var(--border-color)'}}>
                      <span className="font-bold text-xs" style={{color:'var(--text-main)'}}>{dept.name}</span>
                      <div className="text-[11px] mt-2 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
                        <span className="font-medium" style={{color:'var(--text-muted)'}}>HOD: </span>
                        <span className="text-purple-500 font-bold">
                          {dept.hod_user_id ? displayNameByUserId(dept.hod_user_id) : 'Not assigned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {schoolsOverviewData.length === 0 && (
              <p className="text-xs text-center py-4" style={{color:'var(--text-muted)'}}>No schools or departments found.</p>
            )}
          </div>
        </div>
      )}

      {canManageAssignments && (
        <div className="ta-card p-5 space-y-4">
          <div className="border-b pb-3" style={{borderColor:'var(--border-color)'}}>
            <h3 className="text-base font-bold m-0" style={{color:'var(--text-main)'}}>Department Role Assignment</h3>
            <p className="text-xs m-0 mt-0.5" style={{color:'var(--text-muted)'}}>Admin assigns Dean, Dean assigns HOD, HOD appoints Project Coordinator(s), and Project Coordinator(s) appoint project supervisors.</p>
          </div>
          <div className="space-y-4">
            {loadingError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {loadingError}
              </div>
            )}
            {canAssignDean && (
              <div className="space-y-2.5 rounded-xl border p-4" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wider m-0">Assign Dean</p>
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
                <Select value={selectedDeanUserId} onValueChange={setSelectedDeanUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dean user (lecturers only)" />
                  </SelectTrigger>
                  <SelectContent>
                    {deanCandidates.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.full_name || u.email} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => void handleAssignDeanBySchool()} disabled={savingAssignment} className="btn-ta-purple text-xs">
                  Assign Dean
                </Button>
              </div>
            )}
            {visibleDepartments.length > 0 && (
              <div className="space-y-4">
                <div>
                  {!hasRole('system_admin') && (
                    <>
                      <p className="text-xs font-bold mb-1.5" style={{color:'var(--text-sub)'}}>Department</p>
                      <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {visibleDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                {selectedDepartment && (
                  <div className="rounded-xl border p-3 text-xs space-y-1" style={{backgroundColor:'var(--bg-subtle)',borderColor:'var(--border-color)'}}>
                    <p className="m-0"><span style={{color:'var(--text-muted)'}}>Current Dean:</span> <span className="font-semibold" style={{color:'var(--text-main)'}}>{displayNameByUserId(selectedDepartment.dean_user_id)}</span></p>
                    <p className="m-0"><span style={{color:'var(--text-muted)'}}>Current HOD:</span> <span className="font-bold text-purple-500">{displayNameByUserId(selectedDepartment.hod_user_id)}</span></p>
                  </div>
                )}

                {canAssignHod && selectedDepartment && (
                  <div className="space-y-2.5 rounded-xl border p-4" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wider m-0">Assign HOD</p>
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
                    <Button onClick={() => void handleAssignHod()} disabled={savingAssignment} className="btn-ta-purple text-xs">Assign HOD</Button>
                  </div>
                )}

                {canAssignSupervisors && selectedDepartment && (
                  <div className="space-y-3 rounded-xl border p-4" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wider m-0">Appoint Project Supervisors</p>
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
                    <Button onClick={() => void handleAddSupervisor()} disabled={savingAssignment} className="btn-ta-purple text-xs">Add Supervisor</Button>

                    <div className="space-y-2 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
                      <p className="text-xs font-bold m-0" style={{color:'var(--text-sub)'}}>Current Supervisors</p>
                      {departmentSupervisors.length === 0 ? (
                        <p className="text-xs m-0" style={{color:'var(--text-muted)'}}>No supervisors assigned yet.</p>
                      ) : (
                        departmentSupervisors.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-xl border p-2.5 text-xs" style={{backgroundColor:'var(--bg-subtle)',borderColor:'var(--border-color)'}}>
                            <span className="font-semibold" style={{color:'var(--text-main)'}}>{displayNameByUserId(item.supervisor_user_id)}</span>
                            <button
                              type="button"
                              onClick={() => void handleRemoveSupervisor(item.supervisor_user_id)}
                              disabled={savingAssignment}
                              className="px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 rounded-lg border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {canAssignCoordinators && selectedDepartment && (
                  <div className="space-y-3 rounded-xl border p-4" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wider m-0">Appoint Project Coordinators</p>
                    <Select value={selectedCoordinatorUserId} onValueChange={setSelectedCoordinatorUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project coordinator user" />
                      </SelectTrigger>
                      <SelectContent>
                        {coordinatorCandidates.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name || u.email} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => void handleAddCoordinator()} disabled={savingAssignment} className="btn-ta-purple text-xs">Add Project Coordinator</Button>

                    <div className="space-y-2 pt-2 border-t" style={{borderColor:'var(--border-color)'}}>
                      <p className="text-xs font-bold m-0" style={{color:'var(--text-sub)'}}>Current Project Coordinators</p>
                      {currentDepartmentCoordinators.length === 0 ? (
                        <p className="text-xs m-0" style={{color:'var(--text-muted)'}}>No project coordinators assigned yet.</p>
                      ) : (
                        currentDepartmentCoordinators.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-xl border p-2.5 text-xs" style={{backgroundColor:'var(--bg-subtle)',borderColor:'var(--border-color)'}}>
                            <span className="font-semibold" style={{color:'var(--text-main)'}}>{item.full_name || item.email} ({item.email})</span>
                            <button
                              type="button"
                              onClick={() => void handleRemoveCoordinator(item.id)}
                              disabled={savingAssignment}
                              className="px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 rounded-lg border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {visibleDepartments.length === 0 && !canAssignDean && (
              <div className="rounded-xl border p-3 text-xs" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)',color:'var(--text-muted)'}}>
                No departments are configured yet. Department role assignment needs departments to be created/imported first.
              </div>
            )}
            {assignmentMessage && <p className="text-xs font-semibold text-purple-500 m-0">{assignmentMessage}</p>}
            {schoolDeanSummary.length > 0 && (
              <div className="space-y-2 pt-3 border-t" style={{borderColor:'var(--border-color)'}}>
                <p className="text-xs font-bold m-0" style={{color:'var(--text-sub)'}}>Current Deans by School</p>
                {schoolDeanSummary.map((row) => (
                  <div key={row.institutionId} className="flex items-center justify-between rounded-xl border p-2.5 text-xs" style={{backgroundColor:'var(--bg-subtle)',borderColor:'var(--border-color)'}}>
                    <span className="font-semibold" style={{color:'var(--text-main)'}}>{row.schoolName}</span>
                    <span className="text-purple-500 font-semibold font-mono">{row.deanLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {canCreateExternalExaminer && (
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 m-0">
                <Users className="h-5 w-5 text-blue-500" />
                Individual Account Creation
              </h3>
              <CardDescription className="text-xs">
                Create a single student, staff, or examiner account and automatically dispatch welcome credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button onClick={() => { setCreateDialogOpen(true); setCreateMessage('') }} size="sm" className="w-full sm:w-auto">
                + Create New Account
              </Button>
              {createMessage && <p className="text-xs text-muted-foreground m-0">{createMessage}</p>}
            </CardContent>
          </Card>
        )}

        {canManageAccounts && (
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader className="pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 m-0 text-purple-600 dark:text-purple-400">
                <Megaphone className="h-5 w-5 text-purple-500" />
                Bulk Broadcast Messaging &amp; Announcements
              </h3>
              <CardDescription className="text-xs">
                Dispatch targeted in-app notices and bulk emails filtered by Role, School, Department, Program, or Thesis Phase.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                onClick={handleOpenBroadcastModal}
                size="sm"
                className="btn-ta-purple flex items-center gap-2 w-full sm:w-auto"
              >
                <Send className="h-4 w-4" />
                📢 Compose Bulk Broadcast
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {canManageAccounts && (
      <div className="space-y-4">
        {/* Search and Filters Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email, school ID, department, or degree program..."
              value={accountSearchTerm}
              onChange={(e) => setAccountSearchTerm(e.target.value)}
              className="pl-11 h-9 text-xs"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select value={accountRoleFilter} onValueChange={setAccountRoleFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
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
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="h-9 px-3 text-xs whitespace-nowrap flex items-center">
              {filteredAccounts.length} / {accounts.length} Accounts
            </Badge>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">Loading accounts...</CardContent>
          </Card>
        ) : filteredAccounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No accounts match the current filter criteria.
            </CardContent>
          </Card>
        ) : (
          filteredAccounts.map((account) => (
            <Card
              key={account.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 m-0">{account.name}</h3>
                      <Badge variant={account.role === 'student' || account.role === 'member' ? 'outline' : 'secondary'} className="text-xs font-semibold">
                        {roleChipLabel(account.role)}
                      </Badge>
                      {account.roles
                        .filter((r) => r !== account.role)
                        .map((extraRole) => (
                          <Badge key={`${account.id}-${extraRole}`} variant="outline" className="text-xs">
                            {roleChipLabel(extraRole)}
                          </Badge>
                        ))}
                      <Badge variant="outline" className={account.isActive ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-xs' : 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-xs'}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {account.isActive ? 'Active' : 'Pending Activation'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <p className="m-0"><span className="font-medium text-slate-700 dark:text-slate-300">Email:</span> {account.email}</p>
                      <p className="m-0"><span className="font-medium text-slate-700 dark:text-slate-300">School ID:</span> {account.schoolId}</p>
                      <p className="m-0"><span className="font-medium text-slate-700 dark:text-slate-300">Dept:</span> {account.department}</p>
                      {account.program && account.program !== '-' && (
                        <p className="m-0 col-span-full"><span className="font-medium text-slate-700 dark:text-slate-300">Program:</span> {account.program}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex items-center gap-1"
                      onClick={() => setSelectedAccount(account)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      onClick={() => handleOpenEditAccount(account)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                      onClick={() => handleOpenResetPassword(account)}
                    >
                      <Key className="h-3.5 w-3.5" />
                      Reset Pass
                    </Button>
                    {!account.isActive && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => void handleActivateAccount(account.id)}
                        disabled={activatingId === account.id}
                      >
                        {activatingId === account.id ? 'Activating...' : 'Activate'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDeleteAccount(account.id)}
                      disabled={deletingId === account.id}
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}

      {canManageAccounts && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Activation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accounts.filter((a) => !a.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accounts.filter((a) => a.isActive).length}</p>
          </CardContent>
        </Card>
      </div>
      )}

      <Dialog open={!!selectedAccount} onOpenChange={(open) => { if (!open) setSelectedAccount(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Name:</span> {selectedAccount.name}</p>
              <p><span className="font-medium">Email:</span> {selectedAccount.email}</p>
              <p><span className="font-medium">Role:</span> {selectedAccount.role}</p>
              <p><span className="font-medium">School:</span> {selectedAccount.school}</p>
              <p><span className="font-medium">Department / Academic Area:</span> {selectedAccount.department}</p>
              <p><span className="font-medium">School ID:</span> {selectedAccount.schoolId}</p>
              <p><span className="font-medium">Status:</span> {selectedAccount.isActive ? 'Active' : 'Pending activation'}</p>
              <p><span className="font-medium">Created:</span> {selectedAccount.createdAt === '-' ? '-' : new Date(selectedAccount.createdAt).toLocaleString()}</p>
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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="create-full-name">Full Name</Label>
              <Input
                id="create-full-name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Ama Mensah"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="name@gimpa.edu.gh"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, role: value as ApiUserRole }))
                }
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
                      <SelectItem value="librarian">Librarian</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Role-Specific ID Field */}
            <div className="space-y-1">
              <Label htmlFor="create-school-id">
                {createForm.role === 'student' ? 'Student ID *' : createForm.role === 'lecturer' ? 'Lecturer ID *' : 'Staff ID *'}
              </Label>
              <Input
                id="create-school-id"
                value={createForm.school_id}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, school_id: e.target.value }))}
                placeholder={
                  createForm.role === 'student'
                    ? 'e.g. 22001122'
                    : createForm.role === 'lecturer'
                      ? 'e.g. LEC-001'
                      : 'e.g. LIB-001'
                }
              />
            </div>

            {/* School & Department for Student and Lecturer */}
            {(createForm.role === 'student' || createForm.role === 'lecturer') && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="create-school">School *</Label>
                  <Select
                    value={createForm.school}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, school: value, department: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school..." />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveSchoolOptions.map((school) => (
                        <SelectItem key={school.id} value={school.label}>
                          {school.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="create-department">Department *</Label>
                  <Select
                    value={createForm.department}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, department: value }))
                    }
                    disabled={!createForm.school}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={createForm.school ? "Select department..." : "Select school first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getDepartmentsForSchool(createForm.school, departments).map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Additional Student-Only Fields: Certification Type, Block Code, Year */}
            {createForm.role === 'student' && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="create-cert">Certification Type</Label>
                  <Select
                    value={createForm.certification_type}
                    onValueChange={(value) => setCreateForm((prev) => ({ ...prev, certification_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select certification type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Undergraduate">Undergraduate (BSc/BA/LLB)</SelectItem>
                      <SelectItem value="Master's">Master's (MSc/MA/MBA)</SelectItem>
                      <SelectItem value="PhD">Doctorate (PhD)</SelectItem>
                      <SelectItem value="Postgraduate Diploma">Postgraduate Diploma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="create-block">Block Code</Label>
                    <Input
                      id="create-block"
                      value={createForm.block_code}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, block_code: e.target.value }))}
                      placeholder="e.g. A1, B1, T1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="create-year">Year / Level</Label>
                    <Input
                      id="create-year"
                      type="number"
                      value={createForm.year}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, year: e.target.value }))}
                      placeholder="e.g. 2026"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateAccount()} disabled={createBusy}>
                {createBusy ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
            {createMessage && <p className="text-xs text-muted-foreground">{createMessage}</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. Edit User Account Details Dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Edit Account Details
            </DialogTitle>
          </DialogHeader>
          {editAccount && (
            <div className="space-y-3 text-xs pt-1">
              {editError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g. Ama Mensah"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-email" className="text-xs">Institutional Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="name@gimpa.edu.gh"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-school-id" className="text-xs">School / Staff ID</Label>
                <Input
                  id="edit-school-id"
                  value={editForm.school_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, school_id: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g. 22001122 or LEC-001"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">School / Faculty</Label>
                <Select
                  value={editForm.school}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, school: val, department: '' }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select school..." />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveSchoolOptions.map((school) => (
                      <SelectItem key={school.id} value={school.label} className="text-xs">
                        {school.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Department / Academic Unit</Label>
                <Select
                  value={editForm.department}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, department: val }))}
                  disabled={!editForm.school}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={editForm.school ? "Select department..." : "Select school first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getDepartmentsForSchool(editForm.school, departments).map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-xs">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-program" className="text-xs">Academic Degree Programme</Label>
                <Input
                  id="edit-program"
                  value={editForm.program}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, program: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g. Doctor of Philosophy in Business Administration (PhD) or MBA"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Primary Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, role: val as ApiUserRole }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select primary role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student" className="text-xs">Student</SelectItem>
                      <SelectItem value="lecturer" className="text-xs">Lecturer</SelectItem>
                      <SelectItem value="project_supervisor" className="text-xs">Project Supervisor</SelectItem>
                      <SelectItem value="project_coordinator" className="text-xs">Project Coordinator</SelectItem>
                      <SelectItem value="hod" className="text-xs">HOD</SelectItem>
                      <SelectItem value="dean" className="text-xs">Dean</SelectItem>
                      <SelectItem value="librarian" className="text-xs">Librarian</SelectItem>
                      <SelectItem value="external_examiner" className="text-xs">External Examiner</SelectItem>
                      <SelectItem value="system_admin" className="text-xs">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Account Status</Label>
                  <Select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, is_active: val === 'active' }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs text-emerald-600 font-semibold">Active</SelectItem>
                      <SelectItem value="inactive" className="text-xs text-amber-600 font-semibold">Pending Activation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditAccount(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEditAccount} disabled={editingBusy}>
                  {editingBusy ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Admin Reset Password Dialog */}
      <Dialog open={!!resetAccount} onOpenChange={(open) => { if (!open) setResetAccount(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Key className="h-5 w-5 text-amber-500" />
              Reset Account Password
            </DialogTitle>
          </DialogHeader>
          {resetAccount && (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 m-0">{resetAccount.name}</p>
                <p className="text-muted-foreground m-0">{resetAccount.email} • {resetAccount.schoolId}</p>
                <p className="text-muted-foreground m-0">Role: <span className="font-medium text-slate-700 dark:text-slate-300">{roleChipLabel(resetAccount.role)}</span></p>
              </div>

              {resetError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetResult ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 m-0 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      {resetResult.message}
                    </p>
                    <p className="text-muted-foreground text-xs m-0">
                      {resetResult.email_sent
                        ? 'An email with the updated password and sign-in instructions has been queued for delivery.'
                        : 'Email delivery was skipped. Please provide the password below to the user:'}
                    </p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/30">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        {resetResult.new_password}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                        onClick={() => {
                          navigator.clipboard.writeText(resetResult.new_password)
                          setCopiedPass(true)
                          setTimeout(() => setCopiedPass(false), 2000)
                        }}
                      >
                        {copiedPass ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedPass ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => setResetAccount(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="reset-auto"
                        name="reset-type"
                        checked={resetForm.auto_generate}
                        onChange={() => setResetForm((prev) => ({ ...prev, auto_generate: true }))}
                        className="cursor-pointer"
                      />
                      <label htmlFor="reset-auto" className="cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                        Auto-generate strong temporary password (Recommended)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="reset-custom"
                        name="reset-type"
                        checked={!resetForm.auto_generate}
                        onChange={() => setResetForm((prev) => ({ ...prev, auto_generate: false }))}
                        className="cursor-pointer"
                      />
                      <label htmlFor="reset-custom" className="cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                        Specify custom password
                      </label>
                    </div>
                  </div>

                  {!resetForm.auto_generate && (
                    <div className="space-y-1 pl-5">
                      <Label htmlFor="custom-pass" className="text-xs">New Password *</Label>
                      <Input
                        id="custom-pass"
                        type="text"
                        value={resetForm.custom_password}
                        onChange={(e) => setResetForm((prev) => ({ ...prev, custom_password: e.target.value }))}
                        placeholder="Enter secure new password"
                        className="h-8 text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">Min 8 chars with uppercase, lowercase, number &amp; symbol.</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={resetForm.must_change_password}
                        onChange={(e) => setResetForm((prev) => ({ ...prev, must_change_password: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Enforce password change immediately upon next login</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={resetForm.send_email}
                        onChange={(e) => setResetForm((prev) => ({ ...prev, send_email: e.target.checked }))}
                        className="rounded"
                      />
                      <span>Send new credentials and portal sign-in link via email</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => setResetAccount(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={handleExecuteResetPassword}
                      disabled={resettingBusy || (!resetForm.auto_generate && !resetForm.custom_password.trim())}
                    >
                      {resettingBusy ? 'Resetting...' : 'Execute Password Reset'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Bulk Broadcast Messaging & Filtered Announcements Dialog */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-purple-600 dark:text-purple-400">
              <Megaphone className="h-5 w-5 text-purple-500" />
              Bulk Broadcast Messaging &amp; Announcements Hub
            </DialogTitle>
            <CardDescription className="text-xs">
              Targeted mass communication with multi-tier audience filters, recipient preview table, and dual delivery via in-app alerts and transactional email.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {broadcastError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{broadcastError}</span>
              </div>
            )}
            {broadcastSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            {/* Step 1: Filter Audience */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 m-0">
                  <Filter className="h-4 w-4 text-purple-500" />
                  Target Audience Filters
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs flex items-center gap-1"
                  onClick={() => {
                    const resetF = { role: 'all', school: 'all', department: 'all', program: 'all', phase: 'all', search: '' }
                    setBroadcastFilter(resetF)
                    void fetchBroadcastPreview(resetF)
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Role Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Role Cohort</Label>
                  <Select
                    value={broadcastFilter.role}
                    onValueChange={(val) => {
                      const updated = { ...broadcastFilter, role: val }
                      setBroadcastFilter(updated)
                      void fetchBroadcastPreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                      <SelectItem value="student" className="text-xs">Students (All)</SelectItem>
                      <SelectItem value="lecturer" className="text-xs">Lecturers / Supervisors</SelectItem>
                      <SelectItem value="project_coordinator" className="text-xs">Project Coordinators</SelectItem>
                      <SelectItem value="hod" className="text-xs">HODs</SelectItem>
                      <SelectItem value="dean" className="text-xs">Deans</SelectItem>
                      <SelectItem value="librarian" className="text-xs">Librarians</SelectItem>
                      <SelectItem value="external_examiner" className="text-xs">External Examiners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* School Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">School / Faculty</Label>
                  <Select
                    value={broadcastFilter.school}
                    onValueChange={(val) => {
                      const updated = { ...broadcastFilter, school: val, department: 'all' }
                      setBroadcastFilter(updated)
                      void fetchBroadcastPreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Schools</SelectItem>
                      {effectiveSchoolOptions.map((s) => (
                        <SelectItem key={s.id} value={s.label} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select
                    value={broadcastFilter.department}
                    onValueChange={(val) => {
                      const updated = { ...broadcastFilter, department: val }
                      setBroadcastFilter(updated)
                      void fetchBroadcastPreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                      {(broadcastFilter.school === 'all'
                        ? departments.map((d) => d.name)
                        : getDepartmentsForSchool(broadcastFilter.school, departments)
                      ).map((dept) => (
                        <SelectItem key={dept} value={dept} className="text-xs">{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Program Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Degree Programme</Label>
                  <Select
                    value={broadcastFilter.program}
                    onValueChange={(val) => {
                      const updated = { ...broadcastFilter, program: val }
                      setBroadcastFilter(updated)
                      void fetchBroadcastPreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Academic Programs</SelectItem>
                      <SelectItem value="phd" className="text-xs">🎓 PhD / Doctorate</SelectItem>
                      <SelectItem value="mba" className="text-xs">📙 MBA (Master of Business Admin)</SelectItem>
                      <SelectItem value="msc" className="text-xs">📘 MSc / MA (Master of Science)</SelectItem>
                      <SelectItem value="undergraduate" className="text-xs">📗 Undergraduate (BSc / BA / LLB)</SelectItem>
                      <SelectItem value="diploma" className="text-xs">📕 Postgraduate Diploma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Thesis Phase Filter (Students) */}
                <div className="space-y-1">
                  <Label className="text-xs">Thesis Pipeline Stage</Label>
                  <Select
                    value={broadcastFilter.phase}
                    onValueChange={(val) => {
                      const updated = { ...broadcastFilter, phase: val }
                      setBroadcastFilter(updated)
                      void fetchBroadcastPreview(updated)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Thesis Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Stages / Non-filtered</SelectItem>
                      <SelectItem value="p1" className="text-xs">Phase 1: Proposals</SelectItem>
                      <SelectItem value="p2" className="text-xs">Phase 2: Allocation</SelectItem>
                      <SelectItem value="p3" className="text-xs">Phase 3: Chapter Writing</SelectItem>
                      <SelectItem value="p4" className="text-xs">Phase 4: Examination</SelectItem>
                      <SelectItem value="p5" className="text-xs">Phase 5: Sign-Off &amp; Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Text Filter */}
                <div className="space-y-1">
                  <Label className="text-xs">Search Name / Email / ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={broadcastFilter.search}
                      onChange={(e) => {
                        const updated = { ...broadcastFilter, search: e.target.value }
                        setBroadcastFilter(updated)
                        void fetchBroadcastPreview(updated)
                      }}
                      placeholder="Type keyword..."
                      className="h-8 pl-9 text-xs"
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Matched Audience Table & Fine Selection */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Audience Preview</span>
                  <Badge variant="secondary" className="text-xs">
                    {broadcastRecipients.length} Matching
                  </Badge>
                  <Badge className="bg-purple-600 text-white text-xs">
                    {selectedRecipientIds.length} Selected
                  </Badge>
                  {loadingPreview && <span className="text-muted-foreground text-[11px] animate-pulse">Updating...</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setSelectedRecipientIds(broadcastRecipients.map((r) => r.id))}
                  >
                    Select All ({broadcastRecipients.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setSelectedRecipientIds([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg bg-background">
                {broadcastRecipients.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground m-0">No users match the selected filters.</p>
                ) : (
                  <div className="divide-y text-xs">
                    {broadcastRecipients.map((r) => {
                      const isSelected = selectedRecipientIds.includes(r.id)
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-purple-500/5' : ''
                          }`}
                          onClick={() => {
                            setSelectedRecipientIds((prev) =>
                              isSelected ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                            )
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="rounded text-purple-600 cursor-pointer"
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 m-0">
                                {r.full_name || r.email}
                              </p>
                              <p className="text-muted-foreground text-[11px] m-0">
                                {r.email} • ID: {r.school_id || 'N/A'} • {r.department || r.school || 'General'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.phase && (
                              <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">
                                {r.phase}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {roleChipLabel(r.role as ApiUserRole)}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Message Content */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-purple-500" />
                Message Content &amp; Delivery Channels
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-xs">Announcement Category</Label>
                  <Select value={broadcastType} onValueChange={setBroadcastType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general" className="text-xs">📢 General Announcement</SelectItem>
                      <SelectItem value="urgent" className="text-xs">⚠️ Urgent Action Required</SelectItem>
                      <SelectItem value="milestone" className="text-xs">⏰ Milestone / Submission Deadline</SelectItem>
                      <SelectItem value="system" className="text-xs">⚙️ System Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="broadcast-subject" className="text-xs">Subject / Headline *</Label>
                  <Input
                    id="broadcast-subject"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="e.g. Mandatory Thesis Proposal Submission Deadline for Semester 2"
                    className="h-8 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="broadcast-message" className="text-xs">Message Body *</Label>
                <textarea
                  id="broadcast-message"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={5}
                  placeholder="Enter detailed notice, instructions, or milestone deadlines for the targeted recipients..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-sans"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={broadcastIncludeEmail}
                    onChange={(e) => setBroadcastIncludeEmail(e.target.checked)}
                    className="rounded text-purple-600 cursor-pointer"
                  />
                  <span>Also dispatch transactional email with direct portal sign-in link</span>
                </label>
                <span className="text-[11px] text-muted-foreground">In-app notifications are always sent</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setBroadcastModalOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                className="btn-ta-purple flex items-center gap-2"
                onClick={handleSendAdminBroadcast}
                disabled={sendingBroadcast || selectedRecipientIds.length === 0 || !broadcastSubject.trim() || !broadcastMessage.trim()}
              >
                <Send className="h-4 w-4" />
                {sendingBroadcast
                  ? 'Dispatching Broadcast...'
                  : `Send to ${selectedRecipientIds.length} Recipient${selectedRecipientIds.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
