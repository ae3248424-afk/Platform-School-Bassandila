/*
# School Platform — Helper Functions & RLS Policies (Part 2)

## Overview
Adds SECURITY DEFINER helper functions and Row Level Security policies for all tables.

## Helper Functions
- get_current_user_role() — returns the role of the authenticated user
- is_admin() — boolean check if current user is admin
- is_teacher_of_class(uuid) — check if current user teaches a given class
- is_parent_of(uuid) — check if current user is parent of a given student

## Security
- RLS policies enforce role-based access across all 14 tables:
  - Admin: full access to everything
  - Teacher: access only to assigned classes and students within them
  - Student: access only to own data
  - Parent: access only to linked children's data
- Profiles created via SECURITY DEFINER trigger (bypasses RLS)
- Admin role cannot be self-assigned via signup

## Important Notes
1. Self-registration creates profiles with role from signup metadata (student/teacher/parent only)
2. Admin accounts must be created by an existing admin or bootstrapped via SQL
3. All password handling done by Supabase Auth (bcrypt hashed, never plaintext)
*/

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true);
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(class_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE class_id = class_uuid AND teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of(student_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid() AND student_id = student_uuid
  );
$$;

-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================

DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.is_admin()
  OR (
    public.get_current_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.class_subjects cs ON cs.class_id = s.class_id
      WHERE s.id = public.profiles.id AND cs.teacher_id = auth.uid()
    )
  )
  OR (
    public.get_current_user_role() = 'parent'
    AND public.is_parent_of(public.profiles.id)
  )
);

DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
CREATE POLICY "update_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
CREATE POLICY "insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_profiles" ON public.profiles;
CREATE POLICY "delete_profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — CLASSES
-- ============================================================

DROP POLICY IF EXISTS "select_classes" ON public.classes;
CREATE POLICY "select_classes"
ON public.classes FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.is_teacher_of_class(public.classes.id)
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = auth.uid() AND s.class_id = public.classes.id
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.class_id = public.classes.id
  )
);

DROP POLICY IF EXISTS "insert_classes" ON public.classes;
CREATE POLICY "insert_classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_classes" ON public.classes;
CREATE POLICY "update_classes"
ON public.classes FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_classes" ON public.classes;
CREATE POLICY "delete_classes"
ON public.classes FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — SUBJECTS
-- ============================================================

DROP POLICY IF EXISTS "select_subjects" ON public.subjects;
CREATE POLICY "select_subjects"
ON public.subjects FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.get_current_user_role() IN ('teacher', 'student', 'parent')
);

DROP POLICY IF EXISTS "insert_subjects" ON public.subjects;
CREATE POLICY "insert_subjects"
ON public.subjects FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_subjects" ON public.subjects;
CREATE POLICY "update_subjects"
ON public.subjects FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_subjects" ON public.subjects;
CREATE POLICY "delete_subjects"
ON public.subjects FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — CLASS_SUBJECTS
-- ============================================================

DROP POLICY IF EXISTS "select_class_subjects" ON public.class_subjects;
CREATE POLICY "select_class_subjects"
ON public.class_subjects FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.class_subjects.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = auth.uid() AND s.class_id = public.class_subjects.class_id
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.class_id = public.class_subjects.class_id
  )
);

DROP POLICY IF EXISTS "insert_class_subjects" ON public.class_subjects;
CREATE POLICY "insert_class_subjects"
ON public.class_subjects FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_class_subjects" ON public.class_subjects;
CREATE POLICY "update_class_subjects"
ON public.class_subjects FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_class_subjects" ON public.class_subjects;
CREATE POLICY "delete_class_subjects"
ON public.class_subjects FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — STUDENTS
-- ============================================================

DROP POLICY IF EXISTS "select_students" ON public.students;
CREATE POLICY "select_students"
ON public.students FOR SELECT
TO authenticated
USING (
  auth.uid() = public.students.id
  OR public.is_admin()
  OR public.is_teacher_of_class(public.students.class_id)
  OR public.is_parent_of(public.students.id)
);

DROP POLICY IF EXISTS "insert_students" ON public.students;
CREATE POLICY "insert_students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = public.students.id OR public.is_admin()
);

DROP POLICY IF EXISTS "update_students" ON public.students;
CREATE POLICY "update_students"
ON public.students FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_students" ON public.students;
CREATE POLICY "delete_students"
ON public.students FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — TEACHERS
-- ============================================================

DROP POLICY IF EXISTS "select_teachers" ON public.teachers;
CREATE POLICY "select_teachers"
ON public.teachers FOR SELECT
TO authenticated
USING (
  auth.uid() = public.teachers.id
  OR public.is_admin()
  OR public.get_current_user_role() IN ('student', 'parent')
);

DROP POLICY IF EXISTS "insert_teachers" ON public.teachers;
CREATE POLICY "insert_teachers"
ON public.teachers FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = public.teachers.id OR public.is_admin()
);

DROP POLICY IF EXISTS "update_teachers" ON public.teachers;
CREATE POLICY "update_teachers"
ON public.teachers FOR UPDATE
TO authenticated
USING (auth.uid() = public.teachers.id OR public.is_admin())
WITH CHECK (auth.uid() = public.teachers.id OR public.is_admin());

DROP POLICY IF EXISTS "delete_teachers" ON public.teachers;
CREATE POLICY "delete_teachers"
ON public.teachers FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — PARENTS
-- ============================================================

DROP POLICY IF EXISTS "select_parents" ON public.parents;
CREATE POLICY "select_parents"
ON public.parents FOR SELECT
TO authenticated
USING (
  auth.uid() = public.parents.id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "insert_parents" ON public.parents;
CREATE POLICY "insert_parents"
ON public.parents FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = public.parents.id OR public.is_admin()
);

DROP POLICY IF EXISTS "update_parents" ON public.parents;
CREATE POLICY "update_parents"
ON public.parents FOR UPDATE
TO authenticated
USING (auth.uid() = public.parents.id OR public.is_admin())
WITH CHECK (auth.uid() = public.parents.id OR public.is_admin());

DROP POLICY IF EXISTS "delete_parents" ON public.parents;
CREATE POLICY "delete_parents"
ON public.parents FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — PARENT_STUDENT_LINKS
-- ============================================================

DROP POLICY IF EXISTS "select_parent_links" ON public.parent_student_links;
CREATE POLICY "select_parent_links"
ON public.parent_student_links FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.parent_student_links.parent_id = auth.uid()
  OR public.parent_student_links.student_id = auth.uid()
);

DROP POLICY IF EXISTS "insert_parent_links" ON public.parent_student_links;
CREATE POLICY "insert_parent_links"
ON public.parent_student_links FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR public.parent_student_links.parent_id = auth.uid()
);

DROP POLICY IF EXISTS "update_parent_links" ON public.parent_student_links;
CREATE POLICY "update_parent_links"
ON public.parent_student_links FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_parent_links" ON public.parent_student_links;
CREATE POLICY "delete_parent_links"
ON public.parent_student_links FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — ENROLLMENTS
-- ============================================================

DROP POLICY IF EXISTS "select_enrollments" ON public.enrollments;
CREATE POLICY "select_enrollments"
ON public.enrollments FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.enrollments.student_id = auth.uid()
  OR public.is_teacher_of_class(public.enrollments.class_id)
  OR public.is_parent_of(public.enrollments.student_id)
);

DROP POLICY IF EXISTS "insert_enrollments" ON public.enrollments;
CREATE POLICY "insert_enrollments"
ON public.enrollments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_enrollments" ON public.enrollments;
CREATE POLICY "update_enrollments"
ON public.enrollments FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_enrollments" ON public.enrollments;
CREATE POLICY "delete_enrollments"
ON public.enrollments FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — GRADES
-- ============================================================

DROP POLICY IF EXISTS "select_grades" ON public.grades;
CREATE POLICY "select_grades"
ON public.grades FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.grades.student_id = auth.uid()
  OR public.grades.teacher_id = auth.uid()
  OR public.is_parent_of(public.grades.student_id)
);

DROP POLICY IF EXISTS "insert_grades" ON public.grades;
CREATE POLICY "insert_grades"
ON public.grades FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    public.grades.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.grades.class_id)
  )
);

DROP POLICY IF EXISTS "update_grades" ON public.grades;
CREATE POLICY "update_grades"
ON public.grades FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR (
    public.grades.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.grades.class_id)
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    public.grades.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.grades.class_id)
  )
);

DROP POLICY IF EXISTS "delete_grades" ON public.grades;
CREATE POLICY "delete_grades"
ON public.grades FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR (
    public.grades.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.grades.class_id)
  )
);

-- ============================================================
-- RLS POLICIES — ASSIGNMENTS
-- ============================================================

DROP POLICY IF EXISTS "select_assignments" ON public.assignments;
CREATE POLICY "select_assignments"
ON public.assignments FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.assignments.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = auth.uid() AND s.class_id = public.assignments.class_id
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.class_id = public.assignments.class_id
  )
);

DROP POLICY IF EXISTS "insert_assignments" ON public.assignments;
CREATE POLICY "insert_assignments"
ON public.assignments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    public.assignments.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.assignments.class_id)
  )
);

DROP POLICY IF EXISTS "update_assignments" ON public.assignments;
CREATE POLICY "update_assignments"
ON public.assignments FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR public.assignments.teacher_id = auth.uid()
)
WITH CHECK (
  public.is_admin()
  OR (
    public.assignments.teacher_id = auth.uid()
    AND public.is_teacher_of_class(public.assignments.class_id)
  )
);

DROP POLICY IF EXISTS "delete_assignments" ON public.assignments;
CREATE POLICY "delete_assignments"
ON public.assignments FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.assignments.teacher_id = auth.uid()
);

-- ============================================================
-- RLS POLICIES — ATTENDANCE
-- ============================================================

DROP POLICY IF EXISTS "select_attendance" ON public.attendance;
CREATE POLICY "select_attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.attendance.student_id = auth.uid()
  OR public.attendance.recorded_by = auth.uid()
  OR public.is_parent_of(public.attendance.student_id)
  OR public.is_teacher_of_class(public.attendance.class_id)
);

DROP POLICY IF EXISTS "insert_attendance" ON public.attendance;
CREATE POLICY "insert_attendance"
ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    public.attendance.recorded_by = auth.uid()
    AND public.is_teacher_of_class(public.attendance.class_id)
  )
);

DROP POLICY IF EXISTS "update_attendance" ON public.attendance;
CREATE POLICY "update_attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  OR (
    public.attendance.recorded_by = auth.uid()
    AND public.is_teacher_of_class(public.attendance.class_id)
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    public.attendance.recorded_by = auth.uid()
    AND public.is_teacher_of_class(public.attendance.class_id)
  )
);

DROP POLICY IF EXISTS "delete_attendance" ON public.attendance;
CREATE POLICY "delete_attendance"
ON public.attendance FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR (
    public.attendance.recorded_by = auth.uid()
    AND public.is_teacher_of_class(public.attendance.class_id)
  )
);

-- ============================================================
-- RLS POLICIES — ANNOUNCEMENTS
-- ============================================================

DROP POLICY IF EXISTS "select_announcements" ON public.announcements;
CREATE POLICY "select_announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.announcements.target_audience = 'all'
  OR (
    public.announcements.target_audience = 'students'
    AND public.get_current_user_role() = 'student'
  )
  OR (
    public.announcements.target_audience = 'teachers'
    AND public.get_current_user_role() = 'teacher'
  )
  OR (
    public.announcements.target_audience = 'parents'
    AND public.get_current_user_role() = 'parent'
  )
);

DROP POLICY IF EXISTS "insert_announcements" ON public.announcements;
CREATE POLICY "insert_announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_announcements" ON public.announcements;
CREATE POLICY "update_announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_announcements" ON public.announcements;
CREATE POLICY "delete_announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — SCHEDULES
-- ============================================================

DROP POLICY IF EXISTS "select_schedules" ON public.schedules;
CREATE POLICY "select_schedules"
ON public.schedules FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.schedules.teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = auth.uid() AND s.class_id = public.schedules.class_id
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.class_id = public.schedules.class_id
  )
);

DROP POLICY IF EXISTS "insert_schedules" ON public.schedules;
CREATE POLICY "insert_schedules"
ON public.schedules FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_schedules" ON public.schedules;
CREATE POLICY "update_schedules"
ON public.schedules FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_schedules" ON public.schedules;
CREATE POLICY "delete_schedules"
ON public.schedules FOR DELETE
TO authenticated
USING (public.is_admin());