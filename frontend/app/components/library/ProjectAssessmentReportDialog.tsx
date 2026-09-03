import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { FileText, Download, CheckCircle2, Award, Sparkles, AlertCircle } from 'lucide-react';
import {
  type AssessmentRubricScores,
  type ProjectAssessmentData,
  calculateTotalScore,
  calculateGrade,
  createAssessmentDocxFile,
  generateProjectAssessmentDocx,
} from '../../lib/assessmentDocxGenerator';
import type { ApiPaper } from '../../lib/api';

interface ProjectAssessmentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper: ApiPaper;
  examinerName: string;
  examinerRole: 'Internal Examiner' | 'External Examiner' | 'Third Examiner' | 'Coordinator / HOD';
  onSaveReport: (totalScore: number, comments: string, docxFile: File) => Promise<void>;
}

export function ProjectAssessmentReportDialog({
  open,
  onOpenChange,
  paper,
  examinerName,
  examinerRole,
  onSaveReport,
}: ProjectAssessmentReportDialogProps) {
  const [school, setSchool] = useState('School of Technology and Social Sciences (SOTSS)');
  const [department, setDepartment] = useState(paper.discipline || 'Computer Science and Information Systems');
  const [candidateId, setCandidateId] = useState(`ST-${paper.id}`);
  const [candidateName, setCandidateName] = useState(
    paper.authors?.map((a) => a.name).filter(Boolean).join(', ') || 'Candidate'
  );
  const [projectTitle, setProjectTitle] = useState(paper.title || '');

  // Qualitative Assessment Comments
  const [researchProblemComments, setResearchProblemComments] = useState('');
  const [literatureComments, setLiteratureComments] = useState('');
  const [methodologyComments, setMethodologyComments] = useState('');
  const [analysisComments, setAnalysisComments] = useState('');
  const [generalComments, setGeneralComments] = useState(paper.examiner_corrections || '');

  // Rubric Scores
  const [scores, setScores] = useState<AssessmentRubricScores>({
    researchProblem: 8,
    literatureReview: 16,
    methodology: 12,
    analysisDiscussion: 24,
    conclusionRecommendations: 4,
    writingSkills: 8,
    projectReport: 4,
    knowledgeDomain: 4,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update fields when paper changes
  useEffect(() => {
    if (paper) {
      setDepartment(paper.discipline || 'Computer Science and Information Systems');
      setCandidateId(`ST-${paper.id}`);
      setCandidateName(paper.authors?.map((a) => a.name).filter(Boolean).join(', ') || 'Candidate');
      setProjectTitle(paper.title || '');
    }
  }, [paper]);

  const totalScore = useMemo(() => calculateTotalScore(scores), [scores]);
  const gradeDisplay = useMemo(() => calculateGrade(totalScore), [totalScore]);

  const handleScoreChange = (field: keyof AssessmentRubricScores, valStr: string, max: number) => {
    let num = parseFloat(valStr);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setScores((prev) => ({ ...prev, [field]: num }));
  };

  const getAssessmentData = (): ProjectAssessmentData => ({
    school,
    department,
    candidateId,
    candidateName,
    projectTitle,
    researchProblemComments,
    literatureComments,
    methodologyComments,
    analysisComments,
    generalComments,
    scores,
    examinerName: examinerName || 'Nana Assyne',
    examinerRole,
    signatureDate: new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  const handleDownloadWordDoc = async () => {
    setIsDownloading(true);
    try {
      const data = getAssessmentData();
      const blob = await generateProjectAssessmentDocx(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (projectTitle || 'Assessment_Report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      a.download = `${safeTitle}_Project_Assessment_Report.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate Word document');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const data = getAssessmentData();
      const docxFile = await createAssessmentDocxFile(data);

      const aggregatedComments = [
        `[${examinerRole} - ${examinerName || 'Examiner'}] - Final Score: ${totalScore}/100 (${gradeDisplay})`,
        researchProblemComments ? `• Research Problem & Objectives: ${researchProblemComments}` : '',
        literatureComments ? `• Literature & Theory: ${literatureComments}` : '',
        methodologyComments ? `• Methods & Data: ${methodologyComments}` : '',
        analysisComments ? `• Analysis & Discussion: ${analysisComments}` : '',
        generalComments ? `• General Comments & Corrections: ${generalComments}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await onSaveReport(totalScore, aggregatedComments, docxFile);
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save assessment report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
        <DialogHeader className="border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <FileText className="size-5" />
                GHANA INSTITUTE OF MANAGEMENT & PUBLIC ADMINISTRATION
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Official Project Assessment Report & Examiner Evaluation Form
              </DialogDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">
              {examinerRole}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Institutional Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/20" style={{ borderColor: 'var(--border-color)' }}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">School</Label>
              <Input
                className="h-8 text-xs bg-background"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. School of Technology and Social Sciences (SOTSS)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Department</Label>
              <Input
                className="h-8 text-xs bg-background"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science and Information Systems"
              />
            </div>
          </div>

          {/* 1. Background Information */}
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-input)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5 m-0">
              <span>1.</span> Background Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">i. Candidate ID</Label>
                <Input
                  className="h-8 text-xs bg-background"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">ii. Name of Candidate</Label>
                <Input
                  className="h-8 text-xs bg-background"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">iii. Title of Project</Label>
              <Input
                className="h-8 text-xs bg-background font-semibold"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Qualitative Assessment Sections 2-6 */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
              <Sparkles className="size-3.5 text-purple-500" />
              <span>Kindly record your qualitative assessment of the following project areas:</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>2. Research Problem, Objectives and Relevance</span>
                <span className="text-[10px] text-muted-foreground font-normal">Max: 10 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess the clarity of the problem statement, research questions, and institutional relevance..."
                value={researchProblemComments}
                onChange={(e) => setResearchProblemComments(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>3. Literature and Theory</span>
                <span className="text-[10px] text-muted-foreground font-normal">Max: 20 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess theoretical foundation, literature review depth, synthesis of previous studies, and citation quality..."
                value={literatureComments}
                onChange={(e) => setLiteratureComments(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>4. Methods and Data</span>
                <span className="text-[10px] text-muted-foreground font-normal">Max: 15 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess research design, data collection instruments, sampling technique, and ethical considerations..."
                value={methodologyComments}
                onChange={(e) => setMethodologyComments(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>5. Analysis and Discussion</span>
                <span className="text-[10px] text-muted-foreground font-normal">Max: 30 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess rigor of data analysis, presentation of findings, interpretation, and alignment with objectives..."
                value={analysisComments}
                onChange={(e) => setAnalysisComments(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                <span>6. General Comments & Overall Remarks</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Enter general observations, commendations, or specific instructions for corrections..."
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* 10. Overall Assessment Rubric Table */}
          <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5 m-0">
                <Award className="size-4" />
                10. Overall Assessment (Marks Awarded)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Total:</span>
                <Badge className="px-2.5 py-0.5 text-sm font-extrabold bg-purple-600 text-white">
                  {totalScore} / 100
                </Badge>
                <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-bold border-purple-500/40 text-purple-600 dark:text-purple-400">
                  {gradeDisplay}
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40" style={{ borderColor: 'var(--border-color)' }}>
                    <th className="py-2 px-3 font-bold">Area of Assessment</th>
                    <th className="py-2 px-3 font-bold text-center w-28">Max Marks</th>
                    <th className="py-2 px-3 font-bold text-center w-36">Marks Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  <tr>
                    <td className="py-2 px-3">Research Problem, Objectives and Relevance</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">10</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.researchProblem}
                        onChange={(e) => handleScoreChange('researchProblem', e.target.value, 10)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Literature and Theory</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">20</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.literatureReview}
                        onChange={(e) => handleScoreChange('literatureReview', e.target.value, 20)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Methods and Data</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">15</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={15}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.methodology}
                        onChange={(e) => handleScoreChange('methodology', e.target.value, 15)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Analysis and Discussion</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">30</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.analysisDiscussion}
                        onChange={(e) => handleScoreChange('analysisDiscussion', e.target.value, 30)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Conclusion and Recommendations</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">5</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.conclusionRecommendations}
                        onChange={(e) => handleScoreChange('conclusionRecommendations', e.target.value, 5)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Writing Skills</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">10</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.writingSkills}
                        onChange={(e) => handleScoreChange('writingSkills', e.target.value, 10)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Project Report</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">5</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.projectReport}
                        onChange={(e) => handleScoreChange('projectReport', e.target.value, 5)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Knowledge of Study Domain</td>
                    <td className="py-2 px-3 text-center font-semibold text-muted-foreground">5</td>
                    <td className="py-2 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        className="h-8 text-xs text-center font-bold bg-background mx-auto w-24"
                        value={scores.knowledgeDomain}
                        onChange={(e) => handleScoreChange('knowledgeDomain', e.target.value, 5)}
                      />
                    </td>
                  </tr>
                  <tr className="bg-purple-500/10 font-bold border-t-2" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400">TOTAL SCORE</td>
                    <td className="py-2.5 px-3 text-center text-purple-600 dark:text-purple-400">100</td>
                    <td className="py-2.5 px-3 text-center text-purple-600 dark:text-purple-400 text-sm font-extrabold">
                      {totalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Examiner Sign-Off */}
          <div className="p-4 rounded-xl border bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-semibold">Examiner</Label>
              <p className="text-xs font-bold m-0 text-purple-600 dark:text-purple-400">
                {examinerName || 'Nana Assyne'} ({examinerRole})
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground font-semibold">Date</Label>
              <p className="text-xs m-0">
                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4" style={{ borderColor: 'var(--border-color)' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadWordDoc}
            disabled={isDownloading || isSubmitting}
            className="text-xs flex items-center gap-1.5 w-full sm:w-auto"
          >
            <Download className="size-3.5" />
            {isDownloading ? 'Generating Word Doc...' : 'Export to Word (.docx)'}
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="btn-ta-purple text-xs flex items-center gap-1.5"
              onClick={handleSaveAndSubmit}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="size-3.5" />
              {isSubmitting ? 'Saving & Generating Document...' : 'Save & Submit Assessment Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
