import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Spinner, EmptyState, ErrorState } from '@/components/ui/States';
import { adminCreateUser, adminResetPassword, generateRandomPassword } from '@/lib/adminApi';
import { parseCSV } from '@/lib/csv';
import {
  Users, GraduationCap, UserCircle, BookOpen, Megaphone, BarChart3,
  Plus, Edit, Trash2, Search, Heart, Calendar, FileText, Upload,
  KeyRound, UserPlus, AlertCircle, CheckCircle, XCircle,
} from 'lucide-react';
import type { Profile, UserRole, SchoolClass, Subject, Announcement, ParentStudentLink } from '@/types';
import TeacherSlotsTab from '@/components/dashboards/TeacherSlotsTab';
import StudentSlotsTab from '@/components/dashboards/StudentSlotsTab';

type Tab = 'overview' | 'users' | 'student_slots' | 'teacher_slots' | 'students' | 'teachers' | 'parents' | 'classes' | 'subjects' | 'schedules' | 'announcements' | 'reports';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <DashboardLayout activeTab={tab} onTabChange={(k) => setTab(k as Tab)}>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'student_slots' && <StudentSlotsTab />}
      {tab === 'teacher_slots' && <TeacherSlotsTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'teachers' && <TeachersTab />}
      {tab === 'parents' && <ParentsTab />}
      {tab === 'classes' && <ClassesTab />}
      {tab === 'subjects' && <SubjectsTab />}
      {tab === 'schedules' && <SchedulesTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'reports' && <ReportsTab />}
    </DashboardLayout>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, parents: 0, classes: 0, subjects: 0, activeAccounts: 0 });
  const [slotStats, setSlotStats] = useState({ teacherFilled: 0, teacherTotal: 100, studentFilled: 0, studentTotal: 1260 });
  const [loading, setLoading] = useState(true);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    (async () => {
      const [students, teachers, parents, classes, subjects, active, announcements, tSlots, sSlots] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('announcements').select('*, created_by_profile:profiles!announcements_created_by_fkey(full_name, email)').order('created_at', { ascending: false }).limit(5),
        supabase.from('teacher_slots').select('*', { count: 'exact', head: true }).not('full_name', 'is', null),
        supabase.from('student_slots').select('*', { count: 'exact', head: true }).not('full_name', 'is', null),
      ]);
      setStats({
        students: students.count || 0,
        teachers: teachers.count || 0,
        parents: parents.count || 0,
        classes: classes.count || 0,
        subjects: subjects.count || 0,
        activeAccounts: active.count || 0,
      });
      setSlotStats({
        teacherFilled: tSlots.count || 0,
        teacherTotal: 100,
        studentFilled: sSlots.count || 0,
        studentTotal: 1260,
      });
      setRecentAnnouncements((announcements.data as unknown as Announcement[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner message="جاري تحميل البيانات..." />;

  return (
    <>
      <PageHeader title="لوحة تحكم المدير" description="نظرة عامة على المدرسة" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="إجمالي الطلاب" value={stats.students} icon={<GraduationCap size={24} />} color="primary" subtitle="الهدف: 1,260" />
        <StatCard title="المدرسون" value={stats.teachers} icon={<UserCircle size={24} />} color="accent" subtitle="الهدف: 100" />
        <StatCard title="أولياء الأمور" value={stats.parents} icon={<Heart size={24} />} color="success" />
        <StatCard title="الفصول" value={stats.classes} icon={<BookOpen size={24} />} color="warning" subtitle="سعة 60 لكل فصل" />
        <StatCard title="المواد" value={stats.subjects} icon={<FileText size={24} />} color="primary" />
        <StatCard title="الحسابات النشطة" value={stats.activeAccounts} icon={<Users size={24} />} color="accent" />
      </div>

      {/* Slot fill progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCircle size={20} className="text-accent-600" />
              <h3 className="font-semibold text-gray-900">سجلات المدرسين</h3>
            </div>
            <Badge variant={slotStats.teacherFilled === slotStats.teacherTotal ? 'success' : 'warning'}>
              {slotStats.teacherFilled} / {slotStats.teacherTotal}
            </Badge>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${(slotStats.teacherFilled / slotStats.teacherTotal) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">عدد السجلات المُعبأة من إجمالي 100 سجل</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap size={20} className="text-primary-600" />
              <h3 className="font-semibold text-gray-900">سجلات الطلاب</h3>
            </div>
            <Badge variant={slotStats.studentFilled === slotStats.studentTotal ? 'success' : 'warning'}>
              {slotStats.studentFilled} / {slotStats.studentTotal}
            </Badge>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(slotStats.studentFilled / slotStats.studentTotal) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">عدد السجلات المُعبأة من إجمالي 1,260 سجل (21 فصل × 60)</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">أحدث الإعلانات</h3>
        {recentAnnouncements.length === 0 ? (
          <EmptyState title="لا توجد إعلانات" icon={<Megaphone size={40} />} />
        ) : (
          <div className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate">{a.content}</p>
                </div>
                <Badge variant="gray">{a.target_audience === 'all' ? 'للجميع' : a.target_audience}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function UsersTab() {
  const { refreshProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setUsers((data as Profile[]) || []);
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    !search || u.full_name?.includes(search) || u.email?.includes(search) || u.username?.includes(search)
  );

  const openEdit = (u: Profile) => {
    setEditUser(u);
    setEditFullName(u.full_name);
    setEditRole(u.role);
    setEditActive(u.is_active);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: editFullName, role: editRole, is_active: editActive })
      .eq('id', editUser.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditUser(null);
    fetchUsers();
    refreshProfile();
  };

  const toggleActive = async (u: Profile) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: !u.is_active })
      .eq('id', u.id);
    if (!err) fetchUsers();
  };

  const openReset = (u: Profile) => {
    setResetTarget(u);
    setNewPassword(generateRandomPassword());
    setResetMsg(null);
  };

  const doReset = async () => {
    if (!resetTarget || !newPassword) return;
    setResetting(true);
    setResetMsg(null);
    const result = await adminResetPassword(resetTarget.id, newPassword);
    setResetting(false);
    if (result.success) {
      setResetMsg({ type: 'success', text: 'تم إعادة تعيين كلمة المرور بنجاح' });
    } else {
      setResetMsg({ type: 'error', text: result.error || 'فشل إعادة التعيين' });
    }
  };

  const roleLabels: Record<UserRole, string> = { admin: 'مدير', teacher: 'مدرس', student: 'طالب', parent: 'ولي أمر' };
  const roleColors: Record<UserRole, 'primary' | 'accent' | 'success' | 'warning'> = { admin: 'warning', teacher: 'accent', student: 'primary', parent: 'success' };

  return (
    <>
      <PageHeader title="إدارة المستخدمين" description="عرض وإدارة جميع مستخدمي النظام" />
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد أو اسم المستخدم..." className="input-field pr-10" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field sm:w-48">
            <option value="all">جميع الأدوار</option>
            <option value="admin">مدير</option>
            <option value="teacher">مدرس</option>
            <option value="student">طالب</option>
            <option value="parent">ولي أمر</option>
          </select>
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={fetchUsers} />}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="card"><EmptyState title="لا يوجد مستخدمون" icon={<Users size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">الاسم</th>
                  <th className="table-header">البريد</th>
                  <th className="table-header">اسم المستخدم</th>
                  <th className="table-header">الدور</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{u.full_name || '—'}</td>
                    <td className="table-cell text-gray-600">{u.email}</td>
                    <td className="table-cell text-gray-600">{u.username || '—'}</td>
                    <td className="table-cell"><Badge variant={roleColors[u.role]}>{roleLabels[u.role]}</Badge></td>
                    <td className="table-cell"><Badge variant={u.is_active ? 'success' : 'error'}>{u.is_active ? 'نشط' : 'موقوف'}</Badge></td>
                    <td className="table-cell">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                        <button onClick={() => openReset(u)} className="p-1.5 text-gray-500 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors" title="إعادة تعيين كلمة المرور"><KeyRound size={16} /></button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 text-gray-500 hover:text-warning-600 hover:bg-warning-50 rounded-lg transition-colors" title="تفعيل/إيقاف">{u.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="تعديل مستخدم">
        <div className="space-y-4">
          <div><label className="label">الاسم الكامل</label><input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="input-field" /></div>
          <div><label className="label">الدور</label>
            <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="input-field">
              <option value="admin">مدير</option><option value="teacher">مدرس</option><option value="student">طالب</option><option value="parent">ولي أمر</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="active" className="text-sm text-gray-700">الحساب نشط</label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setEditUser(null)} className="btn-secondary">إلغاء</button>
            <button onClick={saveEdit} disabled={saving} className="btn-primary">{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          </div>
        </div>
      </Modal>
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="إعادة تعيين كلمة المرور" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">المستخدم: <span className="font-medium">{resetTarget?.full_name}</span></p>
          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <div className="flex gap-2">
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" />
              <button onClick={() => setNewPassword(generateRandomPassword())} className="btn-secondary">توليد</button>
            </div>
          </div>
          {resetMsg && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${resetMsg.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>
              {resetMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {resetMsg.text}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setResetTarget(null)} className="btn-secondary">إغلاق</button>
            <button onClick={doReset} disabled={resetting} className="btn-primary">{resetting ? 'جاري...' : 'إعادة التعيين'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface ImportResult {
  success: number;
  errors: string[];
}

function StudentsTab() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<(Profile & { student?: { student_number: string; class_id: string | null; date_of_birth: string | null; track: string | null; specialization_subject_id: string | null } })[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: '', student_number: '', username: '', email: '', password: '', class_id: '', track: '' as '' | 'engineering_cs' | 'medical_life', specialization_subject_id: '' });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, student:students(*)').eq('role', 'student').order('created_at', { ascending: false });
    setStudents((data as typeof students) || []);
    setLoading(false);
  }, []);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses((data as SchoolClass[]) || []);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    setSubjects((data as Subject[]) || []);
  }, []);

  useEffect(() => { fetchStudents(); fetchClasses(); fetchSubjects(); }, [fetchStudents, fetchClasses, fetchSubjects]);

  const filtered = students.filter(s =>
    !search || s.full_name?.includes(search) || s.email?.includes(search) ||
    s.username?.includes(search) || s.student?.student_number?.includes(search)
  );

  const classMap = new Map(classes.map(c => [c.id, c]));
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  const selectedClass = form.class_id ? classMap.get(form.class_id) : null;
  const isGrade11 = selectedClass?.grade_level === 'الصف الثاني الثانوي';

  // Elective subjects based on track
  const trackElectives = subjects.filter(s => {
    if (!form.track) return false;
    return s.allowed_tracks?.includes(form.track);
  });

  const assignClass = async (studentId: string, classId: string) => {
    const { error } = await supabase.from('students').update({ class_id: classId || null }).eq('id', studentId);
    if (error) { alert(error.message); return; }
    fetchStudents();
  };

  const addStudent = async () => {
    if (!form.full_name || !form.email || !form.password || !form.student_number) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const result = await adminCreateUser({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      role: 'student',
      username: form.username || undefined,
      student_number: form.student_number,
      class_id: form.class_id || undefined,
      track: (isGrade11 && form.track) ? form.track : undefined,
      specialization_subject_id: (isGrade11 && form.specialization_subject_id) ? form.specialization_subject_id : undefined,
    });
    if (!result.success) { alert(result.error); return; }
    setAddModal(false);
    setForm({ full_name: '', student_number: '', username: '', email: '', password: '', class_id: '', track: '', specialization_subject_id: '' });
    fetchStudents();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const errors: string[] = [];
    let success = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = row['full_name'] || row['الاسم'] || '';
      const studentNumber = row['student_number'] || row['رقم_الطالب'] || '';
      const username = row['username'] || row['اسم_المستخدم'] || '';
      const email = row['email'] || row['البريد'] || '';
      const className = row['class_name'] || row['الفصل'] || '';
      const track = (row['track'] || row['المسار'] || '') as 'engineering_cs' | 'medical_life' | '';
      const password = generateRandomPassword();

      if (!fullName || !email || !studentNumber) {
        errors.push(`الصف ${i + 2}: بيانات ناقصة`);
        continue;
      }

      const classId = className ? classes.find(c => c.name === className)?.id : undefined;
      const cls = classId ? classMap.get(classId) : null;
      const isG11 = cls?.grade_level === 'الصف الثاني الثانوي';

      const result = await adminCreateUser({
        email, password, full_name: fullName, role: 'student',
        username: username || undefined, student_number: studentNumber, class_id: classId,
        track: (isG11 && (track === 'engineering_cs' || track === 'medical_life')) ? track : undefined,
      });

      if (result.success) success++;
      else errors.push(`الصف ${i + 2}: ${result.error}`);
    }

    setImportResult({ success, errors });
    setImporting(false);
    fetchStudents();
    if (fileRef.current) fileRef.current.value = '';
  };

  const trackLabels: Record<string, string> = { engineering_cs: 'هندسة وعلوم حاسب', medical_life: 'طب وعلوم حياة' };

  return (
    <>
      <PageHeader title="إدارة الطلاب" description="إضافة واستيراد وتعديل بيانات الطلاب"
        action={
          <div className="flex gap-2">
            <button onClick={() => setImportModal(true)} className="btn-secondary flex items-center gap-2"><Upload size={18} /> استيراد CSV</button>
            <button onClick={() => { setForm({ full_name: '', student_number: '', username: '', email: '', password: generateRandomPassword(), class_id: '', track: '', specialization_subject_id: '' }); setAddModal(true); }} className="btn-primary flex items-center gap-2"><UserPlus size={18} /> إضافة طالب</button>
          </div>
        }
      />
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الطالب أو اسم المستخدم..." className="input-field pr-10" />
        </div>
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="card"><EmptyState title="لا يوجد طلاب — أضف طلابًا أو استوردهم من CSV" icon={<GraduationCap size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">الاسم</th>
                  <th className="table-header">رقم الطالب</th>
                  <th className="table-header">اسم المستخدم</th>
                  <th className="table-header">الفصل</th>
                  <th className="table-header">المسار</th>
                  <th className="table-header">مادة التخصص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(s => {
                  const cls = s.student?.class_id ? classMap.get(s.student.class_id) : null;
                  const specSubj = s.student?.specialization_subject_id ? subjectMap.get(s.student.specialization_subject_id) : null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{s.full_name || '—'}</td>
                      <td className="table-cell">{s.student?.student_number || '—'}</td>
                      <td className="table-cell text-gray-600">{s.username || '—'}</td>
                      <td className="table-cell">
                        <select value={s.student?.class_id || ''} onChange={(e) => assignClass(s.id, e.target.value)} className="input-field text-sm py-1.5">
                          <option value="">بدون فصل</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="table-cell">
                        {s.student?.track ? <Badge variant="accent">{trackLabels[s.student.track] || s.student.track}</Badge> : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="table-cell">{specSubj?.name || <span className="text-gray-400 text-sm">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="إضافة طالب جديد">
        <div className="space-y-4">
          <div><label className="label">الاسم الكامل *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">رقم الطالب *</label><input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} className="input-field" placeholder="STU-001" /></div>
            <div><label className="label">اسم المستخدم</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">البريد الإلكتروني *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">كلمة المرور *</label>
              <div className="flex gap-2">
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" />
                <button onClick={() => setForm({ ...form, password: generateRandomPassword() })} className="btn-secondary">توليد</button>
              </div>
            </div>
            <div><label className="label">الفصل</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, track: '', specialization_subject_id: '' })} className="input-field">
                <option value="">— بدون —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {/* Track + Specialization — only for Grade 11 */}
          {isGrade11 && (
            <div className="bg-accent-50/50 border border-accent-100 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-accent-800">مسار الطالب (الصف الثاني الثانوي)</p>
              <div>
                <label className="label">المسار *</label>
                <select
                  value={form.track}
                  onChange={(e) => setForm({ ...form, track: e.target.value as '' | 'engineering_cs' | 'medical_life', specialization_subject_id: '' })}
                  className="input-field"
                >
                  <option value="">— اختر المسار —</option>
                  <option value="engineering_cs">هندسة وعلوم حاسب</option>
                  <option value="medical_life">طب وعلوم حياة</option>
                </select>
              </div>
              {form.track && trackElectives.length > 0 && (
                <div>
                  <label className="label">مادة التخصص *</label>
                  <select
                    value={form.specialization_subject_id}
                    onChange={(e) => setForm({ ...form, specialization_subject_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">— اختر المادة —</option>
                    {trackElectives.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">المواد المتاحة لمسار {trackLabels[form.track]}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setAddModal(false)} className="btn-secondary">إلغاء</button>
            <button onClick={addStudent} className="btn-primary">إضافة</button>
          </div>
        </div>
      </Modal>
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportResult(null); }} title="استيراد طلاب من CSV">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">صيغة ملف CSV:</p>
            <p>الأعمدة المطلوبة: full_name, student_number, email</p>
            <p>أعمدة اختيارية: username, class_name, track</p>
            <p className="mt-1 text-xs">track: engineering_cs أو medical_life (للصف الثاني الثانوي فقط)</p>
            <p className="mt-2 text-xs">كلمة المرور تُولد تلقائياً لكل طالب</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} disabled={importing} className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          {importing && <Spinner message="جاري الاستيراد..." />}
          {importResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-success-50 text-success-700 rounded-lg px-3 py-2 text-sm">
                <CheckCircle size={16} /> تم استيراد {importResult.success} طالب بنجاح
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-error-50 text-error-700 rounded-lg px-3 py-2 text-sm space-y-1">
                  <p className="font-medium">أخطاء ({importResult.errors.length}):</p>
                  {importResult.errors.slice(0, 10).map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => { setImportModal(false); setImportResult(null); }} className="btn-secondary">إغلاق</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function TeachersTab() {
  const [teachers, setTeachers] = useState<(Profile & { teacher?: { employee_number: string; specialization: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: '', employee_number: '', username: '', email: '', password: '', specialization: '' });

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, teacher:teachers(*)').eq('role', 'teacher').order('created_at', { ascending: false });
    setTeachers((data as typeof teachers) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const filtered = teachers.filter(t =>
    !search || t.full_name?.includes(search) || t.email?.includes(search) ||
    t.username?.includes(search) || t.teacher?.employee_number?.includes(search)
  );

  const addTeacher = async () => {
    if (!form.full_name || !form.email || !form.password || !form.employee_number) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const result = await adminCreateUser({
      email: form.email, password: form.password, full_name: form.full_name,
      role: 'teacher', username: form.username || undefined,
      employee_number: form.employee_number, specialization: form.specialization || undefined,
    });
    if (!result.success) { alert(result.error); return; }
    setAddModal(false);
    setForm({ full_name: '', employee_number: '', username: '', email: '', password: '', specialization: '' });
    fetchTeachers();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const errors: string[] = [];
    let success = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = row['full_name'] || row['الاسم'] || '';
      const employeeNumber = row['employee_number'] || row['الرقم_الوظيفي'] || '';
      const username = row['username'] || row['اسم_المستخدم'] || '';
      const email = row['email'] || row['البريد'] || '';
      const specialization = row['specialization'] || row['التخصص'] || '';
      const password = generateRandomPassword();

      if (!fullName || !email || !employeeNumber) {
        errors.push(`الصف ${i + 2}: بيانات ناقصة`);
        continue;
      }

      const result = await adminCreateUser({
        email, password, full_name: fullName, role: 'teacher',
        username: username || undefined, employee_number: employeeNumber,
        specialization: specialization || undefined,
      });

      if (result.success) success++;
      else errors.push(`الصف ${i + 2}: ${result.error}`);
    }

    setImportResult({ success, errors });
    setImporting(false);
    fetchTeachers();
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <PageHeader title="إدارة المدرسين" description="إضافة واستيراد وتعديل بيانات المدرسين"
        action={
          <div className="flex gap-2">
            <button onClick={() => setImportModal(true)} className="btn-secondary flex items-center gap-2"><Upload size={18} /> استيراد CSV</button>
            <button onClick={() => { setForm({ full_name: '', employee_number: '', username: '', email: '', password: generateRandomPassword(), specialization: '' }); setAddModal(true); }} className="btn-primary flex items-center gap-2"><UserPlus size={18} /> إضافة مدرس</button>
          </div>
        }
      />
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم الوظيفي أو اسم المستخدم..." className="input-field pr-10" />
        </div>
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="card"><EmptyState title="لا يوجد مدرسون" icon={<UserCircle size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">الاسم</th>
                  <th className="table-header">الرقم الوظيفي</th>
                  <th className="table-header">اسم المستخدم</th>
                  <th className="table-header">التخصص</th>
                  <th className="table-header">البريد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{t.full_name || '—'}</td>
                    <td className="table-cell">{t.teacher?.employee_number || '—'}</td>
                    <td className="table-cell text-gray-600">{t.username || '—'}</td>
                    <td className="table-cell">{t.teacher?.specialization || '—'}</td>
                    <td className="table-cell text-gray-600">{t.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="إضافة مدرس جديد">
        <div className="space-y-4">
          <div><label className="label">الاسم الكامل *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">الرقم الوظيفي *</label><input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className="input-field" placeholder="EMP-001" /></div>
            <div><label className="label">اسم المستخدم</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">البريد الإلكتروني *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">كلمة المرور *</label>
              <div className="flex gap-2">
                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" />
                <button onClick={() => setForm({ ...form, password: generateRandomPassword() })} className="btn-secondary">توليد</button>
              </div>
            </div>
            <div><label className="label">التخصص</label><input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input-field" placeholder="مثال: الرياضيات" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setAddModal(false)} className="btn-secondary">إلغاء</button>
            <button onClick={addTeacher} className="btn-primary">إضافة</button>
          </div>
        </div>
      </Modal>
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportResult(null); }} title="استيراد مدرسين من CSV">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">صيغة ملف CSV:</p>
            <p>الأعمدة المطلوبة: full_name, employee_number, email</p>
            <p>أعمدة اختيارية: username, specialization</p>
            <p className="mt-2 text-xs">كلمة المرور تُولد تلقائياً لكل مدرس</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} disabled={importing} className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100" />
          {importing && <Spinner message="جاري الاستيراد..." />}
          {importResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-success-50 text-success-700 rounded-lg px-3 py-2 text-sm">
                <CheckCircle size={16} /> تم استيراد {importResult.success} مدرس بنجاح
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-error-50 text-error-700 rounded-lg px-3 py-2 text-sm space-y-1">
                  <p className="font-medium">أخطاء ({importResult.errors.length}):</p>
                  {importResult.errors.slice(0, 10).map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => { setImportModal(false); setImportResult(null); }} className="btn-secondary">إغلاق</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ParentsTab() {
  const [parents, setParents] = useState<(Profile & { parent?: { occupation: string | null }, parent_links?: ParentStudentLink[] })[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkParent, setLinkParent] = useState<Profile | null>(null);
  const [linkStudentId, setLinkStudentId] = useState('');

  const fetchParents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, parent:parents(*), parent_links:parent_student_links(*)').eq('role', 'parent').order('created_at', { ascending: false });
    setParents((data as typeof parents) || []);
    setLoading(false);
  }, []);

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'student').order('full_name');
    setStudents((data as Profile[]) || []);
  }, []);

  useEffect(() => { fetchParents(); fetchStudents(); }, [fetchParents, fetchStudents]);

  const createLink = async () => {
    if (!linkParent || !linkStudentId) return;
    await supabase.from('parent_student_links').insert({ parent_id: linkParent.id, student_id: linkStudentId });
    setLinkParent(null); setLinkStudentId(''); fetchParents();
  };

  const removeLink = async (linkId: string) => {
    await supabase.from('parent_student_links').delete().eq('id', linkId);
    fetchParents();
  };

  return (
    <>
      <PageHeader title="إدارة أولياء الأمور" description="ربط أولياء الأمور بأبنائهم" />
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parents.map(p => (
            <div key={p.id} className="card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-success-100 text-success-700 flex items-center justify-center font-semibold flex-shrink-0">{p.full_name?.charAt(0) || '?'}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{p.full_name || '—'}</p><p className="text-xs text-gray-500 truncate">{p.email}</p></div>
              </div>
              {p.parent?.occupation && <p className="text-sm text-gray-500 mb-2">المهنة: {p.parent.occupation}</p>}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <p className="text-xs text-gray-400 mb-2">الأبناء المرتبطون:</p>
                {(!p.parent_links || p.parent_links.length === 0) ? <p className="text-xs text-gray-400">لا يوجد أبناء مرتبطون</p> : (
                  <div className="space-y-1">
                    {p.parent_links.map(link => {
                      const student = students.find(s => s.id === link.student_id);
                      return <div key={link.id} className="flex items-center justify-between text-sm"><span className="text-gray-700">{student?.full_name || 'طالب محذوف'}</span><button onClick={() => removeLink(link.id)} className="text-error-500 hover:text-error-700"><Trash2 size={14} /></button></div>;
                    })}
                  </div>
                )}
                <button onClick={() => setLinkParent(p)} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium">+ ربط ابن</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!linkParent} onClose={() => setLinkParent(null)} title="ربط ابن بولي الأمر" size="sm">
        <div className="space-y-4">
          <div><label className="label">اختر الطالب</label>
            <select value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className="input-field">
              <option value="">— اختر —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setLinkParent(null)} className="btn-secondary">إلغاء</button><button onClick={createLink} className="btn-primary">ربط</button></div>
        </div>
      </Modal>
    </>
  );
}

function ClassesTab() {
  const [classes, setClasses] = useState<(SchoolClass & { homeroom_teacher?: Profile | null; _count?: { students: number } })[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState({ name: '', grade_level: '', section: '', academic_year: '2025-2026', homeroom_teacher_id: '', capacity: '60' });

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('classes').select('*, homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(*)').order('name');
    const classList = (data as typeof classes) || [];
    const enriched = await Promise.all(classList.map(async c => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', c.id);
      return { ...c, enrollment_count: count || 0 };
    }));
    setClasses(enriched);
    setLoading(false);
  }, []);

  const fetchTeachers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name');
    setTeachers((data as Profile[]) || []);
  }, []);

  useEffect(() => { fetchClasses(); fetchTeachers(); }, [fetchClasses, fetchTeachers]);

  const openAdd = () => { setEditClass(null); setForm({ name: '', grade_level: '', section: '', academic_year: '2025-2026', homeroom_teacher_id: '', capacity: '60' }); setModalOpen(true); };
  const openEdit = (c: SchoolClass) => { setEditClass(c); setForm({ name: c.name, grade_level: c.grade_level, section: c.section || '', academic_year: c.academic_year, homeroom_teacher_id: c.homeroom_teacher_id || '', capacity: String(c.capacity) }); setModalOpen(true); };

  const save = async () => {
    const payload = { ...form, capacity: parseInt(form.capacity) || 60, homeroom_teacher_id: form.homeroom_teacher_id || null, section: form.section || null };
    if (editClass) { await supabase.from('classes').update(payload).eq('id', editClass.id); }
    else { await supabase.from('classes').insert(payload); }
    setModalOpen(false); fetchClasses();
  };

  const remove = async (id: string) => { if (!confirm('هل أنت متأكد من حذف هذا الفصل؟')) return; await supabase.from('classes').delete().eq('id', id); fetchClasses(); };

  return (
    <>
      <PageHeader title="إدارة الصفوف والفصول" description="إنشاء وتعديل الفصول الدراسية"
        action={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={18} /> إضافة فصل</button>}
      />
      {loading ? <Spinner /> : classes.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد فصول" icon={<BookOpen size={40} />} action={<button onClick={openAdd} className="btn-primary">إضافة فصل</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => {
            const enrolled = (c as { enrollment_count?: number }).enrollment_count ?? 0;
            const remaining = c.capacity - enrolled;
            return (
              <div key={c.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold text-gray-900">{c.name}</h3><p className="text-sm text-gray-500">{c.grade_level} {c.section && `— ${c.section}`}</p></div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit size={16} /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={remaining > 0 ? 'success' : 'error'}>{enrolled}/{c.capacity} طالب</Badge>
                  <span className="text-xs text-gray-400">متبقي: {remaining}</span>
                </div>
                <p className="text-xs text-gray-400">السنة: {c.academic_year}</p>
                {c.homeroom_teacher && <p className="text-xs text-gray-500 mt-1">المعلم: {c.homeroom_teacher.full_name}</p>}
              </div>
            );
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editClass ? 'تعديل فصل' : 'إضافة فصل جديد'}>
        <div className="space-y-4">
          <div><label className="label">اسم الفصل</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
          <div><label className="label">المستوى الدراسي</label><input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">الشعبة</label><input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="input-field" /></div>
            <div><label className="label">السعة</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">السنة الدراسية</label><input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="input-field" /></div>
          <div><label className="label">المعلم المسؤول</label>
            <select value={form.homeroom_teacher_id} onChange={(e) => setForm({ ...form, homeroom_teacher_id: e.target.value })} className="input-field">
              <option value="">— بدون —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2"><button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button><button onClick={save} className="btn-primary">{editClass ? 'حفظ' : 'إضافة'}</button></div>
        </div>
      </Modal>
    </>
  );
}

function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', description: '',
    grade_level: 'both' as 'grade_10' | 'grade_11' | 'both',
    is_core: true,
    track_eng: false,
    track_med: false,
  });

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('subjects').select('*').order('grade_level').order('name');
    setSubjects((data as Subject[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const openAdd = () => {
    setEditSubject(null);
    setForm({ name: '', code: '', description: '', grade_level: 'both', is_core: true, track_eng: false, track_med: false });
    setModalOpen(true);
  };
  const openEdit = (s: Subject) => {
    setEditSubject(s);
    setForm({
      name: s.name, code: s.code, description: s.description || '',
      grade_level: (s.grade_level || 'both') as 'grade_10' | 'grade_11' | 'both',
      is_core: s.is_core ?? true,
      track_eng: s.allowed_tracks?.includes('engineering_cs') ?? false,
      track_med: s.allowed_tracks?.includes('medical_life') ?? false,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const allowedTracks: string[] = [];
    if (form.track_eng) allowedTracks.push('engineering_cs');
    if (form.track_med) allowedTracks.push('medical_life');

    const payload = {
      name: form.name,
      code: form.code,
      description: form.description || null,
      grade_level: form.grade_level,
      is_core: form.is_core,
      allowed_tracks: allowedTracks,
    };
    if (editSubject) { await supabase.from('subjects').update(payload).eq('id', editSubject.id); }
    else { await supabase.from('subjects').insert(payload); }
    setModalOpen(false); fetchSubjects();
  };

  const remove = async (id: string) => { if (!confirm('هل أنت متأكد؟')) return; await supabase.from('subjects').delete().eq('id', id); fetchSubjects(); };

  const gradeLabels: Record<string, string> = { grade_10: 'الصف الأول', grade_11: 'الصف الثاني', both: 'كلا الصفين' };
  const trackLabels: Record<string, string> = { engineering_cs: 'هندسة', medical_life: 'طب' };

  return (
    <>
      <PageHeader title="إدارة المواد" description="إضافة وتعديل المواد الدراسية وتحديد صفوفها ومساراتها"
        action={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={18} /> إضافة مادة</button>}
      />
      {loading ? <Spinner /> : subjects.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد مواد" icon={<FileText size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <div key={s.id} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="primary">{s.code}</Badge>
                    <Badge variant="gray">{gradeLabels[s.grade_level || 'both']}</Badge>
                    {s.is_core ? <Badge variant="success">أساسية</Badge> : <Badge variant="warning">اختيارية</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit size={16} /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
              {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
              {s.allowed_tracks && s.allowed_tracks.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {s.allowed_tracks.map(t => <Badge key={t} variant="accent">{trackLabels[t] || t}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSubject ? 'تعديل مادة' : 'إضافة مادة جديدة'}>
        <div className="space-y-4">
          <div><label className="label">اسم المادة</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
          <div><label className="label">رمز المادة</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field" /></div>
          <div><label className="label">الوصف</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
          <div>
            <label className="label">الصف الدراسي</label>
            <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value as typeof form.grade_level })} className="input-field">
              <option value="both">كلا الصفين</option>
              <option value="grade_10">الصف الأول الثانوي</option>
              <option value="grade_11">الصف الثاني الثانوي</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_core" checked={form.is_core} onChange={(e) => setForm({ ...form, is_core: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="is_core" className="text-sm text-gray-700">مادة أساسية (إجبارية)</label>
          </div>
          <div>
            <label className="label">المسارات المسموح بها (للمواد الاختيارية)</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.track_eng} onChange={(e) => setForm({ ...form, track_eng: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                هندسة وعلوم حاسب
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.track_med} onChange={(e) => setForm({ ...form, track_med: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                طب وعلوم حياة
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">اتركها فارغة إذا كانت المادة متاحة لجميع المسارات</p>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button onClick={save} className="btn-primary">{editSubject ? 'حفظ' : 'إضافة'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SchedulesTab() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ class_id: '', subject_id: '', teacher_id: '', day_of_week: '0', start_time: '08:00', end_time: '09:00', room: '' });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('schedules').select('*, subject:subjects(*), class:classes(*), teacher:profiles(*)').order('day_of_week').order('start_time');
    setSchedules(data || []);
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [c, s, t] = await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name'),
    ]);
    setClasses((c.data as SchoolClass[]) || []); setSubjects((s.data as Subject[]) || []); setTeachers((t.data as Profile[]) || []);
  }, []);

  useEffect(() => { fetchSchedules(); fetchOptions(); }, [fetchSchedules, fetchOptions]);

  const save = async () => {
    const payload = { ...form, day_of_week: parseInt(form.day_of_week), room: form.room || null };
    await supabase.from('schedules').insert(payload);
    setModalOpen(false); setForm({ class_id: '', subject_id: '', teacher_id: '', day_of_week: '0', start_time: '08:00', end_time: '09:00', room: '' }); fetchSchedules();
  };

  const remove = async (id: string) => { await supabase.from('schedules').delete().eq('id', id); fetchSchedules(); };

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <>
      <PageHeader title="إدارة الجداول الدراسية" description="إنشاء الجداول الأسبوعية"
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> إضافة حصة</button>}
      />
      {loading ? <Spinner /> : schedules.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد حصص" icon={<Calendar size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {days.map((day, idx) => {
            const daySchedules = schedules.filter(s => s.day_of_week === idx);
            if (daySchedules.length === 0) return null;
            return (
              <div key={idx} className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{day}</h3>
                <div className="space-y-2">
                  {daySchedules.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="text-sm font-mono text-gray-600 flex-shrink-0">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div>
                      <Badge variant="primary">{s.subject?.name || '—'}</Badge>
                      <span className="text-sm text-gray-500">{s.class?.name || '—'}</span>
                      <span className="text-sm text-gray-400">{s.teacher?.full_name || '—'}</span>
                      {s.room && <span className="text-xs text-gray-400">قاعة: {s.room}</span>}
                      <button onClick={() => remove(s.id)} className="mr-auto p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة حصة جديدة">
        <div className="space-y-4">
          <div><label className="label">الفصل</label><select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="input-field"><option value="">— اختر —</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">المادة</label><select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="input-field"><option value="">— اختر —</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">المدرس</label><select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="input-field"><option value="">— اختر —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
          <div><label className="label">اليوم</label><select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="input-field">{days.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">من</label><input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="input-field" /></div><div><label className="label">إلى</label><input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="input-field" /></div></div>
          <div><label className="label">القاعة</label><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="input-field" /></div>
          <div className="flex gap-2 justify-end pt-2"><button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button><button onClick={save} className="btn-primary">إضافة</button></div>
        </div>
      </Modal>
    </>
  );
}

function AnnouncementsTab() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_audience: 'all' as 'all' | 'students' | 'teachers' | 'parents' });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*, created_by_profile:profiles!announcements_created_by_fkey(full_name, email)').order('created_at', { ascending: false });
    setAnnouncements((data as unknown as Announcement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const save = async () => {
    if (!profile) return;
    await supabase.from('announcements').insert({ ...form, created_by: profile.id });
    setModalOpen(false); setForm({ title: '', content: '', target_audience: 'all' }); fetchAnnouncements();
  };

  const remove = async (id: string) => { if (!confirm('هل أنت متأكد؟')) return; await supabase.from('announcements').delete().eq('id', id); fetchAnnouncements(); };

  const audienceLabels: Record<string, string> = { all: 'للجميع', students: 'الطلاب', teachers: 'المدرسين', parents: 'أولياء الأمور' };

  return (
    <>
      <PageHeader title="إدارة الإعلانات" description="نشر إعلانات للمدرسة"
        action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> إعلان جديد</button>}
      />
      {loading ? <Spinner /> : announcements.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد إعلانات" icon={<Megaphone size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900">{a.title}</h3><Badge variant={a.target_audience === 'all' ? 'primary' : 'accent'}>{audienceLabels[a.target_audience]}</Badge></div>
                <button onClick={() => remove(a.id)} className="p-1.5 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
              <p className="text-sm text-gray-600 mb-2">{a.content}</p>
              <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ar-EG')}</p>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إعلان جديد">
        <div className="space-y-4">
          <div><label className="label">العنوان</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" /></div>
          <div><label className="label">المحتوى</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field" rows={4} /></div>
          <div><label className="label">الفئة المستهدفة</label><select value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value as typeof form.target_audience })} className="input-field"><option value="all">للجميع</option><option value="students">الطلاب</option><option value="teachers">المدرسين</option><option value="parents">أولياء الأمور</option></select></div>
          <div className="flex gap-2 justify-end pt-2"><button onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button><button onClick={save} className="btn-primary">نشر</button></div>
        </div>
      </Modal>
    </>
  );
}

function ReportsTab() {
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalSubjects: 0, totalGrades: 0, totalAssignments: 0, totalAnnouncements: 0, totalParents: 0, totalCapacity: 0, activeAccounts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, t, c, sub, g, a, an, p, active, classesData] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('grades').select('*', { count: 'exact', head: true }),
        supabase.from('assignments').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('classes').select('capacity'),
      ]);
      const totalCapacity = (classesData.data as { capacity: number }[])?.reduce((sum, c) => sum + c.capacity, 0) || 0;
      setStats({ totalStudents: s.count || 0, totalTeachers: t.count || 0, totalClasses: c.count || 0, totalSubjects: sub.count || 0, totalGrades: g.count || 0, totalAssignments: a.count || 0, totalAnnouncements: an.count || 0, totalParents: p.count || 0, totalCapacity, activeAccounts: active.count || 0 });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const items = [
    { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: <GraduationCap size={24} />, color: 'primary' as const },
    { label: 'إجمالي المدرسين', value: stats.totalTeachers, icon: <UserCircle size={24} />, color: 'accent' as const },
    { label: 'إجمالي أولياء الأمور', value: stats.totalParents, icon: <Heart size={24} />, color: 'success' as const },
    { label: 'الفصول', value: stats.totalClasses, icon: <BookOpen size={24} />, color: 'warning' as const },
    { label: 'إجمالي السعة', value: stats.totalCapacity, icon: <Users size={24} />, color: 'primary' as const },
    { label: 'الحسابات النشطة', value: stats.activeAccounts, icon: <CheckCircle size={24} />, color: 'accent' as const },
    { label: 'الدرجات المسجلة', value: stats.totalGrades, icon: <BarChart3 size={24} />, color: 'accent' as const },
    { label: 'الإعلانات', value: stats.totalAnnouncements, icon: <Megaphone size={24} />, color: 'warning' as const },
  ];

  return (
    <>
      <PageHeader title="التقارير والإحصائيات" description="نظرة شاملة على بيانات المدرسة" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, i) => <StatCard key={i} title={item.label} value={item.value} icon={item.icon} color={item.color} />)}
      </div>
    </>
  );
}
