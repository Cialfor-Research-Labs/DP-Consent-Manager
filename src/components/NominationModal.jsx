import React, { useState, useEffect } from 'react';
import { useConsent } from '../context/ConsentContext';
import { UserPlus, UserCheck, Shield } from 'lucide-react';

export const NominationModal = () => {
  const { nominee, assignNominee, updateNominee, dataPrincipal, nominationModalOpen, setNominationModalOpen } = useConsent();

  const [nomineeName, setNomineeName] = useState('');
  const [relationship, setRelationship] = useState('Spouse / Partner');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(true);

  useEffect(() => {
    if (nominationModalOpen) {
      setNomineeName(nominee?.nomineeName || '');
      setRelationship(nominee?.relationship || 'Spouse / Partner');
      setContactPhone(nominee?.contactPhone || '');
      setContactEmail(nominee?.contactEmail || '');
      setIdType(nominee?.idType || 'Aadhaar Card');
      setIdNumber(nominee?.idNumber || '');
      setDeclarationChecked(true);
    }
  }, [nominationModalOpen, nominee]);

  if (!nominationModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nomineeName.trim() || !declarationChecked) return;

    const saveFunc = assignNominee || updateNominee;
    saveFunc({
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

        {/* Data Principal Attribution Banner */}
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.86rem' }}>
          <div style={{ color: '#a5b4fc', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            Designating on behalf of Data Principal:
          </div>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>
            {dataPrincipal?.name || 'Data Principal'} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.85rem' }}>({dataPrincipal?.email || 'Registered Principal'})</span>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '18px', lineHeight: '1.5' }}>
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
              placeholder="e.g. Ramesh Pandey / Sunita Sharma"
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
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.9rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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

          <div style={{ marginBottom: '22px', display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <input 
              type="checkbox" 
              id="nomineeDeclaration"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              required
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="nomineeDeclaration" style={{ fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer', lineHeight: '1.4' }}>
              I confirm that the nominee details provided are accurate and authorize this individual to exercise my data rights under DPDP Act 2023 Section 14 in the event of death or incapacity.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setNominationModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!declarationChecked}>
              <UserCheck size={16} />
              {nominee ? 'Update Statutory Nominee' : 'Register & Verify Nominee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
