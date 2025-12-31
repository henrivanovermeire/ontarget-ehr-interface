import React, { useState, useEffect } from 'react'
import './PatientDiagnosticReports.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'

function PatientDiagnosticReports({ patientId }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedReport, setExpandedReport] = useState(null)

  useEffect(() => {
    if (expanded && patientId) {
      fetchDiagnosticReports()
    }
  }, [expanded, patientId])

  const fetchDiagnosticReports = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${FHIR_BASE_URL}/DiagnosticReport?subject=Patient/${patientId}&_sort=-date&_count=50`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setReports(data.entry.map(entry => entry.resource))
      } else {
        setReports([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching diagnostic reports:', err)
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getReportDisplay = (report) => {
    const code = report.code?.coding?.[0]?.display || report.code?.text || 'Unknown test'
    const status = report.status || 'unknown'
    return { code, status }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'final':
        return 'status-final'
      case 'preliminary':
        return 'status-preliminary'
      case 'amended':
        return 'status-amended'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return 'status-unknown'
    }
  }

  if (!expanded) {
    return (
      <div className="diagnostic-reports-section">
        <button 
          className="toggle-diagnostic-reports-button"
          onClick={() => setExpanded(true)}
        >
          View Diagnostic Reports
        </button>
      </div>
    )
  }

  return (
    <div className="diagnostic-reports-section expanded">
      <div className="diagnostic-reports-header">
        <h4>Diagnostic Reports {reports.length > 0 && `(${reports.length})`}</h4>
        <button 
          className="toggle-diagnostic-reports-button"
          onClick={() => {
            setExpanded(false)
            setExpandedReport(null)
          }}
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="diagnostic-reports-loading">
          <div className="spinner-small"></div>
          <span>Loading diagnostic reports...</span>
        </div>
      ) : error ? (
        <div className="diagnostic-reports-error">
          <p>Error loading diagnostic reports: {error}</p>
          <button onClick={fetchDiagnosticReports} className="retry-button-small">
            Retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="diagnostic-reports-empty">
          <p>No diagnostic reports found for this patient.</p>
        </div>
      ) : (
        <div className="diagnostic-reports-content">
          {reports.map((report) => {
            const { code, status } = getReportDisplay(report)
            return (
              <div key={report.id} className="diagnostic-report-item">
                <div className="diagnostic-report-header">
                  <div className="diagnostic-report-title">
                    <h5>{code}</h5>
                    <span className="diagnostic-report-date">{formatDate(report.effectiveDateTime || report.issued)}</span>
                  </div>
                  <div className="diagnostic-report-actions">
                    <span className={`status-badge ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <button
                      className="expand-report-button"
                      onClick={() => setExpandedReport(
                        expandedReport === report.id ? null : report.id
                      )}
                    >
                      {expandedReport === report.id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
                
                {expandedReport === report.id && (
                  <div className="diagnostic-report-details">
                    {report.conclusion && (
                      <div className="report-section">
                        <h6>Conclusion</h6>
                        <div className="report-content">
                          <p>{report.conclusion}</p>
                        </div>
                      </div>
                    )}
                    {report.conclusionCode && report.conclusionCode.length > 0 && (
                      <div className="report-section">
                        <h6>Conclusion Codes</h6>
                        <div className="report-content">
                          {report.conclusionCode.map((code, index) => (
                            <div key={index} className="code-item">
                              <span className="code-display">
                                {code.coding?.[0]?.display || code.text || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.result && report.result.length > 0 && (
                      <div className="report-section">
                        <h6>Results</h6>
                        <div className="report-content">
                          <p>{report.result.length} result(s) referenced</p>
                        </div>
                      </div>
                    )}
                    <div className="report-meta">
                      <span><strong>Status:</strong> {report.status}</span>
                      {report.issued && (
                        <span><strong>Issued:</strong> {formatDate(report.issued)}</span>
                      )}
                      {report.performer && report.performer.length > 0 && (
                        <span><strong>Performed by:</strong> {report.performer[0].display || 'N/A'}</span>
                      )}
                      {report.basedOn && report.basedOn.length > 0 && (
                        <span><strong>Based on:</strong> {report.basedOn[0].display || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PatientDiagnosticReports

