# Google Drive Integration for Admin Portal

This project provides a complete frontend implementation for integrating Google Drive with an Admin Portal. It's designed as a modular, reusable set of components that you can easily incorporate into your existing Splunk-based Admin Portal.

## Overview

The implementation includes:

1. **Google Authentication**: Complete OAuth flow for Google Drive access
2. **File Management**: Upload, list, view, update, and delete files in Google Drive
3. **Template Management**: Create and manage inspection templates stored as JSON files
4. **Site Creation with QR Codes**: Generate QR codes that link to Google Drive folders
5. **Local Storage**: Persistent state to avoid re-entering information

## Project Structure

```
google-drive-integration/
├── src/
│   ├── services/
│   │   ├── auth.service.js       # Google authentication
│   │   ├── drive.service.js      # Google Drive operations
│   │   └── templates.service.js  # Template management
│   ├── components/
│   │   ├── Auth/
│   │   │   └── GoogleAuth.jsx    # Login component
│   │   ├── Sites/
│   │   │   └── SiteForm.jsx      # Create site with QR
│   │   ├── Files/
│   │   │   ├── FileUpload.jsx    # Upload documents
│   │   │   └── FileList.jsx      # List documents
│   │   ├── Templates/
│   │   │   ├── TemplateForm.jsx  # Create templates
│   │   │   └── TemplateList.jsx  # List templates
│   │   └── App.jsx               # Main application component
│   └── utils/
│       └── storage.js            # LocalStorage helpers
└── README.md
```

## Implementation Guide

### 1. Set Up Google Cloud Project

Before using this code, you need to set up a Google Cloud Project with Drive API access:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials (Web Application type)
5. Configure authorized JavaScript origins and redirect URIs
6. Note your Client ID and API Key

### 2. Configure API Keys

Replace the placeholder values in `auth.service.js`:

```javascript
const CONFIG = {
  API_KEY: 'YOUR_API_KEY',
  CLIENT_ID: 'YOUR_CLIENT_ID',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
};
```

### 3. Set Up Templates Folder

For the templates service, create a folder in Google Drive to store templates and update the `TEMPLATES_FOLDER_ID` in `templates.service.js`:

```javascript
const TEMPLATES_FOLDER_ID = 'YOUR_TEMPLATES_FOLDER_ID';
```

### 4. Backend Integration for QR Code Generation

The `SiteForm.jsx` component currently uses a mock function to generate QR codes. In a real implementation, you should update the `generateQRCode` function to call your Flask backend API:

```javascript
const generateQRCode = async (siteData) => {
  const response = await fetch('/api/generate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(siteData)
  });
  
  if (!response.ok) throw new Error('QR generation failed');
  return await response.json();
};
```

### 5. Splunk Integration

To integrate with Splunk for storing metadata, you'll need to implement API calls to your Splunk backend. The current components are designed to work with such backend services, but the actual implementation will depend on your specific Splunk setup.

## Component Usage

### Authentication

```jsx
import GoogleAuth from './components/Auth/GoogleAuth';

// In your component
<GoogleAuth onAuthChange={(isSignedIn, userInfo) => {
  // Handle auth state change
}} />
```

### File Upload

```jsx
import FileUpload from './components/Files/FileUpload';

// In your component
<FileUpload 
  folderId="YOUR_GOOGLE_DRIVE_FOLDER_ID" 
  onUploadComplete={(fileData) => {
    // Handle upload completion
  }} 
/>
```

### File List

```jsx
import FileList from './components/Files/FileList';

// In your component
<FileList 
  folderId="YOUR_GOOGLE_DRIVE_FOLDER_ID" 
  onFileSelect={(file) => {
    // Handle file selection
  }}
  onRefreshNeeded={refreshTrigger} 
/>
```

### Template Form

```jsx
import TemplateForm from './components/Templates/TemplateForm';

// For new template
<TemplateForm 
  onSave={(templateData) => {
    // Handle template save
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>

// For editing existing template
<TemplateForm 
  templateId="EXISTING_TEMPLATE_ID"
  onSave={(templateData) => {
    // Handle template save
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>
```

### Template List

```jsx
import TemplateList from './components/Templates/TemplateList';

// In your component
<TemplateList 
  onEdit={(templateId) => {
    // Handle edit request
  }}
  onSelect={(template) => {
    // Handle selection
  }}
  refreshTrigger={refreshTrigger} 
/>
```

### Site List

```jsx
import SiteList from './components/Sites/SiteList';

// In your component
<SiteList 
  onEdit={(site) => {
    // Handle site edit request
  }}
  onViewDocuments={(site) => {
    // Handle documents view request
  }}
  refreshTrigger={refreshTrigger} 
/>
```

### Site Form with QR Code

```jsx
import SiteForm from './components/Sites/SiteForm';

// In your component
<SiteForm 
  onSaveComplete={(siteData) => {
    // Handle site creation completion
  }} 
/>
```

## Complete Application

The `App.jsx` component demonstrates how to integrate all these components into a complete application. You can use it as a reference for incorporating these components into your existing Splunk-based Admin Portal.

## Security Considerations

1. This implementation is designed for internal use only
2. OAuth client ID and API key are exposed in the frontend code
3. The Google Drive API scope is limited to files created by the app for security
4. For a production environment, consider implementing additional security measures

## Dependencies

This code relies on:
- React for UI components
- Google API client library (loaded via script tag)
- Modern browser with localStorage support

## License

This code is provided for internal use as a proof of concept.