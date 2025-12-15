import { useState, useEffect, useMemo, useCallback } from "react";
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

type StatsResponse = WrappedStats | Kpis;

type BookingGroup = {
  key: string;
  classTitle: string;
  start_date: string;
  end_date: string;
  trainer_name: string | null;
  requests: Booking[];
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

  /** ✅ KPIs */
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [perClass, setPerClass] = useState<StatsPerClass[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  const bookingGroups: BookingGroup[] = useMemo(() => {
    const acceptedBookings = bookings.filter((b) => b.status === "accepted");
    const map = new Map<string, BookingGroup>();

    for (const b of acceptedBookings) {
      const key = `${b.name}__${b.start_date}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          classTitle: b.name,
          start_date: b.start_date,
          end_date: b.end_date,
          trainer_name: b.trainer_name,
          requests: [],
        });
      }
      map.get(key)!.requests.push(b);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
  }, [bookings]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const parts = value.split("-");
    if (parts.length !== 3) return value;
    const [year, month, day] = parts;
    return lang === "en"
      ? `${month}/${day}/${year}`
      : `${day}/${month}/${year}`;
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const locale = lang === "en" ? "en-US" : "es-ES";
    return d.toLocaleString(locale);
  };

  const openEditBookingModal = (booking: Booking) => {
    setEditBooking(booking);
    setShowEditBookingModal(true);
  };

  /** ✅ Stats: usa TU ruta real web.php */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const res = await api.get<StatsResponse>("/api/admin/stats/kpis");
      const data = res.data;

      if (isWrappedStats(data)) {
        setKpis(data.kpis);
        setPerClass(data.per_class ?? []);
      } else if (isKpis(data)) {
        setKpis(data);
        setPerClass([]);
      } else {
        throw new Error("Unexpected stats response shape");
      }
    } catch (err) {
      console.error("Error cargando stats:", err);
      setKpis(null);
      setPerClass([]);
      setStatsError(translations[lang].kpiLoadError);
    } finally {
      setStatsLoading(false);
    }
  }, [lang]);

  /** ✅ Cargar stats SOLO al entrar en tab */
  useEffect(() => {
    if (activeTab !== "stats") return;
    fetchStats();
  }, [activeTab, fetchStats]);

  const saveBookingChanges = async () => {
    if (!editBooking) return;

    try {
      await ensureCsrf();
      // OJO: si no tienes esta ruta en backend, comenta este PUT.
      const res = await api.put(
        `/api/admin/bookings/${editBooking.id}`,
        editBooking
      );
      const updated: Booking = res.data.booking ?? editBooking;

      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      setShowEditBookingModal(false);

      if (activeTab === "stats") fetchStats();
    } catch (err) {
      console.error("Error guardando cambios:", err);
      alert(t("errorUpdateBookingStatus"));
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm(t("confirmDeleteBooking"))) return;

    try {
      await ensureCsrf();
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));

      if (activeTab === "stats") fetchStats();
    } catch (err) {
      console.error("Error al eliminar reserva:", err);
      alert(t("errorDeleteBooking"));
    }
  };

  const handleBookingStatus = async (
    booking: Booking,
    newStatus: "accepted" | "denied"
  ) => {
    let calendarUrl: string | null = booking.calendar_url ?? null;

    if (newStatus === "accepted" && !calendarUrl) {
      const input = window.prompt(
        "Paste the Google Calendar link for this class (you can leave it empty)."
      );
      if (input === null) return;
      calendarUrl = input.trim() || null;
    }

    const msg =
      newStatus === "accepted"
        ? "Are you sure you want to ACCEPT this booking?"
        : "Are you sure you want to DENY this booking?";

    if (!window.confirm(msg)) return;

    try {
      await ensureCsrf();
      const res = await api.put(`/api/admin/bookings/${booking.id}/status`, {
        status: newStatus,
        calendar_url: calendarUrl,
      });

      const updated: Booking = res.data.booking ?? res.data;
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );

      if (activeTab === "stats") fetchStats();
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert(t("errorUpdateBookingStatus"));
    }
  };

  const toggleAttendance = async (booking: Booking) => {
    const next = booking.attendedbutton === true ? false : true;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id ? { ...b, attendedbutton: next } : b
      )
    );

    try {
      await ensureCsrf();
      await api.put(`/api/admin/bookings/${booking.id}/attendance`, {
        attendedbutton: next,
      });

      if (activeTab === "stats") fetchStats();
    } catch (err) {
      console.error("Error updating attendance:", err);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, attendedbutton: booking.attendedbutton ?? null }
            : b
        )
      );

      alert(t("errorUpdateBookingStatus"));
    }
  };

  const openNewClassModal = () => {
    setEditClass({
      id: 0,
      title: "",
      trainer_id: null,
      trainer_name: null,
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      modality: "Presencial",
      spots_left: 1,
      description: "",
    });
    setIsNewClass(true);
    setShowClassModal(true);
  };

  const openEditClassModal = (cls: AvailableClass) => {
    const foundTrainer = TRAINERS.find((tt) => tt.name === cls.trainer_name);
    setEditClass({
      ...cls,
      trainer_id: foundTrainer ? foundTrainer.id : cls.trainer_id,
    });
    setIsNewClass(false);
    setShowClassModal(true);
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
        description: editClass.description,
      };

      if (isNewClass) {
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data.class ?? res.data;

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
              ? {
                  ...c,
                  ...editClass,
                  description: editClass.description ?? null,
                }
              : c
          )
        );
      }

      setShowClassModal(false);
      if (activeTab === "stats") fetchStats();
    } catch (err: any) {
      console.error("Error guardando clase:", err);
      if (err.response?.data) alert(JSON.stringify(err.response.data, null, 2));
      else alert(t("errorSaveClass"));
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!window.confirm(t("confirmDeleteClass"))) return;

    try {
      await ensureCsrf();
      await api.delete(`/api/admin/classes/${id}`);
      setClasses((prev) => prev.filter((c) => c.id !== id));

      if (activeTab === "stats") fetchStats();
    } catch (err) {
      console.error("Error eliminando clase:", err);
      alert(t("errorDeleteClass"));
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
                      <th>{t("columnStatus")}</th>
                      <th>{t("columnActions")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.map((b) => {
                      const start = new Date(b.start_date);
                      const end = new Date(b.end_date);
                      const diffMs = end.getTime() - start.getTime();
                      const days = Math.round(diffMs / 86400000) + 1;

                      return (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td>{b.email}</td>
                          <td>{formatDate(b.start_date)}</td>
                          <td>{formatDate(b.end_date)}</td>
                          <td>{Number.isNaN(days) ? "—" : days}</td>
                          <td>{b.trainer_name || "—"}</td>
                          <td className="admin-notes-cell">{b.notes || "—"}</td>
                          <td>{formatDateTime(b.created_at)}</td>

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
                              {b.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() =>
                                      handleBookingStatus(b, "accepted")
                                    }
                                  >
                                    ✅ {t("btnAccept")}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() =>
                                      handleBookingStatus(b, "denied")
                                    }
                                  >
                                    ❌ {t("btnDeny")}
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className="btn btn-icon"
                                aria-label="Edit"
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

            {classes.length === 0 && (
              <p className="admin-message">{t("noClasses")}</p>
            )}

            {classes.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("colClassTitle")}</th>
                      <th>{t("colClassTrainer")}</th>
                      <th>{t("colClassStart")}</th>
                      <th>{t("colClassEnd")}</th>
                      <th>{t("colClassTime")}</th>
                      <th>{t("colClassType")}</th>
                      <th>{t("colClassSeats")}</th>
                      <th>{t("colClassDescription")}</th>
                      <th>{t("columnActions")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id}>
                        <td>{cls.title}</td>
                        <td>{cls.trainer_name}</td>
                        <td>{formatDate(cls.start_date)}</td>
                        <td>{formatDate(cls.end_date)}</td>
                        <td>
                          {cls.start_time} – {cls.end_time}
                        </td>
                        <td>{cls.modality}</td>
                        <td>{cls.spots_left}</td>
                        <td className="admin-description-cell">
                          {cls.description || "—"}
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openEditClassModal(cls)}
                            >
                              ✏️ {t("btnEditClass")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-outline"
                              onClick={() => handleDeleteClass(cls.id)}
                            >
                              🗑 {t("btnDeleteClass")}
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

        {/* STATS */}
        {activeTab === "stats" && (
          <section className="admin-table-section">
            <div className="stats-title-row">
              <h2 className="admin-table-title">{t("statsTitle")}</h2>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={fetchStats}
                disabled={statsLoading}
                title="Refresh KPIs"
              >
                🔄 Refresh
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadKpisCsv}
                disabled={statsLoading}
                title="Download KPIs CSV"
              >
                ⬇️ Download KPIs (CSV)
              </button>
            </div>

            {statsLoading && <p className="admin-message">Loading stats…</p>}
            {!statsLoading && !kpis && !statsError && (
              <p className="admin-message">No stats yet.</p>
            )}

            {!statsLoading && kpis && (
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

            {!statsLoading && perClass.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Dates</th>
                      <th>Trainer</th>
                      <th>Requests</th>
                      <th>Attended</th>
                      <th>Not attended</th>
                      <th>Not marked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perClass.map((row, idx) => (
                      <tr key={`${row.classTitle}-${row.start_date}-${idx}`}>
                        <td>{row.classTitle}</td>
                        <td>
                          {formatDate(row.start_date)} –{" "}
                          {formatDate(row.end_date)}
                        </td>
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
            )}

            {!statsLoading && bookingGroups.length === 0 && (
              <p className="admin-message">{t("statsNoData")}</p>
            )}

            {bookingGroups.length > 0 && (
              <div className="admin-table-wrapper">
                {bookingGroups.map((group) => (
                  <div key={group.key} className="admin-stats-group">
                    <div className="admin-stats-group-header">
                      <h3>{group.classTitle}</h3>
                      <p>
                        {formatDate(group.start_date)} –{" "}
                        {formatDate(group.end_date)} ·{" "}
                        {group.trainer_name || t("statsNoTrainer")}
                      </p>
                    </div>

                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("columnName")}</th>
                          <th>{t("columnEmail")}</th>
                          <th>{t("statsColumnRequestedAt")}</th>
                          <th className="th-center">
                            {t("statsColumnAttendance")}
                          </th>
                          <th>{t("columnStatus")}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.requests.map((b) => (
                          <tr key={b.id}>
                            <td>{b.name}</td>
                            <td>{b.email}</td>
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
                                aria-label="Toggle attended"
                                onClick={() => toggleAttendance(b)}
                                title={
                                  b.attendedbutton === true
                                    ? "Attended"
                                    : "Not attended"
                                }
                              />
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
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
