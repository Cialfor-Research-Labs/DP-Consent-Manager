import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { translatePurpose, translateAttributeName, translateAttributeDesc } from '../i18n/translations';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileText, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  Database, 
  SlidersHorizontal 
} from 'lucide-react';

export const ConsentDecisionHub = () => {
  const { 
    currentScenario, 
    selectedAttributes, 
    toggleAttribute, 
    grantCurrentConsent, 
    denyCurrentConsent, 
    setGrievanceModalOpen, 
    setGrievanceTarget,
    language,
    t 
  } = useConsent();

  const [note, setNote] = useState('');
  const [denying, setDenying] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  // Count active toggled attributes
  const selectedCount = Object.values(selectedAttributes).filter(Boolean).length;
  const totalCount = currentScenario.attributes.length;

  const handleSelectAll = (val) => {
    currentScenario.attributes.forEach(attr => {
      if (!attr.required) {
        if ((val && !selectedAttributes[attr.id]) || (!val && selectedAttributes[attr.id])) {
          toggleAttribute(attr.id);
        }
      }
    });
  };

  const handleDenySubmit = (e) => {
    e.preventDefault();
    denyCurrentConsent(denyReason || "Data Principal declined request");
    setDenying(false);
    setDenyReason('');
  };

  return (
    <div className="decision-hub-container">
      {/* Top Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {currentScenario.domain && (
              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', fontWeight: 700 }}>
                {currentScenario.domain} Sector
              </span>
            )}
            <span className="badge badge-notice">{t('noticeId')}: {currentScenario.noticeId}</span>
            <span className="badge badge-verified">
              <CheckCircle2 size={13} /> {t('dpdpVerified')}
            </span>
          </div>
          <h1>{t('decisionHubTitle')}</h1>
          <p>{t('decisionHubSub')}</p>
        </div>

        <div style={{ textAlign: 'right', background: 'rgba(99, 102, 241, 0.08)', padding: '16px 24px', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            {t('selectedScope')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
            {selectedCount} <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {totalCount} {t('attributesSelected')}</span>
          </div>
        </div>
      </div>

      <div className="decision-hub-grid">
        {/* Main Form Column */}
        <div className="glass-card">
          {/* Fiduciary Header */}
          <div className="fiduciary-header-card">
            <div className="fiduciary-icon-lg">
              {currentScenario.fiduciaryLogo}
            </div>
            <div className="fiduciary-meta">
              <h2>{currentScenario.fiduciary}</h2>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {currentScenario.fiduciaryCategory} • Official Data Fiduciary
              </div>
              <div className="fiduciary-tags">
                <span className="badge badge-verified">
                  <Shield size={13} /> Verified Identity
                </span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {currentScenario.legalBasis}
                </span>
              </div>
            </div>
          </div>

          {/* Purpose Box */}
          <div className="purpose-box">
            <div className="purpose-box-title">
              <FileText size={16} /> {t('specifiedPurpose')}
            </div>
            <div className="purpose-box-desc">
              {translatePurpose(currentScenario.purpose, language)}
            </div>
          </div>

          {/* Granular Attribute Selection */}
          <div className="section-title-group">
            <h3>
              <SlidersHorizontal size={20} style={{ color: '#818cf8' }} />
              {t('granularAttributes')}
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectAll(true)}
              >
                {t('selectAllOptional')}
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectAll(false)}
              >
                {t('deselectAllOptional')}
              </button>
            </div>
          </div>

          <div className="attribute-cards-list">
            {currentScenario.attributes.map((attr) => {
              const isSelected = !!selectedAttributes[attr.id];
              return (
                <div 
                  key={attr.id}
                  className={`attribute-card ${attr.required ? 'required' : ''} ${isSelected ? 'selected' : ''}`}
                >
                  <div className="attribute-left">
                    <div className="attribute-icon">
                      <Lock size={18} />
                    </div>
                    <div className="attribute-info">
                      <h4>
                        {translateAttributeName(attr.name, language)}
                        {attr.category && (
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, marginLeft: '8px' }}>
                            {attr.category}
                          </span>
                        )}
                        {attr.required && <span className="tag-required">{t('mandatoryBadge')}</span>}
                        {attr.sensitive && <span className="tag-sensitive">{t('sensitiveBadge')}</span>}
                      </h4>
                      <p>{translateAttributeDesc(attr.description, language)}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label className="switch">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        disabled={attr.required}
                        onChange={() => toggleAttribute(attr.id)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Remarks */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {t('optionalRemarkLabel')}
            </label>
            <input 
              type="text"
              className="btn-secondary"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '12px', fontSize: '0.92rem' }}
              placeholder={t('optionalRemarkPlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-primary"
              style={{ flex: 2, padding: '15px 28px', fontSize: '1rem' }}
              onClick={() => grantCurrentConsent(note)}
            >
              <CheckCircle2 size={20} />
              <span>{t('grantConsentBtn')} ({selectedCount} {t('attributesSelected')})</span>
            </button>

            <button 
              className="btn btn-outline-danger"
              style={{ flex: 1, padding: '15px 24px', fontSize: '0.95rem' }}
              onClick={() => setDenying(true)}
            >
              <XCircle size={20} />
              <span>{t('denyConsentBtn')}</span>
            </button>
          </div>
        </div>

        {/* Sidebar Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card sidebar-info-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <Shield size={18} style={{ color: '#818cf8' }} /> {t('noticeComplianceTitle')}
            </h3>

            <div className="info-row">
              <span className="info-label">{t('retentionPeriod')}</span>
              <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <Clock size={15} style={{ color: '#f59e0b' }} />
                {currentScenario.validityPeriod}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">{t('dataStorageRegion')}</span>
              <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <Database size={15} style={{ color: '#10b981' }} />
                {currentScenario.dataRegion}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">{t('dpoOfficer')}</span>
              <span className="info-value" style={{ marginTop: '2px' }}>{currentScenario.dpoName}</span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>{currentScenario.dpoEmail}</span>
            </div>

            <div className="info-row" style={{ borderBottom: 'none' }}>
              <span className="info-label">{t('rightToRevoke')}</span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.55', marginTop: '4px' }}>
                {t('revokeStatutoryText')}
              </span>
            </div>

            <button 
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '8px', padding: '10px' }}
              onClick={() => {
                setGrievanceTarget(currentScenario);
                setGrievanceModalOpen(true);
              }}
            >
              <HelpCircle size={15} />
              {t('inquireDpoBtn')}
            </button>
          </div>

          <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '20px 24px' }}>
            <div style={{ fontSize: '0.85rem', color: '#a5b4fc', display: 'flex', gap: '12px', lineHeight: '1.5' }}>
              <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {t('signedArtifactNotice')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deny Confirmation Modal */}
      {denying && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title" style={{ color: '#ef4444' }}>
                <XCircle size={24} /> Decline Consent Request
              </div>
              <button className="close-btn" onClick={() => setDenying(false)}>✕</button>
            </div>

            <p style={{ color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.6' }}>
              Are you sure you want to decline consent to <strong>{currentScenario.fiduciary}</strong>? The fiduciary will be notified that consent was declined.
            </p>

            <form onSubmit={handleDenySubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Reason for Declining (Optional):
                </label>
                <textarea 
                  className="btn-secondary"
                  style={{ width: '100%', height: '90px', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', resize: 'none' }}
                  placeholder="e.g. Unnecessary data requirements or lack of clarity on processing duration."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDenying(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Decline Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
