// SiteForm.jsx
// Site Form Component for Admin Portal
import React, { useState, useEffect } from 'react';
import { createSite } from '../../services/site.service';
import { checkAuthStatus, redirectToAuth } from '../../services/auth.service';

const SiteForm = ({ onSaveComplete }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    site_id: '',
    name: '',
    location: '',
    folder_type: 'GoogleDrive',
    folder_link: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthed = await checkAuthStatus();
        setIsAuthenticated(isAuthed);
        
        // If not authenticated, redirect to login
        if (!isAuthed) {
          redirectToAuth();
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, []);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Reset states when form changes
    if (qrCode) setQrCode(null);
    if (isSaved) setIsSaved(false);
    if (error) setError(null);
  };

  // Generate site ID from name if not provided
  const generateSiteId = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 20) + '_' + Date.now().toString().substring(7);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if authenticated
    if (!isAuthenticated) {
      redirectToAuth();
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setQrCode(null);
      
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Site name is required');
      }
      
      if (!formData.location.trim()) {
        throw new Error('Site location is required');
      }
      
      if (!formData.folder_link.trim()) {
        throw new Error('Folder link is required');
      }
      
      // Auto-generate site ID if not provided
      const submissionData = { ...formData };
      if (!submissionData.site_id.trim()) {
        submissionData.site_id = generateSiteId(submissionData.name);
        setFormData(prevData => ({
          ...prevData,
          site_id: submissionData.site_id
        }));
      }
      
      // Create site with QR code
      const newSite = await createSite(submissionData);
      
      // Update with QR code result
      setQrCode({
        qr_url: newSite.qr_url,
        qr_id: newSite.qr_id
      });
      
      // Set saved state
      setIsSaved(true);
      
      // Notify parent component
      if (onSaveComplete) {
        onSaveComplete(newSite);
      }
    } catch (error) {
      console.error('Error creating site:', error);
      
      // If authentication error, redirect to login
      if (error.message && error.message.includes('Authentication required')) {
        redirectToAuth();
        return;
      }
      
      setError(error.message || 'Failed to create site');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download QR code
  const handleDownloadQR = () => {
    if (!qrCode || !qrCode.qr_url) return;
    
    // Create an anchor element and trigger download
    const link = document.createElement('a');
    link.href = qrCode.qr_url;
    link.download = `${formData.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle reset form
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
      setFormData({
        site_id: '',
        name: '',
        location: '',
        folder_type: 'GoogleDrive',
        folder_link: ''
      });
      setQrCode(null);
      setIsSaved(false);
      setError(null);
    }
  };

  // If still checking authentication, show loading
  if (!authChecked) {
    return <div className="loading">Checking authentication...</div>;
  }

  // If not authenticated, show login message (though redirectToAuth should handle this)
  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h3>Authentication Required</h3>
        <p>Please sign in to access this feature.</p>
        <button 
          onClick={() => redirectToAuth()}
          className="sign-in-button"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="site-form">
      <h2>Create Construction Site</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
      
      {isSaved && (
        <div className="success-message">
          <p>Site created successfully!</p>
          <button onClick={() => setIsSaved(false)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
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
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="site_id">Site ID (auto-generated if empty):</label>
          <input
            type="text"
            id="site_id"
            name="site_id"
            value={formData.site_id}
            onChange={handleChange}
            placeholder="Enter site ID or leave empty for auto-generation"
            disabled={isLoading}
          />
        </div>
        
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
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="folder_type">Folder Type:</label>
          <select
            id="folder_type"
            name="folder_type"
            value={formData.folder_type}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="GoogleDrive">Google Drive</option>
            <option value="NAS">NAS</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="folder_link">Folder Link:</label>
          <input
            type="text"
            id="folder_link"
            name="folder_link"
            value={formData.folder_link}
            onChange={handleChange}
            placeholder={`Enter ${formData.folder_type} folder link`}
            required
            disabled={isLoading}
          />
          <small className="help-text">
            {formData.folder_type === 'GoogleDrive'
              ? 'Paste the Google Drive folder share link here'
              : 'Enter the network path to the NAS folder'}
          </small>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            onClick={handleReset}
            className="reset-button"
            disabled={isLoading}
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Site...' : 'Create Site & Generate QR'}
          </button>
        </div>
      </form>
      
      {/* QR Code Result */}
      {qrCode && (
        <div className="qr-code-result">
          <h3>QR Code Generated</h3>
          
          <div className="qr-code-container">
            <img
              src={qrCode.qr_url}
              alt={`QR Code for ${formData.name}`}
              className="qr-code-image"
            />
            
            <div className="qr-code-info">
              <p><strong>Site:</strong> {formData.name}</p>
              <p><strong>ID:</strong> {formData.site_id}</p>
              <p><strong>Location:</strong> {formData.location}</p>
              <p><strong>QR ID:</strong> {qrCode.qr_id}</p>
              
              <button
                onClick={handleDownloadQR}
                className="download-button"
              >
                Download QR Code
              </button>
            </div>
          </div>
          
          <div className="qr-code-usage">
            <h4>How to Use This QR Code:</h4>
            <ol>
              <li>Download and print the QR code</li>
              <li>Post it at the construction site entrance</li>
              <li>Field staff can scan with Splunk Mobile App to access site documents</li>
              <li>The QR code links directly to the {formData.folder_type} folder for this site</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteForm;