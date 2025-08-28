// IntegrationTest.jsx
// This file is for testing the Google Drive integration components

import React, { useState, useEffect, useRef } from 'react';
import GoogleAuth from './Auth/GoogleAuth';
import FileList from './Documents/FileList';
import FileUpload from './Documents/FileUpload';
import TemplateList from './Templates/TemplateList';
import TemplateForm from './Templates/TemplateForm';
import SiteList from './Sites/SiteList';
import SiteForm from './Sites/SiteForm';
import UserForm from './Users/UserForm';
import UserList from './Users/UserList';
import { initGoogleApiClient, isSignedIn, debugAuthState } from '../services/auth.service';

const IntegrationTest = () => {
  // Add this ref to track initialization
  const didInitRef = useRef(false);
  
  // Authentication state
  const [authenticated, setAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Active test component
  const [activeTest, setActiveTest] = useState('auth');
  
  // Test data
  const [folderId, setFolderId] = useState('');
  const [templateId, setTemplateId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [testMessage, setTestMessage] = useState('');
  const [testError, setTestError] = useState('');
  const [userId, setUserId] = useState(null);

  // Initialize Google API
  useEffect(() => {
    // Guard against StrictMode double-invocation
    if (didInitRef.current) return;
    didInitRef.current = true;
    
    const init = async () => {
      try {
        setInitializing(true);
        console.log('IntegrationTest: Initializing...');
        
        // Debug auth state before initialization
        console.log('IntegrationTest: Auth state before initialization:');
        debugAuthState();
        
        // Initialize Google API client and check for tokens from redirect
        await initGoogleApiClient();
        
        // Debug auth state after initialization
        console.log('IntegrationTest: Auth state after initialization:');
        debugAuthState();
        
        // Check if user is signed in
        const signedIn = isSignedIn();
        console.log('IntegrationTest: isSignedIn() returned:', signedIn);
        setAuthenticated(signedIn);
        
        if (signedIn) {
          console.log('IntegrationTest: User is signed in');
          setTestMessage('Successfully authenticated with Google');
        } else {
          console.log('IntegrationTest: User is not signed in');
        }
      } catch (error) {
        // Only show error if it's not related to a redirect for authentication
        if (!error.message?.includes('redirecting to sign in')) {
          console.error('IntegrationTest: Failed to initialize Google API:', error);
          setTestError('Failed to initialize Google API. Check console for details.');
        } else {
          console.log('IntegrationTest: Redirecting for authentication...');
        }
      } finally {
        setInitializing(false);
      }
    };
    
    init();
  }, []);

  // Handle auth change
  const handleAuthChange = (isSignedIn, userInfo) => {
    console.log('IntegrationTest: Auth change detected:', { isSignedIn, userInfo });
    
    setAuthenticated(isSignedIn);
    
    if (isSignedIn && userInfo) {
      console.log('IntegrationTest: Signed in with user info');
      setTestMessage(`Signed in as ${userInfo.name || 'User'} (${userInfo.email || 'No email'})`);
    } else if (isSignedIn) {
      console.log('IntegrationTest: Signed in without user info');
      setTestMessage('Signed in successfully');
    } else {
      console.log('IntegrationTest: Signed out');
      setTestMessage('Signed out');
    }
  };

  // Handle file upload
  const handleFileUpload = (fileData) => {
    console.log('IntegrationTest: File uploaded:', fileData);
    setTestMessage(`File uploaded: ${fileData.name}`);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle template save
  const handleTemplateSave = (templateData) => {
    console.log('IntegrationTest: Template saved:', templateData);
    setTemplateId(null);
    setTestMessage(`Template saved: ${templateData.name}`);
    setRefreshTrigger(prev => prev + 1);
    setActiveTest('template-list');
  };

  // Handle site creation
  const handleSiteCreation = (siteData) => {
    console.log('IntegrationTest: Site created:', siteData);
    setTestMessage(`Site created: ${siteData.name}`);
    setActiveTest('site-list');
    setRefreshTrigger(prev => prev + 1);
  };

  // Render test navigation
  const renderNavigation = () => (
    <div className="test-navigation">
      <h3>Test Components</h3>
      <div className="nav-buttons">
        <button 
          onClick={() => setActiveTest('auth')}
          className={activeTest === 'auth' ? 'active' : ''}
        >
          Authentication
        </button>
        <button 
          onClick={() => setActiveTest('file-upload')}
          className={activeTest === 'file-upload' ? 'active' : ''}
          disabled={!authenticated}
        >
          File Upload
        </button>
        <button 
          onClick={() => setActiveTest('file-list')}
          className={activeTest === 'file-list' ? 'active' : ''}
          disabled={!authenticated}
        >
          File List
        </button>
        <button 
          onClick={() => setActiveTest('template-form')}
          className={activeTest === 'template-form' ? 'active' : ''}
          disabled={!authenticated}
        >
          Create Template
        </button>
        <button 
          onClick={() => setActiveTest('template-list')}
          className={activeTest === 'template-list' ? 'active' : ''}
          disabled={!authenticated}
        >
          Template List
        </button>
        <button 
          onClick={() => setActiveTest('site-form')}
          className={activeTest === 'site-form' ? 'active' : ''}
          disabled={!authenticated}
        >
          Create Site
        </button>
        <button 
          onClick={() => setActiveTest('site-list')}
          className={activeTest === 'site-list' ? 'active' : ''}
          disabled={!authenticated}
        >
          Site List
        </button>

        <button 
        onClick={() => setActiveTest('user-form')}
        className={activeTest === 'user-form' ? 'active' : ''}
        disabled={!authenticated}
      >
        Create User
      </button>
      <button 
        onClick={() => setActiveTest('user-list')}
        className={activeTest === 'user-list' ? 'active' : ''}
        disabled={!authenticated}
      >
        User List
      </button>
      </div>
      <div className="debug-actions" style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            console.log('IntegrationTest: Manual debug requested');
            debugAuthState();
          }}
          className="debug-button"
          style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px' }}
        >
          Debug Auth State
        </button>
      </div>
    </div>
  );

  // Render active test component
  const renderTestComponent = () => {
    switch (activeTest) {
      case 'auth':
        return (
          <div className="test-component auth-test">
            <h2>Authentication Test</h2>
            <p>Test Google authentication by signing in/out:</p>
            <GoogleAuth onAuthChange={handleAuthChange} />
          </div>
        );
        
      case 'file-upload':
        return (
          <div className="test-component file-upload-test">
            <h2>File Upload Test</h2>
            <div className="folder-input">
              <label>
                Google Drive Folder ID:
                <input 
                  type="text" 
                  value={folderId} 
                  onChange={(e) => {
                    console.log('IntegrationTest: Folder ID changed:', e.target.value);
                    setFolderId(e.target.value);
                  }}
                  placeholder="Enter folder ID from Google Drive URL"
                />
              </label>
              <small>Find this in your Google Drive URL: https://drive.google.com/drive/folders/YOUR_FOLDER_ID</small>
            </div>
            {folderId ? (
              <FileUpload 
                folderId={folderId} 
                onUploadComplete={handleFileUpload} 
              />
            ) : (
              <p>Please enter a folder ID to test file uploads</p>
            )}
          </div>
        );
        
      case 'file-list':
        return (
          <div className="test-component file-list-test">
            <h2>File List Test</h2>
            <div className="folder-input">
              <label>
                Google Drive Folder ID:
                <input 
                  type="text" 
                  value={folderId} 
                  onChange={(e) => {
                    console.log('IntegrationTest: Folder ID changed:', e.target.value);
                    setFolderId(e.target.value);
                  }}
                  placeholder="Enter folder ID from Google Drive URL"
                />
              </label>
              <small>Find this in your Google Drive URL: https://drive.google.com/drive/folders/YOUR_FOLDER_ID</small>
            </div>
            {folderId ? (
              <FileList 
                folderId={folderId}
                onRefreshNeeded={refreshTrigger}
              />
            ) : (
              <p>Please enter a folder ID to test file listing</p>
            )}
          </div>
        );
        
        case 'user-form':
  return (
    <div className="test-component user-form-test">
      <h2>User Form Test</h2>
      <UserForm
        userId={userId}
        onSave={(userData) => {
          console.log('IntegrationTest: User saved:', userData);
          setUserId(null);
          setTestMessage(`User saved: ${userData.name}`);
          setActiveTest('user-list');
          setRefreshTrigger(prev => prev + 1);
        }}
        onCancel={() => {
          console.log('IntegrationTest: User form canceled');
          setUserId(null);
          setActiveTest('user-list');
        }}
      />
    </div>
  );

case 'user-list':
  return (
    <div className="test-component user-list-test">
      <h2>User List Test</h2>
      <UserList
        onEdit={(id) => {
          console.log('IntegrationTest: Edit user requested:', id);
          setUserId(id);
          setActiveTest('user-form');
        }}
        refreshTrigger={refreshTrigger}
      />
      <div className="action-buttons">
        <button 
          onClick={() => {
            console.log('IntegrationTest: Create new user clicked');
            setUserId(null);
            setActiveTest('user-form');
          }}
          className="create-button"
        >
          Create New User
        </button>
      </div>
    </div>
  );

      case 'template-form':
        return (
          <div className="test-component template-form-test">
            <h2>Template Form Test</h2>
            <TemplateForm
              templateId={templateId}
              onSave={handleTemplateSave}
              onCancel={() => {
                console.log('IntegrationTest: Template form canceled');
                setTemplateId(null);
                setActiveTest('template-list');
              }}
            />
          </div>
        );
        
      case 'template-list':
        return (
          <div className="test-component template-list-test">
            <h2>Template List Test</h2>
            <TemplateList
              onEdit={(id) => {
                console.log('IntegrationTest: Edit template requested:', id);
                setTemplateId(id);
                setActiveTest('template-form');
              }}
              refreshTrigger={refreshTrigger}
            />
            <div className="action-buttons">
              <button 
                onClick={() => {
                  console.log('IntegrationTest: Create new template clicked');
                  setActiveTest('template-form');
                }}
                className="create-button"
              >
                Create New Template
              </button>
            </div>
          </div>
        );
        
      case 'site-form':
        return (
          <div className="test-component site-form-test">
            <h2>Site Form Test</h2>
            <SiteForm
              onSaveComplete={handleSiteCreation}
            />
          </div>
        );
        
      case 'site-list':
        return (
          <div className="test-component site-list-test">
            <h2>Site List Test</h2>
            <SiteList
              onEdit={(site) => {
                console.log('IntegrationTest: Edit site requested:', site);
                setTestMessage(`Edit requested for site: ${site.name}`);
              }}
              onViewDocuments={(site) => {
                console.log('IntegrationTest: View documents requested for site:', site);
                // Extract folder ID from Google Drive link if available
                if (site.folder_type === 'GoogleDrive' && site.folder_link) {
                  const folderIdMatch = site.folder_link.match(/folders\/([^/?]+)/);
                  if (folderIdMatch && folderIdMatch[1]) {
                    const extractedFolderId = folderIdMatch[1];
                    console.log('IntegrationTest: Extracted folder ID:', extractedFolderId);
                    setFolderId(extractedFolderId);
                    setActiveTest('file-list');
                    setTestMessage(`Viewing documents for site: ${site.name}`);
                  } else {
                    console.log('IntegrationTest: Could not extract folder ID from link:', site.folder_link);
                  }
                } else {
                  console.log('IntegrationTest: Site does not have a Google Drive link:', site);
                }
              }}
              refreshTrigger={refreshTrigger}
            />
            <div className="action-buttons">
              <button 
                onClick={() => {
                  console.log('IntegrationTest: Create new site clicked');
                  setActiveTest('site-form');
                }}
                className="create-button"
              >
                Create New Site
              </button>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="test-component">
            <h2>Select a Test</h2>
            <p>Please select a component to test from the navigation.</p>
          </div>
        );
    }
  };

  // Show loading during initialization
  if (initializing) {
    return (
      <div className="integration-test loading">
        <h1>Google Drive Integration Test</h1>
        <p>Initializing Google API... Please wait.</p>
      </div>
    );
  }

  return (
    <div className="integration-test">
      <h1>Google Drive Integration Test</h1>
      
      {testError && (
        <div className="test-error">
          <p>{testError}</p>
          <button onClick={() => setTestError('')}>Dismiss</button>
        </div>
      )}
      
      {testMessage && (
        <div className="test-message">
          <p>{testMessage}</p>
          <button onClick={() => setTestMessage('')}>Dismiss</button>
        </div>
      )}
      
      <div className="test-container">
        {renderNavigation()}
        <div className="test-content">
          {renderTestComponent()}
        </div>
      </div>
      
      <div className="test-footer">
        <p>Authentication Status: {authenticated ? 'Signed In' : 'Signed Out'}</p>
        <button 
          onClick={() => {
            console.log('IntegrationTest: Force refresh');
            setRefreshTrigger(prev => prev + 1);
          }}
          style={{ 
            padding: '5px 10px', 
            background: '#3F9CBC', 
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginTop: '5px'
          }}
        >
          Force Refresh
        </button>
      </div>
    </div>
  );
};

export default IntegrationTest;