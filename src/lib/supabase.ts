import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using auth.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getProfileByUserId(userId: string) {
  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export async function getRestaurantSettings(restaurantId: string | null) {
  if (!restaurantId) return { data: null, error: null };
  return supabase.from("restaurant_settings").select("*").eq("restaurant_id", restaurantId).maybeSingle();
}

export async function listRestaurantCalls(restaurantId: string | null) {
  if (!restaurantId) return { data: [], error: null };
  return supabase.from("calls").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
}

export async function listRestaurantRatings(restaurantId: string | null) {
  if (!restaurantId) return { data: [], error: null };
  return supabase.from("ratings").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
}

export async function insertCall({
  restaurantId,
  tableNumber,
  detail,
  priority = "normal",
}: {
  restaurantId: string;
  tableNumber: number;
  detail: string;
  priority?: "normal" | "urgent";
}) {
  return supabase.from("calls").insert({
    restaurant_id: restaurantId,
    table_number: tableNumber,
    detail,
    priority,
    status: "pending",
  }).select().single();
}

export async function insertRating({
  restaurantId,
  tableNumber,
  score,
  comment,
}: {
  restaurantId: string;
  tableNumber: number;
  score: number;
  comment: string;
}) {
  return supabase.from("ratings").insert({
    restaurant_id: restaurantId,
    table_number: tableNumber,
    score,
    comment,
  }).select().single();
}

export async function updateProfileName(userId: string, fullName: string) {
  const { data: currentUser } = await getCurrentUser();
  if (!currentUser.user) return { data: null, error: new Error("Usuário não autenticado") };

  const { data: currentProfile } = await getProfileByUserId(userId);

  return supabase
    .from("profiles")
    .upsert({
      id: userId,
      full_name: fullName,
      email: currentUser.user.email || currentProfile?.email || "",
      role: currentProfile?.role ?? "user",
    })
    .select()
    .single();
}

export async function createRestaurant({
  name,
  slug,
  address,
  city,
  phone,
  email,
}: {
  name: string;
  slug: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}) {
  const { data: userData } = await getCurrentUser();
  if (!userData.user) {
    throw new Error("Você precisa estar autenticado para criar um restaurante.");
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      name,
      slug,
      address: address || null,
      city: city || null,
      phone: phone || null,
      email: email || userData.user.email || null,
    })
    .select()
    .single();

  if (restaurantError || !restaurant) {
    throw restaurantError || new Error("Não foi possível criar o restaurante.");
  }

  const { data: currentProfile } = await getProfileByUserId(userData.user.id);

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userData.user.id,
      full_name: userData.user.user_metadata?.full_name || currentProfile?.full_name || "Administrador",
      email: userData.user.email || currentProfile?.email || email || "",
      role: currentProfile?.role ?? "user",
      restaurant_id: restaurant.id,
    })
    .select();

  if (profileError) {
    throw profileError;
  }

  return restaurant;
}
