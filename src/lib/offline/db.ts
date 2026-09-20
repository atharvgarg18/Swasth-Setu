import Dexie, { Table } from 'dexie';

export interface BaseRecord {
  id: string;
  _synced?: boolean;
  _lastModified?: string;
  _deleted?: boolean;
}

export interface Patient extends BaseRecord {
  user_id?: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  phone?: string;
  address?: any;
  emergency_contact?: any;
  assigned_worker_id?: string;
  registered_facility_id?: string;
  is_high_risk?: boolean;
  allergies?: string[];
  chronic_conditions?: string[];
  created_at?: string;
  updated_at?: string;
}

export class OfflineDB extends Dexie {
  patients!: Table<Patient>;
  consultations!: Table<any>;
  referrals!: Table<any>;
  follow_ups!: Table<any>;
  facilities!: Table<any>;
  vitals!: Table<any>;
  prescriptions!: Table<any>;
  triage_sessions!: Table<any>;
  notifications!: Table<any>;
  mutations!: Table<{ id: string, table: string, operation: string, data: any, timestamp: number }>;

  constructor() {
    super('SwasthyaSetuOfflineDB');
    this.version(1).stores({
      patients: 'id, _synced, _lastModified, assigned_worker_id',
      consultations: 'id, patient_id, doctor_id, _synced, _lastModified',
      referrals: 'id, patient_id, _synced, _lastModified',
      follow_ups: 'id, patient_id, assigned_worker_id, _synced, _lastModified',
      facilities: 'id, _synced, _lastModified',
      vitals: 'id, patient_id, _synced, _lastModified',
      prescriptions: 'id, consultation_id, patient_id, _synced, _lastModified',
      triage_sessions: 'id, patient_id, _synced, _lastModified',
      notifications: 'id, user_id, _synced, _lastModified',
      mutations: 'id, table, operation, timestamp'
    });
  }
}

export const db = new OfflineDB();
