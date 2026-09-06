import React from 'react'

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo */}
        <a href="#" className="logo-wrap" aria-label="CampusCare Home">
          <div className="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 3L4 8V21H9V15H15V21H20V8L12 3Z"
                fill="#ffffff"
                opacity="0.9"
              />
              <circle cx="12" cy="11" r="2" fill="#93c5fd" />
            </svg>
          </div>
          <span className="logo-text">
            <span className="logo-campus">Campus</span>
            <span className="logo-care">Care</span>
          </span>
        </a>

        {/* Back to Dashboard */}
        <button className="back-btn" type="button" onClick={() => window.history.back()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
      </div>
    </header>
  )
}

export default Header
