// src/services/site.service.js
// Real backend QR generation (Flask @ :5000), Drive via user's OAuth token

import { loadFromStorage, saveToStorage } from '../utils/storage';
import { getAccessToken } from './auth.service'; // <-- make sure this path matches your project

// Configurable API base (CRA/Vite-safe):
// Priority: REACT_APP_API_BASE -> window.__API_BASE__ -> localhost:5000
let API_BASE =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_API_BASE) ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:5000';

export const setApiBase = (url) => {
  if (typeof url === 'string' && url.trim()) API_BASE = url.trim();
};
export const getApiBase = () => API_BASE;

const SITES_STORAGE_KEY = 'saved_sites';

export const getSites = async () => {
  return loadFromStorage(SITES_STORAGE_KEY, []);
};

export const createSite = async (siteData) => {
  if (!siteData?.name?.trim()) throw new Error('Site name is required');
  if (!siteData?.location?.trim()) throw new Error('Site location is required');
  if (!siteData?.folder_link?.trim()) throw new Error('Folder link is required');

  const token = getAccessToken();
  if (!token) throw new Error('Not signed in to Google');

  const payload = {
    site_name: siteData.name,
    site_location: siteData.location,
    address: siteData.site_id || siteData.name,
    resource_url: siteData.folder_link,
    // Optional:
    // drive_qr_folder_id: siteData.drive_qr_folder_id,
    // make_public: true, // if you want anyone-with-link
  };

  const res = await fetch(`${API_BASE}/generate_qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Send the user's OAuth token to backend (no service account!)
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let reason = `QR generation failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) reason = err.error;
    } catch (_) {}
    throw new Error(reason);
  }

  const data = await res.json();

  const newSite = {
    ...siteData,
    site_id: siteData.site_id || generateSiteId(siteData.name),
    qr_url: data.qr_png_download_link || data.qr_png_view_link,
    qr_id: data.qr_id,
    created_at: new Date().toISOString(),
  };

  const storedSites = loadFromStorage(SITES_STORAGE_KEY, []);
  saveToStorage(SITES_STORAGE_KEY, [newSite, ...storedSites]);

  return newSite;
};

export const updateSite = async (siteId, siteData) => {
  const storedSites = loadFromStorage(SITES_STORAGE_KEY, []);
  const idx = storedSites.findIndex((s) => s.site_id === siteId);
  if (idx === -1) throw new Error(`Site with ID ${siteId} not found`);

  const updatedSite = {
    ...storedSites[idx],
    ...siteData,
    updated_at: new Date().toISOString(),
  };

  storedSites[idx] = updatedSite;
  saveToStorage(SITES_STORAGE_KEY, storedSites);
  return updatedSite;
};

export const deleteSite = async (siteId) => {
  const storedSites = loadFromStorage(SITES_STORAGE_KEY, []);
  const updated = storedSites.filter((s) => s.site_id !== siteId);
  saveToStorage(SITES_STORAGE_KEY, updated);
  return true;
};

function generateSiteId(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 20) +
    '_' +
    Date.now().toString().substring(7)
  );
}
