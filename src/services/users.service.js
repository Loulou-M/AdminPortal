// users.service.js
// Service for managing users in Google Drive

import { createFile, updateFile, deleteFile, listFiles, getFileContent } from './drive.service';

// Default users folder ID - replace with your actual folder ID for users
const USERS_FOLDER_ID = '11Smh6WbnukXFC_FY1E2j3qvi4cxE2NQM';

/**
 * Get all users
 * @returns {Promise<Array>} Promise that resolves with users array
 */
export const getUsers = async () => {
  try {
    console.log('users.service: Getting all users...');

    const files = await listFiles({
      folderId: USERS_FOLDER_ID,
      query: "mimeType='application/json'"
    });

    const users = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await getFileContent(file.id);
          const user = JSON.parse(content);

          return {
            ...user,
            fileId: file.id,
            fileName: file.name,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime
          };
        } catch (err) {
          console.warn(`users.service: Failed to parse user ${file.name}:`, err);
          return null;
        }
      })
    );

    return users.filter(u => u !== null);
  } catch (error) {
    console.error('users.service: Error fetching users:', error);
    throw error;
  }
};

/**
 * Get a single user by ID
 */
export const getUser = async (userId) => {
  try {
    const content = await getFileContent(userId);
    const user = JSON.parse(content);
    return { ...user, fileId: userId };
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
    const { name, email, role, company} = userData;

    if (!name || !email) throw new Error('Name and email are required');

    const user = {
      name,
      email,
      role: role || 'User',
      company: company ||'',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userContent = JSON.stringify(user, null, 2);
    const fileName = `${name}_${Date.now()}.json`;

    const result = await createFile({
      name: fileName,
      mimeType: 'application/json',
      parents: [USERS_FOLDER_ID],
      content: userContent
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
      updatedAt: new Date().toISOString()
    };

    const { fileId, ...userToSave } = updatedUser;
    const userContent = JSON.stringify(userToSave, null, 2);

    await updateFile({
      fileId: userId,
      content: userContent,
      mimeType: 'application/json'
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