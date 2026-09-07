import React, { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext"; // Ajusta esta ruta según tu proyecto
import { useNavigate } from "react-router-dom";

const IdleTimer = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // Definición del límite: 5 minutos en milisegundos (5 min * 60 seg * 1000 ms)
  const INACTIVITY_LIMIT = 5 * 60 * 1000;

  // Función para reiniciar el temporizador cada vez que el usuario interactúe
  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      handleAutomaticLogout();
    }, INACTIVITY_LIMIT);
  };

  // Función que ejecuta el cierre de sesión seguro
  const handleAutomaticLogout = async () => {
    if (user) {
      try {
        await logout();
        navigate("/login");
        alert(
          "Tu sesión ha sido cerrada automáticamente por inactividad (5 minutos) por motivos de seguridad.",
        );
      } catch (err) {
        console.error("Error al cerrar sesión por inactividad:", err);
      }
    }
  };

  useEffect(() => {
    // Si no hay ningún usuario autenticado, no activamos los escuchas de eventos
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Lista de eventos de usuario que consideraremos como "actividad"
    const activityEvents = [
      "mousedown",
      "click",
      "keypress",
      "scroll",
      "touchstart",
    ];

    // Al haber cualquier interacción, reiniciamos el reloj de inactividad
    const handleUserActivity = () => resetTimer();

    // Inicializamos el reloj por primera vez
    resetTimer();

    // Añadimos los escuchas de eventos globales
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Limpieza de eventos al desmontar el componente o al cambiar de usuario
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user]);

  return children;
};

export default IdleTimer;
