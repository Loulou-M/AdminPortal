// UserList.jsx
// Displays list of users and integrates UserForm

import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../../services/users.service';
import UserForm from './UserForm';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all users
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();

      // Normalize company field (sometimes API may return `companyName`)
      const normalized = (data || []).map(u => ({
        ...u,
        company: u.company || u.companyName || "N/A",
        role: u.role || "N/A",
      }));

      setUsers(normalized);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(`Failed to load users: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddNew = () => {
    setSelectedUserId(null);
    setShowForm(true);
  };

  const handleEdit = (id) => {
    setSelectedUserId(id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(`Failed to delete user: ${err.message || 'Unknown error'}`);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setSelectedUserId(null);
    loadUsers();
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedUserId(null);
  };

  return (
    <div className="user-list-container">
      <style>{`
        .user-list-container {
          padding: 2.5rem;
          background-color: #f8fafc; /* Very soft, light background */
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; /* A more modern font */
        }
        .user-list-container h1 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
          font-size: 2rem;
          color: #1e293b;
          font-weight: 700;
        }
        .error {
          padding: 1rem;
          background-color: #fff1f2;
          border-left: 4px solid #ef4444;
          color: #be123c;
          margin-bottom: 1.5rem;
          border-radius: 6px;
          font-weight: 500;
        }
        .add-button {
          background-color: #1d4ed8; /* A darker, more professional blue */
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 50px; /* Rounded button to match IntegrationTest.css */
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .add-button:hover {
          background-color: #1e40af;
          transform: translateY(-2px);
        }
        .user-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .user-table th,
        .user-table td {
          padding: 1rem 1.25rem; /* Match the padding from IntegrationTest.css */
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.875rem; /* Smaller font size for better data density */
        }
        .user-table th {
          background-color: #eef2ff; /* Light, elegant header background */
          color: #4b5563;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .user-table td {
          background-color: #ffffff;
          color: #374151;
        }
        .user-table tbody tr:nth-child(even) td {
          background-color: #f9fafb; /* Subtle striped effect */
        }
        .user-table tbody tr:last-child td {
          border-bottom: none;
        }
        .user-table tbody tr:hover td {
          background-color: #eff6ff; /* A hover color that fits the blue theme */
        }
        .actions-cell {
          width: 180px; /* Fixed width for actions column */
          text-align: right; /* Right-align the buttons for better UI balance */
        }
        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem; /* Consistent spacing between buttons */
        }
        .action-button {
          padding: 0.5rem 0.8rem;
          border: none;
          border-radius: 50px; /* Match the rounded style from IntegrationTest.css */
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .edit-button {
          background-color: #fef3c7;
          color: #92400e;
        }
        .edit-button:hover {
          background-color: #fde68a;
          transform: translateY(-2px);
        }
        .delete-button {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .delete-button:hover {
          background-color: #fca5a5;
          transform: translateY(-2px);
        }
        .no-users {
          padding: 2rem;
          text-align: center;
          color: #9ca3af;
          background-color: #ffffff;
          border-radius: 8px;
          font-style: italic;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 2rem;
          color: #6b7280;
          font-style: italic;
        }
      `}</style>

      <h1>User Management</h1>

      {error && <p className="error">{error}</p>}

      {showForm ? (
        <UserForm
          userId={selectedUserId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <button onClick={handleAddNew} className="add-button">
            + Add New User
          </button>

          {isLoading ? (
            <p className="loading">Loading users...</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.fileId}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.company}</td>
                      <td>{user.role}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(user.fileId)}
                            className="action-button edit-button"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.fileId)}
                            className="action-button delete-button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-users">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default UserList;