import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldAlert, 
  HelpCircle, 
  Building2,
  GraduationCap,
  HeartPulse,
  CreditCard,
  Landmark,
  Calendar,
  Clock,
  Filter
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
  const [revokeReason, setRevokeReason] = useState('User exercised right to withdraw consent under DPDP Act');

  const filteredConsents = activeConsents.filter(c => {
    const fid = (c.fiduciary || c.fiduciary_name || '').toLowerCase();
    const purp = (c.purpose || '').toLowerCase();
    const cid = (c.consentId || c.consent_id || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = fid.includes(term) || purp.includes(term) || cid.includes(term);
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;
  const revokedCount = activeConsents.filter(c => c.status === 'REVOKED').length;

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (revokingConsentId) {
      const idToRevoke = revokingConsentId;
      const reason = revokeReason || "Consent withdrawn by Data Principal under DPDP Act Sec 6(4)";
      setRevokingConsentId(null);
      await revokeConsent(idToRevoke, reason);
    }
  };

  const getSectorIcon = (domain, fiduciaryName = '') => {
    const d = (domain || '').toLowerCase();
    const f = (fiduciaryName || '').toLowerCase();
    if (d.includes('edu') || f.includes('institute') || f.includes('university') || f.includes('school')) {
      return <GraduationCap size={22} className="text-blue-600" />;
    }
    if (d.includes('health') || f.includes('hospital') || f.includes('care')) {
      return <HeartPulse size={22} className="text-rose-600" />;
    }
    if (d.includes('fintech') || f.includes('lending') || f.includes('loan') || f.includes('payflex')) {
      return <CreditCard size={22} className="text-purple-600" />;
    }
    if (d.includes('bank') || f.includes('bank')) {
      return <Landmark size={22} className="text-emerald-600" />;
    }
    return <Building2 size={22} className="text-slate-600" />;
  };

  const getStatusBadge = (status) => {
    const st = (status || 'ACTIVE').toUpperCase();
    if (st === 'ACTIVE') {
      return (
        <span className="badge badge-active flex-center gap-1">
          <CheckCircle2 size={13} /> ACTIVE
        </span>
      );
    }
    if (st === 'REVOKED' || st === 'WITHDRAWN') {
      return (
        <span className="badge badge-revoked flex-center gap-1">
          <XCircle size={13} /> WITHDRAWN
        </span>
      );
    }
    if (st === 'EXPIRED') {
      return (
        <span className="badge badge-notice flex-center gap-1">
          <Clock size={13} /> EXPIRED
        </span>
      );
    }
    return (
      <span className="badge badge-notice flex-center gap-1">
        ● {st}
      </span>
    );
  };

  return (
    <div className="active-consents-container">
      {/* Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-verified">
              <CheckCircle2 size={13} /> Section 6 Active Consent Registry
            </span>
          </div>
          <h1>Active Consents & Fiduciary Permissions</h1>
          <p>
            Review all currently granted data access authorizations, track statutory validity periods, and exercise your right to withdraw consent at any time.
          </p>
        </div>

        <div className="active-stats-row">
          <div className="stat-metric-pill stat-emerald">
            <span className="stat-metric-label">Active</span>
            <span className="stat-metric-val">{activeCount}</span>
          </div>

          <div className="stat-metric-pill stat-rose">
            <span className="stat-metric-label">Withdrawn</span>
            <span className="stat-metric-val">{revokedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="consent-filter-toolbar">
        <div className="search-input-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            placeholder="Search fiduciary name, consent ID, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-text-input"
          />
        </div>

        <div className="status-filter-pills">
          <button 
            type="button"
            className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All ({activeConsents.length})
          </button>
          <button 
            type="button"
            className={`btn btn-sm ${filterStatus === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ACTIVE')}
          >
            Active ({activeCount})
          </button>
          <button 
            type="button"
            className={`btn btn-sm ${filterStatus === 'REVOKED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('REVOKED')}
          >
            Withdrawn ({revokedCount})
          </button>
        </div>
      </div>

      {/* Grid of Consents */}
      <div className="consents-cards-grid">
        {filteredConsents.map((consent, cardIdx) => {
          const isActive = consent.status === 'ACTIVE';
          const consentId = consent.consentId || consent.consent_id || `CNST-REC-${cardIdx}`;
          const grantedAttrs = Array.isArray(consent.grantedAttributes)
            ? consent.grantedAttributes
            : (typeof consent.granted_attributes === 'string' ? JSON.parse(consent.granted_attributes || '[]') : (consent.granted_attributes || []));
          const noticeId = consent.noticeId || consent.notice_id || 'NTC-GENERAL';
          const grantedDate = consent.grantedOn || consent.granted_on;
          const expiresDate = consent.expiresOn || consent.expires_on;

          return (
            <div 
              key={consentId} 
              className={`glass-card consent-record-card ${isActive ? 'card-border-active' : 'card-border-revoked'}`}
            >
              <div>
                <div className="record-card-header">
                  <div className="record-fiduciary-identity">
                    <div className="sector-icon-box">
                      {getSectorIcon(consent.domain, consent.fiduciary || consent.fiduciary_name)}
                    </div>
                    <div>
                      <h3 className="record-fiduciary-title">
                        {consent.fiduciary || consent.fiduciary_name}
                      </h3>
                      <span className="record-fiduciary-sub">
                        {consent.fiduciaryCategory || consent.fiduciary_category || 'Corporate Entity'} • Notice {noticeId}
                      </span>
                    </div>
                  </div>

                  {getStatusBadge(consent.status)}
                </div>

                {/* Purpose */}
                <p className="record-purpose-text">
                  {consent.purpose}
                </p>

                {/* Granted Attributes Tags */}
                <div className="granted-attrs-section">
                  <span className="granted-attrs-label">
                    Authorized Data Fields ({grantedAttrs.length}):
                  </span>
                  <div className="attrs-pills-wrap">
                    {grantedAttrs.map((attr, idx) => (
                      <span key={idx} className="attr-pill-granted">
                        ✓ {attr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="record-meta-footer">
                  <span>Granted: {grantedDate ? new Date(grantedDate).toLocaleDateString() : 'Active'}</span>
                  {expiresDate && <span>Expires: {new Date(expiresDate).toLocaleDateString()}</span>}
                  <span>Consent ID: <code className="code-accent">{consentId}</code></span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="record-actions-row">
                {isActive ? (
                  <button 
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setRevokingConsentId(consentId)}
                  >
                    <XCircle size={15} />
                    <span>Withdraw Consent</span>
                  </button>
                ) : (
                  <div className="revoked-info-tag">
                    <XCircle size={15} />
                    <span>Withdrawn under DPDP Sec 6(4)</span>
                  </div>
                )}

                <button 
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setGrievanceTarget(consent);
                    setGrievanceModalOpen(true);
                  }}
                >
                  <HelpCircle size={15} />
                  <span>File Grievance</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConsents.length === 0 && (
        <div className="glass-card state-card-empty">
          <ShieldAlert size={44} className="text-slate-400" style={{ margin: '0 auto 12px auto' }} />
          <h3>No Matching Consents Found</h3>
          <p>
            No active or historical consents match your search filter. New consents granted from the Dashboard will automatically appear here.
          </p>
        </div>
      )}

      {/* Revocation Confirmation Modal */}
      {revokingConsentId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title text-red-500">
                <XCircle size={22} />
                <span>Statutory Consent Withdrawal (Sec 6(4))</span>
              </div>
              <button className="close-btn" onClick={() => setRevokingConsentId(null)}>✕</button>
            </div>

            <p className="modal-lead-text">
              Under Section 6(4) of the Digital Personal Data Protection Act 2023, you have the absolute legal right to withdraw consent for ID <strong>{revokingConsentId}</strong>. 
              The Data Fiduciary will be officially notified to immediately cease processing.
            </p>

            <form onSubmit={handleRevokeSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="remark-label">
                  Reason for Withdrawal (Recorded in Audit Log):
                </label>
                <select 
                  className="input-text-field"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                >
                  <option value="User exercised right to withdraw consent under DPDP Act">Exercising statutory right to withdraw consent</option>
                  <option value="Purpose of data processing has concluded">Purpose of processing has concluded</option>
                  <option value="Privacy concerns regarding data sharing">Privacy concerns regarding data retention</option>
                  <option value="No longer using services of this institution">No longer using services of this institution</option>
                </select>
              </div>

              <div className="modal-footer-row">
                <button type="button" className="btn btn-secondary" onClick={() => setRevokingConsentId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Statutory Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
