import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, role } = await req.json();

    // Validate input
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password e role são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["master", "user"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "role deve ser 'master' ou 'user'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is bootstrap (table empty) or authenticated request
    const { count, error: countError } = await adminClient
      .from("app_users")
      .select("*", { count: "exact", head: true });

    const isBootstrap = !countError && count === 0;

    let callerAppUserId: string | null = null;

    if (!isBootstrap) {
      // Validate caller JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callerAuthId = claimsData.claims.sub;

      // Check if caller is master
      const { data: callerUser, error: callerError } = await adminClient
        .from("app_users")
        .select("id, role, status")
        .eq("auth_user_id", callerAuthId)
        .single();

      if (callerError || !callerUser || callerUser.role !== "master" || callerUser.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Apenas masters podem criar usuários" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      callerAppUserId = callerUser.id;
    }

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newAuthUserId = authData.user.id;

    // Insert into app_users (bypass RLS with service role)
    const { error: insertError } = await adminClient
      .from("app_users")
      .insert({
        auth_user_id: newAuthUserId,
        email,
        role: isBootstrap ? "master" : role,
        created_by: callerAppUserId,
      });

    if (insertError) {
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(newAuthUserId);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar usuário interno: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: isBootstrap
          ? "Primeiro master criado com sucesso"
          : "Usuário criado com sucesso",
        user: { email, role: isBootstrap ? "master" : role },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
