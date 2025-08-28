// App.jsx
// Main Application Component for Admin Portal

import React, { useState, useEffect } from 'react';
import GoogleAuth from './Auth/GoogleAuth';
import FileList from './Files/FileList';
import FileUpload from './Files/FileUpload';
import TemplateList from './Templates/TemplateList';
import TemplateForm from './Templates/TemplateForm';
import SiteForm from './Sites/SiteForm';
import SiteList from './Sites/SiteList';
import { initGoogleApiClient, isSignedIn } from '../services/auth.service';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const App = () => {
  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Active view state
  const [activeView, setActiveView] = useState('dashboard');
  const [previousView, setPreviousView] = useState(null);
  
  // Content state
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize Google API client
  useEffect(() => {
    const init = async () => {
      try {
        await initGoogleApiClient();
        const signedIn = isSignedIn();
        setAuthenticated(signedIn);
        setAuthChecked(true);
        
        // Load last active view from storage
        const lastView = loadFromStorage('last_active_view', 'dashboard');
        setActiveView(lastView);
        
        // Load last selected folder
        const lastFolder = loadFromStorage('last_folder_id', '');
        setSelectedFolderId(lastFolder);
      } catch (error) {
        console.error('Failed to initialize Google API client:', error);
        setAuthChecked(true);
      }
    };
    
    init();
  }, []);

  // Handle authentication change
  const handleAuthChange = (isSignedIn, userInfo) => {
    setAuthenticated(isSignedIn);
    
    if (!isSignedIn) {
      // Reset states when signed out
      setSelectedFolderId('');
      setEditingTemplateId(null);
    }
  };

  // Handle view change
  const handleViewChange = (view) => {
    setPreviousView(activeView);
    setActiveView(view);
    saveToStorage('last_active_view', view);
  };

  // Handle folder selection
  const handleFolderSelect = (folderId) => {
    setSelectedFolderId(folderId);
    saveToStorage('last_folder_id', folderId);
  };

  // Handle new upload
  const handleUploadComplete = () => {
    // Trigger refresh of file list
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle template edit
  const handleEditTemplate = (templateId) => {
    setEditingTemplateId(templateId);
    setPreviousView(activeView);
    setActiveView('edit-template');
  };

  // Handle template save
  const handleTemplateSave = () => {
    setEditingTemplateId(null);
    setRefreshTrigger(prev => prev + 1);
    
    // Return to previous view
    if (previousView) {
      setActiveView(previousView);
      setPreviousView(null);
    } else {
      setActiveView('templates');
    }
  };

  // Handle site creation
  const handleSiteCreated = (siteData) => {
    console.log('Site created:', siteData);
    // In a real app, you might want to save this to a list of sites
    // or trigger a refresh of sites list
  };

  // Conditional rendering based on authentication
  if (!authChecked) {
    return (
      <div className="app-loading">
        <p>Initializing application...</p>
      </div>
    );
  }

  return (
    <div className="admin-portal-app">
      <header className="app-header">
        <h1>Admin Portal</h1>
        <GoogleAuth onAuthChange={handleAuthChange} />
      </header>
      
      {!authenticated ? (
        <div className="auth-required">
          <p>Please sign in with Google to access the Admin Portal features.</p>
        </div>
      ) : (
        <div className="app-content">
          <nav className="app-nav">
            <ul>
              <li>
                <button
                  onClick={() => handleViewChange('dashboard')}
                  className={activeView === 'dashboard' ? 'active' : ''}
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleViewChange('sites')}
                  className={activeView === 'sites' ? 'active' : ''}
                >
                  Construction Sites
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleViewChange('documents')}
                  className={activeView === 'documents' ? 'active' : ''}
                >
                  Documents
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleViewChange('templates')}
                  className={activeView === 'templates' ? 'active' : ''}
                >
                  Inspection Templates
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleViewChange('new-template')}
                  className={activeView === 'new-template' ? 'active' : ''}
                >
                  Create Template
                </button>
              </li>
            </ul>
          </nav>
          
          <main className="view-content">
            {activeView === 'dashboard' && (
              <div className="dashboard-view">
                <h2>Dashboard</h2>
                <p>Welcome to the Admin Portal</p>
                <div className="dashboard-actions">
                  <button onClick={() => handleViewChange('sites')}>
                    Create New Site
                  </button>
                  <button onClick={() => handleViewChange('documents')}>
                    Manage Documents
                  </button>
                  <button onClick={() => handleViewChange('templates')}>
                    Manage Inspection Templates
                  </button>
                </div>
              </div>
            )}
            
            {activeView === 'sites' && (
              <div className="sites-view">
                <div className="sites-header">
                  <h2>Construction Sites</h2>
                  <button onClick={() => handleViewChange('new-site')}>
                    Create New Site
                  </button>
                </div>
                <SiteList 
                  onEdit={(site) => {
                    console.log('Edit site:', site);
                    // In a full implementation, you would handle site editing here
                  }}
                  onViewDocuments={(site) => {
                    // Set the selected folder ID and navigate to documents view
                    if (site.folder_type === 'GoogleDrive' && site.folder_link) {
                      // Extract folder ID from Google Drive link
                      const folderIdMatch = site.folder_link.match(/folders\/([^/?]+)/);
                      if (folderIdMatch && folderIdMatch[1]) {
                        handleFolderSelect(folderIdMatch[1]);
                        handleViewChange('documents');
                      }
                    }
                  }}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}
            
            {activeView === 'new-site' && (
              <div className="new-site-view">
                <SiteForm 
                  onSaveComplete={(newSite) => {
                    handleSiteCreated(newSite);
                    // After creating a site, go back to the sites list
                    handleViewChange('sites');
                    // Trigger refresh to show the new site
                    setRefreshTrigger(prev => prev + 1);
                  }} 
                />
              </div>
            )}
            
            {activeView === 'documents' && (
              <div className="documents-view">
                <h2>Document Management</h2>
                
                <div className="folder-selector">
                  <label htmlFor="folder-id">Google Drive Folder ID:</label>
                  <input
                    type="text"
                    id="folder-id"
                    value={selectedFolderId}
                    onChange={(e) => handleFolderSelect(e.target.value)}
                    placeholder="Enter Google Drive folder ID"
                  />
                  <small className="help-text">
                    Enter the folder ID from the Google Drive URL (the part after "folders/" in the URL)
                  </small>
                </div>
                
                {selectedFolderId && (
                  <div className="documents-container">
                    <FileUpload
                      folderId={selectedFolderId}
                      onUploadComplete={handleUploadComplete}
                    />
                    
                    <FileList
                      folderId={selectedFolderId}
                      onRefreshNeeded={refreshTrigger}
                    />
                  </div>
                )}
                
                {!selectedFolderId && (
                  <div className="no-folder-message">
                    <p>Please enter a Google Drive folder ID to manage documents.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeView === 'templates' && (
              <div className="templates-view">
                <div className="templates-header">
                  <h2>Inspection Templates</h2>
                  <button onClick={() => handleViewChange('new-template')}>
                    Create New Template
                  </button>
                </div>
                
                <TemplateList
                  onEdit={handleEditTemplate}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            )}
            
            {activeView === 'new-template' && (
              <div className="new-template-view">
                <TemplateForm
                  onSave={handleTemplateSave}
                  onCancel={() => handleViewChange('templates')}
                />
              </div>
            )}
            
            {activeView === 'edit-template' && editingTemplateId && (
              <div className="edit-template-view">
                <TemplateForm
                  templateId={editingTemplateId}
                  onSave={handleTemplateSave}
                  onCancel={() => {
                    setEditingTemplateId(null);
                    handleViewChange('templates');
                  }}
                />
              </div>
            )}
          </main>
        </div>
      )}
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Admin Portal - Google Drive Integration</p>
      </footer>
    </div>
  );
};

export default App;