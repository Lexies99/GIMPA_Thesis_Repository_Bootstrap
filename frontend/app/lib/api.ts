const localHost =
  typeof window !== "undefined" ? window.location.hostname : ""
const DEFAULT_API_URL = ""

const baseUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ?? DEFAULT_API_URL
export const apiBase = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api` : "/api"

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  must_change_password?: boolean
}
export type ApiEditorConfigResponse = any;

export type ApiUserRole =
  | "student"
  | "member"
  | "lecturer"
  | "staff"
  | "project_coordinator"
  | "project_supervisor"
  | "hod"
  | "dean"
  | "system_admin"
  | "librarian"
  | "head_library"
  | "external_examiner"

export interface ApiUser {
  id: number
  email: string
  school_id: string | null
  school: string | null
  full_name: string | null
  department: string | null
  is_active: boolean
  is_admin: boolean
  role: ApiUserRole
  roles?: ApiUserRole[]
  must_change_password?: boolean
  created_at: string | null
}

export interface ApiAdminCreateUserPayload {
  email: string
  role: ApiUserRole
  full_name?: string
  school_id?: string
  school?: string
  department?: string
  certification_type?: string
  block_code?: string
  year?: number
}

export interface ApiAdminCreateUserResult {
  user: ApiUser
  email_sent: boolean
}

export interface ApiListUsersParams {
  skip?: number
  limit?: number
  email?: string
  is_active?: boolean
  is_admin?: boolean
  role?: ApiUserRole
}

export interface ApiAuthor {
  id: number
  name: string
  email: string | null
  affiliation: string | null
  author_order: number
}

export interface ApiPaper {
  id: number
  title: string
  abstract: string | null
  status: string
  discipline: string | null
  university: string | null
  year: number
  document_type: string | null
  publication_type?: string | null
  doi?: string | null
  license: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  views: number
  downloads: number
  citations: number
  rating: number | null
  review_comments: string | null
  supervisor_id: number | null
  department_id?: number | null
  abstract_word_count?: number | null
  work_mode?: "individual" | "group"
  created_at: string | null
  authors: ApiAuthor[]
  tags: string[]
  
  // 5-phase properties & Dynamic Steps
  topic_status?: string | null
  topic_description?: string | null
  steps?: ApiStepItem[]
  latest_proposal?: ApiProposalItem | null
  latest_correction?: ApiCorrectionItem | null
  project_coordinator_id?: number | null
  internal_examiner_id?: number | null
  external_examiner_id?: number | null
  ch1_student_done?: boolean
  ch2_student_done?: boolean
  ch3_student_done?: boolean
  ch4_student_done?: boolean
  ch5_student_done?: boolean
  ch1_supervisor_approved?: boolean
  ch2_supervisor_approved?: boolean
  ch3_supervisor_approved?: boolean
  ch4_supervisor_approved?: boolean
  ch5_supervisor_approved?: boolean
  combined_thesis_student_done?: boolean
  combined_thesis_supervisor_approved?: boolean
  internal_score?: number | null
  external_score?: number | null
  examiner_corrections?: string | null
  examiner_result_file_name?: string | null
  internal_result_file_name?: string | null
  external_result_file_name?: string | null
  lecturer_approved_at?: string | null
  project_coordinator_approved_at?: string | null
  hod_approved_at?: string | null
}

export interface ApiStepItem {
  id: number
  step_number: number
  title: string | null
  file_url: string
  status: "submitted" | "approved" | "revise" | string
  supervisor_comment?: string | null
  created_at?: string | null
}

export interface ApiProposalItem {
  id: number
  file_url: string
  status: "pending" | "accepted" | "revise" | string
  supervisor_comment?: string | null
  version: number
}

export interface ApiCorrectionItem {
  id: number
  file_url: string
  version: number
  supervisor_status: "pending" | "approved" | "revise" | string
  coordinator_status?: "pending" | "approved" | "revise" | string
  hod_status: "pending" | "approved" | "revise" | string
  submitted_at?: string | null
}

export interface ApiPaperAnnotation {
  id: number
  paper_id: number
  author_id: number
  author_name?: string
  author_initials?: string
  location: string | null
  text: string
  resolved: boolean
  created_at: string | null
}

export interface ApiCreatePaperPayload {
  title: string
  abstract?: string
  discipline?: string
  university?: string
  year?: number
  document_type?: string
  publication_type?: "thesis" | "dissertation" | "systematic_review" | "article" | "other"
  license?: string
  file_name?: string
  supervisor_id?: number
  department_id?: number
  work_mode?: "individual" | "group"
  tags?: string[]
  authors?: Array<{ name: string; email?: string; affiliation?: string }>
}

export interface ApiUploadPaperPayload extends ApiCreatePaperPayload {
  file: File
}

export interface ApiPaperStats {
  total_papers: number
  total_views: number
  total_downloads: number
  pending_reviews: number
}

export interface ApiNotification {
  id: number
  user_id: number
  paper_id: number | null
  type: string
  message: string
  is_read: boolean
  created_at: string | null
}

export interface ApiStudent {
  student_id: string
  full_name: string
  email: string
  school: string | null
  department: string | null
  certification_type: string | null
  block_code: string | null
  year: number | null
}

export interface ApiImportSummaryUnit {
  imported_or_updated: number
  emailed_sent?: number
  emailed_failed?: number
  errors: string[]
}

export interface ApiImportAccountsSummary {
  students?: ApiImportSummaryUnit
  lecturers?: ApiImportSummaryUnit
  library?: ApiImportSummaryUnit
}

export interface ApiDepartment {
  id: number
  institution_id: number
  institution_name: string | null
  name: string
  hod_user_id: number | null
  dean_user_id: number | null
}

export interface ApiDepartmentSupervisor {
  id: number
  department_id: number
  supervisor_user_id: number
  active: boolean
}

export interface ApiOnlyOfficeEditorConfigResponse {
  document_server_url: string
  config: Record<string, unknown>
}

export interface ApiSupervisorReviewSummary {
  supervisor_user_id: number
  supervisor_name: string | null
  supervisor_email: string
  department: string | null
  reviews_done: number
  approvals_done: number
  students_count?: number
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    let message = text || response.statusText
    if (text) {
      try {
        const parsed = JSON.parse(text) as { detail?: string }
        if (parsed?.detail) {
          message = parsed.detail
        }
      } catch {}
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams()
  body.set("username", email)
  body.set("password", password)
  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  return handleResponse<TokenResponse>(response)
}

export async function apiRegister(
  email: string,
  password: string,
  fullName: string,
  role: ApiUserRole,
  schoolId?: string,
  school?: string,
  department?: string,
): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, full_name: fullName, school_id: schoolId, school, department }),
  })
  return handleResponse<ApiUser>(response)
}

export async function apiRefresh(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  return handleResponse<TokenResponse>(response)
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await fetch(`${apiBase}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export async function apiMe(accessToken: string): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiUser>(response)
}

export async function apiUpdateUser(
  userId: number,
  payload: { full_name?: string; school_id?: string; school?: string; department?: string; password?: string },
  accessToken: string,
): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<ApiUser>(response)
}

export async function apiAdminCreateUser(
  payload: ApiAdminCreateUserPayload,
  accessToken: string,
): Promise<ApiAdminCreateUserResult> {
  const response = await fetch(`${apiBase}/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<ApiAdminCreateUserResult>(response)
}

export async function apiListUsers(accessToken: string, params: ApiListUsersParams = {}): Promise<ApiUser[]> {
  const query = new URLSearchParams()
  if (typeof params.skip === "number") query.set("skip", String(params.skip))
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  if (params.email) query.set("email", params.email)
  if (typeof params.is_active === "boolean") query.set("is_active", String(params.is_active))
  if (typeof params.is_admin === "boolean") query.set("is_admin", String(params.is_admin))
  if (params.role) query.set("role", params.role)

  const response = await fetch(`${apiBase}/users${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiUser[]>(response)
}

export async function apiDeleteUser(userId: number, accessToken: string): Promise<void> {
  const response = await fetch(`${apiBase}/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

export async function apiUpdateUserRole(userId: number, role: ApiUserRole, accessToken: string): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role }),
  })
  return handleResponse<ApiUser>(response)
}

export async function apiAssignUserRole(userId: number, role: ApiUserRole, accessToken: string): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/${userId}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role }),
  })
  return handleResponse<ApiUser>(response)
}

export async function apiRemoveUserRole(userId: number, role: ApiUserRole, accessToken: string): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/${userId}/roles/${role}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return handleResponse<ApiUser>(response)
}

export async function apiActivateUser(userId: number, accessToken: string): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/${userId}/activate`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return handleResponse<ApiUser>(response)
}

export async function apiListPapers(params: {
  q?: string
  discipline?: string
  university?: string
  year?: number
  publication_type?: string
  department_id?: number
  status?: string
  sort?: string
  skip?: number
  limit?: number
  catalog?: boolean
} = {}): Promise<ApiPaper[]> {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.discipline) query.set("discipline", params.discipline)
  if (params.university) query.set("university", params.university)
  if (typeof params.year === "number") query.set("year", String(params.year))
  if (params.publication_type) query.set("publication_type", params.publication_type)
  if (typeof params.department_id === "number") query.set("department_id", String(params.department_id))
  if (params.status) query.set("status", params.status)
  if (params.sort) query.set("sort", params.sort)
  if (typeof params.skip === "number") query.set("skip", String(params.skip))
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  if (typeof params.catalog === "boolean") query.set("catalog", String(params.catalog))

  const response = await fetch(`${apiBase}/papers${query.toString() ? `?${query.toString()}` : ""}`)
  return handleResponse<ApiPaper[]>(response)
}

export async function apiGetPaper(paperId: number): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}`)
  return handleResponse<ApiPaper>(response)
}

export async function apiCreatePaper(payload: ApiCreatePaperPayload, accessToken: string): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiUploadPaper(payload: ApiUploadPaperPayload, accessToken: string): Promise<ApiPaper> {
  const form = new FormData()
  form.set("title", payload.title)
  if (payload.abstract) form.set("abstract", payload.abstract)
  if (payload.discipline) form.set("discipline", payload.discipline)
  if (payload.university) form.set("university", payload.university)
  if (typeof payload.year === "number") form.set("year", String(payload.year))
  if (payload.document_type) form.set("document_type", payload.document_type)
  if (payload.publication_type) form.set("publication_type", payload.publication_type)
  if (payload.license) form.set("license", payload.license)
  if (typeof payload.supervisor_id === "number") form.set("supervisor_id", String(payload.supervisor_id))
  if (typeof payload.department_id === "number") form.set("department_id", String(payload.department_id))
  if (payload.work_mode) form.set("work_mode", payload.work_mode)
  form.set("tags", JSON.stringify(payload.tags || []))
  form.set("authors", JSON.stringify(payload.authors || []))
  form.set("file", payload.file)

  const response = await fetch(`${apiBase}/papers/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiGetPendingPapers(accessToken: string): Promise<ApiPaper[]> {
  const response = await fetch(`${apiBase}/papers/pending`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper[]>(response)
}

export async function apiGetReviewedPapers(accessToken: string): Promise<ApiPaper[]> {
  const response = await fetch(`${apiBase}/papers/reviewed`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper[]>(response)
}

export async function apiGetDepartmentSupervisorReviewedPapers(accessToken: string): Promise<ApiPaper[]> {
  const response = await fetch(`${apiBase}/papers/department/supervisor-reviewed`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper[]>(response)
}

export async function apiGetDepartmentSupervisorReviewSummary(accessToken: string): Promise<ApiSupervisorReviewSummary[]> {
  const response = await fetch(`${apiBase}/papers/department/supervisor-review-summary`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiSupervisorReviewSummary[]>(response)
}

export async function apiGetRevisionPapers(accessToken: string): Promise<ApiPaper[]> {
  const response = await fetch(`${apiBase}/papers/revisions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper[]>(response)
}

export async function apiReviewPaper(
  paperId: number,
  decision: "approve" | "revision" | "reject",
  comments: string,
  accessToken: string,
): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ decision, comments }),
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiTrackPaperView(paperId: number): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/view`, {
    method: "POST",
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiTrackPaperDownload(paperId: number, accessToken: string): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/download`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiDownloadPaperFile(
  paperId: number,
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  let response = await fetch(`${apiBase}/papers/${paperId}/binary?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    // Fallback to legacy endpoint path.
    response = await fetch(`${apiBase}/papers/${paperId}/file?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  // Support both RFC 5987 (filename*=utf-8''...) and plain filename=...
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename =
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `paper-${paperId}`
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiDownloadReviewedPaperFile(
  paperId: number,
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/papers/${paperId}/reviewed-file?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename =
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `paper-${paperId}-reviewed`
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiHasReviewedPaperFile(
  paperId: number,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(`${apiBase}/papers/${paperId}/reviewed-file?t=${Date.now()}`, {
    method: "HEAD",
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return response.ok
}

export async function apiUploadCorrectedPaperFile(
  paperId: number,
  file: File,
  note: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("file", file)
  if (note.trim()) form.set("note", note.trim())
  const response = await fetch(`${apiBase}/papers/${paperId}/corrected-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiDownloadPaperFeedbackFile(
  paperId: number,
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/papers/${paperId}/feedback-file?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename =
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `paper-${paperId}-feedback.txt`
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiGetPaperEditorConfig(
  paperId: number,
  accessToken: string,
  docType: string = "paper",
): Promise<ApiOnlyOfficeEditorConfigResponse> {
  const response = await fetch(`${apiBase}/papers/${paperId}/editor-config?doc_type=${docType}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiOnlyOfficeEditorConfigResponse>(response)
}

export async function apiGetExaminerResultsExcelEditorConfig(
  accessToken: string,
): Promise<ApiOnlyOfficeEditorConfigResponse> {
  const response = await fetch(`${apiBase}/papers/examiner/results-excel-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiOnlyOfficeEditorConfigResponse>(response)
}

export async function apiGetStepEditorConfig(
  stepId: number,
  accessToken: string,
): Promise<ApiOnlyOfficeEditorConfigResponse> {
  const response = await fetch(`${apiBase}/theses/steps/${stepId}/editor-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiOnlyOfficeEditorConfigResponse>(response)
}


export async function apiGetPaperAnnotations(paperId: number, accessToken: string): Promise<ApiPaperAnnotation[]> {
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaperAnnotation[]>(response)
}

export async function apiCreatePaperAnnotation(
  paperId: number,
  payload: { text: string; location?: string },
  accessToken: string,
): Promise<ApiPaperAnnotation> {
  const form = new FormData()
  form.set("text", payload.text)
  if (payload.location?.trim()) form.set("location", payload.location.trim())
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaperAnnotation>(response)
}

export async function apiUpdatePaperAnnotation(
  paperId: number,
  annotationId: number,
  payload: { text?: string; resolved?: boolean },
  accessToken: string,
): Promise<ApiPaperAnnotation> {
  const form = new FormData()
  if (typeof payload.text === "string") form.set("text", payload.text)
  if (typeof payload.resolved === "boolean") form.set("resolved", String(payload.resolved))
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations/${annotationId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaperAnnotation>(response)
}

export async function apiDeletePaperAnnotation(
  paperId: number,
  annotationId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations/${annotationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

export async function apiGetPaperStats(): Promise<ApiPaperStats> {
  const response = await fetch(`${apiBase}/papers/stats`)
  return handleResponse<ApiPaperStats>(response)
}

export async function apiGetMyPapers(accessToken: string): Promise<ApiPaper[]> {
  const response = await fetch(`${apiBase}/papers/mine`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper[]>(response)
}

export async function apiListSupervisors(accessToken: string): Promise<ApiUser[]> {
  const response = await fetch(`${apiBase}/supervisors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiUser[]>(response)
}

export async function apiGetNotifications(accessToken: string): Promise<ApiNotification[]> {
  const response = await fetch(`${apiBase}/notifications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiNotification[]>(response)
}

export async function apiMarkNotificationRead(notificationId: number, accessToken: string): Promise<ApiNotification> {
  const response = await fetch(`${apiBase}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiNotification>(response)
}

export async function apiListStudents(accessToken: string, params: { skip?: number; limit?: number } = {}): Promise<ApiStudent[]> {
  const query = new URLSearchParams()
  if (typeof params.skip === "number") query.set("skip", String(params.skip))
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  const response = await fetch(`${apiBase}/students${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiStudent[]>(response)
}

export async function apiImportAccounts(
  accessToken: string,
  payload: {
    studentsFile?: File
    lecturersFile?: File
    libraryFile?: File
  },
): Promise<ApiImportAccountsSummary> {
  const form = new FormData()
  if (payload.studentsFile) form.set("students_file", payload.studentsFile)
  if (payload.lecturersFile) form.set("lecturers_file", payload.lecturersFile)
  if (payload.libraryFile) form.set("library_file", payload.libraryFile)
  const response = await fetch(`${apiBase}/admin/import-accounts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiImportAccountsSummary>(response)
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
  accessToken: string,
): Promise<ApiUser> {
  const response = await fetch(`${apiBase}/users/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  return handleResponse<ApiUser>(response)
}

export async function apiListDepartments(accessToken: string): Promise<ApiDepartment[]> {
  const response = await fetch(`${apiBase}/departments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiDepartment[]>(response)
}

export async function apiAssignDepartmentDean(
  departmentId: number,
  userId: number,
  accessToken: string,
): Promise<ApiDepartment> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/assign-dean`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  return handleResponse<ApiDepartment>(response)
}

export async function apiAssignDepartmentHod(
  departmentId: number,
  userId: number,
  accessToken: string,
): Promise<ApiDepartment> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/assign-hod`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ user_id: userId }),
  })
  return handleResponse<ApiDepartment>(response)
}

export async function apiListDepartmentSupervisors(
  departmentId: number,
  accessToken: string,
): Promise<ApiDepartmentSupervisor[]> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/supervisors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiDepartmentSupervisor[]>(response)
}

export async function apiAddDepartmentSupervisors(
  departmentId: number,
  supervisorUserIds: number[],
  accessToken: string,
): Promise<ApiDepartmentSupervisor[]> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/supervisors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ supervisor_user_ids: supervisorUserIds }),
  })
  return handleResponse<ApiDepartmentSupervisor[]>(response)
}

export async function apiRemoveDepartmentSupervisor(
  departmentId: number,
  supervisorUserId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/supervisors/${supervisorUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

export interface ApiPipelineStudent {
  paper_id: number
  index_number: string
  student_name: string
  program: string
  supervisor_name: string
  milestone_status: string
  title: string
  status: string
}

export interface ApiPipelinePhase {
  count: number
  students: ApiPipelineStudent[]
}

export interface ApiPipelineMetrics {
  phase1_proposals: ApiPipelinePhase
  phase2_allocation: ApiPipelinePhase
  phase3_chapters: ApiPipelinePhase
  phase4_examination: ApiPipelinePhase
  phase5_signoff: ApiPipelinePhase
}

export async function apiGetPipelineMetrics(accessToken: string): Promise<ApiPipelineMetrics> {
  const response = await fetch(`${apiBase}/papers/pipeline`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPipelineMetrics>(response)
}

export async function apiGetAnnotations(paperId: number, accessToken: string): Promise<ApiPaperAnnotation[]> {
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaperAnnotation[]>(response)
}

export async function apiAddAnnotation(
  paperId: number,
  text: string,
  location: string | undefined,
  accessToken: string,
): Promise<ApiPaperAnnotation> {
  const body = new FormData()
  body.append("text", text)
  if (location) body.append("location", location)

  const response = await fetch(`${apiBase}/papers/${paperId}/annotations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  })
  return handleResponse<ApiPaperAnnotation>(response)
}

export async function apiDeleteAnnotation(
  paperId: number,
  annotationId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(`${apiBase}/papers/${paperId}/annotations/${annotationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

function extensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes("wordprocessingml.document")) return ".docx"
  if (normalized.includes("msword")) return ".doc"
  if (normalized.includes("pdf")) return ".pdf"
  if (normalized.includes("zip")) return ".zip"
  return ""
}

function ensureDownloadExtension(filename: string, mimeType: string): string {
  if (/\.[a-z0-9]{2,8}$/i.test(filename)) return filename
  return `${filename}${extensionFromMime(mimeType)}`
}

export async function apiCreateExternalExaminer(
  payload: ApiAdminCreateUserPayload,
  accessToken: string,
): Promise<ApiAdminCreateUserResult> {
  const response = await fetch(`${apiBase}/users/external-examiner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  return handleResponse<ApiAdminCreateUserResult>(response)
}

export async function apiProposalDecision(
  paperId: number,
  decision: 'accepted' | 'revise',
  comment: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set('decision', decision)
  if (comment.trim()) form.set('comment', comment)
  const response = await fetch(`${apiBase}/theses/${paperId}/proposal/decision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSubmitProposal(
  paperId: number,
  file: File,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${apiBase}/theses/${paperId}/proposal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}



export async function apiDownloadStepFile(
  stepId: number,
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/theses/steps/${stepId}/file?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename =
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `step-${stepId}.docx`
  const blob = await response.blob()
  return { blob, filename }
}


export async function apiCompletePhase3(paperId: number, accessToken: string): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/complete-phase3`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiAssignExaminers(
  paperId: number,
  internalExaminerId: number,
  externalExaminerId: number,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("internal_examiner_id", String(internalExaminerId))
  form.set("external_examiner_id", String(externalExaminerId))
  const response = await fetch(`${apiBase}/papers/${paperId}/assign-examiners`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiUploadResults(
  paperId: number,
  payload: {
    internalScore?: number
    externalScore?: number
    examinerCorrections: string
    file?: File
  },
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  if (payload.internalScore !== undefined) form.set("internal_score", String(payload.internalScore))
  if (payload.externalScore !== undefined) form.set("external_score", String(payload.externalScore))
  form.set("examiner_corrections", payload.examinerCorrections)
  if (payload.file) {
    form.set("file", payload.file)
  }
  const response = await fetch(`${apiBase}/papers/${paperId}/upload-results`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiUploadCorrections(
  paperId: number,
  file: File,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("file", file)
  const response = await fetch(`${apiBase}/papers/${paperId}/upload-corrections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSubmitInSystemCorrections(
  paperId: number,
  accessToken: string,
): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/submit-in-system-corrections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSupervisorApproveCorrections(
  paperId: number,
  accessToken: string,
): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/papers/${paperId}/supervisor-approve-corrections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiCoordinatorApproveCorrections(
  paperId: number,
  decision: "approved" | "revise",
  comment: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("decision", decision)
  if (comment) form.set("comment", comment)
  const response = await fetch(`${apiBase}/papers/${paperId}/coordinator-approve-corrections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiHodApproveCorrections(
  paperId: number,
  decision: "approved" | "revise",
  comment: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("decision", decision)
  if (comment) form.set("comment", comment)
  const response = await fetch(`${apiBase}/papers/${paperId}/hod-approve-corrections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiDownloadExaminerScript(
  paperId: number,
  type: "internal" | "external",
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/papers/${paperId}/examiner-script/${type}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename = ensureDownloadExtension(
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `paper-${paperId}-${type}-examiner-script`,
    response.headers.get("Content-Type") || "",
  )
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiStudentUpdateChecklist(
  paperId: number,
  checklist: { ch1: boolean; ch2: boolean; ch3: boolean; ch4: boolean; ch5: boolean },
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("ch1", String(checklist.ch1))
  form.set("ch2", String(checklist.ch2))
  form.set("ch3", String(checklist.ch3))
  form.set("ch4", String(checklist.ch4))
  form.set("ch5", String(checklist.ch5))
  const response = await fetch(`${apiBase}/papers/${paperId}/chapters/student`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSupervisorUpdateChecklist(
  paperId: number,
  checklist: { ch1: boolean; ch2: boolean; ch3: boolean; ch4: boolean; ch5: boolean },
  accessToken: string,
  comments?: string,
  rejectedChapter?: number,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("ch1", String(checklist.ch1))
  form.set("ch2", String(checklist.ch2))
  form.set("ch3", String(checklist.ch3))
  form.set("ch4", String(checklist.ch4))
  form.set("ch5", String(checklist.ch5))
  if (comments?.trim()) form.set("comments", comments.trim())
  if (rejectedChapter) form.set("rejected_chapter", String(rejectedChapter))
  const response = await fetch(`${apiBase}/papers/${paperId}/chapters/supervisor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiUploadCombinedThesis(
  paperId: number,
  file: File,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("file", file)
  const response = await fetch(`${apiBase}/papers/${paperId}/upload-combined-thesis`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiUploadDraft(
  paperId: number,
  file: File,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("file", file)
  const response = await fetch(`${apiBase}/papers/${paperId}/upload-draft`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiDownloadApprovedZip(
  departmentId: number,
  accessToken: string,
  discipline?: string,
): Promise<{ blob: Blob; filename: string }> {
  let url = `${apiBase}/departments/${departmentId}/download-approved-zip?t=${Date.now()}`
  if (discipline?.trim()) {
    url += `&discipline=${encodeURIComponent(discipline.trim())}`
  }
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename = ensureDownloadExtension(
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `department-${departmentId}-approved-thesis.zip`,
    response.headers.get("Content-Type") || "",
  )
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiDownloadExaminerResultsZip(
  departmentId: number,
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/departments/${departmentId}/download-examiner-results-zip?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename = ensureDownloadExtension(
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `department-${departmentId}-examiner-results.zip`,
    response.headers.get("Content-Type") || "",
  )
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiDownloadExaminerAssignedZip(
  accessToken: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${apiBase}/papers/examiner/download-zip?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  const disposition = response.headers.get("Content-Disposition") || ""
  const utf8Match = disposition.match(/filename\*\s*=\s*utf-8''([^;]+)/i)
  const plainMatch = disposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i)
  const filename = ensureDownloadExtension(
    (utf8Match?.[1] ? decodeURIComponent(utf8Match[1]) : undefined) ||
    plainMatch?.[1] ||
    `examiner-assigned-papers.zip`,
    response.headers.get("Content-Type") || "",
  )
  const blob = await response.blob()
  return { blob, filename }
}

export async function apiAssignSupervisor(
  paperId: number,
  supervisorId: number,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("supervisor_id", String(supervisorId))
  // Use /theses/ endpoint which correctly sets status to phase2_proposal_submitted
  // (not /papers/ which wrongly jumps to phase3_chapters, skipping the proposal phase)
  const response = await fetch(`${apiBase}/theses/${paperId}/assign-supervisor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSupervisorApproveCombinedThesis(
  paperId: number,
  approved: boolean,
  comments: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("approved", String(approved))
  form.set("comments", comments)
  const response = await fetch(`${apiBase}/papers/${paperId}/combined-thesis/supervisor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiSubmitStep(
  paperId: number,
  stepNumber: number,
  title: string,
  file: File,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set('step_number', String(stepNumber))
  if (title.trim()) form.set('title', title.trim())
  form.append('file', file)
  const response = await fetch(`${apiBase}/theses/${paperId}/steps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiResubmitEditedStep(
  stepId: number,
  accessToken: string,
): Promise<ApiPaper> {
  const response = await fetch(`${apiBase}/theses/steps/${stepId}/resubmit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiStepDecision(
  stepId: number,
  decision: "approved" | "revise",
  comments: string,
  accessToken: string,
): Promise<ApiPaper> {
  const form = new FormData()
  form.set("decision", decision)
  if (comments.trim()) form.set("comment", comments.trim())
  const response = await fetch(`${apiBase}/steps/${stepId}/decision`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiPaper>(response)
}

export async function apiDeleteThesis(paperId: number, accessToken: string): Promise<void> {
  const response = await fetch(`${apiBase}/theses/${paperId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

export async function apiDeleteStep(stepId: number, accessToken: string): Promise<void> {
  const response = await fetch(`${apiBase}/theses/steps/${stepId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
}

export interface ApiBulkAssignSummary {
  total_processed: number
  successful: number
  failed: number
  errors: string[]
}

export interface ApiExaminerQualitativeFeedback {
  examiner_type: string
  general_comments: string | null
  recommendation: string | null
  submitted_at: string | null
}

export interface ApiStudentFeedbackResponse {
  thesis_id: number
  topic_title: string
  status: string
  revision_status: string | null
  compiled_comments: string | null
  qualitative_feedback: ApiExaminerQualitativeFeedback[]
  file_path: string | null
  file_name: string | null
}

export interface ApiExaminerMarkDetail {
  id: number | null
  examiner_id: number
  examiner_name: string | null
  examiner_type: string
  score: number | null
  recommendation: string | null
  general_comments: string | null
  annotated_file_path: string | null
  is_submitted: boolean
  submitted_at: string | null
}

export interface ApiAdminMarkSheetResponse {
  thesis_id: number
  topic_title: string
  status: string
  degree_level: string
  requires_third_examiner: boolean
  score_difference: number | null
  internal_score: number | null
  external_score: number | null
  third_examiner_score: number | null
  average_score: number | null
  calculation_note: string | null
  final_recommendation: string | null
  examiner_results: ApiExaminerMarkDetail[]
}

export async function apiAssignThirdExaminer(
  thesisId: number,
  thirdExaminerId: number,
  accessToken: string,
): Promise<{ message: string }> {
  const form = new FormData()
  form.set("third_examiner_id", String(thirdExaminerId))
  const response = await fetch(`${apiBase}/theses/${thesisId}/assign-third-examiner`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || "Failed to assign 3rd examiner")
  }
  return response.json()
}


export async function apiGetStudentFeedback(
  thesisId: number,
  accessToken: string,
): Promise<ApiStudentFeedbackResponse> {
  const response = await fetch(`${apiBase}/theses/${thesisId}/feedback`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiStudentFeedbackResponse>(response)
}

export async function apiGetAdminExaminationMarks(
  thesisId: number,
  accessToken: string,
): Promise<ApiAdminMarkSheetResponse> {
  const response = await fetch(`${apiBase}/theses/${thesisId}/examination-marks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiAdminMarkSheetResponse>(response)
}

export async function apiSubmitExaminerGrading(
  thesisId: number,
  payload: {
    score?: number
    recommendation?: string
    general_comments?: string
    file?: File
  },
  accessToken: string,
): Promise<{ message: string; thesis_id: number }> {
  const form = new FormData()
  if (payload.score !== undefined && payload.score !== null) {
    form.set("score", String(payload.score))
  }
  if (payload.recommendation) {
    form.set("recommendation", payload.recommendation)
  }
  if (payload.general_comments) {
    form.set("general_comments", payload.general_comments)
  }
  if (payload.file) {
    form.append("file", payload.file)
  }
  const response = await fetch(`${apiBase}/theses/${thesisId}/examination-marks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<{ message: string; thesis_id: number }>(response)
}

export async function apiGetDepartmentResultsExcelEditorConfig(accessToken: string): Promise<ApiEditorConfigResponse> {
  const response = await fetch(`${apiBase}/papers/department/results-excel-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiEditorConfigResponse>(response)
}

export async function apiGetDeanResultsExcelEditorConfig(accessToken: string): Promise<ApiEditorConfigResponse> {
  const response = await fetch(`${apiBase}/papers/dean/results-excel-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<ApiEditorConfigResponse>(response)
}

export async function apiNotifyFeedbackSaved(
  paperId: number,
  docType: string,
  accessToken: string,
): Promise<{ message: string; paper_id: number }> {
  const response = await fetch(`${apiBase}/papers/${paperId}/notify-feedback-saved?type=${encodeURIComponent(docType)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return handleResponse<{ message: string; paper_id: number }>(response)
}

export interface ApiBulkAssignSummary {
  total_processed: number
  successful: number
  errors: string[]
}

export async function apiDownloadStudentsTemplate(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
  const response = await fetch(`${apiBase}/users/students-template?format=${format}`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Failed to download student template")
  }
  return response.blob()
}

export async function apiDownloadLecturersTemplate(format: "csv" | "xlsx" = "csv"): Promise<Blob> {
  const response = await fetch(`${apiBase}/users/lecturers-template?format=${format}`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Failed to download lecturer template")
  }
  return response.blob()
}

export async function apiDownloadBulkExaminerTemplate(accessToken: string, format: "csv" | "xlsx" = "csv"): Promise<Blob> {
  const response = await fetch(`${apiBase}/papers/bulk-examiner-template?format=${format}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Failed to download examiner batch template")
  }
  return response.blob()
}

export async function apiBulkAssignExaminers(
  file: File,
  accessToken: string,
): Promise<ApiBulkAssignSummary> {
  const form = new FormData()
  form.append("file", file)
  const response = await fetch(`${apiBase}/papers/bulk-assign-examiners`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  return handleResponse<ApiBulkAssignSummary>(response)
}



