import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { Spinner, EmptyState } from '@/components/ui/States';
import {
  UserCircle, Search, Save, AlertCircle, CheckCircle, Filter,
} from 'lucide-react';
import type { TeacherSlot, Subject } from '@/types';

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

export default function TeacherSlotsTab() {
  const [slots, setSlots] = useState<TeacherSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', username: '', subject_taught: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teacher_slots')
      .select('*')
      .order('slot_number', { ascending: true });
    if (error) { console.error(error); }
    setSlots((data as TeacherSlot[]) || []);
    setLoading(false);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    setSubjects((data as Subject[]) || []);
  }, []);

  useEffect(() => { fetchSlots(); fetchSubjects(); }, [fetchSlots, fetchSubjects]);

  const filtered = slots.filter(s => {
    if (statusFilter !== 'all' && s.account_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.subject_taught?.toLowerCase().includes(q) ||
        String(s.slot_number).includes(q)
      );
    }
    return true;
  });

  const filledCount = slots.filter(s => s.full_name).length;

  const startEdit = (slot: TeacherSlot) => {
    setEditingId(slot.id);
    setEditForm({
      full_name: slot.full_name || '',
      email: slot.email || '',
      username: slot.username || '',
      subject_taught: slot.subject_taught || '',
    });
    setSaveMsg(null);
  };

  const saveSlot = async (slotId: string) => {
    setSaving(true);
    setSaveMsg(null);
    const updates: Record<string, string | null> = {
      full_name: editForm.full_name || null,
      email: editForm.email || null,
      username: editForm.username || null,
      subject_taught: editForm.subject_taught || null,
      updated_at: new Date().toISOString(),
    };
    // If name was just added, move from 'empty' to 'pending'
    const currentSlot = slots.find(s => s.id === slotId);
    if (currentSlot?.account_status === 'empty' && editForm.full_name) {
      updates.account_status = 'pending';
    }
    const { error } = await supabase.from('teacher_slots').update(updates).eq('id', slotId);
    setSaving(false);
    if (error) {
      setSaveMsg({ type: 'error', text: error.message });
      return;
    }
    setSaveMsg({ type: 'success', text: `تم حفظ بيانات المدرس رقم ${currentSlot?.slot_number}` });
    setEditingId(null);
    fetchSlots();
  };

  if (loading) return <Spinner message="جاري تحميل السجلات..." />;

  return (
    <>
      <PageHeader
        title="سجلات المدرسين"
        description="100 سجل فارغ — املأ بيانات كل مدرس ثم احفظ. لا تُنشأ حسابات حتى تقوم بتفعيلها لاحقًا."
      />

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم المدرس، الاسم، البريد، اسم المستخدم..."
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

      {filtered.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد سجلات مطابقة" icon={<UserCircle size={40} />} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header w-16">الرقم</th>
                  <th className="table-header">الاسم</th>
                  <th className="table-header">البريد الإلكتروني</th>
                  <th className="table-header">اسم المستخدم</th>
                  <th className="table-header">المادة</th>
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
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="input-field text-sm py-1.5"
                            placeholder="example@school.com"
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
                        <td className="table-cell">
                          <select
                            value={editForm.subject_taught}
                            onChange={(e) => setEditForm({ ...editForm, subject_taught: e.target.value })}
                            className="input-field text-sm py-1.5"
                          >
                            <option value="">— اختر المادة —</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </td>
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
                        <td className="table-cell text-gray-600">{slot.email || <span className="text-gray-300">—</span>}</td>
                        <td className="table-cell text-gray-600">{slot.username || <span className="text-gray-300">—</span>}</td>
                        <td className="table-cell">{slot.subject_taught || <span className="text-gray-300">—</span>}</td>
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
