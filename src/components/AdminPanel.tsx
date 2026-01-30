import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./AdminPanel.css";

type BookingStatus = "pending" | "accepted" | "denied";

type Booking = {
  id: number;
  name: string;
  email: string;
  notes: string | null;
  start_date: string;
  end_date: string;
  trainer_name: string | null;

  original_start_date: string | null;
  original_end_date: string | null;
  original_training_days: number | null;
  new_training_days: number | null;

  created_at: string;
  status: BookingStatus;
  calendar_url?: string | null;

  // legacy (si aún llega, lo soportamos)
  attendedbutton?: boolean | null;
};

type BookingSession = {
  id: number; // class_sessions.id
  date_iso: string; // YYYY-MM-DD
  time_range: string; // "HH:mm - HH:mm" (o "—")
  calendar_url?: string | null;
  attended?: boolean | null; // derivado del pivot (o set en backend)
};

type BookingWithSessions = Booking & {
  sessions?: BookingSession[];
};

type AvailableClass = {
  id: number;
  title: string;
  trainer_id: number | null;
  trainer_name: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  modality: "Online" | "Presencial";
  spots_left: number;
  description: string | null;
  group_code?: string | null;
};

type GroupedSession = {
  id: number;
  date_iso: string;
  time_range: string;
  spots_left: number;
};

type GroupedClass = {
  group_code: string;
  title: string;
  trainer_name: string | null;
  modality: "Online" | "Presencial";
  level?: string | null;
  description: string | null;
  sessions_count: number;
  sessions: GroupedSession[];
};

type Trainer = { id: number; name: string };
type Tab = "classes" | "stats";
type Lang = "en" | "es";

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
];

const translations: Record<Lang, Record<string, string>> = {
  en: {
    adminBadge: "Admin Panel",
    adminTitle: "Training Management",
    adminSubtitle: "Manage available classes and review key statistics.",
    backToCalendar: "← Calendar",
    logout: "Log out",
    tabClasses: "Available Classes",
    tabStats: "Statistics",

    addNewClass: "+ New Class",
    noClasses: "No Classes at this time.",

    columnName: "Name",
    columnEmail: "Corporate Email",
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
    labelStartDate: "Start Date (optional)",
    labelEndDate: "End Date (optional)",
    labelType: "Type",
    labelSeats: "Available Seats",
    labelDescription: "Short description",
    optionSelectTrainer: "Select a Trainer",
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

    statsNoTrainer: "No trainer assigned",
    statsColumnAttendance: "Attended?",
    attendanceYes: "Attended",
    attendanceNo: "Not attended",
    attendanceNotMarked: "Not marked",

    enrolledTitle: "People enrolled",
    enrolledSubtitle: "Accepted bookings (inscribed users).",
    statsNoData: "There are no requests yet.",

    howManyAttended: "How many sessions were attended",
    howManyCompleted: "How many sessions were completed",
    kpiAccepted: "Accepted",
    kpiNotMarked: "Not marked",
    kpiDidNotAttend: "How many sessions were not attended",

    paginationPrev: "Previous",
    paginationNext: "Next",

    downloadCsv: "Download CSV",
  },
  es: {
    adminBadge: "Panel Admin",
    adminTitle: "Gestión de formaciones",
    adminSubtitle: "Administra clases disponibles y revisa estadísticas clave.",
    backToCalendar: "← Calendario",
    logout: "Cerrar sesión",
    tabClasses: "Clases disponibles",
    tabStats: "Estadísticas",

    addNewClass: "+ Nueva clase",
    noClasses: "No hay clases por el momento.",

    columnName: "Nombre",
    columnEmail: "Correo corporativo",
    columnTrainer: "Trainer",

    btnDeleteClass: "Eliminar",
    confirmDeleteClassGroup:
      "¿Eliminar este grupo de clases y todas sus sesiones?",

    classesTitle: "Clases disponibles",
    sessionsCount: "Sesiones",
    expand: "Ver",
    collapse: "Ocultar",
    carouselPrev: "Anterior",
    carouselNext: "Siguiente",
    sessionsPanelTitle: "Sesiones de",

    modalNewClass: "Nueva clase",
    modalEditClass: "Editar clase",
    labelClassTitle: "Título de la clase",
    labelTrainer: "Trainer",
    labelStartDate: "Fecha inicio (opcional)",
    labelEndDate: "Fecha fin (opcional)",
    labelType: "Modalidad",
    labelSeats: "Cupos",
    labelDescription: "Descripción breve",
    optionSelectTrainer: "Selecciona un trainer",
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

    statsNoTrainer: "Sin trainer asignado",
    statsColumnAttendance: "¿Asistió?",
    attendanceYes: "Asistió",
    attendanceNo: "No asistió",
    attendanceNotMarked: "Sin marcar",

    enrolledTitle: "Personas inscritas",
    enrolledSubtitle: "Reservas aceptadas (inscritos).",
    statsNoData: "Aún no hay solicitudes.",

    howManyAttended: "¿Cuántas sesiones asistieron?",
    howManyCompleted: "¿Cuántas sesiones completaron?",
    kpiAccepted: "Aceptados",
    kpiNotMarked: "Sin marcar",
    kpiDidNotAttend: "¿Cuántas sesiones no asistieron?",

    paginationPrev: "Anterior",
    paginationNext: "Siguiente",

    downloadCsv: "Descargar CSV",
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
  const t = useCallback(
    (key: string) => translations[lang][key] ?? key,
    [lang]
  );

  const [activeTab, setActiveTab] = useState<Tab>("classes");

  /** BOOKINGS (solo para alimentar STATS) */
  const [bookings, setBookings] = useState<BookingWithSessions[]>([]);

  /** CLASSES (grouped) */
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [expandedGroupCode, setExpandedGroupCode] = useState<string | null>(
    null
  );
  const toggleGroup = (code: string) =>
    setExpandedGroupCode((prev) => (prev === code ? null : code));

  /** Carousel */
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  /** New/Edit class modal */
  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);
  const [editClass, setEditClass] = useState<AvailableClass | null>(null);

  /** bookings server pagination (se mantiene si tu endpoint viene paginado) */
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPerPage] = useState(10);
  const [bookingsLastPage, setBookingsLastPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);

  /** Sessions Draft */
  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { date_iso: "", start_time: "", end_time: "" },
  ]);

  const setCount = (n: number) => {
    const safe = Math.max(1, Math.min(20, Number.isFinite(n) ? n : 1));
    setSessionsCount(safe);
    setSessions((prev) => {
      const next = [...prev];
      while (next.length < safe)
        next.push({ date_iso: "", start_time: "", end_time: "" });
      return next.slice(0, safe);
    });
  };

  const selectedGroup = useMemo(() => {
    if (!expandedGroupCode) return null;
    return (
      groupedClasses.find((g) => g.group_code === expandedGroupCode) ?? null
    );
  }, [expandedGroupCode, groupedClasses]);

  const computedRange = useMemo(() => {
    const dates = sessions
      .map((s) => s.date_iso)
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return { start: "", end: "" };
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [sessions]);

  /** Fetch */
  const fetchBookings = useCallback(
    async (page = bookingsPage) => {
      try {
        const res = await api.get("/api/admin/bookings", {
          params: { page, per_page: bookingsPerPage },
        });

        const data = res.data;
        const list: BookingWithSessions[] = data.bookings ?? [];
        setBookings(Array.isArray(list) ? list : []);

        const p = data.pagination;
        if (p) {
          setBookingsPage(p.current_page);
          setBookingsLastPage(p.last_page);
          setBookingsTotal(p.total);
        }
      } catch (err) {
        console.error("Error cargando reservas:", err);
        setBookings([]);
      }
    },
    [bookingsPage, bookingsPerPage]
  );

  const fetchGrouped = useCallback(async () => {
    try {
      const res = await api.get("/api/classes-grouped");
      const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
      setGroupedClasses(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error cargando clases agrupadas:", err);
      setGroupedClasses([]);
    }
  }, []);

  /** Mount: trae bookings para STATS (aunque no haya tab bookings) */
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /** When entering classes tab */
  useEffect(() => {
    if (activeTab !== "classes") return;
    fetchGrouped();
  }, [activeTab, fetchGrouped]);

  /** Helpers */
  const formatDate = (value: string) => {
    if (!value) return "—";
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${m}/${d}/${y}`;
    return value;
  };

  const deriveBookingAttendance = (b: BookingWithSessions): boolean | null => {
    const sess = (b.sessions ?? []).filter(
      (s) => s && typeof s.id === "number" && s.id > 0
    );
    if (sess.length === 0) {
      return typeof b.attendedbutton === "undefined"
        ? null
        : b.attendedbutton ?? null;
    }
    if (sess.some((s) => s.attended === false)) return false;
    if (sess.some((s) => s.attended === true)) return true;
    return null;
  };

  const attendanceLabelFromValue = (val: boolean | null | undefined) => {
    if (val === true) return t("attendanceYes");
    if (val === false) return t("attendanceNo");
    return t("attendanceNotMarked");
  };

  const attendanceLabelBooking = (b: BookingWithSessions) =>
    attendanceLabelFromValue(deriveBookingAttendance(b));

  /** DELETE group (all sessions) */
  const deleteClassGroup = async (g: GroupedClass) => {
    const ok = window.confirm(t("confirmDeleteClassGroup"));
    if (!ok) return;

    try {
      await ensureCsrf();
      for (const s of g.sessions) {
        await api.delete(`/api/admin/classes/${s.id}`);
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
    setEditClass({
      id: 0,
      title: "",
      trainer_id: null,
      trainer_name: null,
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      modality: "Online",
      spots_left: 0,
      description: null,
      group_code: null,
    });
    setShowClassModal(true);

    setCount(1);
    setSessions([{ date_iso: "", start_time: "", end_time: "" }]);
  };

  const openEditClassModal = (group: GroupedClass) => {
    setIsNewClass(false);

    const first = group.sessions?.[0];
    const times = parseTimeRange(first?.time_range || "");
    const sortedDates = [...group.sessions].map((s) => s.date_iso).sort();
    const start = sortedDates[0] || "";
    const end = sortedDates[sortedDates.length - 1] || start;

    setEditClass({
      id: first?.id ?? 0,
      title: group.title,
      trainer_id: null,
      trainer_name: group.trainer_name ?? null,
      start_date: start,
      end_date: end,
      start_time: times.start_time,
      end_time: times.end_time,
      modality: group.modality,
      spots_left: first?.spots_left ?? 0,
      description: group.description ?? null,
      group_code: group.group_code,
    });

    setCount(group.sessions.length || 1);
    setSessions(
      (group.sessions || []).map((s) => ({
        id: s.id,
        date_iso: s.date_iso,
        ...parseTimeRange(s.time_range),
      }))
    );

    setShowClassModal(true);
  };

  /** SAVE class */
  const saveClassChanges = async () => {
    if (!editClass) return;

    const cleanSessions = sessions.map((s) => ({
      ...s,
      date_iso: (s.date_iso || "").trim(),
      start_time: (s.start_time || "").trim(),
      end_time: (s.end_time || "").trim(),
    }));

    const missing = cleanSessions.some(
      (s) => !s.date_iso || !s.start_time || !s.end_time
    );
    if (missing) {
      alert("Please set date + start + end time for every session.");
      return;
    }

    const rangeStart = (editClass.start_date || computedRange.start || "").trim();
    const rangeEnd = (
      editClass.end_date ||
      computedRange.end ||
      rangeStart ||
      ""
    ).trim();

    if (rangeStart && rangeEnd) {
      const out = cleanSessions.some(
        (s) => s.date_iso < rangeStart || s.date_iso > rangeEnd
      );
      if (out) {
        alert("One or more sessions are outside the selected date range.");
        return;
      }
    }

    try {
      await ensureCsrf();

      const payload = {
        title: editClass.title,
        trainer_name: editClass.trainer_name,
        start_date: rangeStart,
        end_date: rangeEnd,
        start_time: cleanSessions[0].start_time,
        end_time: cleanSessions[0].end_time,
        modality: editClass.modality,
        spots_left: editClass.spots_left,
        description: editClass.description ?? null,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data?.class ?? res.data;

        await api.put(`/api/admin/classes/${saved.id}/sessions`, {
          sessions: [
            {
              id: saved.id,
              date_iso: cleanSessions[0].date_iso,
              start_time: cleanSessions[0].start_time,
              end_time: cleanSessions[0].end_time,
            },
            ...cleanSessions.slice(1).map((s) => ({
              date_iso: s.date_iso,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          ],
        });
      } else {
        await api.put(`/api/admin/classes/${editClass.id}`, payload);

        await api.put(`/api/admin/classes/${editClass.id}/sessions`, {
          sessions: cleanSessions.map((s) => ({
            id: s.id,
            date_iso: s.date_iso,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        });
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

  /** inscritos */
  const enrolled = useMemo(() => {
    return [...bookings]
      .filter((b) => b.status === "accepted")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [bookings]);

  /** enrolled pagination (LOCAL) */
  const ENROLLED_PAGE_SIZE = 8;
  const [enrolledPage, setEnrolledPage] = useState(1);

  useEffect(() => {
    setEnrolledPage(1);
  }, [enrolled.length]);

  const enrolledTotalPages = Math.max(
    1,
    Math.ceil(enrolled.length / ENROLLED_PAGE_SIZE)
  );
  const enrolledPageSafe = Math.min(enrolledPage, enrolledTotalPages);

  const enrolledSlice = useMemo(() => {
    const start = (enrolledPageSafe - 1) * ENROLLED_PAGE_SIZE;
    return enrolled.slice(start, start + ENROLLED_PAGE_SIZE);
  }, [enrolled, enrolledPageSafe]);

  const goPrevEnrolled = () => setEnrolledPage((p) => Math.max(1, p - 1));
  const goNextEnrolled = () =>
    setEnrolledPage((p) => Math.min(enrolledTotalPages, p + 1));

  /** KPIs (por sesiones) */
  const sessionStats = useMemo(() => {
    const acceptedBookings = bookings.filter((b) => b.status === "accepted");

    let totalSessions = 0;
    let attendedSessions = 0;
    let notMarkedSessions = 0;
    let notAttendedSessions = 0;

    for (const b of acceptedBookings) {
      const sess = (b.sessions ?? []).filter((s) => s && s.id && s.id > 0);

      if (sess.length === 0) {
        totalSessions += 1;
        const v = deriveBookingAttendance(b);
        if (v === true) attendedSessions += 1;
        else if (v === false) notAttendedSessions += 1;
        else notMarkedSessions += 1;
        continue;
      }

      totalSessions += sess.length;

      for (const s of sess) {
        if (s.attended === true) attendedSessions += 1;
        else if (s.attended === false) notAttendedSessions += 1;
        else notMarkedSessions += 1;
      }
    }

    const completedSessions = attendedSessions;

    return {
      acceptedBookings: acceptedBookings.length,
      totalSessions,
      attendedSessions,
      completedSessions,
      notMarkedSessions,
      notAttendedSessions,
    };
  }, [bookings]);

  const statsKPIs = useMemo(() => {
    return {
      acceptedTotal: sessionStats.acceptedBookings,
      attended: sessionStats.attendedSessions,
      completed: sessionStats.completedSessions,
      notMarked: sessionStats.notMarkedSessions,
    };
  }, [sessionStats]);

  const didNotAttendCount = useMemo(() => {
    return sessionStats.notAttendedSessions;
  }, [sessionStats]);

  /** CSV EXPORT (STATS) */
  const csvEscape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const handleDownloadStatsCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);

    const kpiRows: string[][] = [
      ["KPI", "Value"],
      [t("kpiAccepted"), String(statsKPIs.acceptedTotal)],
      [t("howManyAttended"), String(statsKPIs.attended)],
      [t("howManyCompleted"), String(statsKPIs.completed)],
      [t("kpiNotMarked"), String(statsKPIs.notMarked)],
      [t("kpiDidNotAttend"), String(didNotAttendCount)],
    ];

    const detailRows: string[][] = [
      [
        "booking_id",
        "name",
        "email",
        "trainer",
        "status",
        "session_number",
        "sessions_total",
        "date_iso",
        "time_range",
        "attended",
      ],
    ];

    const accepted = bookings.filter((b) => b.status === "accepted");

    for (const b of accepted) {
      const sess = (b.sessions ?? []).filter((s) => s && s.id && s.id > 0);

      if (sess.length === 0) {
        const v = deriveBookingAttendance(b);
        detailRows.push([
          String(b.id),
          b.name,
          b.email,
          b.trainer_name ?? "",
          b.status,
          "1",
          "1",
          b.start_date ?? "",
          "",
          v === true ? "true" : v === false ? "false" : "",
        ]);
        continue;
      }

      const sorted = [...sess].sort((a, c) => {
        const d = (a.date_iso || "").localeCompare(c.date_iso || "");
        if (d !== 0) return d;
        return (a.time_range || "").localeCompare(c.time_range || "");
      });

      sorted.forEach((s, idx) => {
        detailRows.push([
          String(b.id),
          b.name,
          b.email,
          b.trainer_name ?? "",
          b.status,
          String(idx + 1),
          String(sorted.length),
          s.date_iso ?? "",
          s.time_range ?? "",
          s.attended === true ? "true" : s.attended === false ? "false" : "",
        ]);
      });
    }

    const rows: string[][] = [
      ["STATS EXPORT", stamp],
      [],
      ...kpiRows,
      [],
      ["DETAIL (accepted bookings - per session)"],
      [],
      ...detailRows,
    ];

    downloadCsv(`stats_export_${stamp}.csv`, rows);
  };

  /** Range helpers */
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toISO = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const addDays = (iso: string, days: number) => {
    const dt = toDate(iso);
    dt.setDate(dt.getDate() + days);
    return toISO(dt);
  };

  const diffDays = (a: string, b: string) => {
    const da = toDate(a);
    const db = toDate(b);
    const ms = db.getTime() - da.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  };

  const redistributeSessionsToRange = (startISO: string, endISO: string) => {
    if (!startISO || !endISO) return;
    if (endISO < startISO) return;

    const n = sessions.length;

    if (n <= 1) {
      setSessions((prev) =>
        prev.map((s, idx) => (idx === 0 ? { ...s, date_iso: startISO } : s))
      );
      return;
    }

    const total = diffDays(startISO, endISO);
    const step = total / (n - 1);

    setSessions((prev) =>
      prev.map((s, idx) => {
        const offset = Math.round(step * idx);
        return { ...s, date_iso: addDays(startISO, offset) };
      })
    );
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

            <button
              type="button"
              className="admin-back-button"
              onClick={() => navigate("/")}
            >
              {t("backToCalendar")}
            </button>

            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
            >
              {t("logout")}
            </button>
          </div>
        </header>

        <div className="admin-tabs">
          <button
            type="button"
            className={
              "admin-tab-button" +
              (activeTab === "classes" ? " admin-tab-button--active" : "")
            }
            onClick={() => setActiveTab("classes")}
          >
            {t("tabClasses")}
          </button>

          <button
            type="button"
            className={
              "admin-tab-button" +
              (activeTab === "stats" ? " admin-tab-button--active" : "")
            }
            onClick={() => setActiveTab("stats")}
          >
            {t("tabStats")}
          </button>
        </div>

        {/* CLASSES */}
        {activeTab === "classes" && (
          <section className="admin-table-section">
            <div className="admin-table-header-row">
              <h2 className="admin-table-title">{t("classesTitle")}</h2>

              <button
                type="button"
                className="btn btn-primary"
                onClick={openNewClassModal}
              >
                {t("addNewClass")}
              </button>
            </div>

            {groupedClasses.length === 0 && (
              <p className="admin-message">{t("noClasses")}</p>
            )}

            {groupedClasses.length > 0 && (
              <div className="admin-carousel-wrap">
                <div className="admin-carousel-controls">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => scrollCarousel(-1)}
                  >
                    ◀ {t("carouselPrev")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => scrollCarousel(1)}
                  >
                    {t("carouselNext")} ▶
                  </button>
                </div>

                <div className="admin-carousel" ref={carouselRef}>
                  {groupedClasses.map((g) => {
                    const expanded = expandedGroupCode === g.group_code;

                    return (
                      <div
                        key={g.group_code}
                        className={
                          "admin-class-card" +
                          (expanded ? " admin-class-card--active" : "")
                        }
                      >
                        <div className="admin-class-card-head">
                          <div>
                            <div className="admin-class-title">{g.title}</div>
                            <div className="admin-class-sub">
                              <span className="mini-pill">{g.modality}</span>
                              <span
                                className="mini-pill"
                                style={{ marginLeft: 8 }}
                              >
                                {t("sessionsCount")}: {g.sessions_count}
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
                            <strong>{t("columnTrainer")}:</strong>{" "}
                            {g.trainer_name || t("statsNoTrainer")}
                          </div>
                          {g.description && (
                            <div className="admin-class-desc">
                              {g.description}
                            </div>
                          )}
                        </div>

                        {expanded && <div className="admin-divider" />}

                        {expanded && (
                          <div className="admin-class-sessions">
                            {g.sessions.map((s) => (
                              <div key={s.id} className="admin-session-pill">
                                <span className="mini-pill">{s.date_iso}</span>
                                <span
                                  className="mini-pill"
                                  style={{ marginLeft: 8 }}
                                >
                                  {s.time_range}
                                </span>
                              </div>
                            ))}

                            <div
                              className="admin-actions"
                              style={{ marginTop: 12 }}
                            >
                              <button
                                className="btn btn-mini"
                                onClick={() => openEditClassModal(g)}
                              >
                                {t("modalEditClass")}
                              </button>

                              <button
                                className="btn btn-mini btn-danger"
                                onClick={() => deleteClassGroup(g)}
                              >
                                {t("btnDeleteClass")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedGroup && (
                  <div style={{ marginTop: 18 }}>
                    <h3
                      className="admin-table-title"
                      style={{ marginBottom: 10 }}
                    >
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
                              <td>{s.spots_left}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODAL (una sola vez) */}
            {showClassModal && editClass && (
              <div className="admin-modal-backdrop">
                <div className="admin-modal admin-modal-wide">
                  <h3>
                    {isNewClass ? t("modalNewClass") : t("modalEditClass")}
                  </h3>

                  <div className="admin-form-grid">
                    <div className="full">
                      <label>{t("labelClassTitle")}</label>
                      <input
                        className="form-input"
                        value={editClass.title}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>{t("labelTrainer")}</label>
                      <select
                        className="form-input"
                        value={editClass.trainer_name || ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  trainer_name: e.target.value || null,
                                }
                              : prev
                          )
                        }
                      >
                        <option value="">{t("optionSelectTrainer")}</option>
                        {TRAINERS.map((tr) => (
                          <option key={tr.id} value={tr.name}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>{t("labelStartDate")}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editClass.start_date || ""}
                        onChange={(e) => {
                          const newStart = e.target.value;

                          setEditClass((prev) =>
                            prev ? { ...prev, start_date: newStart } : prev
                          );

                          const end =
                            editClass.end_date || computedRange.end || newStart;
                          if (newStart && end) {
                            redistributeSessionsToRange(newStart, end);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label>{t("labelEndDate")}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editClass.end_date || ""}
                        onChange={(e) => {
                          const newEnd = e.target.value;

                          setEditClass((prev) =>
                            prev ? { ...prev, end_date: newEnd } : prev
                          );

                          const start =
                            editClass.start_date || computedRange.start || newEnd;
                          if (start && newEnd) {
                            redistributeSessionsToRange(start, newEnd);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label>{t("labelType")}</label>
                      <select
                        className="form-input"
                        value={editClass.modality}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  modality: e.target.value as
                                    | "Online"
                                    | "Presencial",
                                }
                              : prev
                          )
                        }
                      >
                        <option value="Presencial">{t("typeInPerson")}</option>
                        <option value="Online">{t("typeOnline")}</option>
                      </select>
                    </div>

                    <div>
                      <label>{t("labelSeats")}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editClass.spots_left}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? { ...prev, spots_left: Number(e.target.value) }
                              : prev
                          )
                        }
                      />
                    </div>

                    <div className="full">
                      <label>{t("labelDescription")}</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editClass.description ?? ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? { ...prev, description: e.target.value || null }
                              : prev
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-divider" />

                  <h4 style={{ margin: "0 0 6px", fontWeight: 900 }}>
                    {t("addSessionsTitle")}
                  </h4>
                  <p className="admin-message" style={{ marginTop: 0 }}>
                    {t("addSessionsHint")}
                  </p>

                  <p
                    className="admin-message"
                    style={{ marginTop: 0, opacity: 0.85 }}
                  >
                    <strong>Computed range:</strong>{" "}
                    {computedRange.start && computedRange.end
                      ? `${computedRange.start} → ${computedRange.end}`
                      : "—"}
                  </p>

                  <label>{t("sessionsCountLabel")}</label>
                  <div className="admin-inline-controls">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCount(sessionsCount - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 90, textAlign: "center" }}
                      value={sessionsCount}
                      onChange={(e) => setCount(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCount(sessionsCount + 1)}
                    >
                      +
                    </button>
                  </div>

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
                              next[idx] = {
                                ...next[idx],
                                date_iso: e.target.value,
                              };
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
                              next[idx] = {
                                ...next[idx],
                                start_time: e.target.value,
                              };
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
                              next[idx] = {
                                ...next[idx],
                                end_time: e.target.value,
                              };
                              setSessions(next);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="admin-modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowClassModal(false)}
                    >
                      {t("modalCancelDark")}
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={saveClassChanges}
                    >
                      {t("modalSaveDark")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STATS */}
        {activeTab === "stats" && (
          <section className="admin-table-section">
            <div className="enrolled-panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadStatsCsv}
                >
                  ⬇ {t("downloadCsv")}
                </button>
              </div>

              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiAccepted")}</div>
                  <div className="admin-kpi-value">
                    {statsKPIs.acceptedTotal}
                  </div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("howManyAttended")}</div>
                  <div className="admin-kpi-value">{statsKPIs.attended}</div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("howManyCompleted")}</div>
                  <div className="admin-kpi-value">{statsKPIs.completed}</div>
                </div>

                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiNotMarked")}</div>
                  <div className="admin-kpi-value">{statsKPIs.notMarked}</div>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="admin-kpi-label">{t("kpiDidNotAttend")}</div>
                <div className="admin-kpi-value">{didNotAttendCount}</div>
              </div>

              <h3>{t("enrolledTitle")}</h3>
              <p className="muted">{t("enrolledSubtitle")}</p>

              {enrolled.length === 0 ? (
                <div className="empty">{t("statsNoData")}</div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("columnName")}</th>
                          <th>{t("columnEmail")}</th>
                          <th>{t("columnTrainer")}</th>
                          <th>{t("statsColumnAttendance")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledSlice.map((b) => (
                          <tr key={b.id}>
                            <td>{b.name}</td>
                            <td>{b.email}</td>
                            <td>{b.trainer_name ?? t("statsNoTrainer")}</td>
                            <td>{attendanceLabelBooking(b)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination local */}
                  <div className="pagination" style={{ marginTop: 16 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={goPrevEnrolled}
                      disabled={enrolledPageSafe <= 1}
                    >
                      {t("paginationPrev")}
                    </button>

                    <div className="pagination-info">
                      Page {enrolledPageSafe} / {enrolledTotalPages} · Total:{" "}
                      {enrolled.length}
                      {/* Si quieres ver la paginación del endpoint, úsala aparte: */}
                      {bookingsTotal ? (
                        <>
                          {" "}
                          · (Server: {bookingsPage}/{bookingsLastPage} ·{" "}
                          {bookingsTotal})
                        </>
                      ) : null}
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={goNextEnrolled}
                      disabled={enrolledPageSafe >= enrolledTotalPages}
                    >
                      {t("paginationNext")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;