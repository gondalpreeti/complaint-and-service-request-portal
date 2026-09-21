import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

function OtpVerificationView() {
  const { flowData, verifyOtp, resendOtp, navigateTo } = useAuth()

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(30)
  const [serverError, setServerError] = useState('')
  const [resendSuccess, setResendSuccess] = useState('')

  const isRecovery = flowData.otpType === 'recovery'
  const emailDisplay = flowData.email || 'your email'

  // Focus the first input on initial mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  // 30-second countdown for resending code
  useEffect(() => {
    let timer = null
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [resendCountdown])

  /* ── Input Change & Auto-focus Shift ───────────────────── */
  const handleInputChange = (index, value) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '')

    if (!cleaned) {
      const nextOtp = [...otp]
      nextOtp[index] = ''
      setOtp(nextOtp)
      return
    }

    // Take only the last character if user typed over an existing character
    const char = cleaned.slice(-1)
    const nextOtp = [...otp]
    nextOtp[index] = char
    setOtp(nextOtp)
    setServerError('')

    // Auto-advance focus to the next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus()
    }
  }

  /* ── Backspace & Arrow Navigation ─────────────────────── */
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move backwards and clear previous box
        inputRefs.current[index - 1].focus()
        const nextOtp = [...otp]
        nextOtp[index - 1] = ''
        setOtp(nextOtp)
        e.preventDefault()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  /* ── Clipboard Paste Handling ──────────────────────────── */
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('')

    if (digits.length === 0) return

    const nextOtp = [...otp]
    digits.forEach((digit, idx) => {
      if (idx < 6) nextOtp[idx] = digit
    })
    setOtp(nextOtp)
    setServerError('')

    // Focus either the box after the pasted digits, or the last box
    const focusIdx = Math.min(digits.length, 5)
    if (inputRefs.current[focusIdx]) {
      inputRefs.current[focusIdx].focus()
    }
  }

  /* ── Verify Submit ─────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setResendSuccess('')

    const token = otp.join('')
    if (token.length !== 6) {
      setServerError('Please enter all 6 digits of the verification code.')
      return
    }

    setLoading(true)
    try {
      // Calls verifyOtp({ email, token, type: 'signup' | 'recovery' })
      await verifyOtp(token)
      // On 'signup' type -> routes to dashboard
      // On 'recovery' type -> routes to reset-password
    } catch (err) {
      console.error('[OtpVerificationView] Verification error:', err)
      setServerError(err.message || 'Invalid or expired OTP code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Resend Handler ────────────────────────────────────── */
  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return
    setResending(true)
    setServerError('')
    setResendSuccess('')

    try {
      await resendOtp()
      setResendSuccess('A new 6-digit code has been sent to your email.')
      setResendCountdown(30)
    } catch (err) {
      console.error('[OtpVerificationView] Resend error:', err)
      setServerError(err.message || 'Failed to resend code. Please try again later.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="auth-header">
        <div className="auth-icon-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h2 className="auth-title">
          {isRecovery ? 'Verify Recovery Code' : 'Verify Your Email'}
        </h2>
        <p className="auth-subtitle">
          We've sent a 6-digit verification code to{' '}
          <strong>{emailDisplay}</strong>. Enter it below to proceed.
        </p>
      </div>

      {/* Resend Success Banner */}
      {resendSuccess && (
        <div className="auth-banner success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{resendSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
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
        {/* 6 Digit Input Boxes */}
        <div className="otp-box-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              className={`otp-input ${digit ? 'filled' : ''} ${serverError ? 'error' : ''}`}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`OTP Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Submit Button */}
        <div className="submit-row" style={{ marginTop: '20px' }}>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading || otp.join('').length !== 6}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <span>Submit &amp; Continue</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Resend Row */}
        <div className="otp-resend-row">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            className="btn-resend-otp"
            onClick={handleResend}
            disabled={resendCountdown > 0 || resending}
          >
            {resending
              ? 'Sending...'
              : resendCountdown > 0
              ? `Resend in ${resendCountdown}s`
              : 'Resend OTP'}
          </button>
        </div>
      </form>

      {/* Navigation Switch */}
      <div className="auth-switch-prompt">
        Need to change your email?
        <button
          type="button"
          className="auth-switch-btn"
          onClick={() => navigateTo(isRecovery ? 'forget-password' : 'register')}
        >
          Go Back
        </button>
      </div>
    </div>
  )
}

export default OtpVerificationView
