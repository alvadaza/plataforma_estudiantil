import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const DOCUMENT_BUCKET = "student-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [
  { value: "cedula", label: "Cédula" },
  { value: "diploma_bachiller", label: "Diploma de bachiller" },
  { value: "diploma_tecnico", label: "Diploma técnico" },
  { value: "comprobante_pago", label: "Comprobante de pago" },
];

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    if (!user) return;

    setLoadingDocuments(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error cargando documentos:", error);
      setMessage(`Error cargando documentos: ${error.message}`);
      setLoadingDocuments(false);
      return;
    }

    const documentsWithLinks = await Promise.all(
      (data || []).map(async (document) => {
        if (!document.storage_path) return document;

        const { data: preview, error: previewError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .createSignedUrl(document.storage_path, 3600);
        const { data: download, error: downloadError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .createSignedUrl(document.storage_path, 3600, {
            download: document.file_name || true,
          });

        if (previewError || downloadError) {
          throw previewError || downloadError;
        }

        return {
          ...document,
          previewUrl: preview.signedUrl,
          downloadUrl: download.signedUrl,
        };
      }),
    ).catch((error) => {
      console.error("Error generando enlaces de documentos:", error);
      setMessage(`Error generando acceso a documentos: ${error.message}`);
      return null;
    });

    if (documentsWithLinks) setDocuments(documentsWithLinks);
    setLoadingDocuments(false);
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async () => {
    if (!file || !documentType) {
      setMessage("Selecciona el tipo de documento y el archivo.");
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setMessage("El archivo debe ser PDF, JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage("El archivo no puede superar los 10 MB.");
      return;
    }

    setLoading(true);
    setMessage("");

    const safeFileName = file.name.replace(/[^\w.-]/g, "_");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        document_type: documentType,
        url: storagePath,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
      });

      if (insertError) {
        const { error: cleanupError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .remove([storagePath]);
        if (cleanupError) {
          console.error("No se pudo limpiar un archivo sin registro:", cleanupError);
        }
        throw insertError;
      }

      setMessage("Documento subido correctamente.");
      setFile(null);
      setDocumentType("");
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
      await loadDocuments();
    } catch (error) {
      console.error("Error subiendo documento:", error);
      setMessage(`Error: ${error.message}`);
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
          onChange={(event) => setDocumentType(event.target.value)}
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
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <input
          id="file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          style={{
            width: "100%",
            padding: "1rem",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            background: "#222",
            color: "white",
          }}
        />
        <p style={{ color: "#aaa", marginTop: "-1rem", marginBottom: "1rem" }}>
          PDF o imagen; máximo 10 MB.
        </p>
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
            role="status"
            style={{
              marginTop: "1rem",
              color: message.startsWith("Error") ? "#f87171" : "#4ade80",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ color: "#f59e0b", marginBottom: "1rem" }}>
          Documentos Subidos
        </h2>
        {loadingDocuments ? (
          <p role="status" style={{ textAlign: "center", color: "#aaa" }}>
            Cargando documentos...
          </p>
        ) : documents.length === 0 ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>
            No has subido documentos aún.
          </p>
        ) : (
          documents.map((doc) => {
            const typeLabel =
              DOCUMENT_TYPES.find((type) => type.value === doc.document_type)
                ?.label || doc.document_type.replaceAll("_", " ");
            const previewUrl = doc.previewUrl || doc.url;
            const downloadUrl =
              doc.downloadUrl || (doc.url ? `${doc.url}?dl=true` : null);

            return (
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
                  {typeLabel.toUpperCase()}
                </h3>
                <p style={{ color: "#aaa", marginBottom: "1rem" }}>
                  Subido el{" "}
                  {new Date(doc.uploaded_at).toLocaleDateString("es-CO")}
                </p>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#166534",
                      color: "white",
                      padding: "1rem",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      textDecoration: "none",
                      display: "inline-block",
                      marginRight: "0.5rem",
                    }}
                  >
                    Visualizar
                  </a>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#1f2937",
                      color: "white",
                      padding: "1rem",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    Descargar
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Documents;
