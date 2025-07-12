/**
 * Smart API Configuration System
 * Automatically detects environment and sets correct API URLs
 * Works for development (localhost) and production (domain)
 */

// Environment detection
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

// API Base URL Configuration
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:5000',
    apiPrefix: '/api'
  },
  production: {
    baseURL: window.location.origin, // Uses the same domain as frontend
    apiPrefix: '/api'
  }
};

// Get current environment config
const currentConfig = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// API URL Builder
export const API_BASE_URL = currentConfig.baseURL + currentConfig.apiPrefix;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Pre-built API endpoints for common operations
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: buildApiUrl('auth/login'),
    verifyToken: buildApiUrl('auth/verify-token'),
    refresh: buildApiUrl('auth/refresh')
  },
  
  // Expenses
  expenses: {
    list: buildApiUrl('expenses'),
    create: buildApiUrl('expenses'),
    get: (id) => buildApiUrl(`expenses/${id}`),
    update: (id) => buildApiUrl(`expenses/${id}`),
    delete: (id) => buildApiUrl(`expenses/${id}`),
    processReceipt: buildApiUrl('expenses/process-receipt'),
    exportPdf: buildApiUrl('expenses/export-pdf'),
    email: buildApiUrl('expenses/email')
  },
  
  // Equipment
  equipment: {
    list: buildApiUrl('equipment'),
    create: buildApiUrl('equipment'),
    get: (id) => buildApiUrl(`equipment/${id}`),
    update: (id) => buildApiUrl(`equipment/${id}`),
    delete: (id) => buildApiUrl(`equipment/${id}`),
    exportPdf: buildApiUrl('equipment/export-pdf'),
    email: buildApiUrl('equipment/email')
  },
  
  // Projects
  projects: {
    list: buildApiUrl('projects'),
    create: buildApiUrl('projects'),
    get: (id) => buildApiUrl(`projects/${id}`),
    update: (id) => buildApiUrl(`projects/${id}`),
    delete: (id) => buildApiUrl(`projects/${id}`)
  },
  
  // Quotes
  quotes: {
    list: buildApiUrl('quotes'),
    create: buildApiUrl('quotes'),
    get: (id) => buildApiUrl(`quotes/${id}`),
    update: (id) => buildApiUrl(`quotes/${id}`),
    delete: (id) => buildApiUrl(`quotes/${id}`)
  },
  
  // Purchase Orders
  purchaseOrders: {
    list: buildApiUrl('purchase-orders'),
    create: buildApiUrl('purchase-orders'),
    get: (id) => buildApiUrl(`purchase-orders/${id}`),
    update: (id) => buildApiUrl(`purchase-orders/${id}`),
    delete: (id) => buildApiUrl(`purchase-orders/${id}`)
  }
};

// HTTP Helper with automatic authentication
export const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Environment info for debugging
export const ENV_INFO = {
  isDevelopment,
  isProduction,
  hostname: window.location.hostname,
  currentConfig,
  apiBaseUrl: API_BASE_URL
};

// Log configuration in development
if (isDevelopment) {
  console.log('🔧 API Configuration:', ENV_INFO);
}

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  apiRequest,
  ENV_INFO
};

