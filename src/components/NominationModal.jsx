import React, { useState } from 'react';
import { useConsent } from '../context/ConsentContext';
import { UserPlus, UserCheck, Shield } from 'lucide-react';

export const NominationModal = () => {
  const { nominee, updateNominee, nominationModalOpen, setNominationModalOpen } = useConsent();

  const [nomineeName, setNomineeName] = useState(nominee?.nomineeName || '');
  const [relationship, setRelationship] = useState(nominee?.relationship || 'Parent');
  const [contactPhone, setContactPhone] = useState(nominee?.contactPhone || '');
  const [contactEmail, setContactEmail] = useState(nominee?.contactEmail || '');
  const [idType, setIdType] = useState(nominee?.idType || 'Aadhaar Card');
  const [idNumber, setIdNumber] = useState(nominee?.idNumber || '');

  if (!nominationModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nomineeName.trim()) return;

    updateNominee({
      nomineeName,
      relationship,
      contactPhone,
      contactEmail,
      idType,
      idNumber
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: '#34d399' }}>
            <UserPlus size={24} /> Designate Statutory Nominee (DPDP Sec 14)
          </div>
          <button className="close-btn" onClick={() => setNominationModalOpen(false)}>✕</button>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.5' }}>
          Under Section 14 of the Digital Personal Data Protection Act 2023, you have the right to nominate an individual who shall exercise your privacy rights in the event of death or incapacity.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Full Legal Name of Nominee:
            </label>
            <input 
              type="text"
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Relationship to Principal:
              </label>
              <select 
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', background: '#1e293b', color: 'white' }}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="Father / Parent">Father / Parent</option>
                <option value="Mother / Parent">Mother / Parent</option>
                <option value="Spouse / Partner">Spouse / Partner</option>
                <option value="Sibling">Sibling</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Designated Executor">Designated Executor</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Contact Phone:
              </label>
              <input 
                type="text"
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Contact Email:
            </label>
            <input 
              type="email"
              className="btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="nominee.email@domain.com"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ID Verification Type:
              </label>
              <select 
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', background: '#1e293b', color: 'white' }}
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ID Number (Masked):
              </label>
              <input 
                type="text"
                className="btn-secondary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="XXXX-XXXX-1234"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setNominationModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <UserCheck size={16} />
              Register & Verify Nominee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
