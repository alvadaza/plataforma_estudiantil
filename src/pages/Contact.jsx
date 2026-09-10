import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import Header from "../components/Header/Header";
import "./Contact.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Mapeo seguro de variables de plantilla para EmailJS
      const templateParams = {
        name: formData.name,
        from_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        from_email: formData.email,
        message: formData.message,
      };

      // 1. Envío a la bandeja de administración con las credenciales actualizadas
      await emailjs.send(
        "service_lneo1yl", // Service ID
        "template_ebug0s4", // Template ID
        templateParams,
        "hnM9BatTHhdEQZBay", // Public Key
      );

      // OPCIONAL: Si creaste la plantilla de respuesta automática para el usuario,
      // puedes descomentar las siguientes líneas e ingresar su Template ID:

      await emailjs.send(
        "service_lneo1yl",
        "template_uwcwpo9", // 👈 Coloca aquí el ID de la plantilla de auto-respuesta
        templateParams,
        "hnM9BatTHhdEQZBay",
      );

      const successMsg =
        "¡Mensaje enviado exitosamente! Te responderemos pronto. 🚀";
      setMessage(successMsg);
      if (typeof window.showToast === "function") {
        window.showToast(successMsg, "success");
      }
      setTimeout(() => {
        setMessage("");
      }, 10000);

      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      const errorMsg =
        "Error al enviar el mensaje. Por favor intenta de nuevo.";
      setMessage(errorMsg);
      if (typeof window.showToast === "function") {
        window.showToast(errorMsg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <Header />
      <section className="contact-section">
        <div className="contact-grid">
          {/* FORMULARIO DE CONTACTO */}
          <div className="contact-card">
            <h2 className="contact-title">Contáctanos</h2>
            <p className="contact-subtitle">
              Escribe tus datos y cuéntanos qué información necesitas. Te
              respondemos en menos de 24 horas.
            </p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Tu teléfono"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Tu correo electrónico"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <textarea
                name="message"
                placeholder="¿Qué información necesitas?"
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
              />
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Mensaje"}
              </button>
            </form>

            {message && (
              <p
                className={`alert-message ${message.includes("Error") ? "error" : "success"}`}
              >
                {message}
              </p>
            )}
          </div>

          {/* INFORMACIÓN DE CONTACTO Y UBICACIÓN */}
          <div className="info-contact">
            <h2 className="info-contact-title">¿Quiénes Somos?</h2>
            <p className="info-contact-text">
              ABC Digital STEAM es una plataforma educativa innovadora dedicada
              a ofrecer cursos de calidad, recursos gratuitos y una experiencia
              de aprendizaje moderna para estudiantes y profesores.
            </p>
            <div className="contact-info">
              <p>
                <strong>Dirección:</strong> Calle 18 sur 10A-55, Bogotá,
                Colombia
              </p>
              <p>
                <strong>Teléfono:</strong> +57 313 357 4711
              </p>
              <p>
                <strong>Email:</strong> contacto@abcdigitalsteam.com
              </p>
              <p>
                <strong>Horario:</strong> Lunes a Viernes 8:00 AM - 6:00 PM
              </p>
            </div>
            <div className="contact-map">
              <h3>Nuestra Ubicación</h3>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.077894467079!2d-74.0953017255273!3d4.580033742692869!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f98e44c6800e3%3A0x57ccd55b1a426820!2sCl.%2015%20Sur%20%2310-48%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1766102523848!5m2!1ses!2sco"
                width="100%"
                height="300"
                allowFullScreen=""
                loading="lazy"
                title="Ubicación Google Maps ABC Digital STEAM"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
