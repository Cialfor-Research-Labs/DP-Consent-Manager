import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  FileCheck, 
  CheckCircle2, 
  History, 
  Scale, 
  Building2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { 
    activeTab, 
    setActiveTab, 
    activeConsents, 
    myPendingRequests 
  } = useConsent();

  const { isDataPrincipal, isDataFiduciary } = useAuth();

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;
  const pendingCount = myPendingRequests?.length || 0;

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    if (mobileOpen && setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const navItems = isDataPrincipal ? [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'incoming',
      label: 'Consent Requests',
      icon: FileCheck,
      badge: pendingCount > 0 ? { count: pendingCount, type: 'amber' } : null
    },
    {
      id: 'active',
      label: 'Active Consents',
      icon: CheckCircle2,
      badge: activeCount > 0 ? { count: activeCount, type: 'emerald' } : null
    },
    {
      id: 'rights',
      label: 'Data Rights',
      icon: Scale,
      badge: null
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      badge: null
    }
  ] : isDataFiduciary ? [
    {
      id: 'fiduciary',
      label: 'Fiduciary Console',
      icon: Building2,
      badge: null
    }
  ] : [];

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Sidebar Header with Branding */}
      <div className="sidebar-header">
        <div 
          className="sidebar-brand"
          onClick={() => isDataPrincipal && handleNavClick('dashboard')}
          title="DPDP Act 2023 Statutory Consent Portal"
        >
          <div className="sidebar-brand-icon">
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">DP Consent Manager</span>
              <span className="sidebar-brand-subtitle">DPDP Act 2023 Compliance</span>
            </div>
          )}
        </div>

        {/* Mobile Close Drawer Button */}
        {mobileOpen && (
          <button 
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close Navigation Drawer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        <div className="sidebar-nav-section-title">
          {!collapsed && <span>{isDataFiduciary ? 'FIDUCIARY OPERATIONS' : 'NAVIGATION'}</span>}
        </div>

        <div className="sidebar-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isDataFiduciary ? true : activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="sidebar-nav-icon-wrap">
                  <Icon size={18} />
                </div>
                {!collapsed && (
                  <>
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge && (
                      <span className={`sidebar-badge badge-${item.badge.type}`}>
                        {item.badge.count}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && (
                  <span className={`sidebar-badge-dot badge-${item.badge.type}`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-statutory-pill">
            <div className="status-dot-pulse" />
            <span>Sec 6 Statutory Gateway</span>
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={() => setCollapsed && setCollapsed(!collapsed)}
          className="sidebar-collapse-toggle-btn"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
