import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { Spinner, EmptyState } from '@/components/ui/States';
import {
  Users, GraduationCap, Calendar, ClipboardList, Megaphone,
  CheckCircle, XCircle, Clock, FileText,
} from 'lucide-react';
import type { Profile, Grade, Attendance, Assignment, Announcement, Schedule, TeacherPost } from '@/types';

type Tab = 'overview' | 'children' | 'grades' | 'attendance' | 'assignments' | 'posts' | 'announcements';

export default function ParentDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <DashboardLayout activeTab={tab} onTabChange={(k) => setTab(k as Tab)}>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'children' && <ChildrenTab />}
      {tab === 'grades' && <GradesTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'posts' && <TeacherPostsTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
    </DashboardLayout>
  );
}

function useChildren() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<(Profile & { student?: { student_number: string; class_id: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    if (!profile) return;
    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', profile.id);
    const studentIds = (links as { student_id: string }[])?.map(l => l.student_id) || [];
    if (studentIds.length === 0) {
      setChildren([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*, student:students(student_number, class_id)')
      .in('id', studentIds);
    setChildren((data as typeof children) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);
  return { profile, children, loading, refetch: fetchChildren };
}

function OverviewTab() {
  const { profile, children, loading } = useChildren();

  if (loading) return <Spinner message="جاري التحميل..." />;

  return (
    <>
      <PageHeader title={`أهلاً، ${profile?.full_name || 'ولي الأمر'}`} description="متابعة أبنائك" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="عدد الأبناء" value={children.length} icon={<Users size={24} />} color="primary" />
        {children.map(c => (
          <StatCard key={c.id} title={c.full_name} value={c.student?.student_number || ''} icon={<GraduationCap size={24} />} color="accent" />
        ))}
      </div>
      {children.length === 0 && (
        <div className="card">
          <EmptyState
            title="لم يتم ربط أبنائك بحسابك بعد"
            description="تواصل مع إدارة المدرسة لربط أبنائك بحسابك"
            icon={<Users size={40} />}
          />
        </div>
      )}
    </>
  );
}

function ChildrenTab() {
  const { children, loading } = useChildren();

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="أبنائي" description="الطلاب المرتبطون بحسابك" />
      {children.length === 0 ? (
        <div className="card"><EmptyState title="لم يتم ربط أبنائك بحسابك بعد" description="تواصل مع إدارة المدرسة" icon={<Users size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(c => (
            <div key={c.id} className="card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold flex-shrink-0">
                  {c.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.student?.student_number}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{c.email}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function GradesTab() {
  const { children, loading } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const fetchGrades = useCallback(async () => {
    if (!selectedChild) return;
    setGradesLoading(true);
    const { data } = await supabase
      .from('grades')
      .select('*, subject:subjects(*)')
      .eq('student_id', selectedChild.id)
      .order('created_at', { ascending: false });
    setGrades((data as unknown as Grade[]) || []);
    setGradesLoading(false);
  }, [selectedChild]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  if (loading) return <Spinner />;

  const gradeTypeLabels: Record<string, string> = { exam: 'اختبار', quiz: 'Quiz', assignment: 'واجب', midterm: 'منتصف الفصل', final: 'نهائي' };

  return (
    <>
      <PageHeader title="درجات الأبناء" description="عرض درجات أبنائك" />
      {children.length > 1 && (
        <div className="card p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChild?.id === c.id ? 'bg-primary-50 text-primary-700 border-2 border-primary-500' : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c.full_name}
              </button>
            ))}
          </div>
        </div>
      )}
      {gradesLoading ? <Spinner /> : grades.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد درجات مسجلة" icon={<GraduationCap size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">المادة</th>
                <th className="table-header">النوع</th>
                <th className="table-header">العنوان</th>
                <th className="table-header">الدرجة</th>
                <th className="table-header">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{g.subject?.name || '—'}</td>
                  <td className="table-cell"><Badge variant="gray">{gradeTypeLabels[g.grade_type]}</Badge></td>
                  <td className="table-cell">{g.title}</td>
                  <td className="table-cell font-medium">{g.score} / {g.max_score}</td>
                  <td className="table-cell">
                    <span className={Math.round((g.score / g.max_score) * 100) >= 50 ? 'text-success-600' : 'text-error-600'}>
                      {Math.round((g.score / g.max_score) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AttendanceTab() {
  const { children, loading } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const fetchRecords = useCallback(async () => {
    if (!selectedChild) return;
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', selectedChild.id)
      .order('date', { ascending: false });
    setRecords((data as Attendance[]) || []);
  }, [selectedChild]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  if (loading) return <Spinner />;

  const statusConfig = {
    present: { label: 'حاضر', color: 'success' as const, icon: <CheckCircle size={16} /> },
    absent: { label: 'غائب', color: 'error' as const, icon: <XCircle size={16} /> },
    late: { label: 'متأخر', color: 'warning' as const, icon: <Clock size={16} /> },
    excused: { label: 'بعذر', color: 'gray' as const, icon: <Clock size={16} /> },
  };

  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;

  return (
    <>
      <PageHeader title="حضور الأبناء" description="سجل حضور وغياب الأبناء" />
      {children.length > 1 && (
        <div className="card p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChild?.id === c.id ? 'bg-primary-50 text-primary-700 border-2 border-primary-500' : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c.full_name}
              </button>
            ))}
          </div>
        </div>
      )}
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

function AssignmentsTab() {
  const { children, loading } = useChildren();
  const [selectedChild, setSelectedChild] = useState<(Profile & { student?: { student_number: string; class_id: string | null } }) | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const fetchAssignments = useCallback(async () => {
    if (!selectedChild?.student?.class_id) return;
    const { data } = await supabase
      .from('assignments')
      .select('*, subject:subjects(*)')
      .eq('class_id', selectedChild.student.class_id)
      .order('due_date', { ascending: false });
    setAssignments((data as unknown as Assignment[]) || []);
  }, [selectedChild]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="واجبات الأبناء" description="متابعة واجبات الأبناء" />
      {children.length > 1 && (
        <div className="card p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChild?.id === c.id ? 'bg-primary-50 text-primary-700 border-2 border-primary-500' : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c.full_name}
              </button>
            ))}
          </div>
        </div>
      )}
      {assignments.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد واجبات" icon={<ClipboardList size={40} />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assignments.map(a => (
            <div key={a.id} className="card p-5 card-hover">
              <h3 className="font-semibold text-gray-900 mb-2">{a.title}</h3>
              {a.description && <p className="text-sm text-gray-600 mb-3">{a.description}</p>}
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{a.subject?.name}</Badge>
                <Badge variant="warning">التسليم: {new Date(a.due_date).toLocaleDateString('ar-EG')}</Badge>
                <Badge variant="accent">من {a.max_score}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TeacherPostsTab() {
  const { children, loading } = useChildren();
  const [selectedChild, setSelectedChild] = useState<(Profile & { student?: { student_number: string; class_id: string | null } }) | null>(null);
  const [posts, setPosts] = useState<TeacherPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const fetchPosts = useCallback(async () => {
    if (!selectedChild?.student?.class_id) return;
    setPostsLoading(true);
    const { data } = await supabase
      .from('teacher_posts')
      .select('*, subject:subjects(*), class:classes(*), teacher:profiles(*)')
      .eq('class_id', selectedChild.student.class_id)
      .order('created_at', { ascending: false });
    setPosts((data as unknown as TeacherPost[]) || []);
    setPostsLoading(false);
  }, [selectedChild]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) return <Spinner />;

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    news: { label: 'خبر', icon: <Megaphone size={16} />, bg: 'bg-primary-50 text-primary-600' },
    exam: { label: 'امتحان', icon: <ClipboardList size={16} />, bg: 'bg-warning-50 text-warning-600' },
    file: { label: 'ملف', icon: <FileText size={16} />, bg: 'bg-accent-50 text-accent-600' },
    reminder: { label: 'تذكير', icon: <Clock size={16} />, bg: 'bg-success-50 text-success-600' },
  };

  return (
    <>
      <PageHeader title="منشورات المدرسين" description="أخبار وامتحانات وملفات لفصول أبنائك" />
      {children.length > 1 && (
        <div className="card p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedChild?.id === c.id ? 'bg-primary-50 text-primary-700 border-2 border-primary-500' : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c.full_name}
              </button>
            ))}
          </div>
        </div>
      )}
      {postsLoading ? <Spinner /> : posts.length === 0 ? (
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
        .or('target_audience.eq.all,target_audience.eq.parents')
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
