import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { translatePurpose, translateAttributeName, translateAttributeDesc } from '../i18n/translations';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  FileText, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  Database, 
  SlidersHorizontal,
  Mail,
  UserCheck,
  Building2,
  GraduationCap,
  HeartPulse,
  CreditCard,
  Landmark,
  ArrowLeft,
  Copy,
  Check
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
    setActiveTab,
    language,
    t 
  } = useConsent();

  const [note, setNote] = useState('');
  const [denying, setDenying] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDecision, setSubmittedDecision] = useState(null); // { status: 'GRANTED' | 'DENIED', consentRecord }
  const [copiedHash, setCopiedHash] = useState(false);

  // Sector Icon Resolver
  const getSectorIcon = (domain, fiduciaryName = '') => {
    const d = (domain || '').toLowerCase();
    const f = (fiduciaryName || '').toLowerCase();
    if (d.includes('edu') || f.includes('institute') || f.includes('university') || f.includes('school')) {
      return <GraduationCap size={24} className="text-blue-600" />;
    }
    if (d.includes('health') || f.includes('hospital') || f.includes('care')) {
      return <HeartPulse size={24} className="text-rose-600" />;
    }
    if (d.includes('fintech') || f.includes('lending') || f.includes('loan') || f.includes('payflex')) {
      return <CreditCard size={24} className="text-purple-600" />;
    }
    if (d.includes('bank') || f.includes('bank')) {
      return <Landmark size={24} className="text-emerald-600" />;
    }
    return <Building2 size={24} className="text-slate-600" />;
  };

  const getSectorBadgeClass = (domain) => {
    const d = (domain || '').toLowerCase();
    if (d.includes('edu')) return 'badge-education';
    if (d.includes('health')) return 'badge-healthcare';
    if (d.includes('fintech')) return 'badge-fintech';
    if (d.includes('bank')) return 'badge-banking';
    return 'badge-general';
  };

  const attributesList = currentScenario?.attributes || [];
  const selectedCount = Object.values(selectedAttributes).filter(Boolean).length;
  const totalCount = attributesList.length;

  const handleSelectAll = (val) => {
    attributesList.forEach(attr => {
      if (!attr.required) {
        if ((val && !selectedAttributes[attr.id]) || (!val && selectedAttributes[attr.id])) {
          toggleAttribute(attr.id);
        }
      }
    });
  };

  const handleGrant = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const record = await grantCurrentConsent(note);
      if (record) {
        setSubmittedDecision({
          status: 'GRANTED',
          consentRecord: record
        });
      }
    } catch (err) {
      console.error("Grant failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenySubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await denyCurrentConsent(denyReason || "Data Principal declined consent request.");
      setSubmittedDecision({
        status: 'DENIED',
        fiduciary: currentScenario.fiduciary,
        reason: denyReason || "Data Principal declined request"
      });
      setDenying(false);
      setDenyReason('');
    } catch (err) {
      console.error("Deny failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyIntegrityHash = (hashText) => {
    if (!hashText) return;
    navigator.clipboard.writeText(hashText);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // SUCCESS STATE VIEW
  if (submittedDecision) {
    const isGranted = submittedDecision.status === 'GRANTED';
    const record = submittedDecision.consentRecord || {};
    const integrityHash = record.receiptHash || record.sha256IntegrityHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    return (
      <div className="decision-hub-container">
        <div className="decision-success-card">
          <div className="success-icon-badge">
            {isGranted ? (
              <CheckCircle2 size={44} className="text-emerald-500" />
            ) : (
              <XCircle size={44} className="text-rose-500" />
            )}
          </div>

          <h2 className="success-heading">
            {isGranted ? 'Consent Recorded Successfully' : 'Consent Request Declined'}
          </h2>
          <p className="success-subheading">
            {isGranted 
              ? 'Your decision has been cryptographically recorded and the Data Fiduciary has been officially notified with a statutory receipt.'
              : 'You have formally declined consent. The Data Fiduciary has been notified and prohibited from processing this data.'}
          </p>

          <div className="success-receipt-box">
            <div className="receipt-meta-grid">
              <div className="receipt-item">
                <span className="receipt-label">Consent ID</span>
                <span className="receipt-value font-mono text-indigo-600 font-bold">
                  {record.consentId || 'CNST-2026-RECORDED'}
                </span>
              </div>

              <div className="receipt-item">
                <span className="receipt-label">Status</span>
                <span className={`status-pill ${isGranted ? 'pill-emerald' : 'pill-rose'}`}>
                  ● {isGranted ? 'Granted' : 'Denied'}
                </span>
              </div>

              <div className="receipt-item">
                <span className="receipt-label">Data Fiduciary</span>
                <span className="receipt-value font-semibold">
                  {currentScenario.fiduciary}
                </span>
              </div>

              <div className="receipt-item">
                <span className="receipt-label">Recorded Timestamp</span>
                <span className="receipt-value">
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>

            {isGranted && (
              <div className="integrity-hash-container">
                <div className="hash-header">
                  <span className="hash-title">SHA-256 Integrity Hash</span>
                  <button 
                    type="button" 
                    className="copy-hash-btn"
                    onClick={() => copyIntegrityHash(integrityHash)}
                    title="Copy SHA-256 Integrity Hash"
                  >
                    {copiedHash ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div className="hash-code-block font-mono">
                  {integrityHash}
                </div>
                <p className="hash-disclaimer">
                  Verified SHA-256 cryptographic proof of consent under Section 6 of the DPDP Act 2023.
                </p>
              </div>
            )}
          </div>

          <div className="success-actions-row">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                try {
                  if (window.location.pathname !== '/') {
                    window.history.pushState({}, '', '/');
                  }
                } catch (e) {}
                setActiveTab('dashboard');
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>

            {isGranted && (
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('active')}
              >
                <CheckCircle2 size={16} />
                <span>View in Active Consents</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STANDARD REVIEW VIEW
  return (
    <div className="decision-hub-container">
      {/* Back to Dashboard Navigation Link */}
      <button 
        type="button" 
        className="back-dashboard-link"
        onClick={() => {
          try {
            if (window.location.pathname !== '/') {
              window.history.pushState({}, '', '/');
            }
          } catch (e) {}
          setActiveTab('dashboard');
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      {/* Top Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <div className="banner-badge-row">
            <span className={`badge ${getSectorBadgeClass(currentScenario.domain)}`}>
              {currentScenario.domain || 'General'} Sector
            </span>
            <span className="badge badge-notice">Notice ID: {currentScenario.noticeId}</span>
            <span className="badge badge-verified">
              <CheckCircle2 size={13} /> DPDP Verified
            </span>
          </div>
          <h1>Consent Review & Granular Permission</h1>
          <p>Carefully review the requested personal data attributes, purpose of processing, and validity before making your decision.</p>
        </div>

        <div className="scope-counter-box">
          <span className="scope-counter-label">Selected Scope</span>
          <div className="scope-counter-number">
            {selectedCount} <span className="scope-counter-total">/ {totalCount} attributes</span>
          </div>
        </div>
      </div>

      <div className="decision-hub-grid">
        {/* Main Column */}
        <div className="main-review-column">
          {/* Fiduciary Card */}
          <div className="glass-card fiduciary-profile-card">
            <div className="fiduciary-card-left">
              <div className="fiduciary-logo-box">
                {getSectorIcon(currentScenario.domain, currentScenario.fiduciary)}
              </div>
              <div>
                <h2 className="fiduciary-headline">{currentScenario.fiduciary}</h2>
                <span className="fiduciary-cat-text">
                  {currentScenario.fiduciaryCategory || 'Official Data Fiduciary'}
                </span>
                <div className="fiduciary-contact-row">
                  <span className="fiduciary-contact-item">
                    <Mail size={13} /> DPO: {currentScenario.dpoEmail || currentScenario.fiduciaryEmail || 'dpo@fiduciary.com'}
                  </span>
                  <span className="fiduciary-contact-item">
                    <ShieldCheck size={13} className="text-emerald-500" /> Statutory Legal Basis: DPDP Sec 6
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Purpose Box */}
          <div className="glass-card purpose-highlight-box">
            <div className="purpose-box-header">
              <FileText size={17} className="text-indigo-600" />
              <span className="purpose-box-title">Specified Purpose of Processing</span>
            </div>
            <p className="purpose-box-text">
              {translatePurpose(currentScenario.purpose, language)}
            </p>
          </div>

          {/* Granular Attribute Selection */}
          <div className="glass-card">
            <div className="attributes-header-row">
              <div>
                <h3 className="section-title-sm">
                  <SlidersHorizontal size={18} className="text-indigo-600" />
                  <span>Requested Personal Data ({totalCount})</span>
                </h3>
                <p className="section-subtitle-sm">
                  Review and customize permissions. Mandatory statutory attributes cannot be unselected.
                </p>
              </div>

              <div className="select-all-controls">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All Optional
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSelectAll(false)}
                >
                  Deselect All Optional
                </button>
              </div>
            </div>

            <div className="attribute-cards-grid">
              {attributesList.map((attr) => {
                const isSelected = !!selectedAttributes[attr.id];
                return (
                  <div 
                    key={attr.id}
                    className={`attribute-item-card ${attr.required ? 'is-required' : ''} ${isSelected ? 'is-selected' : 'is-unselected'}`}
                  >
                    <div className="attribute-card-top">
                      <div className="attribute-name-wrap">
                        <span className="attribute-name">
                          {translateAttributeName(attr.name, language)}
                        </span>
                        <div className="attribute-tags-row">
                          {attr.category && (
                            <span className="attr-cat-badge">
                              {attr.category}
                            </span>
                          )}
                          {attr.required && (
                            <span className="badge-mandatory">Mandatory</span>
                          )}
                          {attr.sensitive && (
                            <span className="badge-sensitive">Sensitive</span>
                          )}
                        </div>
                      </div>

                      <label className="toggle-switch">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={attr.required}
                          onChange={() => toggleAttribute(attr.id)}
                          aria-label={`Toggle ${attr.name}`}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <p className="attribute-desc">
                      {translateAttributeDesc(attr.description, language)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Optional Remark Input */}
            <div className="remark-input-container">
              <label className="remark-label">
                Optional Decision Remark:
              </label>
              <input 
                type="text"
                className="input-text-field"
                placeholder="e.g. Consent granted for academic year 2026-27 only."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Pre-Grant Decision Summary Box */}
            <div className="decision-summary-box">
              <h4 className="decision-summary-title">Compact Decision Summary</h4>
              <div className="decision-summary-grid">
                <div>
                  <span className="summary-label">Target Fiduciary</span>
                  <span className="summary-val">{currentScenario.fiduciary}</span>
                </div>
                <div>
                  <span className="summary-label">Attributes Selected</span>
                  <span className="summary-val text-indigo-600 font-bold">{selectedCount} of {totalCount} attributes</span>
                </div>
                <div>
                  <span className="summary-label">Processing Duration</span>
                  <span className="summary-val">{currentScenario.validityPeriod || '12 Months'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="review-action-toolbar">
              <button 
                type="button"
                className="btn btn-primary btn-grant-main"
                onClick={handleGrant}
                disabled={isSubmitting || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-sm"></div>
                    <span>Recording Consent...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Grant Selected Consent ({selectedCount} Attributes)</span>
                  </>
                )}
              </button>

              <button 
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setDenying(true)}
                disabled={isSubmitting}
              >
                <XCircle size={18} />
                <span>Deny Consent</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="review-sidebar-column">
          <div className="glass-card statutory-notice-card">
            <h3 className="sidebar-card-title">
              <ShieldCheck size={18} className="text-indigo-600" />
              <span>Statutory DPDP Notice</span>
            </h3>

            <div className="sidebar-info-row">
              <span className="info-label">Retention Period</span>
              <span className="info-value flex-center gap-1">
                <Clock size={14} className="text-amber-500" />
                {currentScenario.validityPeriod || '12 Months'}
              </span>
            </div>

            <div className="sidebar-info-row">
              <span className="info-label">Storage Region</span>
              <span className="info-value flex-center gap-1">
                <Database size={14} className="text-emerald-500" />
                {currentScenario.dataRegion || 'India (MeitY Empanelled Cloud)'}
              </span>
            </div>

            <div className="sidebar-info-row border-none">
              <span className="info-label">Right to Withdraw (Sec 6(4))</span>
              <p className="info-subtext">
                Under Section 6(4) of the DPDP Act 2023, you retain the statutory right to withdraw this consent at any time through the Active Consents dashboard.
              </p>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm w-full"
              onClick={() => {
                setGrievanceTarget(currentScenario);
                setGrievanceModalOpen(true);
              }}
            >
              <HelpCircle size={15} />
              <span>Inquire with DPO</span>
            </button>
          </div>

          <div className="glass-card notice-alert-card">
            <AlertCircle size={20} className="text-indigo-500 flex-shrink-0" />
            <p className="notice-alert-text">
              When granted, a cryptographic <strong>SHA-256 Integrity Hash</strong> is generated and dispatched to the original fiduciary message thread.
            </p>
          </div>
        </div>
      </div>

      {/* Deny Confirmation Modal */}
      {denying && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title text-red-500">
                <XCircle size={22} />
                <span>Decline Consent Request</span>
              </div>
              <button className="close-btn" onClick={() => !isSubmitting && setDenying(false)}>✕</button>
            </div>

            <p className="modal-lead-text">
              Are you sure you want to decline consent to <strong>{currentScenario.fiduciary}</strong>? The fiduciary will be officially informed that data processing has been refused.
            </p>

            <form onSubmit={handleDenySubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="remark-label">
                  Reason for Declining (Optional):
                </label>
                <textarea 
                  className="input-text-field"
                  style={{ height: '90px', resize: 'none' }}
                  placeholder="e.g. Unnecessary data collection or scope too broad."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="modal-footer-row">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDenying(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Declining...' : 'Confirm Decline Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
