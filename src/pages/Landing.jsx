import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Hero from "../components/Hero/Hero";
import Features from "../components/Features/Features";
import Footer from "../components/Footer/Footer";
import FloatingLogin from "../components/FloatingLogin/FloatingLogin";
import { useAuth } from "../context/AuthContext";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirección correcta y permitida por React
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Mientras carga o si ya está logueado → no renderiza nada (evita flash)
  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (user) {
    return null; // el useEffect ya se encargó de redirigir
  }

  // Solo se muestra si NO está logueado
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <Footer />
      <FloatingLogin />
    </>
  );
};

export default Landing;
