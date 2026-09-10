import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Classroom.css";

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

const Classroom = () => {
  const { courseId } = useParams();

  // Función de auto-corrección de URLs de almacenamiento de Supabase
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

  const { user } = useAuth();

  const navigate = useNavigate();

  // Estados de carga e información del curso
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // Estados para Exámenes (Quizzes)
  const [quizzes, setQuizzes] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  }); // Examen seleccionado
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Respuestas del examen en curso: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [quizStartTrigger, setQuizStartTrigger] = useState(0);

  // Estado de la lección seleccionada actualmente
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null); // Tarea seleccionada
  const [expandedModules, setExpandedModules] = useState({}); // Módulos expandidos en acordeón
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  // Estados para entrega de tareas
  const [uploadingAssignmentId, setUploadingAssignmentId] = useState(null);
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState({});
  const [showGradeSummary, setShowGradeSummary] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all"); // "all", "pending_todo", "pending_grade", "graded"

  // Memorice de barajado estable para las parejas del examen (Para evitar re-shuffling en cada render)
  const shuffledOptionsMap = React.useMemo(() => {
    const map = {};
    quizQuestions.forEach((q) => {
      if (q.question_type === "matching" && q.matching_pairs) {
        const targets = q.matching_pairs.map((pair) => pair.r).filter(Boolean);
        const shuffled = [...targets].sort(() => 0.5 - Math.random());
        map[q.id] = shuffled;
      }
    });
    return map;
  }, [quizQuestions]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchCourseData();
  }, [courseId, user]);

  // Efecto para auto-expandir el módulo de la lección, examen o tarea activa
  useEffect(() => {
    if (activeLesson) {
      setExpandedModules((prev) => ({
        ...prev,
        [activeLesson.module_id]: true,
      }));
    } else if (activeQuiz) {
      setExpandedModules((prev) => ({ ...prev, [activeQuiz.module_id]: true }));
    } else if (activeAssignment) {
      setExpandedModules((prev) => ({
        ...prev,
        [activeAssignment.module_id]: true,
      }));
    }
  }, [activeLesson, activeQuiz, activeAssignment]);

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Función para alternar el progreso de una tarea de forma manual ("Marcar como Hecho")
  const toggleAssignmentCompletion = async (assignmentId) => {
    if (savingProgress) return;
    const existingSub = studentSubmissions.find(
      (s) => s.assignment_id === assignmentId,
    );

    if (existingSub) {
      if (existingSub.file_url !== "completado_manual") {
        setConfirmModal({
          isOpen: true,
          title: "🗑️ ¿Eliminar Entrega de Proyecto?",
          message:
            "Ya has subido un archivo para esta tarea. ¿Deseas eliminar tu entrega de archivo?",
          onConfirm: async () => {
            setSavingProgress(true);
            try {
              const { error } = await supabase
                .from("submissions")
                .delete()
                .eq("student_id", user?.id)
                .eq("assignment_id", assignmentId);

              if (error) throw error;
              setStudentSubmissions((prev) =>
                prev.filter((s) => s.assignment_id !== assignmentId),
              );
              if (typeof window.showToast === "function") {
                window.showToast(
                  "Entrega de proyecto eliminada correctamente. 🗑️",
                  "info",
                );
              }
            } catch (err) {
              if (typeof window.showToast === "function") {
                window.showToast(
                  "Error al eliminar entrega: " + err.message,
                  "error",
                );
              }
            } finally {
              setSavingProgress(false);
            }
          },
        });
        return;
      }

      setSavingProgress(true);
      try {
        const { error } = await supabase
          .from("submissions")
          .delete()
          .eq("student_id", user?.id)
          .eq("assignment_id", assignmentId);

        if (error) throw error;
        setStudentSubmissions((prev) =>
          prev.filter((s) => s.assignment_id !== assignmentId),
        );
        if (typeof window.showToast === "function") {
          window.showToast("Actividad desmarcada como completada.", "info");
        }
      } catch (err) {
        if (typeof window.showToast === "function") {
          window.showToast(
            "Error al alternar estado de tarea: " + err.message,
            "error",
          );
        }
      } finally {
        setSavingProgress(false);
      }
    } else {
      setSavingProgress(true);
      try {
        const { error } = await supabase.from("submissions").upsert(
          {
            student_id: user?.id,
            assignment_id: assignmentId,
            file_url: "completado_manual",
            file_name: "Completado Manual",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "student_id,assignment_id" },
        );

        if (error) throw error;

        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", user?.id)
          .eq("assignment_id", assignmentId);

        if (submissionsData && submissionsData.length > 0) {
          setStudentSubmissions((prev) => [
            ...prev.filter((s) => s.assignment_id !== assignmentId),
            submissionsData[0],
          ]);
        }

        if (typeof window.showToast === "function") {
          window.showToast(
            "¡Actividad marcada como realizada con éxito! 🚀",
            "success",
          );
        }
      } catch (err) {
        if (typeof window.showToast === "function") {
          window.showToast(
            "Error al alternar estado de tarea: " + err.message,
            "error",
          );
        }
      } finally {
        setSavingProgress(false);
      }
    }
  };

  // Cargar datos del curso, módulos, lecciones, progreso y tareas
  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // 1. Obtener detalles del Curso
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // 2. Obtener Módulos del Curso ordenados
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // 3. Obtener Lecciones, Tareas, Entregas, Exámenes y Progreso de forma aislada
      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map((m) => m.id);

        // Cargar lecciones
        try {
          const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("*")
            .in("module_id", moduleIds)
            .order("order_index", { ascending: true });

          if (lessonsError) throw lessonsError;
          setLessons(lessonsData || []);

          if (lessonsData && lessonsData.length > 0) {
            setActiveLesson(lessonsData[0]);
          }
        } catch (err) {
          console.error("Error al cargar lecciones:", err);
        }

        // Cargar tareas del módulo
        let loadedAssignments = [];
        try {
          const { data: assignmentsData, error: assignmentsError } =
            await supabase
              .from("assignments")
              .select("*")
              .in("module_id", moduleIds);

          if (assignmentsError) throw assignmentsError;
          loadedAssignments = assignmentsData || [];
          setAssignments(loadedAssignments);
        } catch (err) {
          console.error("Error al cargar tareas:", err);
        }

        // Cargar entregas ya subidas por este alumno
        if (loadedAssignments.length > 0) {
          try {
            const assignIds = loadedAssignments.map((a) => a.id);
            const { data: submissionsData, error: submissionsError } =
              await supabase
                .from("submissions")
                .select("*")
                .eq("student_id", user?.id)
                .in("assignment_id", assignIds);

            if (submissionsError) throw submissionsError;
            setStudentSubmissions(submissionsData || []);
          } catch (err) {
            console.error("Error al cargar entregas:", err);
          }
        }

        // Cargar exámenes (Quizzes) de los módulos
        let loadedQuizzes = [];
        try {
          const { data: quizzesData, error: quizzesError } = await supabase
            .from("quizzes")
            .select("*")
            .in("module_id", moduleIds);

          if (quizzesError) throw quizzesError;
          const normalizedQuizzes = (quizzesData || []).map((q) => {
            const cfg = getQuizConfig(q);
            return {
              ...q,
              due_date: cfg.dueDate,
              duration_minutes: cfg.durationMinutes,
              description: cfg.cleanDescription,
            };
          });
          loadedQuizzes = normalizedQuizzes;
          setQuizzes(normalizedQuizzes);
        } catch (err) {
          console.error("Error al cargar exámenes:", err);
        }

        if (loadedQuizzes.length > 0) {
          try {
            const qzIds = loadedQuizzes.map((q) => q.id);

            // Cargar todas las preguntas de los exámenes
            const { data: questionsData, error: questionsError } =
              await supabase
                .from("quiz_questions")
                .select("*")
                .in("quiz_id", qzIds);

            if (questionsError) throw questionsError;
            setQuizQuestions(questionsData || []);

            // Cargar las calificaciones / intentos de exámenes de este alumno
            const { data: quizSubsData, error: quizSubsError } = await supabase
              .from("quiz_submissions")
              .select("*")
              .eq("student_id", user?.id)
              .in("quiz_id", qzIds);

            if (quizSubsError) throw quizSubsError;
            setQuizSubmissions(quizSubsData || []);
          } catch (err) {
            console.error(
              "Error al cargar preguntas/intentos de exámenes:",
              err,
            );
          }
        }
      }

      // 4. Obtener Progreso de lecciones completadas
      try {
        const { data: progressData, error: progressError } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user?.id)
          .eq("completed", true);

        if (progressError) throw progressError;
        if (progressData) {
          const completedSet = new Set(progressData.map((p) => p.lesson_id));
          setCompletedLessons(completedSet);
        }
      } catch (err) {
        console.error("Error al cargar progreso de lecciones:", err);
      }
    } catch (error) {
      console.error("Error general al cargar el aula virtual:", error);
    } finally {
      setLoading(false);
    }
  };

  // Guardar o alternar el estado de lección completada
  const toggleLessonCompletion = async (lessonId) => {
    if (savingProgress) return;
    setSavingProgress(true);

    const isCompleted = completedLessons.has(lessonId);
    const updatedCompleted = new Set(completedLessons);

    try {
      if (isCompleted) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user?.id)
          .eq("lesson_id", lessonId);

        if (error) throw error;
        updatedCompleted.delete(lessonId);
      } else {
        const { error } = await supabase.from("lesson_progress").upsert(
          {
            user_id: user?.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lesson_id" },
        );

        if (error) throw error;
        updatedCompleted.add(lessonId);
      }

      setCompletedLessons(updatedCompleted);
    } catch (err) {
      if (typeof window.showToast === "function") {
        window.showToast(
          "Error al actualizar progreso: " + err.message,
          "error",
        );
      }
    } finally {
      setSavingProgress(false);
    }
  };

  // Subir tarea por parte del estudiante
  const handleUploadSubmission = async (assignmentId) => {
    const file = selectedSubmissionFile[assignmentId];
    if (!file) {
      if (typeof window.showToast === "function") {
        window.showToast(
          "Por favor selecciona un archivo PDF, Word o PowerPoint primero.",
          "warning",
        );
      }
      return;
    }

    setUploadingAssignmentId(assignmentId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${assignmentId}-${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;

      // 1. Subir a Supabase Storage bucket 'submissions'
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obtener la URL pública del archivo
      let {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(filePath);

      if (
        publicUrl &&
        publicUrl.includes("/storage/v1/object/") &&
        !publicUrl.includes("/storage/v1/object/public/")
      ) {
        publicUrl = publicUrl.replace(
          "/storage/v1/object/",
          "/storage/v1/object/public/",
        );
      }

      // 3. Insertar o actualizar registro de entrega en la tabla 'submissions'
      const { error: dbError } = await supabase.from("submissions").upsert(
        {
          student_id: user?.id,
          assignment_id: assignmentId,
          file_url: publicUrl,
          file_name: file.name,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "student_id,assignment_id" },
      );

      if (dbError) throw dbError;

      if (typeof window.showToast === "function") {
        window.showToast(
          "¡Tu tarea ha sido cargada y entregada con éxito! 📤",
          "success",
        );
      }

      // Recargar entregas locales
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", user?.id)
        .eq("assignment_id", assignmentId);

      if (submissionsData && submissionsData.length > 0) {
        setStudentSubmissions((prev) => {
          const filtered = prev.filter((s) => s.assignment_id !== assignmentId);
          return [...filtered, submissionsData[0]];
        });
      }
    } catch (err) {
      if (typeof window.showToast === "function") {
        window.showToast("Error al subir la tarea: " + err.message, "error");
      }
    } finally {
      setUploadingAssignmentId(null);
    }
  };

  // Función para calificar automáticamente y subir el examen
  // Procesa el envío del examen (manual con confirmación o automático por tiempo)
  const processQuizSubmission = async (quizId, isAuto = false) => {
    const questions = quizQuestions.filter((q) => q.quiz_id === quizId);
    if (questions.length === 0) return;

    setSubmittingQuiz(true);
    try {
      let correctCount = 0;
      questions.forEach((q) => {
        if (q.question_type === "matching") {
          const ans = selectedAnswers[q.id] || {};
          const pairs = q.matching_pairs || [];
          let matchesCorrect = 0;
          pairs.forEach((pair) => {
            if (ans[pair.p] === pair.r) {
              matchesCorrect++;
            }
          });
          if (pairs.length > 0) {
            correctCount += matchesCorrect / pairs.length;
          }
        } else {
          if (selectedAnswers[q.id] === q.correct_option) {
            correctCount += 1;
          }
        }
      });

      const totalQuestions = questions.length;
      const finalScore = Math.round((correctCount / totalQuestions) * 100);

      const { error } = await supabase.from("quiz_submissions").upsert(
        {
          quiz_id: quizId,
          student_id: user?.id,
          score: finalScore,
          correct_answers: Math.round(correctCount),
          total_questions: totalQuestions,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "student_id,quiz_id" },
      );

      if (error) throw error;

      if (user?.id) {
        localStorage.removeItem(`quiz_timer_${user.id}_${quizId}`);
        localStorage.removeItem(`quiz_started_${user.id}_${quizId}`);
      }

      if (typeof window.showToast === "function") {
        if (isAuto) {
          window.showToast(
            `⌛ ¡El tiempo límite finalizó! Respuestas enviadas automáticamente. Calificación: ${finalScore} / 100.`,
            "info",
          );
        } else {
          window.showToast(
            `¡Examen enviado con éxito! Tu calificación es: ${finalScore} / 100 (${correctCount} de ${totalQuestions} respuestas correctas). 🎯`,
            "success",
          );
        }
      }

      // Actualizar estado local
      const { data: newSubData } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("student_id", user?.id)
        .eq("quiz_id", quizId);

      if (newSubData && newSubData.length > 0) {
        setQuizSubmissions((prev) => {
          const filtered = prev.filter((s) =>
            s.assignment_id !== undefined ? false : s.quiz_id !== quizId,
          );
          return [...prev.filter((s) => s.quiz_id !== quizId), newSubData[0]];
        });
      }
    } catch (err) {
      if (typeof window.showToast === "function") {
        window.showToast("Error al guardar examen: " + err.message, "error");
      }
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleSubmitQuiz = async (quizId) => {
    const questions = quizQuestions.filter((q) => q.quiz_id === quizId);
    if (questions.length === 0) {
      if (typeof window.showToast === "function") {
        window.showToast("Este examen no tiene preguntas registradas.", "info");
      }
      return;
    }

    // Verificar que todas estén contestadas
    const unanswered = questions.filter((q) => {
      if (q.question_type === "matching") {
        const ans = selectedAnswers[q.id];
        if (!ans) return true;
        const totalPairs = q.matching_pairs?.length || 0;
        const answeredPairs = Object.keys(ans).filter((k) => ans[k]).length;
        return answeredPairs < totalPairs;
      } else {
        return !selectedAnswers[q.id];
      }
    });

    if (unanswered.length > 0) {
      if (typeof window.showToast === "function") {
        window.showToast(
          `Por favor responde todas las preguntas del examen. Te faltan ${unanswered.length} pregunta(s).`,
          "warning",
        );
      }
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "⚡ ¿Enviar Examen?",
      message:
        "¿Seguro que deseas enviar tus respuestas? Una vez enviado, tu examen será calificado automáticamente y no podrás volver a presentarlo.",
      onConfirm: () => processQuizSubmission(quizId, false),
    });
  };

  const handleStartQuiz = (quizId) => {
    if (!user?.id) return;
    const startedKey = `quiz_started_${user.id}_${quizId}`;
    localStorage.setItem(startedKey, "true");

    if (activeQuiz?.duration_minutes) {
      const timerKey = `quiz_timer_${user.id}_${quizId}`;
      if (!localStorage.getItem(timerKey)) {
        localStorage.setItem(timerKey, Date.now().toString());
      }
    }
    setQuizStartTrigger((prev) => prev + 1);
  };

  // Efecto para temporizador en vivo del examen
  useEffect(() => {
    if (
      !activeQuiz ||
      quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) ||
      !activeQuiz.duration_minutes
    ) {
      setTimeLeftSeconds(null);
      return;
    }

    if (activeQuiz.due_date && new Date() > new Date(activeQuiz.due_date)) {
      setTimeLeftSeconds(null);
      return;
    }

    const startedKey = `quiz_started_${user?.id}_${activeQuiz.id}`;
    const storageKey = `quiz_timer_${user?.id}_${activeQuiz.id}`;

    // No iniciar temporizador si el estudiante no ha presionado 'Comenzar Examen'
    if (
      !localStorage.getItem(startedKey) &&
      !localStorage.getItem(storageKey)
    ) {
      setTimeLeftSeconds(null);
      return;
    }

    const totalSeconds = parseInt(activeQuiz.duration_minutes) * 60;
    let startTime = localStorage.getItem(storageKey);

    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem(storageKey, startTime);
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - parseInt(startTime)) / 1000,
    );
    const initialRemaining = Math.max(0, totalSeconds - elapsedSeconds);
    setTimeLeftSeconds(initialRemaining);

    if (initialRemaining <= 0) {
      localStorage.removeItem(storageKey);
      processQuizSubmission(activeQuiz.id, true);
      return;
    }

    const timerInterval = setInterval(() => {
      const currentElapsed = Math.floor(
        (Date.now() - parseInt(startTime)) / 1000,
      );
      const currentRemaining = Math.max(0, totalSeconds - currentElapsed);
      setTimeLeftSeconds(currentRemaining);

      if (currentRemaining <= 0) {
        clearInterval(timerInterval);
        localStorage.removeItem(storageKey);
        processQuizSubmission(activeQuiz.id, true);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeQuiz, quizSubmissions, user, quizStartTrigger]);

  // Convertir URL estándar de YouTube/Vimeo a formato Embed seguro
  const getEmbedUrl = (url) => {
    if (!url) return null;

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const regExp =
        /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);

      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`;
      }
    }

    if (url.includes("vimeo.com")) {
      const regExp =
        /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]+)\/videos\/|album\/(?:\d+)\/video\/|video\/)?(\d+)(?:$|\/|\?)/;

      const match = url.match(regExp);

      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?h=0&title=0&byline=0&portrait=0`;
      }
    }
    return url;
  };

  const calculateProgressPercentage = () => {
    const totalItems = lessons.length + assignments.length + quizzes.length;
    if (totalItems === 0) return 0;

    const completedLessonsCount = lessons.filter((l) =>
      completedLessons.has(l.id),
    ).length;
    const completedAssignmentsCount = assignments.filter((a) =>
      studentSubmissions.some((s) => s.assignment_id === a.id),
    ).length;
    const completedQuizzesCount = quizzes.filter((q) =>
      quizSubmissions.some((s) => s.quiz_id === q.id),
    ).length;

    const totalCompleted =
      completedLessonsCount + completedAssignmentsCount + completedQuizzesCount;
    return Math.round((totalCompleted / totalItems) * 100);
  };

  if (loading) {
    return (
      <div className="classroom-loading">
        <div className="spinner"></div>
        <p>Cargando Aula Virtual de ABC Digital STEAM...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="classroom-error">
        <h2>Curso no encontrado</h2>
        <p>
          No se pudo localizar el aula virtual de este curso o no tienes
          permisos de acceso.
        </p>
        <Link to="/dashboard" className="btn-back">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Calcular el promedio general de calificaciones (Tareas + Exámenes)
  const calculateGradeAverage = () => {
    let totalScore = 0;
    let gradedItemsCount = 0;

    // 1. Tareas calificadas (submissions.grade)
    studentSubmissions.forEach((sub) => {
      if (sub.grade !== null && sub.grade !== undefined && !isNaN(sub.grade)) {
        totalScore += parseFloat(sub.grade);
        gradedItemsCount++;
      }
    });

    // 2. Exámenes calificados (quizSubmissions.score)
    quizSubmissions.forEach((sub) => {
      if (sub.score !== null && sub.score !== undefined && !isNaN(sub.score)) {
        totalScore += parseFloat(sub.score);
        gradedItemsCount++;
      }
    });

    return gradedItemsCount > 0
      ? Math.round(totalScore / gradedItemsCount)
      : null;
  };

  // Generar lista consolidada de todas las actividades (Tareas y Exámenes)
  const getAllActivitiesList = () => {
    const list = [];

    // 1. Procesar Tareas
    assignments.forEach((assign) => {
      const mod = modules.find((m) => m.id === assign.module_id);
      const studentSub = studentSubmissions.find(
        (s) => s.assignment_id === assign.id,
      );

      let status = "pending_todo";
      let score = null;
      let feedback = null;

      if (studentSub) {
        if (
          studentSub.grade !== null &&
          studentSub.grade !== undefined &&
          !isNaN(studentSub.grade)
        ) {
          status = "graded";
          score = parseFloat(studentSub.grade);
        } else {
          status = "pending_grade";
        }
        feedback = studentSub.feedback || null;
      }

      list.push({
        id: assign.id,
        type: "assignment",
        title: assign.title,
        moduleTitle: mod ? mod.title : "Módulo General",
        due_date: assign.due_date,
        status, // "pending_todo", "pending_grade", "graded"
        score,
        feedback,
        rawItem: assign,
      });
    });

    // 2. Procesar Exámenes
    quizzes.forEach((qz) => {
      const mod = modules.find((m) => m.id === qz.module_id);
      const quizSub = quizSubmissions.find((s) => s.quiz_id === qz.id);

      let status = "pending_todo";
      let score = null;

      if (quizSub) {
        status = "graded";
        score = parseFloat(quizSub.score);
      }

      list.push({
        id: qz.id,
        type: "quiz",
        title: qz.title,
        moduleTitle: mod ? mod.title : "Módulo General",
        due_date: qz.due_date || null,
        duration_minutes: qz.duration_minutes || null,
        status, // "pending_todo", "graded"
        score,
        feedback: null,
        rawItem: qz,
      });
    });

    return list;
  };

  const allActivitiesList = getAllActivitiesList();
  const avgGrade = calculateGradeAverage();
  const pendingTodoCount = allActivitiesList.filter(
    (a) => a.status === "pending_todo",
  ).length;
  const pendingGradeCount = allActivitiesList.filter(
    (a) => a.status === "pending_grade",
  ).length;
  const gradedCount = allActivitiesList.filter(
    (a) => a.status === "graded",
  ).length;
  const passedCount = allActivitiesList.filter(
    (a) => a.status === "graded" && a.score >= 60,
  ).length;

  const filteredActivitiesList = allActivitiesList.filter((item) => {
    if (gradeFilter === "pending_todo") return item.status === "pending_todo";
    if (gradeFilter === "pending_grade") return item.status === "pending_grade";
    if (gradeFilter === "graded") return item.status === "graded";
    return true;
  });

  const progressPercent = calculateProgressPercentage();
  const currentModuleAssignments = activeLesson
    ? assignments.filter((a) => a.module_id === activeLesson.module_id)
    : [];

  return (
    <div className="classroom-layout">
      {/* HEADER SUPERIOR */}
      <header className="classroom-header">
        <div className="header-left">
          <Link
            to="/dashboard"
            className="back-dashboard-btn"
            title="Volver al Panel de Cursos"
          >
            <i className="fas fa-arrow-left"></i> ← Volver
          </Link>
          <div className="course-title-section">
            <span className="course-tag">AULA VIRTUAL</span>
            <h1 className="course-name-title">{course.name}</h1>
          </div>
        </div>

        {/* Barra de progreso global del curso */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="header-progress-container">
            <div className="progress-info-text">
              <span>Tu Progreso:</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Promedio de Calificaciones */}
          {(() => {
            const avgGrade = calculateGradeAverage();
            return (
              <div
                className="header-progress-container"
                style={{ minWidth: "150px" }}
              >
                <div className="progress-info-text">
                  <span>Promedio General:</span>
                  <strong
                    style={{
                      color:
                        avgGrade !== null
                          ? avgGrade >= 60
                            ? "var(--success)"
                            : "var(--error)"
                          : "var(--text-muted)",
                    }}
                  >
                    {avgGrade !== null ? `${avgGrade} / 100` : "Sin notas"}
                  </strong>
                </div>
                <div
                  className="progress-bar-bg"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: avgGrade !== null ? `${avgGrade}%` : "0%",
                      backgroundColor:
                        avgGrade !== null
                          ? avgGrade >= 60
                            ? "var(--success)"
                            : "var(--error)"
                          : "transparent",
                    }}
                  ></div>
                </div>
              </div>
            );
          })()}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="toggle-sidebar-btn"
            onClick={() => {
              setActiveLesson(null);
              setActiveAssignment(null);
              setActiveQuiz(null);
              setShowGradeSummary(!showGradeSummary);
            }}
            style={{
              background: showGradeSummary
                ? "var(--primary)"
                : "rgba(255, 255, 255, 0.08)",
              color: showGradeSummary ? "black" : "white",
              border: "1px solid var(--primary)",
            }}
            title="Ver cuadro de notas y actividades pendientes"
          >
            📊 {showGradeSummary ? "Ver Contenidos" : "Mis Notas y Pendientes"}
          </button>

          <button
            className="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Ocultar temario" : "Mostrar temario"}
          >
            {sidebarOpen ? "📖 Ocultar Temario" : "📖 Ver Temario"}
          </button>
        </div>
      </header>

      <div className="classroom-body">
        {/* SIDEBAR IZQUIERDA: TEMARIO DEL CURSO */}
        <aside
          className={`classroom-sidebar ${sidebarOpen ? "open" : "collapsed"}`}
        >
          <div className="sidebar-title">
            <h3>Contenido del Curso</h3>
          </div>
          <div className="sidebar-scrollable">
            {modules.map((mod, modIdx) => {
              const moduleLessons = lessons.filter(
                (l) => l.module_id === mod.id,
              );
              const moduleAssignments = assignments.filter(
                (a) => a.module_id === mod.id,
              );
              const moduleQuizzes = quizzes.filter(
                (q) => q.module_id === mod.id,
              );

              const isExpanded = !!expandedModules[mod.id];
              const totalActivities =
                moduleLessons.length +
                moduleAssignments.length +
                moduleQuizzes.length;

              return (
                <div
                  key={mod.id}
                  className="sidebar-module-block"
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    paddingBottom: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {/* CABECERA COLAPSABLE DEL MÓDULO */}
                  <div
                    className="module-title-heading"
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      padding: "0.8rem 1rem",
                      borderRadius: "8px",
                      background: isExpanded
                        ? "rgba(245, 158, 11, 0.05)"
                        : "transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          color: "var(--primary)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        MÓDULO {modIdx + 1}
                      </span>
                      <strong
                        style={{
                          fontSize: "0.95rem",
                          color: "white",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {mod.title}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ({totalActivities})
                      </span>
                      <span
                        style={{ fontSize: "0.8rem", color: "var(--primary)" }}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>

                  {/* LISTA DE ACTIVIDADES (SOLO SI ESTÁ EXPANDIDA) */}
                  {isExpanded && (
                    <ul
                      className="sidebar-lesson-list"
                      style={{
                        padding: "0.5rem 0 0 1rem",
                        margin: 0,
                        listStyle: "none",
                      }}
                    >
                      {/* LECCIONES */}
                      {moduleLessons.map((les) => {
                        const isActive =
                          activeLesson && activeLesson.id === les.id;
                        const isDone = completedLessons.has(les.id);
                        return (
                          <li
                            key={les.id}
                            className={`sidebar-lesson-item ${isActive ? "active" : ""} ${isDone ? "completed" : ""}`}
                            onClick={() => {
                              setActiveLesson(les);
                              setActiveQuiz(null);
                              setActiveAssignment(null);
                              setShowGradeSummary(false);
                              if (window.innerWidth <= 1024) {
                                setSidebarOpen(false);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "0.6rem 0.8rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              margin: "3px 0",
                              background: isActive
                                ? "rgba(255, 255, 255, 0.05)"
                                : "transparent",
                              transition: "all 0.2s",
                            }}
                          >
                            <div
                              className="lesson-check-status"
                              style={{
                                marginRight: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              {isDone ? "✅" : "⚪"}
                            </div>
                            <span
                              className="lesson-title-span"
                              style={{
                                fontSize: "0.9rem",
                                color: isActive
                                  ? "var(--primary)"
                                  : "var(--text-main)",
                                fontWeight: isActive ? "bold" : "normal",
                              }}
                            >
                              {les.title}
                            </span>
                            {les.video_url && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: "0.85rem",
                                }}
                              >
                                🎥
                              </span>
                            )}
                          </li>
                        );
                      })}

                      {/* TAREAS / PROYECTOS */}
                      {moduleAssignments.map((assign) => {
                        const studentSub = studentSubmissions.find(
                          (s) => s.assignment_id === assign.id,
                        );
                        const isDone = !!studentSub;
                        const isManual =
                          studentSub &&
                          studentSub.file_url === "completado_manual";
                        const isActive =
                          activeAssignment && activeAssignment.id === assign.id;

                        return (
                          <li
                            key={assign.id}
                            className={`sidebar-lesson-item ${isActive ? "active" : ""}`}
                            onClick={() => {
                              setActiveAssignment(assign);
                              setActiveLesson(null);
                              setActiveQuiz(null);
                              setShowGradeSummary(false);
                              if (window.innerWidth <= 1024) {
                                setSidebarOpen(false);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "0.6rem 0.8rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              margin: "3px 0",
                              borderLeft: "2px solid #3b82f6",
                              background: isActive
                                ? "rgba(59, 130, 246, 0.15)"
                                : "rgba(59, 130, 246, 0.03)",
                              transition: "all 0.2s",
                            }}
                          >
                            <div
                              className="lesson-check-status"
                              style={{
                                marginRight: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              {isDone ? "✅" : "🔵"}
                            </div>
                            <span
                              className="lesson-title-span"
                              style={{
                                fontSize: "0.9rem",
                                color: isActive
                                  ? "#60a5fa"
                                  : "var(--text-main)",
                                fontWeight: isActive ? "bold" : "normal",
                              }}
                            >
                              Tarea: {assign.title}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "0.85rem",
                              }}
                            >
                              📝
                            </span>
                          </li>
                        );
                      })}

                      {/* EXÁMENES (QUIZZES) */}
                      {moduleQuizzes.map((qz) => {
                        const isQuizSubmitted = quizSubmissions.some(
                          (s) => s.quiz_id === qz.id,
                        );
                        const isQuizActive =
                          activeQuiz && activeQuiz.id === qz.id;
                        return (
                          <li
                            key={qz.id}
                            className={`sidebar-lesson-item ${isQuizActive ? "active" : ""}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "0.6rem 0.8rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              margin: "3px 0",
                              borderLeft: "2px solid var(--primary)",
                              background: isQuizActive
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(245, 158, 11, 0.03)",
                              transition: "all 0.2s",
                            }}
                            onClick={() => {
                              setActiveQuiz(qz);
                              setActiveLesson(null);
                              setActiveAssignment(null);
                              setShowGradeSummary(false);
                              if (window.innerWidth <= 1024) {
                                setSidebarOpen(false);
                              }
                            }}
                          >
                            <div
                              className="lesson-check-status"
                              style={{
                                marginRight: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              {isQuizSubmitted ? "✅" : "⚡"}
                            </div>
                            <span
                              className="lesson-title-span"
                              style={{
                                fontSize: "0.9rem",
                                color: isQuizActive
                                  ? "var(--primary)"
                                  : "var(--text-main)",
                                fontWeight: isQuizActive ? "bold" : "normal",
                              }}
                            >
                              Examen: {qz.title}
                            </span>
                          </li>
                        );
                      })}

                      {totalActivities === 0 && (
                        <p
                          className="no-lessons-text"
                          style={{
                            fontSize: "0.8rem",
                            fontStyle: "italic",
                            color: "var(--text-muted)",
                            padding: "0.5rem 0.8rem",
                          }}
                        >
                          Próximamente más contenidos.
                        </p>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
            {modules.length === 0 && (
              <p className="no-modules-text">
                Este curso no tiene módulos cargados aún.
              </p>
            )}
          </div>
        </aside>

        {/* ÁREA PRINCIPAL: REPRODUCTOR DE CONTENIDOS */}
        <main className="classroom-content">
          {activeAssignment ? (
            <div
              className="lesson-viewer-card"
              style={{ border: "1px solid #3b82f6" }}
            >
              {/* Encabezado de la Tarea */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-muted)",
                  paddingBottom: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <span
                    className="course-tag"
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                    }}
                  >
                    PROYECTO / ACTIVIDAD PRÁCTICA
                  </span>
                  <h2 style={{ color: "#60a5fa", margin: "0.25rem 0 0 0" }}>
                    {activeAssignment.title}
                  </h2>
                </div>
                <strong style={{ fontSize: "1.1rem" }}>
                  ABC Digital STEAM
                </strong>
              </div>

              {/* Contenido/Instrucciones de la Tarea */}
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  borderLeft: "4px solid #3b82f6",
                  marginBottom: "2rem",
                }}
              >
                <h4 style={{ color: "#60a5fa", margin: "0 0 0.5rem 0" }}>
                  📋 Instrucciones del Proyecto:
                </h4>
                <p
                  style={{
                    color: "var(--text-main)",
                    fontSize: "1rem",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {activeAssignment.description}
                </p>
                {activeAssignment.due_date && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      color: "var(--error)",
                      fontWeight: "bold",
                      marginTop: "1rem",
                    }}
                  >
                    📅 Fecha Límite de Entrega:{" "}
                    {new Date(activeAssignment.due_date).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Archivo adjunto/Guía del docente si existe */}
              {activeAssignment.resource_url && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px dashed var(--success)",
                    padding: "1rem",
                    borderRadius: "10px",
                    marginBottom: "2rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--success)" }}>
                      📁 Guía del Docente Adjunta:
                    </strong>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {activeAssignment.resource_name || "Guia_de_estudio.pdf"}
                    </p>
                  </div>
                  <a
                    href={getCorrectUrl(activeAssignment.resource_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "var(--success)",
                      color: "white",
                      padding: "0.6rem 1.2rem",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                    }}
                  >
                    Descargar Guía PDF
                  </a>
                </div>
              )}

              {/* PANEL DE ENTREGA Y ESTADO "HECHO" */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "12px",
                  padding: "2rem",
                }}
              >
                <h3
                  style={{
                    color: "white",
                    margin: "0 0 1.5rem 0",
                    fontSize: "1.3rem",
                  }}
                >
                  📥 Tu Estado de Entrega
                </h3>

                {(() => {
                  const studentSub = studentSubmissions.find(
                    (s) => s.assignment_id === activeAssignment.id,
                  );
                  const isDone = !!studentSub;
                  const isManual =
                    studentSub && studentSub.file_url === "completado_manual";
                  const fileSelected =
                    selectedSubmissionFile[activeAssignment.id];

                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "2rem",
                        alignItems: "center",
                      }}
                    >
                      {/* LADO DE CONTROL Y BOTONES */}
                      <div>
                        {isDone ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "1rem",
                            }}
                          >
                            <div
                              style={{
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid var(--success)",
                                padding: "1rem",
                                borderRadius: "8px",
                              }}
                            >
                              <strong
                                style={{
                                  color: "var(--success)",
                                  fontSize: "1.1rem",
                                  display: "block",
                                }}
                              >
                                {isManual
                                  ? "✓ Actividad Completada"
                                  : "✓ Proyecto Entregado con Éxito"}
                              </strong>
                              {!isManual && (
                                <a
                                  href={getCorrectUrl(studentSub.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#60a5fa",
                                    fontSize: "0.9rem",
                                    textDecoration: "underline",
                                    display: "block",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  📄 Ver Archivo Subido: {studentSub.file_name}
                                </a>
                              )}
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.5rem",
                                }}
                              >
                                Registrado el:{" "}
                                {new Date(
                                  studentSub.submitted_at,
                                ).toLocaleString()}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                toggleAssignmentCompletion(activeAssignment.id)
                              }
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "var(--error)",
                                border: "1px solid var(--error)",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {isManual
                                ? "Desmarcar como Completado"
                                : "Eliminar Entrega de Archivo"}
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "1.5rem",
                            }}
                          >
                            {/* OPCIÓN 1: BOTÓN HECHO DIRECTO (Ideal para clases o tareas sin archivo) */}
                            <div
                              style={{
                                borderBottom: "1px solid var(--border-muted)",
                                paddingBottom: "1.5rem",
                              }}
                            >
                              <p
                                style={{
                                  margin: "0 0 1rem 0",
                                  color: "var(--text-muted)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                ¿Completaste esta actividad práctica en clase
                                presencial o ya la terminaste? Márcala como
                                completada de inmediato:
                              </p>
                              <button
                                onClick={() =>
                                  toggleAssignmentCompletion(
                                    activeAssignment.id,
                                  )
                                }
                                style={{
                                  width: "100%",
                                  background:
                                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "white",
                                  border: "none",
                                  padding: "1rem",
                                  borderRadius: "10px",
                                  fontWeight: "bold",
                                  fontSize: "1.05rem",
                                  cursor: "pointer",
                                  boxShadow:
                                    "0 4px 12px rgba(16, 185, 129, 0.2)",
                                }}
                              >
                                🚀 Marcar como Hecho
                              </button>
                            </div>

                            {/* OPCIÓN 2: SUBIR DOCUMENTO ESCRITO */}
                            <div>
                              <p
                                style={{
                                  margin: "0 0 1rem 0",
                                  color: "var(--text-muted)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                O si debes adjuntar tu informe o evidencias,
                                selecciona tu archivo en PDF, Word o PowerPoint:
                              </p>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                onChange={(e) =>
                                  setSelectedSubmissionFile({
                                    ...selectedSubmissionFile,
                                    [activeAssignment.id]: e.target.files[0],
                                  })
                                }
                                style={{
                                  display: "block",
                                  width: "100%",
                                  marginBottom: "1rem",
                                  color: "var(--text-muted)",
                                }}
                              />
                              <button
                                onClick={() =>
                                  handleUploadSubmission(activeAssignment.id)
                                }
                                disabled={
                                  uploadingAssignmentId ===
                                    activeAssignment.id || !fileSelected
                                }
                                style={{
                                  width: "100%",
                                  background: fileSelected
                                    ? "var(--primary)"
                                    : "#252f41",
                                  color: fileSelected ? "black" : "#64748b",
                                  fontWeight: "bold",
                                  border: "none",
                                  padding: "1rem",
                                  borderRadius: "10px",
                                  fontSize: "1.05rem",
                                  cursor: fileSelected
                                    ? "pointer"
                                    : "not-allowed",
                                }}
                              >
                                {uploadingAssignmentId === activeAssignment.id
                                  ? "Subiendo archivo..."
                                  : "📤 Subir e Inscribir Proyecto"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* LADO DE CALIFICACIÓN Y RETROALIMENTACIÓN */}
                      <div
                        style={{
                          background: "var(--bg-main)",
                          padding: "1.5rem",
                          borderRadius: "10px",
                          border: "1px solid var(--border-light)",
                          minHeight: "220px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Calificación Obtenida:
                        </span>
                        <strong
                          style={{
                            fontSize: "2.2rem",
                            color:
                              studentSub && studentSub.grade !== null
                                ? "var(--success)"
                                : "var(--text-muted)",
                            display: "block",
                            marginBottom: "1rem",
                          }}
                        >
                          {studentSub && studentSub.grade !== null
                            ? `${studentSub.grade} / 100`
                            : "Pendiente de Revisión"}
                        </strong>

                        {studentSub && studentSub.feedback && (
                          <div
                            style={{
                              borderTop: "1px solid var(--border-muted)",
                              paddingTop: "1rem",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                fontSize: "0.85rem",
                                color: "var(--primary)",
                                fontWeight: "bold",
                                marginBottom: "0.25rem",
                              }}
                            >
                              💬 Retroalimentación del Profesor:
                            </span>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.9rem",
                                color: "var(--text-main)",
                                fontStyle: "italic",
                              }}
                            >
                              "{studentSub.feedback}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : activeQuiz ? (
            <div
              className="lesson-viewer-card"
              style={{ border: "1px solid var(--primary)" }}
            >
              {/* Encabezado del Examen */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-muted)",
                  paddingBottom: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <span
                    className="course-tag"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "var(--primary)",
                    }}
                  >
                    EVALUACIÓN AUTOMÁTICA
                  </span>
                  <h2
                    style={{ color: "var(--primary)", margin: "0.25rem 0 0 0" }}
                  >
                    {activeQuiz.title}
                  </h2>
                </div>
                <strong style={{ fontSize: "1.1rem" }}>
                  ABC Digital STEAM
                </strong>
              </div>

              {activeQuiz.description && (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                    background: "rgba(255,255,255,0.02)",
                    padding: "1rem",
                    borderRadius: "8px",
                    borderLeft: "4px solid var(--primary)",
                    marginBottom: "1.5rem",
                  }}
                >
                  📖 <strong>Instrucciones:</strong> {activeQuiz.description}
                </p>
              )}

              {/* Barra de Información de Fecha Límite, Duración y Temporizador en Vivo */}
              {!quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) && (
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                    background: "rgba(255,255,255,0.02)",
                    padding: "1rem 1.25rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-muted)",
                    marginBottom: "2rem",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {activeQuiz.due_date && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        📅 <strong>Fecha Límite:</strong>{" "}
                        <span style={{ color: "white", fontWeight: "bold" }}>
                          {new Date(activeQuiz.due_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {activeQuiz.duration_minutes && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ⏱️ <strong>Duración Máxima:</strong>{" "}
                        <span
                          style={{
                            color: "var(--primary)",
                            fontWeight: "bold",
                          }}
                        >
                          {activeQuiz.duration_minutes} minutos
                        </span>
                      </div>
                    )}
                  </div>

                  {timeLeftSeconds !== null && (
                    <div
                      style={{
                        background:
                          timeLeftSeconds < 300
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(245, 158, 11, 0.2)",
                        border: "1px solid",
                        borderColor:
                          timeLeftSeconds < 300
                            ? "var(--error)"
                            : "var(--primary)",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>⏳</span>
                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: "bold",
                          color:
                            timeLeftSeconds < 300
                              ? "#f87171"
                              : "var(--primary)",
                        }}
                      >
                        Tiempo Restante: {Math.floor(timeLeftSeconds / 60)}:
                        {(timeLeftSeconds % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Si la fecha límite ya venció y no lo presentó */}
              {activeQuiz.due_date &&
              new Date() > new Date(activeQuiz.due_date) &&
              !quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1.5rem",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: "12px",
                    border: "1px solid var(--error)",
                  }}
                >
                  <span style={{ fontSize: "4rem" }}>⚠️</span>
                  <h3
                    style={{
                      fontSize: "1.8rem",
                      color: "var(--error)",
                      margin: "1rem 0",
                    }}
                  >
                    Evaluación Vencida
                  </h3>
                  <p
                    style={{
                      color: "var(--text-main)",
                      fontSize: "1.05rem",
                      margin: "0.5rem 0",
                    }}
                  >
                    La fecha límite para presentar este examen era el{" "}
                    <strong>
                      {new Date(activeQuiz.due_date).toLocaleString()}
                    </strong>
                    .
                  </p>
                  <p
                    style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}
                  >
                    Esta evaluación ya no se encuentra disponible para su
                    desarrollo. Si necesitas una extensión, por favor contacta a
                    tu profesor.
                  </p>
                </div>
              ) : quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) ? (
                (() => {
                  const sub = quizSubmissions.find(
                    (s) => s.quiz_id === activeQuiz.id,
                  );
                  const isApproved = sub.score >= 60;
                  return (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem 1.5rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "12px",
                        border: "1px solid var(--border-muted)",
                      }}
                    >
                      <span style={{ fontSize: "4rem" }}>
                        {isApproved ? "🎉" : "⚠️"}
                      </span>
                      <h3
                        style={{
                          fontSize: "1.8rem",
                          color: isApproved ? "var(--success)" : "var(--error)",
                          margin: "1rem 0",
                        }}
                      >
                        {isApproved
                          ? "¡Examen Aprobado!"
                          : "Examen No Aprobado"}
                      </h3>
                      <p
                        style={{
                          color: "var(--text-main)",
                          fontSize: "1.1rem",
                          margin: "0.5rem 0",
                        }}
                      >
                        Tu puntaje final fue de:{" "}
                        <strong
                          style={{
                            fontSize: "1.6rem",
                            color: "var(--primary)",
                          }}
                        >
                          {sub.score} / 100
                        </strong>
                      </p>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.95rem",
                        }}
                      >
                        Respondiste correctamente{" "}
                        <strong>{sub.correct_answers}</strong> de un total de{" "}
                        <strong>{sub.total_questions}</strong> preguntas.
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginTop: "2rem",
                        }}
                      >
                        Presentado el:{" "}
                        {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })()
              ) : !quizSubmissions.some((s) => s.quiz_id === activeQuiz.id) &&
                !localStorage.getItem(
                  `quiz_started_${user?.id}_${activeQuiz.id}`,
                ) ? (
                /* PANTALLA DE INICIO / LOBBY DEL EXAMEN (ANTES DE COMENZAR) */
                <div
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 1.5rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "14px",
                    border: "1px solid var(--border-muted)",
                  }}
                >
                  <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>
                    📝
                  </div>
                  <h3
                    style={{
                      fontSize: "1.6rem",
                      color: "white",
                      margin: "0.5rem 0",
                    }}
                  >
                    ¿Listo para comenzar el examen?
                  </h3>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.95rem",
                      maxWidth: "580px",
                      margin: "0.5rem auto 1.5rem auto",
                      lineHeight: "1.6",
                    }}
                  >
                    Al hacer clic en el botón de abajo, el tiempo comenzará a
                    correr y tendrás acceso a todas las preguntas de la
                    evaluación. Asegúrate de contar con tiempo suficiente y una
                    conexión estable antes de iniciar.
                  </p>

                  {/* Tarjetas Informativas de la Evaluación */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                      marginBottom: "2rem",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--bg-main)",
                        padding: "1rem 1.5rem",
                        borderRadius: "10px",
                        border: "1px solid var(--border-light)",
                        minWidth: "160px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          display: "block",
                        }}
                      >
                        Preguntas Totales
                      </span>
                      <strong
                        style={{ fontSize: "1.2rem", color: "var(--primary)" }}
                      >
                        {
                          quizQuestions.filter(
                            (q) => q.quiz_id === activeQuiz.id,
                          ).length
                        }{" "}
                        preguntas
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "var(--bg-main)",
                        padding: "1rem 1.5rem",
                        borderRadius: "10px",
                        border: "1px solid var(--border-light)",
                        minWidth: "160px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          display: "block",
                        }}
                      >
                        Duración Máxima
                      </span>
                      <strong
                        style={{
                          fontSize: "1.2rem",
                          color: activeQuiz.duration_minutes
                            ? "var(--primary)"
                            : "var(--success)",
                        }}
                      >
                        {activeQuiz.duration_minutes
                          ? `${activeQuiz.duration_minutes} minutos`
                          : "Sin límite"}
                      </strong>
                    </div>

                    {activeQuiz.due_date && (
                      <div
                        style={{
                          background: "var(--bg-main)",
                          padding: "1rem 1.5rem",
                          borderRadius: "10px",
                          border: "1px solid var(--border-light)",
                          minWidth: "160px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            display: "block",
                          }}
                        >
                          Fecha Límite
                        </span>
                        <strong style={{ fontSize: "0.95rem", color: "white" }}>
                          {new Date(activeQuiz.due_date).toLocaleString()}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Advertencia antes de comenzar */}
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      padding: "1rem",
                      borderRadius: "10px",
                      maxWidth: "550px",
                      margin: "0 auto 2rem auto",
                      fontSize: "0.88rem",
                      color: "#cbd5e1",
                    }}
                  >
                    ⚠️ <strong>Nota Importante:</strong> Una vez iniciado el
                    examen, no podrás pausar la cuenta regresiva. Tus respuestas
                    parciales se enviarán automáticamente si agotas el tiempo
                    límite.
                  </div>

                  {/* Botón Principal para Habilitar y Comenzar */}
                  <button
                    onClick={() => handleStartQuiz(activeQuiz.id)}
                    style={{
                      background: "var(--primary)",
                      color: "#0f172a",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                      border: "none",
                      padding: "1rem 2.5rem",
                      borderRadius: "10px",
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
                      transition: "all 0.2s",
                    }}
                  >
                    🚀 Comenzar Examen Ahora
                  </button>
                </div>
              ) : (
                /* Si ya inició el examen, renderizar preguntas */
                <div>
                  {quizQuestions.filter((q) => q.quiz_id === activeQuiz.id)
                    .length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Este examen no contiene preguntas registradas aún por el
                      profesor.
                    </p>
                  ) : (
                    <div>
                      {quizQuestions
                        .filter((q) => q.quiz_id === activeQuiz.id)
                        .map((q, qIdx) => {
                          const isMatching = q.question_type === "matching";

                          return (
                            <div
                              key={q.id}
                              style={{
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-muted)",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                marginBottom: "1.5rem",
                              }}
                            >
                              <h4
                                style={{
                                  margin: "0 0 1rem 0",
                                  fontSize: "1.1rem",
                                  lineHeight: "1.5",
                                }}
                              >
                                <span
                                  style={{
                                    color: "var(--primary)",
                                    marginRight: "0.5rem",
                                  }}
                                >
                                  Pregunta {qIdx + 1}:
                                </span>
                                {isMatching ? "🧩 [Relacionar Parejas] " : ""}
                                {q.question_text}
                              </h4>

                              {!isMatching ? (
                                /* Opciones de respuesta Selección Múltiple */
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.75rem",
                                  }}
                                >
                                  {[
                                    { label: "A", text: q.option_a },
                                    { label: "B", text: q.option_b },
                                    { label: "C", text: q.option_c },
                                    { label: "D", text: q.option_d },
                                  ].map((opt) => (
                                    <label
                                      key={opt.label}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "1rem",
                                        padding: "0.8rem 1.2rem",
                                        background:
                                          selectedAnswers[q.id] === opt.label
                                            ? "rgba(245, 158, 11, 0.08)"
                                            : "var(--bg-main)",
                                        border: "1px solid",
                                        borderColor:
                                          selectedAnswers[q.id] === opt.label
                                            ? "var(--primary)"
                                            : "var(--border-light)",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        value={opt.label}
                                        checked={
                                          selectedAnswers[q.id] === opt.label
                                        }
                                        onChange={() =>
                                          setSelectedAnswers({
                                            ...selectedAnswers,
                                            [q.id]: opt.label,
                                          })
                                        }
                                        style={{
                                          accentColor: "var(--primary)",
                                          width: "18px",
                                          height: "18px",
                                          margin: 0,
                                        }}
                                      />
                                      <div>
                                        <strong
                                          style={{
                                            color: "var(--primary)",
                                            marginRight: "0.5rem",
                                          }}
                                        >
                                          {opt.label}.
                                        </strong>
                                        {opt.text}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                /* Opciones de relacionar parejas */
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "1rem",
                                    background: "rgba(0,0,0,0.15)",
                                    padding: "1.25rem",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-muted)",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: "0.5rem",
                                    }}
                                  >
                                    Selecciona la pareja correcta para cada
                                    concepto de la izquierda:
                                  </span>
                                  {q.matching_pairs?.map((pair, idx) => {
                                    const currentSelectVal =
                                      (selectedAnswers[q.id] || {})[pair.p] ||
                                      "";
                                    const options =
                                      shuffledOptionsMap[q.id] || [];

                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "1rem",
                                          justifyContent: "space-between",
                                          flexWrap: "wrap",
                                          borderBottom:
                                            idx < q.matching_pairs.length - 1
                                              ? "1px solid rgba(255,255,255,0.03)"
                                              : "none",
                                          paddingBottom:
                                            idx < q.matching_pairs.length - 1
                                              ? "0.75rem"
                                              : "0",
                                        }}
                                      >
                                        <div
                                          style={{
                                            flex: "1 1 200px",
                                            minWidth: "150px",
                                          }}
                                        >
                                          <strong
                                            style={{
                                              color: "var(--primary)",
                                              marginRight: "0.5rem",
                                            }}
                                          >
                                            {idx + 1}.
                                          </strong>
                                          <span style={{ fontSize: "0.95rem" }}>
                                            {pair.p}
                                          </span>
                                        </div>
                                        <div
                                          style={{
                                            flex: "1 1 250px",
                                            minWidth: "200px",
                                          }}
                                        >
                                          <select
                                            value={currentSelectVal}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setSelectedAnswers((prev) => {
                                                const currentAns =
                                                  prev[q.id] || {};
                                                return {
                                                  ...prev,
                                                  [q.id]: {
                                                    ...currentAns,
                                                    [pair.p]: val,
                                                  },
                                                };
                                              });
                                            }}
                                            style={{
                                              width: "100%",
                                              padding: "0.6rem",
                                              borderRadius: "8px",
                                              background: currentSelectVal
                                                ? "rgba(16, 185, 129, 0.15)"
                                                : "var(--bg-main)",
                                              color: "white",
                                              border: "1px solid",
                                              borderColor: currentSelectVal
                                                ? "var(--completed-color)"
                                                : "var(--border-light)",
                                              fontSize: "0.9rem",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <option value="">
                                              -- Elige la definición correcta --
                                            </option>
                                            {options.map((optVal, optIdx) => (
                                              <option
                                                key={optIdx}
                                                value={optVal}
                                              >
                                                {optVal}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Botón para Enviar el Examen */}
                      <button
                        onClick={() => handleSubmitQuiz(activeQuiz.id)}
                        disabled={submittingQuiz}
                        style={{
                          width: "100%",
                          background: "var(--primary)",
                          color: "black",
                          fontWeight: "bold",
                          border: "none",
                          padding: "1rem",
                          borderRadius: "10px",
                          fontSize: "1.05rem",
                          cursor: "pointer",
                          marginTop: "1rem",
                        }}
                      >
                        {submittingQuiz
                          ? "Enviando Examen y Calificando..."
                          : "Enviar Examen y Ver Calificación"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeLesson ? (
            <div className="lesson-viewer-card">
              {/* Contenedor del Video */}
              {activeLesson.video_url ? (
                <div className="video-player-wrapper">
                  <iframe
                    src={getEmbedUrl(activeLesson.video_url)}
                    title={activeLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="no-video-placeholder">
                  <span style={{ fontSize: "3rem" }}>📖</span>
                  <p>Esta lección es de lectura y actividades prácticas.</p>
                </div>
              )}

              {/* Título de la Lección y Botón de Completado */}
              <div
                className="lesson-header-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                }}
              >
                <h2 className="active-lesson-title">{activeLesson.title}</h2>
                <button
                  className={`btn-complete-lesson ${completedLessons.has(activeLesson.id) ? "completed" : ""}`}
                  onClick={() => toggleLessonCompletion(activeLesson.id)}
                  disabled={savingProgress}
                  style={{
                    background: completedLessons.has(activeLesson.id)
                      ? "var(--success)"
                      : "var(--primary)",
                    color: "black",
                    fontWeight: "bold",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  {completedLessons.has(activeLesson.id)
                    ? "✓ Clase Completada"
                    : "⚪ Marcar como Completada"}
                </button>
              </div>

              {/* Recurso de Lectura / Descargas PDF si existe */}
              {activeLesson.resource_url && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px dashed var(--success)",
                    padding: "1rem",
                    borderRadius: "10px",
                    margin: "1.5rem 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--success)" }}>
                      📁 Material de Lectura Adjunto:
                    </strong>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {activeLesson.resource_name}
                    </p>
                  </div>
                  <a
                    href={getCorrectUrl(activeLesson.resource_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "var(--success)",
                      color: "white",
                      padding: "0.6rem 1.2rem",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                    }}
                  >
                    Descargar PDF
                  </a>
                </div>
              )}

              {/* Cuerpo del Contenido de la Lección */}
              <div
                className="lesson-description-content"
                style={{
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--border-muted)",
                  paddingTop: "1.5rem",
                }}
              >
                {activeLesson.content ? (
                  <div className="markdown-body">
                    {activeLesson.content
                      .split("\n")
                      .map((paragraph, index) => (
                        <p
                          key={index}
                          style={{
                            lineHeight: "1.6",
                            color: "var(--text-main)",
                            marginBottom: "1rem",
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className="no-content-description">
                    No hay descripción o material escrito adicional para esta
                    lección. Sigue las instrucciones del video.
                  </p>
                )}
              </div>

              {/* SECCIÓN DE TAREAS / PROYECTOS DEL MÓDULO */}
              {currentModuleAssignments.length > 0 && (
                <div
                  style={{
                    marginTop: "3rem",
                    paddingTop: "2rem",
                    borderTop: "2px solid var(--primary)",
                  }}
                >
                  <h3 style={{ color: "var(--primary)", marginBottom: "1rem" }}>
                    📝 Proyectos y Entregas del Módulo
                  </h3>
                  {currentModuleAssignments.map((assign) => {
                    const studentSub = studentSubmissions.find(
                      (s) => s.assignment_id === assign.id,
                    );
                    const fileSelected = selectedSubmissionFile[assign.id];

                    return (
                      <div
                        key={assign.id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-muted)",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          marginBottom: "1.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "1rem",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "1.2rem",
                                color: "#60a5fa",
                              }}
                            >
                              {assign.title}
                            </h4>
                            <p
                              style={{
                                margin: "0.5rem 0",
                                color: "var(--text-muted)",
                                fontSize: "0.95rem",
                              }}
                            >
                              {assign.description}
                            </p>
                            {assign.due_date && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--error)",
                                  fontWeight: "bold",
                                  display: "block",
                                }}
                              >
                                📅 Fecha Límite:{" "}
                                {new Date(assign.due_date).toLocaleString()}
                              </span>
                            )}
                            {assign.resource_url && (
                              <div style={{ marginTop: "0.75rem" }}>
                                <a
                                  href={getCorrectUrl(assign.resource_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    color: "var(--primary)",
                                    fontWeight: "bold",
                                    textDecoration: "underline",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  📥 Descargar Guía o Documento de Apoyo (
                                  {assign.resource_name || "guia.pdf"})
                                </a>
                              </div>
                            )}
                          </div>

                          {/* ESTADO DE ENTREGA Y CALIFICACIÓN */}
                          <div
                            style={{
                              background: "var(--bg-main)",
                              padding: "1rem",
                              borderRadius: "10px",
                              minWidth: "220px",
                              border: "1px solid var(--border-light)",
                            }}
                          >
                            {studentSub ? (
                              <div>
                                <span
                                  style={{
                                    color: "var(--success)",
                                    fontWeight: "bold",
                                    fontSize: "0.9rem",
                                    display: "block",
                                  }}
                                >
                                  ✓ Entregado con éxito
                                </span>
                                <a
                                  href={getCorrectUrl(studentSub.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--primary)",
                                    textDecoration: "underline",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {studentSub.file_name}
                                </a>
                                <div
                                  style={{
                                    marginTop: "0.75rem",
                                    borderTop: "1px solid var(--border-muted)",
                                    paddingTop: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: "0.85rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Calificación:
                                  </span>
                                  <strong
                                    style={{
                                      fontSize: "1.2rem",
                                      color:
                                        studentSub.grade !== null
                                          ? "var(--success)"
                                          : "var(--primary)",
                                    }}
                                  >
                                    {studentSub.grade !== null
                                      ? `${studentSub.grade} / 100`
                                      : "Pendiente de revisión"}
                                  </strong>
                                  {studentSub.feedback && (
                                    <p
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                        margin: "0.4rem 0 0 0",
                                        background: "rgba(255,255,255,0.03)",
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      💬 Feedback: {studentSub.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span
                                  style={{
                                    color: "var(--error)",
                                    fontWeight: "bold",
                                    fontSize: "0.9rem",
                                    display: "block",
                                    marginBottom: "0.5rem",
                                  }}
                                >
                                  ⚠️ Sin entregar
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                                  onChange={(e) =>
                                    setSelectedSubmissionFile({
                                      ...selectedSubmissionFile,
                                      [assign.id]: e.target.files[0],
                                    })
                                  }
                                  style={{
                                    fontSize: "0.8rem",
                                    margin: "0.5rem 0",
                                    width: "100%",
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    handleUploadSubmission(assign.id)
                                  }
                                  disabled={
                                    uploadingAssignmentId === assign.id ||
                                    !fileSelected
                                  }
                                  style={{
                                    width: "100%",
                                    background: fileSelected
                                      ? "var(--success)"
                                      : "#334155",
                                    color: fileSelected ? "white" : "#64748b",
                                    fontWeight: "bold",
                                    border: "none",
                                    padding: "0.5rem",
                                    borderRadius: "6px",
                                    cursor: fileSelected
                                      ? "pointer"
                                      : "not-allowed",
                                  }}
                                >
                                  {uploadingAssignmentId === assign.id
                                    ? "Subiendo archivo..."
                                    : "Entregar Tarea"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* CUADRO DE CALIFICACIONES Y PENDIENTES (BOLETÍN DE NOTAS) */
            <div
              className="grades-summary-card animate-fade"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-muted)",
                borderRadius: "16px",
                padding: "2rem",
              }}
            >
              {/* ENCABEZADO Y FILTROS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "2rem",
                  borderBottom: "1px solid var(--border-muted)",
                  paddingBottom: "1.5rem",
                }}
              >
                <div>
                  <span
                    className="course-tag"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--success)",
                    }}
                  >
                    BOLETÍN DE NOTAS
                  </span>
                  <h2
                    style={{
                      color: "white",
                      margin: "0.25rem 0 0 0",
                      fontSize: "1.6rem",
                    }}
                  >
                    Cuadro de Calificaciones y Pendientes
                  </h2>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      margin: "0.25rem 0 0 0",
                      fontSize: "0.9rem",
                    }}
                  >
                    Revisa el estado de todas tus actividades, tareas enviadas y
                    evaluaciones en tiempo real.
                  </p>
                </div>

                {/* BOTONES DE FILTRO */}
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <button
                    onClick={() => setGradeFilter("all")}
                    style={{
                      background:
                        gradeFilter === "all"
                          ? "var(--primary)"
                          : "rgba(255,255,255,0.05)",
                      color: gradeFilter === "all" ? "black" : "white",
                      border: "1px solid var(--border-light)",
                      padding: "0.5rem 0.9rem",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Todas ({allActivitiesList.length})
                  </button>
                  <button
                    onClick={() => setGradeFilter("pending_todo")}
                    style={{
                      background:
                        gradeFilter === "pending_todo"
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        gradeFilter === "pending_todo" ? "#f87171" : "white",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      padding: "0.5rem 0.9rem",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    🔴 Por Hacer ({pendingTodoCount})
                  </button>
                  <button
                    onClick={() => setGradeFilter("pending_grade")}
                    style={{
                      background:
                        gradeFilter === "pending_grade"
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(255,255,255,0.05)",
                      color:
                        gradeFilter === "pending_grade" ? "#60a5fa" : "white",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      padding: "0.5rem 0.9rem",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    ⏳ Por Calificar ({pendingGradeCount})
                  </button>
                  <button
                    onClick={() => setGradeFilter("graded")}
                    style={{
                      background:
                        gradeFilter === "graded"
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255,255,255,0.05)",
                      color: gradeFilter === "graded" ? "#34d399" : "white",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      padding: "0.5rem 0.9rem",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    ✅ Calificadas ({gradedCount})
                  </button>
                </div>
              </div>

              {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  marginBottom: "2rem",
                }}
              >
                <div
                  style={{
                    background: "var(--bg-main)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Promedio General
                  </span>
                  <strong
                    style={{
                      fontSize: "1.8rem",
                      color:
                        avgGrade !== null
                          ? avgGrade >= 60
                            ? "var(--success)"
                            : "var(--error)"
                          : "var(--text-muted)",
                    }}
                  >
                    {avgGrade !== null ? `${avgGrade} / 100` : "Sin notas"}
                  </strong>
                </div>
                <div
                  style={{
                    background: "var(--bg-main)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Pendientes por Hacer
                  </span>
                  <strong
                    style={{
                      fontSize: "1.8rem",
                      color:
                        pendingTodoCount > 0 ? "#f87171" : "var(--success)",
                    }}
                  >
                    {pendingTodoCount}
                  </strong>
                </div>
                <div
                  style={{
                    background: "var(--bg-main)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Pendientes por Calificar
                  </span>
                  <strong style={{ fontSize: "1.8rem", color: "#60a5fa" }}>
                    {pendingGradeCount}
                  </strong>
                </div>
                <div
                  style={{
                    background: "var(--bg-main)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                    }}
                  >
                    Aprobadas
                  </span>
                  <strong
                    style={{ fontSize: "1.8rem", color: "var(--success)" }}
                  >
                    {passedCount} / {allActivitiesList.length}
                  </strong>
                </div>
              </div>

              {/* TABLA PRINCIPAL DE ACTIVIDADES */}
              <div className="table-responsive" style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: "0 0.5rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "0.75rem 1rem" }}>
                        Actividad / Evaluación
                      </th>
                      <th style={{ padding: "0.75rem 1rem" }}>Tipo</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Módulo</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Estado / Nota</th>
                      <th style={{ padding: "0.75rem 1rem" }}>
                        Feedback del Profesor
                      </th>
                      <th
                        style={{ padding: "0.75rem 1rem", textAlign: "right" }}
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivitiesList.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: "center",
                            padding: "3rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          No se registran actividades para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredActivitiesList.map((item) => (
                        <tr
                          key={`${item.type}-${item.id}`}
                          style={{ background: "var(--bg-main)" }}
                        >
                          <td
                            style={{
                              padding: "1rem",
                              fontWeight: "bold",
                              color: "white",
                              borderRadius: "10px 0 0 10px",
                            }}
                          >
                            {item.title}
                            {item.due_date && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  fontWeight: "normal",
                                  marginTop: "2px",
                                }}
                              >
                                📅 Límite:{" "}
                                {new Date(item.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                padding: "0.25rem 0.6rem",
                                borderRadius: "6px",
                                background:
                                  item.type === "assignment"
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(245, 158, 11, 0.15)",
                                color:
                                  item.type === "assignment"
                                    ? "#60a5fa"
                                    : "var(--primary)",
                              }}
                            >
                              {item.type === "assignment"
                                ? "📝 Tarea"
                                : "⚡ Examen"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "1rem",
                              fontSize: "0.85rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {item.moduleTitle}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            {item.status === "graded" ? (
                              <div>
                                <strong
                                  style={{
                                    fontSize: "1.1rem",
                                    color:
                                      item.score >= 60
                                        ? "var(--success)"
                                        : "var(--error)",
                                  }}
                                >
                                  {item.score} / 100
                                </strong>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "0.75rem",
                                    color:
                                      item.score >= 60
                                        ? "var(--success)"
                                        : "var(--error)",
                                  }}
                                >
                                  {item.score >= 60
                                    ? "✓ Aprobado"
                                    : "⚠️ Reprobado"}
                                </span>
                              </div>
                            ) : item.status === "pending_grade" ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                  color: "#60a5fa",
                                  background: "rgba(59, 130, 246, 0.1)",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: "6px",
                                }}
                              >
                                ⏳ Pendiente por calificar
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                  color: "#f87171",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: "6px",
                                }}
                              >
                                🔴 Pendiente por hacer
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "1rem",
                              fontSize: "0.85rem",
                              color: "var(--text-main)",
                              fontStyle: "italic",
                            }}
                          >
                            {item.feedback ? (
                              `"${item.feedback}"`
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "1rem",
                              textAlign: "right",
                              borderRadius: "0 10px 10px 0",
                            }}
                          >
                            <button
                              onClick={() => {
                                setShowGradeSummary(false);
                                if (item.type === "assignment") {
                                  setActiveAssignment(item.rawItem);
                                  setActiveLesson(null);
                                  setActiveQuiz(null);
                                } else {
                                  setActiveQuiz(item.rawItem);
                                  setActiveLesson(null);
                                  setActiveAssignment(null);
                                }
                              }}
                              style={{
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "var(--primary)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                padding: "0.4rem 0.8rem",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {item.status === "pending_todo"
                                ? "Ir a realizar →"
                                : "Ver detalle →"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}{" "}
        </main>

        {/* MODAL DE CONFIRMACIÓN PERSONALIZADO */}
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
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    if (action) action();
                  }}
                  style={{
                    background: "#f59e0b",
                    color: "#0f172a",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                    boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classroom;
