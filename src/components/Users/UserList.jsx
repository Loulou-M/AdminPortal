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
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .user-list-container h1 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .error {
          padding: 12px;
          background-color: #ffeded;
          border-left: 4px solid #ff5252;
          margin-bottom: 20px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .add-button {
          background-color: #4caf50;
          color: white;
        }
        .add-button:hover {
          background-color: #388e3c;
        }
        .user-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
        }
        .user-table th, 
        .user-table td {
          background-color: #f7f7f7;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #eee;
          cursor: pointer;
        }
        .user-table tr:hover {
          background-color: #f9f9f9;
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
            <p>Loading users...</p>
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
                      <td>
                        <button
                          onClick={() => handleEdit(user.fileId)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.fileId)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No users found.</td>
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