import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./BookingCalendar.css";
import Logo from "../assets/Logo.png";

type AvailableClass = {
  id: number;
  title: string;
  trainerName: string;
  dateLabel: string;
  dateISO: string;
  timeRange: string;
  modality: "Online" | "Presencial";
  level: string;
  spotsLeft: number;
  // 🔹 rango real de la clase (start/end)
  startDateISO: string;
  endDateISO: string;
  description?: string | null;
};

type Status = "idle" | "loading" | "success" | "error";
type Lang = "en" | "es";

// 🔤 Diccionario de traducciones
const translations: Record<Lang, Record<string, string>> = {
  en: {
    badge: "Available Classes",
    headerTitle: "Book Your Next Class",
    headerSubtitle:
      "Please reach out to our Training Team if you have questions or need further assistance",
    updatedTag: "Updated in Real Time",
    adminPanel: "Admin Panel",
    adminLogin: "Admin login",
    availableClassesTitle: "Available Classes this Month",
    availableClassesSubtitle:
      "Click on a class to view the details and make a reservation.",
    loadingClasses: "Loading Available Classes",
    noClassesError: "Could not load available classes.",
    noClasses: "No Available Classes this Month",
    clickOnClassTitle: "Click on an Available Class!",
    clickOnClassText:
      "Choose a class from the list on the left to view the details and reserve your spot.",
    selectedClassLabel: "Selected Class",
    emailLabel: "Please provide your A&A Email Address",
    emailPlaceholder: "youremail@yourcompany.com",
    errorNoClass: "You must select an available class.",
    errorNoEmail: "Corporate email is required.",
    genericError: "An error occurred while sending the booking.",
    unexpectedError: "An unexpected error occurred.",
    successBooked: "✅ Booked Successfully! We’ll contact you soon!",
    submitLoading: "Sending booking...",
    submitLabel: "Book this class",
    privacyText: "We’ll use your corporate email to confirm your attendance.",
    seats: "Seat",
    seatsPlural: "Seats",
    seatsAvailable: "Available",
  },
  es: {
    badge: "Clases disponibles",
    headerTitle: "Reserva tu próxima clase",
    headerSubtitle:
      "Selecciona una de las clases disponibles este mes y reserva tu cupo con tu correo corporativo.",
    updatedTag: "Actualizado en tiempo real",
    adminPanel: "Panel Admin",
    adminLogin: "Inicio de sesión admin",
    availableClassesTitle: "Clases disponibles este mes",
    availableClassesSubtitle:
      "Haz clic en una clase para ver el detalle y reservar.",
    loadingClasses: "Cargando clases disponibles",
    noClassesError: "No se pudieron cargar las clases disponibles.",
    noClasses: "No hay clases disponibles este mes",
    clickOnClassTitle: "¡Haz clic en una clase disponible!",
    clickOnClassText:
      "Elige una clase de la lista de la izquierda para ver el detalle y reservar tu cupo.",
    selectedClassLabel: "Clase seleccionada",
    emailLabel: "Correo corporativo para la reserva",
    emailPlaceholder: "tucorreo@tuempresa.com",
    errorNoClass: "Debes seleccionar una clase disponible.",
    errorNoEmail: "El correo corporativo es obligatorio.",
    genericError: "Ocurrió un error al enviar la reserva.",
    unexpectedError: "Ocurrió un error inesperado.",
    successBooked:
      "✅ ¡Reserva enviada! Nos pondremos en contacto contigo pronto.",
    submitLoading: "Enviando reserva...",
    submitLabel: "Reservar esta clase",
    privacyText: "Usaremos tu correo corporativo para confirmar tu asistencia.",
    seats: "cupo",
    seatsPlural: "cupos",
    seatsAvailable: "disponibles",
  },
};

// ==========================
// 🗓️ MINI CALENDARIO GLOBAL
// ==========================
type MiniCalendarProps = {
  classes: AvailableClass[];
  lang: Lang;
};

const MiniCalendar: React.FC<MiniCalendarProps> = ({ classes, lang }) => {
  if (!classes || classes.length === 0) {
    return null;
  }

  // Tomamos el mes del startDate de la primera clase
  const ref = new Date(classes[0].startDateISO || classes[0].dateISO);
  if (Number.isNaN(ref.getTime())) return null;

  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0–11

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Día de la semana del primer día (0=Dom, 1=Lun, etc.)
  const firstWeekday = monthStart.getDay();

  // Generar todos los días de ese mes
  const days: Date[] = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // 🔹 Set con todas las fechas (YYYY-MM-DD) que tengan al menos una clase
  const highlighted = new Set<string>();

  const makeKey = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  classes.forEach((cls) => {
    const start = new Date(cls.startDateISO);
    const end = new Date(cls.endDateISO);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const cur = new Date(start);
    while (cur <= end) {
      // solo añadimos si está en el mismo mes que el calendario
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        highlighted.add(makeKey(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const locale = lang === "en" ? "en-US" : "es-ES";
  const monthLabel = monthStart.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const weekdayLabels =
    lang === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <div className="booking-mini-calendar">
      <div className="mini-calendar-header">
        <span className="mini-calendar-title">{monthLabel}</span>
        <span className="mini-calendar-hint">
          {lang === "en"
            ? "Highlighted: days with classes"
            : "Resaltado: días con clases"}
        </span>
      </div>

      <div className="mini-calendar-grid">
        {weekdayLabels.map((w) => (
          <div key={w} className="mini-calendar-weekday">
            {w}
          </div>
        ))}

        {/* espacios en blanco antes del primer día */}
        {Array.from({ length: firstWeekday }).map((_, idx) => (
          <div key={`blank-${idx}`} className="mini-calendar-day empty" />
        ))}

        {/* días del mes */}
        {days.map((d) => {
          const key = makeKey(d);
          const inRange = highlighted.has(key);
          const dayNumber = d.getDate();

          return (
            <div
              key={key}
              className={
                "mini-calendar-day" +
                (inRange ? " mini-calendar-day--highlight" : "")
              }
            >
              {dayNumber}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BookingCalendar: React.FC = () => {
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>(
    []
  );
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // 🌍 idioma
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => translations[lang][key];

  // 🔹 Cargar clases públicas para el calendario/landing
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        setClassesError(null);

        const res = await api.get("/api/classes");
        const data = res.data;

        type BackendClass = {
          id: number;
          title: string;
          trainer_name: string;
          date_iso: string;
          time_range: string;
          modality: "Online" | "Presencial";
          level: string;
          spots_left: number;
          start_date?: string;
          end_date?: string;
          description?: string | null;
        };

        const list = (data.classes ?? data) as BackendClass[];

        const mapped: AvailableClass[] = list.map((cls) => {
          const startDateISO = cls.start_date ?? cls.date_iso;
          const endDateISO = cls.end_date ?? cls.date_iso;

          const d = new Date(startDateISO);
          const locale = lang === "en" ? "en-US" : "es-ES";

          const dateLabel = d.toLocaleDateString(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          return {
            id: cls.id,
            title: cls.title,
            trainerName: cls.trainer_name,
            dateLabel,
            dateISO: cls.date_iso,
            timeRange: cls.time_range,
            modality: cls.modality,
            level: cls.level,
            spotsLeft: cls.spots_left,
            startDateISO,
            endDateISO,
            description: cls.description ?? null, // 👈 SOLO una vez
          };
        });

        setAvailableClasses(mapped);
      } catch (err) {
        console.error("Error cargando clases:", err);
        setClassesError(t("noClassesError"));
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [lang]);

  // 🔹 Verificar si hay admin logueado
  useEffect(() => {
    const checkAdmin = () => {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        setIsAdmin(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAdmin(true);
    };

    checkAdmin();
  }, []);

  const [selectedClass, setSelectedClass] = useState<AvailableClass | null>(
    null
  );
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSelectClass = (cls: AvailableClass) => {
    setSelectedClass(cls);
    setStatus("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      setStatus("error");
      setErrorMessage(t("errorNoClass"));
      return;
    }

    if (!email) {
      setStatus("error");
      setErrorMessage(t("errorNoEmail"));
      return;
    }

    const payload = {
      class_id: selectedClass.id,
      name: selectedClass.title,
      email,
      notes: `Reserva para la clase "${selectedClass.title}" el ${selectedClass.dateLabel} (${selectedClass.timeRange})`,
      start_date: selectedClass.dateISO,
      end_date: selectedClass.dateISO,
      trainer_name: selectedClass.trainerName,
      original_start_date: selectedClass.dateISO,
      original_end_date: selectedClass.dateISO,
      original_training_days: 1,
      new_training_days: 1,
    };

    try {
      setStatus("loading");
      setErrorMessage("");

      await api.get("/sanctum/csrf-cookie");
      await api.post("/api/bookings", payload);

      setStatus("success");
      setEmail("");
    } catch (err: any) {
      console.error("❌ Error:", err);
      if (err.response) {
        setErrorMessage(err.response.data?.message ?? t("genericError"));
      } else {
        setErrorMessage(t("unexpectedError"));
      }
      setStatus("error");
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-card">
        <header className="booking-header">
          <div>
            <div className="booking-badge">{t("badge")}</div>
            <h1>{t("headerTitle")}</h1>
            <p className="booking-subtitle">{t("headerSubtitle")}</p>
          </div>

          <div className="booking-header-logo">
            <img
              src={Logo}
              alt="Alonso & Alonso Academy"
              className="booking-logo"
            />
          </div>

          <div className="booking-header-right">
            <div className="booking-header-tag">
              <span className="dot" />
              <span>{t("updatedTag")}</span>
            </div>

            {/* 🌍 Toggle idioma */}
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

            <div className="class-list">
              {loadingClasses && (
                <p className="form-message">{t("loadingClasses")}</p>
              )}

              {classesError && (
                <p className="form-message error">{classesError}</p>
              )}

              {!loadingClasses &&
                !classesError &&
                availableClasses.length === 0 && (
                  <p className="form-message">{t("noClasses")}</p>
                )}

              {!loadingClasses &&
                !classesError &&
                availableClasses.length > 0 &&
                availableClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    className={
                      "class-card" +
                      (selectedClass?.id === cls.id
                        ? " class-card--selected"
                        : "")
                    }
                    onClick={() => handleSelectClass(cls)}
                  >
                    <div className="class-card-top">
                      <span className="class-title">{cls.title}</span>
                      <span className="class-badge">
                        <span
                          className={`dot ${
                            cls.modality === "Online" ? "online" : "presencial"
                          }`}
                        />
                        {cls.modality === "Online" ? "Online" : "Presencial"}
                      </span>
                    </div>

                    <div className="class-meta">
                      <span className="class-date">{cls.dateLabel}</span>
                      <span className="class-time">{cls.timeRange}</span>
                    </div>

                    <div className="class-footer">
                      <span className="class-trainer">
                        👤 {cls.trainerName}
                      </span>
                      <span className="class-level">{cls.level}</span>
                      <span className="class-spots">
                        {cls.spotsLeft}{" "}
                        {cls.spotsLeft === 1 ? t("seats") : t("seatsPlural")}{" "}
                        {t("seatsAvailable")}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>

          <section className="booking-detail-section">
            <div className="booking-detail-card">
              {/* 🗓️ Calendario SIEMPRE visible con todas las clases */}
              <MiniCalendar classes={availableClasses} lang={lang} />

              {!selectedClass ? (
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
                    <h3>{selectedClass.title}</h3>
                    <p className="booking-detail-meta">
                      {selectedClass.dateLabel} · {selectedClass.timeRange}
                      <br />
                      Trainer: {selectedClass.trainerName} ·{" "}
                      {selectedClass.level} · {selectedClass.modality}
                    </p>

                    {selectedClass.description && (
                      <p className="booking-detail-description">
                        {selectedClass.description}
                      </p>
                    )}
                  </div>

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

                    {status === "error" && (
                      <p className="form-message error">⚠️ {errorMessage}</p>
                    )}

                    {status === "success" && (
                      <p className="form-message success">
                        {t("successBooked")}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="booking-button"
                      disabled={status === "loading"}
                    >
                      {status === "loading"
                        ? t("submitLoading")
                        : t("submitLabel")}
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
