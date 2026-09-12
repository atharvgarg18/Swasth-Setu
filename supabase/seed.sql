-- ==============================================================================
-- Gramin Care Platform - Comprehensive Database Seed Script
-- Target: PostgreSQL / Supabase
-- Note: Run this AFTER applying schema.sql and AFTER auth users are created
-- ==============================================================================

-- 1. PROFILES
INSERT INTO profiles (id, full_name, phone, email, preferred_language, created_at, updated_at) VALUES
  ('d0d0d0d0-0000-0000-0000-000000000001', 'Meera Patil', '9876543210', 'meera@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000002', 'Priya Deshmukh', '9876543211', 'priya@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000003', 'Dr. Rajesh Kumar', '9876543212', 'rajesh@demo.gramincare.in', 'en', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000004', 'Sunita Jadhav', '9876543213', 'sunita@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000005', 'Amit Kulkarni', '9876543214', 'amit@demo.gramincare.in', 'en', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000006', 'Dr. Anita Sharma', '9876543215', 'rekha@demo.gramincare.in', 'en', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000007', 'Ramesh Gaikwad', '9876543216', 'suresh@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000008', 'Savita More', '9876543217', 'ganesh@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000009', 'Lata Bhosale', '9876543218', 'anita@demo.gramincare.in', 'mr', now(), now()),
  ('d0d0d0d0-0000-0000-0000-000000000010', 'Ganesh Shinde', '9876543219', 'rohit@demo.gramincare.in', 'mr', now(), now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

-- 2. FACILITIES (schema: id, name, type, district, block, address, latitude, longitude, phone, services text[], bed_capacity, is_active)
INSERT INTO facilities (id, name, type, district, block, address, latitude, longitude, phone, services, bed_capacity, is_active, created_at, updated_at) VALUES
  ('f0f0f0f0-0000-0000-0000-000000000001', 'Khed Sub Centre', 'sub_centre', 'Pune', 'Khed', 'Khed, Pune District, Maharashtra', 18.8471, 73.8966, '020-2345001', ARRAY['Maternal Care', 'Immunization', 'Basic First Aid', 'Vitals Monitoring'], 0, true, now(), now()),
  ('f0f0f0f0-0000-0000-0000-000000000002', 'Rajgurunagar PHC', 'phc', 'Pune', 'Khed', 'Rajgurunagar, Pune District, Maharashtra', 18.8543, 73.8887, '020-2345002', ARRAY['OPD', 'Maternal Care', 'Basic Diagnostics', 'Pharmacy', 'Minor Surgery'], 6, true, now(), now()),
  ('f0f0f0f0-0000-0000-0000-000000000003', 'Junnar CHC', 'chc', 'Pune', 'Junnar', 'Junnar, Pune District, Maharashtra', 19.2045, 73.8767, '020-2345003', ARRAY['IPD', 'Emergency', 'Specialist OPD', 'Advanced Diagnostics', 'Maternal & Child Health'], 30, true, now(), now()),
  ('f0f0f0f0-0000-0000-0000-000000000004', 'Manchar Rural Hospital', 'rural_hospital', 'Pune', 'Ambegaon', 'Manchar, Pune District, Maharashtra', 19.0035, 73.9405, '020-2345004', ARRAY['Surgery', 'Blood Bank', 'Advanced Diagnostics', 'ICU', 'Specialist Care'], 50, true, now(), now()),
  ('f0f0f0f0-0000-0000-0000-000000000005', 'Sassoon District Hospital Pune', 'district_hospital', 'Pune', 'Pune City', 'Pune City, Maharashtra', 18.5283, 73.8732, '020-2345005', ARRAY['Tertiary Care', 'All Specialties', 'Advanced Imaging', 'NICU/PICU', 'Trauma Center'], 500, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. USER ROLES (schema: id, user_id, role, facility_id, district, is_active)
INSERT INTO user_roles (id, user_id, role, facility_id, district, is_active, created_at, updated_at) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'patient', NULL, NULL, true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000002', 'd0d0d0d0-0000-0000-0000-000000000002', 'asha', 'f0f0f0f0-0000-0000-0000-000000000002', 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000003', 'doctor', 'f0f0f0f0-0000-0000-0000-000000000002', 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000004', 'facility_admin', 'f0f0f0f0-0000-0000-0000-000000000004', 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000005', 'd0d0d0d0-0000-0000-0000-000000000005', 'district_admin', NULL, 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000006', 'd0d0d0d0-0000-0000-0000-000000000006', 'doctor', 'f0f0f0f0-0000-0000-0000-000000000005', 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000007', 'd0d0d0d0-0000-0000-0000-000000000007', 'patient', NULL, NULL, true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000008', 'd0d0d0d0-0000-0000-0000-000000000008', 'patient', NULL, NULL, true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000009', 'd0d0d0d0-0000-0000-0000-000000000009', 'asha', 'f0f0f0f0-0000-0000-0000-000000000001', 'Pune', true, now(), now()),
  ('a0a0a0a0-0000-0000-0000-000000000010', 'd0d0d0d0-0000-0000-0000-000000000010', 'patient', NULL, NULL, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. PATIENTS (schema: id, user_id, abha_id, full_name, date_of_birth, gender, blood_group, phone, address jsonb, emergency_contact jsonb, allergies text[], chronic_conditions text[], is_high_risk, high_risk_reasons text[], registered_by, assigned_worker_id, registered_facility_id)
INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, blood_group, phone, address, allergies, chronic_conditions, is_high_risk, high_risk_reasons, assigned_worker_id, registered_facility_id, created_at, updated_at) VALUES
  ('b0b0b0b0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000001', 'Meera Patil', '1996-05-15', 'female', 'B+', '9876543210',
    '{"village": "Kadus", "block": "Khed", "district": "Pune", "state": "Maharashtra", "pincode": "412404"}'::jsonb,
    ARRAY['None'], ARRAY['Pregnancy-induced Hypertension'], true, ARRAY['High-risk pregnancy', 'PIH'], 'd0d0d0d0-0000-0000-0000-000000000002', 'f0f0f0f0-0000-0000-0000-000000000002', now() - interval '6 months', now()),
  ('b0b0b0b0-0000-0000-0000-000000000007', 'd0d0d0d0-0000-0000-0000-000000000007', 'Ramesh Gaikwad', '1969-02-10', 'male', 'O+', '9876543216',
    '{"village": "Narayangaon", "block": "Junnar", "district": "Pune", "state": "Maharashtra", "pincode": "410504"}'::jsonb,
    ARRAY['Penicillin'], ARRAY['Diabetes Type 2', 'Hypertension'], true, ARRAY['Multiple chronic conditions', 'Elderly'], NULL, 'f0f0f0f0-0000-0000-0000-000000000003', now() - interval '1 year', now()),
  ('b0b0b0b0-0000-0000-0000-000000000008', 'd0d0d0d0-0000-0000-0000-000000000008', 'Savita More', '1992-08-20', 'female', 'A+', '9876543217',
    '{"village": "Manchar", "block": "Ambegaon", "district": "Pune", "state": "Maharashtra", "pincode": "410503"}'::jsonb,
    ARRAY[]::text[], ARRAY['Pregnancy (Routine)'], false, ARRAY[]::text[], NULL, 'f0f0f0f0-0000-0000-0000-000000000004', now() - interval '2 months', now()),
  ('b0b0b0b0-0000-0000-0000-000000000010', 'd0d0d0d0-0000-0000-0000-000000000010', 'Ganesh Shinde', '2016-11-05', 'male', 'AB+', '9876543219',
    '{"village": "Chakan", "block": "Khed", "district": "Pune", "state": "Maharashtra", "pincode": "410501"}'::jsonb,
    ARRAY['Dust Mites'], ARRAY[]::text[], false, ARRAY[]::text[], 'd0d0d0d0-0000-0000-0000-000000000009', 'f0f0f0f0-0000-0000-0000-000000000001', now() - interval '1 week', now()),
  ('b0b0b0b0-0000-0000-0000-000000000011', NULL, 'Lakshmi Waghmare', '1957-04-12', 'female', 'O-', '9876543220',
    '{"village": "Otur", "block": "Junnar", "district": "Pune", "state": "Maharashtra", "pincode": "412409"}'::jsonb,
    ARRAY[]::text[], ARRAY['Coronary Artery Disease', 'Osteoarthritis'], true, ARRAY['Elderly', 'Heart condition'], NULL, 'f0f0f0f0-0000-0000-0000-000000000003', now() - interval '2 years', now()),
  ('b0b0b0b0-0000-0000-0000-000000000012', NULL, 'Prakash Pawar', '1979-09-30', 'male', 'B+', '9876543221',
    '{"village": "Alandi", "block": "Khed", "district": "Pune", "state": "Maharashtra", "pincode": "412105"}'::jsonb,
    ARRAY[]::text[], ARRAY[]::text[], false, ARRAY[]::text[], NULL, 'f0f0f0f0-0000-0000-0000-000000000002', now() - interval '3 days', now())
ON CONFLICT (id) DO NOTHING;

-- 5. MEDICINE STOCK (schema: id, facility_id, medicine_name, category, quantity, unit, status)
DO $$
DECLARE
  f_sub uuid := 'f0f0f0f0-0000-0000-0000-000000000001';
  f_phc uuid := 'f0f0f0f0-0000-0000-0000-000000000002';
  f_chc uuid := 'f0f0f0f0-0000-0000-0000-000000000003';
  f_rh  uuid := 'f0f0f0f0-0000-0000-0000-000000000004';
  f_dh  uuid := 'f0f0f0f0-0000-0000-0000-000000000005';
BEGIN
  INSERT INTO medicine_stock (id, facility_id, medicine_name, category, quantity, unit, status, created_at, updated_at) VALUES
    (gen_random_uuid(), f_sub, 'Paracetamol', 'Analgesic', 500, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_sub, 'ORS', 'Rehydration', 200, 'Sachet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_sub, 'Iron Folic Acid', 'Supplement', 15, 'Tablet', 'low_stock', now(), now()),
    (gen_random_uuid(), f_sub, 'Calcium', 'Supplement', 300, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_sub, 'Albendazole', 'Anthelmintic', 0, 'Tablet', 'out_of_stock', now(), now()),

    (gen_random_uuid(), f_phc, 'Paracetamol', 'Analgesic', 1200, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_phc, 'Amoxicillin', 'Antibiotic', 450, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_phc, 'Methyldopa', 'Antihypertensive', 50, 'Tablet', 'low_stock', now(), now()),
    (gen_random_uuid(), f_phc, 'Oxytocin', 'Uterotonic', 25, 'Injection', 'low_stock', now(), now()),
    (gen_random_uuid(), f_phc, 'Metformin', 'Antidiabetic', 800, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_phc, 'Amlodipine', 'Antihypertensive', 600, 'Tablet', 'in_stock', now(), now()),

    (gen_random_uuid(), f_chc, 'Insulin', 'Antidiabetic', 10, 'Vial', 'low_stock', now(), now()),
    (gen_random_uuid(), f_chc, 'Metformin', 'Antidiabetic', 2000, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_chc, 'Ciprofloxacin', 'Antibiotic', 1000, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_chc, 'Magnesium Sulphate', 'Anticonvulsant', 40, 'Injection', 'in_stock', now(), now()),
    (gen_random_uuid(), f_chc, 'Salbutamol', 'Bronchodilator', 5, 'Inhaler', 'low_stock', now(), now()),

    (gen_random_uuid(), f_rh, 'Enalapril', 'Antihypertensive', 400, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_rh, 'Ranitidine', 'Antacid', 800, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_rh, 'Metronidazole', 'Antibiotic', 600, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_rh, 'Misoprostol', 'Prostaglandin', 0, 'Tablet', 'out_of_stock', now(), now()),

    (gen_random_uuid(), f_dh, 'Paracetamol', 'Analgesic', 5000, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_dh, 'Labetalol', 'Antihypertensive', 300, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_dh, 'Cotrimoxazole', 'Antibiotic', 1500, 'Tablet', 'in_stock', now(), now()),
    (gen_random_uuid(), f_dh, 'Oxytocin', 'Uterotonic', 500, 'Injection', 'in_stock', now(), now())
  ON CONFLICT DO NOTHING;
END $$;

-- 6. DIAGNOSTIC AVAILABILITY (schema: id, facility_id, test_name, category, is_available, turnaround_hours)
DO $$
DECLARE
  f_sub uuid := 'f0f0f0f0-0000-0000-0000-000000000001';
  f_phc uuid := 'f0f0f0f0-0000-0000-0000-000000000002';
  f_chc uuid := 'f0f0f0f0-0000-0000-0000-000000000003';
  f_rh  uuid := 'f0f0f0f0-0000-0000-0000-000000000004';
  f_dh  uuid := 'f0f0f0f0-0000-0000-0000-000000000005';
BEGIN
  INSERT INTO diagnostic_availability (id, facility_id, test_name, category, is_available, turnaround_hours, created_at, updated_at) VALUES
    (gen_random_uuid(), f_sub, 'Blood Pressure', 'Vitals', true, 0, now(), now()),
    (gen_random_uuid(), f_sub, 'Blood Glucose', 'Pathology', true, 0, now(), now()),
    (gen_random_uuid(), f_sub, 'Hemoglobin', 'Pathology', true, 0, now(), now()),
    (gen_random_uuid(), f_sub, 'Urine Protein', 'Pathology', false, 0, now(), now()),

    (gen_random_uuid(), f_phc, 'Blood Pressure', 'Vitals', true, 0, now(), now()),
    (gen_random_uuid(), f_phc, 'Complete Blood Count', 'Pathology', true, 24, now(), now()),
    (gen_random_uuid(), f_phc, 'Malaria RDT', 'Pathology', true, 1, now(), now()),
    (gen_random_uuid(), f_phc, 'Pregnancy Test', 'Pathology', true, 1, now(), now()),
    (gen_random_uuid(), f_phc, 'X-Ray', 'Imaging', false, 48, now(), now()),

    (gen_random_uuid(), f_chc, 'Complete Blood Count', 'Pathology', true, 12, now(), now()),
    (gen_random_uuid(), f_chc, 'Ultrasound', 'Imaging', true, 4, now(), now()),
    (gen_random_uuid(), f_chc, 'ECG', 'Cardiology', true, 1, now(), now()),

    (gen_random_uuid(), f_rh, 'Ultrasound', 'Imaging', true, 2, now(), now()),
    (gen_random_uuid(), f_rh, 'CT Scan', 'Imaging', false, 0, now(), now()),
    (gen_random_uuid(), f_rh, 'X-Ray', 'Imaging', true, 2, now(), now()),

    (gen_random_uuid(), f_dh, 'MRI', 'Imaging', true, 24, now(), now()),
    (gen_random_uuid(), f_dh, 'CT Scan', 'Imaging', true, 12, now(), now()),
    (gen_random_uuid(), f_dh, 'Advanced Pathology Panel', 'Pathology', true, 24, now(), now())
  ON CONFLICT DO NOTHING;
END $$;

-- 7. VISITS, VITALS, TRIAGE, CONSULTATIONS, PRESCRIPTIONS
DO $$
DECLARE
  p_meera uuid := 'b0b0b0b0-0000-0000-0000-000000000001';
  p_ramesh uuid := 'b0b0b0b0-0000-0000-0000-000000000007';
  p_savita uuid := 'b0b0b0b0-0000-0000-0000-000000000008';

  v1_meera uuid := gen_random_uuid();
  v2_meera uuid := gen_random_uuid();
  v3_meera uuid := gen_random_uuid();
  v4_meera_tele uuid := gen_random_uuid();

  v1_ramesh uuid := gen_random_uuid();
  v2_ramesh uuid := gen_random_uuid();

  v1_savita uuid := gen_random_uuid();

  c1_meera uuid := gen_random_uuid();
  c1_ramesh uuid := gen_random_uuid();

  t1_meera uuid := gen_random_uuid();
BEGIN
  -- Visits (schema: id, patient_id, worker_id, facility_id, visit_type, chief_complaint, notes, visit_date)
  INSERT INTO visits (id, patient_id, worker_id, facility_id, visit_type, chief_complaint, notes, visit_date, created_at, updated_at) VALUES
    (v1_meera, p_meera, 'd0d0d0d0-0000-0000-0000-000000000002', 'f0f0f0f0-0000-0000-0000-000000000002', 'facility_visit', 'ANC checkup', '1st ANC visit', now() - interval '5 months', now() - interval '5 months', now() - interval '5 months'),
    (v2_meera, p_meera, 'd0d0d0d0-0000-0000-0000-000000000002', 'f0f0f0f0-0000-0000-0000-000000000002', 'facility_visit', 'ANC checkup', '2nd ANC visit', now() - interval '3 months', now() - interval '3 months', now() - interval '3 months'),
    (v3_meera, p_meera, 'd0d0d0d0-0000-0000-0000-000000000002', 'f0f0f0f0-0000-0000-0000-000000000002', 'facility_visit', 'ANC checkup', '3rd ANC visit, BP slightly elevated', now() - interval '1 month', now() - interval '1 month', now() - interval '1 month'),
    (v4_meera_tele, p_meera, 'd0d0d0d0-0000-0000-0000-000000000002', NULL, 'facility_visit', 'BP concerns', 'Teleconsultation for BP concerns', now() - interval '2 weeks', now() - interval '2 weeks', now() - interval '2 weeks'),

    (v1_ramesh, p_ramesh, NULL, 'f0f0f0f0-0000-0000-0000-000000000003', 'follow_up', 'Diabetes check', 'Diabetes routine check', now() - interval '4 months', now() - interval '4 months', now() - interval '4 months'),
    (v2_ramesh, p_ramesh, NULL, 'f0f0f0f0-0000-0000-0000-000000000003', 'follow_up', 'Diabetes check', 'Diabetes check, blood sugar high', now() - interval '1 month', now() - interval '1 month', now() - interval '1 month'),

    (v1_savita, p_savita, NULL, 'f0f0f0f0-0000-0000-0000-000000000004', 'facility_visit', 'Initial registration', 'Initial registration and vitals', now() - interval '2 months', now() - interval '2 months', now() - interval '2 months')
  ON CONFLICT DO NOTHING;

  -- Vitals (schema: id, patient_id, visit_id, consultation_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, spo2, weight, blood_sugar, respiratory_rate, notes)
  INSERT INTO vitals (id, patient_id, visit_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, spo2, weight, respiratory_rate, created_at, updated_at) VALUES
    (gen_random_uuid(), p_meera, v3_meera, 'd0d0d0d0-0000-0000-0000-000000000002', 145, 95, 88, 37.0, 98, 65.5, 18, now() - interval '1 month', now() - interval '1 month'),
    (gen_random_uuid(), p_ramesh, v2_ramesh, NULL, 130, 85, 76, 36.8, 97, 82.0, 16, now() - interval '1 month', now() - interval '1 month'),
    (gen_random_uuid(), p_savita, v1_savita, NULL, 110, 70, 72, 36.9, 99, 58.0, 14, now() - interval '2 months', now() - interval '2 months')
  ON CONFLICT DO NOTHING;

  -- Triage Sessions (schema: id, patient_id, initiated_by, visit_id, symptoms jsonb, risk_factors jsonb, severity, routing_recommendation, routing_reason, rules_applied jsonb)
  INSERT INTO triage_sessions (id, patient_id, initiated_by, symptoms, severity, routing_recommendation, routing_reason, rules_applied, created_at, updated_at) VALUES
    (t1_meera, p_meera, 'd0d0d0d0-0000-0000-0000-000000000002',
      '["headache", "swelling_limbs"]'::jsonb,
      'moderate', 'phc_visit',
      'High BP detected with pregnancy symptoms — immediate doctor consultation recommended',
      '[{"rule": "pregnancy_risk", "triggered": true}]'::jsonb,
      now() - interval '15 days', now() - interval '15 days')
  ON CONFLICT DO NOTHING;

  -- Consultations (schema: id, patient_id, doctor_id, worker_id, triage_session_id, consultation_type, status, priority, chief_complaint, clinical_notes, assessment, started_at, completed_at)
  INSERT INTO consultations (id, patient_id, doctor_id, worker_id, triage_session_id, consultation_type, status, priority, chief_complaint, clinical_notes, assessment, started_at, completed_at, created_at, updated_at) VALUES
    (c1_meera, p_meera, 'd0d0d0d0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000002', t1_meera, 'teleconsult_video', 'completed', 'urgent',
      'BP elevated, headache, swelling in legs',
      'Patient presents with BP 145/95, headache for 3 days, mild pedal edema. 28 weeks pregnant.',
      'Pregnancy-induced Hypertension (PIH). Advised strict bed rest and prescribed Methyldopa.',
      now() - interval '14 days', now() - interval '14 days', now() - interval '14 days', now() - interval '14 days'),
    (c1_ramesh, p_ramesh, 'd0d0d0d0-0000-0000-0000-000000000006', NULL, NULL, 'in_person', 'completed', 'routine',
      'Diabetes follow-up, blood sugar high',
      'Patient reports increased thirst and frequent urination. Fasting blood sugar 220 mg/dL.',
      'Uncontrolled Type 2 Diabetes. Needs lifestyle modification and increased Metformin dosage.',
      now() - interval '1 month', now() - interval '1 month', now() - interval '1 month', now() - interval '1 month')
  ON CONFLICT DO NOTHING;

  -- Prescriptions (schema: id, patient_id, consultation_id, prescribed_by, medications jsonb, notes)
  INSERT INTO prescriptions (id, patient_id, consultation_id, prescribed_by, medications, notes, created_at, updated_at) VALUES
    (gen_random_uuid(), p_meera, c1_meera, 'd0d0d0d0-0000-0000-0000-000000000003',
      '[{"name": "Methyldopa", "dosage": "250mg", "frequency": "Twice daily", "duration": "15 days", "instructions": "Take after meals. Monitor BP daily."}]'::jsonb,
      'Monitor BP daily. Return if headache worsens or vision changes.',
      now() - interval '14 days', now() - interval '14 days'),
    (gen_random_uuid(), p_ramesh, c1_ramesh, 'd0d0d0d0-0000-0000-0000-000000000006',
      '[{"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days", "instructions": "Take with food to avoid stomach upset."}]'::jsonb,
      'Reduce sugar intake. Walk 30 minutes daily.',
      now() - interval '1 month', now() - interval '1 month')
  ON CONFLICT DO NOTHING;
END $$;

-- 8. REFERRALS & HISTORY
DO $$
DECLARE
  p_ramesh uuid := 'b0b0b0b0-0000-0000-0000-000000000007';
  p_prakash uuid := 'b0b0b0b0-0000-0000-0000-000000000012';

  ref1 uuid := gen_random_uuid();
  ref2 uuid := gen_random_uuid();
BEGIN
  -- Referrals (schema: id, referral_number, patient_id, source_facility_id, destination_facility_id, referred_by, consultation_id, service, urgency, reason, clinical_summary, status)
  INSERT INTO referrals (id, patient_id, source_facility_id, destination_facility_id, referred_by, service, urgency, reason, clinical_summary, status, created_at, updated_at) VALUES
    (ref1, p_ramesh, 'f0f0f0f0-0000-0000-0000-000000000002', 'f0f0f0f0-0000-0000-0000-000000000003', 'd0d0d0d0-0000-0000-0000-000000000003',
      'Diabetology', 'routine', 'Specialist review for uncontrolled diabetes',
      'Patient with Type 2 DM, fasting sugar 220 mg/dL despite Metformin 500mg BD. Needs specialist review.',
      'completed', now() - interval '2 months', now() - interval '1 month'),
    (ref2, p_prakash, 'f0f0f0f0-0000-0000-0000-000000000003', 'f0f0f0f0-0000-0000-0000-000000000004', 'd0d0d0d0-0000-0000-0000-000000000006',
      'Surgery', 'urgent', 'Suspected appendicitis, requires surgical evaluation',
      'Patient presents with acute RIF pain, rebound tenderness, elevated WBC count. Needs urgent surgical consult.',
      'acknowledged', now() - interval '1 day', now())
  ON CONFLICT DO NOTHING;

  -- Referral Status History (schema: id, referral_id, from_status, to_status, changed_by, notes, changed_at)
  INSERT INTO referral_status_history (id, referral_id, from_status, to_status, changed_by, notes, changed_at, created_at) VALUES
    (gen_random_uuid(), ref1, NULL, 'created', 'd0d0d0d0-0000-0000-0000-000000000003', 'Referral created', now() - interval '2 months', now() - interval '2 months'),
    (gen_random_uuid(), ref1, 'created', 'acknowledged', 'd0d0d0d0-0000-0000-0000-000000000004', 'Patient contacted for appointment', now() - interval '1 month 25 days', now() - interval '1 month 25 days'),
    (gen_random_uuid(), ref1, 'acknowledged', 'completed', 'd0d0d0d0-0000-0000-0000-000000000004', 'Patient seen by physician', now() - interval '1 month', now() - interval '1 month'),

    (gen_random_uuid(), ref2, NULL, 'created', 'd0d0d0d0-0000-0000-0000-000000000006', 'Referral initiated', now() - interval '1 day', now() - interval '1 day'),
    (gen_random_uuid(), ref2, 'created', 'acknowledged', 'd0d0d0d0-0000-0000-0000-000000000004', 'Bed reserved in surgical ward', now(), now())
  ON CONFLICT DO NOTHING;
END $$;

-- 9. FOLLOW UPS (schema: id, patient_id, assigned_worker_id, consultation_id, referral_id, reason, category, due_date, priority, status, completed_at, completion_notes)
INSERT INTO follow_ups (id, patient_id, assigned_worker_id, reason, category, due_date, priority, status, created_at, updated_at) VALUES
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000001', 'd0d0d0d0-0000-0000-0000-000000000002', 'High-risk ANC checkup required for BP monitoring', 'maternal', (now() + interval '2 days')::date, 'urgent', 'upcoming', now(), now()),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000007', NULL, 'Diabetes routine monthly check — blood sugar was high', 'chronic', (now() - interval '3 days')::date, 'routine', 'overdue', now() - interval '10 days', now() - interval '3 days'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000008', 'd0d0d0d0-0000-0000-0000-000000000009', 'Routine ANC check completed successfully', 'maternal', (now() - interval '15 days')::date, 'routine', 'completed', now() - interval '25 days', now() - interval '15 days')
ON CONFLICT DO NOTHING;

-- 10. NOTIFICATIONS (schema: id, user_id, type, title, message, data jsonb, is_read)
INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at, updated_at) VALUES
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000002', 'alert', 'Overdue Follow-up', 'Patient Ramesh Gaikwad has an overdue follow-up for Diabetes.', false, now() - interval '1 day', now() - interval '1 day'),
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000002', 'info', 'New Patient Assigned', 'Meera Patil has been assigned to your ASHA registry.', true, now() - interval '6 months', now() - interval '5 months'),
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000003', 'action_required', 'Consultation Request', 'New teleconsultation request from Meera Patil.', false, now() - interval '2 hours', now() - interval '2 hours'),
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000001', 'reminder', 'Appointment Reminder', 'You have an upcoming ANC checkup in 2 days.', false, now(), now())
ON CONFLICT DO NOTHING;

-- 11. PATIENT TIMELINE (schema: id, patient_id, event_type, event_id, title, description, metadata jsonb, created_by, event_at)
INSERT INTO patient_timeline (id, patient_id, event_type, event_id, title, description, created_by, event_at, created_at) VALUES
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000001', 'registration', 'b0b0b0b0-0000-0000-0000-000000000001', 'Patient Registered', 'Registered at Rajgurunagar PHC by ASHA worker Priya Deshmukh', 'd0d0d0d0-0000-0000-0000-000000000002', now() - interval '6 months', now() - interval '6 months'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000001', 'visit', 'b0b0b0b0-0000-0000-0000-000000000001', 'ANC Visit', '3rd ANC visit — BP elevated 145/95', 'd0d0d0d0-0000-0000-0000-000000000002', now() - interval '1 month', now() - interval '1 month'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000001', 'consultation', 'b0b0b0b0-0000-0000-0000-000000000001', 'Teleconsultation', 'Video consultation with Dr. Rajesh Kumar for BP concerns', 'd0d0d0d0-0000-0000-0000-000000000003', now() - interval '14 days', now() - interval '14 days'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000001', 'prescription', 'b0b0b0b0-0000-0000-0000-000000000001', 'Prescription Issued', 'Methyldopa 250mg prescribed for PIH', 'd0d0d0d0-0000-0000-0000-000000000003', now() - interval '14 days', now() - interval '14 days'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000007', 'registration', 'b0b0b0b0-0000-0000-0000-000000000007', 'Patient Registered', 'Registered at Junnar CHC', 'd0d0d0d0-0000-0000-0000-000000000003', now() - interval '1 year', now() - interval '1 year'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000008', 'registration', 'b0b0b0b0-0000-0000-0000-000000000008', 'Patient Registered', 'Registered at Manchar Rural Hospital', 'd0d0d0d0-0000-0000-0000-000000000004', now() - interval '2 months', now() - interval '2 months'),
  (gen_random_uuid(), 'b0b0b0b0-0000-0000-0000-000000000010', 'registration', 'b0b0b0b0-0000-0000-0000-000000000010', 'Patient Registered', 'Registered at Khed Sub Centre', 'd0d0d0d0-0000-0000-0000-000000000009', now() - interval '1 week', now() - interval '1 week')
ON CONFLICT DO NOTHING;

-- 12. AUDIT EVENTS (schema: id, actor_id, action, entity_type, entity_id, details jsonb)
INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, details, created_at) VALUES
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000003', 'prescription.created', 'prescription', 'b0b0b0b0-0000-0000-0000-000000000001', '{"action": "Prescribed Methyldopa for PIH"}'::jsonb, now() - interval '14 days'),
  (gen_random_uuid(), 'd0d0d0d0-0000-0000-0000-000000000006', 'referral.acknowledged', 'referral', 'b0b0b0b0-0000-0000-0000-000000000012', '{"action": "Changed status to acknowledged"}'::jsonb, now())
ON CONFLICT DO NOTHING;

-- END OF SEED SCRIPT
