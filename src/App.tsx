import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { deleteRestaurantMenuCategory, deleteRestaurantMenuItem, getCustomerMenu, getRestaurantSettings, listRestaurantCalls, listRestaurantMenuCategories, listRestaurantMenuItems, listRestaurantRatings, resolveRestaurantCall, saveRestaurantMenuCategory, saveRestaurantMenuItem, signInWithEmail, signOut, supabase, updateProfileName, type CustomerMenuItem, type MenuMediaItem, type RestaurantMenuCategory, type RestaurantMenuItem } from "./lib/supabase";
import logoOnDark from "./imports/logo_fundo_preto.svg";
import logoOnLight from "./imports/logo_fundo_branco.svg";

type Call = { id: string; table: string; detail: string; time: string; urgent: boolean; createdAt: number };
type Rating = { id: string; table: number; score: number; comment: string; createdAt: number };
type MenuMediaDraft = MenuMediaItem & { key: string; file: File | null; preview: string };
type MenuDraft = {
  key: string;
  id: string | null;
  name: string;
  description: string;
  price: string;
  promotional_price: string;
  currency: string;
  status: "active" | "paused";
  image_url: string;
  reel_url: string;
  video_url: string;
  category: string;
  category_id: string;
  tags: string[];
  customTag: string;
  is_featured: boolean;
  position: number;
  media_items: MenuMediaDraft[];
};

function getMenuMediaDrafts(item: Pick<RestaurantMenuItem, "media_items" | "image_url" | "video_url">): MenuMediaDraft[] {
  const media = Array.isArray(item.media_items) && item.media_items.length
    ? item.media_items
    : [
        ...(item.image_url ? [{ type: "image" as const, url: item.image_url }] : []),
        ...(item.video_url ? [{ type: "video" as const, url: item.video_url }] : []),
      ];
  return media.map((asset) => ({ ...asset, key: crypto.randomUUID(), file: null, preview: asset.url }));
}

function getCustomerMenuMedia(item: CustomerMenuItem): MenuMediaItem[] {
  if (Array.isArray(item.media_items) && item.media_items.length) return item.media_items;
  return [
    ...(item.image_url ? [{ type: "image" as const, url: item.image_url }] : []),
    ...(item.video_url ? [{ type: "video" as const, url: item.video_url }] : []),
  ];
}

type IconName =
  | "bell"
  | "grid"
  | "tables"
  | "history"
  | "menu"
  | "settings"
  | "search"
  | "chevron"
  | "check"
  | "clock"
  | "users"
  | "trend"
  | "close"
  | "phone"
  | "mail"
  | "receipt"
  | "star"
  | "utensils"
  | "play"
  | "plus"
  | "image"
  | "video"
  | "book"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "google"
  | "folder"
  | "tag"
  | "copy"
  | "edit"
  | "trash";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    tables: <><path d="M4 10h16" /><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" /><path d="M6 10v9M18 10v9M4 15h16" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" /></>,
    receipt: <><path d="M4 2v20l3-2 3 2 2-2 3 2 2-2 3 2V2l-3 2-3-2-2 2-3-2-2 2Z" /><path d="M8 9h8M8 13h6" /></>,
    star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1Z" />,
    utensils: <><path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M15 2v8h5M20 2v20" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 5v16M8 7h8" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></>,
    tiktok: <><path d="M14 3v11.2a4.2 4.2 0 1 1-3.2-4.1" /><path d="M14 3c.5 3 2.5 5 5 5" /></>,
    facebook: <path d="M14 21v-8h3l.5-3H14V8.2c0-.9.3-1.5 1.6-1.5H18V4a20 20 0 0 0-2.4-.1c-2.5 0-4.2 1.5-4.2 4.3V10H9v3h2.4v8H14Z" />,
    google: <><path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h4.8a4.1 4.1 0 0 1-1.8 2.7v2.3h3c1.7-1.6 2.5-4 2.5-6.8Z" /><path d="M12 21c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.5-1.8.9-2.9.9-2.2 0-4.1-1.5-4.8-3.5H4v2.4A9 9 0 0 0 12 21Z" /><path d="M7.2 14a5.4 5.4 0 0 1 0-3.5V8.1H4a9 9 0 0 0 0 8.3L7.2 14Z" /><path d="M12 7.1c1.3 0 2.4.4 3.3 1.3l2.7-2.7A8.7 8.7 0 0 0 12 3a9 9 0 0 0-8 5.1l3.2 2.4c.7-2 2.6-3.4 4.8-3.4Z" /></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    edit: <><path d="m15 5 4 4M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return <div className={`logo${compact ? " compact" : ""}`}><img src={dark ? logoOnDark : logoOnLight} alt="TapServe" /></div>;
}

const CONTACT_EMAIL = "suportetapserver@gmail.com";
const CONTACT_WHATSAPP_NUMBER = "244946970233";
const CONTACT_WHATSAPP_LINK = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre o TapServe.")}`;

type AdminSection = "overview" | "restaurants" | "users" | "ratings" | "settings";
type PlatformRestaurant = { id: string; name: string; slug: string; email: string | null; phone: string | null; status: string; created_at: string };
type PlatformUser = { id: string; email: string; full_name: string; restaurant_id: string | null; created_at: string };
type PlatformSettings = { id: boolean; platform_name: string; country: string; currency: string; support_whatsapp: string; automatic_alerts: boolean };
type PlatformActivity = { id: string; action: string; entity_type: string; metadata: Record<string, unknown> | null; created_at: string };
type SocialPlatform = "instagram" | "tiktok" | "facebook" | "google";
type SocialProfile = { enabled: boolean; url: string };
type RestaurantSettings = {
  restaurant_name: string;
  unit_name: string;
  admin_name: string;
  address: string;
  default_table_count: number;
  enable_sound_alerts: boolean;
  highlight_after_minutes: number;
  cover_image_url: string;
  logo_url: string;
  primary_color: string;
  social_instagram_enabled: boolean;
  social_instagram_url: string;
  social_tiktok_enabled: boolean;
  social_tiktok_url: string;
  social_facebook_enabled: boolean;
  social_facebook_url: string;
  social_google_enabled: boolean;
  social_google_url: string;
};

const socialPlatforms: {
  id: SocialPlatform;
  name: string;
  action: string;
  hostnames: string[];
  enabledField: "social_instagram_enabled" | "social_tiktok_enabled" | "social_facebook_enabled" | "social_google_enabled";
  urlField: "social_instagram_url" | "social_tiktok_url" | "social_facebook_url" | "social_google_url";
}[] = [
  { id: "instagram", name: "Instagram", action: "Seguir no Instagram", hostnames: ["instagram.com"], enabledField: "social_instagram_enabled", urlField: "social_instagram_url" },
  { id: "tiktok", name: "TikTok", action: "Seguir no TikTok", hostnames: ["tiktok.com"], enabledField: "social_tiktok_enabled", urlField: "social_tiktok_url" },
  { id: "facebook", name: "Facebook", action: "Seguir no Facebook", hostnames: ["facebook.com"], enabledField: "social_facebook_enabled", urlField: "social_facebook_url" },
  { id: "google", name: "Google", action: "Avaliar no Google", hostnames: ["google.com", "g.page", "goo.gl"], enabledField: "social_google_enabled", urlField: "social_google_url" },
];

function isSocialProfileUrl(platform: SocialPlatform, value: string) {
  try {
    const url = new URL(value);
    const hostnames = socialPlatforms.find((item) => item.id === platform)?.hostnames || [];
    return url.protocol === "https:" && hostnames.some((hostname) => url.hostname === hostname || url.hostname.endsWith(`.${hostname}`));
  } catch {
    return false;
  }
}

const defaultRestaurantSettings: RestaurantSettings = {
  restaurant_name: "",
  unit_name: "",
  admin_name: "Administrador",
  address: "",
  default_table_count: 12,
  enable_sound_alerts: true,
  highlight_after_minutes: 5,
  cover_image_url: "",
  logo_url: "",
  primary_color: "#0a0a0a",
  social_instagram_enabled: false,
  social_instagram_url: "",
  social_tiktok_enabled: false,
  social_tiktok_url: "",
  social_facebook_enabled: false,
  social_facebook_url: "",
  social_google_enabled: false,
  social_google_url: "",
};

function AdminPanel({ adminName, section, onSectionChange }: { adminName: string; section: AdminSection; onSectionChange: (section: AdminSection) => void }) {
  const [restaurants, setRestaurants] = useState<PlatformRestaurant[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [ratings, setRatings] = useState<{ id: string; score: number; comment: string | null; created_at: string; restaurant_id: string }[]>([]);
  const [activities, setActivities] = useState<PlatformActivity[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({ id: true, platform_name: "TapServe", country: "Angola", currency: "Kz", support_whatsapp: "", automatic_alerts: true });
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [restaurantDraft, setRestaurantDraft] = useState({ name: "", slug: "", email: "", phone: "" });
  const [userDraft, setUserDraft] = useState({ fullName: "", email: "", password: "", restaurantName: "" });
  const averageRating = ratings.length ? (ratings.reduce((sum, item) => sum + Number(item.score), 0) / ratings.length).toFixed(1) : "0.0";

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [authResult, restaurantsResult, usersResult, ratingsResult, activityResult, settingsResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("restaurants").select("id,name,slug,email,phone,status,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,restaurant_id,created_at").order("created_at", { ascending: false }),
      supabase.from("ratings").select("id,score,comment,created_at,restaurant_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("audit_logs").select("id,action,entity_type,metadata,created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("platform_settings").select("id,platform_name,country,currency,support_whatsapp,automatic_alerts").eq("id", true).maybeSingle(),
    ]);

    const failed = [restaurantsResult.error, usersResult.error, ratingsResult.error, activityResult.error, settingsResult.error].find(Boolean);
    if (failed) {
      setError(`Não foi possível carregar os dados do painel. ${failed.message}`);
      setLoading(false);
      return;
    }

    setCurrentUserId(authResult.data.user?.id ?? "");
    setRestaurants((restaurantsResult.data ?? []) as PlatformRestaurant[]);
    setUsers((usersResult.data ?? []) as PlatformUser[]);
    setRatings((ratingsResult.data ?? []) as typeof ratings);
    setActivities((activityResult.data ?? []) as PlatformActivity[]);
    if (settingsResult.data) setSettings(settingsResult.data as PlatformSettings);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const logActivity = async (action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) => {
    const { error: logError } = await supabase.from("audit_logs").insert({ user_id: currentUserId, action, entity_type: entityType, entity_id: entityId, metadata });
    if (logError) console.error("Admin audit log failed:", logError);
  };

  const saveRestaurant = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const slug = (restaurantDraft.slug || restaurantDraft.name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const restaurantValues = { name: restaurantDraft.name.trim(), slug, email: restaurantDraft.email.trim() || null, phone: restaurantDraft.phone.trim() || null };
    let restaurantId = editingRestaurantId;
    if (editingRestaurantId) {
      const { error: updateError } = await supabase.from("restaurants").update(restaurantValues).eq("id", editingRestaurantId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from("restaurants").insert(restaurantValues).select("id").single();
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
      restaurantId = data.id;
    }
    await logActivity(editingRestaurantId ? "restaurant.updated" : "restaurant.created", "restaurant", restaurantId, restaurantValues);
    setRestaurantDraft({ name: "", slug: "", email: "", phone: "" });
    setEditingRestaurantId(null);
    setShowRestaurantForm(false);
    setNotice(editingRestaurantId ? "Restaurante atualizado." : "Restaurante criado.");
    setSaving(false);
    await loadData();
  };

  const updateRestaurantStatus = async (restaurant: PlatformRestaurant) => {
    const status = restaurant.status === "active" ? "suspended" : "active";
    const { error: updateError } = await supabase.from("restaurants").update({ status }).eq("id", restaurant.id);
    if (updateError) return setError(updateError.message);
    await logActivity("restaurant.status_changed", "restaurant", restaurant.id, { status });
    setNotice(status === "active" ? "Restaurante ativado." : "Restaurante suspenso.");
    await loadData();
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { data, error: createError } = await supabase.functions.invoke("admin-create-user", {
      body: {
        fullName: userDraft.fullName.trim(),
        email: userDraft.email.trim(),
        password: userDraft.password,
        restaurantName: userDraft.restaurantName.trim(),
      },
    });
    if (createError || data?.error) {
      let functionErrorMessage: string | undefined;
      if (createError && "context" in createError && createError.context instanceof Response) {
        const responseBody = await createError.context.clone().json().catch(() => null) as { error?: string; message?: string } | null;
        functionErrorMessage = responseBody?.error || responseBody?.message;
      }
      setError(data?.error || functionErrorMessage || createError?.message || "Não foi possível criar o usuário.");
      setSaving(false);
      return;
    }
    await logActivity("user.created", "profile", data.user?.id ?? null, { email: userDraft.email.trim(), restaurant: userDraft.restaurantName.trim() });
    setUserDraft({ fullName: "", email: "", password: "", restaurantName: "" });
    setShowUserForm(false);
    setNotice("Usuário criado e vinculado ao restaurante.");
    setSaving(false);
    await loadData();
  };

  const updateUser = async (user: PlatformUser, changes: Partial<Pick<PlatformUser, "restaurant_id">>) => {
    const { error: updateError } = await supabase.from("profiles").update(changes).eq("id", user.id);
    if (updateError) return setError(updateError.message);
    await logActivity("user.updated", "profile", user.id, changes);
    setNotice("Perfil atualizado.");
    await loadData();
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from("platform_settings").upsert({ ...settings, updated_by: authData.user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    await logActivity("platform.settings_updated", "platform_settings", null, { platform_name: settings.platform_name });
    setNotice("Configurações salvas.");
    setSaving(false);
    await loadData();
  };

  const metrics = [
    { icon: "grid" as const, tone: "blue", label: "Restaurantes ativos", value: String(restaurants.filter((item) => item.status === "active").length), note: `${restaurants.length} cadastrados` },
    { icon: "users" as const, tone: "purple", label: "Usuários cadastrados", value: String(users.length), note: `${users.filter((item) => item.restaurant_id).length} vinculados a restaurantes` },
  ];
  const visibleRestaurants = restaurants.filter((item) => `${item.name} ${item.slug} ${item.email ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const visibleUsers = users.filter((item) => `${item.full_name} ${item.email} ${restaurants.find((restaurant) => restaurant.id === item.restaurant_id)?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const platformName = (id: string | null) => restaurants.find((item) => item.id === id)?.name ?? "Sem restaurante";

  return <section className="management admin-platform">
    <div className="welcome">
      <div><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>Plataforma TapServe</h1><p>Gestão global baseada nos dados reais do Supabase.</p></div>
      <div className="admin-header-actions"><div className="date-pill"><Icon name="users" size={17} /><span><strong>{adminName}</strong> · Administrador</span></div><button className="secondary" onClick={() => void loadData()} disabled={loading}>{loading ? "Atualizando..." : "Atualizar dados"}</button></div>
    </div>

    {error && <div className="login-error admin-feedback">{error}</div>}
    {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso"><Icon name="close" size={14} /></button></div>}
    {loading && <div className="panel admin-empty">Carregando dados do Supabase...</div>}

    {!loading && section === "overview" && <>
      <section className="stats-grid">{metrics.map((item) => <StatCard key={item.label} {...item} />)}</section>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Restaurantes</h2><p>Estado atual da plataforma</p></div><button className="link-button" onClick={() => onSectionChange("restaurants")}>Ver todos</button></div>
          {restaurants.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Restaurante</th><th>Slug</th><th>Estado</th></tr></thead><tbody>{restaurants.slice(0, 5).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.slug}</td><td><span className={`admin-status ${item.status}`}>{item.status === "active" ? "Ativo" : item.status}</span></td></tr>)}</tbody></table></div> : <div className="admin-empty">Ainda não há restaurantes cadastrados.</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Atividade administrativa</h2><p>Últimas alterações registradas</p></div></div>
          {activities.length ? <div className="admin-activity-list">{activities.map((item) => <article key={item.id}><span><Icon name="history" size={16} /></span><div><strong>{item.action.replace(/\./g, " ")}</strong><small>{item.entity_type} · {new Date(item.created_at).toLocaleString("pt-BR")}</small></div></article>)}</div> : <div className="admin-empty">As ações administrativas aparecerão aqui.</div>}
        </div>
      </div>
    </>}

    {!loading && section === "restaurants" && <div className="panel admin-section-panel">
      <div className="panel-head"><div><h2>Restaurantes</h2><p>{restaurants.length} cadastrados</p></div><button className="primary" onClick={() => { if (showRestaurantForm) { setEditingRestaurantId(null); setRestaurantDraft({ name: "", slug: "", email: "", phone: "" }); } setShowRestaurantForm((open) => !open); }}>{showRestaurantForm ? "Cancelar" : "Adicionar restaurante"}</button></div>
      {showRestaurantForm && <form className="admin-form" onSubmit={saveRestaurant}><label>Nome<input required value={restaurantDraft.name} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, name: event.target.value })} /></label><label>Slug<input value={restaurantDraft.slug} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, slug: event.target.value })} placeholder="gerado a partir do nome" /></label><label>E-mail<input type="email" value={restaurantDraft.email} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, email: event.target.value })} /></label><label>Telefone<input value={restaurantDraft.phone} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, phone: event.target.value })} /></label><button className="primary" disabled={saving}>{saving ? "Salvando..." : editingRestaurantId ? "Salvar restaurante" : "Criar restaurante"}</button></form>}
      <label className="admin-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar restaurantes" /></label>
      {visibleRestaurants.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nome</th><th>Slug</th><th>Contato</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{visibleRestaurants.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.slug}</td><td>{item.email || item.phone || "—"}</td><td><span className={`admin-status ${item.status}`}>{item.status === "active" ? "Ativo" : "Suspenso"}</span></td><td><div className="admin-row-actions"><button className="secondary" onClick={() => { setEditingRestaurantId(item.id); setRestaurantDraft({ name: item.name, slug: item.slug, email: item.email ?? "", phone: item.phone ?? "" }); setShowRestaurantForm(true); }}>Editar</button><button className="secondary" onClick={() => void updateRestaurantStatus(item)}>{item.status === "active" ? "Suspender" : "Ativar"}</button></div></td></tr>)}</tbody></table></div> : <div className="admin-empty">Nenhum restaurante corresponde à pesquisa.</div>}
    </div>}

    {!loading && section === "users" && <div className="panel admin-section-panel">
      <div className="panel-head"><div><h2>Usuários</h2><p>{users.length} perfis cadastrados</p></div><button className="primary" onClick={() => setShowUserForm((open) => !open)}>{showUserForm ? "Cancelar" : "Criar usuário"}</button></div>
      {showUserForm && <form className="admin-form" onSubmit={createUser}><label>Nome completo<input required value={userDraft.fullName} onChange={(event) => setUserDraft({ ...userDraft, fullName: event.target.value })} /></label><label>E-mail<input required type="email" value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} /></label><label>Senha<input required type="password" minLength={6} autoComplete="new-password" value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} /></label><label>Nome do restaurante<input required value={userDraft.restaurantName} onChange={(event) => setUserDraft({ ...userDraft, restaurantName: event.target.value })} /></label><button className="primary" disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</button></form>}
      <label className="admin-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por nome, e-mail ou restaurante" /></label>
      {visibleUsers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Restaurante</th><th>Cadastro</th></tr></thead><tbody>{visibleUsers.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.email}</td><td><select aria-label={`Restaurante de ${item.email}`} value={item.restaurant_id ?? ""} onChange={(event) => void updateUser(item, { restaurant_id: event.target.value || null })}><option value="">Sem restaurante</option>{restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}</select></td><td>{new Date(item.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="admin-empty">Nenhum usuário corresponde à pesquisa.</div>}
    </div>}

    {!loading && section === "ratings" && <div className="panel admin-section-panel">
      <div className="panel-head"><div><h2>Avaliações globais</h2><p>Média {averageRating} · {ratings.length} avaliações recentes</p></div></div>
      {ratings.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nota</th><th>Restaurante</th><th>Comentário</th><th>Data</th></tr></thead><tbody>{ratings.map((item) => <tr key={item.id}><td>{item.score}/5</td><td>{platformName(item.restaurant_id)}</td><td>{item.comment || "Sem comentário"}</td><td>{new Date(item.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="admin-empty">Ainda não há avaliações.</div>}
    </div>}

    {!loading && section === "settings" && <div className="panel admin-section-panel">
      <div className="panel-head"><div><h2>Configurações globais</h2><p>Preferências persistidas da plataforma</p></div></div>
      <form className="settings-form" onSubmit={saveSettings}><div className="form-grid">
        <label>Nome da plataforma<input value={settings.platform_name} onChange={(event) => setSettings({ ...settings, platform_name: event.target.value })} /></label>
        <label>País<input value={settings.country} onChange={(event) => setSettings({ ...settings, country: event.target.value })} /></label>
        <label>Moeda padrão<input value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} /></label>
        <label>WhatsApp de suporte<input value={settings.support_whatsapp} onChange={(event) => setSettings({ ...settings, support_whatsapp: event.target.value })} /></label>
      </div><label className="check-setting"><input type="checkbox" checked={settings.automatic_alerts} onChange={(event) => setSettings({ ...settings, automatic_alerts: event.target.checked })} /><span>Ativar alertas automáticos<small>Preferência global para notificações da plataforma.</small></span></label><div className="save-row"><button className="primary" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button></div></form>
    </div>}
  </section>;
}

function Dashboard({ calls, callsError, ratings, ratingsError, adminName, openWall, onResolveCall }: { calls: Call[]; callsError: string; ratings: Rating[]; ratingsError: string; adminName: string; openWall: () => void; onResolveCall: (callId: string) => Promise<void> }) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");
  const resolveCall = async (callId: string) => {
    setResolveError("");
    try {
      await onResolveCall(callId);
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : "Não foi possível assumir o chamado.");
    }
  };
  const visible = calls.filter((call) => {
    if (filter === "Urgentes" && !call.urgent) return false;
    return call.table.toLowerCase().includes(query.toLowerCase());
  });

  return <>
    <section className="welcome">
      <div><p className="eyebrow">VISÃO GERAL</p><h1>Olá, {adminName.split(" ")[0] || "Administrador"}</h1><p>Monitore o restaurante em tempo real a partir dos dados reais do sistema.</p></div>
      <div className="date-pill"><Icon name="clock" size={17} /><span><strong>Hoje</strong>{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
    </section>

    <section className="stats-grid">
      <StatCard icon="bell" tone="blue" label="Chamados em espera" value={calls.length.toString()} note={calls.length ? "em tempo real" : "sem chamados pendentes"} />
      <StatCard icon="clock" tone="green" label="Tempo médio de resposta" value={calls.length ? "~ 2m" : "0m"} note={calls.length ? "a partir dos dados atuais" : "sem dados disponíveis"} />
      <StatCard icon="users" tone="purple" label="Mesas ativas" value={calls.length ? `${Math.min(calls.length, 12)}/12` : "0/12"} note={calls.length ? "em uso no momento" : "nenhuma mesa ativa"} />
      <StatCard icon="trend" tone="orange" label="Avaliações" value={ratings.length.toString()} note={ratings.length ? "recebidas no sistema" : "sem avaliações ainda"} />
    </section>

    <section className="dashboard-grid">
      <div className="panel queue-panel">
        <div className="panel-head">
          <div><div className="title-row"><h2>Fila de chamados</h2><span className="count">{calls.length}</span></div><p>Ordenados por tempo de espera</p></div>
          <div className="panel-tools"><button className="wall-shortcut" onClick={openWall}>Abrir painel TV</button><button className="link-button" onClick={() => setFilter(filter === "Todas" ? "Urgentes" : "Todas")}>{filter === "Todas" ? "Ver urgentes" : "Ver todos"}</button></div>
        </div>
        <div className="search"><Icon name="search" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por mesa..." /></div>
        {callsError && <div className="login-error admin-feedback" role="alert">{callsError}</div>}
        {resolveError && <div className="login-error admin-feedback" role="alert">{resolveError}</div>}
        <div className="calls">
          {visible.map((call) => <article className={`call-card ${call.urgent ? "urgent" : ""}`} key={call.id}>
            <div className="call-top"><span className="table-icon"><Icon name={call.detail.includes("conta") ? "receipt" : "bell"} size={19} /></span><div><h3>{call.table}</h3><p>{call.detail}</p></div><span className={`time ${call.urgent ? "late" : ""}`}><Icon name="clock" size={13} />{call.time}</span></div>
            <div className="call-actions"><button className="confirm" onClick={() => void resolveCall(call.id)}><Icon name="check" size={16} />Confirmar</button><button className="details" onClick={() => setSelectedTable(Number(call.table.split(" ")[1]))}>Detalhes <Icon name="chevron" size={15} /></button></div>
          </article>)}
          {!visible.length && <div className="empty"><span><Icon name="check" /></span><h3>Tudo em ordem</h3><p>Nenhum chamado nessa fila.</p></div>}
        </div>
      </div>

      <div className="panel feedback-panel">
        <div className="panel-head"><div><h2>Experiência dos clientes</h2><p>Avaliações recebidas nas mesas</p></div><span className="rating-score"><Icon name="star" size={16} />{ratings.length ? (ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length).toFixed(1) : "0.0"}</span></div>
        <div className="rating-overview">
          <div><strong>{ratings.length || 0}</strong><span>avaliações recebidas</span></div>
          <div className="rating-bars">{[5,4,3,2,1].map((score) => { const count = ratings.filter((item) => item.score === score).length; const width = ratings.length ? `${count / ratings.length * 100}%` : "0%"; return <div key={score}><span>{score}</span><Icon name="star" size={10} /><i><b style={{ width }} /></i><small>{count}</small></div>; })}</div>
        </div>
        <div className="recent-ratings">
          <h3>Comentários recentes</h3>
          {ratingsError && <div className="login-error admin-feedback" role="alert">{ratingsError}</div>}
          {ratings.slice(0, 4).map((item) => <article key={item.id}><span className="rating-avatar">M{String(item.table).padStart(2, "0")}</span><div><div className="mini-stars">{[1,2,3,4,5].map((star) => <Icon key={star} name="star" size={12} />)}</div><p>{item.comment || "Cliente avaliou sem deixar comentário."}</p><small>Mesa {String(item.table).padStart(2, "0")} · agora</small></div></article>)}
          {!ratings.length && <div className="rating-empty"><Icon name="star" /><p>As novas avaliações aparecerão aqui.</p></div>}
        </div>
      </div>
    </section>
    {selectedTable && <TableModal table={selectedTable} onClose={() => setSelectedTable(null)} />}
  </>;
}

function StatCard({ icon, tone, label, value, note }: { icon: IconName; tone: string; label: string; value: string; note: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}><Icon name={icon} /></span><div><p>{label}</p><h2>{value}</h2><span className={tone === "blue" ? "warning-note" : ""}>{note}</span></div></article>;
}

function TableModal({ table, onClose }: { table: number; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-head"><div><p className="eyebrow">DETALHES DA MESA</p><h2>Mesa {String(table).padStart(2, "0")}</h2></div><button onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></div>
      <div className="table-summary"><span><Icon name="users" /> Sem dados</span><span><Icon name="clock" /> Última atualização agora</span></div>
      <h3>Histórico recente</h3>
      <div className="timeline"><div><i /><span><strong>Sem eventos</strong><small>Aguardando dados reais</small></span></div></div>
      <div className="modal-actions"><button className="secondary" onClick={onClose}>Adicionar nota</button><button className="primary" onClick={onClose}><Icon name="check" size={17} /> Marcar como atendida</button></div>
    </div>
  </div>;
}

function CustomerView({ table = 5, restaurantSlug, onCall, onRating }: { table?: number; restaurantSlug: string; onCall: (detail: string) => Promise<void>; onRating: (score: number, comment: string) => Promise<void> }) {
  const [screen, setScreen] = useState<"home" | "menu" | "success" | "bill" | "rating">("home");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [menuItems, setMenuItems] = useState<CustomerMenuItem[]>([]);
  const [publishedCategories, setPublishedCategories] = useState<string[]>([]);
  const [menuRestaurantName, setMenuRestaurantName] = useState("Restaurante");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [restaurantCoverUrl, setRestaurantCoverUrl] = useState("");
  const [restaurantPrimaryColor, setRestaurantPrimaryColor] = useState("#0a0a0a");
  const [socialLinks, setSocialLinks] = useState<Partial<Record<SocialPlatform, SocialProfile>>>({});
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("Todos");
  const [selectedMenuVideo, setSelectedMenuVideo] = useState<CustomerMenuItem | null>(null);
  const [selectedMenuMediaIndex, setSelectedMenuMediaIndex] = useState(0);
  const [menuStoryMode, setMenuStoryMode] = useState<MenuMediaItem["type"]>("video");
  const [menuVideoMuted, setMenuVideoMuted] = useState(true);
  const [menuVideoPaused, setMenuVideoPaused] = useState(false);
  const [menuVideoError, setMenuVideoError] = useState("");
  const [menuDescriptionExpanded, setMenuDescriptionExpanded] = useState(false);
  const [menuStoryProgress, setMenuStoryProgress] = useState(0);
  const menuVideoRef = useRef<HTMLVideoElement>(null);
  const storyTouchStartX = useRef<number | null>(null);
  const [requestError, setRequestError] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const requestCall = async (detail: string) => {
    if (requestPending) return;
    setRequestError("");
    setRequestPending(true);
    try {
      await onCall(detail);
      setScreen("success");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Não foi possível enviar o chamado. Tente novamente.");
    } finally {
      setRequestPending(false);
    }
  };
  const requestRating = async () => {
    if (requestPending || !rating) return;
    setRequestError("");
    setRequestPending(true);
    try {
      await onRating(rating, comment);
      setScreen("success");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Não foi possível enviar a avaliação. Tente novamente.");
    } finally {
      setRequestPending(false);
    }
  };
  useEffect(() => {
    if (!selectedMenuVideo) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenuVideo();
      if (event.key === "ArrowRight") goToMenuStory(1);
      if (event.key === "ArrowLeft") goToMenuStory(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedMenuVideo, selectedMenuMediaIndex]);
  const closeMenuVideo = () => {
    setSelectedMenuVideo(null);
    setSelectedMenuMediaIndex(0);
    setMenuStoryMode("video");
    setMenuDescriptionExpanded(false);
    setMenuStoryProgress(0);
    setMenuVideoError("");
  };
  const toggleMenuVideoPlayback = () => {
    const video = menuVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setMenuVideoError("")).catch(() => setMenuVideoError("Não foi possível reproduzir este vídeo."));
    } else {
      video.pause();
    }
  };
  useEffect(() => {
    let active = true;
    setMenuLoading(true);
    setMenuError("");
    getCustomerMenu(restaurantSlug).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMenuError(`Não foi possível carregar o cardápio: ${error.message}`);
        return;
      }
      if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) {
        setMenuError("O restaurante não foi encontrado ou ainda não publicou itens do cardápio.");
        return;
      }
      const response = data as {
        restaurant_name?: string;
        restaurant_logo_url?: string | null;
        restaurant_cover_image_url?: string | null;
        primary_color?: string | null;
        social_links?: Partial<Record<SocialPlatform, SocialProfile>>;
        categories?: string[];
        items: CustomerMenuItem[];
      };
      setMenuRestaurantName(response.restaurant_name || "Restaurante");
      setRestaurantLogoUrl(response.restaurant_logo_url || "");
      setRestaurantCoverUrl(response.restaurant_cover_image_url || "");
      const primaryColor = response.primary_color || "";
      setRestaurantPrimaryColor(/^#[\da-f]{6}$/i.test(primaryColor) ? primaryColor : "#0a0a0a");
      setSocialLinks(response.social_links || {});
      setPublishedCategories(response.categories || []);
      setMenuItems(response.items.map((item) => ({ ...item, media_items: getCustomerMenuMedia(item), tags: item.tags || [] })));
    }).catch((error: unknown) => {
      if (active) setMenuError(`Não foi possível carregar o cardápio: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }).finally(() => {
      if (active) setMenuLoading(false);
    });
    return () => { active = false; };
  }, [restaurantSlug]);
  const menuCategories = ["Todos", ...new Set([
    ...publishedCategories,
    ...menuItems.map((item) => item.category?.trim()).filter((category): category is string => Boolean(category)),
  ])];
  const visibleMenuItems = menuItems.filter((item) => {
    const matchesCategory = menuCategory === "Todos" || item.category === menuCategory;
    const searchText = `${item.name} ${item.description || ""}`.toLocaleLowerCase("pt");
    return matchesCategory && searchText.includes(menuSearch.toLocaleLowerCase("pt").trim());
  });
  const storySequence = visibleMenuItems.flatMap((item) => getCustomerMenuMedia(item)
    .map((media, mediaIndex) => ({ item, media, mediaIndex }))
    .filter(({ media }) => media.type === menuStoryMode));
  const selectedMenuMedia = selectedMenuVideo ? getCustomerMenuMedia(selectedMenuVideo)[selectedMenuMediaIndex] : null;
  const openMenuStories = (item: CustomerMenuItem, type: MenuMediaItem["type"]) => {
    const media = getCustomerMenuMedia(item);
    const index = media.findIndex((story) => story.type === type);
    if (index < 0) return;
    setMenuStoryMode(type);
    setSelectedMenuVideo(item);
    setSelectedMenuMediaIndex(index);
    setMenuDescriptionExpanded(false);
    setMenuVideoMuted(true);
    setMenuVideoPaused(false);
    setMenuVideoError("");
    setMenuStoryProgress(0);
  };
  const switchMenuStoryMedia = (type: MenuMediaItem["type"]) => {
    if (!selectedMenuVideo) return;
    const index = getCustomerMenuMedia(selectedMenuVideo).findIndex((media) => media.type === type);
    if (index < 0) return;
    setMenuStoryMode(type);
    setSelectedMenuMediaIndex(index);
    setMenuDescriptionExpanded(false);
    setMenuVideoPaused(false);
    setMenuStoryProgress(0);
    setMenuVideoError("");
  };
  const goToMenuStory = (direction: -1 | 1) => {
    if (!selectedMenuVideo || !selectedMenuMedia) return;
    const currentIndex = storySequence.findIndex((story) => story.item.id === selectedMenuVideo.id && story.mediaIndex === selectedMenuMediaIndex);
    if (currentIndex < 0) {
      closeMenuVideo();
      return;
    }
    const next = storySequence[currentIndex + direction];
    if (!next) {
      if (direction > 0) closeMenuVideo();
      return;
    }
    setSelectedMenuVideo(next.item);
    setSelectedMenuMediaIndex(next.mediaIndex);
    setMenuDescriptionExpanded(false);
    setMenuVideoPaused(false);
    setMenuStoryProgress(0);
    setMenuVideoError("");
  };
  useEffect(() => {
    if (!selectedMenuVideo || !selectedMenuMedia) return;
    setMenuStoryProgress(0);
    if (selectedMenuMedia.type === "image") {
      setMenuVideoPaused(false);
      const started = performance.now();
      const interval = window.setInterval(() => {
        const progress = Math.min(100, ((performance.now() - started) / 5000) * 100);
        setMenuStoryProgress(progress);
        if (progress >= 100) goToMenuStory(1);
      }, 50);
      return () => window.clearInterval(interval);
    }
    if (!menuVideoRef.current) return;
    menuVideoRef.current.muted = menuVideoMuted;
    menuVideoRef.current.currentTime = 0;
    menuVideoRef.current.play().then(() => setMenuVideoError("")).catch(() => setMenuVideoError("Não foi possível reproduzir este vídeo."));
  }, [selectedMenuVideo?.id, selectedMenuMediaIndex, selectedMenuMedia?.url, menuStoryMode]);
  const handleStoryTouchStart = (event: React.TouchEvent) => {
    storyTouchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleStoryTouchEnd = (event: React.TouchEvent) => {
    if (storyTouchStartX.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? storyTouchStartX.current) - storyTouchStartX.current;
    storyTouchStartX.current = null;
    if (Math.abs(delta) > 45) goToMenuStory(delta < 0 ? 1 : -1);
  };
  return <div className="customer-shell">
    <main className="phone" style={{ "--customer-primary": restaurantPrimaryColor } as React.CSSProperties & { "--customer-primary": string }}>
      {(screen === "home" || screen === "menu") ? <header className="customer-brand-banner" aria-label={`Capa de ${menuRestaurantName}`}>{restaurantCoverUrl && <img src={restaurantCoverUrl} alt="" />}</header> : <header><Logo compact /><span>{menuRestaurantName}</span><button aria-label="Ajuda">?</button></header>}
      {screen !== "home" && screen !== "menu" && <button className="back" onClick={() => setScreen("home")}>‹ <span>Voltar</span></button>}
      {screen === "home" && <div className="customer-home">
        <div className="customer-brand-profile">{restaurantLogoUrl ? <img src={restaurantLogoUrl} alt={`Logotipo de ${menuRestaurantName}`} /> : <span className="customer-brand-fallback"><Icon name="utensils" size={22} /></span>}<strong>{menuRestaurantName}</strong><div><span className="customer-table-badge">Mesa {String(table).padStart(2, "0")}</span><span className="customer-open-badge"><i /> Presença confirmada</span></div></div>
        <div className="customer-home-heading"><h1>Como podemos ajudar?</h1><p>Toque no botão abaixo para chamar nossa equipe<br />diretamente até sua mesa.</p></div>
        {requestError && <p className="login-error" role="alert">{requestError}</p>}
        <div className="action-grid customer-action-grid">
          <button className="main-action" disabled={requestPending} onClick={() => void requestCall("Chamou o garçom")}><span><Icon name="bell" size={27} /></span><strong><small>AÇÃO PRINCIPAL</small>{requestPending ? "Enviando..." : "Chamar garçom"}</strong><i><Icon name="chevron" size={21} /></i></button>
        </div>
        <div className="customer-secondary-actions">
          <button onClick={() => setScreen("menu")}><span><Icon name="book" size={21} /></span><strong>Ver cardápio</strong><small>Fotos e preços</small></button>
          <button onClick={() => setScreen("bill")}><span><Icon name="receipt" size={21} /></span><strong>Pedir a conta</strong><small>Pagamento na mesa</small></button>
          <button onClick={() => setScreen("rating")}><span><Icon name="star" size={21} /></span><strong>Avaliar atendimento</strong><small>Conte sua experiência</small></button>
          {socialPlatforms.map((platform) => {
            const profile = socialLinks[platform.id];
            if (!profile?.enabled || !isSocialProfileUrl(platform.id, profile.url)) return null;
            return <a className={`customer-social-link ${platform.id}`} href={profile.url} target="_blank" rel="noopener noreferrer" key={platform.id} aria-label={platform.action}><span><Icon name={platform.id} size={21} /></span><strong>{platform.action}</strong><small>{platform.id === "google" ? "Partilhe a sua opinião" : "Acompanhe novidades"}</small></a>;
          })}
        </div>
        <footer className="customer-powered"><span>TECNOLOGIA</span><img src={logoOnLight} alt="TapServe" /></footer>
      </div>}
      {screen === "success" && <div className="success-screen"><span><Icon name="check" size={40} /></span><p className="eyebrow">SOLICITAÇÃO ENVIADA</p><h1>Chamado realizado!</h1><p>Seu garçom foi avisado e chegará em instantes.</p><small><Icon name="clock" size={14} /> Enviado agora</small><button onClick={() => setScreen("home")}>Voltar ao início</button></div>}
      {screen === "menu" && <div className="customer-page customer-menu">
        <button className="customer-menu-back" onClick={() => setScreen("home")}><span aria-hidden="true">‹</span> Voltar para a mesa</button>
        <div className="customer-menu-brand">{restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : <span><Icon name="utensils" size={18} /></span>}<div><strong>{menuRestaurantName}</strong><small><b>CARDÁPIO</b> Mesa {String(table).padStart(2, "0")}</small></div><em>{menuItems.length} {menuItems.length === 1 ? "item" : "itens"}</em></div>
        <label className="customer-menu-search"><Icon name="search" size={18} /><input value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Buscar no cardápio..." /></label>
        {menuCategories.length > 1 && <div className="customer-menu-categories" role="group" aria-label="Categorias do cardápio">{menuCategories.map((category) => <button key={category} className={menuCategory === category ? "active" : ""} onClick={() => setMenuCategory(category)}>{category}</button>)}</div>}
        {menuLoading && <div className="customer-menu-state">Carregando cardápio...</div>}
        {menuError && <div className="customer-menu-state error" role="alert">{menuError}</div>}
        {!menuLoading && !menuError && !menuItems.length && <div className="customer-menu-state">O restaurante ainda não publicou itens no cardápio.</div>}
        {!menuLoading && !menuError && menuItems.length > 0 && !visibleMenuItems.length && <div className="customer-menu-state">Nenhum item encontrado.</div>}
        <div className="customer-menu-list">{visibleMenuItems.map((item) => {
          const itemMedia = getCustomerMenuMedia(item);
          const videoItems = itemMedia.filter((media) => media.type === "video");
          const photoItems = itemMedia.filter((media) => media.type === "image");
          const salePrice = item.promotional_price;
          const card = <><span className="customer-menu-image">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <Icon name="utensils" size={26} />}{(item.reel_url || videoItems.length > 0) && <span className="customer-menu-play"><Icon name="play" size={14} /></span>}</span><span className="customer-menu-copy">{item.is_featured && <em>DESTAQUE</em>}<strong>{item.name}</strong><small>{item.description || item.category}</small>{item.tags.length > 0 && <span className="customer-menu-tags">{item.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</span>}<span className="customer-menu-prices">{salePrice != null && <del>{Number(item.price).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || "Kz"}</del>}<b>{Number(salePrice ?? item.price).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || "Kz"}</b></span></span></>;
          if (videoItems.length > 0) {
            return <button className="customer-menu-item has-reel" key={item.id} onClick={() => openMenuStories(item, "video")} aria-label={`Ver vídeos de ${item.name}`}>{card}</button>;
          }
          if (item.reel_url) {
            return <a className="customer-menu-item has-reel" key={item.id} href={item.reel_url} target="_blank" rel="noopener noreferrer" aria-label={`Ver Reels de ${item.name}`}>{card}</a>;
          }
          return <article className="customer-menu-item" key={item.id}>
            {card}
            {photoItems.length > 0 && <button className="customer-menu-view-photos" onClick={() => openMenuStories(item, "image")}>Ver Fotos ({photoItems.length})</button>}
          </article>;
        })}</div>
      </div>}
      {screen === "bill" && <div className="customer-page bill-request"><span className="bill-illustration"><Icon name="receipt" size={34} /></span><p className="eyebrow">MESA {String(table).padStart(2, "0")}</p><h1>Deseja pedir a conta?</h1><p>O garçom será avisado e levará a conta até a sua mesa. Nenhum valor será exibido por aqui.</p><div className="bill-notice"><Icon name="bell" size={18} /><span><strong>Aviso rápido</strong>Você não precisa chamar o garçom novamente.</span></div>{requestError && <p className="login-error" role="alert">{requestError}</p>}<button className="customer-primary" disabled={requestPending} onClick={() => void requestCall("Solicitou a conta")}>{requestPending ? "Enviando..." : "Sim, pedir a conta"}</button><button className="customer-ghost" onClick={() => setScreen("home")}>Agora não</button></div>}
      {screen === "rating" && <div className="customer-page rating"><p className="eyebrow">SUA OPINIÃO IMPORTA</p><h1>Como foi?</h1><p>Conte para nós como foi sua experiência.</p><div className="stars">{[1,2,3,4,5].map((n) => <button aria-label={`${n} estrelas`} className={n <= rating ? "active" : ""} onClick={() => setRating(n)} key={n}><Icon name="star" size={30} /></button>)}</div><p className="rating-hint">{rating ? `${rating} de 5 estrelas` : "Toque para avaliar"}</p><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Deixe um comentário (opcional)" />{requestError && <p className="login-error" role="alert">{requestError}</p>}<button className="customer-primary" disabled={!rating || requestPending} onClick={() => void requestRating()}>{requestPending ? "Enviando..." : "Enviar avaliação"}</button></div>}
    </main>
    {selectedMenuVideo && selectedMenuMedia && <div className="menu-reel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeMenuVideo()}>
      <section className="menu-reel-modal" role="dialog" aria-modal="true" aria-label={`Stories de ${selectedMenuVideo.name}`} onTouchStart={handleStoryTouchStart} onTouchEnd={handleStoryTouchEnd}>
        {selectedMenuMedia.type === "video" ? <video ref={menuVideoRef} key={`${selectedMenuVideo.id}-${selectedMenuMediaIndex}-${selectedMenuMedia.url}`} className="menu-reel-media" src={selectedMenuMedia.url} autoPlay muted={menuVideoMuted} playsInline onPlay={() => setMenuVideoPaused(false)} onPause={() => setMenuVideoPaused(true)} onTimeUpdate={(event) => { const video = event.currentTarget; if (video.duration) setMenuStoryProgress(video.currentTime / video.duration * 100); }} onEnded={() => goToMenuStory(1)} onError={() => setMenuVideoError("Não foi possível carregar este vídeo.")} onClick={toggleMenuVideoPlayback} /> : <img className="menu-reel-media" src={selectedMenuMedia.url} alt={selectedMenuVideo.name} />}
        <div className="menu-reel-shade" />
        <div className="menu-story-progress" aria-hidden="true">{getCustomerMenuMedia(selectedMenuVideo).map((media, index) => <span className="menu-story-progress-track" key={`${media.url}-${index}`}><i style={{ width: index < selectedMenuMediaIndex ? "100%" : index === selectedMenuMediaIndex ? `${menuStoryProgress}%` : "0%" }} /></span>)}</div>
        <div className="menu-reel-controls">
          <div className="menu-reel-control-actions">
            {getCustomerMenuMedia(selectedMenuVideo).some((media) => media.type !== selectedMenuMedia.type) && <button className="menu-reel-pill menu-reel-back" onClick={() => switchMenuStoryMedia(selectedMenuMedia.type === "image" ? "video" : "image")} aria-label={selectedMenuMedia.type === "image" ? "Ver vídeo do produto" : "Ver foto do produto"}>
              <span aria-hidden="true">←</span>{selectedMenuMedia.type === "image" ? "Ver Vídeos" : "Ver Fotos"}
            </button>}
          </div>
          <div className="menu-reel-control-actions">
            {selectedMenuMedia.type === "video" && <button className="menu-reel-pill" onClick={() => setMenuVideoMuted((muted) => !muted)} aria-label={menuVideoMuted ? "Ativar som" : "Silenciar vídeo"}><span aria-hidden="true">{menuVideoMuted ? "◖" : "◖))"}</span>{menuVideoMuted ? "Mudo" : "Som"}</button>}
            <button className="menu-reel-close" onClick={closeMenuVideo} aria-label="Fechar vídeo"><Icon name="close" size={19} /></button>
          </div>
        </div>
        <button className="menu-story-nav menu-story-nav-previous" aria-label="Story anterior" onClick={() => goToMenuStory(-1)} />
        <button className="menu-story-nav menu-story-nav-next" aria-label="Próximo story" onClick={() => goToMenuStory(1)} />
        <div className="menu-reel-product">
          <div className="menu-reel-badges"><span className="menu-reel-label">{selectedMenuMedia.type === "video" ? "REELS DO PRATO" : "FOTO DO PRATO"}</span>{selectedMenuVideo.is_featured && <span className="menu-reel-featured">✦ DESTAQUE</span>}<span className="menu-reel-tag">{selectedMenuVideo.category || "OUTROS"}</span></div>
          <h2>{selectedMenuVideo.name}</h2>
          <strong>{Number(selectedMenuVideo.promotional_price ?? selectedMenuVideo.price).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz</strong>
          {selectedMenuVideo.description && <div className={`menu-reel-description-wrap${menuDescriptionExpanded ? " expanded" : ""}`}><p>{selectedMenuVideo.description}</p>{selectedMenuVideo.description.length > 110 && <button className="menu-reel-read-more" onClick={() => setMenuDescriptionExpanded((expanded) => !expanded)} aria-expanded={menuDescriptionExpanded}>{menuDescriptionExpanded ? "Ler menos" : "Ler mais"}</button>}</div>}
        </div>
        <span className="menu-reel-pause-hint">{selectedMenuMedia.type === "video" ? menuVideoPaused ? "Toque para reproduzir" : "Toque para pausar" : "Arraste para ver o próximo"}</span>
        {menuVideoError && <span className="menu-reel-error" role="alert">{menuVideoError}</span>}
      </section>
    </div>}
  </div>;
}

function CallWall({ calls, callsError, onResolveCall, onExit }: { calls: Call[]; callsError: string; onResolveCall: (callId: string) => Promise<void>; onExit: () => void }) {
  const [, tick] = useState(0);
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);
  const [resolveError, setResolveError] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = (createdAt: number) => {
    const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };
  const goFullscreen = () => document.documentElement.requestFullscreen?.();
  const resolveCall = async (callId: string) => {
    setResolveError("");
    setResolvingIds((current) => [...current, callId]);
    try {
      await onResolveCall(callId);
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : "Não foi possível assumir o chamado.");
    } finally {
      setResolvingIds((current) => current.filter((id) => id !== callId));
    }
  };
  const sorted = [...calls].sort((a, b) => a.createdAt - b.createdAt);
  return <div className="call-wall">
    <header className="wall-header">
      <Logo dark />
      <div className="wall-title"><span><i /> AO VIVO</span><h1>Central de chamados</h1></div>
      <div className="wall-actions"><button onClick={goFullscreen}>Tela cheia</button><button onClick={onExit}>Sair</button></div>
    </header>
    <main className="wall-main">
      <div className="wall-summary"><div><strong>{calls.length}</strong><span>aguardando atendimento</span></div><p>Chamados mais antigos aparecem primeiro. Confirme assim que iniciar o atendimento.</p><time>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div>
      {callsError && <div className="login-error admin-feedback" role="alert">{callsError}</div>}
      {resolveError && <div className="login-error admin-feedback" role="alert">{resolveError}</div>}
      {sorted.length ? <div className="wall-grid">{sorted.map((call) => {
        const urgent = Date.now() - call.createdAt >= 300000;
        return <article key={call.id} className={urgent ? "wall-call urgent" : "wall-call"}>
          <div className="wall-call-head"><span><Icon name={call.detail.includes("conta") ? "receipt" : "bell"} size={30} /></span><div><p>{call.detail}</p><h2>{call.table}</h2></div><b>{urgent ? "URGENTE" : "NOVO"}</b></div>
          <div className="wall-timer"><Icon name="clock" size={22} /><span>Esperando há</span><strong>{elapsed(call.createdAt)}</strong></div>
          <button disabled={resolvingIds.includes(call.id)} onClick={() => void resolveCall(call.id)}><Icon name="check" /> {resolvingIds.includes(call.id) ? "Assumindo..." : "Assumir atendimento"}</button>
        </article>;
      })}</div> : <div className="wall-empty"><span><Icon name="check" size={45} /></span><h2>Nenhum chamado pendente</h2><p>O salão está em dia. Novos chamados aparecerão automaticamente.</p></div>}
    </main>
  </div>;
}

function TableAccess({ tableCount, restaurantName, restaurantSlug }: { tableCount: number; restaurantName: string; restaurantSlug: string }) {
  const [selected, setSelected] = useState(1);
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const effectiveTableCount = Math.min(200, Math.max(1, Math.floor(tableCount) || 12));
  const tableUrl = (table: number) => {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("restaurante", restaurantSlug);
    url.searchParams.set("mesa", String(table));
    return url.href;
  };

  useEffect(() => {
    if (!restaurantSlug) {
      setQrCodes({});
      return;
    }
    let active = true;
    Promise.all(Array.from({ length: effectiveTableCount }, async (_, index) => {
      const table = index + 1;
      const data = await QRCode.toDataURL(tableUrl(table), { width: 520, margin: 2, color: { dark: "#0f2437", light: "#ffffff" }, errorCorrectionLevel: "H" });
      return [table, data] as const;
    })).then((rows) => active && setQrCodes(Object.fromEntries(rows)));
    return () => { active = false; };
  }, [effectiveTableCount, restaurantSlug]);

  useEffect(() => {
    setSelected((current) => Math.min(current, effectiveTableCount));
  }, [effectiveTableCount]);

  const download = () => {
    const link = document.createElement("a");
    link.href = qrCodes[selected];
    link.download = `tapserve-mesa-${String(selected).padStart(2, "0")}.png`;
    link.click();
  };
  const print = () => {
    const popup = window.open("", "_blank", "width=500,height=700");
    if (!popup) return setMessage("Permita pop-ups para imprimir o QR Code.");
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
    const tableLabel = String(selected).padStart(2, "0");
    const printedRestaurantName = escapeHtml(restaurantName || "Restaurante");
    const logoUrl = new URL(logoOnLight, window.location.href).href;
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${printedRestaurantName} | Mesa ${tableLabel}</title><style>
      *{box-sizing:border-box}body{display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f5f7;color:#142330;font-family:Arial,sans-serif}.qr-sheet{width:80mm;height:130mm;display:flex;flex-direction:column;align-items:center;padding:9mm 7mm 6mm;background:#fff;text-align:center;box-shadow:0 8px 28px rgba(20,35,48,.12)}.restaurant-name{display:flex;align-items:center;gap:7px;margin:0;color:#162331;font-size:9px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase}.restaurant-name::before{content:"";width:8mm;height:1px;background:#3178ff}.table-name{margin:6mm 0 0;font-size:25px;font-weight:400;line-height:1.1}.instruction{margin:2mm 0 6mm;color:#77838d;font-size:9px}.qr-code{display:block;width:58mm;height:58mm;object-fit:contain}.brand{width:30mm;height:auto;object-fit:contain;margin-top:auto}@page{size:80mm 130mm;margin:0}@media print{body{display:block;min-height:0;background:#fff}.qr-sheet{width:80mm;height:130mm;padding:9mm 7mm 6mm;box-shadow:none}}
      </style></head><body><main class="qr-sheet"><p class="restaurant-name">${printedRestaurantName}</p><h1 class="table-name">Mesa ${tableLabel}</h1><p class="instruction">Aponte a câmera para solicitar atendimento</p><img class="qr-code" src="${qrCodes[selected]}" alt="QR Code da Mesa ${tableLabel}"><img class="brand" src="${logoUrl}" alt="TapServe"></main></body></html>`);
    popup.document.close();
    void Promise.all(Array.from(popup.document.images, (image) => image.decode().catch(() => undefined))).then(() => {
      popup.focus();
      popup.print();
    });
  };
  const writeNfc = async () => {
    const NDEF = (window as Window & { NDEFReader?: new () => { write: (data: { records: { recordType: string; data: string }[] }) => Promise<void> } }).NDEFReader;
    if (!NDEF) return setMessage("NFC não é suportado neste navegador. Use Chrome no Android com HTTPS.");
    try {
      setMessage("Aproxime a etiqueta NFC do dispositivo...");
      const writer = new NDEF();
      await writer.write({ records: [{ recordType: "url", data: tableUrl(selected) }] });
      setMessage(`Etiqueta NFC da Mesa ${String(selected).padStart(2, "0")} gravada com sucesso.`);
    } catch {
      setMessage("Não foi possível gravar. Verifique a permissão e tente novamente.");
    }
  };

  return <div className="access-page">
    <section className="welcome"><div><p className="eyebrow">ACESSO ÀS MESAS</p><h1>QR Code e NFC</h1><p>Crie os pontos de acesso que seus clientes usarão no salão.</p></div></section>
    <div className="access-layout">
      <section className="panel table-selector"><div className="panel-head"><div><h2>Selecione uma mesa</h2><p>{effectiveTableCount} mesas · {restaurantName || "Configuração do restaurante"}</p></div></div><div className="selector-grid">{Array.from({ length: effectiveTableCount }, (_, index) => <button className={selected === index + 1 ? "active" : ""} key={index} onClick={() => { setSelected(index + 1); setMessage(""); }}><Icon name="tables" /><span>Mesa</span><strong>{String(index + 1).padStart(2, "0")}</strong></button>)}</div></section>
      <section className="panel qr-panel">
        <div className="qr-preview"><p className="eyebrow">{restaurantName || "RESTAURANTE"}</p><h2>Mesa {String(selected).padStart(2, "0")}</h2><p>Aponte a câmera para solicitar atendimento</p>{qrCodes[selected] ? <img className="qr-code" src={qrCodes[selected]} alt={`QR Code da Mesa ${selected}`} /> : <div className="qr-loading">Gerando...</div>}<Logo /></div>
        <div className="access-controls"><h2>Pronto para usar</h2><p>O QR Code identifica {restaurantName || "o restaurante"} e direciona para a Mesa {String(selected).padStart(2, "0")}.</p><label>Link da mesa</label><div className="url-field"><input readOnly value={tableUrl(selected)} /><button disabled={!restaurantSlug} onClick={() => { navigator.clipboard.writeText(tableUrl(selected)); setMessage("Link copiado."); }}>Copiar</button></div>{!restaurantSlug && <p role="alert">Aguarde o carregamento dos dados do restaurante para gerar o link.</p>}<div className="access-buttons"><button className="primary" onClick={download} disabled={!qrCodes[selected]}>Baixar PNG</button><button className="secondary" onClick={print} disabled={!qrCodes[selected]}>Imprimir</button></div><hr /><div className="nfc-box"><span><Icon name="phone" /></span><div><h3>Gravar etiqueta NFC</h3><p>Use um Android compatível para vincular a etiqueta a esta mesa.</p></div><button disabled={!restaurantSlug} onClick={writeNfc}>Gravar NFC</button></div>{message && <div className="access-message">{message}</div>}</div>
      </section>
    </div>
  </div>;
}

function ManagementPage({ page, ratings, settings, restaurantId, onSaveSettings }: { page: string; ratings: Rating[]; settings: RestaurantSettings; restaurantId: string | null; onSaveSettings: (settings: RestaurantSettings) => Promise<void> }) {
  const [saved, setSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsDraft, setSettingsDraft] = useState(settings);
  const [uploadingBrandField, setUploadingBrandField] = useState<"cover_image_url" | "logo_url" | null>(null);
  const [items, setItems] = useState<MenuDraft[]>([]);
  const [categories, setCategories] = useState<RestaurantMenuCategory[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [menuNotice, setMenuNotice] = useState("");
  const [menuTab, setMenuTab] = useState<"products" | "categories">("products");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingMenuDraft, setEditingMenuDraft] = useState<MenuDraft | null>(null);
  const [menuMediaTab, setMenuMediaTab] = useState<"photo" | "video">("photo");
  const [menuMediaIndex, setMenuMediaIndex] = useState(0);
  const [menuMediaUrlInput, setMenuMediaUrlInput] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  useEffect(() => setSettingsDraft(settings), [settings]);
  const uploadBrandImage = async (field: "cover_image_url" | "logo_url", file: File) => {
    if (!restaurantId) {
      setSettingsError("Este usuário ainda não está associado a um restaurante.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setSettingsError("Escolha uma imagem JPG, PNG ou WebP com até 8 MB.");
      return;
    }
    setUploadingBrandField(field);
    setSettingsError("");
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${restaurantId}/branding/${field}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("menu-media").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-media").getPublicUrl(path);
      setSettingsDraft((current) => ({ ...current, [field]: data.publicUrl }));
      setSaved(false);
    } catch (error) {
      setSettingsError(`Não foi possível carregar a imagem: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setUploadingBrandField(null);
    }
  };
  useEffect(() => {
    if (page !== "Cardápio") return;
    if (!restaurantId) {
      setItems([]);
      setMenuError("Este usuário ainda não está associado a um restaurante.");
      return;
    }
    let active = true;
    setMenuLoading(true);
    setMenuError("");
    Promise.all([listRestaurantMenuItems(restaurantId), listRestaurantMenuCategories(restaurantId)]).then(([itemsResult, categoriesResult]) => {
      if (!active) return;
      if (itemsResult.error || categoriesResult.error) {
        setMenuError(`Não foi possível carregar o cardápio: ${itemsResult.error?.message || categoriesResult.error?.message}`);
        return;
      }
      setItems(itemsResult.data.map((item: RestaurantMenuItem, index: number) => ({
        key: item.id,
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: String(item.price),
        promotional_price: item.promotional_price == null ? "" : String(item.promotional_price),
        currency: item.currency || "Kz",
        status: item.status,
        image_url: item.image_url || "",
        reel_url: item.reel_url || "",
        video_url: item.video_url || "",
        category: item.category || "Destaques",
        category_id: item.category_id || "",
        tags: item.tags || [],
        customTag: "",
        is_featured: item.is_featured ?? false,
        position: item.position ?? index,
        media_items: getMenuMediaDrafts(item),
      })));
      setCategories(categoriesResult.data);
    }).catch((error: unknown) => {
      if (active) setMenuError(`Não foi possível carregar os itens: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }).finally(() => {
      if (active) setMenuLoading(false);
    });
    return () => { active = false; };
  }, [page, restaurantId]);
  const newMenuDraft = (position: number, item?: MenuDraft): MenuDraft => item ? { ...item } : ({
    key: crypto.randomUUID(),
    id: null,
    name: "",
    description: "",
    price: "0",
    promotional_price: "",
    currency: "Kz",
    status: "active",
    image_url: "",
    reel_url: "",
    video_url: "",
    category: categories[0]?.name || "",
    category_id: categories[0]?.id || "",
    tags: [],
    customTag: "",
    is_featured: false,
    position,
    media_items: [],
  });
  const refreshMenu = async () => {
    if (!restaurantId) return setMenuError("Este usuário ainda não está associado a um restaurante.");
    const [itemsResult, categoriesResult] = await Promise.all([
      listRestaurantMenuItems(restaurantId),
      listRestaurantMenuCategories(restaurantId),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    setItems(itemsResult.data.map((item: RestaurantMenuItem, index: number) => ({
      key: item.id,
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      promotional_price: item.promotional_price == null ? "" : String(item.promotional_price),
      currency: item.currency || "Kz",
      status: item.status,
      image_url: item.image_url || "",
      reel_url: item.reel_url || "",
      video_url: item.video_url || "",
      category: item.category || "Destaques",
      category_id: item.category_id || "",
      tags: item.tags || [],
      customTag: "",
      is_featured: item.is_featured ?? false,
      position: item.position ?? index,
      media_items: getMenuMediaDrafts(item),
    })));
    setCategories(categoriesResult.data);
  };
  const saveMenuCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!restaurantId) return setMenuError("Este usuário ainda não está associado a um restaurante.");
    if (!categoryName.trim()) return setMenuError("Informe o nome da categoria.");
    setMenuSaving(true);
    setMenuError("");
    setMenuNotice("");
    try {
      const { error } = await saveRestaurantMenuCategory(restaurantId, categoryName, categoryDescription);
      if (error) throw error;
      await refreshMenu();
      setCategoryName("");
      setCategoryDescription("");
      setCategoryModalOpen(false);
      setMenuNotice("Categoria criada.");
    } catch (error) {
      setMenuError(`Não foi possível salvar a categoria: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setMenuSaving(false);
    }
  };
  const removeMenuCategory = async (category: RestaurantMenuCategory) => {
    if (!restaurantId) return;
    setMenuError("");
    setMenuNotice("");
    try {
      const productsInCategory = items.filter((item) => item.category_id === category.id);
      for (const product of productsInCategory) {
        if (!product.id) continue;
        const { error } = await saveRestaurantMenuItem(restaurantId, {
          name: product.name,
          description: product.description || null,
          price: Number(product.price.replace(",", ".")) || 0,
          promotional_price: product.promotional_price ? Number(product.promotional_price.replace(",", ".")) : null,
          currency: product.currency,
          status: product.status,
          image_url: product.image_url || null,
          reel_url: product.reel_url || null,
          video_url: product.video_url || null,
          media_items: product.media_items.map(({ type, url }) => ({ type, url })),
          category: "Destaques",
          category_id: null,
          tags: product.tags,
          is_featured: product.is_featured,
          position: product.position,
        }, product.id);
        if (error) throw error;
      }
      const { error } = await deleteRestaurantMenuCategory(restaurantId, category.id);
      if (error) throw error;
      await refreshMenu();
      setMenuNotice(`Categoria “${category.name}” removida. Os produtos foram movidos para Destaques.`);
    } catch (error) {
      setMenuError(`Não foi possível remover a categoria: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
  };
  const saveMenuDraft = async (item: MenuDraft) => {
    if (!restaurantId) return setMenuError("Este usuário ainda não está associado a um restaurante.");
    if (!item.name.trim()) return setMenuError("Informe o nome do produto antes de salvar.");
    if (!item.category_id) return setMenuError("Crie e selecione uma categoria para o produto.");
    const price = Number(item.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return setMenuError("Informe um preço válido.");
    const promotionalPrice = item.promotional_price ? Number(item.promotional_price.replace(",", ".")) : null;
    if (promotionalPrice !== null && (!Number.isFinite(promotionalPrice) || promotionalPrice < 0 || promotionalPrice >= price)) {
      return setMenuError("O preço promocional deve ser válido e menor que o preço normal.");
    }
    let reelUrl: string | null = null;
    if (item.reel_url.trim()) {
      try {
        const parsed = new URL(item.reel_url.trim());
        if (parsed.protocol !== "https:" || !/(^|\.)instagram\.com$/i.test(parsed.hostname) || !/^\/(reel|reels)\//i.test(parsed.pathname)) {
          throw new Error("Use um link HTTPS de Instagram Reels, por exemplo instagram.com/reel/...");
        }
        reelUrl = parsed.href;
      } catch (error) {
        setMenuError(error instanceof Error ? error.message : "O link do Reels é inválido.");
        return;
      }
    }
    for (const asset of item.media_items) {
      if (asset.file) continue;
      try {
        const parsed = new URL(asset.url);
        const validExtension = asset.type !== "video" || /\.(mp4|mov)(?:$|[?#])/i.test(parsed.href);
        if (parsed.protocol !== "https:" || !validExtension) {
          throw new Error(asset.type === "video" ? "Use links HTTPS diretos para vídeos MP4 ou MOV." : "Use um link HTTPS válido para a foto.");
        }
      } catch (error) {
        setMenuError(error instanceof Error ? error.message : "Um link de vídeo é inválido.");
        return;
      }
    }

    setMenuSaving(true);
    setMenuError("");
    setMenuNotice("");
    try {
      const uploadMedia = async (file: File, kind: "image" | "video") => {
        const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "jpg" : "mp4");
        const path = `${restaurantId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("menu-media").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        return supabase.storage.from("menu-media").getPublicUrl(path).data.publicUrl;
      };
      const mediaItems: MenuMediaItem[] = [];
      for (const asset of item.media_items) {
        const url = asset.file ? await uploadMedia(asset.file, asset.type) : asset.url;
        mediaItems.push({ type: asset.type, url });
      }
      const imageUrl = mediaItems.find((asset) => asset.type === "image")?.url || null;
      const videoUrl = mediaItems.find((asset) => asset.type === "video")?.url || null;
      const category = categories.find((candidate) => candidate.id === item.category_id);
      if (!category) throw new Error("A categoria selecionada já não existe. Atualize o cardápio e tente novamente.");
      const { error } = await saveRestaurantMenuItem(restaurantId, {
        name: item.name.trim(),
        description: item.description.trim() || null,
        price,
        promotional_price: promotionalPrice,
        currency: item.currency.trim() || "Kz",
        status: item.status,
        image_url: imageUrl,
        reel_url: reelUrl,
        video_url: videoUrl,
        media_items: mediaItems,
        category: category.name,
        category_id: category.id,
        tags: item.tags,
        is_featured: item.is_featured,
        position: item.position,
      }, item.id);
      if (error) throw error;
      await refreshMenu();
      closeProductModal();
      setMenuNotice("Produto salvo no cardápio.");
    } catch (error) {
      setMenuError(`Não foi possível salvar o produto: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setMenuSaving(false);
    }
  };
  const removeMenuDraft = async (item: MenuDraft) => {
    if (!item.id || !restaurantId) return;
    setMenuError("");
    setMenuNotice("");
    setMenuSaving(true);
    try {
      const { error } = await deleteRestaurantMenuItem(restaurantId, item.id);
      if (error) throw error;
      await refreshMenu();
      closeProductModal();
      setMenuNotice("Produto removido do cardápio.");
    } catch (error) {
      setMenuError(`Não foi possível remover o produto: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setMenuSaving(false);
    }
  };
  const duplicateMenuItem = (item: MenuDraft) => {
    const copy = newMenuDraft(items.length, item);
    copy.key = crypto.randomUUID();
    copy.id = null;
    copy.name = `${item.name} (cópia)`;
    copy.position = items.length;
    copy.media_items = item.media_items.map((asset) => ({ ...asset, key: crypto.randomUUID(), file: null }));
    setEditingMenuDraft(copy);
    setMenuMediaTab(copy.video_url || copy.reel_url ? "video" : "photo");
    setMenuMediaIndex(Math.max(0, copy.media_items.findIndex((asset) => asset.type === "video")));
    setMenuMediaUrlInput("");
    setCustomTagInput("");
    setMenuError("");
    setProductModalOpen(true);
  };
  const toggleMenuItemAvailability = async (item: MenuDraft) => {
    if (!restaurantId || !item.id) return;
    setMenuSaving(true);
    setMenuError("");
    setMenuNotice("");
    try {
      const category = categories.find((candidate) => candidate.id === item.category_id);
      const { error } = await saveRestaurantMenuItem(restaurantId, {
        name: item.name,
        description: item.description || null,
        price: Number(item.price.replace(",", ".")) || 0,
        promotional_price: item.promotional_price ? Number(item.promotional_price.replace(",", ".")) : null,
        currency: item.currency || "Kz",
        status: item.status === "active" ? "paused" : "active",
        image_url: item.image_url || null,
        reel_url: item.reel_url || null,
        video_url: item.video_url || null,
        media_items: item.media_items.map(({ type, url }) => ({ type, url })),
        category: category?.name || item.category,
        category_id: category?.id || item.category_id || null,
        tags: item.tags,
        is_featured: item.is_featured,
        position: item.position,
      }, item.id);
      if (error) throw error;
      await refreshMenu();
      setMenuNotice(item.status === "active" ? "Produto pausado." : "Produto disponível no cardápio.");
    } catch (error) {
      setMenuError(`Não foi possível alterar a disponibilidade: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setMenuSaving(false);
    }
  };
  const deleteMenuItemFromCard = async (item: MenuDraft) => {
    if (!item.id || !restaurantId) return;
    if (!window.confirm(`Remover “${item.name}” do cardápio?`)) return;
    setMenuSaving(true);
    setMenuError("");
    setMenuNotice("");
    try {
      const { error } = await deleteRestaurantMenuItem(restaurantId, item.id);
      if (error) throw error;
      await refreshMenu();
      setMenuNotice("Produto removido do cardápio.");
    } catch (error) {
      setMenuError(`Não foi possível remover o produto: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setMenuSaving(false);
    }
  };
  const selectProductMedia = async (kind: "photo" | "video", files: File[]) => {
    if (!files.length || !editingMenuDraft) return;
    const addedAssets: MenuMediaDraft[] = [];
    const selectionErrors: string[] = [];
    for (const file of files) {
      if (kind === "photo") {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
          selectionErrors.push(`A foto “${file.name}” deve estar em JPG, PNG ou WebP e ter no máximo 8 MB.`);
          continue;
        }
        const preview = URL.createObjectURL(file);
        addedAssets.push({ key: crypto.randomUUID(), type: "image", url: "", file, preview });
        continue;
      }
      if (!["video/mp4", "video/quicktime"].includes(file.type) || file.size > 50 * 1024 * 1024) {
        selectionErrors.push(`O vídeo “${file.name}” deve estar em MP4 ou MOV e ter no máximo 50 MB.`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      try {
        const duration = await new Promise<number>((resolve, reject) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => {
            const length = video.duration;
            video.removeAttribute("src");
            video.load();
            resolve(length);
          };
          video.onerror = () => {
            video.removeAttribute("src");
            video.load();
            reject(new Error(`Não foi possível validar a duração do vídeo “${file.name}”.`));
          };
          video.src = preview;
        });
        if (duration > 15) {
          URL.revokeObjectURL(preview);
          selectionErrors.push(`O vídeo “${file.name}” excede o limite de 15 segundos.`);
          continue;
        }
        addedAssets.push({ key: crypto.randomUUID(), type: "video", url: "", file, preview });
      } catch (error) {
        URL.revokeObjectURL(preview);
        selectionErrors.push(error instanceof Error ? error.message : "Não foi possível validar a duração do vídeo.");
      }
    }
    if (addedAssets.length) {
      setEditingMenuDraft((current) => current ? { ...current, media_items: [...current.media_items, ...addedAssets] } : current);
      setMenuMediaIndex(editingMenuDraft.media_items.length + addedAssets.length - 1);
      setMenuMediaTab(addedAssets[addedAssets.length - 1].type === "image" ? "photo" : "video");
    }
    setMenuError(selectionErrors.join(" "));
  };
  const addProductMediaLink = (kind: "photo" | "video") => {
    if (!editingMenuDraft) return;
    try {
      const value = menuMediaUrlInput.trim();
      if (!value) throw new Error("Informe o link da mídia.");
      const parsed = new URL(value);
      const validExtension = kind !== "video" || /\.(mp4|mov)(?:$|[?#])/i.test(parsed.href);
      if (parsed.protocol !== "https:" || !validExtension) {
        throw new Error(kind === "video" ? "Use um link HTTPS direto para um vídeo MP4 ou MOV." : "Use um link HTTPS válido para a foto.");
      }
      const asset: MenuMediaDraft = { key: crypto.randomUUID(), type: kind === "photo" ? "image" : "video", url: parsed.href, file: null, preview: parsed.href };
      setEditingMenuDraft({ ...editingMenuDraft, media_items: [...editingMenuDraft.media_items, asset] });
      setMenuMediaIndex(editingMenuDraft.media_items.length);
      setMenuMediaUrlInput("");
      setMenuMediaTab(kind);
      setMenuError("");
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : "O link do vídeo é inválido.");
    }
  };
  const removeProductMedia = (key: string) => {
    if (!editingMenuDraft) return;
    const index = editingMenuDraft.media_items.findIndex((asset) => asset.key === key);
    const asset = editingMenuDraft.media_items[index];
    if (asset?.preview.startsWith("blob:")) URL.revokeObjectURL(asset.preview);
    const media_items = editingMenuDraft.media_items.filter((item) => item.key !== key);
    setEditingMenuDraft({ ...editingMenuDraft, media_items });
    setMenuMediaIndex((current) => Math.max(0, Math.min(current > index ? current - 1 : current, media_items.length - 1)));
  };
  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag || !editingMenuDraft || editingMenuDraft.tags.includes(tag)) return;
    setEditingMenuDraft({ ...editingMenuDraft, tags: [...editingMenuDraft.tags, tag] });
    setCustomTagInput("");
  };
  const closeProductModal = () => {
    editingMenuDraft?.media_items.forEach((asset) => {
      if (asset.preview.startsWith("blob:")) URL.revokeObjectURL(asset.preview);
    });
    setProductModalOpen(false);
    setEditingMenuDraft(null);
    setMenuMediaIndex(0);
    setMenuMediaUrlInput("");
  };
  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError("");
    setSaved(false);
    try {
      await onSaveSettings(settingsDraft);
      setSaved(true);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    } finally {
      setSavingSettings(false);
    }
  };
  const history: string[][] = [];
  if (page === "Avaliações") return <section className="management"><div className="welcome"><div><p className="eyebrow">VOZ DO CLIENTE</p><h1>Avaliações</h1><p>Entenda a experiência dos clientes e encontre oportunidades.</p></div></div><div className="ratings-page"><div className="panel ratings-kpi"><span><Icon name="star" size={29} /></span><strong>{ratings.length ? (ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length).toFixed(1) : "0.0"}</strong><p>Média de {ratings.length} avaliações</p></div><div className="panel ratings-feed">{ratings.map((item) => <article key={item.id}><div className="feed-head"><strong>Mesa {String(item.table).padStart(2, "0")}</strong><span>{item.score}/5 <Icon name="star" size={13} /></span></div><p>{item.comment || "Sem comentário."}</p><small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small></article>)}{!ratings.length && <div className="rating-empty"><Icon name="star" /><p>Ainda não há avaliações.</p></div>}</div></div></section>;
  if (page === "Histórico") return <section className="management"><div className="welcome"><div><p className="eyebrow">OPERAÇÃO</p><h1>Histórico de atendimentos</h1><p>Acompanhe todas as interações realizadas hoje.</p></div><button className="secondary" onClick={() => window.print()}>Exportar relatório</button></div>{history.length ? <div className="panel data-list"><div className="data-head"><span>Mesa</span><span>Atividade</span><span>Horário</span><span>Resposta</span></div>{history.map((row) => <div className="data-row" key={row.join()}>{row.map((cell, i) => <span key={cell} className={i === 1 ? "activity" : ""}>{i === 1 && <Icon name="check" size={14} />}{cell}</span>)}</div>)}</div> : <div className="panel"><div className="empty"><span><Icon name="check" /></span><h3>Sem histórico</h3><p>Os atendimentos reais aparecerão aqui quando houver dados no sistema.</p></div></div>}</section>;
  if (page === "Cardápio") return <section className="management">
    <div className="menu-dashboard-header">
      <div><h1>Cardápio Digital</h1><p>Cadastre categorias, organize pratos e bebidas e controle itens disponíveis hoje.</p></div>
      <div className="menu-dashboard-actions"><button className="secondary" disabled={!restaurantId} onClick={() => { setMenuError(""); setCategoryModalOpen(true); }}><Icon name="folder" size={16} /> Nova Categoria</button><button className="menu-primary-button" disabled={!restaurantId || menuLoading} onClick={() => { setEditingMenuDraft(newMenuDraft(items.length)); setMenuMediaTab("photo"); setMenuMediaIndex(0); setMenuMediaUrlInput(""); setCustomTagInput(""); setMenuError(""); setProductModalOpen(true); }}><Icon name="plus" size={16} /> Novo Produto</button></div>
    </div>
    <div className="menu-tabs" role="tablist" aria-label="Gerenciar cardápio">
      <button role="tab" aria-selected={menuTab === "products"} className={menuTab === "products" ? "active" : ""} onClick={() => setMenuTab("products")}>Produtos ({items.length})</button>
      <button role="tab" aria-selected={menuTab === "categories"} className={menuTab === "categories" ? "active" : ""} onClick={() => setMenuTab("categories")}>Categorias ({categories.length})</button>
    </div>
    {menuError && !productModalOpen && !categoryModalOpen && <div className="login-error admin-feedback" role="alert">{menuError}</div>}
    {menuNotice && <div className="admin-notice" role="status">{menuNotice}</div>}
    {menuLoading ? <div className="panel admin-empty">Carregando cardápio...</div> : menuTab === "products" ? <div className="menu-tab-content">
      {items.length ? <div className="menu-product-grid">{items.map((item) => {
        const price = Number(item.promotional_price || item.price || 0);
        const priceLabel = `${price.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.currency || "Kz"}`;
        const editItem = () => {
          setEditingMenuDraft(newMenuDraft(item.position, item));
          setMenuMediaTab(item.video_url || item.reel_url ? "video" : "photo");
          setMenuMediaIndex(Math.max(0, item.media_items.findIndex((asset) => asset.type === "video")));
          setMenuMediaUrlInput("");
          setCustomTagInput("");
          setMenuError("");
          setProductModalOpen(true);
        };
        return <article className={`menu-product-card ${item.status === "paused" ? "paused" : ""}`} key={item.key}>
          <div className="menu-product-card-main">
            <div className="menu-product-card-media">{item.image_url ? <img src={item.image_url} alt="" /> : <span><Icon name="utensils" size={26} /></span>}</div>
            <div className="menu-product-card-copy">
              <div className="menu-product-card-meta"><span>{item.category || "OUTROS"}</span>{item.is_featured && <span className="menu-product-featured"><Icon name="star" size={13} /></span>}{(item.video_url || item.reel_url) && <span className="menu-product-reel"><Icon name="video" size={11} /> REELS 9:16</span>}</div>
              <h3>{item.name || "Produto sem nome"}</h3>
              {item.description && <p>{item.description}</p>}
              <div className="menu-product-card-price">{item.promotional_price && <del>{Number(item.price).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency || "Kz"}</del>}<strong>{priceLabel}</strong></div>
            </div>
          </div>
          <div className="menu-product-card-tags">{(item.tags.length ? item.tags : [item.category || "OUTROS"]).map((tag) => <span key={tag}>{tag.toUpperCase()}</span>)}</div>
          <footer className="menu-product-card-footer">
            <button className={`menu-product-availability ${item.status === "paused" ? "is-paused" : ""}`} disabled={menuSaving} onClick={() => void toggleMenuItemAvailability(item)}><Icon name={item.status === "active" ? "check" : "clock"} size={14} />{item.status === "active" ? "Disponível Hoje" : "Pausado · Ativar"}</button>
            <div className="menu-product-card-actions">
              <button aria-label={`Duplicar ${item.name}`} title="Duplicar produto" disabled={menuSaving} onClick={() => duplicateMenuItem(item)}><Icon name="copy" size={16} /></button>
              <button aria-label={`Editar ${item.name}`} title="Editar produto" disabled={menuSaving} onClick={editItem}><Icon name="edit" size={16} /></button>
              <button aria-label={`Remover ${item.name}`} title="Remover produto" disabled={menuSaving} onClick={() => void deleteMenuItemFromCard(item)}><Icon name="trash" size={16} /></button>
            </div>
          </footer>
        </article>;
      })}</div> : <div className="panel menu-empty-state"><Icon name="menu" size={28} /><h2>Nenhum produto cadastrado</h2><p>Cadastre categorias e produtos para montar o cardápio digital do restaurante.</p><button className="menu-primary-button" onClick={() => { setMenuError(""); setCategoryModalOpen(true); }}><Icon name="plus" size={16} /> Criar categoria</button></div>}
    </div> : <div className="menu-tab-content">
      {categories.length ? <div className="menu-category-list">{categories.map((category) => {
        const categoryItems = items.filter((item) => item.category_id === category.id);
        return <article className="panel menu-category-card" key={category.id}><span><Icon name="folder" size={19} /></span><div><h3>{category.name}</h3><p>{category.description || "Sem descrição"} · {categoryItems.length} produtos</p></div><button className="remove" aria-label={`Remover categoria ${category.name}`} onClick={() => void removeMenuCategory(category)}><Icon name="close" size={17} /></button></article>;
      })}</div> : <div className="panel menu-empty-state"><Icon name="folder" size={28} /><h2>Nenhuma categoria cadastrada</h2><p>Crie categorias para organizar pratos e bebidas.</p><button className="menu-primary-button" onClick={() => { setMenuError(""); setCategoryModalOpen(true); }}><Icon name="plus" size={16} /> Nova Categoria</button></div>}
    </div>}
    {categoryModalOpen && <div className="modal-backdrop menu-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !menuSaving && setCategoryModalOpen(false)}><form className="menu-category-modal" onSubmit={(event) => void saveMenuCategory(event)}><div className="menu-modal-heading"><div><h2>Nova Categoria</h2><p>Agrupe seus pratos e bebidas em seções claras.</p></div><button type="button" onClick={() => setCategoryModalOpen(false)} aria-label="Fechar" disabled={menuSaving}><Icon name="close" /></button></div><label>Nome da Categoria<input autoFocus maxLength={60} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas" /></label><label>Descrição (Opcional)<input maxLength={180} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} placeholder="Ex: Aperitivos e porções artesanais" /></label>{menuError && <div className="login-error" role="alert">{menuError}</div>}<div className="menu-modal-actions"><button className="menu-primary-button" type="submit" disabled={menuSaving}>{menuSaving ? "Salvando..." : "Salvar Categoria"}</button><button className="secondary" type="button" onClick={() => setCategoryModalOpen(false)} disabled={menuSaving}>Cancelar</button></div></form></div>}
    {productModalOpen && editingMenuDraft && <div className="modal-backdrop menu-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !menuSaving && closeProductModal()}><div className="menu-product-modal" role="dialog" aria-modal="true" aria-labelledby="menu-product-modal-title">
      <div className="menu-product-modal-head"><div><h2 id="menu-product-modal-title">{editingMenuDraft.id ? "Editar Produto" : "Cadastrar Novo Prato"}</h2><p>Cadastre pratos, porções e bebidas e personalize fotos e vídeos verticais.</p></div><button onClick={closeProductModal} aria-label="Fechar" disabled={menuSaving}><Icon name="close" /></button></div>
      <form className="menu-product-modal-form" onSubmit={(event) => { event.preventDefault(); void saveMenuDraft(editingMenuDraft); }}>
        <div className="menu-product-modal-scroll">
          <div className="menu-product-modal-columns">
            <section className="menu-product-form-fields"><div className="menu-form-section-title"><strong>INFORMAÇÕES DO CARDÁPIO</strong><span>Dados principais</span></div>
              <label>Nome do Produto<input required maxLength={100} value={editingMenuDraft.name} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, name: event.target.value })} placeholder="Ex: Hambúrguer da Casa, Picanha na Chapa" /></label>
              <label>Categoria no Cardápio<select required value={editingMenuDraft.category_id} onChange={(event) => { const category = categories.find((candidate) => candidate.id === event.target.value); setEditingMenuDraft({ ...editingMenuDraft, category_id: event.target.value, category: category?.name || "" }); }}><option value="">Selecione uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <div className="menu-product-row"><label>Preço Normal ({editingMenuDraft.currency})<input required type="number" min="0" step="0.01" value={editingMenuDraft.price} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, price: event.target.value })} placeholder="34.90" /></label><label>Preço Promocional (Opcional)<input type="number" min="0" step="0.01" value={editingMenuDraft.promotional_price} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, promotional_price: event.target.value })} placeholder="29.90" /></label></div>
              <label>Descrição Detalhada do Prato<textarea maxLength={600} rows={4} value={editingMenuDraft.description} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, description: event.target.value })} placeholder="Descreva os ingredientes, acompanhamentos e modo de preparo..." /><small className="menu-character-count">{editingMenuDraft.description.length} caracteres</small></label>
              <div className="menu-tag-field"><strong>Tags e Selos Alimentares</strong><div className="menu-tag-presets">{["⭐ Mais Pedido", "🌱 Vegetariano", "🌾 Sem Glúten", "🌶 Picante", "🏆 Artesanal", "🆕 Novidade", "🥩 Especial da Casa"].map((tag) => <button type="button" className={editingMenuDraft.tags.includes(tag) ? "selected" : ""} key={tag} onClick={() => setEditingMenuDraft({ ...editingMenuDraft, tags: editingMenuDraft.tags.includes(tag) ? editingMenuDraft.tags.filter((value) => value !== tag) : [...editingMenuDraft.tags, tag] })}>{tag}</button>)}</div><div className="menu-custom-tag"><input value={customTagInput} onChange={(event) => setCustomTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTag(); } }} placeholder="Outra tag personalizada (pressione Enter)" /><button type="button" onClick={addCustomTag}>Adicionar</button></div></div>
              <label className="menu-featured-toggle"><input type="checkbox" checked={editingMenuDraft.is_featured} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, is_featured: event.target.checked })} /><span><strong>☆ Produto em Destaque no Cardápio</strong><small>Fixado no carrossel do topo do cardápio para gerar mais visibilidade.</small></span></label>
              <label className="menu-status-toggle"><span>Disponibilidade no cardápio</span><select value={editingMenuDraft.status} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, status: event.target.value as "active" | "paused" })}><option value="active">Publicado</option><option value="paused">Pausado</option></select></label>
            </section>
            <section className="menu-media-studio"><div className="menu-form-section-title"><strong>STUDIO DE MÍDIAS (9:16)</strong><span>{editingMenuDraft.media_items.length} itens para Stories</span></div><div className="menu-media-tabs"><button type="button" className={menuMediaTab === "photo" ? "active" : ""} onClick={() => { setMenuMediaTab("photo"); const index = editingMenuDraft.media_items.findIndex((asset) => asset.type === "image"); if (index >= 0) setMenuMediaIndex(index); }}><Icon name="image" size={15} /> Fotos</button><button type="button" className={menuMediaTab === "video" ? "active" : ""} onClick={() => { setMenuMediaTab("video"); const index = editingMenuDraft.media_items.findIndex((asset) => asset.type === "video"); if (index >= 0) setMenuMediaIndex(index); }}><Icon name="video" size={15} /> Vídeos</button></div>
              {(() => {
                const visibleAssets = editingMenuDraft.media_items.filter((asset) => asset.type === (menuMediaTab === "photo" ? "image" : "video"));
                const selectedAsset = editingMenuDraft.media_items[menuMediaIndex];
                const activeAsset = selectedAsset?.type === (menuMediaTab === "photo" ? "image" : "video") ? selectedAsset : visibleAssets[0];
                return <><div className="menu-story-editor-preview">
                  {activeAsset ? activeAsset.type === "image" ? <img src={activeAsset.preview} alt={`Prévia de ${editingMenuDraft.name || "produto"}`} /> : <div className="reel-phone-frame"><div className="reel-phone-screen">
                    <video key={activeAsset.key} src={activeAsset.preview} autoPlay muted loop playsInline />
                    <span className="reel-phone-notch" />
                    <div className="reel-phone-top"><span className="reel-phone-sound" aria-label="Vídeo sem som"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6v4h3l4 3V3L5 6H2Zm9-1 3 6m0-6-3 6" /></svg></span><span className="reel-phone-badge">REELS</span></div>
                    <div className="reel-phone-copy"><strong>{editingMenuDraft.category.trim() || "CATEGORIA"}</strong><b>{editingMenuDraft.name.trim() || "Nome do Prato"}</b><span>{Number(editingMenuDraft.promotional_price || editingMenuDraft.price || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz</span></div>
                  </div></div> : <div className="menu-story-editor-empty"><Icon name={menuMediaTab === "photo" ? "image" : "video"} size={27} /><strong>Nenhuma {menuMediaTab === "photo" ? "foto" : "mídia"} adicionada</strong><small>Adicione vários arquivos para montar a sequência de Stories deste produto.</small></div>}
                </div>
                {visibleAssets.length > 0 && <div className="menu-media-asset-list" aria-label={menuMediaTab === "photo" ? "Fotos do produto" : "Vídeos do produto"}>{editingMenuDraft.media_items.map((asset, index) => ({ asset, index })).filter(({ asset }) => asset.type === (menuMediaTab === "photo" ? "image" : "video")).map(({ asset, index }) => <div className={index === menuMediaIndex ? "menu-media-asset selected" : "menu-media-asset"} key={asset.key}><button type="button" className="menu-media-asset-preview" onClick={() => setMenuMediaIndex(index)} aria-label={`Ver ${asset.type === "image" ? "foto" : "vídeo"} ${visibleAssets.findIndex((visibleAsset) => visibleAsset.key === asset.key) + 1}`}>{asset.type === "image" ? <img src={asset.preview} alt="" /> : <><video src={asset.preview} muted playsInline /><span><Icon name="play" size={12} /></span></>}</button><button type="button" className="menu-media-asset-remove" onClick={() => removeProductMedia(asset.key)} aria-label={`Remover ${asset.type === "image" ? "foto" : "vídeo"} ${visibleAssets.findIndex((visibleAsset) => visibleAsset.key === asset.key) + 1}`}><Icon name="close" size={12} /></button></div>)}</div>}</>;
              })()}
              <label className="menu-media-upload">{menuMediaTab === "photo" ? <><Icon name="image" size={17} /> Adicionar Fotos</> : <><Icon name="video" size={17} /> Adicionar Vídeos</>}<input type="file" multiple accept={menuMediaTab === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/quicktime"} onChange={(event) => { void selectProductMedia(menuMediaTab, Array.from(event.target.files || [])).catch((error: unknown) => setMenuError(`Não foi possível processar os arquivos: ${error instanceof Error ? error.message : "erro desconhecido"}`)); event.target.value = ""; }} /></label>
              <label className="menu-media-url">{menuMediaTab === "photo" ? "Adicionar link de foto HTTPS" : "Adicionar link direto de vídeo MP4/MOV"}<div className="menu-media-url-row"><input type="url" value={menuMediaUrlInput} onChange={(event) => setMenuMediaUrlInput(event.target.value)} placeholder={menuMediaTab === "photo" ? "https://midia.exemplo.com/foto.jpg" : "https://midia.exemplo.com/video.mp4"} /><button type="button" onClick={() => addProductMediaLink(menuMediaTab)}><Icon name="plus" size={14} /> Adicionar</button></div></label>
              {menuMediaTab === "video" && <label className="menu-media-url">Link do Instagram Reels (opcional)<input type="url" value={editingMenuDraft.reel_url} onChange={(event) => setEditingMenuDraft({ ...editingMenuDraft, reel_url: event.target.value })} placeholder="https://www.instagram.com/reel/..." /></label>}
              <p className="menu-media-hint"><Icon name="check" size={14} /> Fotos JPG/PNG/WebP até 8 MB. Vídeos MP4/MOV, verticais, até 15 segundos e 50 MB.</p>
            </section>
          </div>
          {menuError && <div className="login-error menu-modal-error" role="alert">{menuError}</div>}
        </div>
        <footer className="menu-product-modal-footer"><span><i /> Cardápio atualizado em tempo real para os clientes nas mesas</span><div>{editingMenuDraft.id && <button className="remove" type="button" aria-label="Remover produto" disabled={menuSaving} onClick={() => void removeMenuDraft(editingMenuDraft)}><Icon name="close" /></button>}<button className="secondary" type="button" onClick={closeProductModal} disabled={menuSaving}>Cancelar</button><button className="menu-primary-button" type="submit" disabled={menuSaving || !categories.length}>{menuSaving ? "Salvando..." : <><Icon name="check" size={16} /> {editingMenuDraft.id ? "Salvar Produto" : "Cadastrar Produto"}</>}</button></div></footer>
      </form>
    </div></div>}
    </section>;
  return <section className="management"><div className="welcome"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Configurações</h1><p>Personalize a operação da sua unidade.</p></div></div><form className="panel settings-form" onSubmit={saveSettings}><h2>Informações do restaurante</h2><div className="form-grid">
    <label>Nome do restaurante<input required value={settingsDraft.restaurant_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, restaurant_name: event.target.value }); setSaved(false); }} placeholder="Nome do restaurante" /></label>
    <label>Unidade<input value={settingsDraft.unit_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, unit_name: event.target.value }); setSaved(false); }} placeholder="Unidade" /></label>
    <label>Nome do administrador<input value={settingsDraft.admin_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, admin_name: event.target.value }); setSaved(false); }} placeholder="Nome completo" /></label>
    <label>Endereço<input value={settingsDraft.address} onChange={(event) => { setSettingsDraft({ ...settingsDraft, address: event.target.value }); setSaved(false); }} placeholder="Endereço" /></label>
    <label>Número de mesas<input type="number" value={settingsDraft.default_table_count} min="1" max="200" onChange={(event) => { setSettingsDraft({ ...settingsDraft, default_table_count: Math.min(200, Math.max(1, Number(event.target.value) || 1)) }); setSaved(false); }} /></label>
  </div><h2>Preferências de atendimento</h2>
    <label className="check-setting"><input type="checkbox" checked={settingsDraft.enable_sound_alerts} onChange={(event) => { setSettingsDraft({ ...settingsDraft, enable_sound_alerts: event.target.checked }); setSaved(false); }} /><span>Reproduzir som ao receber um novo chamado<small>Recomendado para a central exibida na TV.</small></span></label>
    <label className="check-setting"><input type="checkbox" checked={settingsDraft.highlight_after_minutes > 0} onChange={(event) => { setSettingsDraft({ ...settingsDraft, highlight_after_minutes: event.target.checked ? 5 : 0 }); setSaved(false); }} /><span>Destacar chamados após 5 minutos<small>O cartão muda para urgente automaticamente.</small></span></label>
    <div className="brand-settings">
      <section className="brand-setting-block">
        <div className="brand-setting-heading"><div><h3><Icon name="image" size={15} /> Imagem de Fundo do Topo (Capa da Mesa)</h3><p>Esta foto aparece como banner panorâmico no topo da tela do cliente via QR Code.</p></div>{settingsDraft.cover_image_url && <button type="button" className="brand-remove-button" onClick={() => { setSettingsDraft({ ...settingsDraft, cover_image_url: "" }); setSaved(false); }}>Remover Capa</button>}</div>
        <div className="brand-cover-preview" style={settingsDraft.cover_image_url ? { backgroundImage: `linear-gradient(0deg, rgba(10,18,28,.72), rgba(10,18,28,.02) 72%), url(${JSON.stringify(settingsDraft.cover_image_url)})` } : undefined}><span>PRÉ-VISUALIZAÇÃO DA CAPA</span><strong>{settingsDraft.restaurant_name || "Nome do restaurante"}</strong></div>
        <div className="brand-setting-input-row"><input type="url" value={settingsDraft.cover_image_url} onChange={(event) => { setSettingsDraft({ ...settingsDraft, cover_image_url: event.target.value }); setSaved(false); }} placeholder="https://exemplo.com/capa.jpg" aria-label="URL da imagem de capa" /><label className="brand-upload-button">{uploadingBrandField === "cover_image_url" ? "Enviando..." : "Upload da Foto"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingBrandField !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBrandImage("cover_image_url", file); event.currentTarget.value = ""; }} /></label></div>
      </section>
      <section className="brand-setting-block brand-logo-setting">
        <div className="brand-setting-heading"><div><h3><Icon name="star" size={15} /> Logotipo do Estabelecimento (Acima do Título)</h3><p>Ícone ou emblema exibido acima do nome do restaurante na tela da mesa.</p></div>{settingsDraft.logo_url && <button type="button" className="brand-remove-button" onClick={() => { setSettingsDraft({ ...settingsDraft, logo_url: "" }); setSaved(false); }}>Remover Logo</button>}</div>
        <div className="brand-logo-row">{settingsDraft.logo_url ? <img className="brand-logo-preview" src={settingsDraft.logo_url} alt="Pré-visualização do logotipo" /> : <span className="brand-logo-placeholder"><Icon name="image" size={22} /></span>}<div className="brand-setting-input-row"><input type="url" value={settingsDraft.logo_url} onChange={(event) => { setSettingsDraft({ ...settingsDraft, logo_url: event.target.value }); setSaved(false); }} placeholder="https://exemplo.com/logotipo.png" aria-label="URL do logotipo" /><label className="brand-upload-button">{uploadingBrandField === "logo_url" ? "Enviando..." : "Upload Logo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingBrandField !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBrandImage("logo_url", file); event.currentTarget.value = ""; }} /></label></div></div>
      </section>
      <section className="brand-setting-block brand-color-setting"><label htmlFor="restaurant-primary-color">Cor Primária dos Botões e Destaques</label><div><input id="restaurant-primary-color" type="color" value={/^#[\da-f]{6}$/i.test(settingsDraft.primary_color) ? settingsDraft.primary_color : "#0a0a0a"} onChange={(event) => { setSettingsDraft({ ...settingsDraft, primary_color: event.target.value }); setSaved(false); }} /><input type="text" value={settingsDraft.primary_color} pattern="^#[0-9a-fA-F]{6}$" maxLength={7} aria-label="Código hexadecimal da cor primária" onChange={(event) => { setSettingsDraft({ ...settingsDraft, primary_color: event.target.value }); setSaved(false); }} /><span className="brand-color-preview" style={{ backgroundColor: /^#[\da-f]{6}$/i.test(settingsDraft.primary_color) ? settingsDraft.primary_color : "#0a0a0a" }}>Preview do Botão</span></div></section>
      <section className="brand-setting-block social-settings">
        <div className="brand-setting-heading"><div><h3><Icon name="users" size={15} /> Redes sociais e avaliações</h3><p>Ative apenas os botões que pretende mostrar na página da mesa.</p></div></div>
        <div className="social-settings-grid">{socialPlatforms.map((platform) => <div className="social-setting-row" key={platform.id}>
          <label className="social-setting-toggle"><input type="checkbox" checked={settingsDraft[platform.enabledField]} onChange={(event) => { setSettingsDraft({ ...settingsDraft, [platform.enabledField]: event.target.checked }); setSaved(false); }} /><span>{platform.id === "google" ? "Ativar avaliações no Google" : `Ativar ${platform.name}`}</span></label>
          <input type="url" value={settingsDraft[platform.urlField]} onChange={(event) => { setSettingsDraft({ ...settingsDraft, [platform.urlField]: event.target.value }); setSaved(false); }} placeholder={platform.id === "google" ? "https://g.page/r/.../review" : `https://${platform.hostnames[0]}/seu-perfil`} aria-label={`Link de ${platform.name}`} />
          <small>{platform.id === "google" ? "Link direto para avaliar o restaurante." : `Link do perfil oficial no ${platform.name}.`}</small>
        </div>)}</div>
      </section>
    </div>
    {settingsError && <div className="login-error">{settingsError}</div>}
    <div className="save-row">{saved && <span><Icon name="check" size={15} /> Configurações salvas</span>}<button className="primary" type="submit" disabled={savingSettings}>{savingSettings ? "Salvando..." : "Salvar alterações"}</button></div></form></section>;
}

function LoginPage({ onLogin, onBack }: { onLogin: (role: AppRole) => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await signInWithEmail(email.trim(), password);

      if (signInError) {
        throw signInError;
      }

      if (!data.session) {
        throw new Error("Sessão não iniciada.");
      }

      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.session.user.id).maybeSingle();
      if (profileError) {
        console.error("Profile lookup failed:", profileError);
        await signOut();
        throw new Error("Não foi possível consultar o perfil no Supabase. Verifique as políticas de acesso da tabela profiles.");
      }
      console.log("Role:", profile?.role);
      const role = normalizeAppRole(profile?.role);

      if (!profile || !role) {
        await signOut();
        throw new Error("Perfil ainda não está configurado com uma permissão válida. Faça login depois que o perfil for criado pelo administrador.");
      }

      if (role !== "admin" && role !== "user") {
        await signOut();
        throw new Error("Conta inválida para este sistema.");
      }

      onLogin(role);
    } catch (err) {
      const fetchFailed = err instanceof Error && (err.name === "AuthRetryableFetchError" || /failed to fetch/i.test(err.message));
      const message = fetchFailed
        ? "Não foi possível conectar ao Supabase. Confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas Environment Variables da Vercel e faça um novo deploy."
        : err instanceof Error ? err.message : "Não foi possível entrar.";
      setError(message);
      console.error("Supabase login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <button className="login-back" onClick={onBack}>← Voltar</button>
        <div className="login-brand"><Logo /></div>
        <div className="login-header">
          <p className="eyebrow">Acesso restrito</p>
          <h1>Entre na plataforma</h1>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" />
          </label>

          <label>
            <span>Senha</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="primary-button" type="submit" disabled={!email.trim() || !password.trim() || loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="login-note">O acesso é criado pelo administrador da plataforma.</p>
      </div>
    </div>
  );
}

function LandingPage({ enterApp, openContact }: { enterApp: () => void; openContact: () => void }) {
  const landingRef = useRef<HTMLDivElement | null>(null);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    const tick = requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-copy > *",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-visual",
        { opacity: 0, y: 48, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "power3.out" }
      );

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 32, filter: "blur(14px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((element) => {
        const target = Number(element.dataset.count ?? 0);
        const suffix = element.dataset.suffix ?? "";
        const value = { current: 0 };

        gsap.to(value, {
          current: target,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
          },
          onUpdate: () => {
            element.textContent = `${Math.round(value.current)}${suffix}`;
          },
        });
      });

      gsap.to(".feature-card", {
        y: -6,
        duration: 1.5,
        ease: "sine.inOut",
        stagger: 0.08,
        scrollTrigger: {
          trigger: ".feature-grid",
          start: "top 75%",
        },
      });
    }, landingRef);

    return () => {
      ctx.revert();
      cancelAnimationFrame(tick);
      lenis.destroy();
    };
  }, []);

  const featureCards = [
    { title: "QR Code", text: "Acesso instantâneo sem instalar nada.", icon: "phone" },
    { title: "NFC", text: "Toque e conecte diretamente à mesa.", icon: "bell" },
    { title: "Painel da equipe", text: "Chamados claros, urgentes e organizados.", icon: "grid" },
    { title: "Analytics", text: "Dados em tempo real para decisões rápidas.", icon: "trend" },
    { title: "Notificações", text: "Alertas inteligentes e sem ruído.", icon: "star" },
    { title: "Pedidos", text: "Fluxo completo do cliente à operação.", icon: "receipt" },
  ];

  const steps = [
    { number: "01", title: "Aproxime", text: "O cliente usa o QR Code ou NFC da mesa e entra em segundos." },
    { number: "02", title: "Escolha", text: "Menu, conta e avaliação ficam na mesma experiência sem atrito." },
    { number: "03", title: "Receba", text: "A equipe recebe a solicitação em tempo real no painel central." },
  ];

  const faqs = [
    { q: "Funciona sem app instalado?", a: "Sim. O cliente acessa direto pelo QR Code ou pela tag NFC com o celular." },
    { q: "A equipe consegue responder rápido?", a: "Com a fila priorizada e a visualização em tempo real, a resposta fica muito mais ágil." },
    { q: "Posso usar em restaurantes pequenos e grandes?", a: "O sistema foi feito para salões de qualquer escala, com muito foco em operação e clareza." },
    { q: "É bom para apresentação a investidores?", a: "Com certeza. A experiência premium e a operação em tempo real ajudam a transmitir escala e maturidade." },
  ];

  return (
    <div className="landing" ref={landingRef}>
      <div className="noise" aria-hidden="true" />
      <header className="landing-nav">
        <a className="landing-brand" href="#inicio" aria-label="TapServe, início"><Logo /></a>
        <nav>
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#preco">Preço</a>
        </nav>
        <div>
          <button className="nav-login" onClick={enterApp}>Entrar</button>
          <button className="nav-cta" onClick={openContact}>Entrar em contato</button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" id="inicio">
          <div className="hero-copy">
            <p className="landing-kicker reveal"><span /> Atendimento em tempo real</p>
            <h1 className="reveal">Seu salão ganha<br />uma conversa sem ruído.</h1>
            <p className="hero-lead reveal">
              O cliente chama, escolhe e resolve tudo com um toque. Sua equipe recebe pedidos,
              dúvidas e contas em uma operação elegante e surpreendentemente rápida.
            </p>
            <div className="hero-buttons reveal">
              <button onClick={openContact}>Entrar em contato <Icon name="chevron" size={17} /></button>
              <a href="#produto">Conhecer o produto</a>
            </div>
            <div className="hero-proof reveal">
              <strong>Sem app</strong>
              <span />
              <span>QR Code + NFC</span>
              <span />
              <span>Implantação em minutos</span>
            </div>
          </div>

          <div className="hero-visual reveal">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="device-shell">
              <div className="device-header">
                <div className="device-pill">Restaurante</div>
                <div className="device-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="device-body">
                <div className="device-hero">
                  <p>Mesa 08</p>
                  <h3>Como podemos ajudar?</h3>
                </div>

                <div className="device-actions">
                  <button className="primary-action"><Icon name="bell" size={18} /> Chamar garçom</button>
                  <div className="split-actions">
                    <button><Icon name="utensils" size={16} /> Cardápio</button>
                    <button><Icon name="receipt" size={16} /> Conta</button>
                  </div>
                </div>

                <div className="device-card">
                  <div className="device-card-header">
                    <span>Pedido</span>
                    <strong>Agora</strong>
                  </div>
                  <ul>
                    <li><span>Item do cardápio</span><b>—</b></li>
                    <li><span>Sem dados reais</span><b>—</b></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="floating-badge badge-top">
              <span className="badge-dot" />
              <div>
                <small>Tempo médio</small>
                <strong>1m 42s</strong>
              </div>
            </div>

            <div className="floating-badge badge-bottom">
              <span className="badge-dot badge-green" />
              <div>
                <small>Chamados ativos</small>
                <strong>04</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-strip reveal">
          <span>OPERAÇÃO EM TEMPO REAL</span>
          <i />
          <span>QR CODE + NFC</span>
          <i />
          <span>SEM APP</span>
          <i />
          <span>PRONTO PARA O SALÃO</span>
        </section>

        <section className="feature-showcase reveal" id="produto">
          <div className="section-heading">
            <div className="eyebrow">O produto</div>
            <h2>Instrumentos que deixam a operação mais inteligente.</h2>
          </div>

          <div className="feature-grid" id="recursos">
            {featureCards.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-icon"><Icon name={feature.icon as IconName} size={18} /></div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="process-section reveal" id="como-funciona">
          <div className="section-heading narrow">
            <div className="eyebrow">Como funciona</div>
            <h2>Da mesa até a equipe em 3 movimentos.</h2>
          </div>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span>{step.number}</span>
                <div className="step-icon"><Icon name={step.number === "01" ? "phone" : step.number === "02" ? "bell" : "check"} size={24} /></div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="story-section reveal" id="operacao">
          <div className="story-visual">
            <div className="story-window">
              <div className="story-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="story-panel">
                <div className="story-panel-header">
                  <div>
                    <small>Central</small>
                    <strong>Restaurante</strong>
                  </div>
                  <button>Online</button>
                </div>
                <div className="story-list">
                  <div className="story-row urgent">
                    <span>—</span>
                    <div>
                      <strong>Chamado</strong>
                      <small>Sem dados</small>
                    </div>
                    <b>—</b>
                  </div>
                  <div className="story-row">
                    <span>—</span>
                    <div>
                      <strong>Conta</strong>
                      <small>Sem dados</small>
                    </div>
                    <b>—</b>
                  </div>
                  <div className="story-row">
                    <span>—</span>
                    <div>
                      <strong>Avaliação</strong>
                      <small>Sem dados</small>
                    </div>
                    <b>—</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="story-copy">
            <div className="eyebrow">Para a equipe</div>
            <h2>Uma central que parece a melhor parte da operação.</h2>
            <p>
              Chamados claros, urgentes, com contexto e ritmo certos. Sem ruído. Sem dispositivos
              duplicados. Só o que precisa para entregar uma experiência impecável.
            </p>
            <ul>
              <li><Icon name="check" size={16} /> Atualização em tempo real</li>
              <li><Icon name="check" size={16} /> Destaque automático para atrasos</li>
              <li><Icon name="check" size={16} /> Histórico e avaliação em um só lugar</li>
            </ul>
            <button className="primary-button" onClick={openContact}>Entrar em contato</button>
          </div>
        </section>

        <section className="stats-section reveal">
          <div className="section-heading center">
            <div className="eyebrow">Resultados</div>
            <h2>Mensuráveis em todos os momentos.</h2>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <strong data-count="42" data-suffix="%">0%</strong>
              <span>redução no tempo de resposta</span>
            </article>
            <article className="stat-card">
              <strong data-count="4.8" data-suffix="/5">0/5</strong>
              <span>média de satisfação</span>
            </article>
            <article className="stat-card">
              <strong data-count="18" data-suffix="k">0k</strong>
              <span>atendimentos processados</span>
            </article>
            <article className="stat-card">
              <strong data-count="96" data-suffix="ms">0ms</strong>
              <span>tempo para visualizar pedidos</span>
            </article>
          </div>
        </section>

        <section className="pricing-section reveal" id="preco">
          <div className="section-heading center">
            <div className="eyebrow">Plano</div>
            <h2>Uma solução premium, feita para crescer com o salão.</h2>
          </div>

          <div className="pricing-card">
            <div className="pricing-copy">
              <div className="plan-badge">Premium</div>
              <h3>TapServe Pro</h3>
              <p>Para restaurantes que querem operação mais rápida, elegante e confiável.</p>
            </div>
            <div className="price-block">
              <div className="price-row">
                <strong>20.000 Kz</strong>
                <span>/mês</span>
              </div>
              <ul>
                <li><Icon name="check" size={14} /> Painel central com chamados em tempo real</li>
                <li><Icon name="check" size={14} /> QR Code + NFC para cada mesa</li>
                <li><Icon name="check" size={14} /> Gerenciamento de cardápio e avaliações</li>
              </ul>
              <button onClick={openContact}>Entrar em contato</button>
            </div>
          </div>
        </section>

        <section className="faq-section reveal">
          <div className="section-heading narrow">
            <div className="eyebrow">FAQ</div>
            <h2>Perguntas frequentes.</h2>
          </div>

          <div className="faq-list">
            {faqs.map((item, index) => (
              <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={item.q}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                  <span>{item.q}</span>
                  <b>{openFaq === index ? "−" : "+"}</b>
                </button>
                <div className="faq-answer">{item.a}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#inicio"><Logo /></a>
        <p>Atendimento direto. Operação clara.</p>
        <span>© 2025 TapServe</span>
      </footer>

      <a
        className="whatsapp-float"
        href={CONTACT_WHATSAPP_LINK}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
      >
        <span>W</span>
      </a>
    </div>
  );
}

function ContactPage({ onBack, enterApp }: { onBack: () => void; enterApp: () => void }) {
  return <div className="landing contact-page">
    <div className="noise" aria-hidden="true" />
    <header className="landing-nav">
      <button className="landing-brand contact-brand" onClick={onBack} aria-label="Voltar ao início"><Logo /></button>
      <div><button className="nav-login" onClick={enterApp}>Entrar</button><button className="nav-cta" onClick={onBack}>Voltar ao site</button></div>
    </header>
    <main className="contact-main">
      <p className="contact-kicker"><span /> CONTATO TAPSERVE</p>
      <h1>Vamos conversar.</h1>
      <p className="contact-intro">Escolha o canal mais conveniente para falar com nossa equipe.</p>
      <div className="contact-options">
        <a className="contact-option" href={`mailto:${CONTACT_EMAIL}`}>
          <span className="contact-icon email"><Icon name="mail" size={22} /></span>
          <span className="contact-copy"><small>EMAIL</small><strong>{CONTACT_EMAIL}</strong><span>Envie sua dúvida ou solicite atendimento.</span></span>
          <Icon name="chevron" size={20} />
        </a>
        <a className="contact-option" href={CONTACT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
          <span className="contact-icon whatsapp"><Icon name="phone" size={22} /></span>
          <span className="contact-copy"><small>WHATSAPP</small><strong>+244 946 970 233</strong><span>Converse diretamente com nossa equipe.</span></span>
          <Icon name="chevron" size={20} />
        </a>
      </div>
      <button className="contact-back-link" onClick={onBack}>Voltar para a página inicial</button>
    </main>
    <footer className="landing-footer"><a className="landing-brand" href="/" onClick={(event) => { event.preventDefault(); onBack(); }}><Logo /></a><p>Atendimento direto. Operação clara.</p><span>© 2025 TapServe</span></footer>
  </div>;
}

const ADMIN_ROLES = ["admin"] as const;
const USER_ROLES = ["user"] as const;

type AppRole = "admin" | "user";
type AppRoute = "landing" | "login" | "contact" | "admin" | "user";

function normalizeAppRole(value: unknown): AppRole | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "admin") return "admin";
  if (normalized === "user") return "user";
  return null;
}

function resolveRouteFromPath(): AppRoute {
  const path = window.location.pathname;
  if (path === "/login") return "login";
  if (path === "/contato") return "contact";
  if (path === "/app/admin") return "admin";
  if (path === "/app/user") return "user";
  if (path.startsWith("/app")) return "user";
  return "landing";
}

const pageMetadata: Record<AppRoute, { title: string; description: string; robots: string }> = {
  landing: {
    title: "TapServe | Atendimento inteligente para restaurantes",
    description: "Organize chamados, pedidos, conta e avaliações com QR Code e NFC. A TapServe conecta clientes e equipe em uma plataforma de atendimento para restaurantes.",
    robots: "index, follow",
  },
  contact: {
    title: "Contato | TapServe",
    description: "Fale com a equipe TapServe por email ou WhatsApp e descubra como simplificar o atendimento do seu restaurante.",
    robots: "index, follow",
  },
  login: {
    title: "Entrar | TapServe",
    description: "Acesse a plataforma TapServe para gerenciar o atendimento do seu restaurante.",
    robots: "noindex, nofollow",
  },
  admin: {
    title: "Administração | TapServe",
    description: "Painel administrativo da plataforma TapServe.",
    robots: "noindex, nofollow",
  },
  user: {
    title: "Painel do restaurante | TapServe",
    description: "Gerencie chamados, mesas, cardápio e avaliações do seu restaurante com TapServe.",
    robots: "noindex, nofollow",
  },
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRouteFromPath());
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [active, setActive] = useState("Visão geral");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(defaultRestaurantSettings);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const isAdmin = userRole === "admin";
  const isUser = userRole === "user";

  const navigateRoute = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const target = nextRoute === "landing" ? "/" : nextRoute === "login" ? "/login" : nextRoute === "contact" ? "/contato" : nextRoute === "admin" ? "/app/admin" : "/app/user";
    window.history.pushState({}, "", target);
  };

  useEffect(() => {
    const metadata = pageMetadata[route];
    document.title = metadata.title;

    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = content;
    };

    setMeta("name", "description", metadata.description);
    setMeta("name", "robots", metadata.robots);
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);

    const publicPath = route === "landing" ? "/" : route === "contact" ? "/contato" : null;
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (publicPath) {
      const url = new URL(publicPath, window.location.origin).href;
      const canonicalLink = canonical ?? document.head.appendChild(document.createElement("link"));
      canonicalLink.rel = "canonical";
      canonicalLink.href = url;
      setMeta("property", "og:url", url);
    } else {
      canonical?.remove();
      ogUrl?.remove();
    }
  }, [route]);

  useEffect(() => {
    const handlePopState = () => setRoute(resolveRouteFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const session = data.session;
      if (!session) {
        setUserRole(null);
        setAccessDenied(false);
        setRoute(window.location.pathname.startsWith("/app") ? "landing" : resolveRouteFromPath());
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      console.log("Role:", profile?.role);
      const role = normalizeAppRole(profile?.role);
      setUserRole(role);

      if (!profile || !role) {
        setAccessDenied(true);
        setRoute("landing");
        window.history.pushState({}, "", "/");
        return;
      }

      if (role === "admin") {
        setAccessDenied(false);
        setRoute("admin");
        window.history.pushState({}, "", "/app/admin");
        return;
      }

      if (role === "user") {
        setAccessDenied(false);
        setRoute("user");
        window.history.pushState({}, "", "/app/user");
        return;
      }

      setAccessDenied(true);
      setRoute("landing");
      window.history.pushState({}, "", "/");
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setUserRole(null);
        setAccessDenied(false);
        setRoute(window.location.pathname.startsWith("/app") ? "landing" : resolveRouteFromPath());
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      console.log("Role:", profile?.role);
      const role = normalizeAppRole(profile?.role);
      setUserRole(role);

      if (!profile || !role) {
        setAccessDenied(true);
        setRoute("landing");
        window.history.pushState({}, "", "/");
        return;
      }

      if (role === "admin") {
        setAccessDenied(false);
        setRoute("admin");
        window.history.pushState({}, "", "/app/admin");
        return;
      }

      if (role === "user") {
        setAccessDenied(false);
        setRoute("user");
        window.history.pushState({}, "", "/app/user");
        return;
      }

      setAccessDenied(true);
      setRoute("landing");
      window.history.pushState({}, "", "/");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadPlatformData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const restId = profile?.restaurant_id ?? null;
      setRestaurantId(restId);
      setRestaurantName("");
      setRestaurantSlug("");

      if (profile?.full_name) {
        setAdminName(profile.full_name);
      }

      if (restId) {
        const [{ data: restaurant }, { data: settings }] = await Promise.all([
          supabase.from("restaurants").select("name,slug").eq("id", restId).maybeSingle(),
          getRestaurantSettings(restId),
        ]);

        const loadedSettings: RestaurantSettings = {
          restaurant_name: settings?.restaurant_name || restaurant?.name || "",
          unit_name: settings?.unit_name || "",
          admin_name: settings?.admin_name || profile?.full_name || "Administrador",
          address: settings?.address || "",
          default_table_count: Number(settings?.default_table_count) || 12,
          enable_sound_alerts: settings?.enable_sound_alerts ?? true,
          highlight_after_minutes: settings?.highlight_after_minutes ?? 5,
          cover_image_url: settings?.cover_image_url || "",
          logo_url: settings?.logo_url || "",
          primary_color: settings?.primary_color || "#0a0a0a",
          social_instagram_enabled: settings?.social_instagram_enabled ?? false,
          social_instagram_url: settings?.social_instagram_url || "",
          social_tiktok_enabled: settings?.social_tiktok_enabled ?? false,
          social_tiktok_url: settings?.social_tiktok_url || "",
          social_facebook_enabled: settings?.social_facebook_enabled ?? false,
          social_facebook_url: settings?.social_facebook_url || "",
          social_google_enabled: settings?.social_google_enabled ?? false,
          social_google_url: settings?.social_google_url || "",
        };
        setRestaurantSettings(loadedSettings);
        setRestaurantName(restaurant?.name || loadedSettings.restaurant_name);
        setRestaurantSlug(restaurant?.slug || "");

        if (settings) {
          setAdminName(settings.admin_name || profile?.full_name || "Administrador");
        }

      } else {
        setRestaurantSlug("");
        setRestaurantSettings({ ...defaultRestaurantSettings, admin_name: profile?.full_name || "Administrador" });
      }
    };

    if (window.location.pathname.startsWith("/app")) {
      loadPlatformData();
    }
  }, [window.location.pathname]);
  const customerParams = new URLSearchParams(window.location.search);
  const tableFromUrl = Number(customerParams.get("mesa"));
  const restaurantSlugFromUrl = customerParams.get("restaurante")?.trim() || "";
  const hasValidCustomerLink = customerParams.has("mesa")
    && customerParams.has("restaurante")
    && Number.isInteger(tableFromUrl)
    && tableFromUrl >= 1
    && tableFromUrl <= 200
    && Boolean(restaurantSlugFromUrl);
  const [customer, setCustomer] = useState(hasValidCustomerLink);
  const [wall, setWall] = useState(false);
  const [adminName, setAdminName] = useState(() => localStorage.getItem("tapserve-admin-name") || "Administrador");
  const [calls, setCalls] = useState<Call[]>([]);
  const [callsError, setCallsError] = useState("");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsError, setRatingsError] = useState("");
  const [time, setTime] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportAreaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update(); const timer = window.setInterval(update, 30_000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!restaurantId) {
      setCalls([]);
      setCallsError("");
      return;
    }

    let active = true;
    let loading = false;
    const refreshCalls = async () => {
      if (loading) return;
      loading = true;
      try {
        const { data, error } = await listRestaurantCalls(restaurantId);
        if (!active) return;
        if (error) {
          setCallsError(`Não foi possível atualizar os chamados: ${error.message}`);
          return;
        }

        setCallsError("");
        setCalls(data.map((call) => ({
          id: String(call.id),
          table: call.table_number ? `Mesa ${String(call.table_number).padStart(2, "0")}` : "Mesa 00",
          detail: call.detail || "Chamado",
          time: "agora",
          urgent: call.priority === "urgent",
          createdAt: new Date(call.created_at).getTime(),
        })));
      } catch (error) {
        if (active) {
          setCallsError(`Não foi possível atualizar os chamados: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        }
      } finally {
        loading = false;
      }
    };

    const channel = supabase
      .channel(`restaurant-calls-${restaurantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "calls",
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => void refreshCalls())
      .subscribe();
    const poll = window.setInterval(() => void refreshCalls(), 5000);
    void refreshCalls();

    return () => {
      active = false;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);
  useEffect(() => {
    if (!restaurantId) {
      setRatings([]);
      setRatingsError("");
      return;
    }

    let active = true;
    let loading = false;
    const refreshRatings = async () => {
      if (loading) return;
      loading = true;
      try {
        const { data, error } = await listRestaurantRatings(restaurantId);
        if (!active) return;
        if (error) {
          setRatingsError(`Não foi possível atualizar as avaliações: ${error.message}`);
          return;
        }

        setRatingsError("");
        setRatings(data.map((rating) => ({
          id: String(rating.id),
          table: Number(rating.table_number ?? 0),
          score: Number(rating.score ?? 0),
          comment: rating.comment || "",
          createdAt: new Date(rating.created_at).getTime(),
        })));
      } catch (error) {
        if (active) {
          setRatingsError(`Não foi possível atualizar as avaliações: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        }
      } finally {
        loading = false;
      }
    };

    const channel = supabase
      .channel(`restaurant-ratings-${restaurantId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ratings",
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => void refreshRatings())
      .subscribe();
    const poll = window.setInterval(() => void refreshRatings(), 10000);
    void refreshRatings();

    return () => {
      active = false;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);
  useEffect(() => {
    if (!supportOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !supportAreaRef.current?.contains(event.target)) setSupportOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSupportOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [supportOpen]);
  const nav = useMemo(() => {
    const base = [
      ["Visão geral", "grid"],
      ["Central de chamados", "bell"],
      ["Mesas e acessos", "tables"],
      ["Histórico", "history"],
      ["Cardápio", "menu"],
      ["Avaliações", "star"],
    ] as [string, IconName][];

    base.push(["Configurações", "settings"]);

    return base;
  }, []);

  const createCall = async (detail: string) => {
    if (!restaurantSlugFromUrl || !Number.isInteger(tableFromUrl) || tableFromUrl < 1 || tableFromUrl > 200) {
      throw new Error("O link desta mesa está incompleto. Peça ao restaurante um QR Code atualizado.");
    }
    const { data, error } = await supabase.rpc("create_customer_call", {
      p_restaurant_slug: restaurantSlugFromUrl,
      p_table_number: tableFromUrl,
      p_detail: detail,
    });

    if (error) throw error;
    if (!data) throw new Error("O chamado não foi gravado. Tente novamente.");
    const realCall = {
      id: String(data),
      table: `Mesa ${String(tableFromUrl).padStart(2, "0")}`,
      detail,
      time: "agora",
      urgent: false,
      createdAt: Date.now(),
    };
    setCalls((current) => [realCall, ...current]);
  };

  const resolveCall = async (callId: string) => {
    if (!restaurantId) throw new Error("Não foi possível identificar o restaurante para atualizar o chamado.");
    const { error } = await resolveRestaurantCall(callId);
    if (error) throw error;
    setCalls((current) => current.filter((call) => call.id !== callId));
  };

  const createRating = async (score: number, comment: string) => {
    if (!restaurantSlugFromUrl || !Number.isInteger(tableFromUrl) || tableFromUrl < 1 || tableFromUrl > 200) {
      throw new Error("O link desta mesa está incompleto. Peça ao restaurante um QR Code atualizado.");
    }

    const { data, error } = await supabase.rpc("create_customer_rating", {
      p_restaurant_slug: restaurantSlugFromUrl,
      p_table_number: tableFromUrl,
      p_score: score,
      p_comment: comment.trim() || null,
    });
    if (error) throw error;
    if (!data) throw new Error("A avaliação não foi gravada. Tente novamente.");
    setRatings((current) => [{
      id: String(data),
      table: tableFromUrl,
      score,
      comment,
      createdAt: Date.now(),
    }, ...current]);
  };

  const updateAdminName = async (name: string) => {
    setAdminName(name);
    localStorage.setItem("tapserve-admin-name", name);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (userId) {
      await updateProfileName(userId, name);
    }
  };
  const saveRestaurantSettings = async (settings: RestaurantSettings) => {
    if (!restaurantId) throw new Error("Este usuário ainda não está associado a um restaurante.");

    const values: RestaurantSettings = {
      ...settings,
      restaurant_name: settings.restaurant_name.trim(),
      admin_name: settings.admin_name.trim() || "Administrador",
      default_table_count: Math.min(200, Math.max(1, Math.floor(settings.default_table_count) || 1)),
      cover_image_url: settings.cover_image_url.trim(),
      logo_url: settings.logo_url.trim(),
      primary_color: settings.primary_color.trim(),
      social_instagram_url: settings.social_instagram_url.trim(),
      social_tiktok_url: settings.social_tiktok_url.trim(),
      social_facebook_url: settings.social_facebook_url.trim(),
      social_google_url: settings.social_google_url.trim(),
    };
    if (!/^#[\da-f]{6}$/i.test(values.primary_color)) {
      throw new Error("Informe a cor primária no formato hexadecimal, por exemplo #0a0a0a.");
    }
    for (const platform of socialPlatforms) {
      if (values[platform.enabledField] && !isSocialProfileUrl(platform.id, values[platform.urlField])) {
        throw new Error(`Informe um link HTTPS válido de ${platform.name} ou desative esse botão.`);
      }
    }
    const { error: restaurantError } = await supabase
      .from("restaurants")
      .update({ name: values.restaurant_name })
      .eq("id", restaurantId);
    if (restaurantError) throw restaurantError;

    const { error: settingsError } = await supabase
      .from("restaurant_settings")
      .upsert({ restaurant_id: restaurantId, ...values }, { onConflict: "restaurant_id" });
    if (settingsError) throw settingsError;

    setRestaurantName(values.restaurant_name);
    setRestaurantSettings(values);
    await updateAdminName(values.admin_name);
  };
  const handleSignOut = async () => {
    await signOut();
    setUserRole(null);
    setAccessDenied(false);
    setWall(false);
    setCustomer(false);
    setActive("Visão geral");
    navigateRoute("landing");
    window.scrollTo(0, 0);
  };

  if (customer) return <CustomerView table={tableFromUrl} restaurantSlug={restaurantSlugFromUrl} onCall={createCall} onRating={createRating} />;
  if (accessDenied) return <div className="login-shell"><div className="login-card"><div className="login-header"><p className="eyebrow">Acesso restrito</p><h1>Perfil sem permissão válida</h1></div><p className="login-note">Esta conta está autenticada, mas o perfil não tem uma permissão válida. Verifique a configuração de acesso da conta antes de entrar.</p><button className="primary-button" onClick={handleSignOut}>Voltar para o início</button></div></div>;
  if (route === "landing") return <LandingPage enterApp={() => navigateRoute("login")} openContact={() => navigateRoute("contact")} />;
  if (route === "contact") return <ContactPage onBack={() => navigateRoute("landing")} enterApp={() => navigateRoute("login")} />;
  if (route === "login") return <LoginPage onLogin={(role) => { setUserRole(role); navigateRoute(role === "admin" ? "admin" : "user"); window.scrollTo(0, 0); }} onBack={() => navigateRoute("landing")} />;
  if (wall) return <CallWall calls={calls} callsError={callsError} onResolveCall={resolveCall} onExit={() => setWall(false)} />;

  if (route === "admin" || userRole === "admin") {
    return <div className="app-shell">
      <aside>
        <div className="brand"><Logo /><span>PLATAFORMA</span></div>
        <nav>
          <button className={adminSection === "overview" ? "active" : ""} onClick={() => setAdminSection("overview")}><Icon name="grid" />Resumo</button>
          <button className={adminSection === "users" ? "active" : ""} onClick={() => setAdminSection("users")}><Icon name="users" />Usuários</button>
          <button className={adminSection === "restaurants" ? "active" : ""} onClick={() => setAdminSection("restaurants")}><Icon name="tables" />Restaurantes</button>
          <button className={adminSection === "ratings" ? "active" : ""} onClick={() => setAdminSection("ratings")}><Icon name="star" />Avaliações</button>
          <button className={adminSection === "settings" ? "active" : ""} onClick={() => setAdminSection("settings")}><Icon name="settings" />Configurações</button>
        </nav>
        <div className="sidebar-bottom"><div className="support"><span>?</span><div><strong>Suporte</strong><small>Central de ajuda</small></div></div><div className="powered">POWERED BY <b>TapServe</b></div></div>
      </aside>
      <div className="main-wrap">
        <header className="topbar"><div className="mobile-logo"><Logo /></div><div className="restaurant"><span className="restaurant-logo">TP</span><div><strong>TapServe</strong><small>Administração global</small></div><Icon name="chevron" size={15} /></div><div className="top-actions"><span className="live"><i /> Sistema online</span><strong>{time}</strong><span className="avatar">{adminName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="user"><strong>{adminName}</strong><small>Administrador</small></div><button className="secondary" onClick={handleSignOut}>Sair</button></div></header>
        <main><AdminPanel adminName={adminName} section={adminSection} onSectionChange={setAdminSection} /></main>
      </div>
    </div>;
  }

  return <div className="app-shell">
    <aside>
      <div className="brand"><Logo /><span>RESTAURANTE</span></div>
      <nav>{nav.map(([label, icon]) => <button className={active === label ? "active" : ""} onClick={() => label === "Central de chamados" ? setWall(true) : setActive(label)} key={label}><Icon name={icon} />{label}{(label === "Visão geral" || label === "Central de chamados") && calls.length > 0 && <i>{calls.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom" ref={supportAreaRef}>
        {supportOpen && <div className="support-popover" id="support-contact-popover" role="dialog" aria-label="Opções de contato do suporte">
          <div className="support-popover-head"><div><small>SUPORTE</small><strong>Como podemos ajudar?</strong></div><button aria-label="Fechar opções de contato" onClick={() => setSupportOpen(false)}><Icon name="close" size={16} /></button></div>
          <a className="support-contact-option" href={`mailto:${CONTACT_EMAIL}`}><span className="email"><Icon name="mail" size={17} /></span><div><small>EMAIL</small><strong>{CONTACT_EMAIL}</strong></div><Icon name="chevron" size={16} /></a>
          <a className="support-contact-option" href={CONTACT_WHATSAPP_LINK} target="_blank" rel="noreferrer"><span className="whatsapp"><Icon name="phone" size={17} /></span><div><small>WHATSAPP</small><strong>+244 946 970 233</strong></div><Icon name="chevron" size={16} /></a>
        </div>}
        <button className="support support-action" aria-expanded={supportOpen} aria-controls="support-contact-popover" onClick={() => setSupportOpen((open) => !open)}><span>?</span><div><strong>Precisa de ajuda?</strong><small>Fale com o suporte</small></div></button>
        <div className="powered">POWERED BY <b>TapServe</b></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar"><div className="mobile-logo"><Logo /></div><div className="restaurant"><span className="restaurant-logo">RT</span><div><strong>{restaurantName || "Restaurante"}</strong><small>Perfil ativo</small></div><Icon name="chevron" size={15} /></div><div className="top-actions"><span className="live"><i /> Sistema online</span><strong>{time}</strong><div className="notification-wrap"><button className="notification" aria-label={`${calls.length} notificações pendentes`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Icon name="bell" />{calls.length > 0 && <i>{calls.length}</i>}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-head"><div><strong>Notificações</strong><small>{calls.length ? `${calls.length} chamados aguardando` : "Tudo em dia"}</small></div><button aria-label="Fechar notificações" onClick={() => setNotificationsOpen(false)}><Icon name="close" size={15} /></button></div>{calls.length ? <div className="notification-list">{calls.slice(0, 4).map((call) => <button key={call.id} onClick={() => { setActive("Visão geral"); setNotificationsOpen(false); }}><span className={call.urgent ? "urgent" : ""}><Icon name={call.detail.includes("conta") ? "receipt" : "bell"} size={15} /></span><span><strong>{call.table}</strong><small>{call.detail} · {call.time}</small></span></button>)}</div> : <div className="notification-empty"><Icon name="check" size={18} />Nenhum chamado pendente</div>}<button className="notification-all" onClick={() => { setActive("Visão geral"); setNotificationsOpen(false); }}>Ver fila completa</button></div>}</div><span className="avatar">{adminName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="user"><strong>{adminName}</strong><small>Administrador</small></div><button className="secondary" onClick={handleSignOut}>Sair</button></div></header>
      <main>{active === "Visão geral" ? <Dashboard calls={calls} callsError={callsError} ratings={ratings} ratingsError={ratingsError} adminName={adminName} openWall={() => setWall(true)} onResolveCall={resolveCall} /> : active === "Mesas e acessos" ? <TableAccess tableCount={restaurantSettings.default_table_count} restaurantName={restaurantName} restaurantSlug={restaurantSlug} /> : <ManagementPage page={active} ratings={ratings} settings={restaurantSettings} restaurantId={restaurantId} onSaveSettings={saveRestaurantSettings} />}</main>
    </div>
  </div>;
}
