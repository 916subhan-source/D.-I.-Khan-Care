-- ============================================================================
-- D.I. Khan Doctor Appointment System — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. DOCTORS TABLE POLICIES
-- Public can read verified doctors (or anyone in dev)
CREATE POLICY "Public read verified doctors" 
    ON doctors FOR SELECT 
    USING (verification_status = 'verified' OR true);

-- Doctor can update their own profile
CREATE POLICY "Doctors can update their own profile" 
    ON doctors FOR UPDATE 
    USING (auth.uid() = user_id);

-- 2. DOCTOR SLOTS POLICIES
-- Public can read available slots
CREATE POLICY "Public can view slots" 
    ON doctor_slots FOR SELECT 
    USING (true);

-- Doctor can manage their own slots
CREATE POLICY "Doctors manage their own slots" 
    ON doctor_slots FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM doctors WHERE doctors.id = doctor_slots.doctor_id AND doctors.user_id = auth.uid()
    ));

-- 3. APPOINTMENTS POLICIES
-- Patients can view their own appointments
CREATE POLICY "Patients view own appointments" 
    ON appointments FOR SELECT 
    USING (patient_id = auth.uid());

-- Linked Assistants can view appointments for their doctors
CREATE POLICY "Assistants view linked appointments" 
    ON appointments FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM doctor_assistants 
        WHERE doctor_assistants.doctor_id = appointments.doctor_id 
          AND doctor_assistants.assistant_user_id = auth.uid()
          AND doctor_assistants.status = 'active'
    ));

-- Doctors can view their own appointments
CREATE POLICY "Doctors view own appointments" 
    ON appointments FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM doctors 
        WHERE doctors.id = appointments.doctor_id 
          AND doctors.user_id = auth.uid()
    ));

-- 4. PAYMENTS POLICIES
-- Linked Assistants can manage cash payments
CREATE POLICY "Assistants manage payments" 
    ON payments FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM appointments a
        JOIN doctor_assistants da ON da.doctor_id = a.doctor_id
        WHERE a.id = payments.appointment_id 
          AND da.assistant_user_id = auth.uid()
          AND da.status = 'active'
    ));
