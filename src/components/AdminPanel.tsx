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

  attendedbutton?: boolean | null;
};

type AvailableClass = {
  id: number;
  title: string;
  trainer_id: number | null;
  trainer_name: string | null;

  start_date: string; // range start (visual hint only)
  end_date: string; // range end (visual hint only)

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
  start_date_iso?: string;
  end_date_iso?: string;
};

type Trainer = { id: number; name: string };
type Tab = "bookings" | "classes" | "stats";
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
    adminSubtitle:
      "Review the reservations received and manage the available classes.",
    backToCalendar: "← Calendar",
    logout: "Log out",
    tabBookings: "Bookings",
    tabClasses: "Available Classes",
    tabStats: "Statistics",

    bookingListTitle: "Booking List",
    noBookings: "No Bookings at this time",
    confirmDeleteBooking: "Are you sure you want to delete this booking?",
    errorDeleteBooking: "Could not delete booking.",
    errorUpdateBookingStatus: "Could not update booking status.",

    addNewClass: "+ New Class",
    noClasses: "No Classes at this time.",

    columnName: "Name",
    columnEmail: "Corporate Email",
    columnStartDate: "Start Date",
    columnEndDate: "End Date",
    columnTotalDays: "Total Days",
    columnTrainer: "Trainer",
    columnNotes: "Notes",
    columnCreatedAt: "Created At",
    columnStatus: "Status",
    columnActions: "Actions",
    statusAccepted: "Accepted",
    statusDenied: "Denied",
    statusPending: "Pending",
    btnAccept: "Accept",
    btnDeny: "Deny",
    btnDelete: "Delete",

    btnDeleteClass: "Delete",
    confirmDeleteClassGroup: "Delete this class group and all its sessions?",

    classesTitle: "Available Classes",
    colClassTitle: "Title",
    colClassTrainer: "Trainer",
    colClassStart: "Start",
    colClassEnd: "End",
    colClassTime: "Time",
    colClassType: "Type",
    colClassSeats: "Available Seats",
    colClassDescription: "Description",
    btnEditClass: "Edit",

    modalNewClass: "New class",
    modalEditClass: "Edit class",
    labelClassTitle: "Class title",
    labelTrainer: "Trainer",
    labelStartDate: "Start Date",
    labelEndDate: "End Date",
    labelType: "Type",
    labelSeats: "Available Seats",
    labelDescription: "Short description",
    optionSelectTrainer: "Select a Trainer",
    typeInPerson: "In Person",
    typeOnline: "Online",
    modalCancelDark: "Cancel",
    modalSaveDark: "Save",
    errorSaveClass: "Could not save class.",

    statsTitle: "Requests per class",
    statsNoData: "There are no requests yet.",
    statsNoTrainer: "No trainer assigned",
    statsColumnAttendance: "Attended?",
    kpiTotalClasses: "Total courses",
    kpiAccepted: "Accepted bookings",
    kpiAttended: "Attended",
    kpiNotAttended: "Not attended",
    kpiNotMarked: "Not marked",
    kpiTotalAttended: "Total attended (overall)",
    kpiLoadError: "Could not load KPIs.",

    enrolledTitle: "People enrolled",
    enrolledSubtitle: "Accepted bookings (inscribed users).",
    attendanceYes: "Attended",
    attendanceNo: "Not attended",
    attendanceNotMarked: "Not marked",
    paginationPrev: "Previous",
    paginationNext: "Next",

    sessionsCount: "Sessions",
    expand: "Expand",
    collapse: "Collapse",
    carouselPrev: "Previous",
    carouselNext: "Next",
    sessionsPanelTitle: "Sessions for",

    addSessionsTitle: "Sessions (edit dates & hours)",
    addSessionsHint:
      "Set the date and start/end time for each session. Increase/decrease the number of sessions and save.",
    sessionsCountLabel: "Number of sessions",
    sessionDateLabel: "Session date",
  },
  es: {
    adminBadge: "Panel Admin",
    adminTitle: "Gestión de formaciones",
    adminSubtitle:
      "Revisa las reservas recibidas y administra las clases disponibles.",
    backToCalendar: "← Calendario",
    logout: "Cerrar sesión",
    tabBookings: "Reservas",
    tabClasses: "Clases disponibles",
    tabStats: "Estadísticas",

    bookingListTitle: "Listado de reservas",
    noBookings: "No hay reservas por el momento",
    confirmDeleteBooking: "¿Seguro que quieres eliminar esta reserva?",
    errorDeleteBooking: "No se pudo eliminar la reserva.",
    errorUpdateBookingStatus: "No se pudo actualizar el estado de la reserva.",

    addNewClass: "+ Nueva clase",
    noClasses: "No hay clases por el momento.",

    columnName: "Nombre",
    columnEmail: "Correo corporativo",
    columnStartDate: "Fecha inicio",
    columnEndDate: "Fecha fin",
    columnTotalDays: "Días totales",
    columnTrainer: "Trainer",
    columnNotes: "Notas",
    columnCreatedAt: "Creada el",
    columnStatus: "Estado",
    columnActions: "Acciones",
    statusAccepted: "Aceptada",
    statusDenied: "Denegada",
    statusPending: "Pendiente",
    btnAccept: "Aceptar",
    btnDeny: "Rechazar",
    btnDelete: "Eliminar",

    btnDeleteClass: "Eliminar",
    confirmDeleteClassGroup:
      "¿Eliminar este grupo de clases y todas sus sesiones?",

    classesTitle: "Clases disponibles",
    colClassTitle: "Título",
    colClassTrainer: "Trainer",
    colClassStart: "Inicio",
    colClassEnd: "Fin",
    colClassTime: "Horario",
    colClassType: "Modalidad",
    colClassSeats: "Cupos",
    colClassDescription: "Descripción",
    btnEditClass: "Editar",

    modalNewClass: "Nueva clase",
    modalEditClass: "Editar clase",
    labelClassTitle: "Título de la clase",
    labelTrainer: "Trainer",
    labelStartDate: "Fecha inicio",
    labelEndDate: "Fecha fin",
    labelType: "Tipo",
    labelSeats: "Cupos disponibles",
    labelDescription: "Descripción breve",
    optionSelectTrainer: "Selecciona un trainer",
    typeInPerson: "Presencial",
    typeOnline: "Online",
    modalCancelDark: "Cancelar",
    modalSaveDark: "Guardar",
    errorSaveClass: "No se pudo guardar la clase.",

    statsTitle: "Solicitudes por clase",
    statsNoData: "Aún no hay solicitudes.",
    statsNoTrainer: "Sin trainer asignado",
    statsColumnAttendance: "¿Asistió?",
    kpiTotalClasses: "Total cursos",
    kpiAccepted: "Reservas aceptadas",
    kpiAttended: "Asistieron",
    kpiNotAttended: "No asistieron",
    kpiNotMarked: "Sin marcar",
    kpiTotalAttended: "Total asistentes (global)",
    kpiLoadError: "No se pudieron cargar los KPIs.",

    enrolledTitle: "Personas inscritas",
    enrolledSubtitle: "Reservas aceptadas (inscritos).",
    attendanceYes: "Asistió",
    attendanceNo: "No asistió",
    attendanceNotMarked: "Sin marcar",
    paginationPrev: "Anterior",
    paginationNext: "Siguiente",

    sessionsCount: "Sesiones",
    expand: "Ver",
    collapse: "Ocultar",
    carouselPrev: "Anterior",
    carouselNext: "Next",
    sessionsPanelTitle: "Sesiones de",

    addSessionsTitle: "Sesiones (editar fechas y horas)",
    addSessionsHint:
      "Define la fecha y hora inicio/fin por sesión. Sube/baja la cantidad de sesiones y guarda.",
    sessionsCountLabel: "Número de sesiones",
    sessionDateLabel: "Fecha de la sesión",
  },
};

async function ensureCsrf() {
  await api.get("/sanctum/csrf-cookie");
}

type Kpis = {
  total_classes_created: number;
  accepted_total: number;
  attended_total: number;
  not_attended_total: number;
  not_marked_total: number;
  total_attended_overall: number;
};

type StatsPerClass = {
  classTitle: string;
  start_date: string;
  end_date: string;
  trainer_name: string | null;
  requests: number;
  attended: number;
  not_attended: number;
  not_marked: number;
};

type WrappedStats = {
  ok: boolean;
  kpis: Kpis;
  per_class?: StatsPerClass[];
};

function isWrappedStats(data: unknown): data is WrappedStats {
  if (!data || typeof data !== "object") return false;
  const d = data as any;
  return typeof d.ok === "boolean" && d.kpis && typeof d.kpis === "object";
}

function isKpis(data: unknown): data is Kpis {
  if (!data || typeof data !== "object") return false;
  const d = data as any;
  return (
    typeof d.total_classes_created === "number" &&
    typeof d.accepted_total === "number" &&
    typeof d.attended_total === "number" &&
    typeof d.not_attended_total === "number" &&
    typeof d.not_marked_total === "number" &&
    typeof d.total_attended_overall === "number"
  );
}

/** ✅ Cada sesión tiene su fecha */
type SessionDraft = {
  id?: number;
  date_iso: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
};

const parseTimeRange = (tr: string) => {
  const [a, b] = (tr || "").split("-").map((x) => x.trim());
  return { start_time: a || "", end_time: b || "" };
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
};

const clampISO = (iso: string, min: string, max: string) => {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
};

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("en");
  const t = useCallback(
    (key: string) => translations[lang][key] ?? key,
    [lang]
  );

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [editClass, setEditClass] = useState<AvailableClass | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("bookings");

  /** KPIs */
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [perClass, setPerClass] = useState<StatsPerClass[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  /** paginación de inscritos */
  const [enrolledPage, setEnrolledPage] = useState(1);
  const ENROLLED_PAGE_SIZE = 8;

  /** Grouped classes */
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

  /** Sessions Draft (NEW + EDIT) */
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

  const selectedGroup = expandedGroupCode
    ? groupedClasses.find((g) => g.group_code === expandedGroupCode) ?? null
    : null;

  /** ✅ Autocompletar fechas sugeridas por sesión */
  useEffect(() => {
    if (!editClass?.start_date) return;

    const min = editClass.start_date;
    const max = editClass.end_date || editClass.start_date;

    setSessions((prev) =>
      prev.map((s, idx) => {
        const suggested = clampISO(addDaysISO(min, idx), min, max);
        return {
          ...s,
          date_iso: s.date_iso ? clampISO(s.date_iso, min, max) : suggested,
        };
      })
    );
  }, [editClass?.start_date, editClass?.end_date]);

  /** Fetch helpers */
  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/bookings");
      const data = res.data;
      const list: Booking[] = data.bookings ?? data;
      setBookings(list);
    } catch (err) {
      console.error("Error cargando reservas:", err);
    }
  }, []);

  /**
   * ✅ Se mantiene por compatibilidad (lo llamas después de borrar/guardar),
   * pero ya NO construye variables 'list' (evita TS6133).
   */
  const fetchClasses = useCallback(async () => {
    try {
      await api.get("/api/admin/classes");
    } catch (err) {
      console.error("Error cargando clases:", err);
    }
  }, []);

  const fetchGrouped = useCallback(async () => {
    try {
      const res = await api.get("/api/classes-grouped");
      const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
      setGroupedClasses(list);
    } catch (err) {
      console.error("Error cargando clases agrupadas:", err);
      setGroupedClasses([]);
    }
  }, []);

  /** Mount */
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /** When entering classes tab */
  useEffect(() => {
    if (activeTab !== "classes") return;
    fetchGrouped();
  }, [activeTab, fetchGrouped]);

  /** Cuando entras a STATS, resetea página */
  useEffect(() => {
    if (activeTab === "stats") setEnrolledPage(1);
  }, [activeTab]);

  /** Format helpers */
  const formatDate = (value: string) => {
    if (!value) return "—";
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${m}/${d}/${y}`;
    return value;
  };

  const formatDateTime = (value: string) => {
    if (!value) return "—";
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return value;
      return dt.toLocaleString();
    } catch {
      return value;
    }
  };

  const totalDays = (b: Booking) => {
    if (typeof b.new_training_days === "number" && b.new_training_days > 0)
      return b.new_training_days;
    if (
      typeof b.original_training_days === "number" &&
      b.original_training_days > 0
    )
      return b.original_training_days;

    try {
      const s = new Date(b.start_date);
      const e = new Date(b.end_date);
      const diff =
        Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  /** Booking actions */
  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm(t("confirmDeleteBooking"))) return;
    try {
      await ensureCsrf();
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert(t("errorDeleteBooking"));
    }
  };

  const updateBookingStatus = async (id: number, status: BookingStatus) => {
    try {
      await ensureCsrf();
      await api.put(`/api/admin/bookings/${id}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert(t("errorUpdateBookingStatus"));
    }
  };

  /** Toggle attendance (solo accepted) */
  const toggleAttendance = async (booking: Booking) => {
    if (booking.status !== "accepted") return;

    try {
      await ensureCsrf();
      const next = booking.attendedbutton === true ? false : true;

      await api.put(`/api/admin/bookings/${booking.id}/attendance`, {
        attendedbutton: next,
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, attendedbutton: next } : b
        )
      );
    } catch (err) {
      console.error("Error updating attendance:", err);
      alert("Could not update attendance");
    }
  };

  const attendanceLabel = (b: Booking) => {
    if (b.attendedbutton === true) return t("attendanceYes");
    if (b.attendedbutton === false) return t("attendanceNo");
    return t("attendanceNotMarked");
  };

  /** DELETE group (all sessions) */
  const deleteClassGroup = async (g: GroupedClass) => {
    const ok = window.confirm(t("confirmDeleteClassGroup"));
    if (!ok) return;

    try {
      await ensureCsrf();
      for (const s of g.sessions) {
        await api.delete(`/api/admin/classes/${s.id}`);
      }
      await fetchClasses();
      await fetchGrouped();
      setExpandedGroupCode((prev) => (prev === g.group_code ? null : prev));
    } catch (err) {
      console.error("Error deleting class group:", err);
      alert("Could not delete the class group.");
    }
  };

  /** New/Edit class modal */
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

  const openEditClassModal = (cls: AvailableClass) => {
    setIsNewClass(false);
    setEditClass({ ...cls });
    setShowClassModal(true);

    const code =
      cls.group_code ||
      groupedClasses.find((g) => g.sessions?.some((s) => s.id === cls.id))
        ?.group_code ||
      null;

    const group = code ? groupedClasses.find((g) => g.group_code === code) : null;

    if (group && group.sessions?.length) {
      setCount(group.sessions.length);
      setSessions(
        group.sessions.map((s) => ({
          id: s.id,
          date_iso: s.date_iso,
          ...parseTimeRange(s.time_range),
        }))
      );

      const first = group.sessions[0];
      const tr = parseTimeRange(first?.time_range || "");
      setEditClass((prev) =>
        prev
          ? {
              ...prev,
              group_code: group.group_code,
              start_time: tr.start_time,
              end_time: tr.end_time,
            }
          : prev
      );
    } else {
      setCount(1);
      setSessions([
        {
          id: cls.id,
          date_iso: cls.start_date || "",
          start_time: cls.start_time || "",
          end_time: cls.end_time || "",
        },
      ]);
    }
  };

  /** ✅ Rango computado desde sesiones */
  const computedRange = useMemo(() => {
    const clean = sessions
      .map((s) => ({
        date_iso: (s.date_iso || "").trim(),
        start_time: (s.start_time || "").trim(),
        end_time: (s.end_time || "").trim(),
      }))
      .filter((s) => s.date_iso && s.start_time && s.end_time);

    if (clean.length === 0) return { start: "", end: "" };
    const dates = clean.map((s) => s.date_iso).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [sessions]);

  /** Save class */
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

    const dates = cleanSessions.map((s) => s.date_iso).sort();
    const computedStart = dates[0];
    const computedEnd = dates[dates.length - 1];

    try {
      await ensureCsrf();

      const baseStart = cleanSessions?.[0]?.start_time || editClass.start_time;
      const baseEnd = cleanSessions?.[0]?.end_time || editClass.end_time;

      const payload = {
        title: editClass.title,
        trainer_name: editClass.trainer_name,
        start_date: computedStart,
        end_date: computedEnd,
        start_time: baseStart,
        end_time: baseEnd,
        modality: editClass.modality,
        spots_left: editClass.spots_left,
        description: editClass.description ?? null,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data?.class ?? res.data;

        await api.put(`/api/admin/classes/${saved.id}/sessions`, {
          sessions: cleanSessions.map((s, idx) => ({
            id: idx === 0 ? saved.id : undefined,
            date_iso: s.date_iso,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        });

        await fetchClasses();
        await fetchGrouped();
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

        await fetchClasses();
        await fetchGrouped();
      }

      setShowClassModal(false);
    } catch (err: any) {
      console.error("Error guardando clase:", err);
      if (err.response?.data) alert(JSON.stringify(err.response.data, null, 2));
      else alert(t("errorSaveClass"));
    }
  };

  /** Stats */
  const downloadKpisCsv = async () => {
    try {
      await ensureCsrf();
      const res = await api.get("/api/admin/stats/kpis.csv", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kpis.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading KPIs CSV:", err);
      alert("Could not download KPIs CSV.");
    }
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      await ensureCsrf();
      const res = await api.get("/api/admin/stats");
      const data = res.data;

      if (!isWrappedStats(data)) {
        setStatsError("Unexpected stats format");
        setStatsLoading(false);
        return;
      }

      if (!isKpis(data.kpis)) {
        setStatsError(t("kpiLoadError"));
        setStatsLoading(false);
        return;
      }

      setKpis(data.kpis);
      setPerClass(data.per_class ?? []);
      setStatsLoading(false);
    } catch (err) {
      console.error("Error loading stats:", err);
      setStatsError(t("kpiLoadError"));
      setStatsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab !== "stats") return;
    fetchStats();
  }, [activeTab, fetchStats]);

  /** Logout */
  const handleLogout = async () => {
    try {
      await ensureCsrf();
      await api.post("/logout");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      navigate("/login");
    }
  };

  /** Render helpers */
  const enrolled = useMemo(() => {
    const acc = bookings.filter((b) => b.status === "accepted");
    const start = (enrolledPage - 1) * ENROLLED_PAGE_SIZE;
    const end = start + ENROLLED_PAGE_SIZE;
    return {
      total: acc.length,
      page: acc.slice(start, end),
      pages: Math.max(1, Math.ceil(acc.length / ENROLLED_PAGE_SIZE)),
    };
  }, [bookings, enrolledPage]);

  const goPrev = () => setEnrolledPage((p) => Math.max(1, p - 1));
  const goNext = () => setEnrolledPage((p) => Math.min(enrolled.pages, p + 1));

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <div className="admin-badge">{t("adminBadge")}</div>
          <h1 className="admin-title">{t("adminTitle")}</h1>
          <p className="admin-subtitle">{t("adminSubtitle")}</p>

          <div className="admin-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate("/")}>
              {t("backToCalendar")}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setLang((prev) => (prev === "en" ? "es" : "en"))}
            >
              {lang === "en" ? "ES" : "EN"}
            </button>

            <button className="btn btn-danger" onClick={handleLogout}>
              {t("logout")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            {t("tabBookings")}
          </button>
          <button
            className={`admin-tab ${activeTab === "classes" ? "active" : ""}`}
            onClick={() => setActiveTab("classes")}
          >
            {t("tabClasses")}
          </button>
          <button
            className={`admin-tab ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            {t("tabStats")}
          </button>
        </div>

        {/* BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="admin-section">
            <h2 className="section-title">{t("bookingListTitle")}</h2>

            {bookings.length === 0 ? (
              <div className="empty">{t("noBookings")}</div>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("columnName")}</th>
                      <th>{t("columnEmail")}</th>
                      <th>{t("columnStartDate")}</th>
                      <th>{t("columnEndDate")}</th>
                      <th>{t("columnTotalDays")}</th>
                      <th>{t("columnTrainer")}</th>
                      <th>{t("columnNotes")}</th>
                      <th>{t("columnCreatedAt")}</th>
                      <th>{t("columnStatus")}</th>
                      <th>{t("columnActions")}</th>
                      <th>{t("statsColumnAttendance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.email}</td>
                        <td>{formatDate(b.start_date)}</td>
                        <td>{formatDate(b.end_date)}</td>
                        <td>{totalDays(b)}</td>
                        <td>{b.trainer_name ?? "—"}</td>
                        <td className="truncate">{b.notes ?? "—"}</td>
                        <td>{formatDateTime(b.created_at)}</td>
                        <td>
                          <span className={`status-pill ${b.status}`}>
                            {b.status === "accepted"
                              ? t("statusAccepted")
                              : b.status === "denied"
                              ? t("statusDenied")
                              : t("statusPending")}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            className="btn btn-mini btn-success"
                            onClick={() => updateBookingStatus(b.id, "accepted")}
                          >
                            {t("btnAccept")}
                          </button>
                          <button
                            className="btn btn-mini btn-warning"
                            onClick={() => updateBookingStatus(b.id, "denied")}
                          >
                            {t("btnDeny")}
                          </button>
                          <button
                            className="btn btn-mini btn-danger"
                            onClick={() => handleDeleteBooking(b.id)}
                          >
                            {t("btnDelete")}
                          </button>
                        </td>

                        {/* Attendance button */}
                        <td>
                          <button
                            className={`btn btn-mini ${
                              b.attendedbutton === true
                                ? "btn-success"
                                : b.attendedbutton === false
                                ? "btn-danger"
                                : "btn-secondary"
                            }`}
                            onClick={() => toggleAttendance(b)}
                            disabled={b.status !== "accepted"}
                            title={
                              b.status !== "accepted"
                                ? "Only available for accepted bookings"
                                : ""
                            }
                          >
                            {attendanceLabel(b)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CLASSES */}
        {activeTab === "classes" && (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">{t("classesTitle")}</h2>
              <button className="btn btn-primary" onClick={openNewClassModal}>
                {t("addNewClass")}
              </button>
            </div>

            {groupedClasses.length === 0 ? (
              <div className="empty">{t("noClasses")}</div>
            ) : (
              <>
                <div className="carousel-wrap">
                  <button
                    className="carousel-btn"
                    onClick={() => scrollCarousel(-1)}
                  >
                    {t("carouselPrev")}
                  </button>

                  <div className="carousel" ref={carouselRef}>
                    {groupedClasses.map((g) => (
                      <div key={g.group_code} className="carousel-card">
                        <div className="carousel-card-header">
                          <div className="carousel-title">{g.title}</div>
                          <div className="carousel-sub">
                            {g.trainer_name ?? "—"} • {g.modality}
                          </div>
                        </div>

                        <div className="carousel-meta">
                          <div>
                            <strong>{t("sessionsCount")}:</strong>{" "}
                            {g.sessions_count}
                          </div>
                          <div>
                            <strong>{t("colClassStart")}:</strong>{" "}
                            {formatDate(
                              g.start_date_iso || g.sessions?.[0]?.date_iso || ""
                            )}
                          </div>
                          <div>
                            <strong>{t("colClassEnd")}:</strong>{" "}
                            {formatDate(
                              g.end_date_iso ||
                                g.sessions?.[g.sessions.length - 1]?.date_iso ||
                                ""
                            )}
                          </div>
                        </div>

                        <div className="carousel-actions">
                          <button
                            className="btn btn-mini btn-secondary"
                            onClick={() => toggleGroup(g.group_code)}
                          >
                            {expandedGroupCode === g.group_code
                              ? t("collapse")
                              : t("expand")}
                          </button>

                          <button
                            className="btn btn-mini btn-primary"
                            onClick={() => {
                              const baseSession = g.sessions?.[0];
                              if (!baseSession) return;
                              const dummy: AvailableClass = {
                                id: baseSession.id,
                                title: g.title,
                                trainer_id: null,
                                trainer_name: g.trainer_name,
                                start_date: g.start_date_iso || baseSession.date_iso,
                                end_date: g.end_date_iso || baseSession.date_iso,
                                ...parseTimeRange(baseSession.time_range),
                                modality: g.modality,
                                spots_left: baseSession.spots_left,
                                description: g.description,
                                group_code: g.group_code,
                              };
                              openEditClassModal(dummy);
                            }}
                          >
                            {t("btnEditClass")}
                          </button>

                          <button
                            className="btn btn-mini btn-danger"
                            onClick={() => deleteClassGroup(g)}
                          >
                            {t("btnDeleteClass")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="carousel-btn"
                    onClick={() => scrollCarousel(1)}
                  >
                    {t("carouselNext")}
                  </button>
                </div>

                {selectedGroup && (
                  <div className="sessions-panel">
                    <h3 className="sessions-title">
                      {t("sessionsPanelTitle")} {selectedGroup.title}
                    </h3>

                    <div className="table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t("sessionDateLabel")}</th>
                            <th>{t("colClassTime")}</th>
                            <th>{t("colClassSeats")}</th>
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
              </>
            )}

            {/* New/Edit class modal */}
            {showClassModal && editClass && (
              <div className="admin-modal-backdrop">
                <div className="admin-modal admin-modal-wide">
                  <h3>{isNewClass ? t("modalNewClass") : t("modalEditClass")}</h3>

                  <div className="admin-form-grid">
                    <div>
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
                        value={editClass.trainer_name ?? ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev
                              ? { ...prev, trainer_name: e.target.value || null }
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

                    {/* Visual hints only; final range comes from sessions */}
                    <div>
                      <label>{t("labelStartDate")} (optional)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editClass.start_date || ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, start_date: e.target.value } : prev
                          )
                        }
                      />
                    </div>

                    <div>
                      <label>{t("labelEndDate")} (optional)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editClass.end_date || ""}
                        onChange={(e) =>
                          setEditClass((prev) =>
                            prev ? { ...prev, end_date: e.target.value } : prev
                          )
                        }
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
                              ? {
                                  ...prev,
                                  description: e.target.value || null,
                                }
                              : prev
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Sessions editor */}
                  <div className="sessions-editor">
                    <div className="sessions-editor-head">
                      <div>
                        <h4>{t("addSessionsTitle")}</h4>
                        <p className="muted">{t("addSessionsHint")}</p>
                        <p className="muted">
                          <strong>Computed range:</strong>{" "}
                          {computedRange.start && computedRange.end
                            ? `${computedRange.start} → ${computedRange.end}`
                            : "—"}
                        </p>
                      </div>

                      <div className="sessions-count">
                        <label>{t("sessionsCountLabel")}</label>
                        <input
                          type="number"
                          className="form-input"
                          value={sessionsCount}
                          min={1}
                          max={20}
                          onChange={(e) =>
                            setCount(parseInt(e.target.value || "1", 10))
                          }
                        />
                      </div>
                    </div>

                    <div className="sessions-grid">
                      {sessions.map((s, idx) => (
                        <div key={idx} className="session-row">
                          <div>
                            <label>
                              {t("sessionDateLabel")} #{idx + 1}
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
          </div>
        )}

        {/* STATS */}
        {activeTab === "stats" && (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">{t("tabStats")}</h2>
              <button className="btn btn-secondary" onClick={downloadKpisCsv}>
                Download KPIs CSV
              </button>
            </div>

            {statsLoading && <div className="empty">Loading…</div>}
            {statsError && <div className="empty">{statsError}</div>}

            {kpis && (
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiTotalClasses")}</div>
                  <div className="kpi-value">{kpis.total_classes_created}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiAccepted")}</div>
                  <div className="kpi-value">{kpis.accepted_total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiAttended")}</div>
                  <div className="kpi-value">{kpis.attended_total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiNotAttended")}</div>
                  <div className="kpi-value">{kpis.not_attended_total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiNotMarked")}</div>
                  <div className="kpi-value">{kpis.not_marked_total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">{t("kpiTotalAttended")}</div>
                  <div className="kpi-value">{kpis.total_attended_overall}</div>
                </div>
              </div>
            )}

            <div className="enrolled-panel">
              <h3>{t("enrolledTitle")}</h3>
              <p className="muted">{t("enrolledSubtitle")}</p>

              {enrolled.total === 0 ? (
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
                        {enrolled.page.map((b) => (
                          <tr key={b.id}>
                            <td>{b.name}</td>
                            <td>{b.email}</td>
                            <td>{b.trainer_name ?? t("statsNoTrainer")}</td>
                            <td>{attendanceLabel(b)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination">
                    <button
                      className="btn btn-secondary"
                      onClick={goPrev}
                      disabled={enrolledPage <= 1}
                    >
                      {t("paginationPrev")}
                    </button>
                    <div className="pagination-info">
                      {enrolledPage} / {enrolled.pages}
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={goNext}
                      disabled={enrolledPage >= enrolled.pages}
                    >
                      {t("paginationNext")}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="perclass-panel">
              <h3>{t("statsTitle")}</h3>

              {perClass.length === 0 ? (
                <div className="empty">{t("statsNoData")}</div>
              ) : (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{t("colClassTitle")}</th>
                        <th>{t("colClassStart")}</th>
                        <th>{t("colClassEnd")}</th>
                        <th>{t("colClassTrainer")}</th>
                        <th>Requests</th>
                        <th>{t("kpiAttended")}</th>
                        <th>{t("kpiNotAttended")}</th>
                        <th>{t("kpiNotMarked")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perClass.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.classTitle}</td>
                          <td>{formatDate(row.start_date)}</td>
                          <td>{formatDate(row.end_date)}</td>
                          <td>{row.trainer_name ?? t("statsNoTrainer")}</td>
                          <td>{row.requests}</td>
                          <td>{row.attended}</td>
                          <td>{row.not_attended}</td>
                          <td>{row.not_marked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
