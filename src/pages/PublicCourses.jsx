import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header/Header";

const PublicCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, description, thumbnail_url")
        .order("name");

      if (error) {
        console.error("Error cargando cursos:", error);
      } else {
        setCourses(data || []);
      }
      setLoading(false);
    };

    loadCourses();
  }, []);

  return (
    <>
      <Header />

      <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
        <div style={{ padding: "4rem 2rem" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h1
              style={{
                color: "#f59e0b",
                fontSize: "3.5rem",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              Cursos Disponibles
            </h1>
            <p
              style={{
                textAlign: "center",
                fontSize: "1.4rem",
                color: "#cbd5e1",
                marginBottom: "4rem",
                maxWidth: "800px",
                marginInline: "auto",
              }}
            >
              Explora nuestra oferta académica. Regístrate para inscribirte y
              comenzar a aprender hoy.
            </p>

            {loading ? (
              <p style={{ textAlign: "center", fontSize: "1.4rem" }}>
                Cargando cursos...
              </p>
            ) : courses.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#aaa",
                  fontSize: "1.4rem",
                }}
              >
                No hay cursos disponibles en este momento.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "3rem",
                  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                }}
              >
                {courses.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      height: "320px",
                      borderRadius: "24px",
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                      transition: "transform 0.4s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-15px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    {/* IMAGEN DE FONDO */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundImage: course.thumbnail_url
                          ? `url(${course.thumbnail_url})`
                          : "linear-gradient(135deg, #333, #555)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "absolute",
                        top: 0,
                        left: 0,
                      }}
                    />

                    {/* OVERLAY OSCURO PARA LEGIBILIDAD */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)",
                      }}
                    />

                    {/* CONTENIDO ENCIMA */}
                    <div
                      style={{
                        position: "relative",
                        padding: "2rem",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                      }}
                    >
                      <h3
                        style={{
                          color: "#f59e0b",
                          fontSize: "2rem",
                          margin: "0 0 0.5rem 0",
                          textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        {course.name}
                      </h3>
                      <p
                        style={{
                          color: "#4ade80",
                          fontWeight: "bold",
                          fontSize: "1.2rem",
                          margin: "0 0 1rem 0",
                          textShadow: "1px 1px 6px rgba(0,0,0,0.8)",
                        }}
                      >
                        {course.code}
                      </p>
                      <p
                        style={{
                          color: "#fff",
                          lineHeight: "1.6",
                          marginBottom: "2rem",
                          textShadow: "1px 1px 6px rgba(0,0,0,0.8)",
                        }}
                      >
                        {course.description || "Sin descripción disponible."}
                      </p>

                      <Link
                        to="/contacto"
                        style={{
                          background: "#f59e0b",
                          color: "#111",
                          padding: "1rem 2rem",
                          borderRadius: "12px",
                          fontWeight: "bold",
                          textDecoration: "none",
                          margin: "auto",
                          textAlign: "center",
                          alignSelf: "flex-start",
                          boxShadow: "0 8px 20px rgba(245,158,11,0.4)",
                          transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#ea580c")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#f59e0b")
                        }
                      >
                        Solicitar información
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicCourses;
