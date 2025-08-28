// FileUpload.jsx
// File Upload Component for Admin Portal

import React, { useState, useRef } from 'react';
import { createFile } from '../../services/drive.service';
import { saveToStorage, loadFromStorage } from '../../utils/storage';

const FileUpload = ({ folderId, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Load previously selected folder from storage
  const lastFolderId = loadFromStorage('last_folder_id', folderId);

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
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!folderId) {
      setError('No folder selected. Please select a destination folder.');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10);
      setError(null);
      setSuccess(false);

      // Save folder ID for future uploads
      saveToStorage('last_folder_id', folderId);

      // Read file content
      const fileContent = await readFileAsArrayBuffer(file);
      setProgress(40);

      // Upload file to Google Drive
      const uploadedFile = await createFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: [folderId],
        content: new Blob([fileContent], { type: file.type || 'application/octet-stream' })
      });

      setProgress(100);
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
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Failed to upload file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

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