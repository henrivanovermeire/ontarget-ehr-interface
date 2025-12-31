import React, { useState } from 'react'
import './ConsultationForm.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'
const ORGANIZATION_ID = '53655767'

function ConsultationForm({ patient, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    assessment: '',
    plan: '',
    notes: ''
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

  const createComposition = () => {
    const sections = []

    if (formData.chiefComplaint) {
      sections.push({
        title: 'Chief Complaint',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '10154-3',
            display: 'Chief complaint'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.chiefComplaint}</div>`
        }
      })
    }

    if (formData.historyOfPresentIllness) {
      sections.push({
        title: 'History of Present Illness',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '10164-2',
            display: 'History of present illness'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.historyOfPresentIllness}</div>`
        }
      })
    }

    if (formData.physicalExamination) {
      sections.push({
        title: 'Physical Examination',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '29545-1',
            display: 'Physical examination'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.physicalExamination}</div>`
        }
      })
    }

    if (formData.assessment) {
      sections.push({
        title: 'Assessment',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '51848-0',
            display: 'Assessment'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.assessment}</div>`
        }
      })
    }

    if (formData.plan) {
      sections.push({
        title: 'Plan',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '18776-5',
            display: 'Plan'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.plan}</div>`
        }
      })
    }

    if (formData.notes) {
      sections.push({
        title: 'Additional Notes',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '11506-3',
            display: 'Progress note'
          }]
        },
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">${formData.notes}</div>`
        }
      })
    }

    return {
      resourceType: 'Composition',
      status: 'final',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Progress note'
        }],
        text: 'Cardiology Consultation Report'
      },
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '308335008',
          display: 'Patient consultation'
        }],
        text: 'Consultation'
      }],
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.name?.[0] ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim() : 'Unknown'
      },
      date: formData.date,
      author: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      }],
      title: 'Cardiology Consultation Report',
      section: sections
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate that at least some content is provided
      if (!formData.chiefComplaint && !formData.assessment && !formData.plan) {
        throw new Error('Please provide at least Chief Complaint, Assessment, or Plan')
      }

      const composition = createComposition()

      if (composition.section.length === 0) {
        throw new Error('Please provide at least one section of the consultation report')
      }

      const response = await fetch(`${FHIR_BASE_URL}/Composition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json'
        },
        body: JSON.stringify(composition)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to create consultation report: ${response.status} ${errorData.issue?.[0]?.diagnostics || ''}`)
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message)
      console.error('Error submitting consultation report:', err)
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
      <div className="modal-content consultation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cardiology Consultation Report</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="patient-info">
            <strong>Patient:</strong> {formatPatientName()} (ID: {patient.id})
          </div>

          <form onSubmit={handleSubmit} className="consultation-form">
            <div className="form-group">
              <label htmlFor="date">
                Consultation Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="chiefComplaint">Chief Complaint</label>
              <textarea
                id="chiefComplaint"
                name="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={handleChange}
                rows="3"
                placeholder="Enter the chief complaint..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="historyOfPresentIllness">History of Present Illness</label>
              <textarea
                id="historyOfPresentIllness"
                name="historyOfPresentIllness"
                value={formData.historyOfPresentIllness}
                onChange={handleChange}
                rows="4"
                placeholder="Enter the history of present illness..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="physicalExamination">Physical Examination</label>
              <textarea
                id="physicalExamination"
                name="physicalExamination"
                value={formData.physicalExamination}
                onChange={handleChange}
                rows="4"
                placeholder="Enter physical examination findings..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="assessment">Assessment</label>
              <textarea
                id="assessment"
                name="assessment"
                value={formData.assessment}
                onChange={handleChange}
                rows="4"
                placeholder="Enter assessment and diagnosis..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="plan">Plan</label>
              <textarea
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                rows="4"
                placeholder="Enter treatment plan..."
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Enter any additional notes..."
                className="form-textarea"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                Consultation report submitted successfully!
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
                {loading ? 'Submitting...' : 'Submit Consultation Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ConsultationForm

