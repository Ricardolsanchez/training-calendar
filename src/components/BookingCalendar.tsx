import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./BookingCalendar.css";

type Lang = "en" | "es";

type Audience =
  | "sales"
  | "all_employees"
  | "new_hires"
  | "hr"
  | "it"
  | "legal"
  | "records";
type AudienceFilter = "all" | Audience;

const AUDIENCES: { value: Audience; label_en: string; label_es: string }[] = [
  { value: "sales", label_en: "Sales", label_es: "Ventas" },
  {
    value: "all_employees",
    label_en: "All Employees",
    label_es: "Todos los empleados",
  },
  { value: "new_hires", label_en: "New Hires", label_es: "Nuevos ingresos" },
  { value: "hr", label_en: "HR", label_es: "RR. HH." },
  { value: "it", label_en: "IT", label_es: "TI" },
  { value: "legal", label_en: "Legal", label_es: "Legal" },
  { value: "records", label_en: "Records", label_es: "Records" },
];

const AUDIENCE_FILTERS: {
  value: AudienceFilter;
  label_en: string;
  label_es: string;
}[] = [{ value: "all", label_en: "All", label_es: "Todas" }, ...AUDIENCES];

const getAudienceLabel = (aud: Audience | null | undefined, lang: Lang) => {
  const found = AUDIENCES.find((a) => a.value === aud);
  if (!found) return lang === "en" ? "All Employees" : "Todos los empleados";
  return lang === "en" ? found.label_en : found.label_es;
};

type AvailableSession = {
  id: number;
  date_iso: string; // YYYY-MM-DD
  time_range: string; // "3:00 PM - 4:00 PM" o "15:00 - 16:00"
  spots_left: number;
};

type AvailableClassGroup = {
  group_code: string;
  title: string;
  trainer_name: string;
  modality: "Online" | "Presencial";
  audience?: Audience | null;
  level?: string | null;
  description?: string | null;
  sessions_count: number;
  sessions: AvailableSession[];
  start_date_iso?: string | null;
  end_date_iso?: string | null;
  workday_url?: string | null;
};

const SUGGESTION_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfQtnvDXIs6Iwo6XDIZ_73K9oJrNxSEYoaJUZKRwMQyaUj_RA/viewform?usp=publish-editor";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    updatedTag: "Updated",
    adminPanel: "Admin Panel",
    adminLogin: "Admin Login",
    availableClassesTitle: "AVAILABLE CLASSES THIS MONTH",
    availableClassesSubtitle: "Click a class to view it in Workday.",
    loadingClasses: "Loading classes...",
    noClassesError: "Could not load classes. Please try again later.",
    selectedClassLabel: "SELECTED CLASS",
    highlightedHint: "Marked: days for selected class",
    viewDetails: "View details here",
    workdayLinkMissing: "Workday link not available yet.",
    availableSeats: "Available seats",
    sessionsTitle: "SESSIONS",
    calendarInstruction: "Select a day this month to join a class.",
    noClassesSelectedDay: "No classes for this day.",
    otherClassesForDay: "OTHER CLASSES",
    noOtherClassesForDay: "No other classes for this day.",
    pickDayHint: "Select a day on the calendar to see more classes.",
    footerSuggestPrefix: "Don’t see the class you’re looking for?",
    footerSuggestCta: "Suggest it here.",
    allClassesToggle: "ALL",
    allClassesHint: "Showing all classes",
    sessionsCount: "Sessions",
    noOfferingsScheduledYet: "No offerings scheduled yet",
  },
  es: {
    updatedTag: "Actualizado",
    adminPanel: "Panel Admin",
    adminLogin: "Login Admin",
    availableClassesTitle: "CLASES DISPONIBLES ESTE MES",
    availableClassesSubtitle: "Haz click en una clase para verla en Workday.",
    loadingClasses: "Cargando clases...",
    noClassesError: "No se pudieron cargar las clases. Intenta más tarde.",
    selectedClassLabel: "CLASE SELECCIONADA",
    highlightedHint: "Marcado: días de la clase seleccionada",
    viewDetails: "Ver detalles aquí",
    workdayLinkMissing: "Aún no hay link de Workday disponible.",
    availableSeats: "Cupos disponibles",
    sessionsTitle: "SESIONES",
    sessionsCount: "Sesiones",
    noOfferingsScheduledYet: "Aún no hay sesiones programadas",
    calendarInstruction:
      "Selecciona un día del mes para participar en una clase.",
    noClassesSelectedDay: "No hay clases para este día.",
    otherClassesForDay: "OTRAS CLASES",
    noOtherClassesForDay: "No hay otras clases para ese día.",
    pickDayHint: "Selecciona un día en el calendario para ver más clases.",
    footerSuggestPrefix: "¿No encuentras la clase que buscas?",
    footerSuggestCta: "Sugiere una aquí.",
    allClassesToggle: "TODAS",
    allClassesHint: "Mostrando todas las clases",
  },
};

const getGroupSeats = (g: AvailableClassGroup) => {
  const seats = (g.sessions ?? [])
    .map((s) => Number(s.spots_left ?? 0))
    .filter((n) => Number.isFinite(n));
  if (seats.length === 0) return 0;
  return Math.min(...seats);
};

/** evita bug UTC con YYYY-MM-DD */
const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const formatDayMonth = (iso: string, lang: Lang) => {
  const locale = lang === "en" ? "en-US" : "es-ES";
  const dt = parseLocalDate(iso);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dt);
};

const getNextSessionDate = (sessions: AvailableSession[], lang: Lang) => {
  if (!sessions || sessions.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = sessions
    .map((s) => ({ ...s, date: parseLocalDate(s.date_iso) }))
    .filter((s) => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length === 0) return null;
  return formatDayMonth(upcoming[0].date_iso, lang);
};

const makeKey = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getMonthAnchor = (
  groups: AvailableClassGroup[],
  selectedGroup: AvailableClassGroup | null,
  selectedSessionIso?: string | null,
) => {
  if (selectedSessionIso) return parseLocalDate(selectedSessionIso);
  if (selectedGroup?.start_date_iso)
    return parseLocalDate(selectedGroup.start_date_iso);
  const first = groups[0]?.sessions?.[0]?.date_iso;
  return first ? parseLocalDate(first) : new Date();
};

/** AUTO-HIDE PAST SESSIONS */
const parseTimeToMinutes = (t: string) => {
  const raw = (t ?? "").trim().toUpperCase();
  if (!raw) return null;

  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  }

  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3];
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

    if (ap === "AM" && hh === 12) hh = 0;
    if (ap === "PM" && hh !== 12) hh += 12;
    return hh * 60 + mm;
  }

  return null;
};

const getSessionEndDateTime = (dateIso: string, timeRange: string) => {
  const parts = (timeRange ?? "").split("-").map((p) => p.trim());
  if (parts.length < 2) return null;

  const endMin = parseTimeToMinutes(parts[1]);
  if (endMin == null) return null;

  const dt = parseLocalDate(dateIso);
  dt.setHours(0, 0, 0, 0);
  dt.setMinutes(endMin);
  return dt;
};

const isGroupStillActive = (g: AvailableClassGroup, now: Date) => {
  return (g.sessions ?? []).some((s) => {
    const end = getSessionEndDateTime(s.date_iso, s.time_range);
    if (!end) return true; // si no puedo parsear, NO lo oculto
    return end.getTime() > now.getTime();
  });
};

const MiniCalendar: React.FC<{
  groups: AvailableClassGroup[];
  lang: Lang;
  selectedGroup: AvailableClassGroup | null;
  selectedSessionIso?: string | null;
  onDayClick?: (iso: string) => void;
  mode: "selected" | "all";
  onToggleMode: () => void;
}> = ({
  groups,
  lang,
  selectedGroup,
  selectedSessionIso,
  onDayClick,
  mode,
  onToggleMode,
}) => {
  const anchor = useMemo(
    () => getMonthAnchor(groups, selectedGroup, selectedSessionIso),
    [groups, selectedGroup, selectedSessionIso],
  );

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekday = monthStart.getDay();

  const days: Date[] = [];
  for (
    let d = new Date(monthStart);
    d <= monthEnd;
    d.setDate(d.getDate() + 1)
  ) {
    days.push(new Date(d));
  }

  const daysWithSessions = useMemo(() => {
    const set = new Set<string>();
    const sourceGroups =
      mode === "all" ? groups : selectedGroup ? [selectedGroup] : [];

    for (const g of sourceGroups) {
      for (const s of g.sessions ?? []) {
        if (!s?.date_iso) continue;
        const dt = parseLocalDate(s.date_iso);
        if (dt.getFullYear() !== year || dt.getMonth() !== month) continue;
        set.add(makeKey(dt));
      }
    }
    return set;
  }, [mode, groups, selectedGroup, year, month]);

  const selectedDayKey = useMemo(() => {
    if (!selectedSessionIso) return null;
    return makeKey(parseLocalDate(selectedSessionIso));
  }, [selectedSessionIso]);

  const locale = lang === "en" ? "en-US" : "es-ES";
  const monthLabel = monthStart.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const weekdayLabels =
    lang === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["D", "L", "M", "X", "J", "V", "S"];
  const t = (k: string) => translations[lang][k] ?? k;

  return (
    <div className="booking-mini-calendar">
      <div className="mini-calendar-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mini-calendar-title">{monthLabel}</span>
          <button
            type="button"
            className={
              "mini-all-toggle" +
              (mode === "all" ? " mini-all-toggle--active" : "")
            }
            onClick={onToggleMode}
          >
            {t("allClassesToggle")}
          </button>
        </div>

        <span className="mini-calendar-hint">
          {mode === "all" ? t("allClassesHint") : t("highlightedHint")}
        </span>
      </div>

      <div className="mini-calendar-grid">
        {weekdayLabels.map((w) => (
          <div key={w} className="mini-calendar-weekday">
            {w}
          </div>
        ))}

        {Array.from({ length: firstWeekday }).map((_, idx) => (
          <div key={`blank-${idx}`} className="mini-calendar-day empty" />
        ))}

        {days.map((d) => {
          const key = makeKey(d);
          const hasSession = daysWithSessions.has(key);
          const isSelectedDay = selectedDayKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick?.(key)}
              className={
                "mini-calendar-day" +
                (hasSession ? " mini-calendar-day--highlight" : "") +
                (isSelectedDay ? " mini-calendar-day--selected" : "")
              }
              style={{ cursor: "pointer" }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const BookingCalendar: React.FC = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => translations[lang][key] ?? key;

  const [availableGroups, setAvailableGroups] = useState<AvailableClassGroup[]>(
    [],
  );
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] =
    useState<AvailableClassGroup | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [selectedSessionIso, setSelectedSessionIso] = useState<string | null>(
    null,
  );

  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [miniCalendarMode, setMiniCalendarMode] = useState<"selected" | "all">(
    "selected",
  );

  /** ✅ tick para recalcular el filtro por hora */
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  /** ✅ IMPORTANTE: la función debe vivir DENTRO del componente */
  const handleToggleMiniCalendarMode = () => {
    setMiniCalendarMode((prev: "selected" | "all") => {
      const next: "selected" | "all" = prev === "all" ? "selected" : "all";

      // ✅ Si voy a ALL: limpio selección de día y clase
      if (next === "all") {
        setSelectedSessionIso(null);
        setSelectedSessionId(null);
        setSelectedGroup(null);
      }

      return next;
    });
  };
  const getSessionsCountText = (g: AvailableClassGroup) => {
    const count = Number.isFinite(g.sessions_count)
      ? g.sessions_count
      : (g.sessions?.length ?? 0);

    if (!count) return t("noOfferingsScheduledYet");
    return `${t("sessionsCount")}: ${count}`;
  };

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 460, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        setClassesError(null);

        const res = await api.get("/api/classes-grouped");
        const list = (res.data?.classes ?? res.data) as AvailableClassGroup[];
        const normalized = Array.isArray(list) ? list : [];

        setAvailableGroups(normalized);

        setSelectedGroup(null);
        setSelectedSessionId(null);
        setSelectedSessionIso(null);
      } catch (err) {
        console.error("Error cargando clases:", err);
        setClassesError(
          translations[lang].noClassesError ?? "Could not load classes.",
        );
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setIsAdmin(false);
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setIsAdmin(true);
  }, []);

  /** 1) Filtra cursos ya finalizados (por tiempo) */
  const timeFilteredGroups = useMemo(() => {
    const now = new Date(nowTick);
    return availableGroups.filter((g) => isGroupStillActive(g, now));
  }, [availableGroups, nowTick]);

  /** 2) Filtra por audiencia */
  const filteredGroups = useMemo(() => {
    const base = timeFilteredGroups;
    if (audienceFilter === "all") return base;
    return base.filter(
      (g) => (g.audience ?? "all_employees") === audienceFilter,
    );
  }, [timeFilteredGroups, audienceFilter]);

  /** si selectedGroup ya no existe, limpia selección */
  useEffect(() => {
    if (!selectedGroup) return;

    const exists = filteredGroups.some(
      (g) => g.group_code === selectedGroup.group_code,
    );
    if (!exists) {
      setSelectedGroup(null);
      setSelectedSessionId(null);
      setSelectedSessionIso(null);
    }
  }, [filteredGroups, selectedGroup]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<
      string,
      { group: AvailableClassGroup; session: AvailableSession }[]
    >();

    for (const g of filteredGroups) {
      for (const s of g.sessions ?? []) {
        if (!s?.date_iso) continue;
        const key = s.date_iso; // YYYY-MM-DD
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ group: g, session: s });
      }
    }

    map.forEach((list) =>
      list.sort((a, b) =>
        (a.session.time_range ?? "").localeCompare(b.session.time_range ?? ""),
      ),
    );

    return map;
  }, [filteredGroups]);

  /** detecta si el día seleccionado tiene clases */
  const selectedDayHasClasses = useMemo(() => {
    if (!selectedSessionIso) return true;
    const list = sessionsByDay.get(selectedSessionIso) ?? [];
    return list.length > 0;
  }, [selectedSessionIso, sessionsByDay]);

  /** si selecciona día vacío, ocultamos carrusel */
  const shouldShowCarousel = !selectedSessionIso || selectedDayHasClasses;

  const otherClassesForSelectedDay = useMemo(() => {
    if (!selectedSessionIso) return [];

    const list = sessionsByDay.get(selectedSessionIso) ?? [];
    const unique = new Map<
      string,
      { group: AvailableClassGroup; session: AvailableSession }
    >();
    for (const item of list) unique.set(item.group.group_code, item);
    if (selectedGroup?.group_code) unique.delete(selectedGroup.group_code);

    return Array.from(unique.values());
  }, [selectedSessionIso, sessionsByDay, selectedGroup]);

  const otherClassesTitle = useMemo(() => {
    if (!selectedSessionIso) return t("otherClassesForDay");
    const dateLabel = formatDayMonth(selectedSessionIso, lang);
    return lang === "en"
      ? `${t("otherClassesForDay")} for ${dateLabel}`
      : `${t("otherClassesForDay")} para ${dateLabel}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionIso, lang]);

  const handleSelectGroup = (g: AvailableClassGroup) => {
    setSelectedGroup(g);
    setSelectedSessionId(null);
    setSelectedSessionIso(null);
  };

  const handleSelectSession = (g: AvailableClassGroup, s: AvailableSession) => {
    setSelectedGroup(g);
    setSelectedSessionId(s.id);
    setSelectedSessionIso(s.date_iso);
  };

  const handleCalendarDayClick = (dayIso: string) => {
    const list = sessionsByDay.get(dayIso) ?? [];
    setSelectedSessionIso(dayIso);

    // ✅ al seleccionar un día, dejamos el modo en "selected"
    if (miniCalendarMode === "all") setMiniCalendarMode("selected");

    if (list.length === 0) {
      setSelectedGroup(null);
      setSelectedSessionId(null);
      return;
    }

    const first = list[0];
    setSelectedGroup(first.group);
    setSelectedSessionId(first.session.id);
  };

  const openWorkday = (url?: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="booking-page">
      <div className="booking-card">
        <header className="booking-header">
          <div className="booking-header-left booking-header-logo">
            <img
              src="/logo.png"
              alt="Alonso & Alonso Academy"
              className="booking-logo"
            />
          </div>

          <div className="booking-header-right">
            <div className="booking-header-tag">
              <span className="dot" />
              <span>{t("updatedTag")}</span>
            </div>

            <button
              type="button"
              className="booking-lang-toggle"
              onClick={() => setLang(lang === "en" ? "es" : "en")}
            >
              {lang === "en" ? "ES" : "EN"}
            </button>

            {isAdmin === null ? null : isAdmin ? (
              <button
                type="button"
                className="booking-login-btn"
                onClick={() => navigate("/admin")}
              >
                {t("adminPanel")}
              </button>
            ) : (
              <Link to="/login" className="booking-login-btn">
                {t("adminLogin")}
              </Link>
            )}
          </div>
        </header>

        <div className="booking-filters-row">
          <div className="audience-filters">
            {AUDIENCE_FILTERS.map((a) => {
              const active = audienceFilter === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  className={
                    "audience-pill" + (active ? " audience-pill--active" : "")
                  }
                  onClick={() => setAudienceFilter(a.value)}
                >
                  {lang === "en" ? a.label_en : a.label_es}
                </button>
              );
            })}
          </div>
        </div>

        <div className="booking-layout">
          {/* LEFT */}
          <section className="class-list-section">
            <div className="class-list-header">
              <h2>{t("availableClassesTitle")}</h2>
              <p>{t("availableClassesSubtitle")}</p>
            </div>

            {loadingClasses && (
              <p className="form-message">{t("loadingClasses")}</p>
            )}
            {classesError && (
              <p className="form-message error">{classesError}</p>
            )}

            {!loadingClasses && !classesError && (
              <>
                {shouldShowCarousel ? (
                  <>
                    <div className="class-carousel">
                      <button
                        type="button"
                        className="carousel-btn carousel-btn--left"
                        onClick={() => scrollCarousel(-1)}
                      >
                        ‹
                      </button>

                      <div
                        className="class-carousel-viewport"
                        ref={carouselRef}
                      >
                        <div className="class-carousel-track">
                          {filteredGroups.map((g) => {
                            const isSelected =
                              selectedGroup?.group_code === g.group_code;
                            const modalityDotClass =
                              g.modality === "Online" ? "online" : "presencial";
                            const nextDate = getNextSessionDate(
                              g.sessions,
                              lang,
                            );

                            return (
                              <button
                                key={g.group_code}
                                type="button"
                                className={
                                  "class-card class-card--carousel" +
                                  (isSelected ? " class-card--selected" : "")
                                }
                                onClick={() => handleSelectGroup(g)}
                              >
                                <div className="class-card-top">
                                  <span className="class-title">{g.title}</span>

                                  <span className="class-badge">
                                    <span
                                      className={`dot ${modalityDotClass}`}
                                    />
                                    {g.modality.toUpperCase()}
                                  </span>
                                </div>

                                {nextDate && (
                                  <div className="class-card-date">
                                    📅 {nextDate}
                                  </div>
                                )}
                                <div className="class-card-date">
                                  🗓️ {getSessionsCountText(g)}
                                </div>

                                <div className="class-meta">
                                  {g.workday_url ? (
                                    <button
                                      type="button"
                                      className="btn btn-mini btn-secondary"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openWorkday(g.workday_url);
                                      }}
                                    >
                                      {t("viewDetails")}
                                    </button>
                                  ) : (
                                    <span
                                      className="mini-pill"
                                      style={{ opacity: 0.8 }}
                                    >
                                      {t("workdayLinkMissing")}
                                    </span>
                                  )}
                                </div>

                                {!!g.description && (
                                  <p className="class-card-desc">
                                    {g.description}
                                  </p>
                                )}

                                <div className="class-footer">
                                  <span className="class-trainer">
                                    👤 {g.trainer_name}
                                  </span>

                                  <span className="class-level">
                                    {getAudienceLabel(
                                      g.audience ?? "all_employees",
                                      lang,
                                    )}
                                  </span>

                                  <span className="class-spots">
                                    {t("availableSeats")}: {getGroupSeats(g)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="carousel-btn carousel-btn--right"
                        onClick={() => scrollCarousel(1)}
                      >
                        ›
                      </button>
                    </div>

                    <div className="other-classes">
                      <div className="other-classes-title">
                        {otherClassesTitle}
                      </div>

                      {!selectedSessionIso ? (
                        <p className="other-classes-empty">
                          {t("pickDayHint")}
                        </p>
                      ) : otherClassesForSelectedDay.length === 0 ? (
                        <p className="other-classes-empty">
                          {t("noOtherClassesForDay")}
                        </p>
                      ) : (
                        <div className="other-classes-list">
                          {otherClassesForSelectedDay.map(
                            ({ group, session }) => (
                              <button
                                key={`${group.group_code}-${session.id}`}
                                type="button"
                                className="other-class-row"
                                onClick={() =>
                                  handleSelectSession(group, session)
                                }
                              >
                                <div className="other-class-row-left">
                                  <div className="other-class-title">
                                    {group.title}
                                  </div>
                                  <div className="other-class-meta">
                                    👤 {group.trainer_name} ·{" "}
                                    {getAudienceLabel(
                                      group.audience ?? "all_employees",
                                      lang,
                                    )}{" "}
                                    · {group.modality}
                                  </div>
                                </div>

                                <div className="other-class-row-right">
                                  {group.workday_url ? (
                                    <button
                                      type="button"
                                      className="other-workday-btn"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openWorkday(group.workday_url);
                                      }}
                                    >
                                      {t("viewDetails")}
                                    </button>
                                  ) : (
                                    <span
                                      className="mini-pill"
                                      style={{ opacity: 0.75 }}
                                    >
                                      {t("workdayLinkMissing")}
                                    </span>
                                  )}

                                  <span className="mini-pill">
                                    {session.time_range}
                                  </span>

                                  <span
                                    className="mini-pill"
                                    style={{ marginLeft: 8 }}
                                  >
                                    {t("availableSeats")}:{" "}
                                    {getGroupSeats(group)}
                                  </span>
                                </div>
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="form-message" style={{ marginTop: 12 }}>
                    {t("noClassesSelectedDay")}
                  </p>
                )}
              </>
            )}
          </section>

          {/* RIGHT */}
          <section className="booking-detail-section">
            <div className="booking-detail-card">
              <div className="calendar-instruction">
                {t("calendarInstruction")}
              </div>

              <MiniCalendar
                groups={filteredGroups}
                lang={lang}
                selectedGroup={selectedGroup}
                selectedSessionIso={selectedSessionIso}
                onDayClick={handleCalendarDayClick}
                mode={miniCalendarMode}
                onToggleMode={handleToggleMiniCalendarMode}
              />

              {!selectedGroup ? null : (
                <>
                  <div className="booking-detail-header">
                    <span className="booking-detail-label">
                      {t("selectedClassLabel")}
                    </span>
                    <h3>{selectedGroup.title}</h3>

                    <p className="booking-detail-meta">
                      Trainer: {selectedGroup.trainer_name} ·{" "}
                      {getAudienceLabel(
                        selectedGroup.audience ?? "all_employees",
                        lang,
                      )}{" "}
                      · {selectedGroup.modality}
                    </p>

                    {selectedGroup.description ? (
                      <p className="booking-detail-desc">
                        {selectedGroup.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="booking-detail-sessions">
                    <div className="class-sessions-title">
                      {t("sessionsTitle")}
                    </div>

                    <div className="booking-detail-sessions-list">
                      {selectedGroup.sessions.map((s) => {
                        const active = selectedSessionId === s.id;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={
                              "session-pill session-pill--detail" +
                              (active ? " session-pill--active" : "")
                            }
                            onClick={() =>
                              handleSelectSession(selectedGroup, s)
                            }
                          >
                            <span className="mini-pill">
                              {formatDayMonth(s.date_iso, lang)}
                            </span>
                            <span
                              className="mini-pill"
                              style={{ marginLeft: 8 }}
                            >
                              {s.time_range}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <footer className="booking-footer">
          <span className="booking-footer-text">
            {t("footerSuggestPrefix")}
          </span>{" "}
          <a
            className="booking-footer-link"
            href={SUGGESTION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("footerSuggestCta")}
          </a>
        </footer>
      </div>
    </div>
  );
};

export default BookingCalendar;
