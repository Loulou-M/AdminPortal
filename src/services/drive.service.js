// drive.service.js
// Google Drive API Service for Admin Portal

import { getValidAccessToken } from './auth.service';

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
    folderId,
    query = '',
    pageSize = 30,
    fields = "files(id,name,mimeType,createdTime,modifiedTime,webViewLink)"
  } = options;

  try {
    // Build the query
    let queryString = '';
    if (folderId) {
      queryString = `'${folderId}' in parents`;
      if (query) {
        queryString += ` and ${query}`;
      }
    } else if (query) {
      queryString = query;
    }

    const response = await window.gapi.client.drive.files.list({
      q: queryString,
      pageSize,
      fields,
      orderBy: 'modifiedTime desc'
    });

    return response.result.files || [];
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
    const response = await window.gapi.client.drive.files.get({
      fileId,
      fields
    });
    
    return response.result;
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
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    
    // Fetch the file content directly (not through gapi client)
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error getting file content:', error);
    throw error;
  }
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
    parents = [],
    content
  } = options;
  
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    
    // Prepare file metadata
    const metadata = {
      name,
      mimeType
    };
    
    // Add parents if specified
    if (parents.length > 0) {
      metadata.parents = Array.isArray(parents) ? parents : [parents];
    }
    
    // Create form data for multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    // Add content as blob
    const contentBlob = content instanceof Blob 
      ? content 
      : new Blob([content], { type: mimeType });
    form.append('file', contentBlob);
    
    // Upload file
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating file:', error);
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
    // Get a valid access token
    const accessToken = await getValidAccessToken();
    
    // Update metadata if name is provided
    if (name) {
      await window.gapi.client.drive.files.update({
        fileId,
        resource: { name }
      });
    }
    
    // Update content if provided
    if (content) {
      const contentBlob = content instanceof Blob 
        ? content 
        : new Blob([content], { type: mimeType });
      
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mimeType
        },
        body: contentBlob
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update file content: ${response.statusText}`);
      }
      
      return await response.json();
    }
    
    // If only metadata was updated, return the file info
    return await getFile(fileId);
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
    await window.gapi.client.drive.files.delete({
      fileId
    });
    
    return true;
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
    parents = []
  } = options;
  
  try {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    if (parents.length > 0) {
      metadata.parents = Array.isArray(parents) ? parents : [parents];
    }
    
    const response = await window.gapi.client.drive.files.create({
      resource: metadata,
      fields: 'id,name,mimeType,createdTime,webViewLink'
    });
    
    return response.result;
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
    // Create permission
    await window.gapi.client.drive.permissions.create({
      fileId,
      resource: {
        role,
        type
      }
    });
    
    // Get the file with webViewLink
    const file = await getFile(fileId, "webViewLink");
    
    return file.webViewLink;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};