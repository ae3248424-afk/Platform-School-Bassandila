import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { Spinner, EmptyState } from '@/components/ui/States';
import {
  GraduationCap, Search, Save, AlertCircle, CheckCircle, Filter,
} from 'lucide-react';
import type { StudentSlot, SchoolClass, Subject } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  empty: 'فارغ',
  pending: 'بانتظار التفعيل',
  active: 'مفعل',
  suspended: 'موقوف',
};

const STATUS_VARIANTS: Record<string, 'gray' | 'warning' | 'success' | 'error'> = {
  empty: 'gray',
  pending: 'warning',
  active: 'success',
  suspended: 'error',
};

const TRACK_LABELS: Record<string, string> = {
  engineering_cs: 'هندسة وعلوم حاسب',
  medical_life: 'طب وعلوم حياة',
};

export default function StudentSlotsTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [slots, setSlots] = useState<StudentSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ full_name: string; username: string; track: string; specialization_subject_id: string }>({
    full_name: '', username: '', track: '', specialization_subject_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from('classes').select('*').order('grade_level').order('name');
    const classList = (data as SchoolClass[]) || [];
    setClasses(classList);
    if (classList.length > 0 && !selectedClassId) {
      setSelectedClassId(classList[0].id);
    }
  }, [selectedClassId]);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    setSubjects((data as Subject[]) || []);
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('student_slots')
      .select('*, class:classes(*), specialization_subject:subjects(*)')
      .eq('class_id', selectedClassId)
      .order('slot_number', { ascending: true });
    if (error) { console.error(error); }
    setSlots((data as StudentSlot[]) || []);
    setLoading(false);
  }, [selectedClassId]);

  useEffect(() => { fetchClasses(); fetchSubjects(); }, [fetchClasses, fetchSubjects]);
  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || null;
  const isGrade11 = selectedClass?.grade_level === 'الصف الثاني الثانوي';

  const trackElectives = subjects.filter(s => {
    if (!editForm.track) return false;
    return s.allowed_tracks?.includes(editForm.track);
  });

  const filtered = slots.filter(s => {
    if (statusFilter !== 'all' && s.account_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        String(s.slot_number).includes(q)
      );
    }
    return true;
  });

  const filledCount = slots.filter(s => s.full_name).length;

  const startEdit = (slot: StudentSlot) => {
    setEditingId(slot.id);
    setEditForm({
      full_name: slot.full_name || '',
      username: slot.username || '',
      track: slot.track || '',
      specialization_subject_id: slot.specialization_subject_id || '',
    });
    setSaveMsg(null);
  };

  const saveSlot = async (slotId: string) => {
    setSaving(true);
    setSaveMsg(null);
    const currentSlot = slots.find(s => s.id === slotId);
    const updates: Record<string, string | null> = {
      full_name: editForm.full_name || null,
      username: editForm.username || null,
      track: (isGrade11 && editForm.track) ? editForm.track : null,
      specialization_subject_id: (isGrade11 && editForm.specialization_subject_id) ? editForm.specialization_subject_id : null,
      updated_at: new Date().toISOString(),
    };
    if (currentSlot?.account_status === 'empty' && editForm.full_name) {
      updates.account_status = 'pending';
    }
    const { error } = await supabase.from('student_slots').update(updates).eq('id', slotId);
    setSaving(false);
    if (error) {
      setSaveMsg({ type: 'error', text: error.message });
      return;
    }
    setSaveMsg({ type: 'success', text: `تم حفظ بيانات الطالب رقم ${currentSlot?.slot_number}` });
    setEditingId(null);
    fetchSlots();
  };

  // Group classes by grade
  const grade10Classes = classes.filter(c => c.grade_level === 'الصف الأول الثانوي');
  const grade11Classes = classes.filter(c => c.grade_level === 'الصف الثاني الثانوي');

  return (
    <>
      <PageHeader
        title="سجلات الطلاب"
        description="اختر الفصل لعرض 60 خانة فارغة. املأ بيانات كل طالب ثم احفظ. لا تُنشأ حسابات حتى تقوم بتفعيلها لاحقًا."
      />

      {/* Class selector grouped by grade */}
      <div className="card p-4 mb-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">الصف الأول الثانوي (12 فصل — 720 طالب)</p>
            <div className="flex flex-wrap gap-2">
              {grade10Classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClassId(c.id); setEditingId(null); setSaveMsg(null); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedClassId === c.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">الصف الثاني الثانوي (9 فصول — 540 طالب)</p>
            <div className="flex flex-wrap gap-2">
              {grade11Classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClassId(c.id); setEditingId(null); setSaveMsg(null); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedClassId === c.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subjects display for selected class */}
      {selectedClass && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            المواد — {selectedClass.grade_level}
          </p>
          <div className="flex flex-wrap gap-2">
            {isGrade11 ? (
              <>
                <Badge variant="success">اللغة العربية (أساسية)</Badge>
                <Badge variant="success">اللغة الإنجليزية (أساسية)</Badge>
                <Badge variant="success">الرياضيات (أساسية)</Badge>
                <span className="text-gray-400 text-sm self-center">+ مادة التخصص حسب المسار</span>
              </>
            ) : (
              <>
                <Badge variant="primary">اللغة العربية</Badge>
                <Badge variant="primary">التاريخ</Badge>
                <Badge variant="primary">اللغة الإنجليزية</Badge>
                <Badge variant="primary">الرياضيات</Badge>
                <Badge variant="primary">البرمجة</Badge>
                <Badge variant="primary">التربية الدينية</Badge>
                <Badge variant="primary">الفلسفة</Badge>
              </>
            )}
          </div>
          {isGrade11 && (
            <p className="text-xs text-gray-400 mt-2">
              المسارات: هندسة وعلوم حاسب (البرمجة أو الكيمياء) — طب وعلوم حياة (الفيزياء أو الرياضيات)
            </p>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الطالب، الاسم، اسم المستخدم..."
              className="input-field pr-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-44">
              <option value="all">كل الحالات</option>
              <option value="empty">فارغ</option>
              <option value="pending">بانتظار التفعيل</option>
              <option value="active">مفعل</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle size={16} className="text-success-500" />
            <span>{filledCount} / {slots.length} مُعبأ</span>
          </div>
        </div>
      </div>

      {saveMsg && (
        <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-4 ${saveMsg.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>
          {saveMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {saveMsg.text}
        </div>
      )}

      {loading ? (
        <Spinner message="جاري تحميل السجلات..." />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد سجلات مطابقة" icon={<GraduationCap size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header w-16">الرقم</th>
                  <th className="table-header">الاسم</th>
                  <th className="table-header">اسم المستخدم</th>
                  {isGrade11 && <th className="table-header">المسار</th>}
                  {isGrade11 && <th className="table-header">مادة التخصص</th>}
                  <th className="table-header">حالة الحساب</th>
                  <th className="table-header w-20">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(slot => (
                  <tr key={slot.id} className={`hover:bg-gray-50 transition-colors ${slot.account_status === 'empty' ? 'bg-gray-50/30' : ''}`}>
                    <td className="table-cell text-gray-400 font-mono text-sm">{slot.slot_number}</td>
                    {editingId === slot.id ? (
                      <>
                        <td className="table-cell">
                          <input
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="input-field text-sm py-1.5"
                            placeholder="الاسم الكامل"
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            className="input-field text-sm py-1.5"
                            placeholder="اسم المستخدم"
                          />
                        </td>
                        {isGrade11 && (
                          <td className="table-cell">
                            <select
                              value={editForm.track}
                              onChange={(e) => setEditForm({ ...editForm, track: e.target.value, specialization_subject_id: '' })}
                              className="input-field text-sm py-1.5"
                            >
                              <option value="">— اختر —</option>
                              <option value="engineering_cs">هندسة وعلوم حاسب</option>
                              <option value="medical_life">طب وعلوم حياة</option>
                            </select>
                          </td>
                        )}
                        {isGrade11 && (
                          <td className="table-cell">
                            <select
                              value={editForm.specialization_subject_id}
                              onChange={(e) => setEditForm({ ...editForm, specialization_subject_id: e.target.value })}
                              className="input-field text-sm py-1.5"
                              disabled={!editForm.track}
                            >
                              <option value="">— اختر —</option>
                              {trackElectives.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                        )}
                        <td className="table-cell"><Badge variant={STATUS_VARIANTS[slot.account_status]}>{STATUS_LABELS[slot.account_status]}</Badge></td>
                        <td className="table-cell">
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveSlot(slot.id)}
                              disabled={saving}
                              className="p-1.5 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                              title="حفظ"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                            >
                              إلغاء
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell font-medium">{slot.full_name || <span className="text-gray-300">— فارغ —</span>}</td>
                        <td className="table-cell text-gray-600">{slot.username || <span className="text-gray-300">—</span>}</td>
                        {isGrade11 && (
                          <td className="table-cell">
                            {slot.track ? <Badge variant="accent">{TRACK_LABELS[slot.track] || slot.track}</Badge> : <span className="text-gray-300 text-sm">—</span>}
                          </td>
                        )}
                        {isGrade11 && (
                          <td className="table-cell">{slot.specialization_subject?.name || <span className="text-gray-300 text-sm">—</span>}</td>
                        )}
                        <td className="table-cell"><Badge variant={STATUS_VARIANTS[slot.account_status]}>{STATUS_LABELS[slot.account_status]}</Badge></td>
                        <td className="table-cell">
                          <button
                            onClick={() => startEdit(slot)}
                            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                          >
                            تعديل
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
