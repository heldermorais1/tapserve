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
  return supabase.from("calls").select("*").eq("restaurant_id", restaurantId).eq("status", "pending").order("created_at", { ascending: false });
}

export async function resolveRestaurantCall(callId: string) {
  return supabase
    .from("calls")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("status", "pending")
    .select("id")
    .single();
}

export async function listRestaurantRatings(restaurantId: string | null) {
  if (!restaurantId) return { data: [], error: null };
  return supabase.from("ratings").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
}

export type MenuMediaItem = {
  type: "image" | "video";
  url: string;
};

export type RestaurantMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  currency: string;
  status: "active" | "paused";
  image_url: string | null;
  reel_url: string | null;
  video_url: string | null;
  media_items: MenuMediaItem[];
  category: string;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  position: number;
};

export async function listRestaurantMenuItems(restaurantId: string) {
  return supabase
    .from("menu_items")
    .select("id,name,description,price,promotional_price,currency,status,image_url,reel_url,video_url,media_items,category,category_id,tags,is_featured,position")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
}

export type RestaurantMenuCategory = { id: string; name: string; description: string | null; position: number };

export async function listRestaurantMenuCategories(restaurantId: string) {
  return supabase
    .from("menu_categories")
    .select("id,name,description,position")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });
}

export async function saveRestaurantMenuCategory(restaurantId: string, name: string, description: string) {
  return supabase
    .from("menu_categories")
    .insert({ restaurant_id: restaurantId, name: name.trim(), description: description.trim() || null })
    .select("id,name,description,position")
    .single();
}

export async function deleteRestaurantMenuCategory(restaurantId: string, categoryId: string) {
  return supabase
    .from("menu_categories")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", categoryId);
}

export async function saveRestaurantMenuItem(
  restaurantId: string,
  item: Omit<RestaurantMenuItem, "id">,
  itemId: string | null
) {
  const values = { restaurant_id: restaurantId, ...item };
  const query = itemId
    ? supabase.from("menu_items").update(values).eq("restaurant_id", restaurantId).eq("id", itemId)
    : supabase.from("menu_items").insert(values);
  return query.select("id").single();
}

export async function deleteRestaurantMenuItem(restaurantId: string, itemId: string) {
  return supabase.from("menu_items").delete().eq("restaurant_id", restaurantId).eq("id", itemId);
}

export type CustomerMenuItem = Pick<RestaurantMenuItem, "id" | "name" | "description" | "price" | "promotional_price" | "currency" | "image_url" | "reel_url" | "video_url" | "category" | "tags" | "is_featured" | "media_items">;

export async function getCustomerMenu(restaurantSlug: string) {
  return supabase.rpc("get_customer_menu", { p_restaurant_slug: restaurantSlug });
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
