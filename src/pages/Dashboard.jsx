import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, profile, loading, logout, isStudent, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // --- SEGURIDAD: CAMBIO OBLIGATORIO DE CONTRASEÑA EN PRIMER LOGUEO ---
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile && profile.require_password_change === true) {
      setForcePasswordChange(true);
    } else {
      setForcePasswordChange(false);
    }
  }, [profile]);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setUpdatingPassword(true);

      // 1. Actualizar contraseña en el Auth de Supabase
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) throw authError;

      // 2. Apagar la bandera en public.profiles
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ require_password_change: false })
        .eq("id", user.id);

      if (dbError) throw dbError;

      alert(
        "¡Tu contraseña ha sido actualizada y tu cuenta ya está activa! Redirigiendo...",
      );
      setForcePasswordChange(false);
      window.location.reload();
    } catch (err) {
      console.error("Error al actualizar la contraseña:", err);
      setPasswordError(err.message || "Error al actualizar la contraseña.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // --- ESTADOS EXCLUSIVOS DEL DOCENTE (MÉTRICAS GLOBALES) ---
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [courseAverages, setCourseAverages] = useState([]); // [{ courseId, name, code, average }]

  // Derivamos los roles de forma ultra segura para evitar fallos si el AuthContext no los expone de inmediato
  const isAdminUser = profile?.role === "admin";
  const isTeacherUser = isTeacher || profile?.role === "teacher";
  const isStudentUser =
    isStudent ||
    profile?.role === "student" ||
    (!isTeacherUser && !isAdminUser);

  // Auto-corrección de URLs de almacenamiento de Supabase (Error 400 Bypass)
  const getCorrectUrl = (url) => {
    if (!url) return "";
    if (
      url.includes("/storage/v1/object/") &&
      !url.includes("/storage/v1/object/public/")
    ) {
      return url.replace("/storage/v1/object/", "/storage/v1/object/public/");
    }
    return url;
  };

  useEffect(() => {
    const loadMyCourses = async () => {
      if (!user) {
        setLoadingCourses(false);
        return;
      }
      try {
        let coursesData = [];

        if (isStudentUser) {
          // ESTUDIANTE: Cargar los cursos en los que está matriculado (tabla enrollments)
          const { data: enrollments, error: enrollError } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", user.id);

          if (enrollError) throw enrollError;

          const courseIds = enrollments?.map((e) => e.course_id) || [];
          if (courseIds.length > 0) {
            const { data, error: coursesError } = await supabase
              .from("courses")
              .select("id, name, code, description, thumbnail_url")
              .in("id", courseIds);

            if (coursesError) throw coursesError;
            coursesData = data || [];
          }
        } else if (isTeacherUser) {
          // PROFESOR: Cargar los cursos asignados a este profesor (teacher_id en tabla courses)
          const { data, error: teacherError } = await supabase
            .from("courses")
            .select("id, name, code, description, thumbnail_url")
            .eq("teacher_id", user.id);

          if (teacherError) throw teacherError;
          coursesData = data || [];
        } else if (isAdminUser) {
          // ADMINISTRADOR: Por comodidad, si ingresa al Dashboard puede ver todos los cursos activos
          const { data, error: adminError } = await supabase
            .from("courses")
            .select("id, name, code, description, thumbnail_url")
            .order("name");

          if (adminError) throw adminError;
          coursesData = data || [];
        }

        setMyCourses(coursesData);
      } catch (err) {
        console.error("Error cargando cursos en el Dashboard:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    // Solo cargamos los cursos una vez que el perfil y el usuario estén listos
    if (!loading) {
      loadMyCourses();
    }
  }, [user, profile, loading, isStudentUser, isTeacherUser, isAdminUser]);

  // Carga de Métricas y Datos globales exclusivos para el Profesor
  useEffect(() => {
    const loadTeacherMetrics = async () => {
      if (!user || !isTeacherUser || myCourses.length === 0) return;

      try {
        setLoadingMetrics(true);
        const courseIds = myCourses.map((c) => c.id);

        // 1. OBTENER TOTAL DE ESTUDIANTES ÚNICOS
        const { data: enrolls, error: enrollErr } = await supabase
          .from("enrollments")
          .select("student_id")
          .in("course_id", courseIds);

        if (!enrollErr && enrolls) {
          const uniqueStudents = new Set(enrolls.map((e) => e.student_id));
          setTotalStudentsCount(uniqueStudents.size);
        }

        // 2. OBTENER PROYECTOS/TAREAS PENDIENTES DE CALIFICAR (De todos los cursos del docente)
        // Buscamos módulos de estos cursos
        const { data: modulesData } = await supabase
          .from("modules")
          .select("id, course_id")
          .in("course_id", courseIds);

        if (modulesData && modulesData.length > 0) {
          const modIds = modulesData.map((m) => m.id);
          const modToCourseMap = {};
          modulesData.forEach((m) => {
            modToCourseMap[m.id] = m.course_id;
          });

          // Buscamos tareas de esos módulos
          const { data: assigns } = await supabase
            .from("assignments")
            .select("id, title, module_id")
            .in("module_id", modIds);

          if (assigns && assigns.length > 0) {
            const assignIds = assigns.map((a) => a.id);
            const assignToTitleAndCourseMap = {};
            assigns.forEach((a) => {
              assignToTitleAndCourseMap[a.id] = {
                title: a.title,
                courseId: modToCourseMap[a.module_id],
              };
            });

            // Buscamos entregas (submissions) que NO estén calificadas (grade es null)
            const { data: subs, error: subsErr } = await supabase
              .from("submissions")
              .select(
                "id, file_url, file_name, submitted_at, student_id, assignment_id",
              )
              .in("assignment_id", assignIds)
              .is("grade", null);

            if (!subsErr && subs && subs.length > 0) {
              const studentIds = subs.map((s) => s.student_id);

              // Buscamos los perfiles de los alumnos de esas entregas
              const { data: studentProfiles } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", studentIds);

              const enrichedSubs = subs.map((sub) => {
                const studentProf = studentProfiles?.find(
                  (p) => p.id === sub.student_id,
                );
                const assignMeta = assignToTitleAndCourseMap[sub.assignment_id];
                const courseMeta = myCourses.find(
                  (c) => c.id === assignMeta?.courseId,
                );

                return {
                  id: sub.id,
                  fileName: sub.file_name,
                  fileUrl: sub.file_url,
                  submittedAt: sub.submitted_at,
                  assignmentTitle: assignMeta?.title || "Tarea",
                  courseName: courseMeta?.name || "Curso",
                  courseId: courseMeta?.id,
                  studentName: studentProf?.full_name || "Estudiante",
                  studentEmail: studentProf?.email || "",
                };
              });

              setPendingSubmissions(enrichedSubs);
            } else {
              setPendingSubmissions([]);
            }

            // 3. CALCULAR RENDIMIENTO PROMEDIO DE CADA GRUPO
            // Buscamos notas de tareas (submissions) aprobadas/calificadas
            const { data: gradedSubs } = await supabase
              .from("submissions")
              .select("grade, assignment_id")
              .in("assignment_id", assignIds)
              .not("grade", "is", null);

            // Buscamos exámenes de estos módulos
            const { data: quizzesData } = await supabase
              .from("quizzes")
              .select("id, module_id")
              .in("module_id", modIds);

            let gradedQuizzesSubs = [];
            const quizToCourseMap = {};
            if (quizzesData && quizzesData.length > 0) {
              const quizIds = quizzesData.map((q) => q.id);
              quizzesData.forEach((q) => {
                quizToCourseMap[q.id] = modToCourseMap[q.module_id];
              });

              const { data: quizSubs } = await supabase
                .from("quiz_submissions")
                .select("score, quiz_id")
                .in("quiz_id", quizIds);

              gradedQuizzesSubs = quizSubs || [];
            }

            // Agregamos las notas por curso
            const courseScores = {};
            courseIds.forEach((cid) => {
              courseScores[cid] = [];
            });

            // Mapear notas de tareas
            gradedSubs?.forEach((sub) => {
              const assignMeta = assignToTitleAndCourseMap[sub.assignment_id];
              if (assignMeta && courseScores[assignMeta.courseId]) {
                courseScores[assignMeta.courseId].push(parseFloat(sub.grade));
              }
            });

            // Mapear notas de exámenes
            gradedQuizzesSubs.forEach((qsub) => {
              const courseId = quizToCourseMap[qsub.quiz_id];
              if (courseId && courseScores[courseId]) {
                courseScores[courseId].push(parseFloat(qsub.score));
              }
            });

            // Calcular promedios
            const averages = myCourses.map((course) => {
              const grades = courseScores[course.id] || [];
              const average =
                grades.length > 0
                  ? Math.round(
                      grades.reduce((a, b) => a + b, 0) / grades.length,
                    )
                  : null;

              return {
                courseId: course.id,
                name: course.name,
                code: course.code,
                average: average,
              };
            });

            setCourseAverages(averages);
          } else {
            // Sin tareas, verificamos si hay exámenes
            setCourseAverages(
              myCourses.map((c) => ({
                courseId: c.id,
                name: c.name,
                code: c.code,
                average: null,
              })),
            );
          }
        } else {
          // Sin módulos
          setCourseAverages(
            myCourses.map((c) => ({
              courseId: c.id,
              name: c.name,
              code: c.code,
              average: null,
            })),
          );
        }
      } catch (err) {
        console.error("Error cargando métricas de docente:", err);
      } finally {
        setLoadingMetrics(false);
      }
    };

    if (!loadingCourses && isTeacherUser) {
      loadTeacherMetrics();
    }
  }, [loadingCourses, myCourses, isTeacherUser, user]);

  // Redirección inteligente según el rol del usuario que hace clic
  const handleGoToCourse = (course) => {
    if (isTeacherUser) {
      navigate(`/teacher/course/${course.id}`);
    } else {
      navigate(`/classroom/${course.id}`);
    }
  };

  if (loading) {
    return (
      <div
        className="loading-screen"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#0c0f14",
          color: "#f59e0b",
          fontSize: "1.5rem",
          fontWeight: "bold",
        }}
      >
        Cargando perfil institucional...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="unauthenticated"
        style={{
          textAlign: "center",
          padding: "4rem",
          background: "#0c0f14",
          minHeight: "100vh",
          color: "white",
        }}
      >
        <h1 style={{ color: "#ef4444" }}>No estás autenticado</h1>
        <p style={{ color: "#94a3b8", margin: "1rem 0 2rem 0" }}>
          Debes iniciar sesión para acceder a ABC Digital STEAM.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "#f59e0b",
            color: "black",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Ir al Inicio de Sesión
        </button>
      </div>
    );
  }

  // --- RENDERING DEL FORMULARIO DE CAMBIO DE CONTRASEÑA OBLIGATORIO ---
  if (forcePasswordChange) {
    return (
      <div
        className="password-change-force-container"
        style={{
          minHeight: "100vh",
          background: "#0c0f14",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          className="password-change-card"
          style={{
            background: "#141923",
            border: "2px solid #f59e0b",
            borderRadius: "16px",
            padding: "2.5rem",
            maxWidth: "450px",
            width: "100%",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: "3.5rem",
              display: "block",
              marginBottom: "1rem",
            }}
          >
            🔐
          </span>
          <h2
            style={{
              color: "#f59e0b",
              marginBottom: "0.5rem",
              fontWeight: "800",
              fontSize: "1.8rem",
            }}
          >
            Actualización Obligatoria
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              lineHeight: "1.5",
              marginBottom: "2rem",
            }}
          >
            Por motivos de seguridad institucional y privacidad, debes cambiar
            tu contraseña genérica temporal antes de activar tu cuenta en{" "}
            <strong>ABC Digital STEAM</strong>.
          </p>

          <form
            onSubmit={handlePasswordChangeSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              textAlign: "left",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  color: "#cbd5e1",
                }}
              >
                Nueva Contraseña:
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  background: "#0c0f14",
                  border: "1px solid #334155",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  color: "#cbd5e1",
                }}
              >
                Confirmar Nueva Contraseña:
              </label>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  background: "#0c0f14",
                  border: "1px solid #334155",
                  color: "white",
                  outline: "none",
                }}
              />
            </div>

            {passwordError && (
              <p
                style={{
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  margin: "0",
                  fontWeight: "bold",
                }}
              >
                ⚠️ {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={updatingPassword}
              style={{
                background: "#f59e0b",
                color: "black",
                fontWeight: "bold",
                border: "none",
                padding: "1rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "all 0.3s",
                marginTop: "1rem",
              }}
            >
              {updatingPassword
                ? "Actualizando seguridad..."
                : "Activar mi Cuenta 🚀"}
            </button>
          </form>

          <button
            onClick={logout}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "none",
              cursor: "pointer",
              fontSize: "0.9rem",
              textDecoration: "underline",
              marginTop: "1.5rem",
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Definir rol en texto legible
  const getRoleBadgeLabel = () => {
    if (isAdminUser) return "Administrador";
    if (isTeacherUser) return "Profesor";
    return "Estudiante";
  };

  return (
    <div className="dashboard-container">
      {/* HEADER GLOBAL */}
      <header className="dashboard-header">
        <h1 className="dashboard-logo">ABC Digital STEAM</h1>
        <div className="dashboard-user-info">
          <div className="user-greeting">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #f59e0b",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#111",
                    fontWeight: "bold",
                    fontSize: "1.5rem",
                  }}
                >
                  {profile?.full_name?.[0] || user.email[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                  {profile?.full_name || user.email}
                </div>
                <span
                  className="user-role"
                  style={{
                    fontSize: "0.85rem",
                    color: isTeacherUser || isAdminUser ? "#f59e0b" : "#10b981",
                    fontWeight: "bold",
                  }}
                >
                  ({getRoleBadgeLabel()})
                </span>
              </div>
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2 className="dashboard-title">
          Hola, {profile?.full_name?.split(" ")[0] || user.email.split("@")[0]}
        </h2>

        {/* ==================================================================== */}
        {/* VISTA ESPECTACULAR EXCLUSIVA PARA EL DOCENTE (TEACHER DASHBOARD) */}
        {/* ==================================================================== */}
        {isTeacherUser ? (
          <div className="teacher-dashboard-view animate-fade">
            {/* TARJETAS DE MÉTRICAS CLAVE */}
            <div
              className="metrics-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2.5rem",
              }}
            >
              <div
                className="metric-card"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  padding: "1.5rem",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                }}
              >
                <span style={{ fontSize: "3rem" }}>👨‍🎓</span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Alumnos bajo tu Tutoría
                  </h3>
                  <strong
                    style={{
                      fontSize: "2.5rem",
                      color: "#f59e0b",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    {loadingMetrics ? "..." : totalStudentsCount}
                  </strong>
                </div>
              </div>

              <div
                className="metric-card"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  padding: "1.5rem",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                }}
              >
                <span style={{ fontSize: "3rem" }}>📚</span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Mis Cursos Asignados
                  </h3>
                  <strong
                    style={{
                      fontSize: "2.5rem",
                      color: "#3b82f6",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    {loadingCourses ? "..." : myCourses.length}
                  </strong>
                </div>
              </div>

              <div
                className="metric-card"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: "1.5rem",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                }}
              >
                <span style={{ fontSize: "3rem" }}>📥</span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Proyectos por Calificar
                  </h3>
                  <strong
                    style={{
                      fontSize: "2.5rem",
                      color: "#10b981",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    {loadingMetrics ? "..." : pendingSubmissions.length}
                  </strong>
                </div>
              </div>
            </div>

            {/* FILA DE CONTENIDO: GRÁFICO DE RENDIMIENTO + LISTA DE CALIFICACIONES PENDIENTES */}
            <div
              className="teacher-dashboard-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "2rem",
                marginBottom: "3rem",
                alignItems: "start",
              }}
            >
              {/* COLUMNA 1: LISTADO UNIFICADO DE PROYECTOS PENDIENTES */}
              <div
                className="card-section"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h3 style={{ margin: 0, color: "white", fontSize: "1.3rem" }}>
                    📥 Entregas Pendientes de Calificar
                  </h3>
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                    }}
                  >
                    {pendingSubmissions.length} Tareas
                  </span>
                </div>

                {loadingMetrics ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    Consultando entregas en los servidores...
                  </p>
                ) : pendingSubmissions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "3rem 1rem",
                      background: "var(--bg-main)",
                      borderRadius: "12px",
                      border: "1px dashed var(--border-muted)",
                    }}
                  >
                    <span style={{ fontSize: "2.5rem" }}>🎉</span>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        marginTop: "0.75rem",
                        marginBottom: 0,
                      }}
                    >
                      ¡Excelente! No tienes proyectos pendientes de calificar.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "380px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {pendingSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          background: "var(--bg-main)",
                          border: "1px solid var(--border-light)",
                          borderRadius: "10px",
                          padding: "1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <strong
                            style={{
                              color: "#60a5fa",
                              display: "block",
                              fontSize: "0.95rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sub.studentName}
                          </strong>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                              display: "block",
                            }}
                          >
                            En: {sub.courseName}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#f59e0b",
                              display: "block",
                              marginTop: "0.25rem",
                            }}
                          >
                            📋 {sub.assignmentTitle}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            navigate(`/teacher/course/${sub.courseId}`)
                          }
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Calificar →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* COLUMNA 2: GRÁFICO DE RENDIMIENTO PROMEDIO DE GRUPOS (SVG) */}
              <div
                className="card-section"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    color: "white",
                    fontSize: "1.3rem",
                  }}
                >
                  📊 Rendimiento Promedio por Grupo
                </h3>

                {loadingMetrics ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    Calculando estadísticas de notas...
                  </p>
                ) : courseAverages.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    No hay datos suficientes para generar estadísticas.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                    }}
                  >
                    {courseAverages.map((courseAvg, index) => {
                      const colors = [
                        "#f59e0b",
                        "#10b981",
                        "#3b82f6",
                        "#8b5cf6",
                      ];
                      const barColor = colors[index % colors.length];
                      const scorePercent =
                        courseAvg.average !== null ? courseAvg.average : 0;

                      return (
                        <div
                          key={courseAvg.courseId}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.9rem",
                            }}
                          >
                            <span
                              style={{ fontWeight: "bold", color: "white" }}
                            >
                              {courseAvg.name} ({courseAvg.code})
                            </span>
                            <strong style={{ color: barColor }}>
                              {courseAvg.average !== null
                                ? `${courseAvg.average} / 100`
                                : "Sin notas"}
                            </strong>
                          </div>
                          <div
                            style={{
                              height: "12px",
                              background: "var(--bg-main)",
                              borderRadius: "6px",
                              overflow: "hidden",
                              border: "1px solid var(--border-light)",
                            }}
                          >
                            <div
                              style={{
                                width: `${scorePercent}%`,
                                height: "100%",
                                background: barColor,
                                borderRadius: "6px",
                                transition: "width 0.8s ease-out",
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* LISTA COMPLETA DE MIS MATERIAS */}
            <div style={{ marginBottom: "2rem" }}>
              <h3
                className="section-title"
                style={{ marginBottom: "1.5rem", color: "#f59e0b" }}
              >
                Mis Materias Asignadas
              </h3>
              {loadingCourses ? (
                <p>Cargando materias...</p>
              ) : myCourses.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>
                  No tienes materias asignadas actualmente.
                </p>
              ) : (
                <div className="cards-grid">
                  {myCourses.map((course) => (
                    <div
                      key={course.id}
                      className="card"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-muted)",
                        borderRadius: "14px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {course.thumbnail_url && (
                        <img
                          src={course.thumbnail_url}
                          alt={course.name}
                          style={{
                            width: "100%",
                            height: "140px",
                            objectFit: "cover",
                            borderBottom: "1px solid var(--border-muted)",
                          }}
                        />
                      )}
                      <div style={{ padding: "1.25rem", flexGrow: 1 }}>
                        <h4
                          style={{
                            margin: "0 0 0.5rem 0",
                            color: "white",
                            fontSize: "1.2rem",
                          }}
                        >
                          {course.name}
                        </h4>
                        <span
                          className="course-code-badge"
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            color: "#f59e0b",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                          }}
                        >
                          {course.code}
                        </span>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            marginTop: "1rem",
                            lineHeight: "1.4",
                          }}
                        >
                          {course.description || "Sin descripción registrada."}
                        </p>
                      </div>
                      <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleGoToCourse(course)}
                          style={{
                            width: "100%",
                            background: "#3b82f6",
                            color: "white",
                            fontWeight: "bold",
                            border: "none",
                            padding: "0.8rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          Gestionar clases →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ====================================================================
          // VISTA ESTÁNDAR PARA EL ESTUDIANTE O ADMINISTRADOR
          // ====================================================================
          <section style={{ marginBottom: "4rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3
                className="section-title"
                style={{
                  background: "transparent",
                  color: "#f59e0b",
                  fontSize: "1.3rem",
                  padding: "2.5rem 1.5rem",
                }}
              >
                {isAdminUser
                  ? "Panel Global de Cursos (Vista Admin)"
                  : "Mis Cursos Inscritos"}
              </h3>
              {isStudentUser && (
                <button
                  onClick={() => navigate("/mis-cursos")}
                  style={{
                    background: "transparent",
                    color: "#f59e0b",
                    border: "2px solid #f59e0b",
                    padding: "0.8rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Ver todos los cursos →
                </button>
              )}
            </div>

            {loadingCourses ? (
              <div style={{ padding: "2rem", color: "var(--text-muted)" }}>
                Cargando tus aulas virtuales...
              </div>
            ) : myCourses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  background: "#141923",
                  borderRadius: "16px",
                  border: "1px dashed var(--border-light)",
                }}
              >
                <p style={{ fontSize: "1.2rem", color: "#94a3b8" }}>
                  {isAdminUser
                    ? "No hay cursos creados en la base de datos."
                    : "Aún no estás inscrito en ningún curso de tecnología STEAM."}
                </p>
                {isStudentUser && (
                  <button
                    onClick={() => navigate("/cursos")}
                    style={{
                      background: "#f59e0b",
                      color: "#111",
                      padding: "1rem 2rem",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      marginTop: "1.5rem",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Explorar cursos disponibles
                  </button>
                )}
              </div>
            ) : (
              <div className="cards-grid">
                {myCourses.map((course) => (
                  <div
                    key={course.id}
                    className="card"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-muted)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    smokescreen="true"
                  >
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.name}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderBottom: "1px solid var(--border-muted)",
                        }}
                      />
                    )}
                    <div style={{ padding: "1.25rem", flexGrow: 1 }}>
                      <h4
                        style={{
                          margin: "0 0 0.5rem 0",
                          color: "white",
                          fontSize: "1.2rem",
                        }}
                      >
                        {course.name}
                      </h4>
                      <span
                        className="course-code-badge"
                        style={{
                          background: "rgba(245, 158, 11, 0.1)",
                          color: "#f59e0b",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {course.code}
                      </span>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                          marginTop: "1rem",
                          lineHeight: "1.4",
                        }}
                      >
                        {course.description || "Sin descripción registrada."}
                      </p>
                    </div>
                    <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleGoToCourse(course)}
                        style={{
                          width: "100%",
                          background: "#f59e0b",
                          color: "black",
                          fontWeight: "bold",
                          border: "none",
                          padding: "0.8rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        Ir al Aula Virtual →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TARJETAS FIJAS DE NAVEGACIÓN GLOBAL */}
        <div className="cards-grid">
          <div
            className="card clickable-card"
            onClick={() => navigate("/profile")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div className="card-icon" style={{ fontSize: "2rem" }}>
              👤
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Mi Perfil</h3>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                }}
              >
                Ver mis datos de usuario
              </p>
            </div>
          </div>

          <div
            className="card clickable-card"
            onClick={() => navigate("/documentos")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div className="card-icon" style={{ fontSize: "2rem" }}>
              📁
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Mis Documentos</h3>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                }}
              >
                Archivos institucionales
              </p>
            </div>
          </div>

          {(isTeacherUser || isAdminUser) && (
            <div
              className="card clickable-card"
              onClick={() => navigate("/admin")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div className="card-icon" style={{ fontSize: "2rem" }}>
                ⚙️
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Panel Admin</h3>
                <p
                  style={{
                    margin: "0.25rem 0 0 0",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Control y temarios
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
