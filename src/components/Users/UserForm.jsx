// UserForm.jsx
// User Form Component for Admin Portal

import React, { useState, useEffect } from 'react';
import { createUser, updateUser, getUser } from '../../services/users.service';
import { saveToStorage, loadFromStorage } from '../../utils/storage';

const UserForm = ({ userId, onSave, onCancel }) => {
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role:''
  });

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load user data if editing
  useEffect(() => {
    if (userId) {
      setIsEditing(true);
      loadUser(userId);
    } else {
      // Try to load draft from localStorage
      const savedDraft = loadFromStorage('user_draft');
      if (savedDraft) {
        setFormData(savedDraft);
      }
    }
  }, [userId]);

  // Save draft to localStorage
  useEffect(() => {
    if (!isEditing) {
      saveToStorage('user_draft', formData);
    }
  }, [formData, isEditing]);

  // Load user data
  const loadUser = async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await getUser(id);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        role: user.role || ''
      });
    } catch (error) {
      console.error('Error loading user:', error);
      setError(`Failed to load user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.role.trim()) {
      setError('Role is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      let result;
      if (isEditing) {
        result = await updateUser(userId, formData);
      } else {
        result = await createUser(formData);
        saveToStorage('user_draft', null);
      }

      if (onSave) {
        onSave(result);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError(`Failed to save user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle discard/cancel
  const handleDiscard = () => {
    if (!isEditing) {
      saveToStorage('user_draft', null);
    }
    if (onCancel) {
      onCancel();
    }
  };

  if (isLoading) {
    return (
      <div className="user-form loading">
        <p>Loading user...</p>
      </div>
    );
  }

  return (
    <div className="user-form">
      <h2>{isEditing ? 'Edit User' : 'Create New User'}</h2>

      {error && (
        <div className="form-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="user-name">Name:</label>
          <input
            id="user-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="user-email">Email Address:</label>
          <input
            id="user-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="user-company">Company Name:</label>
          <input
            id="user-company"
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Enter company name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="user-role">Role:</label>
          <select
            id="user-role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Role --</option>
            <option value="supervisor">Supervisor</option>
            <option value="contractor">Contractor</option>
            <option value="inspector">Inspector</option>
            <option value="admin">Admin</option>
          </select>
        </div>


        <div className="form-actions">
          <button
            type="button"
            onClick={handleDiscard}
            className="cancel-button"
            disabled={isSaving}
          >
            {isEditing ? 'Cancel' : 'Discard'}
          </button>

          <button
            type="submit"
            className="save-button"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isEditing ? 'Update User' : 'Save User')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;