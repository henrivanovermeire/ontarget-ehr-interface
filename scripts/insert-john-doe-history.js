#!/usr/bin/env node

/**
 * Script to insert complete medical history for John Doe
 * 
 * Medical History:
 * - Carotid artery stenosis (diagnosed long ago)
 * - Coronary artery disease with LAD stent insertion
 * - Uncontrolled hypertension (200/110 mmHg typical readings)
 * - Multiple visits over several years
 */

const FHIR_BASE_URL = 'https://hapi.fhir.org/baseR4'
const ORGANIZATION_ID = '53655767'

// Helper function to make FHIR API calls
async function createResource(resourceType, resource) {
  try {
    const response = await fetch(`${FHIR_BASE_URL}/${resourceType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      },
      body: JSON.stringify(resource)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Failed to create ${resourceType}: ${response.status} ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✓ Created ${resourceType} with id: ${result.id}`)
    return result
  } catch (error) {
    console.error(`✗ Error creating ${resourceType}:`, error.message)
    throw error
  }
}

// Helper function to delete a resource (with cascade option)
async function deleteResource(resourceType, resourceId, cascade = false) {
  try {
    const url = cascade 
      ? `${FHIR_BASE_URL}/${resourceType}/${resourceId}?_cascade=delete`
      : `${FHIR_BASE_URL}/${resourceType}/${resourceId}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/fhir+json'
      }
    })

    if (!response.ok && response.status !== 404) {
      // If cascade delete fails, try without cascade
      if (cascade) {
        return await deleteResource(resourceType, resourceId, false)
      }
      const errorData = await response.json().catch(() => ({}))
      // Log but don't throw - continue with other deletions
      console.log(`⚠ Warning deleting ${resourceType}/${resourceId}: ${response.status}`)
      return false
    }

    return true
  } catch (error) {
    console.log(`⚠ Warning deleting ${resourceType}/${resourceId}: ${error.message}`)
    return false
  }
}

// Helper function to fetch and delete all resources of a type for a patient
async function deletePatientResources(resourceType, patientId, cascade = false) {
  try {
    const response = await fetch(
      `${FHIR_BASE_URL}/${resourceType}?subject=Patient/${patientId}&_count=1000`
    )
    
    if (!response.ok) {
      return 0
    }

    const data = await response.json()
    if (!data.entry || data.entry.length === 0) {
      return 0
    }

    let deleted = 0
    for (const entry of data.entry) {
      if (entry.resource && entry.resource.id) {
        const success = await deleteResource(resourceType, entry.resource.id, cascade)
        if (success) deleted++
        await delay(100) // Small delay to avoid rate limiting
      }
    }
    return deleted
  } catch (error) {
    console.log(`Warning deleting ${resourceType} resources: ${error.message}`)
    return 0
  }
}

// Helper function to delete all patients and their resources
async function deleteAllPatients() {
  try {
    console.log('Deleting all patients and their associated resources...')
    
    // Fetch all patients
    const response = await fetch(
      `${FHIR_BASE_URL}/Patient?organization=Organization/${ORGANIZATION_ID}&_count=1000`
    )
    
    if (!response.ok) {
      console.log('No patients found or error fetching')
      return
    }

    const data = await response.json()
    if (!data.entry || data.entry.length === 0) {
      console.log('No patients to delete')
      return
    }

    const patients = data.entry.map(entry => entry.resource)
    console.log(`Found ${patients.length} patient(s) to delete`)

    // For each patient, delete all associated resources
    // Delete in order: dependencies first, then resources they depend on
    for (const patient of patients) {
      console.log(`Deleting resources for patient ${patient.id}...`)
      
      // Delete resources in order (dependencies first)
      // DiagnosticReport depends on ServiceRequest
      // ServiceRequest, MedicationRequest, Procedure depend on Condition
      // Composition is independent
      // Observation is independent
      const resourceTypes = [
        'DiagnosticReport',    // Delete first (depends on ServiceRequest)
        'ServiceRequest',      // Delete before Condition (may reference it)
        'MedicationRequest',   // Delete before Condition (may reference it)
        'Procedure',           // Delete before Condition (references it in reasonReference)
        'Composition',         // Independent
        'Observation',         // Independent
        'Condition'           // Delete last (referenced by others)
      ]

      for (const resourceType of resourceTypes) {
        // Use cascade delete for resources that might have dependencies
        const useCascade = ['Condition', 'Procedure'].includes(resourceType)
        const deleted = await deletePatientResources(resourceType, patient.id, useCascade)
        if (deleted > 0) {
          console.log(`  Deleted ${deleted} ${resourceType} resource(s)`)
        }
      }

      // Finally delete the patient (with cascade to clean up any remaining references)
      await deleteResource('Patient', patient.id, true)
      console.log(`  Deleted Patient ${patient.id}`)
      await delay(200)
    }

    console.log('✓ All patients and resources deleted\n')
  } catch (error) {
    console.error('Error deleting patients:', error.message)
    throw error
  }
}

// Helper to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Calculate dates for timeline (several years of visits)
function getDateYearsAgo(years) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().split('T')[0]
}

function getDateTimeYearsAgo(years, month = null, day = null) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  if (month !== null) date.setMonth(month)
  if (day !== null) date.setDate(day)
  return date.toISOString()
}

async function insertJohnDoeHistory() {
  console.log('Starting insertion of John Doe medical history...\n')

  try {
    // Step 0: Clean up - Delete all patients and their resources
    await deleteAllPatients()
    await delay(1000)

    // Step 1: Create Patient resource for John Doe
    console.log('1. Creating Patient resource for John Doe...')
    const patient = {
      resourceType: 'Patient',
      identifier: [{
        system: 'http://hospital.example/patient-id',
        value: 'JOHN-DOE-001'
      }],
      name: [{
        family: 'Doe',
        given: ['John']
      }],
      gender: 'male',
      birthDate: '1955-06-15', // Age ~69 years
      address: [{
        line: ['123 Main Street'],
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'USA'
      }],
      telecom: [{
        system: 'phone',
        value: '555-0123',
        use: 'home'
      }],
      managingOrganization: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital'
      }
    }

    const createdPatient = await createResource('Patient', patient)
    const patientId = createdPatient.id
    console.log(`Patient ID: ${patientId}\n`)
    await delay(500)

    // Step 2: Create Condition - Carotid Artery Stenosis (diagnosed 8 years ago)
    console.log('2. Creating Condition: Carotid Artery Stenosis...')
    const carotidStenosis = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed'
        }]
      },
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '64572001',
          display: 'Disease'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '397825006',
          display: 'Carotid artery stenosis'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      onsetDateTime: getDateTimeYearsAgo(8),
      recordedDate: getDateTimeYearsAgo(8)
    }
    const createdCarotidStenosis = await createResource('Condition', carotidStenosis)
    const carotidStenosisId = createdCarotidStenosis.id
    await delay(500)

    // Step 3: Create Condition - Coronary Artery Disease (diagnosed 5 years ago)
    console.log('3. Creating Condition: Coronary Artery Disease...')
    const cad = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed'
        }]
      },
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '64572001',
          display: 'Disease'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '53741008',
          display: 'Coronary artery disease'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      onsetDateTime: getDateTimeYearsAgo(5),
      recordedDate: getDateTimeYearsAgo(5)
    }
    const createdCad = await createResource('Condition', cad)
    const cadConditionId = createdCad.id
    await delay(500)

    // Step 4: Create Condition - Uncontrolled Hypertension (diagnosed 6 years ago)
    console.log('4. Creating Condition: Uncontrolled Hypertension...')
    const hypertension = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed'
        }]
      },
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '64572001',
          display: 'Disease'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '38341003',
          display: 'Hypertensive disorder'
        }]
      },
      severity: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '255604002',
          display: 'Mild'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      onsetDateTime: getDateTimeYearsAgo(6),
      recordedDate: getDateTimeYearsAgo(6)
    }
    const createdHypertension = await createResource('Condition', hypertension)
    const hypertensionId = createdHypertension.id
    await delay(500)

    // Step 5: Create Procedure - LAD Stent Insertion (4 years ago)
    console.log('5. Creating Procedure: LAD Stent Insertion...')
    const stentProcedure = {
      resourceType: 'Procedure',
      status: 'completed',
      category: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '387713003',
          display: 'Surgical procedure'
        }]
      },
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '415070008',
          display: 'Percutaneous coronary intervention'
        }]
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      performedDateTime: getDateTimeYearsAgo(4),
      performer: [{
        actor: {
          reference: `Organization/${ORGANIZATION_ID}`,
          display: 'Demo General Hospital - Cardiology Department'
        }
      }],
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Coronary artery disease'
      }],
      note: [{
        text: 'LAD (Left Anterior Descending) artery stent insertion performed successfully'
      }]
    }
    await createResource('Procedure', stentProcedure)
    await delay(500)

    // Step 6: Create multiple Blood Pressure Observations over the years
    console.log('6. Creating Blood Pressure Observations...')
    const bpReadings = [
      { yearsAgo: 6, systolic: 200, diastolic: 110 },
      { yearsAgo: 5.5, systolic: 195, diastolic: 108 },
      { yearsAgo: 5, systolic: 205, diastolic: 112 },
      { yearsAgo: 4.5, systolic: 198, diastolic: 109 },
      { yearsAgo: 4, systolic: 200, diastolic: 110 },
      { yearsAgo: 3.5, systolic: 202, diastolic: 111 },
      { yearsAgo: 3, systolic: 198, diastolic: 108 },
      { yearsAgo: 2.5, systolic: 200, diastolic: 110 },
      { yearsAgo: 2, systolic: 195, diastolic: 109 },
      { yearsAgo: 1.5, systolic: 200, diastolic: 110 },
      { yearsAgo: 1, systolic: 198, diastolic: 108 },
      { yearsAgo: 0.5, systolic: 200, diastolic: 110 }
    ]

    for (const reading of bpReadings) {
      const bpObservation = {
        resourceType: 'Observation',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood pressure panel with all children optional'
          }]
        },
        subject: {
          reference: `Patient/${patientId}`,
          display: 'John Doe'
        },
        effectiveDateTime: getDateTimeYearsAgo(reading.yearsAgo),
        component: [
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8480-6',
                display: 'Systolic blood pressure'
              }]
            },
            valueQuantity: {
              value: reading.systolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          },
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8462-4',
                display: 'Diastolic blood pressure'
              }]
            },
            valueQuantity: {
              value: reading.diastolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          }
        ],
        performer: [{
          reference: `Organization/${ORGANIZATION_ID}`,
          display: 'Demo General Hospital'
        }]
      }
      await createResource('Observation', bpObservation)
      await delay(300)
    }
    console.log(`Created ${bpReadings.length} blood pressure readings\n`)

    // Step 7: Create Consultation Reports over several years
    console.log('7. Creating Consultation Reports over several years...')
    
    const consultations = [
      {
        yearsAgo: 6,
        chiefComplaint: 'Elevated blood pressure readings, headaches',
        history: 'Patient presents with persistent hypertension. Blood pressure consistently elevated around 200/110 mmHg. Reports occasional headaches and dizziness.',
        physicalExam: 'BP: 200/110 mmHg. Heart rate regular. No significant findings on cardiac auscultation.',
        assessment: 'Uncontrolled hypertension. Risk factors include age and family history.',
        plan: 'Start antihypertensive medication (ACE inhibitor). Lifestyle modifications including low-sodium diet and regular exercise. Follow-up in 3 months.'
      },
      {
        yearsAgo: 5.5,
        chiefComplaint: 'Follow-up for hypertension management',
        history: 'Patient reports some improvement in symptoms but blood pressure remains elevated. Compliance with medication is good.',
        physicalExam: 'BP: 195/108 mmHg. Cardiovascular examination unremarkable.',
        assessment: 'Hypertension still uncontrolled despite medication. Consider medication adjustment.',
        plan: 'Increase ACE inhibitor dosage. Add diuretic if needed. Continue lifestyle modifications. Recheck in 2 months.'
      },
      {
        yearsAgo: 5,
        chiefComplaint: 'Chest pain and shortness of breath',
        history: 'Patient presents with new onset chest pain on exertion and occasional shortness of breath. History of uncontrolled hypertension.',
        physicalExam: 'BP: 205/112 mmHg. Heart rate 88 bpm. S4 gallop present. No murmurs.',
        assessment: 'Suspected coronary artery disease. Hypertension uncontrolled. Need cardiac workup.',
        plan: 'Order ECG, stress test, and cardiac catheterization. Continue antihypertensive medications. Cardiology referral.'
      },
      {
        yearsAgo: 4.5,
        chiefComplaint: 'Post-procedure follow-up after LAD stent',
        history: 'Patient underwent LAD stent insertion 6 months ago. Reports improvement in chest pain. Blood pressure still elevated.',
        physicalExam: 'BP: 198/109 mmHg. Heart rate regular. No signs of heart failure.',
        assessment: 'Post-PCI status. CAD stable. Hypertension still uncontrolled.',
        plan: 'Continue dual antiplatelet therapy. Optimize antihypertensive regimen. Cardiac rehabilitation. Follow-up in 3 months.'
      },
      {
        yearsAgo: 4,
        chiefComplaint: 'Routine follow-up for CAD and hypertension',
        history: 'Patient doing well post-stent. No chest pain. Blood pressure readings remain high.',
        physicalExam: 'BP: 200/110 mmHg. Cardiovascular examination stable.',
        assessment: 'CAD stable post-PCI. Hypertension uncontrolled despite multiple medications.',
        plan: 'Continue current medications. Consider adding beta-blocker. Lifestyle counseling. Follow-up in 4 months.'
      },
      {
        yearsAgo: 3,
        chiefComplaint: 'Annual cardiology follow-up',
        history: 'Patient stable on current medications. No cardiac symptoms. Blood pressure still elevated.',
        physicalExam: 'BP: 198/108 mmHg. Heart sounds normal.',
        assessment: 'CAD stable. Hypertension uncontrolled. Carotid stenosis known, stable.',
        plan: 'Continue current treatment. Monitor carotid stenosis. Annual carotid ultrasound. Follow-up in 6 months.'
      },
      {
        yearsAgo: 2,
        chiefComplaint: 'Routine cardiovascular follow-up',
        history: 'Patient reports feeling well. No new symptoms. Blood pressure readings consistently high.',
        physicalExam: 'BP: 200/110 mmHg. No changes in cardiovascular examination.',
        assessment: 'All conditions stable but hypertension remains uncontrolled.',
        plan: 'Continue medications. Emphasize lifestyle modifications. Consider medication review. Follow-up in 4 months.'
      },
      {
        yearsAgo: 1,
        chiefComplaint: 'Follow-up visit',
        history: 'Patient stable. Blood pressure readings remain elevated around 200/110 mmHg. No cardiac symptoms.',
        physicalExam: 'BP: 198/108 mmHg. Cardiovascular examination unchanged.',
        assessment: 'CAD and carotid stenosis stable. Hypertension uncontrolled.',
        plan: 'Continue current treatment regimen. Monitor for complications. Follow-up in 6 months.'
      },
      {
        yearsAgo: 0.5,
        chiefComplaint: 'Recent blood pressure check',
        history: 'Patient presents for routine follow-up. Blood pressure still elevated. No new concerns.',
        physicalExam: 'BP: 200/110 mmHg. Physical examination unremarkable.',
        assessment: 'Hypertension uncontrolled. CAD and carotid stenosis stable.',
        plan: 'Continue medications. Review medication compliance. Consider referral to hypertension specialist. Follow-up in 3 months.'
      }
    ]

    const createdCompositions = []
    for (const consult of consultations) {
      const composition = {
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
          reference: `Patient/${patientId}`,
          display: 'John Doe'
        },
        date: getDateTimeYearsAgo(consult.yearsAgo),
        author: [{
          reference: `Organization/${ORGANIZATION_ID}`,
          display: 'Demo General Hospital - Cardiology Department'
        }],
        title: 'Cardiology Consultation Report',
        section: [
          {
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
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${consult.chiefComplaint}</div>`
            }
          },
          {
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
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${consult.history}</div>`
            }
          },
          {
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
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${consult.physicalExam}</div>`
            }
          },
          {
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
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${consult.assessment}</div>`
            }
          },
          {
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
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${consult.plan}</div>`
            }
          }
        ]
      }
      const createdComposition = await createResource('Composition', composition)
      createdCompositions.push({ ...consult, compositionId: createdComposition.id })
      await delay(500)
    }
    console.log(`Created ${consultations.length} consultation reports\n`)

    // Step 8: Create Medication Requests based on consultation plans
    console.log('8. Creating Medication Requests...')
    
    // ACE inhibitor - started 6 years ago
    const aceInhibitor = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
          code: 'outpatient',
          display: 'Outpatient'
        }]
      }],
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '314076',
          display: 'ACE inhibitor'
        }],
        text: 'ACE inhibitor'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(6),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${hypertensionId}`,
        display: 'Uncontrolled hypertension'
      }],
      dosageInstruction: [{
        text: 'Take as directed by physician',
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }]
    }
    await createResource('MedicationRequest', aceInhibitor)
    await delay(500)

    // Diuretic - added 5.5 years ago
    const diuretic = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
          code: 'outpatient',
          display: 'Outpatient'
        }]
      }],
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '197806',
          display: 'Diuretic'
        }],
        text: 'Diuretic'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(5.5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${hypertensionId}`,
        display: 'Uncontrolled hypertension'
      }],
      dosageInstruction: [{
        text: 'Take as directed by physician',
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }]
    }
    await createResource('MedicationRequest', diuretic)
    await delay(500)

    // Beta-blocker - added 4 years ago
    const betaBlocker = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
          code: 'outpatient',
          display: 'Outpatient'
        }]
      }],
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '3689',
          display: 'Beta-blocker'
        }],
        text: 'Beta-blocker'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(4),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Coronary artery disease'
      }],
      dosageInstruction: [{
        text: 'Take as directed by physician',
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }]
    }
    await createResource('MedicationRequest', betaBlocker)
    await delay(500)

    // Dual antiplatelet therapy - started after stent (4.5 years ago)
    const aspirin = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
          code: 'outpatient',
          display: 'Outpatient'
        }]
      }],
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '1191',
          display: 'Aspirin'
        }],
        text: 'Aspirin'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(4.5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Coronary artery disease - post-PCI'
      }],
      dosageInstruction: [{
        text: '81 mg daily',
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }]
    }
    await createResource('MedicationRequest', aspirin)
    await delay(500)

    const clopidogrel = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
          code: 'outpatient',
          display: 'Outpatient'
        }]
      }],
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '32968',
          display: 'Clopidogrel'
        }],
        text: 'Clopidogrel'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(4.5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Coronary artery disease - post-PCI'
      }],
      dosageInstruction: [{
        text: '75 mg daily',
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: 'd'
          }
        }
      }]
    }
    await createResource('MedicationRequest', clopidogrel)
    console.log('Created 5 medication requests\n')
    await delay(500)

    // Step 9: Create Service Requests (Orders) for diagnostic tests
    console.log('9. Creating Service Requests for diagnostic tests...')
    
    // ECG ordered 5 years ago
    const ecgOrder = {
      resourceType: 'ServiceRequest',
      status: 'completed',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '103693007',
          display: 'Diagnostic procedure'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '34551-2',
          display: 'ECG 12 lead'
        }],
        text: 'ECG'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Suspected coronary artery disease'
      }]
    }
    const createdEcgOrder = await createResource('ServiceRequest', ecgOrder)
    await delay(500)

    // Stress test ordered 5 years ago
    const stressTestOrder = {
      resourceType: 'ServiceRequest',
      status: 'completed',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '103693007',
          display: 'Diagnostic procedure'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '23288-9',
          display: 'Cardiac stress test'
        }],
        text: 'Stress test'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Suspected coronary artery disease'
      }]
    }
    const createdStressTestOrder = await createResource('ServiceRequest', stressTestOrder)
    await delay(500)

    // Cardiac catheterization ordered 5 years ago
    const cathOrder = {
      resourceType: 'ServiceRequest',
      status: 'completed',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '103693007',
          display: 'Diagnostic procedure'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '17401000',
          display: 'Cardiac catheterization'
        }],
        text: 'Cardiac catheterization'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(5),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${cadConditionId}`,
        display: 'Suspected coronary artery disease'
      }]
    }
    const createdCathOrder = await createResource('ServiceRequest', cathOrder)
    await delay(500)

    // Carotid ultrasound ordered 3 years ago (annual)
    const carotidUsOrder = {
      resourceType: 'ServiceRequest',
      status: 'completed',
      intent: 'order',
      category: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '103693007',
          display: 'Diagnostic procedure'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '43351-2',
          display: 'Carotid artery US'
        }],
        text: 'Carotid ultrasound'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      authoredOn: getDateTimeYearsAgo(3),
      requester: {
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      },
      reasonReference: [{
        reference: `Condition/${carotidStenosisId}`,
        display: 'Carotid artery stenosis'
      }]
    }
    const createdCarotidUsOrder = await createResource('ServiceRequest', carotidUsOrder)
    console.log('Created 4 service requests\n')
    await delay(500)

    // Step 10: Create Diagnostic Reports for completed tests
    console.log('10. Creating Diagnostic Reports for completed tests...')
    
    // ECG Report
    const ecgReport = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'CUS',
          display: 'Cardiac Ultrasound'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '34551-2',
          display: 'ECG 12 lead'
        }],
        text: 'ECG'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      effectiveDateTime: getDateTimeYearsAgo(5, 0, 5), // 5 years ago, 5 days after order
      issued: getDateTimeYearsAgo(5, 0, 5),
      performer: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      }],
      result: [],
      conclusion: 'Sinus rhythm. ST-T wave changes consistent with ischemia. No acute changes.',
      conclusionCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '429622005',
          display: 'ST-T wave changes'
        }]
      }],
      basedOn: [{
        reference: `ServiceRequest/${createdEcgOrder.id}`,
        display: 'ECG order'
      }]
    }
    await createResource('DiagnosticReport', ecgReport)
    await delay(500)

    // Stress Test Report
    const stressTestReport = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'CUS',
          display: 'Cardiac Ultrasound'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '23288-9',
          display: 'Cardiac stress test'
        }],
        text: 'Stress test'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      effectiveDateTime: getDateTimeYearsAgo(5, 0, 10), // 5 years ago, 10 days after order
      issued: getDateTimeYearsAgo(5, 0, 10),
      performer: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      }],
      result: [],
      conclusion: 'Positive stress test with ST depression in leads V4-V6. Indicates significant coronary artery disease. Recommend cardiac catheterization.',
      conclusionCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '429622005',
          display: 'Positive stress test'
        }]
      }],
      basedOn: [{
        reference: `ServiceRequest/${createdStressTestOrder.id}`,
        display: 'Stress test order'
      }]
    }
    await createResource('DiagnosticReport', stressTestReport)
    await delay(500)

    // Cardiac Catheterization Report
    const cathReport = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'CUS',
          display: 'Cardiac Ultrasound'
        }]
      }],
      code: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: '17401000',
          display: 'Cardiac catheterization'
        }],
        text: 'Cardiac catheterization'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      effectiveDateTime: getDateTimeYearsAgo(5, 0, 20), // 5 years ago, 20 days after order
      issued: getDateTimeYearsAgo(5, 0, 20),
      performer: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      }],
      result: [],
      conclusion: 'Significant stenosis (90%) in the left anterior descending (LAD) artery. Other coronary arteries show mild to moderate disease. Recommended PCI with stent placement.',
      conclusionCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '399068003',
          display: 'Coronary artery stenosis'
        }]
      }],
      basedOn: [{
        reference: `ServiceRequest/${createdCathOrder.id}`,
        display: 'Cardiac catheterization order'
      }]
    }
    await createResource('DiagnosticReport', cathReport)
    await delay(500)

    // Carotid Ultrasound Report
    const carotidUsReport = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'US',
          display: 'Ultrasound'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '43351-2',
          display: 'Carotid artery US'
        }],
        text: 'Carotid ultrasound'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'John Doe'
      },
      effectiveDateTime: getDateTimeYearsAgo(3, 0, 7), // 3 years ago, 7 days after order
      issued: getDateTimeYearsAgo(3, 0, 7),
      performer: [{
        reference: `Organization/${ORGANIZATION_ID}`,
        display: 'Demo General Hospital - Cardiology Department'
      }],
      result: [],
      conclusion: 'Carotid artery stenosis stable. Right carotid shows 60% stenosis, left carotid shows 55% stenosis. No significant progression since last study. Continue monitoring.',
      conclusionCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '397825006',
          display: 'Carotid artery stenosis'
        }]
      }],
      basedOn: [{
        reference: `ServiceRequest/${createdCarotidUsOrder.id}`,
        display: 'Carotid ultrasound order'
      }]
    }
    await createResource('DiagnosticReport', carotidUsReport)
    console.log('Created 4 diagnostic reports\n')

    console.log('✓ Successfully inserted complete medical history for John Doe!')
    console.log(`\nPatient ID: ${patientId} (existing patient)`)
    console.log('You can now view this patient in the React interface.')
    console.log(`\nSummary:`)
    console.log(`- 3 Condition resources (Carotid stenosis, CAD, Hypertension)`)
    console.log(`- 1 Procedure resource (LAD stent insertion)`)
    console.log(`- ${bpReadings.length} Blood pressure observations`)
    console.log(`- ${consultations.length} Consultation reports`)
    console.log(`- 5 Medication requests (ACE inhibitor, Diuretic, Beta-blocker, Aspirin, Clopidogrel)`)
    console.log(`- 4 Service requests (ECG, Stress test, Cardiac catheterization, Carotid ultrasound)`)
    console.log(`- 4 Diagnostic reports (ECG, Stress test, Cardiac catheterization, Carotid ultrasound)`)

  } catch (error) {
    console.error('\n✗ Error inserting medical history:', error)
    process.exit(1)
  }
}

// Run the script
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ with native fetch support, or install node-fetch')
  process.exit(1)
}

insertJohnDoeHistory()

