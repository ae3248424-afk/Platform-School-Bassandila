/*
# Seed standard high school subjects

1. Purpose
- The database currently has 0 subjects, which means teachers cannot be assigned to class_subjects and cannot publish posts.
- This migration seeds the standard subjects for Grades 10 and 11 (الصف الأول والثاني الثانوي).

2. New Data
- Inserts 12 standard subjects with unique codes into the `subjects` table.
- All inserts are idempotent (ON CONFLICT DO NOTHING on the code column).

3. Security
- No schema changes. No RLS changes.
- Subjects table is readable by all authenticated users (existing policy).
*/

INSERT INTO subjects (name, code, description) VALUES
  ('اللغة العربية', 'AR', 'اللغة العربية'),
  ('اللغة الإنجليزية', 'EN', 'اللغة الإنجليزية'),
  ('الرياضيات', 'MATH', 'الرياضيات'),
  ('الفيزياء', 'PHY', 'الفيزياء'),
  ('الكيمياء', 'CHEM', 'الكيمياء'),
  ('الأحياء', 'BIO', 'الأحياء'),
  ('الجغرافيا', 'GEO', 'الجغرافيا'),
  ('التاريخ', 'HIST', 'التاريخ'),
  ('علوم الحاسب', 'CS', 'علوم الحاسب وتقنية المعلومات'),
  ('التربية الإسلامية', 'ISL', 'التربية الإسلامية'),
  ('اللغة الفرنسية', 'FR', 'اللغة الفرنسية'),
  ('اللغة الألمانية', 'DE', 'اللغة الألمانية')
ON CONFLICT (code) DO NOTHING;
