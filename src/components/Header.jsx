import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { ShieldCheck, Mail, CheckCircle2, History, RotateCcw, Languages } from 'lucide-react';

export const Header = () => {
  const { 
    dataPrincipal, 
    activeTab, 
    setActiveTab, 
    activeConsents, 
    resetToDefaults,
    language,
    setLanguage,
    INDIC_LANGUAGES,
    t
  } = useConsent();

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;

  return (
    <header className="header-nav">
      <nav className="nav-tabs">
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
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

        <div className="user-profile-badge" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <div className="user-avatar">
            {dataPrincipal.name.charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{dataPrincipal.name}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dataPrincipal.id}</span>
          </div>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          title="Reset demo data"
          onClick={resetToDefaults}
          style={{ gap: '6px' }}
        >
          <RotateCcw size={14} />
          {t('resetDemo')}
        </button>
      </div>
    </header>
  );
};
