import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConsentProvider, useConsent } from './context/ConsentContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthView } from './components/AuthView';
import { FiduciaryDashboardView } from './components/FiduciaryDashboardView';
import { EmailSimulatorView } from './components/EmailSimulatorView';
import { ConsentDecisionHub } from './components/ConsentDecisionHub';
import { PrincipalDashboardView } from './components/PrincipalDashboardView';
import { AccountProfileView } from './components/AccountProfileView';
import { ActiveConsentsView } from './components/ActiveConsentsView';
import { AuditLogView } from './components/AuditLogView';
import { DataRightsView } from './components/DataRightsView';
import { ConsentReceiptModal } from './components/ConsentReceiptModal';
import { GrievanceModal } from './components/GrievanceModal';
import { NominationModal } from './components/NominationModal';
import './styles/main.css';

const MainAppContent = () => {
  const { isAuthenticated, loading: authLoading, isDataFiduciary } = useAuth();
  const { activeTab, toastMessage, loading, apiError } = useConsent();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dp_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verifying secure session...</span>
        </div>
      </div>
    );
  }

  // Prevent direct access to protected frontend routes/views without authentication
  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Collapsible Enterprise Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        setCollapsed={toggleSidebarCollapse}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* App Main Area: Top Bar + Content */}
      <div className="app-main-area">
        <Header 
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebarCollapse={toggleSidebarCollapse}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        {loading && (
          <div style={{ background: 'var(--accent-soft)', borderBottom: '1px solid var(--border-highlight)', padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
            <div className="spinner-sm" style={{ border: '2px solid var(--border-highlight)', borderTopColor: 'var(--accent-primary)' }}></div>
            <span>Communicating with secure DPDP backend...</span>
          </div>
        )}

        {apiError && (
          <div style={{ background: 'var(--danger-bg)', borderBottom: '1px solid var(--danger-border)', padding: '6px 20px', textAlign: 'center', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
            {apiError}
          </div>
        )}

        <main className="main-wrapper">
          {isDataFiduciary ? (
            <FiduciaryDashboardView />
          ) : (
            <>
              {activeTab === 'dashboard' && <PrincipalDashboardView />}
              {activeTab === 'incoming' && <ConsentDecisionHub />}
              {activeTab === 'active' && <ActiveConsentsView />}
              {activeTab === 'rights' && <DataRightsView />}
              {activeTab === 'audit' && <AuditLogView />}
              {activeTab === 'profile' && <AccountProfileView />}
              {activeTab === 'email-sim' && <EmailSimulatorView />}
            </>
          )}
        </main>

        {!isDataFiduciary && (
          <>
            <ConsentReceiptModal />
            <GrievanceModal />
            <NominationModal />
          </>
        )}

        {toastMessage && (
          <div className="toast-container">
            <div className={`toast toast-${toastMessage.type}`}>
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ConsentProvider>
        <MainAppContent />
      </ConsentProvider>
    </AuthProvider>
  );
}
