import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./TeacherPanel.css";

const TeacherPanel = () => {
  const { courseId } = useParams();
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();

  // Estados de carga e información general
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState("students"); // "students", "submissions", "quizzes"

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
      alert(
        "Acceso denegado: Esta sección es exclusiva para profesores orientadores.",
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
      alert("Por favor, ingresa una calificación válida de 0 a 100.");
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
      alert("¡Proyecto calificado con éxito! El alumno ya puede ver su nota.");
      fetchTeacherData(); // Recargar datos
    } catch (err) {
      alert("Error al guardar la calificación: " + err.message);
    } finally {
      setSavingGradeId(null);
    }
  };

  // Restablecer el intento de un examen para darle otra oportunidad al alumno
  const handleResetQuizAttempt = async (
    submissionId,
    studentName,
    quizTitle,
  ) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar este intento de examen y darle otra oportunidad a "${studentName}" para presentar "${quizTitle}"?`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("quiz_submissions")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;
      alert(
        `¡Intento restablecido con éxito! "${studentName}" puede presentar el examen "${quizTitle}" nuevamente.`,
      );
      fetchTeacherData(); // Recargar datos
    } catch (err) {
      alert("Error al restablecer el examen: " + err.message);
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
          📥 Calificar Proyectos y Tareas (
          {submissions.filter((s) => s.grade === null).length} Pendientes)
        </button>
        <button
          className={`tab-btn ${activeTab === "quizzes" ? "active" : ""}`}
          onClick={() => setActiveTab("quizzes")}
        >
          ⚡ Exámenes Automáticos ({quizSubmissions.length} Presentados)
        </button>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="teacher-main-container">
        {/* PESTAÑA: ALUMNOS ASIGNADOS */}
        {activeTab === "students" && (
          <div className="table-wrapper animate-fade">
            <h2>Lista de Estudiantes Inscritos</h2>
            {students.length === 0 ? (
              <p className="no-data-text">
                No hay alumnos inscritos en este curso todavía.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nombre Completo</th>
                    <th>Documento de Identidad (Cédula)</th>
                    <th>Correo Institucional</th>
                    <th>Estado en la Institución</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td
                        style={{ fontWeight: "bold", color: "var(--primary)" }}
                      >
                        {student.full_name}
                      </td>
                      <td>{student.cedula || "No registrado"}</td>
                      <td>{student.email}</td>
                      <td>
                        <span className="status-badge-active">
                          Activo en Aula
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

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
                          />
                        </td>
                        <td>
                          <textarea
                            placeholder="Escribe comentarios pedagógicos..."
                            className="feedback-textarea"
                            rows="1"
                            value={gradingFeedbacks[sub.id] || ""}
                            onChange={(e) =>
                              setGradingFeedbacks({
                                ...gradingFeedbacks,
                                [sub.id]: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            className={`save-grade-btn ${isPending ? "highlight" : ""}`}
                            onClick={() => handleSaveGrade(sub.id)}
                            disabled={savingGradeId === sub.id}
                          >
                            {savingGradeId === sub.id
                              ? "Guardando..."
                              : "Guardar Nota"}
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

        {/* PESTAÑA: EXÁMENES AUTOMÁTICOS */}
        {activeTab === "quizzes" && (
          <div className="table-wrapper animate-fade">
            <h2>Resultados de Evaluaciones Calificadas de Forma Automática</h2>
            {quizSubmissions.length === 0 ? (
              <p className="no-data-text">
                Ningún alumno ha resuelto exámenes automáticos para este curso.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Cuestionario / Examen</th>
                    <th>Respuestas Correctas</th>
                    <th>Puntaje Obtenido</th>
                    <th>Fecha de Envío</th>
                    <th>Opciones de Control</th>
                  </tr>
                </thead>
                <tbody>
                  {quizSubmissions.map((sub) => {
                    const quiz = quizzes.find((q) => q.id === sub.quiz_id);
                    const isApproved = sub.score >= 60;
                    return (
                      <tr key={sub.id}>
                        <td>
                          <strong>{sub.profiles?.full_name}</strong>
                          <div className="sub-text">{sub.profiles?.email}</div>
                        </td>
                        <td>
                          <span
                            style={{ fontWeight: "bold", color: "#60a5fa" }}
                          >
                            {quiz?.title || "Examen Temático"}
                          </span>
                        </td>
                        <td style={{ fontWeight: "bold" }}>
                          {sub.correct_answers} de {sub.total_questions}{" "}
                          preguntas
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
                            {isApproved ? "Aprobado" : "Reprobado"})
                          </strong>
                        </td>
                        <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                        <td>
                          <button
                            className="btn-change-password"
                            onClick={() =>
                              handleResetQuizAttempt(
                                sub.id,
                                sub.profiles?.full_name || "el alumno",
                                quiz?.title || "este examen",
                              )
                            }
                            style={{
                              background: "rgba(245, 158, 11, 0.12)",
                              color: "var(--primary)",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
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
      </main>
    </div>
  );
};

export default TeacherPanel;
