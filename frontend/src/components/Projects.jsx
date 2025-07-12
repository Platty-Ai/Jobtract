import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FolderOpen, Calendar, DollarSign, User, Camera, ArrowLeft, Eye, FileText, Mail, X } from 'lucide-react';
import apiService from '../lib/ApiService';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'Planning',
    priority: 'Medium',
    photo_path: '',
    notes: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await apiService.updateProject(editingItem.id, formData);
      } else {
        await apiService.addProject(formData);
      }
      
      await loadProjects();
      resetForm();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await apiService.deleteProject(id);
        await loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      client: '',
      description: '',
      start_date: '',
      end_date: '',
      budget: '',
      status: 'Planning',
      priority: 'Medium',
      photo_path: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      client: item.client || '',
      description: item.description || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      budget: item.budget || '',
      status: item.status || 'Planning',
      priority: item.priority || 'Medium',
      photo_path: item.photo_path || '',
      notes: item.notes || ''
    });
    setShowAddForm(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a blob URL for immediate display
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({...formData, photo_path: event.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProjects = projects.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'On Hold': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalBudget = filteredProjects.reduce((sum, project) => sum + parseFloat(project.budget || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
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
  };

  // PDF Export function
  const exportToPDF = async (project) => {
    try {
      const reportData = {
        title: `Project Report - ${project.name}`,
        project: project,
        generatedDate: new Date().toLocaleDateString(),
        generatedTime: new Date().toLocaleTimeString()
      };

      const response = await fetch('http://localhost:5000/api/projects/export-pdf', {
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
        a.download = `project-${project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
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

  // Email function
  const emailProject = (project) => {
    const subject = `Project Report - ${project.name}`;
    const body = `Project: ${project.name}\nClient: ${project.client}\nStatus: ${project.status}\nBudget: $${project.budget?.toLocaleString()}\nStart Date: ${project.start_date}\nEnd Date: ${project.end_date}\n\nDescription: ${project.description}\n\nNotes: ${project.notes}`;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  // Print function
  const printProject = (project) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Project Report - ${project.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Project Report</h1>
            <h2>${project.name}</h2>
          </div>
          <div class="section">
            <div class="label">Client:</div>
            <div>${project.client}</div>
          </div>
          <div class="section">
            <div class="label">Status:</div>
            <div>${project.status}</div>
          </div>
          <div class="section">
            <div class="label">Budget:</div>
            <div>$${project.budget?.toLocaleString()}</div>
          </div>
          <div class="section">
            <div class="label">Start Date:</div>
            <div>${project.start_date}</div>
          </div>
          <div class="section">
            <div class="label">End Date:</div>
            <div>${project.end_date}</div>
          </div>
          <div class="section">
            <div class="label">Priority:</div>
            <div>${project.priority}</div>
          </div>
          <div class="section">
            <div class="label">Description:</div>
            <div>${project.description}</div>
          </div>
          <div class="section">
            <div class="label">Notes:</div>
            <div>${project.notes}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Text function
  const textProject = (project) => {
    const message = `Project: ${project.name} - Client: ${project.client}, Status: ${project.status}, Budget: $${project.budget?.toLocaleString()}, Dates: ${project.start_date} to ${project.end_date}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Project Details',
        text: message
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert('Project details copied to clipboard! You can now paste it into a text message.');
      }).catch(() => {
        alert('Unable to copy to clipboard. Please copy the details manually.');
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              // If a form is open, close it instead of navigating back
              if (showAddForm || editingItem) {
                setShowAddForm(false);
                setEditingItem(null);
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-600">Total Projects</h3>
          <p className="text-2xl font-bold text-gray-900">{filteredProjects.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-600">Active Projects</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredProjects.filter(p => p.status === 'In Progress').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-600">Completed Projects</h3>
          <p className="text-2xl font-bold text-green-600">
            {filteredProjects.filter(p => p.status === 'Completed').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-600">Total Budget</h3>
          <p className="text-2xl font-bold text-blue-600">${totalBudget.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingItem ? 'Edit Project' : 'Add New Project'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
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
                Client *
              </label>
              <input
                type="text"
                required
                value={formData.client}
                onChange={(e) => setFormData({...formData, client: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div className="mt-2">
                    {formData.photo_path.startsWith('data:') ? (
                      <img 
                        src={formData.photo_path} 
                        alt="Project preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                    ) : formData.photo_path.includes('.') ? (
                      <img 
                        src={`/uploads/${formData.photo_path}`} 
                        alt="Project preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{formData.photo_path}</span>
                    )}
                    {formData.photo_path.includes('.') && (
                      <span className="text-sm text-gray-600" style={{display: 'none'}}>
                        Photo: {formData.photo_path}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3">
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
                {editingItem ? 'Update' : 'Add'} Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Projects ({filteredProjects.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredProjects.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FolderOpen className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span className="font-medium">Client:</span> 
                      <span className="ml-1">{item.client}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-medium">Start:</span> 
                      <span className="ml-1">{item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="font-medium">End:</span> 
                      <span className="ml-1">{item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span className="font-medium">Budget:</span> 
                      <span className="ml-1">{item.budget ? `$${parseFloat(item.budget).toLocaleString()}` : 'N/A'}</span>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                  )}
                  
                  {item.notes && (
                    <p className="text-sm text-gray-600 italic">{item.notes}</p>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setViewingItem(item)}
                    className="p-2 text-gray-400 hover:text-green-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first project.'}
            </p>
          </div>
        )}
      </div>

      {/* Project Detail View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingItem.name}</h2>
                <p className="text-gray-600">{viewingItem.client}</p>
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
                  onClick={() => emailProject(viewingItem)}
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
                  viewingItem.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  viewingItem.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  viewingItem.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewingItem.status}
                </span>
              </div>

              {/* Project Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Project Information</h3>
                    <div className="mt-2 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Client:</span>
                        <span className="font-medium">{viewingItem.client}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{viewingItem.start_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-medium">{viewingItem.end_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className="font-medium">{viewingItem.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Financial Information</h3>
                    <div className="mt-2 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget:</span>
                        <span className="font-medium text-green-600">${viewingItem.budget?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-gray-700">{viewingItem.description}</p>
                </div>
              )}

              {/* Photo */}
              {viewingItem.photo_path && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Project Photo</h3>
                  {viewingItem.photo_path.startsWith('data:') ? (
                    <img 
                      src={viewingItem.photo_path} 
                      alt="Project" 
                      className="w-64 h-64 object-cover rounded-lg border border-gray-300"
                    />
                  ) : (
                    <div className="text-gray-600">Photo: {viewingItem.photo_path}</div>
                  )}
                </div>
              )}

              {/* Notes */}
              {viewingItem.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
                  <p className="text-gray-700">{viewingItem.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => printProject(viewingItem)}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Print
                </button>
                <button
                  onClick={() => textProject(viewingItem)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;

