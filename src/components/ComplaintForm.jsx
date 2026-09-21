import React, { useState, useEffect, useCallback } from 'react'
import DynamicFields, { validateDynamicFields, buildCategoryPayload, normalizeCategoryName } from './DynamicFields'
import ImageUpload from './ImageUpload'
import { supabase } from '../supabase'

const DEFAULT_CATEGORIES = [
  { category_id: 1, category_name: 'Accounts' },
  { category_id: 2, category_name: 'Admission' },
  { category_id: 3, category_name: 'Exam Cell' },
  { category_id: 4, category_name: 'Library' },
  { category_id: 5, category_name: 'Hostel' },
  { category_id: 6, category_name: 'Plumbing and Cleaning' },
  { category_id: 7, category_name: 'Canteen' },
  { category_id: 8, category_name: 'Infrastructure & Electrical' },
  { category_id: 9, category_name: 'IT' },
  { category_id: 10, category_name: 'Other' },
]

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  )
}

function ComplaintForm({ onSuccess }) {
  /* ── Categories state from Supabase ─────────── */
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES)
  const [loadingCategories, setLoadingCategories] = useState(true)

  /* ── Core form state ─────────────────────────── */
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState('')
  const [dynFields, setDynFields]     = useState({})
  const [image, setImage]             = useState(null)

  /* ── Validation & submission errors ─────────── */
  const [errors, setErrors]           = useState({})
  const [dynErrors, setDynErrors]     = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting]   = useState(false)

  /* ── Load categories on mount ────────────────── */
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, category_name')
          .order('category_id')
        
        if (!error && data && data.length > 0) {
          setCategoriesList(data)
        }
      } catch (err) {
        console.warn('Using default categories due to fetch error:', err)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  /* ── Dynamic field change handler ────────────── */
  const handleDynChange = useCallback((key, value) => {
    setDynFields(prev => ({ ...prev, [key]: value }))
    setDynErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  /* ── Category change — reset dynamic fields ──── */
  const handleCategoryChange = (val) => {
    setCategory(val)
    setDynFields({})
    setDynErrors({})
    setServerError('')
    if (errors.category) {
      setErrors(prev => { const e = { ...prev }; delete e.category; return e })
    }
  }

  /* ── Clear specific core error on change ─────── */
  const clearError = (key) => {
    if (serverError) setServerError('')
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  /* ── Validate ─────────────────────────────────── */
  const validate = () => {
    const e = {}
    if (!title.trim())       e.title       = 'Complaint title is required.'
    if (!description.trim()) e.description = 'Description is required.'
    if (!category)           e.category    = 'Please select a category.'

    const de = validateDynamicFields(category, dynFields)

    setErrors(e)
    setDynErrors(de)

    return Object.keys(e).length === 0 && Object.keys(de).length === 0
  }

  /* ── Submit to Supabase ───────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setServerError('')

    try {
      // Find matching category object
      const selectedCatObj = categoriesList.find(c => c.category_name === category)
      const categoryId = selectedCatObj ? selectedCatObj.category_id : null

      const categoryPayload = buildCategoryPayload(category, dynFields)

      // Upload image to Supabase Storage if user attached a file
      let imageUrl = null
      if (image) {
        try {
          const fileExt = image.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('complaints')
            .upload(fileName, image)
          
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('complaints')
              .getPublicUrl(fileName)
            imageUrl = publicUrlData?.publicUrl || image.name
          } else {
            imageUrl = image.name
          }
        } catch (uploadErr) {
          imageUrl = image.name
        }
      }

      // Insert record into Supabase `complaints` table
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          subject: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          status: 'Pending',
          details: categoryPayload,
          image_url: imageUrl,
        })
        .select()
        .single()

      if (error) {
        console.error('[Supabase] Insert error:', error)
        throw new Error(error.message || 'Failed to submit complaint to database.')
      }

      const generatedId = data?.complaint_id
        ? `CMP-${new Date().getFullYear()}-${String(data.complaint_id).padStart(4, '0')}`
        : `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`

      setSubmitting(false)
      onSuccess(generatedId)
    } catch (err) {
      console.error('[CampusCare] Submit error:', err)
      setServerError(err.message || 'An unexpected error occurred while saving your complaint.')
      setSubmitting(false)
    }
  }

  return (
    <form id="complaint-form" onSubmit={handleSubmit} noValidate>
      <div className="form-card">

        {/* ── Card Header ─────────────────────────── */}
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <div className="card-header-text">
            <h2>Complaint Details</h2>
            <p>Please fill in the details below to register your complaint.</p>
          </div>
        </div>

        <div className="field-group">

          {/* ── Complaint Title ─────────────────────── */}
          <div className="field">
            <label htmlFor="complaint-title">
              Complaint Title <span className="required-star">*</span>
            </label>
            <input
              id="complaint-title"
              type="text"
              className={`form-input${errors.title ? ' error' : ''}`}
              placeholder="Enter a short title for your complaint"
              value={title}
              onChange={e => { setTitle(e.target.value); clearError('title') }}
              maxLength={120}
            />
            {errors.title && (
              <span className="field-error">
                <ErrorIcon />
                {errors.title}
              </span>
            )}
          </div>

          {/* ── Description ────────────────────────── */}
          <div className="field">
            <label htmlFor="complaint-description">
              Description <span className="required-star">*</span>
            </label>
            <div className="textarea-wrapper">
              <textarea
                id="complaint-description"
                className={`form-textarea${errors.description ? ' error' : ''}`}
                placeholder="Describe your issue in detail. Include when it happened, how severe it is, and anything else that may help."
                value={description}
                onChange={e => { setDescription(e.target.value); clearError('description') }}
                maxLength={1000}
                rows={5}
              />
              <span className="char-counter">{description.length}/1000</span>
            </div>
            {errors.description && (
              <span className="field-error">
                <ErrorIcon />
                {errors.description}
              </span>
            )}
          </div>

          {/* ── Category ───────────────────────────── */}
          <div className="field">
            <label htmlFor="complaint-category">
              Category <span className="required-star">*</span>
            </label>
            <select
              id="complaint-category"
              className={`form-select${errors.category ? ' error' : ''}`}
              value={category}
              onChange={e => handleCategoryChange(e.target.value)}
              disabled={loadingCategories}
            >
              <option value="">{loadingCategories ? 'Loading categories...' : 'Select a category'}</option>
              {categoriesList.map(cat => (
                <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
              ))}
            </select>
            {errors.category && (
              <span className="field-error">
                <ErrorIcon />
                {errors.category}
              </span>
            )}
          </div>

          {/* ── Dynamic Category Fields OR Placeholder ─── */}
          {category ? (
            <DynamicFields
              category={category}
              fields={dynFields}
              errors={dynErrors}
              onChange={handleDynChange}
            />
          ) : (
            <div className="no-category-placeholder">
              <div className="no-category-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="no-category-text">
                <h4>Additional Information</h4>
                <p>Please select a category to see required details.</p>
              </div>
            </div>
          )}

          {/* ── Image Upload ────────────────────────── */}
          <ImageUpload
            file={image}
            onFileSelect={setImage}
            onFileRemove={() => setImage(null)}
          />

          {/* ── Server Error Alert ───────────────────── */}
          {serverError && (
            <div className="server-error-banner" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginTop: '12px'
            }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

        </div>

        {/* ── Submit Row ──────────────────────────── */}
        <div className="submit-row">
          <button
            id="btn-submit-complaint"
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="spinner" aria-hidden="true" />
                Submitting to Database...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Submit Complaint
              </>
            )}
          </button>
        </div>

      </div>
    </form>
  )
}

export default ComplaintForm
