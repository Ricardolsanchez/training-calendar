import { useState, useEffect } from "react";
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
};

type AvailableClass = {
  id: number;
  title: string;
  trainer_id: number | null; // solo para el select
  trainer_name: string | null; // viene de la BD
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  modality: "Online" | "Presencial";
  spots_left: number;
};
type Trainer = {
  id: number;
  name: string;
};

type Tab = "bookings" | "classes";
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

// 🔤 Traducciones para el admin
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
    btnAccept: "✅ Accept",
    btnDeny: "❌ Deny",
    btnDelete: "🗑 Delete",
    classesTitle: "Available Classes",
    colClassTitle: "Title",
    colClassTrainer: "Trainer",
    colClassStart: "Start",
    colClassEnd: "End",
    colClassTime: "Time",
    colClassType: "Type",
    colClassSeats: "Available Seats",
    btnEditClass: "✏️ Edit",
    btnDeleteClass: "🗑 Delete",
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
    optionSelectTrainer: "Select a Trainer",
    typeInPerson: "In Person",
    typeOnline: "Online",
    modalCancelDark: "Cancel",
    modalSaveDark: "Save",
    confirmDeleteClass: "Are you sure you want to delete this class?",
    errorDeleteClass: "Could not delete class.",
    errorSaveClass: "Could not save class.",
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
    btnAccept: "✅ Aceptar",
    btnDeny: "❌ Rechazar",
    btnDelete: "🗑 Eliminar",
    classesTitle: "Clases disponibles",
    colClassTitle: "Título",
    colClassTrainer: "Trainer",
    colClassStart: "Inicio",
    colClassEnd: "Fin",
    colClassTime: "Horario",
    colClassType: "Modalidad",
    colClassSeats: "Cupos",
    btnEditClass: "✏️ Editar",
    btnDeleteClass: "🗑 Eliminar",
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
    optionSelectTrainer: "Selecciona un trainer",
    typeInPerson: "Presencial",
    typeOnline: "Online",
    modalCancelDark: "Cancelar",
    modalSaveDark: "Guardar",
    confirmDeleteClass: "¿Seguro que quieres eliminar esta clase disponible?",
    errorDeleteClass: "No se pudo eliminar la clase.",
    errorSaveClass: "No se pudo guardar la clase.",
  },
};

async function ensureCsrf() {
  await api.get("/sanctum/csrf-cookie");
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => translations[lang][key];

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);

  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [editClass, setEditClass] = useState<AvailableClass | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [isNewClass, setIsNewClass] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("bookings");

  // =======================
  // CARGAR RESERVAS + CLASES
  // =======================
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
          const trainer = TRAINERS.find((t) => t.name === cls.trainer_name);

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

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const locale = lang === "en" ? "en-US" : "es-ES";
    return d.toLocaleDateString(locale);
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const locale = lang === "en" ? "en-US" : "es-ES";
    return d.toLocaleString(locale);
  };

  // =======================
  // EDIT BOOKING
  // =======================
  const openEditBookingModal = (booking: Booking) => {
    setEditBooking(booking);
    setShowEditBookingModal(true);
  };

  const saveBookingChanges = async () => {
    if (!editBooking) return;

    try {
      await ensureCsrf();
      const res = await api.put(
        `/api/admin/bookings/${editBooking.id}`,
        editBooking
      );

      const updated: Booking = res.data.booking ?? editBooking;

      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );

      setShowEditBookingModal(false);
    } catch (err) {
      console.error("Error guardando cambios:", err);
      alert(t("errorUpdateBookingStatus"));
    }
  };

  const handleDeleteBooking = async (id: number) => {
    const confirmDelete = window.confirm(t("confirmDeleteBooking"));
    if (!confirmDelete) return;

    try {
      await ensureCsrf();
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));
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

      if (input === null) {
        return;
      }

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

      const updated: Booking = res.data.booking;

      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert(t("errorUpdateBookingStatus"));
    }
  };

  // =======================
  // CLASES: NUEVA / EDITAR
  // =======================
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
    });
    setIsNewClass(true);
    setShowClassModal(true);
  };

  const openEditClassModal = (cls: AvailableClass) => {
    const foundTrainer = TRAINERS.find((t) => t.name === cls.trainer_name);

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
      };

      if (isNewClass) {
        // 👉 Crear nueva clase
        const res = await api.post("/api/admin/classes", payload);
        const saved = res.data.class ?? res.data;

        setClasses((prev) => [
          ...prev,
          {
            id: saved.id, // el id real de la BD
            title: editClass.title,
            trainer_id: editClass.trainer_id,
            trainer_name: editClass.trainer_name,
            start_date: editClass.start_date,
            end_date: editClass.end_date,
            start_time: editClass.start_time,
            end_time: editClass.end_time,
            modality: editClass.modality,
            spots_left: editClass.spots_left,
          },
        ]);
      } else {
        // 👉 Editar clase existente
        await api.put(`/api/admin/classes/${editClass.id}`, payload);

        setClasses((prev) =>
          prev.map((c) =>
            c.id === editClass.id
              ? {
                  ...c,
                  // aplicamos lo que el usuario editó
                  title: editClass.title,
                  trainer_id: editClass.trainer_id,
                  trainer_name: editClass.trainer_name,
                  start_date: editClass.start_date,
                  end_date: editClass.end_date,
                  start_time: editClass.start_time,
                  end_time: editClass.end_time,
                  modality: editClass.modality,
                  spots_left: editClass.spots_left,
                }
              : c
          )
        );
      }

      setShowClassModal(false);
    } catch (err: any) {
      console.error("Error guardando clase:", err);
      if (err.response?.data) {
        console.log("VALIDATION:", err.response.data);
        alert(JSON.stringify(err.response.data, null, 2));
      } else {
        alert(t("errorSaveClass"));
      }
    }
  };

  const handleDeleteClass = async (id: number) => {
    const confirmDelete = window.confirm(t("confirmDeleteClass"));
    if (!confirmDelete) return;

    try {
      await ensureCsrf();

      const clsToDelete = classes.find((c) => c.id === id);

      await api.delete(`/api/admin/classes/${id}`);

      setClasses((prev) => prev.filter((c) => c.id !== id));

      if (clsToDelete) {
        setBookings((prev) =>
          prev.filter(
            (b) =>
              !(
                b.name === clsToDelete.title &&
                b.start_date === clsToDelete.start_date
              )
          )
        );
      }
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
            {/* 🌍 toggle idioma */}
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
        </div>

        {/* ===================== BOOKINGS ===================== */}
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
                        <tr key={b.id} className="admin-class-row">
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
                          <td className="admin-actions">
                            {b.status === "pending" && (
                              <>
                                <button
                                  className="admin-accept-button"
                                  onClick={() =>
                                    handleBookingStatus(b, "accepted")
                                  }
                                >
                                  {t("btnAccept")}
                                </button>
                                <button
                                  className="admin-deny-button"
                                  onClick={() =>
                                    handleBookingStatus(b, "denied")
                                  }
                                >
                                  {t("btnDeny")}
                                </button>
                              </>
                            )}

                            {/* 🔹 NUEVO BOTÓN EDITAR RESERVA */}
                            <button
                              className="admin-edit-button"
                              onClick={() => openEditBookingModal(b)}
                            >
                              ✏️
                            </button>

                            <button
                              className="admin-delete-button"
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              {t("btnDelete")}
                            </button>
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

        {/* ===================== CLASES ===================== */}
        {activeTab === "classes" && (
          <section className="admin-table-section">
            <div className="admin-table-header-row">
              <h2 className="admin-table-title">{t("classesTitle")}</h2>
              <button
                type="button"
                className="admin-primary-button"
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
                        <td className="admin-actions">
                          <button
                            className="admin-edit-button"
                            onClick={() => openEditClassModal(cls)}
                          >
                            {t("btnEditClass")}
                          </button>
                          <button
                            className="admin-delete-button"
                            onClick={() => handleDeleteClass(cls.id)}
                          >
                            {t("btnDeleteClass")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* =============== MODAL EDIT BOOKING =============== */}
      {showEditBookingModal && editBooking && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>{t("modalEditBookingTitle")}</h3>

            <label>{t("modalNameLabel")}</label>
            <input
              type="text"
              value={editBooking.name}
              onChange={(e) =>
                setEditBooking({
                  ...editBooking,
                  name: e.target.value,
                })
              }
            />

            <label>{t("modalNotesLabel")}</label>
            <textarea
              value={editBooking.notes ?? ""}
              onChange={(e) =>
                setEditBooking({
                  ...editBooking,
                  notes: e.target.value,
                })
              }
            />

            <div className="admin-modal-actions">
              <button
                className="admin-cancel-button"
                onClick={() => setShowEditBookingModal(false)}
              >
                {t("modalCancel")}
              </button>

              <button
                className="admin-save-button"
                onClick={saveBookingChanges}
              >
                {t("modalSave")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============== MODAL NEW / EDIT CLASS =============== */}
      {showClassModal && editClass && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-dark">
            <h3>{isNewClass ? t("modalNewClass") : t("modalEditClass")}</h3>

            <label>{t("labelClassTitle")}</label>
            <input
              type="text"
              value={editClass.title}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  title: e.target.value,
                })
              }
            />

            <label>{t("labelTrainer")}</label>
            <select
              value={editClass.trainer_id ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const trainer = TRAINERS.find((t) => t.id === id) || null;

                setEditClass({
                  ...editClass,
                  trainer_id: id,
                  trainer_name: trainer ? trainer.name : null,
                });
              }}
            >
              <option value="">{t("optionSelectTrainer")}</option>
              {TRAINERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <label>{t("labelStartDate")}</label>
            <input
              type="date"
              value={editClass.start_date}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  start_date: e.target.value,
                })
              }
            />

            <label>{t("labelEndDate")}</label>
            <input
              type="date"
              value={editClass.end_date}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  end_date: e.target.value,
                })
              }
            />

            <label>{t("labelStartTime")}</label>
            <input
              type="time"
              value={editClass.start_time}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  start_time: e.target.value,
                })
              }
            />

            <label>{t("labelEndTime")}</label>
            <input
              type="time"
              value={editClass.end_time}
              onChange={(e) =>
                setEditClass({
                  ...editClass,
                  end_time: e.target.value,
                })
              }
            />

            <label>{t("labelType")}</label>
            <select
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

            <div className="admin-modal-actions">
              <button
                className="admin-cancel-dark"
                onClick={() => setShowClassModal(false)}
              >
                {t("modalCancelDark")}
              </button>
              <button className="admin-save-dark" onClick={saveClassChanges}>
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
