import React, { useState, useRef } from 'react';

const TankDeposits = () => {
  const [deposits, setDeposits] = useState([
    {
      id: 1,
      client: 'ABC Construction',
      project: 'Office Renovation',
      tank_type: 'R410A',
      deposit_amount: 5000,
      status: 'Active',
      deposit_date: '2025-06-15',
      return_date: null,
      image: null
    },
    {
      id: 2,
      client: 'XYZ Developers',
      project: 'Warehouse Construction',
      tank_type: 'Nitrogen',
      deposit_amount: 3500,
      status: 'Returned',
      deposit_date: '2025-05-20',
      return_date: '2025-06-20',
      image: null
    },
    {
      id: 3,
      client: 'City Municipal',
      project: 'Road Maintenance',
      tank_type: 'Acetylene',
      deposit_amount: 7500,
      status: 'Active',
      deposit_date: '2025-06-10',
      return_date: null,
      image: null
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    project: '',
    tank_type: '',
    deposit_amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    image: null,
    imagePreview: null
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Filter deposits by status
  const activeDeposits = deposits.filter(d => d.status === 'Active');
  const returnedDeposits = deposits.filter(d => d.status === 'Returned');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const resetForm = () => {
    setFormData({
      client: '',
      project: '',
      tank_type: '',
      deposit_amount: '',
      deposit_date: new Date().toISOString().split('T')[0],
      image: null,
      imagePreview: null
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.client || !formData.project || !formData.tank_type || !formData.deposit_amount) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingDeposit) {
      // Update existing deposit
      const updatedDeposit = {
        ...editingDeposit,
        client: formData.client.trim(),
        project: formData.project.trim(),
        tank_type: formData.tank_type,
        deposit_amount: parseFloat(formData.deposit_amount),
        deposit_date: formData.deposit_date,
        image: formData.imagePreview || editingDeposit.image
      };

      setDeposits(prev => prev.map(d => 
        d.id === editingDeposit.id ? updatedDeposit : d
      ));

      alert('Tank deposit updated successfully!');
      setEditingDeposit(null);
    } else {
      // Create new deposit
      const newDeposit = {
        id: Math.max(...deposits.map(d => d.id), 0) + 1,
        client: formData.client.trim(),
        project: formData.project.trim(),
        tank_type: formData.tank_type,
        deposit_amount: parseFloat(formData.deposit_amount),
        deposit_date: formData.deposit_date,
        status: 'Active',
        return_date: null,
        image: formData.imagePreview
      };

      setDeposits(prev => [...prev, newDeposit]);
      alert('Tank deposit saved successfully!');
    }

    // Reset and close form
    resetForm();
    setShowForm(false);
  };

  const handleCancel = () => {
    resetForm();
    setEditingDeposit(null);
    setShowForm(false);
  };

  // View functionality
  const handleView = (deposit) => {
    setSelectedDeposit(deposit);
    setShowViewModal(true);
  };

  const handleCloseView = () => {
    setShowViewModal(false);
    setSelectedDeposit(null);
  };

  // Edit functionality
  const handleEdit = (deposit) => {
    setEditingDeposit(deposit);
    setFormData({
      client: deposit.client,
      project: deposit.project,
      tank_type: deposit.tank_type,
      deposit_amount: deposit.deposit_amount.toString(),
      deposit_date: deposit.deposit_date,
      image: null,
      imagePreview: deposit.image
    });
    setShowForm(true);
  };

  // Return functionality
  const handleReturn = (deposit) => {
    const confirmReturn = window.confirm(
      `Are you sure you want to mark this tank deposit as returned?\n\nClient: ${deposit.client}\nProject: ${deposit.project}\nTank Type: ${deposit.tank_type}`
    );

    if (confirmReturn) {
      const returnDate = new Date().toISOString().split('T')[0];
      const updatedDeposit = {
        ...deposit,
        status: 'Returned',
        return_date: returnDate
      };

      setDeposits(prev => prev.map(d => 
        d.id === deposit.id ? updatedDeposit : d
      ));

      alert(`Tank deposit marked as returned on ${returnDate}`);
    }
  };

  // Sharing functionality
  const handlePrint = () => {
    if (selectedDeposit) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Tank Deposit - ${selectedDeposit.client}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin-bottom: 20px; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; }
              .image { text-align: center; margin: 20px 0; }
              .image img { max-width: 400px; border: 1px solid #ccc; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Tank Deposit Details</h1>
            </div>
            <div class="details">
              <div class="detail-row"><span class="label">Client:</span> ${selectedDeposit.client}</div>
              <div class="detail-row"><span class="label">Project:</span> ${selectedDeposit.project}</div>
              <div class="detail-row"><span class="label">Tank Type:</span> ${selectedDeposit.tank_type}</div>
              <div class="detail-row"><span class="label">Deposit Amount:</span> $${selectedDeposit.deposit_amount.toLocaleString()}</div>
              <div class="detail-row"><span class="label">Status:</span> ${selectedDeposit.status}</div>
              <div class="detail-row"><span class="label">Deposit Date:</span> ${selectedDeposit.deposit_date}</div>
              ${selectedDeposit.return_date ? `<div class="detail-row"><span class="label">Return Date:</span> ${selectedDeposit.return_date}</div>` : ''}
            </div>
            ${selectedDeposit.image ? `<div class="image"><img src="${selectedDeposit.image}" alt="Tank Image" /></div>` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleEmail = () => {
    if (selectedDeposit) {
      const subject = `Tank Deposit - ${selectedDeposit.client} - ${selectedDeposit.project}`;
      const body = `Tank Deposit Details:
      
Client: ${selectedDeposit.client}
Project: ${selectedDeposit.project}
Tank Type: ${selectedDeposit.tank_type}
Deposit Amount: $${selectedDeposit.deposit_amount.toLocaleString()}
Status: ${selectedDeposit.status}
Deposit Date: ${selectedDeposit.deposit_date}
${selectedDeposit.return_date ? `Return Date: ${selectedDeposit.return_date}` : ''}

${selectedDeposit.image ? 'Tank image is attached to this record.' : 'No image available for this deposit.'}`;

      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }
  };

   const handleText = () => {
    if (selectedDeposit) {
      const message = `Tank Deposit - ${selectedDeposit.client}: ${selectedDeposit.tank_type} tank, $${selectedDeposit.deposit_amount.toLocaleString()} deposit for ${selectedDeposit.project}. Status: ${selectedDeposit.status}. Date: ${selectedDeposit.deposit_date}`;
      
      // Try to use Web Share API if available
      if (navigator.share) {
        navigator.share({
          title: 'Tank Deposit Details',
          text: message
        }).catch(console.error);
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(message).then(() => {
          alert('Tank deposit details copied to clipboard! You can now paste it into a text message.');
        }).catch(() => {
          alert('Unable to copy to clipboard. Please copy the details manually.');
        });
      }
    }
  };

  const exportToPDF = async (deposit) => {
    try {
      // Create a formatted tank deposit report
      const reportData = {
        title: `Tank Deposit Report - ${deposit.client}`,
        deposit: deposit,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };

      // Send to backend for PDF generation
      const response = await fetch('http://localhost:5000/api/tank-deposits/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tank-deposit-${deposit.client.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Render table component
  const renderTable = (depositsData, title) => (
    <div style={styles.sectionContainer}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Client</th>
              <th style={styles.th}>Project</th>
              <th style={styles.th}>Tank Type</th>
              <th style={styles.th}>Deposit Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Deposit Date</th>
              <th style={styles.th}>Return Date</th>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {depositsData.length === 0 ? (
              <tr>
                <td colSpan="9" style={styles.emptyMessage}>
                  No {title.toLowerCase()} found
                </td>
              </tr>
            ) : (
              depositsData.map(deposit => (
                <tr key={deposit.id} style={styles.tableRow}>
                  <td style={styles.td}>{deposit.client}</td>
                  <td style={styles.td}>{deposit.project}</td>
                  <td style={styles.td}>{deposit.tank_type}</td>
                  <td style={styles.td}>${deposit.deposit_amount?.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: deposit.status === 'Returned' ? '#dcfce7' : '#fef3c7',
                      color: deposit.status === 'Returned' ? '#166534' : '#92400e'
                    }}>
                      {deposit.status}
                    </span>
                  </td>
                  <td style={styles.td}>{deposit.deposit_date}</td>
                  <td style={styles.td}>{deposit.return_date || '-'}</td>
                  <td style={styles.td}>
                    {deposit.image ? (
                      <img 
                        src={deposit.image} 
                        alt="Tank" 
                        style={styles.thumbnailImage}
                        onClick={() => window.open(deposit.image, '_blank')}
                      />
                    ) : (
                      <span style={styles.noImage}>No image</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button 
                      style={styles.actionButton}
                      onClick={() => handleView(deposit)}
                    >
                      View
                    </button>
                    <button 
                      style={styles.actionButton}
                      onClick={() => handleEdit(deposit)}
                    >
                      Edit
                    </button>
                    {deposit.status === 'Active' && (
                      <button 
                        style={{...styles.actionButton, backgroundColor: '#fef2f2', color: '#dc2626'}}
                        onClick={() => handleReturn(deposit)}
                      >
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Tank Deposits</h1>
        <button 
          style={styles.addButton}
          onClick={() => setShowForm(true)}
        >
          + New Deposit
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingDeposit ? 'Edit Tank Deposit' : 'New Tank Deposit'}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={handleCancel}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Client Name *</label>
                <input
                  type="text"
                  name="client"
                  value={formData.client}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter client name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Project Name *</label>
                <input
                  type="text"
                  name="project"
                  value={formData.project}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter project name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tank Type *</label>
                <select
                  name="tank_type"
                  value={formData.tank_type}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                >
                  <option value="">Select tank type</option>
                  <option value="Acetylene">Acetylene</option>
                  <option value="Nitrogen">Nitrogen</option>
                  <option value="R410A">R410A</option>
                  <option value="R454B">R454B</option>
                  <option value="R32">R32</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit Amount *</label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit Date *</label>
                <input
                  type="date"
                  name="deposit_date"
                  value={formData.deposit_date}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              {/* Image/Camera Section */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Tank Image (Optional)</label>
                <div style={styles.imageSection}>
                  <div style={styles.imageButtons}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={styles.imageButton}
                    >
                      📁 Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      style={styles.imageButton}
                    >
                      📷 Take Picture
                    </button>
                    {formData.imagePreview && (
                      <button
                        type="button"
                        onClick={removeImage}
                        style={styles.removeImageButton}
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={styles.hiddenInput}
                  />

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    style={styles.hiddenInput}
                  />

                  {formData.imagePreview && (
                    <div style={styles.imagePreview}>
                      <img
                        src={formData.imagePreview}
                        alt="Tank preview"
                        style={styles.previewImage}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formButtons}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  {editingDeposit ? 'Update Deposit' : 'Save Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedDeposit && (
        <div style={styles.modalOverlay}>
          <div style={styles.viewModal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Tank Deposit Details</h2>
              <button 
                style={styles.closeButton}
                onClick={handleCloseView}
              >
                ✕
              </button>
            </div>

            <div style={styles.viewContent}>
              <div style={styles.detailsSection}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Client:</span>
                  <span style={styles.detailValue}>{selectedDeposit.client}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Project:</span>
                  <span style={styles.detailValue}>{selectedDeposit.project}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Tank Type:</span>
                  <span style={styles.detailValue}>{selectedDeposit.tank_type}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Deposit Amount:</span>
                  <span style={styles.detailValue}>${selectedDeposit.deposit_amount.toLocaleString()}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={{
                    ...styles.detailValue,
                    ...styles.statusBadge,
                    backgroundColor: selectedDeposit.status === 'Returned' ? '#dcfce7' : '#fef3c7',
                    color: selectedDeposit.status === 'Returned' ? '#166534' : '#92400e'
                  }}>
                    {selectedDeposit.status}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Deposit Date:</span>
                  <span style={styles.detailValue}>{selectedDeposit.deposit_date}</span>
                </div>
                {selectedDeposit.return_date && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Return Date:</span>
                    <span style={styles.detailValue}>{selectedDeposit.return_date}</span>
                  </div>
                )}
              </div>

              {selectedDeposit.image && (
                <div style={styles.imageViewSection}>
                  <h3 style={styles.imageTitle}>Tank Image</h3>
                  <img
                    src={selectedDeposit.image}
                    alt="Tank"
                    style={styles.viewImage}
                  />
                </div>
              )}

              <div style={styles.shareSection}>
                <h3 style={styles.shareTitle}>Share Options</h3>
                <div style={styles.shareButtons}>
                  <button
                    onClick={() => exportToPDF(selectedDeposit)}
                    style={styles.shareButton}
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    style={styles.shareButton}
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={handleEmail}
                    style={styles.shareButton}
                  >
                    📧 Email
                  </button>
                  <button
                    onClick={handleText}
                    style={styles.shareButton}
                  >
                    💬 Text
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Deposits</h3>
          <div style={styles.statNumber}>{deposits.length}</div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Active</h3>
          <div style={styles.statNumber}>{activeDeposits.length}</div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Returned</h3>
          <div style={styles.statNumber}>{returnedDeposits.length}</div>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statTitle}>Total Value</h3>
          <div style={styles.statNumber}>
            ${activeDeposits.reduce((sum, d) => sum + (d.deposit_amount || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Active Deposits Section */}
      {renderTable(activeDeposits, 'Active Deposits')}

      {/* Returned Deposits Section */}
      {renderTable(returnedDeposits, 'Returned Deposits')}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  addButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  sectionContainer: {
    marginBottom: '48px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
    paddingLeft: '4px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  viewModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 0 24px',
    marginBottom: '24px'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px'
  },
  form: {
    padding: '0 24px 24px 24px'
  },
  viewContent: {
    padding: '0 24px 24px 24px'
  },
  detailsSection: {
    marginBottom: '24px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '140px'
  },
  detailValue: {
    color: '#64748b',
    textAlign: 'right'
  },
  imageViewSection: {
    marginBottom: '24px',
    textAlign: 'center'
  },
  imageTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px'
  },
  viewImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  shareSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '24px'
  },
  shareTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px'
  },
  shareButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  shareButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box'
  },
  imageSection: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  imageButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  imageButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  removeImageButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  hiddenInput: {
    display: 'none'
  },
  imagePreview: {
    marginTop: '16px'
  },
  previewImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  formButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '32px'
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },
  statTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e2e8f0'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '16px',
    color: '#64748b'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: '32px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: '8px'
  },
  thumbnailImage: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0'
  },
  noImage: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic'
  }
};

export default TankDeposits;

