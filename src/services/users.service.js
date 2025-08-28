// users.service.js
// Service for managing users in Google Drive

import { createFile, updateFile, deleteFile, listFiles, getFileContent } from './drive.service';

// Default users folder ID - replace with your actual folder ID for users
const USERS_FOLDER_ID = '11Smh6WbnukXFC_FY1E2j3qvi4cxE2NQM';

// ---------------- helpers ----------------

function stripBOM(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/^\uFEFF/, '');
}

function extractJsonFromGarbage(str) {
  // Try to salvage JSON between the first '{' and the last '}'
  if (typeof str !== 'string') return null;
  const first = str.indexOf('{');
  const last = str.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return str.slice(first, last + 1);
}

function tryParseJson(maybeJson) {
  if (maybeJson == null) return null;
  if (typeof maybeJson !== 'string') return null;

  const cleaned = stripBOM(maybeJson).trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract a JSON object if there is stray text
    const salvage = extractJsonFromGarbage(cleaned);
    if (salvage) {
      try {
        return JSON.parse(salvage);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function preview(val, n = 120) {
  try {
    if (typeof val === 'string') return JSON.stringify(val.slice(0, n));
    return JSON.stringify(val).slice(0, n);
  } catch {
    return String(val).slice(0, n);
  }
}

// ---------------- API ----------------

/**
 * Get all users
 * @returns {Promise<Array>} Promise that resolves with users array
 */
export const getUsers = async () => {
  try {
    console.log('users.service: Getting all users...');

    const files = await listFiles({
      folderId: USERS_FOLDER_ID,
      query: "mimeType='application/json'",
    });

    if (!Array.isArray(files)) {
      console.warn('users.service: listFiles returned non-array:', files);
      return [];
    }

    const users = await Promise.all(
      files.map(async (file) => {
        try {
          const raw = await getFileContent(file.id);

          // Normalize content coming back as string or object
          let text = '';
          if (typeof raw === 'string') {
            text = raw;
          } else if (raw && typeof raw.content === 'string') {
            text = raw.content;
          } else {
            // Unexpected type; stringify for debug and skip
            console.warn(`users.service: Unexpected content type for ${file.name}:`, preview(raw));
            return null;
          }

          console.log(`users.service: Sample of ${file.name}:`, preview(text, 80));

          if (!text || !text.trim()) {
            console.warn(`users.service: ${file.name} is empty. Skipping.`);
            return null;
          }

          const userObj = tryParseJson(text);
          if (!userObj || typeof userObj !== 'object') {
            console.warn(`users.service: Could not parse JSON from ${file.name}. Skipping.`);
            return null;
          }

          return {
            ...userObj,
            fileId: file.id,
            fileName: file.name,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
          };
        } catch (err) {
          console.warn(`users.service: Failed to parse user ${file.name}:`, err);
          return null;
        }
      })
    );

    return users.filter(Boolean);
  } catch (error) {
    console.error('users.service: Error fetching users:', error);
    throw error;
  }
};

/**
 * Get a single user by Drive file ID
 */
export const getUser = async (userId) => {
  try {
    const raw = await getFileContent(userId);

    let text = '';
    if (typeof raw === 'string') text = raw;
    else if (raw && typeof raw.content === 'string') text = raw.content;

    if (!text || !text.trim()) {
      throw new Error('Empty user file content');
    }

    const userObj = tryParseJson(text);
    if (!userObj) throw new Error('Invalid JSON in user file');

    return { ...userObj, fileId: userId };
  } catch (error) {
    console.error(`users.service: Error fetching user ${userId}:`, error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData) => {
  try {
    const { name, email, role, company } = userData;
    if (!name || !email) throw new Error('Name and email are required');

    const user = {
      name,
      email,
      role: role || 'User',
      company: company || '',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userContent = JSON.stringify(user, null, 2);
    const fileName = `${name}_${Date.now()}.json`;

    const result = await createFile({
      name: fileName,
      mimeType: 'application/json',
      parents: [USERS_FOLDER_ID],
      content: userContent,
    });

    return { ...user, fileId: result.id, fileName: result.name };
  } catch (error) {
    console.error('users.service: Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user
 */
export const updateUser = async (userId, userData) => {
  try {
    const existingUser = await getUser(userId);

    const updatedUser = {
      ...existingUser,
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    const { fileId, ...userToSave } = updatedUser;
    const userContent = JSON.stringify(userToSave, null, 2);

    await updateFile({
      fileId: userId,
      content: userContent,
      mimeType: 'application/json',
    });

    return updatedUser;
  } catch (error) {
    console.error(`users.service: Error updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId) => {
  try {
    return await deleteFile(userId);
  } catch (error) {
    console.error(`users.service: Error deleting user ${userId}:`, error);
    throw error;
  }
};
