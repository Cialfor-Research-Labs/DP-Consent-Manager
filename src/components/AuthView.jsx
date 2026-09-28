import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { consentApi } from '../api/consentApi';
import { Shield, Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Building2, FileText, Key, ArrowLeft, RefreshCw, Send } from 'lucide-react';

export const AuthView = ({ consentToken = null }) => {
  const { login, register, authError, setAuthError } = useAuth();
  const [requestPreview, setRequestPreview] = useState(null);

  // If a consentToken was passed, persist it so App.jsx post-login redirect works,
  // and fetch the public preview to provide context and pre-fill the recipient's email
  useEffect(() => {
    if (consentToken) {
      try { sessionStorage.setItem('dp_pending_consent_token', consentToken); } catch {}
      consentApi.getPublicConsentRequest(consentToken).then(data => {
        if (data) {
          setRequestPreview(data);
          if (data.principal_email) {
            setEmail(prev => prev || data.principal_email);
          }
          if (data.principal_name) {
            setName(prev => prev || data.principal_name);
          }
        }
      }).catch(() => {});
    }
  }, [consentToken]);

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  // Forgot Password Fields
  const [forgotStep, setForgotStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP & New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Detect ?action=reset_password in URL params from email link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'reset_password' || params.get('token') || params.get('otp')) {
        if (params.get('action') === 'reset_password') {
          setMode('forgot');
          setForgotStep(2);
          if (params.get('email')) setForgotEmail(params.get('email'));
          if (params.get('otp')) setOtp(params.get('otp'));
          if (params.get('token')) setResetToken(params.get('token'));
          setForgotSuccessMsg('Security reset link verified. Enter your verification code & set a new password.');
        }
      }
    } catch (e) {}
  }, []);

  // OTP Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetForm = (newMode) => {
    setMode(newMode);
    setLocalError(null);
    setForgotSuccessMsg('');
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

  const handleForgotRequestOtp = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setForgotSuccessMsg('');
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await consentApi.forgotPassword(targetEmail);
      setForgotSuccessMsg(res.message || `A 6-digit verification code has been dispatched to ${targetEmail} via Gmail.`);
      setForgotStep(2);
      setCountdown(60);
    } catch (err) {
      setLocalError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLocalError(null);
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) return;

    setLoading(true);
    try {
      const res = await consentApi.forgotPassword(targetEmail);
      setForgotSuccessMsg(`A new 6-digit code was sent to ${targetEmail}.`);
      setCountdown(60);
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp && !resetToken) {
      setLocalError('Please enter the 6-digit verification code sent to your Gmail.');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const isStrong = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword) && /[@$!%*#?&_\-^~+=]/.test(newPassword);
    if (!isStrong) {
      setLocalError('Password must contain uppercase, lowercase, number, and a special character.');
      return;
    }

    setLoading(true);
    try {
      const res = await consentApi.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: cleanOtp || undefined,
        reset_token: resetToken || undefined,
        new_password: newPassword
      });

      // Switch to login mode with success notification
      setMode('login');
      setEmail(forgotEmail.trim().toLowerCase());
      setPassword('');
      setForgotSuccessMsg(res.message || 'Password reset successfully! You can now sign in with your new password.');
      setForgotStep(1);
      setOtp('');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      try {
        if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {}
    } catch (err) {
      setLocalError(err.message || 'Failed to reset password. Please check your verification code.');
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

  const newPasswordChecks = [
    { label: '8+ Characters', valid: newPassword.length >= 8 },
    { label: 'Uppercase', valid: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase', valid: /[a-z]/.test(newPassword) },
    { label: 'Number', valid: /\d/.test(newPassword) },
    { label: 'Special char', valid: /[@$!%*#?&_\-^~+=]/.test(newPassword) }
  ];

  const errorMessage = localError || authError;
  const showConsentNotice = Boolean(consentToken);

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-brand-icon">
            {mode === 'forgot' ? <Key size={26} color="#ffffff" /> : <Shield size={28} color="#ffffff" />}
          </div>
          <h1 className="auth-title">
            {mode === 'forgot' ? 'Reset Password' : 'Data Principal Consent Manager'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'forgot'
              ? 'Authenticate via your registered Gmail account to set a new password'
              : 'Digital Personal Data Protection (DPDP) Act 2023 Statutory Privacy Portal'}
          </p>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' ? (
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
          ) : (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => resetForm('login')}
                className="btn-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} /> Back to Sign In
              </button>
            </div>
          )}
        </div>

        <div className="auth-body">
          {/* Success Banner */}
          {forgotSuccessMsg && !errorMessage && (
            <div style={{
              background: 'var(--success-bg, rgba(16, 185, 129, 0.1))',
              border: '1px solid var(--success-border, rgba(16, 185, 129, 0.3))',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: 'var(--success, #10b981)',
              fontSize: '0.85rem',
              fontWeight: 600,
              lineHeight: 1.4
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{forgotSuccessMsg}</span>
            </div>
          )}
          {/* Consent-context Notification */}
          {showConsentNotice && !errorMessage && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 700, fontSize: '0.86rem' }}>
                <Shield size={17} style={{ flexShrink: 0 }} />
                <span>Statutory DPDP Consent Request</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {requestPreview ? (
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>{requestPreview.fiduciary_name}</strong> has dispatched a consent request notice for: <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{requestPreview.purpose}"</span>.
                  </span>
                ) : (
                  <span>You have received a statutory DPDP consent invitation notice.</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#a5b4fc', fontWeight: 600 }}>
                Sign in or create an account to view requested data attributes and grant consent.
              </p>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="auth-label" style={{ marginBottom: 0 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setForgotEmail(email || '');
                      setLocalError(null);
                      setForgotSuccessMsg('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
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
                      <strong style={{ color: 'var(--text-primary)' }}>Prerna Pandey</strong> (Data Fiduciary)
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

          {/* FORGOT PASSWORD FLOW */}
          {mode === 'forgot' && (
            <div>
              {forgotStep === 1 ? (
                /* Step 1: Request 6-digit OTP code */
                <form onSubmit={handleForgotRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--accent-soft, rgba(99, 102, 241, 0.08))',
                    border: '1px solid var(--border-highlight, rgba(99, 102, 241, 0.2))',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                      <Mail size={15} /> Gmail Verification Authentication
                    </div>
                    <div>
                      Enter your registered email address below. We will send a secure 6-digit one-time verification code (OTP) to your Gmail inbox to authenticate your identity.
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-label">Registered Email Address</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. prerna.p1426@gmail.com"
                        className="auth-input"
                        autoFocus
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
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? (
                      <span>Sending Verification Code...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Verification Code via Gmail</span>
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => resetForm('login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Remember your password? <span style={{ color: 'var(--accent-primary)' }}>Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Enter OTP Code & Set New Password */
                <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Code sent to: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setLocalError(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Change Email
                    </button>
                  </div>

                  {/* 6-Digit OTP Input */}
                  <div className="auth-input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="auth-label" style={{ marginBottom: 0 }}>
                        6-Digit Verification Code (OTP)
                      </label>
                      {countdown > 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Resend in {countdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--accent-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RefreshCw size={12} /> Resend Code
                        </button>
                      )}
                    </div>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <Key size={16} />
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 583921"
                        className="auth-input"
                        style={{
                          letterSpacing: '4px',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          fontFamily: 'monospace'
                        }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="auth-input-group">
                    <label className="auth-label">New Password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="auth-input"
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="auth-pwd-toggle"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password strength indicators */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                      {newPasswordChecks.map((chk, i) => (
                        <span key={i} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: chk.valid ? 'var(--success-bg, rgba(16, 185, 129, 0.1))' : 'var(--bg-card-subtle, rgba(255,255,255,0.05))',
                          border: `1px solid ${chk.valid ? 'var(--success-border, rgba(16, 185, 129, 0.3))' : 'var(--border-color)'}`,
                          color: chk.valid ? 'var(--success, #10b981)' : 'var(--text-muted)',
                          fontWeight: chk.valid ? 700 : 500
                        }}>
                          <CheckCircle2 size={10} /> {chk.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="auth-input-group">
                    <label className="auth-label">Confirm New Password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter your new password"
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
                    {loading ? <span>Updating Password...</span> : <span>Reset Password & Sign In</span>}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => resetForm('login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel and <span style={{ color: 'var(--accent-primary)' }}>Return to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
