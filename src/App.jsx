import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import PublicCourses from "./pages/PublicCourses";
import Resources from "./pages/Resources";
import Contact from "./pages/Contact";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import Documents from "./pages/Documents";
import CourseDetail from "./pages/CourseDetail";
import Course from "./pages/Courses";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";
import AuthRedirect from "./components/AuthRedirect/AuthRedirect";
import FloatingLogin from "./components/FloatingLogin/FloatingLogin";
import ToastNotification from "./components/AuthRedirect/AuthRedirect";
import ChatBot from "./components/ChatBot/ChatBot";
import "./components/ChatBot/ChatBot.css";
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!user) return <Navigate to="/" replace />;
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // REDIRIGIR AL DASHBOARD DESPUÉS DE LOGIN (desde cualquier página)
  useEffect(() => {
    if (!loading && user) {
      // Si ya está autenticado y no está en dashboard o páginas protegidas
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/cursos" ||
        window.location.pathname === "/recursos" ||
        window.location.pathname === "/contacto"
      ) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <>
      <AuthRedirect />

      <Routes>
        {/* PÚBLICAS */}
        <Route path="/" element={<Landing />} />
        <Route path="/cursos" element={<PublicCourses />} />
        <Route path="/recursos" element={<Resources />} />
        <Route path="/contacto" element={<Contact />} />

        {/* PROTEGIDAS */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-cursos"
          element={
            <ProtectedRoute>
              <Course />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curso/:id"
          element={
            <ProtectedRoute>
              <CourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* LOGIN FLOTANTE solo si NO está logueado */}
      {!user && <FloatingLogin />}
      <ToastNotification />
      <ChatBot />
    </>
  );
}

export default App;
