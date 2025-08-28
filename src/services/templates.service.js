// templates.service.js
// Service for managing inspection templates in Google Drive

import { createFile, updateFile, deleteFile, listFiles, getFileContent } from './drive.service';
import { generateTemplatePDF } from '../utils/pdf';

// Default templates folder ID - replace with your actual folder ID for templates
const TEMPLATES_FOLDER_ID = '1idfXbARgPMcHtniXwLtCQf3c-34rQMIY';

/**
 * Get all templates from the templates folder
 * @returns {Promise<Array>} Promise that resolves with templates array
 */
export const getTemplates = async () => {
  try {
    console.log('templates.service: Getting all templates...');

    // Get all JSON files in the templates folder
    const files = await listFiles({
      folderId: TEMPLATES_FOLDER_ID,
      query: "mimeType='application/json'"
    });

    console.log(`templates.service: Found ${files.length} template files`);

    // Fetch content for each template file
    const templates = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await getFileContent(file.id);
          const template = JSON.parse(content);

          // Find matching PDF by name prefix
          const pdfFiles = await listFiles({
            folderId: TEMPLATES_FOLDER_ID,
            query: `name contains '${template.name}' and mimeType='application/pdf'`
          });

          const pdfFile = pdfFiles.length > 0 ? pdfFiles[0] : null;

          return {
            ...template,
            fileId: file.id,
            fileName: file.name,
            pdfFileId: pdfFile ? pdfFile.id : null,
            pdfFileName: pdfFile ? pdfFile.name : null,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime
          };
        } catch (error) {
          console.warn(`templates.service: Failed to parse template ${file.name}:`, error);
          return null;
        }
      })
    );

    return templates.filter(template => template !== null);
  } catch (error) {
    console.error('templates.service: Error fetching templates:', error);
    throw error;
  }
};

/**
 * Get a single template by ID
 * @param {string} templateId - Template file ID
 * @returns {Promise<Object>} Promise that resolves with template object
 */
export const getTemplate = async (templateId) => {
  try {
    console.log(`templates.service: Getting template with ID ${templateId}`);

    const content = await getFileContent(templateId);
    const template = JSON.parse(content);

    // Find matching PDF
    const pdfFiles = await listFiles({
      folderId: TEMPLATES_FOLDER_ID,
      query: `name contains '${template.name}' and mimeType='application/pdf'`
    });

    const pdfFile = pdfFiles.length > 0 ? pdfFiles[0] : null;

    return {
      ...template,
      fileId: templateId,
      pdfFileId: pdfFile ? pdfFile.id : null,
      pdfFileName: pdfFile ? pdfFile.name : null
    };
  } catch (error) {
    console.error(`templates.service: Error fetching template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Create a new template (JSON + PDF)
 */
export const createTemplate = async (templateData) => {
  try {
    console.log('templates.service: Creating new template:', templateData.name);

    const { name, category, description, questions } = templateData;

    if (!name) throw new Error('Template name is required');
    if (!questions || !Array.isArray(questions)) throw new Error('Questions must be an array');

    // Create template object
    const template = {
      name,
      category: category || 'General',
      description: description || '',
      questions: questions.filter(q => q.question && q.question.trim()),
      status: 'Active',
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save JSON
    const jsonContent = JSON.stringify(template, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFileName = `${name}_${timestamp}.json`;

    const jsonResult = await createFile({
      name: jsonFileName,
      mimeType: 'application/json',
      parents: [TEMPLATES_FOLDER_ID],
      content: jsonContent
    });

    // Save PDF
    const pdfBlob = generateTemplatePDF(template);
    const pdfFile = new File([pdfBlob], `${name}.pdf`, { type: 'application/pdf' });

    const pdfResult = await createFile({
      name: pdfFile.name,
      mimeType: 'application/pdf',
      parents: [TEMPLATES_FOLDER_ID],
      content: pdfFile
    });

    return {
      ...template,
      fileId: jsonResult.id,
      fileName: jsonResult.name,
      pdfFileId: pdfResult.id,
      pdfFileName: pdfResult.name
    };
  } catch (error) {
    console.error('templates.service: Error creating template:', error);
    throw error;
  }
};

/**
 * Update an existing template (updates JSON + replaces PDF)
 */
export const updateTemplate = async (templateId, templateData) => {
  try {
    console.log(`templates.service: Updating template with ID ${templateId}`);

    const existingTemplate = await getTemplate(templateId);

    const updatedTemplate = {
      ...existingTemplate,
      ...templateData,
      updatedAt: new Date().toISOString(),
      version: existingTemplate.version
        ? incrementVersion(existingTemplate.version)
        : '1.0'
    };

    const { fileId, pdfFileId, ...templateToSave } = updatedTemplate;

    // Update JSON file
    const jsonContent = JSON.stringify(templateToSave, null, 2);
    await updateFile({
      fileId: templateId,
      content: jsonContent,
      mimeType: 'application/json'
    });

    // Update/replace PDF file
    const pdfBlob = generateTemplatePDF(updatedTemplate);
    const pdfFile = new File([pdfBlob], `${updatedTemplate.name}.pdf`, { type: 'application/pdf' });

    if (pdfFileId) {
      await updateFile({
        fileId: pdfFileId,
        content: pdfFile,
        mimeType: 'application/pdf'
      });
    } else {
      const pdfResult = await createFile({
        name: pdfFile.name,
        mimeType: 'application/pdf',
        parents: [TEMPLATES_FOLDER_ID],
        content: pdfFile
      });
      updatedTemplate.pdfFileId = pdfResult.id;
      updatedTemplate.pdfFileName = pdfResult.name;
    }

    return updatedTemplate;
  } catch (error) {
    console.error(`templates.service: Error updating template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Delete a template (JSON + PDF)
 */
export const deleteTemplate = async (templateId) => {
  try {
    console.log(`templates.service: Deleting template with ID ${templateId}`);

    const template = await getTemplate(templateId);

    // Delete JSON
    await deleteFile(templateId);

    // Delete PDF if exists
    if (template.pdfFileId) {
      await deleteFile(template.pdfFileId);
    }

    console.log(`templates.service: Template and PDF deleted successfully`);
    return true;
  } catch (error) {
    console.error(`templates.service: Error deleting template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Upload a generic file (e.g., PDF) to the templates folder
 */
export const uploadFile = async (file, mimeType = 'application/pdf') => {
  try {
    console.log('templates.service: Uploading file to Google Drive...');

    const result = await createFile({
      name: file.name,
      mimeType,
      parents: [TEMPLATES_FOLDER_ID],
      content: file
    });

    console.log(`templates.service: File uploaded with ID ${result.id}`);
    return result;
  } catch (error) {
    console.error('templates.service: Error uploading file:', error);
    throw error;
  }
};

/**
 * Helper function to increment version number (e.g., "v1.0" → "v1.1")
 */
function incrementVersion(version) {
  if (!version || typeof version !== 'string') return '1.0';

  const versionMatch = version.match(/^v?(\d+)\.(\d+)$/);
  if (!versionMatch) return '1.0';

  const major = parseInt(versionMatch[1], 10);
  const minor = parseInt(versionMatch[2], 10) + 1;

  return version.startsWith('v') ? `v${major}.${minor}` : `${major}.${minor}`;
}