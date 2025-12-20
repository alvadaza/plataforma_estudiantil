import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const MyCourses = () => {
  const { user, isStudent, isTeacher } = useAuth();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadMyCourses = async () => {
      if (isStudent) {
        // ESTUDIANTE: cursos donde está inscrito
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", user.id);

        const courseIds = enrollments?.map((e) => e.course_id) || [];

        if (courseIds.length === 0) {
          setMyCourses([]);
          setLoading(false);
          return;
        }

        const { data: courses } = await supabase
          .from("courses")
          .select("id, name, code, description")
          .in("id", courseIds);

        setMyCourses(courses || []);
      }

      if (isTeacher) {
        // PROFESOR: cursos donde es teacher_id
        const { data: courses } = await supabase
          .from("courses")
          .select("id, name, code, description")
          .eq("teacher_id", user.id);

        setMyCourses(courses || []);
      }

      setLoading(false);
    };

    loadMyCourses();
  }, [user, isStudent, isTeacher]);

  if (loading) {
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "#f59e0b",
          fontSize: "2rem",
        }}
      >
        Cargando tus cursos...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "3.5rem",
          color: "#f59e0b",
          marginBottom: "3rem",
          textAlign: "center",
        }}
      >
        Mis Cursos
      </h1>

      {myCourses.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            background: "#1a1a1a",
            borderRadius: "20px",
          }}
        >
          <p style={{ fontSize: "1.8rem", color: "#aaa" }}>
            {isStudent
              ? "Aún no estás inscrito en ningún curso. Ve a <a href='/cursos' style='color:#f59e0b'>Cursos Disponibles</a>"
              : "No tienes cursos asignados aún."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "2.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          }}
        >
          {myCourses.map((course) => (
            <Link
              to={`/curso/${course.id}`}
              key={course.id}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #1a1a1a, #0f0f0f)",
                  padding: "2.5rem",
                  borderRadius: "24px",
                  border: "2px solid #333",
                  transition: "all 0.3s",
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.transform = "translateY(-10px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <h3
                  style={{
                    color: "#f59e0b",
                    fontSize: "2rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  {course.name}
                </h3>
                <p
                  style={{
                    color: "#4ade80",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                  }}
                >
                  {course.code}
                </p>
                <p
                  style={{
                    color: "#ccc",
                    marginTop: "1rem",
                    lineHeight: "1.6",
                  }}
                >
                  {course.description || "Sin descripción"}
                </p>
                <div style={{ marginTop: "2rem", textAlign: "right" }}>
                  <span
                    style={{
                      color: "#f59e0b",
                      fontSize: "1.2rem",
                      fontWeight: "bold",
                    }}
                  >
                    Ver curso →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
