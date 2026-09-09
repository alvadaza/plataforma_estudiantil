import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext"; // Ajusta esta ruta según tu proyecto
import { useNavigate } from "react-router-dom";

const IdleTimer = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // Estado para controlar la visibilidad de la ventana de advertencia
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  // Límite de inactividad: 5 minutos (5 * 60 * 1000 ms)
  const INACTIVITY_LIMIT = 5 * 60 * 1000;

  // Función para reiniciar el reloj mientras el usuario interactúa
  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Si el modal de inactividad no se está mostrando, programamos el aviso a los 5 min
    timerRef.current = setTimeout(() => {
      setShowInactivityModal(true);
    }, INACTIVITY_LIMIT);
  };

  // Función que se ejecuta cuando el usuario presiona "Aceptar" en la ventana
  const handleConfirmLogout = async () => {
    setShowInactivityModal(false);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión por inactividad:", error);
    }
  };

  useEffect(() => {
    // Si no hay usuario logueado, limpiamos cualquier temporizador
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowInactivityModal(false);
      return;
    }

    // Eventos que representan actividad en la pantalla
    const activityEvents = [
      "mousedown",
      "click",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const handleUserActivity = () => {
      // Solo reiniciamos el reloj si el modal de inactividad aún NO ha aparecido
      if (!showInactivityModal) {
        resetTimer();
      }
    };

    // Inicializamos el temporizador al cargar
    resetTimer();

    // Escuchamos la actividad del usuario
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Limpieza al desmontar
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user, showInactivityModal]);

  return (
    <>
      {children}

      {/* VENTANA EMERGENTE DE ADVERTENCIA POR INACTIVIDAD */}
      {showInactivityModal && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <div style={styles.icon}>🔒</div>
            <h3 style={styles.title}>Sesión Cerrada por Seguridad</h3>
            <p style={styles.message}>
              Detectamos <strong>5 minutos de inactividad</strong> en tu cuenta.
              Por motivos de seguridad y para educar en el uso responsable de la
              plataforma, hemos suspendido tu sesión.
            </p>
            <button style={styles.button} onClick={handleConfirmLogout}>
              Aceptar y Salir
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Estilos oscuros alineados con la estética STEAM
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.85)", // Fondo oscuro semitransparente
    backdropFilter: "blur(8px)", // Desenfoque suave
    zIndex: 999999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "fadeIn 0.3s ease-out",
  },
  card: {
    backgroundColor: "#1e293b",
    border: "1px solid rgba(245, 158, 11, 0.5)", // Borde dorado
    borderRadius: "16px",
    padding: "2.2rem",
    maxWidth: "440px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "0.8rem",
  },
  title: {
    color: "#ffffff",
    fontSize: "1.35rem",
    margin: "0 0 0.8rem 0",
    fontWeight: "bold",
  },
  message: {
    color: "#cbd5e1",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    marginBottom: "1.8rem",
  },
  button: {
    backgroundColor: "#f59e0b", // Dorado STEAM
    color: "#0f172a",
    border: "none",
    padding: "0.85rem 2rem",
    borderRadius: "10px",
    fontWeight: "bold",
    fontSize: "1rem",
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
    transition: "transform 0.2s, background 0.2s",
  },
};

export default IdleTimer;
