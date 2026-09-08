import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Current view: 'login' | 'register' | 'forget-password' | 'verify-otp' | 'reset-password' | 'dashboard'
  const [currentView, setCurrentView] = useState('login')

  // Auth flow transfer data: { email: '', prn: '', otpType: 'signup' | 'recovery' }
  const [flowData, setFlowData] = useState({
    email: '',
    prn: '',
    otpType: 'signup',
  })

  // Flash notices or banners (e.g., "Password reset successfully. Please sign in.")
  const [notice, setNotice] = useState('')

  /* ── Initialize session on mount and subscribe to changes ── */
  useEffect(() => {
    let mounted = true

    async function initSession() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('[AuthContext] getSession warning:', error.message)
        }

        if (mounted) {
          if (initialSession) {
            setSession(initialSession)
            setUser(initialSession.user)
            setCurrentView('dashboard')
          } else {
            setCurrentView('login')
          }
        }
      } catch (err) {
        console.error('[AuthContext] initSession error:', err)
        if (mounted) setCurrentView('login')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initSession()

    // Listen for auth events: SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, USER_UPDATED
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      setSession(newSession)
      setUser(newSession?.user || null)

      if (event === 'SIGNED_IN') {
        // If recovery was just verified, we may want to allow the user to stay on reset-password
        setCurrentView(prev => (prev === 'reset-password' ? 'reset-password' : 'dashboard'))
      } else if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset-password')
      } else if (event === 'SIGNED_OUT') {
        setCurrentView('login')
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  /* ── Navigation helper ────────────────────────────────── */
  const navigateTo = (view, data = {}, noticeMsg = '') => {
    if (data && Object.keys(data).length > 0) {
      setFlowData(prev => ({ ...prev, ...data }))
    }
    setNotice(noticeMsg)
    setCurrentView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── Supabase Auth Actions ────────────────────────────── */

  // 1. Sign In
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) throw error

    setUser(data.user)
    setSession(data.session)
    setCurrentView('dashboard')
    return data
  }

  // 2. Sign Up (with PRN in options.data metadata)
  const register = async (email, password, prn) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          prn: prn.trim(),
        },
      },
    })

    if (error) throw error

    // Save email & PRN to flow state and transition to OTP verification
    navigateTo('verify-otp', {
      email: email.trim(),
      prn: prn.trim(),
      otpType: 'signup',
    })

    return data
  }

  // 3. Send Password Reset OTP
  const sendPasswordReset = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim())

    if (error) throw error

    navigateTo('verify-otp', {
      email: email.trim(),
      otpType: 'recovery',
    })

    return data
  }

  // 4. Verify OTP (Handles both signup and recovery)
  const verifyOtp = async (token, customEmail = null, customType = null) => {
    const targetEmail = (customEmail || flowData.email || '').trim()
    const targetType = customType || flowData.otpType || 'signup'

    const { data, error } = await supabase.auth.verifyOtp({
      email: targetEmail,
      token: token.trim(),
      type: targetType,
    })

    if (error) throw error

    if (targetType === 'signup') {
      setUser(data.user)
      setSession(data.session)
      setCurrentView('dashboard')
    } else if (targetType === 'recovery') {
      // Upon successful recovery OTP verification, route to reset-password
      setCurrentView('reset-password')
    }

    return data
  }

  // 5. Resend OTP
  const resendOtp = async () => {
    const { email, otpType } = flowData
    if (!email) throw new Error('No email address provided for resend.')

    if (otpType === 'recovery') {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })
      if (error) throw error
      return data
    }
  }

  // 6. Reset Password (Update User)
  const resetPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    // Direct back to Login with a success notice
    navigateTo('login', {}, 'Password updated successfully! Please sign in with your new password.')
    return data
  }

  // 7. Sign Out
  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[AuthContext] signOut error:', err)
    } finally {
      setUser(null)
      setSession(null)
      navigateTo('login')
    }
  }

  const value = {
    user,
    session,
    loading,
    currentView,
    flowData,
    notice,
    setNotice,
    navigateTo,
    login,
    register,
    sendPasswordReset,
    verifyOtp,
    resendOtp,
    resetPassword,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
