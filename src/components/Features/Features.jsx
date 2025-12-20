import React from "react";
import "./Features.css";

const Features = () => {
  return (
    <section className="features">
      <div className="features-container">
        <h2 className="section-title">
          Todo lo que necesitas
          <span className="highlight"> en un solo lugar</span>
        </h2>
        <p className="section-subtitle">
          Olvídate de mil plataformas. Funeon lo tiene todo.
        </p>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3>Materiales siempre actualizados</h3>
            <p>
              PDFs, presentaciones y lecturas directamente subidas por tus
              profesores.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <polyline points="8 12 11 15 16 10" />
              </svg>
            </div>
            <h3>Entrega de tareas sin complicaciones</h3>
            <p>Sube archivos, recibe feedback y calificaciones al instante.</p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </div>
            <h3>Grabaciones de Zoom disponibles</h3>
            <p>
              Revisa cualquier clase cuando quieras, sin depender de links
              externos.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 12l4-4m-4 4l-4-4m4 4v6" />
              </svg>
            </div>
            <h3>Seguro y privado</h3>
            <p>
              Tus datos y archivos están protegidos con cifrado de grado
              empresarial.
            </p>
          </div>

          {/* Card 5 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>Roles claros</h3>
            <p>Estudiantes y profesores con permisos exactos. Nada de caos.</p>
          </div>

          {/* Card 6 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>Escalable desde el día 1</h3>
            <p>Funciona perfecto con 10 o 10.000 estudiantes.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
