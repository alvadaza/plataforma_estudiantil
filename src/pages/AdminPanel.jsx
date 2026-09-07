import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@supabase/supabase-js";
import "./AdminPanel.css"; // Reutilizamos el estilo dark-STEAM premium

// Instanciamos el cliente administrador con configuración de seguridad para evitar conflictos de Auth Token
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const AdminPanel = () => {
  // Función de auto-corrección de URLs públicas para Supabase Storage
  const getCorrectUrl = (url) => {
    if (!url) return "";

    if (
      url.includes("/storage/v1/object/") &&
      !url.includes("/storage/v1/object/public/")
    ) {
      return url.replace("/storage/v1/object/", "/storage/v1/object/public/");
    }

    return url;
  };

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAdmin, logout } = useAuth();

  // Estados específicos para la gestión de módulos, lecciones y material
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonVideo, setNewLessonVideo] = useState("");
  const [newLessonContent, setNewLessonContent] = useState("");
  const [newLessonResource, setNewLessonResource] = useState(null);
  const [uploadingResource, setUploadingResource] = useState(false);

  // Estados para creación de tareas (Assignments)
  const [assignModuleId, setAssignModuleId] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignFile, setAssignFile] = useState(null);
  const [uploadingAssign, setUploadingAssign] = useState(false);

  // Estados para la creación de Exámenes (Quizzes) y Preguntas
  const [quizModuleId, setQuizModuleId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctOption, setCorrectOption] = useState("A");

  if (!user || !isAdmin) {
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "white",
          background: "#111",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>
          Acceso Denegado
        </h1>
        <p style={{ color: "#cbd5e1" }}>
          Solo el administrador general de la plataforma puede ingresar a este
          panel.
        </p>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
    loadCourses();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseContent(selectedCourseId);
    } else {
      setModules([]);
      setLessons([]);
      setAssignments([]);
      setQuizzes([]);
      setQuizQuestions([]);
    }
  }, [selectedCourseId]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, blocked")
      .order("full_name");
    setUsers(data || []);
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, name, code, description, thumbnail_url, teacher_id")
      .order("name");
    setCourses(data || []);
  };

  const loadTeachers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher");
    setTeachers(data || []);
  };

  const loadCourseContent = async (courseId) => {
    try {
      // 1. Cargar módulos del curso
      const { data: mods } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      setModules(mods || []);

      if (mods && mods.length > 0) {
        const modIds = mods.map((m) => m.id);

        // 2. Cargar lecciones / clases
        const { data: les } = await supabase
          .from("lessons")
          .select("*")
          .in("module_id", modIds)
          .order("order_index", { ascending: true });
        setLessons(les || []);

        // 3. Cargar tareas (Assignments) de apoyo
        const { data: assigns } = await supabase
          .from("assignments")
          .select("*")
          .in("module_id", modIds);
        setAssignments(assigns || []);

        // 4. Cargar exámenes (Quizzes)
        const { data: qzs } = await supabase
          .from("quizzes")
          .select("*")
          .in("module_id", modIds);
        setQuizzes(qzs || []);

        if (qzs && qzs.length > 0) {
          const quizIds = qzs.map((q) => q.id);
          // 5. Cargar las preguntas de los exámenes
          const { data: quests } = await supabase
            .from("quiz_questions")
            .select("*")
            .in("quiz_id", quizIds);
          setQuizQuestions(quests || []);
        } else {
          setQuizQuestions([]);
        }
      } else {
        setLessons([]);
        setAssignments([]);
        setQuizzes([]);
        setQuizQuestions([]);
      }
    } catch (err) {
      console.error("Error al cargar contenidos del curso:", err);
    }
  };

  // ===============================
  // ACCIONES DE USUARIOS
  // ===============================
  const handleToggleBlock = async (userId, blocked) => {
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: !blocked })
      .eq("id", userId);
    if (error) {
      alert("Error al cambiar estado: " + error.message);
    } else {
      loadUsers();
    }
  };

  const handleChangePassword = async (userId, userEmail) => {
    const newPassword = prompt(
      `Introduce la nueva contraseña para el usuario ${userEmail}:`,
    );
    if (newPassword === null) return;
    if (newPassword.trim().length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres por seguridad.");
      return;
    }

    try {
      const hasServiceKey = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (hasServiceKey) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password: newPassword.trim(),
          },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke("admin-actions", {
          body: {
            action: "change-password",
            userId,
            newPassword: newPassword.trim(),
          },
        });
        if (error) throw error;
      }
      alert(`¡Contraseña para ${userEmail} actualizada exitosamente!`);
    } catch (err) {
      alert("Error al cambiar la contraseña: " + err.message);
    }
  };

  // ===============================
  // CREACIÓN DE MÓDULOS, LECCIONES Y TAREAS
  // ===============================
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !newModuleTitle.trim()) return;

    try {
      const orderIndex = modules.length;
      const { error } = await supabase.from("modules").insert({
        course_id: selectedCourseId,
        title: newModuleTitle.trim(),
        order_index: orderIndex,
      });

      if (error) throw error;
      setNewModuleTitle("");
      loadCourseContent(selectedCourseId);
      alert("Módulo creado de forma exitosa.");
    } catch (err) {
      alert("Error al crear módulo: " + err.message);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (
      !confirm(
        "¿Eliminar este módulo junto con todas sus lecciones, tareas y exámenes permanentemente?",
      )
    )
      return;
    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", moduleId);
    if (error) {
      alert("Error: " + error.message);
    } else {
      loadCourseContent(selectedCourseId);
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!selectedModuleId || !newLessonTitle.trim()) {
      alert("Debes seleccionar un módulo e ingresar un título.");
      return;
    }

    setUploadingResource(true);
    let resourceUrl = null;
    let resourceName = null;

    try {
      if (newLessonResource) {
        resourceName = newLessonResource.name;
        const fileExt = resourceName.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(3)}.${fileExt}`; // [1]
        const filePath = `lesson-resources/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(filePath, newLessonResource);

        if (uploadError) throw uploadError;

        let {
          data: { publicUrl },
        } = supabase.storage.from("resources").getPublicUrl(filePath);

        resourceUrl = getCorrectUrl(publicUrl);
      }

      const orderIndex = lessons.filter(
        (l) => l.module_id === selectedModuleId,
      ).length;
      const { error } = await supabase.from("lessons").insert({
        module_id: selectedModuleId,
        title: newLessonTitle.trim(),
        video_url: newLessonVideo.trim() || null,
        content: newLessonContent.trim() || null,
        resource_url: resourceUrl,
        resource_name: resourceName,
        order_index: orderIndex,
      });

      if (error) throw error;

      setNewLessonTitle("");
      setNewLessonVideo("");
      setNewLessonContent("");
      setNewLessonResource(null);
      document.getElementById("lesson-file-input").value = "";

      loadCourseContent(selectedCourseId);
      alert("¡Clase / Lección creada exitosamente!");
    } catch (err) {
      alert("Error al guardar la lección: " + err.message);
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm("¿Seguro que deseas eliminar esta lección?")) return;
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      loadCourseContent(selectedCourseId);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignModuleId || !assignTitle.trim()) {
      alert(
        "Por favor selecciona un módulo e ingresa un título para la tarea.",
      );
      return;
    }

    setUploadingAssign(true);
    let resourceUrl = null;
    let resourceName = null;

    try {
      if (assignFile) {
        resourceName = assignFile.name;
        const fileExt = resourceName.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(3)}.${fileExt}`;
        const filePath = `assignment-guides/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(filePath, assignFile);

        if (uploadError) throw uploadError;

        let {
          data: { publicUrl },
        } = supabase.storage.from("resources").getPublicUrl(filePath);

        resourceUrl = getCorrectUrl(publicUrl);
      }

      const { error } = await supabase.from("assignments").insert({
        module_id: assignModuleId,
        title: assignTitle.trim(),
        description: assignDesc.trim() || null,
        due_date: assignDueDate ? new Date(assignDueDate).toISOString() : null,
        resource_url: resourceUrl,
        resource_name: resourceName,
      });

      if (error) throw error;

      setAssignTitle("");
      setAssignDesc("");
      setAssignDueDate("");
      setAssignFile(null);
      const fileInput = document.getElementById("assign-file-input");
      if (fileInput) fileInput.value = "";

      loadCourseContent(selectedCourseId);
      alert("¡Tarea creada y publicada exitosamente!");
    } catch (err) {
      alert("Error al crear la tarea: " + err.message);
    } finally {
      setUploadingAssign(false);
    }
  };

  const handleDeleteAssignment = async (assignId) => {
    if (
      !confirm(
        "¿Seguro que deseas eliminar esta tarea? Se borrarán las entregas que tengan los alumnos de ella.",
      )
    )
      return;
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignId);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      loadCourseContent(selectedCourseId);
    }
  };

  // ===============================
  // CREACIÓN DE EXÁMENES (QUIZZES) Y PREGUNTAS
  // ===============================
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizModuleId || !quizTitle.trim()) {
      alert(
        "Por favor selecciona un módulo e ingresa un título para el examen.",
      );
      return;
    }

    try {
      const { error } = await supabase.from("quizzes").insert({
        module_id: quizModuleId,
        title: quizTitle.trim(),
        description: quizDesc.trim() || null,
      });

      if (error) throw error;
      setQuizTitle("");
      setQuizDesc("");
      loadCourseContent(selectedCourseId);
      alert("¡Examen (Cuestionario) creado de forma exitosa!");
    } catch (err) {
      alert("Error al crear el examen: " + err.message);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (
      !confirm(
        "¿Eliminar este examen junto con todas sus preguntas y calificaciones registradas?",
      )
    )
      return;
    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (error) {
      alert("Error al eliminar examen: " + error.message);
    } else {
      loadCourseContent(selectedCourseId);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (
      !selectedQuizId ||
      !questionText.trim() ||
      !optA.trim() ||
      !optB.trim() ||
      !optC.trim() ||
      !optD.trim()
    ) {
      alert(
        "Por favor rellena la pregunta, todas las opciones y la respuesta correcta.",
      );
      return;
    }

    try {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: selectedQuizId,
        question_text: questionText.trim(),
        option_a: optA.trim(),
        option_b: optB.trim(),
        option_c: optC.trim(),
        option_d: optD.trim(),
        correct_option: correctOption,
      });

      if (error) throw error;
      setQuestionText("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setCorrectOption("A");
      loadCourseContent(selectedCourseId);
      alert("¡Pregunta añadida exitosamente al examen!");
    } catch (err) {
      alert("Error al guardar la pregunta: " + err.message);
    }
  };

  const handleDeleteQuestion = async (questId) => {
    if (!confirm("¿Seguro que deseas eliminar esta pregunta?")) return;
    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", questId);
    if (error) {
      alert("Error al eliminar la pregunta: " + error.message);
    } else {
      loadCourseContent(selectedCourseId);
    }
  };

  const filteredUsers = users.filter((u) => {
    const search = searchQuery.toLowerCase();
    const fullName = (u.full_name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const role = (u.role || "").toLowerCase();
    return (
      fullName.includes(search) ||
      email.includes(search) ||
      role.includes(search)
    );
  });

  return (
    <div className="body-admin">
      <div className="header-admin">
        <h1>Panel de Administración - ABC Digital STEAM</h1>
        <button className="btn-logout-admin" onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      <div className="container-button">
        <button
          className={`button-tab-nav ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          Gestionar Usuarios
        </button>
        <button
          className={`button-tab-nav ${tab === "courses" ? "active" : ""}`}
          onClick={() => setTab("courses")}
        >
          Gestionar Cursos
        </button>
        <button
          className={`button-tab-nav ${tab === "temarios" ? "active" : ""}`}
          onClick={() => setTab("temarios")}
        >
          📚 Contenidos Temarios
        </button>
        <button
          className={`button-tab-nav ${tab === "create-user" ? "active" : ""}`}
          onClick={() => setTab("create-user")}
        >
          Crear Usuario
        </button>
        <button
          className={`button-tab-nav ${tab === "create-course" ? "active" : ""}`}
          onClick={() => setTab("create-course")}
        >
          Crear Curso
        </button>
      </div>

      <div className="container-body-admin">
        {/* TABLA DE GESTIÓN DE USUARIOS */}
        {tab === "users" && (
          <div className="container-manage-users">
            <div className="manage-users-header">
              <h2>Gestionar Usuarios ({filteredUsers.length})</h2>
              <div className="search-bar-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o rol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Email institucional</th>
                  <th>Rol / Acceso</th>
                  <th>Estado</th>
                  <th>Acciones de Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: "bold" }}>{u.full_name || "-"}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`user-role-tag ${u.role}`}>
                        {u.role === "admin"
                          ? "Administrador"
                          : u.role === "teacher"
                            ? "Profesor"
                            : "Estudiante"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`user-status ${u.blocked ? "blocked" : "active"}`}
                      >
                        {u.blocked ? "Bloqueado" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions-cell">
                        <button
                          className={`btn-toggle-block ${u.blocked ? "unlock" : "block"}`}
                          onClick={() => handleToggleBlock(u.id, u.blocked)}
                        >
                          {u.blocked ? "Desbloquear" : "Bloquear"}
                        </button>
                        <button
                          className="btn-change-password"
                          onClick={() => handleChangePassword(u.id, u.email)}
                        >
                          🔑 Clave
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABLA DE GESTIÓN DE CURSOS */}
        {tab === "courses" && (
          <div className="container-manage-courses">
            <h2>Gestionar Cursos Activos</h2>
            <div className="manage-courses-body">
              {courses.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: "2rem",
                  }}
                >
                  Aún no se han creado cursos en la plataforma.
                </p>
              ) : (
                courses.map((c) => (
                  <div className="courses" key={c.id}>
                    <div className="course-info-card">
                      <strong>{c.name}</strong>{" "}
                      <span className="course-code-badge">{c.code}</span>
                      <p>{c.description || "Sin descripción registrada"}</p>
                      {c.thumbnail_url && (
                        <img
                          src={getCorrectUrl(c.thumbnail_url)}
                          alt={c.name}
                          className="course-thumbnail"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTENIDOS Y TEMARIOS (MÓDULOS, LECCIONES Y EXÁMENES) */}
        {tab === "temarios" && (
          <div className="container-manage-courses">
            <h2>Estructura de Contenidos y Evaluaciones</h2>
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Seleccionar Curso a Configurar:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">-- Elige un curso --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedCourseId && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2rem",
                }}
              >
                {/* COLUMNA IZQUIERDA: FORMULARIOS DE CREACIÓN */}
                <div>
                  {/* Formulario 1: Módulos */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3>1. Crear Nuevo Módulo</h3>
                    <form
                      onSubmit={handleCreateModule}
                      style={{ display: "flex", gap: "0.5rem" }}
                    >
                      <input
                        type="text"
                        placeholder="Título del Módulo (ej. Módulo 1: Robótica Básica)"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="btn-submit"
                        style={{
                          margin: 0,
                          width: "auto",
                          padding: "0 1.5rem",
                        }}
                      >
                        Añadir
                      </button>
                    </form>
                  </div>

                  {/* Formulario 2: Lecciones con Video y Recurso PDF */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3>
                      2. Añadir Clase / Lección (Video y Material de Lectura)
                    </h3>
                    <form onSubmit={handleCreateLesson} className="admin-form">
                      <select
                        value={selectedModuleId}
                        onChange={(e) => setSelectedModuleId(e.target.value)}
                        required
                      >
                        <option value="">
                          -- Seleccionar Módulo Destino --
                        </option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Título de la clase (ej. Clase 1.2: Sensores)"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        required
                      />
                      <input
                        type="url"
                        placeholder="Enlace del Video de Clase (YouTube o Vimeo)"
                        value={newLessonVideo}
                        onChange={(e) => setNewLessonVideo(e.target.value)}
                      />
                      <textarea
                        placeholder="Explicación teórica, actividades, instrucciones..."
                        value={newLessonContent}
                        onChange={(e) => setNewLessonContent(e.target.value)}
                        rows="4"
                      />
                      <div
                        style={{
                          background: "var(--bg-main)",
                          padding: "1rem",
                          borderRadius: "8px",
                          border: "1px dashed var(--border-light)",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          📁 Adjuntar Guía o Documento de Apoyo (PDF, Word,
                          PPTX):
                        </label>
                        <input
                          id="lesson-file-input"
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) =>
                            setNewLessonResource(e.target.files[0])
                          }
                          style={{ border: "none", padding: 0 }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={uploadingResource}
                        className="btn-submit"
                      >
                        {uploadingResource
                          ? "Subiendo archivos..."
                          : "Publicar Clase"}
                      </button>
                    </form>
                  </div>

                  {/* Formulario 3: Publicar Tarea para el Módulo */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3>3. Publicar Pauta de Tarea / Proyecto</h3>
                    <form
                      onSubmit={handleCreateAssignment}
                      className="admin-form"
                    >
                      <select
                        value={assignModuleId}
                        onChange={(e) => setAssignModuleId(e.target.value)}
                        required
                      >
                        <option value="">
                          -- Seleccionar Módulo Destino --
                        </option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Título de la Tarea (ej. Proyecto Práctico Semanal)"
                        value={assignTitle}
                        onChange={(e) => setAssignTitle(e.target.value)}
                        required
                      />
                      <textarea
                        placeholder="Especificaciones, pautas de evaluación y formato de entrega..."
                        value={assignDesc}
                        onChange={(e) => setAssignDesc(e.target.value)}
                        rows="3"
                        required
                      />
                      <input
                        type="datetime-local"
                        value={assignDueDate}
                        onChange={(e) => setAssignDueDate(e.target.value)}
                        required
                      />
                      <div
                        style={{
                          background: "var(--bg-main)",
                          padding: "1rem",
                          borderRadius: "8px",
                          border: "1px dashed var(--border-light)",
                          marginTop: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          📁 Adjuntar Guía de Tarea o Plantilla en PDF
                          (Opcional):
                        </label>
                        <input
                          id="assign-file-input"
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => setAssignFile(e.target.files[0])}
                          style={{ border: "none", padding: 0 }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={uploadingAssign}
                        className="btn-submit"
                      >
                        {uploadingAssign
                          ? "Subiendo Guía..."
                          : "Publicar Tarea"}
                      </button>
                    </form>
                  </div>

                  {/* Formulario 4: Crear Examen */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "1.5rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3>4. Crear Nuevo Examen (Cuestionario)</h3>
                    <form onSubmit={handleCreateQuiz} className="admin-form">
                      <select
                        value={quizModuleId}
                        onChange={(e) => setQuizModuleId(e.target.value)}
                        required
                      >
                        <option value="">
                          -- Seleccionar Módulo Destino --
                        </option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Nombre de la Evaluación (ej. Examen de Fundamentos)"
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        required
                      />
                      <textarea
                        placeholder="Instrucciones generales de la evaluación..."
                        value={quizDesc}
                        onChange={(e) => setQuizDesc(e.target.value)}
                        rows="2"
                      />
                      <button type="submit" className="btn-submit">
                        Crear Examen
                      </button>
                    </form>
                  </div>

                  {/* Formulario 5: Añadir Preguntas al Examen */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      padding: "1.5rem",
                      borderRadius: "10px",
                    }}
                  >
                    <h3>5. Añadir Pregunta de Selección Múltiple</h3>
                    <form
                      onSubmit={handleCreateQuestion}
                      className="admin-form"
                    >
                      <select
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        required
                      >
                        <option value="">
                          -- Seleccionar Examen Destino --
                        </option>
                        {quizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                      <textarea
                        placeholder="Escribe el enunciado de la pregunta..."
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        rows="3"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Opción A"
                        value={optA}
                        onChange={(e) => setOptA(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Opción B"
                        value={optB}
                        onChange={(e) => setOptB(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Opción C"
                        value={optC}
                        onChange={(e) => setOptC(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Opción D"
                        value={optD}
                        onChange={(e) => setOptD(e.target.value)}
                        required
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <label style={{ fontWeight: "bold" }}>
                          Opción Correcta:
                        </label>
                        <select
                          value={correctOption}
                          onChange={(e) => setCorrectOption(e.target.value)}
                          style={{ width: "80px" }}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                      <button type="submit" className="btn-submit">
                        Guardar Pregunta
                      </button>
                    </form>
                  </div>
                </div>

                {/* COLUMNA DERECHA: ARBOL DE TEMARIOS ACTUALES */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.15)",
                    padding: "1.5rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-muted)",
                  }}
                >
                  <h3>Temario Actual de la Asignatura</h3>
                  {modules.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>
                      Aún no has creado ningún módulo o clase para este curso.
                    </p>
                  ) : (
                    modules.map((m, mIdx) => {
                      const modLessons = lessons.filter(
                        (l) => l.module_id === m.id,
                      );
                      const modAssigns = assignments.filter(
                        (a) => a.module_id === m.id,
                      );
                      const modQuizzes = quizzes.filter(
                        (q) => q.module_id === m.id,
                      );

                      return (
                        <div
                          key={m.id}
                          style={{
                            marginBottom: "1.5rem",
                            paddingBottom: "1.5rem",
                            borderBottom: "1px solid var(--border-muted)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <strong style={{ color: "var(--primary)" }}>
                              Módulo {mIdx + 1}: {m.title}
                            </strong>
                            <button
                              onClick={() => handleDeleteModule(m.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--error)",
                                cursor: "pointer",
                              }}
                              title="Eliminar Módulo"
                            >
                              ❌ Borrar Módulo
                            </button>
                          </div>
                          <ul
                            style={{
                              paddingLeft: "1.2rem",
                              marginTop: "0.5rem",
                              color: "var(--text-main)",
                            }}
                          >
                            {/* Mostrar Lecciones */}
                            {modLessons.map((l) => (
                              <li
                                key={l.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.9rem",
                                  margin: "0.4rem 0",
                                }}
                              >
                                <span>
                                  🎥 {l.title}{" "}
                                  {l.resource_url && (
                                    <span
                                      style={{
                                        color: "var(--success)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      (📁 {l.resource_name})
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => handleDeleteLesson(l.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#64748b",
                                    cursor: "pointer",
                                  }}
                                >
                                  🗑️
                                </button>
                              </li>
                            ))}

                            {/* Mostrar Tareas */}
                            {modAssigns.map((a) => (
                              <li
                                key={a.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.9rem",
                                  margin: "0.4rem 0",
                                  color: "#60a5fa",
                                }}
                              >
                                <span>
                                  📝 Tarea: {a.title}
                                  {a.resource_url && (
                                    <span
                                      style={{
                                        color: "var(--success)",
                                        fontSize: "0.8rem",
                                        marginLeft: "0.5rem",
                                      }}
                                    >
                                      (📁{" "}
                                      <a
                                        href={getCorrectUrl(a.resource_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "var(--success)",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {a.resource_name || "guia.pdf"}
                                      </a>
                                      )
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={() => handleDeleteAssignment(a.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--error)",
                                    cursor: "pointer",
                                  }}
                                >
                                  🗑️
                                </button>
                              </li>
                            ))}

                            {/* Mostrar Exámenes */}
                            {modQuizzes.map((q) => {
                              const quizQuests = quizQuestions.filter(
                                (qu) => qu.quiz_id === q.id,
                              );
                              return (
                                <li
                                  key={q.id}
                                  style={{
                                    fontSize: "0.9rem",
                                    margin: "0.8rem 0",
                                    color: "#f59e0b",
                                    background: "rgba(245, 158, 11, 0.05)",
                                    padding: "0.5rem",
                                    borderRadius: "6px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span>
                                      ⚡ Examen: <strong>{q.title}</strong>
                                    </span>
                                    <button
                                      onClick={() => handleDeleteQuiz(q.id)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--error)",
                                        cursor: "pointer",
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                  <ul
                                    style={{
                                      paddingLeft: "1rem",
                                      color: "var(--text-muted)",
                                      fontSize: "0.85rem",
                                      marginTop: "0.25rem",
                                    }}
                                  >
                                    {quizQuests.map((qu, quIdx) => (
                                      <li
                                        key={qu.id}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          margin: "0.2rem 0",
                                        }}
                                      >
                                        <span>
                                          {quIdx + 1}. {qu.question_text} (Resp:{" "}
                                          <strong>{qu.correct_option}</strong>)
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleDeleteQuestion(qu.id)
                                          }
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          Borr.
                                        </button>
                                      </li>
                                    ))}
                                    {quizQuests.length === 0 && (
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          fontStyle: "italic",
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        Este examen no tiene preguntas aún.
                                      </span>
                                    )}
                                  </ul>
                                </li>
                              );
                            })}

                            {modLessons.length === 0 &&
                              modAssigns.length === 0 &&
                              modQuizzes.length === 0 && (
                                <p
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  Sin lecciones, tareas o evaluaciones
                                  configuradas.
                                </p>
                              )}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA CREACIÓN DE USUARIO */}
        {tab === "create-user" && (
          <CreateUserTab onCreated={loadUsers} supabaseAdmin={supabaseAdmin} />
        )}

        {/* PESTAÑA CREACIÓN DE CURSO */}
        {tab === "create-course" && (
          <CreateCourseTab onCreated={loadCourses} teachers={teachers} />
        )}
      </div>
    </div>
  );
};

const CreateUserTab = ({ onCreated, supabaseAdmin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullcedula, setFulCedula] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const hasServiceKey = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (hasServiceKey) {
        const { data: adminData, error: adminError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (adminError) throw adminError;
        const userId = adminData.user.id;

        await supabase.from("profiles").insert({
          id: userId,
          email,
          full_name: fullName,
          role,
          cedula: fullcedula,
        });

        if (role === "student") {
          await supabase.from("student_profiles").insert({
            user_id: userId,
            student_id: `STU-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            department,
            enrollment_year: new Date().getFullYear(),
          });
        } else if (role === "teacher") {
          await supabase.from("teacher_profiles").insert({
            user_id: userId,
            employee_id: `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            department,
            title: "Profesor",
          });
        }
      } else {
        const { error } = await supabase.functions.invoke("admin-actions", {
          body: {
            action: "create-user",
            email,
            password,
            fullName,
            role,
            cedula: fullcedula,
            department,
          },
        });
        if (error) throw error;
      }

      setMessage("Usuario creado exitosamente");
      setEmail("");
      setPassword("");
      setFullName("");
      setFulCedula("");
      setDepartment("");
      setRole("student");
      onCreated();
    } catch (err) {
      setMessage("Error al crear usuario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-create-user">
      <h2>Crear Nuevo Usuario</h2>
      <form onSubmit={handleCreate} className="admin-form">
        <div className="form-group-grid">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña Inicial"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Nombre Completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Número de Cédula"
            value={fullcedula}
            onChange={(e) => setFulCedula(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
            <option value="admin">Administrador</option>
          </select>
          <input
            type="text"
            placeholder="Grado / Departamento"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`btn-submit ${loading ? "loading" : ""}`}
        >
          {loading ? "Registrando..." : "Registrar Nuevo Usuario"}
        </button>
      </form>
      {message && (
        <p
          className={`alert-message ${message.toLowerCase().includes("error") ? "error" : "success"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

const CreateCourseTab = ({ onCreated, teachers }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.from("courses").insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        teacher_id: teacherId || null,
      });
      if (error) throw error;

      setMessage("¡Curso registrado exitosamente!");
      setName("");
      setCode("");
      setDescription("");
      setThumbnailUrl("");
      setTeacherId("");
      onCreated();
    } catch (err) {
      setMessage("Error al crear curso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-create-course">
      <h2>Crear Nuevo Curso</h2>
      <form onSubmit={handleCreate} className="admin-form">
        <input
          type="text"
          placeholder="Nombre del curso"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código (ej. ROB101)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción del curso..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="4"
        />
        <input
          type="url"
          placeholder="URL de la imagen de portada"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">-- Asignar Profesor --</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className={`btn-submit ${loading ? "loading" : ""}`}
        >
          {loading ? "Guardando..." : "Crear y Publicar Curso"}
        </button>
      </form>
      {message && (
        <p
          className={`alert-message ${message.toLowerCase().includes("error") ? "error" : "success"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default AdminPanel;
