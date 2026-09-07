import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const Courses = () => {
  const { user, isStudent, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Inscripción Protegida (Seguridad del Catálogo)
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null);

  // NUEVO: Filtro para alternar entre "Todos los cursos" y "Mis Cursos" (Inscritos)
  const [activeTab, setActiveTab] = useState("my-courses"); // Predeterminado a ver sus cursos activos

  // Cargar cursos desde Supabase
  const loadCourses = useCallback(async () => {
    try {
      let query = supabase
        .from("courses")
        .select("id, name, code, description, thumbnail_url, teacher_id");

      if (isTeacher) {
        query = query.eq("teacher_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error cargando cursos:", err);
      setCourses([]);
      setFilteredCourses([]);
      if (window.showToast) {
        window.showToast(
          "No se pudieron cargar los cursos. Verifica tu conexión.",
          "error",
        );
      }
    }
  }, [isTeacher, user?.id]);

  // Cargar inscripciones (solo estudiantes)
  const loadMyEnrollments = useCallback(async () => {
    if (!isStudent || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      if (error) throw error;
      setMyEnrollments(data?.map((e) => e.course_id) || []);
    } catch (err) {
      console.error("Error cargando inscripciones:", err);
      if (window.showToast) {
        window.showToast("Error al cargar tus inscripciones.", "error");
      }
    }
  }, [isStudent, user?.id]);

  // Inscripción en la base de datos de Supabase (Camino B sin Moodle)
  const enroll = async (courseId) => {
    if (!isStudent) return;
    try {
      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      if (enrollError) throw enrollError;

      setMyEnrollments([...myEnrollments, courseId]);

      if (window.showToast) {
        window.showToast("¡Te has inscrito con éxito en el curso!", "success");
      } else {
        alert("¡Inscrito con éxito!");
      }
    } catch (err) {
      console.error("Error al inscribirse:", err);
      if (window.showToast) {
        window.showToast("Error al inscribirse: " + err.message, "error");
      } else {
        alert("Error al inscribirse: " + err.message);
      }
    }
  };

  // Filtrar y organizar cursos en tiempo real (según pestaña activa y buscador)
  useEffect(() => {
    let result = [...courses];

    // 1. Filtrar por pestaña (Mis Cursos inscritos vs Disponibles para inscripción)
    if (isStudent) {
      if (activeTab === "my-courses") {
        result = result.filter((c) => myEnrollments.includes(c.id));
      } else if (activeTab === "available") {
        result = result.filter((c) => !myEnrollments.includes(c.id));
      }
    }

    // 2. Filtrar por término de búsqueda (Buscador)
    if (searchTerm !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (course) =>
          course.name.toLowerCase().includes(lowerSearch) ||
          course.code.toLowerCase().includes(lowerSearch),
      );
    }

    setFilteredCourses(result);
  }, [searchTerm, courses, myEnrollments, activeTab, isStudent]);

  // Inicialización de datos
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadCourses(), loadMyEnrollments()]);
      setLoading(false);
    };
    init();
  }, [loadCourses, loadMyEnrollments]);

  if (loading) {
    return (
      <div
        style={{
          padding: "6rem",
          textAlign: "center",
          color: "#f59e0b",
          fontSize: "2rem",
          background: "#111",
          minHeight: "100vh",
        }}
      >
        Cargando cursos...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0f14",
        color: "white",
        padding: "4rem 2rem",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        {/* BOTÓN VOLVER + TÍTULO */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent",
              color: "#f59e0b",
              border: "2px solid #f59e0b",
              padding: "0.8rem 1.8rem",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f59e0b";
              e.currentTarget.style.color = "#111";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#f59e0b";
            }}
          >
            ← Volver atrás
          </button>
          <h1
            style={{
              fontSize: "2.5rem",
              color: "#f59e0b",
              margin: "0",
              fontWeight: "800",
            }}
          >
            {isTeacher
              ? "Mis Cursos como Profesor"
              : "Plataforma de Aprendizaje"}
          </h1>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (Solo para estudiantes) */}
        {isStudent && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "2.5rem",
            }}
          >
            <button
              onClick={() => setActiveTab("my-courses")}
              style={{
                padding: "0.9rem 1.8rem",
                background: activeTab === "my-courses" ? "#f59e0b" : "#141923",
                color: activeTab === "my-courses" ? "#0c0f14" : "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              📖 Mis Cursos ({myEnrollments.length})
            </button>
            <button
              onClick={() => setActiveTab("available")}
              style={{
                padding: "0.9rem 1.8rem",
                background: activeTab === "available" ? "#f59e0b" : "#141923",
                color: activeTab === "available" ? "#0c0f14" : "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              🔍 Catálogo / Cursos Disponibles
            </button>
          </div>
        )}

        {/* BUSCADOR ELEGANTE */}
        <div
          style={{
            marginBottom: "3rem",
            maxWidth: "600px",
            marginInline: "auto",
          }}
        >
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Buscar por nombre o código del curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "1.2rem 1.5rem 1.2rem 4rem",
                borderRadius: "50px",
                background: "#141923",
                border: "2px solid #1e293b",
                color: "white",
                fontSize: "1.1rem",
                outline: "none",
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.target.style.borderColor = "#1e293b")}
            />
            <i
              className="fas fa-search"
              style={{
                position: "absolute",
                left: "1.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f59e0b",
                fontSize: "1.3rem",
              }}
            ></i>
          </div>
          {searchTerm && (
            <p
              style={{
                textAlign: "center",
                marginTop: "1rem",
                color: "#94a3b8",
              }}
            >
              {filteredCourses.length} curso
              {filteredCourses.length !== 1 ? "s" : ""} encontrado
              {filteredCourses.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* LISTA DE CURSOS */}
        {filteredCourses.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "5rem 2rem",
              background: "#141923",
              borderRadius: "24px",
              border: "1px solid #1e293b",
            }}
          >
            <i
              className={
                activeTab === "my-courses"
                  ? "fas fa-book-open"
                  : "fas fa-search"
              }
              style={{
                fontSize: "4rem",
                color: "#4b5563",
                marginBottom: "1.5rem",
              }}
            ></i>
            <p style={{ fontSize: "1.4rem", color: "#94a3b8", margin: 0 }}>
              {searchTerm
                ? "No se encontraron cursos con esa búsqueda."
                : isTeacher
                  ? "No tienes cursos asignados como profesor."
                  : activeTab === "my-courses"
                    ? "Aún no estás inscrito en ningún curso. ¡Ve al Catálogo e inscríbete!"
                    : "No hay nuevos cursos disponibles en este momento."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "2.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            }}
          >
            {filteredCourses.map((course) => {
              const isEnrolled = myEnrollments.includes(course.id);
              return (
                <div
                  key={course.id}
                  style={{
                    background: "#141923",
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    border: "1px solid #1e293b",
                    transition: "transform 0.3s ease, border-color 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.borderColor = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "#1e293b";
                  }}
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.name}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "220px",
                        background: "linear-gradient(135deg, #1e293b, #0f172a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f59e0b",
                        fontSize: "3rem",
                        fontWeight: "bold",
                      }}
                    >
                      {course.code}
                    </div>
                  )}

                  <div style={{ padding: "2rem" }}>
                    <h3
                      style={{
                        color: "#f59e0b",
                        fontSize: "1.6rem",
                        margin: "0 0 0.5rem 0",
                        fontWeight: "700",
                      }}
                    >
                      {course.name}
                    </h3>
                    <p
                      style={{
                        color: "#10b981",
                        fontWeight: "bold",
                        margin: "0.5rem 0",
                        fontSize: "0.95rem",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {course.code}
                    </p>
                    <p
                      style={{
                        color: "#94a3b8",
                        lineHeight: "1.6",
                        margin: "1rem 0",
                        fontSize: "0.95rem",
                        height: "80px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {course.description ||
                        "Explora el maravilloso mundo STEAM en esta clase interactiva."}
                    </p>

                    {/* BOTÓN DE ACCIÓN: Redireccionamiento dinámico al Aula Virtual local */}
                    {isStudent &&
                      (isEnrolled ? (
                        <button
                          onClick={() => navigate(`/classroom/${course.id}`)}
                          style={{
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            padding: "1rem 2rem",
                            borderRadius: "14px",
                            fontWeight: "bold",
                            width: "100%",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            transition: "all 0.3s",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          🚀 Ir al Aula Virtual →
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedCourseForModal(course);
                            setShowEnrollModal(true);
                          }}
                          style={{
                            background: "#1e293b",
                            color: "#f59e0b",
                            padding: "1rem 2rem",
                            borderRadius: "14px",
                            fontWeight: "bold",
                            width: "100%",
                            border: "2px solid #f59e0b",
                            cursor: "pointer",
                            fontSize: "1rem",
                            transition: "all 0.3s",
                            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f59e0b";
                            e.currentTarget.style.color = "#0c0f14";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#1e293b";
                            e.currentTarget.style.color = "#f59e0b";
                          }}
                        >
                          🔒 Solicitar Inscripción
                        </button>
                      ))}

                    {isTeacher && (
                      <div
                        style={{
                          color: "#10b981",
                          fontWeight: "bold",
                          textAlign: "center",
                          marginTop: "1rem",
                          background: "rgba(16, 185, 129, 0.1)",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        👨‍🏫 Eres el profesor de este curso
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* MODAL DE INSCRIPCIÓN SEGURA */}
        {showEnrollModal && selectedCourseForModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "#141923",
                border: "2px solid #f59e0b",
                borderRadius: "24px",
                maxWidth: "500px",
                width: "100%",
                padding: "2.5rem",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
                position: "relative",
                textAlign: "center",
                animation: "fadeIn 0.3s ease-out",
              }}
            >
              <span
                style={{
                  fontSize: "4.5rem",
                  display: "block",
                  marginBottom: "1rem",
                }}
              >
                🔒
              </span>
              <h2
                style={{
                  color: "#f59e0b",
                  margin: "0 0 1rem 0",
                  fontSize: "1.8rem",
                  fontWeight: "bold",
                }}
              >
                Inscripción Protegida
              </h2>
              <p
                style={{
                  color: "#cbd5e1",
                  lineHeight: "1.6",
                  fontSize: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                Para garantizar la correcta asignación de cupos y tutoría STEAM,
                las autoinscripciones están desactivadas. El acceso al curso{" "}
                <strong style={{ color: "white" }}>
                  "{selectedCourseForModal.name}"
                </strong>{" "}
                debe ser coordinado por la administración.
              </p>

              <div
                style={{
                  background: "rgba(245, 158, 11, 0.03)",
                  border: "1px dashed rgba(245, 158, 11, 0.25)",
                  borderRadius: "14px",
                  padding: "1rem",
                  marginBottom: "2rem",
                  textAlign: "left",
                }}
              >
                <strong
                  style={{
                    color: "#f59e0b",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  📣 Pasos para iniciar clase:
                </strong>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  Por favor, diligencia nuestro formulario de admisión o
                  comunícate directamente con el{" "}
                  <strong>Administrador de la plataforma</strong> para que
                  habilite formalmente tu matrícula en este curso.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <button
                  onClick={() => {
                    setShowEnrollModal(false);
                    navigate("/Contacto"); // Navega a la vista de contacto
                  }}
                  style={{
                    background: "#f59e0b",
                    color: "#0c0f14",
                    padding: "1rem",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#d97706")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f59e0b")
                  }
                >
                  📝 Diligenciar Formulario de Información
                </button>

                <a
                  href="mailto:contacto@abcdigitalsteam.com?subject=Solicitud de Inscripción - Curso STEAM"
                  style={{
                    background: "transparent",
                    color: "#cbd5e1",
                    border: "1px solid #334155",
                    padding: "1rem",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontSize: "1rem",
                    display: "block",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#f59e0b";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#334155";
                    e.currentTarget.style.color = "#cbd5e1";
                  }}
                >
                  ✉️ Contactar Administrador por Correo
                </a>

                <button
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSelectedCourseForModal(null);
                  }}
                  style={{
                    background: "transparent",
                    color: "#64748b",
                    border: "none",
                    marginTop: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                  }}
                >
                  Volver al Catálogo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
