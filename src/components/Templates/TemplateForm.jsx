// TemplateForm.jsx
// Professional Template Form Component with PDF Generation and Google Drive Integration

import React, { useState, useEffect } from 'react';
import { createTemplate, updateTemplate, getTemplate } from '../../services/templates.service';
import { createFile } from '../../services/drive.service';
import { generateTemplatePDF } from '../../utils/pdf';
import { checkAuthStatus, redirectToAuth } from '../../services/auth.service';

const TemplateForm = ({ templateId, onSave, onCancel }) => {
  // Template state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    questions: [{ 
      question: '', 
      type: 'text', 
      required: false,
      helperText: '' 
    }]
  });

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pdfSaveStatus, setPdfSaveStatus] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthed = await checkAuthStatus();
      setIsAuthenticated(isAuthed);
    };
    
    checkAuth();
  }, []);

  // If templateId is provided, load template data
  useEffect(() => {
    if (templateId && isAuthenticated) {
      setIsEditing(true);
      loadTemplate(templateId);
    }
  }, [templateId, isAuthenticated]);

  // Load template data from Google Drive
  const loadTemplate = async (id) => {
    try {
      setIsLoading(true);
      setError(null);

      const template = await getTemplate(id);

      setFormData({
        name: template.name || '',
        category: template.category || '',
        description: template.description || '',
        questions: template.questions && template.questions.length > 0
          ? template.questions.map(q => ({
              ...q,
              helperText: q.helperText || '' // Ensure helperText exists for PDF generation
            }))
          : [{ question: '', type: 'text', required: false, helperText: '' }]
      });
    } catch (error) {
      console.error('Error loading template:', error);
      setError(`Failed to load template: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear success message when form changes
    if (successMessage) setSuccessMessage('');
  };

  // Handle question field changes
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setFormData({ ...formData, questions: updatedQuestions });
    // Clear success message when form changes
    if (successMessage) setSuccessMessage('');
  };

  // Add a new question
  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { 
        question: '', 
        type: 'text', 
        required: false,
        helperText: '' 
      }]
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  // Move question up
  const moveQuestionUp = (index) => {
    if (index === 0) return;
    const updatedQuestions = [...formData.questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[index - 1];
    updatedQuestions[index - 1] = temp;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  // Move question down
  const moveQuestionDown = (index) => {
    if (index === formData.questions.length - 1) return;
    const updatedQuestions = [...formData.questions];
    const temp = updatedQuestions[index];
    updatedQuestions[index] = updatedQuestions[index + 1];
    updatedQuestions[index + 1] = temp;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      redirectToAuth();
      return;
    }

    // Validate form
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!formData.category.trim()) {
      setError('Please select a category for this template');
      return;
    }

    if (formData.questions.some(q => !q.question.trim())) {
      setError('All questions must have content');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage('');
      setPdfSaveStatus(null);

      // Add timestamp metadata
      const now = new Date().toISOString();
      const templateWithDates = {
        ...formData,
        updatedAt: now,
        createdAt: isEditing ? formData.createdAt || now : now
      };

      // Generate PDF as a Blob (don't download)
      const pdfBlob = generateTemplatePDF(templateWithDates, {
        download: false,
        fileName: `${formData.name.replace(/\s+/g, '_')}.pdf`,
        asQuestionnaire: true
      });

      let result;

      if (isEditing) {
        // Update existing template JSON
        result = await updateTemplate(templateId, templateWithDates);
        
        // Update the PDF file
        if (pdfBlob) {
          try {
            setPdfSaveStatus('saving');
            const parentFolderId = result.parents?.[0] || '';
            await createFile({
              name: `${result.name} - Form.pdf`,
              mimeType: 'application/pdf',
              parents: parentFolderId ? [parentFolderId] : [],
              content: pdfBlob
            });
            setPdfSaveStatus('success');
          } catch (pdfError) {
            console.error('Failed to update PDF file:', pdfError);
            setPdfSaveStatus('error');
            // Non-blocking error - continue with success
          }
        }

        setSuccessMessage('Template updated successfully');
      } else {
        // Create new template JSON
        result = await createTemplate(templateWithDates);

        // Create PDF file in the same folder
        if (pdfBlob && result.fileId) {
          try {
            setPdfSaveStatus('saving');
            // Get parent folder ID from the result
            const parentFolderId = result.parents?.[0] || '';
            await createFile({
              name: `${result.name} - Form.pdf`,
              mimeType: 'application/pdf',
              parents: parentFolderId ? [parentFolderId] : [],
              content: pdfBlob
            });
            setPdfSaveStatus('success');
          } catch (pdfError) {
            console.error('Failed to create PDF file:', pdfError);
            setPdfSaveStatus('error');
            // Non-blocking error - continue with success
          }
        }

        setSuccessMessage('Template created successfully');
      }

      // Notify parent component
      if (onSave) {
        onSave(result);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setError(`Failed to save template: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF for preview/download
  const handleGeneratePDF = () => {
    // Add timestamp metadata
    const now = new Date().toISOString();
    const templateWithDates = {
      ...formData,
      updatedAt: now,
      createdAt: isEditing ? formData.createdAt || now : now
    };

    // Generate and download PDF
    generateTemplatePDF(templateWithDates, {
      download: true,
      fileName: `${formData.name.replace(/\s+/g, '_')}.pdf`,
      asQuestionnaire: true
    });
  };

  // Discard changes
  const handleDiscard = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="template-form">
        <div className="auth-required">
          <h2>Template Form</h2>
          <div className="auth-message">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V17M12 7V13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Please sign in with Google to create templates</p>
          </div>
          <button 
            onClick={() => redirectToAuth()}
            className="sign-in-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="google-icon">
              <path d="M19.76 10.2375C19.76 9.5375 19.7067 8.8375 19.6 8.1375H10.24V11.975H15.72C15.48 13.1875 14.76 14.2 13.68 14.9V17.3875H16.96C18.88 15.675 19.76 13.1875 19.76 10.2375Z" fill="#4285F4" />
              <path d="M10.24 20C12.88 20 15.08 19.1375 16.9733 17.3875L13.6933 14.9C12.76 15.5375 11.6 15.9375 10.24 15.9375C7.6 15.9375 5.36 14.2 4.56 11.8H1.16V14.375C3.04 17.8375 6.4 20 10.24 20Z" fill="#34A853" />
              <path d="M4.56 11.8C4.36 11.2 4.24 10.6 4.24 10C4.24 9.4 4.36 8.8 4.56 8.2V5.625H1.16C0.44 7 0 8.5 0 10C0 11.5 0.44 13 1.16 14.375L4.56 11.8Z" fill="#FBBC05" />
              <path d="M10.24 4.0625C11.76 4.0625 13.12 4.5625 14.16 5.55L17.04 2.675C15.08 1.025 12.88 0 10.24 0C6.4 0 3.04 2.1625 1.16 5.625L4.56 8.2C5.36 5.8 7.6 4.0625 10.24 4.0625Z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="template-form loading">
        <div className="loading-spinner">
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="none" strokeWidth="4" stroke="#f3f3f3" />
            <circle cx="20" cy="20" r="18" fill="none" strokeWidth="4" stroke="#3f9cbc" strokeDasharray="113" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-form">
      <h2 className="form-title">{isEditing ? 'Edit Template' : 'Create New Inspection Template'}</h2>

      {error && (
        <div className="form-error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="form-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.6668 5L7.50016 14.1667L3.3335 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>{successMessage}</p>
          {pdfSaveStatus === 'success' && <p className="pdf-status">PDF form saved to Google Drive</p>}
          {pdfSaveStatus === 'error' && <p className="pdf-status pdf-error">PDF form could not be saved to Drive</p>}
          <button onClick={() => setSuccessMessage('')} className="dismiss-button">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="template-form-container">
        <div className="form-section">
          <h3 className="section-title">Template Information</h3>
          
          <div className="form-group">
            <label htmlFor="template-name">Template Name:</label>
            <input
              id="template-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter template name"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="template-category">Category:</label>
            <select
              id="template-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">-- Select a Category --</option>
              <option value="Safety Inspections">Safety Inspections</option>
              <option value="Quality Inspections">Quality Inspections</option>
              <option value="Compliance Inspections">Compliance Inspections</option>
              <option value="Progress Inspections">Progress Inspections</option>
              <option value="Specialised Inspections">Specialised Inspections</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="template-description">Description:</label>
            <textarea
              id="template-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter template description"
              rows={3}
              className="form-control"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="add-question-button"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Question
            </button>
          </div>

          <div className="questions-container">
            {formData.questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  <div className="question-actions">
                    <button
                      type="button"
                      onClick={() => moveQuestionUp(index)}
                      className="move-button"
                      disabled={index === 0}
                      title="Move Up"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 11V3M7 3L3 7M7 3L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestionDown(index)}
                      className="move-button"
                      disabled={index === formData.questions.length - 1}
                      title="Move Down"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 3V11M7 11L3 7M7 11L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="remove-question-button"
                      disabled={formData.questions.length <= 1}
                      title="Remove Question"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 3H13M5 3V2C5 1.44772 5.44772 1 6 1H8C8.55228 1 9 1.44772 9 2V3M11 3V12C11 12.5523 10.5523 13 10 13H4C3.44772 13 3 12.5523 3 12V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="question-content">
                  <div className="question-text">
                    <label htmlFor={`question-${index}`}>Question:</label>
                    <input
                      id={`question-${index}`}
                      type="text"
                      value={question.question}
                      onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                      placeholder="Enter question"
                      required
                      className="form-control"
                    />
                  </div>

                  <div className="question-settings">
                    <div className="question-type">
                      <label htmlFor={`question-type-${index}`}>Type:</label>
                      <select
                        id={`question-type-${index}`}
                        value={question.type}
                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                        className="form-control"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="radio">Radio</option>
                      </select>
                    </div>

                    <div className="question-required">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                        />
                        <span className="checkbox-text">Required</span>
                      </label>
                    </div>
                  </div>

                  {/* Add helper text field for PDF notes */}
                  <div className="question-helper-text">
                    <label htmlFor={`question-helper-${index}`}>Notes/Instructions:</label>
                    <textarea
                      id={`question-helper-${index}`}
                      value={question.helperText || ''}
                      onChange={(e) => handleQuestionChange(index, 'helperText', e.target.value)}
                      placeholder="Enter notes or instructions for this question"
                      rows={2}
                      className="form-control"
                    />
                  </div>

                  {/* Options for select, radio, or checkbox types */}
                  {['select', 'radio', 'checkbox'].includes(question.type) && (
                    <div className="question-options">
                      <label htmlFor={`question-options-${index}`}>Options:</label>
                      <textarea
                        id={`question-options-${index}`}
                        value={question.options || ''}
                        onChange={(e) => handleQuestionChange(index, 'options', e.target.value)}
                        placeholder="Enter options, one per line"
                        rows={3}
                        className="form-control"
                      />
                      <small className="options-help">Enter each option on a new line</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-preview">
          <button 
            type="button" 
            onClick={handleGeneratePDF}
            className="preview-pdf-button"
            disabled={!formData.name || formData.questions.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 9V12C14 12.5304 13.7893 13.0391 13.4142 13.4142C13.0391 13.7893 12.5304 14 12 14H4C3.46957 14 2.96086 13.7893 2.58579 13.4142C2.21071 13.0391 2 12.5304 2 12V9M4 7L8 11M8 11L12 7M8 11V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Preview as PDF
          </button>
          <p className="preview-help">This will generate a fillable questionnaire PDF based on your template.</p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleDiscard}
            className="cancel-button"
            disabled={isSaving}
          >
            {isEditing ? 'Cancel' : 'Discard'}
          </button>

          <button
            type="submit"
            className="save-button"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="40" strokeDashoffset="60">
                    <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.6668 8V12.6667C14.6668 13.0203 14.5264 13.3594 14.2764 13.6095C14.0263 13.8595 13.6872 14 13.3335 14H2.66683C2.31321 14 1.97407 13.8595 1.72402 13.6095C1.47397 13.3594 1.3335 13.0203 1.3335 12.6667V2.66667C1.3335 2.31304 1.47397 1.97391 1.72402 1.72386C1.97407 1.47381 2.31321 1.33333 2.66683 1.33333H10.0002L14.6668 6V8Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.3335 8.66667C5.3335 8.84348 5.40373 9.01305 5.52876 9.13807C5.65378 9.2631 5.82335 9.33333 6.00016 9.33333H10.0002C10.177 9.33333 10.3465 9.2631 10.4716 9.13807C10.5966 9.01305 10.6668 8.84348 10.6668 8.66667V7.33333C10.6668 7.15652 10.5966 6.98695 10.4716 6.86193C10.3465 6.7369 10.177 6.66667 10.0002 6.66667H6.00016C5.82335 6.66667 5.65378 6.7369 5.52876 6.86193C5.40373 6.98695 5.3335 7.15652 5.3335 7.33333V8.66667Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isEditing ? 'Update Template' : 'Save Template'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;