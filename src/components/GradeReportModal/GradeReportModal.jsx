import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * Componente GradeReportModal
 * Permite consultar y exportar la sábana de notas oficial de ABC Digital STEAM
 * Filtros: Todo el Grupo / Estudiante Específico, Rango de Fechas y Módulo.
 */
const GradeReportModal = ({
  isOpen,
  onClose,
  courseId,
  courseName = "Curso STEAM",
  courseCode = "STEAM-101",
  teacherName = "Profesor Orientador",
}) => {
  // Estados de Filtros
  const [scope, setScope] = useState("group"); // "group" | "student"
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Estados de Datos
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
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

      // 1. Obtener lista de alumnos matriculados
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId);

      let studentProfiles = [];
      if (enrollData && enrollData.length > 0) {
        const ids = enrollData.map((e) => e.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, cedula")
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

      // 2. Tareas y Exámenes de los módulos
      const { data: assignsData } = await supabase
        .from("assignments")
        .select("id, title, module_id")
        .in("module_id", targetModuleIds);

      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("id, title, module_id")
        .in("module_id", targetModuleIds);

      const activeAssignments = assignsData || [];
      const activeQuizzes = quizzesData || [];
      setAssignments(activeAssignments);
      setQuizzes(activeQuizzes);

      const assignIds = activeAssignments.map((a) => a.id);
      const quizIds = activeQuizzes.map((q) => q.id);

      // 3. Estudiantes a reportar
      let targetStudents = [...students];
      if (scope === "student" && selectedStudentId) {
        targetStudents = students.filter((s) => s.id === selectedStudentId);
      }

      const targetStudentIds = targetStudents.map((s) => s.id);

      if (targetStudentIds.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // 4. Entregas de Tareas (Submissions)
      let subsQuery = supabase
        .from("submissions")
        .select("id, student_id, assignment_id, grade, submitted_at")
        .in("student_id", targetStudentIds);

      if (assignIds.length > 0) {
        subsQuery = subsQuery.in("assignment_id", assignIds);
      }

      const { data: subsData } = await subsQuery;

      // 5. Entregas de Exámenes (Quiz Submissions)
      let quizSubsQuery = supabase
        .from("quiz_submissions")
        .select("id, student_id, quiz_id, score, submitted_at")
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

        // Promedio Global
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

  // Función para exportar e imprimir el PDF personalizado con estilo institucional ABC Digital STEAM
 const handleExportPDF = () => { setGeneratingPdf(true);
try {
    // 1. Crear iframe invisible
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    // 2. Escribir el HTML institucional de la sábana de notas
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // 3. Dar tiempo para renderizar estilos e invocar impresión
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Eliminar el iframe del DOM tras imprimir
      document.body.removeChild(iframe);
      setGeneratingPdf(false);
    }, 400);
  } catch (err) {
    console.error("Error al imprimir el reporte:", err);
    setGeneratingPdf(false);
  }
};
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Sábana de Notas - ${courseName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }
            .header-table {
              width: 100%;
              border-bottom: 3px solid #f59e0b;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .brand-sub {
              font-size: 11px;
              color: #f59e0b;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 2px;
            }
            .report-title {
              text-align: right;
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 10px 15px;
              border-radius: 8px;
              margin-bottom: 15px;
            }
            .meta-item strong {
              display: block;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
            }
            .meta-item span {
              font-size: 12px;
              font-weight: bold;
              color: #0f172a;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .data-table th {
              background: #0f172a;
              color: #ffffff;
              text-align: left;
              padding: 8px 10px;
              font-size: 11px;
              font-weight: bold;
              border: 1px solid #0f172a;
            }
            .data-table td {
              padding: 8px 10px;
              border: 1px solid #cbd5e1;
              font-size: 11px;
            }
            .data-table tr:nth-child(even) {
              background: #f8fafc;
            }
            .badge-pass {
              background: #dcfce7;
              color: #166534;
              font-weight: bold;
              padding: 3px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            .badge-fail {
              background: #fee2e2;
              color: #991b1b;
              font-weight: bold;
              padding: 3px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            .summary-box {
              display: flex;
              justify-content: space-between;
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 12px 18px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .summary-item strong {
              color: #475569;
              font-size: 11px;
            }
            .summary-item span {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin-left: 5px;
            }
            .signatures {
              display: flex;
              justify-content: space-around;
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .sig-line {
              width: 220px;
              border-top: 1px solid #0f172a;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              font-weight: bold;
            }
            .footer-note {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 25px;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 class="brand-title">ABC DIGITAL STEAM</h1>
                <div class="brand-sub">Plataforma Educativa de Tecnología e Innovación</div>
              </td>
              <td class="report-title">
                SÁBANA OFICIAL DE CALIFICACIONES
              </td>
            </tr>
          </table>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>Asignatura / Curso:</strong>
              <span>${courseName} (${courseCode})</span>
            </div>
            <div class="meta-item">
              <strong>Docente Orientador:</strong>
              <span>${teacherName}</span>
            </div>
            <div class="meta-item">
              <strong>Módulo / Rango:</strong>
              <span>${selectedModuleName}</span>
            </div>
            <div class="meta-item">
              <strong>Periodo de Evaluación:</strong>
              <span>${dateRangeStr}</span>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 25%;">Estudiante</th>
                <th style="width: 15%;">Documento (C.C.)</th>
                <th style="width: 12%; text-align: center;">Prom. Tareas</th>
                <th style="width: 12%; text-align: center;">Prom. Exámenes</th>
                <th style="width: 16%; text-align: center;">Nota Definitiva</th>
                <th style="width: 20%; text-align: center;">Estado Final</th>
              </tr>
            </thead>
            <tbody>
              ${reportRows
                .map(
                  (row) => `
                <tr>
                  <td>
                    <strong>${row.fullName}</strong><br>
                    <span style="font-size: 9px; color: #64748b;">${row.email}</span>
                  </td>
                  <td>${row.cedula}</td>
                  <td style="text-align: center;">${row.assignAvg !== null ? row.assignAvg + " / 100" : "-"}</td>
                  <td style="text-align: center;">${row.quizAvg !== null ? row.quizAvg + " / 100" : "-"}</td>
                  <td style="text-align: center; font-size: 13px; font-weight: bold;">
                    ${row.overallAvg !== null ? row.overallAvg + " / 100" : "Sin Notas"}
                  </td>
                  <td style="text-align: center;">
                    ${
                      row.overallAvg !== null
                        ? row.overallAvg >= 60
                          ? '<span class="badge-pass">APROBADO</span>'
                          : '<span class="badge-fail">REPROBADO</span>'
                        : '<span style="color: #94a3b8;">S/E</span>'
                    }
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-item"><strong>Total Alumnos Evaluados:</strong> <span>${totalStudentsReported}</span></div>
            <div class="summary-item"><strong>Aprobados:</strong> <span style="color: #166534;">${approvedCount}</span></div>
            <div class="summary-item"><strong>Reprobados:</strong> <span style="color: #991b1b;">${failedCount}</span></div>
            <div class="summary-item"><strong>Promedio General del Grupo:</strong> <span style="color: #f59e0b;">${classAvgOverall} / 100</span></div>
          </div>

          <div class="signatures">
            <div class="sig-line">
              ${teacherName}<br>
              <span style="font-weight: normal; color: #64748b;">Docente Responsable</span>
            </div>
            <div class="sig-line">
              Coordinación Académica STEAM<br>
              <span style="font-weight: normal; color: #64748b;">Firma y Sello de Validación</span>
            </div>
          </div>

          <div class="footer-note">
            Documento generado automáticamente por el Sistema Integral ABC Digital STEAM el ${currentDateStr}.
          </div>


        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // La CSP de producción bloquea cualquier script/evento inline
      // dentro de la ventana generada. Imprimimos desde la ventana principal.
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (printErr) {
          console.error("Error al abrir el diálogo de impresión:", printErr);
        }
      }, 500);

      // Ejecutar la impresión desde el contexto de React,
      // evitando scripts inline bloqueados por la CSP en producción.
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (err) {
      alert("Error al generar la sábana en PDF: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
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
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--primary, #f59e0b)",
                padding: "0.3rem 0.8rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              REPORTE ACADÉMICO OFICIAL
            </span>
            <h2
              style={{
                color: "var(--text-main, #ffffff)",
                margin: "0.4rem 0 0 0",
                fontSize: "1.5rem",
              }}
            >
              📄 Sábana de Notas: {courseName}
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
              color: "var(--primary, #f59e0b)",
              fontSize: "0.95rem",
            }}
          >
            ⚙️ Configurar Parámetros de Consulta
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* 1. Alcance (Grupo vs Estudiante) */}
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
                  👥 Todo el Grupo ({students.length} Alumnos)
                </option>
                <option value="student">👤 Estudiante Específico</option>
              </select>
            </div>

            {/* Selector de Estudiante (Solo si scope === "student") */}
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
                    border: "1px solid var(--primary, #f59e0b)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="">-- Selecciona un Alumno --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.cedula || "S/C"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Módulo */}
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
                  📂 Todos los Módulos ({modules.length})
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

        {/* VISTA PREVIA DE LA TABLA DE RESULTADOS */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                color: "var(--text-main, #ffffff)",
              }}
            >
              📊 Vista Previa de Resultados ({reportRows.length} Registros)
            </h3>
            {loading && (
              <span
                style={{
                  color: "var(--primary, #f59e0b)",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
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
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    Tareas Entregadas
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    Exámenes Presentados
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    Promedio Final
                  </th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--text-muted, #94a3b8)",
                      }}
                    >
                      No se encontraron calificaciones registradas para los
                      filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row) => (
                    <tr
                      key={row.studentId}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.75rem 1rem",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
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
                        style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                      >
                        {row.tasksCompleted}{" "}
                        {row.assignAvg !== null ? `(${row.assignAvg}/100)` : ""}
                      </td>
                      <td
                        style={{ padding: "0.75rem 1rem", textAlign: "center" }}
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
                            row.overallAvg >= 60
                              ? "var(--success, #10b981)"
                              : "var(--error, #ef4444)",
                        }}
                      >
                        {row.overallAvg !== null
                          ? `${row.overallAvg} / 100`
                          : "S/N"}
                      </td>
                      <td
                        style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "6px",
                            background:
                              row.overallAvg >= 60
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            color: row.statusColor,
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

        {/* ACCIONES DEL MODAL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#475569",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>

          <button
            type="button"
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
              boxShadow:
                reportRows.length > 0
                  ? "0 4px 15px rgba(245, 158, 11, 0.3)"
                  : "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {generatingPdf
              ? "Generando Documento..."
              : "🖨️ Exportar e Imprimir Sábana PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeReportModal;
