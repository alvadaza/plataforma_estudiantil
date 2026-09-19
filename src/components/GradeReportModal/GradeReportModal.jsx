import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Ajusta la ruta según la ubicación de tu cliente Supabase

export default function GradeReportModal({
  isOpen,
  onClose,
  courseId,
  courseName = "Curso STEAM",
  courseCode = "STEAM-101",
  teacherName = "Docente Orientador",
}) {
  const [scope, setScope] = useState("group"); // "group" | "student"
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Estados de Datos
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [reportRows, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Cargar lista inicial de alumnos y módulos del curso cuando se abre el modal
  useEffect(() => {
    if (isOpen && courseId) {
      loadInitialMetadata();
    }
  }, [isOpen, courseId]);

  // Recargar reporte cada vez que cambien los filtros
  useEffect(() => {
    if (isOpen && courseId) {
      buildGradeReport();
    }
  }, [
    isOpen,
    courseId,
    scope,
    selectedStudentId,
    selectedModuleId,
    startDate,
    endDate,
  ]);

  const loadInitialMetadata = async () => {
    try {
      setLoading(true);

      // 1. Obtener estudiantes inscritos en el curso
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      let studentProfiles = [];
      if (enrollments && enrollments.length > 0) {
        const ids = enrollments.map((e) => e.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, cedula, email")
          .in("id", ids)
          .order("full_name");
        studentProfiles = profiles || [];
      }
      setStudents(studentProfiles);

      // 2. Obtener módulos del curso
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, title, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      setModules(modulesData || []);
    } catch (err) {
      console.error("Error al cargar metadatos de sábana de notas:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildGradeReport = async () => {
    try {
      setLoading(true);

      // 1. Módulos a consultar
      let targetModuleIds = modules.map((m) => m.id);
      if (selectedModuleId !== "all") {
        targetModuleIds = [selectedModuleId];
      }
      if (targetModuleIds.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // 2. Tareas de los módulos
      const { data: assignsData } = await supabase
        .from("assignments")
        .select("id, module_id")
        .in("module_id", targetModuleIds);
      const assignIds = (assignsData || []).map((a) => a.id);

      // 3. Exámenes de los módulos
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("id, module_id")
        .in("module_id", targetModuleIds);
      const quizIds = (quizzesData || []).map((q) => q.id);

      // 4. Estudiantes a consultar
      let targetStudents = students;
      if (scope === "student" && selectedStudentId) {
        targetStudents = students.filter((s) => s.id === selectedStudentId);
      }
      const targetStudentIds = targetStudents.map((s) => s.id);
      if (targetStudentIds.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // 5. Entregas de tareas y exámenes
      let subsQuery = supabase
        .from("assignment_submissions")
        .select("student_id, assignment_id, grade, submitted_at")
        .in("student_id", targetStudentIds);
      if (assignIds.length > 0) {
        subsQuery = subsQuery.in("assignment_id", assignIds);
      }
      const { data: subsData } = await subsQuery;

      let quizSubsQuery = supabase
        .from("quiz_submissions")
        .select("student_id, quiz_id, score, submitted_at")
        .in("student_id", targetStudentIds);
      if (quizIds.length > 0) {
        quizSubsQuery = quizSubsQuery.in("quiz_id", quizIds);
      }
      const { data: quizSubsData } = await quizSubsQuery;

      // 6. Aplicar Filtro de Fechas
      let filteredSubs = subsData || [];
      let filteredQuizSubs = quizSubsData || [];
      if (startDate) {
        const startIso = new Date(startDate + "T00:00:00").toISOString();
        filteredSubs = filteredSubs.filter((s) => s.submitted_at >= startIso);
        filteredQuizSubs = filteredQuizSubs.filter(
          (q) => q.submitted_at >= startIso,
        );
      }
      if (endDate) {
        const endIso = new Date(endDate + "T23:59:59").toISOString();
        filteredSubs = filteredSubs.filter((s) => s.submitted_at <= endIso);
        filteredQuizSubs = filteredQuizSubs.filter(
          (q) => q.submitted_at <= endIso,
        );
      }

      // 7. Consolidar la sábana de notas estudiante por estudiante
      const rows = targetStudents.map((student) => {
        const studentSubs = filteredSubs.filter(
          (s) => s.student_id === student.id && s.grade !== null,
        );
        const studentQuizSubs = filteredQuizSubs.filter(
          (q) => q.student_id === student.id && q.score !== null,
        );

        // Promedio Tareas
        const assignScores = studentSubs.map((s) => parseFloat(s.grade));
        const assignAvg =
          assignScores.length > 0
            ? Math.round(
                assignScores.reduce((a, b) => a + b, 0) / assignScores.length,
              )
            : null;

        // Promedio Exámenes
        const quizScores = studentQuizSubs.map((q) => parseFloat(q.score));
        const quizAvg =
          quizScores.length > 0
            ? Math.round(
                quizScores.reduce((a, b) => a + b, 0) / quizScores.length,
              )
            : null;

        // Promedio Definitivo Consolidado
        const allScores = [...assignScores, ...quizScores];
        const overallAvg =
          allScores.length > 0
            ? Math.round(
                allScores.reduce((a, b) => a + b, 0) / allScores.length,
              )
            : null;

        // Estado Académico
        let status = "Sin Evaluaciones";
        let statusColor = "var(--text-muted)";
        if (overallAvg !== null) {
          if (overallAvg >= 60) {
            status = "APROBADO";
            statusColor = "var(--success)";
          } else {
            status = "REPROBADO";
            statusColor = "var(--error)";
          }
        }

        return {
          studentId: student.id,
          fullName: student.full_name || "Estudiante Sin Nombre",
          cedula: student.cedula || "N/A",
          email: student.email || "",
          tasksCompleted: assignScores.length,
          quizzesCompleted: quizScores.length,
          assignAvg,
          quizAvg,
          overallAvg,
          status,
          statusColor,
        };
      });

      setReportData(rows);
    } catch (err) {
      console.error("Error al construir reporte de sábana de notas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Función de impresión nativa sin violar CSP ni dependencias externas
  const handleExportPDF = () => {
    setGeneratingPdf(true);
    try {
      window.print();
    } catch (err) {
      console.error("Error al invocar la impresión:", err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const dateRangeStr =
    startDate || endDate
      ? `${startDate || "Inicio"} hasta ${endDate || "Hoy"}`
      : "Histórico Completo";

  const selectedModuleName =
    selectedModuleId === "all"
      ? "Todos los Módulos"
      : modules.find((m) => m.id === selectedModuleId)?.title ||
        "Módulo Seleccionado";

  return (
    <>
      {/* ESTILOS DE IMPRESIÓN DIRECTOS PARA @media print */}
      <style>{`
        .printable-report-area {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-report-area,
          .printable-report-area * {
            visibility: visible !important;
          }
          .printable-report-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
        }
      `}</style>

      {/* OVERLAY DEL MODAL */}
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
        {/* CAJA DEL MODAL EN PANTALLA */}
        <div
          style={{
            background: "var(--bg-card, #1e293b)",
            border: "1px solid var(--primary, #f59e0b)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "950px",
            width: "92%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            color: "var(--text-main, #ffffff)",
          }}
        >
          {/* ENCABEZADO DEL MODAL */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              borderBottom:
                "1px solid var(--border-light, rgba(255,255,255,0.1))",
              paddingBottom: "1rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  color: "var(--primary, #f59e0b)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Reportes Institucionales STEAM
              </span>
              <h2
                style={{
                  color: "var(--text-main, #ffffff)",
                  margin: "0.4rem 0 0 0",
                  fontSize: "1.5rem",
                }}
              >
                Sábana de Notas: {courseName}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              title="Cerrar modal"
            >
              ✖
            </button>
          </div>

          {/* PANEL DE FILTROS CONFIGURABLES */}
          <div
            style={{
              background: "var(--bg-secondary, #0f172a)",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid var(--border-muted, rgba(255,255,255,0.08))",
              marginBottom: "1.5rem",
            }}
          >
            <h4
              style={{
                margin: "0 0 1rem 0",
                color: "#f59e0b",
                fontSize: "0.95rem",
              }}
            >
              Filtros de Generación
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* 1. Alcance */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--text-muted, #94a3b8)",
                    marginBottom: "0.3rem",
                    fontWeight: "bold",
                  }}
                >
                  Consultar Alcance:
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    background: "var(--bg-main, #0f172a)",
                    color: "white",
                    border: "1px solid var(--border-light, #334155)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="group">
                    Todo el Grupo ({students.length} Alumnos)
                  </option>
                  <option value="student">Estudiante Específico</option>
                </select>
              </div>

              {/* Selector de Estudiante (si scope === "student") */}
              {scope === "student" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      color: "var(--text-muted, #94a3b8)",
                      marginBottom: "0.3rem",
                      fontWeight: "bold",
                    }}
                  >
                    Seleccionar Estudiante:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "8px",
                      background: "var(--bg-main, #0f172a)",
                      color: "white",
                      border: "1px solid var(--border-light, #334155)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name} ({st.cedula || "S/C"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Filtro por Módulo */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--text-muted, #94a3b8)",
                    marginBottom: "0.3rem",
                    fontWeight: "bold",
                  }}
                >
                  Filtrar por Módulo:
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "8px",
                    background: "var(--bg-main, #0f172a)",
                    color: "white",
                    border: "1px solid var(--border-light, #334155)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="all">
                    Todos los Módulos ({modules.length})
                  </option>
                  {modules.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      Módulo {idx + 1}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Fecha Inicio */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--text-muted, #94a3b8)",
                    marginBottom: "0.3rem",
                    fontWeight: "bold",
                  }}
                >
                  Fecha Inicial (Desde):
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    borderRadius: "8px",
                    background: "var(--bg-main, #0f172a)",
                    color: "white",
                    border: "1px solid var(--border-light, #334155)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {/* 4. Fecha Fin */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--text-muted, #94a3b8)",
                    marginBottom: "0.3rem",
                    fontWeight: "bold",
                  }}
                >
                  Fecha Final (Hasta):
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    borderRadius: "8px",
                    background: "var(--bg-main, #0f172a)",
                    color: "white",
                    border: "1px solid var(--border-light, #334155)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* VISTA PREVIA DE LA TABLA DE RESULTADOS EN PANTALLA */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
                Vista Previa de Consolidado ({reportRows.length} Registros)
              </h4>
              {loading && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "#f59e0b",
                  }}
                >
                  Calculando notas...
                </span>
              )}
            </div>

            <div
              style={{
                overflowX: "auto",
                maxHeight: "320px",
                borderRadius: "10px",
                border: "1px solid var(--border-light, rgba(255,255,255,0.1))",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                  background: "var(--bg-main, #0f172a)",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-muted, #94a3b8)",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "0.75rem 1rem" }}>Estudiante</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Cédula</th>
                    <th
                      style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                    >
                      Tareas Entregadas
                    </th>
                    <th
                      style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                    >
                      Exámenes Presentados
                    </th>
                    <th
                      style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                    >
                      Promedio Final
                    </th>
                    <th
                      style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                    >
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "var(--text-muted, #94a3b8)",
                        }}
                      >
                        {loading
                          ? "Cargando datos del reporte..."
                          : "No se encontraron calificaciones con los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((row) => (
                      <tr
                        key={row.studentId}
                        style={{
                          borderBottom:
                            "1px solid var(--border-muted, rgba(255,255,255,0.05))",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", color: "white" }}>
                          {row.fullName}
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted, #94a3b8)",
                              fontWeight: "normal",
                            }}
                          >
                            {row.email}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            color: "var(--text-muted, #94a3b8)",
                          }}
                        >
                          {row.cedula}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {row.tasksCompleted}{" "}
                          {row.assignAvg !== null
                            ? `(${row.assignAvg}/100)`
                            : ""}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {row.quizzesCompleted}{" "}
                          {row.quizAvg !== null ? `(${row.quizAvg}/100)` : ""}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "1rem",
                            color:
                              row.overallAvg !== null
                                ? row.overallAvg >= 60
                                  ? "var(--success, #10b981)"
                                  : "var(--error, #ef4444)"
                                : "var(--text-muted)",
                          }}
                        >
                          {row.overallAvg !== null
                            ? `${row.overallAvg} / 100`
                            : "S/N"}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "6px",
                              background:
                                row.overallAvg !== null
                                  ? row.overallAvg >= 60
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : "rgba(239, 68, 68, 0.15)"
                                  : "rgba(255, 255, 255, 0.05)",
                              color:
                                row.overallAvg !== null
                                  ? row.overallAvg >= 60
                                    ? "#10b981"
                                    : "#ef4444"
                                  : "#94a3b8",
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN DEL MODAL */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              borderTop: "1px solid var(--border-light, rgba(255,255,255,0.1))",
              paddingTop: "1.25rem",
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                color: "var(--text-muted, #94a3b8)",
                border: "1px solid var(--border-light, #334155)",
                padding: "0.85rem 1.5rem",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>

            <button
              onClick={handleExportPDF}
              disabled={reportRows.length === 0 || generatingPdf}
              style={{
                background:
                  reportRows.length > 0 ? "var(--primary, #f59e0b)" : "#334155",
                color: reportRows.length > 0 ? "#0f172a" : "#94a3b8",
                border: "none",
                padding: "0.85rem 2rem",
                borderRadius: "10px",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: reportRows.length > 0 ? "pointer" : "not-allowed",
              }}
            >
              {generatingPdf
                ? "Preparando Vista..."
                : "📄 Exportar PDF / Imprimir"}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR IMPRIMIBLE INSTITUCIONAL (Oculto en pantalla, visible en @media print) */}
      <div className="printable-report-area">
        {/* ENCABEZADO INSTITUCIONAL */}
        <table
          style={{
            width: "100%",
            borderBottom: "3px solid #f59e0b",
            paddingBottom: "12px",
            marginBottom: "15px",
          }}
        >
          <tbody>
            <tr>
              <td>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: 0,
                    letterSpacing: "0.5px",
                  }}
                >
                  ABC DIGITAL STEAM
                </h1>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#f59e0b",
                    fontWeight: "bold",
                  }}
                >
                  Plataforma Educativa de Tecnología e Innovación
                </div>
              </td>
              <td
                style={{
                  textAlign: "right",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                SÁBANA OFICIAL DE CALIFICACIONES
              </td>
            </tr>
          </tbody>
        </table>

        {/* METADATOS DEL CURSO Y PERIODO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "10px",
            background: "#f8fafc",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <strong
              style={{ display: "block", fontSize: "10px", color: "#64748b" }}
            >
              ASIGNATURA / CURSO:
            </strong>
            <span
              style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a" }}
            >
              {courseName} ({courseCode})
            </span>
          </div>
          <div>
            <strong
              style={{ display: "block", fontSize: "10px", color: "#64748b" }}
            >
              DOCENTE ORIENTADOR:
            </strong>
            <span
              style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a" }}
            >
              {teacherName}
            </span>
          </div>
          <div>
            <strong
              style={{ display: "block", fontSize: "10px", color: "#64748b" }}
            >
              MÓDULO SELECCIONADO:
            </strong>
            <span
              style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a" }}
            >
              {selectedModuleName}
            </span>
          </div>
          <div>
            <strong
              style={{ display: "block", fontSize: "10px", color: "#64748b" }}
            >
              PERIODO DE EVALUACIÓN:
            </strong>
            <span
              style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a" }}
            >
              {dateRangeStr}
            </span>
          </div>
        </div>

        {/* TABLA DE RESULTADOS EN HOJA IMPRESA */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr style={{ background: "#0f172a", color: "#ffffff" }}>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: "11px",
                  width: "25%",
                  border: "1px solid #0f172a",
                }}
              >
                Estudiante
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: "11px",
                  width: "15%",
                  border: "1px solid #0f172a",
                }}
              >
                Documento (C.C.)
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontSize: "11px",
                  width: "15%",
                  border: "1px solid #0f172a",
                }}
              >
                Prom. Tareas
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontSize: "11px",
                  width: "15%",
                  border: "1px solid #0f172a",
                }}
              >
                Prom. Exámenes
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontSize: "11px",
                  width: "15%",
                  border: "1px solid #0f172a",
                }}
              >
                Nota Definitiva
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "center",
                  fontSize: "11px",
                  width: "15%",
                  border: "1px solid #0f172a",
                }}
              >
                Estado Final
              </th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row) => (
              <tr
                key={row.studentId}
                style={{ borderBottom: "1px solid #cbd5e1" }}
              >
                <td
                  style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}
                >
                  <strong>{row.fullName}</strong>
                  <br />
                  <span style={{ fontSize: "9px", color: "#64748b" }}>
                    {row.email}
                  </span>
                </td>
                <td
                  style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}
                >
                  {row.cedula}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {row.assignAvg !== null ? `${row.assignAvg} / 100` : "-"}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {row.quizAvg !== null ? `${row.quizAvg} / 100` : "-"}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {row.overallAvg !== null
                    ? `${row.overallAvg} / 100`
                    : "Sin Notas"}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      color:
                        row.overallAvg !== null && row.overallAvg >= 60
                          ? "#047857"
                          : "#b91c1c",
                      background:
                        row.overallAvg !== null && row.overallAvg >= 60
                          ? "#d1fae5"
                          : "#fee2e2",
                    }}
                  >
                    {row.overallAvg !== null
                      ? row.overallAvg >= 60
                        ? "APROBADO"
                        : "REPROBADO"
                      : "S/E"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* RESUMEN CONSOLIDADO */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "30px",
          }}
        >
          <div>
            <strong style={{ color: "#475569", fontSize: "11px" }}>
              TOTAL ESTUDIANTES EVALUADOS:
            </strong>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#0f172a",
                marginLeft: "5px",
              }}
            >
              {reportRows.length}
            </span>
          </div>
          <div>
            <strong style={{ color: "#475569", fontSize: "11px" }}>
              APROBADOS:
            </strong>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#10b981",
                marginLeft: "5px",
              }}
            >
              {
                reportRows.filter(
                  (r) => r.overallAvg !== null && r.overallAvg >= 60,
                ).length
              }
            </span>
          </div>
          <div>
            <strong style={{ color: "#475569", fontSize: "11px" }}>
              REPROBADOS:
            </strong>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#ef4444",
                marginLeft: "5px",
              }}
            >
              {
                reportRows.filter(
                  (r) => r.overallAvg !== null && r.overallAvg < 60,
                ).length
              }
            </span>
          </div>
        </div>

        {/* FIRMAS INSTITUCIONALES */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: "40px",
            pageBreakInside: "avoid",
          }}
        >
          <div
            style={{
              width: "220px",
              borderTop: "1px solid #0f172a",
              textAlign: "center",
              paddingTop: "5px",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            {teacherName}
            <br />
            <span style={{ fontWeight: "normal", color: "#64748b" }}>
              Docente Responsable
            </span>
          </div>
          <div
            style={{
              width: "220px",
              borderTop: "1px solid #0f172a",
              textAlign: "center",
              paddingTop: "5px",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            Coordinación Académica STEAM
            <br />
            <span style={{ fontWeight: "normal", color: "#64748b" }}>
              Firma y Sello de Validación
            </span>
          </div>
        </div>

        {/* NOTA DE PIE DE PÁGINA */}
        <div
          style={{
            textAlign: "center",
            fontSize: "9px",
            color: "#94a3b8",
            marginTop: "25px",
          }}
        >
          Documento generado automáticamente por el Sistema Integral ABC Digital
          STEAM el {new Date().toLocaleString()}.
        </div>
      </div>
    </>
  );
}
