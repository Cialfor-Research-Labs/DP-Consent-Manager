import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthView = ({ consentToken = null }) => {
  const { login, register, authError, setAuthError } = useAuth();

  // If a consentToken was passed, persist it so App.jsx post-login redirect works
  React.useEffect(() => {
    if (consentToken) {
      try { sessionStorage.setItem('dp_pending_consent_token', consentToken); } catch {}
    }
  }, [consentToken]);

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const resetForm = (newMode) => {
    setMode(newMode);
    setLocalError(null);
    if (setAuthError) setAuthError(null);
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLocalError(null);
    if (setAuthError) setAuthError(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please provide both email address and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      try {
        if (window.location.pathname !== '/' || window.location.search) {
          window.history.replaceState({}, '', '/');
        }
      } catch (e) {}
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Email address is required.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'DATA_PRINCIPAL'
      });
      try {
        if (window.location.pathname !== '/' || window.location.search) {
          window.history.replaceState({}, '', '/');
        }
      } catch (e) {}
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { label: '8+ Characters', valid: password.length >= 8 },
    { label: 'Uppercase', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase', valid: /[a-z]/.test(password) },
    { label: 'Number', valid: /\d/.test(password) },
    { label: 'Special char', valid: /[@$!%*#?&_\-^~+=]/.test(password) }
  ];

  const errorMessage = localError || authError;

  const showConsentNotice = Boolean(consentToken);

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-brand-icon">
            <Shield size={28} color="#ffffff" />
          </div>
          <h1 className="auth-title">
            Data Principal Consent Manager
          </h1>
          <p className="auth-subtitle">
            Digital Personal Data Protection (DPDP) Act 2023 Statutory Privacy Portal
          </p>

          {/* Mode Switcher Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => resetForm('login')}
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => resetForm('register')}
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="auth-body">
          {/* Consent-context Notification */}
          {showConsentNotice && !errorMessage && (
            <div style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--accent-primary)',
              fontSize: '0.84rem',
              fontWeight: 600
            }}>
              <Shield size={18} style={{ flexShrink: 0 }} />
              <span>Please sign in or create an account to review and respond to your consent request.</span>
            </div>
          )}

          {/* Error Message Display */}
          {errorMessage && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="auth-input-group">
                <label className="auth-label">
                  Email Address
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. pandeyprerna1407@gmail.com"
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  Password
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="auth-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-pwd-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  marginTop: '4px'
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Consent Manager</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* DEMO ACCOUNTS QUICK-FILL */}
              <div className="auth-demo-box">
                <span className="auth-demo-title">
                  ⚡ Quick Demo Logins:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('pandeyprerna1407@gmail.com', 'Password@123')}
                    className="auth-demo-card"
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Prerna Pandey</strong> (Data Principal)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>pandeyprerna1407@gmail.com</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('rahul.verma@delhiuniv.ac.in', 'Password@123')}
                    className="auth-demo-card"
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Rahul Verma</strong> (Data Principal)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>rahul.verma@delhiuniv.ac.in</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@cialfor.com', 'Admin@123')}
                    className="auth-demo-card"
                    style={{ background: 'var(--accent-soft)', borderColor: 'var(--border-highlight)' }}
                  >
                    <div>
                      <strong style={{ color: 'var(--accent-primary)' }}>Compliance Officer</strong> (Data Fiduciary / Admin)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>admin@cialfor.com</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Fill &rarr;</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="auth-input-group">
                <label className="auth-label">
                  Full Legal Name
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  Email Address
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ananya.sharma@domain.com"
                    className="auth-input"
                  />
                </div>
              </div>

              {/* Role Scope Notice */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--accent-soft)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '3px' }}>
                  <Shield size={15} /> Account Role: Data Principal
                </div>
                <div>
                  Self-registration creates an individual citizen account under Section 6 of the DPDP Act 2023.
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  Password
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="auth-input"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-pwd-toggle"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {passwordChecks.map((chk, i) => (
                    <span key={i} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: chk.valid ? 'var(--success-bg)' : 'var(--bg-card-subtle)',
                      border: `1px solid ${chk.valid ? 'var(--success-border)' : 'var(--border-color)'}`,
                      color: chk.valid ? 'var(--success)' : 'var(--text-muted)',
                      fontWeight: chk.valid ? 700 : 500
                    }}>
                      <CheckCircle2 size={10} /> {chk.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  Confirm Password
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="auth-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  marginTop: '4px'
                }}
              >
                {loading ? <span>Creating Account...</span> : <span>Create Account & Log In</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
