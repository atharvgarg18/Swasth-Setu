/**
 * Specialist-to-Resource Mapping
 *
 * Maps specialist types to their commonly required diagnostic tests
 * and medications. Used by the pre-referral validation system to
 * auto-suggest required resources when a doctor selects a specialist type.
 *
 * This mapping is consumed by:
 * - The web app (doctor consultation room referral tab)
 * - The Flutter app (via the /api/referrals/validate endpoint response)
 */

export interface SpecialistResources {
  diagnostics: string[];
  medications: string[];
}

export const SPECIALIST_RESOURCES: Record<string, SpecialistResources> = {
  'Cardiologist': {
    diagnostics: ['ECG', 'Echocardiography', 'Blood Pressure', 'Complete Blood Count'],
    medications: ['Amlodipine', 'Enalapril', 'Labetalol'],
  },
  'Gynecologist / Obstetrician': {
    diagnostics: ['Ultrasound', 'Pregnancy Test', 'Complete Blood Count', 'Hemoglobin'],
    medications: ['Oxytocin', 'Misoprostol', 'Iron Folic Acid', 'Calcium'],
  },
  'Orthopedic Surgeon': {
    diagnostics: ['X-Ray', 'CT Scan', 'MRI', 'Complete Blood Count'],
    medications: ['Paracetamol', 'Diclofenac'],
  },
  'Pediatrician': {
    diagnostics: ['Complete Blood Count', 'Blood Glucose', 'Malaria RDT'],
    medications: ['Paracetamol', 'ORS', 'Amoxicillin'],
  },
  'Neurologist': {
    diagnostics: ['CT Scan', 'MRI', 'ECG'],
    medications: ['Paracetamol', 'Diclofenac'],
  },
  'Dermatologist': {
    diagnostics: [],
    medications: ['Betamethasone Cream'],
  },
  'ENT Specialist': {
    diagnostics: ['X-Ray'],
    medications: ['Amoxicillin', 'Ciprofloxacin'],
  },
  'Ophthalmologist': {
    diagnostics: [],
    medications: [],
  },
  'Psychiatrist / Psychologist': {
    diagnostics: [],
    medications: [],
  },
  'General Surgeon': {
    diagnostics: ['Ultrasound', 'Complete Blood Count', 'X-Ray'],
    medications: ['Metronidazole', 'Ciprofloxacin', 'Paracetamol'],
  },
  'Oncologist': {
    diagnostics: ['CT Scan', 'MRI', 'Advanced Pathology Panel', 'Complete Blood Count'],
    medications: [],
  },
  'Endocrinologist': {
    diagnostics: ['Blood Glucose', 'Complete Blood Count', 'Hemoglobin'],
    medications: ['Insulin', 'Metformin'],
  },
  'Pulmonologist': {
    diagnostics: ['X-Ray', 'CT Scan', 'Blood Pressure'],
    medications: ['Salbutamol'],
  },
  'Nephrologist': {
    diagnostics: ['Complete Blood Count', 'Urine Protein', 'Blood Glucose'],
    medications: ['Enalapril', 'Calcium'],
  },
  'Gastroenterologist': {
    diagnostics: ['Ultrasound', 'Complete Blood Count'],
    medications: ['Ranitidine', 'Metronidazole'],
  },
  'Rheumatologist': {
    diagnostics: ['X-Ray', 'Complete Blood Count'],
    medications: ['Paracetamol', 'Diclofenac'],
  },
};

/** Minimum facility tier for specialist referrals — sub-centres can't handle specialists */
export const MIN_FACILITY_TIER_FOR_SPECIALIST: string[] = [
  'phc', 'chc', 'rural_hospital', 'district_hospital',
];

/** Facility type labels */
export const FACILITY_TYPE_LABELS: Record<string, string> = {
  sub_centre: 'Sub Centre',
  phc: 'Primary Health Centre',
  chc: 'Community Health Centre',
  rural_hospital: 'Rural Hospital',
  district_hospital: 'District Hospital',
};

/** Facility type short labels */
export const FACILITY_TYPE_SHORT: Record<string, string> = {
  sub_centre: 'SC',
  phc: 'PHC',
  chc: 'CHC',
  rural_hospital: 'RH',
  district_hospital: 'DH',
};
