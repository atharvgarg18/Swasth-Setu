-- Gramin Care Schema

-- Enums
CREATE TYPE user_role AS ENUM ('patient', 'asha', 'anm', 'doctor', 'facility_admin', 'district_admin');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE facility_type AS ENUM ('sub_centre', 'phc', 'chc', 'rural_hospital', 'district_hospital');
CREATE TYPE visit_type AS ENUM ('home_visit', 'facility_visit', 'follow_up');
CREATE TYPE triage_severity AS ENUM ('mild', 'moderate', 'emergency');
CREATE TYPE triage_routing AS ENUM ('self_care', 'phc_visit', 'teleconsult', 'referral', 'emergency');
CREATE TYPE consultation_type AS ENUM ('teleconsult_video', 'teleconsult_audio', 'teleconsult_chat', 'in_person');
CREATE TYPE consultation_status AS ENUM ('requested', 'queued', 'in_progress', 'completed', 'cancelled');
CREATE TYPE priority_level AS ENUM ('routine', 'urgent', 'emergency');
CREATE TYPE referral_status AS ENUM ('created', 'pending', 'acknowledged', 'in_transit', 'arrived', 'in_treatment', 'completed', 'cancelled', 'rejected', 'no_show');
CREATE TYPE follow_up_status AS ENUM ('upcoming', 'due', 'completed', 'overdue', 'missed');
CREATE TYPE follow_up_category AS ENUM ('maternal', 'child_health', 'chronic', 'post_referral', 'general');
CREATE TYPE emergency_status AS ENUM ('reported', 'escalated', 'facility_notified', 'accepted', 'in_transit', 'arrived', 'treating', 'resolved');
CREATE TYPE emergency_severity AS ENUM ('critical', 'life_threatening');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
CREATE TYPE timeline_event_type AS ENUM ('registration', 'visit', 'vitals', 'triage', 'consultation', 'prescription', 'referral', 'referral_update', 'follow_up', 'follow_up_update', 'emergency', 'emergency_update');

-- Sequence and function for referral numbers
CREATE SEQUENCE IF NOT EXISTS referral_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_referral_number()
RETURNS text AS $$
BEGIN
  RETURN 'REF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('referral_number_seq')::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY, -- references auth.users in actual implementation
  full_name text,
  phone text,
  email text,
  preferred_language text DEFAULT 'en',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. facilities
CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type facility_type NOT NULL,
  district text,
  block text,
  address text,
  latitude decimal,
  longitude decimal,
  phone text,
  services text[],
  bed_capacity int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. user_roles
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  district text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TRIGGER set_user_roles_updated_at
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Role helper functions
CREATE OR REPLACE FUNCTION get_user_roles(uid uuid)
RETURNS user_role[] AS $$
  SELECT COALESCE(array_agg(role), '{}'::user_role[])
  FROM user_roles
  WHERE user_id = uid AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_facility_ids(uid uuid)
RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(facility_id), '{}'::uuid[])
  FROM user_roles
  WHERE user_id = uid AND is_active = true AND facility_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_district(uid uuid)
RETURNS text AS $$
  SELECT district
  FROM user_roles
  WHERE user_id = uid AND is_active = true AND district IS NOT NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_role(uid uuid, r user_role)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = uid AND role = r AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  abha_id text,
  full_name text NOT NULL,
  date_of_birth date,
  gender gender_type,
  blood_group text,
  phone text,
  address jsonb,
  emergency_contact jsonb,
  allergies text[],
  chronic_conditions text[],
  is_high_risk boolean DEFAULT false,
  high_risk_reasons text[],
  registered_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_worker_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  registered_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. visits
CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  visit_type visit_type,
  chief_complaint text,
  notes text,
  visit_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_visits_updated_at
BEFORE UPDATE ON visits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. consultations (defined early due to fk dependencies in vitals, etc)
CREATE TABLE consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  triage_session_id uuid, -- referencing later
  consultation_type consultation_type,
  status consultation_status DEFAULT 'requested',
  priority priority_level DEFAULT 'routine',
  chief_complaint text,
  clinical_notes text,
  assessment text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_consultations_updated_at
BEFORE UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. vitals
CREATE TABLE vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  temperature decimal,
  spo2 int,
  weight decimal,
  blood_sugar decimal,
  respiratory_rate int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_vitals_updated_at
BEFORE UPDATE ON vitals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. triage_sessions
CREATE TABLE triage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  initiated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  symptoms jsonb,
  risk_factors jsonb,
  severity triage_severity,
  routing_recommendation triage_routing,
  routing_reason text,
  rules_applied jsonb,
  was_escalated boolean DEFAULT false,
  escalation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_triage_sessions_updated_at
BEFORE UPDATE ON triage_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE consultations ADD CONSTRAINT fk_consultations_triage FOREIGN KEY (triage_session_id) REFERENCES triage_sessions(id) ON DELETE SET NULL;

-- 9. prescriptions
CREATE TABLE prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  medications jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. referrals
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_number text UNIQUE DEFAULT generate_referral_number(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  source_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  destination_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  referred_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  service text,
  urgency priority_level DEFAULT 'routine',
  reason text,
  clinical_summary text,
  status referral_status DEFAULT 'created',
  expected_arrival timestamptz,
  acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  is_overdue boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. referral_status_history
CREATE TABLE referral_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
  from_status referral_status,
  to_status referral_status NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  changed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_referral_status_history_updated_at
BEFORE UPDATE ON referral_status_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 12. follow_ups
CREATE TABLE follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  assigned_worker_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  referral_id uuid REFERENCES referrals(id) ON DELETE SET NULL,
  reason text,
  category follow_up_category,
  due_date date,
  priority priority_level DEFAULT 'routine',
  status follow_up_status DEFAULT 'upcoming',
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_follow_ups_updated_at
BEFORE UPDATE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. emergency_cases
CREATE TABLE emergency_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  triage_session_id uuid REFERENCES triage_sessions(id) ON DELETE SET NULL,
  description text,
  severity emergency_severity,
  status emergency_status DEFAULT 'reported',
  target_facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_emergency_cases_updated_at
BEFORE UPDATE ON emergency_cases
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. medicine_stock
CREATE TABLE medicine_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  category text,
  quantity int NOT NULL DEFAULT 0,
  unit text,
  status stock_status DEFAULT 'in_stock',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_medicine_stock_updated_at
BEFORE UPDATE ON medicine_stock
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 15. diagnostic_availability
CREATE TABLE diagnostic_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  category text,
  is_available boolean DEFAULT false,
  turnaround_hours int,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_diagnostic_availability_updated_at
BEFORE UPDATE ON diagnostic_availability
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 16. notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 17. audit_events
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 18. patient_timeline
CREATE TABLE patient_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  event_type timeline_event_type NOT NULL,
  event_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 19. offline_sync_queue
CREATE TABLE offline_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL,
  synced boolean DEFAULT false,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_offline_sync_queue_updated_at
BEFORE UPDATE ON offline_sync_queue
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_patients_assigned_worker ON patients(assigned_worker_id);
CREATE INDEX idx_patients_registered_facility ON patients(registered_facility_id);
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_worker ON visits(worker_id);
CREATE INDEX idx_referrals_patient ON referrals(patient_id);
CREATE INDEX idx_referrals_source_facility ON referrals(source_facility_id);
CREATE INDEX idx_referrals_dest_facility ON referrals(destination_facility_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_follow_ups_patient ON follow_ups(patient_id);
CREATE INDEX idx_follow_ups_worker ON follow_ups(assigned_worker_id);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
CREATE INDEX idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_patient_timeline_patient_time ON patient_timeline(patient_id, event_at);
CREATE INDEX idx_medicine_stock_facility_status ON medicine_stock(facility_id, status);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);

-- Timeline trigger function
CREATE OR REPLACE FUNCTION generate_timeline_event()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id uuid;
  v_type timeline_event_type;
  v_title text;
  v_desc text;
  v_created_by uuid;
BEGIN
  IF TG_TABLE_NAME = 'visits' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'visit';
    v_title := 'Visit Logged';
    v_desc := COALESCE(NEW.chief_complaint, 'New visit created');
    v_created_by := NEW.worker_id;
  ELSIF TG_TABLE_NAME = 'vitals' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'vitals';
    v_title := 'Vitals Recorded';
    v_desc := 'Vitals logged during visit/consultation';
    v_created_by := NEW.recorded_by;
  ELSIF TG_TABLE_NAME = 'triage_sessions' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'triage';
    v_title := 'Triage Session Completed';
    v_desc := 'Severity: ' || NEW.severity::text;
    v_created_by := NEW.initiated_by;
  ELSIF TG_TABLE_NAME = 'consultations' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'consultation';
    v_title := 'Consultation Logged';
    v_desc := 'Status: ' || NEW.status::text;
    v_created_by := NEW.doctor_id;
  ELSIF TG_TABLE_NAME = 'prescriptions' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'prescription';
    v_title := 'Prescription Issued';
    v_desc := 'Medication prescribed';
    v_created_by := NEW.prescribed_by;
  ELSIF TG_TABLE_NAME = 'referrals' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'referral';
    v_title := 'Referral Created/Updated';
    v_desc := 'Status: ' || NEW.status::text;
    v_created_by := NEW.referred_by;
  ELSIF TG_TABLE_NAME = 'follow_ups' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'follow_up';
    v_title := 'Follow Up Scheduled/Completed';
    v_desc := 'Status: ' || NEW.status::text;
    v_created_by := NEW.assigned_worker_id;
  ELSIF TG_TABLE_NAME = 'emergency_cases' THEN
    v_patient_id := NEW.patient_id;
    v_type := 'emergency';
    v_title := 'Emergency Case Logged';
    v_desc := 'Status: ' || NEW.status::text;
    v_created_by := NEW.reported_by;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO patient_timeline (patient_id, event_type, event_id, title, description, created_by, event_at)
  VALUES (v_patient_id, v_type, NEW.id, v_title, v_desc, v_created_by, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_timeline_trg AFTER INSERT ON visits FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER vitals_timeline_trg AFTER INSERT ON vitals FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER triage_timeline_trg AFTER INSERT ON triage_sessions FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER consultation_timeline_trg AFTER INSERT ON consultations FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER prescription_timeline_trg AFTER INSERT ON prescriptions FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER referral_timeline_trg AFTER INSERT ON referrals FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER follow_ups_timeline_trg AFTER INSERT ON follow_ups FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();
CREATE TRIGGER emergency_cases_timeline_trg AFTER INSERT ON emergency_cases FOR EACH ROW EXECUTE FUNCTION generate_timeline_event();


-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- patients
CREATE POLICY "Patients can read own record" ON patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workers can read assigned patients" ON patients FOR SELECT USING (auth.uid() = assigned_worker_id OR has_role(auth.uid(), 'asha') OR has_role(auth.uid(), 'anm'));
CREATE POLICY "Doctors can read their consultation patients" ON patients FOR SELECT USING (
  EXISTS (SELECT 1 FROM consultations WHERE consultations.patient_id = patients.id AND consultations.doctor_id = auth.uid())
);
CREATE POLICY "Facility admins can read referred patients" ON patients FOR SELECT USING (
  EXISTS (SELECT 1 FROM referrals WHERE referrals.patient_id = patients.id AND (referrals.source_facility_id = ANY(get_user_facility_ids(auth.uid())) OR referrals.destination_facility_id = ANY(get_user_facility_ids(auth.uid()))))
);
CREATE POLICY "District admins can read district patients" ON patients FOR SELECT USING (
  (patients.address->>'district') = get_user_district(auth.uid())
);
CREATE POLICY "Workers can insert patients" ON patients FOR INSERT WITH CHECK (has_role(auth.uid(), 'asha') OR has_role(auth.uid(), 'anm'));
CREATE POLICY "Workers can update assigned patients" ON patients FOR UPDATE USING (assigned_worker_id = auth.uid());

-- referrals
CREATE POLICY "Patients can view own referrals" ON referrals FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
CREATE POLICY "Workers can view assigned patient referrals" ON referrals FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE assigned_worker_id = auth.uid())
);
CREATE POLICY "Doctors can view/create own referrals" ON referrals FOR ALL USING (
  consultation_id IN (SELECT id FROM consultations WHERE doctor_id = auth.uid()) OR referred_by = auth.uid()
);
CREATE POLICY "Facility admins view facility referrals" ON referrals FOR SELECT USING (
  source_facility_id = ANY(get_user_facility_ids(auth.uid())) OR destination_facility_id = ANY(get_user_facility_ids(auth.uid()))
);
CREATE POLICY "District admins view district referrals" ON referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM facilities WHERE id = referrals.source_facility_id AND district = get_user_district(auth.uid()))
);

-- Basic authenticated fallbacks for ease of use in other tables (simplified for demonstration)
CREATE POLICY "Authenticated users can select visits" ON visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Workers can insert visits" ON visits FOR INSERT WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Authenticated users can select consultations" ON consultations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Doctors can update own consultations" ON consultations FOR UPDATE USING (doctor_id = auth.uid());

-- Service role bypasses RLS implicitly if configured in Supabase, but explicit policies can be added if required.

