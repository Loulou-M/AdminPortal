// auth.service.js
// Google Authentication Service for Admin Portal

// OAuth configuration
// Replace these with your actual Google Cloud Console credentials
const CONFIG = {
  API_KEY: 'AIzaSyDIUGHpNHLRQJyp11y4uJwgKsSaGlLdYL8',
  CLIENT_ID: '112537441648-epf3a9a3l56837ggbg7f7uamlhuhhfns.apps.googleusercontent.com',
  // Include OpenID Connect scopes
  SCOPES: 'openid email profile https://www.googleapis.com/auth/drive.file',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
};

// LocalStorage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gdrive_access_token',
  REFRESH_TOKEN: 'gdrive_refresh_token',
  EXPIRES_AT: 'gdrive_token_expires_at',
  USER_INFO: 'gdrive_user_info'
};

/**
 * Debug function to log the current authentication state
 */
export const debugAuthState = () => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO);
  
  console.group('Auth State Debug');
  console.log('Access Token Exists:', !!accessToken);
  if (accessToken) {
    console.log('Token Preview:', accessToken.substring(0, 10) + '...');
  }
  
  console.log('Expires At:', expiresAt ? new Date(parseInt(expiresAt)).toLocaleString() : 'Not set');
  
  if (expiresAt) {
    const now = Date.now();
    const expiration = parseInt(expiresAt);
    console.log('Token Expired:', expiration < now);
    console.log('Time to Expiration:', Math.floor((expiration - now) / 1000), 'seconds');
  }
  
  console.log('User Info Exists:', !!userInfo);
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      console.log('User Info:', {
        id: parsed.id ? '✓' : '✗',
        name: parsed.name || 'Not set',
        email: parsed.email || 'Not set',
        imageUrl: parsed.imageUrl ? '✓' : '✗'
      });
    } catch (e) {
      console.log('Failed to parse user info');
    }
  }
  
  console.log('isSignedIn() returns:', isSignedIn());
  console.groupEnd();
  
  return {
    hasAccessToken: !!accessToken,
    hasExpiresAt: !!expiresAt,
    hasUserInfo: !!userInfo,
    isSignedIn: isSignedIn()
  };
};

/**
 * Direct sign-in method using Google OAuth redirect
 * This approach avoids the deprecated iframe-based method
 */
export const signInDirect = () => {
  console.log('auth.service: Initiating direct sign-in with Google...');
  
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${CONFIG.CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(window.location.origin)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(CONFIG.SCOPES)}` +
    `&prompt=select_account`;

  console.log("auth.service: Redirecting to Google OAuth:", authUrl);
  window.location.href = authUrl;
};

/**
 * Check if the current URL contains an access token from OAuth redirect
 * If so, store it and return true
 * @returns {boolean} True if token was found and stored
 */
export const checkForToken = () => {
  console.log('auth.service: Checking for token in URL...');
  
  // Check if we have a token in the URL hash (from OAuth redirect)
  const hash = window.location.hash;
  if (hash) {
    console.log('auth.service: Found hash in URL:', hash.substring(0, 20) + '...');
    
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
      console.log('auth.service: Access token found in URL');
      
      // Calculate expiration time
      const expiresAt = Date.now() + (parseInt(expiresIn) * 1000);
      
      // Store token and expiration
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
      
      // Clear the hash from the URL
      window.history.replaceState(null, null, window.location.pathname);
      
      console.log('auth.service: Access token stored, expires:', new Date(expiresAt).toLocaleString());
      
      // Dispatch event for components to react
      console.log('auth.service: Dispatching googleAuthStateChanged event for token found in URL');
      window.dispatchEvent(new CustomEvent('googleAuthStateChanged', { 
        detail: { isSignedIn: true }
      }));
      
      return true;
    } else {
      console.log('auth.service: No access token found in URL hash');
    }
  } else {
    console.log('auth.service: No hash found in URL');
  }
  
  return false;
};

/**
 * Check if user is currently signed in
 * @returns {boolean} True if user is signed in
 */
export const isSignedIn = () => {
  try {
    console.log('auth.service: Checking if user is signed in...');
    
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    
    // Check if token exists and is not expired
    if (accessToken && expiresAt) {
      const expirationTime = parseInt(expiresAt, 10);
      // Check if token is valid and not expired
      if (!isNaN(expirationTime) && expirationTime > Date.now()) {
        console.log('auth.service: Valid token found, user is signed in');
        return true;
      } else {
        // Token expired, clean up storage
        console.log('auth.service: Token expired, cleaning up storage');
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
      }
    } else {
      console.log('auth.service: No valid token found, user is not signed in');
    }
    
    return false;
  } catch (error) {
    console.error('auth.service: Error in isSignedIn:', error);
    return false;
  }
};

/**
 * Initialize Google API client
 * @returns {Promise} Promise that resolves when API is loaded
 */
export const initGoogleApiClient = async () => {
  console.log('auth.service: Initializing Google API client...');
  
  // Call our debug function
  debugAuthState();
  
  // First check if we have a token from OAuth redirect
  const tokenFound = checkForToken();
  
  if (tokenFound) {
    console.log('auth.service: Token found in URL, user is now signed in');
  }

  // Load the Google API client script
  return new Promise((resolve, reject) => {
    console.log('auth.service: Loading Google API script...');
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('auth.service: Google API script loaded, initializing client...');
      
      window.gapi.load('client', async () => {
        try {
          console.log('auth.service: Initializing Google API client with API key...');
          
          await window.gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: CONFIG.DISCOVERY_DOCS
          });
          
          console.log('auth.service: Google API client initialized successfully');
          
          // Always try to restore token from localStorage on initialization
          const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
          
          if (accessToken && expiresAt && Number(expiresAt) > Date.now()) {
            console.log('auth.service: Setting access token on Google API client from localStorage');
            window.gapi.client.setToken({
              access_token: accessToken
            });
          } else {
            console.log('auth.service: No valid access token available in localStorage');
            // Clear any invalid tokens
            if (accessToken) {
              localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
            }
          }
          
          resolve();
        } catch (error) {
          console.error('auth.service: Error initializing Google API client:', error);
          reject(error);
        }
      });
    };
    
    script.onerror = (error) => {
      console.error('auth.service: Error loading Google API script:', error);
      reject(error);
    };
    
    document.body.appendChild(script);
  });
};

/**
 * Get the current user info
 * @returns {Promise<Object|null>} Promise that resolves with user info or null if not signed in
 */
export const getCurrentUser = async () => {
  try {
    console.log('auth.service: Getting current user info...');
    
    // First check if we have stored user info
    const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    if (userInfoStr) {
      console.log('auth.service: Found user info in localStorage');
      
      const userInfo = JSON.parse(userInfoStr);
      if (userInfo && userInfo.id) {
        console.log('auth.service: Returning user info from localStorage');
        return userInfo;
      } else {
        console.log('auth.service: User info in localStorage is invalid');
      }
    } else {
      console.log('auth.service: No user info found in localStorage');
    }
    
    // If we have a token but no user info, fetch it
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (accessToken) {
      console.log('auth.service: Have access token, fetching user info from Google API...');
      
      try {
        // Use the OpenID Connect userinfo endpoint instead of the OAuth2 endpoint
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        console.log('auth.service: User info response status:', response.status);
        
        if (response.ok) {
          const userInfo = await response.json();
          console.log('auth.service: Received user info from Google API');
          
          const userProfile = {
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            imageUrl: userInfo.picture
          };
          
          console.log('auth.service: Storing user info in localStorage');
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userProfile));
          
          return userProfile;
        } else {
          // If we got a 401 Unauthorized, the token might be invalid
          if (response.status === 401) {
            console.warn('auth.service: Access token is invalid or expired (401 Unauthorized)');
            
            // Clear the invalid token
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
            
            return null;
          }
          
          throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('auth.service: Error fetching user info:', error);
        // Don't throw, just return null
        return null;
      }
    } else {
      console.log('auth.service: No access token available, cannot fetch user info');
    }
    
    return null;
  } catch (error) {
    console.error('auth.service: Error in getCurrentUser:', error);
    return null;
  }
};

/**
 * Sign out from Google
 */
export const signOut = () => {
  console.log('auth.service: Signing out...');
  
  // Clear all stored tokens
  Object.values(STORAGE_KEYS).forEach(key => {
    console.log(`auth.service: Removing ${key} from localStorage`);
    localStorage.removeItem(key);
  });
  
  // Clear gapi client token if available
  if (window.gapi && window.gapi.client) {
    console.log('auth.service: Clearing Google API client token');
    window.gapi.client.setToken(null);
  } else {
    console.log('auth.service: Google API client not available, cannot clear token');
  }
  
  // Dispatch event for components to react
  console.log('auth.service: Dispatching googleAuthStateChanged event for sign out');
  window.dispatchEvent(new CustomEvent('googleAuthStateChanged', { 
    detail: { isSignedIn: false, userInfo: null } 
  }));
  
  return Promise.resolve();
};

/**
 * Get the current access token
 * @returns {string|null} Access token or null if not available
 */
export const getAccessToken = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  console.log('auth.service: getAccessToken called, token exists:', !!token);
  return token;
};

/**
 * Check if token is expired and refresh if needed
 * @returns {Promise<string>} Promise that resolves with a valid access token
 */
export const getValidAccessToken = async () => {
  console.log('auth.service: Getting valid access token...');
  
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
  // If token is valid and not expired, return it
  if (accessToken && expiresAt && Number(expiresAt) > Date.now()) {
    console.log('auth.service: Access token is valid and not expired');
    return accessToken;
  }
  
  // If token is expired, we need to re-authenticate
  // For this simple implementation, we'll just redirect to sign in again
  console.log('auth.service: Token expired or missing, redirecting to sign in');
  signInDirect();
  throw new Error('Token expired, redirecting to sign in');
};