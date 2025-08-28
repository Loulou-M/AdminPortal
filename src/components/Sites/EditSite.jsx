import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { updateSite } from '../../services/site.service';
import { loadFromStorage, saveToStorage } from '../../utils/storage';

const EditSite = ({ site, onSave, onCancel }) => {
  // Initialize form state with site data or empty values
  const [formData, setFormData] = useState({
    name: '',
    site_id: '',
    location: '',
    folder_type: 'GoogleDrive',
    folder_link: '',
    description: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Load site data into form when component mounts or site changes
  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name || '',
        site_id: site.site_id || site.id || '',
        location: site.location || '',
        folder_type: site.folder_type || site.folderType || 'GoogleDrive',
        folder_link: site.folder_link || site.folderLink || '',
        description: site.description || ''
      });
      setIsDirty(false);
    }
  }, [site]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Mark form as dirty (has unsaved changes)
    setIsDirty(true);
    
    // Clear success message when form changes
    if (success) setSuccess(false);
    
    // Clear error when form changes
    if (error) setError(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Site name is required');
      return;
    }
    
    if (!formData.location.trim()) {
      setError('Site location is required');
      return;
    }
    
    if (!formData.folder_link.trim()) {
      setError('Folder link is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Update site
      const updatedSite = await updateSite(formData.site_id, formData);
      
      // Show success message
      setSuccess(true);
      setIsDirty(false);
      
      // Notify parent component
      if (onSave) {
        onSave(updatedSite);
      }
    } catch (err) {
      console.error('Error updating site:', err);
      setError(err.message || 'Failed to update site. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Discard changes and call onCancel prop
  const handleCancel = () => {
    if (isDirty) {
      // Ask for confirmation if form has unsaved changes
      if (!window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        return;
      }
    }
    
    if (onCancel) {
      onCancel();
    }
  };
  
  // Check if the link is valid for QR code generation
  const hasValidLink = () => {
    return formData.folder_link && formData.folder_link.trim().length > 0;
  };
  
  return (
    <div className="edit-site">
      <style jsx>{`
        .edit-site {
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .edit-site-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .edit-site-header h2 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }
        
        .back-button {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
        }
        
        .back-button:hover {
          color: #333;
          text-decoration: underline;
        }
        
        .error-message {
          padding: 12px;
          background-color: #ffeded;
          border-left: 4px solid #ff5252;
          margin-bottom: 20px;
          border-radius: 4px;
          color: #d32f2f;
        }
        
        .success-message {
          padding: 12px;
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          margin-bottom: 20px;
          border-radius: 4px;
          color: #2e7d32;
        }
        
        .site-form {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        
        @media (min-width: 640px) {
          .site-form {
            grid-template-columns: 1fr 1fr;
          }
          
          .form-group.full-width {
            grid-column: 1 / -1;
          }
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        
        .form-group label {
          font-weight: 500;
          margin-bottom: 8px;
          color: #555;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #2196f3;
          outline: none;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .form-group .help-text {
          font-size: 0.85rem;
          color: #666;
          margin-top: 4px;
        }
        
        .form-group.read-only input {
          background-color: #f5f5f5;
          color: #666;
          cursor: not-allowed;
        }
        
        .form-preview {
          grid-column: 1 / -1;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 8px;
          margin-top: 16px;
        }
        
        .preview-header {
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .preview-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #333;
        }
        
        .preview-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }
        
        @media (min-width: 640px) {
          .preview-content {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        
        .qr-code-container {
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .preview-details {
          flex: 1;
        }
        
        .preview-details p {
          margin: 8px 0;
          line-height: 1.5;
        }
        
        .preview-details .label {
          font-weight: 500;
          color: #555;
        }
        
        .link-display {
          padding: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
          word-break: break-all;
          margin-top: 4px;
        }
        
        .form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        
        .cancel-button {
          padding: 10px 16px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #333;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background-color: #e0e0e0;
        }
        
        .save-button {
          padding: 10px 20px;
          background-color: #2196f3;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .save-button:hover {
          background-color: #1976d2;
        }
        
        .save-button:disabled {
          background-color: #90caf9;
          cursor: not-allowed;
        }
      `}</style>

      <div className="edit-site-header">
        <h2>Edit Construction Site</h2>
        <button className="back-button" onClick={handleCancel}>
          <span>←</span> Back to Sites
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <p>Site updated successfully!</p>
        </div>
      )}
      
      <div className="site-form">
        {/* Site ID (read-only) */}
        <div className="form-group read-only">
          <label htmlFor="site_id">Site ID:</label>
          <input
            type="text"
            id="site_id"
            name="site_id"
            value={formData.site_id}
            readOnly
          />
          <span className="help-text">Site ID cannot be changed</span>
        </div>
        
        {/* Site Name */}
        <div className="form-group">
          <label htmlFor="name">Site Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter site name"
            required
          />
        </div>
        
        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Enter site location"
            required
          />
        </div>
        
        {/* Folder Type */}
        <div className="form-group">
          <label htmlFor="folder_type">Storage Type:</label>
          <select
            id="folder_type"
            name="folder_type"
            value={formData.folder_type}
            onChange={handleChange}
          >
            <option value="GoogleDrive">Google Drive</option>
            <option value="OneDrive">OneDrive</option>
            <option value="Dropbox">Dropbox</option>
            <option value="SharePoint">SharePoint</option>
            <option value="NAS">NAS</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        {/* Folder Link */}
        <div className="form-group full-width">
          <label htmlFor="folder_link">Folder Link:</label>
          <input
            type="text"
            id="folder_link"
            name="folder_link"
            value={formData.folder_link}
            onChange={handleChange}
            placeholder={`Enter ${formData.folder_type} folder link`}
            required
          />
          <span className="help-text">
            This link will be encoded in the QR code for this site
          </span>
        </div>
        
        {/* Description */}
        <div className="form-group full-width">
          <label htmlFor="description">Description (Optional):</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter additional site details or notes"
          />
        </div>
        
        {/* QR Code Preview */}
        <div className="form-preview">
          <div className="preview-header">
            <h3>QR Code Preview</h3>
          </div>
          
          <div className="preview-content">
            {hasValidLink() ? (
              <div className="qr-code-container">
                <QRCode
                  value={formData.folder_link}
                  size={150}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            ) : (
              <div className="qr-code-container" style={{ padding: '24px' }}>
                <p>Add a folder link to generate QR code</p>
              </div>
            )}
            
            <div className="preview-details">
              <p>
                <span className="label">Site Name:</span><br />
                {formData.name || '(Not set)'}
              </p>
              
              <p>
                <span className="label">Location:</span><br />
                {formData.location || '(Not set)'}
              </p>
              
              <p>
                <span className="label">Storage Type:</span><br />
                {formData.folder_type}
              </p>
              
              <p>
                <span className="label">Link:</span><br />
                {formData.folder_link ? (
                  <span className="link-display">{formData.folder_link}</span>
                ) : (
                  '(Not set)'
                )}
              </p>
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="button"
            className="save-button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSite;