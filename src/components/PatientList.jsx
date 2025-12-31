import React, { useState, useEffect } from 'react'
import LabValueForm from './LabValueForm'
import ConsultationForm from './ConsultationForm'
import PatientObservations from './PatientObservations'
import PatientConsultations from './PatientConsultations'
import PatientConditions from './PatientConditions'
import PatientProcedures from './PatientProcedures'
import PatientMedications from './PatientMedications'
import PatientDiagnosticReports from './PatientDiagnosticReports'
import './PatientList.css'

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'
const ORGANIZATION_ID = '53655767'

function PatientList() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedPatientForConsultation, setSelectedPatientForConsultation] = useState(null)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Query patients by organization
      // Using the organization reference: Organization/53655767
      const response = await fetch(
        `${FHIR_BASE_URL}/Patient?organization=Organization/${ORGANIZATION_ID}&_count=100`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.entry && data.entry.length > 0) {
        setPatients(data.entry.map(entry => entry.resource))
      } else {
        setPatients([])
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatName = (name) => {
    if (!name || name.length === 0) return 'Unknown'
    const first = name[0]
    const given = first.given ? first.given.join(' ') : ''
    const family = first.family || ''
    return `${given} ${family}`.trim() || 'Unknown'
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

  const getGenderDisplay = (gender) => {
    if (!gender) return 'Unknown'
    return gender.charAt(0).toUpperCase() + gender.slice(1)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading patients...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Patients</h2>
        <p>{error}</p>
        <button onClick={fetchPatients} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="patient-list-container">
      <div className="patient-list-header">
        <h2>Patients ({patients.length})</h2>
        <button onClick={fetchPatients} className="refresh-button">
          Refresh
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="empty-state">
          <p>No patients found for this organization.</p>
        </div>
      ) : (
        <div className="patient-grid">
          {patients.map((patient) => (
            <div key={patient.id} className="patient-card">
              <div className="patient-card-header">
                <h3>{formatName(patient.name)}</h3>
                <span className="patient-id">ID: {patient.id}</span>
              </div>
              <div className="patient-details">
                <div className="detail-row">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{getGenderDisplay(patient.gender)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date of Birth:</span>
                  <span className="detail-value">{formatDate(patient.birthDate)}</span>
                </div>
                {patient.telecom && patient.telecom.length > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Contact:</span>
                    <span className="detail-value">
                      {patient.telecom
                        .map(t => `${t.system}: ${t.value}`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {patient.address && patient.address.length > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">
                      {[
                        patient.address[0].line?.join(', '),
                        patient.address[0].city,
                        patient.address[0].state,
                        patient.address[0].postalCode
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <PatientConditions patientId={patient.id} />
              <PatientProcedures patientId={patient.id} />
              <PatientMedications patientId={patient.id} />
              <PatientDiagnosticReports patientId={patient.id} />
              <PatientObservations patientId={patient.id} />
              <PatientConsultations patientId={patient.id} />
              <div className="patient-card-actions">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="add-lab-button"
                >
                  Add Lab Values
                </button>
                <button
                  onClick={() => setSelectedPatientForConsultation(patient)}
                  className="add-consultation-button"
                >
                  Add Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPatient && (
        <LabValueForm
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSuccess={() => {
            // Optionally refresh patient list or show success message
            setSelectedPatient(null)
          }}
        />
      )}

      {selectedPatientForConsultation && (
        <ConsultationForm
          patient={selectedPatientForConsultation}
          onClose={() => setSelectedPatientForConsultation(null)}
          onSuccess={() => {
            setSelectedPatientForConsultation(null)
          }}
        />
      )}
    </div>
  )
}

export default PatientList

