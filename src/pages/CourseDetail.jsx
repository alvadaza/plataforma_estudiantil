import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const CourseDetail = () => {
  const { id } = useParams();
  const { user, profile, logout } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, description, moodle_course_id, thumbnail_url")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error:", error);
      } else {
        setCourse(data);
      }
      setLoading(false);
    };

    loadCourse();
  }, [id]);

  // FUNCIÓN PARA LOGIN AUTOMÁTICO EN MOODLE
  const enterCourse = async () => {
    setLoggingIn(true);

    try {
      // 1. Obtener session actual de Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Debes iniciar sesión en Funeon");
        setLoggingIn(false);
        return;
      }

      // 2. Llamar al endpoint SSO (tu Deno deploy)
      const ssoResponse = await fetch("TU_URL_DENO_DEPLOY", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ssoResponse.ok) {
        throw new Error("Error al obtener token SSO");
      }

      const { token } = await ssoResponse.json();

      // 3. Redirigir a Moodle con token y courseid
      const moodleLoginUrl = `http://localhost/fundneon/local/sso/login.php?token=${token}&courseid=${
        course.moodle_course_id || 2
      }`;
      window.location.href = moodleLoginUrl;
    } catch (err) {
      console.error(err);
      alert("Error al conectar con Moodle: " + err.message);
      setLoggingIn(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Cargando curso...</div>;
  }

  if (!course) {
    return <div className="unauthenticated">Curso no encontrado</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
      <header className="dashboard-header">
        <h1 className="dashboard-logo">Funeon</h1>
        <div className="dashboard-user-info">
          <div className="user-greeting">
            {profile?.full_name || user?.email}
          </div>
          <button onClick={logout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={{ paddingTop: "100px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
          <h1 style={{ color: "#f59e0b", fontSize: "3rem" }}>{course.name}</h1>
          <p style={{ fontSize: "1.5rem", color: "#aaa" }}>{course.code}</p>
          <p style={{ margin: "2rem 0" }}>{course.description}</p>

          {/* BOTÓN PARA LOGIN AUTOMÁTICO EN MOODLE */}
          <button
            onClick={enterCourse}
            disabled={loggingIn}
            style={{
              background: "#f59e0b",
              color: "#111",
              padding: "1.2rem 3rem",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "1.4rem",
              cursor: loggingIn ? "not-allowed" : "pointer",
              margin: "2rem 0",
              border: "none",
            }}
          >
            {loggingIn ? "Conectando a Moodle..." : "Entrar al curso en Moodle"}
          </button>

          {/* IFRAME DE RESPALDO (opcional) */}
          <div
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <iframe
              src={`http://localhost/fundneon/course/view.php?id=${
                course.moodle_course_id || 2
              }`}
              width="100%"
              height="900px"
              style={{ border: "none" }}
              title="Curso en Moodle"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
