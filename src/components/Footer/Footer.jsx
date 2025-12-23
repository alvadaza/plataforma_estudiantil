import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer-uniandes">
      <div className="footer-grid">
        {/* Logo + descripción */}
        <div className="footer-logo-section">
          <h2 className="footer-logo-text">FundNeon</h2>
          <p className="footer-description">
            Plataforma educativa moderna para estudiantes y profesores.
          </p>
        </div>

        {/* Columna 1 - Enlaces de Interés */}
        <div className="footer-column  ">
          <h4 className="column-title">
            <i className="fas fa-link icon-title"></i> Enlaces de Interés
          </h4>
          <ul className="quick-access-list">
            <li>
              <Link to="/cursos">
                <i className="fas fa-book icon-item"></i> Cursos activos
              </Link>
            </li>
            <li>
              <Link to="/recursos">
                <i className="fas fa-video icon-item"></i> Grabaciones de clases
              </Link>
            </li>
            <li>
              <Link to="/recursos">
                <i className="fas fa-download icon-item"></i> Recursos
                descargables
              </Link>
            </li>
            <li>
              <Link to="/calendario-academico">
                <i className="fas fa-calendar-alt icon-item"></i>
                Calendario académico
              </Link>
            </li>
          </ul>
        </div>

        {/* Columna 2 - Accesos Rápidos */}
        <div className="footer-column ">
          <h4 className="column-title">
            <i className="fas fa-rocket icon-title"></i> Accesos Rápidos
          </h4>
          <ul>
            <li>
              <Link to="/perfil">
                <i className="fas fa-user icon-item"></i> Mi perfil
              </Link>
            </li>
            <li>
              <Link to="/perfil">
                <i className="fas fa-tasks icon-item"></i> Mis tareas
              </Link>
            </li>
            <li>
              <Link to="/contacto">
                <i className="fas fa-bell icon-item"></i> Notificaciones
              </Link>
            </li>
            <li>
              <Link to="/contacto">
                <i className="fas fa-question-circle icon-item"></i> Ayuda y
                soporte
              </Link>
            </li>
          </ul>
        </div>

        {/* Columna 3 - Canales de Atención */}
        <div className="footer-column">
          <h4 className="column-title">
            <i className="fas fa-headset icon-title"></i> Canales de Atención
          </h4>
          <ul>
            <li>
              <a href="mailto:soporte@fundneon.edu.co">
                <i className="fas fa-envelope icon-item"></i>{" "}
                soporte@fundneon.edu.co
              </a>
            </li>
            <li>
              <a href="tel:+573101234567">
                <i className="fas fa-phone icon-item"></i> +57 310 123 4567
              </a>
            </li>
            <li>
              <Link to="/ChatBot">
                <i className="fas fa-comments icon-item"></i> Chat en vivo
              </Link>
            </li>
            <li>
              <Link to="/contacto">
                <i className="fas fa-server icon-item"></i> Estado del sistema
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Parte inferior */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-content">
          <p className="copyright">
            © 2025 Fundneon – Plataforma educativa. Todos los derechos
            reservados.
          </p>
          <div className="social-mini">
            <a
              href="https://www.youtube.com/@fundneon"
              className="social-icon youtube"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-youtube"></i>
            </a>
            <a
              href="https://www.youtube.com/@fundneon"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon instagram"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
