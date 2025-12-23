import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Hero.css";
import heroImg from "https://res.cloudinary.com/dthi7ietr/image/upload/v1766526456/imagenes%20programas/hero-edu_djzgtq.png"; // imagen educativa

const Hero = () => {
  const [blockedMsg, setBlockedMsg] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("blockedLogin");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      setBlockedMsg(data.message);
    } catch (e) {
      console.error("Error leyendo blockedLogin", e);
    }
  }, []);

  const closeMessage = () => {
    setBlockedMsg(null);
    localStorage.removeItem("blockedLogin");
  };

  return (
    <section className="hero">
      {blockedMsg && (
        <div className="container-alert">
          {blockedMsg}
          <button onClick={closeMessage} className="alert-login">
            ×
          </button>
        </div>
      )}

      <div className="hero-container">
        {/* TEXTO */}
        <div className="hero-content">
          <h1>
            Aprende sin límites <br />
            <span className="highlight">La Pizarra Digital</span>
          </h1>

          <p className="hero-subtitle">
            Formación virtual, moderna y certificada para impulsar tu futuro
            académico y profesional.
          </p>

          <div className="hero-buttons">
            <Link to="/cursos" className="btn-primary">
              Explorar cursos
            </Link>
            <Link to="/contacto" className="btn-secondary">
              Únete gratis
            </Link>
          </div>

          {/* EXTRA VISUAL */}
          <div className="hero-stats">
            <div>
              <strong>+10.000</strong>
              <span>Estudiantes</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Virtual</span>
            </div>
            <div>
              <strong>Certificado</strong>
              <span>Validez institucional</span>
            </div>
          </div>
        </div>

        {/* IMAGEN */}
        <div className="hero-image">
          <div className="blob"></div>
          <img src={heroImg} alt="Educación virtual" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
