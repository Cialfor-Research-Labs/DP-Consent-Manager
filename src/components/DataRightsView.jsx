import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  UserCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  UserPlus, 
  Lock,
  ArrowRight,
  Database
} from 'lucide-react';

export const DataRightsView = () => {
  const { 
    activeConsents, 
    auditLogs, 
    nominee, 
    removeNominee,
    dataPrincipal,
    setNominationModalOpen, 
    dsrRequests, 
    submitErasureRequest, 
    submitCorrectionRequest,
    t 
  } = useConsent();

  const [activeDsrTab, setActiveDsrTab] = useState('erasure'); // 'erasure', 'correction', 'nomination', 'tracker'

  // Erasure form state
  const [erasureFiduciary, setErasureFiduciary] = useState(activeConsents[0]?.fiduciary || '');
  const [erasureScope, setErasureScope] = useState('COMPLETE_PURGE');
  const [erasureReason, setErasureReason] = useState('Consent Revoked under DPDP Sec 6(4)');

  // Correction form state
  const [correctionFiduciary, setCorrectionFiduciary] = useState(activeConsents[0]?.fiduciary || '');
  const [fieldName, setFieldName] = useState('Mobile Phone Number');
  const [currentValue, setCurrentValue] = useState('+91 98112 34567');
  const [newValue, setNewValue] = useState('+91 98765 43210');
  const [correctionReason, setCorrectionReason] = useState('Updated official contact credentials');

  const handleErasureSubmit = (e) => {
    e.preventDefault();
    const consentObj = activeConsents.find(c => c.fiduciary === erasureFiduciary);
    submitErasureRequest({
      fiduciary: erasureFiduciary,
      consentId: consentObj ? consentObj.consentId : 'CNST-REVOKED',
      details: `Erasure Scope: ${erasureScope}. Reason: ${erasureReason}`
    });
    setActiveDsrTab('tracker');
  };

  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    submitCorrectionRequest({
      fiduciary: correctionFiduciary,
      fieldName,
      currentValue,
      newValue,
      reason: correctionReason
    });
    setActiveDsrTab('tracker');
  };

  return (
    <div className="dsr-portal-container">
      {/* Top Banner */}
      <div className="page-banner">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span className="badge badge-notice">DPDP Act 2023 • Chapter III</span>
            <span className="badge badge-verified">
              <ShieldCheck size={13} /> Statutory Rights Portal
            </span>
          </div>
          <h1>{t('dsrTitle')}</h1>
          <p>{t('dsrSub')}</p>
        </div>

        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-highlight)', padding: '16px 24px', borderRadius: '16px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Statutory Nominee Status
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            {nominee ? (
              <>
                <UserCheck size={18} style={{ color: '#34d399' }} />
                <span>{nominee.nomineeName} ({nominee.relationship})</span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Not Designated</span>
                <button 
                  onClick={() => setNominationModalOpen(true)}
                  style={{ background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginLeft: '6px' }}
                >
                  + Assign
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DSR Navigation Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeDsrTab === 'erasure' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('erasure')}
        >
          <Trash2 size={16} />
          {t('tabErasure')}
        </button>

        <button 
          className={`btn ${activeDsrTab === 'correction' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('correction')}
        >
          <Edit3 size={16} />
          {t('tabCorrection')}
        </button>

        <button 
          className={`btn ${activeDsrTab === 'nomination' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('nomination')}
        >
          <UserPlus size={16} />
          {t('tabNomination')}
        </button>

        <button 
          className={`btn ${activeDsrTab === 'tracker' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('tracker')}
          style={{ marginLeft: 'auto' }}
        >
          <Clock size={16} />
          {t('tabDsrTracker')} ({dsrRequests.length})
        </button>
      </div>

      {/* SUB-TAB 1: RIGHT TO ERASURE (SEC 12) */}
      {activeDsrTab === 'erasure' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
              <Trash2 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Right to Erasure & Data Deletion (DPDP Sec 12)</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Request complete erasure of personal data previously collected by a Data Fiduciary once the specified purpose is fulfilled or consent is withdrawn.
              </p>
            </div>
          </div>

          <form onSubmit={handleErasureSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('selectFiduciaryLabel')}
              </label>
              <select 
                className="btn-secondary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                value={erasureFiduciary}
                onChange={(e) => setErasureFiduciary(e.target.value)}
                required
              >
                {activeConsents.map(c => (
                  <option key={c.consentId} value={c.fiduciary}>
                    {c.fiduciary} (Consent ID: {c.consentId} • Status: {c.status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('erasureScopeLabel')}
              </label>
              <select 
                className="btn-secondary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                value={erasureScope}
                onChange={(e) => setErasureScope(e.target.value)}
              >
                <option value="COMPLETE_PURGE">Complete Purge (Delete all profile, scores & contact records)</option>
                <option value="OPTIONAL_ATTRIBUTES_ONLY">Selective Erasure (Erase optional attributes & retain mandatory records)</option>
                <option value="LOGS_AND_METADATA">Audit Metadata & Session Log Deletion</option>
              </select>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('erasureReasonLabel')}
              </label>
              <textarea 
                className="btn-secondary"
                style={{ width: '100%', height: '100px', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', resize: 'none' }}
                value={erasureReason}
                onChange={(e) => setErasureReason(e.target.value)}
                placeholder="e.g. Consent withdrawn under Sec 6(4). Service registration completed."
                required
              />
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '16px 20px', borderRadius: '12px', marginBottom: '28px', fontSize: '0.85rem', color: '#fca5a5', display: 'flex', gap: '12px' }}>
              <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {t('legalImpactDisclaimer')}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button type="submit" className="btn btn-danger" style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                <Send size={18} />
                {t('submitErasureBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: RIGHT TO CORRECTION (SEC 11) */}
      {activeDsrTab === 'correction' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Edit3 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Right to Data Correction & Updating (DPDP Sec 11)</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Request correction, completion, or updating of inaccurate or outdated personal data processed by Data Fiduciaries.
              </p>
            </div>
          </div>

          <form onSubmit={handleCorrectionSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Target Data Fiduciary:
              </label>
              <select 
                className="btn-secondary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                value={correctionFiduciary}
                onChange={(e) => setCorrectionFiduciary(e.target.value)}
                required
              >
                {activeConsents.map(c => (
                  <option key={c.consentId} value={c.fiduciary}>
                    {c.fiduciary}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {t('attributeToCorrectLabel')}
                </label>
                <input 
                  type="text"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem' }}
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Residential Address, Mobile Number, Name spelling"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {t('currentInaccurateLabel')}
                </label>
                <input 
                  type="text"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem' }}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Current value on record"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('newCorrectedLabel')}
              </label>
              <input 
                type="text"
                className="btn-secondary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', color: '#34d399', fontWeight: 600 }}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter accurate value"
                required
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('correctionReasonLabel')}
              </label>
              <textarea 
                className="btn-secondary"
                style={{ width: '100%', height: '90px', padding: '14px', borderRadius: '12px', fontSize: '0.92rem', resize: 'none' }}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain reason for correction or document reference..."
                required
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                <Send size={18} />
                {t('submitCorrectionBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: RIGHT TO NOMINATE (SEC 14) */}
      {activeDsrTab === 'nomination' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Right to Nominate (DPDP Sec 14)</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Data Principal: <strong style={{ color: '#e2e8f0' }}>{dataPrincipal.name}</strong> ({dataPrincipal.email})
                </p>
              </div>
            </div>

            {nominee ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => setNominationModalOpen(true)}
                >
                  <UserPlus size={16} />
                  Change Nominee
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to revoke this statutory nominee designation under DPDP Act Section 14?')) {
                      removeNominee();
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Revoke
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={() => setNominationModalOpen(true)}
              >
                <UserPlus size={16} />
                + Assign Nominee
              </button>
            )}
          </div>

          {nominee ? (
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-verified" style={{ marginBottom: '8px' }}>
                    <CheckCircle2 size={12} /> DPDP Verified Statutory Nominee
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {nominee.nomineeName}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#818cf8', fontWeight: 600, marginTop: '2px' }}>
                    Relationship: {nominee.relationship}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Designated Date</div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{nominee.dateDesignated || new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{nominee.contactPhone}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Email:</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{nominee.contactEmail}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Identity Proof:</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{nominee.idType} ({nominee.idNumber})</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Statutory Status:</span>
                  <div style={{ color: '#34d399', fontWeight: 600, marginTop: '2px' }}>Active & Registered</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '2px dashed rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '36px 24px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#818cf8' }}>
                <UserPlus size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                No Statutory Nominee Assigned Yet
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                Under Section 14 of the Digital Personal Data Protection Act 2023, you have the statutory legal right to designate an authorized individual who can exercise your consent management, data rights, and grievance redressal in the event of death or incapacity.
              </p>
              <button 
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                onClick={() => setNominationModalOpen(true)}
              >
                <UserPlus size={18} />
                + Assign Your Statutory Nominee
              </button>
            </div>
          )}

          <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '16px 20px', borderRadius: '12px', fontSize: '0.85rem', color: '#a5b4fc', display: 'flex', gap: '12px' }}>
            <ShieldCheck size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Section 14 Legal Protection:</strong> In the event of death or incapacity of the Data Principal, the designated nominee shall exercise the right to grant, manage, or revoke consent and file grievances with Data Fiduciaries and the Data Protection Board of India.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DSR REQUEST TRACKER */}
      {activeDsrTab === 'tracker' && (
        <div className="glass-card table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>DSR Statutory SLA Request Tracker</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Statutory Response Window: 30 Days (DPDP Rules)
            </span>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Request Type</th>
                <th>Data Fiduciary</th>
                <th>Details / Scope</th>
                <th>Submitted On</th>
                <th>SLA Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dsrRequests.map((req) => {
                let badgeClass = 'badge-notice';
                if (req.status === 'COMPLETED') badgeClass = 'badge-verified';
                if (req.status === 'PROCESSING') badgeClass = 'badge-active';

                return (
                  <tr key={req.ticketId}>
                    <td>
                      <code style={{ fontSize: '0.82rem', color: '#60a5fa' }}>{req.ticketId}</code>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {req.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'white' }}>{req.fiduciary}</td>
                    <td style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '280px' }}>{req.details}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(req.submittedOn).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600 }}>
                      {req.slaDeadline}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: req.status === 'COMPLETED' ? '#34d399' : '#f59e0b' }}>
                        ● {req.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
