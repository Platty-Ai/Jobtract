import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../lib/ApiService';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileBarChart, 
  Calendar, 
  DollarSign, 
  User, 
  ArrowLeft,
  Download,
  Mail,
  Eye,
  Settings,
  Building,
  Phone,
  MapPin,
  Globe,
  Camera,
  X
} from 'lucide-react';

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [companyProfile, setCompanyProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    customer_email: '',
    customer_tax_exempt: false,
    customer_exemption_number: '',
    customer_band_name: '',
    customer_band_address: '',
    customer_band_phone: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    has_due_date: true,
    status: 'Draft',
    line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    gst_rate: 5.0,
    pst_rate: 7.0,
    photo_path: '',
    notes: ''
  });

  const [companyFormData, setCompanyFormData] = useState({
    company_name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    pst_number: '',
    business_number: ''
  });

  useEffect(() => {
    loadInvoices();
    loadCompanyProfile();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiService.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const data = await apiService.getCompanyProfile();
      setCompanyProfile(data);
      setCompanyFormData(data);
    } catch (error) {
      console.error('Failed to load company profile:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiService.updateInvoice(editingItem.id, formData);
      } else {
        await apiService.createInvoice(formData);
      }
      await loadInvoices();
      resetForm();
    } catch (error) {
      console.error('Failed to save invoice:', error);
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.updateCompanyProfile(companyFormData);
      await loadCompanyProfile();
      setShowCompanyForm(false);
    } catch (error) {
      console.error('Failed to update company profile:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await apiService.deleteInvoice(id);
        await loadInvoices();
      } catch (error) {
        console.error('Failed to delete invoice:', error);
      }
    }
  };

  const handleGeneratePDF = async (invoiceId) => {
    try {
      const blob = await apiService.generateInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleEmailInvoice = async (invoiceId, email) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_to: email })
      });
      const data = await response.json();
      alert(`Email: ${data.message}`);
    } catch (error) {
      console.error('Failed to email invoice:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_address: '',
      customer_phone: '',
      customer_email: '',
      customer_tax_exempt: false,
      customer_exemption_number: '',
      customer_band_name: '',
      customer_band_address: '',
      customer_band_phone: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      has_due_date: true,
      status: 'Draft',
      line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      gst_rate: 5.0,
      pst_rate: 7.0,
      photo_path: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      customer_name: item.customer_name || '',
      customer_address: item.customer_address || '',
      customer_phone: item.customer_phone || '',
      customer_email: item.customer_email || '',
      customer_tax_exempt: item.customer_tax_exempt || false,
      customer_exemption_number: item.customer_exemption_number || '',
      customer_band_name: item.customer_band_name || '',
      customer_band_address: item.customer_band_address || '',
      customer_band_phone: item.customer_band_phone || '',
      invoice_date: item.invoice_date || '',
      due_date: item.due_date || '',
      has_due_date: item.has_due_date !== undefined ? item.has_due_date : true,
      status: item.status || 'Draft',
      line_items: item.line_items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      gst_rate: item.gst_rate || 5.0,
      pst_rate: item.pst_rate || 7.0,
      photo_path: item.photo_path || '',
      notes: item.notes || ''
    });
    setShowAddForm(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just store the filename. In production, you'd upload to a server
      setFormData({...formData, photo_path: file.name});
    }
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeLineItem = (index) => {
    const newItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: newItems });
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    newItems[index][field] = value;
    
    // Calculate total for this line item
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = newItems[index].quantity || 0;
      const unitPrice = newItems[index].unit_price === '' ? 0 : (newItems[index].unit_price || 0);
      newItems[index].total = quantity * unitPrice;
    }
    
    setFormData({ ...formData, line_items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const calculateGST = () => {
    if (formData.customer_tax_exempt) return 0;
    return calculateSubtotal() * (formData.gst_rate / 100);
  };

  const calculatePST = () => {
    if (formData.customer_tax_exempt) return 0;
    return calculateSubtotal() * (formData.pst_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST() + calculatePST();
  };

  const handleTaxExemptChange = (isExempt) => {
    let newLineItems = [...formData.line_items];
    
    if (isExempt) {
      // Add delivery line item if not already present
      const hasDelivery = newLineItems.some(item => item.description === 'Delivery');
      if (!hasDelivery) {
        newLineItems.push({
          description: 'Delivery',
          delivery_address: '',
          quantity: 1,
          unit_price: 0.00,
          total: 0.00
        });
      }
    } else {
      // Remove delivery line item when not tax exempt
      newLineItems = newLineItems.filter(item => item.description !== 'Delivery');
    }
    
    setFormData({
      ...formData,
      customer_tax_exempt: isExempt,
      gst_rate: isExempt ? 0.0 : 5.0,
      pst_rate: isExempt ? 0.0 : 7.0,
      line_items: newLineItems
    });
  };

  const removeDueDate = () => {
    setFormData({
      ...formData,
      has_due_date: false,
      due_date: ''
    });
  };

  const addDueDate = () => {
    setFormData({
      ...formData,
      has_due_date: true,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    });
  };

  const filteredInvoices = invoices.filter(item =>
    item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalInvoiceValue = filteredInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewingInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewingInvoice(null)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {viewingInvoice.invoice_number}</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleGeneratePDF(viewingInvoice.id)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={() => handleEmailInvoice(viewingInvoice.id, viewingInvoice.customer_email)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Invoice
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-4xl mx-auto">
          {/* Company Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{companyProfile.company_name}</h2>
              <div className="text-gray-600 mt-2">
                <p>{companyProfile.address}</p>
                <p>{companyProfile.city}, {companyProfile.province} {companyProfile.postal_code}</p>
                <p>{companyProfile.phone}</p>
                <p>{companyProfile.email}</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900">INVOICE</h3>
              <p className="text-lg font-semibold text-gray-700">{viewingInvoice.invoice_number}</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Bill To:</h4>
              <div className="text-gray-700">
                <p className="font-medium">{viewingInvoice.customer_name}</p>
                <p>{viewingInvoice.customer_address}</p>
                <p>{viewingInvoice.customer_phone}</p>
                <p>{viewingInvoice.customer_email}</p>
                {viewingInvoice.customer_tax_exempt && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-800">
                      ⚠️ TAX EXEMPT CUSTOMER
                    </p>
                    {viewingInvoice.customer_exemption_number && (
                      <p className="text-xs text-yellow-700">
                        Exemption #: {viewingInvoice.customer_exemption_number}
                      </p>
                    )}
                    {viewingInvoice.customer_band_name && (
                      <div className="text-xs text-yellow-700 mt-1">
                        <p>Band: {viewingInvoice.customer_band_name}</p>
                        <p>{viewingInvoice.customer_band_address}</p>
                        <p>{viewingInvoice.customer_band_phone}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Invoice Date:</span>
                  <span>{new Date(viewingInvoice.invoice_date).toLocaleDateString()}</span>
                </div>
                {viewingInvoice.has_due_date && viewingInvoice.due_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">Due Date:</span>
                    <span>{new Date(viewingInvoice.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(viewingInvoice.status)}`}>
                    {viewingInvoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold">Description</th>
                  <th className="text-center py-2 font-semibold">Qty</th>
                  <th className="text-right py-2 font-semibold">Unit Price</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewingInvoice.line_items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3">
                      {item.description}
                      {item.delivery_address && (
                        <div className="text-sm text-gray-500 mt-1">
                          Delivery to: {item.delivery_address}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">${item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${viewingInvoice.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({viewingInvoice.gst_rate}%):</span>
                  <span>${viewingInvoice.gst_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PST ({viewingInvoice.pst_rate}%):</span>
                  <span>${viewingInvoice.pst_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${viewingInvoice.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {viewingInvoice.notes && (
            <div className="mt-8 pt-8 border-t">
              <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
              <p className="text-gray-700">{viewingInvoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showCompanyForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCompanyForm(false)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyFormData.company_name}
                  onChange={(e) => setCompanyFormData({...companyFormData, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PST Number
                </label>
                <input
                  type="text"
                  value={companyFormData.pst_number}
                  onChange={(e) => setCompanyFormData({...companyFormData, pst_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Number
                </label>
                <input
                  type="text"
                  value={companyFormData.business_number}
                  onChange={(e) => setCompanyFormData({...companyFormData, business_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={companyFormData.address}
                  onChange={(e) => setCompanyFormData({...companyFormData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={companyFormData.city}
                  onChange={(e) => setCompanyFormData({...companyFormData, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province
                </label>
                <input
                  type="text"
                  value={companyFormData.province}
                  onChange={(e) => setCompanyFormData({...companyFormData, province: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={companyFormData.postal_code}
                  onChange={(e) => setCompanyFormData({...companyFormData, postal_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={companyFormData.phone}
                  onChange={(e) => setCompanyFormData({...companyFormData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={companyFormData.email}
                  onChange={(e) => setCompanyFormData({...companyFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={companyFormData.website}
                  onChange={(e) => setCompanyFormData({...companyFormData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowCompanyForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Company Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={resetForm}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {editingItem ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Address
                  </label>
                  <input
                    type="text"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tax Exemption Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="tax_exempt"
                  checked={formData.customer_tax_exempt}
                  onChange={(e) => handleTaxExemptChange(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="tax_exempt" className="text-sm font-medium text-gray-700">
                  Tax Exempt Customer
                </label>
              </div>

              {formData.customer_tax_exempt && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exemption Number (e.g., SI-123456789)
                      </label>
                      <input
                        type="text"
                        value={formData.customer_exemption_number}
                        onChange={(e) => setFormData({...formData, customer_exemption_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="SI-123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Band Name
                      </label>
                      <input
                        type="text"
                        value={formData.customer_band_name}
                        onChange={(e) => setFormData({...formData, customer_band_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="First Nation Band Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Band Address
                      </label>
                      <input
                        type="text"
                        value={formData.customer_band_address}
                        onChange={(e) => setFormData({...formData, customer_band_address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Band/Reserve Address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Band Phone
                      </label>
                      <input
                        type="text"
                        value={formData.customer_band_phone}
                        onChange={(e) => setFormData({...formData, customer_band_phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(604) 555-0123"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                    {formData.has_due_date && (
                      <button
                        type="button"
                        onClick={removeDueDate}
                        className="ml-2 text-red-600 hover:text-red-800"
                        title="Remove due date"
                      >
                        <X className="h-4 w-4 inline" />
                      </button>
                    )}
                  </label>
                  {formData.has_due_date ? (
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={addDueDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      + Add Due Date
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.line_items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          onBlur={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total
                          </label>
                          <input
                            type="text"
                            value={`$${item.total.toFixed(2)}`}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                        {formData.line_items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="ml-2 p-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address for Delivery Items */}
                    {item.description === 'Delivery' && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Address (Required for Tax Exemption)
                        </label>
                        <input
                          type="text"
                          value={item.delivery_address || ''}
                          onChange={(e) => updateLineItem(index, 'delivery_address', e.target.value)}
                          className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="Delivery address on reservation"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({formData.gst_rate}%):</span>
                    <span>${calculateGST().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PST ({formData.pst_rate}%):</span>
                    <span>${calculatePST().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  {formData.customer_tax_exempt && (
                    <div className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded mt-2">
                      ⚠️ Tax exempt customer - GST/PST set to 0%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Choose Photo
                </label>
                {formData.photo_path && (
                  <span className="text-sm text-gray-600">{formData.photo_path}</span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or terms..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingItem ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoicing</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCompanyForm(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Company Profile
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileBarChart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredInvoices.filter(inv => inv.status === 'Draft').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <User className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredInvoices.filter(inv => inv.status === 'Sent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalInvoiceValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{invoice.customer_name}</div>
                    <div className="text-sm text-gray-500">{invoice.customer_email}</div>
                    {invoice.customer_tax_exempt && (
                      <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded mt-1 inline-block">
                        Tax Exempt
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.has_due_date && invoice.due_date 
                      ? new Date(invoice.due_date).toLocaleDateString()
                      : 'No due date'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.total_amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setViewingInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(invoice)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Invoice"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(invoice.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEmailInvoice(invoice.id, invoice.customer_email)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Email Invoice"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Invoice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileBarChart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first invoice.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;

