import React, { useState, useEffect, useRef } from 'react';
import { useConsent } from '../context/ConsentContext';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  PanelLeftClose, 
  PanelLeft, 
  Languages, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  LayoutDashboard, 
  ChevronDown 
} from 'lucide-react';

export const Header = ({ sidebarCollapsed, toggleSidebarCollapse, setMobileSidebarOpen }) => {
  const { 
    dataPrincipal, 
    activeTab, 
    setActiveTab, 
    language, 
    setLanguage, 
    INDIC_LANGUAGES, 
    theme, 
    toggleTheme 
  } = useConsent();

  const { user, isDataPrincipal, isDataFiduciary, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Derive human-readable page title and breadcrumb
  const getPageMeta = () => {
    if (isDataFiduciary) {
      return {
        section: 'Enterprise Fiduciary',
        title: 'Consent Control Console'
      };
    }
    switch (activeTab) {
      case 'dashboard':
        return { section: 'Portal', title: 'Data Principal Dashboard' };
      case 'incoming':
        return { section: 'Consent Notices', title: 'Pending Consent Requests' };
      case 'active':
        return { section: 'Consent Registry', title: 'Active Consents & Permissions' };
      case 'rights':
        return { section: 'Statutory Rights', title: 'Data Rights & Grievance Portal' };
      case 'audit':
        return { section: 'DPDP Sec 6', title: 'Cryptographic Audit Trail' };
      case 'profile':
        return { section: 'Settings', title: 'Account & Identity Profile' };
      case 'email-sim':
        return { section: 'Testing Sandbox', title: 'Gmail Notice Simulator' };
      default:
        return { section: 'Portal', title: 'Consent Manager' };
    }
  };

  const pageMeta = getPageMeta();
  const displayName = user?.name || dataPrincipal?.name || 'User';
  const displayEmail = user?.email || dataPrincipal?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="header-nav">
      {/* Left Area: Toggle & Breadcrumb Title */}
      <div className="header-left-area">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="header-icon-btn mobile-menu-btn"
          onClick={() => setMobileSidebarOpen && setMobileSidebarOpen(true)}
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop Sidebar Collapse Toggle Button */}
        <button
          type="button"
          className="header-icon-btn desktop-sidebar-toggle-btn"
          onClick={() => toggleSidebarCollapse && toggleSidebarCollapse()}
          aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <PanelLeft size={19} /> : <PanelLeftClose size={19} />}
        </button>

        {/* Breadcrumb & Title */}
        <div className="header-breadcrumb-area">
          <span className="header-breadcrumb-section">{pageMeta.section}</span>
          <span className="header-breadcrumb-divider">/</span>
          <h1 className="header-page-title">{pageMeta.title}</h1>
        </div>
      </div>

      {/* Right Area: Controls & Profile Dropdown */}
      <div className="header-right-controls">
        {/* Indic Language Selector - DPDP Sec 5(3) */}
        <div 
          className="lang-selector-wrapper" 
          title="DPDP Act 2023 Sec 5(3) Mandate: Access in all 22 8th Schedule Indic Languages"
        >
          <div className="lang-selector-btn">
            <Languages size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select-input"
              aria-label="Select Indic Language"
            >
              {INDIC_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button 
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Color Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Profile Dropdown Container */}
        {user ? (
          <div className="profile-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className={`profile-pill-btn ${profileDropdownOpen ? 'active' : ''}`}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
              title="Open Account Menu"
            >
              <div className="user-avatar-sm">
                {initial}
              </div>
              <span className="user-pill-name">{displayName.split(' ')[0]}</span>
              <ChevronDown 
                size={14} 
                className={`profile-chevron ${profileDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu Card */}
            {profileDropdownOpen && (
              <div className="profile-dropdown-card" role="menu">
                {/* User Summary Header */}
                <div className="dropdown-user-header">
                  <div className="dropdown-avatar">
                    {initial}
                  </div>
                  <div className="dropdown-user-details">
                    <span className="dropdown-name">{displayName}</span>
                    <span className="dropdown-email" title={displayEmail}>{displayEmail}</span>
                    <div className="dropdown-badges-row">
                      <span className={`role-badge ${isDataFiduciary ? 'role-fiduciary' : 'role-principal'}`}>
                        {isDataFiduciary ? 'DATA FIDUCIARY' : 'DATA PRINCIPAL'}
                      </span>
                      {user?.data_principal_id && (
                        <span className="id-badge">{user.data_principal_id}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {/* Dropdown Navigation Actions */}
                <div className="dropdown-menu-list">
                  {isDataPrincipal && (
                    <>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveTab('dashboard');
                          setProfileDropdownOpen(false);
                        }}
                      >
                        <LayoutDashboard size={15} />
                        <span>Dashboard</span>
                      </button>

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => {
                          setActiveTab('profile');
                          setProfileDropdownOpen(false);
                        }}
                      >
                        <User size={15} />
                        <span>Account Profile & KYC</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="dropdown-divider" />

                {/* Logout Action */}
                <div className="dropdown-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="dropdown-logout-btn"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
