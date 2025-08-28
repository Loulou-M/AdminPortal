// site.service.js
// Site management service using backend API

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

/**
 * Get all sites 
 * @returns {Promise<Array>} Promise that resolves with array of sites
 */
export const getSites = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sites`, {
      credentials: 'include'  // Add credentials
    });
    
    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch sites');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting sites:', error);
    throw error;
  }
};

/**
 * Get a single site by ID
 * @param {string} siteId - Site ID
 * @returns {Promise<Object>} Promise that resolves with site data
 */
export const getSite = async (siteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sites/${siteId}`, {
      credentials: 'include'  // Add credentials
    });
    
    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch site ${siteId}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting site ${siteId}:`, error);
    throw error;
  }
};

/**
 * Create a new site with QR code
 * @param {Object} siteData - Site data
 * @returns {Promise<Object>} Promise that resolves with created site data
 */
export const createSite = async (siteData) => {
  try {
    if (!siteData?.name?.trim()) throw new Error('Site name is required');
    if (!siteData?.location?.trim()) throw new Error('Site location is required');
    if (!siteData?.folder_link?.trim()) throw new Error('Folder link is required');

    const response = await fetch(`${API_BASE_URL}/api/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(siteData),
      credentials: 'include'  // Add credentials
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create site');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating site:', error);
    throw error;
  }
};

/**
 * Update an existing site
 * @param {string} siteId - Site ID
 * @param {Object} siteData - Updated site data
 * @returns {Promise<Object>} Promise that resolves with updated site data
 */
export const updateSite = async (siteId, siteData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sites/${siteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(siteData),
      credentials: 'include'  // Add credentials
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update site ${siteId}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating site ${siteId}:`, error);
    throw error;
  }
};

/**
 * Delete a site
 * @param {string} siteId - Site ID
 * @returns {Promise<boolean>} Promise that resolves with true if successful
 */
export const deleteSite = async (siteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sites/${siteId}`, {
      method: 'DELETE',
      credentials: 'include'  // Add credentials
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete site ${siteId}`);
    }

    return true;
  } catch (error) {
    console.error(`Error deleting site ${siteId}:`, error);
    throw error;
  }
};