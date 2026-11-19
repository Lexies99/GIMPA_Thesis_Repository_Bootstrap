import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { FileText, Download, CheckCircle2, Award, AlertCircle } from 'lucide-react';
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

  const [researchProblemComments, setResearchProblemComments] = useState('');
  const [literatureComments, setLiteratureComments] = useState('');
  const [methodologyComments, setMethodologyComments] = useState('');
  const [analysisComments, setAnalysisComments] = useState('');
  const [generalComments, setGeneralComments] = useState(paper.examiner_corrections || '');

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[#eaece4] pb-4">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-[#3b7a57]" />
                GIMPA Project Assessment Report
              </DialogTitle>
              <DialogDescription>
                Official Project Assessment Report & Examiner Evaluation Form
              </DialogDescription>
            </div>
            <Badge variant="secondary">{examinerRole}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Institutional Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-[#eaece4] bg-[#fafbf8]">
            <div className="space-y-1.5">
              <Label>School</Label>
              <Input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. School of Technology and Social Sciences (SOTSS)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science and Information Systems"
              />
            </div>
          </div>

          {/* 1. Background Information */}
          <div className="p-4 rounded-xl border border-[#eaece4] bg-[#fafbf8] space-y-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#5a6552] m-0">
              1. Background Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>i. Candidate ID</Label>
                <Input value={candidateId} onChange={(e) => setCandidateId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>ii. Name of Candidate</Label>
                <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>iii. Title of Project</Label>
              <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            </div>
          </div>

          {/* Qualitative Assessment Sections 2-6 */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>2. Research Problem, Objectives and Relevance</span>
                <span className="text-[11px] text-[#6e746b] font-normal">Max: 10 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess the clarity of the problem statement, research questions, and institutional relevance..."
                value={researchProblemComments}
                onChange={(e) => setResearchProblemComments(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>3. Literature and Theory</span>
                <span className="text-[11px] text-[#6e746b] font-normal">Max: 20 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess theoretical foundation, literature review depth, synthesis of previous studies, and citation quality..."
                value={literatureComments}
                onChange={(e) => setLiteratureComments(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>4. Methods and Data</span>
                <span className="text-[11px] text-[#6e746b] font-normal">Max: 15 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess research design, data collection instruments, sampling technique, and ethical considerations..."
                value={methodologyComments}
                onChange={(e) => setMethodologyComments(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>5. Analysis and Discussion</span>
                <span className="text-[11px] text-[#6e746b] font-normal">Max: 30 Marks</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Assess rigor of data analysis, presentation of findings, interpretation, and alignment with objectives..."
                value={analysisComments}
                onChange={(e) => setAnalysisComments(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>6. General Comments & Overall Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Enter general observations, commendations, or specific instructions for corrections..."
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
              />
            </div>
          </div>

          {/* 10. Overall Assessment Rubric Table */}
          <div className="border border-[#eaece4] rounded-xl p-5 bg-[#fafbf8] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#eaece4]">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#1a1d1a] flex items-center gap-1.5 m-0">
                <Award className="size-4 text-[#3b7a57]" />
                Overall Assessment (Marks Awarded)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#6e746b]">Total:</span>
                <Badge variant="secondary">{totalScore} / 100</Badge>
                <Badge variant="default">{gradeDisplay}</Badge>
              </div>
            </div>

            <div className="overflow-x-auto bg-[#ffffff] rounded-lg border border-[#eaece4]">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Area of Assessment</th>
                    <th className="text-center w-28">Max Marks</th>
                    <th className="text-center w-36">Marks Awarded</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Research Problem, Objectives and Relevance', field: 'researchProblem' as const, max: 10 },
                    { label: 'Literature and Theory', field: 'literatureReview' as const, max: 20 },
                    { label: 'Methods and Data', field: 'methodology' as const, max: 15 },
                    { label: 'Analysis and Discussion', field: 'analysisDiscussion' as const, max: 30 },
                    { label: 'Conclusion and Recommendations', field: 'conclusionRecommendations' as const, max: 5 },
                    { label: 'Writing Skills', field: 'writingSkills' as const, max: 10 },
                    { label: 'Project Report', field: 'projectReport' as const, max: 5 },
                    { label: 'Knowledge of Study Domain', field: 'knowledgeDomain' as const, max: 5 },
                  ].map((item) => (
                    <tr key={item.field}>
                      <td>{item.label}</td>
                      <td className="text-center font-semibold text-[#6e746b]">{item.max}</td>
                      <td className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={item.max}
                          step={0.5}
                          className="h-9 text-center font-bold mx-auto w-24"
                          value={scores[item.field]}
                          onChange={(e) => handleScoreChange(item.field, e.target.value, item.max)}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#e6eedc]/50 font-bold">
                    <td className="text-[#1a1d1a]">TOTAL SCORE</td>
                    <td className="text-center text-[#1a1d1a]">100</td>
                    <td className="text-center text-[#3b7a57] text-[15px] font-extrabold">
                      {totalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-[#fbeae8] text-[12px] text-[#c93b2b] flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="border-t border-[#eaece4] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadWordDoc}
            disabled={isDownloading || isSubmitting}
          >
            <Download className="size-3.5 mr-1.5" />
            {isDownloading ? 'Generating Word Doc...' : 'Export to Word (.docx)'}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAndSubmit} disabled={isSubmitting}>
              <CheckCircle2 className="size-3.5 mr-1.5" />
              {isSubmitting ? 'Saving...' : 'Save & Submit Assessment Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
