import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, DollarSign, Eye, FileText, Mail } from 'lucide-react';

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    date: '',
    vendor: '',
    purchaseOrderNumber: '',
    category: '',
    description: '',
    notes: '',
    amount: 0,
    subtotal: 0,
    gstTotal: 0,
    pstTotal: 0,
    lineItems: [],
    photos: []
  });

  const PURCHASE_ORDER_CATEGORIES = [
    'Materials', 'Labor', 'Equipment', 'Transportation', 'Office', 
    'Fuel', 'Ferries', 'Mileage', 'LOA', 'Utilities', 'Shop', 
    'Wages', 'WCB', 'Phone', 'Advertising/Subscriptions', 'Other'
  ];

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  const loadPurchaseOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/purchase-orders');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data);
      } else {
        console.error('Failed to load purchase orders');
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error);
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
        item.id === id ? { ...item, [field]: value } : item
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

      const purchaseOrderData = {
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
        response = await fetch(`http://localhost:5000/api/purchase-orders/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseOrderData),
        });
      } else {
        response = await fetch('http://localhost:5000/api/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseOrderData),
        });
      }

      if (response.ok) {
        await loadPurchaseOrders();
        resetForm();
      } else {
        alert('Failed to save purchase order. Please try again.');
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);
      alert('Error saving purchase order. Please try again.');
    }
  };

  const startEdit = (purchaseOrder) => {
    setEditingItem(purchaseOrder);
    setFormData({
      id: purchaseOrder.id,
      date: purchaseOrder.date || '',
      vendor: purchaseOrder.vendor || '',
      purchaseOrderNumber: purchaseOrder.purchaseOrderNumber || '',
      category: purchaseOrder.category || '',
      description: purchaseOrder.description || '',
      amount: purchaseOrder.amount || 0,
      subtotal: purchaseOrder.subtotal || 0,
      gstTotal: purchaseOrder.gstTotal || 0,
      pstTotal: purchaseOrder.pstTotal || 0,
      lineItems: purchaseOrder.lineItems || [],
      photos: purchaseOrder.photos || [],
      notes: purchaseOrder.notes || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      date: '',
      vendor: '',
      purchaseOrderNumber: '',
      category: '',
      description: '',
      amount: 0,
      subtotal: 0,
      gstTotal: 0,
      pstTotal: 0,
      lineItems: [],
      photos: [],
      notes: ''
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = files.map(file => ({
        file: file,
        url: URL.createObjectURL(file),
        name: file.name
      }));
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const exportToPDF = async (purchaseOrder) => {
    try {
      const reportData = {
        title: `Purchase Order Report - ${purchaseOrder.vendor}`,
        purchaseOrder: purchaseOrder,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };

      const response = await fetch('http://localhost:5000/api/purchase-orders/export-pdf', {
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
        a.download = `purchase-order-${purchaseOrder.vendor.replace(/\s+/g, '-').toLowerCase()}-${purchaseOrder.purchaseOrderNumber || 'no-po'}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const emailPurchaseOrder = async (purchaseOrder) => {
    try {
      const emailData = {
        purchaseOrder: purchaseOrder,
        subject: `Purchase Order Report - ${purchaseOrder.vendor} (${purchaseOrder.purchaseOrderNumber || 'No PO'})`,
        generatedDate: new Date().toLocaleDateString()
      };

      const response = await fetch('http://localhost:5000/api/purchase-orders/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        alert('Purchase order report sent successfully!');
      } else {
        alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('Failed to send email. Please try again.');
    }
  };

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

  const deletePurchaseOrder = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/purchase-orders/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await loadPurchaseOrders();
        } else {
          alert('Failed to delete purchase order. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        alert('Error deleting purchase order. Please try again.');
      }
    }
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading purchase orders...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Order Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Purchase Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${purchaseOrders.reduce((sum, po) => sum + (po.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchaseOrders.filter(po => po.status === 'Pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchaseOrders.filter(po => {
                  const poDate = new Date(po.date);
                  const now = new Date();
                  return poDate.getMonth() === now.getMonth() && poDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{po.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.vendor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.purchaseOrderNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${po.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setViewingItem(po)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startEdit(po)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deletePurchaseOrder(po.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Purchase Order' : 'Add New Purchase Order'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order Number</label>
                  <input
                    type="text"
                    value={formData.purchaseOrderNumber}
                    onChange={(e) => setFormData({...formData, purchaseOrderNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {PURCHASE_ORDER_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Item
                  </button>
                </div>

                {(formData.lineItems || []).map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Taxes</label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={item.hasGST}
                            onChange={(e) => updateLineItem(item.id, 'hasGST', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm">GST (5%)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={item.hasPST}
                            onChange={(e) => updateLineItem(item.id, 'hasPST', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm">PST (7%)</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Financial Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Subtotal:</span>
                      <div className="text-lg font-bold">${getCurrentSubtotal().toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">GST (5%):</span>
                      <div className="text-lg font-bold">${getCurrentGSTTotal().toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">PST (7%):</span>
                      <div className="text-lg font-bold">${getCurrentPSTTotal().toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total:</span>
                      <div className="text-xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Upload */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
                <div className="mb-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    📷 Upload Photos
                  </label>
                </div>

                {(formData.photos || []).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                          onClick={() => openPhotoModal(photo)}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Update Purchase Order' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportToPDF(viewingItem)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => emailPurchaseOrder(viewingItem)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  📧 Email
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Order Information</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Date:</span> {viewingItem.date}</div>
                    <div><span className="font-medium">Vendor:</span> {viewingItem.vendor}</div>
                    <div><span className="font-medium">PO Number:</span> {viewingItem.purchaseOrderNumber}</div>
                    <div><span className="font-medium">Category:</span> {viewingItem.category}</div>
                    <div><span className="font-medium">Description:</span> {viewingItem.description}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
                  <div className="space-y-2">
                    <div><span className="font-medium">Subtotal:</span> ${viewingItem.subtotal?.toFixed(2)}</div>
                    <div><span className="font-medium">GST (5%):</span> ${viewingItem.gstTotal?.toFixed(2)}</div>
                    <div><span className="font-medium">PST (7%):</span> ${viewingItem.pstTotal?.toFixed(2)}</div>
                    <div className="text-lg"><span className="font-medium">Total:</span> <span className="font-bold text-blue-600">${viewingItem.amount?.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              {viewingItem.lineItems && viewingItem.lineItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PST</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewingItem.lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.hasGST ? '✓' : '✗'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.hasPST ? '✓' : '✗'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">${getLineItemTotal(item).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Photos ({viewingItem.photos.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {viewingItem.photos.map((photo, index) => (
                      <div key={index}>
                        {photo.url ? (
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                            onClick={() => openPhotoModal(photo)}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Photo Unavailable</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingItem.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <p className="text-gray-700">{viewingItem.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;

