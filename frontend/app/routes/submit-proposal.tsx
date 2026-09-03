import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { apiUploadPaper } from '../lib/api';
import { createTopicPdfFile } from '../lib/pdfGenerator';
import { Library, ArrowLeft, Upload, FileText, X, AlertCircle, Sparkles } from 'lucide-react';

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
};

const ALL_DISCIPLINES = [
  'Business Administration',
  'Accounting and Finance',
  'Public Service and Governance',
  'Law',
  'Computer Science and Information Systems',
  'Information Systems and Innovation',
  'Economics and Hospitality Studies',
  'Liberal Arts and Communication Studies',
];

const PROPOSAL_DRAFT_KEY = 'murrs_proposal_draft_v1';

export function meta() {
  return [
    { title: "Submit Project Proposal - GIMPA Thesis Repository" },
    { name: "description", content: "Submit your academic project proposal for review and supervisor assignment" },
  ];
}

export default function SubmitProposal() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workMode, setWorkMode] = useState<'individual' | 'group'>('individual');
  const [groupAuthorCount, setGroupAuthorCount] = useState(2);
  const [groupAuthorCountInput, setGroupAuthorCountInput] = useState('2');
  const [authors, setAuthors] = useState<{ name: string }[]>([{ name: '' }]);
  
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    keywords: '',
    discipline: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const disciplineOptions = useMemo(
    () => DISCIPLINES_BY_SCHOOL[user?.university || ''] || ALL_DISCIPLINES,
    [user?.university],
  );

  // Guard routing
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load supervisors removed (handled by HOD/coordinator)

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROPOSAL_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
      if (parsed.workMode) setWorkMode(parsed.workMode);
      if (Array.isArray(parsed.authors) && parsed.authors.length > 0) setAuthors(parsed.authors);
      if (typeof parsed.groupAuthorCount === 'number') {
        setGroupAuthorCount(parsed.groupAuthorCount);
        setGroupAuthorCountInput(String(parsed.groupAuthorCount));
      }
      // supervisorId draft restore removed
      setMessage('Restored your saved draft proposal.');
      setMessageType('success');
    } catch {
      // Ignore malformed draft
    }
  }, []);

  // Sync group count
  useEffect(() => {
    if (workMode === 'individual') {
      setAuthors([{ name: user?.name || '' }]);
      return;
    }
    const count = Math.max(2, groupAuthorCount);
    setAuthors((prev) => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) next.push({ name: '' });
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  }, [workMode, groupAuthorCount, user?.name]);

  // Save draft utility
  const saveDraft = (updatedFormData = formData, updatedAuthors = authors, mode = workMode, count = groupAuthorCount) => {
    try {
      const payload = {
        formData: updatedFormData,
        authors: updatedAuthors,
        workMode: mode,
        groupAuthorCount: count,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(PROPOSAL_DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  };

  const handleFormDataChange = (field: keyof typeof formData, value: string) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    saveDraft(next);
  };

  const handleWorkModeChange = (val: string) => {
    const mode = val as 'individual' | 'group';
    setWorkMode(mode);
    saveDraft(formData, authors, mode);
  };

  const handleGroupCountChange = (val: string) => {
    setGroupAuthorCountInput(val);
    const parsed = Number(val);
    const safe = Number.isFinite(parsed) ? Math.max(2, Math.min(20, Math.floor(parsed))) : 2;
    setGroupAuthorCount(safe);
    saveDraft(formData, authors, workMode, safe);
  };

  const handleAuthorNameChange = (index: number, val: string) => {
    const next = [...authors];
    next[index] = { name: val };
    setAuthors(next);
    saveDraft(formData, next);
  };

  // handleSupervisorChange removed

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  };

  // Helper counters
  const titleWordCount = useMemo(() => {
    return formData.title.trim().split(/\s+/).filter(Boolean).length;
  }, [formData.title]);

  const abstractWordCount = useMemo(() => {
    return formData.abstract.trim().split(/\s+/).filter(Boolean).length;
  }, [formData.abstract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    const token = localStorage.getItem('murrs_access_token');
    if (!token) {
      setMessage('You must be signed in to submit a proposal.');
      setMessageType('error');
      return;
    }
    let fileToUpload = selectedFile;
    if (!fileToUpload) {
      fileToUpload = createTopicPdfFile({
        title: formData.title,
        abstract: formData.abstract,
        authorName: user?.name || 'Student',
        department: formData.discipline,
        discipline: formData.discipline,
        documentType: 'thesis_topic',
      });
    }
    if (!formData.title.trim()) {
      setMessage('Project title is required.');
      setMessageType('error');
      return;
    }
    if (titleWordCount > 20) {
      setMessage('Title must not exceed 20 words.');
      setMessageType('error');
      return;
    }
    if (abstractWordCount < 20 || abstractWordCount > 300) {
      setMessage('Topic Short Description / Problem Statement must be between 20 and 300 words.');
      setMessageType('error');
      return;
    }
    const tags = formData.keywords
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length < 3 || tags.length > 10) {
      setMessage('Provide between 3 and 10 keywords (comma-separated).');
      setMessageType('error');
      return;
    }
    if (!formData.discipline) {
      setMessage('Please select a discipline.');
      setMessageType('error');
      return;
    }
    // supervisor validation removed
    if (workMode === 'group' && authors.filter((a) => a.name.trim()).length < 2) {
      setMessage('Group work requires at least 2 author names.');
      setMessageType('error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);

    try {
      await apiUploadPaper(
        {
          title: formData.title,
          abstract: formData.abstract,
          discipline: formData.discipline,
          university: user?.university || 'GIMPA',
          document_type: 'proposal',
          license: 'all-rights-reserved',
          file: fileToUpload,
          tags,
          authors: authors.filter((a) => a.name.trim()),
          work_mode: workMode,
          supervisor_id: undefined,
        },
        token,
      );

      setUploadProgress(100);
      setMessage('Thesis topic submitted successfully! Redirecting to dashboard...');
      setMessageType('success');
      localStorage.removeItem(PROPOSAL_DRAFT_KEY);

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to submit proposal');
      setMessageType('error');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Library className="size-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">GIMPA Thesis Repository</h1>
              <p className="text-sm text-muted-foreground">Submit Project Proposal</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="size-6 text-primary animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold">Phase 1: Thesis Topic Submission</h2>
            <p className="text-sm text-muted-foreground">
              Submit your proposed topic title and short description for HOD approval and supervisor assignment. (Full project proposal document will be uploaded in Phase 2).
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm flex items-start gap-3 ${
              messageType === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Topic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thesis Topic Details</CardTitle>
              <CardDescription>Fill out your proposed topic details for departmental review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="title">Thesis Topic Title *</Label>
                  <span className={`text-xs font-mono ${titleWordCount > 20 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {titleWordCount} / 20 words
                  </span>
                </div>
                <Input
                  id="title"
                  placeholder="Enter your proposed thesis topic title"
                  value={formData.title}
                  onChange={(e) => handleFormDataChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="abstract">Topic Short Description / Problem Statement *</Label>
                  <span
                    className={`text-xs font-mono ${
                      abstractWordCount < 20 || abstractWordCount > 300
                        ? 'text-amber-500 font-bold'
                        : 'text-green-600 font-bold'
                    }`}
                  >
                    {abstractWordCount} words (20-300 words)
                  </span>
                </div>
                <Textarea
                  id="abstract"
                  placeholder="Provide a short description of your proposed research topic, key problem statement, and expected outcomes..."
                  rows={5}
                  value={formData.abstract}
                  onChange={(e) => handleFormDataChange('abstract', e.target.value)}
                  required
                />
              </div>

              {/* Keywords */}
              <div>
                <Label htmlFor="keywords">Keywords *</Label>
                <Input
                  id="keywords"
                  placeholder="e.g. machine learning, finance, block chain (3-10 tags, comma-separated)"
                  value={formData.keywords}
                  onChange={(e) => handleFormDataChange('keywords', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Enter tags separated by commas. Each tag can have up to 5 words.
                </p>
              </div>

              {/* Discipline & Work Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discipline">Discipline *</Label>
                  <Select
                    value={formData.discipline}
                    onValueChange={(val) => handleFormDataChange('discipline', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplineOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="workMode">Work Type *</Label>
                  <Select value={workMode} onValueChange={handleWorkModeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Project</SelectItem>
                      <SelectItem value="group">Group Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {workMode === 'group' && (
                <div className="space-y-4 pt-2 border-t">
                  <div>
                    <Label htmlFor="group-count">Number of Authors *</Label>
                    <Input
                      id="group-count"
                      type="number"
                      min={2}
                      max={20}
                      value={groupAuthorCountInput}
                      onChange={(e) => handleGroupCountChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Author Names</Label>
                    {authors.map((author, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-16">Author {index + 1}:</span>
                        <Input
                          placeholder="Full name"
                          value={author.name}
                          onChange={(e) => handleAuthorNameChange(index, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                saveDraft();
                setMessage('Draft saved locally.');
                setMessageType('success');
              }}
              disabled={isUploading}
            >
              Save Draft
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Submitting Topic...' : 'Submit Thesis Topic'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
