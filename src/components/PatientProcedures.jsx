import React, { useState, useEffect } from 'react'
import './PatientProcedures.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientProcedures({ patientId }) {
  const [procedures, setProcedures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && patientId) {
      fetchProcedures()
    }
  }, [expanded, patientId])

  const fetchProcedures = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${FHIR_BASE_URL}/Procedure?subject=Patient/${patientId}&_sort=-date&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setProcedures(data.entry.map(entry => entry.resource))
      } else {
        setProcedures([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching procedures:', err)
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

  const getProcedureDisplay = (procedure) => {
    const code = procedure.code?.coding?.[0]?.display || procedure.code?.text || 'Unknown'
    const status = procedure.status || 'unknown'
    return { code, status }
  }

  if (!expanded) {
    return (
      <div className="procedures-section">
        <button 
          className="toggle-procedures-button"
          onClick={() => setExpanded(true)}
        >
          View Procedures
        </button>
      </div>
    )
  }

  return (
    <div className="procedures-section expanded">
      <div className="procedures-header">
        <h4>Procedures</h4>
        <button 
          className="toggle-procedures-button"
          onClick={() => setExpanded(false)}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="procedures-loading">
          <div className="spinner-small"></div>
          <span>Loading procedures...</span>
        </div>
      ) : error ? (
        <div className="procedures-error">
          <p>Error loading procedures: {error}</p>
          <button onClick={fetchProcedures} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : procedures.length === 0 ? (
        <div className="procedures-empty">
          <p>No procedures found for this patient.</p>
        </div>
      ) : (
        <div className="procedures-content">
          {procedures.map((procedure) => {
            const { code, status } = getProcedureDisplay(procedure)
            return (
              <div key={procedure.id} className="procedure-item">
                <div className="procedure-main">
                  <div className="procedure-code">{code}</div>
                  <div className="procedure-status">
                    <span className={`status-badge status-${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </div>
                </div>
                <div className="procedure-details">
                  <div className="procedure-detail-row">
                    <span className="detail-label">Performed:</span>
                    <span className="detail-value">
                      {formatDate(procedure.performedDateTime || procedure.performedPeriod?.start)}
                    </span>
                  </div>
                  {procedure.performer && procedure.performer.length > 0 && (
                    <div className="procedure-detail-row">
                      <span className="detail-label">Performed by:</span>
                      <span className="detail-value">
                        {procedure.performer[0].actor?.display || 'N/A'}
                      </span>
                    </div>
                  )}
                  {procedure.reasonReference && procedure.reasonReference.length > 0 && (
                    <div className="procedure-detail-row">
                      <span className="detail-label">Reason:</span>
                      <span className="detail-value">
                        {procedure.reasonReference[0].display || 'N/A'}
                      </span>
                    </div>
                  )}
                  {procedure.note && procedure.note.length > 0 && (
                    <div className="procedure-notes">
                      <span className="detail-label">Notes:</span>
                      <span className="detail-value">{procedure.note[0].text}</span>
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

export default PatientProcedures

