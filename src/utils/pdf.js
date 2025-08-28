import jsPDF from "jspdf";

export const generateTemplatePDF = (formData) => {
  const doc = new jsPDF();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(formData.name || "Inspection Template", 20, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Category: ${formData.category}`, 20, 30);

  // Wrap long description text
  let y = 40;
  if (formData.description) {
    const descriptionText = doc.splitTextToSize(
      `Description: ${formData.description}`,
      170 // max width (A4 page = 210mm, margin ~20mm)
    );
    doc.text(descriptionText, 20, y);
    y += descriptionText.length * 7; // move down based on how many lines used
  } else {
    doc.text("Description: -", 20, y);
    y += 10;
  }

  // Questions
  y += 10;
  formData.questions.forEach((q, index) => {
    const questionText = `${index + 1}. ${q.question} (${q.type}${
      q.required ? ", required" : ""
    })`;

    // Wrap question
    const wrappedQuestion = doc.splitTextToSize(questionText, 170);

    // Add new page if near bottom
    if (y + wrappedQuestion.length * 7 > 280) {
      doc.addPage();
      y = 20;
    }

    doc.text(wrappedQuestion, 20, y);
    y += wrappedQuestion.length * 7 + 5; // spacing between questions
  });

  // Return as Blob (for uploading)
  return doc.output("blob");
};