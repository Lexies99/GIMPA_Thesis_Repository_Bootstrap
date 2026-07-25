import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, FileText, X } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { apiImportAccounts, apiListSupervisors, apiUploadPaper, type ApiImportAccountsSummary, type ApiUser } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const DISCIPLINES_BY_SCHOOL: Record<string, string[]> = {
  'Business School': [
    'Business Administration',
    'Accounting and Finance',
  ],
  'School of Public Service and Governance': [
    'Public Service and Governance',
  ],
  'Faculty of Law': [
    'Law',
  ],
  'School of Technology and Social Sciences (SOTSS)': [
    'Computer Science and Information Systems',
    'Information Systems and Innovation',
    'Economics and Hospitality Studies',
    'Liberal Arts and Communication Studies',
  ],
}

const ALL_DISCIPLINES = [
  'Business Administration',
  'Accounting and Finance',
  'Public Service and Governance',
  'Law',
  'Computer Science and Information Systems',
  'Information Systems and Innovation',
  'Economics and Hospitality Studies',
  'Liberal Arts and Communication Studies',
]

const DRAFT_STORAGE_KEY = 'murrs_upload_draft_v1'

export function DocumentUpload() {
  const { user } = useAuth()
  const isSystemAdmin = user?.role === 'system_admin'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState([{ name: '' }]);
  const [workMode, setWorkMode] = useState<'individual' | 'group'>('individual');
  const [groupAuthorCount, setGroupAuthorCount] = useState(2);
  const [groupAuthorCountInput, setGroupAuthorCountInput] = useState('2');
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    discipline: '',
    documentType: '',
    publicationType: 'thesis',
    license: '',
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [lecturersFile, setLecturersFile] = useState<File | null>(null);
  const [libraryFile, setLibraryFile] = useState<File | null>(null);
  const [bulkUploadMessage, setBulkUploadMessage] = useState('');
  const [bulkSummary, setBulkSummary] = useState<ApiImportAccountsSummary | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [supervisors, setSupervisors] = useState<ApiUser[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [copyrightAccepted, setCopyrightAccepted] = useState(false);
  const disciplineOptions = useMemo(
    () => DISCIPLINES_BY_SCHOOL[user?.university || ''] || ALL_DISCIPLINES,
    [user?.university],
  )

  const truncateWords = (value: string, maxWords: number) => {
    const words = value.trim().split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) return value
    return words.slice(0, maxWords).join(' ')
  }

  const normalizeKeywordsInput = (value: string) => {
    const normalized = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split(/\s+/).filter(Boolean).slice(0, 5).join(' '))
      .slice(0, 10)
    return normalized.join(', ')
  }

  const commitGroupAuthorCount = (rawValue: string) => {
    const parsed = Number(rawValue)
    const safeValue = Number.isFinite(parsed) ? Math.max(2, Math.min(20, Math.floor(parsed))) : 2
    setGroupAuthorCount(safeValue)
    setGroupAuthorCountInput(String(safeValue))
  }

  useEffect(() => {
    let cancelled = false
    const loadSupervisors = async () => {
      const accessToken = localStorage.getItem('murrs_access_token')
      if (!accessToken || (user?.role !== 'member' && user?.role !== 'student')) return
      try {
        const items = await apiListSupervisors(accessToken)
        if (!cancelled) setSupervisors(items)
      } catch {
        if (!cancelled) setSupervisors([])
      }
    }
    void loadSupervisors()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        formData?: typeof formData
        authors?: Array<{ name: string }>
        workMode?: 'individual' | 'group'
        groupAuthorCount?: number
        supervisorId?: string
      }
      if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }))
      if (parsed.workMode) setWorkMode(parsed.workMode)
      if (Array.isArray(parsed.authors) && parsed.authors.length > 0) setAuthors(parsed.authors)
      if (typeof parsed.groupAuthorCount === 'number') {
        const safe = Math.max(2, Math.min(20, Math.floor(parsed.groupAuthorCount)))
        setGroupAuthorCount(safe)
        setGroupAuthorCountInput(String(safe))
      }
      if (typeof parsed.supervisorId === 'string') setSupervisorId(parsed.supervisorId)
      setSubmitMessage('Draft restored. Please reattach your file before submitting.')
    } catch {
      // Ignore malformed draft payload
    }
  }, [])

  useEffect(() => {
    if (workMode === 'individual') {
      setAuthors((prev) => [{ name: prev[0]?.name || '' }])
      return
    }
    const count = Math.max(2, groupAuthorCount)
    setAuthors((prev) => {
      const next = [...prev]
      if (next.length < count) {
        while (next.length < count) next.push({ name: '' })
      } else if (next.length > count) {
        next.splice(count)
      }
      return next
    })
  }, [workMode, groupAuthorCount])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage('');
    const accessToken = localStorage.getItem('murrs_access_token');
    if (!accessToken) {
      setSubmitMessage('Please sign in to upload a paper.');
      return;
    }
    if (!selectedFile) {
      setSubmitMessage('Please attach a file before submitting.');
      return;
    }
    if (!formData.title.trim()) {
      setSubmitMessage('Title is required.');
      return;
    }
    if (!formData.keywords.trim()) {
      setSubmitMessage('Keywords are required.');
      return;
    }
    if (!formData.abstract.trim()) {
      setSubmitMessage('Abstract is required.');
      return;
    }
    if (!formData.discipline.trim()) {
      setSubmitMessage('Please select a discipline.');
      return;
    }
    if (!formData.documentType.trim()) {
      setSubmitMessage('Please select a document type.');
      return;
    }
    if (!formData.license.trim()) {
      setSubmitMessage('Please select a license type.');
      return;
    }
    if (!copyrightAccepted) {
      setSubmitMessage('Please confirm copyright and license agreement before submitting.');
      return;
    }
    const titleWordCount = formData.title.trim().split(/\s+/).filter(Boolean).length
    if (titleWordCount > 20) {
      setSubmitMessage('Title must not exceed 20 words.')
      return
    }
    const abstractWordCount = formData.abstract.trim().split(/\s+/).filter(Boolean).length
    if (abstractWordCount < 150 || abstractWordCount > 300) {
      setSubmitMessage('Abstract must be between 150 and 300 words.')
      return
    }
    const keywords = formData.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    if (keywords.length < 3 || keywords.length > 10) {
      setSubmitMessage('Provide between 3 and 10 keywords.')
      return
    }
    const invalidKeyword = keywords.find((k) => k.split(/\s+/).filter(Boolean).length > 5)
    if (invalidKeyword) {
      setSubmitMessage(`Keyword "${invalidKeyword}" exceeds 5 words.`)
      return
    }
    if (workMode === 'group' && authors.filter((a) => a.name.trim()).length < 2) {
      setSubmitMessage('Group work requires at least 2 author names.');
      return;
    }
    if (workMode === 'individual' && authors.filter((a) => a.name.trim()).length > 1) {
      setSubmitMessage('Individual work allows only one author.');
      return;
    }
    // Supervisor assignment validation removed (assigned by HOD/coordinator)
    setIsUploading(true);
    setUploadProgress(25);

    const fileToUpload = selectedFile || new File([`THESIS TOPIC SUBMISSION (PHASE 1)\nTitle: ${formData.title}\nDescription:\n${formData.abstract}`], `Topic_Submission_${Date.now()}.txt`, { type: 'text/plain' });

    try {
      const created = await apiUploadPaper(
        {
          title: formData.title,
          abstract: formData.abstract,
          discipline: formData.discipline,
          university: user?.university || 'GIMPA',
          document_type: formData.documentType || 'proposal',
          publication_type:
            user?.role === 'librarian'
              ? (formData.publicationType as 'thesis' | 'dissertation' | 'systematic_review' | 'article' | 'other')
              : undefined,
          license: formData.license || 'all-rights-reserved',
          file: fileToUpload,
          tags: keywords,
          authors: authors.map((a) => ({
            name: a.name,
          })).filter((a) => a.name.trim().length > 0),
          work_mode: workMode,
          supervisor_id: undefined,
        },
        accessToken,
      );

      setUploadProgress(100);
      setSubmitMessage(
        `Submission sent successfully. Paper ID: ${created.id}. It is now in lecturer review (${created.status}), and notification emails have been queued.`,
      );
      setSelectedFile(null);
      setFormData({
        title: '',
        abstract: '',
        keywords: '',
        discipline: '',
        documentType: '',
        publicationType: 'thesis',
        license: '',
      });
      setAuthors([{ name: '' }]);
      setWorkMode('individual');
      setGroupAuthorCount(2);
      setGroupAuthorCountInput('2');
      setSupervisorId('');
      setCopyrightAccepted(false);
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUploadMessage('');
    setBulkSummary(null);

    const accessToken = localStorage.getItem('murrs_access_token');
    if (!accessToken) {
      setBulkUploadMessage('Please sign in to continue.');
      return;
    }
    if (!studentsFile && !lecturersFile && !libraryFile) {
      setBulkUploadMessage('Attach at least one file to import.');
      return;
    }

    setIsBulkUploading(true);
    try {
      const summary = await apiImportAccounts(accessToken, {
        studentsFile: studentsFile || undefined,
        lecturersFile: lecturersFile || undefined,
        libraryFile: libraryFile || undefined,
      });
      setBulkSummary(summary);
      setBulkUploadMessage('Import completed. Check summary below.');
    } catch (err) {
      setBulkUploadMessage(err instanceof Error ? err.message : 'Bulk import failed');
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleSaveDraft = () => {
    try {
      const payload = {
        formData,
        authors,
        workMode,
        groupAuthorCount,
        supervisorId,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
      setSubmitMessage('Draft saved locally. Reattach file when ready to submit.')
    } catch {
      setSubmitMessage('Could not save draft in browser storage.')
    }
  }

  const fileInput = (label: string, file: File | null, onChange: (file: File | null) => void, accept = '.csv,.xlsx') => (
    <div>
      <Label>{label}</Label>
      <Input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Submit Research Paper</h2>
        <p className="text-muted-foreground">
          Upload your research paper for review and approval
        </p>
      </div>

      {isSystemAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Data Upload (System Admin)</CardTitle>
            <CardDescription>Upload CSV/XLSX files for students, lecturers, and librarians.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkImport} className="space-y-4">
              {fileInput(
                'Students file (Student name, student ID, school email, school, department, certification type, block code, year)',
                studentsFile,
                setStudentsFile,
              )}
              {fileInput('Lecturers file (Lecturer name, lecturer ID, lecture email, school, department)', lecturersFile, setLecturersFile)}
              {fileInput('Library staff file (Name, school email, staff ID, role)', libraryFile, setLibraryFile)}
              <p className="text-xs text-muted-foreground">
                Staff passwords are auto-generated by the system and sent by email. Users must change password on first login.
              </p>
              <p className="text-xs text-muted-foreground">
                Valid student block codes: A1, A2, A5, A6, B1, B2, B3, B4, BA, BB, BC, BD, F1, F2, JA, JB, JK, T1, T2, T3, TA, TB, TC, X1, X2.
              </p>
              <Button type="submit" disabled={isBulkUploading}>
                {isBulkUploading ? 'Importing...' : 'Run Import'}
              </Button>
              {bulkUploadMessage && (
                <p className="text-sm">{bulkUploadMessage}</p>
              )}
              {bulkSummary && (
                <div className="text-sm space-y-2 border rounded-md p-3 bg-muted/30">
                  {bulkSummary.students && (
                    <div>
                      <p>
                        Students: {bulkSummary.students.imported_or_updated} updated/imported, emailed: {bulkSummary.students.emailed_sent || 0}, email failed: {bulkSummary.students.emailed_failed || 0}, errors: {bulkSummary.students.errors.length}
                      </p>
                      {bulkSummary.students.errors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                          {bulkSummary.students.errors.slice(0, 20).map((err, idx) => (
                            <li key={`student-err-${idx}`}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {bulkSummary.lecturers && (
                    <div>
                      <p>Lecturers: {bulkSummary.lecturers.imported_or_updated} updated/imported, emailed: {bulkSummary.lecturers.emailed_sent}, email failed: {bulkSummary.lecturers.emailed_failed}, errors: {bulkSummary.lecturers.errors.length}</p>
                      {bulkSummary.lecturers.errors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                          {bulkSummary.lecturers.errors.slice(0, 20).map((err, idx) => (
                            <li key={`lecturer-err-${idx}`}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {bulkSummary.library && (
                    <div>
                      <p>Library: {bulkSummary.library.imported_or_updated} updated/imported, emailed: {bulkSummary.library.emailed_sent}, email failed: {bulkSummary.library.emailed_failed}, errors: {bulkSummary.library.errors.length}</p>
                      {bulkSummary.library.errors.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                          {bulkSummary.library.errors.slice(0, 20).map((err, idx) => (
                            <li key={`library-err-${idx}`}>{err}</li>
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

      {!isSystemAdmin && (
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {submitMessage && (
          <Card>
            <CardContent className="pt-4 text-sm">{submitMessage}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>Upload your research paper (PDF, DOCX, max 500MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="size-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="size-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="size-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, DOCX, LaTeX
                  </p>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.tex"
                onChange={handleFileSelect}
              />
            </div>

            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading and validating...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.role === 'librarian' && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Supervisor filtering applies to member accounts.
              </div>
            )}
            {/* Supervisor is assigned by HOD/Coordinator in Phase 2 */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter research paper title (max 20 words)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: truncateWords(e.target.value, 20) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="keywords">Keywords *</Label>
              <Input
                id="keywords"
                placeholder="3-10 keywords, comma-separated (max 5 words each)"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, keywords: normalizeKeywordsInput(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="abstract">Abstract *</Label>
              <Textarea
                id="abstract"
                placeholder="Enter paper abstract (150-300 words)"
                rows={6}
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: truncateWords(e.target.value, 300) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="workMode">Work Type *</Label>
              <Select value={workMode} onValueChange={(value) => setWorkMode(value as 'individual' | 'group')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Work</SelectItem>
                  <SelectItem value="group">Group Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {workMode === 'group' && (
              <div>
                <Label htmlFor="group-count">Number of Authors *</Label>
                <Input
                  id="group-count"
                  type="number"
                  min={2}
                  max={20}
                  value={groupAuthorCountInput}
                  onChange={(e) => setGroupAuthorCountInput(e.target.value)}
                  onBlur={(e) => commitGroupAuthorCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitGroupAuthorCount((e.target as HTMLInputElement).value)
                    }
                  }}
                />
              </div>
            )}
            <div>
              <Label>Author</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {workMode === 'group' ? `Add ${Math.max(2, groupAuthorCount)} authors` : 'Add the single author'}
              </p>
              <div className="space-y-3">
                {authors.map((author, index) => (
                  <div key={index}>
                    <Label htmlFor={`author-${index}`}>Author {index + 1} Name *</Label>
                    <Input
                      id={`author-${index}`}
                      placeholder="Full name"
                      value={author.name}
                      onChange={(e) => {
                        const next = [...authors]
                        next[index].name = e.target.value
                        setAuthors(next)
                      }}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discipline">Discipline *</Label>
                <Select
                  value={formData.discipline}
                  onValueChange={(value) => setFormData({ ...formData, discipline: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplineOptions.map((discipline) => (
                      <SelectItem key={discipline} value={discipline}>
                        {discipline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="documentType">Document Type *</Label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal (Abstract & Project Summary)</SelectItem>
                    <SelectItem value="chapter_1">Chapter One</SelectItem>
                    <SelectItem value="thesis">Thesis</SelectItem>
                    <SelectItem value="dissertation">Dissertation</SelectItem>
                    <SelectItem value="research-paper">Research Paper</SelectItem>
                    <SelectItem value="conference-paper">Conference Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user?.role === 'librarian' && (
                <div>
                  <Label htmlFor="publicationType">Publication Type *</Label>
                  <Select
                    value={formData.publicationType}
                    onValueChange={(value) => setFormData({ ...formData, publicationType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select publication type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thesis">Thesis</SelectItem>
                      <SelectItem value="dissertation">Dissertation</SelectItem>
                      <SelectItem value="systematic_review">Systematic Review</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copyright & License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="license">License Type *</Label>
              <Select
                value={formData.license}
                onValueChange={(value) => setFormData({ ...formData, license: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select license" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cc-by">CC BY - Attribution</SelectItem>
                  <SelectItem value="cc-by-sa">CC BY-SA - Attribution-ShareAlike</SelectItem>
                  <SelectItem value="cc-by-nc">CC BY-NC - Attribution-NonCommercial</SelectItem>
                  <SelectItem value="all-rights-reserved">All Rights Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
              <Checkbox
                id="copyright-confirm"
                checked={copyrightAccepted}
                onChange={(e) => setCopyrightAccepted(e.target.checked)}
              />
              <div>
                <label htmlFor="copyright-confirm" className="text-sm cursor-pointer">
                  I confirm that I have the right to upload this work and agree to the terms
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isUploading}>
            Save Draft
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </div>
        {submitMessage && (
          <Card>
            <CardContent className="pt-4 text-sm">{submitMessage}</CardContent>
          </Card>
        )}
      </form>
      )}
    </div>
  );
}
