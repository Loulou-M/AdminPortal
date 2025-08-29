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
    if (didInitRef.current) {
      console.log('IntegrationTest: Initialization already ran. Skipping.');
      return;
    }
    didInitRef.current = true;

    const init = async () => {
      try {
        setInitializing(true);
        setTestError('');
        setTestMessage('');
        console.log('IntegrationTest: Initializing Google API client...');

        // Initialize Google API client and check for tokens from redirect
        await initGoogleApiClient();

        // Check the current sign-in status after initialization
        const signedIn = isSignedIn();
        console.log('IntegrationTest: isSignedIn() returned:', signedIn);
        setAuthenticated(signedIn);

        if (signedIn) {
          // This block runs ONLY if the user is actually signed in
          console.log('IntegrationTest: User is signed in. Fetching user info...');
          setTestMessage('Successfully authenticated with Google.');
        } else {
          // This block runs if the user is NOT signed in
          console.log('IntegrationTest: User is not signed in.');
          setTestMessage('Not signed in. Please sign in to test components.');
        }
      } catch (error) {
        console.error('IntegrationTest: Failed to initialize Google API:', error);
        setTestError('Failed to initialize Google API. Check console for details.');
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, []);

  // Timer to clear test messages after a delay
  useEffect(() => {
    if (testMessage) {
      const timer = setTimeout(() => {
        setTestMessage('');
      }, 1000); // Hide message after 5 seconds

      // Cleanup function to clear the timer if the component unmounts
      // or if the message changes before the timer completes
      return () => clearTimeout(timer);
    }
  }, [testMessage]);

  // Handle auth change
  const handleAuthChange = (isSignedIn, userInfo) => {
    console.log('IntegrationTest: Auth change detected:', { isSignedIn, userInfo });
    setAuthenticated(isSignedIn);

    if (isSignedIn && userInfo) {
      console.log('IntegrationTest: Signed in with user info');
      setTestMessage(`Signed in as ${userInfo.name || 'User'} (${userInfo.email || 'No email'}).`);
    } else if (isSignedIn) {
      console.log('IntegrationTest: Signed in without user info');
      setTestMessage('Signed in successfully.');
    } else {
      console.log('IntegrationTest: Signed out');
      setTestMessage('Signed out.');
      setFolderId(''); // Clear folder ID on sign out
      setTemplateId(null); // Clear template ID on sign out
      setUserId(null); // Clear user ID on sign out
    }
  };

  // Generic handler for form completions
  const handleSaveComplete = (dataType, data) => {
    console.log(`IntegrationTest: ${dataType} saved:`, data);
    setTestMessage(`${dataType} saved: ${data.name || data.email || 'No name'}.`);
    setRefreshTrigger(prev => prev + 1);

    // Reset IDs and navigate
    if (dataType === 'Template') {
      setTemplateId(null);
      setActiveTest('template-list');
    } else if (dataType === 'Site') {
      setActiveTest('site-list');
    } else if (dataType === 'User') {
      setUserId(null);
      setActiveTest('user-list');
    } else if (dataType === 'File') {
      setActiveTest('file-list');
    }
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
    </div>
  );

  // Render active test component
  const renderTestComponent = () => {
    switch (activeTest) {
      case 'auth':
        return (
          <div className="test-component auth-test">
            <h2>Authentication</h2>
            <p>Test Google authentication by signing in/out.</p>
            <GoogleAuth onAuthChange={handleAuthChange} />
          </div>
        );

      case 'file-upload':
        return (
          <div className="test-component file-upload-test">
            <h2>File Upload </h2>
            <div className="folder-input">
              <label>
                Google Drive Folder ID:
                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="Enter folder ID from Google Drive URL"
                />
              </label>
              <small>Find this in your Google Drive URL: <code>https://drive.google.com/drive/folders/<b>YOUR_FOLDER_ID</b></code></small>
            </div>
            {folderId ? (
              <FileUpload
                folderId={folderId}
                onUploadComplete={(fileData) => handleSaveComplete('File', fileData)}
              />
            ) : (
              <p className="hint-message">Please enter a folder ID to test file uploads.</p>
            )}
          </div>
        );

      case 'file-list':
        return (
          <div className="test-component file-list-test">
            <h2>File List </h2>
            <div className="folder-input">
              <label>
                Google Drive Folder ID:
                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="Enter folder ID from Google Drive URL"
                />
              </label>
              <small>Find this in your Google Drive URL: <code>https://drive.google.com/drive/folders/<b>YOUR_FOLDER_ID</b></code></small>
            </div>
            {folderId ? (
              <FileList
                folderId={folderId}
                onRefreshNeeded={refreshTrigger}
              />
            ) : (
              <p className="hint-message">Please enter a folder ID to test file listing.</p>
            )}
          </div>
        );

      case 'user-form':
        return (
          <div className="test-component user-form-test">
            <h2>User Form</h2>
            <UserForm
              userId={userId}
              onSave={(userData) => handleSaveComplete('User', userData)}
              onCancel={() => {
                setUserId(null);
                setActiveTest('user-list');
              }}
            />
          </div>
        );

      case 'user-list':
        return (
          <div className="test-component user-list-test">
            <h2>User List</h2>
            <UserList
              onEdit={(id) => {
                setUserId(id);
                setActiveTest('user-form');
              }}
              refreshTrigger={refreshTrigger}
            />
            <div className="action-buttons">
              <button
                onClick={() => {
                  setUserId(null);
                  setActiveTest('user-form');
                }}
                className="create-button"
              >
                ➕ Create New User
              </button>
            </div>
          </div>
        );

      case 'template-form':
        return (
          <div className="test-component template-form-test">
            <h2>Template Form</h2>
            <TemplateForm
              templateId={templateId}
              onSave={(templateData) => handleSaveComplete('Template', templateData)}
              onCancel={() => {
                setTemplateId(null);
                setActiveTest('template-list');
              }}
            />
          </div>
        );

      case 'template-list':
        return (
          <div className="test-component template-list-test">
            <h2>Template List</h2>
            <TemplateList
              onEdit={(id) => {
                setTemplateId(id);
                setActiveTest('template-form');
              }}
              refreshTrigger={refreshTrigger}
            />
            <div className="action-buttons">
              <button
                onClick={() => {
                  setTemplateId(null);
                  setActiveTest('template-form');
                }}
                className="create-button"
              >
                ➕ Create New Template
              </button>
            </div>
          </div>
        );

      case 'site-form':
        return (
          <div className="test-component site-form-test">
            <h2>Site Form</h2>
            <SiteForm
              onSaveComplete={(siteData) => handleSaveComplete('Site', siteData)}
            />
          </div>
        );

      case 'site-list':
        return (
          <div className="test-component site-list-test">
            <h2>Site List</h2>
            <SiteList
              onEdit={(site) => {
                setTestMessage(`Edit requested for site: ${site.name}. (Editing functionality not yet implemented)`);
              }}
              onViewDocuments={(site) => {
                if (site.folder_type === 'GoogleDrive' && site.folder_link) {
                  const folderIdMatch = site.folder_link.match(/folders\/([^/?]+)/);
                  if (folderIdMatch && folderIdMatch[1]) {
                    const extractedFolderId = folderIdMatch[1];
                    setFolderId(extractedFolderId);
                    setActiveTest('file-list');
                    setTestMessage(`Viewing documents for site: ${site.name}`);
                  } else {
                    setTestError('Could not extract folder ID from the site link.');
                  }
                } else {
                  setTestError('This site does not have a valid Google Drive folder link.');
                }
              }}
              refreshTrigger={refreshTrigger}
            />
            <div className="action-buttons">
              <button
                onClick={() => {
                  setActiveTest('site-form');
                }}
                className="create-button"
              >
                ➕ Create New Site
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="test-component initial-state">
            <h2>Welcome to the Integration Test Console</h2>
            <p>Select a component from the navigation to begin testing its functionality with the Google Drive API.</p>
            <p>Current Status: <strong>{authenticated ? 'Signed In' : 'Signed Out'}</strong></p>
          </div>
        );
    }
  };

  if (initializing) {
    return (
      <div className="integration-test loading-state">
        <div className="spinner"></div>
        <h1>Loading Integration Test</h1>
        <p>Initializing Google API... Please wait.</p>
      </div>
    );
  }

  return (
    <div className="integration-test-container">
      <header className="test-header">
        <h1>Google Drive </h1>
      </header>
      <div className="status-messages">
        {testError && (
          <div className="alert-box error">
            <p>⚠️ {testError}</p>
            <button onClick={() => setTestError('')}>Dismiss</button>
          </div>
        )}
        {testMessage && (
          <div className="alert-box success">
            <p>✅ {testMessage}</p>
            <button onClick={() => setTestMessage('')}>Dismiss</button>
          </div>
        )}
      </div>

      <div className="test-console">
        {renderNavigation()}
        <div className="test-content-area">
          {renderTestComponent()}
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;