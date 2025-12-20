import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Hero.css";

const Hero = () => {
  const [blockedMsg, setBlockedMsg] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("blockedLogin");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="hero-content">
          <h1>
            Aprende sin límites <span className="highlight">con Fundamor</span>
          </h1>

          <p className="hero-subtitle">
            La plataforma educativa moderna de la nueva generación.
          </p>

          <div className="hero-buttons">
            <Link to="/cursos" className="btn-primary">
              Explorar cursos
            </Link>
            <Link to="/contacto" className="btn-secondary">
              Únete gratis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
