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
};

type Status = "idle" | "loading" | "success" | "error";

const BookingCalendar: React.FC = () => {
    const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>(
        []
    );
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [classesError, setClassesError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoadingClasses(true);
                setClassesError(null);

                const res = await api.get("/api/classes");
                const data = res.data;

                // Tipo que viene del backend (Laravel)
                type BackendClass = {
                    id: number;
                    title: string;
                    trainer_name: string;
                    date_iso: string;
                    time_range: string;
                    modality: "Online" | "Presencial";
                    level: string;
                    spots_left: number;
                };

                // Puede venir como { classes: [...] } o directamente [...]
                const list = (data.classes ?? data) as BackendClass[];

                const mapped: AvailableClass[] = list.map(
                    (cls: BackendClass) => {
                        const d = new Date(cls.date_iso);
                        const dateLabel = d.toLocaleDateString("en-US", {
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
                        };
                    }
                );

                setAvailableClasses(mapped);
            } catch (err) {
                console.error("Error cargando clases:", err);
                setClassesError(
                    "No se pudieron cargar las clases disponibles."
                );
            } finally {
                setLoadingClasses(false);
            }
        };

        fetchClasses();
    }, []);

    useEffect(() => {
        // Ver si el usuario actual es admin (si hay sesión iniciada)
        const checkAdmin = async () => {
            try {
                const res = await api.get("/api/user");
                // Si está autenticado y es admin:
                if (res.data?.is_admin) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                // Si da 401 o error, asumimos que NO es admin
                setIsAdmin(false);
            }
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
            setErrorMessage("Debes seleccionar una clase disponible.");
            return;
        }

        if (!email) {
            setStatus("error");
            setErrorMessage("El correo corporativo es obligatorio.");
            return;
        }

        const payload = {
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
                setErrorMessage(
                    err.response.data?.message ??
                        "Ocurrió un error al enviar la reserva."
                );
            } else {
                setErrorMessage("Ocurrió un error inesperado.");
            }
            setStatus("error");
        }
    };

    return (
        <div className="booking-page">
            <div className="booking-card">
                <header className="booking-header">
                    <div>
                        <div className="booking-badge">Available Classes</div>
                        <h1>Book Your Next Class</h1>
                        <p className="booking-subtitle">
                            Select one of the available classes this month and
                            reserve your spot using your corporate email.
                        </p>
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
                            <span>Updated in Real Time</span>
                        </div>

                        {isAdmin === null ? null : isAdmin ? (
                            // ✅ Ya está logueada como admin → botón directo al panel
                            <button
                                type="button"
                                className="booking-login-btn"
                                onClick={() => navigate("/admin")}
                            >
                                Admin Panel
                            </button>
                        ) : (
                            // ❌ No está logueada → mostrar el login normal
                            <Link to="/login" className="booking-login-btn">
                                Admin login
                            </Link>
                        )}
                    </div>
                </header>

                <div className="booking-layout">
                    <section className="class-list-section">
                        <div className="class-list-header">
                            <h2>Available Classes this Month</h2>
                            <p>
                                Click on a class to view the details and make a
                                reservation.
                            </p>
                        </div>

                        <div className="class-list">
                            {loadingClasses && (
                                <p className="form-message">
                                    Loading Available Classes
                                </p>
                            )}

                            {classesError && (
                                <p className="form-message error">
                                    {classesError}
                                </p>
                            )}

                            {!loadingClasses &&
                                !classesError &&
                                availableClasses.length === 0 && (
                                    <p className="form-message">
                                        No Available Classes this Month
                                    </p>
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
                                            <span className="class-title">
                                                {cls.title}
                                            </span>
                                            <span className="class-badge">
                                                <span
                                                    className={`dot ${
                                                        cls.modality ===
                                                        "Online"
                                                            ? "online"
                                                            : "presencial"
                                                    }`}
                                                />
                                                {cls.modality === "Online"
                                                    ? "Online"
                                                    : "Presencial"}
                                            </span>
                                        </div>

                                        <div className="class-meta">
                                            <span className="class-date">
                                                {cls.dateLabel}
                                            </span>
                                            <span className="class-time">
                                                {cls.timeRange}
                                            </span>
                                        </div>

                                        <div className="class-footer">
                                            <span className="class-trainer">
                                                👤 {cls.trainerName}
                                            </span>
                                            <span className="class-level">
                                                {cls.level}
                                            </span>
                                            <span className="class-spots">
                                                {cls.spotsLeft} Seat
                                                {cls.spotsLeft !== 1 &&
                                                    "s"}{" "}
                                                Available
                                            </span>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    </section>

                    <section className="booking-detail-section">
                        {!selectedClass ? (
                            <div className="booking-detail-empty">
                                <h3>Click on a Available Class!</h3>
                                <p>
                                    Choose a class from the list on the left to
                                    view the details and reserve your spot.
                                </p>
                            </div>
                        ) : (
                            <div className="booking-detail-card">
                                <div className="booking-detail-header">
                                    <span className="booking-detail-label">
                                        Clase seleccionada
                                    </span>
                                    <h3>{selectedClass.title}</h3>
                                    <p className="booking-detail-meta">
                                        {selectedClass.dateLabel} ·{" "}
                                        {selectedClass.timeRange}
                                        <br />
                                        Trainer: {
                                            selectedClass.trainerName
                                        } · {selectedClass.level} ·{" "}
                                        {selectedClass.modality}
                                    </p>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    className="booking-detail-form"
                                >
                                    <div className="form-group">
                                        <label htmlFor="email">
                                            Corporative Email for the Booking
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="tucorreo@tuempresa.com"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                        />
                                    </div>

                                    {status === "error" && (
                                        <p className="form-message error">
                                            ⚠️ {errorMessage}
                                        </p>
                                    )}

                                    {status === "success" && (
                                        <p className="form-message success">
                                            ✅ Booked Successfully! We’ll
                                            contact you soon!
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        className="booking-button"
                                        disabled={status === "loading"}
                                    >
                                        {status === "loading"
                                            ? "Enviando reserva..."
                                            : "Reservar esta clase"}
                                    </button>

                                    <p className="booking-privacy">
                                        We’ll use your corporate email to
                                        confirm your attendance.
                                    </p>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default BookingCalendar;
