import React from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthLayout from './components/auth/AuthLayout'
import LoginView from './components/auth/LoginView'
import RegisterView from './components/auth/RegisterView'
import OtpVerificationView from './components/auth/OtpVerificationView'
import ForgetPasswordView from './components/auth/ForgetPasswordView'
import ResetPasswordView from './components/auth/ResetPasswordView'
import RegisterComplaint from './pages/RegisterComplaint'
import './styles/auth.css'

function AppContent() {
  const { currentView, loading, user } = useAuth()

  // Initial session check loading screen
  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-spinner" />
        <span className="app-loading-text">Loading CampusCare...</span>
      </div>
    )
  }

  // Active view routing
  switch (currentView) {
    case 'dashboard':
      return <RegisterComplaint />

    case 'register':
      return (
        <AuthLayout>
          <RegisterView />
        </AuthLayout>
      )

    case 'verify-otp':
      return (
        <AuthLayout>
          <OtpVerificationView />
        </AuthLayout>
      )

    case 'forget-password':
      return (
        <AuthLayout>
          <ForgetPasswordView />
        </AuthLayout>
      )

    case 'reset-password':
      return (
        <AuthLayout>
          <ResetPasswordView />
        </AuthLayout>
      )

    case 'login':
    default:
      // If user is already authenticated and visits default view, show dashboard
      if (user && currentView === 'login') {
        return <RegisterComplaint />
      }
      return (
        <AuthLayout>
          <LoginView />
        </AuthLayout>
      )
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
