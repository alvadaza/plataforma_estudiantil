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
      await emailjs.send(
        "service_qwz64n4", // ← pega tu Service ID
        "template_4hzet1c", // ← pega tu Template ID
        {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          message: formData.message,
        },
        "B1NiTgKHgpPmn7CWU" // ← pega tu Public Key
      );

      setMessage("¡Mensaje enviado exitosamente! Te responderemos pronto.");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      setMessage("Error al enviar el mensaje. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <Header />

      <section className="contact-section">
        <div className="contact-grid">
          {/* FORMULARIO */}
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

            {message && <p className=".alert-message">{message}</p>}
          </div>

          {/* INFO QUIÉNES SOMOS */}
          <div className="info-contact">
            <h2 className="info-contact-title">¿Quiénes Somos?</h2>
            <p className="info-contact-text">
              Funeon es una plataforma educativa innovadora dedicada a ofrecer
              cursos de calidad, recursos gratuitos y una experiencia de
              aprendizaje moderna para estudiantes y profesores.
            </p>

            <div className="contact-info">
              <p>
                <strong>📍 Dirección:</strong> Calle 18 sur 10A-55, Bogotá,
                Colombia
              </p>
              <p>
                <strong>📞 Teléfono:</strong> +57 313 357 4711
              </p>
              <p>
                <strong>✉️ Email:</strong> contacto@funeon.edu.co
              </p>
              <p>
                <strong>🕐 Horario:</strong> Lunes a Viernes 8:00 AM - 6:00 PM
              </p>
            </div>

            <div className="contact-map ">
              <h3>Nuestra Ubicación</h3>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.077894467079!2d-74.0953017255273!3d4.580033742692869!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f98e44c6800e3%3A0x57ccd55b1a426820!2sCl.%2015%20Sur%20%2310-48%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1766102523848!5m2!1ses!2sco"
                width="100%"
                height="300"
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
