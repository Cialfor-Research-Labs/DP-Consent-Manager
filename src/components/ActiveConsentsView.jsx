import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldAlert, 
  HelpCircle, 
  Lock 
} from 'lucide-react';

export const ActiveConsentsView = () => {
  const { 
    activeConsents, 
    revokeConsent, 
    setGrievanceTarget, 
    setGrievanceModalOpen,
    t 
  } = useConsent();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ACTIVE', 'REVOKED'
  const [revokingConsentId, setRevokingConsentId] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const filteredConsents = activeConsents.filter(c => {
    const matchesSearch = c.fiduciary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.consentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;
  const revokedCount = activeConsents.filter(c => c.status === 'REVOKED').length;

  const handleRevokeSubmit = (e) => {
    e.preventDefault();
    if (revokingConsentId) {
      revokeConsent(revokingConsentId, revokeReason || "Consent withdrawn by Data Principal");
      setRevokingConsentId(null);
      setRevokeReason('');
    }
  };

  return (
    <div className="active-consents-container">
      {/* Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <h1>{t('activeConsentsTitle')}</h1>
          <p>{t('activeConsentsSub')}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px 24px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('navActiveConsents')}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{activeCount}</div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px 24px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.76rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revoked</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{revokedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '10px 20px', flex: 1, maxWidth: '440px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search fiduciary, consent ID, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', fontSize: '0.92rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ALL')}
            style={{ padding: '8px 16px' }}
          >
            All Records ({activeConsents.length})
          </button>
          <button 
            className={`btn btn-sm ${filterStatus === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ACTIVE')}
            style={{ padding: '8px 16px' }}
          >
            Active ({activeCount})
          </button>
          <button 
            className={`btn btn-sm ${filterStatus === 'REVOKED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('REVOKED')}
            style={{ padding: '8px 16px' }}
          >
            Revoked ({revokedCount})
          </button>
        </div>
      </div>

      {/* Consent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '28px' }}>
        {filteredConsents.map((consent) => {
          const isActive = consent.status === 'ACTIVE';
          return (
            <div 
              key={consent.consentId} 
              className="glass-card"
              style={{ 
                borderLeft: isActive ? '4px solid #10b981' : '4px solid #ef4444',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                padding: '28px 32px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '2.2rem', width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {consent.fiduciaryLogo || '🏛️'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>
                        {consent.fiduciary}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {consent.fiduciaryCategory} • Notice {consent.noticeId}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isActive ? 'badge-active' : 'badge-revoked'}`}>
                    {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {consent.status}
                  </span>
                </div>

                {/* Purpose */}
                <p style={{ fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.6' }}>
                  {consent.purpose}
                </p>

                {/* Granted Attributes Tags */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    {t('grantedAttrs')} ({consent.grantedAttributes.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {consent.grantedAttributes.map((attr, idx) => (
                      <span key={idx} style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#6ee7b7', padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        ✓ {attr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata Row */}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
                  <span>{t('grantedOn')}: {new Date(consent.grantedOn).toLocaleDateString()}</span>
                  <span>Consent ID: <code style={{ color: '#60a5fa' }}>{consent.consentId}</code></span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                {isActive ? (
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    style={{ flex: 1, padding: '10px 16px', fontSize: '0.88rem' }}
                    onClick={() => setRevokingConsentId(consent.consentId)}
                  >
                    <XCircle size={15} />
                    {t('revokeBtn')}
                  </button>
                ) : (
                  <div style={{ flex: 1, fontSize: '0.85rem', color: '#f87171', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={15} />
                    Revoked on {consent.revokedOn ? new Date(consent.revokedOn).toLocaleDateString() : 'Previous date'}
                  </div>
                )}

                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '10px 16px', fontSize: '0.88rem' }}
                  onClick={() => {
                    setGrievanceTarget(consent);
                    setGrievanceModalOpen(true);
                  }}
                >
                  <HelpCircle size={15} />
                  {t('fileGrievanceBtn')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConsents.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>No Matching Consents Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Try adjusting your search criteria or switch scenario from the top simulator bar.
          </p>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {revokingConsentId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#ef4444' }}>
                <XCircle size={24} /> Statutory Consent Revocation
              </div>
              <button className="close-btn" onClick={() => setRevokingConsentId(null)}>✕</button>
            </div>

            <p style={{ color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.65' }}>
              Under Section 6(4) of the DPDP Act 2023, you are revoking consent ID <strong>{revokingConsentId}</strong>. 
              The Data Fiduciary will be immediately instructed to cease data processing and erase non-statutory records.
            </p>

            <form onSubmit={handleRevokeSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Revocation Reason / Feedback for Audit Log:
                </label>
                <select 
                  className="btn-secondary"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', background: '#1e293b', color: 'white' }}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                >
                  <option value="User exercised right to withdraw consent under DPDP Act">Exercising DPDP Right to Withdraw Consent</option>
                  <option value="Purpose of processing is completed">Purpose of processing is completed</option>
                  <option value="Privacy concerns regarding data sharing">Privacy concerns regarding data sharing</option>
                  <option value="No longer using this service/institution">No longer using this service/institution</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRevokingConsentId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Revocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
