// FileUpload.jsx
// File Upload Component for Admin Portal

import React, { useState, useRef, useEffect } from 'react';
import { createFile, uploadFile } from '../../services/drive.service';
import { checkAuthStatus, redirectToAuth } from '../../services/auth.service';

const FileUpload = ({ folderId, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef(null);

  // Extract folder ID from Google Drive URL
  const extractFolderId = (urlOrId) => {
    if (!urlOrId) return '';
    
    // If it's already just an ID (no slashes or special chars except dash/underscore)
    if (/^[a-zA-Z0-9_-]+$/.test(urlOrId)) {
      return urlOrId;
    }
    
    // Try to extract ID from various Google Drive URL formats
    const match = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    return urlOrId; // Return as-is if we couldn't extract anything
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthed = await checkAuthStatus();
      setIsAuthenticated(isAuthed);
    };
    
    checkAuth();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  // Upload file to Google Drive
  const handleUpload = async () => {
    if (!isAuthenticated) {
      redirectToAuth();
      return;
    }
    
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    // Extract the folder ID if it's a full URL
    const cleanFolderId = extractFolderId(folderId);
    
    if (!cleanFolderId) {
      setError('No folder selected. Please select a destination folder.');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10);
      setError(null);
      setSuccess(false);

      // Method 1: For small text files, use createFile
      if (file.size < 1024 * 1024 && (
          file.type === 'text/plain' || 
          file.type === 'application/json' ||
          file.type === 'text/html' ||
          file.type === 'text/css'
      )) {
        // Read file content as text
        const fileContent = await readFileAsText(file);
        setProgress(40);
        
        console.log(`Uploading text file to folder ID: ${cleanFolderId}`);
        
        // Upload file using text content
        const uploadedFile = await createFile({
          name: file.name,
          mimeType: file.type || 'text/plain',
          parents: [cleanFolderId],
          content: fileContent
        });
        
        setProgress(100);
        handleUploadSuccess(uploadedFile);
      } 
      // Method 2: For binary or larger files, use FormData upload
      else {
        setProgress(30);
        console.log(`Uploading binary file to folder ID: ${cleanFolderId}`);
        
        // Upload using FormData (multipart/form-data)
        const uploadedFile = await uploadFile({
          file: file,
          folderId: cleanFolderId
        });
        
        setProgress(100);
        handleUploadSuccess(uploadedFile);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Handle auth errors
      if (error.message.includes('Authentication required')) {
        setError('Please sign in to upload files');
      } else {
        setError(`Failed to upload file: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle successful upload
  const handleUploadSuccess = (uploadedFile) => {
    setSuccess(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    setFile(null);

    // Notify parent component
    if (onUploadComplete) {
      onUploadComplete(uploadedFile);
    }
  };

  // Helper function to read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="file-upload">
        <h3>Upload Document</h3>
        <div className="auth-required">
          <p>Please sign in with Google to upload files</p>
          <button 
            onClick={() => redirectToAuth()}
            className="sign-in-button"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload">
      <h3>Upload Document</h3>
      
      <div className="upload-form">
        <div className="file-input-container">
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            ref={fileInputRef}
            className="file-input"
          />
          {file && (
            <div className="selected-file">
              <p>Selected: {file.name} ({formatFileSize(file.size)})</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isUploading || !folderId}
          className={`upload-button ${isUploading ? 'uploading' : ''}`}
        >
          {isUploading ? 'Uploading...' : 'Upload to Drive'}
        </button>
      </div>

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{progress}% Complete</p>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="upload-success">
          <p>File uploaded successfully!</p>
          <button onClick={() => setSuccess(false)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

// Helper to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileUpload;