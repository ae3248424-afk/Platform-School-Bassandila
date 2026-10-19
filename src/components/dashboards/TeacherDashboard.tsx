import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Spinner, EmptyState } from '@/components/ui/States';
import {
  BookOpen, GraduationCap, ClipboardList, Calendar, Megaphone,
  Plus, Edit, Trash2, Users, CheckCircle, XCircle, Clock, FileText,
} from 'lucide-react';
import type { Profile, Subject, SchoolClass, ClassSubject, Assignment, Grade, Attendance, Announcement, TeacherPost } from '@/types';

type Tab = 'overview' | 'classes' | 'grades' | 'assignments' | 'attendance' | 'posts' | 'announcements';

export default function TeacherDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <DashboardLayout activeTab={tab} onTabChange={(k) => setTab(k as Tab)}>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'classes' && <ClassesTab />}
      {tab === 'grades' && <GradesTab />}
      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
    </DashboardLayout>
  );
}

function useTeacherData() {
  const { profile } = useAuth();
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('class_subjects')
      .select('*, class:classes(*), subject:subjects(*), teacher:profiles(*)')
      .eq('teacher_id', profile.id);
    setClassSubjects((data as unknown as ClassSubject[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetch(); }, [fetch]);
  return { profile, classSubjects, loading, refetch: fetch };
}

function OverviewTab() {
  const { profile, classSubjects, loading } = useTeacherData();
  const [studentCount, setStudentCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const classIds = classSubjects.map(cs => cs.class_id);
      if (classIds.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds);
        setStudentCount(count || 0);
      }
      const { count: ac } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', profile.id);
      setAssignmentCount(ac || 0);
      const { data: recent } = await supabase
        .from('assignments')
        .select('*, subject:subjects(*), class:classes(*)')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentAssignments((recent as unknown as Assignment[]) || []);
    })();
  }, [profile, classSubjects]);

  if (loading) return <Spinner message="جاري التحميل..." />;

  const uniqueSubjects = new Set(classSubjects.map(cs => cs.subject_id));
  const uniqueClasses = new Set(classSubjects.map(cs => cs.class_id));

  return (
    <>
      <PageHeader title={`أهلاً، ${profile?.full_name || 'مدرس'}`} description="نظرة عامة على نشاطك" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="فصولي" value={uniqueClasses.size} icon={<BookOpen size={24} />} color="primary" />
        <StatCard title="موادي" value={uniqueSubjects.size} icon={<BookOpen size={24} />} color="accent" />
        <StatCard title="إجمالي الطلاب" value={studentCount} icon={<Users size={24} />} color="success" />
        <StatCard title="الواجبات" value={assignmentCount} icon={<ClipboardList size={24} />} color="warning" />
      </div>
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث الواجبات</h3>
        {recentAssignments.length === 0 ? (
          <EmptyState title="لا توجد واجبات بعد" icon={<ClipboardList size={40} />} />
        ) : (
          <div className="space-y-3">
            {recentAssignments.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.subject?.name} — {a.class?.name}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(a.due_date).toLocaleDateString('ar-EG')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ClassesTab() {
  const { classSubjects, loading } = useTeacherData();

  if (loading) return <Spinner />;
  return (
    <>
      <PageHeader title="فصولي وموادي" description="الفصول والمواد المعين عليها" />
      {classSubjects.length === 0 ? (
        <div className="card"><EmptyState title="لم يتم تعيينك على فصول بعد" icon={<BookOpen size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classSubjects.map(cs => (
            <div key={cs.id} className="card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cs.subject?.name || '—'}</h3>
                  <Badge variant="primary">{cs.subject?.code}</Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">الفصل: {cs.class?.name || '—'}</p>
              <p className="text-xs text-gray-400 mt-1">{cs.class?.grade_level}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GradesTab() {
  const { profile, classSubjects, loading } = useTeacherData();
  const [selectedCS, setSelectedCS] = useState<ClassSubject | null>(null);
  const [students, setStudents] = useState<(Profile & { student?: { student_number: string } })[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [form, setForm] = useState({ title: '', score: '', max_score: '100', grade_type: 'exam', term: 'first' });
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  const fetchStudents = useCallback(async (classId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, student:students(student_number)')
      .eq('role', 'student')
      .eq('student.class_id', classId)
      .order('full_name');
    setStudents((data as typeof students) || []);
  }, []);

  const fetchGrades = useCallback(async (classId: string, subjectId: string) => {
    const { data } = await supabase
      .from('grades')
      .select('*, student:profiles(full_name), subject:subjects(*)')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
    setGrades((data as unknown as Grade[]) || []);
  }, []);

  useEffect(() => {
    if (selectedCS) {
      fetchStudents(selectedCS.class_id);
      fetchGrades(selectedCS.class_id, selectedCS.subject_id);
    }
  }, [selectedCS, fetchStudents, fetchGrades]);

  const openAddGrade = (student: Profile) => {
    setSelectedStudent(student);
    setEditGrade(null);
    setForm({ title: '', score: '', max_score: '100', grade_type: 'exam', term: 'first' });
    setModalOpen(true);
  };

  const openEditGrade = (grade: Grade) => {
    setEditGrade(grade);
    setSelectedStudent(null);
    setForm({ title: grade.title, score: String(grade.score), max_score: String(grade.max_score), grade_type: grade.grade_type, term: grade.term });
    setModalOpen(true);
  };

  const saveGrade = async () => {
    if (!profile || !selectedCS) return;
    const payload = {
      title: form.title,
      score: parseFloat(form.score),
      max_score: parseFloat(form.max_score),
      grade_type: form.grade_type,
      term: form.term,
      subject_id: selectedCS.subject_id,
      class_id: selectedCS.class_id,
      teacher_id: profile.id,
      student_id: editGrade ? editGrade.student_id : selectedStudent?.id,
    };
    if (editGrade) {
      await supabase.from('grades').update(payload).eq('id', editGrade.id);
    } else {
      await supabase.from('grades').insert(payload);
    }
    setModalOpen(false);
    fetchGrades(selectedCS.class_id, selectedCS.subject_id);
  };

  const deleteGrade = async (id: string) => {
    if (!selectedCS) return;
    if (!confirm('هل أنت متأكد؟')) return;
    await supabase.from('grades').delete().eq('id', id);
    fetchGrades(selectedCS.class_id, selectedCS.subject_id);
  };

  const gradeTypeLabels: Record<string, string> = { exam: 'اختبار', quiz: 'quiz', assignment: 'واجب', midterm: 'منتصف الفصل', final: 'نهائي' };
  const studentGrades = (studentId: string) => grades.filter(g => g.student_id === studentId);

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="تسجيل الدرجات" description="إدارة درجات الطلاب" />
      {classSubjects.length === 0 ? (
        <div className="card"><EmptyState title="لم يتم تعيينك على فصول بعد" icon={<GraduationCap size={40} />} /></div>
      ) : (
        <>
          <div className="card p-4 mb-4">
            <label className="label">اختر الفصل والمادة</label>
            <select
              value={selectedCS?.id || ''}
              onChange={(e) => {
                const cs = classSubjects.find(c => c.id === e.target.value);
                setSelectedCS(cs || null);
              }}
              className="input-field"
            >
              <option value="">— اختر —</option>
              {classSubjects.map(cs => (
                <option key={cs.id} value={cs.id}>{cs.subject?.name} — {cs.class?.name}</option>
              ))}
            </select>
          </div>

          {selectedCS && (
            <div className="space-y-4">
              {students.length === 0 ? (
                <div className="card"><EmptyState title="لا يوجد طلاب في هذا الفصل" icon={<Users size={40} />} /></div>
              ) : (
                students.map(s => (
                  <div key={s.id} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                          {s.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.student?.student_number}</p>
                        </div>
                      </div>
                      <button onClick={() => openAddGrade(s)} className="btn-primary text-sm flex items-center gap-1.5">
                        <Plus size={16} /> إضافة درجة
                      </button>
                    </div>
                    <div className="space-y-2">
                      {studentGrades(s.id).length === 0 ? (
                        <p className="text-sm text-gray-400">لا توجد درجات مسجلة</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {studentGrades(s.id).map(g => (
                            <div key={g.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-xs text-gray-500">{gradeTypeLabels[g.grade_type]}</p>
                                <p className="text-sm font-medium">{g.title}: {g.score}/{g.max_score}</p>
                              </div>
                              <button onClick={() => openEditGrade(g)} className="p-1 text-gray-400 hover:text-primary-600"><Edit size={14} /></button>
                              <button onClick={() => deleteGrade(g.id)} className="p-1 text-gray-400 hover:text-error-600"><Trash2 size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGrade ? 'تعديل درجة' : 'إضافة درجة'} size="sm">
        <div className="space-y-4">
          {selectedStudent && <p className="text-sm text-gray-600">الطالب: <span className="font-medium">{selectedStudent.full_name}</span></p>}
          <div>
            <label className="label">عنوان الدرجة</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="مثال: اختبار الفصل الأول" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">الدرجة</label>
              <input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">الدرجة العظمى</label>
              <input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">النوع</label>
              <select value={form.grade_type} onChange={(e) => setForm({ ...form, grade_type: e.target.value })} className="input-field">
                <option value="exam">اختبار</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">واجب</option>
                <option value="midterm">منتصف الفصل</option>
                <option value="final">نهائي</option>
              </select>
            </div>
            <div>
              <label className="label">الفصل الدراسي</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="input-field">
                <option value="first">الفصل الأول</option>
                <option value="second">الفصل الثاني</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button onClick={saveGrade} className="btn-primary">{editGrade ? 'حفظ' : 'إضافة'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AssignmentsTab() {
  const { profile, classSubjects, loading } = useTeacherData();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', class_subject_id: '', due_date: '', max_score: '100' });

  const fetchAssignments = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('assignments')
      .select('*, subject:subjects(*), class:classes(*)')
      .eq('teacher_id', profile.id)
      .order('due_date', { ascending: false });
    setAssignments((data as unknown as Assignment[]) || []);
  }, [profile]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const save = async () => {
    if (!profile) return;
    const cs = classSubjects.find(c => c.id === form.class_subject_id);
    if (!cs) return;
    await supabase.from('assignments').insert({
      title: form.title,
      description: form.description || null,
      subject_id: cs.subject_id,
      class_id: cs.class_id,
      teacher_id: profile.id,
      due_date: form.due_date,
      max_score: parseFloat(form.max_score),
    });
    setModalOpen(false);
    setForm({ title: '', description: '', class_subject_id: '', due_date: '', max_score: '100' });
    fetchAssignments();
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return;
    await supabase.from('assignments').delete().eq('id', id);
    fetchAssignments();
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="الواجبات" description="إنشاء وإدارة الواجبات"
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> واجب جديد</button>}
      />
      {assignments.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد واجبات" icon={<ClipboardList size={40} />} action={<button onClick={() => setModalOpen(true)} className="btn-primary">إنشاء واجب</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assignments.map(a => (
            <div key={a.id} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <button onClick={() => remove(a.id)} className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
              {a.description && <p className="text-sm text-gray-600 mb-3">{a.description}</p>}
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{a.subject?.name}</Badge>
                <Badge variant="gray">{a.class?.name}</Badge>
                <Badge variant="warning">التسليم: {new Date(a.due_date).toLocaleDateString('ar-EG')}</Badge>
                <Badge variant="accent">من {a.max_score}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="واجب جديد">
        <div className="space-y-4">
          <div>
            <label className="label">العنوان</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} />
          </div>
          <div>
            <label className="label">الفصل والمادة</label>
            <select value={form.class_subject_id} onChange={(e) => setForm({ ...form, class_subject_id: e.target.value })} className="input-field">
              <option value="">— اختر —</option>
              {classSubjects.map(cs => <option key={cs.id} value={cs.id}>{cs.subject?.name} — {cs.class?.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">تاريخ التسليم</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">الدرجة العظمى</label>
              <input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button onClick={save} className="btn-primary">إنشاء</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AttendanceTab() {
  const { profile, classSubjects, loading } = useTeacherData();
  const [selectedCS, setSelectedCS] = useState<ClassSubject | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<(Profile & { student?: { student_number: string } })[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchStudents = useCallback(async (classId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, student:students(student_number)')
      .eq('role', 'student')
      .eq('student.class_id', classId)
      .order('full_name');
    setStudents((data as typeof students) || []);
  }, []);

  const fetchAttendance = useCallback(async (classId: string, d: string) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('date', d);
    const map: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    (data as Attendance[])?.forEach(a => { map[a.student_id] = a.status; });
    setAttendance(map);
  }, []);

  useEffect(() => {
    if (selectedCS) {
      fetchStudents(selectedCS.class_id);
      fetchAttendance(selectedCS.class_id, date);
      setSaved(false);
    }
  }, [selectedCS, date, fetchStudents, fetchAttendance]);

  const setStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const save = async () => {
    if (!profile || !selectedCS) return;
    setSaving(true);
    const records = students.map(s => ({
      student_id: s.id,
      class_id: selectedCS.class_id,
      date,
      status: attendance[s.id] || 'present',
      recorded_by: profile.id,
    }));
    for (const r of records) {
      await supabase
        .from('attendance')
        .upsert(r, { onConflict: 'student_id,class_id,date' });
    }
    setSaving(false);
    setSaved(true);
  };

  const statusConfig = {
    present: { label: 'حاضر', icon: <CheckCircle size={16} />, color: 'success' as const, bg: 'bg-success-50 text-success-700 border-success-300' },
    absent: { label: 'غائب', icon: <XCircle size={16} />, color: 'error' as const, bg: 'bg-error-50 text-error-700 border-error-300' },
    late: { label: 'متأخر', icon: <Clock size={16} />, color: 'warning' as const, bg: 'bg-warning-50 text-warning-700 border-warning-300' },
    excused: { label: 'بعذر', icon: <Clock size={16} />, color: 'gray' as const, bg: 'bg-gray-50 text-gray-700 border-gray-300' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="الحضور والغياب" description="تسجيل حضور الطلاب" />
      {classSubjects.length === 0 ? (
        <div className="card"><EmptyState title="لم يتم تعيينك على فصول بعد" icon={<Calendar size={40} />} /></div>
      ) : (
        <>
          <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="label">الفصل والمادة</label>
              <select value={selectedCS?.id || ''} onChange={(e) => setSelectedCS(classSubjects.find(c => c.id === e.target.value) || null)} className="input-field">
                <option value="">— اختر —</option>
                {classSubjects.map(cs => <option key={cs.id} value={cs.id}>{cs.subject?.name} — {cs.class?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
            </div>
          </div>

          {selectedCS && students.length > 0 && (
            <>
              <div className="space-y-2 mb-4">
                {students.map(s => (
                  <div key={s.id} className="card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {s.full_name?.charAt(0) || '?'}
                    </div>
                    <p className="text-sm font-medium text-gray-900 flex-1">{s.full_name}</p>
                    <div className="flex gap-1.5">
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setStatus(s.id, key as 'present' | 'absent' | 'late' | 'excused')}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                            attendance[s.id] === key ? cfg.bg : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'جاري الحفظ...' : 'حفظ الحضور'}</button>
                {saved && <span className="text-sm text-success-600 flex items-center gap-1"><CheckCircle size={16} /> تم الحفظ بنجاح</span>}
              </div>
            </>
          )}
          {selectedCS && students.length === 0 && (
            <div className="card"><EmptyState title="لا يوجد طلاب في هذا الفصل" icon={<Users size={40} />} /></div>
          )}
        </>
      )}
    </>
  );
}

function AnnouncementsTab() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, created_by_profile:profiles!announcements_created_by_fkey(full_name)')
        .or('target_audience.eq.all,target_audience.eq.teachers')
        .order('created_at', { ascending: false });
      setAnnouncements((data as unknown as Announcement[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="الإعلانات" description="إعلانات المدرسة" />
      {announcements.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد إعلانات" icon={<Megaphone size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="card p-5 card-hover">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><Megaphone size={18} /></div>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">{a.content}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{a.created_by_profile?.full_name || 'الإدارة'}</span>
                <span>•</span>
                <span>{new Date(a.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PostsTab() {
  const { profile, classSubjects, loading } = useTeacherData();
  const [posts, setPosts] = useState<TeacherPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState<TeacherPost | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    post_type: 'news' as 'news' | 'exam' | 'file' | 'reminder',
    file_url: '',
    class_subject_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!profile) return;
    setPostsLoading(true);
    const { data } = await supabase
      .from('teacher_posts')
      .select('*, subject:subjects(*), class:classes(*)')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    setPosts((data as unknown as TeacherPost[]) || []);
    setPostsLoading(false);
  }, [profile]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const openAdd = () => {
    setEditPost(null);
    setForm({ title: '', content: '', post_type: 'news', file_url: '', class_subject_id: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (post: TeacherPost) => {
    const cs = classSubjects.find(c => c.class_id === post.class_id && c.subject_id === post.subject_id);
    setEditPost(post);
    setForm({
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      file_url: post.file_url || '',
      class_subject_id: cs?.id || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!profile) return;
    const cs = classSubjects.find(c => c.id === form.class_subject_id);
    if (!cs) { setError('اختر الفصل والمادة'); return; }
    if (!form.title.trim()) { setError('العنوان مطلوب'); return; }
    if (!form.content.trim()) { setError('المحتوى مطلوب'); return; }

    setSaving(true);
    const payload = {
      teacher_id: profile.id,
      subject_id: cs.subject_id,
      class_id: cs.class_id,
      title: form.title.trim(),
      content: form.content.trim(),
      post_type: form.post_type,
      file_url: form.file_url.trim() || null,
    };
    if (editPost) {
      await supabase.from('teacher_posts').update(payload).eq('id', editPost.id);
    } else {
      await supabase.from('teacher_posts').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchPosts();
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    await supabase.from('teacher_posts').delete().eq('id', id);
    fetchPosts();
  };

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    news: { label: 'خبر', icon: <Megaphone size={16} />, bg: 'bg-primary-50 text-primary-600' },
    exam: { label: 'امتحان', icon: <ClipboardList size={16} />, bg: 'bg-warning-50 text-warning-600' },
    file: { label: 'ملف', icon: <FileText size={16} />, bg: 'bg-accent-50 text-accent-600' },
    reminder: { label: 'تذكير', icon: <Clock size={16} />, bg: 'bg-success-50 text-success-600' },
  };

  if (loading || postsLoading) return <Spinner message="جاري التحميل..." />;

  return (
    <>
      <PageHeader
        title="منشوراتي"
        description="نشر أخبار وامتحانات وملفات وتذكيرات للفصول والمواد المسندة إليك"
        action={
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5">
            <Plus size={18} /> منشور جديد
          </button>
        }
      />

      {classSubjects.length === 0 ? (
        <div className="card"><EmptyState title="لم يتم تعيينك على فصول بعد" icon={<FileText size={40} />} /></div>
      ) : posts.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد منشورات بعد" icon={<FileText size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => {
            const cfg = typeConfig[p.post_type] || typeConfig.news;
            return (
              <div key={p.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="primary">{cfg.label}</Badge>
                        <span className="text-xs text-gray-500">{p.subject?.name} — {p.class?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => remove(p.id)} className="p-2 text-gray-400 hover:text-error-600 rounded-lg hover:bg-error-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{p.content}</p>
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2">
                    <FileText size={16} /> عرض الملف المرفق
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-3">{new Date(p.created_at).toLocaleDateString('ar-EG')}</p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPost ? 'تعديل المنشور' : 'منشور جديد'}>
        <div className="space-y-4">
          <div>
            <label className="label">الفصل والمادة</label>
            <select
              value={form.class_subject_id}
              onChange={(e) => setForm({ ...form, class_subject_id: e.target.value })}
              className="input-field"
            >
              <option value="">— اختر —</option>
              {classSubjects.map(cs => (
                <option key={cs.id} value={cs.id}>{cs.subject?.name} — {cs.class?.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">يمكنك النشر للفصول والمواد المسندة إليك فقط</p>
          </div>
          <div>
            <label className="label">النوع</label>
            <select
              value={form.post_type}
              onChange={(e) => setForm({ ...form, post_type: e.target.value as 'news' | 'exam' | 'file' | 'reminder' })}
              className="input-field"
            >
              <option value="news">خبر</option>
              <option value="exam">امتحان</option>
              <option value="file">ملف</option>
              <option value="reminder">تذكير</option>
            </select>
          </div>
          <div>
            <label className="label">العنوان</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="عنوان المنشور"
            />
          </div>
          <div>
            <label className="label">المحتوى</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input-field min-h-[120px] resize-y"
              placeholder="اكتب محتوى المنشور..."
              rows={5}
            />
          </div>
          <div>
            <label className="label">رابط الملف (اختياري)</label>
            <input
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              className="input-field"
              placeholder="https://..."
            />
          </div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
