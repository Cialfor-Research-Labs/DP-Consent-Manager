import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  Send, 
  UserPlus
} from 'lucide-react';

export const DataRightsView = () => {
  const { 
    activeConsents, 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-notice">DPDP Act 2023 • Chapter III</span>
            <span className="badge badge-verified">
              <ShieldCheck size={13} /> Statutory Rights Portal
            </span>
          </div>
          <h1>{t('dsrTitle')}</h1>
          <p>{t('dsrSub')}</p>
        </div>

        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', padding: '16px 20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Statutory Nominee Status
          </div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {nominee ? (
              <>
                <UserCheck size={18} style={{ color: 'var(--success)' }} />
                <span>{nominee.nomineeName} ({nominee.relationship})</span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 500 }}>Not Designated</span>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setNominationModalOpen(true)}
                  style={{ marginLeft: '6px' }}
                >
                  + Assign
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DSR Navigation Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', flexWrap: 'wrap' }}>
        <button 
          type="button"
          className={`btn btn-sm ${activeDsrTab === 'erasure' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('erasure')}
        >
          <Trash2 size={15} />
          <span>{t('tabErasure')}</span>
        </button>

        <button 
          type="button"
          className={`btn btn-sm ${activeDsrTab === 'correction' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('correction')}
        >
          <Edit3 size={15} />
          <span>{t('tabCorrection')}</span>
        </button>

        <button 
          type="button"
          className={`btn btn-sm ${activeDsrTab === 'nomination' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('nomination')}
        >
          <UserPlus size={15} />
          <span>{t('tabNomination')}</span>
        </button>

        <button 
          type="button"
          className={`btn btn-sm ${activeDsrTab === 'tracker' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveDsrTab('tracker')}
        >
          <Clock size={15} />
          <span>{t('tabDsrTracker')} ({dsrRequests.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: RIGHT TO ERASURE (SEC 12) */}
      {activeDsrTab === 'erasure' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0 }}>
              <Trash2 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Right to Erasure & Data Deletion (DPDP Sec 12)</h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Request complete erasure of personal data previously collected by a Data Fiduciary once the specified purpose is fulfilled or consent is withdrawn.
              </p>
            </div>
          </div>

          <form onSubmit={handleErasureSubmit}>
            <div className="form-group">
              <label className="form-label">
                {t('selectFiduciaryLabel')}
              </label>
              <select 
                className="form-select"
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

            <div className="form-group">
              <label className="form-label">
                {t('erasureScopeLabel')}
              </label>
              <select 
                className="form-select"
                value={erasureScope}
                onChange={(e) => setErasureScope(e.target.value)}
              >
                <option value="COMPLETE_PURGE">Complete Purge (Delete all profile, scores & contact records)</option>
                <option value="OPTIONAL_ATTRIBUTES_ONLY">Selective Erasure (Erase optional attributes & retain mandatory records)</option>
                <option value="LOGS_AND_METADATA">Audit Metadata & Session Log Deletion</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('erasureReasonLabel')}
              </label>
              <textarea 
                className="form-textarea"
                style={{ height: '100px', resize: 'none' }}
                value={erasureReason}
                onChange={(e) => setErasureReason(e.target.value)}
                placeholder="e.g. Consent withdrawn under Sec 6(4). Service registration completed."
                required
              />
            </div>

            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--danger)', display: 'flex', gap: '12px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {t('legalImpactDisclaimer')}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-outline-danger">
                <Send size={16} />
                <span>{t('submitErasureBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: RIGHT TO CORRECTION (SEC 11) */}
      {activeDsrTab === 'correction' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
              <Edit3 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Right to Data Correction & Updating (DPDP Sec 11)</h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Request correction, completion, or updating of inaccurate or outdated personal data processed by Data Fiduciaries.
              </p>
            </div>
          </div>

          <form onSubmit={handleCorrectionSubmit}>
            <div className="form-group">
              <label className="form-label">
                Target Data Fiduciary:
              </label>
              <select 
                className="form-select"
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

            <div className="grid-2col-responsive" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t('attributeToCorrectLabel')}
                </label>
                <input 
                  type="text"
                  className="form-input"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Residential Address, Mobile Number, Name spelling"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t('currentInaccurateLabel')}
                </label>
                <input 
                  type="text"
                  className="form-input"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Current value on record"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('newCorrectedLabel')}
              </label>
              <input 
                type="text"
                className="form-input"
                style={{ color: 'var(--success)', fontWeight: 600 }}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter accurate value"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('correctionReasonLabel')}
              </label>
              <textarea 
                className="form-textarea"
                style={{ height: '90px', resize: 'none' }}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain reason for correction or document reference..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Send size={16} />
                <span>{t('submitCorrectionBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: RIGHT TO NOMINATE (SEC 14) */}
      {activeDsrTab === 'nomination' && (
        <div className="glass-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                <UserCheck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Right to Nominate (DPDP Sec 14)</h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Data Principal: <strong style={{ color: 'var(--text-primary)' }}>{dataPrincipal.name}</strong> ({dataPrincipal.email})
                </p>
              </div>
            </div>

            {nominee ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setNominationModalOpen(true)}
                >
                  <UserPlus size={15} />
                  <span>Change Nominee</span>
                </button>
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to revoke this statutory nominee designation under DPDP Act Section 14?')) {
                      removeNominee();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>Revoke</span>
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setNominationModalOpen(true)}
              >
                <UserPlus size={15} />
                <span>+ Assign Nominee</span>
              </button>
            )}
          </div>

          {nominee ? (
            <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span className="badge badge-verified" style={{ marginBottom: '8px' }}>
                    <ShieldCheck size={12} /> DPDP Verified Statutory Nominee
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {nominee.nomineeName}
                  </h3>
                  <div style={{ fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '2px' }}>
                    Relationship: {nominee.relationship}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Designated Date</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{nominee.dateDesignated || new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              <div className="grid-2col-responsive" style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.88rem' }}>
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
                  <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '2px' }}>Active & Registered</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-subtle)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '36px 20px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--accent-primary)' }}>
                <UserPlus size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                No Statutory Nominee Assigned Yet
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                Under Section 14 of the Digital Personal Data Protection Act 2023, you have the statutory legal right to designate an authorized individual who can exercise your consent management, data rights, and grievance redressal in the event of death or incapacity.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setNominationModalOpen(true)}
              >
                <UserPlus size={16} />
                <span>+ Assign Your Statutory Nominee</span>
              </button>
            </div>
          )}

          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', color: 'var(--accent-primary)', display: 'flex', gap: '12px' }}>
            <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Section 14 Legal Protection:</strong> In the event of death or incapacity of the Data Principal, the designated nominee shall exercise the right to grant, manage, or revoke consent and file grievances with Data Fiduciaries and the Data Protection Board of India.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DSR REQUEST TRACKER */}
      {activeDsrTab === 'tracker' && (
        <div className="glass-card table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>DSR Statutory SLA Request Tracker</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                      <code style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{req.ticketId}</code>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {req.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.fiduciary}</td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>{req.details}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(req.submittedOn).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--warning)', fontWeight: 700 }}>
                      {req.slaDeadline}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: req.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)' }}>
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
