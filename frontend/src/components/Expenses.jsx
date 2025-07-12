import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, DollarSign, Eye, FileText, Mail } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../lib/apiConfig';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    date: '',
    vendor: '',
    receiptNumber: '',
    category: '',
    description: '',
    notes: '',
    amount: 0,
    subtotal: 0,
    gstTotal: 0,
    pstTotal: 0,
    lineItems: [],
    photos: [],
    receiptImage: null
  });

  const EXPENSE_CATEGORIES = [
    'Materials', 'Labor', 'Equipment', 'Transportation', 'Office', 
    'Fuel', 'Ferries', 'Mileage', 'LOA', 'Utilities', 'Shop', 
    'Wages', 'WCB', 'Phone', 'Advertising/Subscriptions', 'Other'
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.expenses.list);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      } else {
        console.error('Failed to load expenses');
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSubtotal = () => {
    return (formData.lineItems || []).reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  const getCurrentGSTTotal = () => {
    return (formData.lineItems || []).reduce((total, item) => {
      if (item.hasGST) {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return total + (quantity * unitPrice * 0.05);
      }
      return total;
    }, 0);
  };

  const getCurrentPSTTotal = () => {
    return (formData.lineItems || []).reduce((total, item) => {
      if (item.hasPST) {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return total + (quantity * unitPrice * 0.07);
      }
      return total;
    }, 0);
  };

  const getLineItemTotal = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const subtotal = quantity * unitPrice;
    const gst = item.hasGST ? subtotal * 0.05 : 0;
    const pst = item.hasPST ? subtotal * 0.07 : 0;
    return subtotal + gst + pst;
  };

  const calculateTotal = () => {
    const subtotal = getCurrentSubtotal();
    const gstTotal = getCurrentGSTTotal();
    const pstTotal = getCurrentPSTTotal();
    return subtotal + gstTotal + pstTotal;
  };

  // Generate UUID for Neon compatibility
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Generate timestamp for Neon compatibility
  const getCurrentTimestamp = () => {
    return new Date().toISOString();
  };

  const addLineItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      unitPrice: '',
      hasGST: false,
      hasPST: false
    };
    setFormData(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), newItem]
    }));
  };

  const updateLineItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).map(item => 
        item.id === id ? { 
          ...item, 
          [field]: value,
          updated_at: getCurrentTimestamp()
        } : item
      )
    }));
  };

  const removeLineItem = (id) => {
    setFormData(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const subtotal = getCurrentSubtotal();
      const gstTotal = getCurrentGSTTotal();
      const pstTotal = getCurrentPSTTotal();
      const total = subtotal + gstTotal + pstTotal;

      // Use the format that works with current backend
      const expenseData = {
        ...formData,
        amount: total,
        subtotal: subtotal,
        gstTotal: gstTotal,
        pstTotal: pstTotal,
        lineItems: formData.lineItems,
        photos: formData.photos
      };

      let response;
      if (editingItem) {
        response = await fetch(API_ENDPOINTS.expenses.update(editingItem.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
      } else {
        response = await fetch(API_ENDPOINTS.expenses.create, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
      }

      if (response.ok) {
        await loadExpenses();
        resetForm();
      } else {
        alert('Failed to save expense. Please try again.');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
    }
  };

  const startEdit = (expense) => {
    setEditingItem(expense);
    setFormData({
      id: expense.id,
      date: expense.date || '',
      vendor: expense.vendor || '',
      receiptNumber: expense.receiptNumber || '',
      category: expense.category || '',
      description: expense.description || '',
      amount: expense.amount || 0,
      subtotal: expense.subtotal || 0,
      gstTotal: expense.gstTotal || 0,
      pstTotal: expense.pstTotal || 0,
      lineItems: expense.lineItems || [],
      photos: expense.photos || [],
      receiptImage: expense.receiptImage || null,
      notes: expense.notes || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: '',
      vendor: '',
      receiptNumber: '',
      category: '',
      description: '',
      amount: 0,
      subtotal: 0,
      gstTotal: 0,
      pstTotal: 0,
      lineItems: [],
      photos: [],
      receiptImage: null,
      notes: ''
    });
    setEditingItem(null);
    setShowAddForm(false);
    setOcrResult(null);
  };

  // Handle photo upload
  // Cloud Storage Strategy for Neon Integration
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = files.map(file => ({
        // Neon-ready photo structure
        photo_id: generateUUID(), // Unique photo ID for database
        expense_id: formData.id, // Foreign key reference
        file: file, // Actual file object (for current upload)
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        
        // Temporary URL for immediate display
        temp_url: URL.createObjectURL(file),
        
        // Cloud storage fields (will be populated after upload)
        cloud_url: null, // Will be set after uploading to Google Cloud Storage
        cloud_path: null, // Storage path in cloud bucket
        upload_status: 'pending', // pending, uploading, completed, failed
        
        // Metadata for Neon
        created_at: getCurrentTimestamp(),
        updated_at: getCurrentTimestamp(),
        uploaded_by: null, // Will be set to user_id
        
        // Legacy support
        url: URL.createObjectURL(file), // Keep for backward compatibility
        name: file.name // Keep for backward compatibility
      }));
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos] // Updated to use photos
      }));

      // TODO: Implement actual cloud upload when Neon is integrated
      // await uploadPhotosToCloud(newPhotos);
    }
  };

  // Future cloud upload function (ready for Neon integration)
  const uploadPhotosToCloud = async (photos) => {
    // This will be implemented when integrating with Google Cloud Storage
    // const uploadPromises = photos.map(async (photo) => {
    //   const formData = new FormData();
    //   formData.append('file', photo.file);
    //   formData.append('expense_id', photo.expense_id);
    //   
    //   const response = await fetch('/api/upload-photo', {
    //     method: 'POST',
    //     body: formData
    //   });
    //   
    //   const result = await response.json();
    //   return {
    //     ...photo,
    //     cloud_url: result.url,
    //     cloud_path: result.path,
    //     upload_status: 'completed'
    //   };
    // });
    // 
    // return Promise.all(uploadPromises);
  };

  // Remove photo
  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // Process with OCR
  const processWithOCR = async () => {
    if (!formData.photos || formData.photos.length === 0) {
      alert('Please upload at least one photo first.');
      return;
    }

    setProcessingOCR(true);
    
    try {
      // Use the first photo for OCR processing
      const firstPhoto = formData.photos[0];
      const formDataToSend = new FormData();
      formDataToSend.append('file', firstPhoto.file);
      
      const response = await fetch('http://localhost:5000/api/expenses/process-receipt', {
        method: 'POST',
        body: formDataToSend
      });
      
      if (response.ok) {
        const ocrResult = await response.json();
        
        if (ocrResult.success) {
          const extracted = ocrResult.extracted_data;
          
          // Auto-fill form with OCR data
          setFormData(prev => ({
            ...prev,
            vendor: extracted.vendor || prev.vendor,
            date: extracted.date || prev.date,
            amount: extracted.total || prev.amount,
            description: extracted.description || `Receipt from ${extracted.vendor || 'Unknown Vendor'}`,
            lineItems: extracted.line_items && extracted.line_items.length > 0 
              ? extracted.line_items.map(item => ({
                  id: Date.now() + Math.random(),
                  description: item.description || '',
                  quantity: item.quantity || 1,
                  unitPrice: item.unit_price || item.unitPrice || '',
                  hasGST: item.hasGST || false,
                  hasPST: item.hasPST || false
                }))
              : prev.lineItems,
            subtotal: extracted.subtotal || 0,
            gstTotal: extracted.gst_total || 0,
            pstTotal: extracted.pst_total || 0
          }));
          
          setOcrResult(ocrResult);
          
          // Show success message
          const taxInfo = extracted.taxes && extracted.taxes.length > 0 
            ? ` Taxes: ${extracted.taxes.map(tax => `${tax.type} ${tax.rate || ''} $${tax.amount}`).join(', ')}`
            : ' (No taxes detected)';
          alert(`Receipt processed successfully! Found ${extracted.line_items?.length || 0} line items.${taxInfo}`);
        } else {
          alert('Failed to process receipt. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('OCR processing failed:', errorData);
        alert('Failed to process receipt. Please try again.');
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error processing receipt. Please try again.');
    } finally {
      setProcessingOCR(false);
    }
  };

  // Export expense to PDF
  const exportToPDF = async (expense) => {
    try {
      const reportData = {
        title: `Expense Report - ${expense.vendor}`,
        expense: expense,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };

      const response = await fetch('http://localhost:5000/api/expenses/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-${expense.vendor.replace(/\s+/g, '-').toLowerCase()}-${expense.receiptNumber || 'no-receipt'}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  // Email expense report
  const emailExpense = async (expense) => {
    try {
      const emailData = {
        expense: expense,
        subject: `Expense Report - ${expense.vendor} (${expense.receiptNumber || 'No Receipt'})`,
        generatedDate: new Date().toLocaleDateString()
      };

      const response = await fetch('http://localhost:5000/api/expenses/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        alert('Expense report sent successfully!');
      } else {
        alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  // Open photo modal
  const openPhotoModal = (photo) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.onclick = () => document.body.removeChild(modal);
    
    const img = document.createElement('img');
    img.src = photo.url || photo;
    img.className = 'max-w-full max-h-full object-contain';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
  };

  const deleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(API_ENDPOINTS.expenses.delete(id), {
          method: 'DELETE',
        });

        if (response.ok) {
          await loadExpenses();
        } else {
          alert('Failed to delete expense. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading expenses...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ${expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">GST Collected</p>
              <p className="text-2xl font-bold text-gray-900">
                ${expenses.reduce((sum, expense) => sum + (parseFloat(expense.gstTotal) || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">PST Collected</p>
              <p className="text-2xl font-bold text-gray-900">
                ${expenses.reduce((sum, expense) => sum + (parseFloat(expense.pstTotal) || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vendor}
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter receipt number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter expense description"
                  rows="3"
                />
              </div>

              {/* Photo Upload Section */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Receipt Photos</h3>
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Upload Photos
                    </label>
                    {formData.photos && formData.photos.length > 0 && (
                      <button
                        type="button"
                        onClick={processWithOCR}
                        disabled={processingOCR}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {processingOCR ? (
                          <>Processing...</>
                        ) : (
                          <>🔍 Process with OCR</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {formData.photos && formData.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.url || photo}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    No photos uploaded yet. Click "Upload Photos" to add receipt images.
                  </div>
                )}

                {ocrResult && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-800">✅ OCR Processing Complete!</span>
                      <button
                        type="button"
                        onClick={() => setOcrResult(null)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      <div>Auto-filled: Vendor, Date, Amount</div>
                      <div>Found {ocrResult.extracted_data?.line_items?.length || 0} line items</div>
                      {ocrResult.extracted_data?.taxes && ocrResult.extracted_data.taxes.length > 0 && (
                        <div>Taxes: {ocrResult.extracted_data.taxes.map(tax => `${tax.type} ${tax.rate || ''} $${tax.amount}`).join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Section */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line Item
                  </button>
                </div>

                {(formData.lineItems || []).length > 0 ? (
                  <div className="space-y-4">
                    {(formData.lineItems || []).map((item, index) => (
                      <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">Item #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Item description"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={item.quantity || 1}
                              onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              value={item.unitPrice === '' || item.unitPrice === 0 ? '' : item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={item.hasGST || false}
                              onChange={(e) => updateLineItem(item.id, 'hasGST', e.target.checked)}
                              className="mr-2"
                            />
                            GST (5%)
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={item.hasPST || false}
                              onChange={(e) => updateLineItem(item.id, 'hasPST', e.target.checked)}
                              className="mr-2"
                            />
                            PST (7%)
                          </label>

                          <div className="ml-auto">
                            <span className="font-medium">
                              Total: ${(getLineItemTotal(item) || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No line items added yet. Click "Add Line Item" to start.
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(getCurrentSubtotal() || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span>${(getCurrentGSTTotal() || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PST (7%):</span>
                    <span>${(getCurrentPSTTotal() || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total Amount:</span>
                    <span>${(calculateTotal() || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes or comments"
                  rows="3"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    No expenses found. Click "Add Expense" to get started.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.receiptNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(expense.subtotal || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(expense.gstTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(expense.pstTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(expense.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingItem(expense)}
                          className="text-green-600 hover:text-green-900"
                          title="View Expense"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(expense)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Expense"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Expense Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingItem.vendor}</h2>
                <p className="text-gray-600">{viewingItem.category} - Receipt #{viewingItem.receiptNumber || 'N/A'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportToPDF(viewingItem)}
                  className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={() => emailExpense(viewingItem)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Expense Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  <div>
                    <span className="font-medium text-gray-700">Vendor:</span>
                    <p className="text-gray-900">{viewingItem.vendor}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <p className="text-gray-900">{viewingItem.date ? new Date(viewingItem.date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <p className="text-gray-900">{viewingItem.category || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Receipt Number:</span>
                    <p className="text-gray-900">{viewingItem.receiptNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Summary</h3>
                  <div>
                    <span className="font-medium text-gray-700">Subtotal:</span>
                    <p className="text-gray-900 text-lg font-semibold">
                      ${(viewingItem.subtotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">GST (5%):</span>
                    <p className="text-gray-900">
                      ${(viewingItem.gstTotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">PST (7%):</span>
                    <p className="text-gray-900">
                      ${(viewingItem.pstTotal || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="border-t pt-2">
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <p className="text-gray-900 text-xl font-bold text-green-600">
                      ${(viewingItem.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tax Information</h3>
                  <div>
                    <span className="font-medium text-gray-700">GST Collected:</span>
                    <p className="text-gray-900">${(viewingItem.gstTotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">PST Collected:</span>
                    <p className="text-gray-900">${(viewingItem.pstTotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Tax:</span>
                    <p className="text-gray-900 font-semibold">
                      ${((viewingItem.gstTotal || 0) + (viewingItem.pstTotal || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">Description</h3>
                  <p className="text-gray-800">{viewingItem.description}</p>
                </div>
              )}

              {/* Line Items */}
              {viewingItem.lineItems && viewingItem.lineItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">
                    Line Items ({viewingItem.lineItems.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PST</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewingItem.lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">${(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.hasGST ? '✓' : '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.hasPST ? '✓' : '-'}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Photos */}
              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">
                    Receipt Photos ({viewingItem.photos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {viewingItem.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.url || photo}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                          onClick={() => openPhotoModal && openPhotoModal(photo)}
                        />
                        <div 
                          className="w-full h-32 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 text-sm"
                          style={{ display: 'none' }}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">📷</div>
                            <div>Photo Unavailable</div>
                            <div className="text-xs">{photo.name || `Receipt ${index + 1}`}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingItem.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-3">Notes</h3>
                  <p className="text-gray-800">{viewingItem.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => {
                    setViewingItem(null);
                    startEdit(viewingItem);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Expense
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

