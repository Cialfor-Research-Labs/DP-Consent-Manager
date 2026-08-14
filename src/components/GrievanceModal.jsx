import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { HelpCircle, Send, ShieldAlert } from 'lucide-react';

export const GrievanceModal = () => {
  const { grievanceModalOpen, setGrievanceModalOpen, grievanceTarget, submitGrievance } = useConsent();

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
          <div className="modal-title" style={{ color: '#818cf8' }}>
            <HelpCircle size={24} /> File Grievance to Data Protection Officer (DPO)
          </div>
          <button className="close-btn" onClick={() => setGrievanceModalOpen(false)}>✕</button>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <div><strong>Target Fiduciary:</strong> {grievanceTarget.fiduciary}</div>
          <div><strong>DPO Contact:</strong> {grievanceTarget.dpoEmail || grievanceTarget.dpoContact || 'dpo@fiduciary.org'}</div>
          {grievanceTarget.consentId && <div><strong>Consent ID:</strong> {grievanceTarget.consentId}</div>}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Grievance Category (DPDP Act Rights):
            </label>
            <select 
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', background: '#1e293b', color: 'white' }}
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Detailed Complaint / Request Description:
            </label>
            <textarea 
              className="btn-secondary"
              style={{ width: '100%', height: '110px', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', resize: 'none' }}
              placeholder="Describe your grievance or data rights concern in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setGrievanceModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              Submit Grievance Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
