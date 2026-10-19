/*
# School Platform — Capacity, Username, Class Seed, and Teacher Posts

## Overview
Adds class capacity enforcement, username column to profiles, seeds 21 classes
(12 for Grade 10, 9 for Grade 11) with capacity 60, adds a teacher_posts table for
subject/class-scoped content publishing, and creates helper functions.

## Changes
1. **classes table** — new `capacity` column (int, default 60, not null)
2. **profiles table** — new `username` column (text, unique) + updated trigger to capture username from signup metadata
3. **Seed 21 classes** — Grade 10 (12 classes: 10-1 through 10-12), Grade 11 (9 classes: 11-1 through 11-9)
4. **teacher_posts table** — new table for teacher-published content (news, exam notices, files) scoped to subject+class
5. **Helper function** — `get_class_enrollment_count(class_uuid)` returns number of students assigned to a class
6. **Helper function** — `can_teacher_post_to(teacher_uuid, class_uuid, subject_uuid)` checks teacher assignment

## Security
- RLS enabled on teacher_posts
- Teachers can only create/update/delete posts for subjects+classes they are assigned to
- Students see posts for their class+subjects only
- Parents see posts for their children's class+subjects
- Admin sees all posts

## Important Notes
1. Class capacity is 60 students per class — enforced via database trigger on students table
2. Username uniqueness enforced at DB level
3. Teacher posts support file attachments via URLs (stored in teacher_posts.file_url)
*/

-- ============================================================
-- ADD capacity COLUMN TO classes
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'capacity') THEN
    ALTER TABLE public.classes ADD COLUMN capacity integer NOT NULL DEFAULT 60;
  END IF;
END $$;

-- ============================================================
-- ADD username COLUMN TO profiles
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles(username) WHERE username IS NOT NULL;

-- ============================================================
-- UPDATE handle_new_user TO CAPTURE username
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL)
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- HELPER: get_class_enrollment_count
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_class_enrollment_count(class_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT count(*)::integer FROM public.students WHERE class_id = class_uuid;
$$;

-- ============================================================
-- HELPER: can_teacher_post_to
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_teacher_post_to(teacher_uuid uuid, class_uuid uuid, subject_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE teacher_id = teacher_uuid AND class_id = class_uuid AND subject_id = subject_uuid
  );
$$;

-- ============================================================
-- CLASS CAPACITY TRIGGER — prevent exceeding capacity
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_class_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cls_capacity integer;
  current_count integer;
BEGIN
  IF NEW.class_id IS NOT NULL THEN
    SELECT capacity INTO cls_capacity FROM public.classes WHERE id = NEW.class_id;
    IF cls_capacity IS NOT NULL THEN
      SELECT count(*)::integer INTO current_count FROM public.students WHERE class_id = NEW.class_id AND id != NEW.id;
      IF current_count >= cls_capacity THEN
        RAISE EXCEPTION 'الفصل ممتلئ - تجاوز السعة القصوى للفصل (%)', cls_capacity;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_capacity_check ON public.students;
CREATE TRIGGER students_capacity_check
  BEFORE INSERT OR UPDATE OF class_id ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.enforce_class_capacity();

-- ============================================================
-- SEED 21 CLASSES
-- ============================================================
INSERT INTO public.classes (name, grade_level, section, academic_year, capacity)
SELECT
  'الصف العاشر - ' || sections.section,
  'الصف الأول الثانوي',
  sections.section,
  '2025-2026',
  60
FROM (VALUES ('1'),('2'),('3'),('4'),('5'),('6'),('7'),('8'),('9'),('10'),('11'),('12')) AS sections(section)
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'الصف العاشر - ' || sections.section);

INSERT INTO public.classes (name, grade_level, section, academic_year, capacity)
SELECT
  'الصف الحادي عشر - ' || sections.section,
  'الصف الثاني الثانوي',
  sections.section,
  '2025-2026',
  60
FROM (VALUES ('1'),('2'),('3'),('4'),('5'),('6'),('7'),('8'),('9')) AS sections(section)
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'الصف الحادي عشر - ' || sections.section);

-- ============================================================
-- TEACHER_POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'news' CHECK (post_type IN ('news', 'exam', 'file', 'reminder')),
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_posts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_posts_teacher ON public.teacher_posts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_posts_class ON public.teacher_posts(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_posts_subject ON public.teacher_posts(subject_id);

-- RLS POLICIES — teacher_posts

-- SELECT: admin, post owner, students in the class, parents of students in the class
DROP POLICY IF EXISTS "select_teacher_posts" ON public.teacher_posts;
CREATE POLICY "select_teacher_posts"
ON public.teacher_posts FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.teacher_posts.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = auth.uid() AND s.class_id = public.teacher_posts.class_id
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.class_id = public.teacher_posts.class_id
  )
);

-- INSERT: admin, or teacher who is assigned to this class+subject
DROP POLICY IF EXISTS "insert_teacher_posts" ON public.teacher_posts;
CREATE POLICY "insert_teacher_posts"
ON public.teacher_posts FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    public.teacher_posts.teacher_id = auth.uid()
    AND public.can_teacher_post_to(auth.uid(), public.teacher_posts.class_id, public.teacher_posts.subject_id)
  )
);

-- UPDATE: admin or post owner (who must still be assigned to class+subject)
DROP POLICY IF EXISTS "update_teacher_posts" ON public.teacher_posts;
CREATE POLICY "update_teacher_posts"
ON public.teacher_posts FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.teacher_posts.teacher_id = auth.uid()
)
WITH CHECK (
  public.is_admin()
  OR (
    public.teacher_posts.teacher_id = auth.uid()
    AND public.can_teacher_post_to(auth.uid(), public.teacher_posts.class_id, public.teacher_posts.subject_id)
  )
);

-- DELETE: admin or post owner
DROP POLICY IF EXISTS "delete_teacher_posts" ON public.teacher_posts;
CREATE POLICY "delete_teacher_posts"
ON public.teacher_posts FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.teacher_posts.teacher_id = auth.uid()
);