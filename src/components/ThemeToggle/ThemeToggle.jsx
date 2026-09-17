import React, { useEffect, useState } from "react";

const ThemeToggle = () => {
  // Leemos el tema guardado en localStorage o usamos 'dark' por defecto
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    // Aplicamos el atributo data-theme al elemento <html>
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title={`Cambiar a ${theme === "dark" ? "Modo Claro" : "Modo Oscuro"}`}
      aria-label="Cambiar tema de color"
      style={{
        background:
          theme === "dark"
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(15, 23, 42, 0.08)",
        border:
          theme === "dark"
            ? "1px solid rgba(255, 255, 255, 0.2)"
            : "1px solid rgba(15, 23, 42, 0.2)",
        color: theme === "dark" ? "#f59e0b" : "#0f172a",
        padding: "0.5rem 0.9rem",
        borderRadius: "20px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontWeight: "bold",
        fontSize: "0.85rem",
        transition: "all 0.3s ease",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
    </button>
  );
};

export default ThemeToggle;
