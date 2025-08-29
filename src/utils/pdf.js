// pdf.js
// Enhanced PDF generator for Template Questionnaires

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a PDF for a template JSON and either download or return the Blob.
 * @param {Object} template  { name, category, description, questions: [{question, helperText, required, ...}], createdAt, updatedAt }
 * @param {Object} options   { download: true|false, fileName?: string, logoDataUrl?: string }
 * @returns {Blob|null}      Returns Blob when download=false, otherwise null
 */
export function generateTemplatePDF(template, options = {}) {
  const {
    download = true,
    fileName = safeName(template?.name || 'Template') + '.pdf',
    logoDataUrl = null,
    asQuestionnaire = true, // New option to format as questionnaire
  } = options;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Header (optional logo)
  if (logoDataUrl) {
    try {
      // keep logo small; adjust as needed
      doc.addImage(logoDataUrl, 'PNG', margin, y, 120, 40);
      y += 50;
    } catch (e) {
      // ignore bad logo images
    }
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(template?.name || 'Untitled Template', margin, y);
  y += 24;

  // Meta line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const meta = [
    template?.category ? `Category: ${template.category}` : null,
    template?.updatedAt ? `Updated: ${fmtDate(template.updatedAt)}` : null,
    template?.createdAt ? `Created: ${fmtDate(template.createdAt)}` : null,
  ].filter(Boolean).join('  •  ');

  if (meta) {
    doc.text(meta, margin, y);
    y += 18;
  }

  // Description
  if (template?.description) {
    const descLines = doc.splitTextToSize(template.description, pageWidth - margin * 2);
    doc.setFontSize(12);
    doc.text(descLines, margin, y);
    y += descLines.length * 14 + 8;
  }

  // Add inspection details section if questionnaire mode
  if (asQuestionnaire) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Inspection Details", margin, y);
    y += 20;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    // Create fields for inspection details
    const detailFields = [
      { label: "Inspector Name:", width: 200 },
      { label: "Date:", width: 150 },
      { label: "Location:", width: 300 },
      { label: "Project/Site ID:", width: 200 }
    ];
    
    detailFields.forEach(field => {
      // Add label
      doc.text(field.label, margin, y);
      
      // Add underline for input
      doc.setDrawColor(200);
      doc.line(
        margin + field.label.length * 6, y, 
        margin + field.width, y
      );
      
      y += 25;
    });
    
    y += 10;
  }

  // Questions as fillable form if questionnaire mode
  if (asQuestionnaire) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Inspection Questions", margin, y);
    y += 25;
    
    const questions = Array.isArray(template?.questions) ? template.questions : [];
    
    questions.forEach((q, i) => {
      // Check if we need a new page
      if (y > pageHeight - 120) {
        doc.addPage();
        y = margin;
      }
      
      // Question number and text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const questionText = `${i + 1}. ${ensureString(q?.question)}${q?.required ? ' *' : ''}`;
      const questionLines = doc.splitTextToSize(questionText, pageWidth - margin * 2);
      doc.text(questionLines, margin, y);
      y += questionLines.length * 14 + 5;
      
      // Helper text / instructions
      if (q?.helperText) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        const helperLines = doc.splitTextToSize(q.helperText, pageWidth - margin * 2 - 10);
        doc.text(helperLines, margin + 10, y);
        y += helperLines.length * 12 + 5;
      }
      
      // Input area based on question type
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      
      switch (q?.type) {
        case 'checkbox':
          // Create checkbox options
          const checkOptions = q?.options ? q.options.split('\n') : ['Yes', 'No'];
          checkOptions.forEach((option, idx) => {
            // Draw checkbox
            doc.rect(margin, y - 8, 12, 12);
            doc.text(option.trim(), margin + 20, y);
            y += 20;
          });
          break;
          
        case 'radio':
          // Create radio options
          const radioOptions = q?.options ? q.options.split('\n') : ['Yes', 'No'];
          radioOptions.forEach((option, idx) => {
            // Draw circle
            doc.circle(margin + 5, y - 3, 6);
            doc.text(option.trim(), margin + 20, y);
            y += 20;
          });
          break;
          
        case 'select':
          // Create select-style dropdown area
          doc.setDrawColor(180);
          doc.rect(margin, y - 15, 200, 25);
          doc.setFontSize(9);
          doc.setTextColor(100);
          const selectOptions = q?.options ? q.options.split('\n').join(', ') : 'Select an option';
          doc.text(selectOptions, margin + 10, y);
          doc.setTextColor(0);
          y += 20;
          break;
          
        case 'date':
          // Date input
          doc.setDrawColor(180);
          doc.rect(margin, y - 15, 150, 25);
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text('MM/DD/YYYY', margin + 10, y);
          doc.setTextColor(0);
          y += 20;
          break;
          
        case 'number':
          // Number input
          doc.setDrawColor(180);
          doc.rect(margin, y - 15, 100, 25);
          y += 20;
          break;
          
        case 'text':
        default:
          // Text input area - multi-line
          doc.setDrawColor(180);
          doc.rect(margin, y - 15, pageWidth - margin * 2, 60);
          y += 65;
      }
      
      // Add space between questions
      y += 15;
    });
    
    // Add signature area
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }
    
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("Notes & Comments:", margin, y);
    y += 15;
    
    // Comments box
    doc.setDrawColor(180);
    doc.rect(margin, y, pageWidth - margin * 2, 80);
    y += 100;
    
    // Signature area
    doc.setFont('helvetica', 'bold');
    doc.text("Inspector Signature:", margin, y);
    doc.line(margin + 150, y, pageWidth - margin, y);
    y += 25;
    
    doc.text("Date:", margin, y);
    doc.line(margin + 50, y, margin + 200, y);
  }
  // Use table format if not questionnaire
  else {
    // Questions table
    const rows = (Array.isArray(template?.questions) ? template.questions : []).map((q, i) => ([
      String(i + 1),
      ensureString(q?.question),
      q?.required ? 'Yes' : 'No',
      ensureString(q?.helperText),
    ]));

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [240, 240, 240] },
      bodyStyles: { valign: 'top' },
      styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
      head: [['#', 'Question', 'Required', 'Notes']],
      body: rows.length ? rows : [['—', 'No questions found', '—', '—']],
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 70, halign: 'center' },
      },
    });
  }

  // Footer (page numbers)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    const footerText = `Page ${i} of ${pageCount}`;
    doc.text(footerText, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
  }

  if (download) {
    doc.save(fileName);
    return null;
  } else {
    // return Blob for uploading or previewing
    return doc.output('blob');
  }
}

function fmtDate(isoOrString) {
  try {
    const d = new Date(isoOrString);
    if (Number.isNaN(d.getTime())) return String(isoOrString);
    return d.toLocaleString();
  } catch {
    return String(isoOrString || '');
  }
}

function ensureString(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function safeName(name) {
  return String(name).replace(/[\/\\:*?"<>|]+/g, '_').slice(0, 120);
}