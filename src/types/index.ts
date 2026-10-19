export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade_level: string;
  section: string | null;
  homeroom_teacher_id: string | null;
  academic_year: string;
  capacity: number;
  created_at: string;
  homeroom_teacher?: Profile | null;
  enrollment_count?: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  grade_level?: 'grade_10' | 'grade_11' | 'both';
  is_core?: boolean;
  allowed_tracks?: string[];
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  created_at: string;
  class?: SchoolClass;
  subject?: Subject;
  teacher?: Profile;
}

export interface Student {
  id: string;
  student_number: string;
  date_of_birth: string | null;
  class_id: string | null;
  enrollment_date: string;
  created_at: string;
  profile?: Profile;
  class?: SchoolClass;
  track?: 'engineering_cs' | 'medical_life' | null;
  specialization_subject_id?: string | null;
  specialization_subject?: Subject | null;
}

export interface Teacher {
  id: string;
  employee_number: string;
  specialization: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Parent {
  id: string;
  occupation: string | null;
  created_at: string;
  profile?: Profile;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  created_at: string;
  parent?: Profile;
  student?: Profile & { student?: Student };
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: string;
  status: 'active' | 'transferred' | 'graduated';
  created_at: string;
  student?: Profile & { student?: Student };
  class?: SchoolClass;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  grade_type: 'exam' | 'quiz' | 'assignment' | 'midterm' | 'final';
  title: string;
  score: number;
  max_score: number;
  term: 'first' | 'second';
  created_at: string;
  updated_at: string;
  student?: Profile;
  subject?: Subject;
  class?: SchoolClass;
  teacher?: Profile;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  due_date: string;
  max_score: number;
  created_at: string;
  subject?: Subject;
  class?: SchoolClass;
  teacher?: Profile;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  student?: Profile & { student?: Student };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'students' | 'teachers' | 'parents';
  created_by: string;
  created_at: string;
  created_by_profile?: Profile;
}

export interface Schedule {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  created_at: string;
  subject?: Subject;
  class?: SchoolClass;
  teacher?: Profile;
}

export interface TeacherPost {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  title: string;
  content: string;
  post_type: 'news' | 'exam' | 'file' | 'reminder';
  file_url: string | null;
  created_at: string;
  teacher?: Profile;
  subject?: Subject;
  class?: SchoolClass;
}

export type SlotStatus = 'empty' | 'pending' | 'active' | 'suspended';

export interface TeacherSlot {
  id: string;
  slot_number: number;
  full_name: string | null;
  email: string | null;
  username: string | null;
  subject_taught: string | null;
  account_status: SlotStatus;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSlot {
  id: string;
  slot_number: number;
  class_id: string;
  full_name: string | null;
  username: string | null;
  track: 'engineering_cs' | 'medical_life' | null;
  specialization_subject_id: string | null;
  account_status: SlotStatus;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  class?: SchoolClass;
  specialization_subject?: Subject | null;
}
