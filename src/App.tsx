import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getRestaurantSettings, insertCall, insertRating, listRestaurantCalls, listRestaurantRatings, signInWithEmail, signOut, supabase, updateProfileName } from "./lib/supabase";
import logoOnDark from "./imports/logo_fundo_preto.svg";
import logoOnLight from "./imports/logo_fundo_branco.svg";

type Call = { id: number; table: string; detail: string; time: string; urgent: boolean; createdAt: number };
type Rating = { id: number; table: number; score: number; comment: string; createdAt: number };

const menuDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("tapserve-content", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("files");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function saveMenuPdf(file: File) {
  const db = await menuDb();
  const transaction = db.transaction("files", "readwrite");
  transaction.objectStore("files").put({ name: file.name, blob: file }, "menu-pdf");
}
async function loadMenuPdf(): Promise<{ name: string; blob: Blob } | null> {
  const db = await menuDb();
  return new Promise((resolve) => {
    const request = db.transaction("files").objectStore("files").get("menu-pdf");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}
async function removeMenuPdf() {
  const db = await menuDb();
  db.transaction("files", "readwrite").objectStore("files").delete("menu-pdf");
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
  | "utensils";

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
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return <div className={`logo${compact ? " compact" : ""}`}><img src={dark ? logoOnDark : logoOnLight} alt="TapServe" /></div>;
}

const pdfViewerUrl = (url: string) => `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
const CONTACT_EMAIL = "suportetapserver@gmail.com";
const CONTACT_WHATSAPP_NUMBER = "244946970233";
const CONTACT_WHATSAPP_LINK = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre o TapServe.")}`;

type AdminSection = "overview" | "restaurants" | "users" | "ratings" | "settings";
type PlatformRestaurant = { id: string; name: string; slug: string; email: string | null; phone: string | null; status: string; created_at: string };
type PlatformUser = { id: string; email: string; full_name: string; restaurant_id: string | null; created_at: string };
type PlatformSettings = { id: boolean; platform_name: string; country: string; currency: string; support_whatsapp: string; automatic_alerts: boolean };
type PlatformActivity = { id: string; action: string; entity_type: string; metadata: Record<string, unknown> | null; created_at: string };
type RestaurantSettings = { restaurant_name: string; unit_name: string; admin_name: string; address: string; default_table_count: number; enable_sound_alerts: boolean; highlight_after_minutes: number };

const defaultRestaurantSettings: RestaurantSettings = {
  restaurant_name: "",
  unit_name: "",
  admin_name: "Administrador",
  address: "",
  default_table_count: 12,
  enable_sound_alerts: true,
  highlight_after_minutes: 5,
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

function Dashboard({ calls, setCalls, ratings, adminName, openWall }: { calls: Call[]; setCalls: React.Dispatch<React.SetStateAction<Call[]>>; ratings: Rating[]; adminName: string; openWall: () => void }) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");
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
        <div className="calls">
          {visible.map((call) => <article className={`call-card ${call.urgent ? "urgent" : ""}`} key={call.id}>
            <div className="call-top"><span className="table-icon"><Icon name={call.detail.includes("conta") ? "receipt" : "bell"} size={19} /></span><div><h3>{call.table}</h3><p>{call.detail}</p></div><span className={`time ${call.urgent ? "late" : ""}`}><Icon name="clock" size={13} />{call.time}</span></div>
            <div className="call-actions"><button className="confirm" onClick={() => setCalls(calls.filter((item) => item.id !== call.id))}><Icon name="check" size={16} />Confirmar</button><button className="details" onClick={() => setSelectedTable(Number(call.table.split(" ")[1]))}>Detalhes <Icon name="chevron" size={15} /></button></div>
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

const menuPhotos = [
  "https://images.unsplash.com/photo-1643995531157-93c50012e7f9?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1588947619819-f23cc2dfbd54?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1709114107937-6dec855d9ab5?auto=format&fit=crop&w=500&q=80",
];

function CustomerView({ onExit, table = 5, onCall, onRating }: { onExit: () => void; table?: number; onCall: (detail: string) => void; onRating: (score: number, comment: string) => void }) {
  const [screen, setScreen] = useState<"home" | "menu" | "success" | "bill" | "rating">("home");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [menuPdf, setMenuPdf] = useState<string | null>(null);
  useEffect(() => {
    let url = "";
    loadMenuPdf().then((file) => { if (file) { url = URL.createObjectURL(file.blob); setMenuPdf(url); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);
  return <div className="customer-shell">
    <div className="customer-toolbar"><Logo /><button onClick={onExit}>Voltar ao dashboard</button></div>
    <main className="phone">
      <header><Logo compact /><span>Restaurante</span><button aria-label="Ajuda">?</button></header>
      {screen !== "home" && <button className="back" onClick={() => setScreen("home")}>‹ <span>Voltar</span></button>}
      {screen === "home" && <div className="customer-home">
        <p className="eyebrow">BEM-VINDO</p><h1>Mesa {String(table).padStart(2, "0")}</h1><p>Como podemos ajudar?</p>
        <div className="action-grid">
          <button className="main-action" onClick={() => { onCall("Chamou o garçom"); setScreen("success"); }}><span><Icon name="bell" size={25} /></span><strong>Chamar garçom</strong><small>Solicite atendimento</small></button>
          <button onClick={() => setScreen("menu")}><span><Icon name="utensils" size={25} /></span><strong>Ver cardápio</strong><small>Explore nossos pratos</small></button>
          <button onClick={() => setScreen("bill")}><span><Icon name="receipt" size={25} /></span><strong>Pedir a conta</strong><small>Confira seu consumo</small></button>
          <button onClick={() => setScreen("rating")}><span><Icon name="star" size={25} /></span><strong>Avaliar</strong><small>Conte sua experiência</small></button>
        </div>
        <div className="customer-help"><Icon name="bell" size={16} /> Atendimento rápido, sem precisar esperar</div>
      </div>}
      {screen === "success" && <div className="success-screen"><span><Icon name="check" size={40} /></span><p className="eyebrow">SOLICITAÇÃO ENVIADA</p><h1>Chamado realizado!</h1><p>Seu garçom foi avisado e chegará em instantes.</p><small><Icon name="clock" size={14} /> Enviado agora</small><button onClick={() => setScreen("home")}>Voltar ao início</button></div>}
      {screen === "menu" && <div className="customer-page"><p className="eyebrow">CARDÁPIO</p><h1>Cardápio</h1><p>Seu cardápio será exibido quando houver dados reais do restaurante.</p>{menuPdf ? <div className="customer-pdf"><div className="customer-pdf-head"><span>Cardápio completo</span><small>Deslize para navegar</small></div><iframe src={pdfViewerUrl(menuPdf)} title="Cardápio do restaurante" loading="lazy" /><a href={menuPdf} target="_blank" rel="noreferrer">Abrir em tela cheia</a></div> : <div className="menu-list"><article><div><h3>Sem itens</h3><p>Adicione o cardápio real em seguida.</p><strong>—</strong></div></article></div>}</div>}
      {screen === "bill" && <div className="customer-page bill-request"><span className="bill-illustration"><Icon name="receipt" size={34} /></span><p className="eyebrow">MESA {String(table).padStart(2, "0")}</p><h1>Deseja pedir a conta?</h1><p>O garçom será avisado e levará a conta até a sua mesa. Nenhum valor será exibido por aqui.</p><div className="bill-notice"><Icon name="bell" size={18} /><span><strong>Aviso rápido</strong>Você não precisa chamar o garçom novamente.</span></div><button className="customer-primary" onClick={() => { onCall("Solicitou a conta"); setScreen("success"); }}>Sim, pedir a conta</button><button className="customer-ghost" onClick={() => setScreen("home")}>Agora não</button></div>}
      {screen === "rating" && <div className="customer-page rating"><p className="eyebrow">SUA OPINIÃO IMPORTA</p><h1>Como foi?</h1><p>Conte para nós como foi sua experiência.</p><div className="stars">{[1,2,3,4,5].map((n) => <button aria-label={`${n} estrelas`} className={n <= rating ? "active" : ""} onClick={() => setRating(n)} key={n}><Icon name="star" size={30} /></button>)}</div><p className="rating-hint">{rating ? `${rating} de 5 estrelas` : "Toque para avaliar"}</p><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Deixe um comentário (opcional)" /><button className="customer-primary" disabled={!rating} onClick={() => { onRating(rating, comment); setScreen("success"); }}>Enviar avaliação</button></div>}
    </main>
  </div>;
}

function CallWall({ calls, setCalls, onExit }: { calls: Call[]; setCalls: React.Dispatch<React.SetStateAction<Call[]>>; onExit: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = (createdAt: number) => {
    const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };
  const goFullscreen = () => document.documentElement.requestFullscreen?.();
  const sorted = [...calls].sort((a, b) => a.createdAt - b.createdAt);
  return <div className="call-wall">
    <header className="wall-header">
      <Logo dark />
      <div className="wall-title"><span><i /> AO VIVO</span><h1>Central de chamados</h1></div>
      <div className="wall-actions"><button onClick={goFullscreen}>Tela cheia</button><button onClick={onExit}>Sair</button></div>
    </header>
    <main className="wall-main">
      <div className="wall-summary"><div><strong>{calls.length}</strong><span>aguardando atendimento</span></div><p>Chamados mais antigos aparecem primeiro. Confirme assim que iniciar o atendimento.</p><time>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div>
      {sorted.length ? <div className="wall-grid">{sorted.map((call) => {
        const urgent = Date.now() - call.createdAt >= 300000;
        return <article key={call.id} className={urgent ? "wall-call urgent" : "wall-call"}>
          <div className="wall-call-head"><span><Icon name={call.detail.includes("conta") ? "receipt" : "bell"} size={30} /></span><div><p>{call.detail}</p><h2>{call.table}</h2></div><b>{urgent ? "URGENTE" : "NOVO"}</b></div>
          <div className="wall-timer"><Icon name="clock" size={22} /><span>Esperando há</span><strong>{elapsed(call.createdAt)}</strong></div>
          <button onClick={() => setCalls((current) => current.filter((item) => item.id !== call.id))}><Icon name="check" /> Assumir atendimento</button>
        </article>;
      })}</div> : <div className="wall-empty"><span><Icon name="check" size={45} /></span><h2>Nenhum chamado pendente</h2><p>O salão está em dia. Novos chamados aparecerão automaticamente.</p></div>}
    </main>
  </div>;
}

function TableAccess({ tableCount, restaurantName }: { tableCount: number; restaurantName: string }) {
  const [selected, setSelected] = useState(1);
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const effectiveTableCount = Math.min(200, Math.max(1, Math.floor(tableCount) || 12));
  const tableUrl = (table: number) => `${window.location.origin}${window.location.pathname}?mesa=${table}`;

  useEffect(() => {
    let active = true;
    Promise.all(Array.from({ length: effectiveTableCount }, async (_, index) => {
      const table = index + 1;
      const data = await QRCode.toDataURL(tableUrl(table), { width: 520, margin: 2, color: { dark: "#0f2437", light: "#ffffff" }, errorCorrectionLevel: "H" });
      return [table, data] as const;
    })).then((rows) => active && setQrCodes(Object.fromEntries(rows)));
    return () => { active = false; };
  }, [effectiveTableCount]);

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
        <div className="access-controls"><h2>Pronto para usar</h2><p>O QR Code direciona exclusivamente para a Mesa {String(selected).padStart(2, "0")}.</p><label>Link da mesa</label><div className="url-field"><input readOnly value={tableUrl(selected)} /><button onClick={() => { navigator.clipboard.writeText(tableUrl(selected)); setMessage("Link copiado."); }}>Copiar</button></div><div className="access-buttons"><button className="primary" onClick={download} disabled={!qrCodes[selected]}>Baixar PNG</button><button className="secondary" onClick={print} disabled={!qrCodes[selected]}>Imprimir</button></div><hr /><div className="nfc-box"><span><Icon name="phone" /></span><div><h3>Gravar etiqueta NFC</h3><p>Use um Android compatível para vincular a etiqueta a esta mesa.</p></div><button onClick={writeNfc}>Gravar NFC</button></div>{message && <div className="access-message">{message}</div>}</div>
      </section>
    </div>
  </div>;
}

function ManagementPage({ page, ratings, settings, onSaveSettings }: { page: string; ratings: Rating[]; settings: RestaurantSettings; onSaveSettings: (settings: RestaurantSettings) => Promise<void> }) {
  const [saved, setSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [pdf, setPdf] = useState<{ name: string; url: string } | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(settings);
  const [items, setItems] = useState([
    { name: "Sem itens", price: "0,00", active: false, image: "" },
  ]);
  useEffect(() => {
    let url = "";
    loadMenuPdf().then((file) => {
      if (file) { url = URL.createObjectURL(file.blob); setPdf({ name: file.name, url }); }
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);
  useEffect(() => setSettingsDraft(settings), [settings]);
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
  if (page === "Cardápio") return <section className="management"><div className="welcome"><div><p className="eyebrow">CARDÁPIO DIGITAL</p><h1>Gerenciar cardápio</h1><p>Importe um PDF pronto ou organize seus itens individualmente.</p></div><button className="primary" onClick={() => setItems([...items, { name: "Novo item", price: "0,00", active: false, image: "" }])}>Adicionar item</button></div>
    <div className={pdf ? "pdf-import has-file panel" : "pdf-import panel"}>
      <div className="pdf-copy"><span><Icon name="menu" size={25} /></span><div><h2>Cardápio em PDF</h2><p>Envie um arquivo de até 20 MB. Ele ficará disponível para os clientes no celular.</p></div></div>
      {!pdf ? <label className="pdf-drop"><input type="file" accept="application/pdf,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size <= 20 * 1024 * 1024) { saveMenuPdf(file); setPdf({ name: file.name, url: URL.createObjectURL(file) }); } }} /><strong>Selecionar PDF</strong><small>ou arraste o arquivo até aqui</small></label> : <div className="pdf-ready"><div><span>PDF</span><p><strong>{pdf.name}</strong><small>Publicado para os clientes</small></p></div><div><a href={pdf.url} target="_blank" rel="noreferrer">Visualizar</a><label>Substituir<input type="file" accept="application/pdf,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size <= 20 * 1024 * 1024) { saveMenuPdf(file); URL.revokeObjectURL(pdf.url); setPdf({ name: file.name, url: URL.createObjectURL(file) }); } }} /></label><button onClick={() => { removeMenuPdf(); URL.revokeObjectURL(pdf.url); setPdf(null); }}>Remover</button></div></div>}
    </div>
    {pdf && <div className="pdf-preview panel"><div className="pdf-preview-head"><div><p className="eyebrow">DOCUMENTO PUBLICADO</p><h3>Pré-visualização do cardápio</h3><small>{pdf.name}</small></div><div><span>Visível para clientes</span><a href={pdf.url} target="_blank" rel="noreferrer">Abrir em tela cheia</a></div></div><div className="pdf-canvas"><iframe src={pdfViewerUrl(pdf.url)} title="Pré-visualização do cardápio em PDF" loading="lazy" /></div></div>}
    <div className="menu-section-title"><div><h2>Itens cadastrados</h2><p>Use esta lista quando não houver PDF ou para destacar pratos.</p></div></div><div className="panel menu-manager">{items.map((item, index) => <div className="menu-edit" key={index}><label className="dish-image">{item.image ? <img src={item.image} alt={`Imagem de ${item.name}`} /> : <span><Icon name="menu" size={17} />Adicionar foto</span>}<i>Trocar</i><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) setItems(items.map((current, i) => i === index ? { ...current, image: URL.createObjectURL(file) } : current)); }} /></label><input value={item.name} onChange={(e) => setItems(items.map((current, i) => i === index ? { ...current, name: e.target.value } : current))} /><label>Kz <input value={item.price} onChange={(e) => setItems(items.map((current, i) => i === index ? { ...current, price: e.target.value } : current))} /></label><button className={item.active ? "toggle active" : "toggle"} onClick={() => setItems(items.map((current, i) => i === index ? { ...current, active: !current.active } : current))}><i />{item.active ? "Ativo" : "Pausado"}</button><button className="remove" aria-label="Remover" onClick={() => setItems(items.filter((_, i) => i !== index))}><Icon name="close" size={17} /></button></div>)}</div></section>;
  return <section className="management"><div className="welcome"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Configurações</h1><p>Personalize a operação da sua unidade.</p></div></div><form className="panel settings-form" onSubmit={saveSettings}><h2>Informações do restaurante</h2><div className="form-grid">
    <label>Nome do restaurante<input required value={settingsDraft.restaurant_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, restaurant_name: event.target.value }); setSaved(false); }} placeholder="Nome do restaurante" /></label>
    <label>Unidade<input value={settingsDraft.unit_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, unit_name: event.target.value }); setSaved(false); }} placeholder="Unidade" /></label>
    <label>Nome do administrador<input value={settingsDraft.admin_name} onChange={(event) => { setSettingsDraft({ ...settingsDraft, admin_name: event.target.value }); setSaved(false); }} placeholder="Nome completo" /></label>
    <label>Endereço<input value={settingsDraft.address} onChange={(event) => { setSettingsDraft({ ...settingsDraft, address: event.target.value }); setSaved(false); }} placeholder="Endereço" /></label>
    <label>Número de mesas<input type="number" value={settingsDraft.default_table_count} min="1" max="200" onChange={(event) => { setSettingsDraft({ ...settingsDraft, default_table_count: Math.min(200, Math.max(1, Number(event.target.value) || 1)) }); setSaved(false); }} /></label>
  </div><h2>Preferências de atendimento</h2>
    <label className="check-setting"><input type="checkbox" checked={settingsDraft.enable_sound_alerts} onChange={(event) => { setSettingsDraft({ ...settingsDraft, enable_sound_alerts: event.target.checked }); setSaved(false); }} /><span>Reproduzir som ao receber um novo chamado<small>Recomendado para a central exibida na TV.</small></span></label>
    <label className="check-setting"><input type="checkbox" checked={settingsDraft.highlight_after_minutes > 0} onChange={(event) => { setSettingsDraft({ ...settingsDraft, highlight_after_minutes: event.target.checked ? 5 : 0 }); setSaved(false); }} /><span>Destacar chamados após 5 minutos<small>O cartão muda para urgente automaticamente.</small></span></label>
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
      const message = err instanceof Error ? err.message : "Não foi possível entrar.";
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

      if (profile?.full_name) {
        setAdminName(profile.full_name);
      }

      if (restId) {
        const [{ data: restaurant }, { data: settings }, { data: callsData }, { data: ratingsData }] = await Promise.all([
          supabase.from("restaurants").select("name").eq("id", restId).maybeSingle(),
          getRestaurantSettings(restId),
          listRestaurantCalls(restId),
          listRestaurantRatings(restId),
        ]);

        const loadedSettings: RestaurantSettings = {
          restaurant_name: settings?.restaurant_name || restaurant?.name || "",
          unit_name: settings?.unit_name || "",
          admin_name: settings?.admin_name || profile?.full_name || "Administrador",
          address: settings?.address || "",
          default_table_count: Number(settings?.default_table_count) || 12,
          enable_sound_alerts: settings?.enable_sound_alerts ?? true,
          highlight_after_minutes: settings?.highlight_after_minutes ?? 5,
        };
        setRestaurantSettings(loadedSettings);
        setRestaurantName(restaurant?.name || loadedSettings.restaurant_name);

        if (settings) {
          setAdminName(settings.admin_name || profile?.full_name || "Administrador");
        }

        if (callsData) {
          setCalls(callsData.map((call) => ({
            id: Number(call.id) || Date.now(),
            table: call.table_number ? `Mesa ${String(call.table_number).padStart(2, "0")}` : "Mesa 00",
            detail: call.detail || "Chamado",
            time: call.created_at ? "agora" : "agora",
            urgent: call.priority === "urgent",
            createdAt: new Date(call.created_at).getTime(),
          })));
        }

        if (ratingsData) {
          setRatings(ratingsData.map((rating) => ({
            id: Number(rating.id) || Date.now(),
            table: Number(rating.table_number ?? 0),
            score: Number(rating.score ?? 0),
            comment: rating.comment || "",
            createdAt: new Date(rating.created_at).getTime(),
          })));
        }
      } else {
        setRestaurantSettings({ ...defaultRestaurantSettings, admin_name: profile?.full_name || "Administrador" });
      }
    };

    if (window.location.pathname.startsWith("/app")) {
      loadPlatformData();
    }
  }, [window.location.pathname]);
  const tableFromUrl = Number(new URLSearchParams(window.location.search).get("mesa")) || 5;
  const [customer, setCustomer] = useState(new URLSearchParams(window.location.search).has("mesa"));
  const [wall, setWall] = useState(false);
  const [adminName, setAdminName] = useState(() => localStorage.getItem("tapserve-admin-name") || "Administrador");
  const [calls, setCalls] = useState<Call[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [time, setTime] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportAreaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update(); const timer = window.setInterval(update, 30_000); return () => clearInterval(timer);
  }, []);
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
    const fallback = { id: Date.now(), table: `Mesa ${String(tableFromUrl).padStart(2, "0")}`, detail, time: "agora", urgent: false, createdAt: Date.now() };

    if (restaurantId) {
      const { data, error } = await insertCall({
        restaurantId,
        tableNumber: tableFromUrl,
        detail,
        priority: "normal",
      });

      if (!error && data) {
        const realCall = {
          id: Number(data.id) || Date.now(),
          table: `Mesa ${String(data.table_number ?? tableFromUrl).padStart(2, "0")}`,
          detail: data.detail,
          time: "agora",
          urgent: data.priority === "urgent",
          createdAt: new Date(data.created_at).getTime(),
        };
        setCalls((current) => [realCall, ...current]);
        return;
      }
    }

    setCalls((current) => [fallback, ...current]);
  };

  const createRating = async (score: number, comment: string) => {
    const fallback = { id: Date.now(), table: tableFromUrl, score, comment, createdAt: Date.now() };

    if (restaurantId) {
      const { data, error } = await insertRating({
        restaurantId,
        tableNumber: tableFromUrl,
        score,
        comment,
      });

      if (!error && data) {
        const realRating = {
          id: Number(data.id) || Date.now(),
          table: Number(data.table_number ?? tableFromUrl),
          score: Number(data.score ?? score),
          comment: data.comment || comment,
          createdAt: new Date(data.created_at).getTime(),
        };
        setRatings((current) => [realRating, ...current]);
        return;
      }
    }

    setRatings((current) => [fallback, ...current]);
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
    };
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

  if (customer) return <CustomerView table={tableFromUrl} onCall={createCall} onRating={createRating} onExit={() => { setCustomer(false); window.history.replaceState({}, "", window.location.pathname); }} />;
  if (accessDenied) return <div className="login-shell"><div className="login-card"><div className="login-header"><p className="eyebrow">Acesso restrito</p><h1>Perfil sem permissão válida</h1></div><p className="login-note">Esta conta está autenticada, mas o perfil não tem uma permissão válida. Verifique a configuração de acesso da conta antes de entrar.</p><button className="primary-button" onClick={handleSignOut}>Voltar para o início</button></div></div>;
  if (route === "landing") return <LandingPage enterApp={() => navigateRoute("login")} openContact={() => navigateRoute("contact")} />;
  if (route === "contact") return <ContactPage onBack={() => navigateRoute("landing")} enterApp={() => navigateRoute("login")} />;
  if (route === "login") return <LoginPage onLogin={(role) => { setUserRole(role); navigateRoute(role === "admin" ? "admin" : "user"); window.scrollTo(0, 0); }} onBack={() => navigateRoute("landing")} />;
  if (wall) return <CallWall calls={calls} setCalls={setCalls} onExit={() => setWall(false)} />;

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
      <main>{active === "Visão geral" ? <Dashboard calls={calls} setCalls={setCalls} ratings={ratings} adminName={adminName} openWall={() => setWall(true)} /> : active === "Mesas e acessos" ? <TableAccess tableCount={restaurantSettings.default_table_count} restaurantName={restaurantName} /> : <ManagementPage page={active} ratings={ratings} settings={restaurantSettings} onSaveSettings={saveRestaurantSettings} />}</main>
    </div>
  </div>;
}
