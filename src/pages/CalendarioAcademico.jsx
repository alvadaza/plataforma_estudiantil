import React from "react";
import "./CalendarioAcademico.css";
import Header from "../components/Header/Header";

const CalendarioAcademico = () => {
  return (
    <>
      <Header />
      <section className="calendar-page">
        <div className="container">
          <h1>Calendario Académico 2026</h1>
          <p>
            Consulta las fechas importantes de inscripciones, clases,
            evaluaciones y certificaciones.
          </p>

          <ul className="calendar-list">
            <li>
              <strong>📌 Inscripciones</strong>
              <span>15 enero – 10 febrero</span>
              <span className="calendar-badge">Abiertas</span>
            </li>
            <li>
              <strong>📚 Inicio de clases:</strong> 17 febrero
            </li>
            <li>
              <strong>📝 Evaluaciones:</strong> 20 – 30 abril
            </li>
            <li>
              <strong>🎓 Certificaciones:</strong> 15 julio
            </li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default CalendarioAcademico;
