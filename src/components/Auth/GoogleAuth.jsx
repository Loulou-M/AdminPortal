// GoogleAuth.jsx
// Google Authentication Component for Admin Portal

import React, { useState, useEffect, useRef } from 'react';
import { 
  signInDirect, 
  signOut, 
  isSignedIn, 
  getCurrentUser, 
  debugAuthState, 
  initGoogleApiClient 
} from '../../services/auth.service';

const GoogleAuth = ({ onAuthChange }) => {
  // Add this ref to track initialization
  const didInitRef = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Initialize authentication
  useEffect(() => {
    // Guard against StrictMode double-invocation
    if (didInitRef.current) return;
    didInitRef.current = true;
    
    const initAuth = async () => {
      try {
        setLoading(true);
        console.log('GoogleAuth: Initializing authentication...');
        
        // Debug auth state before initialization
        console.log('GoogleAuth: Auth state before initialization:');
        debugAuthState();
        
        // Initialize Google API client
        await initGoogleApiClient();
        
        // Debug auth state after initialization
        console.log('GoogleAuth: Auth state after initialization:');
        debugAuthState();
        
        // Check if user is signed in
        const signedIn = isSignedIn();
        console.log('GoogleAuth: isSignedIn() returned:', signedIn);
        setAuthenticated(signedIn);
        
        // If signed in, get user info
        if (signedIn) {
          try {
            console.log('GoogleAuth: Getting user info...');
            const userInfo = await getCurrentUser();
            console.log('GoogleAuth: User info received:', userInfo);
            
            if (userInfo) {
              setUser(userInfo);
              
              // Call the callback if provided
              if (onAuthChange) {
                console.log('GoogleAuth: Calling onAuthChange with user info');
                onAuthChange(true, userInfo);
              }
            } else {
              // We're signed in but couldn't get user info
              console.warn('GoogleAuth: Signed in but user info is null');
              
              // Still notify that we're authenticated
              if (onAuthChange) {
                console.log('GoogleAuth: Calling onAuthChange without user info');
                onAuthChange(true, null);
              }
            }
          } catch (userError) {
            console.warn('GoogleAuth: Signed in but failed to get user info:', userError);
            
            // Still notify that we're authenticated
            if (onAuthChange) {
              console.log('GoogleAuth: Calling onAuthChange with error');
              onAuthChange(true, null);
            }
          }
        } else {
          console.log('GoogleAuth: Not signed in');
          
          if (onAuthChange) {
            console.log('GoogleAuth: Calling onAuthChange for signed out state');
            onAuthChange(false, null);
          }
        }
      } catch (error) {
        console.error('GoogleAuth: Failed to initialize Google API client:', error);
        setError('Failed to initialize Google authentication. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const handleAuthChange = async (event) => {
      console.log('GoogleAuth: Auth state change event received:', event.detail);
      
      const { isSignedIn } = event.detail;
      setAuthenticated(isSignedIn);
      
      if (isSignedIn) {
        try {
          console.log('GoogleAuth: Getting user info after auth state change...');
          const userInfo = await getCurrentUser();
          console.log('GoogleAuth: User info after auth state change:', userInfo);
          
          if (userInfo) {
            setUser(userInfo);
            
            // Call the callback if provided
            if (onAuthChange) {
              console.log('GoogleAuth: Calling onAuthChange with user info after auth state change');
              onAuthChange(true, userInfo);
            }
          } else {
            // We're signed in but couldn't get user info
            console.warn('GoogleAuth: Auth state changed but user info is null');
            
            if (onAuthChange) {
              console.log('GoogleAuth: Calling onAuthChange without user info after auth state change');
              onAuthChange(true, null);
            }
          }
        } catch (userError) {
          console.warn('GoogleAuth: Auth state changed but failed to get user info:', userError);
          
          if (onAuthChange) {
            console.log('GoogleAuth: Calling onAuthChange with error after auth state change');
            onAuthChange(true, null);
          }
        }
      } else {
        console.log('GoogleAuth: Auth state changed to signed out');
        setUser(null);
        
        // Call the callback if provided
        if (onAuthChange) {
          console.log('GoogleAuth: Calling onAuthChange for signed out state after auth state change');
          onAuthChange(false, null);
        }
      }
    };

    console.log('GoogleAuth: Adding event listener for googleAuthStateChanged');
    window.addEventListener('googleAuthStateChanged', handleAuthChange);

    return () => {
      console.log('GoogleAuth: Removing event listener for googleAuthStateChanged');
      window.removeEventListener('googleAuthStateChanged', handleAuthChange);
    };
  }, [onAuthChange]);

  // Handle sign in
  const handleSignIn = () => {
    try {
      console.log('GoogleAuth: Initiating sign in...');
      setLoading(true);
      setError(null);
      signInDirect();
      console.log('GoogleAuth: Redirecting to Google OAuth page...');
    } catch (error) {
      console.error('GoogleAuth: Sign in failed:', error);
      setError('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      console.log('GoogleAuth: Signing out...');
      setLoading(true);
      await signOut();
      console.log('GoogleAuth: Signed out successfully');
      setAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('GoogleAuth: Sign out failed:', error);
      setError('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="google-auth error">
        <p className="error-message">{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="button"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="google-auth loading">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="google-auth signed-in">
        {user ? (
          <div className="user-info">
            {user.imageUrl && (
              <img 
                src={user.imageUrl} 
                alt={user.name || "User"} 
                className="user-avatar"
              />
            )}
            <div className="user-details">
              <p className="user-name">{user.name || "Authenticated User"}</p>
              <p className="user-email">{user.email || "No email available"}</p>
            </div>
          </div>
        ) : (
          <div className="user-info">
            <div className="user-details">
              <p className="user-name">Authenticated User</p>
              <p className="user-email">User details not available</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleSignOut} 
          className="button sign-out-button"
        >
          Sign Out
        </button>
        <div className="debug-buttons">
          <button 
            onClick={() => {
              console.log('GoogleAuth: Debug button clicked');
              debugAuthState();
            }} 
            className="button debug-button"
            style={{ backgroundColor: '#6c757d', marginTop: '10px' }}
          >
            Debug Auth State
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="google-auth signed-out">
      <p className="auth-prompt">Sign in with Google to access Drive features</p>
      <button 
        onClick={handleSignIn} 
        className="button sign-in-button"
      >
        Sign in with Google
      </button>
      <div className="debug-buttons">
        <button 
          onClick={() => {
            console.log('GoogleAuth: Debug button clicked');
            debugAuthState();
          }} 
          className="button debug-button"
          style={{ backgroundColor: '#6c757d', marginTop: '10px' }}
        >
          Debug Auth State
        </button>
      </div>
    </div>
  );
};

export default GoogleAuth;