import React from 'react'

/* ─── Reusable Field ──────────────────────────────────────── */
function Field({ id, label, required, optional, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required-star">*</span>}
        {optional && <span className="tag-optional">Optional</span>}
      </label>
      {children}
      {error && (
        <span className="field-error">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </span>
      )}
    </div>
  )
}

/* ─── Select helper ───────────────────────────────────────── */
function SelectField({ id, label, required, optional, error, value, onChange, options, placeholder }) {
  return (
    <Field id={id} label={label} required={required} optional={optional} error={error}>
      <select
        id={id}
        className={`form-select${error ? ' error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </Field>
  )
}

/* ─── Input helper ────────────────────────────────────────── */
function InputField({ id, label, required, optional, error, value, onChange, placeholder }) {
  return (
    <Field id={id} label={label} required={required} optional={optional} error={error}>
      <input
        id={id}
        type="text"
        className={`form-input${error ? ' error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
      />
    </Field>
  )
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY-SPECIFIC FIELD RENDERERS
   ═══════════════════════════════════════════════════════════ */

/* ── Infrastructure ─────────────────────────────────────── */
function InfrastructureFields({ fields, errors, onChange }) {
  const locationTypes = ['Classroom', 'Laboratory', 'Seminar Hall', 'Corridor', 'Washroom', 'Other']
  return (
    <>
      <SelectField
        id="infra-location-type"
        label="Location Type"
        required
        error={errors.infraLocationType}
        value={fields.infraLocationType || ''}
        onChange={v => onChange('infraLocationType', v)}
        options={locationTypes}
        placeholder="Select location type"
      />
      <InputField
        id="infra-room-number"
        label="Room / Location Number"
        required
        error={errors.infraRoomNumber}
        value={fields.infraRoomNumber || ''}
        onChange={v => onChange('infraRoomNumber', v)}
        placeholder="e.g. A-302, Lab 2, Hall B"
      />
      {fields.infraLocationType === 'Other' && (
        <InputField
          id="infra-specify"
          label="Specify Location"
          required
          error={errors.infraSpecify}
          value={fields.infraSpecify || ''}
          onChange={v => onChange('infraSpecify', v)}
          placeholder="Describe the location"
        />
      )}
    </>
  )
}

/* ── IT Support ─────────────────────────────────────────── */
function ITSupportFields({ fields, errors, onChange }) {
  const issueTypes = ['Computer', 'Internet / Wi-Fi', 'Projector', 'Printer', 'Software', 'Login / Account', 'Other']
  return (
    <>
      <InputField
        id="it-location"
        label="Location"
        required
        error={errors.itLocation}
        value={fields.itLocation || ''}
        onChange={v => onChange('itLocation', v)}
        placeholder="e.g. Lab 3, Room 201, Library"
      />
      <InputField
        id="it-device-number"
        label="Device / System Number"
        optional
        error={errors.itDeviceNumber}
        value={fields.itDeviceNumber || ''}
        onChange={v => onChange('itDeviceNumber', v)}
        placeholder="e.g. PC-14, SYS-05"
      />
      <SelectField
        id="it-issue-type"
        label="Issue Type"
        required
        error={errors.itIssueType}
        value={fields.itIssueType || ''}
        onChange={v => onChange('itIssueType', v)}
        options={issueTypes}
        placeholder="Select issue type"
      />
      {fields.itIssueType === 'Other' && (
        <InputField
          id="it-specify"
          label="Specify Issue"
          required
          error={errors.itSpecify}
          value={fields.itSpecify || ''}
          onChange={v => onChange('itSpecify', v)}
          placeholder="Describe the IT issue"
        />
      )}
    </>
  )
}

/* ── Hostel ─────────────────────────────────────────────── */
function HostelFields({ fields, errors, onChange }) {
  const issueTypes = ['Water', 'Electricity', 'Cleaning', 'Maintenance', 'Food', 'Furniture', 'Other']
  return (
    <>
      <InputField
        id="hostel-name"
        label="Hostel Name"
        required
        error={errors.hostelName}
        value={fields.hostelName || ''}
        onChange={v => onChange('hostelName', v)}
        placeholder="e.g. Boys Hostel A, Girls Hostel 2"
      />
      <div className="field-row">
        <InputField
          id="hostel-room"
          label="Room Number"
          required
          error={errors.hostelRoom}
          value={fields.hostelRoom || ''}
          onChange={v => onChange('hostelRoom', v)}
          placeholder="e.g. 204"
        />
        <SelectField
          id="hostel-issue"
          label="Issue Type"
          required
          error={errors.hostelIssue}
          value={fields.hostelIssue || ''}
          onChange={v => onChange('hostelIssue', v)}
          options={issueTypes}
          placeholder="Select issue"
        />
      </div>
      {fields.hostelIssue === 'Other' && (
        <InputField
          id="hostel-specify"
          label="Specify Issue"
          required
          error={errors.hostelSpecify}
          value={fields.hostelSpecify || ''}
          onChange={v => onChange('hostelSpecify', v)}
          placeholder="Describe the hostel issue"
        />
      )}
    </>
  )
}

/* ── Cleaning and Water ─────────────────────────────────── */
function CleaningFields({ fields, errors, onChange }) {
  const issueTypes = ['Water Supply', 'Drinking Water', 'Washroom', 'Garbage', 'Cleaning', 'Drainage', 'Other']
  return (
    <>
      <InputField
        id="clean-location"
        label="Location"
        required
        error={errors.cleanLocation}
        value={fields.cleanLocation || ''}
        onChange={v => onChange('cleanLocation', v)}
        placeholder="e.g. Block C Washroom, Main Gate Area"
      />
      <SelectField
        id="clean-issue"
        label="Issue Type"
        required
        error={errors.cleanIssue}
        value={fields.cleanIssue || ''}
        onChange={v => onChange('cleanIssue', v)}
        options={issueTypes}
        placeholder="Select issue type"
      />
      {fields.cleanIssue === 'Other' && (
        <InputField
          id="clean-specify"
          label="Specify Issue"
          required
          error={errors.cleanSpecify}
          value={fields.cleanSpecify || ''}
          onChange={v => onChange('cleanSpecify', v)}
          placeholder="Describe the issue"
        />
      )}
    </>
  )
}

/* ── Accounts ───────────────────────────────────────────── */
function AccountsFields({ fields, errors, onChange }) {
  return (
    <>
      <InputField
        id="acc-issue"
        label="Issue Type"
        required
        error={errors.accIssue}
        value={fields.accIssue || ''}
        onChange={v => onChange('accIssue', v)}
        placeholder="e.g. Fee Receipt, Scholarship, Refund"
      />
      <InputField
        id="acc-reference"
        label="Student / Transaction Reference Number"
        optional
        error={errors.accReference}
        value={fields.accReference || ''}
        onChange={v => onChange('accReference', v)}
        placeholder="e.g. TXN-20240512"
      />
    </>
  )
}

/* ── Admission / Student Section ────────────────────────── */
function AdmissionFields({ fields, errors, onChange }) {
  return (
    <>
      <InputField
        id="adm-id"
        label="Student ID / PRN"
        optional
        error={errors.admId}
        value={fields.admId || ''}
        onChange={v => onChange('admId', v)}
        placeholder="e.g. 72310123"
      />
      <InputField
        id="adm-issue"
        label="Issue Type"
        required
        error={errors.admIssue}
        value={fields.admIssue || ''}
        onChange={v => onChange('admIssue', v)}
        placeholder="e.g. Document Verification, Certificate, Migration"
      />
    </>
  )
}

/* ── Canteen ────────────────────────────────────────────── */
function CanteenFields({ fields, errors, onChange }) {
  const issueTypes = ['Food Quality', 'Hygiene', 'Pricing', 'Service', 'Seating', 'Other']
  return (
    <>
      <InputField
        id="canteen-location"
        label="Location"
        optional
        error={errors.canteenLocation}
        value={fields.canteenLocation || ''}
        onChange={v => onChange('canteenLocation', v)}
        placeholder="e.g. Main Canteen, Block B Cafeteria"
      />
      <SelectField
        id="canteen-issue"
        label="Issue Type"
        required
        error={errors.canteenIssue}
        value={fields.canteenIssue || ''}
        onChange={v => onChange('canteenIssue', v)}
        options={issueTypes}
        placeholder="Select issue type"
      />
      {fields.canteenIssue === 'Other' && (
        <InputField
          id="canteen-specify"
          label="Specify Issue"
          required
          error={errors.canteenSpecify}
          value={fields.canteenSpecify || ''}
          onChange={v => onChange('canteenSpecify', v)}
          placeholder="Describe the canteen issue"
        />
      )}
    </>
  )
}

/* ── Security ───────────────────────────────────────────── */
function SecurityFields({ fields, errors, onChange }) {
  const incidentTypes = ['Security Concern', 'Lost Item', 'Unauthorized Access', 'Parking', 'Staff Behaviour', 'Other']
  return (
    <>
      <InputField
        id="sec-location"
        label="Location"
        required
        error={errors.secLocation}
        value={fields.secLocation || ''}
        onChange={v => onChange('secLocation', v)}
        placeholder="e.g. Main Gate, Parking Lot, Hostel Gate"
      />
      <SelectField
        id="sec-incident"
        label="Incident Type"
        required
        error={errors.secIncident}
        value={fields.secIncident || ''}
        onChange={v => onChange('secIncident', v)}
        options={incidentTypes}
        placeholder="Select incident type"
      />
      {fields.secIncident === 'Other' && (
        <InputField
          id="sec-specify"
          label="Specify Incident"
          required
          error={errors.secSpecify}
          value={fields.secSpecify || ''}
          onChange={v => onChange('secSpecify', v)}
          placeholder="Describe the incident"
        />
      )}
    </>
  )
}

/* ── Library ────────────────────────────────────────────── */
function LibraryFields({ fields, errors, onChange }) {
  const issueTypes = ['Book Issue', 'Library Facility', 'Computer / Internet', 'Seating', 'Noise', 'Other']
  return (
    <>
      <SelectField
        id="lib-issue"
        label="Issue Type"
        required
        error={errors.libIssue}
        value={fields.libIssue || ''}
        onChange={v => onChange('libIssue', v)}
        options={issueTypes}
        placeholder="Select issue type"
      />
      {fields.libIssue === 'Other' && (
        <InputField
          id="lib-specify"
          label="Specify Issue"
          required
          error={errors.libSpecify}
          value={fields.libSpecify || ''}
          onChange={v => onChange('libSpecify', v)}
          placeholder="Describe the library issue"
        />
      )}
      <InputField
        id="lib-book-id"
        label="Book / Resource ID"
        optional
        error={errors.libBookId}
        value={fields.libBookId || ''}
        onChange={v => onChange('libBookId', v)}
        placeholder="e.g. ISBN or accession number"
      />
    </>
  )
}

/* ── Exam Cell ──────────────────────────────────────────── */
function ExamCellFields({ fields, errors, onChange }) {
  const issueTypes = ['Exam Form', 'Hall Ticket', 'Marks', 'Timetable', 'Result', 'Other']
  return (
    <>
      <div className="field-row">
        <InputField
          id="exam-subject"
          label="Exam / Subject"
          optional
          error={errors.examSubject}
          value={fields.examSubject || ''}
          onChange={v => onChange('examSubject', v)}
          placeholder="e.g. DBMS, Engineering Mathematics"
        />
        <InputField
          id="exam-roll"
          label="Student / Roll Number"
          optional
          error={errors.examRoll}
          value={fields.examRoll || ''}
          onChange={v => onChange('examRoll', v)}
          placeholder="e.g. 2024-B-045"
        />
      </div>
      <SelectField
        id="exam-issue"
        label="Issue Type"
        required
        error={errors.examIssue}
        value={fields.examIssue || ''}
        onChange={v => onChange('examIssue', v)}
        options={issueTypes}
        placeholder="Select issue type"
      />
      {fields.examIssue === 'Other' && (
        <InputField
          id="exam-specify"
          label="Specify Issue"
          required
          error={errors.examSpecify}
          value={fields.examSpecify || ''}
          onChange={v => onChange('examSpecify', v)}
          placeholder="Describe the exam cell issue"
        />
      )}
    </>
  )
}

/* ── Other ──────────────────────────────────────────────── */
function OtherFields({ fields, errors, onChange }) {
  return (
    <>
      <div className="field">
        <label htmlFor="other-specify">
          Specify Issue <span className="required-star">*</span>
        </label>
        <input
          id="other-specify"
          type="text"
          className={`form-input${errors.otherSpecify ? ' error' : ''}`}
          value={fields.otherSpecify || ''}
          onChange={e => onChange('otherSpecify', e.target.value)}
          placeholder="Please mention the type of issue"
        />
        {errors.otherSpecify && (
          <span className="field-error">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {errors.otherSpecify}
          </span>
        )}
      </div>
      <InputField
        id="other-location"
        label="Location"
        optional
        error={errors.otherLocation}
        value={fields.otherLocation || ''}
        onChange={v => onChange('otherLocation', v)}
        placeholder="Where did the issue occur?"
      />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY METADATA
   ═══════════════════════════════════════════════════════════ */

const CATEGORY_META = {
  'Infrastructure':            { icon: '🏛️', label: 'Infrastructure Details' },
  'IT Support':                { icon: '💻', label: 'IT Support Details' },
  'Hostel':                    { icon: '🏠', label: 'Hostel Details' },
  'Cleaning and Water':        { icon: '🚿', label: 'Cleaning & Water Details' },
  'Accounts':                  { icon: '📋', label: 'Account Details' },
  'Admission / Student Section': { icon: '🎓', label: 'Admission / Student Section Details' },
  'Canteen':                   { icon: '🍽️', label: 'Canteen Details' },
  'Security':                  { icon: '🔒', label: 'Security Details' },
  'Library':                   { icon: '📚', label: 'Library Details' },
  'Exam Cell':                 { icon: '📝', label: 'Exam Cell Details' },
  'Other':                     { icon: '📌', label: 'Additional Details' },
}

export function normalizeCategoryName(cat) {
  if (!cat) return ''
  const lower = cat.toLowerCase().trim()
  if (lower.includes('infra') || lower.includes('electric')) return 'Infrastructure'
  if (lower === 'it' || lower.includes('it support') || lower.includes('tech')) return 'IT Support'
  if (lower.includes('clean') || lower.includes('water') || lower.includes('plumb')) return 'Cleaning and Water'
  if (lower.includes('admiss')) return 'Admission / Student Section'
  if (lower.includes('hostel')) return 'Hostel'
  if (lower.includes('account')) return 'Accounts'
  if (lower.includes('canteen') || lower.includes('food') || lower.includes('mess')) return 'Canteen'
  if (lower.includes('secur')) return 'Security'
  if (lower.includes('lib')) return 'Library'
  if (lower.includes('exam')) return 'Exam Cell'
  return cat
}

function DynamicFields({ category, fields, errors, onChange }) {
  const normalizedCategory = normalizeCategoryName(category)
  if (!normalizedCategory || !CATEGORY_META[normalizedCategory]) return null

  const meta = CATEGORY_META[normalizedCategory]

  const renderFields = () => {
    switch (normalizedCategory) {
      case 'Infrastructure':            return <InfrastructureFields fields={fields} errors={errors} onChange={onChange} />
      case 'IT Support':                return <ITSupportFields fields={fields} errors={errors} onChange={onChange} />
      case 'Hostel':                    return <HostelFields fields={fields} errors={errors} onChange={onChange} />
      case 'Cleaning and Water':        return <CleaningFields fields={fields} errors={errors} onChange={onChange} />
      case 'Accounts':                  return <AccountsFields fields={fields} errors={errors} onChange={onChange} />
      case 'Admission / Student Section': return <AdmissionFields fields={fields} errors={errors} onChange={onChange} />
      case 'Canteen':                   return <CanteenFields fields={fields} errors={errors} onChange={onChange} />
      case 'Security':                  return <SecurityFields fields={fields} errors={errors} onChange={onChange} />
      case 'Library':                   return <LibraryFields fields={fields} errors={errors} onChange={onChange} />
      case 'Exam Cell':                 return <ExamCellFields fields={fields} errors={errors} onChange={onChange} />
      case 'Other':                     return <OtherFields fields={fields} errors={errors} onChange={onChange} />
      default:                          return null
    }
  }

  return (
    <div className="dynamic-section">
      <div className="dynamic-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {meta.icon} {meta.label}
      </div>
      <div className="field-group">
        {renderFields()}
      </div>
    </div>
  )
}

export default DynamicFields

/* ─── Export validation helper ───────────────────────────── */
export function validateDynamicFields(category, fields) {
  const e = {}
  if (!category) return e
  const norm = normalizeCategoryName(category)

  switch (norm) {
    case 'Infrastructure':
      if (!fields.infraLocationType) e.infraLocationType = 'Please select a location type.'
      if (!fields.infraRoomNumber)   e.infraRoomNumber   = 'Room / location number is required.'
      if (fields.infraLocationType === 'Other' && !fields.infraSpecify) e.infraSpecify = 'Please specify the location.'
      break

    case 'IT Support':
      if (!fields.itLocation)  e.itLocation  = 'Location is required.'
      if (!fields.itIssueType) e.itIssueType = 'Please select an issue type.'
      if (fields.itIssueType === 'Other' && !fields.itSpecify) e.itSpecify = 'Please specify the issue.'
      break

    case 'Hostel':
      if (!fields.hostelName)  e.hostelName  = 'Hostel name is required.'
      if (!fields.hostelRoom)  e.hostelRoom  = 'Room number is required.'
      if (!fields.hostelIssue) e.hostelIssue = 'Please select an issue type.'
      if (fields.hostelIssue === 'Other' && !fields.hostelSpecify) e.hostelSpecify = 'Please specify the issue.'
      break

    case 'Cleaning and Water':
      if (!fields.cleanLocation) e.cleanLocation = 'Location is required.'
      if (!fields.cleanIssue)    e.cleanIssue    = 'Please select an issue type.'
      if (fields.cleanIssue === 'Other' && !fields.cleanSpecify) e.cleanSpecify = 'Please specify the issue.'
      break

    case 'Accounts':
      if (!fields.accIssue) e.accIssue = 'Issue type is required.'
      break

    case 'Admission / Student Section':
      if (!fields.admIssue) e.admIssue = 'Issue type is required.'
      break

    case 'Canteen':
      if (!fields.canteenIssue) e.canteenIssue = 'Please select an issue type.'
      if (fields.canteenIssue === 'Other' && !fields.canteenSpecify) e.canteenSpecify = 'Please specify the issue.'
      break

    case 'Security':
      if (!fields.secLocation) e.secLocation = 'Location is required.'
      if (!fields.secIncident)  e.secIncident  = 'Please select an incident type.'
      if (fields.secIncident === 'Other' && !fields.secSpecify) e.secSpecify = 'Please specify the incident.'
      break

    case 'Library':
      if (!fields.libIssue) e.libIssue = 'Please select an issue type.'
      if (fields.libIssue === 'Other' && !fields.libSpecify) e.libSpecify = 'Please specify the issue.'
      break

    case 'Exam Cell':
      if (!fields.examIssue) e.examIssue = 'Please select an issue type.'
      if (fields.examIssue === 'Other' && !fields.examSpecify) e.examSpecify = 'Please specify the issue.'
      break

    case 'Other':
      if (!fields.otherSpecify) e.otherSpecify = 'Please specify the issue.'
      break

    default:
      break
  }

  return e
}

/* ─── Export payload builder ─────────────────────────────── */
export function buildCategoryPayload(category, fields) {
  const norm = normalizeCategoryName(category)
  switch (norm) {
    case 'Infrastructure':
      return {
        subCategory: fields.infraLocationType,
        location:    fields.infraRoomNumber,
        additionalDetails: fields.infraLocationType === 'Other' ? fields.infraSpecify : undefined,
      }
    case 'IT Support':
      return {
        location:    fields.itLocation,
        roomNumber:  fields.itDeviceNumber,
        subCategory: fields.itIssueType,
        additionalDetails: fields.itIssueType === 'Other' ? fields.itSpecify : undefined,
      }
    case 'Hostel':
      return {
        location:    fields.hostelName,
        roomNumber:  fields.hostelRoom,
        subCategory: fields.hostelIssue,
        additionalDetails: fields.hostelIssue === 'Other' ? fields.hostelSpecify : undefined,
      }
    case 'Cleaning and Water':
      return {
        location:    fields.cleanLocation,
        subCategory: fields.cleanIssue,
        additionalDetails: fields.cleanIssue === 'Other' ? fields.cleanSpecify : undefined,
      }
    case 'Accounts':
      return {
        subCategory:     fields.accIssue,
        referenceNumber: fields.accReference,
      }
    case 'Admission / Student Section':
      return {
        referenceNumber: fields.admId,
        subCategory:     fields.admIssue,
      }
    case 'Canteen':
      return {
        location:    fields.canteenLocation,
        subCategory: fields.canteenIssue,
        additionalDetails: fields.canteenIssue === 'Other' ? fields.canteenSpecify : undefined,
      }
    case 'Security':
      return {
        location:    fields.secLocation,
        subCategory: fields.secIncident,
        additionalDetails: fields.secIncident === 'Other' ? fields.secSpecify : undefined,
      }
    case 'Library':
      return {
        subCategory:     fields.libIssue,
        referenceNumber: fields.libBookId,
        additionalDetails: fields.libIssue === 'Other' ? fields.libSpecify : undefined,
      }
    case 'Exam Cell':
      return {
        location:        fields.examSubject,
        referenceNumber: fields.examRoll,
        subCategory:     fields.examIssue,
        additionalDetails: fields.examIssue === 'Other' ? fields.examSpecify : undefined,
      }
    case 'Other':
      return {
        additionalDetails: fields.otherSpecify,
        location:          fields.otherLocation,
      }
    default:
      return {}
  }
}
