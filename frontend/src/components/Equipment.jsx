import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Camera, Calendar, DollarSign, X, Eye, FileText, Mail, Download } from 'lucide-react';

const Equipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    install_date: '',
    warranty_expiry: '',
    service_date: '',
    service_notes: '',
    customer_name: '',
    status: 'Available',
    location: '',
    photos: [], // Changed from photo_path to photos array
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    notes: ''
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/equipment');
      if (!response.ok) {
        throw new Error('Failed to fetch equipment');
      }
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem 
        ? `http://localhost:5000/api/equipment/${editingItem.id}`
        : 'http://localhost:5000/api/equipment';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingItem ? 'update' : 'add'} equipment`);
      }

      await loadEquipment();
      resetForm();
    } catch (error) {
      console.error(`Failed to ${editingItem ? 'update' : 'add'} equipment:`, error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/equipment/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete equipment');
        }
        await loadEquipment();
      } catch (error) {
        console.error('Failed to delete equipment:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      purchase_price: '',
      install_date: '',
      warranty_expiry: '',
      service_date: '',
      service_notes: '',
      customer_name: '',
      status: 'Available',
      location: '',
      photos: [], // Changed from photo_path to photos array
      line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      notes: ''
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      type: item.type || '',
      model: item.model || '',
      serial_number: item.serial_number || '',
      purchase_date: item.purchase_date || '',
      purchase_price: item.purchase_price || '',
      install_date: item.install_date || '',
      warranty_expiry: item.warranty_expiry || '',
      service_date: item.service_date || '',
      service_notes: item.service_notes || '',
      customer_name: item.customer_name || '',
      status: item.status || 'Available',
      location: item.location || '',
      photos: item.photos || [], // Handle photos array
      line_items: item.line_items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      notes: item.notes || ''
    });
    setShowAddForm(true);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        file: file,
        url: URL.createObjectURL(file)
      }));
      setFormData({
        ...formData, 
        photos: [...formData.photos, ...newPhotos]
      });
    }
  };

  const removePhoto = (photoId) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter(photo => photo.id !== photoId)
    });
  };

  const exportToPDF = async (equipment) => {
    try {
      // Create a formatted equipment report
      const reportData = {
        title: `Equipment Report - ${equipment.name}`,
        equipment: equipment,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };

      // Send to backend for PDF generation
      const response = await fetch('http://localhost:5000/api/equipment/export-pdf', {
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
        a.download = `equipment-${equipment.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const emailEquipment = async (equipment) => {
    try {
      const emailData = {
        equipment: equipment,
        subject: `Equipment Report - ${equipment.name}`,
        generatedDate: new Date().toLocaleDateString()
      };

      const response = await fetch('http://localhost:5000/api/equipment/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        alert('Equipment report sent successfully!');
      } else {
        alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Email error:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  const openPhotoModal = (photo) => {
    // Create a modal to view the full-size photo
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.onclick = () => document.body.removeChild(modal);
    
    const img = document.createElement('img');
    img.src = photo.url || photo;
    img.className = 'max-w-full max-h-full object-contain';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeLineItem = (index) => {
    const newLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({...formData, line_items: newLineItems});
  };

  const updateLineItem = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newLineItems[index].total = newLineItems[index].quantity * newLineItems[index].unit_price;
    }
    
    setFormData({...formData, line_items: newLineItems});
  };

  const calculateSubtotal = () => {
    return formData.line_items.reduce((sum, item) => sum + item.total, 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-blue-100 text-blue-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      case 'Retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEquipment = equipment.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter equipment by status
  const activeEquipment = filteredEquipment.filter(item => item.status !== 'Maintenance');
  const maintenanceEquipment = filteredEquipment.filter(item => item.status === 'Maintenance');

  if (loading) {
    return <div className="p-6">Loading equipment...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search equipment..."
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
                {editingItem ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Furnace">Furnace</option>
                    <option value="A/C">A/C</option>
                    <option value="Heat Pump">Heat Pump</option>
                    <option value="Coil">Coil</option>
                    <option value="HRV">HRV</option>
                    <option value="ERV">ERV</option>
                    <option value="Unit Heater">Unit Heater</option>
                    <option value="Mini Split Indoor">Mini Split Indoor</option>
                    <option value="Mini Split Outdoor">Mini Split Outdoor</option>
                    <option value="Ceiling Cassette">Ceiling Cassette</option>
                    <option value="Rooftop">Rooftop</option>
                    <option value="Navien">Navien</option>
                    <option value="Fan">Fan</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Heavy Equipment">Heavy Equipment</option>
                    <option value="Vehicles">Vehicles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({...formData, install_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty Expiry
                  </label>
                  <input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({...formData, warranty_expiry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={formData.service_date}
                    onChange={(e) => setFormData({...formData, service_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address/Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter address or location"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photos
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
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
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Add Photos
                      </label>
                      <span className="text-sm text-gray-500">
                        {formData.photos.length} photo(s) selected
                      </span>
                    </div>
                    
                    {/* Photo Gallery */}
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {formData.photos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded truncate">
                              {photo.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Notes
                  </label>
                  <textarea
                    value={formData.service_notes}
                    onChange={(e) => setFormData({...formData, service_notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter service notes, filter changes, maintenance details..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
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
                  {editingItem ? 'Update Equipment' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Equipment Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Active Equipment ({activeEquipment.length})
          </h2>
        </div>
        
        <div className="space-y-4">
          {activeEquipment.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Type:</span> {item.type || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Model:</span> {item.model || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Serial:</span> {item.serial_number || 'N/A'}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-medium">Purchased:</span> 
                      <span className="ml-1">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span className="font-medium">Price:</span> 
                      <span className="ml-1">{item.purchase_price ? `$${parseFloat(item.purchase_price).toLocaleString()}` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {item.location || 'N/A'}
                    </div>
                    {item.customer_name && (
                      <div>
                        <span className="font-medium">Customer:</span> {item.customer_name}
                      </div>
                    )}
                    {item.install_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="font-medium">Installed:</span> 
                        <span className="ml-1">{new Date(item.install_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {item.warranty_expiry && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="font-medium">Warranty Expires:</span> 
                        <span className="ml-1">{new Date(item.warranty_expiry).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-700">{item.notes}</p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setViewingItem(item)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit Equipment"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Equipment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {activeEquipment.length === 0 && (
            <div className="p-6 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
              No active equipment found. {searchTerm ? 'Try adjusting your search.' : 'Add your first piece of equipment to get started.'}
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Schedule Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Maintenance Schedule ({maintenanceEquipment.length})
          </h2>
        </div>
        
        <div className="space-y-4">
          {maintenanceEquipment.map((item) => (
            <div key={item.id} className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Type:</span> {item.type || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Model:</span> {item.model || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Serial:</span> {item.serial_number || 'N/A'}
                    </div>
                    {item.service_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-orange-600" />
                        <span className="font-medium">Service Date:</span> 
                        <span className="ml-1 text-orange-700 font-medium">{new Date(item.service_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Location:</span> {item.location || 'N/A'}
                    </div>
                    {item.customer_name && (
                      <div>
                        <span className="font-medium">Customer:</span> {item.customer_name}
                      </div>
                    )}
                  </div>
                  
                  {item.service_notes && (
                    <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                      <span className="font-medium text-orange-800">Service Notes:</span>
                      <p className="text-sm text-orange-700 mt-1">{item.service_notes}</p>
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <span className="font-medium text-gray-800">General Notes:</span>
                      <p className="text-sm text-gray-700 mt-1">{item.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setViewingItem(item)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit Equipment"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Equipment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {maintenanceEquipment.length === 0 && (
            <div className="p-6 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
              No equipment scheduled for maintenance.
            </div>
          )}
        </div>
      </div>

      {/* Equipment Detail View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingItem.name}</h2>
                <p className="text-gray-600">{viewingItem.type} - {viewingItem.model}</p>
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
                  onClick={() => emailEquipment(viewingItem)}
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
              {/* Status Badge */}
              <div className="mb-6">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  viewingItem.status === 'Active' ? 'bg-green-100 text-green-800' :
                  viewingItem.status === 'Maintenance' ? 'bg-orange-100 text-orange-800' :
                  viewingItem.status === 'In Use' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewingItem.status}
                </span>
              </div>

              {/* Equipment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  <div>
                    <span className="font-medium text-gray-700">Equipment Name:</span>
                    <p className="text-gray-900">{viewingItem.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <p className="text-gray-900">{viewingItem.type || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Model:</span>
                    <p className="text-gray-900">{viewingItem.model || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Serial Number:</span>
                    <p className="text-gray-900">{viewingItem.serial_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Information</h3>
                  <div>
                    <span className="font-medium text-gray-700">Purchase Price:</span>
                    <p className="text-gray-900 text-lg font-semibold">
                      {viewingItem.purchase_price ? `$${parseFloat(viewingItem.purchase_price).toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Purchase Date:</span>
                    <p className="text-gray-900">
                      {viewingItem.purchase_date ? new Date(viewingItem.purchase_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Install Date:</span>
                    <p className="text-gray-900">
                      {viewingItem.install_date ? new Date(viewingItem.install_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Warranty Expires:</span>
                    <p className="text-gray-900">
                      {viewingItem.warranty_expiry ? new Date(viewingItem.warranty_expiry).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Location & Service</h3>
                  <div>
                    <span className="font-medium text-gray-700">Current Location:</span>
                    <p className="text-gray-900">{viewingItem.location || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Customer:</span>
                    <p className="text-gray-900">{viewingItem.customer_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Service:</span>
                    <p className="text-gray-900">
                      {viewingItem.service_date ? new Date(viewingItem.service_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Next Maintenance:</span>
                    <p className="text-gray-900">
                      {viewingItem.next_maintenance ? new Date(viewingItem.next_maintenance).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Notes */}
              {viewingItem.service_notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Notes</h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-gray-800">{viewingItem.service_notes}</p>
                  </div>
                </div>
              )}

              {/* General Notes */}
              {viewingItem.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">General Notes</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-800">{viewingItem.notes}</p>
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Photos ({viewingItem.photos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {viewingItem.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url || photo}
                          alt={`Equipment photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => openPhotoModal(photo)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingItem(null);
                  startEdit(viewingItem);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipment;

