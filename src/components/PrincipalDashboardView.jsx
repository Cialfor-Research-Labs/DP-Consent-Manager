import React from 'react';
import { useConsent } from '../context/ConsentContext';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Scale, 
  GraduationCap, 
  HeartPulse, 
  Landmark, 
  CreditCard, 
  Building2, 
  ArrowRight, 
  RotateCw, 
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const PrincipalDashboardView = () => {
  const { 
    myPendingRequests, 
    activeConsents, 
    dsrRequests, 
    openRequestReview,
    isFetchingPending,
    pendingError,
    refetchBackendData,
    dataPrincipal,
    t 
  } = useConsent();

  const { user } = useAuth();

  // Metrics computation
  const pendingCount = myPendingRequests.length;
  const activeCount = activeConsents.filter(c => c.status === 'ACTIVE').length;

  // Calculate expiring soon (within 30 days)
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiringSoonCount = activeConsents.filter(c => {
    if (c.status !== 'ACTIVE') return false;
    const expiresOn = c.expiresOn || c.expires_on;
    if (!expiresOn) return false;
    const expMs = new Date(expiresOn).getTime();
    return expMs > nowMs && (expMs - nowMs) <= thirtyDaysMs;
  }).length;

  const dsrCount = dsrRequests.length;

  // Sector Icon Resolver
  const getSectorIcon = (domain, fiduciaryName = '') => {
    const d = (domain || '').toLowerCase();
    const f = (fiduciaryName || '').toLowerCase();
    if (d.includes('edu') || f.includes('institute') || f.includes('university') || f.includes('school') || f.includes('college')) {
      return <GraduationCap size={22} className="sector-icon text-blue-600" />;
    }
    if (d.includes('health') || f.includes('hospital') || f.includes('care') || f.includes('clinic')) {
      return <HeartPulse size={22} className="sector-icon text-rose-600" />;
    }
    if (d.includes('fintech') || f.includes('lending') || f.includes('loan') || f.includes('payflex')) {
      return <CreditCard size={22} className="sector-icon text-purple-600" />;
    }
    if (d.includes('bank') || f.includes('bank')) {
      return <Landmark size={22} className="sector-icon text-emerald-600" />;
    }
    return <Building2 size={22} className="sector-icon text-slate-600" />;
  };

  const getSectorBadgeClass = (domain) => {
    const d = (domain || '').toLowerCase();
    if (d.includes('edu')) return 'badge-education';
    if (d.includes('health')) return 'badge-healthcare';
    if (d.includes('fintech')) return 'badge-fintech';
    if (d.includes('bank')) return 'badge-banking';
    return 'badge-general';
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-header-banner">
        <div className="dashboard-header-text">
          <div className="citizen-tag-row">
            <span className="badge badge-verified">
              <CheckCircle2 size={13} /> DPDP Act 2023 Verified Principal
            </span>
            <span className="citizen-id-badge">
              ID: {dataPrincipal.id}
            </span>
          </div>
          <h1>Consent & Privacy Overview</h1>
          <p>
            Monitor incoming consent requests, active fiduciary permissions, and statutory data rights in compliance with the Digital Personal Data Protection Act 2023.
          </p>
        </div>

        <button 
          className="btn btn-secondary btn-sm refresh-btn"
          onClick={() => refetchBackendData()}
          title="Refresh dashboard data from secure server"
        >
          <RotateCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="summary-metrics-grid">
        <div className="metric-card metric-card-pending">
          <div className="metric-header">
            <span className="metric-title">Pending Requests</span>
            <div className="metric-icon-wrap icon-amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{pendingCount}</span>
            {pendingCount > 0 ? (
              <span className="metric-pill pill-amber">Requires Review</span>
            ) : (
              <span className="metric-pill pill-slate">All Clear</span>
            )}
          </div>
          <div className="metric-subtext">Incoming notices requiring your decision</div>
        </div>

        <div className="metric-card metric-card-active">
          <div className="metric-header">
            <span className="metric-title">Active Consents</span>
            <div className="metric-icon-wrap icon-emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{activeCount}</span>
            <span className="metric-pill pill-emerald">Live Grants</span>
          </div>
          <div className="metric-subtext">Authorized fiduciaries processing your data</div>
        </div>

        <div className="metric-card metric-card-expiring">
          <div className="metric-header">
            <span className="metric-title">Expiring Soon</span>
            <div className="metric-icon-wrap icon-rose">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{expiringSoonCount}</span>
            <span className="metric-pill pill-rose">Within 30 Days</span>
          </div>
          <div className="metric-subtext">Consents approaching statutory renewal</div>
        </div>

        <div className="metric-card metric-card-dsr">
          <div className="metric-header">
            <span className="metric-title">Data Rights Requests</span>
            <div className="metric-icon-wrap icon-indigo">
              <Scale size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{dsrCount}</span>
            <span className="metric-pill pill-indigo">SLA Tracked</span>
          </div>
          <div className="metric-subtext">Statutory Erasure, Correction, and Nominee requests</div>
        </div>
      </div>

      {/* Main Section: Pending Consent Requests */}
      <div className="dashboard-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-heading">Pending Consent Requests</h2>
            <p className="section-subheading">
              Every Gmail-ingested consent notice addressed to you appears here automatically for review.
            </p>
          </div>
          <span className="pending-badge-count">
            {pendingCount} Pending Action
          </span>
        </div>

        {/* Loading State */}
        {isFetchingPending && (
          <div className="dashboard-state-card">
            <div className="spinner-large"></div>
            <h3>Loading your consent requests...</h3>
            <p>Communicating securely with the DPDP Consent Management Backend.</p>
          </div>
        )}

        {/* Error State */}
        {!isFetchingPending && pendingError && (
          <div className="dashboard-state-card state-card-error">
            <AlertCircle size={40} className="text-red-500" />
            <h3>Unable to load consent requests. Please try again.</h3>
            <p>Please check your network connection and try again.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => refetchBackendData()}>
              <RotateCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isFetchingPending && !pendingError && pendingCount === 0 && (
          <div className="dashboard-state-card state-card-empty">
            <div className="empty-icon-wrap">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <h3>No pending consent requests.</h3>
            <p>
              You are all caught up! When a Data Fiduciary issues a consent request via email, it will automatically appear here for your granular approval.
            </p>
          </div>
        )}

        {/* Request Cards List */}
        {!isFetchingPending && !pendingError && pendingCount > 0 && (
          <div className="pending-requests-grid">
            {myPendingRequests.map((req) => {
              const reqToken = req.token || req.id;
              const attrs = req.attributes || req.requestedAttributes || [];
              const attrCount = attrs.length;
              const domainName = req.domain || req.fiduciaryCategory || 'General';
              const createdDate = req.created_at || req.createdAt || (req.emailSnapshot && req.emailSnapshot.date);
              const formattedDate = createdDate 
                ? new Date(createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';

              return (
                <div key={req.id || reqToken} className="consent-request-card">
                  <div className="request-card-header">
                    <div className="fiduciary-identity">
                      <div className="sector-icon-box">
                        {getSectorIcon(req.domain, req.fiduciary || req.fiduciary_name)}
                      </div>
                      <div>
                        <h3 className="fiduciary-title">{req.fiduciary || req.fiduciary_name || 'Data Fiduciary'}</h3>
                        <span className={`badge ${getSectorBadgeClass(req.domain)}`}>
                          {domainName}
                        </span>
                      </div>
                    </div>
                    <span className="status-badge-pending">
                      ● Pending
                    </span>
                  </div>

                  <div className="request-card-body">
                    <div className="request-purpose-block">
                      <span className="block-label">Purpose:</span>
                      <p className="purpose-text">
                        {req.purpose || req.emailSubject || 'Personal data processing under DPDP Act 2023.'}
                      </p>
                    </div>

                    <div className="request-meta-grid">
                      <div className="meta-item">
                        <Layers size={15} className="meta-icon" />
                        <div>
                          <span className="meta-label">Requested Data</span>
                          <span className="meta-value">{attrCount} attributes</span>
                        </div>
                      </div>

                      <div className="meta-item">
                        <Calendar size={15} className="meta-icon" />
                        <div>
                          <span className="meta-label">Received</span>
                          <span className="meta-value">{formattedDate}</span>
                        </div>
                      </div>

                      <div className="meta-item">
                        <Clock size={15} className="meta-icon" />
                        <div>
                          <span className="meta-label">Validity</span>
                          <span className="meta-value">{req.validityPeriod || req.validity_period || '12 Months'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="request-card-footer">
                    <button 
                      className="btn btn-primary review-consent-btn"
                      onClick={() => openRequestReview(reqToken)}
                    >
                      <span>Review Consent</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
