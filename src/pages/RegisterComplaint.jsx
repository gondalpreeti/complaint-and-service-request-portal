import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ComplaintForm from '../components/ComplaintForm'
import SuccessMessage from '../components/SuccessMessage'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed' || s === 'resolved') return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  if (s === 'in progress') return 'bg-purple-100 text-purple-800 border-purple-300'
  if (s === 'assigned') return 'bg-blue-100 text-blue-800 border-blue-300'
  if (s === 'closed') return 'bg-slate-100 text-slate-700 border-slate-300'
  return 'bg-amber-100 text-amber-800 border-amber-300'
}

function priorityBadgeClass(priority) {
  const p = String(priority || '').toLowerCase()
  if (p === 'critical') return 'bg-red-100 text-red-800'
  if (p === 'high') return 'bg-orange-100 text-orange-800'
  if (p === 'medium') return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

function RegisterComplaint() {
  const { user, role, logout, navigateTo } = useAuth()
  const [activeTab, setActiveTab] = useState('register') // 'register' | 'my-complaints'
  const [submitted, setSubmitted] = useState(false)
  const [complaintId, setComplaintId] = useState('')
  const [formKey, setFormKey] = useState(0)

  // Student complaints state
  const [myComplaints, setMyComplaints] = useState([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)

  const fetchMyComplaints = async () => {
    setLoadingComplaints(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/student-complaints`, {
        params: { email: user?.email, user_id: user?.id }
      })
      setMyComplaints(res.data || [])
    } catch (err) {
      console.error('Failed to fetch student complaints:', err)
    } finally {
      setLoadingComplaints(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'my-complaints') {
      fetchMyComplaints()
    }
  }, [activeTab, user])

  const handleSuccess = (id) => {
    setComplaintId(id)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNewComplaint = () => {
    setSubmitted(false)
    setComplaintId('')
    setFormKey(k => k + 1)
    setActiveTab('register')
  }

  const handleDashboard = () => {
    if (navigateTo) {
      navigateTo('dashboard')
    } else {
      window.history.back()
    }
  }

  const userPrn = user?.user_metadata?.prn

  return (
    <div className="page-wrapper">

      {/* ── LEFT PANEL — College Image + Branding ─── */}
      <aside className="left-panel" aria-hidden="true">
        <div className="left-panel-inner">
          <a href="#" className="panel-logo">
            <div className="panel-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" fill="rgba(255,255,255,0.85)" />
                <path d="M9 12l2 2 4-4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="panel-logo-text">
              <span className="logo-campus">Campus</span>
              <span className="logo-care">Care</span>
            </span>
          </a>

          <div className="panel-hero">
            <h2 className="panel-hero-heading">
              Student <span className="blue-line">Portal</span>
            </h2>
            <p className="panel-hero-sub">
              Register issues and track their real-time resolution from assignment to completion.
            </p>

            <div className="panel-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Automated Assignment</h4>
                  <p>Tickets are instantly dispatched to the appropriate department staff.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Live Status Tracking</h4>
                  <p>Follow status changes from Assigned $\rightarrow$ In Progress $\rightarrow$ Resolved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL — Form / Complaints List ────── */}
      <main className="right-panel">

        {/* Top Bar — user info and tab switchers */}
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {user ? (
            <div className="dashboard-user-bar">
              <div className="user-identity-badge" title={user.email}>
                <span className="user-avatar-dot" />
                <span className="user-email-text">{user.email}</span>
                {userPrn && <span className="user-prn-pill">PRN: {userPrn}</span>}
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: '600' }}>Student</span>
              </div>
              <button className="btn-signout" type="button" onClick={logout} title="Sign Out of CampusCare">
                Sign Out
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Only show back to dashboard if user is not a student (staff/admin) */}
          {role !== 'student' && (
            <button className="back-btn" type="button" onClick={handleDashboard}>
              Back to Management Dashboard
            </button>
          )}
        </div>

        {/* Student View Navigation Tabs */}
        <div style={{ padding: '0 30px', marginTop: '16px' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              style={{
                padding: '8px 18px',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'register' ? '#ffffff' : 'transparent',
                color: activeTab === 'register' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              ✍️ File a Complaint
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my-complaints')}
              style={{
                padding: '8px 18px',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'my-complaints' ? '#ffffff' : 'transparent',
                color: activeTab === 'my-complaints' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'my-complaints' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              📋 My Complaints &amp; Live Status
            </button>
          </div>
        </div>

        <div className="right-panel-inner">

          {activeTab === 'register' ? (
            <>
              {/* Page heading */}
              <div className="page-heading">
                <div className="page-heading-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="page-heading-text">
                  <h1>Register a <span className="blue-word">Complaint</span></h1>
                  <p>Submit your issue and our system will automatically dispatch it to the right department.</p>
                </div>
              </div>

              {/* Complaint Form */}
              <div className="form-container">
                <ComplaintForm key={formKey} onSuccess={handleSuccess} />
              </div>
            </>
          ) : (
            <>
              {/* My Complaints Tab */}
              <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1>My <span className="blue-word">Complaints</span> &amp; Status</h1>
                  <p>Real-time updates directly from campus service staff and managers.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchMyComplaints}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Refresh Status
                </button>
              </div>

              {loadingComplaints ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading your complaints from database...
                </div>
              ) : myComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>No complaints filed yet</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>Have an issue in labs, classrooms, or hostel? File a complaint to get it resolved quickly.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                  >
                    + Register Your First Complaint
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {myComplaints.map((item) => (
                    <div
                      key={item.complaint_id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '18px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>#{item.complaint_id}</span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '500' }}>{item.category_name}</span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }} className={priorityBadgeClass(item.priority)}>{item.priority}</span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>{item.subject}</h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              border: '1px solid'
                            }}
                            className={statusBadgeClass(item.status)}
                          >
                            ● {item.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p style={{ fontSize: '0.875rem', color: '#475569', margin: '4px 0 0 0' }}>{item.description}</p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '6px', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span>Assigned Staff: </span>
                          <strong style={{ color: '#0f172a' }}>{item.assigned_staff}</strong>
                          {item.department && <span> ({item.department})</span>}
                        </div>
                        <div>
                          <span>Submitted: </span>
                          <span>{item.created_at}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

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
          onDashboard={() => {
            setSubmitted(false)
            setActiveTab('my-complaints')
          }}
        />
      )}
    </div>
  )
}

export default RegisterComplaint
