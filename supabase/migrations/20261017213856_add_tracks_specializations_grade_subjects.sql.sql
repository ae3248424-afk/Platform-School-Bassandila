/*
# Add tracks, specializations, and grade-level subjects

## Purpose
Support the two-track system for Grade 11 and grade-specific subjects for Grade 10.
The school has:
- Grade 10 (الصف الأول الثانوي): 12 classes, 60 students each, 7 fixed subjects
- Grade 11 (الصف الثاني الثانوي): 9 classes, 60 students each, 3 core subjects + track-based specialization

## Changes

### 1. students table — new columns
- `track` (text, nullable): 'engineering_cs' (هندسة وعلوم حاسب) or 'medical_life' (طب وعلوم حياة). Only set for Grade 11 students.
- `specialization_subject_id` (uuid, nullable, FK → subjects): the elective subject chosen based on track.

### 2. subjects table — new columns
- `grade_level` (text, default 'both'): 'grade_10', 'grade_11', or 'both' — which grade(s) this subject belongs to.
- `is_core` (boolean, default true): whether this is a core (mandatory) subject.
- `allowed_tracks` (text[], default '{}'): for elective subjects, which tracks can choose this subject. Empty array means available to all.

### 3. New subjects seeded
- البرمجة (Programming) — code PROG, grade_10 + grade_11
- الفلسفة (Philosophy) — code PHIL, grade_10
- التربية الدينية (Religious Education) — code REL, grade_10

### 4. Existing subjects updated with grade_level
- Grade 10 subjects: العربية, التاريخ, الإنجليزي, الرياضيات, البرمجة, التربية الدينية, الفلسفة
- Grade 11 electives: البرمجة (engineering_cs), الكيمياء (engineering_cs), الفيزياء (medical_life), الرياضيات (medical_life)
- Grade 11 core: الرياضيات, اللغة العربية, اللغة الإنجليزية (admin can reconfigure)

### 5. Security
- No RLS changes needed — existing policies on students and subjects remain.
- New columns inherit existing RLS policies.
- specialization_subject_id FK ensures referential integrity.

## Notes
- No data is lost — all ALTER TABLE statements use ADD COLUMN IF NOT EXISTS.
- The 3 core subjects for Grade 11 are marked is_core=true; the admin can change which subjects are core from the admin panel.
- Track specializations are enforced by the UI and can be further enforced with a DB check constraint if needed.
*/

-- Add track and specialization to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS track text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS specialization_subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;

-- Add grade_level, is_core, and allowed_tracks to subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_level text DEFAULT 'both' CHECK (grade_level IN ('grade_10', 'grade_11', 'both'));
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_core boolean DEFAULT true;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS allowed_tracks text[] DEFAULT '{}';

-- Seed new subjects
INSERT INTO subjects (name, code, description, grade_level, is_core, allowed_tracks) VALUES
  ('البرمجة', 'PROG', 'البرمجة وتقنية المعلومات', 'both', true, ARRAY['engineering_cs']),
  ('الفلسفة', 'PHIL', 'الفلسفة والمنطق', 'grade_10', true, ARRAY[]::text[]),
  ('التربية الدينية', 'REL', 'التربية الدينية والقيم', 'grade_10', true, ARRAY[]::text[])
ON CONFLICT (code) DO NOTHING;

-- Update existing subjects with grade levels and track assignments
-- Grade 10 subjects
UPDATE subjects SET grade_level = 'grade_10', is_core = true WHERE code = 'AR';
UPDATE subjects SET grade_level = 'grade_10', is_core = true WHERE code = 'HIST';
UPDATE subjects SET grade_level = 'grade_10', is_core = true WHERE code = 'EN';
UPDATE subjects SET grade_level = 'both', is_core = true WHERE code = 'MATH';

-- Grade 11 electives
UPDATE subjects SET grade_level = 'grade_11', is_core = false, allowed_tracks = ARRAY['engineering_cs'] WHERE code = 'CHEM';
UPDATE subjects SET grade_level = 'grade_11', is_core = false, allowed_tracks = ARRAY['medical_life'] WHERE code = 'PHY';

-- Programming is an elective for engineering_cs track in Grade 11
UPDATE subjects SET allowed_tracks = ARRAY['engineering_cs'] WHERE code = 'PROG' AND grade_level = 'both';

-- Math is an elective for medical_life track in Grade 11 (but also a core subject for Grade 10)
-- We keep grade_level='both' for MATH since it's used in both grades

-- Islamic Education / Religious Education: keep for Grade 10
UPDATE subjects SET grade_level = 'grade_10', is_core = true WHERE code = 'ISL';

-- Subjects not used in either grade (Biology, Geography, German, French, CS)
-- Set them to grade_11 as non-core so admin can optionally assign them
UPDATE subjects SET grade_level = 'grade_11', is_core = false WHERE code IN ('BIO', 'GEO', 'DE', 'FR', 'CS');

-- Add a check constraint on track
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_track_check;
ALTER TABLE students ADD CONSTRAINT students_track_check
  CHECK (track IS NULL OR track IN ('engineering_cs', 'medical_life'));
