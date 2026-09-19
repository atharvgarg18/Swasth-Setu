/**
 * Application-wide constants.
 * Change APP_NAME here to rebrand the entire application.
 */

export const APP_NAME = 'Swasth Setu';
export const APP_DESCRIPTION = 'Rural Public Healthcare Continuity Platform';
export const APP_TAGLINE = 'One Patient Record. Continuous Care.';

/** Default locale for the application */
export const DEFAULT_LOCALE = 'en';

/** Supported locales */
export const SUPPORTED_LOCALES = ['en', 'mr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  mr: 'मराठी',
};

/** User roles */
export const USER_ROLES = [
  'patient',
  'asha',
  'anm',
  'doctor',
  'facility_admin',
  'district_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, { en: string; mr: string }> = {
  patient: { en: 'Patient', mr: 'रुग्ण' },
  asha: { en: 'ASHA Worker', mr: 'आशा कार्यकर्ती' },
  anm: { en: 'ANM', mr: 'एएनएम' },
  doctor: { en: 'Doctor', mr: 'डॉक्टर' },
  facility_admin: { en: 'Facility Admin', mr: 'सुविधा प्रशासक' },
  district_admin: { en: 'District Admin', mr: 'जिल्हा प्रशासक' },
};

/** Role-based route prefixes */
export const ROLE_ROUTES: Record<UserRole, string> = {
  patient: '/patient',
  asha: '/asha',
  anm: '/asha', // ANM shares the ASHA interface
  doctor: '/doctor',
  facility_admin: '/admin',
  district_admin: '/admin',
};

/** Referral statuses */
export const REFERRAL_STATUSES = [
  'created',
  'pending',
  'acknowledged',
  'in_transit',
  'arrived',
  'in_treatment',
  'completed',
  'cancelled',
  'rejected',
  'no_show',
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/** Follow-up statuses */
export const FOLLOW_UP_STATUSES = [
  'upcoming',
  'due',
  'completed',
  'overdue',
  'missed',
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

/** Consultation statuses */
export const CONSULTATION_STATUSES = [
  'requested',
  'queued',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

/** Triage severity levels */
export const TRIAGE_SEVERITIES = ['mild', 'moderate', 'emergency'] as const;
export type TriageSeverity = (typeof TRIAGE_SEVERITIES)[number];

/** Triage routing recommendations */
export const TRIAGE_ROUTINGS = [
  'self_care',
  'phc_visit',
  'teleconsult',
  'referral',
  'emergency',
] as const;
export type TriageRouting = (typeof TRIAGE_ROUTINGS)[number];

/** Priority levels */
export const PRIORITY_LEVELS = ['routine', 'urgent', 'emergency'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

/** Facility types */
export const FACILITY_TYPES = [
  'sub_centre',
  'phc',
  'chc',
  'rural_hospital',
  'district_hospital',
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_TYPE_LABELS: Record<FacilityType, { en: string; mr: string }> = {
  sub_centre: { en: 'Sub Centre', mr: 'उप केंद्र' },
  phc: { en: 'Primary Health Centre', mr: 'प्राथमिक आरोग्य केंद्र' },
  chc: { en: 'Community Health Centre', mr: 'सामुदायिक आरोग्य केंद्र' },
  rural_hospital: { en: 'Rural Hospital', mr: 'ग्रामीण रुग्णालय' },
  district_hospital: { en: 'District Hospital', mr: 'जिल्हा रुग्णालय' },
};

/** Emergency severity */
export const EMERGENCY_SEVERITIES = ['critical', 'life_threatening'] as const;
export type EmergencySeverity = (typeof EMERGENCY_SEVERITIES)[number];

/** Demo credentials for easy access */
export const DEMO_CREDENTIALS = {
  patient: { email: 'meera@demo.gramincare.in', password: 'demo123456' },
  asha: { email: 'priya@demo.gramincare.in', password: 'demo123456' },
  doctor: { email: 'rajesh@demo.gramincare.in', password: 'demo123456' },
  'doctor (cardiologist)': { email: 'arjun@demo.gramincare.in', password: 'demo123456' },
  facility_admin: { email: 'sunita@demo.gramincare.in', password: 'demo123456' },
  district_admin: { email: 'amit@demo.gramincare.in', password: 'demo123456' },
} as const;

