import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./BookingCalendar.css";

type Lang = "en" | "es";

type AvailableSession = {
  id: number;
  date_iso: string;
  time_range: string;
  spots_left: number;
};

type AvailableClassGroup = {
  group_code: string;
  title: string;
  trainer_name: string;
  modality: "Online" | "Presencial";
  level: string;
  description?: string | null;
  sessions_count: number;
  sessions: AvailableSession[];
  start_date_iso?: string | null;
  end_date_iso?: string | null;
  workday_url?: string | null;
};

const translations: Record<Lang, Record<string, string>> = {
  en: {
    updatedTag: "Updated",
    adminPanel: "Admin Panel",
    adminLogin: "Admin Login",
    availableClassesTitle: "AVAILABLE CLASSES THIS MONTH",
    availableClassesSubtitle: "Click a class to view it in Workday.",
    loadingClasses: "Loading classes...",
    noClassesError: "Could not load classes. Please try again later.",
    clickOnClassTitle: "Select a class",
    clickOnClassText: "Click on a class on the left to see its Workday link.",
    selectedClassLabel: "SELECTED CLASS",
    highlightedHint: "Marked: days with classes",
    viewDetails: "View details here",
    workdayLinkMissing: "Workday link not available yet.",
    sessionsTitle: "SESSIONS",
  },
  es: {
    updatedTag: "Actualizado",
    adminPanel: "Panel Admin",
    adminLogin: "Login Admin",
    availableClassesTitle: "CLASES DISPONIBLES ESTE MES",
    availableClassesSubtitle: "Haz click en una clase para verla en Workday.",
    loadingClasses: "Cargando clases...",
    noClassesError: "No se pudieron cargar las clases. Intenta más tarde.",
    clickOnClassTitle: "Selecciona una clase",
    clickOnClassText:
      "Haz click en una clase a la izquierda para ver su link de Workday.",
    selectedClassLabel: "CLASE SELECCIONADA",
    highlightedHint: "Marcado: días con clases",
    viewDetails: "Ver detalles aquí",
    workdayLinkMissing: "Aún no hay link de Workday disponible.",
    sessionsTitle: "SESIONES",
  },
};

/** ✅ evita bug UTC con YYYY-MM-DD */
const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
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
  // ✅ 1) prioridad: la sesión seleccionada
  if (selectedSessionIso) return parseLocalDate(selectedSessionIso);

  // ✅ 2) si hay start_date_iso del grupo seleccionado
  if (selectedGroup?.start_date_iso)
    return parseLocalDate(selectedGroup.start_date_iso);

  // ✅ 3) fallback: primera sesión disponible del primer grupo
  const first = groups[0]?.sessions?.[0]?.date_iso;
  return first ? parseLocalDate(first) : new Date();
};

const MiniCalendar: React.FC<{
  groups: AvailableClassGroup[];
  lang: Lang;
  selectedGroup: AvailableClassGroup | null;
  selectedSessionIso?: string | null; // ✅ solo este define el día “activo”
}> = ({ groups, lang, selectedGroup, selectedSessionIso }) => {
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

  /**
   * ✅ daysWithSessions: SOLO marca los días que realmente tienen sesiones
   * (no rangos)
   */
  const daysWithSessions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const s of g.sessions ?? []) {
        if (!s?.date_iso) continue;
        const key = makeKey(parseLocalDate(s.date_iso));
        if (
          parseLocalDate(s.date_iso).getFullYear() === year &&
          parseLocalDate(s.date_iso).getMonth() === month
        ) {
          set.add(key);
        }
      }
    }
    return set;
  }, [groups, year, month]);

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
        <span className="mini-calendar-title">{monthLabel}</span>
        <span className="mini-calendar-hint">{t("highlightedHint")}</span>
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
            <div
              key={key}
              className={
                "mini-calendar-day" +
                (hasSession ? " mini-calendar-day--highlight" : "") +
                (isSelectedDay ? " mini-calendar-day--selected" : "")
              }
            >
              {d.getDate()}
            </div>
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

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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

        setSelectedGroup((prev) => {
          if (prev && normalized.some((g) => g.group_code === prev.group_code))
            return prev;
          return normalized[0] ?? null;
        });

        // ✅ por defecto: nada seleccionado -> no highlight “activo”
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

  const handleSelectGroup = (g: AvailableClassGroup) => {
    setSelectedGroup(g);
    // ✅ al cambiar de grupo, quitamos selección activa del calendario
    setSelectedSessionId(null);
    setSelectedSessionIso(null);
  };

  const handleSelectSession = (g: AvailableClassGroup, s: AvailableSession) => {
    setSelectedGroup(g);
    setSelectedSessionId(s.id);
    setSelectedSessionIso(s.date_iso); // ✅ esto prende el “selected” day
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

        <div className="booking-layout">
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
                <div className="class-carousel">
                  <button
                    type="button"
                    className="carousel-btn carousel-btn--left"
                    onClick={() => scrollCarousel(-1)}
                  >
                    ‹
                  </button>

                  <div className="class-carousel-viewport" ref={carouselRef}>
                    <div className="class-carousel-track">
                      {availableGroups.map((g) => {
                        const isSelected =
                          selectedGroup?.group_code === g.group_code;

                        const modalityDotClass =
                          g.modality === "Online" ? "online" : "presencial";

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
                                <span className={`dot ${modalityDotClass}`} />
                                {g.modality.toUpperCase()}
                              </span>
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
                              <p className="class-card-desc">{g.description}</p>
                            )}

                            <div className="class-footer">
                              <span className="class-trainer">
                                👤 {g.trainer_name}
                              </span>
                              <span className="class-level">{g.level}</span>
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

                {selectedGroup && (
                  <div className="class-sessions class-sessions--below">
                    <div className="class-sessions-title">
                      {t("sessionsTitle")}
                    </div>

                    <div className="class-sessions-list-below">
                      {selectedGroup.sessions.map((s) => {
                        const active = selectedSessionId === s.id;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={
                              "session-pill session-pill--below" +
                              (active ? " session-pill--active" : "")
                            }
                            onClick={() =>
                              handleSelectSession(selectedGroup, s)
                            }
                          >
                            <span className="mini-pill">{s.date_iso}</span>
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
                )}
              </>
            )}
          </section>

          <section className="booking-detail-section">
            <div className="booking-detail-card">
              <MiniCalendar
                groups={availableGroups}
                lang={lang}
                selectedGroup={selectedGroup}
                selectedSessionIso={selectedSessionIso}
              />

              {!selectedGroup ? (
                <div className="booking-detail-empty">
                  <h3>{t("clickOnClassTitle")}</h3>
                  <p>{t("clickOnClassText")}</p>
                </div>
              ) : (
                <>
                  <div className="booking-detail-header">
                    <span className="booking-detail-label">
                      {t("selectedClassLabel")}
                    </span>
                    <h3>{selectedGroup.title}</h3>

                    <p className="booking-detail-meta">
                      Trainer: {selectedGroup.trainer_name} ·{" "}
                      {selectedGroup.level} · {selectedGroup.modality}
                    </p>

                    {selectedGroup.description ? (
                      <p className="booking-detail-desc">
                        {selectedGroup.description}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
