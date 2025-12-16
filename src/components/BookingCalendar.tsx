import React, { useEffect, useMemo, useState, useRef } from "react";
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
};

const translations: Record<Lang, Record<string, string>> = {
  en: {
    updatedTag: "Updated",
    adminPanel: "Admin Panel",
    adminLogin: "Admin Login",
    availableClassesTitle: "AVAILABLE CLASSES THIS MONTH",
    availableClassesSubtitle: "Click on a class to view the details and make a reservation.",
    loadingClasses: "Loading classes...",
    noClassesError: "Could not load classes. Please try again later.",
    clickOnClassTitle: "Select a class",
    clickOnClassText: "Click on a class on the left to see details and sessions.",
    selectedClassLabel: "SELECTED CLASS",
    emailLabel: "Please provide your A&A Email Address",
    emailPlaceholder: "youremail@yourcompany.com",
    errorNoClass: "Please select a class first.",
    errorNoSession: "Please select a session time.",
    errorNoEmail: "Please enter your email.",
    submitLabel: "Book this class",
    submitLoading: "Booking...",
    successBooked: "✅ Booking submitted! You’ll receive a confirmation email.",
    privacyText: "We’ll use your corporate email to confirm your attendance.",
    seats: "seat",
    seatsPlural: "seats",
    seatsAvailable: "Available",
    sessions: "Sessions",
    highlightedHint: "Highlighted: days with classes",
    selectedSession: "Selected session",
  },
  es: {
    updatedTag: "Actualizado",
    adminPanel: "Panel Admin",
    adminLogin: "Login Admin",
    availableClassesTitle: "CLASES DISPONIBLES ESTE MES",
    availableClassesSubtitle: "Haz click en una clase para ver detalles y reservar.",
    loadingClasses: "Cargando clases...",
    noClassesError: "No se pudieron cargar las clases. Intenta más tarde.",
    clickOnClassTitle: "Selecciona una clase",
    clickOnClassText: "Haz click en una clase a la izquierda para ver detalles y sesiones.",
    selectedClassLabel: "CLASE SELECCIONADA",
    emailLabel: "Por favor ingresa tu correo corporativo A&A",
    emailPlaceholder: "tucorreo@tuempresa.com",
    errorNoClass: "Selecciona una clase primero.",
    errorNoSession: "Selecciona una sesión (hora) por favor.",
    errorNoEmail: "Ingresa tu correo por favor.",
    submitLabel: "Reservar esta clase",
    submitLoading: "Reservando...",
    successBooked: "✅ Reserva enviada. Te llegará un correo de confirmación.",
    privacyText: "Usaremos tu correo corporativo para confirmar tu asistencia.",
    seats: "cupo",
    seatsPlural: "cupos",
    seatsAvailable: "Disponibles",
    sessions: "Sesiones",
    highlightedHint: "Resaltado: días con clases",
    selectedSession: "Sesión seleccionada",
  },
};

const formatDateLabel = (iso: string, lang: Lang) => {
  const d = new Date(iso);
  const locale = lang === "en" ? "en-US" : "es-ES";
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getMonthAnchor = (groups: AvailableClassGroup[]) => {
  const first = groups[0]?.sessions?.[0]?.date_iso;
  return first ? new Date(first) : new Date();
};

const MiniCalendar: React.FC<{ groups: AvailableClassGroup[]; lang: Lang }> = ({
  groups,
  lang,
}) => {
  const anchor = useMemo(() => getMonthAnchor(groups), [groups]);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekday = monthStart.getDay();

  const days: Date[] = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const makeKey = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const highlighted = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const s of g.sessions) {
        const dt = new Date(s.date_iso);
        if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === year && dt.getMonth() === month) {
          set.add(makeKey(dt));
        }
      }
    }
    return set;
  }, [groups, year, month]);

  const locale = lang === "en" ? "en-US" : "es-ES";
  const monthLabel = monthStart.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const weekdayLabels =
    lang === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["D", "L", "M", "X", "J", "V", "S"];

  const t = (k: string) => translations[lang][k];

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
          const inRange = highlighted.has(key);
          return (
            <div
              key={key}
              className={"mini-calendar-day" + (inRange ? " mini-calendar-day--highlight" : "")}
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
  const t = (key: string) => translations[lang][key];

  const [availableGroups, setAvailableGroups] = useState<AvailableClassGroup[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<AvailableClassGroup | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // ✅ carousel ref
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 460, behavior: "smooth" }); // ancho aprox de card + gap
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        setClassesError(null);

        const res = await api.get("/api/classes-grouped");
        const data = res.data;
        const list = (data?.classes ?? data) as AvailableClassGroup[];

        const normalized = Array.isArray(list) ? list : [];
        setAvailableGroups(normalized);

        // Si no hay selección aún, autoselecciona la primera
        if (normalized.length && !selectedGroup) {
          setSelectedGroup(normalized[0]);
          setSelectedSessionId(normalized[0]?.sessions?.[0]?.id ?? null);
        }
      } catch (err) {
        console.error("Error cargando clases:", err);
        setClassesError(t("noClassesError"));
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setIsAdmin(false);
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setIsAdmin(true);
  }, []);

  const selectedSession = useMemo(() => {
    if (!selectedGroup || !selectedSessionId) return null;
    return selectedGroup.sessions.find((s) => s.id === selectedSessionId) ?? null;
  }, [selectedGroup, selectedSessionId]);

  const handleSelectGroup = (g: AvailableClassGroup) => {
    setSelectedGroup(g);
    setStatus("idle");
    setErrorMessage("");
    setSelectedSessionId(g.sessions?.[0]?.id ?? null);
  };

  const getGroupSpotsLabel = (g: AvailableClassGroup) => {
    const minSpots = g.sessions.reduce(
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
    if (!selectedSessionId) {
      setStatus("error");
      setErrorMessage(t("errorNoSession"));
      return;
    }
    if (!email) {
      setStatus("error");
      setErrorMessage(t("errorNoEmail"));
      return;
    }

    const session = selectedGroup.sessions.find((s) => s.id === selectedSessionId);
    if (!session) {
      setStatus("error");
      setErrorMessage(t("errorNoSession"));
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const payload = {
        class_id: session.id,
        name: selectedGroup.title,
        email,
        trainer_name: selectedGroup.trainer_name ?? null,
        start_date: session.date_iso,
        end_date: session.date_iso,
        notes: `Booking for "${selectedGroup.title}" on ${session.date_iso} (${session.time_range})`,
      };

      await api.post("/api/bookings", payload);
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
          {/* LEFT */}
          <section className="class-list-section">
            <div className="class-list-header">
              <h2>{t("availableClassesTitle")}</h2>
              <p>{t("availableClassesSubtitle")}</p>
            </div>

            {loadingClasses && <p className="form-message">{t("loadingClasses")}</p>}
            {classesError && <p className="form-message error">{classesError}</p>}

            {!loadingClasses && !classesError && (
              <>
                {/* ✅ CAROUSEL */}
                <div className="class-carousel">
                  <button
                    type="button"
                    className="carousel-btn carousel-btn--left"
                    onClick={() => scrollCarousel(-1)}
                    aria-label="Previous"
                  >
                    ‹
                  </button>

                  <div className="class-carousel-viewport" ref={carouselRef}>
                    <div className="class-carousel-track">
                      {availableGroups.map((g) => {
                        const isSelected = selectedGroup?.group_code === g.group_code;
                        const firstSession = g.sessions?.[0];

                        const dateLabel = firstSession ? formatDateLabel(firstSession.date_iso, lang) : "";
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

                  <button
                    type="button"
                    className="carousel-btn carousel-btn--right"
                    onClick={() => scrollCarousel(1)}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </div>

                {/* ✅ SESSIONS (debajo del carrusel) */}
                {selectedGroup && (
                  <div className="class-sessions class-sessions--below">
                    <div className="class-sessions-title">
                      {t("sessions")} ({selectedGroup.sessions_count})
                    </div>

                    <div className="class-sessions-list">
                      {selectedGroup.sessions.map((s) => {
                        const picked = selectedSessionId === s.id;

                        return (
                          <button
                            type="button"
                            key={s.id}
                            className={"class-session-row" + (picked ? " class-session-row--selected" : "")}
                            onClick={() => setSelectedSessionId(s.id)}
                          >
                            <span className="class-session-date">{s.date_iso}</span>
                            <span className="class-session-time">{s.time_range}</span>
                            <span className="class-session-spots">
                              {s.spots_left} {s.spots_left === 1 ? t("seats") : t("seatsPlural")}
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

          {/* RIGHT */}
          <section className="booking-detail-section">
            <div className="booking-detail-card">
              <MiniCalendar groups={availableGroups} lang={lang} />

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

                    {selectedGroup.description ? (
                      <p className="booking-detail-desc">{selectedGroup.description}</p>
                    ) : null}
                  </div>

                  {selectedSession ? (
                    <p className="booking-detail-meta">
                      <strong>{t("selectedSession")}:</strong> {selectedSession.date_iso} · {selectedSession.time_range}
                    </p>
                  ) : null}

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
