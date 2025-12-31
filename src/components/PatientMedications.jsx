import React, { useState, useEffect } from 'react'
import './PatientMedications.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientMedications({ patientId }) {
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && patientId) {
      fetchMedications()
    }
  }, [expanded, patientId])

  const fetchMedications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${FHIR_BASE_URL}/MedicationRequest?subject=Patient/${patientId}&_sort=-authoredon&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setMedications(data.entry.map(entry => entry.resource))
      } else {
        setMedications([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching medications:', err)
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

  const getMedicationDisplay = (medication) => {
    const name = medication.medicationCodeableConcept?.coding?.[0]?.display || 
                 medication.medicationCodeableConcept?.text || 
                 'Unknown medication'
    const status = medication.status || 'unknown'
    const intent = medication.intent || 'unknown'
    const dosage = medication.dosageInstruction?.[0]?.text || 
                   medication.dosageInstruction?.[0]?.timing?.repeat ? 
                   `${medication.dosageInstruction[0].timing.repeat.frequency || 1}x per ${medication.dosageInstruction[0].timing.repeat.periodUnit || 'day'}` :
                   'As directed'
    return { name, status, intent, dosage }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active'
      case 'completed':
        return 'status-completed'
      case 'stopped':
      case 'cancelled':
        return 'status-stopped'
      default:
        return 'status-unknown'
    }
  }

  if (!expanded) {
    return (
      <div className="medications-section">
        <button 
          className="toggle-medications-button"
          onClick={() => setExpanded(true)}
        >
          View Medications
        </button>
      </div>
    )
  }

  return (
    <div className="medications-section expanded">
      <div className="medications-header">
        <h4>Medications {medications.length > 0 && `(${medications.length})`}</h4>
        <button 
          className="toggle-medications-button"
          onClick={() => setExpanded(false)}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="medications-loading">
          <div className="spinner-small"></div>
          <span>Loading medications...</span>
        </div>
      ) : error ? (
        <div className="medications-error">
          <p>Error loading medications: {error}</p>
          <button onClick={fetchMedications} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : medications.length === 0 ? (
        <div className="medications-empty">
          <p>No medications found for this patient.</p>
        </div>
      ) : (
        <div className="medications-content">
          {medications.map((medication) => {
            const { name, status, intent, dosage } = getMedicationDisplay(medication)
            return (
              <div key={medication.id} className="medication-item">
                <div className="medication-main">
                  <div className="medication-name">{name}</div>
                  <div className="medication-status">
                    <span className={`status-badge ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>
                <div className="medication-details">
                  <div className="medication-detail-row">
                    <span className="detail-label">Dosage:</span>
                    <span className="detail-value">{dosage}</span>
                  </div>
                  <div className="medication-detail-row">
                    <span className="detail-label">Started:</span>
                    <span className="detail-value">{formatDate(medication.authoredOn)}</span>
                  </div>
                  {medication.reasonReference && medication.reasonReference.length > 0 && (
                    <div className="medication-detail-row">
                      <span className="detail-label">Reason:</span>
                      <span className="detail-value">
                        {medication.reasonReference[0].display || 'N/A'}
                      </span>
                    </div>
                  )}
                  {medication.requester && (
                    <div className="medication-detail-row">
                      <span className="detail-label">Prescribed by:</span>
                      <span className="detail-value">
                        {medication.requester.display || 'N/A'}
                      </span>
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

export default PatientMedications

