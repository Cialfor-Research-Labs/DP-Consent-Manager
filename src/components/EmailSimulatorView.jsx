import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { Mail, ArrowRight, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export const EmailSimulatorView = () => {
  const { currentScenario, dataPrincipal, setActiveTab } = useConsent();

  return (
    <div className="email-sim-container">
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
          Step 1: Student Email Inbox Simulation
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Below is a preview of the email received by <strong>{dataPrincipal.name}</strong> from <strong>{currentScenario.fiduciary}</strong>.
          Clicking the link below simulates API navigation into the Consent Manager.
        </p>
      </div>

      <div className="email-window">
        <div className="email-window-bar">
          <div className="email-window-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Mail Client • {currentScenario.fiduciaryEmail}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Ref: {currentScenario.noticeId}
          </div>
        </div>

        <div className="email-content">
          <div className="email-header-fields">
            <div className="email-field-row">
              <span className="email-field-label">From:</span>
              <span className="email-field-val">
                {currentScenario.fiduciary} &lt;{currentScenario.fiduciaryEmail}&gt;
              </span>
            </div>
            <div className="email-field-row">
              <span className="email-field-label">To:</span>
              <span className="email-field-val">
                {dataPrincipal.name} &lt;{dataPrincipal.email}&gt;
              </span>
            </div>
            <div className="email-field-row">
              <span className="email-field-label">Subject:</span>
              <span className="email-field-val" style={{ fontWeight: 700, color: '#60a5fa' }}>
                {currentScenario.emailSubject}
              </span>
            </div>
            <div className="email-field-row">
              <span className="email-field-label">Date:</span>
              <span className="email-field-val" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="email-body-text">
            {currentScenario.emailBody}
          </div>

          <div className="email-cta-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontWeight: 600, fontSize: '0.88rem' }}>
              <Lock size={16} />
              <span>Official Privacy Notice & Granular Consent Gateway</span>
            </div>

            <button 
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '12px' }}
              onClick={() => setActiveTab('incoming')}
            >
              <span>Review & Configure Consent</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Redirects to encrypted Data Principal portal • Powered by DPDP Act 2023 Rules
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
