import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./Profile.css";

const Profile = () => {
  const { user, profile: authProfile, isStudent, isTeacher } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editMode, setEditMode] = useState(false);

  // Estado simple
  const [profileData, setProfileData] = useState({
    full_name: "",
    avatar_url: "",
    email: "",
    // Datos específicos
    student_id: "",
    department: "",
    enrollment_year: "",
    phone: "",
    address: "",
    emergency_contact: { name: "", phone: "", relationship: "" },
    cedula: "",
  });

  /* =========================
     CARGAR PERFIL
  ========================= */
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // 1. Datos básicos del usuario
        const initialData = {
          full_name: authProfile?.full_name || "",
          avatar_url: authProfile?.avatar_url || "",
          email: user.email || "",
          cedula: authProfile?.cedula || "",
        };

        // 2. Datos específicos
        let specificData = {};

        if (isStudent) {
          const { data: studentProfile, error } = await supabase
            .from("student_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (!error && studentProfile) {
            specificData = {
              student_id: studentProfile.student_id || "",
              department: studentProfile.department || "",
              enrollment_year: studentProfile.enrollment_year || "",
              phone: studentProfile.phone || "",
              address: studentProfile.address || "",
              emergency_contact: studentProfile.emergency_contact || {
                name: "",
                phone: "",
                relationship: "",
                cedula: "",
              },
            };
          }
        }

        if (isTeacher) {
          const { data: teacherProfile, error } = await supabase
            .from("teacher_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (!error && teacherProfile) {
            specificData = {
              employee_id: teacherProfile.employee_id || "",
              department: teacherProfile.department || "",
              title: teacherProfile.title || "",
              bio: teacherProfile.bio || "",
            };
          }
        }

        // 3. Combinar datos
        setProfileData({
          ...initialData,
          ...specificData,
        });
      } catch (error) {
        console.error("Error cargando perfil:", error);
        setMessage({ type: "error", text: "Error cargando perfil" });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, authProfile, isStudent, isTeacher]);

  /* =========================
     SUBIR AVATAR A CLOUDINARY (SIMPLE)
  ========================= */
  const uploadAvatarToCloudinary = async (file) => {
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Cloudinary no configurado. Añade VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env"
        );
      }

      // Validar que sea imagen
      if (!file.type.startsWith("image/")) {
        throw new Error("Solo se permiten imágenes (JPG, PNG, GIF)");
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("La imagen debe ser menor a 5MB");
      }

      // Crear FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "funeon/avatars");
      formData.append("tags", `user_${user.id}`);

      // Optimización automática
      formData.append("quality", "auto:good");
      formData.append("fetch_format", "auto");

      // Subir a Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error subiendo imagen");
      }

      const data = await response.json();
      return data.secure_url; // URL de la imagen en Cloudinary
    } catch (error) {
      console.error("Error subiendo avatar:", error);
      throw error;
    }
  };

  /* =========================
     MANEJAR SUBIDA DE AVATAR
  ========================= */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      // 1. Subir a Cloudinary
      const cloudinaryUrl = await uploadAvatarToCloudinary(file);

      // 2. Guardar URL en Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: cloudinaryUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // 3. Actualizar estado local
      setProfileData((prev) => ({ ...prev, avatar_url: cloudinaryUrl }));

      setMessage({
        type: "success",
        text: "✅ Avatar actualizado correctamente",
      });

      // Auto-ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error completo:", error);

      let errorMessage = "Error subiendo avatar";
      if (error.message.includes("5MB")) {
        errorMessage = "La imagen es muy grande. Usa una imagen menor a 5MB.";
      } else if (error.message.includes("Solo se permiten")) {
        errorMessage = "Solo se permiten imágenes JPG, PNG o GIF.";
      } else if (error.message.includes("Cloudinary no configurado")) {
        errorMessage =
          "Cloudinary no está configurado. Contacta al administrador.";
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     GUARDAR PERFIL (solo datos, no avatar)
  ========================= */
  const handleSaveProfile = async () => {
    if (!user || !editMode) return;

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (isStudent) {
        const { error } = await supabase.from("student_profiles").upsert(
          {
            user_id: user.id,
            department: profileData.department,
            enrollment_year: profileData.enrollment_year
              ? parseInt(profileData.enrollment_year)
              : null,
            phone: profileData.phone,
            address: profileData.address,
            emergency_contact: profileData.emergency_contact,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

        if (error) throw error;
      }

      if (isTeacher) {
        const { error } = await supabase.from("teacher_profiles").upsert(
          {
            user_id: user.id,
            department: profileData.department,
            title: profileData.title,
            bio: profileData.bio,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

        if (error) throw error;
      }

      setEditMode(false);
      setMessage({
        type: "success",
        text: "✅ Perfil actualizado correctamente",
      });

      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error guardando perfil:", error);
      setMessage({ type: "error", text: `Error: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     MANEJAR CAMBIOS SIMPLES
  ========================= */
  const handleChange = (e) => {
    if (!editMode) return;

    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (field, value) => {
    if (!editMode) return;

    setProfileData((prev) => ({
      ...prev,
      emergency_contact: {
        ...prev.emergency_contact,
        [field]: value,
      },
    }));
  };

  /* =========================
     RENDER SIMPLE
  ========================= */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="unauthenticated">
        <h1>No estás autenticado</h1>
        <a href="/">Volver al inicio</a>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* HEADER */}
      <div className="profile-header">
        <div className="header-top">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Volver
          </button>
          <h1>Mi Perfil</h1>
          <div className="header-actions">
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="btn-edit">
                ✏️ Editar Perfil
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="btn-cancel"
                >
                  ✕ Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-save"
                >
                  {saving ? "💾 Guardando..." : "💾 Guardar Cambios"}
                </button>
              </>
            )}
          </div>
        </div>
        <p className="profile-subtitle">
          {isTeacher ? "👨‍🏫 Profesor" : "🎓 Estudiante"}
          {editMode && <span className="edit-badge">Editando</span>}
        </p>
      </div>

      {/* MENSAJES */}
      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="profile-content">
        {/* SECCIÓN 1: INFORMACIÓN PERSONAL */}
        <div className="profile-section">
          <h2 className="section-title">
            <span className="icon">👤</span> Información Personal
          </h2>

          {/* AVATAR - SIEMPRE EDITABLE */}
          <div className="avatar-section">
            <div className="avatar-container">
              {profileData.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt="Avatar"
                  className="avatar"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}

              <div
                className={`avatar-placeholder ${
                  profileData.avatar_url ? "hidden" : ""
                }`}
              >
                {profileData.full_name?.[0]?.toUpperCase() ||
                  profileData.email?.[0]?.toUpperCase() ||
                  profileData.cedula?.[0]?.toUpperCase() ||
                  "?"}
              </div>

              <label className="avatar-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={saving}
                />
                {saving ? "📤 Subiendo..." : "📷 Cambiar Foto"}
              </label>

              {saving && (
                <div className="upload-progress">
                  <div className="spinner-small"></div>
                  <span>Subiendo imagen...</span>
                </div>
              )}
            </div>
          </div>

          {/* DATOS BÁSICOS */}
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                value={profileData.full_name}
                disabled
                className="disabled-input"
              />
              <small className="field-note">
                Contacta al administrador para cambios
              </small>
            </div>
            <div className="form-group">
              <label>Cedula</label>
              <input
                type="text"
                value={profileData.cedula}
                disabled
                className="disabled-input"
              />
              <small className="field-note">
                Contacta al administrador para cambios
              </small>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="disabled-input"
              />
              <small className="field-note">No editable</small>
            </div>

            <div className="form-group">
              <label>Rol</label>
              <input
                type="text"
                value={isTeacher ? "Profesor" : "Estudiante"}
                disabled
                className="disabled-input"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: INFORMACIÓN ESPECÍFICA */}
        <div className="profile-section">
          <h2 className="section-title">
            <span className="icon">{isTeacher ? "👨‍🏫" : "🎓"}</span>
            {isTeacher ? "Información Profesional" : "Información Académica"}
          </h2>

          {isTeacher ? (
            <div className="form-grid">
              <div className="form-group">
                <label>ID de Empleado</label>
                <input
                  type="text"
                  value={profileData.employee_id}
                  disabled
                  className="disabled-input"
                />
                <small className="field-note">No editable</small>
              </div>

              <div className="form-group">
                <label>Título/Posición</label>
                <input
                  type="text"
                  name="title"
                  value={profileData.title}
                  onChange={handleChange}
                  placeholder="Ej: Profesor Titular"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              <div className="form-group">
                <label>Departamento</label>
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleChange}
                  placeholder="Ej: Departamento de Ciencias"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              <div className="form-group full-width">
                <label>Biografía</label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleChange}
                  placeholder="Describe tu experiencia profesional..."
                  rows="3"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group">
                <label>ID de Estudiante</label>
                <input
                  type="text"
                  value={profileData.student_id}
                  disabled
                  className="disabled-input"
                />
                <small className="field-note">No editable</small>
              </div>

              <div className="form-group">
                <label>Departamento/Facultad</label>
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleChange}
                  placeholder="Ej: Facultad de Ingeniería"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              <div className="form-group">
                <label>Año de Matrícula</label>
                <input
                  type="number"
                  name="enrollment_year"
                  value={profileData.enrollment_year}
                  onChange={handleChange}
                  placeholder="2024"
                  min="2000"
                  max="2030"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  placeholder="+51 999 888 777"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              <div className="form-group full-width">
                <label>Dirección</label>
                <textarea
                  name="address"
                  value={profileData.address}
                  onChange={handleChange}
                  placeholder="Av. Principal 123, Ciudad"
                  rows="2"
                  disabled={!editMode || saving}
                  className={editMode ? "editable-input" : "disabled-input"}
                />
              </div>

              {/* CONTACTO DE EMERGENCIA */}
              <div className="form-group full-width">
                <h3 className="subsection-title">Contacto de Emergencia</h3>
                <div className="emergency-grid">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={profileData.emergency_contact?.name}
                      onChange={(e) =>
                        handleEmergencyContactChange("name", e.target.value)
                      }
                      placeholder="Nombre completo"
                      disabled={!editMode || saving}
                      className={editMode ? "editable-input" : "disabled-input"}
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      value={profileData.emergency_contact?.phone}
                      onChange={(e) =>
                        handleEmergencyContactChange("phone", e.target.value)
                      }
                      placeholder="Teléfono"
                      disabled={!editMode || saving}
                      className={editMode ? "editable-input" : "disabled-input"}
                    />
                  </div>
                  <div className="form-group">
                    <label>Parentesco</label>
                    <input
                      type="text"
                      value={profileData.emergency_contact?.relationship}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          "relationship",
                          e.target.value
                        )
                      }
                      placeholder="Padre, Madre, etc."
                      disabled={!editMode || saving}
                      className={editMode ? "editable-input" : "disabled-input"}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
