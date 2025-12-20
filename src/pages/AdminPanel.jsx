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

  const { user, isAdmin, logout } = useAuth();

  const supabaseAdmin = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
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
        }}
      >
        <h1>Acceso Denegado</h1>
        <p>Solo el administrador puede acceder.</p>
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

  // === USUARIOS ===

  const handleToggleBlock = async (userId, blocked) => {
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: !blocked })
      .eq("id", userId);

    if (error) alert("Error: " + error.message);
    else loadUsers();
  };

  // === CURSOS ===
  const handleDeleteCourse = async (courseId) => {
    if (!confirm("¿Eliminar este curso permanentemente?")) return;

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);
    if (error) alert("Error: " + error.message);
    else {
      loadCourses();
      alert("Curso eliminado");
    }
  };

  const handleEditCourse = async (course) => {
    const newName = prompt("Nuevo nombre:", course.name);
    if (!newName) return;

    const newCode = prompt("Nuevo código:", course.code);
    const newDesc = prompt("Nueva descripción:", course.description);
    const newThumbnail = prompt(
      "Nueva URL de imagen:",
      course.thumbnail_url || ""
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

    if (error) alert("Error: " + error.message);
    else loadCourses();
  };

  return (
    <div className="body-admin">
      <div className="header-admin">
        <h1>Panel de Administración - Funeon</h1>
        <button onClick={logout}>Cerrar sesión</button>
      </div>

      <div className="container-button">
        <button
          className={`button-create-user ${
            tab === "create-user" ? "active" : ""
          }`}
          onClick={() => setTab("create-user")}
        >
          Crear Usuario
        </button>
        <button
          className={`button-create-course ${
            tab === "create-course" ? "active" : ""
          }`}
          onClick={() => setTab("create-course")}
        >
          Crear Curso
        </button>
        <button
          className={`button-manage-users ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          Gestionar Usuarios
        </button>
        <button
          className={`button-manage-courses ${
            tab === "courses" ? "active" : ""
          }`}
          onClick={() => setTab("courses")}
        >
          Gestionar Cursos
        </button>
      </div>

      <div className="container-body-admin">
        {tab === "create-user" && (
          <CreateUserTab onCreated={loadUsers} supabaseAdmin={supabaseAdmin} />
        )}
        {tab === "create-course" && (
          <CreateCourseTab onCreated={loadCourses} teachers={teachers} />
        )}

        {tab === "users" && (
          <div className="container-manage-users">
            <h2>Gestionar Usuarios</h2>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name || "-"}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span
                        className={`user-status ${
                          u.blocked ? "blocked" : "active"
                        }`}
                      >
                        {u.blocked ? "Bloqueado" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-toggle-block ${
                          u.blocked ? "unlock" : "block"
                        }`}
                        onClick={() => handleToggleBlock(u.id, u.blocked)}
                      >
                        {u.blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "courses" && (
          <div className="container-manage-courses">
            <h2>Gestionar Cursos</h2>
            <div className="manage-courses-body">
              {courses.map((c) => (
                <div className="courses" key={c.id}>
                  <div>
                    <strong>{c.name}</strong> ({c.code})
                    <p>{c.description || "Sin descripción"}</p>
                    {c.thumbnail_url && (
                      <img src={c.thumbnail_url} alt={c.name} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      className="edit"
                      onClick={() => handleEditCourse(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="delete"
                      onClick={() => handleDeleteCourse(c.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================= CREAR USUARIO (igual que antes) ========================= */
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
          student_id: `STU-${new Date().getFullYear()}-${Math.floor(
            Math.random() * 10000
          )}`,
          department,
          enrollment_year: new Date().getFullYear(),
        });
      } else if (role === "teacher") {
        await supabase.from("teacher_profiles").insert({
          user_id: userId,
          employee_id: `EMP-${new Date().getFullYear()}-${Math.floor(
            Math.random() * 10000
          )}`,
          department,
          title: "Profesor",
        });
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
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-create-user">
      <h2>Crear Nuevo Usuario</h2>
      <form onSubmit={handleCreate}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Numero Cedula"
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
          placeholder="Departamento"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`btn-submit ${loading ? "loading" : ""}`}
        >
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </form>
      {message && (
        <p
          className={`alert-message ${
            message.toLowerCase().includes("error") ? "error" : "success"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

/* ========================= CREAR CURSO (con profesores) ========================= */
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

      setMessage("Curso creado exitosamente");
      setName("");
      setCode("");
      setDescription("");
      setThumbnailUrl("");
      setTeacherId("");
      onCreated();
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-create-course">
      <h2>Crear Nuevo Curso</h2>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Nombre del curso"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Código (ej. DW101)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <textarea
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="url"
          placeholder="URL imagen del curso"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">-- Sin profesor --</option>
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
          {loading ? "Creando..." : "Crear Usuario"}
        </button>
      </form>
      {message && (
        <p
          className={`alert-message ${
            message.toLowerCase().includes("error") ? "error" : "success"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default AdminPanel;
