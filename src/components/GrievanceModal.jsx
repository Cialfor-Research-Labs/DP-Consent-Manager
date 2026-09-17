import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { HelpCircle, Send } from 'lucide-react';

export const GrievanceModal = () => {
  const { grievanceModalOpen, setGrievanceModalOpen, grievanceTarget, submitGrievance, t } = useConsent();

  const [type, setType] = useState('UNAUTHORIZED_PROCESSING');
  const [description, setDescription] = useState('');

  if (!grievanceModalOpen || !grievanceTarget) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    submitGrievance({
      fiduciary: grievanceTarget.fiduciary,
      dpoEmail: grievanceTarget.dpoEmail || grievanceTarget.dpoContact || 'dpo@fiduciary.org',
      consentId: grievanceTarget.consentId || 'N/A',
      type,
      description
    });
    setDescription('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--accent-primary)' }}>
            <HelpCircle size={24} /> {t('grievanceModalTitle')}
          </div>
          <button className="close-btn" onClick={() => setGrievanceModalOpen(false)}>✕</button>
        </div>

        <div style={{ background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '20px', fontSize: '0.86rem', border: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '4px' }}><strong>Target Fiduciary:</strong> {grievanceTarget.fiduciary}</div>
          <div style={{ marginBottom: '4px' }}><strong>DPO Contact:</strong> {grievanceTarget.dpoEmail || grievanceTarget.dpoContact || 'dpo@fiduciary.org'}</div>
          {grievanceTarget.consentId && <div><strong>Consent ID:</strong> <code className="code-accent">{grievanceTarget.consentId}</code></div>}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {t('grievanceTypeLabel')}:
            </label>
            <select 
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="UNAUTHORIZED_PROCESSING">Report Unauthorized / Excess Data Processing</option>
              <option value="REVOCATION_DELAY">Delay in Executing Consent Revocation</option>
              <option value="DATA_CORRECTION">Request Data Correction or Erasure</option>
              <option value="THIRD_PARTY_SHARING">Unapproved Third-Party Disclosure</option>
              <option value="OTHER_INQUIRY">General Privacy Inquiry / Rights Request</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('descriptionLabel')}:
            </label>
            <textarea 
              className="form-textarea"
              style={{ height: '110px', resize: 'none' }}
              placeholder="Describe your grievance or data rights concern in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setGrievanceModalOpen(false)}>
              {t('closeBtn')}
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              {t('submitGrievanceBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
