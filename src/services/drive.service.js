// drive.service.js
// Google Drive API Service for Admin Portal (Using Backend API)

// API base URL - adjust this to your actual backend URL
const API_BASE_URL = 'http://localhost:5000';

/**
 * Helper function for making authenticated API requests
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Promise that resolves with the response data
 */
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Important for sending cookies/session
    headers: {
      ...options.headers,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    // For 401 errors, redirect to authentication
    if (response.status === 401) {
      // Store the current URL to redirect back after auth
      localStorage.setItem('auth_redirect', window.location.pathname);
      
      // Redirect to auth endpoint
      window.location.href = `${API_BASE_URL}/auth/google`;
      
      // Throw a friendly error
      throw new Error('Authentication required. Redirecting to login...');
    }
    
    // For other errors, try to parse error response
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Extract folder ID from Google Drive URL
 * @param {string} urlOrId - Folder URL or ID
 * @returns {string} Extracted folder ID
 */
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

/**
 * List files in Google Drive
 * @param {Object} options - Listing options
 * @param {string} [options.folderId] - Folder ID to list files from (optional)
 * @param {string} [options.query] - Additional query parameters (optional)
 * @param {number} [options.pageSize=30] - Number of files to return
 * @param {string} [options.fields="files(id,name,mimeType,createdTime,modifiedTime,webViewLink)"] - Fields to include
 * @returns {Promise<Object>} Promise that resolves with file list
 */
export const listFiles = async (options = {}) => {
  const {
    folderId: rawFolderId,
    query = '',
    pageSize = 30,
    fields = "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size)"
  } = options;

  // Extract proper folder ID if it's a URL
  const folderId = extractFolderId(rawFolderId);

  try {
    const params = new URLSearchParams();
    if (folderId) params.append('folderId', folderId);
    if (query) params.append('query', query);
    if (pageSize) params.append('pageSize', pageSize);
    if (fields) params.append('fields', fields);

    return await fetchWithAuth(`${API_BASE_URL}/api/files?${params.toString()}`);
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

/**
 * Get file metadata
 * @param {string} fileId - File ID
 * @param {string} [fields="id,name,mimeType,createdTime,modifiedTime,webViewLink,parents"] - Fields to include
 * @returns {Promise<Object>} Promise that resolves with file metadata
 */
export const getFile = async (fileId, fields = "id,name,mimeType,createdTime,modifiedTime,webViewLink,parents") => {
  try {
    const params = new URLSearchParams();
    if (fields) params.append('fields', fields);
    
    return await fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}?${params.toString()}`);
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
};

/**
 * Get file content
 * @param {string} fileId - File ID
 * @returns {Promise<string>} Promise that resolves with file content
 */
export const getFileContent = async (fileId) => {
  try {
    return await fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}/content`);
  } catch (error) {
    console.error('Error getting file content:', error);
    throw error;
  }
};

/**
 * Convert Blob to base64
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Promise that resolves with base64 string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Create a new file in Google Drive
 * @param {Object} options - File options
 * @param {string} options.name - File name
 * @param {string} [options.mimeType="text/plain"] - File MIME type
 * @param {string|Array<string>} [options.parents] - Parent folder ID(s)
 * @param {string|Blob} options.content - File content
 * @returns {Promise<Object>} Promise that resolves with created file metadata
 */
export const createFile = async (options) => {
  const {
    name,
    mimeType = "text/plain",
    parents: rawParents = [],
    content
  } = options;
  
  // Process parents to extract IDs if they're URLs
  let parents;
  if (Array.isArray(rawParents)) {
    parents = rawParents.map(extractFolderId);
  } else {
    parents = [extractFolderId(rawParents)];
  }
  
  try {
    // Handle different content types
    let contentToSend = content;
    
    // Convert Blob to base64 if needed
    if (content instanceof Blob) {
      contentToSend = await blobToBase64(content);
    }
    
    return await fetchWithAuth(`${API_BASE_URL}/api/files`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType,
        parents,
        content: contentToSend
      })
    });
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

/**
 * Upload a file using FormData (for binary files)
 * @param {Object} options - Upload options
 * @param {File} options.file - The file to upload
 * @param {string} options.folderId - Parent folder ID
 * @returns {Promise<Object>} Promise that resolves with the uploaded file metadata
 */
export const uploadFile = async (options) => {
  const { file, folderId: rawFolderId } = options;
  
  // Extract proper folder ID
  const folderId = extractFolderId(rawFolderId);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folderId);
    
    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.setItem('auth_redirect', window.location.pathname);
        window.location.href = `${API_BASE_URL}/auth/google`;
        throw new Error('Authentication required. Redirecting to login...');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Update an existing file in Google Drive
 * @param {Object} options - Update options
 * @param {string} options.fileId - File ID to update
 * @param {string} [options.name] - New file name (optional)
 * @param {string|Blob} [options.content] - New file content (optional)
 * @param {string} [options.mimeType="text/plain"] - File MIME type
 * @returns {Promise<Object>} Promise that resolves with updated file metadata
 */
export const updateFile = async (options) => {
  const {
    fileId,
    name,
    content,
    mimeType = "text/plain"
  } = options;
  
  try {
    // Handle different content types
    let contentToSend = content;
    
    // Convert Blob to base64 if needed
    if (content instanceof Blob) {
      contentToSend = await blobToBase64(content);
    }
    
    return await fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        content: contentToSend,
        mimeType
      })
    });
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Drive
 * @param {string} fileId - File ID to delete
 * @returns {Promise<boolean>} Promise that resolves with true if successful
 */
export const deleteFile = async (fileId) => {
  try {
    return await fetchWithAuth(`${API_BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Search for files in Google Drive
 * @param {string} query - Search query
 * @param {number} [pageSize=30] - Number of files to return
 * @returns {Promise<Array>} Promise that resolves with search results
 */
export const searchFiles = async (query, pageSize = 30) => {
  return listFiles({
    query,
    pageSize
  });
};

/**
 * Create a folder in Google Drive
 * @param {Object} options - Folder options
 * @param {string} options.name - Folder name
 * @param {string|Array<string>} [options.parents] - Parent folder ID(s)
 * @returns {Promise<Object>} Promise that resolves with created folder metadata
 */
export const createFolder = async (options) => {
  const {
    name,
    parents: rawParents = []
  } = options;
  
  // Process parents to extract IDs if they're URLs
  let parents;
  if (Array.isArray(rawParents)) {
    parents = rawParents.map(extractFolderId);
  } else {
    parents = [extractFolderId(rawParents)];
  }
  
  try {
    return await fetchWithAuth(`${API_BASE_URL}/api/folders`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        parents
      })
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

/**
 * Generate a shareable link for a file or folder
 * @param {string} fileId - File or folder ID
 * @param {string} [role="reader"] - Permission role (reader, writer, commenter)
 * @param {string} [type="anyone"] - Permission type (anyone, domain, user, group)
 * @returns {Promise<string>} Promise that resolves with the shareable link
 */
export const createShareableLink = async (fileId, role = "reader", type = "anyone") => {
  try {
    const result = await fetchWithAuth(`${API_BASE_URL}/api/share`, {
      method: 'POST',
      body: JSON.stringify({
        fileId,
        role,
        type
      })
    });
    
    return result.link;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};