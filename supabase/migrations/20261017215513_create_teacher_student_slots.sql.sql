/*
# Create teacher_slots and student_slots tables

## Purpose
Pre-numbered empty slot grids for the admin to fill in teacher and student data manually.
No auth accounts are created — slots are just placeholder rows with a slot number,
name, email, username, and an "account_status" field that tracks whether an auth account
has been provisioned yet.

## New Tables

### 1. teacher_slots
- `id` (uuid, PK)
- `slot_number` (int, 1–100, unique)
- `full_name` (text, nullable)
- `email` (text, nullable)
- `username` (text, nullable)
- `subject_taught` (text, nullable)
- `account_status` (text, default 'empty') — 'empty','pending','active','suspended'
- `auth_user_id` (uuid, nullable, FK→auth.users)
- `created_at`, `updated_at`

### 2. student_slots
- `id` (uuid, PK)
- `slot_number` (int) — 1–60 within each class
- `class_id` (uuid, FK→classes)
- `full_name` (text, nullable)
- `username` (text, nullable)
- `track` (text, nullable) — 'engineering_cs' or 'medical_life'
- `specialization_subject_id` (uuid, nullable, FK→subjects)
- `account_status` (text, default 'empty')
- `auth_user_id` (uuid, nullable, FK→auth.users)
- UNIQUE(class_id, slot_number)

## Seeding
- 100 teacher_slots (slot_number 1–100), all empty
- 60 student_slots per class × 21 classes = 1,260 rows, all empty

## Security
- RLS enabled, admin-only CRUD via profile role check.
*/

-- ── teacher_slots ──
CREATE TABLE IF NOT EXISTS teacher_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number int NOT NULL UNIQUE,
  full_name text,
  email text,
  username text,
  subject_taught text,
  account_status text NOT NULL DEFAULT 'empty' CHECK (account_status IN ('empty','pending','active','suspended')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_teacher_slots" ON teacher_slots;
CREATE POLICY "admin_select_teacher_slots" ON teacher_slots FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_teacher_slots" ON teacher_slots;
CREATE POLICY "admin_insert_teacher_slots" ON teacher_slots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_teacher_slots" ON teacher_slots;
CREATE POLICY "admin_update_teacher_slots" ON teacher_slots FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_teacher_slots" ON teacher_slots;
CREATE POLICY "admin_delete_teacher_slots" ON teacher_slots FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── student_slots ──
CREATE TABLE IF NOT EXISTS student_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number int NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  full_name text,
  username text,
  track text CHECK (track IS NULL OR track IN ('engineering_cs','medical_life')),
  specialization_subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  account_status text NOT NULL DEFAULT 'empty' CHECK (account_status IN ('empty','pending','active','suspended')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(class_id, slot_number)
);

ALTER TABLE student_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_student_slots" ON student_slots;
CREATE POLICY "admin_select_student_slots" ON student_slots FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_student_slots" ON student_slots;
CREATE POLICY "admin_insert_student_slots" ON student_slots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_student_slots" ON student_slots;
CREATE POLICY "admin_update_student_slots" ON student_slots FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_student_slots" ON student_slots;
CREATE POLICY "admin_delete_student_slots" ON student_slots FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Seed 100 empty teacher slots (only if table is empty) ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teacher_slots LIMIT 1) THEN
    FOR i IN 1..100 LOOP
      INSERT INTO teacher_slots (slot_number) VALUES (i);
    END LOOP;
  END IF;
END $$;

-- ── Seed 60 student slots per class (only if table is empty) ──
DO $$
DECLARE
  cls RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM student_slots LIMIT 1) THEN
    FOR cls IN SELECT id FROM classes LOOP
      FOR i IN 1..60 LOOP
        INSERT INTO student_slots (slot_number, class_id) VALUES (i, cls.id);
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_student_slots_class_id ON student_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_slots_slot_number ON teacher_slots(slot_number);
