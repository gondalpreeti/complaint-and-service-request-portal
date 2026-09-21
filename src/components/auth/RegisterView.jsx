import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function RegisterView() {
  const { register, navigateTo } = useAuth()

  const [email, setEmail] = useState('')
  const [prn, setPrn] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}

    // Email
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    // PRN (Permanent Registration Number)
    if (!prn.trim()) {
      errs.prn = 'PRN (Permanent Registration Number) is required.'
    } else if (prn.trim().length < 4) {
      errs.prn = 'PRN must be at least 4 characters.'
    }

    // Password
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters long.'
    }

    // Confirm Password
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!validate()) return

    setLoading(true)
    try {
      // Calls supabase.auth.signUp() with email, password, and options.data.prn
      await register(email, password, prn)
      // Upon success, AuthContext automatically navigates to 'verify-otp' with signup type
    } catch (err) {
      console.error('[RegisterView] Error during registration:', err)
      setServerError(err.message || 'Registration failed. Please check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="auth-header">
        <div className="auth-icon-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        <h2 className="auth-title">Create Student Account</h2>
        <p className="auth-subtitle">
          Register with your institutional credentials to begin lodging campus requests.
        </p>
      </div>

      {/* Server Error Banner */}
      {serverError && (
        <div className="auth-banner error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          {/* Email */}
          <div className="field">
            <label htmlFor="reg-email">
              College Email <span className="required-star">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="e.g. student@college.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                if (serverError) setServerError('')
              }}
              autoComplete="email"
            />
            {errors.email && (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.email}
              </span>
            )}
          </div>

          {/* PRN (Permanent Registration Number) */}
          <div className="field">
            <label htmlFor="reg-prn">
              PRN (Permanent Registration No.) <span className="required-star">*</span>
            </label>
            <input
              id="reg-prn"
              type="text"
              className={`form-input ${errors.prn ? 'error' : ''}`}
              placeholder="e.g. 2023BTECS00042"
              value={prn}
              onChange={(e) => {
                setPrn(e.target.value.toUpperCase())
                if (errors.prn) setErrors((prev) => ({ ...prev, prn: '' }))
                if (serverError) setServerError('')
              }}
              autoComplete="off"
            />
            {errors.prn ? (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.prn}
              </span>
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Your unique registration code assigned by the college administration.
              </span>
            )}
          </div>

          {/* Password & Confirm Password in 2-col or stacked */}
          <div className="field">
            <label htmlFor="reg-password">
              Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                  if (serverError) setServerError('')
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="field">
            <label htmlFor="reg-confirm-password">
              Confirm Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-type your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                  if (serverError) setServerError('')
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.confirmPassword}
              </span>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="submit-row" style={{ marginTop: '26px' }}>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register Now</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Switch to Login */}
      <div className="auth-switch-prompt">
        Already have an account?
        <button
          type="button"
          className="auth-switch-btn"
          onClick={() => navigateTo('login')}
        >
          Sign In
        </button>
      </div>
    </div>
  )
}

export default RegisterView
