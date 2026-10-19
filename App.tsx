import { useAuth } from '@/context/AuthContext';
import AuthPage from '@/components/AuthPage';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';
import { FullPageSpinner } from '@/components/ui/States';

function App() {
  const { profile, loading } = useAuth();

  if (loading) return <FullPageSpinner message="جاري التحميل..." />;

  if (!profile) return <AuthPage />;

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">الحساب موقوف</h2>
          <p className="text-sm text-gray-500">تم إيقاف حسابك. يرجى التواصل مع إدارة المدرسة.</p>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'parent':
      return <ParentDashboard />;
    default:
      return <AuthPage />;
  }
}

export default App;
