// src/components/AuthRedirect.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AuthRedirect = () => {
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  return null; // No renderiza nada
};

export default AuthRedirect;
