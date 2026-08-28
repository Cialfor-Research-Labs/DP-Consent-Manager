import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { Mail, ArrowRight, ShieldCheck, ShieldAlert, CheckCircle2, Lock, Paperclip, FileText, BadgeCheck } from 'lucide-react';

export const EmailSimulatorView = () => {
  const { currentScenario, dataPrincipal, setActiveTab, activeConsents, auditLogs } = useConsent();

  // Find if consent decision has already been recorded for this scenario notice
  const matchingConsent = activeConsents.find(c => c.noticeId === currentScenario.noticeId);
  const matchingLog = auditLogs.find(l => l.noticeId === currentScenario.noticeId || l.details?.includes(currentScenario.noticeId));

  let consentStateBadge = {
    label: 'ACTION REQUIRED — Consent Pending',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    icon: <Lock size={14} />
  };

  if (matchingConsent && matchingConsent.status === 'ACTIVE') {
    const displayConsentId = matchingConsent.consentId || matchingConsent.consent_id || 'CNST-2026-8381';
    consentStateBadge = {
      label: `CONSENT GRANTED ✓ • Consent ID: ${displayConsentId}`,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
      border: 'rgba(52, 211, 153, 0.3)',
      icon: <BadgeCheck size={14} />
    };
  } else if (matchingLog && matchingLog.action === 'CONSENT_DENIED') {
    consentStateBadge = {
      label: 'CONSENT DENIED ✕',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.3)',
      icon: <ShieldAlert size={14} />
    };
  } else if (matchingConsent && matchingConsent.status === 'REVOKED') {
    consentStateBadge = {
      label: 'CONSENT REVOKED 🚫',
      color: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.12)',
      border: 'rgba(156, 163, 175, 0.3)',
      icon: <ShieldAlert size={14} />
    };
  }

  return (
    <div className="email-sim-container">
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#c084fc', fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px' }}>
          <Mail size={14} />
          <span>ORIGINATING EMAIL SNAPSHOT MIRROR</span>
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>
          Exact Originating Consent Request Email
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '680px', margin: '0 auto' }}>
          This is an exact stored mirror/snapshot of the consent request email sent to <strong>{dataPrincipal.name}</strong> by <strong>{currentScenario.fiduciary}</strong>.
        </p>
      </div>

      <div className="email-window">
        <div className="email-window-bar">
          <div className="email-window-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Mail Client Mirror</span> • <span>{currentScenario.fiduciaryEmail}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              DKIM Signed • SPF Pass
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Ref: {currentScenario.noticeId}
            </span>
          </div>
        </div>

        <div className="email-content">
          <div className="email-header-fields">
            <div className="email-field-row">
              <span className="email-field-label">From:</span>
              <span className="email-field-val">
                <strong>{currentScenario.fiduciary}</strong> &lt;{currentScenario.fiduciaryEmail}&gt;
              </span>
            </div>
            <div className="email-field-row">
              <span className="email-field-label">To:</span>
              <span className="email-field-val">
                <strong>{dataPrincipal.name}</strong> &lt;{dataPrincipal.email}&gt;
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
                {currentScenario.emailSnapshot?.date || "Monday, August 24, 2026"}
              </span>
            </div>
            <div className="email-field-row">
              <span className="email-field-label">Status Mirror:</span>
              <span className="email-field-val">
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '3px 10px', 
                  borderRadius: '6px', 
                  background: consentStateBadge.bg, 
                  border: `1px solid ${consentStateBadge.border}`, 
                  color: consentStateBadge.color,
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  {consentStateBadge.icon}
                  {consentStateBadge.label}
                </span>
              </span>
            </div>
          </div>

          <div className="email-body-text" style={{ whiteSpace: 'pre-line' }}>
            {currentScenario.emailBody}
          </div>

          {/* Attachment Metadata Section */}
          <div style={{ margin: '20px 0', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#a5b4fc' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'white' }}>
                  Statutory_Privacy_Notice_{currentScenario.noticeId}.pdf
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  1.4 MB • Official DPDP Notice Snapshot Document
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '3px 8px', borderRadius: '6px' }}>
              Verified Attachment
            </span>
          </div>

          <div className="email-cta-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontWeight: 600, fontSize: '0.88rem' }}>
              <Lock size={16} />
              <span>Embedded Hyperlink: Click below to manage consent via secure request link</span>
            </div>

            <button 
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '12px', gap: '10px' }}
              onClick={() => {
                const targetUrl = `/request/${currentScenario.token}`;
                window.history.pushState({}, '', targetUrl);
                setActiveTab('incoming');
              }}
            >
              <span>Click here to manage consent</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <span>Secure Request Link:</span>
              <code style={{ color: '#c084fc', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                {window.location.origin}/request/{currentScenario.token}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
