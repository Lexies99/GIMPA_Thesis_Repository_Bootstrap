import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from 'docx';

export interface AssessmentRubricScores {
  researchProblem: number; // Max 10
  literatureReview: number; // Max 20
  methodology: number; // Max 15
  analysisDiscussion: number; // Max 30
  conclusionRecommendations: number; // Max 5
  writingSkills: number; // Max 10
  projectReport: number; // Max 5
  knowledgeDomain: number; // Max 5
}

export interface ProjectAssessmentData {
  school?: string;
  department?: string;
  candidateId?: string;
  candidateName?: string;
  projectTitle?: string;
  researchProblemComments?: string;
  literatureComments?: string;
  methodologyComments?: string;
  analysisComments?: string;
  generalComments?: string;
  scores: AssessmentRubricScores;
  examinerName: string;
  examinerRole?: string; // "Internal Examiner" | "External Examiner"
  signatureDate?: string;
}

export function calculateTotalScore(scores: AssessmentRubricScores): number {
  return (
    (Number(scores.researchProblem) || 0) +
    (Number(scores.literatureReview) || 0) +
    (Number(scores.methodology) || 0) +
    (Number(scores.analysisDiscussion) || 0) +
    (Number(scores.conclusionRecommendations) || 0) +
    (Number(scores.writingSkills) || 0) +
    (Number(scores.projectReport) || 0) +
    (Number(scores.knowledgeDomain) || 0)
  );
}

export function calculateGrade(total: number): string {
  if (total >= 80) return 'A (Distinction)';
  if (total >= 75) return 'B+ (Very Good)';
  if (total >= 70) return 'B (Good)';
  if (total >= 65) return 'C+ (Credit)';
  if (total >= 60) return 'C (Pass)';
  if (total >= 55) return 'D+ (Marginal Pass)';
  if (total >= 50) return 'D (Pass)';
  return 'F (Fail)';
}

export async function generateProjectAssessmentDocx(data: ProjectAssessmentData): Promise<Blob> {
  const totalScore = calculateTotalScore(data.scores);
  const gradeStr = calculateGrade(totalScore);

  const schoolName = data.school || 'School of Technology and Social Sciences (SOTSS)';
  const deptName = data.department || 'Department of Computer Science and Information Systems';
  const candidateId = data.candidateId || 'N/A';
  const candidateName = data.candidateName || 'Candidate';
  const projectTitle = data.projectTitle || 'Untitled Project';
  const dateStr = data.signatureDate || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const createSectionHeading = (title: string) =>
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 22, // 11pt
          font: 'Calibri',
          color: '003366',
        }),
      ],
    });

  const createCommentsBox = (text?: string) =>
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: (text && text.trim().length > 0) ? text : 'No specific comments recorded.',
          size: 21,
          font: 'Calibri',
          color: '2D3748',
        }),
      ],
    });

  const createTableCell = (text: string, isHeader = false, isBold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, widthPercent?: number) =>
    new TableCell({
      width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
      shading: isHeader
        ? { fill: '003366', type: ShadingType.CLEAR }
        : undefined,
      margins: { top: 120, bottom: 120, left: 150, right: 150 },
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text,
              bold: isHeader || isBold,
              size: 20,
              font: 'Calibri',
              color: isHeader ? 'FFFFFF' : '2D3748',
            }),
          ],
        }),
      ],
    });

  const rubricRows: TableRow[] = [
    new TableRow({
      children: [
        createTableCell('Area of Assessment', true, true, AlignmentType.LEFT, 60),
        createTableCell('Maximum Marks Obtainable', true, true, AlignmentType.CENTER, 20),
        createTableCell('Marks Awarded', true, true, AlignmentType.CENTER, 20),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Research Problem, Objectives and Relevance', false, false, AlignmentType.LEFT),
        createTableCell('10', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.researchProblem ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Literature and Theory', false, false, AlignmentType.LEFT),
        createTableCell('20', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.literatureReview ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Methods and Data', false, false, AlignmentType.LEFT),
        createTableCell('15', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.methodology ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Analysis and Discussion', false, false, AlignmentType.LEFT),
        createTableCell('30', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.analysisDiscussion ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Conclusion and Recommendations', false, false, AlignmentType.LEFT),
        createTableCell('5', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.conclusionRecommendations ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Writing Skills', false, false, AlignmentType.LEFT),
        createTableCell('10', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.writingSkills ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Project Report', false, false, AlignmentType.LEFT),
        createTableCell('5', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.projectReport ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('Knowledge of Study Domain', false, false, AlignmentType.LEFT),
        createTableCell('5', false, false, AlignmentType.CENTER),
        createTableCell(String(data.scores.knowledgeDomain ?? 0), false, true, AlignmentType.CENTER),
      ],
    }),
    new TableRow({
      children: [
        createTableCell('TOTAL', false, true, AlignmentType.LEFT),
        createTableCell('100', false, true, AlignmentType.CENTER),
        createTableCell(String(totalScore), false, true, AlignmentType.CENTER),
      ],
    }),
  ];

  const rubricTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rubricRows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'GHANA INSTITUTE OF MANAGEMENT & PUBLIC ADMINISTRATION',
                bold: true,
                size: 26, // 13pt
                font: 'Calibri',
                color: '003366',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: schoolName.toUpperCase(),
                bold: true,
                size: 22,
                font: 'Calibri',
                color: '4A5568',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: deptName.toUpperCase(),
                bold: true,
                size: 21,
                font: 'Calibri',
                color: '4A5568',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
            children: [
              new TextRun({
                text: 'PROJECT ASSESSMENT REPORT',
                bold: true,
                size: 26,
                font: 'Calibri',
                color: '003366',
                underline: {},
              }),
            ],
          }),

          // 1. Background Information
          createSectionHeading('1. BACKGROUND INFORMATION'),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'i.   Candidate ID:\t\t', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: candidateId, size: 21, font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'ii.  Name of Candidate:\t', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: candidateName, size: 21, font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: 'iii. Title of Project:\t\t', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: projectTitle, bold: true, size: 21, font: 'Calibri', color: '003366' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: '(Kindly record your assessment of the following project areas)',
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '718096',
              }),
            ],
          }),

          // Qualitative Assessment Sections
          createSectionHeading('2. RESEARCH PROBLEM, OBJECTIVES AND RELEVANCE'),
          createCommentsBox(data.researchProblemComments),

          createSectionHeading('3. LITERATURE AND THEORY'),
          createCommentsBox(data.literatureComments),

          createSectionHeading('4. METHODS AND DATA'),
          createCommentsBox(data.methodologyComments),

          createSectionHeading('5. ANALYSIS AND DISCUSSION'),
          createCommentsBox(data.analysisComments),

          createSectionHeading('6. GENERAL COMMENTS'),
          createCommentsBox(data.generalComments),

          // 10. Overall Assessment
          createSectionHeading('10. OVERALL ASSESSMENT'),
          rubricTable,

          // Grade & Percentage
          new Paragraph({
            spacing: { before: 240, after: 160 },
            children: [
              new TextRun({ text: 'Grade: ', bold: true, size: 22, font: 'Calibri' }),
              new TextRun({ text: `${gradeStr} (${totalScore}%)`, bold: true, size: 22, font: 'Calibri', color: '003366' }),
            ],
          }),

          // Examiner Sign-off
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({ text: 'Examiner: ', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: `${data.examinerName} (${data.examinerRole || 'Examiner'})`, size: 21, font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Signature: ', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: `[Electronically Verified - ${data.examinerName}]`, italics: true, size: 20, font: 'Calibri', color: '4A5568' }),
              new TextRun({ text: '\t\t\tDate: ', bold: true, size: 21, font: 'Calibri' }),
              new TextRun({ text: dateStr, size: 21, font: 'Calibri' }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function createAssessmentDocxFile(data: ProjectAssessmentData): Promise<File> {
  const blob = await generateProjectAssessmentDocx(data);
  const safeTitle = (data.projectTitle || 'Assessment_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const filename = `${safeTitle}_Project_Assessment_Report.docx`;
  return new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
