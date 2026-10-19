import { ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  Megaphone,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCircle,
  Heart,
  FileText,
} from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: ReactNode;
  key: string;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, key: 'overview' },
    { label: 'المستخدمون', icon: <Users size={20} />, key: 'users' },
    { label: 'سجلات الطلاب', icon: <GraduationCap size={20} />, key: 'student_slots' },
    { label: 'سجلات المدرسين', icon: <UserCircle size={20} />, key: 'teacher_slots' },
    { label: 'الطلاب (حسابات)', icon: <GraduationCap size={20} />, key: 'students' },
    { label: 'المدرسون (حسابات)', icon: <UserCircle size={20} />, key: 'teachers' },
    { label: 'أولياء الأمور', icon: <Heart size={20} />, key: 'parents' },
    { label: 'الصفوف والفصول', icon: <BookOpen size={20} />, key: 'classes' },
    { label: 'المواد', icon: <FileText size={20} />, key: 'subjects' },
    { label: 'الجداول', icon: <Calendar size={20} />, key: 'schedules' },
    { label: 'الإعلانات', icon: <Megaphone size={20} />, key: 'announcements' },
    { label: 'التقارير', icon: <BarChart3 size={20} />, key: 'reports' },
  ],
  teacher: [
    { label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, key: 'overview' },
    { label: 'فصولي وموادي', icon: <BookOpen size={20} />, key: 'classes' },
    { label: 'الدرجات', icon: <GraduationCap size={20} />, key: 'grades' },
    { label: 'الواجبات', icon: <ClipboardList size={20} />, key: 'assignments' },
    { label: 'الحضور والغياب', icon: <Calendar size={20} />, key: 'attendance' },
    { label: 'منشوراتي', icon: <FileText size={20} />, key: 'posts' },
    { label: 'الإعلانات', icon: <Megaphone size={20} />, key: 'announcements' },
  ],
  student: [
    { label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, key: 'overview' },
    { label: 'درجاتي', icon: <GraduationCap size={20} />, key: 'grades' },
    { label: 'موادي', icon: <BookOpen size={20} />, key: 'subjects' },
    { label: 'جدولي', icon: <Calendar size={20} />, key: 'schedule' },
    { label: 'الواجبات', icon: <ClipboardList size={20} />, key: 'assignments' },
    { label: 'الحضور والغياب', icon: <Calendar size={20} />, key: 'attendance' },
    { label: 'منشورات المدرسين', icon: <FileText size={20} />, key: 'posts' },
    { label: 'الإعلانات', icon: <Megaphone size={20} />, key: 'announcements' },
  ],
  parent: [
    { label: 'لوحة التحكم', icon: <LayoutDashboard size={20} />, key: 'overview' },
    { label: 'أبنائي', icon: <Users size={20} />, key: 'children' },
    { label: 'الدرجات', icon: <GraduationCap size={20} />, key: 'grades' },
    { label: 'الحضور والغياب', icon: <Calendar size={20} />, key: 'attendance' },
    { label: 'الواجبات', icon: <ClipboardList size={20} />, key: 'assignments' },
    { label: 'منشورات المدرسين', icon: <FileText size={20} />, key: 'posts' },
    { label: 'الإعلانات', icon: <Megaphone size={20} />, key: 'announcements' },
  ],
};

const roleLabels: Record<UserRole, string> = {
  admin: 'مدير النظام',
  teacher: 'مدرس',
  student: 'طالب',
  parent: 'ولي أمر',
};

interface DashboardLayoutProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  children: ReactNode;
}

export default function DashboardLayout({ activeTab, onTabChange, children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!profile) return null;

  const navItems = navItemsByRole[profile.role] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-64 bg-white border-l border-gray-200 flex flex-col z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white flex-shrink-0">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">منصة المدرسة</h1>
            <p className="text-xs text-gray-500">{roleLabels[profile.role]}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onTabChange(item.key);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === item.key
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name || 'المستخدم'}</p>
              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error-600 hover:bg-error-50 transition-colors"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
              <GraduationCap size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">منصة المدرسة</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
