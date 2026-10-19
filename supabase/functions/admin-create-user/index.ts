import { createClient } from "npm:@supabase/supabase-js@2.57.4";
// admin-create-user edge function

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserBody {
  email: string;
  password: string;
  full_name: string;
  role: "student" | "teacher" | "parent";
  username?: string;
  student_number?: string;
  employee_number?: string;
  specialization?: string;
  class_id?: string;
  track?: "engineering_cs" | "medical_life";
  specialization_subject_id?: string;
}

interface ResetPasswordBody {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      return new Response(JSON.stringify({ error: "صلاحيات غير كافية - مطلوب حساب مدير" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action;

    if (action === "create_user") {
      const payload = body as CreateUserBody & { action: string };

      if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
        return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.password.length < 6) {
        return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", payload.email)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "البريد الإلكتروني مستخدم بالفعل" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.username) {
        const { data: existingUsername } = await adminClient
          .from("profiles")
          .select("id")
          .eq("username", payload.username)
          .maybeSingle();
        if (existingUsername) {
          return new Response(JSON.stringify({ error: `اسم المستخدم "${payload.username}" مستخدم بالفعل` }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (payload.role === "student" && payload.student_number) {
        const { data: existingNum } = await adminClient
          .from("students")
          .select("id")
          .eq("student_number", payload.student_number)
          .maybeSingle();
        if (existingNum) {
          return new Response(JSON.stringify({ error: `رقم الطالب "${payload.student_number}" مستخدم بالفعل` }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (payload.role === "teacher" && payload.employee_number) {
        const { data: existingNum } = await adminClient
          .from("teachers")
          .select("id")
          .eq("employee_number", payload.employee_number)
          .maybeSingle();
        if (existingNum) {
          return new Response(JSON.stringify({ error: `الرقم الوظيفي "${payload.employee_number}" مستخدم بالفعل` }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (payload.role === "student" && payload.class_id) {
        const { data: cls } = await adminClient
          .from("classes")
          .select("capacity")
          .eq("id", payload.class_id)
          .maybeSingle();
        if (cls) {
          const { count } = await adminClient
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", payload.class_id);
          if ((count || 0) >= cls.capacity) {
            return new Response(JSON.stringify({ error: `الفصل ممتلئ - السعة القصوى ${cls.capacity} طالب` }), {
              status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.full_name,
          role: payload.role,
          username: payload.username || null,
        },
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "فشل إنشاء المستخدم" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = newUser.user.id;

      await adminClient.from("profiles")
        .update({ full_name: payload.full_name, role: payload.role, username: payload.username || null })
        .eq("id", userId);

      if (payload.role === "student") {
        await adminClient.from("students").upsert({
          id: userId,
          student_number: payload.student_number || `STU-${Date.now()}`,
          class_id: payload.class_id || null,
          track: payload.track || null,
          specialization_subject_id: payload.specialization_subject_id || null,
        });
      } else if (payload.role === "teacher") {
        await adminClient.from("teachers").upsert({
          id: userId,
          employee_number: payload.employee_number || `EMP-${Date.now()}`,
          specialization: payload.specialization || null,
        });
      } else if (payload.role === "parent") {
        await adminClient.from("parents").upsert({ id: userId });
      }

      return new Response(JSON.stringify({
        success: true,
        user_id: userId,
        message: "تم إنشاء الحساب بنجاح",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const payload = body as ResetPasswordBody & { action: string };

      if (!payload.user_id || !payload.new_password) {
        return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.new_password.length < 6) {
        return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(
        payload.user_id,
        { password: payload.new_password }
      );

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "إجراء غير معروف" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "خطأ داخلي" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
