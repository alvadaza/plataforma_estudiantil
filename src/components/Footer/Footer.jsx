import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer-uniandes">
      <div className="footer-grid">
        {/* Logo + descripción */}
        <div className="footer-logo-section">
          <h2 className="footer-logo-text">ABC Digital STEAM</h2>
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
              <a href="mailto:soporte@ABCdigitalSTEAM.edu.co">
                <i className="fas fa-envelope icon-item"></i>{" "}
                abcdigitalsteam@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+573101234567">
                <i className="fas fa-phone icon-item"></i> +57 310 123 4567
              </a>
            </li>
            <li>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault(); // Evita que cambie la ruta o recargue la página
                  const chatbotBtn = document.getElementById(
                    "chatbot-trigger-btn",
                  );
                  if (chatbotBtn) {
                    chatbotBtn.click(); // Abre el chatbox simulando el clic en el botón de Álvaro
                  }
                }}
              >
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
          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} ABC Digital STEAM. Todos los derechos
              reservados.
              <span style={{ margin: "0 8px" }}>|</span>
              Creado por <strong>Alvaro Daza</strong> -{" "}
              <a
                href="https://protechsolucionesplus.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#f59e0b",
                  textDecoration: "underline",
                  fontWeight: "bold",
                }}
              >
                protechsolucionesplus.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
