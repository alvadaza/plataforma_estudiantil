import React, { useState } from "react";
import "./AuthModal.css";
import { supabase } from "../../lib/supabaseClient";

// Íconos SVG vectoriales limpios y profesionales para Mostrar / Ocultar contraseña
const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.45 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AuthModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.blocked) {
        setMessage(
          "Tu cuenta ha sido bloqueada. Comunícate a abcdigital@gmail.com",
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setMessage("¡Bienvenido de vuelta! 🚀");
    } catch (error) {
      setMessage(
        error.message.includes("Invalid login")
          ? "Correo o contraseña incorrectos"
          : "Error al iniciar sesión: " + error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-overlay">
      <div className="auth-modal-container">
        <div className="auth-image-side">
          <div className="image-content">
            <h1 className="logo-text">Plataforma Educativa</h1>
          </div>
        </div>

        <div className="auth-form-side">
          <button className="close-btn" onClick={onClose}>
            ×
          </button>

          <h2 className="auth-title">
            {recovering ? "Recuperar Contraseña" : "Iniciar Sesión"}
          </h2>

          {!recovering ? (
            /* FORMULARIO DE INICIO DE SESIÓN */
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Correo institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />

              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                  style={{ paddingRight: "45px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary, #f59e0b)",
                    opacity: 0.85,
                    transition: "opacity 0.2s",
                  }}
                  title={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Procesando..." : "Entrar"}
              </button>
            </form>
          ) : (
            /* VISTA DE ASISTENCIA Y RECUPERACIÓN DIRECTA */
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                  textAlign: "left",
                }}
              >
                <h4
                  style={{
                    color: "#f59e0b",
                    margin: "0 0 0.5rem 0",
                    fontSize: "1rem",
                    fontWeight: "bold",
                  }}
                >
                  ✉️ Soporte para Reasignación de Clave
                </h4>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  Si olvidaste tu contraseña o tienes problemas para ingresar,
                  comunícate directamente con la administración enviando un
                  mensaje al correo:
                </p>
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    marginTop: "0.75rem",
                    textAlign: "center",
                    border: "1px dashed rgba(245, 158, 11, 0.4)",
                  }}
                >
                  <strong
                    style={{
                      color: "#ffffff",
                      fontSize: "1.05rem",
                      wordBreak: "break-all",
                    }}
                  >
                    abcdigital@gmail.com
                  </strong>
                </div>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    marginTop: "0.75rem",
                    marginBottom: 0,
                    lineHeight: "1.4",
                  }}
                >
                  El administrador actualizará tu contraseña directamente desde
                  el Panel de Control y te responderá con tu nueva clave de
                  acceso.
                </p>
              </div>
            </div>
          )}

          <p className="recover-link">
            {!recovering ? (
              <span
                onClick={() => {
                  setRecovering(true);
                  setMessage("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </span>
            ) : (
              <span
                onClick={() => {
                  setRecovering(false);
                  setMessage("");
                }}
              >
                ← Volver al inicio de sesión
              </span>
            )}
          </p>

          {message && (
            <p
              className={`auth-message ${
                message.includes("Bienvenido") ? "success" : "error"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
