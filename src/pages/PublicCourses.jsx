import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header/Header";
import "./PublicCourses.css";

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

      <div className="courses-page">
        <div className=".courses-wrapper">
          <div className="courses-container">
            <h1 className="courses-title">Cursos Disponibles</h1>
            <p className="courses-description">
              Explora nuestra oferta académica. Regístrate para inscribirte y
              comenzar a aprender hoy.
            </p>

            {loading ? (
              <p className="loading">Cargando cursos...</p>
            ) : courses.length === 0 ? (
              <p className="loading">
                No hay cursos disponibles en este momento.
              </p>
            ) : (
              <div className="courses-grid">
                {courses.map((course) => (
                  <div
                    className="course-card"
                    key={course.id}
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
                    <div className="course-overlay" />

                    {/* CONTENIDO ENCIMA */}
                    <div className="course-content">
                      <h3 className="course-title ">{course.name}</h3>
                      <p className="course-code">{course.code}</p>
                      <p className="course-description">
                        {course.description || "Sin descripción disponible."}
                      </p>

                      <Link
                        className="course-button"
                        to="/contacto"
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
