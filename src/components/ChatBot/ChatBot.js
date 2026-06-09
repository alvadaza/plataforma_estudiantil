import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef } from "react";

const ChatBot = () => {
  const { user } = useAuth();
  const buttonRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // ===============================
    // SI EL USUARIO ESTÁ LOGUEADO
    // ===============================
    if (user) {
      buttonRef.current?.remove();
      containerRef.current?.remove();
      buttonRef.current = null;
      containerRef.current = null;
      return;
    }

    if (buttonRef.current) return;

    // ===============================
    // FUNCIONES DE NORMALIZACIÓN
    // ===============================
    const normalizeText = (text) =>
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "");

    const containsAny = (text, keywords) =>
      keywords.some((k) => text.includes(k));

    // ===============================
    // CONFIGURACIÓN DEL BOT
    // ===============================
    const config = {
      botName: "Álvaro",
      whatsappNumber: "573142120201",
      maxAttempts: 4,
      greeting:
        "¡Hola! 😊 Soy Álvaro, tu asistente virtual de La pizarra Digital.\n\nPara ayudarte mejor, ¿me regalas tu nombre?",
      responses: {
        nombre: (name) =>
          `¡Mucho gusto, ${name}! 😄  
Estoy aquí para ayudarte con información clara y rápida sobre La pizarra Digital.

Puedo orientarte sobre:
• 📘 Cursos y programas  
• 💰 Costos y formas de pago  
• 🎓 Certificados y validez  
• 🧑‍🏫 Modalidad de estudio  
• 🤝 Hablar con un asesor humano  

👉 Escríbeme con confianza.`,

        saludo:
          "¡Hola! 😊 Qué gusto saludarte. ¿Sobre qué te gustaría recibir información hoy?",

        costos: `💰 **Costos y precios**  
En La pizarra Digital contamos con:

✅ Recursos gratuitos  
✅ Cursos pagos con precios accesibles  
✅ Opciones según nivel:  
• Validación de bachillerato  
• Técnico  
• Tecnólogo  
• Profesional  

Si deseas precios exactos según el programa, puedo conectarte con un asesor humano.`,

        cursos: `📘 **Carreras profesionales y programas**  
Ofrecemos formación 100% virtual, certificada y con acompañamiento constante.

Programas disponibles:
• Validación de bachillerato  
• Técnicos  
• Tecnólogos  
• Profesionales  
• Cursos de Ingles
• Diplomados
• Validacion de Ifes
varios cursos cortos

👉 ¿Qué área te interesa conocer?`,

        certificados: `🎓 **Certificados y validez**  
Todos nuestros programas son certificados y cuentan con respaldo institucional.

Convenios con:
• Universidad INCA de Colombia  
• ESIS  
• Universidad de Barranquilla  

La validación de bachillerato es oficial y reconocida.`,

        modalidad: `🧑‍🏫 **Modalidad de estudio**  
Clases:
✅ 100% virtuales  
✅ En vivo por Zoom  
✅ Grabaciones disponibles  
✅ Material y acompañamiento  

Puedes estudiar desde cualquier lugar del país.`,

        recursos: `📂 **Recursos gratuitos**  
Tenemos guías, videos y material educativo sin costo para que empieces hoy mismo.

👉 Dime qué tema te interesa.`,
        // =========================
        // CARRERAS PROFESIONALES
        // =========================
        profesional_pregunta:
          "Claro 😊 contamos con varias carreras profesionales 100% virtuales y certificadas. ¿Qué carrera profesional te interesa?",

        profesional_sistemas:
          "Excelente elección 😊\n\nLa carrera de Ingeniería está debidamente certificada y cuenta con respaldo institucional de:\n• Universidad INCA de Colombia\n• Universidad de Barranquilla\n\nLa modalidad es 100% virtual y el título tiene validez institucional.\n\n¿Deseas recibir más información detallada como costos, duración y requisitos con un asesor humano?",

        profesional_si:
          "Perfecto 😊 con mucho gusto te comunico con un asesor humano para brindarte toda la información de esta carrera.\n\nFue un placer ayudarte y estaré disponible para ti cuando lo necesites.",

        profesional_no:
          "No hay problema 😊 también puedo brindarte información sobre otras carreras profesionales, tecnólogos, técnicos o cursos.\n\n¿Qué otra opción te gustaría conocer?",

        // =========================
        // PROGRAMAS TÉCNICOS
        // =========================
        tecnico_pregunta:
          "Claro que sí 😊 contamos con programas técnicos certificados y 100% virtuales. ¿Qué programa técnico te interesa estudiar?",

        tecnico_sistemas:
          "Excelente opción 👌\n\nEl Técnico en Sistemas es un programa certificado, 100% virtual, enfocado en habilidades prácticas para el campo laboral.\n\n¿Te gustaría conocer duración, costos y certificación con un asesor humano?",

        // =========================
        // PROGRAMAS TECNÓLOGOS
        // =========================
        tecnologo_pregunta:
          "Perfecto 😊 los programas tecnólogos combinan teoría y práctica con excelente salida laboral. ¿Qué programa tecnólogo te interesa?",

        tecnologo_gestion:
          "Muy buena elección 😄\n\nEl Tecnólogo en Gestión Empresarial es un programa certificado, virtual y con respaldo institucional.\n\n¿Deseas que un asesor humano te amplíe la información de este programa?",

        // =========================
        // CURSOS DE INGLÉS
        // =========================
        ingles_pregunta:
          "¡Claro que sí! 😊 contamos con cursos de inglés certificados y 100% virtuales. ¿Buscas inglés básico, intermedio o avanzado?",

        ingles_respuesta:
          "Excelente 😄\n\nNuestro curso de inglés es certificado, 100% virtual y con enfoque práctico para el ámbito personal, académico y laboral.\n\n¿Deseas conocer niveles, duración y costos con un asesor humano?",

        // =========================
        // DIPLOMADOS
        // =========================
        diplomado_pregunta:
          "Perfecto 😊 también contamos con diplomados certificados en diferentes áreas. ¿En qué área te gustaría realizar el diplomado?",

        diplomado_respuesta:
          "Muy buena elección 👌\n\nEste diplomado es certificado, 100% virtual y diseñado para fortalecer tu perfil profesional.\n\n¿Te gustaría recibir información detallada con un asesor humano?",

        // =========================
        // CURSOS CORTOS
        // =========================
        curso_pregunta:
          "Claro 😊 contamos con cursos cortos y certificados en diferentes áreas. ¿Sobre qué tema te gustaría el curso?",

        curso_respuesta:
          "Excelente opción 😄\n\nEste curso es 100% virtual, certificado y enfocado en aprendizaje práctico.\n\n¿Deseas que un asesor humano te brinde toda la información?",

        asesor: `🤝 **Conexión con asesor humano**

Fue un gusto ayudarte. Estaré disponible para ti en cualquier momento.`,

        fallback: `😊 Estoy aquí para ayudarte.  
Puedo brindarte información sobre:

• Cursos  
• Costos  
• Certificados  
• Modalidad  
• Asesor humano  

👉 ¿Qué deseas saber?`,

        despedida: (name) => {
          const nombreFinal =
            name && name.trim() !== "" ? name : "con mucho gusto";
          return `Perfecto ${nombreFinal} 😊

Te estoy conectando con un asesor humano para atención personalizada.
Fue un gusto ayudarte.
Estaré disponible para ti en cualquier momento. ¡Que tengas un excelente día! 🌟
Estaré disponible para ti en cualquier momento.`;
        },
      },
    };

    let userName = null;
    let attempts = 0;

    // ===============================
    // BOTÓN FLOTANTE
    // ===============================
    const button = document.createElement("button");
    button.id = "chatbot-button";
    button.innerHTML = "💬";
    button.title = "Chatea con Álvaro";
    document.body.appendChild(button);
    buttonRef.current = button;

    // ===============================
    // ABRIR CHAT
    // ===============================
    const openChat = () => {
      if (containerRef.current) return;

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
          <input id="chatbot-user-input" placeholder="Escribe tu mensaje..." />
          <button id="chatbot-send">➤</button>
        </div>
      `;
      document.body.appendChild(container);
      containerRef.current = container;

      document.getElementById("chatbot-close").onclick = () =>
        container.remove();

      const input = document.getElementById("chatbot-user-input");
      const sendBtn = document.getElementById("chatbot-send");

      const send = () => {
        const message = input.value.trim();
        if (!message) return;

        addMessage(message, "user");
        input.value = "";

        const clean = normalizeText(message);
        let response = config.responses.fallback;

        if (!userName) {
          userName = message;
          response = config.responses.nombre(userName);
        } else {
          attempts++;

          if (containsAny(clean, ["hola", "buenas", "saludo"])) {
            response = config.responses.saludo;
          } else if (
            containsAny(clean, ["costo", "precio", "cuanto", "vale", "pago"])
          ) {
            response = config.responses.costos;
          } else if (
            containsAny(clean, [
              "ingenieria de sistemas",
              "ingenieria sistemas",
              "ing sistemas",
              "sistemas",
              "ingenieria",
            ])
          ) {
            response = config.responses.profesional_sistemas;
          } else if (
            containsAny(clean, ["curso", "programa", "estudiar", "carrera"])
          ) {
            response = config.responses.cursos;
          } else if (containsAny(clean, ["certificado", "titulo", "valido"])) {
            response = config.responses.certificados;
          } else if (
            containsAny(clean, ["virtual", "clase", "zoom", "modalidad"])
          ) {
            response = config.responses.modalidad;
          } else if (containsAny(clean, ["recurso", "gratis", "material"])) {
            response = config.responses.recursos;
          } else if (
            containsAny(clean, ["asesor", "humano", "whatsapp"]) ||
            attempts >= config.maxAttempts
          ) {
            response = config.responses.despedida(userName);
            setTimeout(() => escalateToAdvisor(message), 2500);
          } else {
            response = config.responses.fallback;
          }
          response = config.responses.despedida(userName);
          setTimeout(() => escalateToAdvisor(message), 2500);
        }

        setTimeout(() => addMessage(response, "bot"), 1000);
      };

      sendBtn.onclick = send;
      input.addEventListener("keypress", (e) => e.key === "Enter" && send());
      input.focus();
    };

    // ===============================
    // MENSAJES
    // ===============================
    const addMessage = (text, sender) => {
      const messages = document.getElementById("chatbot-messages");
      const div = document.createElement("div");
      div.className = `chatbot-message ${sender}`;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    };

    // ===============================
    // ESCALAR A ASESOR
    // ===============================
    const escalateToAdvisor = (msg) => {
      const text = encodeURIComponent(
        `Hola equipo La pizarra Digital 👋\n\nUsuario: ${
          userName || "Anónimo"
        }\nMensaje: "${msg}"`,
      );
      window.open(
        `https://wa.me/${config.whatsappNumber}?text=${text}`,
        "_blank",
        "noopener,noreferrer",
      );
    };

    button.onclick = openChat;
  }, [user]);

  return null;
};

export default ChatBot;
