import React, { useState, useEffect } from "react";
import "./ToastNotification.css";

const ToastNotification = () => {
  const [toasts, setToasts] = useState([]);

  // Función global para mostrar toast (la expondremos)
  useEffect(() => {
    window.showToast = (message, type = "info", duration = 5000) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  const getColor = (type) => {
    switch (type) {
      case "success":
        return "#166534";
      case "error":
        return "#7f1d1d";
      case "warning":
        return "#f59e0b";
      case "info":
      default:
        return "#1e40af";
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast"
          style={{ borderLeft: `5px solid ${getColor(toast.type)}` }}
        >
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-message">{toast.message}</div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
