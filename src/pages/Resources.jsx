import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header/Header";
import "./Resources.css";

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
    <>
      <Header />
      <section className="resources-section">
        <div className="resources-container">
          <h1 className="resources-title">Recursos Gratuitos</h1>
          <p className="resources-description">
            Material de apoyo gratuito para tu aprendizaje. Descarga, comparte y
            aprende sin costo.
          </p>

          <div className="resources-grid">
            {resources.map((resource, index) => (
              <div key={index} className="resources-card">
                <div className="resources-icon">{resource.icon}</div>
                <h3 className="resources-card-title">{resource.title}</h3>
                <span className="resources-type">{resource.type}</span>
                <p className="resources-card-description">
                  {resource.description}
                </p>
                <a
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button"
                >
                  Acceder al recurso →
                </a>
              </div>
            ))}
          </div>

          <div className="resources-cta">
            <p className="resources-cta-text">
              ¿Quieres acceso a más recursos exclusivos y cursos completos?
            </p>
            <Link to="/contacto" className="resources-cta-button">
              Quiero más Información
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Resources;
