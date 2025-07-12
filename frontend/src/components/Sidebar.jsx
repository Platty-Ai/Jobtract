import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  Receipt, 
  FolderOpen, 
  FileText, 
  ShoppingCart, 
  FileCheck,
  Building2,
  Fuel,
  FileBarChart,
  BarChart3
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/equipment', icon: Wrench, label: 'Equipment' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/tank-deposits', icon: Fuel, label: 'Tank Deposits' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/quotes', icon: FileText, label: 'Quotes' },
    { path: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
    { path: '/invoices', icon: FileBarChart, label: 'Invoicing' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/permits', icon: FileCheck, label: 'Permits Search' },
  ];

  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-blue-400 mr-3" />
          <h1 className="text-xl font-bold">JobTract</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">Contractor Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-400 text-xs text-center">
          © 2025 JobTract System
        </p>
      </div>
    </div>
  );
};

export default Sidebar;

