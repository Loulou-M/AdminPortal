// GoogleAuth.jsx
import React, { useState, useEffect } from 'react';

const GoogleAuth = () => {
  // State variables
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Backend URL - make sure this matches your Flask server
  const API_URL = 'http://localhost:5000';

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Function to check authentication status
  const checkAuthStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Checking auth status...');
      const response = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include' // Important for cookies/session
      });
      
      const data = await response.json();
      console.log('Auth status response:', data);
      
      // Update state based on response
      setIsAuthenticated(data.authenticated);
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
      
      // Store debug info
      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        data: data,
        cookies: document.cookie,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError(`Failed to check authentication status: ${error.message}`);
      setDebugInfo({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login button click
  const handleLogin = () => {
    console.log('Initiating Google sign-in...');
    // Redirect to the OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  // Handle logout button click
  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      console.log('Logging out...');
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include' // Important for cookies/session
      });
      
      setIsAuthenticated(false);
      setUser(null);
      console.log('Successfully logged out');
    } catch (error) {
      console.error('Error logging out:', error);
      setError(`Failed to log out: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle debug information display
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Generate a random avatar color based on username
  const getAvatarColor = (name) => {
    if (!name) return '#3F9CBC'; // Default color
    
    // Simple hash function for the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };

  // CSS styles
  const styles = {
    container: {
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
      backgroundColor: '#fff',
      maxWidth: '400px',
      margin: '0 auto'
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: '#666'
    },
    error: {
      padding: '12px 15px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    header: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#333',
      textAlign: 'center'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    },
    avatar: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '20px',
      marginRight: '15px'
    },
    userDetails: {
      flex: 1
    },
    userName: {
      fontWeight: 'bold',
      margin: 0,
      fontSize: '16px'
    },
    userEmail: {
      margin: '5px 0 0 0',
      color: '#666',
      fontSize: '14px'
    },
    button: {
      width: '100%',
      padding: '12px 15px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px',
      transition: 'background-color 0.2s'
    },
    signInButton: {
      backgroundColor: '#3F9CBC',
      color: 'white'
    },
    signOutButton: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    debugButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#6c757d',
      cursor: 'pointer',
      fontSize: '12px',
      marginTop: '15px',
      textDecoration: 'underline'
    },
    debugInfo: {
      marginTop: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: '200px',
      overflowY: 'auto'
    },
    buttonContainer: {
      marginTop: '15px'
    },
    googleLogo: {
      marginRight: '10px',
      verticalAlign: 'middle'
    },
    signInContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    signInText: {
      fontSize: '16px',
      lineHeight: '24px',
      marginBottom: '20px',
      color: '#666',
      textAlign: 'center'
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#3F9CBC">
            <g fill="none" fillRule="evenodd">
              <g transform="translate(1 1)" strokeWidth="2">
                <circle strokeOpacity=".5" cx="18" cy="18" r="18"/>
                <path d="M36 18c0-9.94-8.06-18-18-18">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 18 18"
                    to="360 18 18"
                    dur="1s"
                    repeatCount="indefinite"/>
                </path>
              </g>
            </g>
          </svg>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Render authenticated state
  if (isAuthenticated) {
    const avatarColor = getAvatarColor(user?.displayName || user?.emailAddress);
    const initials = (user?.displayName || user?.emailAddress || '?')
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return (
      <div style={styles.container}>
        <h3 style={styles.header}>Google Drive Access</h3>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <div style={styles.userInfo}>
          <div style={{...styles.avatar, backgroundColor: avatarColor}}>
            {initials}
          </div>
          <div style={styles.userDetails}>
            <p style={styles.userName}>{user?.displayName || 'User'}</p>
            <p style={styles.userEmail}>{user?.emailAddress || 'No email available'}</p>
          </div>
        </div>
        
        <div style={styles.buttonContainer}>
          <button 
            onClick={handleLogout} 
            style={{...styles.button, ...styles.signOutButton}}
          >
            Sign Out
          </button>
        </div>
        
        <button 
          onClick={toggleDebug} 
          style={styles.debugButton}
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        
        {showDebug && debugInfo && (
          <div style={styles.debugInfo}>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  // Render unauthenticated state
  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Google Drive Access</h3>
      
      {error && <div style={styles.error}>{error}</div>}
      
      <p style={styles.signInText}>
        Sign in with your Google account to access Drive features and file storage
      </p>
      
      <div style={styles.buttonContainer}>
        <button 
          onClick={handleLogin} 
          style={{...styles.button, ...styles.signInButton}}
        >
          <div style={styles.signInContent}>
            <svg style={styles.googleLogo} width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Sign in with Google
          </div>
        </button>
      </div>
      
      <button 
        onClick={toggleDebug} 
        style={styles.debugButton}
      >
        {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
      </button>
      
      {showDebug && debugInfo && (
        <div style={styles.debugInfo}>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default GoogleAuth;