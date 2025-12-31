import React, { useState, useEffect } from 'react'
import './PatientObservations.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientObservations({ patientId }) {
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && patientId) {
      fetchObservations()
    }
  }, [expanded, patientId])

  const fetchObservations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${FHIR_BASE_URL}/Observation?subject=Patient/${patientId}&_sort=-date&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setObservations(data.entry.map(entry => entry.resource))
      } else {
        setObservations([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching observations:', err)
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

  const getObservationDisplay = (obs) => {
    const code = obs.code?.coding?.[0]?.display || obs.code?.text || 'Unknown'
    let value = 'N/A'
    let components = null
    
    // Handle blood pressure and other multi-component observations
    if (obs.component && obs.component.length > 0) {
      components = obs.component.map(comp => {
        const compCode = comp.code?.coding?.[0]?.display || comp.code?.text || 'Unknown'
        let compValue = 'N/A'
        if (comp.valueQuantity) {
          compValue = `${comp.valueQuantity.value} ${comp.valueQuantity.unit || ''}`
        } else if (comp.valueString) {
          compValue = comp.valueString
        } else if (comp.valueCodeableConcept) {
          compValue = comp.valueCodeableConcept.coding?.[0]?.display || comp.valueCodeableConcept.text || 'N/A'
        }
        return { code: compCode, value: compValue }
      })
      // For blood pressure, format as "Systolic/Diastolic"
      if (components.length === 2 && code.toLowerCase().includes('blood pressure')) {
        value = `${components[0].value}/${components[1].value}`
      } else {
        value = components.map(c => `${c.code}: ${c.value}`).join(', ')
      }
    } else if (obs.valueQuantity) {
      value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`
    } else if (obs.valueString) {
      value = obs.valueString
    } else if (obs.valueCodeableConcept) {
      value = obs.valueCodeableConcept.coding?.[0]?.display || obs.valueCodeableConcept.text || 'N/A'
    }

    return { code, value, components }
  }

  const isLabObservation = (obs) => {
    const category = obs.category?.[0]?.coding?.[0]?.code
    return category === 'laboratory'
  }

  const isVitalSign = (obs) => {
    const category = obs.category?.[0]?.coding?.[0]?.code
    return category === 'vital-signs'
  }

  const labObservations = observations.filter(isLabObservation)
  const vitalSigns = observations.filter(isVitalSign)
  const otherObservations = observations.filter(obs => !isLabObservation(obs) && !isVitalSign(obs))

  if (!expanded) {
    return (
      <div className="observations-section">
        <button 
          className="toggle-observations-button"
          onClick={() => setExpanded(true)}
        >
          View Observations
        </button>
      </div>
    )
  }

  return (
    <div className="observations-section expanded">
      <div className="observations-header">
        <h4>Observations</h4>
        <button 
          className="toggle-observations-button"
          onClick={() => setExpanded(false)}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="observations-loading">
          <div className="spinner-small"></div>
          <span>Loading observations...</span>
        </div>
      ) : error ? (
        <div className="observations-error">
          <p>Error loading observations: {error}</p>
          <button onClick={fetchObservations} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : observations.length === 0 ? (
        <div className="observations-empty">
          <p>No observations found for this patient.</p>
        </div>
      ) : (
        <div className="observations-content">
          {vitalSigns.length > 0 && (
            <div className="observations-group">
              <h5>Vital Signs</h5>
              <div className="observations-list">
                {vitalSigns.map((obs) => {
                  const { code, value } = getObservationDisplay(obs)
                  return (
                    <div key={obs.id} className="observation-item">
                      <div className="observation-code">{code}</div>
                      <div className="observation-value">{value}</div>
                      <div className="observation-date">{formatDate(obs.effectiveDateTime)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {labObservations.length > 0 && (
            <div className="observations-group">
              <h5>Lab Values</h5>
              <div className="observations-list">
                {labObservations.map((obs) => {
                  const { code, value } = getObservationDisplay(obs)
                  return (
                    <div key={obs.id} className="observation-item">
                      <div className="observation-code">{code}</div>
                      <div className="observation-value">{value}</div>
                      <div className="observation-date">{formatDate(obs.effectiveDateTime)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {otherObservations.length > 0 && (
            <div className="observations-group">
              <h5>Other Observations</h5>
              <div className="observations-list">
                {otherObservations.map((obs) => {
                  const { code, value } = getObservationDisplay(obs)
                  return (
                    <div key={obs.id} className="observation-item">
                      <div className="observation-code">{code}</div>
                      <div className="observation-value">{value}</div>
                      <div className="observation-date">{formatDate(obs.effectiveDateTime)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PatientObservations

