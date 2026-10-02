import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond({ error: "Configuração de autenticação do servidor incompleta." }, 500);
  }

  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) return respond({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: caller, error: callerError } = await adminClient.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (callerError || caller?.role !== "admin") return respond({ error: "Apenas um administrador pode criar usuários." }, 403);

  let body: { email?: string; password?: string; fullName?: string; restaurantName?: string };
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Corpo da solicitação inválido." }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.fullName?.trim();
  const restaurantName = body.restaurantName?.trim();
  if (!email || !password || password.length < 6 || !fullName || !restaurantName) {
    return respond({ error: "Informe nome, e-mail, senha (mínimo de 6 caracteres) e nome do restaurante." }, 400);
  }

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createUserError || !createdUser.user) return respond({ error: createUserError?.message ?? "Não foi possível criar o usuário." }, 400);

  const restaurantSlug = restaurantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "restaurante";
  const slug = `${restaurantSlug}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: restaurant, error: restaurantError } = await adminClient
    .from("restaurants")
    .insert({ name: restaurantName, slug })
    .select("id")
    .single();
  if (restaurantError || !restaurant) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return respond({ error: restaurantError?.message ?? "Não foi possível criar o restaurante." }, 400);
  }

  const { error: profileError } = await adminClient.from("profiles").update({
    full_name: fullName,
    restaurant_id: restaurant.id,
  }).eq("id", createdUser.user.id);
  if (profileError) {
    await adminClient.from("restaurants").delete().eq("id", restaurant.id);
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return respond({ error: `Usuário criado, mas o perfil não foi atualizado: ${profileError.message}` }, 500);
  }

  return respond({ user: { id: createdUser.user.id, email, restaurantId: restaurant.id } }, 200);
});

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}