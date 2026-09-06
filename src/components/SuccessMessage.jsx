import React from 'react'

function SuccessMessage({ complaintId, onNewComplaint, onDashboard }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="success-title">
      <div className="modal-card">

        {/* Success Icon */}
        <div className="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        {/* Title */}
        <h2 id="success-title">Complaint Submitted!</h2>
        <p className="modal-subtitle">
          Your complaint has been registered successfully.<br />
          Our team will review it and get back to you.
        </p>

        {/* Complaint ID Badge */}
        <div className="complaint-id-badge">
          <span className="complaint-id-label">Complaint ID</span>
          <span className="complaint-id-value">{complaintId}</span>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button
            id="btn-back-dashboard"
            type="button"
            className="btn-primary"
            onClick={onDashboard}
          >
            Back to Dashboard
          </button>
          <button
            id="btn-register-another"
            type="button"
            className="btn-secondary"
            onClick={onNewComplaint}
          >
            Register Another Complaint
          </button>
        </div>

      </div>
    </div>
  )
}

export default SuccessMessage
