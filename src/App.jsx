import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConsentProvider, useConsent } from './context/ConsentContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthView } from './components/AuthView';
import { ConsentLandingView } from './components/ConsentLandingView';
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

/**
 * Extract a consent token from the current URL path.
 * Supports: /consent/<token>  and  /request/<token>
 */
function extractConsentToken() {
  try {
    const path = window.location.pathname;
    const match = path.match(/^\/(consent|request)\/([^/?#]+)/);
    if (match) return match[2];
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('consent_token');
  } catch {
    return null;
  }
}

const MainAppContent = () => {
  const { isAuthenticated, loading: authLoading, isDataFiduciary } = useAuth();
  const { activeTab, toastMessage, loading, apiError, setActiveTab, openRequestReview } = useConsent();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Consent link token from URL (e.g. /consent/<token>)
  const [consentToken, setConsentToken] = useState(() => extractConsentToken());
  // When true, we show the full AuthView (after user clicks "Log in" on landing page)
  const [showingAuthFromLanding, setShowingAuthFromLanding] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dp_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  /**
   * When user clicks "Log in" on the landing page, remember the token and
   * show the auth view. After login, we'll redirect to the consent hub.
   */
  const handleProceedToLogin = (token) => {
    if (token) {
      try {
        sessionStorage.setItem('dp_pending_consent_token', token);
      } catch {}
    }
    setShowingAuthFromLanding(true);
  };

  /**
   * After a successful login, check if there's a pending consent token
   * and navigate to that consent request automatically.
   */
  useEffect(() => {
    if (isAuthenticated && !isDataFiduciary) {
      const pendingToken = (() => {
        try { return sessionStorage.getItem('dp_pending_consent_token'); } catch { return null; }
      })();
      if (pendingToken) {
        try { sessionStorage.removeItem('dp_pending_consent_token'); } catch {}
        // Clear the URL without reload
        try {
          if (window.location.pathname !== '/') {
            window.history.replaceState({}, '', '/');
          }
        } catch {}
        setConsentToken(null);
        setShowingAuthFromLanding(false);
        // Open the specific consent request for review
        if (openRequestReview) {
          openRequestReview(pendingToken);
        } else if (setActiveTab) {
          setActiveTab('incoming');
        }
      } else if (consentToken && isAuthenticated) {
        // User was already logged in and opened the link
        try {
          if (window.location.pathname !== '/') {
            window.history.replaceState({}, '', '/');
          }
        } catch {}
        const tokenToOpen = consentToken;
        setConsentToken(null);
        if (openRequestReview) {
          openRequestReview(tokenToOpen);
        } else if (setActiveTab) {
          setActiveTab('incoming');
        }
      }
    }
  }, [isAuthenticated, isDataFiduciary, consentToken, setActiveTab, openRequestReview]);

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

  // ── CONSENT LINK FLOW ──────────────────────────────────────────────────────
  // If the URL has a consent token and the user is NOT yet authenticated,
  // take the user directly to the login page (AuthView) with the consent request context.
  if (consentToken && !isAuthenticated) {
    return <AuthView consentToken={consentToken} />;
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
