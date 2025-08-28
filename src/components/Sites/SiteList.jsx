import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { getSites, deleteSite } from '../../services/site.service';
import EditSite from './EditSite';

// Normalize site data from various API formats
function normalizeSite(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || raw.site_id || raw.siteId || '';
  const name = raw.name || raw.site_name || '';
  const location = raw.location || raw.site_location || '';
  const folderLink = raw.folder_link || raw.resource_url || '';
  const folderType = raw.folder_type || raw.storage_type || 'GoogleDrive';

  return {
    __raw: raw, // Keep original for reference
    id,
    site_id: id,
    name,
    location,
    folderLink,
    folderType
  };
}

const SiteList = ({ onViewDocuments, refreshTrigger }) => {
  const [sites, setSites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // State for QR code modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState(null);

  // Load sites
  useEffect(() => {
    loadSites();
  }, [refreshTrigger]);

  const loadSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedSites = await getSites();
      const normalized = Array.isArray(loadedSites) 
        ? loadedSites.map(normalizeSite).filter(Boolean) 
        : [];
      setSites(normalized);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort sites
  const filteredSites = sites.filter((site) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (site.name || '').toLowerCase().includes(q) ||
      (site.location || '').toLowerCase().includes(q) ||
      (site.id || '').toLowerCase().includes(q)
    );
  });

  const sortedSites = [...filteredSites].sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];
    if (typeof va === 'string') {
      va = va.toLowerCase();
      vb = (vb || '').toLowerCase();
    }
    if (va < vb) return sortDirection === 'asc' ? -1 : 1;
    if (va > vb) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort column click
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle delete site
  const handleDelete = async (siteId, siteName) => {
    if (!window.confirm(`Delete "${siteName}"? This cannot be undone.`)) return;
    try {
      setIsLoading(true);
      await deleteSite(siteId);
      setSites((prev) => prev.filter((s) => s.id !== siteId));
    } catch (err) {
      console.error('Error deleting site:', err);
      setError(`Failed to delete site: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening QR modal
  const openQRModal = (site) => {
    setSelectedSite(site);
    setShowQRModal(true);
  };

  // Handle closing QR modal
  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedSite(null);
  };

  // Handle download QR code
  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg || !selectedSite) return;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create an image from the SVG
    const image = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    image.onload = () => {
      // Set canvas dimensions to match the SVG but scaled up for better quality
      canvas.width = image.width * 3;
      canvas.height = image.height * 3;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `${selectedSite.name.replace(/\s+/g, '_') || 'site'}_QR.png`;
      
      // Convert canvas to blob and create URL
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
      });
      
      // Clean up SVG URL
      URL.revokeObjectURL(url);
    };
    
    image.src = url;
  };

  // Handle edit site
  const handleEdit = (site) => {
    setSiteToEdit(site.__raw || site);
    setIsEditing(true);
  };

  // Handle save completion
  const handleSaveComplete = () => {
    setSiteToEdit(null);
    setIsEditing(false);
    loadSites(); // Refresh the list
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setSiteToEdit(null);
    setIsEditing(false);
  };

  // Copy link to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Link copied to clipboard");
    } catch {
      // Silent fail for browsers that block clipboard in HTTP context
    }
  };

  // If in edit mode, show the EditSite component
  if (isEditing && siteToEdit) {
    return (
      <EditSite 
        site={siteToEdit}
        onSave={handleSaveComplete}
        onCancel={handleCancelEdit}
      />
    );
  }

  // Render QR code modal
  const renderQRModal = () => {
    if (!showQRModal || !selectedSite) return null;

    const url = selectedSite.folderLink || '';
    const title = selectedSite.name || 'Unnamed Site';

    return (
      <div className="qr-modal-overlay" onClick={closeQRModal}>
        <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-header">
            <h3>{title} QR Code</h3>
            <button className="close-button" onClick={closeQRModal}>×</button>
          </div>
          
          <div className="qr-modal-content">
            <div className="qr-code-container">
              <QRCode
                id="qr-code-svg"
                value={url}
                size={256}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            <div className="qr-code-info">
              <p><strong>Site:</strong> {title}</p>
              <p><strong>Location:</strong> {selectedSite.location || 'No location specified'}</p>
              <p className="qr-url">
                <strong>URL:</strong> 
                <span className="url-text">{url}</span>
                <button 
                  className="copy-button"
                  onClick={() => handleCopy(url)}
                  title="Copy URL"
                >
                  Copy
                </button>
              </p>
              
              <button 
                className="download-button" 
                onClick={downloadQRCode}
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="site-list">
      <style jsx>{`
        .site-list {
          padding: 20px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .site-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .site-list-header h2 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
        }
        
        .refresh-button, .create-button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .refresh-button {
          background-color: #f7f7f7;
          color: #333;
          border: 1px solid #ddd;
        }
        
        .refresh-button:hover {
          background-color: #eee;
        }
        
        .create-button {
          background-color: #4caf50;
          color: white;
        }
        
        .create-button:hover {
          background-color: #388e3c;
        }
        
        .error-message {
          padding: 12px;
          background-color: #ffeded;
          border-left: 4px solid #ff5252;
          margin-bottom: 20px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .dismiss-button {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          text-decoration: underline;
        }
        
        .site-search {
          margin-bottom: 20px;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .sites-table-container {
          overflow-x: auto;
        }
        
        .sites-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .sites-table th {
          background-color: #f7f7f7;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #eee;
          cursor: pointer;
        }
        
        .sites-table th.sorted-asc::after {
          content: " ▲";
          font-size: 0.7rem;
        }
        
        .sites-table th.sorted-desc::after {
          content: " ▼";
          font-size: 0.7rem;
        }
        
        .sites-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #eee;
        }
        
        .sites-table tr:hover {
          background-color: #f9f9f9;
        }
        
        .site-qr {
          text-align: center;
        }
        
        .site-qr-thumbnail {
          cursor: pointer;
          transition: transform 0.2s;
          border: 1px solid #ddd;
          padding: 4px;
          background: white;
          border-radius: 4px;
          display: inline-block;
        }
        
        .site-qr-thumbnail:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        
        .site-actions {
          white-space: nowrap;
        }
        
        .action-buttons {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        
        .action-buttons button, 
        .action-buttons a {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
          border: none;
          white-space: nowrap;
        }
        
        .view-folder-button {
          background-color: #e3f2fd;
          color: #1565c0;
          text-decoration: none;
        }
        
        .view-folder-button:hover {
          background-color: #bbdefb;
        }
        
        .view-documents-button {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .view-documents-button:hover {
          background-color: #c8e6c9;
        }
        
        .qr-button {
          background-color: #ede7f6;
          color: #5e35b1;
        }
        
        .qr-button:hover {
          background-color: #d1c4e9;
        }
        
        .edit-button {
          background-color: #fff8e1;
          color: #f57f17;
        }
        
        .edit-button:hover {
          background-color: #ffecb3;
        }
        
        .delete-button {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .delete-button:hover {
          background-color: #ffcdd2;
        }
        
        .empty-message, .loading-indicator {
          padding: 40px;
          text-align: center;
          color: #666;
        }
        
        /* QR Modal Styles */
        .qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .qr-modal {
          background-color: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
        }
        
        .qr-modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }
        
        .qr-modal-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        
        @media (min-width: 600px) {
          .qr-modal-content {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        
        .qr-code-container {
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .qr-code-info {
          flex: 1;
        }
        
        .qr-code-info p {
          margin: 10px 0;
        }
        
        .qr-url {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .url-text {
          padding: 8px;
          background-color: #f5f5f5;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
          word-break: break-all;
        }
        
        .copy-button {
          align-self: flex-start;
          padding: 6px 12px;
          background-color: #e0e0e0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .download-button {
          margin-top: 15px;
          padding: 10px 16px;
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        }
        
        .download-button:hover {
          background-color: #388e3c;
        }
      `}</style>

      <div className="site-list-header">
        <h2>Construction Sites</h2>
        <div className="header-actions">
          <button 
            className="refresh-button" 
            onClick={loadSites}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            className="create-button"
            onClick={() => window.location.href = '/site/new'}
          >
            + Create Site
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}

      <div className="site-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sites by name, location, or ID..."
          className="search-input"
        />
      </div>

      {isLoading && sites.length === 0 ? (
        <div className="loading-indicator">
          <p>Loading sites...</p>
        </div>
      ) : sortedSites.length === 0 ? (
        <div className="empty-message">
          <p>
            {searchQuery
              ? 'No sites match your search query.'
              : 'No construction sites found. Create your first site!'}
          </p>
        </div>
      ) : (
        <div className="sites-table-container">
          <table className="sites-table">
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('name')}
                  className={sortField === 'name' ? `sorted-${sortDirection}` : ''}
                >
                  Site Name
                </th>
                <th 
                  onClick={() => handleSort('location')}
                  className={sortField === 'location' ? `sorted-${sortDirection}` : ''}
                >
                  Location
                </th>
                <th>QR Code</th>
                <th 
                  onClick={() => handleSort('folderType')}
                  className={sortField === 'folderType' ? `sorted-${sortDirection}` : ''}
                >
                  Storage Type
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSites.map((site) => (
                <tr key={site.id}>
                  <td>{site.name || '—'}</td>
                  <td>{site.location || '—'}</td>
                  <td className="site-qr">
                    {site.folderLink ? (
                      <div 
                        className="site-qr-thumbnail"
                        onClick={() => openQRModal(site)}
                        title="Click to view and download QR code"
                      >
                        <QRCode
                          value={site.folderLink}
                          size={64}
                          level="M"
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                        />
                      </div>
                    ) : (
                      <span>No link</span>
                    )}
                  </td>
                  <td>{site.folderType}</td>
                  <td className="site-actions">
                    <div className="action-buttons">
                      {site.folderLink && (
                        <a 
                          href={site.folderLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-folder-button"
                        >
                          View Folder
                        </a>
                      )}
                      
                      {onViewDocuments && (
                        <button 
                          onClick={() => onViewDocuments(site)}
                          className="view-documents-button"
                        >
                          Documents
                        </button>
                      )}
                      
                      {site.folderLink && (
                        <button 
                          onClick={() => openQRModal(site)}
                          className="qr-button"
                        >
                          QR Code
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleEdit(site)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(site.id, site.name)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {renderQRModal()}
    </div>
  );
};

// Helper to format date
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (today.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export default SiteList;