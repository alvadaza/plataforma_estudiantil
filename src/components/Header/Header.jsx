import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" onClick={closeMenu}>
            <h1>FundNeon</h1>
          </Link>
        </div>

        {/* NAV DESKTOP */}
        <nav className="nav desktop-nav">
          <ul>
            <li>
              <Link
                to="/"
                className={location.pathname === "/" ? "active" : ""}
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                to="/convenios"
                className={location.pathname === "/convenios" ? "active" : ""}
              >
                Convenios
              </Link>
            </li>
            <li>
              <Link
                to="/cursos"
                className={location.pathname === "/cursos" ? "active" : ""}
              >
                Cursos
              </Link>
            </li>
            <li>
              <Link
                to="/recursos"
                className={location.pathname === "/recursos" ? "active" : ""}
              >
                Recursos
              </Link>
            </li>
            <li>
              <Link
                to="/contacto"
                className={location.pathname === "/contacto" ? "active" : ""}
              >
                Contacto
              </Link>
            </li>
          </ul>
        </nav>

        {/* BOTÓN HAMBURGUESA */}
        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* NAV MOBILE */}
      <nav className={`mobile-nav ${menuOpen ? "show" : ""}`}>
        <Link to="/" onClick={closeMenu}>
          Inicio
        </Link>
        <Link to="/convenios" onClick={closeMenu}>
          Convenios
        </Link>
        <Link to="/cursos" onClick={closeMenu}>
          Cursos
        </Link>
        <Link to="/recursos" onClick={closeMenu}>
          Recursos
        </Link>
        <Link to="/contacto" onClick={closeMenu}>
          Contacto
        </Link>
      </nav>
    </header>
  );
};

export default Header;
