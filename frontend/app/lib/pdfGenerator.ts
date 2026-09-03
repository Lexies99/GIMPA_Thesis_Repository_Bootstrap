import { jsPDF } from 'jspdf';

export interface TopicPdfData {
  title?: string | null;
  abstract?: string | null;
  authorName?: string | null;
  department?: string | null;
  discipline?: string | null;
  documentType?: string | null;
  paperId?: number | string | null;
  submissionDate?: string | null;
  workMode?: string | null;
}

export function generateTopicPdfBlob(data: TopicPdfData): { blob: Blob; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(30, 27, 75); // Deep Indigo (#1e1b4b)
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION', pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 231, 255);
  doc.text('SCHOOL OF TECHNOLOGY & COMPUTING', pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(9);
  doc.text('THESIS & RESEARCH REPOSITORY SYSTEM', pageWidth / 2, 28, { align: 'center' });

  let y = 48;

  // Document Badge & Title
  doc.setFillColor(243, 232, 255); // Purple tint
  doc.setDrawColor(168, 85, 247);
  doc.roundedRect(margin, y - 5, contentWidth, 12, 2, 2, 'FD');
  doc.setTextColor(126, 34, 206);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PHASE 1 — THESIS TOPIC SUBMISSION', pageWidth / 2, y + 2.5, { align: 'center' });

  y += 18;

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 42, 3, 3, 'FD');

  const leftColX = margin + 6;
  const rightColX = margin + (contentWidth / 2) + 6;
  let metaY = y + 8;

  const printMeta = (label: string, value: string | null | undefined, x: number, currentY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(value || 'N/A', (contentWidth / 2) - 12);
    doc.text(splitVal[0] || 'N/A', x, currentY + 5);
  };

  printMeta('Author / Student', data.authorName || 'Student', leftColX, metaY);
  printMeta('Department', data.department || data.discipline || 'Computer Science & Info Systems', rightColX, metaY);

  metaY += 14;
  printMeta('Submission ID', data.paperId ? `PAPER-${data.paperId}` : 'TOPIC-SUBMISSION', leftColX, metaY);
  printMeta('Date Submitted', data.submissionDate ? new Date(data.submissionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString(), rightColX, metaY);

  y += 52;

  // Project Title Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 27, 75);
  doc.text('Project / Topic Title', margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(data.title || 'Untitled Topic', contentWidth);
  doc.text(titleLines, margin, y);
  y += (titleLines.length * 6) + 6;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Topic Short Description / Problem Statement Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text('Topic Short Description / Problem Statement', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  const descText = data.abstract || 'No description provided.';
  const descLines = doc.splitTextToSize(descText, contentWidth);

  for (let i = 0; i < descLines.length; i++) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
    doc.text(descLines[i], margin, y);
    y += 5.5;
  }

  // Footer
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Document — GIMPA Thesis & Research Repository', margin, footerY);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin, footerY, { align: 'right' });

  const blob = doc.output('blob');
  const safeTitle = (data.title || 'Topic_Submission')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const filename = `${safeTitle}_Phase1_Submission.pdf`;

  return { blob, filename };
}

export function createTopicPdfFile(data: TopicPdfData): File {
  const { blob, filename } = generateTopicPdfBlob(data);
  return new File([blob], filename, { type: 'application/pdf' });
}

export async function convertTextOrTopicToPdf(
  blob: Blob,
  filename: string,
  paperMeta?: {
    title?: string | null;
    abstract?: string | null;
    author?: string | null;
    department?: string | null;
    discipline?: string | null;
    id?: number | string | null;
    created_at?: string | null;
    document_type?: string | null;
    status?: string | null;
  }
): Promise<{ blob: Blob; filename: string }> {
  const isTxt = filename.toLowerCase().endsWith('.txt') || blob.type === 'text/plain';
  const isTopic =
    filename.toLowerCase().includes('topic_submission') ||
    paperMeta?.document_type === 'thesis_topic' ||
    paperMeta?.status === 'phase1_proposal_submitted';

  if (!isTxt && !isTopic) {
    return { blob, filename };
  }

  let text = '';
  try {
    text = await blob.text();
  } catch {
    text = paperMeta?.abstract || '';
  }

  let title = paperMeta?.title || '';
  let abstract = paperMeta?.abstract || text;

  // Extract from text template if available
  const titleMatch = text.match(/Title:\s*(.+?)(?=\nDescription:|\n\n|$)/is);
  if (titleMatch && titleMatch[1]?.trim()) {
    title = titleMatch[1].trim();
  }
  const descMatch = text.match(/Description:\s*([\s\S]+)$/i);
  if (descMatch && descMatch[1]?.trim()) {
    abstract = descMatch[1].trim();
  }

  return generateTopicPdfBlob({
    title: title || 'Thesis Topic Submission',
    abstract: abstract || 'No description provided.',
    authorName: paperMeta?.author || 'Student',
    department: paperMeta?.department || paperMeta?.discipline || 'Computer Science & Information Systems',
    discipline: paperMeta?.discipline,
    paperId: paperMeta?.id,
    submissionDate: paperMeta?.created_at,
    documentType: paperMeta?.document_type,
  });
}
