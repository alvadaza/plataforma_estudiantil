import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header/Header";

const Resources = () => {
  const resources = [
    {
      title: "Guía de Programación Web desde Cero",
      description:
        "PDF completo con HTML, CSS y JavaScript para principiantes.",
      type: "PDF",
      link: "https://example.com/guia-web.pdf", // cambia por tu link real o Cloudinary
      icon: "📘",
    },
    {
      title: "Plantillas de Proyectos React",
      description: "Código fuente listo para usar en tus proyectos.",
      type: "GitHub",
      link: "https://github.com/tu-usuario/funeon-templates",
      icon: "💻",
    },
    {
      title: "Videos Tutoriales Gratuitos",
      description: "Playlist de YouTube con clases introductorias.",
      type: "Video",
      link: "https://youtube.com/playlist?list=tu-playlist",
      icon: "🎥",
    },
    {
      title: "Cheat Sheet de CSS Flexbox y Grid",
      description: "Referencia rápida en PDF para layouts modernos.",
      type: "PDF",
      link: "https://example.com/css-cheatsheet.pdf",
      icon: "🎨",
    },
    {
      title: "Curso Introductorio a Python",
      description: "Material gratuito para aprender Python desde cero.",
      type: "PDF",
      link: "https://example.com/python-intro.pdf",
      icon: "🐍",
    },
    {
      title: "Recursos de Diseño UI/UX",
      description: "Paletas de colores, iconos y herramientas gratuitas.",
      type: "Web",
      link: "https://example.com/ui-resources",
      icon: "✨",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
      <Header />

      <div style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* TÍTULO PRINCIPAL */}
          <h1
            style={{
              color: "#f59e0b",
              fontSize: "4rem",
              textAlign: "center",
              marginBottom: "2rem",
              fontWeight: "bold",
            }}
          >
            Recursos Gratuitos
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "1.6rem",
              color: "#cbd5e1",
              marginBottom: "5rem",
              maxWidth: "800px",
              marginInline: "auto",
            }}
          >
            Material de apoyo gratuito para tu aprendizaje. Descarga, comparte y
            aprende sin costo.
          </p>

          {/* GRID DE RECURSOS */}
          <div
            style={{
              display: "grid",
              gap: "3rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            }}
          >
            {resources.map((resource, index) => (
              <div
                key={index}
                style={{
                  background: "#1e293b",
                  borderRadius: "20px",
                  padding: "1rem",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-10px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                {/* ICONO GRANDE */}
                <div
                  style={{
                    fontSize: "5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {resource.icon}
                </div>

                {/* TÍTULO */}
                <h3
                  style={{
                    color: "#f59e0b",
                    fontSize: "1.8rem",
                    marginBottom: "1rem",
                  }}
                >
                  {resource.title}
                </h3>

                {/* TIPO */}
                <span
                  style={{
                    display: "inline-block",
                    background: "#334155",
                    color: "#94a3b8",
                    padding: "0.5rem 1rem",
                    borderRadius: "20px",
                    fontSize: "0.9rem",
                    marginBottom: "1rem",
                  }}
                >
                  {resource.type}
                </span>

                {/* DESCRIPCIÓN */}
                <p
                  style={{
                    color: "#cbd5e1",
                    lineHeight: "1.6",
                    marginBottom: "2rem",
                  }}
                >
                  {resource.description}
                </p>

                {/* BOTÓN */}
                <a
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#f59e0b",
                    color: "#111",
                    padding: "1rem 2.5rem",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    display: "inline-block",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#ea580c")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f59e0b")
                  }
                >
                  Acceder al recurso →
                </a>
              </div>
            ))}
          </div>

          {/* CTA FINAL */}
          <div style={{ textAlign: "center", marginTop: "6rem" }}>
            <p
              style={{
                fontSize: "1.4rem",
                color: "#cbd5e1",
                marginBottom: "2rem",
              }}
            >
              ¿Quieres acceso a más recursos exclusivos y cursos completos?
            </p>
            <Link
              to="/contacto"
              style={{
                background: "#f59e0b",
                color: "#111",
                padding: "1.2rem 3rem",
                borderRadius: "12px",
                fontWeight: "bold",
                fontSize: "1.4rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Quiero más Información
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
