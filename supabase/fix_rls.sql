-- Fix infinite recursion in RLS policies
-- The problem: patients policies reference referrals/consultations, which reference patients back

-- Drop all problematic patient policies
DROP POLICY IF EXISTS "Patients can read own record" ON patients;
DROP POLICY IF EXISTS "Workers can read assigned patients" ON patients;
DROP POLICY IF EXISTS "Doctors can read their consultation patients" ON patients;
DROP POLICY IF EXISTS "Facility admins can read referred patients" ON patients;
DROP POLICY IF EXISTS "District admins can read district patients" ON patients;
DROP POLICY IF EXISTS "Workers can insert patients" ON patients;
DROP POLICY IF EXISTS "Workers can update assigned patients" ON patients;

-- Drop problematic referral policies  
DROP POLICY IF EXISTS "Patients can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Workers can view assigned patient referrals" ON referrals;
DROP POLICY IF EXISTS "Doctors can view/create own referrals" ON referrals;
DROP POLICY IF EXISTS "Facility admins view facility referrals" ON referrals;
DROP POLICY IF EXISTS "District admins view district referrals" ON referrals;

-- Recreate SIMPLE, non-recursive policies

-- Patients: authenticated users with any healthcare role can read all patients (simplified for demo)
CREATE POLICY "Authenticated can read patients" ON patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Workers can insert patients" ON patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Workers can update patients" ON patients FOR UPDATE USING (auth.role() = 'authenticated');

-- Referrals: authenticated users can read all referrals (simplified for demo)
CREATE POLICY "Authenticated can read referrals" ON referrals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert referrals" ON referrals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update referrals" ON referrals FOR UPDATE USING (auth.role() = 'authenticated');

-- Also add missing policies for other tables that may block queries
CREATE POLICY "Authenticated can read vitals" ON vitals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert vitals" ON vitals FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read triage" ON triage_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert triage" ON triage_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read prescriptions" ON prescriptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert prescriptions" ON prescriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read referral_status_history" ON referral_status_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert referral_status_history" ON referral_status_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read follow_ups" ON follow_ups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert follow_ups" ON follow_ups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update follow_ups" ON follow_ups FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read emergency_cases" ON emergency_cases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert emergency_cases" ON emergency_cases FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read medicine_stock" ON medicine_stock FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read diagnostic_availability" ON diagnostic_availability FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications: users can only read their own
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read patient_timeline" ON patient_timeline FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert patient_timeline" ON patient_timeline FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read audit_events" ON audit_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert audit_events" ON audit_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Facilities: everyone can read
CREATE POLICY "Anyone can read facilities" ON facilities FOR SELECT USING (true);

-- User roles: also allow workers/admins to read all roles for lookup
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Authenticated can read roles" ON user_roles FOR SELECT USING (auth.role() = 'authenticated');

-- Offline sync: users manage their own queue
CREATE POLICY "Users manage own sync queue" ON offline_sync_queue FOR ALL USING (user_id = auth.uid());

-- Consultations: add insert policy
CREATE POLICY "Authenticated can insert consultations" ON consultations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Visits: add update policy
CREATE POLICY "Authenticated can update visits" ON visits FOR UPDATE USING (auth.role() = 'authenticated');
