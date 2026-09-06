import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@supabase/supabase-js";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAdmin, logout } = useAuth();

  // NOTA DE SEGURIDAD:
  // Para desarrollo local, si usas la clave de rol de servicio (no recomendada en Netlify), se inicializa aquí.
  // En producción (Netlify), se recomienda usar una Edge Function para crear usuarios y cambiar claves de forma segura.
  const supabaseAdmin = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

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
          Solo el administrador puede acceder a este panel.
        </p>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
    loadCourses();
    loadTeachers();
  }, []);

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

  // ===============================
  // ACCIONES DE USUARIOS
  // ===============================

  // Bloquear / Desbloquear usuario
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

  // Cambiar contraseña de usuario (Admin Auth API)
  const handleChangePassword = async (userId, userEmail) => {
    const newPassword = prompt(
      `Introduce la nueva contraseña para el usuario ${userEmail}:`,
    );

    // Validaciones básicas
    if (newPassword === null) return; // Canceló el prompt
    if (newPassword.trim().length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres por seguridad.");
      return;
    }

    try {
      // Si existe la clave de servicio local, la usamos directamente (Desarrollo local)
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
        // En producción (Netlify), llamamos de forma segura a la Edge Function
        const { data, error } = await supabase.functions.invoke(
          "admin-actions",
          {
            body: {
              action: "change-password",
              userId,
              newPassword: newPassword.trim(),
            },
          },
        );
        if (error) throw error;
      }

      alert(`¡Contraseña para ${userEmail} actualizada exitosamente!`);
    } catch (err) {
      alert(
        "Error al cambiar la contraseña: " +
          err.message +
          "\n\nSi estás en producción (Netlify), asegúrate de haber desplegado la Edge Function 'admin-actions' en Supabase.",
      );
    }
  };

  // ===============================
  // ACCIONES DE CURSOS
  // ===============================
  const handleDeleteCourse = async (courseId) => {
    if (!confirm("¿Eliminar este curso permanentemente?")) return;
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      loadCourses();
      alert("Curso eliminado exitosamente");
    }
  };

  const handleEditCourse = async (course) => {
    const newName = prompt("Nuevo nombre:", course.name);
    if (!newName) return;
    const newCode = prompt("Nuevo código:", course.code);
    const newDesc = prompt("Nueva descripción:", course.description);
    const newThumbnail = prompt(
      "Nueva URL de imagen:",
      course.thumbnail_url || "",
    );

    const updates = {};
    if (newName !== course.name) updates.name = newName;
    if (newCode !== course.code) updates.code = newCode;
    if (newDesc !== course.description) updates.description = newDesc;
    if (newThumbnail !== course.thumbnail_url)
      updates.thumbnail_url = newThumbnail || null;

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", course.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      loadCourses();
    }
  };

  // Filtrar usuarios según la búsqueda
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
        {/* PESTAÑA GESTIONAR USUARIOS */}
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
                {searchQuery && (
                  <button
                    className="btn-clear-search"
                    onClick={() => setSearchQuery("")}
                  >
                    {"\u00d7"}
                  </button>
                )}
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
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ padding: "2rem", color: "var(--text-muted)" }}
                    >
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: "bold" }}>
                        {u.full_name || "-"}
                      </td>
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
                            title="Establecer una nueva contraseña para este usuario"
                          >
                            {"🔑 Cambiar Clave"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA GESTIONAR CURSOS */}
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
                          src={c.thumbnail_url}
                          alt={c.name}
                          className="course-thumbnail"
                        />
                      )}
                    </div>
                    <div className="course-actions-buttons">
                      <button
                        className="edit"
                        onClick={() => handleEditCourse(c)}
                      >
                        Editar Información
                      </button>
                      <button
                        className="delete"
                        onClick={() => handleDeleteCourse(c.id)}
                      >
                        Eliminar Curso
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA CREAR USUARIO */}
        {tab === "create-user" && (
          <CreateUserTab onCreated={loadUsers} supabaseAdmin={supabaseAdmin} />
        )}

        {/* PESTAÑA CREAR CURSO */}
        {tab === "create-course" && (
          <CreateCourseTab onCreated={loadCourses} teachers={teachers} />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: CREAR USUARIO
// ============================================================================
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
      // Si existe la clave de servicio local, la usamos directamente (Desarrollo local)
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
        // En producción (Netlify), llamamos a la Edge Function de Supabase para delegar todo el proceso de forma segura
        const { data, error } = await supabase.functions.invoke(
          "admin-actions",
          {
            body: {
              action: "create-user",
              email,
              password,
              fullName,
              role,
              cedula: fullcedula,
              department,
            },
          },
        );

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
            placeholder="Número de Cédula / ID"
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
            placeholder="Departamento Académico / Grado"
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
          {loading ? "Registrando en Supabase..." : "Registrar Nuevo Usuario"}
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

// ============================================================================
// COMPONENTE: CREAR CURSO
// ============================================================================
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
          placeholder="Nombre del curso (ej. Robótica e Inteligencia Artificial)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código de Referencia (ej. ROB101)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción del programa, competencias y temario..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="4"
        />
        <input
          type="url"
          placeholder="URL de la imagen de portada (Thumbnail)"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">-- Asignar Profesor Orientador --</option>
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
          {loading ? "Guardando en Base de Datos..." : "Crear y Publicar Curso"}
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
