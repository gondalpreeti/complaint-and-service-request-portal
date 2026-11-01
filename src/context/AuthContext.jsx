import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('student') // 'student' | 'staff' | 'manager' | 'admin'
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Current view: 'login' | 'register' | 'forget-password' | 'verify-otp' | 'reset-password' | 'dashboard' | 'register-complaint'
  const [currentView, setCurrentView] = useState('login')

  // Auth flow transfer data: { email: '', prn: '', otpType: 'signup' | 'recovery' }
  const [flowData, setFlowData] = useState({
    email: '',
    prn: '',
    otpType: 'signup',
  })

  // Flash notices or banners
  const [notice, setNotice] = useState('')

  // Resolve role from backend using real Supabase database
  const resolveUserRole = async (email, userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/user-profile`, {
        params: { email, user_id: userId }
      })
      if (res.data?.success) {
        setRole(res.data.role)
        setUserProfile(res.data)
        return res.data.role
      }
    } catch (err) {
      console.warn('[AuthContext] Role lookup fallback:', err)
    }
    setRole('student')
    return 'student'
  }

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
            const resolvedRole = await resolveUserRole(initialSession.user.email, initialSession.user.id)
            if (resolvedRole === 'student') {
              setCurrentView('register-complaint')
            } else {
              setCurrentView('dashboard')
            }
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

    // Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      setSession(newSession)
      setUser(newSession?.user || null)

      if (event === 'SIGNED_IN') {
        if (newSession?.user) {
          const resolvedRole = await resolveUserRole(newSession.user.email, newSession.user.id)
          if (resolvedRole === 'student') {
            setCurrentView('register-complaint')
          } else {
            setCurrentView('dashboard')
          }
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset-password')
      } else if (event === 'SIGNED_OUT') {
        setRole('student')
        setUserProfile(null)
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
    const resolvedRole = await resolveUserRole(data.user.email, data.user.id)
    if (resolvedRole === 'student') {
      setCurrentView('register-complaint')
    } else {
      setCurrentView('dashboard')
    }
    return data
  }

  // 2. Sign Up
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

  // 4. Verify OTP
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
      const resolvedRole = await resolveUserRole(data.user.email, data.user.id)
      if (resolvedRole === 'student') {
        setCurrentView('register-complaint')
      } else {
        setCurrentView('dashboard')
      }
    } else if (targetType === 'recovery') {
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

  // 6. Reset Password
  const resetPassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error

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
      setRole('student')
      setUserProfile(null)
      navigateTo('login')
    }
  }

  const value = {
    user,
    session,
    role,
    userProfile,
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
