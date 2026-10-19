import { useState, useEffect, FormEvent } from 'react';
import { GraduationCap, Lock, User, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

type AccountType = 'student' | 'teacher' | 'admin';

export default function AuthPage() {
  const { signInWithEmail } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'grade_10' | 'grade_11'>('grade_10');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-admin bootstrap: only shown when no admin exists
  const [adminExists, setAdminExists] = useState(true);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: '', password: '', fullName: '' });

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      setAdminExists((count || 0) > 0);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      setLoading(false);
      return;
    }

    const normalizedUsername = username.trim().replace(/\s+/g, ' ');
    let loginEmail = '';
    let profileId: string | null = null;

    if (accountType === 'admin') {
      const { data: adminAccounts, error: adminLookupError } = await supabase
        .rpc('lookup_admin_login', { p_username: normalizedUsername });
      const adminAccount = adminAccounts?.[0] ?? null;

      if (adminLookupError || !adminAccount) {
        setError('بيانات المدير غير صحيحة.');
        setLoading(false);
        return;
      }

      if (!adminAccount.is_active) {
        setError('هذا الحساب موقوف. يرجى التواصل مع إدارة المدرسة.');
        setLoading(false);
        return;
      }

      loginEmail = `${adminAccount.username.toLowerCase().replace(/\s+/g, '.')}@school.internal`;
    } else {
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('email, role, is_active, id')
        .ilike('username', normalizedUsername)
        .maybeSingle();

      if (lookupErr || !profile) {
        setError('اسم المستخدم غير موجود. تأكد من الكتابة الصحيحة أو تواصل مع إدارة المدرسة.');
        setLoading(false);
        return;
      }

      if (profile.role !== accountType) {
        const typeLabels: Record<string, string> = { student: 'طالب', teacher: 'مدرس', admin: 'مدير' };
        setError(`هذا الحساب ليس حساب ${typeLabels[accountType]}. اختر النوع الصحيح.`);
        setLoading(false);
        return;
      }

      if (!profile.is_active) {
        setError('هذا الحساب موقوف. يرجى التواصل مع إدارة المدرسة.');
        setLoading(false);
        return;
      }

      loginEmail = profile.email;
      profileId = profile.id;
    }

    // For students: verify grade level matches
    if (accountType === 'student' && profileId) {
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', profileId)
        .maybeSingle();

      if (student?.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('grade_level')
          .eq('id', student.class_id)
          .maybeSingle();

        const dbGrade = cls?.grade_level;
        const dbGradeKey = dbGrade === 'الصف الأول الثانوي' ? 'grade_10'
          : dbGrade === 'الصف الثاني الثانوي' ? 'grade_11'
          : null;

        if (dbGradeKey && dbGradeKey !== selectedGrade) {
          setError(
            selectedGrade === 'grade_10'
              ? 'هذا الطالب مسجل في الصف الثاني الثانوي، ليس الأول. اختر الصف الصحيح.'
              : 'هذا الطالب مسجل في الصف الأول الثانوي، ليس الثاني. اختر الصف الصحيح.'
          );
          setLoading(false);
          return;
        }
      }
    }

    // Sign in with email + password
    const { error: signInErr } = await signInWithEmail(loginEmail, password);
    if (signInErr) {
      setError('كلمة المرور غير صحيحة. تأكد من إدخالها بشكل صحيح.');
    }
    setLoading(false);
  };

  const handleAdminSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase Auth requires an email — derive a technical one from the username
    const slug = adminForm.username.trim().toLowerCase().replace(/\s+/g, '.');
    const techEmail = `${slug}@school.internal`;

    const { error: err } = await supabase.auth.signUp({
      email: techEmail,
      password: adminForm.password,
      options: { data: { full_name: adminForm.fullName, role: 'admin' } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const adminUsername = adminForm.username.trim();
      await supabase.from('profiles')
        .update({
          full_name: adminForm.fullName,
          role: 'admin',
          is_active: true,
          username: adminUsername,
        })
        .eq('id', userData.user.id);

    }
    window.location.reload();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white shadow-lg mb-3">
            <GraduationCap size={36} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">منصة المدرسة</h1>
          <p className="text-sm text-gray-500 mt-1">نظام إدارة المدرسة المتكامل</p>
        </div>

        <div className="card p-8">
          {/* Account type selector */}
          <div className="mb-6">
            <label className="label mb-2 block">نوع الحساب</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setAccountType('student'); setError(null); }}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  accountType === 'student'
                    ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <GraduationCap size={18} className="inline-block ml-1" />
                طالب
              </button>
              <button
                type="button"
                onClick={() => { setAccountType('teacher'); setError(null); }}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  accountType === 'teacher'
                    ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <User size={18} className="inline-block ml-1" />
                مدرس
              </button>
              <button
                type="button"
                onClick={() => { setAccountType('admin'); setError(null); }}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  accountType === 'admin'
                    ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Shield size={18} className="inline-block ml-1" />
                مدير
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pr-10"
                  placeholder="أدخل اسم المستخدم"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10 pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Grade selector — only for students, verification only */}
            {accountType === 'student' && (
              <div>
                <label className="label">الصف الدراسي</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedGrade('grade_10'); setError(null); }}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedGrade === 'grade_10'
                        ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    الصف الأول الثانوي
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedGrade('grade_11'); setError(null); }}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedGrade === 'grade_11'
                        ? 'bg-primary-50 text-primary-700 border-2 border-primary-500'
                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    الصف الثاني الثانوي
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  اختر صفك الدراسي — يتم التحقق من المطابقة عند تسجيل الدخول
                </p>
              </div>
            )}

            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-4">
            لا يمكن إنشاء حساب جديد من هذه الصفحة — جميع الحسابات تُنشأ من لوحة الإدارة
          </p>
        </div>

        {/* First-admin bootstrap — only when no admin exists */}
        {!adminExists && (
          <div className="mt-4">
            {!showAdminSetup ? (
              <button
                onClick={() => setShowAdminSetup(true)}
                className="w-full text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5"
              >
                <Shield size={14} />
                إعداد حساب المدير الأول
              </button>
            ) : (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-primary-600" />
                  إعداد حساب المدير الأول
                </h3>
                <form onSubmit={handleAdminSetup} className="space-y-3">
                  <input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="اسم المستخدم"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="input-field"
                    required
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="input-field"
                    required
                    minLength={6}
                  />
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'جاري الإنشاء...' : 'إنشاء حساب المدير'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
