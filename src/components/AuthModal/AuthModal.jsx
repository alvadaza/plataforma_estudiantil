import React, { useState } from "react";
import "./AuthModal.css";
import { supabase } from "../../lib/supabaseClient";

const AuthModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          "Tu cuenta ha sido bloqueada. Comunícate con soporte@funeon.edu.co"
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // ✅ NO navegamos aquí
      // ✅ NO cerramos el modal
      // App.jsx reaccionará al cambio de sesión
      setMessage("¡Bienvenido de vuelta!");
    } catch (error) {
      setMessage(
        error.message.includes("Invalid login")
          ? "Correo o contraseña incorrectos"
          : "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-overlay">
      {/* Eliminamos onClick={onClose} del overlay */}
      <div className="auth-modal-container">
        {/* Eliminamos onClick={(e) => e.stopPropagation()} del contenedor */}

        <div className="auth-image-side">
          <div className="image-content">
            <h1 className="logo-text">Plataforma Educativa</h1>
          </div>
        </div>

        <div className="auth-form-side">
          {/* Solo este botón cierra el modal */}
          <button className="close-btn" onClick={onClose}>
            ×
          </button>

          <h2 className="auth-title">
            {recovering ? "Recuperar Contraseña" : "Iniciar Sesión"}
          </h2>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Correo institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />

            {!recovering && (
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Procesando..." : "Entrar"}
            </button>
          </form>

          <p className="recover-link">
            {!recovering ? (
              <span onClick={() => setRecovering(true)}>
                ¿Olvidaste tu contraseña?
              </span>
            ) : (
              <span onClick={() => setRecovering(false)}>← Volver</span>
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
