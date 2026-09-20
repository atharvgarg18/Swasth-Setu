/**
 * Swasthya Setu — Rule-Based Triage Engine
 *
 * IMPORTANT: This engine does NOT diagnose.
 * It routes patients to the appropriate level of care
 * based on configurable clinical rules.
 *
 * The philosophy: "The app doesn't diagnose — it routes."
 */

import type { TriageSeverity, TriageRouting } from '@/lib/constants';

/** Symptom categories used in the triage flow */
export interface TriageSymptom {
  id: string;
  name: { en: string; mr: string };
  category: string;
  /** Higher weight = more severe concern */
  weight: number;
  /** Tags for rule matching */
  tags: string[];
}

/** Risk factors that influence routing */
export interface RiskFactors {
  age: number;
  gender: 'male' | 'female' | 'other';
  isPregnant: boolean;
  weekOfPregnancy?: number;
  hasHypertension: boolean;
  hasDiabetes: boolean;
  hasHeartCondition: boolean;
  hasAsthma: boolean;
  isChild: boolean; // age < 5
  isElderly: boolean; // age > 65
  chronicConditions: string[];
  allergies: string[];
}

/** Input to the triage engine */
export interface TriageInput {
  symptoms: TriageSymptom[];
  riskFactors: RiskFactors;
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    spo2?: number;
    bloodSugar?: number;
    respiratoryRate?: number;
  };
  durationDays: number;
  additionalNotes?: string;
}

/** Output from the triage engine */
export interface TriageResult {
  severity: TriageSeverity;
  routing: TriageRouting;
  reason: string;
  reasonMr: string;
  rulesApplied: TriageRule[];
  confidence: 'high' | 'medium' | 'low';
  /** Whether the patient should be seen urgently regardless of routing */
  isUrgent: boolean;
}

/** A single rule that was evaluated */
export interface TriageRule {
  id: string;
  name: string;
  matched: boolean;
  contribution: 'escalate' | 'neutral' | 'de-escalate';
  reason: string;
}

// ============================================================
// SYMPTOM CATALOG
// ============================================================

export const SYMPTOM_CATALOG: TriageSymptom[] = [
  // General
  { id: 'fever', name: { en: 'Fever', mr: 'ताप' }, category: 'general', weight: 2, tags: ['infection', 'general'] },
  { id: 'headache', name: { en: 'Headache', mr: 'डोकेदुखी' }, category: 'general', weight: 2, tags: ['neurological', 'general'] },
  { id: 'fatigue', name: { en: 'Fatigue / Weakness', mr: 'थकवा / अशक्तपणा' }, category: 'general', weight: 1, tags: ['general'] },
  { id: 'body_pain', name: { en: 'Body Pain', mr: 'अंगदुखी' }, category: 'general', weight: 1, tags: ['general', 'musculoskeletal'] },
  { id: 'nausea', name: { en: 'Nausea / Vomiting', mr: 'मळमळ / उलटी' }, category: 'general', weight: 2, tags: ['gi', 'general'] },
  { id: 'diarrhea', name: { en: 'Diarrhea', mr: 'जुलाब' }, category: 'gi', weight: 2, tags: ['gi', 'dehydration'] },

  // Respiratory
  { id: 'cough', name: { en: 'Cough', mr: 'खोकला' }, category: 'respiratory', weight: 1, tags: ['respiratory'] },
  { id: 'breathing_difficulty', name: { en: 'Difficulty Breathing', mr: 'श्वास घेण्यास त्रास' }, category: 'respiratory', weight: 4, tags: ['respiratory', 'emergency'] },
  { id: 'chest_pain', name: { en: 'Chest Pain', mr: 'छातीत दुखणे' }, category: 'cardiac', weight: 5, tags: ['cardiac', 'emergency'] },
  { id: 'wheezing', name: { en: 'Wheezing', mr: 'घरघर' }, category: 'respiratory', weight: 3, tags: ['respiratory', 'asthma'] },

  // Cardiovascular
  { id: 'palpitations', name: { en: 'Palpitations', mr: 'धडधडणे' }, category: 'cardiac', weight: 3, tags: ['cardiac'] },
  { id: 'dizziness', name: { en: 'Dizziness / Fainting', mr: 'चक्कर येणे / बेशुद्ध होणे' }, category: 'neurological', weight: 3, tags: ['neurological', 'cardiac'] },

  // Pregnancy-related
  { id: 'swelling', name: { en: 'Swelling (hands/feet/face)', mr: 'सूज (हात/पाय/चेहरा)' }, category: 'pregnancy', weight: 3, tags: ['pregnancy', 'preeclampsia'] },
  { id: 'blurred_vision', name: { en: 'Blurred Vision', mr: 'धूसर दृष्टी' }, category: 'neurological', weight: 3, tags: ['neurological', 'preeclampsia', 'emergency'] },
  { id: 'vaginal_bleeding', name: { en: 'Vaginal Bleeding', mr: 'योनीतून रक्तस्त्राव' }, category: 'pregnancy', weight: 5, tags: ['pregnancy', 'emergency'] },
  { id: 'severe_abdominal_pain', name: { en: 'Severe Abdominal Pain', mr: 'तीव्र पोटदुखी' }, category: 'gi', weight: 4, tags: ['gi', 'pregnancy', 'emergency'] },
  { id: 'reduced_fetal_movement', name: { en: 'Reduced Baby Movement', mr: 'बाळाची हालचाल कमी' }, category: 'pregnancy', weight: 4, tags: ['pregnancy', 'emergency'] },

  // Pediatric
  { id: 'rash', name: { en: 'Skin Rash', mr: 'त्वचेवर पुरळ' }, category: 'dermatological', weight: 1, tags: ['dermatological', 'infection'] },
  { id: 'not_eating', name: { en: 'Not Eating / Poor Appetite', mr: 'खात नाही / भूक कमी' }, category: 'general', weight: 2, tags: ['pediatric', 'general'] },
  { id: 'convulsions', name: { en: 'Convulsions / Seizures', mr: 'आकडी / झटके' }, category: 'neurological', weight: 5, tags: ['neurological', 'emergency'] },

  // Urinary
  { id: 'painful_urination', name: { en: 'Painful Urination', mr: 'लघवीला त्रास' }, category: 'urinary', weight: 2, tags: ['urinary', 'infection'] },
  { id: 'blood_in_urine', name: { en: 'Blood in Urine', mr: 'लघवीत रक्त' }, category: 'urinary', weight: 3, tags: ['urinary'] },

  // Other
  { id: 'wound', name: { en: 'Wound / Injury', mr: 'जखम / दुखापत' }, category: 'trauma', weight: 2, tags: ['trauma'] },
  { id: 'unconscious', name: { en: 'Unconsciousness', mr: 'बेशुद्ध' }, category: 'neurological', weight: 5, tags: ['neurological', 'emergency'] },
  { id: 'high_fever', name: { en: 'High Fever (>103°F / 39.4°C)', mr: 'तीव्र ताप (>१०३°F)' }, category: 'general', weight: 4, tags: ['infection', 'emergency'] },
  { id: 'snake_bite', name: { en: 'Snake Bite / Animal Bite', mr: 'साप चावणे / प्राणी चावणे' }, category: 'trauma', weight: 5, tags: ['trauma', 'emergency'] },
];

// ============================================================
// TRIAGE RULES ENGINE
// ============================================================

/**
 * Evaluate triage rules and return a severity + routing recommendation.
 * Rules are evaluated conservatively — we ESCALATE on uncertainty, never downgrade.
 */
export function evaluateTriage(input: TriageInput): TriageResult {
  const rules: TriageRule[] = [];
  let severityScore = 0;

  // ---- EMERGENCY RULES (immediate escalation) ----

  // Rule 1: Emergency symptoms
  const emergencySymptoms = input.symptoms.filter((s) =>
    s.tags.includes('emergency')
  );
  const rule1: TriageRule = {
    id: 'EMRG_SYMPTOMS',
    name: 'Emergency symptoms detected',
    matched: emergencySymptoms.length > 0,
    contribution: emergencySymptoms.length > 0 ? 'escalate' : 'neutral',
    reason: emergencySymptoms.length > 0
      ? `Emergency symptoms: ${emergencySymptoms.map((s) => s.name.en).join(', ')}`
      : 'No emergency symptoms',
  };
  rules.push(rule1);
  if (rule1.matched) severityScore += 10;

  // Rule 2: Pregnancy + concerning symptoms (pre-eclampsia risk)
  const pregnancyRisk =
    input.riskFactors.isPregnant &&
    input.symptoms.some((s) => s.tags.includes('preeclampsia'));
  const rule2: TriageRule = {
    id: 'PREG_PREECLAMPSIA',
    name: 'Pregnancy with pre-eclampsia risk indicators',
    matched: pregnancyRisk,
    contribution: pregnancyRisk ? 'escalate' : 'neutral',
    reason: pregnancyRisk
      ? 'Pregnant patient with symptoms suggesting possible pre-eclampsia (headache, swelling, blurred vision). Requires immediate medical evaluation.'
      : 'Not applicable',
  };
  rules.push(rule2);
  if (rule2.matched) severityScore += 10;

  // Rule 3: Dangerous vital signs
  const vitals = input.vitalSigns;
  const dangerousVitals =
    vitals &&
    ((vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 160) ||
      (vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic >= 110) ||
      (vitals.spo2 && vitals.spo2 < 92) ||
      (vitals.heartRate && (vitals.heartRate > 130 || vitals.heartRate < 40)) ||
      (vitals.temperature && vitals.temperature >= 40) ||
      (vitals.bloodSugar && (vitals.bloodSugar > 400 || vitals.bloodSugar < 50)));
  const rule3: TriageRule = {
    id: 'VITAL_DANGER',
    name: 'Dangerous vital signs',
    matched: !!dangerousVitals,
    contribution: dangerousVitals ? 'escalate' : 'neutral',
    reason: dangerousVitals
      ? 'Vital signs outside safe range — immediate medical attention required'
      : 'Vitals within acceptable range or not recorded',
  };
  rules.push(rule3);
  if (rule3.matched) severityScore += 10;

  // Rule 4: Child < 5 with danger signs
  const childDanger =
    input.riskFactors.isChild &&
    (input.symptoms.some((s) => ['convulsions', 'unconscious', 'breathing_difficulty'].includes(s.id)) ||
      (vitals?.temperature && vitals.temperature >= 39));
  const rule4: TriageRule = {
    id: 'CHILD_DANGER',
    name: 'Child under 5 with danger signs',
    matched: !!childDanger,
    contribution: childDanger ? 'escalate' : 'neutral',
    reason: childDanger
      ? 'Young child with potentially life-threatening symptoms — immediate referral required'
      : 'Not applicable',
  };
  rules.push(rule4);
  if (rule4.matched) severityScore += 10;

  // ---- MODERATE RULES (teleconsult / doctor review) ----

  // Rule 5: Multiple symptoms with moderate weight
  const totalWeight = input.symptoms.reduce((sum, s) => sum + s.weight, 0);
  const rule5: TriageRule = {
    id: 'SYMPTOM_WEIGHT',
    name: 'Combined symptom severity assessment',
    matched: totalWeight >= 6,
    contribution: totalWeight >= 6 ? 'escalate' : 'neutral',
    reason: `Combined symptom weight: ${totalWeight} (threshold: 6)`,
  };
  rules.push(rule5);
  if (totalWeight >= 6 && severityScore < 10) severityScore += 5;

  // Rule 6: Duration > 3 days
  const prolonged = input.durationDays > 3;
  const rule6: TriageRule = {
    id: 'PROLONGED_DURATION',
    name: 'Prolonged symptom duration',
    matched: prolonged,
    contribution: prolonged ? 'escalate' : 'neutral',
    reason: prolonged
      ? `Symptoms persisting for ${input.durationDays} days (>3 days suggests need for evaluation)`
      : 'Duration within self-limiting range',
  };
  rules.push(rule6);
  if (prolonged && severityScore < 10) severityScore += 2;

  // Rule 7: Chronic condition complication
  const chronicRisk =
    input.riskFactors.chronicConditions.length > 0 &&
    input.symptoms.length >= 2;
  const rule7: TriageRule = {
    id: 'CHRONIC_COMPLICATION',
    name: 'Existing chronic condition with new symptoms',
    matched: chronicRisk,
    contribution: chronicRisk ? 'escalate' : 'neutral',
    reason: chronicRisk
      ? `Patient has chronic conditions (${input.riskFactors.chronicConditions.join(', ')}) with new symptoms — doctor review recommended`
      : 'No chronic condition complications',
  };
  rules.push(rule7);
  if (chronicRisk && severityScore < 10) severityScore += 3;

  // Rule 8: Elderly with multiple symptoms
  const elderlyRisk = input.riskFactors.isElderly && input.symptoms.length >= 2;
  const rule8: TriageRule = {
    id: 'ELDERLY_RISK',
    name: 'Elderly patient with multiple symptoms',
    matched: elderlyRisk,
    contribution: elderlyRisk ? 'escalate' : 'neutral',
    reason: elderlyRisk
      ? 'Elderly patient with multiple symptoms requires medical evaluation'
      : 'Not applicable',
  };
  rules.push(rule8);
  if (elderlyRisk && severityScore < 10) severityScore += 3;

  // Rule 9: Abnormal but not dangerous vitals
  const abnormalVitals =
    vitals &&
    !dangerousVitals &&
    ((vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140) ||
      (vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic >= 90) ||
      (vitals.spo2 && vitals.spo2 < 95) ||
      (vitals.temperature && vitals.temperature >= 38.5) ||
      (vitals.bloodSugar && (vitals.bloodSugar > 250 || vitals.bloodSugar < 70)));
  const rule9: TriageRule = {
    id: 'VITAL_ABNORMAL',
    name: 'Abnormal vital signs (non-critical)',
    matched: !!abnormalVitals,
    contribution: abnormalVitals ? 'escalate' : 'neutral',
    reason: abnormalVitals
      ? 'Vital signs abnormal — doctor consultation recommended'
      : 'Not applicable',
  };
  rules.push(rule9);
  if (abnormalVitals && severityScore < 10) severityScore += 3;

  // ---- DETERMINE SEVERITY & ROUTING ----

  let severity: TriageSeverity;
  let routing: TriageRouting;
  let reason: string;
  let reasonMr: string;

  if (severityScore >= 10) {
    severity = 'emergency';
    routing = 'emergency';
    reason = 'Immediate medical attention required. Please proceed to the nearest hospital or call emergency services.';
    reasonMr = 'तात्काळ वैद्यकीय मदत आवश्यक. कृपया जवळच्या रुग्णालयात जा किंवा आपत्कालीन सेवांना कॉल करा.';
  } else if (severityScore >= 5) {
    severity = 'moderate';
    routing = 'teleconsult';
    reason = 'Medical review recommended. A teleconsultation with a doctor will help evaluate your condition.';
    reasonMr = 'वैद्यकीय तपासणी आवश्यक. डॉक्टरांसोबत टेलिकन्सल्टेशन तुमच्या स्थितीचे मूल्यांकन करण्यास मदत करेल.';
  } else if (severityScore >= 3) {
    severity = 'moderate';
    routing = 'phc_visit';
    reason = 'Visit your nearest Primary Health Centre for evaluation. Your symptoms suggest medical review is advisable.';
    reasonMr = 'मूल्यांकनासाठी जवळच्या प्राथमिक आरोग्य केंद्राला भेट द्या. तुमच्या लक्षणांवरून वैद्यकीय तपासणी योग्य वाटते.';
  } else {
    severity = 'mild';
    routing = 'self_care';
    reason = 'Your symptoms suggest self-care may be sufficient. Rest, stay hydrated, and visit a health centre if symptoms persist or worsen.';
    reasonMr = 'तुमच्या लक्षणांवरून स्वत:ची काळजी पुरेशी वाटते. विश्रांती घ्या, पाणी प्या, आणि लक्षणे कायम राहिल्यास किंवा वाढल्यास आरोग्य केंद्राला भेट द्या.';
  }

  return {
    severity,
    routing,
    reason,
    reasonMr,
    rulesApplied: rules,
    confidence: severityScore >= 10 ? 'high' : severityScore >= 5 ? 'medium' : 'low',
    isUrgent: severityScore >= 8,
  };
}

/**
 * Get symptoms filtered by category
 */
export function getSymptomsByCategory(category?: string): TriageSymptom[] {
  if (!category) return SYMPTOM_CATALOG;
  return SYMPTOM_CATALOG.filter((s) => s.category === category);
}

/**
 * Get all unique symptom categories
 */
export function getSymptomCategories(): { id: string; name: { en: string; mr: string } }[] {
  return [
    { id: 'general', name: { en: 'General', mr: 'सामान्य' } },
    { id: 'respiratory', name: { en: 'Respiratory', mr: 'श्वसन' } },
    { id: 'cardiac', name: { en: 'Heart / Chest', mr: 'हृदय / छाती' } },
    { id: 'gi', name: { en: 'Stomach / Digestive', mr: 'पोट / पचन' } },
    { id: 'neurological', name: { en: 'Head / Neurological', mr: 'डोके / मज्जासंस्था' } },
    { id: 'pregnancy', name: { en: 'Pregnancy Related', mr: 'गर्भधारणा संबंधित' } },
    { id: 'urinary', name: { en: 'Urinary', mr: 'मूत्र' } },
    { id: 'dermatological', name: { en: 'Skin', mr: 'त्वचा' } },
    { id: 'trauma', name: { en: 'Injury / Trauma', mr: 'दुखापत / आघात' } },
  ];
}
