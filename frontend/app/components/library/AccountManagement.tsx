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
} from '../../lib/api'
import { Users, Trash2, CheckCircle, Lock, Upload, FileText, FileSpreadsheet, FileCheck, Download } from 'lucide-react'

interface ManagedAccount {
  id: number
  email: string
  schoolId: string
  school: string
  name: string
  department: string
  role: ApiUserRole
  roles: ApiUserRole[]
  isActive: boolean
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
    role: user.role || (user.is_admin ? 'librarian' : 'student'),
    roles: normalizedRoles,
    isActive: user.is_active,
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
  try {
    const parsed = JSON.parse(err.message) as { detail?: string }
    return parsed.detail || err.message
  } catch {
    return err.message
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
  const canAssignSupervisors = hasRole('project_coordinator')
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
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const blob = await apiDownloadStudentsTemplate('xlsx')
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'students_template.xlsx'
                      a.click()
                      window.URL.revokeObjectURL(url)
                    } catch (err) {
                      setBulkUploadMessage('Failed to download student template')
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  Students Template (.xlsx)
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const blob = await apiDownloadStudentsTemplate('csv')
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'students_template.csv'
                      a.click()
                      window.URL.revokeObjectURL(url)
                    } catch (err) {
                      setBulkUploadMessage('Failed to download student template')
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-blue-500" />
                  Students Template (.csv)
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const blob = await apiDownloadLecturersTemplate('xlsx')
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'lecturers_template.xlsx'
                      a.click()
                      window.URL.revokeObjectURL(url)
                    } catch (err) {
                      setBulkUploadMessage('Failed to download lecturer template')
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-purple-500" />
                  Lecturers Template (.xlsx)
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const blob = await apiDownloadLecturersTemplate('csv')
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'lecturers_template.csv'
                      a.click()
                      window.URL.revokeObjectURL(url)
                    } catch (err) {
                      setBulkUploadMessage('Failed to download lecturer template')
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-indigo-500" />
                  Lecturers Template (.csv)
                </Button>
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
              <Button
                size="sm"
                type="button"
                className="btn-ta-glass text-xs flex items-center gap-1.5"
                onClick={async () => {
                  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                  if (!token) return
                  try {
                    const blob = await apiDownloadBulkExaminerTemplate(token, 'xlsx')
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'examiner_batch_mapping_template.xlsx'
                    a.click()
                    window.URL.revokeObjectURL(url)
                  } catch (err) {
                    setExaminerBulkMessage('Failed to download Excel template')
                  }
                }}
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                Template (.xlsx)
              </Button>
              <Button
                size="sm"
                type="button"
                className="btn-ta-glass text-xs flex items-center gap-1.5"
                onClick={async () => {
                  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
                  if (!token) return
                  try {
                    const blob = await apiDownloadBulkExaminerTemplate(token, 'csv')
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'examiner_batch_mapping_template.csv'
                    a.click()
                    window.URL.revokeObjectURL(url)
                  } catch (err) {
                    setExaminerBulkMessage('Failed to download CSV template')
                  }
                }}
              >
                <Download className="h-3.5 w-3.5 text-purple-400" />
                Template (.csv)
              </Button>
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


      {canCreateExternalExaminer && (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create Account</h3>
          <CardDescription>Create one account and send default password to the user by email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => { setCreateDialogOpen(true); setCreateMessage('') }}>
            Create Account
          </Button>
          {createMessage && <p className="text-sm text-muted-foreground">{createMessage}</p>}
        </CardContent>
      </Card>
      )}

      {canManageAccounts && (
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">Loading accounts...</CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">No accounts found</CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card
              key={account.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAccount(account)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{account.name}</h3>
                      <Badge variant={account.role === 'student' || account.role === 'member' ? 'outline' : 'secondary'}>
                        {account.role === 'student' || account.role === 'member' ? 'Student' : account.role}
                      </Badge>
                      {account.roles
                        .filter((r) => ['dean', 'hod', 'project_supervisor'].includes(r) && r !== account.role)
                        .map((extraRole) => (
                          <Badge key={`${account.id}-${extraRole}`} variant="outline">
                            {roleChipLabel(extraRole)}
                          </Badge>
                        ))}
                      <Badge variant="outline" className={account.isActive ? 'text-green-700 bg-green-50 dark:bg-green-900/20' : ''}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {account.isActive ? 'Active' : 'Pending activation'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">School ID: {account.schoolId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedAccount(account) }}>
                      View
                    </Button>
                    {!account.isActive && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleActivateAccount(account.id) }}
                        disabled={activatingId === account.id}
                      >
                        {activatingId === account.id ? 'Activating...' : 'Activate'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); void handleDeleteAccount(account.id) }}
                      disabled={deletingId === account.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
    </div>
  )
}
