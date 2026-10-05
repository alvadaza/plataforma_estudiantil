# 🎓 FundNeon – Plataforma Educativa Online

FundNeon es una plataforma educativa desarrollada con **React + Vite**, orientada a estudiantes que buscan acceder a **cursos, diplomados y recursos académicos** de forma digital, moderna y segura.

El proyecto está desplegado en **Netlify**, con buenas prácticas de **SEO, accesibilidad y seguridad web**.

---

## 🚀 Tecnologías utilizadas

- ⚛️ **React**
- ⚡ **Vite**
- 🎨 **CSS / Font Awesome**
- 🔐 **Headers de seguridad (CSP, HSTS, COOP, XFO)**
- ☁️ **Netlify (Hosting)**
- 📦 **Supabase (Backend / Auth / Data)**
- 🔐 **Supabase Storage (Documentos privados de estudiantes)**
- 🖼️ **Cloudinary (Imágenes)**

Los documentos de identidad, diplomas y comprobantes de pago se guardan en el
bucket privado `student-documents` de Supabase Storage. Antes de desplegar esta
funcionalidad, aplica la migración
[`20261004000000_add_private_student_documents.sql`](./supabase/migrations/20261004000000_add_private_student_documents.sql)
al proyecto Supabase. Los administradores podrán consultarlos desde la pestaña
**Documentos de estudiantes** del panel de administración.

---

## 🌐 Sitio en producción

👉 **URL:**  
https://fundneon.netlify.app/

---

## 📁 Estructura del proyecto

```txt
├── public
│   ├── vite.svg
│   └── ...
├── src
│   ├── components
│   ├── pages
│   ├── context
│   ├── styles
│   ├── App.jsx
│   └── main.jsx
├── netlify.toml
├── index.html
├── package.json
├── vite.config.js
└── README.md

📘 FundNeon
Plataforma Educativa Digital
Documento de Presentación Institucional
🏫 ¿Qué es FundNeon?

FundNeon es una plataforma educativa digital diseñada para apoyar a instituciones educativas, fundaciones y entidades de formación en la gestión y difusión de su oferta académica en entornos virtuales.

La plataforma permite centralizar cursos, diplomados, convenios y recursos educativos, facilitando el acceso a estudiantes desde cualquier dispositivo, con altos estándares de seguridad, accesibilidad y calidad digital.

🎯 Propósito

Brindar a las entidades educativas una herramienta moderna que permita:

Ampliar su alcance académico

Fortalecer la educación virtual

Facilitar el acceso a la formación

Mejorar la experiencia digital de estudiantes y docentes

👥 Público objetivo

FundNeon está orientada a:

Universidades

Instituciones técnicas y tecnológicas

Fundaciones educativas

Entidades de formación

Estudiantes y comunidad académica

🧩 Funcionalidades principales
🎓 Para estudiantes

Acceso a cursos y diplomados

Visualización de convenios institucionales

Consulta de recursos académicos

Navegación clara y accesible

Compatibilidad con dispositivos móviles

🏫 Para entidades educativas

Difusión de programas académicos

Presentación institucional moderna

Centralización de la oferta educativa

Imagen digital profesional

Plataforma segura y confiable

🌐 Acceso a la plataforma

🔗 Plataforma en línea:
https://fundneon.netlify.app/

🔐 Seguridad y confianza

FundNeon aplica estándares modernos de seguridad digital:

Conexiones seguras (HTTPS)

Protección contra ataques web comunes

Políticas de seguridad del contenido

Prevención de incrustación maliciosa

Buenas prácticas de privacidad

Estas medidas fortalecen la confianza institucional y la protección de la información.

♿ Accesibilidad e inclusión

La plataforma cumple buenas prácticas de accesibilidad web:

Navegación clara y semántica

Compatibilidad con lectores de pantalla

Botones y controles accesibles

Experiencia inclusiva para todos los usuarios

FundNeon promueve una educación digital accesible.

📊 Calidad y posicionamiento digital

Optimización para motores de búsqueda (SEO)

Preparada para indexación en Google

Experiencia de usuario optimizada

Rendimiento estable en producción

Esto permite a las entidades mejor visibilidad digital.

🧱 Tecnología (resumen no técnico)

Plataforma web moderna

Infraestructura en la nube

Arquitectura escalable

Soporte para crecimiento futuro

🔄 Escalabilidad y crecimiento

FundNeon está preparada para evolucionar con:

Panel administrativo

Gestión de usuarios y roles

Integración de nuevos programas

Expansión institucional

Integraciones futuras

🤝 Alianzas y convenios

La plataforma es ideal para:

Convenios interinstitucionales

Programas conjuntos

Alianzas académicas

Proyectos educativos digitales

📞 Contacto institucional

Para información, convenios o alianzas:

📧 Correo: contacto@fundneon.com

🌐 Sitio web: https://fundneon.netlify.app/

📄 Uso del documento

Este documento tiene fines informativos e institucionales.
FundNeon es una plataforma educativa en desarrollo continuo.

FundNeon
Educación digital con propósito

✅ Resultado

Con este README tienes:

✔️ Lenguaje institucional
✔️ Ideal para directivos y aliados
✔️ No técnico
✔️ Profesional y claro
✔️ Listo para enviar o publicar

Si quieres, el siguiente paso puede ser:

📄 Convertir esto en PDF institucional

📄 Crear brochure corporativo

📄 Redactar presentación para convenios

📄 Políticas de privacidad y términos

Dime cuál y lo hacemos 🚀
```
