import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Encabezados CORS para permitir peticiones desde tu frontend en Netlify o localhost
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req: Request) => {
  // Manejar peticiones de pre-vuelo CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Las variables de entorno de Supabase no están correctamente configuradas en el servidor.')
    }

    // 1. Obtener la cabecera de Autorización del usuario solicitante
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Acceso Denegado: No se proporcionó cabecera de autorización.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Crear cliente administrativo para validar la sesión de forma directa y segura
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Extraer token de acceso
    const token = authHeader.replace("Bearer ", "").trim()

    // Validar el token directamente en Supabase Auth usando el cliente administrativo
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: `Acceso Denegado: Token de autenticación inválido o expirado. Detalles: ${authError?.message || 'Usuario no encontrado'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Consultar el perfil del usuario autenticado en la base de datos para validar su rol
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso Denegado: Se requieren permisos de Administrador para esta acción.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Procesar el cuerpo de la solicitud
    const body = await req.json()
    const { action } = body

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Parámetro "action" es requerido en el body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // ACCIÓN: CAMBIAR CONTRASEÑA DE USUARIO
    // ==========================================
    if (action === 'change-password') {
      const { userId, newPassword } = body

      if (!userId || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros: "userId" y "newPassword" son obligatorios.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'La contraseña debe tener un mínimo de 6 caracteres.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Ejecutar la actualización de la contraseña mediante la API de administración
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Error al actualizar: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'La contraseña ha sido actualizada con éxito.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // ACCIÓN: ELIMINAR USUARIO DE AUTH
    // ==========================================
    if (action === 'delete-user') {
      const { userId } = body

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros: "userId" es obligatorio.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Eliminar de Auth de Supabase
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Error al eliminar de Auth: ${deleteError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'El usuario ha sido eliminado de forma exitosa de Auth.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // ACCIÓN: CREAR NUEVO USUARIO Y PERFIL
    // ==========================================
    if (action === 'create-user') {
      const { email, password, fullName, role, cedula, department, courseIds } = body

      if (!email || !password || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: 'Faltan parámetros requeridos para la creación de usuario.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 1. Crear usuario en Auth de Supabase (sin confirmación de email para conveniencia del panel)
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (adminError) {
        return new Response(
          JSON.stringify({ error: `Error en Auth: ${adminError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newUserId = adminData.user.id

      // 2. Insertar en la tabla "profiles"
      const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
        id: newUserId,
        email,
        full_name: fullName,
        role,
        cedula: cedula || null,
      })

      if (profileInsertError) {
        // Rollback opcional: eliminar el auth user creado si falla el perfil
        await supabaseAdmin.auth.admin.deleteUser(newUserId)
        return new Response(
          JSON.stringify({ error: `Error al crear perfil: ${profileInsertError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3. Crear el perfil específico por rol
      if (role === "student") {
        const { error: studentError } = await supabaseAdmin.from("student_profiles").insert({
          user_id: newUserId,
          student_id: `STU-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          department: department || '',
          enrollment_year: new Date().getFullYear(),
        })
        if (studentError) {
          await supabaseAdmin.auth.admin.deleteUser(newUserId)
          return new Response(
            JSON.stringify({ error: `Error al crear perfil de estudiante: ${studentError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Matricular inmediatamente en los cursos si se especificaron
        if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
          const enrollInserts = courseIds.map(cid => ({
            student_id: newUserId,
            course_id: cid
          }))
          const { error: enrollError } = await supabaseAdmin.from("enrollments").insert(enrollInserts)
          if (enrollError) {
            console.error("Error al matricular en cursos durante creación:", enrollError.message)
          }
        }

      } else if (role === "teacher") {
        const { error: teacherError } = await supabaseAdmin.from("teacher_profiles").insert({
          user_id: newUserId,
          employee_id: `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          department: department || '',
          title: "Profesor",
        })
        if (teacherError) {
          await supabaseAdmin.auth.admin.deleteUser(newUserId)
          return new Response(
            JSON.stringify({ error: `Error al crear perfil de profesor: ${teacherError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Asignar inmediatamente como profesor en los cursos especificados
        if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
          for (const cid of courseIds) {
            const { error: assignError } = await supabaseAdmin
              .from("courses")
              .update({ teacher_id: newUserId })
              .eq("id", cid)
            if (assignError) {
              console.error(`Error al asignar profesor a curso ${cid}:`, assignError.message)
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Usuario y perfiles creados exitosamente en el servidor.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: `Acción "${action}" no soportada.` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Excepción interna del servidor: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})