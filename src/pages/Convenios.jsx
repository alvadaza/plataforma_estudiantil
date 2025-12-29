import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import "./Convenios.css";

const universidades = [
  {
    nombre: "Universidad INCA de Colombia",
    logo: "https://res.cloudinary.com/dthi7ietr/image/upload/v1767028437/Logo-Unincca-Universidad-1-1_unheft.png",
    estado: "activo",
    descripcion:
      "Convenio institucional para programas técnicos, tecnólogos y profesionales.",
  },
  {
    nombre: "Universidad de Barranquilla",
    logo: "https://res.cloudinary.com/dthi7ietr/image/upload/v1767028510/UB_sycco1.png",
    estado: "activo",
    descripcion: "Respaldo académico para programas profesionales.",
  },
  {
    nombre: "Próximamente",
    logo: "https://res.cloudinary.com/dthi7ietr/image/upload/v1767028564/proximamente_z8gpoo.png",
    estado: "proximamente",
    descripcion: "Estamos trabajando en nuevos convenios institucionales.",
  },
];

const Convenios = () => {
  return (
    <>
      <Header />
      <section className="convenios">
        <div className="convenios-header">
          <h1>Universidades con convenio</h1>
          <p>
            Nuestros programas cuentan con respaldo institucional de
            universidades reconocidas.
          </p>
        </div>

        <div className="convenios-grid">
          {universidades.map((u, index) => (
            <div
              key={index}
              className={`convenio-card ${u.estado}`}
              aria-disabled={u.estado !== "activo"}
            >
              <img src={u.logo} alt={u.nombre} loading="lazy" />
              <h3>{u.nombre}</h3>
              <p>{u.descripcion}</p>
              {u.estado === "activo" ? (
                <span className="badge activo">Convenio activo</span>
              ) : (
                <span className="badge proximamente">Próximamente</span>
              )}
            </div>
          ))}
        </div>
        <div className="convenios-cta">
          <p>¿Deseas conocer los programas disponibles con estos convenios?</p>
          <Link to="/contacto" className="btn-primary">
            Hablar con un asesor
          </Link>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Convenios;
