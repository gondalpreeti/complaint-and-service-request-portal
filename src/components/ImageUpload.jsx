import React, { useState, useRef } from 'react'

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function ImageUpload({ file, onFileSelect, onFileRemove }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState('')

  const validate = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError('Only PNG, JPG, or JPEG files are allowed.')
      return false
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File size must be less than ${MAX_SIZE_MB} MB.`)
      return false
    }
    setFileError('')
    return true
  }

  const handleFile = (f) => {
    if (f && validate(f)) {
      onFileSelect(f)
    }
  }

  const handleChange = (e) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleRemove = () => {
    onFileRemove()
    setFileError('')
  }

  const previewUrl = file ? URL.createObjectURL(file) : null

  return (
    <div className="upload-section">
      <div className="upload-header">
        <label className="upload-label">
          Supporting Image <span className="tag-optional">(Optional)</span>
        </label>
        <p className="upload-hint">
          Upload an image that can help us understand the issue better.
        </p>
      </div>

      {!file ? (
        <>
          <div
            className={`upload-dropzone${dragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload image"
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleChange}
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className="upload-icon">
              {/* Cloud with upload arrow */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m8 16 4-4 4 4" />
              </svg>
            </div>
            <h4>
              Drag &amp; drop an image here or{' '}
              <span className="browse-link">click to browse</span>
            </h4>
            <p>PNG, JPG or JPEG &bull; Maximum size 5 MB</p>
          </div>

          {fileError && (
            <span className="upload-file-error">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {fileError}
            </span>
          )}
        </>
      ) : (
        <div className="upload-preview">
          <img
            src={previewUrl}
            alt="Preview"
            className="preview-img"
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
          <div className="preview-meta">
            <div className="preview-name">{file.name}</div>
            <div className="preview-size">{formatBytes(file.size)}</div>
          </div>
          <button
            type="button"
            className="preview-remove"
            onClick={handleRemove}
            aria-label="Remove image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
