import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Classroom.css";

const Classroom = () => {
  const { courseId } = useParams();

  // Función de auto-corrección de URLs de almacenamiento de Supabase
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

  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados de carga e información del curso
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // Estados para Exámenes (Quizzes)
  const [quizzes, setQuizzes] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null); // Examen seleccionado
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Respuestas del examen en curso: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Estado de la lección seleccionada actualmente
  const [activeLesson, setActiveLesson] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  // Estados para entrega de tareas
  const [uploadingAssignmentId, setUploadingAssignmentId] = useState(null);
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState({});

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchCourseData();
  }, [courseId, user]);

  // Cargar datos del curso, módulos, lecciones, progreso y tareas
  // Cargar datos del curso, módulos, lecciones, progreso y tareas
  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // 1. Obtener detalles del Curso
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // 2. Obtener Módulos del Curso ordenados
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // 3. Obtener Lecciones, Tareas, Entregas, Exámenes y Progreso de forma aislada
      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map((m) => m.id);

        // Cargar lecciones
        try {
          const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("*")
            .in("module_id", moduleIds)
            .order("order_index", { ascending: true });

          if (lessonsError) throw lessonsError;
          setLessons(lessonsData || []);

          if (lessonsData && lessonsData.length > 0) {
            setActiveLesson(lessonsData[0]);
          }
        } catch (err) {
          console.error("Error al cargar lecciones:", err);
        }

        // Cargar tareas del módulo
        let loadedAssignments = [];
        try {
          const { data: assignmentsData, error: assignmentsError } =
            await supabase
              .from("assignments")
              .select("*")
              .in("module_id", moduleIds);

          if (assignmentsError) throw assignmentsError;
          loadedAssignments = assignmentsData || [];
          setAssignments(loadedAssignments);
        } catch (err) {
          console.error("Error al cargar tareas:", err);
        }

        // Cargar entregas ya subidas por este alumno
        if (loadedAssignments.length > 0) {
          try {
            const assignIds = loadedAssignments.map((a) => a.id);
            const { data: submissionsData, error: submissionsError } =
              await supabase
                .from("submissions")
                .select("*")
                .eq("student_id", user.id)
                .in("assignment_id", assignIds);

            if (submissionsError) throw submissionsError;
            setStudentSubmissions(submissionsData || []);
          } catch (err) {
            console.error("Error al cargar entregas:", err);
          }
        }

        // Cargar exámenes (Quizzes) de los módulos
        let loadedQuizzes = [];
        try {
          const { data: quizzesData, error: quizzesError } = await supabase
            .from("quizzes")
            .select("*")
            .in("module_id", moduleIds);

          if (quizzesError) throw quizzesError;
          loadedQuizzes = quizzesData || [];
          setQuizzes(loadedQuizzes);
        } catch (err) {
          console.error("Error al cargar exámenes:", err);
        }

        if (loadedQuizzes.length > 0) {
          try {
            const qzIds = loadedQuizzes.map((q) => q.id);

            // Cargar todas las preguntas de los exámenes
            const { data: questionsData, error: questionsError } =
              await supabase
                .from("quiz_questions")
                .select("*")
                .in("quiz_id", qzIds);

            if (questionsError) throw questionsError;
            setQuizQuestions(questionsData || []);

            // Cargar las calificaciones / intentos de exámenes de este alumno
            const { data: quizSubsData, error: quizSubsError } = await supabase
              .from("quiz_submissions")
              .select("*")
              .eq("student_id", user.id)
              .in("quiz_id", qzIds);

            if (quizSubsError) throw quizSubsError;
            setQuizSubmissions(quizSubsData || []);
          } catch (err) {
            console.error(
              "Error al cargar preguntas/intentos de exámenes:",
              err,
            );
          }
        }
      }

      // 4. Obtener Progreso de lecciones completadas
      try {
        const { data: progressData, error: progressError } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("completed", true);

        if (progressError) throw progressError;
        if (progressData) {
          const completedSet = new Set(progressData.map((p) => p.lesson_id));
          setCompletedLessons(completedSet);
        }
      } catch (err) {
        console.error("Error al cargar progreso de lecciones:", err);
      }
    } catch (error) {
      console.error("Error general al cargar el aula virtual:", error);
    } finally {
      setLoading(false);
    }
  };

  // Guardar o alternar el estado de lección completada
  const toggleLessonCompletion = async (lessonId) => {
    if (savingProgress) return;
    setSavingProgress(true);

    const isCompleted = completedLessons.has(lessonId);
    const updatedCompleted = new Set(completedLessons);

    try {
      if (isCompleted) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);

        if (error) throw error;
        updatedCompleted.delete(lessonId);
      } else {
        const { error } = await supabase.from("lesson_progress").upsert(
          {
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" },
        );

        if (error) throw error;
        updatedCompleted.add(lessonId);
      }

      setCompletedLessons(updatedCompleted);
    } catch (err) {
      alert("Error al actualizar progreso: " + err.message);
    } finally {
      setSavingProgress(false);
    }
  };

  // Subir tarea por parte del estudiante
  const handleUploadSubmission = async (assignmentId) => {
    const file = selectedSubmissionFile[assignmentId];
    if (!file) {
      alert("Por favor selecciona un archivo PDF, Word o PowerPoint primero.");
      return;
    }

    setUploadingAssignmentId(assignmentId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${assignmentId}-${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;

      // 1. Subir a Supabase Storage bucket 'submissions'
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obtener la URL pública del archivo
      let {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(filePath);

      if (
        publicUrl &&
        publicUrl.includes("/storage/v1/object/") &&
        !publicUrl.includes("/storage/v1/object/public/")
      ) {
        publicUrl = publicUrl.replace(
          "/storage/v1/object/",
          "/storage/v1/object/public/",
        );
      }

      // 3. Insertar o actualizar registro de entrega en la tabla 'submissions'
      const { error: dbError } = await supabase.from("submissions").upsert(
        {
          student_id: user.id,
          assignment_id: assignmentId,
          file_url: publicUrl,
          file_name: file.name,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "student_id,assignment_id" },
      );

      if (dbError) throw dbError;

      alert("¡Tu tarea ha sido cargada y entregada con éxito!");

      // Recargar entregas locales
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", user.id)
        .eq("assignment_id", assignmentId);

      if (submissionsData && submissionsData.length > 0) {
        setStudentSubmissions((prev) => {
          const filtered = prev.filter((s) => s.assignment_id !== assignmentId);
          return [...filtered, submissionsData[0]];
        });
      }
    } catch (err) {
      alert("Error al subir la tarea: " + err.message);
    } finally {
      setUploadingAssignmentId(null);
    }
  };

  // Función para calificar automáticamente y subir el examen
  const handleSubmitQuiz = async (quizId) => {
    const questions = quizQuestions.filter((q) => q.quiz_id === quizId);
    if (questions.length === 0) {
      alert("Este examen no tiene preguntas registradas.");
      return;
    }

    // Verificar que todas estén contestadas
    const unanswered = questions.filter((q) => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      alert(
        `Por favor responde todas las preguntas del examen. Te faltan ${unanswered.length} pregunta(s).`,
      );
      return;
    }

    if (
      !confirm(
        "¿Seguro que deseas enviar tus respuestas? No podrás volver a presentarlo.",
      )
    )
      return;

    setSubmittingQuiz(true);
    try {
      let correctCount = 0;
      questions.forEach((q) => {
        if (selectedAnswers[q.id] === q.correct_option) {
          correctCount++;
        }
      });

      const totalQuestions = questions.length;
      const finalScore = Math.round((correctCount / totalQuestions) * 100);

      const { error } = await supabase.from("quiz_submissions").upsert(
        {
          quiz_id: quizId,
          student_id: user.id,
          score: finalScore,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "student_id,quiz_id" },
      );

      if (error) throw error;

      alert(
        `¡Examen enviado con éxito! Tu calificación es: ${finalScore} / 100 (${correctCount} de ${totalQuestions} respuestas correctas).`,
      );

      // Actualizar estado local
      const { data: newSubData } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("student_id", user.id)
        .eq("quiz_id", quizId);

      if (newSubData && newSubData.length > 0) {
        setQuizSubmissions((prev) => {
          const filtered = prev.filter((s) => s.quiz_id !== quizId);
          return [...filtered, newSubData[0]];
        });
      }
    } catch (err) {
      alert("Error al guardar examen: " + err.message);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Convertir URL estándar de YouTube/Vimeo a formato Embed seguro
  const getEmbedUrl = (url) => {
    if (!url) return null;

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const regExp =
        /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);

      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`;
      }
    }

    if (url.includes("vimeo.com")) {
      const regExp =
        /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]+)\/videos\/|album\/(?:\d+)\/video\/|video\/)?(\d+)(?:$|\/|\?)/;

      const match = url.match(regExp);

      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?h=0&title=0&byline=0&portrait=0`;
      }
    }

    return url;
  };

  const calculateProgressPercentage = () => {
    if (lessons.length === 0) return 0;
    const completedCount = lessons.filter((l) =>
      completedLessons.has(l.id),
    ).length;
    return Math.round((completedCount / lessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="classroom-loading">
        <div className="spinner"></div>
        <p>Cargando Aula Virtual de ABC Digital STEAM...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="classroom-error">
        <h2>Curso no encontrado</h2>
        <p>
          No se pudo localizar el aula virtual de este curso o no tienes
          permisos de acceso.
        </p>
        <Link to="/dashboard" className="btn-back">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Calcular el promedio general de calificaciones (Tareas + Exámenes)
  const calculateGradeAverage = () => {
    let totalScore = 0;
    let gradedItemsCount = 0;

    // 1. Tareas calificadas (submissions.grade)
    studentSubmissions.forEach((sub) => {
      if (sub.grade !== null && sub.grade !== undefined && !isNaN(sub.grade)) {
        totalScore += parseFloat(sub.grade);
        gradedItemsCount++;
      }
    });

    // 2. Exámenes calificados (quizSubmissions.score)
    quizSubmissions.forEach((sub) => {
      if (sub.score !== null && sub.score !== undefined && !isNaN(sub.score)) {
        totalScore += parseFloat(sub.score);
        gradedItemsCount++;
      }
    });

    return gradedItemsCount > 0
      ? Math.round(totalScore / gradedItemsCount)
      : null;
  };

  const progressPercent = calculateProgressPercentage();
  const currentModuleAssignments = activeLesson
    ? assignments.filter((a) => a.module_id === activeLesson.module_id)
    : [];

  return (
    <div className="classroom-layout">
      {/* HEADER SUPERIOR */}
      <header className="classroom-header">
        <div className="header-left">
          <Link
            to="/dashboard"
            className="back-dashboard-btn"
            title="Volver al Panel de Cursos"
          >
            <i className="fas fa-arrow-left"></i> ← Volver
          </Link>
          <div className="course-title-section">
            <span className="course-tag">AULA VIRTUAL</span>
            <h1 className="course-name-title">{course.name}</h1>
          </div>
        </div>

        {/* Barra de progreso global del curso */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="header-progress-container">
            <div className="progress-info-text">
              <span>Tu Progreso:</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Promedio de Calificaciones */}
          {(() => {
            const avgGrade = calculateGradeAverage();
            return (
              <div
                className="header-progress-container"
                style={{ minWidth: "150px" }}
              >
                <div className="progress-info-text">
                  <span>Promedio General:</span>
                  <strong
                    style={{
                      color:
                        avgGrade !== null
                          ? avgGrade >= 60
                            ? "var(--success)"
                            : "var(--error)"
                          : "var(--text-muted)",
                    }}
                  >
                    {avgGrade !== null ? `${avgGrade} / 100` : "Sin notas"}
                  </strong>
                </div>
                <div
                  className="progress-bar-bg"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: avgGrade !== null ? `${avgGrade}%` : "0%",
                      backgroundColor:
                        avgGrade !== null
                          ? avgGrade >= 60
                            ? "var(--success)"
                            : "var(--error)"
                          : "transparent",
                    }}
                  ></div>
                </div>
              </div>
            );
          })()}
        </div>

        <button
          className="toggle-sidebar-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Ocultar temario" : "Mostrar temario"}
        >
          {sidebarOpen ? "📖 Ocultar Temario" : "📖 Ver Temario"}
        </button>
      </header>

      <div className="classroom-body">
        {/* SIDEBAR IZQUIERDA: TEMARIO DEL CURSO */}
        <aside
          className={`classroom-sidebar ${sidebarOpen ? "open" : "collapsed"}`}
        >
          <div className="sidebar-title">
            <h3>Contenido del Curso</h3>
          </div>
          <div className="sidebar-scrollable">
            {modules.map((mod, modIdx) => {
              const moduleLessons = lessons.filter(
                (l) => l.module_id === mod.id,
              );
              return (
                <div key={mod.id} className="sidebar-module-block">
                  <h4 className="module-title-heading">
                    Módulo {modIdx + 1}: {mod.title}
                  </h4>
                  <ul
                    className="sidebar-lesson-list"
                    style={{ padding: 0, margin: 0, listStyle: "none" }}
                  >
                    {/* LECCIONES */}
                    {moduleLessons.map((les) => {
                      const isActive =
                        activeLesson && activeLesson.id === les.id;
                      const isDone = completedLessons.has(les.id);
                      return (
                        <li
                          key={les.id}
                          className={`sidebar-lesson-item ${isActive ? "active" : ""} ${isDone ? "completed" : ""}`}
                          onClick={() => {
                            setActiveLesson(les);
                            setActiveQuiz(null); // Deseleccionar examen
                          }}
                        >
                          <div className="lesson-check-status">
                            {isDone ? "✅" : "⚪"}
                          </div>
                          <span className="lesson-title-span">{les.title}</span>
                          {les.video_url && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "0.85rem",
                              }}
                            >
                              🎥
                            </span>
                          )}
                        </li>
                      );
                    })}

                    {/* EXÁMENES (QUIZZES) */}
                    {quizzes
                      .filter((q) => q.module_id === mod.id)
                      .map((qz) => {
                        const isQuizSubmitted = quizSubmissions.some(
                          (s) => s.quiz_id === qz.id,
                        );
                        const isQuizActive =
                          activeQuiz && activeQuiz.id === qz.id;
                        return (
                          <li
                            key={qz.id}
                            className={`sidebar-lesson-item ${isQuizActive ? "active" : ""}`}
                            style={{
                              borderLeft: "3px solid var(--primary)",
                              background: isQuizActive
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(245, 158, 11, 0.03)",
                              margin: "4px 0",
                            }}
                            onClick={() => {
                              setActiveQuiz(qz);
                              setActiveLesson(null); // Deseleccionar lección
                            }}
                          >
                            <div className="lesson-check-status">
                              {isQuizSubmitted ? "🎯" : "⚡"}
                            </div>
                            <span
                              className="lesson-title-span"
                              style={{
                                color: "var(--primary)",
                                fontWeight: "bold",
                              }}
                            >
                              Examen: {qz.title}
                            </span>
                          </li>
                        );
                      })}

                    {moduleLessons.length === 0 &&
                      quizzes.filter((q) => q.module_id === mod.id).length ===
                        0 && (
                        <p className="no-lessons-text">
                          Próximamente más contenidos.
                        </p>
                      )}
                  </ul>
                </div>
              );
            })}
            {modules.length === 0 && (
              <p className="no-modules-text">
                Este curso no tiene módulos cargados aún.
              </p>
            )}
          </div>
        </aside>

        {/* ÁREA PRINCIPAL: REPRODUCTOR DE CONTENIDOS */}
        <main className="classroom-content">
          {activeQuiz ? (
            <div
              className="lesson-viewer-card"
              style={{ border: "1px solid var(--primary)" }}
            >
              {/* Encabezado del Examen */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-muted)",
                  paddingBottom: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <span
                    className="course-tag"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "var(--primary)",
                    }}
                  >
                    EVALUACIÓN AUTOMÁTICA
                  </span>
                  <h2
                    style={{ color: "var(--primary)", margin: "0.25rem 0 0 0" }}
                  >
                    {activeQuiz.title}
                  </h2>
                </div>
                <strong style={{ fontSize: "1.1rem" }}>
                  ABC Digital STEAM
                </strong>
              </div>

              {activeQuiz.description && (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                    background: "rgba(255,255,255,0.02)",
                    padding: "1rem",
                    borderRadius: "8px",
                    borderLeft: "4px solid var(--primary)",
                    marginBottom: "2rem",
                  }}
                >
                  📖 <strong>Instrucciones:</strong> {activeQuiz.description}
                </p>
              )}

              {/* Si el alumno ya presentó el examen, mostrar resultado */}
              {quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) ? (
                (() => {
                  const sub = quizSubmissions.find(
                    (s) => s.quiz_id === activeQuiz.id,
                  );
                  const isApproved = sub.score >= 60;
                  return (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1.5rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "12px",
                        border: "1px solid var(--border-muted)",
                      }}
                    >
                      <span style={{ fontSize: "4rem" }}>
                        {isApproved ? "🎉" : "⚠️"}
                      </span>
                      <h3
                        style={{
                          fontSize: "1.8rem",
                          color: isApproved ? "var(--success)" : "var(--error)",
                          margin: "1rem 0",
                        }}
                      >
                        {isApproved
                          ? "¡Examen Aprobado!"
                          : "Examen No Aprobado"}
                      </h3>
                      <p
                        style={{
                          color: "var(--text-main)",
                          fontSize: "1.1rem",
                          margin: "0.5rem 0",
                        }}
                      >
                        Tu puntaje final fue de:{" "}
                        <strong
                          style={{
                            fontSize: "1.6rem",
                            color: "var(--primary)",
                          }}
                        >
                          {sub.score} / 100
                        </strong>
                      </p>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.95rem",
                        }}
                      >
                        Respondiste correctamente{" "}
                        <strong>{sub.correct_answers}</strong> de un total de{" "}
                        <strong>{sub.total_questions}</strong> preguntas.
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginTop: "2rem",
                        }}
                      >
                        Presentado el:{" "}
                        {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })()
              ) : (
                /* Si no lo ha presentado, renderizar preguntas del examen */
                <div>
                  {quizQuestions.filter((q) => q.quiz_id === activeQuiz.id)
                    .length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Este examen no contiene preguntas registradas aún por el
                      profesor.
                    </p>
                  ) : (
                    <div>
                      {quizQuestions
                        .filter((q) => q.quiz_id === activeQuiz.id)
                        .map((q, qIdx) => (
                          <div
                            key={q.id}
                            style={{
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border-muted)",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              marginBottom: "1.5rem",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 1rem 0",
                                fontSize: "1.1rem",
                                lineHeight: "1.5",
                              }}
                            >
                              <span
                                style={{
                                  color: "var(--primary)",
                                  marginRight: "0.5rem",
                                }}
                              >
                                Pregunta {qIdx + 1}:
                              </span>
                              {q.question_text}
                            </h4>

                            {/* Opciones de respuesta */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                              }}
                            >
                              {[
                                { label: "A", text: q.option_a },
                                { label: "B", text: q.option_b },
                                { label: "C", text: q.option_c },
                                { label: "D", text: q.option_d },
                              ].map((opt) => (
                                <label
                                  key={opt.label}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "0.8rem 1.2rem",
                                    background:
                                      selectedAnswers[q.id] === opt.label
                                        ? "rgba(245, 158, 11, 0.08)"
                                        : "var(--bg-main)",
                                    border: "1px solid",
                                    borderColor:
                                      selectedAnswers[q.id] === opt.label
                                        ? "var(--primary)"
                                        : "var(--border-light)",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    value={opt.label}
                                    checked={
                                      selectedAnswers[q.id] === opt.label
                                    }
                                    onChange={() =>
                                      setSelectedAnswers({
                                        ...selectedAnswers,
                                        [q.id]: opt.label,
                                      })
                                    }
                                    style={{
                                      accentColor: "var(--primary)",
                                      width: "18px",
                                      height: "18px",
                                      margin: 0,
                                    }}
                                  />
                                  <div>
                                    <strong
                                      style={{
                                        color: "var(--primary)",
                                        marginRight: "0.5rem",
                                      }}
                                    >
                                      {opt.label}.
                                    </strong>
                                    {opt.text}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}

                      {/* Botón para Enviar el Examen */}
                      <button
                        onClick={() => handleSubmitQuiz(activeQuiz.id)}
                        disabled={submittingQuiz}
                        style={{
                          width: "100%",
                          background: "var(--primary)",
                          color: "black",
                          fontWeight: "bold",
                          border: "none",
                          padding: "1rem",
                          borderRadius: "10px",
                          fontSize: "1.05rem",
                          cursor: "pointer",
                          marginTop: "1rem",
                        }}
                      >
                        {submittingQuiz
                          ? "Enviando Examen y Calificando..."
                          : "Enviar Examen y Ver Calificación"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeLesson ? (
            <div className="lesson-viewer-card">
              {/* Contenedor del Video */}
              {activeLesson.video_url ? (
                <div className="video-player-wrapper">
                  <iframe
                    src={getEmbedUrl(activeLesson.video_url)}
                    title={activeLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="no-video-placeholder">
                  <span style={{ fontSize: "3rem" }}>📖</span>
                  <p>Esta lección es de lectura y actividades prácticas.</p>
                </div>
              )}

              {/* Título de la Lección y Botón de Completado */}
              <div
                className="lesson-header-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                }}
              >
                <h2 className="active-lesson-title">{activeLesson.title}</h2>
                <button
                  className={`btn-complete-lesson ${completedLessons.has(activeLesson.id) ? "completed" : ""}`}
                  onClick={() => toggleLessonCompletion(activeLesson.id)}
                  disabled={savingProgress}
                  style={{
                    background: completedLessons.has(activeLesson.id)
                      ? "var(--success)"
                      : "var(--primary)",
                    color: "black",
                    fontWeight: "bold",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  {completedLessons.has(activeLesson.id)
                    ? "✓ Clase Completada"
                    : "⚪ Marcar como Completada"}
                </button>
              </div>

              {/* Recurso de Lectura / Descargas PDF si existe */}
              {activeLesson.resource_url && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px dashed var(--success)",
                    padding: "1rem",
                    borderRadius: "10px",
                    margin: "1.5rem 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--success)" }}>
                      📁 Material de Lectura Adjunto:
                    </strong>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {activeLesson.resource_name}
                    </p>
                  </div>
                  <a
                    href={getCorrectUrl(activeLesson.resource_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "var(--success)",
                      color: "white",
                      padding: "0.6rem 1.2rem",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                    }}
                  >
                    Descargar PDF
                  </a>
                </div>
              )}

              {/* Cuerpo del Contenido de la Lección */}
              <div
                className="lesson-description-content"
                style={{
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--border-muted)",
                  paddingTop: "1.5rem",
                }}
              >
                {activeLesson.content ? (
                  <div className="markdown-body">
                    {activeLesson.content
                      .split("\n")
                      .map((paragraph, index) => (
                        <p
                          key={index}
                          style={{
                            lineHeight: "1.6",
                            color: "var(--text-main)",
                            marginBottom: "1rem",
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className="no-content-description">
                    No hay descripción o material escrito adicional para esta
                    lección. Sigue las instrucciones del video.
                  </p>
                )}
              </div>

              {/* SECCIÓN DE TAREAS / PROYECTOS DEL MÓDULO */}
              {currentModuleAssignments.length > 0 && (
                <div
                  style={{
                    marginTop: "3rem",
                    paddingTop: "2rem",
                    borderTop: "2px solid var(--primary)",
                  }}
                >
                  <h3 style={{ color: "var(--primary)", marginBottom: "1rem" }}>
                    📝 Proyectos y Entregas del Módulo
                  </h3>
                  {currentModuleAssignments.map((assign) => {
                    const studentSub = studentSubmissions.find(
                      (s) => s.assignment_id === assign.id,
                    );
                    const fileSelected = selectedSubmissionFile[assign.id];

                    return (
                      <div
                        key={assign.id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-muted)",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          marginBottom: "1.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "1rem",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "1.2rem",
                                color: "#60a5fa",
                              }}
                            >
                              {assign.title}
                            </h4>
                            <p
                              style={{
                                margin: "0.5rem 0",
                                color: "var(--text-muted)",
                                fontSize: "0.95rem",
                              }}
                            >
                              {assign.description}
                            </p>
                            {assign.due_date && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--error)",
                                  fontWeight: "bold",
                                  display: "block",
                                }}
                              >
                                📅 Fecha Límite:{" "}
                                {new Date(assign.due_date).toLocaleString()}
                              </span>
                            )}
                            {assign.resource_url && (
                              <div style={{ marginTop: "0.75rem" }}>
                                <a
                                  href={getCorrectUrl(assign.resource_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  📥 Descargar Guía o Documento de Apoyo (
                                  {assign.resource_name || "guia.pdf"})
                                </a>
                              </div>
                            )}
                          </div>

                          {/* ESTADO DE ENTREGA Y CALIFICACIÓN */}
                          <div
                            style={{
                              background: "var(--bg-main)",
                              padding: "1rem",
                              borderRadius: "10px",
                              minWidth: "220px",
                              border: "1px solid var(--border-light)",
                            }}
                          >
                            {studentSub ? (
                              <div>
                                <span
                                  style={{
                                    color: "var(--success)",
                                    fontWeight: "bold",
                                    fontSize: "0.9rem",
                                    display: "block",
                                  }}
                                >
                                  ✓ Entregado con éxito
                                </span>
                                <a
                                  href={getCorrectUrl(studentSub.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--primary)",
                                    textDecoration: "underline",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {studentSub.file_name}
                                </a>
                                <div
                                  style={{
                                    marginTop: "0.75rem",
                                    borderTop: "1px solid var(--border-muted)",
                                    paddingTop: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: "0.85rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Calificación:
                                  </span>
                                  <strong
                                    style={{
                                      fontSize: "1.2rem",
                                      color:
                                        studentSub.grade !== null
                                          ? "var(--success)"
                                          : "var(--primary)",
                                    }}
                                  >
                                    {studentSub.grade !== null
                                      ? `${studentSub.grade} / 100`
                                      : "Pendiente de revisión"}
                                  </strong>
                                  {studentSub.feedback && (
                                    <p
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                        margin: "0.4rem 0 0 0",
                                        background: "rgba(255,255,255,0.03)",
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      💬 Feedback: {studentSub.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span
                                  style={{
                                    color: "var(--error)",
                                    fontWeight: "bold",
                                    fontSize: "0.9rem",
                                    display: "block",
                                    marginBottom: "0.5rem",
                                  }}
                                >
                                  ⚠️ Sin entregar
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                                  onChange={(e) =>
                                    setSelectedSubmissionFile({
                                      ...selectedSubmissionFile,
                                      [assign.id]: e.target.files[0],
                                    })
                                  }
                                  style={{
                                    fontSize: "0.8rem",
                                    margin: "0.5rem 0",
                                    width: "100%",
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    handleUploadSubmission(assign.id)
                                  }
                                  disabled={
                                    uploadingAssignmentId === assign.id ||
                                    !fileSelected
                                  }
                                  style={{
                                    width: "100%",
                                    background: fileSelected
                                      ? "var(--success)"
                                      : "#334155",
                                    color: fileSelected ? "white" : "#64748b",
                                    fontWeight: "bold",
                                    border: "none",
                                    padding: "0.5rem",
                                    borderRadius: "6px",
                                    cursor: fileSelected
                                      ? "pointer"
                                      : "not-allowed",
                                  }}
                                >
                                  {uploadingAssignmentId === assign.id
                                    ? "Subiendo archivo..."
                                    : "Entregar Tarea"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="no-lesson-selected">
              <span style={{ fontSize: "4rem" }}>🎓</span>
              <h2>Bienvenido a tu Aula Virtual</h2>
              <p>
                Selecciona una clase o un examen del menú izquierdo para iniciar
                tu aprendizaje STEAM.
              </p>
            </div>
          )}{" "}
        </main>
      </div>
    </div>
  );
};

export default Classroom;
