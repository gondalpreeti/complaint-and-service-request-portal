import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function ResetPasswordView() {
  const { resetPassword, navigateTo } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!newPassword) {
      errs.newPassword = 'New password is required.'
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.'
    } else if (newPassword !== confirmPassword) {
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
      // Calls supabase.auth.updateUser({ password: newPassword })
      await resetPassword(newPassword)
      // AuthContext automatically redirects to 'login' with a success notice
    } catch (err) {
      console.error('[ResetPasswordView] Update password error:', err)
      setServerError(err.message || 'Failed to update password. Please request a new recovery OTP.')
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
        <h2 className="auth-title">Set New Password</h2>
        <p className="auth-subtitle">
          Create a secure, strong password for your CampusCare account.
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
          {/* New Password */}
          <div className="field">
            <label htmlFor="reset-new-password">
              New Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }))
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
            {errors.newPassword && (
              <span className="field-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.newPassword}
              </span>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="field">
            <label htmlFor="reset-confirm-password">
              Confirm New Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Re-enter your new password"
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Update Password</span>
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
        Cancel reset?
        <button
          type="button"
          className="auth-switch-btn"
          onClick={() => navigateTo('login')}
        >
          Return to Sign In
        </button>
      </div>
    </div>
  )
}

export default ResetPasswordView
