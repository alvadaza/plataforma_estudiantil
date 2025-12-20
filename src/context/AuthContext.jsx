import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFullProfile = async (userId) => {
    if (!userId) return;

    try {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !prof) {
        setProfile(null);
        setUserType(null);
        return;
      }

      setProfile(prof);

      // 🔒 Definir rol UNA sola vez
      let finalRole = prof.role ?? null;

      if (prof.role !== "admin") {
        const { data: studentRow } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (studentRow) {
          finalRole = "student";
        } else {
          const { data: teacherRow } = await supabase
            .from("teacher_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (teacherRow) finalRole = "teacher";
        }
      }

      setUserType(finalRole);
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setProfile(null);
      setUserType(null);
    } finally {
      setLoading(false); // ✅ AQUÍ, NO ANTES
    }
  };

  useEffect(() => {
    let initialized = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchFullProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && !initialized) {
          initialized = true;
          setUser(session.user);
          fetchFullProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setUserType(null);
          setLoading(false);
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setUserType(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userType,
        loading,
        logout,
        isStudent: userType === "student",
        isTeacher: userType === "teacher",
        isAdmin: userType === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
