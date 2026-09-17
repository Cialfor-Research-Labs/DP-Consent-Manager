import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useConsent } from '../context/ConsentContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Fingerprint, 
  Calendar, 
  Building2, 
  LogOut, 
  Sun, 
  Moon, 
  CheckCircle2, 
  UserCheck 
} from 'lucide-react';

export const AccountProfileView = () => {
  const { user, logout, isDataFiduciary } = useAuth();
  const { 
    dataPrincipal, 
    activeConsents, 
    nominee, 
    theme, 
    toggleTheme, 
    myPendingRequests, 
    dsrRequests 
  } = useConsent();

  const displayName = user?.name || dataPrincipal?.name || 'Data Principal';
  const displayEmail = user?.email || dataPrincipal?.email || '';
  const principalId = user?.data_principal_id || user?.dp_id || dataPrincipal?.id || 'DP-2026-00000';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="profile-page-container">
      <div className="page-banner">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-verified">
              <ShieldCheck size={13} /> Official Identity Record
            </span>
          </div>
          <h1>Profile & Account Details</h1>
          <p>Manage your Data Principal credentials, statutory nominee status, and privacy settings.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Profile Card */}
        <div className="glass-card profile-card">
          <div className="profile-avatar-large">
            {initial}
          </div>
          <h2 className="profile-name">{displayName}</h2>
          <span className="profile-role-pill">
            {isDataFiduciary ? 'DATA FIDUCIARY' : 'DATA PRINCIPAL'}
          </span>
          <p className="profile-email">{displayEmail}</p>

          <div className="profile-quick-stats">
            <div className="quick-stat-item">
              <span className="stat-num">{myPendingRequests.length}</span>
              <span className="stat-text">Pending</span>
            </div>
            <div className="quick-stat-item">
              <span className="stat-num">{activeConsents.filter(c => c.status === 'ACTIVE').length}</span>
              <span className="stat-text">Active</span>
            </div>
            <div className="quick-stat-item">
              <span className="stat-num">{dsrRequests.length}</span>
              <span className="stat-text">DSRs</span>
            </div>
          </div>

          <div className="profile-actions-column">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={toggleTheme}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
            </button>

            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={logout}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <LogOut size={15} />
              <span>Sign Out of Consent Manager</span>
            </button>
          </div>
        </div>

        {/* Right Column: Identity Details & Statutory Compliance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card">
            <h3 className="card-section-title">
              <Fingerprint size={18} className="text-indigo-500" />
              <span>Statutory Principal Identity</span>
            </h3>

            <div className="identity-details-grid">
              <div className="detail-item">
                <span className="detail-label">Data Principal ID</span>
                <span className="detail-value code-val">{principalId}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">KYC Verification</span>
                <span className="detail-value text-emerald-600 font-semibold flex-center">
                  <CheckCircle2 size={14} /> Verified Citizen
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Registered Institution / Domain</span>
                <span className="detail-value">{dataPrincipal.institution || 'DPDP Statutory Citizen Registry'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Registration Date</span>
                <span className="detail-value">{dataPrincipal.registeredOn || '2026-09-01'}</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="card-section-title">
              <UserCheck size={18} className="text-emerald-500" />
              <span>Designated Nominee (DPDP Act Sec 14)</span>
            </h3>

            {nominee ? (
              <div className="nominee-summary-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {nominee.nomineeName}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Relationship: {nominee.relationship} • Contact: {nominee.contactPhone || nominee.contactEmail}
                    </span>
                  </div>
                  <span className="badge badge-verified">Active Designation</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--surface-subtle)', borderRadius: '12px', border: '1px dashed var(--border-color)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                No statutory nominee has been assigned yet. You can assign a legal representative under Section 14 from the Data Rights portal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
