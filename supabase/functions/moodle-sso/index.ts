// supabase/functions/moodle-sso/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autorización
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No autorizado: Falta token de autorización");
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get("SB_URL") || "https://cbuwcmodyxkfiemhzvai.supabase.co";
    const supabaseAnonKey = Deno.env.get("SB_ANON_KEY");
    
    if (!supabaseAnonKey) {
      throw new Error("Configuración incompleta: Faltan credenciales de Supabase");
    }

    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verificar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      throw new Error("Token inválido o usuario no encontrado");
    }

    console.log("Usuario autenticado:", user.email);

    // Obtener perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("moodle_user_id, full_name")
      .eq("id", user.id)
      .single()
      .catch(() => ({ data: null })); // Si no hay perfil, continuar

    // Crear payload JWT (HEADER.PAYLOAD.SIGNATURE)
    const header = {
      alg: "HS256",
      typ: "JWT"
    };

    const payload = {
      email: user.email,
      user_id: user.id,
      moodle_user_id: profile?.moodle_user_id || 0,
      full_name: profile?.full_name || user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutos
    };

    // Codificar header y payload en Base64 URL-safe
    const encodeBase64Url = (obj: any): string => {
      const str = JSON.stringify(obj);
      return btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    };

    const encodedHeader = encodeBase64Url(header);
    const encodedPayload = encodeBase64Url(payload);

    // Crear firma HMAC-SHA256
    const secret = Deno.env.get("MOODLE_SSO_SECRET");
    if (!secret) {
      throw new Error("MOODLE_SSO_SECRET no configurado");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const keyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, data);
    
    // Convertir signature a Base64 URL-safe
    const signatureArray = new Uint8Array(signature);
    let signatureBase64 = "";
    for (let i = 0; i < signatureArray.length; i++) {
      signatureBase64 += String.fromCharCode(signatureArray[i]);
    }
    
    const encodedSignature = btoa(signatureBase64)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // JWT completo
    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    console.log("Token JWT generado (primeros 50 chars):", token.substring(0, 50) + "...");

    // Obtener URL de Moodle
    const moodleUrl = Deno.env.get("MOODLE_URL") || "http://localhost/fundneon";

    // Respuesta exitosa
    return new Response(
      JSON.stringify({ 
        success: true,
        token: token,
        moodle_url: moodleUrl,
        redirect_url: `${moodleUrl}/local/sso/login.php?token=${token}`,
        user: {
          email: user.email,
          moodle_user_id: profile?.moodle_user_id,
          name: profile?.full_name || user.email
        },
        debug: {
          token_length: token.length,
          token_start: token.substring(0, 30) + "..."
        }
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error en moodle-sso:", error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});