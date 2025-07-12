import React, { useState } from 'react';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('financial');

  const reportTypes = [
    { id: 'financial', name: 'Financial Summary', icon: '💰' },
    { id: 'project', name: 'Project Status', icon: '🏗️' },
    { id: 'equipment', name: 'Equipment Usage', icon: '🚜' },
    { id: 'expense', name: 'Expense Analysis', icon: '📊' },
    { id: 'client', name: 'Client Reports', icon: '👥' },
    { id: 'tax', name: 'Tax Documents', icon: '📋' }
  ];

  const sampleData = {
    financial: {
      totalRevenue: 850000,
      totalExpenses: 425000,
      netProfit: 425000,
      profitMargin: 50
    },
    project: {
      activeProjects: 3,
      completedProjects: 12,
      totalBudget: 2000000,
      totalSpent: 305000
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Reports & Analytics</h1>
        <button style={styles.exportButton}>📥 Export Report</button>
      </div>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Report Types</h3>
          {reportTypes.map(report => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              style={{
                ...styles.reportButton,
                ...(selectedReport === report.id ? styles.reportButtonActive : {})
              }}
            >
              <span style={styles.reportIcon}>{report.icon}</span>
              {report.name}
            </button>
          ))}
        </div>

        <div style={styles.mainContent}>
          {selectedReport === 'financial' && (
            <div>
              <h2 style={styles.reportTitle}>Financial Summary</h2>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Total Revenue</h3>
                  <div style={styles.statNumber}>
                    ${sampleData.financial.totalRevenue.toLocaleString()}
                  </div>
                  <div style={styles.statChange}>+12% from last month</div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Total Expenses</h3>
                  <div style={styles.statNumber}>
                    ${sampleData.financial.totalExpenses.toLocaleString()}
                  </div>
                  <div style={styles.statChange}>+5% from last month</div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Net Profit</h3>
                  <div style={styles.statNumber}>
                    ${sampleData.financial.netProfit.toLocaleString()}
                  </div>
                  <div style={styles.statChange}>+18% from last month</div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Profit Margin</h3>
                  <div style={styles.statNumber}>
                    {sampleData.financial.profitMargin}%
                  </div>
                  <div style={styles.statChange}>+3% from last month</div>
                </div>
              </div>
              
              <div style={styles.chartPlaceholder}>
                <h3>Revenue vs Expenses Chart</h3>
                <p>Chart visualization would go here</p>
              </div>
            </div>
          )}

          {selectedReport === 'project' && (
            <div>
              <h2 style={styles.reportTitle}>Project Status Report</h2>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Active Projects</h3>
                  <div style={styles.statNumber}>{sampleData.project.activeProjects}</div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Completed Projects</h3>
                  <div style={styles.statNumber}>{sampleData.project.completedProjects}</div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Total Budget</h3>
                  <div style={styles.statNumber}>
                    ${sampleData.project.totalBudget.toLocaleString()}
                  </div>
                </div>
                <div style={styles.statCard}>
                  <h3 style={styles.statTitle}>Total Spent</h3>
                  <div style={styles.statNumber}>
                    ${sampleData.project.totalSpent.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div style={styles.chartPlaceholder}>
                <h3>Project Timeline & Budget Analysis</h3>
                <p>Project progress charts would go here</p>
              </div>
            </div>
          )}

          {!['financial', 'project'].includes(selectedReport) && (
            <div style={styles.comingSoon}>
              <h2 style={styles.reportTitle}>
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </h2>
              <div style={styles.comingSoonContent}>
                <span style={styles.comingSoonIcon}>🚧</span>
                <h3>Coming Soon</h3>
                <p>This report type is currently under development.</p>
              </div>
            </div>
          )}
        </div>
      </div>
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
  exportButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  content: {
    display: 'flex',
    gap: '24px'
  },
  sidebar: {
    width: '250px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    height: 'fit-content'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '16px'
  },
  reportButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: '8px',
    textAlign: 'left'
  },
  reportButtonActive: {
    backgroundColor: '#dbeafe',
    color: '#1e40af'
  },
  reportIcon: {
    fontSize: '18px'
  },
  mainContent: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },
  reportTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
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
    color: '#1e293b',
    marginBottom: '4px'
  },
  statChange: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: '500'
  },
  chartPlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    border: '2px dashed #d1d5db'
  },
  comingSoon: {
    textAlign: 'center'
  },
  comingSoonContent: {
    padding: '60px 40px'
  },
  comingSoonIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px'
  }
};

export default Reports;

