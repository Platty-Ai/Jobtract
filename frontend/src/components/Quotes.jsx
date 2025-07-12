import React, { useState, useEffect, useCallback } from 'react';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    client_address: '',
    phone: '',
    email: '',
    description: '',
    amount: '',
    status: 'Pending',
    quote_date: new Date().toISOString().split('T')[0],
    created_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0, hasGST: false, hasPST: false }],
    notes: '',
    photos: []
  });

  // FIXED: Helper function to get auth headers with correct token key
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken'); // FIXED: Changed from 'token' to 'authToken'
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  // FIXED: Wrapped loadQuotes in useCallback to prevent infinite loops
  const loadQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // FIXED: Added Authorization header
      const response = await fetch('http://localhost:5000/api/quotes', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
      } else {
        throw new Error('Failed to load quotes');
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // FIXED: Added loadQuotes to dependency array
  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const getCurrentGSTTotal = () => {
    return (formData.line_items || []).reduce((sum, item) => {
      if (item.hasGST) {
        const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        return sum + (subtotal * 0.05);
      }
      return sum;
    }, 0);
  };

  const getCurrentPSTTotal = () => {
    return (formData.line_items || []).reduce((sum, item) => {
      if (item.hasPST) {
        const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        return sum + (subtotal * 0.07);
      }
      return sum;
    }, 0);
  };

  const getCurrentSubtotal = () => {
    return (formData.line_items || []).reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const quoteData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        line_items: formData.line_items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          total: (parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)
        }))
      };

      if (editingItem) {
        // FIXED: Added Authorization header for PUT request
        const response = await fetch(`http://localhost:5000/api/quotes/${editingItem.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(quoteData)
        });
        if (!response.ok) throw new Error('Failed to update quote');
      } else {
        // FIXED: Added Authorization header for POST request
        const response = await fetch('http://localhost:5000/api/quotes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(quoteData)
        });
        if (!response.ok) throw new Error('Failed to create quote');
      }

      await loadQuotes();
      resetForm();
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Failed to save quote. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      client: '',
      client_address: '',
      phone: '',
      email: '',
      description: '',
      amount: '',
      status: 'Pending',
      quote_date: new Date().toISOString().split('T')[0],
      created_date: new Date().toISOString().split('T')[0],
      valid_until: '',
      line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0, hasGST: false, hasPST: false }],
      notes: '',
      photos: []
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      client: item.client || '',
      client_address: item.client_address || '',
      phone: item.phone || '',
      email: item.email || '',
      description: item.description || '',
      amount: item.amount || '',
      status: item.status || 'Pending',
      quote_date: item.quote_date || new Date().toISOString().split('T')[0],
      created_date: item.created_date || '',
      valid_until: item.valid_until || '',
      line_items: item.line_items || [{ description: '', quantity: 1, unit_price: 0, total: 0, hasGST: false, hasPST: false }],
      notes: item.notes || '',
      photos: item.photos || []
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      try {
        // FIXED: Added Authorization header for DELETE request
        const response = await fetch(`http://localhost:5000/api/quotes/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete quote');
        await loadQuotes();
      } catch (error) {
        console.error('Error deleting quote:', error);
        alert('Failed to delete quote. Please try again.');
      }
    }
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, total: 0, hasGST: false, hasPST: false }]
    });
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = formData.line_items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total = (parseFloat(updatedItem.quantity) || 0) * (parseFloat(updatedItem.unit_price) || 0);
        }
        return updatedItem;
      }
      return item;
    });
    setFormData({ ...formData, line_items: updatedItems });
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length > 1) {
      setFormData({
        ...formData,
        line_items: formData.line_items.filter((_, i) => i !== index)
      });
    }
  };

  const calculateTotal = () => {
    const subtotal = getCurrentSubtotal();
    const gstTotal = getCurrentGSTTotal();
    const pstTotal = getCurrentPSTTotal();
    return subtotal + gstTotal + pstTotal;
  };

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = files.map(file => ({
        file: file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type
      }));

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }
  };

  // Remove photo
  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading quotes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2>Error Loading Quotes</h2>
          <p>{error}</p>
          <button onClick={loadQuotes} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Quotes</h1>
        <button 
          style={styles.addButton}
          onClick={() => setShowAddForm(true)}
        >
          + New Quote
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Quotes</h3>
          <div style={styles.statNumber}>{quotes.length}</div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Pending</h3>
          <div style={styles.statNumber}>
            {quotes.filter(q => q.status === 'Pending').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Approved</h3>
          <div style={styles.statNumber}>
            {quotes.filter(q => q.status === 'Approved').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Value</h3>
          <div style={styles.statNumber}>
            ${quotes.reduce((sum, q) => sum + (q.amount || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Client</th>
              <th style={styles.th}>Project</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Valid Until</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(quote => (
              <tr key={quote.id} style={styles.tableRow}>
                <td style={styles.td}>{quote.client}</td>
                <td style={styles.td}>{quote.project}</td>
                <td style={styles.td}>${quote.amount?.toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: quote.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                    color: quote.status === 'Approved' ? '#166534' : '#92400e'
                  }}>
                    {quote.status}
                  </span>
                </td>
                <td style={styles.td}>{quote.created_date}</td>
                <td style={styles.td}>{quote.valid_until}</td>
                <td style={styles.td}>
                  <button 
                    style={styles.actionButton}
                    onClick={() => setViewingItem(quote)}
                  >
                    View
                  </button>
                  <button 
                    style={styles.actionButton}
                    onClick={() => startEdit(quote)}
                  >
                    Edit
                  </button>
                  <button 
                    style={{...styles.actionButton, backgroundColor: '#ef4444', color: 'white'}}
                    onClick={() => handleDelete(quote.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingItem ? 'Edit Quote' : 'Add New Quote'}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Quote Date *</label>
                  <input
                    type="date"
                    value={formData.quote_date}
                    onChange={(e) => setFormData({...formData, quote_date: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Client *</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Client Address *</label>
                  <input
                    type="text"
                    value={formData.client_address}
                    onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    style={styles.input}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={styles.input}
                    placeholder="client@example.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    style={styles.input}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Valid Until</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{...styles.input, height: '80px', resize: 'vertical'}}
                  rows="3"
                />
              </div>

              {/* Line Items Section */}
              <div style={styles.lineItemsSection}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    style={styles.addLineItemButton}
                  >
                    + Add Item
                  </button>
                </div>

                {formData.line_items.map((item, index) => (
                  <div key={index} style={styles.lineItem}>
                    <div style={styles.lineItemGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          style={styles.input}
                          placeholder="Item description"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          style={styles.input}
                          min="1"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Unit Price</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          style={styles.input}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Total</label>
                        <input
                          type="text"
                          value={`$${item.total.toFixed(2)}`}
                          style={{...styles.input, backgroundColor: '#f3f4f6'}}
                          readOnly
                        />
                      </div>
                    </div>

                    <div style={styles.taxCheckboxes}>
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={item.hasGST}
                          onChange={(e) => updateLineItem(index, 'hasGST', e.target.checked)}
                        />
                        GST (5%)
                      </label>
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={item.hasPST}
                          onChange={(e) => updateLineItem(index, 'hasPST', e.target.checked)}
                        />
                        PST (7%)
                      </label>
                      {formData.line_items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          style={styles.removeItemButton}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Totals Summary */}
                <div style={styles.totalsSection}>
                  <div style={styles.totalRow}>
                    <span>Subtotal:</span>
                    <span>${getCurrentSubtotal().toFixed(2)}</span>
                  </div>
                  <div style={styles.totalRow}>
                    <span>GST (5%):</span>
                    <span>${getCurrentGSTTotal().toFixed(2)}</span>
                  </div>
                  <div style={styles.totalRow}>
                    <span>PST (7%):</span>
                    <span>${getCurrentPSTTotal().toFixed(2)}</span>
                  </div>
                  <div style={{...styles.totalRow, ...styles.grandTotal}}>
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  style={{...styles.input, height: '100px', resize: 'vertical'}}
                  placeholder="Additional notes or terms..."
                  rows="4"
                />
              </div>

              {/* Photos Section */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Photos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={styles.fileInput}
                />
                
                {formData.photos.length > 0 && (
                  <div style={styles.photoGrid}>
                    {formData.photos.map((photo, index) => (
                      <div key={index} style={styles.photoItem}>
                        <img 
                          src={photo.url} 
                          alt={`Quote attachment ${index + 1}`}
                          style={styles.photoPreview}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          style={styles.removePhotoButton}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  {editingItem ? 'Update Quote' : 'Create Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {viewingItem && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Quote Details</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setViewingItem(null)}
              >
                ×
              </button>
            </div>

            <div style={styles.viewContent}>
              <div style={styles.viewGrid}>
                <div style={styles.viewField}>
                  <label>Client:</label>
                  <span>{viewingItem.client}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Address:</label>
                  <span>{viewingItem.client_address}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Phone:</label>
                  <span>{viewingItem.phone}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Email:</label>
                  <span>{viewingItem.email}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Quote Date:</label>
                  <span>{viewingItem.quote_date}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Valid Until:</label>
                  <span>{viewingItem.valid_until}</span>
                </div>
                <div style={styles.viewField}>
                  <label>Status:</label>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: viewingItem.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                    color: viewingItem.status === 'Approved' ? '#166534' : '#92400e'
                  }}>
                    {viewingItem.status}
                  </span>
                </div>
              </div>

              {viewingItem.description && (
                <div style={styles.viewField}>
                  <label>Description:</label>
                  <p>{viewingItem.description}</p>
                </div>
              )}

              {viewingItem.line_items && viewingItem.line_items.length > 0 && (
                <div style={styles.lineItemsView}>
                  <h4>Line Items:</h4>
                  <table style={styles.lineItemsTable}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>GST</th>
                        <th>PST</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingItem.line_items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>${item.unit_price?.toFixed(2)}</td>
                          <td>{item.hasGST ? '✓' : '—'}</td>
                          <td>{item.hasPST ? '✓' : '—'}</td>
                          <td>${item.total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewingItem.notes && (
                <div style={styles.viewField}>
                  <label>Notes:</label>
                  <p>{viewingItem.notes}</p>
                </div>
              )}

              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div style={styles.viewField}>
                  <label>Photos:</label>
                  <div style={styles.photoGrid}>
                    {viewingItem.photos.map((photo, index) => (
                      <img 
                        key={index}
                        src={photo.url} 
                        alt={`Quote attachment ${index + 1}`}
                        style={styles.photoPreview}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.viewActions}>
              <button
                onClick={() => {
                  setViewingItem(null);
                  startEdit(viewingItem);
                }}
                style={styles.editButton}
              >
                Edit Quote
              </button>
              <button
                onClick={() => setViewingItem(null)}
                style={styles.closeViewButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles object
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  addButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f9fafb'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1f2937'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px',
    transition: 'background-color 0.2s'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#ef4444',
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '16px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1
  },
  form: {
    padding: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    backgroundColor: 'white'
  },
  lineItemsSection: {
    marginBottom: '24px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  addLineItemButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  lineItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: '#f9fafb'
  },
  lineItemGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: '12px',
    marginBottom: '12px'
  },
  taxCheckboxes: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151'
  },
  removeItemButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  totalsSection: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '16px',
    marginTop: '16px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: '14px',
    color: '#374151'
  },
  grandTotal: {
    borderTop: '1px solid #e5e7eb',
    marginTop: '8px',
    paddingTop: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  fileInput: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  photoItem: {
    position: 'relative'
  },
  photoPreview: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  removePhotoButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  viewContent: {
    padding: '24px'
  },
  viewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  viewField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  lineItemsView: {
    marginBottom: '24px'
  },
  lineItemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  viewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  closeViewButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default Quotes;

