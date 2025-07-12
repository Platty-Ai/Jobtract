import React, { useState, useEffect } from 'react';
import apiService from '../lib/ApiService';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    equipment: [],
    expenses: [],
    projects: [],
    quotes: [],
    purchaseOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel with error handling
      const results = await Promise.allSettled([
        loadEquipmentData(),
        loadExpensesData(),
        loadProjectsData(),
        loadQuotesData(),
        loadPurchaseOrdersData()
      ]);

      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Some dashboard data failed to load:', failures);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipmentData = async () => {
    try {
      const equipment = await apiService.getEquipment();
      // Enterprise-grade validation: ensure we always have an array
      const validatedEquipment = Array.isArray(equipment) ? equipment : [];
      setDashboardData(prev => ({ ...prev, equipment: validatedEquipment }));
    } catch (error) {
      console.log('Equipment data not available yet');
      setDashboardData(prev => ({ ...prev, equipment: [] }));
    }
  };

  const loadExpensesData = async () => {
    try {
      const expenses = await apiService.getExpenses();
      // Enterprise-grade validation: ensure we always have an array
      const validatedExpenses = Array.isArray(expenses) ? expenses : [];
      setDashboardData(prev => ({ ...prev, expenses: validatedExpenses }));
    } catch (error) {
      console.log('Expenses data not available yet');
      setDashboardData(prev => ({ ...prev, expenses: [] }));
    }
  };

  const loadProjectsData = async () => {
    try {
      const projects = await apiService.getProjects();
      // Enterprise-grade validation: ensure we always have an array
      const validatedProjects = Array.isArray(projects) ? projects : [];
      setDashboardData(prev => ({ ...prev, projects: validatedProjects }));
    } catch (error) {
      console.log('Projects data not available yet');
      setDashboardData(prev => ({ ...prev, projects: [] }));
    }
  };

  const loadQuotesData = async () => {
    try {
      const quotes = await apiService.getQuotes();
      // Enterprise-grade validation: ensure we always have an array
      const validatedQuotes = Array.isArray(quotes) ? quotes : [];
      setDashboardData(prev => ({ ...prev, quotes: validatedQuotes }));
    } catch (error) {
      console.log('Quotes data not available yet');
      setDashboardData(prev => ({ ...prev, quotes: [] }));
    }
  };

  const loadPurchaseOrdersData = async () => {
    try {
      const purchaseOrders = await apiService.getPurchaseOrders();
      // Enterprise-grade validation: ensure we always have an array
      const validatedPurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
      setDashboardData(prev => ({ ...prev, purchaseOrders: validatedPurchaseOrders }));
    } catch (error) {
      console.log('Purchase orders data not available yet');
      setDashboardData(prev => ({ ...prev, purchaseOrders: [] }));
    }
  };

  // Enterprise-grade calculation with bulletproof type checking
  const calculateTotalExpenses = () => {
    try {
      // Defensive programming: ensure expenses is an array
      if (!Array.isArray(dashboardData.expenses)) {
        console.warn('Expenses data is not an array:', dashboardData.expenses);
        return 0;
      }

      return dashboardData.expenses.reduce((total, expense) => {
        // Additional validation for each expense item
        if (!expense || typeof expense !== 'object') {
          console.warn('Invalid expense item:', expense);
          return total;
        }

        const amount = parseFloat(expense.amount) || 0;
        return total + amount;
      }, 0);
    } catch (error) {
      console.error('Error calculating total expenses:', error);
      return 0;
    }
  };

  // Enterprise-grade monthly calculation with bulletproof type checking
  const calculateMonthlyExpenses = () => {
    try {
      // Defensive programming: ensure expenses is an array
      if (!Array.isArray(dashboardData.expenses)) {
        console.warn('Expenses data is not an array for monthly calculation:', dashboardData.expenses);
        return 0;
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      return dashboardData.expenses
        .filter(expense => {
          try {
            // Additional validation for each expense item
            if (!expense || typeof expense !== 'object' || !expense.date) {
              return false;
            }

            const expenseDate = new Date(expense.date);
            
            // Validate date
            if (isNaN(expenseDate.getTime())) {
              console.warn('Invalid expense date:', expense.date);
              return false;
            }

            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
          } catch (error) {
            console.warn('Error filtering expense:', expense, error);
            return false;
          }
        })
        .reduce((total, expense) => {
          try {
            const amount = parseFloat(expense.amount) || 0;
            return total + amount;
          } catch (error) {
            console.warn('Error processing expense amount:', expense, error);
            return total;
          }
        }, 0);
    } catch (error) {
      console.error('Error calculating monthly expenses:', error);
      return 0;
    }
  };

  // Enterprise-grade safe array access helper
  const safeArrayAccess = (array, filterFn = null) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('Expected array but received:', typeof array, array);
        return [];
      }

      if (filterFn && typeof filterFn === 'function') {
        return array.filter(filterFn);
      }

      return array;
    } catch (error) {
      console.error('Error in safe array access:', error);
      return [];
    }
  };

  // Enterprise-grade safe count helper
  const safeCount = (array, filterFn = null) => {
    return safeArrayAccess(array, filterFn).length;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Error Loading Dashboard</h2>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryButton} onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div style={styles.statsGrid}>
        {/* Equipment Stats */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Equipment</h3>
            <span style={styles.statIcon}>🚜</span>
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              {safeCount(dashboardData.equipment)}
            </div>
            <div style={styles.statSubtext}>
              {safeCount(dashboardData.equipment, eq => eq && eq.status === 'Active')} Active
            </div>
          </div>
        </div>

        {/* Expenses Stats */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Total Expenses</h3>
            <span style={styles.statIcon}>💰</span>
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              ${calculateTotalExpenses().toLocaleString()}
            </div>
            <div style={styles.statSubtext}>
              ${calculateMonthlyExpenses().toLocaleString()} This Month
            </div>
          </div>
        </div>

        {/* Projects Stats */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Projects</h3>
            <span style={styles.statIcon}>🏗️</span>
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              {safeCount(dashboardData.projects)}
            </div>
            <div style={styles.statSubtext}>
              {safeCount(dashboardData.projects, p => p && p.status === 'In Progress')} In Progress
            </div>
          </div>
        </div>

        {/* Quotes Stats */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Quotes</h3>
            <span style={styles.statIcon}>📋</span>
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              {safeCount(dashboardData.quotes)}
            </div>
            <div style={styles.statSubtext}>
              {safeCount(dashboardData.quotes, q => q && q.status === 'Pending')} Pending
            </div>
          </div>
        </div>

        {/* Purchase Orders Stats */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Purchase Orders</h3>
            <span style={styles.statIcon}>📦</span>
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              {safeCount(dashboardData.purchaseOrders)}
            </div>
            <div style={styles.statSubtext}>
              {safeCount(dashboardData.purchaseOrders, po => po && po.status === 'Pending')} Pending
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <h3 style={styles.statTitle}>Quick Actions</h3>
            <span style={styles.statIcon}>⚡</span>
          </div>
          <div style={styles.quickActions}>
            <button style={styles.quickActionBtn}>Add Expense</button>
            <button style={styles.quickActionBtn}>New Project</button>
            <button style={styles.quickActionBtn}>Create Quote</button>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div style={styles.recentActivity}>
        <h2 style={styles.sectionTitle}>Recent Activity</h2>
        <div style={styles.activityList}>
          {safeArrayAccess(dashboardData.expenses)
            .slice(0, 5)
            .map((expense, index) => (
              <div key={expense.id || index} style={styles.activityItem}>
                <span style={styles.activityIcon}>💰</span>
                <div style={styles.activityContent}>
                  <div style={styles.activityTitle}>
                    Expense: {expense.vendor || 'Unknown Vendor'}
                  </div>
                  <div style={styles.activitySubtitle}>
                    ${parseFloat(expense.amount || 0).toLocaleString()} - {expense.date || 'No date'}
                  </div>
                </div>
              </div>
            ))}
          
          {safeArrayAccess(dashboardData.projects)
            .slice(0, 3)
            .map((project, index) => (
              <div key={project.id || index} style={styles.activityItem}>
                <span style={styles.activityIcon}>🏗️</span>
                <div style={styles.activityContent}>
                  <div style={styles.activityTitle}>
                    Project: {project.name || 'Unnamed Project'}
                  </div>
                  <div style={styles.activitySubtitle}>
                    {project.status || 'No status'} - {project.client || 'No client'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// Enterprise-grade styles with responsive design
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#7f8c8d',
    fontWeight: '400'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e3f2fd',
    borderTop: '4px solid #2196f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    fontSize: '1.1rem',
    color: '#666',
    fontWeight: '500'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    textAlign: 'center'
  },
  errorTitle: {
    fontSize: '1.8rem',
    color: '#e74c3c',
    marginBottom: '16px'
  },
  errorText: {
    fontSize: '1.1rem',
    color: '#666',
    marginBottom: '24px'
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease'
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  statTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#495057',
    margin: 0
  },
  statIcon: {
    fontSize: '1.5rem'
  },
  statContent: {
    textAlign: 'left'
  },
  statNumber: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '4px'
  },
  statSubtext: {
    fontSize: '0.9rem',
    color: '#6c757d',
    fontWeight: '500'
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  quickActionBtn: {
    padding: '8px 16px',
    backgroundColor: '#e9ecef',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#495057',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  recentActivity: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '20px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  },
  activityIcon: {
    fontSize: '1.2rem',
    marginRight: '12px'
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '2px'
  },
  activitySubtitle: {
    fontSize: '0.9rem',
    color: '#6c757d'
  }
};

export default Dashboard;

