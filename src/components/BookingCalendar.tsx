import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./BookingCalendar.css";

type Lang = "en" | "es";
type Status = "idle" | "loading" | "success" | "error";

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
};

const translations: Record<Lang, Record<string, string>> = {
  en: {
    updatedTag: "Updated",
    adminPanel: "Admin Panel",
    adminLogin: "Admin Login",
    availableClassesTitle: "AVAILABLE CLASSES THIS MONTH",
    availableClassesSubtitle: "Click on a class to view details and enroll.",
    loadingClasses: "Loading classes...",
    noClassesError: "Could not load classes. Please try again later.",
    clickOnClassTitle: "Select a class",
    clickOnClassText: "Click on a class on the left to see details and sessions.",
    selectedClassLabel: "SELECTED CLASS",
    emailLabel: "Please provide your A&A Email Address",
    emailPlaceholder: "youremail@yourcompany.com",
    errorNoClass: "Please select a class first.",
    errorNoEmail: "Please enter your email.",
    submitLabel: "Enroll in all sessions",
    submitLoading: "Enrolling...",
    successBooked: "✅ Enrollment submitted! You’ll receive a confirmation email.",
    privacyText: "We’ll use your corporate email to confirm your enrollment.",
    seats: "seat",
    seatsPlural: "seats",
    seatsAvailable: "Available",
    sessions: "Sessions",
    highlightedHint: "Highlighted: days with classes",
    includesLabel: "Includes",
    mandatoryLabel: "mandatory",
    errorNoDates: "This class has no valid dates configured.",
  },
  es: {
    updatedTag: "Actualizado",
    adminPanel: "Panel Admin",
    adminLogin: "Login Admin",
    availableClassesTitle: "CLASES DISPONIBLES ESTE MES",
    availableClassesSubtitle: "Haz click en una clase para ver detalles e inscribirte.",
    loadingClasses: "Cargando clases...",
    noClassesError: "No se pudieron cargar las clases. Intenta más tarde.",
    clickOnClassTitle: "Selecciona una clase",
    clickOnClassText: "Haz click en una clase a la izquierda para ver detalles y sesiones.",
    selectedClassLabel: "CLASE SELECCIONADA",
    emailLabel: "Por favor ingresa tu correo corporativo A&A",
    emailPlaceholder: "tucorreo@tuempresa.com",
    errorNoClass: "Selecciona una clase primero.",
    errorNoEmail: "Ingresa tu correo por favor.",
    submitLabel: "Inscribirme a todas las sesiones",
    submitLoading: "Inscribiendo...",
    successBooked: "✅ Inscripción enviada. Te llegará un correo de confirmación.",
    privacyText: "Usaremos tu correo corporativo para confirmar tu inscripción.",
    seats: "cupo",
    seatsPlural: "cupos",
    seatsAvailable: "Disponibles",
    sessions: "Sesiones",
    highlightedHint: "Resaltado: días con clases",
    includesLabel: "Incluye",
    mandatoryLabel: "obligatorias",
    errorNoDates: "Esta clase no tiene fechas válidas configuradas.",
  },
};

/** ✅ evita bug UTC con YYYY-MM-DD */
const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const formatDateLabel = (iso: string, lang: Lang) => {
  const d = parseLocalDate(iso);
  const locale = lang === "en" ? "en-US" : "es-ES";
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const makeKey = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getGroupRange = (g: AvailableClassGroup) => {
  const startFromApi = g.start_date_iso ?? "";
  const endFromApi = g.end_date_iso ?? "";

  // ✅ prefer backend range
  if (startFromApi) return { start: startFromApi, end: endFromApi || startFromApi };

  // ⛑️ fallback: derive from sessions
  const dates = (g.sessions ?? [])
    .map((s) => s.date_iso)
    .filter(Boolean)
    .sort();

  const start = dates[0] ?? "";
  const end = dates[dates.length - 1] ?? start;
  return { start, end };
};

const formatRangeLabel = (g: AvailableClassGroup, lang: Lang) => {
  const { start, end } = getGroupRange(g);
  if (!start) return "";
  if (start === end) return formatDateLabel(start, lang);
  return `${formatDateLabel(start, lang)} – ${formatDateLabel(end, lang)}`;
};

const getMonthAnchor = (groups: AvailableClassGroup[], selectedGroup: AvailableClassGroup | null) => {
  if (selectedGroup?.start_date_iso) return parseLocalDate(selectedGroup.start_date_iso);
  const first = groups[0]?.sessions?.[0]?.date_iso;
  return first ? parseLocalDate(first) : new Date();
};

const buildRangeSetForMonth = (startIso: string, endIso: string, year: number, month: number) => {
  const set = new Set<string>();
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getFullYear() === year && d.getMonth() === month) set.add(makeKey(d));
  }
  return set;
};

const MiniCalendar: React.FC<{
  groups: AvailableClassGroup[];
  lang: Lang;
  selectedGroup: AvailableClassGroup | null;
}> = ({ groups, lang, selectedGroup }) => {
  const anchor = useMemo(() => getMonthAnchor(groups, selectedGroup), [groups, selectedGroup]);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekday = monthStart.getDay();

  const days: Date[] = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const daysWithSessions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const s of g.sessions ?? []) {
        const dt = parseLocalDate(s.date_iso);
        if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === month) {
          set.add(makeKey(dt));
        }
      }
    }
    return set;
  }, [groups, year, month]);

  const selectedRange = useMemo(() => {
    if (!selectedGroup) return new Set<string>();
    const { start, end } = getGroupRange(selectedGroup);
    if (!start) return new Set<string>();
    return buildRangeSetForMonth(start, end || start, year, month);
  }, [selectedGroup, year, month]);

  const locale = lang === "en" ? "en-US" : "es-ES";
  const monthLabel = monthStart.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const weekdayLabels =
    lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["D", "L", "M", "X", "J", "V", "S"];

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
          const inRange = selectedRange.has(key);

          const prev = new Date(d);
          prev.setDate(prev.getDate() - 1);
          const next = new Date(d);
          next.setDate(next.getDate() + 1);

          const prevInRange = selectedRange.has(makeKey(prev));
          const nextInRange = selectedRange.has(makeKey(next));

          const rangePosClass = inRange
            ? !prevInRange && nextInRange
              ? " mini-calendar-day--range-start"
              : prevInRange && !nextInRange
              ? " mini-calendar-day--range-end"
              : prevInRange && nextInRange
              ? " mini-calendar-day--range-mid"
              : " mini-calendar-day--range-single"
            : "";

          return (
            <div
              key={key}
              className={
                "mini-calendar-day" +
                (hasSession ? " mini-calendar-day--highlight" : "") +
                (inRange ? " mini-calendar-day--range" : "") +
                rangePosClass
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

  const [availableGroups, setAvailableGroups] = useState<AvailableClassGroup[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<AvailableClassGroup | null>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 460, behavior: "smooth" });
  };

  // ✅ Fetch once
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
          if (prev && normalized.some((g) => g.group_code === prev.group_code)) return prev;
          return normalized[0] ?? null;
        });
      } catch (err) {
        console.error("Error cargando clases:", err);
        setClassesError(translations[lang].noClassesError ?? "Could not load classes.");
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
    setStatus("idle");
    setErrorMessage("");
  };

  const getGroupSpotsLabel = (g: AvailableClassGroup) => {
    const minSpots = (g.sessions ?? []).reduce(
      (acc, s) => Math.min(acc, s.spots_left),
      Number.POSITIVE_INFINITY
    );
    const spots = Number.isFinite(minSpots) ? minSpots : 0;
    return `${spots} ${spots === 1 ? t("seats") : t("seatsPlural")} ${t("seatsAvailable")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroup) {
      setStatus("error");
      setErrorMessage(t("errorNoClass"));
      return;
    }
    if (!email) {
      setStatus("error");
      setErrorMessage(t("errorNoEmail"));
      return;
    }

    const { start, end } = getGroupRange(selectedGroup);

    // ✅ hard stop si no hay fechas válidas
    if (!start || !end) {
      setStatus("error");
      setErrorMessage(t("errorNoDates"));
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // ✅ IMPORTANTÍSIMO: esto es lo que tu BookingController valida
      await api.post("/api/bookings", {
        // tu backend usa `name` como title de la clase cuando NO envías class_id
        name: selectedGroup.title,
        email,
        start_date: start,
        end_date: end,
        trainer_name: selectedGroup.trainer_name ?? null,
        notes: `Enrollment for "${selectedGroup.title}" from ${start} to ${end}. (All sessions mandatory)`,
        // class_id: opcional -> si quieres amarrarlo, envíalo:
        // class_id: selectedGroup.sessions?.[0]?.id ?? null,
      });

      setStatus("success");
    } catch (err: any) {
      console.error("Error creando booking:", err);
      setStatus("error");

      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error sending booking.";

      const fieldErrors = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : "";

      setErrorMessage(fieldErrors ? `${backendMsg} ${fieldErrors}` : String(backendMsg));
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-card">
        <header className="booking-header">
          <div className="booking-header-left booking-header-logo">
            <img src="/logo.png" alt="Alonso & Alonso Academy" className="booking-logo" />
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
              <button type="button" className="booking-login-btn" onClick={() => navigate("/admin")}>
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

            {loadingClasses && <p className="form-message">{t("loadingClasses")}</p>}
            {classesError && <p className="form-message error">{classesError}</p>}

            {!loadingClasses && !classesError && (
              <>
                <div className="class-carousel">
                  <button type="button" className="carousel-btn carousel-btn--left" onClick={() => scrollCarousel(-1)}>
                    ‹
                  </button>

                  <div className="class-carousel-viewport" ref={carouselRef}>
                    <div className="class-carousel-track">
                      {availableGroups.map((g) => {
                        const isSelected = selectedGroup?.group_code === g.group_code;
                        const firstSession = g.sessions?.[0];

                        const dateLabel = formatRangeLabel(g, lang);
                        const timeLabel = firstSession ? firstSession.time_range : "";

                        const modalityDotClass = g.modality === "Online" ? "online" : "presencial";

                        return (
                          <button
                            key={g.group_code}
                            type="button"
                            className={"class-card class-card--carousel" + (isSelected ? " class-card--selected" : "")}
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
                              <span className="class-date">{dateLabel}</span>
                              <span className="class-time">{timeLabel}</span>
                            </div>

                            {!!g.description && <p className="class-card-desc">{g.description}</p>}

                            <div className="class-footer">
                              <span className="class-trainer">👤 {g.trainer_name}</span>
                              <span className="class-level">{g.level}</span>
                              <span className="class-spots">{getGroupSpotsLabel(g)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button type="button" className="carousel-btn carousel-btn--right" onClick={() => scrollCarousel(1)}>
                    ›
                  </button>
                </div>

                {selectedGroup && (
                  <div className="class-sessions class-sessions--below">
                    <div className="class-sessions-title">
                      {t("sessions")} ({selectedGroup.sessions_count})
                    </div>

                    <div className="class-sessions-list">
                      {(selectedGroup.sessions ?? []).map((s) => (
                        <div
                          key={s.id}
                          className="class-session-row class-session-row--readonly"
                          role="listitem"
                        >
                          <span className="class-session-date">{formatDateLabel(s.date_iso, lang)}</span>
                          <span className="class-session-time">{s.time_range}</span>
                          <span className="class-session-spots">
                            {s.spots_left} {s.spots_left === 1 ? t("seats") : t("seatsPlural")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="booking-detail-section">
            <div className="booking-detail-card">
              <MiniCalendar groups={availableGroups} lang={lang} selectedGroup={selectedGroup} />

              {!selectedGroup ? (
                <div className="booking-detail-empty">
                  <h3>{t("clickOnClassTitle")}</h3>
                  <p>{t("clickOnClassText")}</p>
                </div>
              ) : (
                <>
                  <div className="booking-detail-header">
                    <span className="booking-detail-label">{t("selectedClassLabel")}</span>
                    <h3>{selectedGroup.title}</h3>

                    <p className="booking-detail-meta">
                      Trainer: {selectedGroup.trainer_name} · {selectedGroup.level} · {selectedGroup.modality}
                    </p>

                    {selectedGroup.description ? <p className="booking-detail-desc">{selectedGroup.description}</p> : null}
                  </div>

                  <p className="booking-detail-meta">
                    <strong>{t("includesLabel")}:</strong> {selectedGroup.sessions_count} {t("sessions")} ({t("mandatoryLabel")}).
                  </p>

                  <form onSubmit={handleSubmit} className="booking-detail-form">
                    <div className="form-group">
                      <label htmlFor="email">{t("emailLabel")}</label>
                      <input
                        id="email"
                        type="email"
                        placeholder={t("emailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    {status === "error" && <p className="form-message error">⚠️ {errorMessage}</p>}
                    {status === "success" && <p className="form-message success">{t("successBooked")}</p>}

                    <button type="submit" className="booking-button" disabled={status === "loading"}>
                      {status === "loading" ? t("submitLoading") : t("submitLabel")}
                    </button>

                    <p className="booking-privacy">{t("privacyText")}</p>
                  </form>
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
