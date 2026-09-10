import React, { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import "./ChatBot.css";

const ChatBot = () => {
  const { user } = useAuth();
  const chatbotRef = useRef(null);

  useEffect(() => {
    // ==========================================
    // SI EL USUARIO ESTÁ LOGUEADO, NO SE MUESTRA
    // ==========================================
    if (user) {
      if (chatbotRef.current) {
        chatbotRef.current.remove();
        chatbotRef.current = null;
      }
      return;
    }

    // Evitar duplicados si el efecto se ejecuta dos veces
    if (document.getElementById("chatbot-root-wrapper")) return;

    // ==========================================
    // CONFIGURACIÓN Y BASE DE CONOCIMIENTOS
    // ==========================================
    const config = {
      botName: "Álvaro",
      whatsappNumber: "573133496558",
      maxAttempts: 5,
      greeting:
        "¡Hola! 😊 Soy Álvaro, tu asistente virtual de ABC Digital STEAM.\n\nPara poder brindarte una atención personalizada, ¿me regalas tu nombre, por favor?",

      responses: {
        nombre: (name) =>
          `¡Qué gusto saludarte, ${name}! 😄\n\nEstoy aquí para orientarte en todo lo que necesites sobre ABC Digital STEAM.\n\nEscríbeme tu duda o elige uno de estos temas de interés:\n\n• 📘 Cursos y Programas (Carreras, bachillerato, técnicos...)\n• 💰 Costos, Becas y Facilidades de pago\n• 🎓 Certificaciones y Convenios universitarios\n• 🧑‍🏫 Modalidad de estudio y Horarios\n• 🤝 Hablar con un asesor humano`,

        saludo:
          "¡Hola de nuevo! 😊 Qué alegría saludarte. Dime, ¿en qué te puedo colaborar hoy o qué programa te llama la atención?",

        costos: `💰 **Precios, Financiación y Becas**\n\nEn ABC Digital STEAM queremos que la educación esté al alcance de todos. Por eso contamos con:\n\n✅ **Matrículas con descuento** y becas parciales según tu perfil.\n✅ **Financiación directa** con la institución (pago a cuotas mensuales sin intereses ni codeudor).\n✅ **Recursos 100% gratuitos** para que conozcas nuestra plataforma.\n\nPara darte el valor exacto de la mensualidad del programa que te interesa y aplicar a una beca, te puedo conectar con un asesor comercial. ¿Te gustaría?`,

        cursos: `📘 **Nuestra Oferta Educativa**\n\nContamos con programas 100% virtuales y flexibles con alta demanda en el mercado:\n\n1️⃣ **Validación de Bachillerato Académico** (Termina tu colegio rápido y de forma oficial).\n2️⃣ **Preparación Pruebas ICFES** (Asegura un gran puntaje).\n3️⃣ **Programas Técnicos** (Enfoque práctico para trabajar rápido).\n4️⃣ **Programas Tecnólogos** (Gestión empresarial y más).\n5️⃣ **Carreras Profesionales** (Ingenierías y licenciaturas).\n6️⃣ **Cursos de Inglés** (Desde nivel básico hasta conversacional).\n7️⃣ **Diplomados y Cursos Cortos** (Actualización profesional en semanas).\n\n👉 ¿Sobre cuál de estas opciones te gustaría recibir más información hoy?`,

        bachillerato: `🎓 **Validación de Bachillerato Oficial**\n\n¿Quieres terminar tu colegio rápido? Con nosotros es posible:\n\n• Clases virtuales flexibles adaptadas a tu tiempo.\n• Programa oficial avalado que te entrega tu **Título de Bachiller Académico**.\n• Dirigido a jóvenes y adultos.\n• Duración reducida gracias a la modalidad por ciclos.\n\n¿Te gustaría que un asesor te explique los requisitos y los costos de matrícula?`,

        icfes: `📝 **Preparación y Validación de ICFES**\n\nMaximiza tus oportunidades de ingreso a la universidad pública o mejora tu puntaje:\n\n• Simulacros virtuales interactivos.\n• Explicación paso a paso de las preguntas clave por áreas.\n• Profesores especializados en la metodología ICFES Saber 11.\n\n¿Te interesa conocer el costo de este curso de preparación?`,

        certificados: `🎓 **Certificaciones de Alta Calidad y Convenios**\n\nTodos nuestros títulos y certificados cuentan con el debido respaldo legal e institucional. Gracias a nuestros convenios estratégicos, puedes homologar o recibir doble titulación con:\n\n• **Universidad INCA de Colombia**\n• **ESIS**\n• **Universidad de Barranquilla**\n\nLa validación de tu bachillerato y educación técnica es 100% válida a nivel nacional para continuar estudios superiores o aplicar a empleos.`,

        modalidad: `🧑‍🏫 **Metodología y Horarios (100% Flexible)**\n\nNuestra metodología está diseñada para personas que trabajan o tienen otras actividades:\n\n✅ **Clases en vivo por Zoom** en horarios cómodos (noches y fines de semana).\n✅ **Clases Grabadas 24/7**: Si no puedes asistir en vivo, la grabación queda disponible en el aula virtual para que la veas cuando quieras.\n✅ **Acompañamiento tutorial**: Tutores listos para resolver tus dudas por WhatsApp o correo.\n✅ **Plataforma interactiva**: Acceso a lecturas, videos y evaluaciones desde tu celular o computadora.`,

        ingles: `🇬🇧 **Cursos de Inglés Conversacional**\n\nDomina el inglés con un enfoque dinámico y práctico:\n\n• Niveles desde básico (A1) hasta avanzado (B2).\n• Clases enfocadas en la conversación, pronunciación y comprensión real.\n• Materiales digitales interactivos incluidos sin costo adicional.\n• Certificado de nivel cursado al finalizar.\n\n¿Deseas que un asesor te comparta los horarios y precios de inglés?`,

        profesionales: `🎓 **Carreras Profesionales Virtuales**\n\nOfrecemos carreras profesionales en convenio con universidades aliadas. Las más solicitadas son:\n\n• **Ingeniería de Sistemas**: Enfocada en desarrollo de software, redes y bases de datos.\n• **Administración y Gestión**: Con alta salida laboral en empresas.\n\nLa duración es menor gracias a la homologación de saberes y el estudio es 100% virtual.\n\n¿Quieres hablar con un asesor para conocer los planes de estudio y costos por semestre?`,

        tecnicos: `⚡ **Programas Técnicos Laborales**\n\nProgramas cortos (duración promedio de 1 a 1.5 años) diseñados para que salgas al mercado laboral de inmediato:\n\n• **Técnico en Sistemas e Informática**\n• **Técnico en Administración y Mercadeo**\n• **Técnico en Diseño y Desarrollo Web**\n\nTodos nuestros técnicos son certificados y prácticos.\n\n¿Te gustaría recibir el folleto digital con el plan de estudios con un asesor?`,

        asesor: `🤝 **Conexión Directa con un Asesor**\n\nEntendido. Te pondré en contacto directo con uno de nuestros asesores académicos a través de WhatsApp para que resuelva tus preguntas de forma personalizada, te ayude con los costos de tu país o te asista en tu inscripción.`,

        fallback: `Qué pena, no entendí 😕 ¿Me puedes repetir, por favor?\n\nRecuerda que puedo ayudarte con temas como:\n\n• 📘 **Programas** o **Cursos**\n• 💰 **Costos** o **Precios**\n• 🎓 **Certificados** o **Convenios**\n• 🧑‍🏫 **Horarios** o **Modalidad**\n• 🤝 **Asesor** o **WhatsApp**\n\n👉 ¿Qué tema deseas consultar?`,

        despedida: (name) => {
          const nombreFinal =
            name && name.trim() !== "" ? name : "con mucho gusto";
          return `Perfecto, ${nombreFinal} 😊\n\nYa estoy preparando tu enlace de conexión para comunicarte con nuestro equipo académico de ABC Digital STEAM.\n\n¡Ha sido un verdadero placer ayudarte hoy! Que tengas un excelente día. 🌟. \n\n Si tienes alguna duda no dejes de contactarnos.`;
        },
      },
    };

    let userName = null;
    let attempts = 0;

    // ==========================================
    // CREAR EL ENTORNO DEL CHAT (DOM EN JS)
    // ==========================================
    const wrapper = document.createElement("div");
    wrapper.id = "chatbot-root-wrapper";
    document.body.appendChild(wrapper);
    chatbotRef.current = wrapper;

    // 1. Botón Flotante
    const button = document.createElement("button");
    button.id = "chatbot-trigger-btn";
    button.title = "Chatea con Álvaro";
    button.innerHTML = "💬";
    wrapper.appendChild(button);

    // 2. Contenedor de la Ventana de Chat (Oculto al inicio)
    const container = document.createElement("div");
    container.id = "chatbot-box-container";
    container.style.display = "none";
    wrapper.appendChild(container);

    // Estructura interna de la caja de chat
    container.innerHTML = `
      <div class="chatbot-box-header">
        <div class="chatbot-avatar-info">
          <div class="chatbot-avatar-indicator"></div>
          <div>
            <div class="chatbot-bot-name">${config.botName}</div>
            <div class="chatbot-bot-status">Asistente en línea</div>
          </div>
        </div>
        <button id="chatbot-close-btn" title="Cerrar chat">&times;</button>
      </div>
      <div class="chatbot-box-messages" id="chatbot-messages-list">
        <div class="chatbot-bubble bot-bubble"></div>
      </div>
      <div class="chatbot-box-input-area">
        <input type="text" id="chatbot-input-field" placeholder="Escribe tu mensaje aquí..." />
        <button id="chatbot-send-btn" title="Enviar mensaje">&#x27A4;</button>
      </div>
    `;

    const messagesList = container.querySelector("#chatbot-messages-list");
    const firstBubble = messagesList.querySelector(".chatbot-bubble");

    // Formatear el saludo inicial respetando saltos de línea
    firstBubble.innerHTML = config.greeting.replace(/\n/g, "<br />");

    const inputField = container.querySelector("#chatbot-input-field");
    const sendBtn = container.querySelector("#chatbot-send-btn");
    const closeBtn = container.querySelector("#chatbot-close-btn");

    // ==========================================
    // MANEJO DE EVENTOS DE APERTURA/CIERRE
    // ==========================================
    button.onclick = () => {
      container.style.display = "flex";
      button.style.display = "none";
      inputField.focus();
      scrollToBottom();
    };

    closeBtn.onclick = () => {
      container.style.display = "none";
      button.style.display = "flex";
    };

    // ==========================================
    // UTILIDADES
    // ==========================================
    const scrollToBottom = () => {
      messagesList.scrollTop = messagesList.scrollHeight;
    };

    const normalizeText = (text) =>
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "");

    const containsAny = (text, keywords) =>
      keywords.some((k) => text.includes(k));

    // ==========================================
    // AGREGAR MENSAJE A LA PANTALLA
    // ==========================================
    const appendMessage = (text, sender) => {
      const bubble = document.createElement("div");
      bubble.className = `chatbot-bubble ${sender}-bubble`;
      bubble.innerHTML = text.replace(/\n/g, "<br />");
      messagesList.appendChild(bubble);
      scrollToBottom();
    };

    // ==========================================
    // EFECTO DE ESCRITURA ("Álvaro está escribiendo...")
    // ==========================================
    const showTypingIndicator = (callback) => {
      const indicator = document.createElement("div");
      indicator.className = "chatbot-bubble bot-bubble typing-indicator-bubble";
      indicator.innerHTML = `
        <span class="chatbot-typing-dot"></span>
        <span class="chatbot-typing-dot"></span>
        <span class="chatbot-typing-dot"></span>
      `;
      messagesList.appendChild(indicator);
      scrollToBottom();

      setTimeout(() => {
        indicator.remove();
        callback();
      }, 1300); // 1.3 segundos para que se sienta muy natural
    };

    // ==========================================
    // ESCALAR AL EQUIPO DE WHATSAPP
    // ==========================================
    const escalateToAdvisor = (userMsg) => {
      const text = encodeURIComponent(
        `Hola equipo ABC Digital STEAM 👋\n\nMi nombre es: ${userName || "Interesado/a"}\nMe gustaría recibir más información.\n\nMensaje enviado al bot: "${userMsg}"`,
      );
      window.open(
        `https://wa.me/${config.whatsappNumber}?text=${text}`,
        "_blank",
        "noopener,noreferrer",
      );
    };

    // ==========================================
    // LÓGICA DE PROCESAMIENTO DE MENSAJES
    // ==========================================
    const sendMessage = () => {
      const message = inputField.value.trim();
      if (!message) return;

      // 1. Mostrar mensaje del usuario
      appendMessage(message, "user");
      inputField.value = "";

      // 2. Procesar el flujo del chatbot con delay simulado
      showTypingIndicator(() => {
        let response = config.responses.fallback;
        let shouldEscalate = false;

        if (!userName) {
          // El primer mensaje siempre se guarda como el nombre
          userName = message;
          response = config.responses.nombre(userName);
          attempts = 0; // reset
        } else {
          const clean = normalizeText(message);

          // Árbol de decisión mejorado (Más opciones y respuestas muy ricas)
          if (
            containsAny(clean, [
              "hola",
              "buenas",
              "saludo",
              "buenos dias",
              "buenas tardes",
              "buenas noches",
              "que tal",
              "hola alvaro",
            ])
          ) {
            response = config.responses.saludo;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "costo",
              "precio",
              "cuanto",
              "vale",
              "pago",
              "valor",
              "pesos",
              "mensualidad",
              "inscripcion",
              "beca",
              "becas",
              "financiacion",
              "financiar",
            ])
          ) {
            response = config.responses.costos;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "bachillerato",
              "colegio",
              "ciclo",
              "ciclos",
              "validar bachillerato",
              "terminar colegio",
              "bachiller",
            ])
          ) {
            response = config.responses.bachillerato;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "icfes",
              "pruebas saber",
              "saber 11",
              "preicfes",
            ])
          ) {
            response = config.responses.icfes;
            attempts = 0;
          } else if (containsAny(clean, ["ingles", "english", "idioma"])) {
            response = config.responses.ingles;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "carrera",
              "universidad",
              "profesional",
              "ingenieria",
              "sistemas",
              "ing de sistemas",
            ])
          ) {
            response = config.responses.profesionales;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "tecnico",
              "tecnicos",
              "informatica",
              "programacion",
              "desarrollo web",
            ])
          ) {
            response = config.responses.tecnicos;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "curso",
              "programa",
              "estudiar",
              "oferta",
              "carreras",
              "que tienen",
              "que ofrecen",
              "diplomado",
              "diplomados",
              "cursos cortos",
            ])
          ) {
            response = config.responses.cursos;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "certificado",
              "titulo",
              "valido",
              "validez",
              "resolucion",
              "convenio",
              "convenios",
              "universidades",
            ])
          ) {
            response = config.responses.certificados;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "virtual",
              "clase",
              "zoom",
              "modalidad",
              "horario",
              "horarios",
              "en vivo",
              "grabado",
              "grabaciones",
              "tiempo",
            ])
          ) {
            response = config.responses.modalidad;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "si",
              "claro",
              "por favor",
              "me gustaria",
              "si me gustaria",
              "porsupuesto",
              "por supuesto",
              "dale",
              "bueno",
              "ok",
              "listo",
              "quiero",
              "folleto",
            ])
          ) {
            // Respuesta afirmativa a folleto o asesor
            response = config.responses.despedida(userName);
            shouldEscalate = true;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "no",
              "gracias",
              "no gracias",
              "despues",
              "mas tarde",
              "no me interesa",
            ])
          ) {
            response = `No hay problema, ${userName} 😊. ¿De qué otro tema te gustaría recibir información? Puedes preguntar por nuestros cursos, costos, certificados, horarios o si prefieres hablar con un asesor.`;
            attempts = 0;
          } else if (
            containsAny(clean, [
              "asesor",
              "humano",
              "whatsapp",
              "persona",
              "hablar con alguien",
              "telefono",
              "celular",
              "contacto",
            ])
          ) {
            response = config.responses.despedida(userName);
            shouldEscalate = true;
            attempts = 0;
          } else {
            // Solo sumamos intento si el bot NO entendió
            attempts++;
            if (attempts >= config.maxAttempts) {
              response = `Veo que tienes varias dudas, ${userName} 😊. Para ayudarte de la mejor manera, te conectaré con un asesor humano en WhatsApp. ¡Ya abro el enlace!`;
              shouldEscalate = true;
              attempts = 0;
            } else {
              response = config.responses.fallback;
            }
          }
        }

        // Agregar la respuesta en pantalla
        appendMessage(response, "bot");

        // Si debe escalar a WhatsApp, lo hace tras una pequeña pausa
        if (shouldEscalate) {
          setTimeout(() => {
            escalateToAdvisor(message);
          }, 3000);
        }
      });
    };

    // Enlace de los botones y teclado
    sendBtn.onclick = sendMessage;
    inputField.onkeypress = (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    };

    // ==========================================
    // LIMPIEZA AL DESMONTAR EL COMPONENTE
    // ==========================================
    return () => {
      if (wrapper) {
        wrapper.remove();
      }
    };
  }, [user]);

  return null;
};

export default ChatBot;
