import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const Documents = () => {
  const { user, profile } = useAuth(); // ← OBTENEMOS profile desde AuthContext
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const documentTypes = ["cedula", "diploma_bachiller", "diploma_tecnico"];

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error cargando documentos:", error);
    } else {
      setDocuments(data || []);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentType) {
      setMessage("Selecciona tipo y archivo");
      return;
    }

    if (!profile?.cedula) {
      setMessage("Por favor, ingresa tu número de cédula en tu perfil primero");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const isPDF = file.type === "application/pdf";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "funeon-documents");
      formData.append("folder", `documents/${user.id}/${documentType}`);

      // ✅ public_id SIN extensión
      formData.append("public_id", `${profile.cedula}_${documentType}`);

      // 🚨 PDF = IMAGE (NO RAW)
      const uploadEndpoint = isPDF ? "image" : "auto";

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        }/${uploadEndpoint}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      console.log("Cloudinary response:", result);

      if (!result.secure_url) {
        throw new Error(result.error?.message || "Error en Cloudinary");
      }

      await supabase.from("documents").insert({
        user_id: user.id,
        document_type: documentType,
        url: result.secure_url,
      });

      setMessage("Documento subido correctamente");
      loadDocuments();
      setFile(null);
      setDocumentType("");

      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "white",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          color: "#f59e0b",
          textAlign: "center",
          fontSize: "3rem",
          marginBottom: "2rem",
        }}
      >
        Mis Documentos
      </h1>
      <button
        onClick={() => window.history.back()}
        style={{
          background: "#1f2937",
          color: "#f59e0b",
          border: "2px solid #f59e0b",
          padding: "0.75rem 1.5rem",
          borderRadius: "12px",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: "2rem",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        ⬅ Volver atrás
      </button>
      {/* FORMULARIO */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto 4rem auto",
          background: "#1a1a1a",
          padding: "2rem",
          borderRadius: "16px",
        }}
      >
        <h2 style={{ color: "#f59e0b", marginBottom: "1rem" }}>
          Subir Nuevo Documento
        </h2>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          style={{
            width: "100%",
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            background: "#222",
            color: "white",
          }}
        >
          <option value="">Selecciona tipo</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace("_", " ").toUpperCase()}
            </option>
          ))}
        </select>
        <input
          id="file-input"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{
            width: "100%",
            padding: "1rem",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            background: "#222",
            color: "white",
          }}
        />
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#666" : "#f59e0b",
            color: "#111",
            padding: "1rem",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Subiendo..." : "Subir Documento"}
        </button>
        {message && (
          <p
            style={{
              marginTop: "1rem",
              color: message.includes("Error") ? "red" : "green",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
      </div>

      {/* LISTA */}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ color: "#f59e0b", marginBottom: "1rem" }}>
          Documentos Subidos
        </h2>
        {documents.length === 0 ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>
            No has subido documentos aún.
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "#1a1a1a",
                padding: "1.5rem",
                borderRadius: "12px",
                marginBottom: "1rem",
                boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
              }}
            >
              <h3 style={{ marginBottom: "0.5rem", color: "#f59e0b" }}>
                {doc.document_type.replace("_", " ").toUpperCase()}
              </h3>
              <p style={{ color: "#aaa", marginBottom: "1rem" }}>
                Subido el {new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
              <a
                href={`${doc.url}?dl=true`} // ← ARREGLA LA URL PARA RAW/PDF
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#166534",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                Ver / Descargar Documento
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Documents;
