import React, { useState, useEffect } from 'react';
import { useConsent } from '../context/ConsentContext';
import { UserPlus, UserCheck } from 'lucide-react';

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
          <div className="modal-title" style={{ color: 'var(--success)' }}>
            <UserPlus size={24} /> Designate Statutory Nominee (DPDP Sec 14)
          </div>
          <button className="close-btn" onClick={() => setNominationModalOpen(false)}>✕</button>
        </div>

        {/* Data Principal Attribution Banner */}
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-highlight)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '18px', fontSize: '0.86rem' }}>
          <div style={{ color: 'var(--accent-primary)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
            Designating on behalf of Data Principal:
          </div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>
            {dataPrincipal?.name || 'Data Principal'} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>({dataPrincipal?.email || 'Registered Principal'})</span>
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: '1.5' }}>
          Under Section 14 of the Digital Personal Data Protection Act 2023, you have the right to nominate an individual who shall exercise your privacy rights in the event of death or incapacity.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Full Legal Name of Nominee:
            </label>
            <input 
              type="text"
              className="form-input"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="e.g. Ramesh Pandey / Sunita Sharma"
              required
            />
          </div>

          <div className="grid-2col-responsive" style={{ marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Relationship to Principal:
              </label>
              <select 
                className="form-select"
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Contact Phone:
              </label>
              <input 
                type="text"
                className="form-input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Contact Email:
            </label>
            <input 
              type="email"
              className="form-input"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="nominee.email@domain.com"
              required
            />
          </div>

          <div className="grid-2col-responsive" style={{ marginBottom: '18px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                ID Verification Type:
              </label>
              <select 
                className="form-select"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                ID Number (Masked):
              </label>
              <input 
                type="text"
                className="form-input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="XXXX-XXXX-1234"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <input 
              type="checkbox" 
              id="nomineeDeclaration"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              required
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="nomineeDeclaration" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.4' }}>
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
