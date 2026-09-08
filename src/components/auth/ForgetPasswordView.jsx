import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function ForgetPasswordView() {
  const { sendPasswordReset, navigateTo, flowData } = useAuth()

  const [email, setEmail] = useState(flowData.email || '')
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setError('Email address is required.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (!validate()) return

    setLoading(true)
    try {
      // Calls supabase.auth.resetPasswordForEmail(email)
      await sendPasswordReset(email)
      // AuthContext automatically directs to 'verify-otp' with otpType: 'recovery'
    } catch (err) {
      console.error('[ForgetPasswordView] Error:', err)
      setServerError(err.message || 'Failed to send recovery code. Please verify your email and try again.')
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
            <path d="M21 2l-2 2m-1-1l-3 3m2 2l-3 3m2 2l-3 3" />
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m11.5 11.5 8.5-8.5" />
          </svg>
        </div>
        <h2 className="auth-title">Reset Your Password</h2>
        <p className="auth-subtitle">
          Enter your registered institutional email. We'll send you a 6-digit recovery code to reset your password.
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
          <div className="field">
            <label htmlFor="forgot-email">
              College Email <span className="required-star">*</span>
            </label>
            <input
              id="forgot-email"
              type="email"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="e.g. student@college.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
                if (serverError) setServerError('')
              }}
              autoComplete="email"
            />
            {error && (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="submit-row" style={{ marginTop: '24px' }}>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Sending Recovery Code...</span>
              </>
            ) : (
              <>
                <span>Send OTP</span>
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
        Remember your password?
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

export default ForgetPasswordView
