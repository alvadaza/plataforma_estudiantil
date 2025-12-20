import React from "react";

const NotFound = () => (
  <div
    style={{
      minHeight: "100vh",
      background: "#111",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "4rem 2rem",
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}
  >
    {/* LOGO FUNNEON */}
    <div style={{ marginBottom: "3rem" }}>
      <h1
        style={{
          fontSize: "5rem",
          color: "#f59e0b",
          margin: "0",
          fontWeight: "bold",
          textShadow: "0 4px 15px rgba(245,158,11,0.4)",
        }}
      >
        Fundneon
      </h1>
      <p style={{ fontSize: "1.6rem", color: "#cbd5e1", margin: "0.5rem 0 0" }}>
        Plataforma Educativa
      </p>
    </div>

    {/* ILUSTRACIÓN 404 */}
    <div style={{ marginBottom: "3rem" }}>
      <img
        src="https://res.cloudinary.com/dthi7ietr/image/upload/v1766185367/imagenes%20programas/fundneon_k4lcpm.jpg"
        alt="404 - Página no encontrada"
        style={{
          maxWidth: "500px",
          width: "100%",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      />
    </div>

    {/* TEXTO */}
    <h2 style={{ fontSize: "3.5rem", color: "#f59e0b", margin: "0 0 1rem 0" }}>
      404
    </h2>
    <p style={{ fontSize: "2rem", margin: "1rem 0" }}>
      ¡Ups! Página no encontrada
    </p>
    <p
      style={{
        fontSize: "1.4rem",
        color: "#cbd5e1",
        maxWidth: "600px",
        margin: "1rem auto 3rem auto",
      }}
    >
      La página que buscas no existe o fue movida. Pero no te preocupes, puedes
      volver al inicio y seguir explorando Funeon.
    </p>

    {/* BOTÓN VOLVER */}
    <a
      href="/"
      style={{
        background: "#f59e0b",
        color: "#111",
        padding: "1.2rem 3rem",
        borderRadius: "16px",
        fontWeight: "bold",
        fontSize: "1.4rem",
        textDecoration: "none",
        boxShadow: "0 10px 25px rgba(245,158,11,0.3)",
        transition: "all 0.3s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#ea580c")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#f59e0b")}
    >
      Volver al inicio →
    </a>
  </div>
);

export default NotFound;
