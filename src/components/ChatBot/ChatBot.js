const ChatBot = () => {
  // CONFIGURACIÓN FÁCIL (cambia esto para personalizar)
  const config = {
    botName: "Álvaro",
    whatsappNumber: "+573142120201", // Tu número real
    greeting:
      "¡Hola! 😊 Soy Álvaro, tu asistente virtual de FundNeon. ¿Me regalas tu nombre para atenderte mejor?",
    responses: {
      // Saludo inicial con nombre
      nombre: (userName) =>
        `¡Encantado, ${userName}! 😄 ¿En qué te puedo ayudar hoy? Puedes preguntarme sobre cursos, costos, certificados, recursos o cualquier duda.`,

      // Preguntas comunes
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
    maxAttempts: 4, // Un poco más de paciencia
  };

  let attempts = 0;

  const openChat = () => {
    // Crea el chat si no existe
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
        <input type="text" id="chatbot-user-input" placeholder="Escribe tu duda..." />
        <button id="chatbot-send">➤</button>
      </div>
    `;
    document.body.appendChild(container);

    // Eventos
    document
      .getElementById("chatbot-close")
      .addEventListener("click", () => container.remove());
    document
      .getElementById("chatbot-send")
      .addEventListener("click", sendMessage);
    document
      .getElementById("chatbot-user-input")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
      });
  };

  let userName = null; // ← Guarda el nombre

  const sendMessage = () => {
    const input = document.getElementById("chatbot-user-input");
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    const lowerMessage = message.toLowerCase();

    let response;

    // PRIMERA VEZ: Preguntar nombre
    if (!userName) {
      userName = message.trim();
      response = config.responses.nombre(userName);
    } else {
      // Respuestas normales
      attempts++;

      response = config.responses.default;

      Object.keys(config.responses).forEach((key) => {
        if (lowerMessage.includes(key)) {
          if (typeof config.responses[key] === "function") {
            response = config.responses[key](userName || "amigo");
          } else {
            response = config.responses[key];
          }
        }
      });

      // Escalación si menciona asesor o muchos intentos
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
        `¡Hola equipo de Funeon! 👋\n\nUn usuario necesita ayuda:\n"${userMessage}"\n\nEstá esperando respuesta en la plataforma.`
      );
      // Abre en nueva pestaña → usuario SIGUE en Funeon
      window.open(
        `https://wa.me/${config.whatsappNumber}?text=${preMessage}`,
        "_blank"
      );
    }, 2000);
  };

  // Botón flotante
  const button = document.createElement("button");
  button.id = "chatbot-button";
  button.innerHTML = "💬";
  button.onclick = openChat;
  document.body.appendChild(button);
};

export default ChatBot;
