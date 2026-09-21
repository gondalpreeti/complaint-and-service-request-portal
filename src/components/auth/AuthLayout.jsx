import React from 'react'

function AuthLayout({ children }) {
  return (
    <div className="page-wrapper">
      {/* ── LEFT PANEL — College Hero + Branding ─── */}
      <aside className="left-panel" aria-hidden="true">
        <div className="left-panel-inner">
          {/* Top: CampusCare Logo */}
          <div className="panel-logo">
            <div className="panel-logo-icon">
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
          </div>

          {/* Hero Branding */}
          <div className="panel-hero">
            <h2 className="panel-hero-heading">
              Student Portal.
              <span className="blue-line">Secure Access.</span>
            </h2>
            <p className="panel-hero-sub">
              Sign in with your verified credentials to report concerns and track departmental resolutions in real time.
            </p>

            {/* Feature Highlights */}
            <div className="panel-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Verified PRN Identity</h4>
                  <p>Authenticate with your official institutional student registration number.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Fast Resolution</h4>
                  <p>Direct ticket assignment and timely updates from campus administration.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="feature-text">
                  <h4>Confidential &amp; Secure</h4>
                  <p>State-of-the-art encryption protecting your feedback and identity.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL — Form ───────────────────── */}
      <main className="right-panel">
        <div className="top-bar">
          {/* Placeholder for top bar if needed */}
        </div>

        <div className="right-panel-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>

        {/* Footer */}
        <footer className="page-footer">
          &copy; 2025 <span className="footer-brand">CampusCare</span>. All rights reserved.
        </footer>
      </main>
    </div>
  )
}

export default AuthLayout
