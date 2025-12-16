import { useState, useEffect, useCallback } from "react";
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
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  modality: "Online" | "Presencial";
  spots_left: number;
  description: string | null;
};

// ✅ Grouped classes (para expandir sesiones)
type GroupedSession = {
  id: number;
  date_iso: string;
  time_range: string;
  spots_left: number;
  modality?: "Online" | "Presencial";
  trainer_name?: string | null;
  title?: string;
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
    btnDeleteClass: "Delete",

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
    confirmDeleteClass: "Are you sure you want to delete this class?",
    errorDeleteClass: "Could not delete class.",
    errorSaveClass: "Could not save class.",

    // ✅ stats / KPIs
    statsTitle: "Requests per class",
    statsNoData: "There are no requests yet.",
    statsNoTrainer: "No trainer assigned",
    statsColumnRequestedAt: "Requested at",
    statsColumnAttendance: "Attended?",
    kpiTotalClasses: "Total courses",
    kpiAccepted: "Accepted bookings",
    kpiAttended: "Attended",
    kpiNotAttended: "Not attended",
    kpiNotMarked: "Not marked",
    kpiTotalAttended: "Total attended (overall)",
    kpiLoadError: "Could not load KPIs.",

    // ✅ sessions / grouped UI
    sessions: "Sessions",
    sessionsCount: "Sessions",
    expand: "Expand",
    collapse: "Collapse",

    // ✅ add sessions in modal
    addSessionsTitle: "Add sessions",
    addSessionsHint:
      "Define the start/end time for each session, then save. Times will be added to this class group.",
    sessionsCountLabel: "Number of sessions",
    addSessionsBtn: "Save sessions",
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
    btnDeleteClass: "Eliminar",

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
    confirmDeleteClass: "¿Seguro que quieres eliminar esta clase disponible?",
    errorDeleteClass: "No se pudo eliminar la clase.",
    errorSaveClass: "No se pudo guardar la clase.",

    // ✅ stats / KPIs
    statsTitle: "Solicitudes por clase",
    statsNoData: "Aún no hay solicitudes.",
    statsNoTrainer: "Sin trainer asignado",
    statsColumnRequestedAt: "Solicitada el",
    statsColumnAttendance: "¿Asistió?",
    kpiTotalClasses: "Total cursos",
    kpiAccepted: "Reservas aceptadas",
    kpiAttended: "Asistieron",
    kpiNotAttended: "No asistieron",
    kpiNotMarked: "Sin marcar",
    kpiTotalAttended: "Total asistentes (global)",
    kpiLoadError: "No se pudieron cargar los KPIs.",

    // ✅ sessions / grouped UI
    sessions: "Sesiones",
    sessionsCount: "Sesiones",
    expand: "Ver",
    collapse: "Ocultar",

    // ✅ add sessions in modal
    addSessionsTitle: "Agregar sesiones",
    addSessionsHint:
      "Define la hora de inicio/fin de cada sesión y guarda. Se agregarán a este grupo de clase.",
    sessionsCountLabel: "Número de sesiones",
    addSessionsBtn: "Guardar sesiones",
  },
};

async function ensureCsrf() {
  await api.get("/sanctum/csrf-cookie");
}

/** ✅ KPIs */
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

// ✅ Para modal Add sessions
type SessionDraft = { start_time: string; end_time: string };

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("en");
  const t = useCallback((key: string) => translations[lang][key] ?? key, [lang]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);

  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [editClass, setEditClass] = useState<AvailableClass | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("bookings");

  /** ✅ KPIs */
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [perClass, setPerClass] = useState<StatsPerClass[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  /** ✅ Grouped classes for sessions expand */
  const [groupedClasses, setGroupedClasses] = useState<GroupedClass[]>([]);
  const [expandedGroupCode, setExpandedGroupCode] = useState<string | null>(null);
  const toggleGroup = (code: string) =>
    setExpandedGroupCode((prev) => (prev === code ? null : code));

  /** ✅ Add sessions modal state */
  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [sessions, setSessions] = useState<SessionDraft[]>([{ start_time: "", end_time: "" }]);
  const [addingSessions, setAddingSessions] = useState(false);

  const setCount = (n: number) => {
    const safe = Math.max(1, Math.min(20, Number.isFinite(n) ? n : 1));
    setSessionsCount(safe);
    setSessions((prev) => {
      const next = [...prev];
      while (next.length < safe) next.push({ start_time: "", end_time: "" });
      return next.slice(0, safe);
    });
  };

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

  /** ✅ Fetch bookings + classes SOLO al montar */
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/api/admin/bookings");
        const data = res.data;
        const list: Booking[] = data.bookings ?? data;
        setBookings(list);
      } catch (err) {
        console.error("Error cargando reservas:", err);
      }
    };

    const fetchClasses = async () => {
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
          };
        });

        setClasses(list);
      } catch (err) {
        console.error("Error cargando clases:", err);
      }
    };

    fetchBookings();
    fetchClasses();
  }, []);

  /** ✅ Traer grouped classes cuando entras a tab "classes" */
  useEffect(() => {
    if (activeTab !== "classes") return;

    const fetchGrouped = async () => {
      try {
        const res = await api.get("/api/classes-grouped");
        const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
        setGroupedClasses(list);
      } catch (err) {
        console.error("Error cargando clases agrupadas:", err);
        setGroupedClasses([]);
      }
    };

    fetchGrouped();
  }, [activeTab]);

  const formatDate = (value: string) => {
    if (!value) return "—";
    // value puede venir "YYYY-MM-DD"
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
    if (typeof b.new_training_days === "number" && b.new_training_days > 0) return b.new_training_days;
    if (typeof b.original_training_days === "number" && b.original_training_days > 0) return b.original_training_days;

    // fallback simple
    try {
      const s = new Date(b.start_date);
      const e = new Date(b.end_date);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const openEditBookingModal = (booking: Booking) => {
    setEditBooking(booking);
    setShowEditBookingModal(true);
  };

  const saveBookingChanges = async () => {
    if (!editBooking) return;
    try {
      await ensureCsrf();
      // ⚠️ si no tienes endpoint de update booking fields, puedes omitir esto.
      // Aquí lo dejamos sin romper tu flow: solo cierra modal.
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

  const toggleAttendance = async (booking: Booking) => {
    try {
      await ensureCsrf();
      const next =
        booking.attendedbutton === true ? false : true; // toggling simple

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

  // ✅ Classes CRUD
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
    });
    setShowClassModal(true);

    // reset sessions inputs
    setCount(1);
    setSessions([{ start_time: "", end_time: "" }]);
  };

  const openEditClassModal = (cls: AvailableClass) => {
    setIsNewClass(false);
    setEditClass({ ...cls });
    setShowClassModal(true);

    // reset sessions inputs
    setCount(1);
    setSessions([{ start_time: "", end_time: "" }]);
  };

  const saveClassChanges = async () => {
    if (!editClass) return;

    try {
      await ensureCsrf();

      const payload = {
        title: editClass.title,
        trainer_name: editClass.trainer_name,
        start_date: editClass.start_date,
        end_date: editClass.end_date,
        start_time: editClass.start_time,
        end_time: editClass.end_time,
        modality: editClass.modality,
        spots_left: editClass.spots_left,
        description: editClass.description ?? null,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data?.class ?? res.data;

        setClasses((prev) => [
          ...prev,
          {
            id: saved.id,
            title: saved.title,
            trainer_id: editClass.trainer_id,
            trainer_name: saved.trainer_name,
            start_date: saved.start_date,
            end_date: saved.end_date,
            start_time: saved.start_time,
            end_time: saved.end_time,
            modality: saved.modality,
            spots_left: saved.spots_left,
            description: saved.description ?? null,
          },
        ]);
      } else {
        await api.put(`/api/admin/classes/${editClass.id}`, payload);

        setClasses((prev) =>
          prev.map((c) =>
            c.id === editClass.id
              ? { ...c, ...editClass, description: editClass.description ?? null }
              : c
          )
        );
      }

      setShowClassModal(false);

      // refrescar grouped list si estás viendo clases
      if (activeTab === "classes") {
        try {
          const res = await api.get("/api/classes-grouped");
          const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
          setGroupedClasses(list);
        } catch {}
      }
    } catch (err: any) {
      console.error("Error guardando clase:", err);
      if (err.response?.data) alert(JSON.stringify(err.response.data, null, 2));
      else alert(t("errorSaveClass"));
    }
  };

  // ✅ Add sessions to existing class/group
  const addSessionsToClass = async () => {
    if (!editClass || isNewClass) return;

    // validación rápida
    const hasEmpty = sessions.some((s) => !s.start_time || !s.end_time);
    if (hasEmpty) {
      alert("Please fill start/end time for all sessions.");
      return;
    }

    setAddingSessions(true);
    try {
      await ensureCsrf();

      // 🔥 Ajusta este endpoint al que creaste en backend
      // Ej: POST /api/admin/classes/{id}/sessions
      await api.post(`/api/admin/classes/${editClass.id}/sessions`, {
        sessions: sessions.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      });

      // refrescar grouped list para que veas el count y las sesiones
      try {
        const res = await api.get("/api/classes-grouped");
        const list: GroupedClass[] = res.data?.classes ?? res.data ?? [];
        setGroupedClasses(list);
      } catch {}

      alert("Sessions saved ✅");
    } catch (err: any) {
      console.error("Error saving sessions:", err);
      if (err.response?.data) alert(JSON.stringify(err.response.data, null, 2));
      else alert("Could not save sessions.");
    } finally {
      setAddingSessions(false);
    }
  };

  /** ✅ Stats */
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
                      <th>{t("statsColumnAttendance")}</th>
                      <th>{t("columnStatus")}</th>
                      <th>{t("columnActions")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.map((b) => {
                      const attendanceLabel =
                        b.attendedbutton === true
                          ? "Attended"
                          : b.attendedbutton === false
                          ? "Not attended"
                          : "Not marked";

                      return (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td>{b.email}</td>
                          <td>{formatDate(b.start_date)}</td>
                          <td>{formatDate(b.end_date)}</td>
                          <td>{totalDays(b)}</td>
                          <td>{b.trainer_name || "—"}</td>
                          <td className="admin-description-cell">{b.notes || "—"}</td>
                          <td>{formatDateTime(b.created_at)}</td>

                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-outline"
                              onClick={() => toggleAttendance(b)}
                              title={attendanceLabel}
                            >
                              {b.attendedbutton === true ? "✅" : "⬜"} {attendanceLabel}
                            </button>
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
                                className="btn btn-primary"
                                onClick={() => updateBookingStatus(b.id, "accepted")}
                              >
                                ✅ {t("btnAccept")}
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => updateBookingStatus(b.id, "denied")}
                              >
                                ❌ {t("btnDeny")}
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => openEditBookingModal(b)}
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger btn-outline"
                                onClick={() => handleDeleteBooking(b.id)}
                              >
                                🗑 {t("btnDelete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* CLASSES (GROUPED + EXPAND SESSIONS) */}
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
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("colClassTitle")}</th>
                      <th>{t("colClassTrainer")}</th>
                      <th>{t("colClassType")}</th>
                      <th>{t("sessionsCount")}</th>
                      <th>{t("colClassDescription")}</th>
                      <th>{t("columnActions")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedClasses.map((g) => {
                      const isOpen = expandedGroupCode === g.group_code;

                      // elegimos 1 sesión “representativa” para editar (la primera)
                      const firstSessionId = g.sessions?.[0]?.id;

                      return (
                        <>
                          <tr
                            key={g.group_code}
                            style={{ cursor: "pointer" }}
                            onClick={() => toggleGroup(g.group_code)}
                          >
                            <td>
                              <strong>{g.title}</strong>
                            </td>
                            <td>{g.trainer_name || "—"}</td>
                            <td>{g.modality}</td>
                            <td>
                              <span className="status-pill status-pending">
                                {g.sessions_count}
                              </span>
                            </td>
                            <td className="admin-description-cell">
                              {g.description || "—"}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-outline"
                                  onClick={() => toggleGroup(g.group_code)}
                                >
                                  {isOpen ? `➖ ${t("collapse")}` : `➕ ${t("expand")}`}
                                </button>

                                {/* Edit: abrimos el modal con la sesión 1 (si existe) */}
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  disabled={!firstSessionId}
                                  onClick={() => {
                                    if (!firstSessionId) return;
                                    const cls = classes.find((c) => c.id === firstSessionId);
                                    if (cls) openEditClassModal(cls);
                                    else alert("Could not find that session in admin classes list.");
                                  }}
                                >
                                  ✏️ {t("btnEditClass")}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr key={`${g.group_code}__details`}>
                              <td colSpan={6} style={{ padding: "12px 14px" }}>
                                <div style={{ opacity: 0.9, marginBottom: 8 }}>
                                  <strong>{t("sessions")}:</strong>
                                </div>

                                <div className="admin-table-wrapper" style={{ marginTop: 6 }}>
                                  <table className="admin-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>{t("colClassStart")}</th>
                                        <th>{t("colClassTime")}</th>
                                        <th>{t("colClassSeats")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(g.sessions ?? []).map((s, idx) => (
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
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
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
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiTotalClasses")}</div>
                  <div className="admin-kpi-value">{kpis.total_classes_created}</div>
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
                  <div className="admin-kpi-value">{kpis.not_attended_total}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiNotMarked")}</div>
                  <div className="admin-kpi-value">{kpis.not_marked_total}</div>
                </div>
                <div className="admin-kpi-card">
                  <div className="admin-kpi-label">{t("kpiTotalAttended")}</div>
                  <div className="admin-kpi-value">{kpis.total_attended_overall}</div>
                </div>
              </div>
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
                      {perClass.map((r, idx) => (
                        <tr key={`${r.classTitle}_${idx}`}>
                          <td>{r.classTitle}</td>
                          <td>{formatDate(r.start_date)}</td>
                          <td>{formatDate(r.end_date)}</td>
                          <td>{r.trainer_name || t("statsNoTrainer")}</td>
                          <td>{r.requests}</td>
                          <td>{r.attended}</td>
                          <td>{r.not_attended}</td>
                          <td>{r.not_marked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {!statsLoading && !statsError && !kpis && (
              <p className="admin-message">{t("statsNoData")}</p>
            )}
          </section>
        )}
      </div>

      {/* MODAL EDIT BOOKING */}
      {showEditBookingModal && editBooking && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => setShowEditBookingModal(false)}
        >
          <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>{t("modalEditBookingTitle")}</h3>

            <label>{t("modalNameLabel")}</label>
            <input
              className="form-input"
              type="text"
              value={editBooking.name}
              onChange={(e) =>
                setEditBooking({ ...editBooking, name: e.target.value })
              }
            />

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
                className="btn btn-secondary"
                onClick={() => setShowEditBookingModal(false)}
              >
                {t("modalCancel")}
              </button>

              <button className="btn btn-primary" onClick={saveBookingChanges}>
                {t("modalSave")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NEW / EDIT CLASS */}
      {showClassModal && editClass && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => setShowClassModal(false)}
        >
          <div
            className="admin-modal admin-modal-dark"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3>{isNewClass ? t("modalNewClass") : t("modalEditClass")}</h3>

            <label>{t("labelClassTitle")}</label>
            <input
              className="form-input"
              type="text"
              value={editClass.title}
              onChange={(e) =>
                setEditClass({ ...editClass, title: e.target.value })
              }
            />

            <label>{t("labelTrainer")}</label>
            <select
              className="form-select"
              value={editClass.trainer_id ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const trainer = TRAINERS.find((tt) => tt.id === id) || null;
                setEditClass({
                  ...editClass,
                  trainer_id: id,
                  trainer_name: trainer ? trainer.name : null,
                });
              }}
            >
              <option value="">{t("optionSelectTrainer")}</option>
              {TRAINERS.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>

            <div className="form-grid">
              <div>
                <label>{t("labelStartDate")}</label>
                <input
                  className="form-input"
                  type="date"
                  value={editClass.start_date}
                  onChange={(e) =>
                    setEditClass({ ...editClass, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label>{t("labelEndDate")}</label>
                <input
                  className="form-input"
                  type="date"
                  value={editClass.end_date}
                  onChange={(e) =>
                    setEditClass({ ...editClass, end_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label>{t("labelStartTime")}</label>
                <input
                  className="form-input"
                  type="time"
                  value={editClass.start_time}
                  onChange={(e) =>
                    setEditClass({ ...editClass, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <label>{t("labelEndTime")}</label>
                <input
                  className="form-input"
                  type="time"
                  value={editClass.end_time}
                  onChange={(e) =>
                    setEditClass({ ...editClass, end_time: e.target.value })
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
                  modality: e.target.value as "Online" | "Presencial",
                })
              }
            >
              <option value="Presencial">{t("typeInPerson")}</option>
              <option value="Online">{t("typeOnline")}</option>
            </select>

            <label>{t("labelSeats")}</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={editClass.spots_left}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  spots_left: Number(e.target.value),
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

            {/* ✅ NEW: Add sessions section (only when editing an existing class) */}
            {!isNewClass && (
              <>
                <hr style={{ opacity: 0.2, margin: "16px 0" }} />

                <h4 style={{ margin: "0 0 8px 0" }}>{t("addSessionsTitle")}</h4>
                <p style={{ margin: "0 0 12px 0", opacity: 0.8 }}>
                  {t("addSessionsHint")}
                </p>

                <label>{t("sessionsCountLabel")}</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={20}
                  value={sessionsCount}
                  onChange={(e) => setCount(Number(e.target.value))}
                />

                {sessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="form-grid"
                    style={{ marginTop: 10 }}
                  >
                    <div>
                      <label>Session {idx + 1} start</label>
                      <input
                        className="form-input"
                        type="time"
                        value={s.start_time}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSessions((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, start_time: v } : x
                            )
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label>Session {idx + 1} end</label>
                      <input
                        className="form-input"
                        type="time"
                        value={s.end_time}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSessions((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, end_time: v } : x
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addSessionsToClass}
                  disabled={addingSessions}
                  style={{ marginTop: 12 }}
                >
                  ➕ {addingSessions ? "Saving…" : t("addSessionsBtn")}
                </button>
              </>
            )}

            <div className="admin-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowClassModal(false)}
              >
                {t("modalCancelDark")}
              </button>
              <button className="btn btn-primary" onClick={saveClassChanges}>
                {t("modalSaveDark")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
