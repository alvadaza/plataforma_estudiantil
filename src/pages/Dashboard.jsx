import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, profile, loading, logout, isStudent, isTeacher } = useAuth();
  const navigate = useNavigate();

  const [myCourses, setMyCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [redirectingToMoodle, setRedirectingToMoodle] = useState(null);

  useEffect(() => {
    const loadMyCourses = async () => {
      if (!user) {
        setLoadingCourses(false);
        return;
      }

      try {
        let coursesData = [];

        if (isStudent) {
          // ESTUDIANTE: cursos inscritos
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", user.id);

          const courseIds = enrollments?.map((e) => e.course_id) || [];

          if (courseIds.length > 0) {
            const { data } = await supabase
              .from("courses")
              .select(
                "id, name, code, description, moodle_course_id, thumbnail_url"
              )
              .in("id", courseIds);

            coursesData = data || [];
          }
        }

        if (isTeacher) {
          // PROFESOR: cursos donde es teacher_id
          const { data } = await supabase
            .from("courses")
            .select(
              "id, name, code, description, moodle_course_id, thumbnail_url"
            )
            .eq("teacher_id", user.id);

          coursesData = data || [];
        }

        setMyCourses(coursesData);
      } catch (err) {
        console.error("Error cargando cursos:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadMyCourses();
  }, [user, isStudent, isTeacher]);

  /* =========================
     IR AL CURSO EN MOODLE
  ========================= */
  const goToMoodleCourse = async (course) => {
    if (!course.moodle_course_id) {
      alert("Este curso no tiene enlace a Moodle");
      return;
    }

    setRedirectingToMoodle(course.id);

    try {
      const token = await getMoodleSSOToken();

      const moodleUrl = token
        ? `http://localhost/fundneon/local/sso/login.php?token=${encodeURIComponent(
            token
          )}&courseid=${course.moodle_course_id}`
        : `http://localhost/fundneon/course/view.php?id=${course.moodle_course_id}`;

      window.open(moodleUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(
        `http://localhost/fundneon/course/view.php?id=${course.moodle_course_id}`,
        "_blank"
      );
    } finally {
      setRedirectingToMoodle(null);
    }
  };

  const getMoodleSSOToken = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await fetch(
        "https://cbuwcmodyxkfiemhzvai.supabase.co/functions/v1/moodle-sso",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      const result = await response.json();
      return response.ok && result.token ? result.token : null;
    } catch {
      return null;
    }
  };

  if (loading) return <div className="loading-screen">Cargando perfil...</div>;

  if (!user) {
    return (
      <div className="unauthenticated">
        <h1>No estás autenticado</h1>
        <a href="/">Volver al inicio</a>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <h1 className="dashboard-logo">FundNeon</h1>
        <div className="dashboard-user-info">
          <div className="user-greeting">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #f59e0b",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#111",
                    fontWeight: "bold",
                    fontSize: "1.5rem",
                  }}
                >
                  {profile?.full_name?.[0] || user.email[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                  {profile?.full_name || user.email}
                </div>
                <span className="user-role">
                  ({isTeacher ? "Profesor" : "Estudiante"})
                </span>
              </div>
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2 className="dashboard-title">
          Hola, {profile?.full_name?.split(" ")[0] || user.email.split("@")[0]}
        </h2>

        {/* CURSOS DEL USUARIO (estudiante o profesor) */}
        {(isStudent || isTeacher) && (
          <section style={{ marginBottom: "4rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 className="section-title">
                {isTeacher ? "Mis Cursos como Profesor" : "Mis Cursos"}
              </h3>
              {isStudent && (
                <button
                  onClick={() => navigate("/mis-cursos")}
                  style={{
                    background: "transparent",
                    color: "#f59e0b",
                    border: "2px solid #f59e0b",
                    padding: "0.8rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Ver todos los cursos →
                </button>
              )}
            </div>

            {loadingCourses ? (
              <p>Cargando tus cursos...</p>
            ) : myCourses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  background: "#1a1a1a",
                  borderRadius: "16px",
                }}
              >
                <p style={{ fontSize: "1.4rem", color: "#aaa" }}>
                  {isTeacher
                    ? "No tienes cursos asignados como profesor."
                    : "Aún no estás inscrito en ningún curso."}
                </p>
                {isStudent && (
                  <button
                    onClick={() => navigate("/cursos")}
                    style={{
                      background: "#f59e0b",
                      color: "#111",
                      padding: "1rem 2rem",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      marginTop: "1rem",
                    }}
                  >
                    Explorar cursos disponibles
                  </button>
                )}
              </div>
            ) : (
              <div className="cards-grid">
                {myCourses.map((course) => (
                  <div key={course.id} className="card">
                    <h4>{course.name}</h4>
                    <p>
                      <strong>{course.code}</strong>
                    </p>
                    <p>{course.description || "Sin descripción"}</p>

                    <button
                      className="btn-primary"
                      onClick={() => goToMoodleCourse(course)}
                      disabled={redirectingToMoodle === course.id}
                      style={{ marginTop: "1.5rem" }}
                    >
                      {redirectingToMoodle === course.id
                        ? "Abriendo..."
                        : isTeacher
                        ? "Gestionar curso →"
                        : "Ir al curso →"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TARJETAS FIJAS */}
        <div className="cards-grid">
          <div
            className="card clickable-card"
            onClick={() => navigate("/profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-icon">👤</div>
            <h3>Mi Perfil</h3>
          </div>

          <div
            className="card clickable-card"
            onClick={() => navigate("/documentos")}
            style={{ cursor: "pointer" }}
          >
            <div className="card-icon">📄</div>
            <h3>Mis Documentos</h3>
          </div>

          {isTeacher && (
            <div
              className="card clickable-card"
              onClick={() => navigate("/admin")}
              style={{ cursor: "pointer" }}
            >
              <div className="card-icon">⚙️</div>
              <h3>Panel Admin</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
