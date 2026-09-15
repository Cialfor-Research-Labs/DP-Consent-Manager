import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, CheckCircle2, History, Languages, Sun, Moon, LogOut, Building2 } from 'lucide-react';

export const Header = () => {
  const { 
    dataPrincipal, 
    activeTab, 
    setActiveTab, 
    activeConsents, 
    language,
    setLanguage,
    INDIC_LANGUAGES,
    t,
    theme,
    toggleTheme
  } = useConsent();

  const { user, isDataPrincipal, isDataFiduciary, logout } = useAuth();

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;
  const displayName = user?.name || dataPrincipal?.name || 'User';
  const displayEmail = user?.email || dataPrincipal?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="header-nav">
      <nav className="nav-tabs">
        {isDataPrincipal && (
          <>
            <button 
              className={`nav-tab-btn ${activeTab === 'email-sim' ? 'active' : ''}`}
              onClick={() => setActiveTab('email-sim')}
            >
              <Mail size={16} />
              {t('navIncoming')}
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('incoming')}
            >
              <ShieldCheck size={16} />
              {t('navDecisionHub')}
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <CheckCircle2 size={16} />
              {t('navActiveConsents')} ({activeCount})
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <History size={16} />
              {t('navAuditTrail')}
            </button>

            <button 
              className={`nav-tab-btn ${activeTab === 'rights' ? 'active' : ''}`}
              onClick={() => setActiveTab('rights')}
            >
              <ShieldCheck size={16} style={{ color: '#34d399' }} />
              {t('navDataRights')}
            </button>
          </>
        )}

        {isDataFiduciary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', color: '#c084fc', fontWeight: 700, fontSize: '0.88rem' }}>
            <Building2 size={18} />
            <span>Data Fiduciary Control Console</span>
          </div>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Indic Language Selector - DPDP Sec 5(3) Mandate */}
        <div className="lang-selector-wrapper" title="DPDP Act 2023 Sec 5(3) Mandate: Mandatory access in all 22 8th Schedule Indic Languages">
          <div className="lang-selector-btn">
            <Languages size={16} style={{ color: '#a855f7' }} />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="lang-select-input"
            >
              {INDIC_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Color Mode / Theme Toggle */}
        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Color Theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User Profile Badge */}
        <div className="user-profile-badge" style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="user-avatar" style={{ background: isDataFiduciary ? 'linear-gradient(135deg, #a855f7, #6366f1)' : undefined }}>
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              <span style={{
                fontSize: '0.66rem',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 700,
                background: isDataFiduciary ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: isDataFiduciary ? '#c084fc' : '#818cf8'
              }}>
                {isDataFiduciary ? 'FIDUCIARY' : 'PRINCIPAL'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {displayEmail}
            </span>
          </div>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={logout}
            title="Sign Out of Consent Manager"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '6px 8px',
              color: '#f87171',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px',
              transition: 'background 0.2s ease'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
