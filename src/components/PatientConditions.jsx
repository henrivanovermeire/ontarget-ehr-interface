import React, { useState, useEffect } from 'react'
import './PatientConditions.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientConditions({ patientId }) {
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && patientId) {
      fetchConditions()
    }
  }, [expanded, patientId])

  const fetchConditions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${FHIR_BASE_URL}/Condition?subject=Patient/${patientId}&_sort=-onset-date&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setConditions(data.entry.map(entry => entry.resource))
      } else {
        setConditions([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching conditions:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getConditionDisplay = (condition) => {
    const code = condition.code?.coding?.[0]?.display || condition.code?.text || 'Unknown'
    const clinicalStatus = condition.clinicalStatus?.coding?.[0]?.display || condition.clinicalStatus?.coding?.[0]?.code || 'unknown'
    const severity = condition.severity?.coding?.[0]?.display || null
    return { code, clinicalStatus, severity }
  }

  if (!expanded) {
    return (
      <div className="conditions-section">
        <button 
          className="toggle-conditions-button"
          onClick={() => setExpanded(true)}
        >
          View Conditions
        </button>
      </div>
    )
  }

  return (
    <div className="conditions-section expanded">
      <div className="conditions-header">
        <h4>Medical Conditions</h4>
        <button 
          className="toggle-conditions-button"
          onClick={() => setExpanded(false)}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="conditions-loading">
          <div className="spinner-small"></div>
          <span>Loading conditions...</span>
        </div>
      ) : error ? (
        <div className="conditions-error">
          <p>Error loading conditions: {error}</p>
          <button onClick={fetchConditions} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : conditions.length === 0 ? (
        <div className="conditions-empty">
          <p>No conditions found for this patient.</p>
        </div>
      ) : (
        <div className="conditions-content">
          {conditions.map((condition) => {
            const { code, clinicalStatus, severity } = getConditionDisplay(condition)
            return (
              <div key={condition.id} className="condition-item">
                <div className="condition-main">
                  <div className="condition-code">{code}</div>
                  <div className="condition-status">
                    <span className={`status-badge status-${clinicalStatus.toLowerCase()}`}>
                      {clinicalStatus}
                    </span>
                  </div>
                </div>
                <div className="condition-details">
                  {severity && (
                    <div className="condition-detail-row">
                      <span className="detail-label">Severity:</span>
                      <span className="detail-value">{severity}</span>
                    </div>
                  )}
                  <div className="condition-detail-row">
                    <span className="detail-label">Onset:</span>
                    <span className="detail-value">{formatDate(condition.onsetDateTime || condition.onsetPeriod?.start)}</span>
                  </div>
                  {condition.recordedDate && (
                    <div className="condition-detail-row">
                      <span className="detail-label">Recorded:</span>
                      <span className="detail-value">{formatDate(condition.recordedDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PatientConditions

