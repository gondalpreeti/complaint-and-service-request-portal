import React, { useState } from 'react'
import ComplaintForm from '../components/ComplaintForm'
import SuccessMessage from '../components/SuccessMessage'
import { useAuth } from '../context/AuthContext'

function RegisterComplaint() {
  const { user, logout } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [complaintId, setComplaintId] = useState('')
  const [formKey, setFormKey] = useState(0)

  const handleSuccess = (id) => {
    setComplaintId(id)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNewComplaint = () => {
    setSubmitted(false)
    setComplaintId('')
    setFormKey(k => k + 1)
  }

  const handleDashboard = () => {
    window.history.back()
  }

  const userPrn = user?.user_metadata?.prn

  return (
    <div className="page-wrapper">

      {/* ── LEFT PANEL — College Image + Branding ─── */}
      <aside className="left-panel" aria-hidden="true">
        <div className="left-panel-inner">

          {/* Top: CampusCare logo */}
          <a href="#" className="panel-logo">
            <div className="panel-logo-icon">
              {/* Shield icon */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z"
                  fill="rgba(255,255,255,0.85)"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="panel-logo-text">
              <span className="logo-campus">Campus</span>
              <span className="logo-care">Care</span>
            </span>
          </a>

          {/* Hero message */}
          <div className="panel-hero">
            <h2 className="panel-hero-heading">
              Your campus.
              <span className="blue-line">Your voice.</span>
            </h2>
            <p className="panel-hero-sub">
              Report an issue and help us make our campus better, together.
            </p>

            {/* Feature blocks */}
            <div className="panel-features">
              <div className="feature-item">
                <div className="feature-icon">
                  {/* Chat / easy reporting */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Easy Reporting</h4>
                  <p>Submit complaints in just a few clicks.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  {/* Shield / right department */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Right Department</h4>
                  <p>We ensure it reaches the right department.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  {/* Check / track & update */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Track &amp; Update</h4>
                  <p>Stay updated on the resolution status.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* ── RIGHT PANEL — Form ───────────────────── */}
      <main className="right-panel">

        {/* Top Bar — user info and sign out / back */}
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {user ? (
            <div className="dashboard-user-bar">
              <div className="user-identity-badge" title={user.email}>
                <span className="user-avatar-dot" />
                <span className="user-email-text">{user.email}</span>
                {userPrn && <span className="user-prn-pill">PRN: {userPrn}</span>}
              </div>
              <button className="btn-signout" type="button" onClick={logout} title="Sign Out of CampusCare">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          ) : (
            <div />
          )}

          <button className="back-btn" type="button" onClick={handleDashboard}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="right-panel-inner">

          {/* Page heading */}
          <div className="page-heading">
            <div className="page-heading-icon">
              {/* Document / complaint icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="page-heading-text">
              <h1>
                Register a <span className="blue-word">Complaint</span>
              </h1>
              <p>Submit your issue and we'll make sure it reaches the right department.</p>
            </div>
          </div>

          {/* Complaint Form */}
          <div className="form-container">
            <ComplaintForm key={formKey} onSuccess={handleSuccess} />
          </div>

        </div>

        {/* Footer */}
        <footer className="page-footer">
          &copy; 2025 <span className="footer-brand">CampusCare</span>. All rights reserved.
        </footer>

      </main>

      {/* Success Modal */}
      {submitted && (
        <SuccessMessage
          complaintId={complaintId}
          onNewComplaint={handleNewComplaint}
          onDashboard={handleDashboard}
        />
      )}
    </div>
  )
}

export default RegisterComplaint
