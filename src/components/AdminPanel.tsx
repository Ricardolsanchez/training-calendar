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
    trainer_id: number | null;
    trainer_name: string;
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

// Lista fija de trainers
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

// helper para CSRF
async function ensureCsrf() {
    await api.get("/sanctum/csrf-cookie");
}

const AdminPanel: React.FC = () => {
    const navigate = useNavigate();

    // ======== RESERVAS =========
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [editBooking, setEditBooking] = useState<Booking | null>(null);
    const [showEditBookingModal, setShowEditBookingModal] = useState(false);

    // ======== CLASES DISPONIBLES =========
    const [classes, setClasses] = useState<AvailableClass[]>([]);
    const [editClass, setEditClass] = useState<AvailableClass | null>(null);
    const [showClassModal, setShowClassModal] = useState(false);
    const [isNewClass, setIsNewClass] = useState(false);

    // ======== UI: pestañas =========
    const [activeTab, setActiveTab] = useState<Tab>("bookings");

    // ======== CARGA INICIAL (GET no necesitan CSRF) =========
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
                const list: AvailableClass[] = data.classes ?? data;
                setClasses(list);
            } catch (err) {
                console.error("Error cargando clases:", err);
            }
        };

        fetchBookings();
        fetchClasses();
    }, []);

    // ======== HELPERS FORMATEO =========
    const formatDate = (value: string | null) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString("es-ES");
    };

    const formatDateTime = (value: string) => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("es-ES");
    };

    // ======== BOOKING: GUARDAR CAMBIOS =========
    const saveBookingChanges = async () => {
        if (!editBooking) return;

        try {
            await ensureCsrf(); // 👈 importante

            await api.put(`/api/admin/bookings/${editBooking.id}`, editBooking);

            setBookings((prev) =>
                prev.map((b) => (b.id === editBooking.id ? editBooking : b))
            );

            setShowEditBookingModal(false);
        } catch (err) {
            console.error("Error guardando cambios:", err);
            alert("No se pudo actualizar la reserva.");
        }
    };

    const handleDeleteBooking = async (id: number) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this booking?"
        );
        if (!confirmDelete) return;

        try {
            await ensureCsrf(); // 👈 importante

            await api.delete(`/api/admin/bookings/${id}`);
            setBookings((prev) => prev.filter((b) => b.id !== id));
        } catch (err) {
            console.error("Error al eliminar reserva:", err);
            alert("No se pudo eliminar la reserva.");
        }
    };

    const handleBookingStatus = async (
        booking: Booking,
        newStatus: "accepted" | "denied"
    ) => {
        let calendarUrl: string | null = booking.calendar_url ?? null;

        // Si vamos a aceptar y NO hay link todavía, pedimos uno
        if (newStatus === "accepted" && !calendarUrl) {
            const input = window.prompt(
                "Paste the Google Calendar link for this class (you can leave it empty)."
            );

            if (input === null) {
                // Canceló el popup → no hacer nada
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

            const res = await api.put(
                `/api/admin/bookings/${booking.id}/status`,
                {
                    status: newStatus,
                    calendar_url: calendarUrl,
                }
            );

            const updated: Booking = res.data.booking;

            setBookings((prev) =>
                prev.map((b) => (b.id === updated.id ? updated : b))
            );
        } catch (err) {
            console.error("Error updating booking status:", err);
            alert("Could not update booking status.");
        }
    };

    // ======== CLASES: NUEVA / EDITAR =========
    const openNewClassModal = () => {
        setEditClass({
            id: 0,
            title: "",
            trainer_id: null,
            trainer_name: "",
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
        // Buscar el trainer según el nombre que viene en la clase
        const foundTrainer = TRAINERS.find((t) => t.name === cls.trainer_name);

        // Actualizar el estado con trainer_id corregido
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
            // 1) Refrescar CSRF antes de cualquier POST/PUT/DELETE
            await api.get("/sanctum/csrf-cookie");

            let saved: AvailableClass;

            if (isNewClass) {
                // 2) Crear
                const res = await api.post("/api/admin/classes", editClass);
                saved = res.data.class ?? res.data;
                setClasses((prev) => [...prev, saved]);
            } else {
                // 3) Actualizar
                const res = await api.put(
                    `/api/admin/classes/${editClass.id}`,
                    editClass
                );
                saved = res.data.class ?? res.data;

                setClasses((prev) =>
                    prev.map((c) => (c.id === editClass.id ? saved : c))
                );
            }

            setShowClassModal(false);
        } catch (err: any) {
            console.error("Error guardando clase:", err);

            if (err.response?.data) {
                console.log("VALIDATION:", err.response.data);
            }

            alert("No se pudo guardar la clase.");
        }
    };

    const handleDeleteClass = async (id: number) => {
        const confirmDelete = window.confirm(
            "¿Seguro que quieres eliminar esta clase disponible?"
        );
        if (!confirmDelete) return;

        try {
            await ensureCsrf(); // 👈 importante

            // Buscar la clase antes de borrarla del estado
            const clsToDelete = classes.find((c) => c.id === id);

            await api.delete(`/api/admin/classes/${id}`);

            // 1) Sacar la clase de la lista
            setClasses((prev) => prev.filter((c) => c.id !== id));

            // 2) Sacar las reservas ligadas a esa clase (mismo name + start_date)
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
            alert("No se pudo eliminar la clase.");
        }
    };

    // ======== LOGOUT =========
    const handleLogout = async () => {
        try {
            await ensureCsrf();
            await api.post("/logout");
        } catch (err) {
            console.error("Error al cerrar sesión:", err);
        } finally {
            navigate("/"); // ruta del BookingCalendar
        }
    };

    // ======== RENDER =========
    return (
        <div className="admin-page">
            <div className="admin-card">
                <header className="admin-header">
                    <div>
                        <span className="admin-badge">Admin Panel</span>
                        <h1 className="admin-title">Training Management</h1>
                        <p className="admin-subtitle">
                            Review the reservations received and manage the
                            available classes.
                        </p>
                    </div>

                    <div className="admin-header-actions">
                        <button
                            type="button"
                            className="admin-back-button"
                            onClick={() => navigate("/")}
                        >
                            ← Calendar
                        </button>

                        <button
                            type="button"
                            className="admin-logout-button"
                            onClick={handleLogout}
                        >
                            Log out
                        </button>
                    </div>
                </header>

                {/* PESTAÑAS */}
                <div className="admin-tabs">
                    <button
                        type="button"
                        className={
                            "admin-tab-button" +
                            (activeTab === "bookings"
                                ? " admin-tab-button--active"
                                : "")
                        }
                        onClick={() => setActiveTab("bookings")}
                    >
                        Bookings
                    </button>

                    <button
                        type="button"
                        className={
                            "admin-tab-button" +
                            (activeTab === "classes"
                                ? " admin-tab-button--active"
                                : "")
                        }
                        onClick={() => setActiveTab("classes")}
                    >
                        Available Classes
                    </button>
                </div>

                {/* TAB RESERVAS */}
                {activeTab === "bookings" && (
                    <section className="admin-table-section">
                        <h2 className="admin-table-title">Booking List</h2>

                        {bookings.length === 0 && (
                            <p className="admin-message">
                                No Bookings at this time
                            </p>
                        )}

                        {bookings.length > 0 && (
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Corporative Email</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Total Days</th>
                                            <th>Trainer</th>
                                            <th>Notes</th>
                                            <th>Created By</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookings.map((b) => {
                                            const start = new Date(
                                                b.start_date
                                            );
                                            const end = new Date(b.end_date);
                                            const diffMs =
                                                end.getTime() - start.getTime();
                                            const days =
                                                Math.round(diffMs / 86400000) +
                                                1;

                                            return (
                                                <tr
                                                    key={b.id}
                                                    className="admin-class-row"
                                                >
                                                    <td>{b.name}</td>
                                                    <td>{b.email}</td>
                                                    <td>
                                                        {formatDate(
                                                            b.start_date
                                                        )}
                                                    </td>
                                                    <td>
                                                        {formatDate(b.end_date)}
                                                    </td>
                                                    <td>
                                                        {Number.isNaN(days)
                                                            ? "—"
                                                            : days}
                                                    </td>
                                                    <td>
                                                        {b.trainer_name || "—"}
                                                    </td>
                                                    <td className="admin-notes-cell">
                                                        {b.notes || "—"}
                                                    </td>
                                                    <td>
                                                        {formatDateTime(
                                                            b.created_at
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={
                                                                "status-pill " +
                                                                (b.status ===
                                                                "accepted"
                                                                    ? "status-accepted"
                                                                    : b.status ===
                                                                      "denied"
                                                                    ? "status-denied"
                                                                    : "status-pending")
                                                            }
                                                        >
                                                            {b.status ===
                                                            "accepted"
                                                                ? "Accepted"
                                                                : b.status ===
                                                                  "denied"
                                                                ? "Denied"
                                                                : "Pending"}
                                                        </span>
                                                    </td>
                                                    <td className="admin-actions">
                                                        {b.status ===
                                                            "pending" && (
                                                            <>
                                                                <button
                                                                    className="admin-accept-button"
                                                                    onClick={() =>
                                                                        handleBookingStatus(
                                                                            b,
                                                                            "accepted"
                                                                        )
                                                                    }
                                                                >
                                                                    ✅ Accept
                                                                </button>
                                                                <button
                                                                    className="admin-deny-button"
                                                                    onClick={() =>
                                                                        handleBookingStatus(
                                                                            b,
                                                                            "denied"
                                                                        )
                                                                    }
                                                                >
                                                                    ❌ Deny
                                                                </button>
                                                            </>
                                                        )}

                                                        <button
                                                            className="admin-delete-button"
                                                            onClick={() =>
                                                                handleDeleteBooking(
                                                                    b.id
                                                                )
                                                            }
                                                        >
                                                            🗑 Delete
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

                {/* TAB CLASES */}
                {activeTab === "classes" && (
                    <section className="admin-table-section">
                        <div className="admin-table-header-row">
                            <h2 className="admin-table-title">
                                Available Classes
                            </h2>
                            <button
                                type="button"
                                className="admin-primary-button"
                                onClick={openNewClassModal}
                            >
                                + New Class
                            </button>
                        </div>

                        {classes.length === 0 && (
                            <p className="admin-message">
                                No Classes Booked at this time.
                            </p>
                        )}

                        {classes.length > 0 && (
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Trainer</th>
                                            <th>Start</th>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>Available Seats</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((cls) => (
                                            <tr key={cls.id}>
                                                <td>{cls.title}</td>
                                                <td>{cls.trainer_name}</td>
                                                <td>
                                                    {formatDate(cls.start_date)}
                                                </td>
                                                <td>
                                                    {formatDate(cls.end_date)}
                                                </td>
                                                <td>
                                                    {cls.start_time} –{" "}
                                                    {cls.end_time}
                                                </td>
                                                <td>{cls.modality}</td>
                                                <td>{cls.spots_left}</td>
                                                <td className="admin-actions">
                                                    <button
                                                        className="admin-edit-button"
                                                        onClick={() =>
                                                            openEditClassModal(
                                                                cls
                                                            )
                                                        }
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        className="admin-delete-button"
                                                        onClick={() =>
                                                            handleDeleteClass(
                                                                cls.id
                                                            )
                                                        }
                                                    >
                                                        🗑 Delete
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

            {/* MODAL EDICIÓN RESERVA */}
            {showEditBookingModal && editBooking && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal">
                        <h3>Editar reserva</h3>

                        <label>Nombre:</label>
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

                        <label>Notas:</label>
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
                                Cancelar
                            </button>

                            <button
                                className="admin-save-button"
                                onClick={saveBookingChanges}
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR CLASE */}
            {showClassModal && editClass && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal-dark">
                        <h3>{isNewClass ? "Nueva clase" : "Editar clase"}</h3>

                        <label>Título de la clase</label>
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

                        <label>Trainer</label>
                        <select
                            value={editClass.trainer_id ?? ""}
                            onChange={(e) => {
                                const id = e.target.value
                                    ? Number(e.target.value)
                                    : null;
                                const trainer =
                                    TRAINERS.find((t) => t.id === id) || null;

                                setEditClass({
                                    ...editClass,
                                    trainer_id: id,
                                    trainer_name: trainer ? trainer.name : "",
                                });
                            }}
                        >
                            <option value="">Select a Trainer</option>
                            {TRAINERS.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>

                        <label>Start Date</label>
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

                        <label>End Date</label>
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

                        <label>Start Time</label>
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

                        <label>End Time</label>
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

                        <label>Type</label>
                        <select
                            value={editClass.modality}
                            onChange={(e) =>
                                setEditClass({
                                    ...editClass,
                                    modality: e.target.value as
                                        | "Online"
                                        | "Presencial",
                                })
                            }
                        >
                            <option value="Presencial">In Person</option>
                            <option value="Online">Online</option>
                        </select>

                        <label>Available Seats</label>
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
                                Cancel
                            </button>
                            <button
                                className="admin-save-dark"
                                onClick={saveClassChanges}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
