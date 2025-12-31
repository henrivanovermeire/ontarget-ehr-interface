import React, { useState } from 'react'
import './LabValueForm.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'
const ORGANIZATION_ID = '53655767'

function LabValueForm({ patient, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    gfr: '',
    hemoglobin: '',
    effectiveDateTime: new Date().toISOString().split('T')[0] // Today's date
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const createObservation = (code, display, value, unit, unitSystem) => {
    return {
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory',
          display: 'Laboratory'
        }],
        text: 'Laboratory'
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: code,
          display: display
        }],
        text: display
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.name?.[0] ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim() : 'Unknown'
      },
      effectiveDateTime: formData.effectiveDateTime,
      valueQuantity: {
        value: parseFloat(value),
        unit: unit,
        system: unitSystem,
        code: unit
      },
      performer: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital'
      }]
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const observations = []

      // Create GFR observation if provided
      if (formData.gfr && formData.gfr.trim() !== '') {
        const gfrValue = parseFloat(formData.gfr)
        if (isNaN(gfrValue) || gfrValue < 0) {
          throw new Error('GFR must be a valid positive number')
        }
        observations.push(
          createObservation(
            '33914-3', // LOINC code for GFR
            'Glomerular filtration rate/1.73 sq M.predicted',
            gfrValue,
            'mL/min/1.73m2',
            'http://unitsofmeasure.org'
          )
        )
      }

      // Create Hemoglobin observation if provided
      if (formData.hemoglobin && formData.hemoglobin.trim() !== '') {
        const hgbValue = parseFloat(formData.hemoglobin)
        if (isNaN(hgbValue) || hgbValue < 0) {
          throw new Error('Hemoglobin must be a valid positive number')
        }
        observations.push(
          createObservation(
            '718-7', // LOINC code for Hemoglobin
            'Hemoglobin [Mass/volume] in Blood',
            hgbValue,
            'g/dL',
            'http://unitsofmeasure.org'
          )
        )
      }

      if (observations.length === 0) {
        throw new Error('Please enter at least one lab value')
      }

      // Submit all observations
      const results = await Promise.all(
        observations.map(obs =>
          fetch(`${FHIR_BASE_URL}/Observation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/fhir+json',
              'Accept': 'application/fhir+json'
            },
            body: JSON.stringify(obs)
          })
        )
      )

      // Check for errors
      const errors = []
      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          const errorData = await results[i].json().catch(() => ({}))
          errors.push(`Failed to create ${observations[i].code.text}: ${results[i].status} ${errorData.issue?.[0]?.diagnostics || ''}`)
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '))
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message)
      console.error('Error submitting lab values:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPatientName = () => {
    if (!patient.name || patient.name.length === 0) return 'Unknown'
    const first = patient.name[0]
    const given = first.given ? first.given.join(' ') : ''
    const family = first.family || ''
    return `${given} ${family}`.trim() || 'Unknown'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Lab Values</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="patient-info">
            <strong>Patient:</strong> {formatPatientName()} (ID: {patient.id})
          </div>

          <form onSubmit={handleSubmit} className="lab-form">
            <div className="form-group">
              <label htmlFor="effectiveDateTime">
                Date of Observation <span className="required">*</span>
              </label>
              <input
                type="date"
                id="effectiveDateTime"
                name="effectiveDateTime"
                value={formData.effectiveDateTime}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gfr">
                GFR (Glomerular Filtration Rate) - mL/min/1.73m²
              </label>
              <input
                type="number"
                id="gfr"
                name="gfr"
                value={formData.gfr}
                onChange={handleChange}
                min="0"
                step="0.1"
                placeholder="e.g., 90.0"
                className="form-input"
              />
              <small className="form-help">Leave blank if not available</small>
            </div>

            <div className="form-group">
              <label htmlFor="hemoglobin">
                Hemoglobin - g/dL
              </label>
              <input
                type="number"
                id="hemoglobin"
                name="hemoglobin"
                value={formData.hemoglobin}
                onChange={handleChange}
                min="0"
                step="0.1"
                placeholder="e.g., 14.5"
                className="form-input"
              />
              <small className="form-help">Leave blank if not available</small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                Lab values submitted successfully!
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={loading || success}
              >
                {loading ? 'Submitting...' : 'Submit Lab Values'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LabValueForm

