// auth.service.js
// Authentication service for Google Drive integration

// API base URL - adjust this to your actual backend URL
const API_BASE_URL = 'http://localhost:5000';

/**
 * Initialize Google API client
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
export const initGoogleApiClient = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Error initializing Google API client:', error);
    return false;
  }
};

/**
 * Check if user is currently signed in
 * @returns {boolean} True if user is signed in
 */
export const isSignedIn = async () => {
  return await checkAuthStatus();
};

/**
 * Debug auth state
 * @returns {Object} Auth state debug information
 */
export const debugAuthState = async () => {
  try {
    console.group('Auth State Debug');
    
    // Check auth status
    const isAuthenticated = await checkAuthStatus();
    console.log('Is Authenticated:', isAuthenticated);
    
    // Get session info
    const sessionInfo = {
      cookies: document.cookie,
      localStorage: {
        auth_redirect: localStorage.getItem('auth_redirect'),
        auth_status: localStorage.getItem('auth_status')
      }
    };
    console.log('Session Info:', sessionInfo);
    
    // Check API status
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`, {
        credentials: 'include'
      });
      const apiStatus = await response.json();
      console.log('API Status:', apiStatus);
    } catch (error) {
      console.error('API Status Error:', error);
    }
    
    // Check auth status
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'
      });
      const authStatus = await response.json();
      console.log('Auth Status:', authStatus);
    } catch (error) {
      console.error('Auth Status Error:', error);
    }
    
    console.groupEnd();
    
    return {
      isAuthenticated,
      sessionInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in debugAuthState:', error);
    return { error: error.message };
  }
};

/**
 * Check if the user is authenticated
 * @returns {Promise<boolean>} Promise that resolves with authentication status
 */
export const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      credentials: 'include' // Important for cookies/session
    });
    
    const data = await response.json();
    return data.authenticated || false;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
};

/**
 * Get user info if authenticated
 * @returns {Promise<Object|null>} Promise that resolves with user info or null
 */
export const getUserInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    return data.authenticated ? data.user : null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

/**
 * Get current user (alias for getUserInfo for backward compatibility)
 * @returns {Promise<Object|null>} Promise that resolves with user info or null
 */
export const getCurrentUser = async () => {
  return await getUserInfo();
};

/**
 * Log out the current user
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      credentials: 'include'
    });
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

/**
 * Sign out (alias for logout)
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
export const signOut = async () => {
  return await logout();
};

/**
 * Direct sign-in with Google
 * @returns {Promise<boolean>} Promise that resolves with success status
 */
export const signInDirect = () => {
  redirectToAuth();
  return Promise.resolve(true);
};

/**
 * Redirect to authentication page
 * @param {string} [returnUrl] - URL to redirect to after authentication
 */
export const redirectToAuth = (returnUrl) => {
  // Store return URL to redirect back after auth
  if (returnUrl || window.location.pathname !== '/') {
    localStorage.setItem('auth_redirect', returnUrl || window.location.pathname);
  }
  
  // Redirect to auth endpoint
  window.location.href = `${API_BASE_URL}/auth/google`;
};

/**
 * Handle redirect after authentication
 * Redirects to the stored return URL if available
 * @returns {boolean} True if a redirect was performed
 */
export const handleAuthRedirect = () => {
  const returnUrl = localStorage.getItem('auth_redirect');
  
  if (returnUrl) {
    localStorage.removeItem('auth_redirect');
    
    // Don't redirect if we're already at the return URL
    if (window.location.pathname !== returnUrl) {
      window.location.href = returnUrl;
      return true;
    }
  }
  
  return false;
};

/**
 * Add auth-related event listeners
 * @param {Function} onAuthChange - Callback to handle auth state changes
 * @returns {Function} Function to remove event listeners
 */
export const setupAuthListeners = (onAuthChange) => {
  const handleAuthEvent = (event) => {
    if (event.key === 'auth_status' && event.newValue) {
      try {
        const status = JSON.parse(event.newValue);
        if (onAuthChange) {
          onAuthChange(status.authenticated, status.user);
        }
      } catch (error) {
        console.error('Error parsing auth status:', error);
      }
    }
  };
  
  // Listen for auth changes from other tabs/windows
  window.addEventListener('storage', handleAuthEvent);
  
  // On initial load, check if we need to redirect
  handleAuthRedirect();
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleAuthEvent);
  };
};

/**
 * Update auth status in localStorage
 * This allows other tabs/windows to be notified of auth changes
 * @param {boolean} isAuthenticated - Authentication status
 * @param {Object|null} user - User info
 */
export const updateAuthStatus = (isAuthenticated, user) => {
  localStorage.setItem('auth_status', JSON.stringify({
    authenticated: isAuthenticated,
    user,
    timestamp: Date.now()
  }));
};

/**
 * Check if the current route requires authentication
 * @param {string} route - Current route
 * @param {Array<string>} protectedRoutes - List of routes that require authentication
 * @returns {boolean} True if the route requires authentication
 */
export const requiresAuth = (route, protectedRoutes = []) => {
  return protectedRoutes.some(protectedRoute => {
    // Handle exact matches
    if (protectedRoute === route) {
      return true;
    }
    
    // Handle wildcard matches (e.g., /dashboard/*)
    if (protectedRoute.endsWith('*')) {
      const basePath = protectedRoute.slice(0, -1);
      return route.startsWith(basePath);
    }
    
    return false;
  });
};

/**
 * Auth-aware fetch wrapper
 * Automatically handles authentication errors
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const authFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });
    
    if (response.status === 401) {
      // Redirect to auth page
      redirectToAuth(window.location.pathname);
      throw new Error('Authentication required');
    }
    
    return response;
  } catch (error) {
    console.error('Auth fetch error:', error);
    throw error;
  }
};

/**
 * Check for existing token (compatibility function)
 * @returns {boolean} Always returns false since we're using session-based auth
 */
export const checkForToken = () => {
  return false;
};

/**
 * Get access token (compatibility function)
 * @returns {null} Always returns null since we're using session-based auth
 */
export const getAccessToken = () => {
  return null;
};

/**
 * Get valid access token (compatibility function)
 * @returns {Promise<null>} Always resolves with null since we're using session-based auth
 */
export const getValidAccessToken = async () => {
  return null;
};