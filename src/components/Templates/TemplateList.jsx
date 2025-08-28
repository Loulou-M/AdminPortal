import React, { useState, useEffect } from 'react';
import { getTemplates, deleteTemplate } from '../../services/templates.service';

const TemplateList = ({ onEdit, onSelect, refreshTrigger }) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('modifiedTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Fetch templates from Google Drive
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsRefreshing(true);

      const fetchedTemplates = await getTemplates();
      setTemplates(Array.isArray(fetchedTemplates) ? fetchedTemplates : []);
      
      // Clear refresh animation after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(`Failed to fetch templates: ${error?.message || 'Unknown error'}`);
      setIsRefreshing(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates by category and search query
  const filteredTemplates = templates.filter((template) => {
    // Filter by category
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (template.name || '').toLowerCase();
      const desc = (template.description || '').toLowerCase();
      const category = (template.category || '').toLowerCase();
      const inQuestions =
        Array.isArray(template.questions) &&
        template.questions.some((q) => (q?.question || '').toLowerCase().includes(query));

      return name.includes(query) || desc.includes(query) || category.includes(query) || inQuestions;
    }

    return true;
  });

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    let valueA = a[sortField];
    let valueB = b[sortField];

    if (sortField === 'name' || sortField === 'category') {
      valueA = (valueA || '').toLowerCase();
      valueB = (valueB || '').toLowerCase();
    } else if (sortField === 'questions') {
      valueA = Array.isArray(a.questions) ? a.questions.length : 0;
      valueB = Array.isArray(b.questions) ? b.questions.length : 0;
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get unique categories
  const categories = [
    'all',
    'Safety Inspections',
    'Quality Inspections',
    'Compliance Inspections',
    'Progress Inspections',
    'Specialised Inspections'
  ];

  // Handle sort change
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle template deletion
  const handleDelete = async (templateId, templateName) => {
    if (!window.confirm(`Are you sure you want to delete "${templateName}"?`)) return;

    try {
      setIsLoading(true);
      await deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.fileId !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      setError(`Failed to delete template: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="template-list">
      <style jsx>{`
        .template-list {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .template-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .template-list-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.6rem;
          font-weight: 600;
        }
        
        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #f8f9fa;
          color: #495057;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .refresh-button:hover {
          background-color: #e9ecef;
          border-color: #dee2e6;
        }
        
        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .refresh-icon {
          animation: ${isRefreshing ? 'spin 1s linear infinite' : 'none'};
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-message {
          background-color: #fff5f5;
          color: #e53e3e;
          border-left: 4px solid #e53e3e;
          border-radius: 4px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .error-message p {
          margin: 0;
        }
        
        .error-message button {
          background: none;
          border: none;
          color: #718096;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        
        .template-filters {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (min-width: 640px) {
          .template-filters {
            flex-direction: row;
            align-items: center;
          }
          
          .search-container {
            flex: 1;
          }
        }
        
        .search-container {
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
          color: #4a5568;
          background-color: #f8fafc;
          transition: all 0.2s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
          background-color: #fff;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0aec0;
          width: 16px;
          height: 16px;
        }
        
        .category-filter {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
        }
        
        .category-filter label {
          font-size: 0.95rem;
          font-weight: 500;
          color: #4a5568;
          white-space: nowrap;
        }
        
        .category-select {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
          color: #4a5568;
          background-color: #f8fafc;
          min-width: 140px;
          cursor: pointer;
        }
        
        .category-select:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
        }
        
        .loading-indicator, .empty-message {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          color: #718096;
          font-size: 1rem;
          text-align: center;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px dashed #e2e8f0;
        }
        
        .templates-table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .templates-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
          min-width: 700px;
        }
        
        .templates-table th {
          background-color: #f8fafc;
          color: #4a5568;
          font-weight: 600;
          text-align: left;
          padding: 14px 16px;
          border-bottom: 2px solid #e2e8f0;
          position: relative;
          transition: background-color 0.2s ease;
        }
        
        .templates-table th.sortable {
          cursor: pointer;
          user-select: none;
        }
        
        .templates-table th.sortable:hover {
          background-color: #edf2f7;
        }
        
        .templates-table th.sorted-asc::after,
        .templates-table th.sorted-desc::after {
          content: "";
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }
        
        .templates-table th.sorted-asc::after {
          border-bottom: 5px solid #4a5568;
          border-top: none;
        }
        
        .templates-table th.sorted-desc::after {
          border-top: 5px solid #4a5568;
          border-bottom: none;
        }
        
        .templates-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #2d3748;
        }
        
        .templates-table tr:last-child td {
          border-bottom: none;
        }
        
        .templates-table tr:hover {
          background-color: #f7fafc;
        }
        
        .template-name {
          font-weight: 500;
          color: #2d3748;
        }
        
        .template-category {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
          background-color: #ebf8ff;
          color: #3182ce;
        }
        
        .template-questions {
          font-size: 0.9rem;
          color: #4a5568;
          font-weight: 600;
          text-align: center;
        }
        
        .template-modified {
          font-size: 0.9rem;
          color: #718096;
          white-space: nowrap;
        }
        
        .template-actions {
          width: 1%;
          white-space: nowrap;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .action-buttons button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          white-space: nowrap;
        }
        
        .edit-button {
          background-color: #ebf4ff;
          color: #4c51bf;
        }
        
        .edit-button:hover {
          background-color: #c3dafe;
        }
        
        .select-button {
          background-color: #e6fffa;
          color: #319795;
        }
        
        .select-button:hover {
          background-color: #b2f5ea;
        }
        
        .delete-button {
          background-color: #fff5f5;
          color: #e53e3e;
        }
        
        .delete-button:hover {
          background-color: #fed7d7;
        }
        
        .category-pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        /* Category color variations */
        .category-safety {
          background-color: #ebf8ff;
          color: #3182ce;
        }
        
        .category-quality {
          background-color: #e6fffa;
          color: #319795;
        }
        
        .category-compliance {
          background-color: #faf5ff;
          color: #6b46c1;
        }
        
        .category-general {
          background-color: #f7fafc;
          color: #4a5568;
        }
        
        .category-uncategorized {
          background-color: #edf2f7;
          color: #718096;
        }
      `}</style>

      <div className="template-list-header">
        <h2>Inspection Templates</h2>
        <button 
          onClick={fetchTemplates} 
          disabled={isLoading} 
          className="refresh-button"
        >
          <span className="refresh-icon">
            {/* Simple refresh icon using unicode */}
            {isRefreshing ? '↻' : '⟳'}
          </span>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="template-filters">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by name, category, or content..."
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <label htmlFor="category-select">Category:</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && templates.length === 0 ? (
        <div className="loading-indicator">
          <p>Loading templates...</p>
        </div>
      ) : sortedTemplates.length === 0 ? (
        <div className="empty-message">
          <p>
            {searchQuery || selectedCategory !== 'all'
              ? 'No templates match your filters. Try changing your search criteria.'
              : 'No templates found. Create your first template to get started!'}
          </p>
        </div>
      ) : (
        <div className="templates-table-container">
          <table className="templates-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className={`sortable ${sortField === 'name' ? `sorted-${sortDirection}` : ''}`}
                >
                  Name
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className={`sortable ${sortField === 'category' ? `sorted-${sortDirection}` : ''}`}
                >
                  Category
                </th>
                <th
                  onClick={() => handleSort('questions')}
                  className={`sortable ${sortField === 'questions' ? `sorted-${sortDirection}` : ''}`}
                >
                  Questions
                </th>
                <th
                  onClick={() => handleSort('modifiedTime')}
                  className={`sortable ${sortField === 'modifiedTime' ? `sorted-${sortDirection}` : ''}`}
                >
                  Last Modified
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTemplates.map((template) => {
                // Determine category class for styling
                const categoryClass = template.category 
                  ? `category-${template.category.toLowerCase().replace(/\s+/g, '-')}` 
                  : 'category-uncategorized';
                
                // Fallback to a known category if custom one doesn't have styling
                const hasCustomCategory = ['safety', 'quality', 'compliance', 'general', 'uncategorized']
                  .includes(template.category?.toLowerCase());
                
                const finalCategoryClass = hasCustomCategory 
                  ? categoryClass 
                  : 'category-general';
                
                return (
                  <tr key={template.fileId}>
                    <td className="template-name">{template.name}</td>
                    <td>
                      <span className={`category-pill ${finalCategoryClass}`}>
                        {template.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="template-questions">
                      {Array.isArray(template.questions) ? template.questions.length : 0}
                    </td>
                    <td className="template-modified">
                      {formatDate(template.modifiedTime || template.updatedAt || template.createdAt)}
                    </td>
                    <td className="template-actions">
                      <div className="action-buttons">
                        {onEdit && (
                          <button onClick={() => onEdit(template.fileId)} className="edit-button">
                            Edit
                          </button>
                        )}

                        {onSelect && (
                          <button onClick={() => onSelect(template)} className="select-button">
                            Select
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(template.fileId, template.name)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (today.getFullYear() === date.getFullYear()) {
    return (
      date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  } else {
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

export default TemplateList;