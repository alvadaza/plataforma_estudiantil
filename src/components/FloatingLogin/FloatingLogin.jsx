import React, { useState } from "react";
import "./FloatingLogin.css";
import AuthModal from "../AuthModal/AuthModal";

const FloatingLogin = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botón flotante con SVG precioso */}
      <div
        className={`floating-login ${isOpen ? "hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="login-text">Iniciar sesión</span>
      </div>

      {/* Modal */}
      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default FloatingLogin;
