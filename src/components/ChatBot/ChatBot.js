import { useAuth } from "../../context/AuthContext"; // ← Importamos el contexto
import { useEffect, useRef } from "react";

const ChatBot = () => {
  const { user } = useAuth(); // ← Detectamos si está logueado
  const buttonRef = useRef(null); // ← Referencia al botón
  const containerRef = useRef(null); // ← Referencia al contenedor

  useEffect(() => {
    // === SI ESTÁ LOGUEADO → NO MOSTRAR CHATBOT ===
    if (user) {
      if (buttonRef.current) {
        buttonRef.current.remove();
        buttonRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
      return;
    }

    // === SI NO ESTÁ LOGUEADO → CREAR CHATBOT (solo si no existe) ===
    if (buttonRef.current) return; // Ya existe, no crear de nuevo
    // === CONFIGURACIÓN ===
    const config = {
      botName: "Álvaro",
      whatsappNumber: "+573142120201",
      greeting:
        "¡Hola! 😊 Soy Álvaro, tu asistente virtual de FundNeon. ¿Me regalas tu nombre para atenderte mejor?",
      responses: {
        nombre: (userName) =>
          `¡Encantado, ${userName}! 😄 ¿En qué te puedo ayudar hoy? Puedes preguntarme sobre cursos, costos, certificados, recursos o cualquier duda.`,

        hola: "¡Hola de nuevo! 😊 ¿En qué te ayudo hoy?",
        costo:
          "¡Buena pregunta! 🎓 Tenemos **recursos y cursos gratuitos** para que empieces sin costo. También ofrecemos cursos pagos con precios accesibles según el nivel (técnico, tecnológico o profesional). Para información detallada de precios o planes de pago, puedo conectarte con un asesor. ¿Te gustaría?",
        costos:
          "¡Buena pregunta! 🎓 Tenemos **recursos y cursos gratuitos** para que empieces sin costo. También ofrecemos cursos pagos con precios accesibles según el nivel (técnico, tecnológico o profesional). Para información detallada de precios o planes de pago, puedo conectarte con un asesor. ¿Te gustaría?",
        precio:
          "¡Buena pregunta! 🎓 Tenemos **recursos y cursos gratuitos** para que empieces sin costo. También ofrecemos cursos pagos con precios accesibles según el nivel (técnico, tecnológico o profesional). Para información detallada de precios o planes de pago, puedo conectarte con un asesor. ¿Te gustaría?",
        precios:
          "¡Buena pregunta! 🎓 Tenemos **recursos y cursos gratuitos** para que empieces sin costo. También ofrecemos cursos pagos con precios accesibles según el nivel (técnico, tecnológico o profesional). Para información detallada de precios o planes de pago, puedo conectarte con un asesor. ¿Te gustaría?",

        certificado:
          "¡Sí! Todos nuestros cursos son **certificados** y cuentan con respaldo institucional. 😊 Tenemos convenios con:\n• Fundación Universitaria San José\n• ESIS\n• Universidad de Barranquilla\n\nAdemás, ofrecemos **validación de bachillerato** certificada por instituciones públicas, y programas **técnicos, tecnólogos y profesionales** debidamente acreditados. ¿Te interesa algún programa en particular?",
        certificados:
          "¡Sí! Todos nuestros cursos son **certificados** y cuentan con respaldo institucional. 😊 Tenemos convenios con:\n• Fundación Universitaria San José\n• ESIS\n• Universidad de Barranquilla\n\nAdemás, ofrecemos **validación de bachillerato** certificada por instituciones públicas, y programas **técnicos, tecnólogos y profesionales** debidamente acreditados. ¿Te interesa algún programa en particular?",

        clases:
          "Las clases son **100% virtuales** y se dictan en vivo a través de plataformas como **Zoom** y nuestra propia plataforma educativa. 😊 Tendrás acceso a grabaciones, material de apoyo y acompañamiento constante. ¿Quieres saber sobre horarios o un curso específico?",
        virtual:
          "Las clases son **100% virtuales** y se dictan en vivo a través de plataformas como **Zoom** y nuestra propia plataforma educativa. 😊 Tendrás acceso a grabaciones, material de apoyo y acompañamiento constante. ¿Quieres saber sobre horarios o un curso específico?",
        zoom: "Las clases son **100% virtuales** y se dictan en vivo a través de plataformas como **Zoom** y nuestra propia plataforma educativa. 😊 Tendrás acceso a grabaciones, material de apoyo y acompañamiento constante. ¿Quieres saber sobre horarios o un curso específico?",

        cursos:
          "¡Genial! En FundNeon tenemos programas desde validación de bachillerato hasta profesionales, todos certificados y virtuales. 😄 Puedes explorar todos los cursos disponibles en nuestra página /cursos. ¿Te interesa algún área específica (tecnología, administración, salud, etc.)?",
        recursos:
          "¡Claro! Tenemos muchos **recursos gratuitos** como guías, plantillas y videos en /recursos. 😊 ¿Qué tipo de material estás buscando?",

        asesor:
          "¡Perfecto! Te estoy conectando con un asesor humano para darte atención personalizada. Puedes seguir navegando mientras te responden por WhatsApp. ¡Gracias por confiar en FundNeon! 🌟",

        default:
          "Disculpa, no entendí bien tu mensaje 😅 ¿Puedes repetirlo o decirme en qué te puedo ayudar? (ej. cursos, costos, certificados, clases)",
      },
      maxAttempts: 4,
    };

    let attempts = 0;
    let userName = null;

    // === CREAR BOTÓN FLOTANTE (solo si no existe) ===
    if (document.getElementById("chatbot-button")) return;

    const button = document.createElement("button");
    button.id = "chatbot-button";
    button.innerHTML = "💬";
    button.title = "Chatea con Álvaro";
    document.body.appendChild(button);
    buttonRef.current = button;

    // === ABRIR CHAT ===
    const openChat = () => {
      if (document.getElementById("chatbot-container")) return;

      const container = document.createElement("div");
      container.id = "chatbot-container";
      container.innerHTML = `
        <div class="chatbot-header">
          <span>${config.botName}</span>
          <button id="chatbot-close">×</button>
        </div>
        <div class="chatbot-messages" id="chatbot-messages">
          <div class="chatbot-message bot">${config.greeting}</div>
        </div>
        <div class="chatbot-input">
          <input type="text" id="chatbot-user-input" placeholder="Escribe tu mensaje..." autocomplete="off" />
          <button id="chatbot-send">➤</button>
        </div>
      `;
      document.body.appendChild(container);

      // Eventos
      document.getElementById("chatbot-close").onclick = () =>
        container.remove();
      const sendBtn = document.getElementById("chatbot-send");
      const input = document.getElementById("chatbot-user-input");

      const send = () => {
        const message = input.value.trim();
        if (!message) return;

        addMessage(message, "user");
        input.value = "";

        const lowerMessage = message.toLowerCase();
        let response;

        if (!userName) {
          userName = message.trim();
          response = config.responses.nombre(userName);
        } else {
          attempts++;
          response = config.responses.default;

          Object.keys(config.responses).forEach((key) => {
            if (lowerMessage.includes(key)) {
              response =
                typeof config.responses[key] === "function"
                  ? config.responses[key](userName || "amigo")
                  : config.responses[key];
            }
          });

          if (
            lowerMessage.includes("asesor") ||
            lowerMessage.includes("hablar") ||
            attempts >= config.maxAttempts
          ) {
            response = config.responses.asesor;
            setTimeout(() => escalateToAdvisor(message), 2000);
          }
        }

        setTimeout(() => addMessage(response, "bot"), 600);
      };

      sendBtn.onclick = send;
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") send();
      });
      input.focus();
    };

    const addMessage = (text, sender) => {
      const messages = document.getElementById("chatbot-messages");
      const msg = document.createElement("div");
      msg.className = `chatbot-message ${sender}`;
      msg.textContent = text;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    };

    const escalateToAdvisor = (userMessage) => {
      addMessage(
        "¡Perfecto! Te estoy conectando con un asesor humano. Puedes seguir navegando en Funeon mientras te responden por WhatsApp 😊",
        "bot"
      );

      setTimeout(() => {
        const preMessage = encodeURIComponent(
          `¡Hola equipo FundNeon! 👋\n\nUsuario: ${
            userName || "Anónimo"
          }\nDuda: "${userMessage}"\n\nEstá esperando respuesta en la plataforma. ¡Gracias!`
        );
        window.open(
          `https://wa.me/${config.whatsappNumber}?text=${preMessage}`,
          "_blank",
          "noopener,noreferrer"
        );
      }, 2000);
    };

    // === CLICK EN BOTÓN ===
    button.onclick = openChat;
  }, [user]); // ← Se ejecuta cuando cambia el estado de login

  return null; // No renderiza nada en React
};

export default ChatBot;
