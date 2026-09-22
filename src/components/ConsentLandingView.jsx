import React, { useState, useEffect } from 'react';
import { consentApi } from '../api/consentApi';
import {
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  HeartPulse,
  CreditCard,
  Landmark,
  Clock,
  Globe,
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react';

/**
 * ConsentLandingView — Public page shown when a data principal opens a consent link.
 * Requires NO authentication. Shows a preview of the consent request and prompts login.
 */
export const ConsentLandingView = ({ token, onProceedToLogin }) => {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid consent link — no token found.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    consentApi.getPublicConsentRequest(token).then(data => {
      if (cancelled) return;
      if (data) {
        setRequest(data);
      } else {
        setError('This consent link is invalid or has expired.');
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError('Unable to load consent details. Please try again later.');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  const getSectorIcon = (domain = '', fiduciaryName = '') => {
    const d = domain.toLowerCase();
    const f = fiduciaryName.toLowerCase();
    if (d.includes('edu') || f.includes('university') || f.includes('school') || f.includes('institute')) {
      return <GraduationCap size={28} style={{ color: '#2563eb' }} />;
    }
    if (d.includes('health') || f.includes('hospital') || f.includes('care') || f.includes('clinic')) {
      return <HeartPulse size={28} style={{ color: '#e11d48' }} />;
    }
    if (d.includes('fintech') || f.includes('lending') || f.includes('loan')) {
      return <CreditCard size={28} style={{ color: '#7c3aed' }} />;
    }
    if (d.includes('bank') || f.includes('bank')) {
      return <Landmark size={28} style={{ color: '#059669' }} />;
    }
    return <Building2 size={28} style={{ color: '#6366f1' }} />;
  };

  if (loading) {
    return (
      <div className="consent-landing-page">
        <div className="consent-landing-card">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Loading your consent request…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-landing-page">
        <div className="consent-landing-card">
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Invalid Consent Link
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px' }}>
              Please contact the organisation that sent you this link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = request.status === 'EXPIRED' || request.status === 'GRANTED' || request.status === 'DENIED';

  return (
    <div className="consent-landing-page">
      {/* Background blobs */}
      <div className="landing-bg-blob landing-bg-blob-1" aria-hidden="true" />
      <div className="landing-bg-blob landing-bg-blob-2" aria-hidden="true" />

      <div className="consent-landing-card">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="landing-header">
          <div className="landing-header-icon">
            <Shield size={22} style={{ color: '#fff' }} />
          </div>
          <div>
            <p className="landing-header-label">Digital Personal Data Protection Act 2023</p>
            <h1 className="landing-header-title">Consent Request Notice</h1>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="landing-body">
          {/* Fiduciary info */}
          <div className="landing-fiduciary-card">
            <div className="landing-fiduciary-icon">
              {getSectorIcon(request.domain, request.fiduciary_name)}
            </div>
            <div style={{ flex: 1 }}>
              <p className="landing-fiduciary-label">Consent requested by</p>
              <h2 className="landing-fiduciary-name">{request.fiduciary_name}</h2>
              {request.fiduciary_category && (
                <span className="landing-category-badge">{request.fiduciary_category}</span>
              )}
            </div>
          </div>

          {/* Purpose */}
          <div className="landing-purpose-block">
            <div className="landing-purpose-icon">
              <FileText size={16} />
            </div>
            <div>
              <p className="landing-purpose-label">Purpose of data collection</p>
              <p className="landing-purpose-text">{request.purpose}</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="landing-meta-row">
            {request.validity_period && (
              <div className="landing-meta-item">
                <Clock size={13} style={{ flexShrink: 0 }} />
                <span>Valid for {request.validity_period}</span>
              </div>
            )}
            {request.data_region && (
              <div className="landing-meta-item">
                <Globe size={13} style={{ flexShrink: 0 }} />
                <span>Data region: {request.data_region}</span>
              </div>
            )}
            <div className="landing-meta-item">
              <Lock size={13} style={{ flexShrink: 0 }} />
              <span>Section 6, DPDP Act 2023</span>
            </div>
          </div>

          {/* Attributes preview */}
          {request.attributes && request.attributes.length > 0 && (
            <div className="landing-attrs-section">
              <p className="landing-attrs-title">
                Data attributes requested ({request.attributes.length})
              </p>
              <div className="landing-attrs-list">
                {request.attributes.map((attr, i) => (
                  <div key={i} className="landing-attr-chip">
                    <CheckCircle2 size={12} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <span>{attr.name}</span>
                    {attr.sensitive && (
                      <span className="landing-attr-sensitive">Sensitive</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status badge if already actioned */}
          {isExpired && (
            <div className="landing-expired-banner">
              <AlertCircle size={16} />
              <span>
                This consent request has already been{' '}
                <strong>{request.status.toLowerCase()}</strong>.
                Log in to view your consent history.
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="landing-cta-section">
            <p className="landing-cta-note">
              <Lock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Log in or create an account to review and respond to this request.
              Your decision is fully voluntary and revocable.
            </p>
            <button
              id="consent-landing-login-btn"
              className="landing-cta-btn"
              onClick={() => onProceedToLogin && onProceedToLogin(token)}
            >
              <span>Log in to Review Consent Request</span>
              <ArrowRight size={18} />
            </button>
            <p className="landing-legal-note">
              Under the DPDP Act 2023, you have the right to grant, deny, or partially consent to this request.
              You may revoke consent at any time after granting it.
            </p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="landing-footer">
          <p>Notice ID: <code>{request.notice_id}</code></p>
          <p style={{ marginTop: '4px' }}>Powered by DPDP Consent Manager</p>
        </div>
      </div>
    </div>
  );
};
