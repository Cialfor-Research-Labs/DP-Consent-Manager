import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, User, Building, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthView = () => {
  const { login, register, authError, setAuthError } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('DATA_PRINCIPAL'); // 'DATA_PRINCIPAL' or 'DATA_FIDUCIARY'
  const [fiduciaryName, setFiduciaryName] = useState('Cialfor Research Labs Private Limited');
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at 50% -10%, rgba(99, 102, 241, 0.22) 0%, transparent 70%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden'
      }}>
        {/* Header Branding */}
        <div style={{
          padding: '36px 36px 24px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--accent-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            marginBottom: '16px'
          }}>
            <Shield size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Data Principal Consent Manager
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
            Digital Personal Data Protection (DPDP) Act 2023 Statutory Privacy Portal
          </p>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-subtle)',
            borderRadius: '12px',
            padding: '4px',
            marginTop: '20px',
            border: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={() => resetForm('login')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: mode === 'login' ? 'var(--accent-primary)' : 'transparent',
                color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => resetForm('register')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: mode === 'register' ? 'var(--accent-primary)' : 'transparent',
                color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              Create Account
            </button>
          </div>
        </div>

        <div style={{ padding: '28px 36px 36px' }}>
          {/* Error Message Display */}
          {errorMessage && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.verma@delhiuniv.ac.in"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '6px',
                  transition: 'opacity 0.2s ease'
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Consent Manager</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* DEMO ACCOUNTS QUICK-FILL */}
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px dashed var(--border-color)'
              }}>
                <span style={{ display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>
                  ⚡ Quick Demo Logins:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('rahul.verma@delhiuniv.ac.in', 'Password@123')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Rahul Verma</strong> (Data Principal)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>rahul.verma@delhiuniv.ac.in</div>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#c084fc', fontWeight: 600 }}>Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('pandeyprerna1407@gmail.com', 'Password@123')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Prerna Pandey</strong> (Data Principal)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>pandeyprerna1407@gmail.com</div>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#c084fc', fontWeight: 600 }}>Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@cialfor.com', 'Admin@123')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#818cf8' }}>Compliance Officer</strong> (Data Fiduciary / Admin)
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>admin@cialfor.com</div>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: 600 }}>Fill &rarr;</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ananya.sharma@domain.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Role Scope Notice */}
              <div style={{
                padding: '12px 14px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#818cf8', marginBottom: '4px' }}>
                  <Shield size={16} /> Account Role: Data Principal
                </div>
                <div>
                  Self-registration creates an individual citizen account under Section 6 of the DPDP Act 2023.
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Enterprise Data Fiduciary & Admin accounts are provisioned directly by system administrators.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Password strength badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {passwordChecks.map((chk, i) => (
                    <span key={i} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: chk.valid ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-subtle)',
                      color: chk.valid ? '#34d399' : 'var(--text-muted)'
                    }}>
                      <CheckCircle2 size={11} /> {chk.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px'
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
