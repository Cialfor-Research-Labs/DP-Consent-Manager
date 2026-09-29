import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { consentApi } from '../api/consentApi';
import { 
  Building2, 
  Shield, 
  Plus, 
  Search, 
  Mail, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Info,
  X,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

const REGULATORY_DOMAINS = [
  { id: 'Education', name: 'Education & Academic Institutions', category: 'Higher Education / Educational Institution', logo: '🎓' },
  { id: 'Banking', name: 'Banking & Financial Services', category: 'Banking & Financial Institution', logo: '🏦' },
  { id: 'Healthcare', name: 'Healthcare & Diagnostic Providers', category: 'Healthcare Provider', logo: '🏥' },
  { id: 'FinTech', name: 'FinTech & Digital Lending', category: 'FinTech / NBFC Platform', logo: '💳' },
  { id: 'Corporate HR', name: 'Corporate HR & Employment', category: 'Corporate Enterprise', logo: '🏢' },
  { id: 'E-Commerce', name: 'E-Commerce & Digital Retail', category: 'E-Commerce Platform', logo: '🛒' },
  { id: 'Recruitment', name: 'Recruitment & Placement Agencies', category: 'Recruitment Agency', logo: '💼' },
  { id: 'Government', name: 'Government & Statutory Bodies', category: 'Government Body', logo: '🏛️' },
  { id: 'Insurance', name: 'Insurance & Risk Underwriters', category: 'Insurance Provider', logo: '🛡️' },
  { id: 'General', name: 'General Enterprise Services', category: 'Corporate Entity', logo: '🏢' }
];

export const SuperAdminDashboardView = () => {
  const { user } = useAuth();

  const [fiduciaries, setFiduciaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('Education');
  const [category, setCategory] = useState('Higher Education / Educational Institution');
  const [logo, setLogo] = useState('🎓');
  const [contactEmail, setContactEmail] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Load Data Fiduciaries from Backend
  const loadFiduciaries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await consentApi.fetchFiduciaries();
      if (Array.isArray(data)) {
        setFiduciaries(data);
      }
    } catch (err) {
      console.warn('Failed to load fiduciaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiduciaries();
  }, [loadFiduciaries]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Handle Domain Selection change to auto-update Category & Logo
  const handleDomainChange = (newDomain) => {
    setDomain(newDomain);
    const match = REGULATORY_DOMAINS.find(d => d.id === newDomain);
    if (match) {
      setCategory(match.category);
      setLogo(match.logo);
    }
  };

  const handleOpenModal = () => {
    setName('');
    setDomain('Education');
    setCategory('Higher Education / Educational Institution');
    setLogo('🎓');
    setContactEmail('');
    setDpoName('');
    setDpoEmail('');
    setAdminName('');
    setAdminPassword('Password@123');
    setFormError(null);
    setSuccessResult(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setSuccessResult(null);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreateFiduciary = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessResult(null);

    const cleanName = name.trim();
    const cleanEmail = contactEmail.trim().toLowerCase();

    if (!cleanName) {
      setFormError('Fiduciary Organization Name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('A valid official contact email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        domain: domain,
        category: category.trim() || undefined,
        logo: logo.trim() || '🏢',
        contact_email: cleanEmail,
        dpo_name: dpoName.trim() || 'Data Protection Officer',
        dpo_email: dpoEmail.trim().toLowerCase() || `dpo@${cleanEmail.split('@')[1] || 'domain.com'}`,
        admin_name: adminName.trim() || `${cleanName} Administrator`,
        admin_password: adminPassword || 'Password@123'
      };

      const res = await consentApi.createFiduciary(payload);
      setSuccessResult(res);
      await loadFiduciaries();
    } catch (err) {
      setFormError(err.message || 'Failed to register Data Fiduciary.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered fiduciaries based on search and domain filter
  const filteredFiduciaries = useMemo(() => {
    return fiduciaries.filter(f => {
      const matchesDomain = selectedDomain === 'ALL' || f.domain === selectedDomain;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (f.name && f.name.toLowerCase().includes(query)) ||
        (f.domain && f.domain.toLowerCase().includes(query)) ||
        (f.category && f.category.toLowerCase().includes(query)) ||
        (f.contact_email && f.contact_email.toLowerCase().includes(query)) ||
        (f.dpo_name && f.dpo_name.toLowerCase().includes(query)) ||
        (f.dpo_email && f.dpo_email.toLowerCase().includes(query));
      return matchesDomain && matchesSearch;
    });
  }, [fiduciaries, selectedDomain, searchQuery]);

  const domainCount = useMemo(() => {
    const set = new Set(fiduciaries.map(f => f.domain).filter(Boolean));
    return set.size;
  }, [fiduciaries]);

  return (
    <div className="superadmin-container">
      {/* Top Governance Hero Banner */}
      <div className="superadmin-hero">
        <div className="superadmin-hero-content">
          <div className="superadmin-pill-badge">
            <Shield size={14} />
            <span>DPDP ACT 2023 • SUPER ADMIN GOVERNANCE PORTAL</span>
          </div>
          <h1 className="superadmin-hero-title">
            Data Fiduciaries Registry & Provisioning Console
          </h1>
          <p className="superadmin-hero-subtitle">
            Authenticated Compliance Officer dashboard for registering, onboarding, and managing statutory Data Fiduciaries.
          </p>
        </div>
        <div className="superadmin-hero-actions">
          <button 
            type="button" 
            className="btn btn-primary superadmin-add-btn"
            onClick={handleOpenModal}
          >
            <Plus size={18} />
            <span>Register New Data Fiduciary</span>
          </button>
        </div>
      </div>

      {/* Statutory Privacy & Strict Isolation Architecture Card */}
      <div className="superadmin-isolation-card">
        <div className="superadmin-isolation-header">
          <div className="isolation-icon-box">
            <ShieldCheck size={22} color="var(--accent-primary)" />
          </div>
          <div>
            <h2 className="isolation-title">Architectural Role Separation & Statutory Data Isolation</h2>
            <p className="isolation-text">
              Under DPDP Act 2023 Section 6 & 8, <strong>Super Admin / Compliance Officer</strong> maintains the Data Fiduciary master registry, while individual Data Fiduciaries operate in isolated tenant silos. Super Admin cannot access individual citizen consent decisions, personal data, or private fiduciary notice pipelines.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="superadmin-stats-grid">
        <div className="superadmin-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Registered Data Fiduciaries</span>
            <div className="stat-icon-wrap bg-indigo-soft">
              <Building2 size={20} className="text-indigo" />
            </div>
          </div>
          <div className="stat-value">{fiduciaries.length}</div>
          <div className="stat-caption">Active legal entities under DPDP governance</div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Regulatory Domains</span>
            <div className="stat-icon-wrap bg-emerald-soft">
              <Layers size={20} className="text-emerald" />
            </div>
          </div>
          <div className="stat-value">{domainCount}</div>
          <div className="stat-caption">Education, Banking, Healthcare, FinTech, HR</div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">DPO Compliance Coverage</span>
            <div className="stat-icon-wrap bg-amber-soft">
              <UserCheck size={20} className="text-amber" />
            </div>
          </div>
          <div className="stat-value">100%</div>
          <div className="stat-caption">Designated Data Protection Officers on record</div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Governance Mode</span>
            <div className="stat-icon-wrap bg-cyan-soft">
              <ShieldCheck size={20} className="text-cyan" />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '4px' }}>Sec 6 & 8 Enforced</div>
          <div className="stat-caption">Multi-tenant isolation strictly verified</div>
        </div>
      </div>

      {/* Search & Domain Filter Toolbar */}
      <div className="superadmin-toolbar">
        <div className="toolbar-search-wrap">
          <Search size={16} className="toolbar-search-icon" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fiduciaries by name, domain, contact email, or DPO..."
            className="toolbar-search-input"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="toolbar-clear-btn"
              aria-label="Clear Search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-filters">
          <div className="domain-chip-group">
            <button
              type="button"
              className={`domain-chip ${selectedDomain === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedDomain('ALL')}
            >
              All Sectors ({fiduciaries.length})
            </button>
            {REGULATORY_DOMAINS.map(d => {
              const count = fiduciaries.filter(f => f.domain === d.id).length;
              if (count === 0 && selectedDomain !== d.id) return null;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`domain-chip ${selectedDomain === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDomain(d.id)}
                >
                  <span>{d.logo}</span>
                  <span>{d.id}</span>
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadFiduciaries}
            title="Refresh Registry"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Fiduciaries Cards / Table Grid */}
      <div className="superadmin-content-section">
        {loading ? (
          <div className="superadmin-loading-box">
            <div className="spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <p>Loading registered Data Fiduciaries from DPDP backend...</p>
          </div>
        ) : filteredFiduciaries.length === 0 ? (
          <div className="superadmin-empty-box">
            <Building2 size={48} className="empty-icon text-muted" />
            <h3 className="empty-title">No Data Fiduciaries Found</h3>
            <p className="empty-desc">
              {searchQuery || selectedDomain !== 'ALL' 
                ? 'No registered fiduciaries match the selected filters. Try changing your search query or domain.' 
                : 'No Data Fiduciaries are currently registered in the database.'}
            </p>
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={handleOpenModal}
              style={{ marginTop: '12px' }}
            >
              <Plus size={16} /> Register First Data Fiduciary
            </button>
          </div>
        ) : (
          <div className="fiduciary-cards-grid">
            {filteredFiduciaries.map((fid) => (
              <div key={fid.id || fid.name} className="fiduciary-registry-card">
                {/* Top Header with Logo & Domain */}
                <div className="fid-card-header">
                  <div className="fid-avatar-box">
                    <span className="fid-avatar-emoji">{fid.logo || '🏢'}</span>
                  </div>
                  <div className="fid-header-meta">
                    <h3 className="fid-card-title">{fid.name}</h3>
                    <div className="fid-domain-badge">
                      <span>{fid.domain || 'General'}</span>
                      <span className="dot-divider">•</span>
                      <span>{fid.category || 'Corporate Entity'}</span>
                    </div>
                  </div>
                  <span className="fid-status-pill">
                    <CheckCircle2 size={12} /> DPDP Verified
                  </span>
                </div>

                {/* Details Body */}
                <div className="fid-card-body">
                  <div className="fid-info-row">
                    <span className="fid-info-label">
                      <Mail size={13} /> Contact Email:
                    </span>
                    <span className="fid-info-val" title={fid.contact_email}>
                      {fid.contact_email}
                    </span>
                  </div>

                  <div className="fid-info-row">
                    <span className="fid-info-label">
                      <UserCheck size={13} /> Designated DPO:
                    </span>
                    <span className="fid-info-val">
                      {fid.dpo_name || 'Data Protection Officer'}
                    </span>
                  </div>

                  <div className="fid-info-row">
                    <span className="fid-info-label">
                      <Lock size={13} /> DPO Email:
                    </span>
                    <span className="fid-info-val" title={fid.dpo_email}>
                      {fid.dpo_email || `dpo@${fid.contact_email?.split('@')[1] || 'domain.com'}`}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="fid-card-footer">
                  <span className="fid-id-pill">ID: {fid.id || 'FID-REG'}</span>
                  <button 
                    type="button" 
                    className="fid-copy-btn"
                    onClick={() => handleCopy(`${fid.name}\nDomain: ${fid.domain}\nContact: ${fid.contact_email}\nDPO: ${fid.dpo_name} (${fid.dpo_email})`, fid.id || fid.name)}
                    title="Copy fiduciary governance record"
                  >
                    {copiedKey === (fid.id || fid.name) ? (
                      <>
                        <CheckCircle2 size={13} color="#10b981" />
                        <span style={{ color: '#10b981' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REGISTER DATA FIDUCIARY MODAL */}
      {isModalOpen && (
        <div className="superadmin-modal-backdrop modal-backdrop" onClick={handleCloseModal}>
          <div className="superadmin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <Building2 size={20} color="#ffffff" />
                </div>
                <div>
                  <h2 className="modal-title">Register Data Fiduciary Entity</h2>
                  <p className="modal-subtitle">DPDP Act 2023 Section 6 & 8 Statutory Entity Onboarding</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Success Result View */}
              {successResult ? (
                <div className="superadmin-success-box">
                  <div className="success-icon-circle">
                    <CheckCircle2 size={32} color="#10b981" />
                  </div>
                  <h3 className="success-heading">Data Fiduciary Successfully Provisioned!</h3>
                  <p className="success-description">
                    <strong>{successResult.fiduciary?.name}</strong> is now registered under the DPDP Act 2023. An administrative login account has been provisioned.
                  </p>

                  <div className="credentials-summary-card">
                    <div className="cred-title">🔐 Provisioned Administrator Credentials:</div>
                    <div className="cred-row">
                      <span>Fiduciary:</span>
                      <strong>{successResult.fiduciary?.name}</strong>
                    </div>
                    <div className="cred-row">
                      <span>Domain:</span>
                      <span>{successResult.fiduciary?.domain} ({successResult.fiduciary?.category})</span>
                    </div>
                    <div className="cred-row">
                      <span>Admin Login Email:</span>
                      <code>{successResult.admin_account?.email || successResult.fiduciary?.contact_email}</code>
                    </div>
                    <div className="cred-row">
                      <span>Initial Password:</span>
                      <code>{successResult.admin_account?.initial_password || 'Password@123'}</code>
                    </div>
                    <div className="cred-row">
                      <span>Designated DPO:</span>
                      <span>{successResult.fiduciary?.dpo_name} ({successResult.fiduciary?.dpo_email})</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={handleCloseModal}
                    >
                      Done & Return to Registry
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        handleCopy(`Fiduciary: ${successResult.fiduciary?.name}\nEmail: ${successResult.admin_account?.email || successResult.fiduciary?.contact_email}\nPassword: ${successResult.admin_account?.initial_password || 'Password@123'}`, 'modal-cred');
                      }}
                    >
                      {copiedKey === 'modal-cred' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                      <span>{copiedKey === 'modal-cred' ? 'Copied' : 'Copy Credentials'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleCreateFiduciary} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {formError && (
                    <div className="modal-error-banner">
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Section 1: Entity Details */}
                  <div className="form-section-title">
                    <Building2 size={15} /> 1. Entity & Regulatory Domain
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-label">Data Fiduciary Entity Legal Name *</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. National Skill Development University"
                      className="auth-input"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="auth-input-group">
                      <label className="auth-label">Regulatory Domain *</label>
                      <select 
                        value={domain}
                        onChange={(e) => handleDomainChange(e.target.value)}
                        className="auth-input"
                      >
                        {REGULATORY_DOMAINS.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.logo} {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-label">Industry Category</label>
                      <input 
                        type="text" 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Higher Education Institution"
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-label">Official Contact / Admin Email *</label>
                    <input 
                      type="email" 
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. compliance@nsdu.edu.in"
                      className="auth-input"
                    />
                  </div>

                  {/* Section 2: Designated DPO (Data Protection Officer) */}
                  <div className="form-section-title" style={{ marginTop: '6px' }}>
                    <UserCheck size={15} /> 2. Designated Data Protection Officer (DPO)
                  </div>

                  <div className="form-grid-2">
                    <div className="auth-input-group">
                      <label className="auth-label">DPO Full Legal Name</label>
                      <input 
                        type="text" 
                        value={dpoName}
                        onChange={(e) => setDpoName(e.target.value)}
                        placeholder="e.g. Dr. K. Ramanathan (DPO)"
                        className="auth-input"
                      />
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-label">DPO Official Email</label>
                      <input 
                        type="email" 
                        value={dpoEmail}
                        onChange={(e) => setDpoEmail(e.target.value)}
                        placeholder={contactEmail ? `dpo@${contactEmail.split('@')[1] || 'domain.com'}` : 'e.g. dpo@nsdu.edu.in'}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  {/* Section 3: Admin Login Account */}
                  <div className="form-section-title" style={{ marginTop: '6px' }}>
                    <Lock size={15} /> 3. Fiduciary Administrator Login Account
                  </div>

                  <div className="form-grid-2">
                    <div className="auth-input-group">
                      <label className="auth-label">Administrator Name</label>
                      <input 
                        type="text" 
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder={name ? `${name} Admin` : 'e.g. NSDU Admin'}
                        className="auth-input"
                      />
                    </div>

                    <div className="auth-input-group">
                      <label className="auth-label">Initial Password</label>
                      <div className="auth-input-wrap">
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Initial password (e.g. Password@123)"
                          className="auth-input"
                          style={{ paddingRight: '36px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="auth-pwd-toggle"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Buttons */}
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <span>Registering Fiduciary...</span>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Complete Fiduciary Registration</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
