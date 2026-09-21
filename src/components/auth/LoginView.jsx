import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function LoginView() {
  const { login, navigateTo, notice, setNotice } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errs.password = 'Password is required.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (notice) setNotice('')

    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      // Login successful: AuthContext handles navigation to dashboard
    } catch (err) {
      console.error('[LoginView] Error during sign in:', err)
      setServerError(err.message || 'Invalid email or password. Please try again.')
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="auth-title">Sign In to CampusCare</h2>
        <p className="auth-subtitle">
          Enter your student email and password to access the portal.
        </p>
      </div>

      {/* Flash Notice */}
      {notice && (
        <div className="auth-banner success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{notice}</span>
        </div>
      )}

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

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          {/* Email Field */}
          <div className="field">
            <label htmlFor="login-email">
              College Email <span className="required-star">*</span>
            </label>
            <input
              id="login-email"
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

          {/* Password Field */}
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="login-password">
                Password <span className="required-star">*</span>
              </label>
              <button
                type="button"
                className="forgot-link-btn"
                onClick={() => navigateTo('forget-password', { email: email.trim() })}
              >
                Forgot Password?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                  if (serverError) setServerError('')
                }}
                autoComplete="current-password"
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
        </div>

        {/* Submit Button */}
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
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Switch to Registration */}
      <div className="auth-switch-prompt">
        Don't have an account?
        <button
          type="button"
          className="auth-switch-btn"
          onClick={() => navigateTo('register')}
        >
          Register Now
        </button>
      </div>
    </div>
  )
}

export default LoginView
