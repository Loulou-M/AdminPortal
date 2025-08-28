// TemplateForm.jsx
// Template Form Component for Admin Portal

import React, { useState, useEffect } from 'react';
import { createTemplate, updateTemplate, getTemplate } from '../../services/templates.service';
import { saveToStorage, loadFromStorage } from '../../utils/storage';

const TemplateForm = ({ templateId, onSave, onCancel }) => {
  // Template state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    questions: [{ question: '', type: 'text', required: false }]
  });

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // If templateId is provided, load template data
  useEffect(() => {
    if (templateId) {
      setIsEditing(true);
      loadTemplate(templateId);
    } else {
      // Try to load draft from localStorage
      const savedDraft = loadFromStorage('template_draft');
      if (savedDraft) {
        setFormData(savedDraft);
      }
    }
  }, [templateId]);

  // Save draft to localStorage when formData changes
  useEffect(() => {
    if (!isEditing) {
      saveToStorage('template_draft', formData);
    }
  }, [formData, isEditing]);

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
          ? template.questions
          : [{ question: '', type: 'text', required: false }]
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
  };

  // Handle question field changes
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  // Add a new question
  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question: '', type: 'text', required: false }]
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

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

      let result;

      if (isEditing) {
        // Update existing template
        result = await updateTemplate(templateId, formData);
      } else {
        // Create new template
        result = await createTemplate(formData);
        // Clear draft after successful save
        saveToStorage('template_draft', null);
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

  // Discard changes
  const handleDiscard = () => {
    if (!isEditing) {
      // Clear draft
      saveToStorage('template_draft', null);
    }

    if (onCancel) {
      onCancel();
    }
  };

  if (isLoading) {
    return (
      <div className="template-form loading">
        <p>Loading template...</p>
      </div>
    );
  }

  return (
    <div className="template-form">
      <h2>{isEditing ? 'Edit Template' : 'Create New Inspection Template'}</h2>

      {error && (
        <div className="form-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
          />
        </div>

        <div className="form-group">
          <label htmlFor="template-category">Category:</label>
          <select
            id="template-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
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
          />
        </div>

        <div className="form-group">
          <label>Questions:</label>

          <div className="questions-container">
            {formData.questions.map((question, index) => (
              <div key={index} className="question-item">
                <div className="question-header">
                  <span className="question-number">Question {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="remove-question-button"
                    disabled={formData.questions.length <= 1}
                  >
                    Remove
                  </button>
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
                    />
                  </div>

                  <div className="question-settings">
                    <div className="question-type">
                      <label htmlFor={`question-type-${index}`}>Type:</label>
                      <select
                        id={`question-type-${index}`}
                        value={question.type}
                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
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
                      <label>
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                        />
                        Required
                      </label>
                    </div>
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
                      />
                      <small className="options-help">Enter each option on a new line</small>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="add-question-button"
            >
              Add Question
            </button>
          </div>
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
            {isSaving ? 'Saving...' : (isEditing ? 'Update Template' : 'Save Template')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;