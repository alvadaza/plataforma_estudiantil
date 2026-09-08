import React from "react";
import { useAuth } from "../../context/AuthContext"; // Importamos el contexto de autenticación
import "./WompiButton.css"; // Reutilizamos los mismos estilos fluidos de la versión v2

const WompiButton = () => {
  const { user } = useAuth(); // Obtenemos el usuario actual de la plataforma

  // 🔒 Si el usuario ya inició sesión (estudiante, profesor o administrador),
  // ocultamos por completo el botón flotante de Wompi para liberar espacio de pantalla.
  if (user) {
    return null;
  }

  // 🔗 REEMPLAZA ESTE ENLACE CON TU LINK DE PAGO REAL DE WOMPI
  // (Puede ser tu enlace de cobro de Wompi, botón de pago o checkout directo)
  const wompiPaymentUrl = "https://checkout.wompi.co/l/tu_enlace_de_pago_aqui";

  return (
    <a
      href={wompiPaymentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-wompi-button-v2"
      title="Pagar Matrícula o Mensualidad de Forma Segura - Wompi"
    >
      <div className="wompi-icon-container-v2">
        <span className="wompi-pulse-v2"></span>
        <i className="fas fa-credit-card"></i>
      </div>
      <span className="wompi-text-v2">Pago Seguro Wompi</span>
    </a>
  );
};

export default WompiButton;
