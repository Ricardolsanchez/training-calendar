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

  // ✅ toggle
  attendedbutton?: boolean | null;
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

    // ✅ NUEVO: delete de clases
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

    modalEditBookingTitle: "Edit booking",
    modalNameLabel: "Name:",
    modalNotesLabel: "Notes:",
    modalCancel: "Cancel",
    modalSave: "Save changes",

    modalNewClass: "New class",
    modalEditClass: "Edit class",
    labelClassTitle: "Class title",
    labelTrainer: "Trainer",
    labelStartDate: "Start Date",
    labelEndDate: "End Date",
    labelStartTime: "Start Time",
    labelEndTime: "End Time",
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

    addSessionsTitle: "Sessions (edit hours / count)",
    addSessionsHint:
      "Edit the start/end time for each session. Increase/decrease the number of sessions and save.",
    sessionsCountLabel: "Number of sessions",
  },
  es: {
    adminBadge: "Panel Admin",
    adminTitle: "Gestión de formaciones",

    // ✅ NUEVO: delete de clases
    btnDeleteClass: "Eliminar",
    confirmDeleteClassGroup:
      "¿Eliminar este grupo de clases y todas sus sesiones?",

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

    modalEditBookingTitle: "Editar reserva",
    modalNameLabel: "Nombre:",
    modalNotesLabel: "Notas:",
    modalCancel: "Cancelar",
    modalSave: "Guardar cambios",

    modalNewClass: "Nueva clase",
    modalEditClass: "Editar clase",
    labelClassTitle: "Título de la clase",
    labelTrainer: "Trainer",
    labelStartDate: "Fecha inicio",
    labelEndDate: "Fecha fin",
    labelStartTime: "Hora inicio",
    labelEndTime: "Hora fin",
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
    carouselNext: "Siguiente",
    sessionsPanelTitle: "Sesiones de",

    addSessionsTitle: "Sesiones (editar horas / cantidad)",
    addSessionsHint:
      "Edita la hora inicio/fin de cada sesión. Sube/baja la cantidad de sesiones y guarda.",
    sessionsCountLabel: "Número de sesiones",
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

type SessionDraft = { id?: number; start_time: string; end_time: string };

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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);

  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [editClass, setEditClass] = useState<AvailableClass | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("bookings");

  /** KPIs */
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [perClass, setPerClass] = useState<StatsPerClass[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  /** ✅ paginación de inscritos */
  const [enrolledPage, setEnrolledPage] = useState(1);
  const ENROLLED_PAGE_SIZE = 8;

  /** Grouped classes + selection */
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
    { start_time: "", end_time: "" },
  ]);

  const setCount = (n: number) => {
    const safe = Math.max(1, Math.min(20, Number.isFinite(n) ? n : 1));
    setSessionsCount(safe);
    setSessions((prev) => {
      const next = [...prev];
      while (next.length < safe) next.push({ start_time: "", end_time: "" });
      return next.slice(0, safe);
    });
  };

  const selectedGroup = expandedGroupCode
    ? groupedClasses.find((g) => g.group_code === expandedGroupCode) ?? null
    : null;

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

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/classes");
      const data = res.data;
      const listRaw: any[] = data.classes ?? data;

      const list: AvailableClass[] = listRaw.map((cls) => {
        const trainer = TRAINERS.find((tt) => tt.name === cls.trainer_name);

        return {
          id: cls.id,
          title: cls.title,
          trainer_id: trainer ? trainer.id : null,
          trainer_name: cls.trainer_name ?? (trainer ? trainer.name : null),
          start_date: cls.start_date,
          end_date: cls.end_date,
          start_time: cls.start_time,
          end_time: cls.end_time,
          modality: cls.modality,
          spots_left: cls.spots_left,
          description: cls.description ?? null,
          group_code: cls.group_code ?? null,
        };
      });

      setClasses(list);
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
    fetchClasses();
  }, [fetchBookings, fetchClasses]);

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
  const openEditBookingModal = (booking: Booking) => {
    setEditBooking(booking);
    setShowEditBookingModal(true);
  };

  const saveBookingChanges = async () => {
    if (!editBooking) return;
    try {
      await ensureCsrf();
      setShowEditBookingModal(false);
    } catch (err) {
      console.error("Error saving booking changes:", err);
      setShowEditBookingModal(false);
    }
  };

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

  /** ✅ Toggle attendance */
  const toggleAttendance = async (booking: Booking) => {
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

  /** ✅ DELETE group (all sessions) */
  const deleteClassGroup = async (g: GroupedClass) => {
    const ok = window.confirm(t("confirmDeleteClassGroup"));
    if (!ok) return;

    try {
      await ensureCsrf();

      // Borra TODAS las sesiones del grupo (tu endpoint es por ID de sesión)
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
    setSessions([{ start_time: "", end_time: "" }]);
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

    const group = code
      ? groupedClasses.find((g) => g.group_code === code)
      : null;

    if (group && group.sessions?.length) {
      setCount(group.sessions.length);
      setSessions(
        group.sessions.map((s) => ({
          id: s.id,
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
          start_time: cls.start_time || "",
          end_time: cls.end_time || "",
        },
      ]);
    }
  };

  /** Save class */
  const saveClassChanges = async () => {
    if (!editClass) return;

    try {
      await ensureCsrf();

      const baseStart = sessions?.[0]?.start_time || editClass.start_time;
      const baseEnd = sessions?.[0]?.end_time || editClass.end_time;

      const payload = {
        title: editClass.title,
        trainer_name: editClass.trainer_name,
        start_date: editClass.start_date,
        end_date: editClass.end_date,
        start_time: baseStart,
        end_time: baseEnd,
        modality: editClass.modality,
        spots_left: editClass.spots_left,
        description: editClass.description ?? null,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data?.class ?? res.data;

        const extra = sessions
          .slice(1)
          .filter((s) => s.start_time && s.end_time);
        if (extra.length > 0) {
          await api.post(`/api/admin/classes/${saved.id}/sessions`, {
            sessions: extra.map((s) => ({
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          });
        }

        await fetchClasses();
        await fetchGrouped();
      } else {
        await api.put(`/api/admin/classes/${editClass.id}`, payload);

        await api.put(`/api/admin/classes/${editClass.id}/sessions`, {
          sessions: sessions.map((s) => ({
            id: s.id,
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
      a.download = `kpis_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading KPIs CSV:", err);
      alert("Could not download KPIs CSV");
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      await ensureCsrf();
      const res = await api.get("/api/admin/stats/kpis");
      const data = res.data;

      if (isWrappedStats(data)) {
        setKpis(data.kpis);
        setPerClass(data.per_class ?? []);
      } else if (isKpis(data)) {
        setKpis(data);
        setPerClass([]);
      } else {
        setKpis(null);
        setPerClass([]);
        setStatsError(t("kpiLoadError"));
      }
    } catch (err) {
      console.error("Error loading stats:", err);
      setStatsError(t("kpiLoadError"));
      setKpis(null);
      setPerClass([]);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stats") fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  /** inscritos + paginación */
  const enrolled = useMemo(() => {
    const list = bookings; // (si quieres solo accepted, cambia a bookings.filter(b=>b.status==="accepted"))
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });
  }, [bookings]);

  const enrolledTotalPages = Math.max(
    1,
    Math.ceil(enrolled.length / ENROLLED_PAGE_SIZE)
  );

  const enrolledPageSafe = Math.min(enrolledPage, enrolledTotalPages);

  const enrolledSlice = useMemo(() => {
    const start = (enrolledPageSafe - 1) * ENROLLED_PAGE_SIZE;
    return enrolled.slice(start, start + ENROLLED_PAGE_SIZE);
  }, [enrolled, enrolledPageSafe]);

  const attendanceLabel = (b: Booking) => {
    if (b.attendedbutton === true) return t("attendanceYes");
    if (b.attendedbutton === false) return t("attendanceNo");
    return t("attendanceNotMarked");
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
              (activeTab === "bookings" ? " admin-tab-button--active" : "")
            }
            onClick={() => setActiveTab("bookings")}
          >
            {t("tabBookings")}
          </button>

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

        {/* BOOKINGS */}
        {activeTab === "bookings" && (
          <section className="admin-table-section">
            <h2 className="admin-table-title">{t("bookingListTitle")}</h2>

            {bookings.length === 0 && (
              <p className="admin-message">{t("noBookings")}</p>
            )}

            {bookings.length > 0 && (
              <div className="admin-table-wrapper">
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
                      <th className="th-center">
                        {t("statsColumnAttendance")}
                      </th>
                      <th>{t("columnStatus")}</th>
                      <th>{t("columnActions")}</th>
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
                        <td>{b.trainer_name || "—"}</td>
                        <td className="admin-description-cell">
                          {b.notes || "—"}
                        </td>
                        <td>{formatDateTime(b.created_at)}</td>

                        <td className="attendance-cell">
                          <button
                            type="button"
                            className={
                              "attendance-switch" +
                              (b.attendedbutton === true
                                ? " attendance-switch--active"
                                : "")
                            }
                            onClick={() => toggleAttendance(b)}
                            aria-label="toggle attendance"
                            title={attendanceLabel(b)}
                          />
                          <div className="mini-pill" style={{ marginTop: 8 }}>
                            {attendanceLabel(b)}
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              "status-pill " +
                              (b.status === "accepted"
                                ? "status-accepted"
                                : b.status === "denied"
                                ? "status-denied"
                                : "status-pending")
                            }
                          >
                            {b.status === "accepted"
                              ? t("statusAccepted")
                              : b.status === "denied"
                              ? t("statusDenied")
                              : t("statusPending")}
                          </span>
                        </td>

                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openEditBookingModal(b)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() =>
                                updateBookingStatus(b.id, "accepted")
                              }
                            >
                              {t("btnAccept")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() =>
                                updateBookingStatus(b.id, "denied")
                              }
                            >
                              {t("btnDeny")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              {t("btnDelete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

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
                            <strong>{t("colClassTrainer")}:</strong>{" "}
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
                                <span
                                  className="mini-pill"
                                  style={{ marginLeft: 8 }}
                                >
                                  Seats: {s.spots_left}
                                </span>
                              </div>
                            ))}

                            <div className="admin-divider" />

                            {/* ✅ Edit + Delete */}
                            <div className="admin-class-actions">
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                  const fallback =
                                    classes.find(
                                      (c) => c.group_code === g.group_code
                                    ) ||
                                    classes.find((c) => c.title === g.title) ||
                                    null;

                                  if (fallback) openEditClassModal(fallback);
                                  else
                                    alert(
                                      "Could not locate base class row for editing."
                                    );
                                }}
                              >
                                {t("btnEditClass")}
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger"
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
              </div>
            )}

            {selectedGroup && (
              <div className="admin-stats-group" style={{ marginTop: 18 }}>
                <div className="admin-stats-group-header">
                  <h3>
                    {t("sessionsPanelTitle")} {selectedGroup.title}
                  </h3>
                  <p>
                    {selectedGroup.trainer_name || t("statsNoTrainer")} •{" "}
                    {selectedGroup.modality} • {t("sessionsCount")}:{" "}
                    {selectedGroup.sessions_count}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STATS */}
        {activeTab === "stats" && (
          <section className="admin-table-section">
            <div className="admin-table-header-row">
              <h2 className="admin-table-title">{t("tabStats")}</h2>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadKpisCsv}
              >
                ⬇️ Download CSV
              </button>
            </div>

            {statsLoading && <p className="admin-message">Loading…</p>}
            {statsError && <p className="admin-message">{statsError}</p>}

            {!statsLoading && !statsError && kpis && (
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiTotalClasses")}</div>
                  <div className="admin-kpi-value">
                    {kpis.total_classes_created}
                  </div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiAccepted")}</div>
                  <div className="admin-kpi-value">{kpis.accepted_total}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiAttended")}</div>
                  <div className="admin-kpi-value">{kpis.attended_total}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiNotAttended")}</div>
                  <div className="admin-kpi-value">
                    {kpis.not_attended_total}
                  </div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiNotMarked")}</div>
                  <div className="admin-kpi-value">{kpis.not_marked_total}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiTotalAttended")}</div>
                  <div className="admin-kpi-value">
                    {kpis.total_attended_overall}
                  </div>
                </div>
              </div>
            )}

            {!statsLoading && !statsError && (
              <>
                <div className="admin-divider" />

                <div className="admin-subsection-header">
                  <div>
                    <h3 className="admin-subsection-title">
                      {t("enrolledTitle")}
                    </h3>
                    <p className="admin-subsection-subtitle">
                      {t("enrolledSubtitle")}
                    </p>
                  </div>

                  <div className="admin-pagination">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEnrolledPage((p) => Math.max(1, p - 1))}
                      disabled={enrolledPageSafe <= 1}
                    >
                      ◀ {t("paginationPrev")}
                    </button>

                    <span className="admin-pagination-label">
                      {enrolled.length === 0 ? "0" : enrolledPageSafe} /{" "}
                      {enrolledTotalPages}
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setEnrolledPage((p) =>
                          Math.min(enrolledTotalPages, p + 1)
                        )
                      }
                      disabled={enrolledPageSafe >= enrolledTotalPages}
                    >
                      {t("paginationNext")} ▶
                    </button>
                  </div>
                </div>

                {enrolled.length === 0 ? (
                  <p className="admin-message">{t("statsNoData")}</p>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("columnName")}</th>
                          <th>{t("columnEmail")}</th>
                          <th>{t("columnStartDate")}</th>
                          <th>{t("columnEndDate")}</th>
                          <th>{t("columnTrainer")}</th>
                          <th className="th-center">
                            {t("statsColumnAttendance")}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {enrolledSlice.map((b) => (
                          <tr key={b.id}>
                            <td>{b.name}</td>
                            <td>{b.email}</td>
                            <td>{formatDate(b.start_date)}</td>
                            <td>{formatDate(b.end_date)}</td>
                            <td>{b.trainer_name || "—"}</td>

                            <td className="attendance-cell">
                              <div className="attendance-inline">
                                <button
                                  type="button"
                                  className={
                                    "attendance-switch" +
                                    (b.attendedbutton === true
                                      ? " attendance-switch--active"
                                      : "")
                                  }
                                  onClick={() => toggleAttendance(b)}
                                  aria-label="toggle attendance"
                                  title={attendanceLabel(b)}
                                />
                                <span
                                  className={
                                    "mini-pill " +
                                    (b.attendedbutton === true
                                      ? "mini-pill--ok"
                                      : b.attendedbutton === false
                                      ? "mini-pill--off"
                                      : "")
                                  }
                                >
                                  {attendanceLabel(b)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {!statsLoading && !statsError && perClass.length > 0 && (
              <>
                <h3 style={{ marginTop: 18 }}>{t("statsTitle")}</h3>
                <div className="admin-table-wrapper">
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
                          <td>{row.trainer_name || t("statsNoTrainer")}</td>
                          <td>{row.requests}</td>
                          <td>{row.attended}</td>
                          <td>{row.not_attended}</td>
                          <td>{row.not_marked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {!statsLoading && !statsError && perClass.length === 0 && (
              <p className="admin-message">{t("statsNoData")}</p>
            )}
          </section>
        )}

        {/* MODAL Edit Booking */}
        {showEditBookingModal && editBooking && (
          <div
            className="admin-modal-backdrop"
            onClick={() => setShowEditBookingModal(false)}
          >
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t("modalEditBookingTitle")}</h3>

              <label>{t("modalNameLabel")}</label>
              <input className="form-input" value={editBooking.name} disabled />

              <label>{t("modalNotesLabel")}</label>
              <textarea
                className="form-textarea"
                value={editBooking.notes ?? ""}
                onChange={(e) =>
                  setEditBooking({ ...editBooking, notes: e.target.value })
                }
              />

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditBookingModal(false)}
                >
                  {t("modalCancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveBookingChanges}
                >
                  {t("modalSave")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL New/Edit Class */}
        {showClassModal && editClass && (
          <div
            className="admin-modal-backdrop"
            onClick={() => setShowClassModal(false)}
          >
            <div
              className="admin-modal admin-modal-dark"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{isNewClass ? t("modalNewClass") : t("modalEditClass")}</h3>

              <div className="admin-modal-body--scroll">
                <label>{t("labelClassTitle")}</label>
                <input
                  className="form-input"
                  value={editClass.title}
                  onChange={(e) =>
                    setEditClass({ ...editClass, title: e.target.value })
                  }
                />

                <label>{t("labelTrainer")}</label>
                <select
                  className="form-select"
                  value={editClass.trainer_name ?? ""}
                  onChange={(e) =>
                    setEditClass({
                      ...editClass,
                      trainer_name: e.target.value || null,
                    })
                  }
                >
                  <option value="">{t("optionSelectTrainer")}</option>
                  {TRAINERS.map((tr) => (
                    <option key={tr.id} value={tr.name}>
                      {tr.name}
                    </option>
                  ))}
                </select>

                <div className="admin-form-grid">
                  <div>
                    <label>{t("labelStartDate")}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editClass.start_date}
                      onChange={(e) =>
                        setEditClass({
                          ...editClass,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>{t("labelEndDate")}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editClass.end_date}
                      onChange={(e) =>
                        setEditClass({ ...editClass, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <label>{t("labelType")}</label>
                <select
                  className="form-select"
                  value={editClass.modality}
                  onChange={(e) =>
                    setEditClass({
                      ...editClass,
                      modality: e.target.value as any,
                    })
                  }
                >
                  <option value="Online">{t("typeOnline")}</option>
                  <option value="Presencial">{t("typeInPerson")}</option>
                </select>

                <label>{t("labelSeats")}</label>
                <input
                  type="number"
                  className="form-input"
                  value={editClass.spots_left}
                  onChange={(e) =>
                    setEditClass({
                      ...editClass,
                      spots_left: Number(e.target.value || 0),
                    })
                  }
                />

                <label>{t("labelDescription")}</label>
                <textarea
                  className="form-textarea"
                  value={editClass.description ?? ""}
                  onChange={(e) =>
                    setEditClass({ ...editClass, description: e.target.value })
                  }
                />

                <div className="admin-divider" />

                <h4 style={{ margin: "0 0 6px", fontWeight: 900 }}>
                  {t("addSessionsTitle")}
                </h4>
                <p className="admin-message" style={{ marginTop: 0 }}>
                  {t("addSessionsHint")}
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
                            next[idx] = { ...next[idx], end_time: e.target.value };
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
    </div>
  );
};

export default AdminPanel;
