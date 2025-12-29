import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ← AÑADIDO
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const Courses = () => {
  const { user, isStudent, isTeacher } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // ← NUEVO: buscador
  const [loading, setLoading] = useState(true);

  // Cargar cursos
  const loadCourses = useCallback(async () => {
    try {
      let query = supabase
        .from("courses")
        .select("id, name, code, description, moodle_course_id, thumbnail_url");

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
      window.showToast(
        "No se pudieron cargar los cursos. Verifica tu conexión.",
        "error"
      );
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
      window.showToast("Error al cargar tus inscripciones.", "error");
    }
  }, [isStudent, user?.id]);

  // Inscribirse
  const enroll = async (courseId) => {
    if (!isStudent) return;

    let moodleSuccess = true; // ← Declarar fuera

    try {
      const { error: funeonError } = await supabase
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      if (funeonError) throw funeonError;

      const { data: course } = await supabase
        .from("courses")
        .select("moodle_course_id")
        .eq("id", courseId)
        .single();

      if (course.moodle_course_id) {
        const { data: config } = await supabase
          .from("moodle_config")
          .select("token")
          .single();

        const moodleResponse = await fetch(
          "/moodle-api/webservice/rest/server.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              wstoken: config.token,
              wsfunction: "enrol_manual_enrol_users",
              moodlewsrestformat: "json",
              "enrolments[0][roleid]": "5",
              "enrolments[0][userid]": user.id,
              "enrolments[0][courseid]": course.moodle_course_id,
            }),
          }
        );

        const moodleResult = await moodleResponse.json();

        if (moodleResult.exception) {
          moodleSuccess = false; // ← Aquí se marca como falso
        }
      }

      setMyEnrollments([...myEnrollments, courseId]);

      // ← TOASTS CORRECTOS
      if (moodleSuccess) {
        window.showToast("¡Inscrito con éxito en Funeon y Moodle!", "success");
      } else {
        window.showToast(
          "Inscrito en Funeon, pero hubo un problema con Moodle.",
          "warning"
        );
      }
    } catch (err) {
      console.error("Error al inscribirse:", err);
      window.showToast("Error al inscribirse: " + err.message, "error");
    }
  };
  // FILTRAR CURSOS EN TIEMPO REAL
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredCourses(courses);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = courses.filter(
        (course) =>
          course.name.toLowerCase().includes(lowerSearch) ||
          course.code.toLowerCase().includes(lowerSearch)
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadCourses(), loadMyEnrollments()]);
      setLoading(false);
    };
    init();
  }, [loadCourses, loadMyEnrollments]);
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
        background: "#111",
        color: "white",
        padding: "4rem 2rem",
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
            }}
          >
            ← Volver atrás
          </button>

          <h1 style={{ fontSize: "3rem", color: "#f59e0b", margin: "0" }}>
            {isTeacher ? "Mis Cursos como Profesor" : "Cursos Disponibles"}
          </h1>
        </div>

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
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "1.2rem 1.5rem 1.2rem 4rem",
                borderRadius: "50px",
                background: "#222",
                border: "2px solid #444",
                color: "white",
                fontSize: "1.2rem",
                outline: "none",
                transition: "all 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.target.style.borderColor = "#444")}
            />
            <i
              className="fas fa-search"
              style={{
                position: "absolute",
                left: "1.5rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f59e0b",
                fontSize: "1.4rem",
              }}
            ></i>
          </div>
          {searchTerm && (
            <p
              style={{ textAlign: "center", marginTop: "1rem", color: "#aaa" }}
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
              padding: "4rem",
              background: "#1a1a1a",
              borderRadius: "20px",
            }}
          >
            <p style={{ fontSize: "1.8rem", color: "#aaa" }}>
              {searchTerm
                ? "No se encontraron cursos con esa búsqueda."
                : isTeacher
                ? "No tienes cursos asignados."
                : "No hay cursos disponibles en este momento."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "3rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            }}
          >
            {filteredCourses.map((course) => {
              const isEnrolled = myEnrollments.includes(course.id);

              return (
                <div
                  key={course.id}
                  style={{
                    background: "#1a1a1a",
                    borderRadius: "20px",
                    overflow: "hidden",
                    boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                    transition: "transform 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-10px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
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
                        background: "linear-gradient(135deg, #333, #555)",
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
                        fontSize: "1.8rem",
                        margin: "0 0 0.5rem 0",
                      }}
                    >
                      {course.name}
                    </h3>
                    <p
                      style={{
                        color: "#4ade80",
                        fontWeight: "bold",
                        margin: "0.5rem 0",
                      }}
                    >
                      {course.code}
                    </p>
                    <p
                      style={{
                        color: "#cbd5e1",
                        lineHeight: "1.6",
                        margin: "1rem 0",
                      }}
                    >
                      {course.description || "Sin descripción disponible."}
                    </p>

                    {isStudent &&
                      (isEnrolled ? (
                        <button
                          onClick={() =>
                            window.open(
                              `${
                                import.meta.env.VITE_MOODLE_URL
                              }/course/view.php?id=${course.moodle_course_id}`,
                              "_blank"
                            )
                          }
                          style={{
                            background: "#166534",
                            color: "white",
                            padding: "1rem 2rem",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            width: "100%",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Ir al curso →
                        </button>
                      ) : (
                        <button
                          onClick={() => enroll(course.id)}
                          style={{
                            background: "#f59e0b",
                            color: "#111",
                            padding: "1rem 2rem",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            width: "100%",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Inscribirme ahora
                        </button>
                      ))}

                    {isTeacher && (
                      <div
                        style={{
                          color: "#4ade80",
                          fontWeight: "bold",
                          textAlign: "center",
                          marginTop: "1rem",
                        }}
                      >
                        Eres el profesor de este curso
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
