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

// Helper global para Notificaciones Flotantes de la plataforma (window.showToast)
const notify = (msg, type = "info") => {
  if (typeof window.showToast === "function") {
    window.showToast(msg, type);
  } else {
    console.log("[" + type + "]: " + msg);
  }
};

// Función auxiliar para extraer configuración de exámenes (Soporta columnas nativas y fallback en description)
const getQuizConfig = (quiz) => {
  if (!quiz)
    return { dueDate: null, durationMinutes: null, cleanDescription: "" };

  let dueDate = quiz.due_date || null;
  let durationMinutes = quiz.duration_minutes
    ? parseInt(quiz.duration_minutes)
    : null;
  let cleanDescription = quiz.description || "";

  if (cleanDescription && cleanDescription.includes("[CONFIG_QUIZ:")) {
    const match = cleanDescription.match(
      /\[CONFIG_QUIZ:due_date=(.*?)\|duration=(.*?)\]/,
    );
    if (match) {
      if (!dueDate && match[1]) dueDate = match[1];
      if (!durationMinutes && match[2]) durationMinutes = parseInt(match[2]);
      cleanDescription = cleanDescription
        .replace(/\[CONFIG_QUIZ:.*?\]/, "")
        .trim();
    }
  }

  return { dueDate, durationMinutes, cleanDescription };
};

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
  const [expandedQuizzes, setExpandedQuizzes] = useState({});
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
  const [quizDueDate, setQuizDueDate] = useState("");
  const [quizDurationMinutes, setQuizDurationMinutes] = useState("");

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctOption, setCorrectOption] = useState("A");
  const [questionType, setQuestionType] = useState("multiple"); // "multiple" o "matching"
  const [matchingPairs, setMatchingPairs] = useState([
    { p: "", r: "" },
    { p: "", r: "" },
    { p: "", r: "" },
    { p: "", r: "" },
    { p: "", r: "" },
  ]);

  // --- ESTADOS DE EDICIÓN DE CURSOS ---
  const [editingCourse, setEditingCourse] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [uploadingEditCover, setUploadingEditCover] = useState(false);

  // --- ESTADOS DE GESTIÓN Y MATRÍCULA DE USUARIOS (Luis Alvaro) ---
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentUser, setEnrollmentUser] = useState(null);
  const [editingUserObj, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Aceptar",
    onConfirm: null,
  });
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    userId: null,
    userEmail: "",
    newPassword: "",
  });
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserCedula, setEditUserCedula] = useState("");
  const [editUserRole, setEditUserRole] = useState("student");

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
      .select("id, email, full_name, role, blocked, cedula")
      .order("full_name");
    setUsers(data || []);

    const { data: enrolls } = await supabase.from("enrollments").select("*");
    setEnrollments(enrolls || []);
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
        const normalizedQuizzes = (qzs || []).map((q) => {
          const cfg = getQuizConfig(q);
          return {
            ...q,
            due_date: cfg.dueDate,
            duration_minutes: cfg.durationMinutes,
            description: cfg.cleanDescription,
          };
        });
        setQuizzes(normalizedQuizzes);

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
      notify("Error al cambiar estado: " + error.message, "error");
    } else {
      loadUsers();
      notify(
        blocked
          ? "Usuario desbloqueado exitosamente. 🔓"
          : "Usuario bloqueado exitosamente. 🔒",
        "info",
      );
    }
  };

  const handleChangePassword = (userId, userEmail) => {
    setPasswordModal({
      isOpen: true,
      userId,
      userEmail,
      newPassword: "",
    });
  };

  // --- ACCIONES DE EDICIÓN Y BORRADO DE USUARIOS (Luis Alvaro) ---
  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUserObj) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editUserFullName.trim(),
          cedula: editUserCedula.trim() || null,
          role: editUserRole,
        })
        .eq("id", editingUserObj.id);

      if (error) throw error;

      notify("Perfil de usuario actualizado de forma exitosa.", "success");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      notify("Error al actualizar usuario: " + err.message, "error");
    }
  };

  const handleDeleteUser = (userId, userEmail) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Usuario?",
      message: `¿Estás completamente seguro de que deseas eliminar permanentemente al usuario "${userEmail}"? Esta acción eliminará su perfil, sus matrículas, sus entregas de tareas y sus exámenes, y NO se puede deshacer.`,
      confirmText: "Eliminar Usuario",
      onConfirm: async () => {
        try {
          const hasServiceKey = !!import.meta.env
            .VITE_SUPABASE_SERVICE_ROLE_KEY;
          let deleteAuthSuccess = false;

          try {
            if (hasServiceKey) {
              const { error } =
                await supabaseAdmin.auth.admin.deleteUser(userId);
              if (error) throw error;
            } else {
              const { error } = await supabase.functions.invoke(
                "admin-actions",
                {
                  body: { action: "delete-user", userId },
                },
              );
              if (error) throw error;
            }
            deleteAuthSuccess = true;
          } catch (authErr) {
            console.warn(
              "Advertencia de Auth al eliminar usuario:",
              authErr.message,
            );
          }

          const { error: profileErr } = await (supabaseAdmin || supabase)
            .from("profiles")
            .delete()
            .eq("id", userId);

          if (profileErr && !deleteAuthSuccess) {
            throw new Error(
              "No se pudo eliminar el usuario de Auth ni del perfil local: " +
                profileErr.message,
            );
          }

          notify(
            "Usuario eliminado de la plataforma exitosamente. 🗑️",
            "success",
          );
          loadUsers();
        } catch (err) {
          notify("Error al eliminar el usuario: " + err.message, "error");
        }
      },
    });
  };

  const handleToggleEnrollment = async (courseId) => {
    if (!enrollmentUser) return;
    const isEnrolled = enrollments.some(
      (e) => e.student_id === enrollmentUser.id && e.course_id === courseId,
    );

    try {
      if (isEnrolled) {
        const { error } = await supabase
          .from("enrollments")
          .delete()
          .eq("student_id", enrollmentUser.id)
          .eq("course_id", courseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("enrollments").insert({
          student_id: enrollmentUser.id,
          course_id: courseId,
        });
        if (error) throw error;
      }

      // Recargar matrículas locales
      const { data: enrolls } = await supabase.from("enrollments").select("*");
      setEnrollments(enrolls || []);
    } catch (err) {
      notify(
        "Error al modificar la matrícula del estudiante: " + err.message,
        "error",
      );
    }
  };

  const handleToggleTeacherAssignment = async (courseId) => {
    if (!enrollmentUser) return;
    const isAssigned = courses.some(
      (c) => c.id === courseId && c.teacher_id === enrollmentUser.id,
    );

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from("courses")
          .update({ teacher_id: null })
          .eq("id", courseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("courses")
          .update({ teacher_id: enrollmentUser.id })
          .eq("id", courseId);
        if (error) throw error;
      }

      // Recargar la lista de cursos
      loadCourses();
    } catch (err) {
      notify(
        "Error al modificar la asignación del docente: " + err.message,
        "error",
      );
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
      notify("Módulo creado de forma exitosa.", "success");
    } catch (err) {
      notify("Error al crear módulo: " + err.message, "error");
    }
  };

  const handleDeleteModule = (moduleId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Módulo?",
      message:
        "¿Deseas eliminar este módulo junto con todas sus lecciones, tareas y exámenes de forma permanente?",
      confirmText: "Eliminar Módulo",
      onConfirm: async () => {
        const { error } = await supabase
          .from("modules")
          .delete()
          .eq("id", moduleId);
        if (error) {
          notify("Error: " + error.message, "error");
        } else {
          loadCourseContent(selectedCourseId);
          notify("Módulo y sus contenidos eliminados exitosamente. 🗑️", "info");
        }
      },
    });
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!selectedModuleId || !newLessonTitle.trim()) {
      notify("Debes seleccionar un módulo e ingresar un título.", "warning");
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
      notify("¡Clase / Lección creada exitosamente!", "success");
    } catch (err) {
      notify("Error al guardar la lección: " + err.message, "error");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteLesson = (lessonId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Lección?",
      message: "¿Seguro que deseas eliminar esta lección?",
      confirmText: "Eliminar Clase",
      onConfirm: async () => {
        const { error } = await supabase
          .from("lessons")
          .delete()
          .eq("id", lessonId);
        if (error) {
          notify("Error al eliminar: " + error.message, "error");
        } else {
          loadCourseContent(selectedCourseId);
          notify("Clase eliminada exitosamente. 🗑️", "info");
        }
      },
    });
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignModuleId || !assignTitle.trim()) {
      notify(
        "Por favor selecciona un módulo e ingresa un título para la tarea.",
        "warning",
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
      notify("¡Tarea creada y publicada exitosamente!", "success");
    } catch (err) {
      notify("Error al crear la tarea: " + err.message, "error");
    } finally {
      setUploadingAssign(false);
    }
  };

  const handleDeleteAssignment = (assignId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Tarea?",
      message:
        "¿Seguro que deseas eliminar esta tarea? Se borrarán también las entregas que tengan los alumnos.",
      confirmText: "Eliminar Tarea",
      onConfirm: async () => {
        const { error } = await supabase
          .from("assignments")
          .delete()
          .eq("id", assignId);
        if (error) {
          notify("Error al eliminar: " + error.message, "error");
        } else {
          loadCourseContent(selectedCourseId);
          notify("Tarea eliminada exitosamente. 🗑️", "info");
        }
      },
    });
  };

  // ===============================
  // ACCIONES GESTIÓN DE CURSOS (EDITAR Y ELIMINAR)
  // ===============================
  const handleDeleteCourse = (courseId, courseName) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Curso?",
      message: `¿Estás seguro de que deseas eliminar el curso "${courseName}"? Se eliminarán todos los módulos, lecciones, exámenes y entregas asociadas.`,
      confirmText: "Eliminar Curso",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("courses")
            .delete()
            .eq("id", courseId);
          if (error) throw error;
          notify("Curso eliminado con éxito.", "success");
          loadCourses();
        } catch (err) {
          notify("Error al eliminar el curso: " + err.message, "error");
        }
      },
    });
  };

  const handleSaveCourseEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editCode.trim()) {
      notify("Por favor completa el nombre y el código del curso.", "warning");
      return;
    }

    setUploadingEditCover(true);
    try {
      let finalThumbnailUrl = editThumbnailUrl;

      // Si hay un archivo de imagen seleccionado para cargar
      if (editImageFile) {
        const fileExt = editImageFile.name.split(".").pop();
        const fileName = `course-covers/${Date.now()}-${Math.random().toString(36).substring(3)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(fileName, editImageFile);

        if (uploadError) throw uploadError;

        let {
          data: { publicUrl },
        } = supabase.storage.from("resources").getPublicUrl(fileName);

        finalThumbnailUrl = getCorrectUrl(publicUrl);
      }

      const { error } = await supabase
        .from("courses")
        .update({
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          description: editDescription.trim() || null,
          thumbnail_url: finalThumbnailUrl || null,
          teacher_id: editTeacherId || null,
        })
        .eq("id", editingCourse.id);

      if (error) throw error;

      notify("¡Curso actualizado de forma exitosa!", "success");
      setEditingCourse(null);
      setEditImageFile(null);
      loadCourses();
    } catch (err) {
      notify("Error al guardar cambios: " + err.message, "error");
    } finally {
      setUploadingEditCover(false);
    }
  };

  // ===============================
  // CREACIÓN DE EXÁMENES (QUIZZES) Y PREGUNTAS
  // ===============================
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizModuleId || !quizTitle.trim()) {
      notify(
        "Por favor selecciona un módulo e ingresa un título para el examen.",
        "warning",
      );
      return;
    }

    const dueDateIso = quizDueDate ? new Date(quizDueDate).toISOString() : null;
    const durationNum = quizDurationMinutes
      ? parseInt(quizDurationMinutes)
      : null;

    try {
      // 1. Intento de inserción con columnas nativas due_date y duration_minutes
      const { error } = await supabase.from("quizzes").insert({
        module_id: quizModuleId,
        title: quizTitle.trim(),
        description: quizDesc.trim() || null,
        due_date: dueDateIso,
        duration_minutes: durationNum,
      });

      if (error) {
        // Fallback seguro si la tabla 'quizzes' no tiene aún las columnas creadas en Supabase
        if (
          error.message &&
          (error.message.includes("due_date") ||
            error.message.includes("duration_minutes") ||
            error.message.includes("column"))
        ) {
          console.warn(
            "Columnas nativas no encontradas en DB, usando fallback en description...",
          );
          let metaConfig = "";
          if (dueDateIso || durationNum) {
            metaConfig = `\n[CONFIG_QUIZ:due_date=${dueDateIso || ""}|duration=${durationNum || ""}]`;
          }
          const fullDesc = (quizDesc.trim() + metaConfig).trim() || null;

          const { error: fallbackError } = await supabase
            .from("quizzes")
            .insert({
              module_id: quizModuleId,
              title: quizTitle.trim(),
              description: fullDesc,
            });

          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      setQuizTitle("");
      setQuizDesc("");
      setQuizDueDate("");
      setQuizDurationMinutes("");
      loadCourseContent(selectedCourseId);
      notify("¡Examen (Cuestionario) creado de forma exitosa!", "success");
    } catch (err) {
      notify("Error al crear el examen: " + err.message, "error");
    }
  };

  const handleDeleteQuiz = (quizId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Examen?",
      message:
        "¿Deseas eliminar este examen junto con todas sus preguntas y calificaciones registradas?",
      confirmText: "Eliminar Examen",
      onConfirm: async () => {
        const { error } = await supabase
          .from("quizzes")
          .delete()
          .eq("id", quizId);
        if (error) {
          notify("Error al eliminar examen: " + error.message, "error");
        } else {
          loadCourseContent(selectedCourseId);
          notify(
            "Examen y sus preguntas eliminados de forma exitosa. 🗑️",
            "info",
          );
        }
      },
    });
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedQuizId || !questionText.trim()) {
      notify(
        "Por favor selecciona un examen e ingresa el enunciado de la pregunta.",
        "warning",
      );
      return;
    }

    if (questionType === "multiple") {
      if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
        notify(
          "Por favor rellena todas las opciones y la respuesta correcta.",
          "warning",
        );
        return;
      }
    } else {
      const validPairs = matchingPairs.filter((p) => p.p.trim() && p.r.trim());
      if (validPairs.length < 2) {
        notify(
          "Por favor ingresa al menos 2 parejas válidas (premisa y su respuesta correcta).",
          "warning",
        );
        return;
      }
    }

    try {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: selectedQuizId,
        question_text: questionText.trim(),
        option_a: questionType === "multiple" ? optA.trim() : null,
        option_b: questionType === "multiple" ? optB.trim() : null,
        option_c: questionType === "multiple" ? optC.trim() : null,
        option_d: questionType === "multiple" ? optD.trim() : null,
        correct_option:
          questionType === "multiple" ? correctOption : "MATCHING",
        question_type: questionType,
        matching_pairs:
          questionType === "matching"
            ? matchingPairs.filter((p) => p.p.trim() && p.r.trim())
            : null,
      });

      if (error) throw error;
      setQuestionText("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setCorrectOption("A");
      setMatchingPairs([
        { p: "", r: "" },
        { p: "", r: "" },
        { p: "", r: "" },
        { p: "", r: "" },
        { p: "", r: "" },
      ]);
      loadCourseContent(selectedCourseId);
      setExpandedQuizzes((prev) => ({ ...prev, [selectedQuizId]: true }));
      notify("¡Pregunta añadida exitosamente al examen!", "success");
    } catch (err) {
      notify("Error al guardar la pregunta: " + err.message, "error");
    }
  };

  const handleDeleteQuestion = (questId) => {
    setConfirmModal({
      isOpen: true,
      title: "🗑️ ¿Eliminar Pregunta?",
      message: "¿Seguro que deseas eliminar esta pregunta del examen?",
      confirmText: "Eliminar Pregunta",
      onConfirm: async () => {
        const { error } = await supabase
          .from("quiz_questions")
          .delete()
          .eq("id", questId);
        if (error) {
          notify("Error al eliminar la pregunta: " + error.message, "error");
        } else {
          loadCourseContent(selectedCourseId);
          notify("Pregunta eliminada exitosamente. 🗑️", "info");
        }
      },
    });
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
            {/* FORMULARIO DE EDICIÓN DE USUARIO (Luis Alvaro) */}
            {editingUserObj ? (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--primary)",
                  padding: "2rem",
                  borderRadius: "16px",
                  marginBottom: "2rem",
                  maxWidth: "600px",
                  marginInline: "auto",
                }}
              >
                <h3
                  style={{
                    color: "var(--primary)",
                    marginTop: 0,
                    marginBottom: "1.5rem",
                  }}
                >
                  ✏️ Editar Perfil de Usuario:{" "}
                  {editingUserObj.full_name || editingUserObj.email}
                </h3>
                <form
                  onSubmit={handleSaveUserEdit}
                  className="admin-form"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Nombre Completo:
                    </label>
                    <input
                      type="text"
                      value={editUserFullName}
                      onChange={(e) => setEditUserFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Cédula / Documento de Identidad:
                    </label>
                    <input
                      type="text"
                      value={editUserCedula}
                      onChange={(e) => setEditUserCedula(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Rol en la Plataforma:
                    </label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value)}
                      required
                    >
                      <option value="student">Estudiante</option>
                      <option value="teacher">Profesor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "1.5rem",
                    }}
                  >
                    <button
                      type="submit"
                      className="btn-submit"
                      style={{ flexGrow: 1, margin: 0 }}
                    >
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      style={{
                        background: "#475569",
                        color: "white",
                        border: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* FORMULARIO DE MATRÍCULA Y ASIGNACIÓN (Luis Alvaro) */}
            {enrollmentUser ? (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--primary)",
                  padding: "2rem",
                  borderRadius: "16px",
                  marginBottom: "2rem",
                  maxWidth: "600px",
                  marginInline: "auto",
                }}
              >
                <h3
                  style={{
                    color: "var(--primary)",
                    marginTop: 0,
                    marginBottom: "0.5rem",
                  }}
                >
                  📚 Matricular / Asignar Cursos
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    marginBottom: "1.5rem",
                    fontSize: "0.95rem",
                  }}
                >
                  Gestionando el acceso para:{" "}
                  <strong style={{ color: "white" }}>
                    {enrollmentUser.full_name || enrollmentUser.email}
                  </strong>{" "}
                  (
                  {enrollmentUser.role === "student"
                    ? "Estudiante"
                    : "Profesor"}
                  )
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    maxHeight: "300px",
                    overflowY: "auto",
                    paddingRight: "0.5rem",
                  }}
                >
                  {courses.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        textAlign: "center",
                        padding: "1rem",
                      }}
                    >
                      No hay cursos activos registrados.
                    </p>
                  ) : (
                    courses.map((course) => {
                      const isStudentEnrolled = enrollments.some(
                        (e) =>
                          e.student_id === enrollmentUser.id &&
                          e.course_id === course.id,
                      );
                      const isTeacherAssigned =
                        course.teacher_id === enrollmentUser.id;

                      return (
                        <div
                          key={course.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "rgba(255,255,255,0.02)",
                            padding: "0.75rem 1rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border-muted)",
                          }}
                        >
                          <div>
                            <strong
                              style={{ color: "white", display: "block" }}
                            >
                              {course.name}
                            </strong>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Código: {course.code}
                            </span>
                          </div>

                          {enrollmentUser.role === "student" ? (
                            <button
                              onClick={() => handleToggleEnrollment(course.id)}
                              style={{
                                background: isStudentEnrolled
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "rgba(245, 158, 11, 0.1)",
                                color: isStudentEnrolled
                                  ? "var(--success)"
                                  : "var(--primary)",
                                border: "1px solid",
                                borderColor: isStudentEnrolled
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : "rgba(245, 158, 11, 0.3)",
                                padding: "0.5rem 1rem",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                              }}
                            >
                              {isStudentEnrolled
                                ? "✓ Matriculado"
                                : "Matricular"}
                            </button>
                          ) : enrollmentUser.role === "teacher" ? (
                            <button
                              onClick={() =>
                                handleToggleTeacherAssignment(course.id)
                              }
                              style={{
                                background: isTeacherAssigned
                                  ? "rgba(99, 102, 241, 0.15)"
                                  : "rgba(245, 158, 11, 0.1)",
                                color: isTeacherAssigned
                                  ? "#818cf8"
                                  : "var(--primary)",
                                border: "1px solid",
                                borderColor: isTeacherAssigned
                                  ? "rgba(99, 102, 241, 0.3)"
                                  : "rgba(245, 158, 11, 0.3)",
                                padding: "0.5rem 1rem",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                              }}
                            >
                              {isTeacherAssigned
                                ? "👨‍🏫 Docente Asignado"
                                : "Asignar"}
                            </button>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                              }}
                            >
                              Acceso Administrador Completo
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div
                  style={{
                    marginTop: "1.5rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setEnrollmentUser(null)}
                    style={{
                      background: "#475569",
                      color: "white",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "10px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Cerrar Ventana
                  </button>
                </div>
              </div>
            ) : null}

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
                    <td style={{ fontWeight: "bold" }}>
                      {u.full_name || "-"}
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          fontWeight: "normal",
                          marginTop: "4px",
                        }}
                      >
                        Cédula: {u.cedula || "No registrada"}
                      </div>

                      {/* Mostrar listado de matrículas en vivo (Luis Alvaro) */}
                      {u.role === "student" && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                            marginTop: "6px",
                          }}
                        >
                          {enrollments
                            .filter((e) => e.student_id === u.id)
                            .map((e) => {
                              const course = courses.find(
                                (c) => c.id === e.course_id,
                              );
                              return course ? (
                                <span
                                  key={course.id}
                                  style={{
                                    background: "rgba(16, 185, 129, 0.1)",
                                    color: "var(--success)",
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: "1px solid rgba(16, 185, 129, 0.2)",
                                  }}
                                >
                                  🎓 {course.code}
                                </span>
                              ) : null;
                            })}
                          {enrollments.filter((e) => e.student_id === u.id)
                            .length === 0 && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                              }}
                            >
                              Sin asignaturas matriculadas
                            </span>
                          )}
                        </div>
                      )}

                      {u.role === "teacher" && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                            marginTop: "6px",
                          }}
                        >
                          {courses
                            .filter((c) => c.teacher_id === u.id)
                            .map((course) => (
                              <span
                                key={course.id}
                                style={{
                                  background: "rgba(99, 102, 241, 0.1)",
                                  color: "#818cf8",
                                  fontSize: "0.7rem",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(99, 102, 241, 0.2)",
                                }}
                              >
                                👨‍🏫 {course.code}
                              </span>
                            ))}
                          {courses.filter((c) => c.teacher_id === u.id)
                            .length === 0 && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                              }}
                            >
                              Sin asignaturas a cargo
                            </span>
                          )}
                        </div>
                      )}
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
                      <div
                        className="admin-actions-cell"
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
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

                        {u.role !== "admin" && (
                          <button
                            onClick={() => {
                              setEnrollmentUser(u);
                              setEditingUser(null);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            style={{
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--primary)",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              padding: "0.4rem 0.8rem",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                          >
                            📚 Matricular
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditUserFullName(u.full_name || "");
                            setEditUserCedula(u.cedula || "");
                            setEditUserRole(u.role || "student");
                            setEnrollmentUser(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "var(--error)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Borrar
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

            {editingCourse ? (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--primary)",
                  padding: "2rem",
                  borderRadius: "16px",
                  marginBottom: "2rem",
                  maxWidth: "600px",
                  marginInline: "auto",
                }}
              >
                <h3
                  style={{
                    color: "var(--primary)",
                    marginTop: 0,
                    marginBottom: "1.5rem",
                  }}
                >
                  ✏️ Editar Curso: {editingCourse.name}
                </h3>
                <form
                  onSubmit={handleSaveCourseEdit}
                  className="admin-form"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Nombre del curso:
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Código del curso:
                    </label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Descripción:
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Asignar Profesor:
                    </label>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                    >
                      <option value="">-- Sin Profesor Asignado --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.25rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        fontWeight: "bold",
                      }}
                    >
                      Imagen de Portada (Sube un archivo o ingresa una URL):
                    </label>

                    {/* Vista previa de imagen actual */}
                    {(editThumbnailUrl || editImageFile) && (
                      <div style={{ marginBottom: "1rem" }}>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Vista Previa:
                        </span>
                        <img
                          src={
                            editImageFile
                              ? URL.createObjectURL(editImageFile)
                              : getCorrectUrl(editThumbnailUrl)
                          }
                          alt="Previsualización"
                          style={{
                            width: "100%",
                            maxHeight: "150px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid var(--border-light)",
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        background: "var(--bg-main)",
                        padding: "1rem",
                        borderRadius: "8px",
                        border: "1px dashed var(--border-light)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        📁 Subir archivo desde tu PC (.jpg, .png, etc.):
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setEditImageFile(e.target.files[0]);
                          }
                        }}
                        style={{ border: "none", padding: 0 }}
                      />
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        O pega una URL directa:
                      </span>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={editThumbnailUrl}
                        onChange={(e) => {
                          setEditThumbnailUrl(e.target.value);
                          // Si ingresa URL, limpiamos el archivo seleccionado
                          setEditImageFile(null);
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "1.5rem",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={uploadingEditCover}
                      className="btn-submit"
                      style={{ flexGrow: 1, margin: 0 }}
                    >
                      {uploadingEditCover
                        ? "Guardando Cambios..."
                        : "Guardar Cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourse(null);
                        setEditImageFile(null);
                      }}
                      style={{
                        background: "#475569",
                        color: "white",
                        border: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            <div
              className="manage-courses-body"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {courses.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: "2rem",
                    gridColumn: "1 / -1",
                  }}
                >
                  Aún no se han creado cursos en la plataforma.
                </p>
              ) : (
                courses.map((c) => {
                  const assignedTeacher = teachers.find(
                    (t) => t.id === c.teacher_id,
                  );
                  return (
                    <div
                      className="courses"
                      key={c.id}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-muted)",
                        borderRadius: "14px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {c.thumbnail_url ? (
                        <img
                          src={getCorrectUrl(c.thumbnail_url)}
                          alt={c.name}
                          style={{
                            width: "100%",
                            height: "160px",
                            objectFit: "cover",
                            borderBottom: "1px solid var(--border-muted)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "160px",
                            background:
                              "linear-gradient(135deg, #1e293b, #0f172a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                            fontSize: "2.5rem",
                            fontWeight: "bold",
                          }}
                        >
                          {c.code}
                        </div>
                      )}

                      <div style={{ padding: "1.25rem", flexGrow: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color: "white",
                              fontSize: "1.2rem",
                              fontWeight: "bold",
                            }}
                          >
                            {c.name}
                          </h3>
                          <span
                            className="course-code-badge"
                            style={{
                              background: "rgba(245,158,11,0.1)",
                              color: "var(--primary)",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                            }}
                          >
                            {c.code}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                            margin: "0.5rem 0 1rem 0",
                            minHeight: "50px",
                          }}
                        >
                          {c.description || "Sin descripción registrada"}
                        </p>
                        <div
                          style={{
                            borderTop: "1px solid var(--border-muted)",
                            paddingTop: "0.75rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>
                            Docente asignado:{" "}
                          </span>
                          <strong
                            style={{
                              color: assignedTeacher
                                ? "var(--success)"
                                : "var(--primary)",
                            }}
                          >
                            {assignedTeacher
                              ? assignedTeacher.full_name
                              : "Sin asignar"}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "1.25rem",
                          borderTop: "1px solid var(--border-muted)",
                          display: "flex",
                          gap: "0.75rem",
                        }}
                      >
                        <button
                          onClick={() => {
                            setEditingCourse(c);
                            setEditName(c.name);
                            setEditCode(c.code);
                            setEditDescription(c.description || "");
                            setEditThumbnailUrl(c.thumbnail_url || "");
                            setEditTeacherId(c.teacher_id || "");
                            // Desplaza la ventana hacia arriba para ver el formulario
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          style={{
                            flexGrow: 1,
                            background: "var(--primary)",
                            color: "var(--primary-text)",
                            fontWeight: "bold",
                            border: "none",
                            padding: "0.6rem 1rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(c.id, c.name)}
                          style={{
                            flexGrow: 1,
                            background: "var(--error)",
                            color: "white",
                            fontWeight: "bold",
                            border: "none",
                            padding: "0.6rem 1rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.25rem",
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                          margin: "0.5rem 0",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.85rem",
                              color: "var(--text-muted)",
                              marginBottom: "0.25rem",
                              fontWeight: "bold",
                            }}
                          >
                            📅 Fecha y Hora Límite:
                          </label>
                          <input
                            type="datetime-local"
                            value={quizDueDate}
                            onChange={(e) => setQuizDueDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.85rem",
                              color: "var(--text-muted)",
                              marginBottom: "0.25rem",
                              fontWeight: "bold",
                            }}
                          >
                            ⏱️ Duración (minutos):
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            placeholder="Ej. 30"
                            value={quizDurationMinutes}
                            onChange={(e) =>
                              setQuizDurationMinutes(e.target.value)
                            }
                          />
                        </div>
                      </div>
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
                    <h3>5. Añadir Pregunta al Examen</h3>
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

                      <div style={{ margin: "1rem 0" }}>
                        <label
                          style={{
                            fontWeight: "bold",
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Tipo de Pregunta:
                        </label>
                        <select
                          value={questionType}
                          onChange={(e) => setQuestionType(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            background: "var(--bg-main)",
                            color: "white",
                            border: "1px solid var(--border-light)",
                          }}
                        >
                          <option value="multiple">
                            Selección Múltiple (Opción Única)
                          </option>
                          <option value="matching">
                            Relacionar Parejas / Columnas (🧩 STEAM)
                          </option>
                        </select>
                      </div>

                      <textarea
                        placeholder={
                          questionType === "multiple"
                            ? "Escribe el enunciado de la pregunta..."
                            : "Escribe las instrucciones (ej. Relaciona cada concepto STEAM con su definición)"
                        }
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        rows="3"
                        required
                      />

                      {questionType === "multiple" ? (
                        <>
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
                        </>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                            background: "rgba(0,0,0,0.2)",
                            padding: "1rem",
                            borderRadius: "8px",
                            margin: "1rem 0",
                            border: "1px solid var(--border-muted)",
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              fontSize: "0.95rem",
                              color: "var(--primary)",
                            }}
                          >
                            Configurar Parejas (Mínimo 2, Máximo 5)
                          </h4>
                          {matchingPairs.map((pair, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                              }}
                            >
                              <strong
                                style={{ fontSize: "0.9rem", minWidth: "18px" }}
                              >
                                {idx + 1}.
                              </strong>
                              <input
                                type="text"
                                placeholder={`Concepto / Premisa`}
                                value={pair.p}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMatchingPairs((prev) => {
                                    const updated = [...prev];
                                    updated[idx].p = val;
                                    return updated;
                                  });
                                }}
                                style={{ margin: 0 }}
                                required={idx < 2}
                              />
                              <span style={{ color: "var(--primary)" }}>↔</span>
                              <input
                                type="text"
                                placeholder={`Definición correcta`}
                                value={pair.r}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMatchingPairs((prev) => {
                                    const updated = [...prev];
                                    updated[idx].r = val;
                                    return updated;
                                  });
                                }}
                                style={{ margin: 0 }}
                                required={idx < 2}
                              />
                            </div>
                          ))}
                        </div>
                      )}

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

                            {/* Mostrar Exámenes (Desplegables / Collapsible) */}
                            {modQuizzes.map((q) => {
                              const quizQuests = quizQuestions.filter(
                                (qu) => qu.quiz_id === q.id,
                              );
                              const isExpanded = !!expandedQuizzes[q.id];

                              return (
                                <li
                                  key={q.id}
                                  style={{
                                    fontSize: "0.9rem",
                                    margin: "0.8rem 0",
                                    color: "#f59e0b",
                                    background: "rgba(245, 158, 11, 0.05)",
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(245, 158, 11, 0.2)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.5rem",
                                        }}
                                      >
                                        <span>
                                          ⚡ Examen: <strong>{q.title}</strong>
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "0.75rem",
                                            background:
                                              "rgba(245, 158, 11, 0.2)",
                                            color: "#f59e0b",
                                            padding: "2px 8px",
                                            borderRadius: "10px",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          {quizQuests.length}{" "}
                                          {quizQuests.length === 1
                                            ? "pregunta"
                                            : "preguntas"}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "var(--text-muted)",
                                          marginTop: "0.25rem",
                                          display: "flex",
                                          gap: "0.75rem",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {q.due_date && (
                                          <span>
                                            📅 Límite:{" "}
                                            {new Date(
                                              q.due_date,
                                            ).toLocaleString()}
                                          </span>
                                        )}
                                        {q.duration_minutes && (
                                          <span>
                                            ⏱️ Duración: {q.duration_minutes}{" "}
                                            min
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedQuizzes((prev) => ({
                                            ...prev,
                                            [q.id]: !prev[q.id],
                                          }))
                                        }
                                        style={{
                                          background:
                                            "rgba(245, 158, 11, 0.15)",
                                          border:
                                            "1px solid rgba(245, 158, 11, 0.4)",
                                          color: "#f59e0b",
                                          padding: "0.3rem 0.6rem",
                                          borderRadius: "6px",
                                          fontSize: "0.75rem",
                                          cursor: "pointer",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {isExpanded
                                          ? "🔼 Ocultar"
                                          : `🔽 Preguntas (${quizQuests.length})`}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteQuiz(q.id)}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "var(--error)",
                                          cursor: "pointer",
                                          fontSize: "1rem",
                                        }}
                                        title="Eliminar Examen"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>

                                  {/* PREGUNTAS DESPLEGABLES */}
                                  {isExpanded && (
                                    <ul
                                      style={{
                                        paddingLeft: "0.5rem",
                                        color: "var(--text-muted)",
                                        fontSize: "0.85rem",
                                        marginTop: "0.75rem",
                                        borderTop:
                                          "1px dashed rgba(245, 158, 11, 0.2)",
                                        paddingTop: "0.75rem",
                                        listStyle: "none",
                                      }}
                                    >
                                      {quizQuests.map((qu, quIdx) => (
                                        <li
                                          key={qu.id}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            margin: "0.4rem 0",
                                            paddingBottom: "0.4rem",
                                            borderBottom:
                                              "1px dashed rgba(255,255,255,0.05)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              flexGrow: 1,
                                              paddingRight: "0.5rem",
                                            }}
                                          >
                                            <span>
                                              {quIdx + 1}.{" "}
                                              {qu.question_type === "matching"
                                                ? "🧩 [Relacionar Parejas]"
                                                : "❓"}{" "}
                                              <strong>
                                                {qu.question_text}
                                              </strong>
                                            </span>
                                            {qu.question_type === "matching" ? (
                                              <div
                                                style={{
                                                  paddingLeft: "1rem",
                                                  fontSize: "0.8rem",
                                                  color: "var(--text-muted)",
                                                  marginTop: "0.25rem",
                                                }}
                                              >
                                                {qu.matching_pairs?.map(
                                                  (p, pIdx) => (
                                                    <div key={pIdx}>
                                                      • {p.p}{" "}
                                                      <span
                                                        style={{
                                                          color:
                                                            "var(--primary)",
                                                        }}
                                                      >
                                                        ↔
                                                      </span>{" "}
                                                      {p.r}
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            ) : (
                                              <span
                                                style={{
                                                  fontSize: "0.8rem",
                                                  color: "var(--text-muted)",
                                                  display: "block",
                                                  marginLeft: "1.2rem",
                                                  marginTop: "0.15rem",
                                                }}
                                              >
                                                Opciones: A: {qu.option_a} | B:{" "}
                                                {qu.option_b} | C: {qu.option_c}{" "}
                                                | D: {qu.option_d} (Correcta:{" "}
                                                <strong>
                                                  {qu.correct_option}
                                                </strong>
                                                )
                                              </span>
                                            )}
                                          </div>
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
                                              alignSelf: "flex-start",
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
                                  )}
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

        {/* MODAL DE CONFIRMACIÓN DE ACCIONES */}
        {confirmModal.isOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(8px)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                border: "1px solid rgba(245, 158, 11, 0.5)",
                borderRadius: "16px",
                padding: "2rem",
                maxWidth: "420px",
                width: "90%",
                textAlign: "center",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
              }}
            >
              <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>
                ⚠️
              </div>
              <h3
                style={{
                  color: "#ffffff",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  margin: "0 0 0.5rem 0",
                }}
              >
                {confirmModal.title || "¿Estás seguro?"}
              </h3>
              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "0.95rem",
                  lineHeight: "1.5",
                  marginBottom: "1.8rem",
                }}
              >
                {confirmModal.message}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  style={{
                    background: "#334155",
                    color: "#f8fafc",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    if (action) action();
                  }}
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                    boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                  }}
                >
                  {confirmModal.confirmText || "Aceptar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CAMBIO DE CONTRASEÑA */}
        {passwordModal.isOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(8px)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div
              style={{
                background: "#1e293b",
                border: "1px solid rgba(245, 158, 11, 0.5)",
                borderRadius: "16px",
                padding: "2rem",
                maxWidth: "420px",
                width: "90%",
                textAlign: "center",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
              }}
            >
              <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>
                🔑
              </div>
              <h3
                style={{
                  color: "#ffffff",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  margin: "0 0 0.5rem 0",
                }}
              >
                Cambiar Contraseña
              </h3>
              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "0.9rem",
                  marginBottom: "1.2rem",
                }}
              >
                Ingresa la nueva contraseña para:{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {passwordModal.userEmail}
                </strong>
              </p>
              <input
                type="password"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                value={passwordModal.newPassword}
                onChange={(e) =>
                  setPasswordModal((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "var(--bg-main)",
                  color: "white",
                  border: "1px solid var(--border-light)",
                  marginBottom: "1.5rem",
                  fontSize: "0.95rem",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPasswordModal({
                      isOpen: false,
                      userId: null,
                      userEmail: "",
                      newPassword: "",
                    })
                  }
                  style={{
                    background: "#334155",
                    color: "#f8fafc",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !passwordModal.newPassword ||
                      passwordModal.newPassword.trim().length < 6
                    ) {
                      notify(
                        "La contraseña debe tener al menos 6 caracteres por seguridad.",
                        "warning",
                      );
                      return;
                    }
                    const uId = passwordModal.userId;
                    const uEmail = passwordModal.userEmail;
                    const newPw = passwordModal.newPassword.trim();
                    setPasswordModal({
                      isOpen: false,
                      userId: null,
                      userEmail: "",
                      newPassword: "",
                    });

                    try {
                      const hasServiceKey = !!import.meta.env
                        .VITE_SUPABASE_SERVICE_ROLE_KEY;
                      if (hasServiceKey) {
                        const { error } =
                          await supabaseAdmin.auth.admin.updateUserById(uId, {
                            password: newPw,
                          });
                        if (error) throw error;
                      } else {
                        const { error } = await supabase.functions.invoke(
                          "admin-actions",
                          {
                            body: {
                              action: "change-password",
                              userId: uId,
                              newPassword: newPw,
                            },
                          },
                        );
                        if (error) throw error;
                      }
                      notify(
                        `¡Contraseña para ${uEmail} actualizada exitosamente! 🔑`,
                        "success",
                      );
                    } catch (err) {
                      notify(
                        "Error al cambiar la contraseña: " + err.message,
                        "error",
                      );
                    }
                  }}
                  style={{
                    background: "var(--primary)",
                    color: "black",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA CREACIÓN DE USUARIO */}
        {tab === "create-user" && (
          <CreateUserTab
            onCreated={() => {
              loadUsers();
              loadCourses();
            }}
            supabaseAdmin={supabaseAdmin}
            courses={courses}
            notify={notify}
          />
        )}

        {/* PESTAÑA CREACIÓN DE CURSO */}
        {tab === "create-course" && (
          <CreateCourseTab
            onCreated={loadCourses}
            teachers={teachers}
            notify={notify}
          />
        )}
      </div>
    </div>
  );
};

const CreateUserTab = ({ onCreated, supabaseAdmin, courses = [] }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullcedula, setFulCedula] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

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
          await (supabaseAdmin || supabase).from("student_profiles").insert({
            user_id: userId,
            student_id: `STU-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            department,
            enrollment_year: new Date().getFullYear(),
          });

          // Matricular de forma inmediata en las asignaturas seleccionadas
          if (selectedCourseIds.length > 0) {
            const enrollInserts = selectedCourseIds.map((cid) => ({
              student_id: userId,
              course_id: cid,
            }));
            const { error: enrollErr } = await (supabaseAdmin || supabase)
              .from("enrollments")
              .insert(enrollInserts);
            if (enrollErr) {
              console.error("Error al matricular estudiante:", enrollErr);
              notify(
                "Error al matricular en asignaturas: " + enrollErr.message,
                "warning",
              );
            }
          }
        } else if (role === "teacher") {
          await (supabaseAdmin || supabase).from("teacher_profiles").insert({
            user_id: userId,
            employee_id: `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            department,
            title: "Profesor",
          });

          // Asignar de forma inmediata como profesor de las asignaturas seleccionadas
          if (selectedCourseIds.length > 0) {
            for (const cid of selectedCourseIds) {
              const { error: assignErr } = await (supabaseAdmin || supabase)
                .from("courses")
                .update({ teacher_id: userId })
                .eq("id", cid);
              if (assignErr) {
                console.error("Error al asignar profesor:", assignErr);
              }
            }
          }
        }
      } else {
        const { data: resData, error } = await supabase.functions.invoke(
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
              courseIds: selectedCourseIds,
            },
          },
        );

        if (error) {
          let errorDetails = "Error del Servidor";
          try {
            // Intentamos parsear la respuesta JSON de error real devuelta por la Edge Function
            const errBody = await error.context.json();
            if (errBody && errBody.error) {
              errorDetails = errBody.error;
            } else if (errBody && errBody.message) {
              errorDetails = errBody.message;
            }
          } catch (_) {
            errorDetails = error.message || errorDetails;
          }
          throw new Error(errorDetails);
        }
      }

      setMessage("Usuario creado y configurado exitosamente");
      notify("Usuario creado y configurado exitosamente 🚀", "success");
      setEmail("");
      setPassword("");
      setFullName("");
      setFulCedula("");
      setDepartment("");
      setRole("student");
      setSelectedCourseIds([]);
      onCreated();
    } catch (err) {
      setMessage("Error al crear usuario: " + err.message);
      notify("Error al crear usuario: " + err.message, "error");
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

        {/* SELECCIÓN DE MATRÍCULAS / ASIGNACIÓN INMEDIATA (Luis Alvaro) */}
        {(role === "student" || role === "teacher") && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.5rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "10px",
              border: "1px solid var(--border-muted)",
              textAlign: "left",
            }}
          >
            <h4
              style={{
                margin: "0 0 0.5rem 0",
                color: "var(--primary)",
                fontSize: "1rem",
                fontWeight: "bold",
              }}
            >
              {role === "student"
                ? "📚 Matricular inmediatamente en Cursos / Carreras:"
                : "👨‍🏫 Asignar inmediatamente como Profesor de:"}
            </h4>
            <p
              style={{
                margin: "0 0 1rem 0",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: "1.4",
              }}
            >
              {role === "student"
                ? "Selecciona uno o más cursos en los que este alumno quedará matriculado de forma automática."
                : "Selecciona uno o más cursos de los cuales este profesor quedará a cargo automáticamente."}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "0.75rem",
                maxHeight: "150px",
                overflowY: "auto",
                paddingRight: "0.5rem",
              }}
            >
              {courses.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  No hay cursos registrados para matricular.
                </p>
              ) : (
                courses.map((course) => {
                  const isChecked = selectedCourseIds.includes(course.id);
                  return (
                    <label
                      key={course.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 1rem",
                        background: isChecked
                          ? "rgba(245, 158, 11, 0.08)"
                          : "var(--bg-main)",
                        border: "1px solid",
                        borderColor: isChecked
                          ? "var(--primary)"
                          : "var(--border-light)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCourseIds((prev) =>
                            prev.includes(course.id)
                              ? prev.filter((id) => id !== course.id)
                              : [...prev, course.id],
                          );
                        }}
                        style={{
                          accentColor: "var(--primary)",
                          width: "18px",
                          height: "18px",
                          margin: 0,
                          cursor: "pointer",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <strong style={{ color: "white" }}>
                          {course.code}
                        </strong>{" "}
                        - {course.name}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn-submit ${loading ? "loading" : ""}`}
          style={{ marginTop: "1.5rem" }}
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
      notify("¡Curso registrado exitosamente! 📚", "success");
      setName("");
      setCode("");
      setDescription("");
      setThumbnailUrl("");
      setTeacherId("");
      onCreated();
    } catch (err) {
      setMessage("Error al crear curso: " + err.message);
      notify("Error al crear curso: " + err.message, "error");
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
