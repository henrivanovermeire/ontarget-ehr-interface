# ontarget-ehr-interface
This repository acts as a demo editor to the hapi.fhir FHIR resource server.

## Overview
A React-based interface for viewing patients from the HAPI FHIR R4 sandbox for Demo General Hospital (Organization ID: 53655767).

## Features
- Fetches and displays all patients associated with the specified organization
- Modern, responsive UI with patient cards
- Displays patient information including name, gender, date of birth, contact, and address
- **View Observations** - Display existing lab values and observations for each patient
- **View Consultation Reports** - Display existing consultation reports (Composition resources) for each patient
- **Add lab values** - Insert GFR (Glomerular Filtration Rate) and Hemoglobin observations for patients
- **Add Consultation Reports** - Create cardiology consultation reports with structured sections
- Loading states and error handling
- Modal form interfaces for data entry

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
ontarget-ehr-interface/
├── src/
│   ├── components/
│   │   ├── PatientList.jsx           # Main component for fetching and displaying patients
│   │   ├── PatientList.css           # Styles for patient list
│   │   ├── PatientObservations.jsx   # Component to display existing observations
│   │   ├── PatientObservations.css   # Styles for observations display
│   │   ├── PatientConsultations.jsx  # Component to display existing consultation reports
│   │   ├── PatientConsultations.css   # Styles for consultation reports display
│   │   ├── LabValueForm.jsx          # Form component for adding lab values
│   │   ├── LabValueForm.css          # Styles for lab value form modal
│   │   ├── ConsultationForm.jsx     # Form component for consultation reports
│   │   └── ConsultationForm.css     # Styles for consultation form modal
│   ├── App.jsx                       # Main app component
│   ├── App.css                       # App styles
│   ├── main.jsx                      # React entry point
│   └── index.css                     # Global styles
├── index.html                        # HTML template
├── package.json                      # Dependencies and scripts
└── vite.config.js                    # Vite configuration
```

## FHIR Integration

The application interacts with the HAPI FHIR R4 sandbox at `https://hapi.fhir.org/baseR4`:

### Patient Queries
- Organization ID: `53655767`
- Query: `Patient?organization=Organization/53655767`

### Lab Value Observations
The application creates FHIR Observation resources for:
- **GFR (Glomerular Filtration Rate)**
  - LOINC Code: `33914-3`
  - Unit: `mL/min/1.73m²`
  - System: `http://unitsofmeasure.org`

- **Hemoglobin**
  - LOINC Code: `718-7`
  - Unit: `g/dL`
  - System: `http://unitsofmeasure.org`

Observations are created with:
- Status: `final`
- Category: `laboratory`
- Subject reference to the selected patient
- Performer reference to the organization
- Effective date/time from the form

### Consultation Reports
**Resource Type Used: `Composition`**

The application uses FHIR **Composition** resources to represent consultation reports. Compositions are the standard FHIR resource type for clinical documents and structured reports.

The application creates FHIR Composition resources for cardiology consultations with the following sections:
- **Chief Complaint** (LOINC: `10154-3`)
- **History of Present Illness** (LOINC: `10164-2`)
- **Physical Examination** (LOINC: `29545-1`)
- **Assessment** (LOINC: `51848-0`)
- **Plan** (LOINC: `18776-5`)
- **Additional Notes** (LOINC: `11506-3`)

Compositions are created with:
- Status: `final`
- Type: Progress note (LOINC: `11506-3`)
- Category: Patient consultation (SNOMED: `308335008`)
- Subject reference to the selected patient
- Author reference to the organization
- Date from the form

## Usage

1. **View Patients**: The application automatically loads and displays all patients for Demo General Hospital.

2. **View Observations**:
   - Click the "View Observations" button on any patient card
   - See all existing lab values and observations for that patient
   - Observations are grouped by type (Lab Values, Other Observations)
   - Each observation shows the code, value, and date

3. **View Consultation Reports**:
   - Click the "View Consultation Reports" button on any patient card
   - See all existing consultation reports (Composition resources) for that patient
   - Click the expand button (▶) on any report to view detailed sections
   - Each report shows the type, date, and all sections (Chief Complaint, Assessment, Plan, etc.)

4. **Add Lab Values**:
   - Click the "Add Lab Values" button on any patient card
   - Enter the observation date (required)
   - Enter GFR value (optional, in mL/min/1.73m²)
   - Enter Hemoglobin value (optional, in g/dL)
   - At least one lab value must be provided
   - Click "Submit Lab Values" to create the FHIR Observation resources

5. **Add Consultation Report**:
   - Click the "Add Consultation" button on any patient card
   - Enter the consultation date (required)
   - Fill in any of the following sections:
     - Chief Complaint
     - History of Present Illness
     - Physical Examination
     - Assessment
     - Plan
     - Additional Notes
   - At least one section must be provided (Chief Complaint, Assessment, or Plan)
   - Click "Submit Consultation Report" to create the FHIR Composition resource

## Data Population Script

A script is provided to populate the FHIR server with sample patient data:

### Insert John Doe Medical History

The script `scripts/insert-john-doe-history.js` creates a complete medical history for a patient named John Doe, including:

- **Patient Resource**: John Doe, male, born 1955
- **Conditions**:
  - Carotid artery stenosis (diagnosed 8 years ago)
  - Coronary artery disease (diagnosed 5 years ago)
  - Uncontrolled hypertension (diagnosed 6 years ago)
- **Procedure**: LAD stent insertion (4 years ago)
- **Observations**: 12 blood pressure readings over 6 years (typically 200/110 mmHg)
- **Consultation Reports**: 9 cardiology consultation reports spanning 6 years

To run the script:

```bash
npm run insert-john-doe
```

**Note**: This script requires Node.js 18+ (for native fetch support) or you can install `node-fetch` for older versions.

The script will:
1. Create the patient resource
2. Create all condition resources
3. Create the procedure resource
4. Create multiple blood pressure observations
5. Create consultation reports with detailed medical notes

All resources are linked to the patient and associated with Demo General Hospital (Organization ID: 53655767). 
