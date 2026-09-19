import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./TeacherPanel.css";
import ThemeToggle from "../components/ThemeToggle/ThemeToggle";

const TeacherPanel = () => {
  const { courseId } = useParams();
  const { user, profile, isTeacher } = useAuth();
  const navigate = useNavigate();

  const notify = (msg, type = "info") => {
    if (typeof window.showToast === "function") {
      window.showToast(msg, type);
    } else {
      console.log("[" + type + "]: " + msg);
    }
  };

  // Estados de carga e información general
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("students"); // "students", "submissions", "quizzes"
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentFilterStatus, setStudentFilterStatus] = useState("all"); // "all", "on-track", "alert", "at-risk"

  // Estados de datos
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);

  // Estados de calificación interactiva
  const [gradingScores, setGradingScores] = useState({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Aceptar",
    onConfirm: null,
  });
  const [expandedStudentQuizzes, setExpandedStudentQuizzes] = useState({});
  const [forumPosts, setForumPosts] = useState([]);
  const [expandedForumPosts, setExpandedForumPosts] = useState({});
  const [teacherReplyTexts, setReplyInputs] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostModuleId, setNewPostModuleId] = useState("");
  const [postToAllCourses, setPostToAllCourses] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Carga de preguntas del foro del curso
  const loadTeacherForumPosts = async () => {
    if (!courseId) return;
    try {
      const { data: posts, error: forumErr } = await supabase
        .from("course_forums")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (!forumErr && posts) {
        if (posts.length > 0) {
          const forumIds = posts.map((p) => p.id);
          const { data: repliesData } = await supabase
            .from("course_forum_replies")
            .select("*")
            .in("post_id", forumIds)
            .order("created_at", { ascending: true });

          const enrichedPosts = posts.map((p) => {
            const postReplies = repliesData
              ? repliesData.filter((r) => r.post_id === p.id)
              : p.replies || [];
            return { ...p, replies: postReplies };
          });
          setForumPosts(enrichedPosts);
        } else {
          setForumPosts([]);
        }
      } else {
        const localKey = `forum_posts_${courseId}`;
        const saved = localStorage.getItem(localKey);
        if (saved) {
          try {
            setForumPosts(JSON.parse(saved));
          } catch (_) {}
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadTeacherForumPosts();
  }, [courseId]);

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
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isTeacher) {
      notify(
        "Acceso denegado: Esta sección es exclusiva para profesores orientadores.",
        "error",
      );
      navigate("/dashboard");
      return;
    }
    fetchTeacherData();
  }, [courseId, user]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);

      // 1. Obtener detalles del Curso asignado
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .eq("teacher_id", user.id)
        .single();

      if (courseErr) {
        console.error("Error al cargar curso:", courseErr);
        setCourse(null);
        setLoading(false);
        return;
      }
      setCourse(courseData);

      // 2. Obtener lista de Alumnos inscritos (desde enrollments de forma robusta e independiente)
      const { data: enrollmentData, error: enrollErr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      let studentList = [];
      if (enrollErr) {
        console.error("Error al cargar alumnos inscritos:", enrollErr);
      } else if (enrollmentData && enrollmentData.length > 0) {
        const studentIds = enrollmentData.map((e) => e.student_id);

        // Consultamos la tabla public.profiles de forma explícita
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, cedula")
          .in("id", studentIds);

        if (profilesErr) {
          console.error("Error al consultar perfiles de alumnos:", profilesErr);
        } else {
          studentList = profilesData || [];
        }
      }
      setStudents(studentList);

      // 3. Cargar Módulos de este curso
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, title")
        .eq("course_id", courseId);

      const activeModules = modulesData || [];
      setModules(activeModules);

      if (activeModules.length > 0) {
        const moduleIds = activeModules.map((m) => m.id);

        // 4. Cargar Tareas asociadas a los módulos de este curso
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select("id, title, description, module_id")
          .in("module_id", moduleIds);

        const activeAssignments = assignmentsData || [];
        setAssignments(activeAssignments);

        // 5. Cargar entregas (submissions) hechas por los alumnos en estas tareas
        if (activeAssignments.length > 0) {
          const assignmentIds = activeAssignments.map((a) => a.id);
          const { data: subsData, error: subsErr } = await supabase
            .from("submissions")
            .select(
              "id, file_url, file_name, submitted_at, grade, feedback, student_id, assignment_id",
            )
            .in("assignment_id", assignmentIds);

          if (subsErr) {
            console.error("Error al cargar entregas:", subsErr);
          } else if (subsData && subsData.length > 0) {
            const studentIdsInSubs = subsData.map((s) => s.student_id);

            // Consultamos los perfiles de los estudiantes que entregaron de forma independiente
            const { data: subProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, email, cedula")
              .in("id", studentIdsInSubs);

            const subsWithProfiles = subsData.map((sub) => {
              const prof = subProfiles?.find((p) => p.id === sub.student_id);
              return {
                ...sub,
                profiles: prof || {
                  full_name: "Estudiante",
                  email: "",
                  cedula: "",
                },
              };
            });

            setSubmissions(subsWithProfiles);

            // Inicializar estados de calificación
            const scores = {};
            const feedbacks = {};
            subsWithProfiles.forEach((sub) => {
              scores[sub.id] = sub.grade !== null ? sub.grade : "";
              feedbacks[sub.id] = sub.feedback || "";
            });
            setGradingScores(scores);
            setGradingFeedbacks(feedbacks);
          } else {
            setSubmissions([]);
          }
        }

        // 6. Cargar Exámenes (Quizzes) de este curso
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("id, title, module_id")
          .in("module_id", moduleIds);

        const activeQuizzes = quizzesData || [];
        setQuizzes(activeQuizzes);

        // 7. Cargar calificaciones de Exámenes (quiz_submissions) de estos alumnos en este curso
        if (activeQuizzes.length > 0) {
          const quizIds = activeQuizzes.map((q) => q.id);
          const { data: quizSubsData, error: quizSubsErr } = await supabase
            .from("quiz_submissions")
            .select(
              "id, quiz_id, student_id, score, correct_answers, total_questions, submitted_at",
            )
            .in("quiz_id", quizIds);

          if (quizSubsErr) {
            console.error(
              "Error al cargar calificaciones de exámenes:",
              quizSubsErr,
            );
          } else if (quizSubsData && quizSubsData.length > 0) {
            const studentIdsInQuiz = quizSubsData.map((s) => s.student_id);

            // Consultamos los perfiles de los estudiantes que presentaron exámenes de forma independiente
            const { data: quizProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, email, cedula")
              .in("id", studentIdsInQuiz);

            const quizSubsWithProfiles = quizSubsData.map((qs) => {
              const prof = quizProfiles?.find((p) => p.id === qs.student_id);
              return {
                ...qs,
                profiles: prof || {
                  full_name: "Estudiante",
                  email: "",
                  cedula: "",
                },
              };
            });

            setQuizSubmissions(quizSubsWithProfiles);
          } else {
            setQuizSubmissions([]);
          }
        }
      }
    } catch (err) {
      console.error("Error crítico en panel de profesor:", err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar Calificación manual de un proyecto/tarea entregada
  const handleSaveGrade = async (submissionId) => {
    const scoreVal = gradingScores[submissionId];
    const feedbackVal = gradingFeedbacks[submissionId];

    if (
      scoreVal === "" ||
      isNaN(scoreVal) ||
      parseFloat(scoreVal) < 0 ||
      parseFloat(scoreVal) > 100
    ) {
      notify(
        "Por favor, ingresa una calificación válida de 0 a 100.",
        "warning",
      );
      return;
    }

    setSavingGradeId(submissionId);
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: parseFloat(scoreVal),
          feedback: feedbackVal.trim() || null,
        })
        .eq("id", submissionId);

      if (error) throw error;
      notify(
        "¡Proyecto calificado con éxito! El alumno ya puede ver su nota.",
        "success",
      );
      fetchTeacherData(); // Recargar datos
    } catch (err) {
      notify("Error al guardar la calificación: " + err.message, "error");
    } finally {
      setSavingGradeId(null);
    }
  };

  // Restablecer el intento de un examen para darle otra oportunidad al alumno
  const handleResetQuizAttempt = (submissionId, studentName, quizTitle) => {
    setConfirmModal({
      isOpen: true,
      title: "⚡ Restablecer Intento de Examen",
      message: `¿Estás seguro de que deseas eliminar este intento de examen y darle otra oportunidad a "${studentName}" para presentar "${quizTitle}"?`,
      confirmText: "Sí, Restablecer",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("quiz_submissions")
            .delete()
            .eq("id", submissionId);

          if (error) throw error;
          notify(
            `¡Intento restablecido con éxito! "${studentName}" puede presentar el examen "${quizTitle}" nuevamente.`,
            "success",
          );
          fetchTeacherData(); // Recargar datos
        } catch (err) {
          notify("Error al restablecer el examen: " + err.message, "error");
        }
      },
    });
  };

  // Restablecer la entrega de una tarea para darle otra oportunidad de entrega al alumno (Luis Alvaro)
  const handleResetAssignmentAttempt = (
    submissionId,
    studentName,
    assignmentTitle,
  ) => {
    setConfirmModal({
      isOpen: true,
      title: "📝 Restablecer Entrega de Tarea",
      message: `¿Estás seguro de que deseas eliminar esta entrega de tarea y darle otra oportunidad a "${studentName}" para subir su trabajo de "${assignmentTitle}"?`,
      confirmText: "Sí, Eliminar Entrega",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("submissions")
            .delete()
            .eq("id", submissionId);

          if (error) throw error;
          notify(
            `¡Entrega eliminada con éxito! "${studentName}" puede volver a subir su proyecto para "${assignmentTitle}".`,
            "success",
          );
          fetchTeacherData(); // Recargar datos
        } catch (err) {
          notify(
            "Error al restablecer la entrega de tarea: " + err.message,
            "error",
          );
        }
      },
    });
  };

  // Respuesta del docente a una duda del foro
  // Publicar nuevo foro o anuncio del profesor
  const handleTeacherCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      notify(
        "Por favor ingresa un título y el detalle de tu aviso o pregunta.",
        "warning",
      );
      return;
    }

    setSubmittingQuestion(true);
    const authorName =
      profile?.full_name || user?.email || "Profesor Orientador";
    const authorRole = profile?.role || "teacher";

    try {
      let targetCourseIds = [courseId];

      if (postToAllCourses) {
        // Consultar todos los cursos asignados a este profesor
        const { data: teacherCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("teacher_id", user.id);

        if (teacherCourses && teacherCourses.length > 0) {
          targetCourseIds = teacherCourses.map((c) => c.id);
        }
      }

      // Preparar las inserciones para Supabase
      const inserts = targetCourseIds.map((cId) => ({
        course_id: cId,
        user_id: user.id,
        author_name: authorName,
        author_role: authorRole,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        module_id: cId === courseId && newPostModuleId ? newPostModuleId : null,
        is_resolved: false,
      }));

      const { error } = await supabase.from("course_forums").insert(inserts);
      if (error) console.warn("Supabase forum error fallback:", error.message);

      // Guardar también en localStorage como respaldo instantáneo
      targetCourseIds.forEach((cId) => {
        const localKey = `forum_posts_${cId}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
        const singlePost = {
          id:
            "post-" +
            Date.now() +
            "-" +
            Math.random().toString(36).substr(2, 4),
          course_id: cId,
          user_id: user.id,
          author_name: authorName,
          author_role: authorRole,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          module_id:
            cId === courseId && newPostModuleId ? newPostModuleId : null,
          is_resolved: false,
          created_at: new Date().toISOString(),
          replies: [],
        };
        localStorage.setItem(
          localKey,
          JSON.stringify([singlePost, ...existing]),
        );
      });

      if (postToAllCourses) {
        notify(
          `¡Anuncio difundido exitosamente a todos tus ${targetCourseIds.length} cursos asignados! 🚀`,
          "success",
        );
      } else {
        notify(
          "¡Foro / Anuncio publicado exitosamente en este curso! 🚀",
          "success",
        );
      }

      loadTeacherForumPosts();
    } catch (err) {
      notify("Error al publicar foro: " + err.message, "error");
    } finally {
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostModuleId("");
      setPostToAllCourses(false);
      setSubmittingQuestion(false);
    }
  };

  const handleToggleResolvePost = async (postId, currentResolved) => {
    try {
      const { error } = await supabase
        .from("course_forums")
        .update({ is_resolved: !currentResolved })
        .eq("id", postId);

      if (error)
        console.warn("Fallback local para estado de foro:", error.message);

      const updated = forumPosts.map((p) =>
        p.id === postId ? { ...p, is_resolved: !currentResolved } : p,
      );
      setForumPosts(updated);
      localStorage.setItem(`forum_posts_${courseId}`, JSON.stringify(updated));
      notify(
        currentResolved
          ? "Foro reabierto para más comentarios."
          : "¡Foro marcado como resuelto! 🟢",
        "info",
      );
    } catch (err) {
      notify("Error al cambiar estado: " + err.message, "error");
    }
  };

  // Eliminar foro permanentemente de la base de datos
  const handleTeacherDeletePost = (postId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Foro de la Base de Datos?",
      message:
        "¿Estás seguro de que deseas eliminar este tema del foro y todas sus respuestas permanentemente de la base de datos?",
      confirmText: "Sí, Eliminar Foro",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("course_forums")
            .delete()
            .eq("id", postId);
          if (error) console.warn("Error al eliminar de DB:", error.message);

          notify(
            "Foro e hilos de respuestas eliminados exitosamente. 🗑️",
            "info",
          );
          loadTeacherForumPosts();
        } catch (err) {
          notify("Error al eliminar el foro: " + err.message, "error");
        }
      },
    });
  };

  // Eliminar respuesta individual por parte del profesor
  const handleDeleteForumReply = (replyId, postId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Comentario / Respuesta?",
      message:
        "¿Estás seguro de que deseas eliminar este comentario del foro de la base de datos?",
      confirmText: "Sí, Eliminar Comentario",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("course_forum_replies")
            .delete()
            .eq("id", replyId);

          if (error)
            console.warn("Supabase reply delete fallback:", error.message);

          setForumPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  replies: (post.replies || []).filter((r) => r.id !== replyId),
                };
              }
              return post;
            }),
          );

          const localKey = `forum_posts_${courseId}`;
          const saved = JSON.parse(localStorage.getItem(localKey) || "[]");
          const updatedSaved = saved.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                replies: (post.replies || []).filter((r) => r.id !== replyId),
              };
            }
            return post;
          });
          localStorage.setItem(localKey, JSON.stringify(updatedSaved));

          notify("Comentario eliminado exitosamente. 🗑️", "info");
        } catch (err) {
          notify("Error al eliminar respuesta: " + err.message, "error");
        }
      },
    });
  };

  const handleTeacherReply = async (postId) => {
    const text = teacherReplyTexts[postId];
    if (!text || !text.trim()) {
      notify("Por favor ingresa un comentario o respuesta.", "warning");
      return;
    }

    setSubmittingReplyId(postId);
    const newReply = {
      id: "reply-" + Date.now(),
      author_name: profile?.full_name || user?.email || "Profesor Orientador",
      author_role: "teacher",
      reply_text: text.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      const currentPost = forumPosts.find((p) => p.id === postId);
      const updatedReplies = [...(currentPost?.replies || []), newReply];

      const { error } = await supabase
        .from("course_forums")
        .update({ replies: updatedReplies })
        .eq("id", postId);

      if (error)
        console.warn(
          "Fallback local para respuesta de profesor:",
          error.message,
        );

      const updatedPosts = forumPosts.map((p) => {
        if (p.id === postId) {
          return { ...p, replies: updatedReplies };
        }
        return p;
      });

      setForumPosts(updatedPosts);
      localStorage.setItem(
        `forum_posts_${courseId}`,
        JSON.stringify(updatedPosts),
      );
      setExpandedForumPosts((prev) => ({ ...prev, [postId]: true }));
      setReplyInputs({ ...teacherReplyTexts, [postId]: "" });
      notify("¡Respuesta oficial de profesor publicada! 💬", "success");
    } catch (err) {
      notify("Error al responder: " + err.message, "error");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  if (loading) {
    return (
      <div className="teacher-loading-screen">
        <div className="teacher-spinner"></div>
        <p>Cargando información del grupo educativo...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="teacher-error-screen">
        <h2>Acceso Denegado o Curso No Encontrado</h2>
        <p>
          Este curso no existe o no se encuentra asignado a tu cuenta de
          profesor.
        </p>
        <Link to="/dashboard" className="btn-back">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="teacher-panel-layout">
      {/* HEADER DE BIENVENIDA */}
      <header className="teacher-header">
        <div className="header-left">
          <Link
            to="/dashboard"
            className="back-btn"
            title="Volver al Dashboard Principal"
          >
            <i className="fas fa-arrow-left"></i> ← Volver al Inicio
          </Link>
          <div className="course-info">
            <span className="badge-teacher">PANEL ORIENTADOR STEAM</span>
            <h1>
              {course.name} <span className="course-code">({course.code})</span>
            </h1>
          </div>
        </div>
        <ThemeToggle />
        <div className="header-right">
          <div className="stat-card">
            <strong>{students.length}</strong>
            <span>Alumnos</span>
          </div>
        </div>
      </header>

      {/* MENÚ DE PESTAÑAS */}
      <nav className="teacher-tabs-nav">
        <button
          className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          👨‍🎓 Alumnos Asignados
        </button>
        <button
          className={`tab-btn ${activeTab === "submissions" ? "active" : ""}`}
          onClick={() => setActiveTab("submissions")}
        >
          📥 Calificar Proyectos (
          {submissions.filter((s) => s.grade === null).length} Pendientes)
        </button>
        <button
          className={`tab-btn ${activeTab === "quizzes" ? "active" : ""}`}
          onClick={() => setActiveTab("quizzes")}
        >
          ⚡ Exámenes ({quizSubmissions.length} Presentados)
        </button>
        <button
          className={`tab-btn ${activeTab === "forum" ? "active" : ""}`}
          onClick={() => setActiveTab("forum")}
        >
          💬 Foro & Consultas ({forumPosts.filter((p) => !p.is_resolved).length}{" "}
          Sin Resolver)
        </button>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="teacher-main-container">
        {/* PESTAÑA: ALUMNOS ASIGNADOS (DASHBOARD DE SEGUIMIENTO Y NOTAS) */}
        {activeTab === "students" &&
          (() => {
            // 1. Procesar métricas detalladas para cada estudiante
            // 1. Procesar métricas detalladas para cada estudiante
            const processedStudents = students.map((student) => {
              // Entregas y exámenes del estudiante
              const studentSubs = submissions.filter(
                (s) => s.student_id === student.id,
              );
              const studentQuizSubs = quizSubmissions.filter(
                (qs) => qs.student_id === student.id,
              );

              // --- CÁLCULO DE NOTAS PARA TAREAS ---
              const assignmentsScoreSum = assignments.reduce((sum, assign) => {
                // Buscar la entrega de este alumno para esta tarea
                const sub = studentSubs.find(
                  (s) => s.assignment_id === assign.id,
                );
                // Si la entregó y tiene nota asignada, toma la nota; si no, toma 0
                const grade =
                  sub && sub.grade !== null && sub.grade !== undefined
                    ? parseFloat(sub.grade)
                    : 0;
                return sum + grade;
              }, 0);

              // --- CÁLCULO DE NOTAS PARA EXÁMENES ---
              const quizzesScoreSum = quizzes.reduce((sum, quiz) => {
                // Filtrar todos los intentos del estudiante en este examen
                const attempts = studentQuizSubs.filter(
                  (qs) => qs.quiz_id === quiz.id,
                );
                if (attempts.length > 0) {
                  // Si tiene varios intentos, tomar la nota más alta
                  const bestScore = Math.max(
                    ...attempts.map((a) => parseFloat(a.score || 0)),
                  );
                  return sum + bestScore;
                }
                // Si no lo ha presentado, suma 0
                return sum + 0;
              }, 0);

              // Total de actividades creadas en el curso (Tareas + Exámenes)
              const totalActivities = assignments.length + quizzes.length;

              // Promedio real dividido entre TODAS las actividades del curso
              const totalScoreSum = assignmentsScoreSum + quizzesScoreSum;
              const average =
                totalActivities > 0
                  ? Math.round(totalScoreSum / totalActivities)
                  : 0;

              // Avance de actividades (Contar cuántas ha realizado)
              const completedAssignmentsCount = assignments.filter((a) =>
                studentSubs.some((s) => s.assignment_id === a.id),
              ).length;

              const completedQuizzesCount = quizzes.filter((q) =>
                studentQuizSubs.some((qs) => qs.quiz_id === q.id),
              ).length;

              const totalCompleted =
                completedAssignmentsCount + completedQuizzesCount;
              const progressPercent =
                totalActivities > 0
                  ? Math.round((totalCompleted / totalActivities) * 100)
                  : 0;

              // Actividades Pendientes (Sin entregar/resolver)
              const pendingAssignments = assignments.filter(
                (a) => !studentSubs.some((s) => s.assignment_id === a.id),
              );
              const pendingQuizzes = quizzes.filter(
                (q) => !studentQuizSubs.some((qs) => qs.quiz_id === q.id),
              );

              // Nivel de Alerta
              let riskLevel = "on-track";
              let riskText = "Al día 🎉";
              let riskColor = "var(--success)";

              if (pendingAssignments.length > 0 || pendingQuizzes.length > 0) {
                riskLevel = "alert";
                riskText = "Tareas/Exámenes Pendientes";
                riskColor = "var(--primary)";
              }
              if (
                average < 60 ||
                (totalActivities > 0 && progressPercent < 30)
              ) {
                riskLevel = "at-risk";
                riskText = "En Riesgo ⚠️";
                riskColor = "var(--error)";
              }

              return {
                ...student,
                average,
                totalCompleted,
                totalActivities,
                progressPercent,
                pendingAssignments,
                pendingQuizzes,
                riskLevel,
                riskText,
                riskColor,
              };
            });

            // Filtro por Búsqueda y Estado
            const filteredStudents = processedStudents.filter((s) => {
              const matchesSearch =
                s.full_name
                  .toLowerCase()
                  .includes(studentSearchQuery.toLowerCase()) ||
                s.email
                  .toLowerCase()
                  .includes(studentSearchQuery.toLowerCase()) ||
                (s.cedula || "").includes(studentSearchQuery);

              if (studentFilterStatus === "all") return matchesSearch;
              return matchesSearch && s.riskLevel === studentFilterStatus;
            });

            // Métricas globales del grupo para las tarjetas KPI
            const totalStudents = processedStudents.length;
            const studentsWithAverage = processedStudents.filter(
              (s) => s.average !== null,
            );
            const classAverage =
              processedStudents.length > 0
                ? Math.round(
                    processedStudents.reduce(
                      (acc, s) => acc + (s.average || 0),
                      0,
                    ) / processedStudents.length,
                  )
                : null;

            const studentsAtRisk = processedStudents.filter(
              (s) => s.riskLevel === "at-risk",
            ).length;
            const studentsPending = processedStudents.filter(
              (s) => s.riskLevel === "alert",
            ).length;

            return (
              <div className="animate-fade">
                {/* TARJETAS DE INDICADORES CLAVE (KPIs) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-muted)",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Promedio General del Curso
                    </span>
                    <strong
                      style={{
                        fontSize: "1.8rem",
                        color:
                          classAverage !== null
                            ? classAverage >= 60
                              ? "var(--success)"
                              : "var(--error)"
                            : "var(--text-muted)",
                      }}
                    >
                      {classAverage !== null
                        ? `${classAverage} / 100`
                        : "Sin notas"}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Basado en {studentsWithAverage.length} alumnos calificados
                    </span>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-muted)",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Estudiantes Al Día
                    </span>
                    <strong
                      style={{ fontSize: "1.8rem", color: "var(--success)" }}
                    >
                      {totalStudents - studentsAtRisk - studentsPending}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Sin pendientes y con promedio aprobatorio
                    </span>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-muted)",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Con Actividades Pendientes
                    </span>
                    <strong
                      style={{ fontSize: "1.8rem", color: "var(--primary)" }}
                    >
                      {studentsPending}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Tienen tareas o exámenes por resolver
                    </span>
                  </div>

                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-muted)",
                      padding: "1.25rem",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      En Riesgo Académico
                    </span>
                    <strong
                      style={{ fontSize: "1.8rem", color: "var(--error)" }}
                    >
                      {studentsAtRisk}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Promedio menor a 60 o muy bajo progreso
                    </span>
                  </div>
                </div>

                {/* BARRA DE BÚSQUEDA Y FILTRADO */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    padding: "1rem 1.5rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-muted)",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      flexGrow: 1,
                      maxWidth: "500px",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="🔍 Buscar alumno por nombre, correo o cédula..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        background: "var(--bg-card)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-light)",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                      }}
                    >
                      Filtrar Estado:
                    </span>
                    <select
                      value={studentFilterStatus}
                      onChange={(e) => setStudentFilterStatus(e.target.value)}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        background: "var(--bg-card)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-light)",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="all">Ver Todos</option>
                      <option value="on-track">Al Día (Sin pendientes)</option>
                      <option value="alert">Con Actividades Pendientes</option>
                      <option value="at-risk">En Riesgo Académico</option>
                    </select>
                  </div>
                </div>

                {/* TABLA PRINCIPAL DE SEGUIMIENTO */}
                <div className="table-wrapper" style={{ padding: "1.5rem" }}>
                  <h2>Reporte de Notas, Entregas e Inactividad</h2>
                  {filteredStudents.length === 0 ? (
                    <p
                      className="no-data-text"
                      style={{ textAlign: "center", padding: "3rem" }}
                    >
                      No se encontraron alumnos con los criterios de búsqueda
                      seleccionados.
                    </p>
                  ) : (
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "25%" }}>Estudiante</th>
                          <th style={{ width: "12%", textAlign: "center" }}>
                            Promedio
                          </th>
                          <th style={{ width: "20%", textAlign: "center" }}>
                            Avance Actividades
                          </th>
                          <th style={{ width: "20%" }}>Tareas Sin Entregar</th>
                          <th style={{ width: "15%" }}>Exámenes Pendientes</th>
                          <th style={{ width: "8%", textAlign: "center" }}>
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            style={{ transition: "background 0.2s" }}
                          >
                            {/* Datos Personales */}
                            <td style={{ padding: "1.2rem var(--space-md)" }}>
                              <strong
                                style={{
                                  display: "block",
                                  color: "var(--text-main)",
                                  fontSize: "1rem",
                                }}
                              >
                                {student.full_name}
                              </strong>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.2rem",
                                }}
                              >
                                Email: {student.email}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                Cédula: {student.cedula || "No registrada"}
                              </span>
                            </td>

                            {/* Promedio General */}
                            <td
                              style={{
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              {student.average !== null ? (
                                <div
                                  style={{
                                    display: "inline-block",
                                    background:
                                      student.average >= 60
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : "rgba(239, 68, 68, 0.12)",
                                    color:
                                      student.average >= 60
                                        ? "var(--success)"
                                        : "var(--error)",
                                    padding: "0.5rem 0.85rem",
                                    borderRadius: "8px",
                                    fontWeight: "bold",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  {student.average} / 100
                                </div>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    fontStyle: "italic",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  Sin notas
                                </span>
                              )}
                            </td>

                            {/* Barra de Progreso Individual */}
                            <td
                              style={{
                                verticalAlign: "middle",
                                padding: "1.2rem var(--space-md)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  marginBottom: "0.3rem",
                                }}
                              >
                                <span>Completado:</span>
                                <strong>
                                  {student.totalCompleted} de{" "}
                                  {student.totalActivities}
                                </strong>
                              </div>
                              <div
                                style={{
                                  width: "100%",
                                  height: "8px",
                                  background: "var(--border-light)",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${student.progressPercent}%`,
                                    background:
                                      "linear-gradient(90deg, var(--success), #3b82f6)",
                                    borderRadius: "4px",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  textAlign: "right",
                                  marginTop: "0.25rem",
                                }}
                              >
                                {student.progressPercent}% de avance
                              </span>
                            </td>

                            {/* Tareas Pendientes */}
                            <td
                              style={{
                                verticalAlign: "top",
                                padding: "1.2rem var(--space-md)",
                              }}
                            >
                              {student.pendingAssignments.length === 0 ? (
                                <span
                                  style={{
                                    color: "var(--success)",
                                    fontWeight: "bold",
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                >
                                  ✓ ¡Al día! 🎉
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.35rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--error)",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    ⚠️ {student.pendingAssignments.length}{" "}
                                    pendientes:
                                  </span>
                                  {student.pendingAssignments.map((a) => (
                                    <span
                                      key={a.id}
                                      style={{
                                        display: "block",
                                        fontSize: "0.8rem",
                                        background: "rgba(239, 68, 68, 0.05)",
                                        border:
                                          "1px solid rgba(239,68,68,0.15)",
                                        color: "#f87171",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        textOverflow: "ellipsis",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={a.title}
                                    >
                                      📝 {a.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Exámenes Pendientes */}
                            <td
                              style={{
                                verticalAlign: "top",
                                padding: "1.2rem var(--space-md)",
                              }}
                            >
                              {student.pendingQuizzes.length === 0 ? (
                                <span
                                  style={{
                                    color: "var(--success)",
                                    fontWeight: "bold",
                                    fontSize: "0.85rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                  }}
                                >
                                  ✓ ¡Al día! 🎯
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.35rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#f59e0b",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    ⚡ {student.pendingQuizzes.length} sin
                                    resolver:
                                  </span>
                                  {student.pendingQuizzes.map((q) => (
                                    <span
                                      key={q.id}
                                      style={{
                                        display: "block",
                                        fontSize: "0.8rem",
                                        background: "rgba(245, 158, 11, 0.05)",
                                        border:
                                          "1px solid rgba(245, 158, 11, 0.15)",
                                        color: "#fbbf24",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        textOverflow: "ellipsis",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={q.title}
                                    >
                                      ⚡ {q.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Semáforo / Estado de Alerta */}
                            <td
                              style={{
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  background: student.riskColor + "1a",
                                  color: student.riskColor,
                                  border: `1px solid ${student.riskColor}40`,
                                  padding: "0.4rem 0.75rem",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {student.riskText}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

        {/* PESTAÑA: CALIFICAR PROYECTOS */}
        {activeTab === "submissions" && (
          <div className="table-wrapper animate-fade">
            <h2>Proyectos y Tareas por Calificar</h2>
            {submissions.length === 0 ? (
              <p className="no-data-text">
                No se registran entregas de archivos para este curso aún.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Proyecto / Tarea</th>
                    <th>Archivo de Entrega</th>
                    <th>Calificación (0 - 100)</th>
                    <th>Comentarios (Feedback)</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const assign = assignments.find(
                      (a) => a.id === sub.assignment_id,
                    );
                    const isPending = sub.grade === null;
                    return (
                      <tr
                        key={sub.id}
                        className={isPending ? "pending-row" : ""}
                      >
                        <td>
                          <strong>{sub.profiles?.full_name}</strong>
                          <div className="sub-text">
                            C.C. {sub.profiles?.cedula || "N/A"}
                          </div>
                        </td>
                        <td>
                          <span className="assignment-title">
                            {assign?.title || "Tarea General"}
                          </span>
                        </td>
                        <td>
                          <a
                            href={getCorrectUrl(sub.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-link"
                          >
                            📥 Descargar {sub.file_name}
                          </a>
                          <div className="sub-text">
                            Enviado:{" "}
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Nota"
                            className="grade-input"
                            value={gradingScores[sub.id] || ""}
                            onChange={(e) =>
                              setGradingScores({
                                ...gradingScores,
                                [sub.id]: e.target.value,
                              })
                            }
                            disabled={!isPending}
                          />
                        </td>
                        <td>
                          <textarea
                            placeholder={
                              isPending
                                ? "Escribe comentarios pedagógicos..."
                                : "Calificación guardada y cerrada"
                            }
                            className="feedback-textarea"
                            rows="1"
                            value={gradingFeedbacks[sub.id] || ""}
                            onChange={(e) =>
                              setGradingFeedbacks({
                                ...gradingFeedbacks,
                                [sub.id]: e.target.value,
                              })
                            }
                            disabled={!isPending}
                          />
                        </td>
                        <td>
                          {isPending ? (
                            <button
                              className="save-grade-btn highlight"
                              onClick={() => handleSaveGrade(sub.id)}
                              disabled={savingGradeId === sub.id}
                            >
                              {savingGradeId === sub.id
                                ? "Guardando..."
                                : "Guardar Nota"}
                            </button>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--success)",
                                  fontWeight: "bold",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "4px",
                                }}
                              >
                                🔒 Calificado
                              </span>
                              <button
                                onClick={() =>
                                  handleResetAssignmentAttempt(
                                    sub.id,
                                    sub.profiles?.full_name || "el alumno",
                                    assign?.title || "esta tarea",
                                  )
                                }
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  color: "var(--error)",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  padding: "0.4rem 0.8rem",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  fontSize: "0.8rem",
                                  transition: "all 0.2s",
                                }}
                              >
                                🔄 Dar otra oportunidad
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PESTAÑA: EXÁMENES AUTOMÁTICOS */}
        {/* PESTAÑA: FORO Y CONSULTAS DEL GRUPO */}
        {activeTab === "forum" && (
          <div
            className="table-wrapper animate-fade"
            style={{
              background: "var(--bg-secondary)",
              padding: "2rem",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h2 style={{ color: "var(--text-main)", margin: 0 }}>
                  💬 Foro de Consultas e Interacción con Estudiantes
                </h2>
                <p
                  style={{
                    color: "var(--text-muted)",
                    margin: "0.25rem 0 0 0",
                    fontSize: "0.9rem",
                  }}
                >
                  Abre nuevos debates, publica anuncios oficiales o responde
                  dudas de tus estudiantes.
                </p>
              </div>
              <span
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "var(--primary)",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                {forumPosts.filter((p) => !p.is_resolved).length} Preguntas
                Pendientes
              </span>
            </div>

            {/* FORMULARIO PARA QUE EL PROFESOR INICIE UN FORO O ANUNCIO */}
            <div
              style={{
                background: "var(--bg-main)",
                border: "1px solid var(--border-light)",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  color: "var(--primary)",
                  fontSize: "1.2rem",
                }}
              >
                📢 Publicar Anuncio Oficial o Abrir Nuevo Foro
              </h3>
              <form
                onSubmit={handleTeacherCreatePost}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <input
                  type="text"
                  placeholder="Título del anuncio o tema de debate (ej. Indicaciones para el Proyecto Final)..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-light)",
                    fontSize: "0.95rem",
                  }}
                />

                <textarea
                  placeholder="Escribe aquí el contenido del aviso, instrucciones o pregunta detonante..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows="3"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-light)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                  }}
                />

                {/* CASILLA DE DIFUSIÓN A TODOS LOS CURSOS */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "rgba(245, 158, 11, 0.08)",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                  }}
                >
                  <input
                    type="checkbox"
                    id="postToAllCoursesCheck"
                    checked={postToAllCourses}
                    onChange={(e) => setPostToAllCourses(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--primary)",
                      cursor: "pointer",
                    }}
                  />
                  <label
                    htmlFor="postToAllCoursesCheck"
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      color: "var(--text-main)",
                      cursor: "pointer",
                    }}
                  >
                    🌐 Difundir este foro / anuncio a TODOS los estudiantes de
                    mis cursos asignados simultáneamente
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingQuestion}
                  style={{
                    alignSelf: "flex-start",
                    background: "var(--primary)",
                    color: "black",
                    fontWeight: "bold",
                    border: "none",
                    padding: "0.8rem 1.5rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                  }}
                >
                  {submittingQuestion
                    ? "Publicando..."
                    : postToAllCourses
                      ? "🌐 Difundir a Todos mis Cursos"
                      : "📢 Publicar Anuncio / Foro"}
                </button>
              </form>
            </div>

            {forumPosts.length === 0 ? (
              <p
                className="no-data-text"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                No se registran preguntas o comentarios en el foro de este curso
                todavía.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                {forumPosts.map((post) => {
                  const postReplies = post.replies || [];
                  const isExpanded = !!expandedForumPosts[post.id];

                  return (
                    <div
                      key={post.id}
                      style={{
                        background: "var(--bg-card)",
                        border: isExpanded
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border-muted)",
                        borderRadius: "12px",
                        padding: "1.25rem 1.5rem",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* ENCABEZADO RESUMIDO COMPACTO */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ minWidth: 0, flexGrow: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <strong
                              style={{
                                color: "var(--text-main)",
                                fontSize: "1.05rem",
                              }}
                            >
                              {post.title}
                            </strong>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              • Por:{" "}
                              <strong style={{ color: "var(--accent-blue)" }}>
                                {post.author_name}
                              </strong>{" "}
                              • {new Date(post.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* ACCIONES Y BOTÓN EXPANDIR */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              background: post.is_resolved
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                              color: post.is_resolved
                                ? "var(--success)"
                                : "var(--error)",
                            }}
                          >
                            {post.is_resolved ? "🟢 Resuelta" : "❓ Pendiente"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleResolvePost(post.id, post.is_resolved)
                            }
                            style={{
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--primary)",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              padding: "0.3rem 0.6rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            {post.is_resolved ? "Reabrir" : "✓ Resuelta"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTeacherDeletePost(post.id)}
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "var(--error)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              padding: "0.3rem 0.61rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                            title="Eliminar este foro permanentemente de la base de datos"
                          >
                            🗑️ Borrar Foro
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedForumPosts((prev) => ({
                                ...prev,
                                [post.id]: !prev[post.id],
                              }))
                            }
                            style={{
                              background: isExpanded
                                ? "var(--primary)"
                                : "rgba(99, 102, 241, 0.12)",
                              color: isExpanded ? "black" : "#60a5fa",
                              border: "1px solid",
                              borderColor: isExpanded
                                ? "var(--primary)"
                                : "rgba(99, 102, 241, 0.3)",
                              padding: "0.35rem 0.8rem",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              transition: "all 0.2s",
                            }}
                          >
                            {isExpanded
                              ? "🔼 Ocultar"
                              : `💬 Ver Conversación (${postReplies.length})`}
                          </button>
                        </div>
                      </div>

                      {/* CONTENIDO Y RESPUESTAS DESPLEGABLES */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: "1rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid var(--border-muted)",
                          }}
                        >
                          <p
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.95rem",
                              lineHeight: "1.6",
                              margin: "0 0 1.25rem 0",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {post.content}
                          </p>

                          {/* RESPUESTAS */}
                          <div
                            style={{
                              borderTop: "1px dashed var(--border-muted)",
                              paddingTop: "1rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: "bold",
                                color: "var(--text-main)",
                                display: "block",
                                marginBottom: "0.75rem",
                              }}
                            >
                              💬 Respuestas de la comunidad (
                              {postReplies.length}):
                            </span>

                            {postReplies.length === 0 ? (
                              <p
                                style={{
                                  fontSize: "0.85rem",
                                  color: "var(--text-muted)",
                                  fontStyle: "italic",
                                  margin: "0 0 1rem 0",
                                }}
                              >
                                Aún no hay comentarios o respuestas en este
                                hilo.
                              </p>
                            ) : (
                              postReplies.map((reply) => (
                                <div
                                  key={reply.id}
                                  style={{
                                    background: "var(--bg-main)",
                                    border: "1px solid var(--border-light)",
                                    borderRadius: "8px",
                                    padding: "0.85rem 1rem",
                                    marginBottom: "0.75rem",
                                    marginLeft: "1rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "0.35rem",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      <strong
                                        style={{
                                          color:
                                            reply.author_role === "teacher"
                                              ? "var(--primary)"
                                              : "var(--text-main)",
                                          fontSize: "0.85rem",
                                        }}
                                      >
                                        {reply.author_name}{" "}
                                        {reply.author_role === "teacher" &&
                                          "👨‍🏫 (Tú / Profesor)"}
                                      </strong>
                                      <span
                                        style={{
                                          color: "var(--text-muted)",
                                          fontSize: "0.7rem",
                                        }}
                                      >
                                        {new Date(
                                          reply.created_at,
                                        ).toLocaleString()}
                                      </span>
                                    </div>

                                    {/* BOTÓN PARA QUE EL PROFESOR ELIMINE CUALQUIER RESPUESTA DE UN ALUMNO */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteForumReply(
                                          reply.id,
                                          post.id,
                                        )
                                      }
                                      style={{
                                        background: "rgba(239, 68, 68, 0.12)",
                                        color: "var(--error)",
                                        border:
                                          "1px solid rgba(239, 68, 68, 0.3)",
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                      title="Eliminar este comentario o respuesta"
                                    >
                                      🗑️ Borrar Comentario
                                    </button>
                                  </div>
                                  <p
                                    style={{
                                      color: "var(--text-muted)",
                                      fontSize: "0.9rem",
                                      margin: 0,
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {reply.reply_text}
                                  </p>
                                </div>
                              ))
                            )}

                            {/* RESPONDER COMO PROFESOR */}
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                marginTop: "1rem",
                              }}
                            >
                              <input
                                type="text"
                                placeholder="Escribe la orientación o respuesta oficial como profesor..."
                                value={teacherReplyTexts[post.id] || ""}
                                onChange={(e) =>
                                  setReplyInputs({
                                    ...teacherReplyTexts,
                                    [post.id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleTeacherReply(post.id);
                                }}
                                style={{
                                  flexGrow: 1,
                                  padding: "0.65rem 0.9rem",
                                  borderRadius: "6px",
                                  background: "var(--bg-main)",
                                  color: "var(--text-main)",
                                  border: "1px solid var(--border-light)",
                                  fontSize: "0.85rem",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleTeacherReply(post.id)}
                                disabled={submittingReplyId === post.id}
                                style={{
                                  background: "var(--primary)",
                                  color: "black",
                                  fontWeight: "bold",
                                  border: "none",
                                  padding: "0.65rem 1.2rem",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {submittingReplyId === post.id
                                  ? "Enviando..."
                                  : "Responder 💬"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="table-wrapper animate-fade">
            <h2>Resultados de Evaluaciones Calificadas de Forma Automática</h2>
            {students.length === 0 ? (
              <p className="no-data-text">
                No hay alumnos inscritos en este curso todavía.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {students.map((student) => {
                  const studentQuests = quizSubmissions.filter(
                    (s) => s.student_id === student.id,
                  );
                  const isExpanded = !!expandedStudentQuizzes[student.id];
                  const totalCompleted = studentQuests.length;
                  const averageScore =
                    totalCompleted > 0
                      ? Math.round(
                          studentQuests.reduce((acc, q) => acc + q.score, 0) /
                            totalCompleted,
                        )
                      : null;

                  return (
                    <div
                      key={student.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-muted)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      {/* Cabecera del alumno clickable */}
                      <div
                        onClick={() =>
                          setExpandedStudentQuizzes((prev) => ({
                            ...prev,
                            [student.id]: !prev[student.id],
                          }))
                        }
                        style={{
                          padding: "1.25rem 1.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: isExpanded
                            ? "rgba(245, 158, 11, 0.05)"
                            : "transparent",
                          transition: "all 0.2s",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color: "var(--text-main)",
                              fontSize: "1.1rem",
                            }}
                          >
                            {student.full_name}
                          </strong>
                          <div
                            className="sub-text"
                            style={{ marginTop: "4px" }}
                          >
                            {student.email}{" "}
                            {student.cedula && `• C.C. ${student.cedula}`}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.5rem",
                          }}
                        >
                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                display: "block",
                              }}
                            >
                              Completados:
                            </span>
                            <strong
                              style={{
                                color:
                                  totalCompleted > 0
                                    ? "var(--primary)"
                                    : "var(--text-muted)",
                              }}
                            >
                              {totalCompleted}
                            </strong>
                          </div>
                          {totalCompleted > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  display: "block",
                                }}
                              >
                                Promedio:
                              </span>
                              <strong
                                style={{
                                  color:
                                    averageScore >= 60
                                      ? "var(--success)"
                                      : "var(--error)",
                                }}
                              >
                                {averageScore} / 100
                              </strong>
                            </div>
                          )}
                          <span
                            style={{
                              fontSize: "1rem",
                              color: "var(--primary)",
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Contenedor colapsable con los exámenes */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "1.5rem",
                            background: "rgba(0, 0, 0, 0.15)",
                            borderTop: "1px solid var(--border-muted)",
                          }}
                        >
                          {totalCompleted === 0 ? (
                            <p
                              style={{
                                color: "var(--text-muted)",
                                margin: 0,
                                fontStyle: "italic",
                                fontSize: "0.9rem",
                              }}
                            >
                              Este alumno no ha presentado ninguna evaluación
                              temática automática aún.
                            </p>
                          ) : (
                            <table style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Cuestionario / Examen</th>
                                  <th>Respuestas Correctas</th>
                                  <th>Puntaje Obtenido</th>
                                  <th>Fecha de Envío</th>
                                  <th>Opciones de Control</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentQuests.map((sub) => {
                                  const quiz = quizzes.find(
                                    (q) => q.id === sub.quiz_id,
                                  );
                                  const isApproved = sub.score >= 60;
                                  return (
                                    <tr key={sub.id}>
                                      <td>
                                        <span
                                          style={{
                                            fontWeight: "bold",
                                            color: "#60a5fa",
                                          }}
                                        >
                                          {quiz?.title || "Examen Temático"}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: "bold" }}>
                                        {sub.correct_answers} de{" "}
                                        {sub.total_questions} preguntas
                                      </td>
                                      <td>
                                        <strong
                                          style={{
                                            fontSize: "1.1rem",
                                            color: isApproved
                                              ? "var(--success)"
                                              : "var(--error)",
                                          }}
                                        >
                                          {sub.score} / 100 (
                                          {isApproved
                                            ? "Aprobado"
                                            : "Reprobado"}
                                          )
                                        </strong>
                                      </td>
                                      <td>
                                        {new Date(
                                          sub.submitted_at,
                                        ).toLocaleString()}
                                      </td>
                                      <td>
                                        <button
                                          className="btn-change-password"
                                          onClick={(e) => {
                                            e.stopPropagation(); // Evita colapsar de vuelta al hacer click en el botón
                                            handleResetQuizAttempt(
                                              sub.id,
                                              student.full_name || "el alumno",
                                              quiz?.title || "este examen",
                                            );
                                          }}
                                          style={{
                                            background:
                                              "rgba(245, 158, 11, 0.12)",
                                            color: "var(--primary)",
                                            border:
                                              "1px solid rgba(245, 158, 11, 0.4)",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontWeight: "bold",
                                            fontSize: "0.85rem",
                                            transition: "all 0.2s",
                                          }}
                                        >
                                          🔄 Dar otra oportunidad
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO (Dark-STEAM) */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "420px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "1.3rem",
                fontWeight: "700",
                margin: "0 0 0.5rem 0",
              }}
            >
              {confirmModal.title || "¿Estás seguro?"}
            </h3>
            <p
              style={{
                color: "#cbd5e1",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                marginBottom: "1.8rem",
              }}
            >
              {confirmModal.message}
            </p>
            <div
              style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
            >
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                style={{
                  background: "#334155",
                  color: "#f8fafc",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  if (action) action();
                }}
                style={{
                  background: "#f59e0b",
                  color: "#0f172a",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  flex: 1,
                  boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
                }}
              >
                {confirmModal.confirmText || "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TeacherPanel;
