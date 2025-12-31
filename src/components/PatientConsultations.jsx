import React, { useState, useEffect } from 'react'
import './PatientConsultations.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientConsultations({ patientId }) {
  const [compositions, setCompositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedComposition, setExpandedComposition] = useState(null)

  useEffect(() => {
    if (expanded && patientId) {
      fetchConsultations()
    }
  }, [expanded, patientId])

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Query Composition resources for this patient
      const response = await fetch(
        `${FHIR_BASE_URL}/Composition?subject=Patient/${patientId}&_sort=-date&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setCompositions(data.entry.map(entry => entry.resource))
      } else {
        setCompositions([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching consultations:', err)
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

  const extractTextFromDiv = (divString) => {
    if (!divString) return ''
    // Extract text content from HTML div
    const match = divString.match(/<div[^>]*>(.*?)<\/div>/s)
    return match ? match[1].trim() : divString
  }

  const getCompositionType = (composition) => {
    return composition.type?.text || 
           composition.type?.coding?.[0]?.display || 
           'Consultation Report'
  }

  if (!expanded) {
    return (
      <div className="consultations-section">
        <button 
          className="toggle-consultations-button"
          onClick={() => setExpanded(true)}
        >
          View Consultation Reports
        </button>
      </div>
    )
  }

  return (
    <div className="consultations-section expanded">
      <div className="consultations-header">
        <h4>Consultation Reports {compositions.length > 0 && `(${compositions.length})`}</h4>
        <button 
          className="toggle-consultations-button"
          onClick={() => {
            setExpanded(false)
            setExpandedComposition(null)
          }}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="consultations-loading">
          <div className="spinner-small"></div>
          <span>Loading consultation reports...</span>
        </div>
      ) : error ? (
        <div className="consultations-error">
          <p>Error loading consultation reports: {error}</p>
          <button onClick={fetchConsultations} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : compositions.length === 0 ? (
        <div className="consultations-empty">
          <p>No consultation reports found for this patient.</p>
        </div>
      ) : (
        <div className="consultations-content">
          {compositions.map((composition) => (
            <div key={composition.id} className="consultation-item">
              <div className="consultation-header">
                <div className="consultation-title">
                  <h5>{getCompositionType(composition)}</h5>
                  <span className="consultation-date">{formatDate(composition.date)}</span>
                </div>
                <button
                  className="expand-consultation-button"
                  onClick={() => setExpandedComposition(
                    expandedComposition === composition.id ? null : composition.id
                  )}
                >
                  {expandedComposition === composition.id ? '▼' : '▶'}
                </button>
              </div>
              
              {expandedComposition === composition.id && (
                <div className="consultation-details">
                  {composition.section && composition.section.length > 0 ? (
                    composition.section.map((section, index) => (
                      <div key={index} className="consultation-section">
                        <h6>{section.title}</h6>
                        <div className="section-content">
                          {section.text?.div ? (
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: extractTextFromDiv(section.text.div) 
                              }} 
                            />
                          ) : (
                            <p className="no-content">No content available</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-sections">No sections available in this report.</p>
                  )}
                  <div className="consultation-meta">
                    <span><strong>Status:</strong> {composition.status}</span>
                    {composition.author && composition.author.length > 0 && (
                      <span><strong>Author:</strong> {composition.author[0].display || 'N/A'}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PatientConsultations

