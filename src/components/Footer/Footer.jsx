import React from "react";
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
        <div className="footer-column">
          <h4 className="column-title">
            <i className="fas fa-link icon-title"></i> Enlaces de Interés
          </h4>
          <ul>
            <li>
              <a href="#">
                <i className="fas fa-book icon-item"></i> Cursos activos
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-video icon-item"></i> Grabaciones de clases
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-download icon-item"></i> Recursos
                descargables
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-calendar-alt icon-item"></i> Calendario
                académico
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 2 - Accesos Rápidos */}
        <div className="footer-column">
          <h4 className="column-title">
            <i className="fas fa-rocket icon-title"></i> Accesos Rápidos
          </h4>
          <ul>
            <li>
              <a href="#">
                <i className="fas fa-user icon-item"></i> Mi perfil
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-tasks icon-item"></i> Mis tareas
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-bell icon-item"></i> Notificaciones
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-question-circle icon-item"></i> Ayuda y
                soporte
              </a>
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
              <a href="#">
                <i className="fas fa-comments icon-item"></i> Chat en vivo
              </a>
            </li>
            <li>
              <a href="#">
                <i className="fas fa-server icon-item"></i> Estado del sistema
              </a>
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
            <a href="#" className="social-icon youtube" aria-label="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a
              href="#"
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
