import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { ShieldCheck, Mail, CheckCircle2, History, RotateCcw } from 'lucide-react';

export const Header = () => {
  const { 
    dataPrincipal, 
    activeTab, 
    setActiveTab, 
    activeConsents, 
    resetToDefaults 
  } = useConsent();

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;

  return (
    <header className="header-nav">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <div className="brand-title">Data Principal Consent Manager</div>
          <div className="brand-subtitle">DPDP Act 2023 Compliant • Individual Privacy Control</div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button 
          className={`nav-tab-btn ${activeTab === 'email-sim' ? 'active' : ''}`}
          onClick={() => setActiveTab('email-sim')}
        >
          <Mail size={16} />
          Incoming Request
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          <ShieldCheck size={16} />
          Decision Hub
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <CheckCircle2 size={16} />
          Active Consents ({activeCount})
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} />
          Audit Trail
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="user-profile-badge">
          <div className="user-avatar">
            {dataPrincipal.name.charAt(0)}
          </div>
          <div className="user-info-text">
            <span className="user-name">{dataPrincipal.name}</span>
            <span className="user-subtext">{dataPrincipal.id}</span>
          </div>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          title="Reset demo data"
          onClick={resetToDefaults}
          style={{ gap: '6px' }}
        >
          <RotateCcw size={14} />
          Reset Demo
        </button>
      </div>
    </header>
  );
};
