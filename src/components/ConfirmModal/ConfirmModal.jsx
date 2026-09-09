import React from "react";
import "./ConfirmModal.css";

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">⚠️</div>
        <h3 className="modal-title">{title || "¿Estás seguro?"}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          <button className="btn-modal-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-modal-danger" onClick={onConfirm}>
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
