// FileList.jsx
// File List Component for Admin Portal

import React, { useState, useEffect } from 'react';
import { listFiles, deleteFile, getFileContent } from '../../services/drive.service';
import { saveToStorage, loadFromStorage } from '../../utils/storage';

const FileList = ({ folderId, onFileSelect, onRefreshNeeded }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [sortField, setSortField] = useState('modifiedTime'); // Default sort by modified date
  const [sortDirection, setSortDirection] = useState('desc'); // Default newest first

  // Load saved sort preferences
  useEffect(() => {
    const savedSortField = loadFromStorage('files_sort_field', 'modifiedTime');
    const savedSortDirection = loadFromStorage('files_sort_direction', 'desc');
    
    setSortField(savedSortField);
    setSortDirection(savedSortDirection);
  }, []);

  // Fetch files when folderId changes or refresh is needed
  useEffect(() => {
    if (folderId) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [folderId, onRefreshNeeded]);

  // Fetch files from Google Drive
  const fetchFiles = async () => {
    if (!folderId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedFiles = await listFiles({
        folderId,
        fields: "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size)"
      });
      
      // Sort files based on current sort settings
      const sortedFiles = sortFiles(fetchedFiles, sortField, sortDirection);
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(`Failed to fetch files: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sort change
  const handleSort = (field) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(field);
    setSortDirection(newDirection);
    
    // Save sort preferences
    saveToStorage('files_sort_field', field);
    saveToStorage('files_sort_direction', newDirection);
    
    // Sort the current file list
    setFiles(sortFiles([...files], field, newDirection));
  };

  // Helper to sort files
  const sortFiles = (fileList, field, direction) => {
    return [...fileList].sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Handle different field types
      if (field === 'name') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      } else if (field === 'size') {
        valueA = valueA || 0;
        valueB = valueB || 0;
      }
      
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // View file content
  const handleViewFile = async (file) => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedFile(file);
      
      // Only fetch content for text-based files
      if (isTextFile(file.mimeType)) {
        const content = await getFileContent(file.id);
        setFileContent(content);
      } else {
        setFileContent(null);
      }
      
      setIsViewerOpen(true);
    } catch (error) {
      console.error('Error viewing file:', error);
      setError(`Failed to view file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if file is text-based
  const isTextFile = (mimeType) => {
    const textMimeTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-javascript'
    ];
    
    return textMimeTypes.some(type => mimeType?.startsWith(type));
  };

  // Delete file
  const handleDeleteFile = async (fileId, fileName) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await deleteFile(fileId);
      
      // Remove file from list
      setFiles(files.filter(file => file.id !== fileId));
      
      // Close viewer if deleted file was being viewed
      if (selectedFile && selectedFile.id === fileId) {
        setIsViewerOpen(false);
        setSelectedFile(null);
        setFileContent(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(`Failed to delete file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Close file viewer
  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedFile(null);
    setFileContent(null);
  };

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3>Documents in Folder</h3>
        <button 
          onClick={fetchFiles} 
          disabled={isLoading || !folderId}
          className="refresh-button"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="file-list-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
      
      {isLoading && !isViewerOpen && (
        <div className="loading-indicator">
          <p>Loading files...</p>
        </div>
      )}
      
      {!isLoading && !error && files.length === 0 && (
        <div className="empty-message">
          <p>No files found in this folder.</p>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="files-table-container">
          <table className="files-table">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className={sortField === 'name' ? `sorted-${sortDirection}` : ''}
                >
                  Name
                </th>
                <th>Type</th>
                <th 
                  onClick={() => handleSort('modifiedTime')}
                  className={sortField === 'modifiedTime' ? `sorted-${sortDirection}` : ''}
                >
                  Modified
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id}>
                  <td className="file-name">
                    <a 
                      href={file.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {file.name}
                    </a>
                  </td>
                  <td className="file-type">
                    {formatMimeType(file.mimeType)}
                  </td>
                  <td className="file-modified">
                    {formatDate(file.modifiedTime)}
                  </td>
                  <td className="file-actions">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="view-button"
                    >
                      View
                    </button>
                    {onFileSelect && (
                      <button
                        onClick={() => onFileSelect(file)}
                        className="select-button"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* File Viewer Modal */}
      {isViewerOpen && selectedFile && (
        <div className="file-viewer-overlay">
          <div className="file-viewer">
            <div className="file-viewer-header">
              <h3>{selectedFile.name}</h3>
              <button 
                onClick={handleCloseViewer}
                className="close-button"
              >
                Close
              </button>
            </div>
            <div className="file-viewer-content">
              {isLoading ? (
                <p>Loading file content...</p>
              ) : isTextFile(selectedFile.mimeType) ? (
                <pre className="file-content">{fileContent}</pre>
              ) : (
                <div className="non-text-file">
                  <p>Preview not available for this file type.</p>
                  <a 
                    href={selectedFile.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="open-button"
                  >
                    Open in Google Drive
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to format MIME type to readable format
function formatMimeType(mimeType) {
  if (!mimeType) return 'Unknown';
  
  // Handle Google Document types
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    const type = mimeType.split('.').pop();
    return `Google ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }
  
  // Handle common types
  const mimeMap = {
    'application/pdf': 'PDF',
    'application/json': 'JSON',
    'text/plain': 'Text',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'text/javascript': 'JavaScript',
    'application/zip': 'ZIP',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint'
  };
  
  return mimeMap[mimeType] || mimeType.split('/')[1] || mimeType;
}

// Helper to format date
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return dateString;
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format based on how recent the date is
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (today.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

export default FileList;