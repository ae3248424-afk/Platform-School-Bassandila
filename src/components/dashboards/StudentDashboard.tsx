import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { Spinner, EmptyState } from '@/components/ui/States';
import {
  GraduationCap, BookOpen, Calendar, ClipboardList, Megaphone,
  CheckCircle, XCircle, Clock, FileText,
} from 'lucide-react';
import type { Grade, Assignment, Attendance, Announcement, Schedule, Subject, TeacherPost } from '@/types';

type Tab = 'overview' | 'grades' | 'subjects' | 'schedule' | 'assignments' | 'attendance' | 'posts' | 'announcements';

export default function StudentDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <DashboardLayout activeTab={tab} onTabChange={(k) => setTab(k as Tab)}>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'grades' && <GradesTab />}
      {tab === 'subjects' && <SubjectsTab />}
      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'posts' && <TeacherPostsTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
    </DashboardLayout>
  );
}

function useStudentData() {
  const { profile } = useAuth();
  const [studentInfo, setStudentInfo] = useState<{ class_id: string | null; student_number: string; track: string | null; specialization_subject_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('class_id, student_number, track, specialization_subject_id')
        .eq('id', profile.id)
        .maybeSingle();
      setStudentInfo(data as { class_id: string | null; student_number: string; track: string | null; specialization_subject_id: string | null } | null);
      setLoading(false);
    })();
  }, [profile]);

  return { profile, studentInfo, loading };
}

function OverviewTab() {
  const { profile, studentInfo, loading } = useStudentData();
  const [stats, setStats] = useState({ grades: 0, assignments: 0, present: 0, absent: 0 });
  const [className, setClassName] = useState('');
  const [specializationName, setSpecializationName] = useState('');

  useEffect(() => {
    if (!profile || !studentInfo) return;
    (async () => {
      const [g, a, att] = await Promise.all([
        supabase.from('grades').select('*', { count: 'exact', head: true }).eq('student_id', profile.id),
        supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('class_id', studentInfo.class_id || ''),
        supabase.from('attendance').select('*').eq('student_id', profile.id),
      ]);
      const attendanceRecords = (att.data as Attendance[]) || [];
      setStats({
        grades: g.count || 0,
        assignments: a.count || 0,
        present: attendanceRecords.filter(r => r.status === 'present').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
      });
      if (studentInfo.class_id) {
        const { data: c } = await supabase.from('classes').select('name, grade_level').eq('id', studentInfo.class_id).maybeSingle();
        setClassName((c as { name: string })?.name || '');
      }
      if (studentInfo.specialization_subject_id) {
        const { data: sub } = await supabase.from('subjects').select('name').eq('id', studentInfo.specialization_subject_id).maybeSingle();
        setSpecializationName((sub as { name: string })?.name || '');
      }
    })();
  }, [profile, studentInfo]);

  if (loading) return <Spinner message="جاري التحميل..." />;

  const trackLabels: Record<string, string> = { engineering_cs: 'هندسة وعلوم حاسب', medical_life: 'طب وعلوم حياة' };

  return (
    <>
      <PageHeader title={`أهلاً، ${profile?.full_name || 'طالب'}`} description={className ? `الفصل: ${className}` : 'مرحبا بك'} />
      {studentInfo?.track && (
        <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
          <Badge variant="accent">{trackLabels[studentInfo.track] || studentInfo.track}</Badge>
          {specializationName && <span className="text-sm text-gray-600">مادة التخصص: <span className="font-medium">{specializationName}</span></span>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="الدرجات المسجلة" value={stats.grades} icon={<GraduationCap size={24} />} color="primary" />
        <StatCard title="الواجبات" value={stats.assignments} icon={<ClipboardList size={24} />} color="warning" />
        <StatCard title="أيام الحضور" value={stats.present} icon={<CheckCircle size={24} />} color="success" />
        <StatCard title="أيام الغياب" value={stats.absent} icon={<XCircle size={24} />} color="error" />
      </div>
    </>
  );
}

function GradesTab() {
  const { profile, loading } = useStudentData();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchGrades = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('grades')
      .select('*, subject:subjects(*), teacher:profiles(full_name)')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false });
    setGrades((data as unknown as Grade[]) || []);
    setDataLoading(false);
  }, [profile]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  if (loading || dataLoading) return <Spinner />;

  const gradeTypeLabels: Record<string, string> = { exam: 'اختبار', quiz: 'Quiz', assignment: 'واجب', midterm: 'منتصف الفصل', final: 'نهائي' };
  const groupedBySubject = grades.reduce((acc, g) => {
    const key = g.subject_id;
    if (!acc[key]) acc[key] = { subject: g.subject, grades: [] };
    acc[key].grades.push(g);
    return acc;
  }, {} as Record<string, { subject?: Subject; grades: Grade[] }>);

  return (
    <>
      <PageHeader title="درجاتي" description="عرض جميع الدرجات" />
      {grades.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد درجات مسجلة" icon={<GraduationCap size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySubject).map(([subjectId, { subject, grades: subjectGrades }]) => {
            const total = subjectGrades.reduce((sum, g) => sum + g.score, 0);
            const maxTotal = subjectGrades.reduce((sum, g) => sum + g.max_score, 0);
            const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
            return (
              <div key={subjectId} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><BookOpen size={20} /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{subject?.name || '—'}</h3>
                      <Badge variant="primary">{subject?.code}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{pct}%</p>
                    <p className="text-xs text-gray-500">{total} / {maxTotal}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-header">النوع</th>
                        <th className="table-header">العنوان</th>
                        <th className="table-header">الدرجة</th>
                        <th className="table-header">النسبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {subjectGrades.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50">
                          <td className="table-cell"><Badge variant="gray">{gradeTypeLabels[g.grade_type]}</Badge></td>
                          <td className="table-cell">{g.title}</td>
                          <td className="table-cell font-medium">{g.score} / {g.max_score}</td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 50 ? 'bg-success-500' : 'bg-error-500'}`} style={{ width: `${Math.round((g.score / g.max_score) * 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{Math.round((g.score / g.max_score) * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SubjectsTab() {
  const { studentInfo, loading } = useStudentData();
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!studentInfo?.class_id) return;
    (async () => {
      const { data } = await supabase
        .from('class_subjects')
        .select('*, subject:subjects(*), teacher:profiles(full_name)')
        .eq('class_id', studentInfo.class_id);
      setSubjects(data || []);
    })();
  }, [studentInfo]);

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="موادي" description="المواد الدراسية المسجلة" />
      {subjects.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد مواد مسجلة" icon={<BookOpen size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((cs: any) => (
            <div key={cs.id} className="card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><BookOpen size={22} /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cs.subject?.name}</h3>
                  <Badge variant="primary">{cs.subject?.code}</Badge>
                </div>
              </div>
              {cs.subject?.description && <p className="text-sm text-gray-500 mb-2">{cs.subject.description}</p>}
              <p className="text-xs text-gray-400">المدرس: {cs.teacher?.full_name || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ScheduleTab() {
  const { studentInfo, loading } = useStudentData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (!studentInfo?.class_id) return;
    (async () => {
      const { data } = await supabase
        .from('schedules')
        .select('*, subject:subjects(*), teacher:profiles(full_name)')
        .eq('class_id', studentInfo.class_id)
        .order('day_of_week')
        .order('start_time');
      setSchedules((data as unknown as Schedule[]) || []);
    })();
  }, [studentInfo]);

  if (loading) return <Spinner />;

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <>
      <PageHeader title="جدولي الدراسي" description="الجدول الأسبوعي" />
      {schedules.length === 0 ? (
        <div className="card"><EmptyState title="لا يوجد جدول دراسي" icon={<Calendar size={40} />} /></div>
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
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="text-sm font-mono text-gray-600 flex-shrink-0">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div>
                      <Badge variant="primary">{s.subject?.name || '—'}</Badge>
                      <span className="text-sm text-gray-400">{s.teacher?.full_name || '—'}</span>
                      {s.room && <span className="text-xs text-gray-400">قاعة: {s.room}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AssignmentsTab() {
  const { studentInfo, loading } = useStudentData();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!studentInfo?.class_id) return;
    (async () => {
      const { data } = await supabase
        .from('assignments')
        .select('*, subject:subjects(*), class:classes(*)')
        .eq('class_id', studentInfo.class_id)
        .order('due_date', { ascending: false });
      setAssignments((data as unknown as Assignment[]) || []);
    })();
  }, [studentInfo]);

  if (loading) return <Spinner />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <PageHeader title="واجباتي" description="الواجبات ومواعيد التسليم" />
      {assignments.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد واجبات" icon={<ClipboardList size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assignments.map(a => {
            const due = new Date(a.due_date);
            const isOverdue = due < today;
            return (
              <div key={a.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <Badge variant={isOverdue ? 'error' : 'warning'}>
                    {isOverdue ? 'متأخر' : 'مستحق'}
                  </Badge>
                </div>
                {a.description && <p className="text-sm text-gray-600 mb-3">{a.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary">{a.subject?.name}</Badge>
                  <Badge variant="gray">التسليم: {new Date(a.due_date).toLocaleDateString('ar-EG')}</Badge>
                  <Badge variant="accent">من {a.max_score}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AttendanceTab() {
  const { profile, loading } = useStudentData();
  const [records, setRecords] = useState<Attendance[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', profile.id)
        .order('date', { ascending: false });
      setRecords((data as Attendance[]) || []);
    })();
  }, [profile]);

  if (loading) return <Spinner />;

  const statusConfig = {
    present: { label: 'حاضر', color: 'success' as const, icon: <CheckCircle size={18} /> },
    absent: { label: 'غائب', color: 'error' as const, icon: <XCircle size={18} /> },
    late: { label: 'متأخر', color: 'warning' as const, icon: <Clock size={18} /> },
    excused: { label: 'بعذر', color: 'gray' as const, icon: <Clock size={18} /> },
  };

  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;

  return (
    <>
      <PageHeader title="حضوري وغيابي" description="سجل الحضور" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="حاضر" value={present} icon={<CheckCircle size={24} />} color="success" />
        <StatCard title="غائب" value={absent} icon={<XCircle size={24} />} color="error" />
        <StatCard title="متأخر" value={late} icon={<Clock size={24} />} color="warning" />
      </div>
      {records.length === 0 ? (
        <div className="card"><EmptyState title="لا يوجد سجل حضور" icon={<Calendar size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">التاريخ</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-cell">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                  <td className="table-cell">
                    <Badge variant={statusConfig[r.status].color}>
                      <span className="flex items-center gap-1">{statusConfig[r.status].icon} {statusConfig[r.status].label}</span>
                    </Badge>
                  </td>
                  <td className="table-cell text-gray-500">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TeacherPostsTab() {
  const { studentInfo, loading } = useStudentData();
  const [posts, setPosts] = useState<TeacherPost[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!studentInfo?.class_id) return;
    (async () => {
      const { data } = await supabase
        .from('teacher_posts')
        .select('*, subject:subjects(*), class:classes(*), teacher:profiles(*)')
        .eq('class_id', studentInfo.class_id)
        .order('created_at', { ascending: false });
      setPosts((data as unknown as TeacherPost[]) || []);
      setDataLoading(false);
    })();
  }, [studentInfo]);

  if (loading || dataLoading) return <Spinner />;

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    news: { label: 'خبر', icon: <Megaphone size={16} />, bg: 'bg-primary-50 text-primary-600' },
    exam: { label: 'امتحان', icon: <ClipboardList size={16} />, bg: 'bg-warning-50 text-warning-600' },
    file: { label: 'ملف', icon: <FileText size={16} />, bg: 'bg-accent-50 text-accent-600' },
    reminder: { label: 'تذكير', icon: <Clock size={16} />, bg: 'bg-success-50 text-success-600' },
  };

  return (
    <>
      <PageHeader title="منشورات المدرسين" description="أخبار وامتحانات وملفات لمواد فصلك" />
      {posts.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد منشورات بعد" icon={<FileText size={40} />} /></div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => {
            const cfg = typeConfig[p.post_type] || typeConfig.news;
            return (
              <div key={p.id} className="card p-5 card-hover">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="primary">{cfg.label}</Badge>
                      <span className="text-xs text-gray-500">{p.subject?.name} — {p.teacher?.full_name}</span>
                    </div>
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
    </>
  );
}

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*, created_by_profile:profiles!announcements_created_by_fkey(full_name)')
        .or('target_audience.eq.all,target_audience.eq.students')
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
