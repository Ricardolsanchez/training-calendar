import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./AdminPanel.css";

type Lang = "en" | "es";

type Audience =
  | "sales"
  | "all_employees"
  | "new_hires"
  | "hr"
  | "it"
  | "legal"
  | "managers_leaders"   // ✅ nuevo
  | "records";

const AUDIENCES: { value: Audience; label_en: string; label_es: string }[] = [
  { value: "sales", label_en: "Sales", label_es: "Ventas" },
  { value: "all_employees", label_en: "All Employees", label_es: "Todos los empleados" },
  { value: "new_hires", label_en: "New Hires", label_es: "Nuevos ingresos" },
  { value: "hr", label_en: "HR", label_es: "RR. HH." },
  { value: "it", label_en: "IT", label_es: "TI" },
  { value: "legal", label_en: "Legal", label_es: "Legal" },
  { value: "managers_leaders", label_en: "Managers/Leaders", label_es: "Managers/Líderes" },
  { value: "records", label_en: "Records", label_es: "Records" },
];

const getAudienceLabel = (aud: Audience | null | undefined, lang: Lang) => {
  const found = AUDIENCES.find((a) => a.value === aud);
  if (!found) return lang === "en" ? "All Employees" : "Todos los empleados";
  return lang === "en" ? found.label_en : found.label_es;
};

const UNLIMITED_SEATS = 9999;

type AvailableClass = {
  id: number;
  title: string;
  trainer_id: number | null;

  // ✅ compat + multi
  trainer_name: string | null;     // backend legacy (single)
  trainer_names: string[];         // ✅ multi

  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  modality: "Online" | "Presencial";
  spots_left: number;
  description: string | null;
  workday_url?: string | null;
  group_code?: string | null;
  audience?: Audience | null;
};

type GroupedSession = {
  id: number;
  date_iso: string;
  time_range: string;
  spots_left: number;
};

type GroupedClass = {
  group_code: string;

  // ✅ draft support
  base_id: number;
  all_session_ids: number[];
  is_draft: boolean;

  title: string;

  // ✅ compat + multi (si backend aún manda solo trainer_name, igual funciona)
  trainer_name: string | null;
  trainer_names?: string[] | null;

  modality: "Online" | "Presencial";
  audience?: Audience | null;
  level?: string | null;
  description: string | null;
  sessions_count: number;
  sessions: GroupedSession[];
  workday_url?: string | null;

  start_date_iso?: string | null;
  end_date_iso?: string | null;
};

type Trainer = { id: number; name: string };

const TRAINERS: Trainer[] = [
  { id: 1, name: "Sergio Osorio" },
  { id: 2, name: "Monica Mendoza" },
  { id: 3, name: "Kelvin Hodgson" },
  { id: 4, name: "Edma Murillo" },
  { id: 5, name: "Dora Ramirez" },
  { id: 6, name: "Ada Perez" },
  { id: 7, name: "Josias Mendez" },
  { id: 8, name: "Ricardo Sanchez" },
  { id: 9, name: "Giselle Cárdenas" },
  { id: 10, name: "Alexandria Yorkman" },
];

const translations: Record<Lang, Record<string, string>> = {
  en: {
    adminBadge: "Admin Panel",
    adminTitle: "Training Management",
    adminSubtitle: "Manage available classes.",
    backToCalendar: "← Calendar",
    logout: "Log out",
    tabClasses: "Available Classes",

    addNewClass: "+ New Class",
    noClasses: "No Classes at this time.",

    columnTrainer: "Trainer",

    btnDeleteClass: "Delete",
    confirmDeleteClassGroup: "Delete this class group and all its sessions?",

    classesTitle: "Available Classes",
    sessionsCount: "Sessions",
    expand: "Expand",
    collapse: "Collapse",
    carouselPrev: "Previous",
    carouselNext: "Next",
    sessionsPanelTitle: "Sessions for",

    modalNewClass: "New class",
    modalEditClass: "Edit class",
    labelClassTitle: "Class title",
    labelTrainer: "Trainer",
    labelType: "Type",
    labelSeats: "Available Seats",
    labelDescription: "Short description",
    labelAudience: "Audience",
    optionSelectTrainer: "Select a Trainer",
    optionSelectAudience: "Select an audience",
    typeInPerson: "In Person",
    typeOnline: "Online",
    modalCancelDark: "Cancel",
    modalSaveDark: "Save",
    errorSaveClass: "Could not save class.",

    addSessionsTitle: "Sessions (edit dates & hours)",
    addSessionsHint:
      "Set the date and start/end time for each session. Increase/decrease the number of sessions and save.",
    sessionsCountLabel: "Number of sessions",
    sessionDateLabel: "Session date",
    noOfferingsScheduledYet: "No offerings scheduled yet",
    viewDetails: "View Workday link here",
    workdayLinkMissing: "Workday link missing",
    draftTag: "DRAFT",
    unlimited: "Unlimited",
    trainersHelp: "Hold Ctrl/Cmd to select multiple.",
  },
  es: {
    adminBadge: "Panel Admin",
    adminTitle: "Gestión de formaciones",
    adminSubtitle: "Administra clases disponibles.",
    backToCalendar: "← Calendario",
    logout: "Cerrar sesión",
    tabClasses: "Clases disponibles",

    addNewClass: "+ Nueva clase",
    noClasses: "No hay clases por el momento.",

    columnTrainer: "Trainer",

    btnDeleteClass: "Eliminar",
    confirmDeleteClassGroup: "¿Eliminar este grupo de clases y todas sus sesiones?",

    classesTitle: "Clases disponibles",
    sessionsCount: "Sesiones",
    expand: "Ver",
    collapse: "Ocultar",
    carouselPrev: "Anterior",
    carouselNext: "Siguiente",
    sessionsPanelTitle: "Sesiones de",
    noOfferingsScheduledYet: "Aún no hay sesiones programadas",

    modalNewClass: "Nueva clase",
    modalEditClass: "Editar clase",
    labelClassTitle: "Título de la clase",
    labelTrainer: "Trainer",
    labelType: "Modalidad",
    labelSeats: "Cupos",
    labelDescription: "Descripción breve",
    labelAudience: "Audiencia",
    optionSelectTrainer: "Selecciona un trainer",
    optionSelectAudience: "Selecciona una audiencia",
    typeInPerson: "Presencial",
    typeOnline: "Online",
    modalCancelDark: "Cancelar",
    modalSaveDark: "Guardar",
    errorSaveClass: "No se pudo guardar la clase.",

    addSessionsTitle: "Sesiones (editar fechas y horas)",
    addSessionsHint:
      "Define la fecha y hora inicio/fin por sesión. Sube/baja la cantidad de sesiones y guarda.",
    sessionsCountLabel: "Número de sesiones",
    sessionDateLabel: "Fecha de la sesión",

    viewDetails: "Ver detalles aquí",
    workdayLinkMissing: "Link de Workday pendiente",
    draftTag: "BORRADOR",
    unlimited: "Ilimitado",
    trainersHelp: "Mantén Ctrl/Cmd para seleccionar varios.",
  },
};

async function ensureCsrf() {
  await api.get("/sanctum/csrf-cookie");
}

type SessionDraft = {
  id?: number;
  date_iso: string;
  start_time: string;
  end_time: string;
};

const parseTimeRange = (tr: string) => {
  const [a, b] = (tr || "").split("-").map((x) => x.trim());
  return { start_time: a || "", end_time: b || "" };
};

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("en");
  const t = useCallback((key: string) => translations[lang][key] ?? key, [lang]);

  const [activeTab, setActiveTab] = useState<"classes">("classes");

  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [expandedGroupCode, setExpandedGroupCode] = useState<string | null>(null);
  const toggleGroup = (code: string) =>
    setExpandedGroupCode((prev) => (prev === code ? null : code));

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  const openWorkday = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);
  const [editClass, setEditClass] = useState<AvailableClass | null>(null);

  // ✅ Unlimited toggle state (DENTRO del componente)
  const [unlimitedSeats, setUnlimitedSeats] = useState<boolean>(false);

  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { date_iso: "", start_time: "", end_time: "" },
  ]);

  const setCount = (n: number) => {
    const safe = Math.max(0, Math.min(20, Number.isFinite(n) ? n : 0));
    setSessionsCount(safe);

    setSessions((prev) => {
      if (safe === 0) return [];
      const next = [...prev];
      while (next.length < safe) next.push({ date_iso: "", start_time: "", end_time: "" });
      return next.slice(0, safe);
    });
  };

  const selectedGroup = useMemo(() => {
    if (!expandedGroupCode) return null;
    return groupedClasses.find((g) => g.group_code === expandedGroupCode) ?? null;
  }, [expandedGroupCode, groupedClasses]);

  /** ✅ ahora admin usa endpoint admin */
  const fetchGrouped = useCallback(async () => {
    try {
      const res = await api.get("/api/classes-grouped");
      const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
      setGroupedClasses(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error cargando clases agrupadas (admin):", err);
      setGroupedClasses([]);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "classes") return;
    fetchGrouped();
  }, [activeTab, fetchGrouped]);

  const formatDate = (value: string) => {
    if (!value) return "—";
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${m}/${d}/${y}`;
    return value;
  };

  const getSessionsCountText = (g: GroupedClass) => {
    const count = Number.isFinite(g.sessions_count) ? g.sessions_count : (g.sessions?.length ?? 0);
    if (!count) return t("noOfferingsScheduledYet");
    return `${t("sessionsCount")}: ${count}`;
  };

  /** ✅ DELETE group: borra incluso drafts sin sesiones */
  const deleteClassGroup = async (g: GroupedClass) => {
    const ok = window.confirm(t("confirmDeleteClassGroup"));
    if (!ok) return;

    try {
      await ensureCsrf();

      const ids =
        g.all_session_ids && g.all_session_ids.length > 0 ? g.all_session_ids : [g.base_id];

      for (const id of ids) {
        await api.delete(`/api/admin/classes/${id}`);
      }

      await fetchGrouped();
      setExpandedGroupCode((prev) => (prev === g.group_code ? null : prev));
    } catch (err) {
      console.error("Error deleting class group:", err);
      alert("Could not delete the class group.");
    }
  };

  const openNewClassModal = () => {
    setIsNewClass(true);
    setUnlimitedSeats(false);

    setEditClass({
      id: 0,
      title: "",
      trainer_id: null,
      trainer_name: null,
      trainer_names: [],
      start_date: "",
      end_date: "",
      start_time: null,
      end_time: null,
      modality: "Online",
      spots_left: 0,
      workday_url: "",
      description: null,
      group_code: null,
      audience: "all_employees",
    });

    setShowClassModal(true);

    setCount(1);
    setSessions([{ date_iso: "", start_time: "", end_time: "" }]);
  };

  const openEditClassModal = (group: GroupedClass) => {
    setIsNewClass(false);

    const first = group.sessions?.[0];
    const times = parseTimeRange(first?.time_range || "");
    const firstSpots = first?.spots_left ?? 0;

    // ✅ estado unlimited real (NO lo apagues luego)
    setUnlimitedSeats(firstSpots >= UNLIMITED_SEATS);

    const names =
      (group.trainer_names && group.trainer_names.length > 0)
        ? group.trainer_names
        : group.trainer_name
          ? [group.trainer_name]
          : [];

    setEditClass({
      id: group.base_id,
      title: group.title,
      trainer_id: null,
      trainer_name: group.trainer_name ?? null,
      trainer_names: names,
      start_date: group.start_date_iso ?? "",
      end_date: group.end_date_iso ?? "",
      start_time: first ? times.start_time : null,
      end_time: first ? times.end_time : null,
      modality: group.modality,
      spots_left: firstSpots,
      description: group.description ?? null,
      group_code: group.group_code,
      workday_url: group.workday_url ?? "",
      audience: group.audience ?? "all_employees",
    });

    const count = group.sessions?.length ?? 0;
    setCount(count);
    setSessions(
      (group.sessions || []).map((s) => ({
        id: s.id,
        date_iso: s.date_iso,
        ...parseTimeRange(s.time_range),
      })),
    );

    setShowClassModal(true);
  };

  /**
   * ✅ SAVE:
   * - seats ilimitados persisten
   * - spots_left se manda al base y a cada sesión en sync
   * - trainer_names se manda (y trainer_name = primer seleccionado para compat)
   */
  const saveClassChanges = async () => {
    if (!editClass) return;

    const cleanSessions = sessions
      .map((s) => ({
        ...s,
        date_iso: (s.date_iso || "").trim(),
        start_time: (s.start_time || "").trim(),
        end_time: (s.end_time || "").trim(),
      }))
      .filter((s) => !!s.date_iso || !!s.start_time || !!s.end_time);

    const hasAnySession = cleanSessions.length > 0;

    const missing =
      hasAnySession && cleanSessions.some((s) => !s.date_iso || !s.start_time || !s.end_time);

    if (missing) {
      alert("Please set date + start + end time for every session.");
      return;
    }

    try {
      await ensureCsrf();

      const finalSeats = unlimitedSeats ? UNLIMITED_SEATS : Number(editClass.spots_left || 0);

      const trainerNames = Array.isArray(editClass.trainer_names) ? editClass.trainer_names : [];
      const trainerNameCompat = trainerNames[0] ?? editClass.trainer_name ?? null;

      const payload = {
        title: editClass.title,
        trainer_name: trainerNameCompat, // compat legacy
        trainer_names: trainerNames,     // ✅ nuevo multi
        modality: editClass.modality,
        spots_left: finalSeats,
        description: editClass.description ?? null,
        workday_url: editClass.workday_url ?? null,
        audience: editClass.audience ?? "all_employees",

        // ✅ draft: null
        start_time: hasAnySession ? cleanSessions[0].start_time : null,
        end_time: hasAnySession ? cleanSessions[0].end_time : null,

        start_date: editClass.start_date || null,
        end_date: editClass.end_date || null,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data?.class ?? res.data;

        if (hasAnySession) {
          await api.put(`/api/admin/classes/${saved.id}/sessions`, {
            sessions: cleanSessions.map((s, idx) => ({
              ...(idx === 0 ? { id: saved.id } : {}),
              date_iso: s.date_iso,
              start_time: s.start_time,
              end_time: s.end_time,
              spots_left: finalSeats, // ✅ CLAVE: persiste en cada sesión
            })),
            workday_url: editClass.workday_url ?? null,
            audience: editClass.audience ?? "all_employees",
          });
        }
      } else {
        await api.put(`/api/admin/classes/${editClass.id}`, payload);

        if (hasAnySession) {
          await api.put(`/api/admin/classes/${editClass.id}/sessions`, {
            sessions: cleanSessions.map((s) => ({
              id: s.id,
              date_iso: s.date_iso,
              start_time: s.start_time,
              end_time: s.end_time,
              spots_left: finalSeats, // ✅ CLAVE: persiste en cada sesión
            })),
            workday_url: editClass.workday_url ?? null,
            audience: editClass.audience ?? "all_employees",
          });
        }
      }

      await fetchGrouped();
      setShowClassModal(false);
    } catch (err: any) {
      console.error("Error guardando clase:", err);
      if (err.response?.data) alert(JSON.stringify(err.response.data, null, 2));
      else alert(t("errorSaveClass"));
    }
  };

  const handleLogout = async () => {
    try {
      await ensureCsrf();
      await api.post("/api/logout");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      localStorage.removeItem("admin_token");
      navigate("/");
    }
  };

  const renderTrainerText = (g: GroupedClass) => {
    const names =
      (g.trainer_names && g.trainer_names.length > 0)
        ? g.trainer_names
        : g.trainer_name
          ? [g.trainer_name]
          : [];
    return names.length ? names.join(", ") : "—";
  };

  return (
    <div className="admin-page">
      <div className="admin-card">
        <header className="admin-header">
          <div>
            <span className="admin-badge">{t("adminBadge")}</span>
            <h1 className="admin-title">{t("adminTitle")}</h1>
            <p className="admin-subtitle">{t("adminSubtitle")}</p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-lang-toggle"
              onClick={() => setLang(lang === "en" ? "es" : "en")}
            >
              {lang === "en" ? "ES" : "EN"}
            </button>

            <button type="button" className="admin-back-button" onClick={() => navigate("/")}>
              {t("backToCalendar")}
            </button>

            <button type="button" className="admin-logout-button" onClick={handleLogout}>
              {t("logout")}
            </button>
          </div>
        </header>

        <div className="admin-tabs">
          <button
            type="button"
            className={"admin-tab-button" + (activeTab === "classes" ? " admin-tab-button--active" : "")}
            onClick={() => setActiveTab("classes")}
          >
            {t("tabClasses")}
          </button>
        </div>

        {activeTab === "classes" && (
          <section className="admin-table-section">
            <div className="admin-table-header-row">
              <h2 className="admin-table-title">{t("classesTitle")}</h2>

              <button type="button" className="btn btn-primary" onClick={openNewClassModal}>
                {t("addNewClass")}
              </button>
            </div>

            {groupedClasses.length === 0 && <p className="admin-message">{t("noClasses")}</p>}

            {groupedClasses.length > 0 && (
              <div className="admin-carousel-wrap">
                <div className="admin-carousel-controls">
                  <button type="button" className="btn btn-secondary" onClick={() => scrollCarousel(-1)}>
                    ◀ {t("carouselPrev")}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => scrollCarousel(1)}>
                    {t("carouselNext")} ▶
                  </button>
                </div>

                <div className="admin-carousel" ref={carouselRef}>
                  {groupedClasses.map((g) => {
                    const expanded = expandedGroupCode === g.group_code;

                    return (
                      <div
                        key={g.group_code}
                        className={"admin-class-card" + (expanded ? " admin-class-card--active" : "")}
                      >
                        <div className="admin-class-card-head">
                          <div>
                            <div className="admin-class-title">
                              {g.title}{" "}
                              {g.is_draft ? (
                                <span className="mini-pill" style={{ marginLeft: 8, opacity: 0.85 }}>
                                  {t("draftTag")}
                                </span>
                              ) : null}
                            </div>

                            <div className="admin-class-sub">
                              <span className="mini-pill">{g.modality}</span>

                              <span className="mini-pill" style={{ marginLeft: 8 }}>
                                {getSessionsCountText(g)}
                              </span>

                              <span className="mini-pill" style={{ marginLeft: 8 }}>
                                {getAudienceLabel(g.audience ?? "all_employees", lang)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => toggleGroup(g.group_code)}
                          >
                            {expanded ? t("collapse") : t("expand")}
                          </button>
                        </div>

                        <div className="admin-class-meta">
                          <div className="admin-class-meta-row">
                            <strong>{t("columnTrainer")}:</strong> {renderTrainerText(g)}
                          </div>

                          {g.workday_url ? (
                            <button
                              type="button"
                              className="btn btn-mini btn-secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openWorkday(g.workday_url!);
                              }}
                            >
                              {t("viewDetails")}
                            </button>
                          ) : (
                            <span className="mini-pill" style={{ opacity: 0.8 }}>
                              {t("workdayLinkMissing")}
                            </span>
                          )}

                          {g.description && <div className="admin-class-desc">{g.description}</div>}
                        </div>

                        {expanded && <div className="admin-divider" />}

                        {expanded && (
                          <div className="admin-class-sessions">
                            {g.sessions.length === 0 ? (
                              <p className="admin-message" style={{ marginTop: 0 }}>
                                {t("noOfferingsScheduledYet")}
                              </p>
                            ) : (
                              g.sessions.map((s) => (
                                <div key={s.id} className="admin-session-pill">
                                  <span className="mini-pill">{s.date_iso}</span>
                                  <span className="mini-pill" style={{ marginLeft: 8 }}>
                                    {s.time_range}
                                  </span>
                                </div>
                              ))
                            )}

                            <div className="admin-actions" style={{ marginTop: 12 }}>
                              <button className="btn btn-mini" onClick={() => openEditClassModal(g)}>
                                {t("modalEditClass")}
                              </button>

                              <button className="btn btn-mini btn-danger" onClick={() => deleteClassGroup(g)}>
                                {t("btnDeleteClass")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedGroup && selectedGroup.sessions.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <h3 className="admin-table-title" style={{ marginBottom: 10 }}>
                      {t("sessionsPanelTitle")} {selectedGroup.title}
                    </h3>

                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>{t("labelSeats")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedGroup.sessions.map((s, idx) => (
                            <tr key={s.id}>
                              <td>{idx + 1}</td>
                              <td>{formatDate(s.date_iso)}</td>
                              <td>{s.time_range}</td>
                              <td>{s.spots_left >= UNLIMITED_SEATS ? t("unlimited") : s.spots_left}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showClassModal && editClass && (
              <div className="admin-modal-backdrop">
                <div className="admin-modal admin-modal-wide">
                  <h3>{isNewClass ? t("modalNewClass") : t("modalEditClass")}</h3>

                  <div className="admin-form-grid">
                    <div className="full">
                      <label>Workday course link</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://wd5.myworkday.com/..."
                        value={editClass.workday_url || ""}
                        onChange={(e) =>
                          setEditClass((prev) => (prev ? { ...prev, workday_url: e.target.value } : prev))
                        }
                      />
                      <small className="muted">
                        This link redirects employees to the Workday enrollment page
                      </small>
                    </div>

                    <div className="full">
                      <label>{t("labelClassTitle")}</label>
                      <input
                        className="form-input"
                        value={editClass.title}
                        onChange={(e) =>
                          setEditClass((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                        }
                      />
                    </div>

                    {/* ✅ MULTI TRAINERS */}
                    <div>
                      <label>{t("labelTrainer")}</label>

                      <select
                        className="form-input"
                        multiple
                        value={editClass.trainer_names ?? []}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                          setEditClass((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  trainer_names: values,
                                  trainer_name: values[0] ?? null, // compat
                                }
                              : prev,
                          );
                        }}
                        style={{ height: 140 }}
                      >
                        {TRAINERS.map((tr) => (
                          <option key={tr.id} value={tr.name}>
                            {tr.name}
                          </option>
                        ))}
                      </select>

                      <small className="muted">{t("trainersHelp")}</small>
                    </div>

                    <div>
                      <label>{t("labelType")}</label>
                      <select
                        className="form-input"
                        value={editClass.modality}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? { ...prev, modality: e.target.value as "Online" | "Presencial" }
                              : prev,
                          )
                        }
                      >
                        <option value="Presencial">{t("typeInPerson")}</option>
                        <option value="Online">{t("typeOnline")}</option>
                      </select>
                    </div>

                    {/* ✅ Seats + Unlimited */}
                    <div>
                      <label>{t("labelSeats")}</label>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          marginTop: 6,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={unlimitedSeats}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUnlimitedSeats(checked);

                            setEditClass((prev) =>
                              prev ? { ...prev, spots_left: checked ? UNLIMITED_SEATS : 0 } : prev,
                            );
                          }}
                        />
                        {t("unlimited")}
                      </label>

                      <input
                        type="number"
                        className="form-input"
                        value={unlimitedSeats ? "" : editClass.spots_left}
                        disabled={unlimitedSeats}
                        placeholder={unlimitedSeats ? t("unlimited") : ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, spots_left: Number(e.target.value) } : prev,
                          )
                        }
                        min={0}
                      />
                    </div>

                    <div>
                      <label>{t("labelAudience")}</label>
                      <select
                        className="form-input"
                        value={(editClass.audience ?? "all_employees") as string}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, audience: e.target.value as Audience } : prev,
                          )
                        }
                      >
                        <option value="">{t("optionSelectAudience")}</option>
                        {AUDIENCES.map((a) => (
                          <option key={a.value} value={a.value}>
                            {lang === "en" ? a.label_en : a.label_es}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="full">
                      <label>{t("labelDescription")}</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editClass.description ?? ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, description: e.target.value || null } : prev,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-divider" />

                  <h4 style={{ margin: "0 0 6px", fontWeight: 900 }}>{t("addSessionsTitle")}</h4>
                  <p className="admin-message" style={{ marginTop: 0 }}>
                    {t("addSessionsHint")}
                  </p>

                  <label>{t("sessionsCountLabel")}</label>
                  <div className="admin-inline-controls">
                    <button type="button" className="btn btn-secondary" onClick={() => setCount(sessionsCount - 1)}>
                      −
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 90, textAlign: "center" }}
                      value={sessionsCount}
                      onChange={(e) => setCount(Number(e.target.value))}
                      min={0}
                      max={20}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setCount(sessionsCount + 1)}>
                      +
                    </button>
                  </div>

                  {sessionsCount === 0 ? (
                    <p className="admin-message" style={{ marginTop: 10 }}>
                      {lang === "en"
                        ? "This class will be saved as a draft (no sessions)."
                        : "Esta clase se guardará como borrador (sin sesiones)."}
                    </p>
                  ) : (
                    <div className="admin-sessions-grid" style={{ marginTop: 12 }}>
                      {sessions.map((s, idx) => (
                        <div key={idx} className="admin-session-row">
                          <div>
                            <label>
                              {t("sessionDateLabel")} {idx + 1}
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={s.date_iso}
                              onChange={(e) => {
                                const next = [...sessions];
                                next[idx] = { ...next[idx], date_iso: e.target.value };
                                setSessions(next);
                              }}
                            />
                          </div>

                          <div>
                            <label>Session {idx + 1} Start</label>
                            <input
                              type="time"
                              className="form-input"
                              value={s.start_time}
                              onChange={(e) => {
                                const next = [...sessions];
                                next[idx] = { ...next[idx], start_time: e.target.value };
                                setSessions(next);
                              }}
                            />
                          </div>

                          <div>
                            <label>Session {idx + 1} End</label>
                            <input
                              type="time"
                              className="form-input"
                              value={s.end_time}
                              onChange={(e) => {
                                const next = [...sessions];
                                next[idx] = { ...next[idx], end_time: e.target.value };
                                setSessions(next);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="admin-modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowClassModal(false)}>
                      {t("modalCancelDark")}
                    </button>

                    <button type="button" className="btn btn-primary" onClick={saveClassChanges}>
                      {t("modalSaveDark")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
