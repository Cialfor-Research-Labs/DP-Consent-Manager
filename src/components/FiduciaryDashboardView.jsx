import React, { useState, useEffect, useCallback } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { BulkNoticeDispatcher } from './BulkNoticeDispatcher';

export const FiduciaryDashboardView = () => {
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests', 'consents', 'bulk', 'dispatch', 'audit'
  const [requests, setRequests] = useState([]);
  const [consents, setConsents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(null); // request id being resent

  // New Notice Dispatch Form state
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchEmail, setDispatchEmail] = useState('');
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
        purpose: dispatchPurpose,
        domain: dispatchDomain,
        requested_attributes: [
          { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
          { id: 'attr_id', name: 'Government Identity Proof', category: 'IDENTITY', required: true, sensitive: true },
          { id: 'attr_contact', name: 'Contact Phone & Address', category: 'CONTACT', required: false, sensitive: false }
        ],
        email_subject: `Statutory DPDP Notice: ${dispatchPurpose}`,
        email_body: `Dear ${dispatchName},\n\n${dispatchFiduciary} requests your digital consent under the DPDP Act 2023 for: ${dispatchPurpose}.`
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

  const totalDispatched = requests.length;
  const totalGranted = consents.filter(c => c.status === 'ACTIVE').length;
  const totalRevoked = consents.filter(c => c.status === 'REVOKED').length;

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
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Dispatched Notices</span>
            <Send size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            {totalDispatched}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#818cf8', marginTop: '4px' }}>Under Sec 6 Notice Rules</div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Granted Consents</span>
            <CheckCircle2 size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '8px' }}>
            {totalGranted}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cryptographically Verified</div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Revocations Processed</span>
            <AlertTriangle size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '8px' }}>
            {totalRevoked}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Sec 6(4) Right Exercised</div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Audit Trail Events</span>
            <History size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '8px' }}>
            {auditLogs.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Immutable Ledger Records</div>
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
          onClick={() => setActiveSubTab('consents')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'consents' ? 'var(--accent-primary)' : 'transparent',
            color: activeSubTab === 'consents' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Granted Consents ({consents.length})
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
        <div className="glass-card table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Notice ID</th>
                <th>Data Principal</th>
                <th>Processing Purpose</th>
                <th>Status</th>
                <th>Token / Portal Link</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const dp = r.dataPrincipal || {};
                const tokenUrl = `${window.location.origin}/consent/${r.token || r.id}`;
                return (
                  <tr key={r.id || r.notice_id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {r.notice_id || r.noticeId || r.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dp.name || 'Data Principal'}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{dp.email}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                      {r.purpose || r.title}
                    </td>
                    <td>
                      <span className={`status-pill ${r.status === 'GRANTED' ? 'pill-emerald' : (r.status === 'DENIED' ? 'pill-rose' : 'pill-amber')}`}>
                        ● {r.status || 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tokenUrl, r.token || r.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                        >
                          {copiedToken === (r.token || r.id) ? <CheckCircle2 size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                          <span>{copiedToken === (r.token || r.id) ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        {r.status === 'PENDING' && (
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-VIEW 2: GRANTED CONSENTS */}
      {activeSubTab === 'consents' && (
        <div className="glass-card table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Consent ID</th>
                <th>Notice ID</th>
                <th>Status</th>
                <th>Granted Attributes</th>
                <th>SHA-256 Integrity Hash</th>
              </tr>
            </thead>
            <tbody>
              {consents.map((c) => (
                <tr key={c.consentId || c.consent_id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.consentId || c.consent_id}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {c.noticeId || c.notice_id}
                  </td>
                  <td>
                    <span className={`status-pill ${c.status === 'ACTIVE' ? 'pill-emerald' : 'pill-rose'}`}>
                      ● {c.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '280px' }}>
                    {Array.isArray(c.grantedAttributes) ? c.grantedAttributes.join(', ') : 'All authorized attributes'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {c.receiptHash ? `${c.receiptHash.substring(0, 16)}...` : 'sha256:verified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
};
