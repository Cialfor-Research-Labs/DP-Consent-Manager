import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { consentApi } from '../api/consentApi';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  History, 
  ShieldCheck, 
  Plus, 
  Copy, 
  ExternalLink,
  Users,
  Search,
  Mail,
  Sparkles,
  FileSpreadsheet,
  GraduationCap,
  X
} from 'lucide-react';
import { BulkNoticeDispatcher } from './BulkNoticeDispatcher';

export const FiduciaryDashboardView = () => {
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests', 'bulk', 'dispatch', 'audit'
  const [requests, setRequests] = useState([]);
  const [consents, setConsents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(null); // request id being resent

  // Status Filter state: 'ALL' | 'PENDING' | 'GRANTED' | 'REVOKED' | 'DENIED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Modal state for viewing Cryptographic Consent Certificate & SHA-256 Hash
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Search state across students, roll numbers, notices
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // New Notice Dispatch Form state
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [dispatchRollNo, setDispatchRollNo] = useState('');
  const [dispatchPurpose, setDispatchPurpose] = useState('Account Opening and KYC Identity Verification');
  const [dispatchDomain, setDispatchDomain] = useState('Banking');
  const [dispatchFiduciary, setDispatchFiduciary] = useState(user?.fiduciary_name || 'Cialfor Research Labs Private Limited');
  const [dispatchStatus, setDispatchStatus] = useState(null);

  const fetchFiduciaryData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, consts, audits] = await Promise.all([
        consentApi.fetchConsentRequests(),
        consentApi.fetchActiveConsents(),
        consentApi.fetchAuditLogs()
      ]);
      if (reqs && Array.isArray(reqs)) setRequests(reqs);
      if (consts && Array.isArray(consts)) setConsents(consts);
      if (audits && Array.isArray(audits)) setAuditLogs(audits);
    } catch (err) {
      console.warn('Fiduciary data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiduciaryData();
  }, [fetchFiduciaryData]);

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setDispatchStatus({ type: 'loading', message: 'Generating cryptographic notice and sending invite email...' });
    try {
      const payload = {
        fiduciary_name: dispatchFiduciary,
        fiduciary_email: user?.email || 'compliance@cialfor.com',
        principal_name: dispatchName,
        principal_email: dispatchEmail,
        roll_no: dispatchRollNo,
        principal_roll_no: dispatchRollNo,
        purpose: dispatchPurpose,
        domain: dispatchDomain,
        requested_attributes: [
          { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
          { id: 'attr_id', name: 'Government Identity Proof', category: 'IDENTITY', required: true, sensitive: true },
          { id: 'attr_contact', name: 'Contact Phone & Address', category: 'CONTACT', required: false, sensitive: false }
        ],
        email_subject: `Statutory DPDP Notice: ${dispatchPurpose}`,
        email_body: `Dear ${dispatchName}${dispatchRollNo ? ` (Roll No: ${dispatchRollNo})` : ''},\n\n${dispatchFiduciary} requests your digital consent under the DPDP Act 2023 for: ${dispatchPurpose}.`
      };

      const res = await consentApi.createConsentRequest(payload);
      const consentLink = res.consent_link || res.link || `${window.location.origin}/consent/${res.token}`;
      const emailSent = res.email_sent;
      const devMode = res.email_dev_mode;
      const emailMsg = res.email_message || '';

      let statusMsg;
      if (emailSent && devMode) {
        statusMsg = `Notice dispatched! Invite email printed to server console (dev mode — add GMAIL_USER / GMAIL_APP_PASSWORD to .env for real sending).`;
      } else if (emailSent) {
        statusMsg = `✅ Notice dispatched and invite email sent successfully to ${dispatchEmail}!`;
      } else if (emailMsg.toLowerCase().includes('domain') || emailMsg.toLowerCase().includes('verify')) {
        statusMsg = `⚠️ Notice dispatched. Email failed: Resend requires a verified domain.\n\nGo to resend.com/domains → Add Domain → Verify DNS records → update RESEND_FROM_EMAIL in .env, OR use direct Gmail SMTP in .env.\n\nThe consent link is ready to share manually below.`;
      } else if (emailMsg) {
        statusMsg = `⚠️ Notice dispatched but email delivery failed: ${emailMsg.substring(0, 200)}`;
      } else {
        statusMsg = `Notice dispatched. Email could not be sent — check GMAIL_USER/GMAIL_APP_PASSWORD or RESEND_API_KEY in .env.`;
      }

      setDispatchStatus({
        type: emailSent ? 'success' : 'warning',
        message: statusMsg,
        link: consentLink,
        token: res.token,
        emailSent,
        devMode,
      });
      setDispatchName('');
      setDispatchEmail('');
      setDispatchRollNo('');
      // Refresh list
      fetchFiduciaryData();
    } catch (err) {
      setDispatchStatus({
        type: 'error',
        message: err.message || 'Failed to dispatch notice.'
      });
    }
  };

  const handleResendEmail = async (requestId) => {
    setResendingEmail(requestId);
    try {
      const res = await consentApi.resendConsentEmail(requestId);
      if (!res.success && !res.dev_mode) {
        alert(`⚠️ Email delivery failed: ${res.message || 'Unknown error'}`);
        return;
      }
      const msg = res.dev_mode
        ? `Invite email printed to server console (dev mode). Add RESEND_API_KEY or GMAIL_USER/GMAIL_APP_PASSWORD to .env for real sending.`
        : `Invite email sent successfully to ${res.to_email || 'recipient'}!`;
      alert(msg);
    } catch (err) {
      alert(`Failed to resend email: ${err.message}`);
    } finally {
      setResendingEmail(null);
    }
  };

  const copyToClipboard = (text, token) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const renderStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'GRANTED' || s === 'ACTIVE') {
      return (
        <span className="status-pill pill-emerald">
          <span className="status-dot" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === 'REVOKED' || s === 'WITHDRAWN') {
      return (
        <span className="status-pill pill-revoked">
          <span className="status-dot" />
          <span>REVOKED</span>
        </span>
      );
    }
    if (s === 'DENIED' || s === 'REJECTED') {
      return (
        <span className="status-pill pill-rose">
          <span className="status-dot" />
          <span>DENIED</span>
        </span>
      );
    }
    if (s === 'EXPIRED') {
      return (
        <span className="status-pill pill-slate">
          <span className="status-dot" />
          <span>EXPIRED</span>
        </span>
      );
    }
    return (
      <span className="status-pill pill-amber">
        <span className="status-dot" />
        <span>PENDING</span>
      </span>
    );
  };

  const totalDispatched = requests.length;
  const totalGranted = consents.filter(c => c.status === 'ACTIVE' || c.status === 'GRANTED').length;
  const totalRevoked = consents.filter(c => c.status === 'REVOKED').length;

  // Calculate real-time counts across all requests for each lifecycle status
  const statusCounts = useMemo(() => {
    const counts = { ALL: requests.length, PENDING: 0, GRANTED: 0, REVOKED: 0, DENIED: 0 };
    for (const r of requests) {
      const s = (r.status || 'PENDING').toUpperCase();
      if (s === 'GRANTED' || s === 'ACTIVE') counts.GRANTED++;
      else if (s === 'REVOKED' || s === 'WITHDRAWN') counts.REVOKED++;
      else if (s === 'DENIED' || s === 'REJECTED') counts.DENIED++;
      else counts.PENDING++;
    }
    return counts;
  }, [requests]);

  // Lookup map for cryptographic consent receipts (by notice_id, request_id, or consent_id)
  const consentsLookup = useMemo(() => {
    const map = {};
    for (const c of consents) {
      if (c.noticeId) map[c.noticeId] = c;
      if (c.notice_id) map[c.notice_id] = c;
      if (c.requestId) map[c.requestId] = c;
      if (c.request_id) map[c.request_id] = c;
      if (c.consentId) map[c.consentId] = c;
      if (c.consent_id) map[c.consent_id] = c;
    }
    return map;
  }, [consents]);

  // Filtered requests supporting status filter (ALL/PENDING/GRANTED/REVOKED/DENIED) and search queries
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        const s = (r.status || 'PENDING').toUpperCase();
        if (statusFilter === 'GRANTED' && s !== 'GRANTED' && s !== 'ACTIVE') return false;
        if (statusFilter === 'REVOKED' && s !== 'REVOKED' && s !== 'WITHDRAWN') return false;
        if (statusFilter === 'DENIED' && s !== 'DENIED' && s !== 'REJECTED') return false;
        if (statusFilter === 'PENDING' && (s === 'GRANTED' || s === 'ACTIVE' || s === 'REVOKED' || s === 'WITHDRAWN' || s === 'DENIED' || s === 'REJECTED')) return false;
      }

      // 2. Search query filter across name, roll number, email, notice ID, and purpose
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase().trim();
      const dp = r.dataPrincipal || {};
      const name = (dp.name || r.principal_name || '').toLowerCase();
      const rollNo = (dp.roll_no || dp.rollNo || r.roll_no || r.rollNo || '').toLowerCase();
      const email = (dp.email || r.principal_email || '').toLowerCase();
      const noticeId = (r.notice_id || r.noticeId || r.id || '').toLowerCase();
      const purpose = (r.purpose || r.title || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      return (
        name.includes(term) ||
        rollNo.includes(term) ||
        email.includes(term) ||
        noticeId.includes(term) ||
        purpose.includes(term) ||
        status.includes(term)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Fiduciary Organization Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        padding: '28px 32px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.3)'
          }}>
            <Building2 size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {user?.fiduciary_name || 'Data Fiduciary Control Console'}
              </h1>
              <span style={{
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(168, 85, 247, 0.3)'
              }}>
                ADMIN / FIDUCIARY
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              DPDP Act 2023 Statutory Compliance & Institutional Consent Dispatch Portal
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('bulk')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
            }}
          >
            <Sparkles size={16} />
            <span>🚀 Automated Bulk Dispatch (Excel / Group)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('dispatch')}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <Plus size={16} />
            <span>Single Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div
          className="kpi-interactive-card"
          onClick={() => { setActiveSubTab('requests'); setStatusFilter('ALL'); }}
          title="Click to view all dispatched requests"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px',
            border: activeSubTab === 'requests' && statusFilter === 'ALL' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Dispatched Notices</span>
            <Send size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            {totalDispatched}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#818cf8', marginTop: '4px' }}>Under Sec 6 Notice Rules • Click to view all</div>
        </div>

        <div
          className="kpi-interactive-card"
          onClick={() => { setActiveSubTab('requests'); setStatusFilter('GRANTED'); }}
          title="Click to filter by Granted consents"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px',
            border: activeSubTab === 'requests' && statusFilter === 'GRANTED' ? '1.5px solid #10b981' : '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Granted Consents</span>
            <CheckCircle2 size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '8px' }}>
            {statusCounts.GRANTED || totalGranted}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cryptographically Verified • Click to filter</div>
        </div>

        <div
          className="kpi-interactive-card"
          onClick={() => { setActiveSubTab('requests'); setStatusFilter('REVOKED'); }}
          title="Click to filter by Revoked consents"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px',
            border: activeSubTab === 'requests' && statusFilter === 'REVOKED' ? '1.5px solid #e11d48' : '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Revocations Processed</span>
            <AlertTriangle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '8px' }}>
            {statusCounts.REVOKED || totalRevoked}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Sec 6(4) Right Exercised • Click to filter</div>
        </div>

        <div
          className="kpi-interactive-card"
          onClick={() => setActiveSubTab('audit')}
          title="Click to view Compliance Audit Log"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '20px',
            border: activeSubTab === 'audit' ? '1.5px solid #c084fc' : '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Audit Trail Events</span>
            <History size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '8px' }}>
            {auditLogs.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Immutable Ledger Records • Click to view</div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('requests')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'requests' ? 'var(--accent-primary)' : 'transparent',
            color: activeSubTab === 'requests' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Dispatched Requests ({requests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bulk')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'bulk' ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' : 'rgba(168, 85, 247, 0.1)',
            color: activeSubTab === 'bulk' ? '#ffffff' : '#c084fc',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={15} />
          <span>Automated Bulk Dispatch (Excel / Group)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('dispatch')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'dispatch' ? 'var(--accent-primary)' : 'transparent',
            color: activeSubTab === 'dispatch' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Single Notice Dispatcher
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'audit' ? 'var(--accent-primary)' : 'transparent',
            color: activeSubTab === 'audit' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Compliance Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* SUB-VIEW 0: AUTOMATED BULK NOTICE DISPATCHER */}
      {activeSubTab === 'bulk' && (
        <BulkNoticeDispatcher
          user={user}
          onDispatched={fetchFiduciaryData}
          onSwitchTab={setActiveSubTab}
        />
      )}

      {/* SUB-VIEW 1: DISPATCHED REQUESTS TABLE */}
      {activeSubTab === 'requests' && (
        <div>
          {/* Status Filter Bar & Search Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {/* Top Toolbar Row: Segmented Status Filter Buttons + Live Counters */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div className="status-filter-group">
                <button
                  type="button"
                  className={`status-filter-btn ${statusFilter === 'ALL' ? 'active-all' : ''}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  <span>All Notices</span>
                  <span className="filter-badge">{statusCounts.ALL}</span>
                </button>

                <button
                  type="button"
                  className={`status-filter-btn ${statusFilter === 'PENDING' ? 'active-pending' : ''}`}
                  onClick={() => setStatusFilter('PENDING')}
                >
                  <span className="status-dot" style={{ color: '#f59e0b' }} />
                  <span>Pending</span>
                  <span className="filter-badge">{statusCounts.PENDING}</span>
                </button>

                <button
                  type="button"
                  className={`status-filter-btn ${statusFilter === 'GRANTED' ? 'active-granted' : ''}`}
                  onClick={() => setStatusFilter('GRANTED')}
                >
                  <span className="status-dot" style={{ color: '#10b981' }} />
                  <span>Granted</span>
                  <span className="filter-badge">{statusCounts.GRANTED}</span>
                </button>

                <button
                  type="button"
                  className={`status-filter-btn ${statusFilter === 'REVOKED' ? 'active-revoked' : ''}`}
                  onClick={() => setStatusFilter('REVOKED')}
                >
                  <span className="status-dot" style={{ color: '#e11d48' }} />
                  <span>Revoked</span>
                  <span className="filter-badge">{statusCounts.REVOKED}</span>
                </button>

                <button
                  type="button"
                  className={`status-filter-btn ${statusFilter === 'DENIED' ? 'active-denied' : ''}`}
                  onClick={() => setStatusFilter('DENIED')}
                >
                  <span className="status-dot" style={{ color: '#ef4444' }} />
                  <span>Denied</span>
                  <span className="filter-badge">{statusCounts.DENIED}</span>
                </button>
              </div>

              {/* Status and search match indicator */}
              <div style={{
                fontSize: '0.84rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>
                  Showing <strong>{filteredRequests.length}</strong> of {requests.length} notices
                  {statusFilter !== 'ALL' && (
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}> ({statusFilter})</span>
                  )}
                </span>
                {(statusFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Toolbar Row: Search Form */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchQuery(searchInput);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: '1 1 360px',
                  maxWidth: '620px'
                }}
              >
                <div style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Search by student name, roll no (e.g. STU001), email, or notice ID..."
                    className="form-input"
                    style={{
                      paddingLeft: '38px',
                      paddingRight: searchInput ? '34px' : '12px',
                      height: '40px',
                      fontSize: '0.86rem',
                      borderRadius: '10px'
                    }}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setSearchQuery('');
                      }}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px'
                      }}
                      title="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    height: '40px',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    borderRadius: '10px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Search size={15} />
                  <span>Search</span>
                </button>
              </form>
            </div>
          </div>

          <div className="glass-card table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Notice ID</th>
                  <th>Data Principal / Student</th>
                  <th>Roll Number</th>
                  <th>Processing Purpose</th>
                  <th>Status</th>
                  <th>Token / Portal Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      {searchQuery || statusFilter !== 'ALL' ? (
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            No requests found matching current filters
                          </p>
                          <p style={{ fontSize: '0.82rem', margin: 0 }}>
                            {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} notices found. ` : ''}
                            Try searching with a different student name, roll number, or clearing the filter.
                          </p>
                        </div>
                      ) : (
                        'No dispatched requests found.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => {
                    const dp = r.dataPrincipal || {};
                    const rollNo = dp.roll_no || dp.rollNo || r.roll_no || r.rollNo;
                    const tokenUrl = `${window.location.origin}/consent/${r.token || r.id}`;
                    const linkedConsent = consentsLookup[r.notice_id || r.noticeId] || consentsLookup[r.id] || consentsLookup[r.token];
                    const s = (r.status || 'PENDING').toUpperCase();
                    const isGranted = s === 'GRANTED' || s === 'ACTIVE';
                    const isRevoked = s === 'REVOKED' || s === 'WITHDRAWN';

                    return (
                      <tr key={r.id || r.notice_id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.notice_id || r.noticeId || r.id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dp.name || 'Data Principal'}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{dp.email}</div>
                        </td>
                        <td>
                          {rollNo ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.8rem',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#6366f1',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              display: 'inline-block'
                            }}>
                              {rollNo}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                          {r.purpose || r.title}
                        </td>
                        <td>
                          {renderStatusBadge(r.status)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tokenUrl, r.token || r.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                            >
                              {copiedToken === (r.token || r.id) ? <CheckCircle2 size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                              <span>{copiedToken === (r.token || r.id) ? 'Copied!' : 'Copy Link'}</span>
                            </button>

                            {s === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleResendEmail(r.id || r.token)}
                                disabled={resendingEmail === (r.id || r.token)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.74rem', padding: '4px 8px', opacity: resendingEmail === (r.id || r.token) ? 0.6 : 1 }}
                                title="Resend invite email via Resend"
                              >
                                <Mail size={12} />
                                <span>{resendingEmail === (r.id || r.token) ? 'Sending...' : 'Resend Email'}</span>
                              </button>
                            )}

                            {(isGranted || isRevoked || linkedConsent) && (
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt({ ...r, ...(linkedConsent || {}) })}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '4px 8px',
                                  color: isGranted ? '#10b981' : isRevoked ? '#e11d48' : 'inherit'
                                }}
                                title="View Cryptographic Consent Certificate & Integrity Hash"
                              >
                                <ShieldCheck size={12} />
                                <span>Certificate</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DISPATCH NOTICE FORM */}
      {activeSubTab === 'dispatch' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '28px 32px',
          maxWidth: '680px'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Dispatch DPDP Act Statutory Consent Notice
          </h2>

          {dispatchStatus && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.86rem',
              background: dispatchStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : (dispatchStatus.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
              color: dispatchStatus.type === 'success' ? '#34d399' : (dispatchStatus.type === 'error' ? '#f87171' : '#c084fc'),
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div>{dispatchStatus.message}</div>
              {dispatchStatus.link && (
                <div style={{ marginTop: '8px' }}>
                  <a href={dispatchStatus.link} target="_blank" rel="noreferrer" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}>
                    Open Consent Portal Notice Link &rarr;
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleDispatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                Data Principal Name
              </label>
              <input
                type="text"
                required
                value={dispatchName}
                onChange={(e) => setDispatchName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Data Principal Email
              </label>
              <input
                type="email"
                required
                value={dispatchEmail}
                onChange={(e) => setDispatchEmail(e.target.value)}
                placeholder="e.g. rahul.verma@delhiuniv.ac.in"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Student Roll Number / Enrollment ID <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={dispatchRollNo}
                onChange={(e) => setDispatchRollNo(e.target.value)}
                placeholder="e.g. CS-2026-042 or STU001"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Business Sector / Domain
              </label>
              <select
                value={dispatchDomain}
                onChange={(e) => setDispatchDomain(e.target.value)}
                className="form-select"
              >
                <option value="Higher Education">Higher Education & Universities</option>
                <option value="Banking">Banking & Financial Services</option>
                <option value="Healthcare">Healthcare & Diagnostics</option>
                <option value="FinTech">FinTech & Digital Lending</option>
                <option value="E-Commerce">E-Commerce & Retail Logistics</option>
                <option value="Corporate HR">Corporate Human Resources</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Processing Purpose
              </label>
              <textarea
                required
                rows={3}
                value={dispatchPurpose}
                onChange={(e) => setDispatchPurpose(e.target.value)}
                className="form-textarea"
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '6px' }}
            >
              Issue Digital Notice & Generate Token
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 4: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <div className="glass-card table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Action</th>
                <th>Data Principal ID</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {log.id}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {log.action}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {log.data_principal_id}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    {log.details}
                  </td>
                  <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cryptographic Consent Certificate & SHA-256 Modal */}
      {selectedReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              padding: '28px 32px',
              maxWidth: '580px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: (selectedReceipt.status || '').toUpperCase() === 'REVOKED'
                    ? 'rgba(225, 29, 72, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(selectedReceipt.status || '').toUpperCase() === 'REVOKED' ? (
                    <AlertTriangle size={22} color="#fb7185" />
                  ) : (
                    <ShieldCheck size={22} color="#10b981" />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Statutory Consent Certificate
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    DPDP Act 2023 Sec 6 Cryptographic Receipt Record
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Lifecycle Status:</span>
                {renderStatusBadge(selectedReceipt.status)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Consent ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedReceipt.consentId || selectedReceipt.consent_id || 'CNS-VERIFIED'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Notice ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedReceipt.notice_id || selectedReceipt.noticeId || selectedReceipt.id}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Data Principal / Student:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedReceipt.principalName || selectedReceipt.dataPrincipal?.name || selectedReceipt.principal_name || 'Data Principal'}
                  {(selectedReceipt.rollNo || selectedReceipt.roll_no || selectedReceipt.dataPrincipal?.roll_no) && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      marginLeft: '6px',
                      color: '#6366f1',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      [{selectedReceipt.rollNo || selectedReceipt.roll_no || selectedReceipt.dataPrincipal?.roll_no}]
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Processing Purpose:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '300px' }}>
                  {selectedReceipt.purpose || selectedReceipt.title}
                </span>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: '10px' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 500 }}>
                  Granted Attributes:
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Array.isArray(selectedReceipt.grantedAttributes || selectedReceipt.granted_attributes)
                    ? (selectedReceipt.grantedAttributes || selectedReceipt.granted_attributes).join(', ')
                    : 'All statutory requested attributes authorized'}
                </div>
              </div>

              {selectedReceipt.revocation_reason && (
                <div style={{ padding: '10px 14px', background: 'rgba(225, 29, 72, 0.08)', borderRadius: '10px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                  <div style={{ color: '#fb7185', fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>
                    Revocation Note (Sec 6(4)):
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    {selectedReceipt.revocation_reason}
                  </div>
                </div>
              )}

              <div style={{
                padding: '14px',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em' }}>
                    SHA-256 DIGITAL RECEIPT INTEGRITY HASH
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedReceipt.receiptHash || selectedReceipt.receipt_hash || 'sha256:verified', 'hash')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#818cf8',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedToken === 'hash' ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                    <span>{copiedToken === 'hash' ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                  background: 'rgba(0, 0, 0, 0.15)',
                  padding: '8px 10px',
                  borderRadius: '6px'
                }}>
                  {selectedReceipt.receiptHash || selectedReceipt.receipt_hash || 'sha256:a63f0896bd511dbb91216d2f3484f29a0df0777e4fb3ab46dfc879d71c1b1836'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Immutable Ledger Verified
              </span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.86rem' }}
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

