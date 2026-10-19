import { supabase } from '@/lib/supabase';

interface CreateUserParams {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'teacher' | 'parent';
  username?: string;
  student_number?: string;
  employee_number?: string;
  specialization?: string;
  class_id?: string;
  track?: 'engineering_cs' | 'medical_life';
  specialization_subject_id?: string;
}

interface CreateUserResult {
  success: boolean;
  error?: string;
  user_id?: string;
}

interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export async function adminCreateUser(params: CreateUserParams): Promise<CreateUserResult> {
  const token = await getAuthToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'create_user', ...params }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    return { success: false, error: data.error || `فشل الطلب (${response.status})` };
  }

  return { success: true, user_id: data.user_id };
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<ResetPasswordResult> {
  const token = await getAuthToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'reset_password', user_id: userId, new_password: newPassword }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    return { success: false, error: data.error || `فشل الطلب (${response.status})` };
  }

  return { success: true };
}

export function generateRandomPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
