import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import "./AdminPanel.css";

type Tab = "stats" | "classes" | "bookings";

type KPI = {
  total_bookings: number;
  total_classes_created: number;
  accepted_total: number;
  attended_total: number;
  not_attended_total: number;
  not_marked_total: number;
  total_attended_overall?: number;
};

type StatsResponse = {
  ok: boolean;
  kpis: KPI;
  charts?: any;
  per_class?: any[];
  filters?: { from?: string; to?: string };
};

type Booking = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  status: string;
  attendedbutton: boolean | null;
};

type BookingGroup = {
  key: string;
  classTitle: string;
  start_date: string;
  end_date: string;
  trainer_name: string | null;
  requests: Booking[];
};

type ClassRow = {
  id: number;
  title: string;
  trainer_name: string;
  date_iso: string;
  end_date_iso?: string | null;
  time_range: string;
  modality: "Online" | "Presencial";
  level?: string | null;
  spots_left: number;
  description?: string | null;
  group_code?: string | null;
};

type SessionInput = { start_time: string; end_time: string };

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  // ===== STATS
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // bookingGroups para toggle attendance dentro de Statistics
  const [bookingGroups, setBookingGroups] = useState<BookingGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // ===== CLASSES
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Modal create/edit class + sessions
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);

  const [classTitle, setClassTitle] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(""); // YYYY-MM-DD
  const [modality, setModality] = useState<"Online" | "Presencial">("Online");
  const [spotsLeft, setSpotsLeft] = useState<number>(3);
  const [description, setDescription] = useState("");

  // sessions
  const [sessionsCount, setSessionsCount] = useState<number>(1);
  const [sessions, setSessions] = useState<SessionInput[]>([{ start_time: "", end_time: "" }]);

  const [savingClass, setSavingClass] = useState(false);
  const [classError, setClassError] = useState<string>("");

  // ===== BOOKINGS TAB
  const [bookingsFlat, setBookingsFlat] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // ===== Helpers
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-US");

  const parseTimeRange = (time_range: string) => {
    const parts = time_range.split("-").map((s) => s.trim());
    return { start_time: parts[0] || "", end_time: parts[1] || "" };
  };

  // ===== Fetchers
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get<StatsResponse>("/api/admin/stats/kpis");
      if (res.data?.ok) setKpis(res.data.kpis);
    } catch (e) {
      console.error("Error loading stats", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBookingGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await api.get("/api/admin/bookings");
      // Esperamos bookingGroups para statistics toggle
      setBookingGroups(res.data.bookingGroups || []);
    } catch (e) {
      console.error("Error loading bookingGroups", e);
      setBookingGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchBookingsFlat = async () => {
    try {
      setLoadingBookings(true);
      const res = await api.get("/api/admin/bookings");
      // Si tu backend devuelve bookings flat
      setBookingsFlat(res.data.bookings || []);
    } catch (e) {
      console.error("Error loading bookings", e);
      setBookingsFlat([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await api.get("/api/admin/classes");
      setClasses(res.data.classes || []);
    } catch (e) {
      console.error("Error loading classes", e);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  // ===== Effects
  useEffect(() => {
    if (activeTab === "stats") {
      fetchStats();
      fetchBookingGroups(); // 👈 CLAVE para que vuelva el toggle en statistics
    }
    if (activeTab === "classes") {
      fetchClasses();
    }
    if (activeTab === "bookings") {
      fetchBookingsFlat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ===== Attendance toggle (Statistics)
  const toggleAttendance = async (booking: Booking) => {
    try {
      const newValue = booking.attendedbutton !== true;

      await api.put(`/api/admin/bookings/${booking.id}/attendance`, {
        attendedbutton: newValue,
      });

      // Update in bookingGroups
      setBookingGroups((prev) =>
        prev.map((g) => ({
          ...g,
          requests: g.requests.map((b) =>
            b.id === booking.id ? { ...b, attendedbutton: newValue } : b
          ),
        }))
      );
    } catch (e) {
      console.error("Error updating attendance", e);
      alert("Error updating attendance. Check backend logs.");
    }
  };

  // ===== Classes modal helpers
  const resetClassForm = () => {
    setEditingClass(null);
    setClassTitle("");
    setTrainerName("");
    setStartDate("");
    setEndDate("");
    setModality("Online");
    setSpotsLeft(3);
    setDescription("");
    setSessionsCount(1);
    setSessions([{ start_time: "", end_time: "" }]);
    setClassError("");
  };

  const openCreateClass = () => {
    resetClassForm();
    setShowClassModal(true);
  };

  const openEditClass = (cls: ClassRow) => {
    setEditingClass(cls);
    setClassTitle(cls.title);
    setTrainerName(cls.trainer_name);
    setStartDate(cls.date_iso);
    setEndDate(cls.end_date_iso ?? cls.date_iso);
    setModality(cls.modality);
    setSpotsLeft(cls.spots_left);
    setDescription(cls.description ?? "");

    // Edit modal: default sessions = 1 (solo base). Las sesiones adicionales se gestionan aparte.
    const { start_time, end_time } = parseTimeRange(cls.time_range);
    setSessionsCount(1);
    setSessions([{ start_time, end_time }]);

    setClassError("");
    setShowClassModal(true);
  };

  // Cuando cambie sessionsCount, ajusta el array sessions
  useEffect(() => {
    setSessions((prev) => {
      const next = [...prev];
      while (next.length < sessionsCount) next.push({ start_time: "", end_time: "" });
      while (next.length > sessionsCount) next.pop();
      return next;
    });
  }, [sessionsCount]);

  const updateSession = (idx: number, key: keyof SessionInput, value: string) => {
    setSessions((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  // Guardar clase + sesiones
  const saveClassWithSessions = async () => {
    setClassError("");

    if (!classTitle.trim()) return setClassError("Title is required.");
    if (!trainerName.trim()) return setClassError("Trainer is required.");
    if (!startDate) return setClassError("Start date is required.");
    if (!endDate) return setClassError("End date is required.");
    if (!sessions.length || !sessions[0].start_time || !sessions[0].end_time) {
      return setClassError("Session 1 start/end time is required.");
    }

    // Validar sesiones
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.start_time || !s.end_time) {
        return setClassError(`Session ${i + 1} start/end time is required.`);
      }
    }

    try {
      setSavingClass(true);

      // 1) Crear o actualizar la "base class" (row principal)
      const basePayload = {
        title: classTitle,
        trainer_name: trainerName,
        start_date: startDate,
        end_date: endDate,
        start_time: sessions[0].start_time,
        end_time: sessions[0].end_time,
        modality,
        spots_left: Number(spotsLeft),
        description: description || null,
      };

      let baseId: number;

      if (editingClass) {
        const res = await api.put(`/api/admin/classes/${editingClass.id}`, basePayload);
        baseId = res.data.class?.id ?? editingClass.id;
      } else {
        const res = await api.post(`/api/admin/classes`, basePayload);
        baseId = res.data.class?.id;
      }

      // 2) Si hay más de 1 sesión, crear sesiones adicionales con endpoint addSessions
      if (sessions.length > 1) {
        const extraSessions = sessions.slice(1).map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
        }));

        await api.post(`/api/admin/classes/${baseId}/sessions`, {
          sessions: extraSessions,
        });
      }

      setShowClassModal(false);
      resetClassForm();
      await fetchClasses();
      alert("Class saved ✅");
    } catch (e: any) {
      console.error("Error saving class", e);
      const backendMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Error saving class.";
      const fieldErrors = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(" ")
        : "";
      setClassError(fieldErrors ? `${backendMsg} ${fieldErrors}` : backendMsg);
    } finally {
      setSavingClass(false);
    }
  };

  // ===== KPI CSV download
  const downloadKpisCsv = async () => {
    try {
      const res = await api.get("/api/admin/stats/kpis.csv", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpis-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error downloading CSV", e);
      alert("Could not download CSV. Check route /api/admin/stats/kpis.csv");
    }
  };

  // ===== Derived
  const hasStats = !!kpis;

  const statsKpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: "Total bookings", value: kpis.total_bookings },
      { label: "Classes created", value: kpis.total_classes_created },
      { label: "Accepted", value: kpis.accepted_total },
      { label: "Attended", value: kpis.attended_total },
      { label: "Not attended", value: kpis.not_attended_total },
      { label: "Not marked", value: kpis.not_marked_total },
    ];
  }, [kpis]);

  return (
    <div className="admin-page">
      <div className="admin-card">
        {/* HEADER */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <h2 className="admin-title">Admin Panel</h2>
            <p className="admin-subtitle">Manage bookings, classes and stats</p>
          </div>

          <div className="admin-topbar-right">
            {activeTab === "stats" && (
              <button className="btn btn-secondary" onClick={downloadKpisCsv}>
                Download KPIs (.csv)
              </button>
            )}
            {activeTab === "classes" && (
              <button className="btn btn-primary" onClick={openCreateClass}>
                + Create class
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="admin-tabs">
          <button
            className={activeTab === "stats" ? "active" : ""}
            onClick={() => setActiveTab("stats")}
          >
            Statistics
          </button>
          <button
            className={activeTab === "classes" ? "active" : ""}
            onClick={() => setActiveTab("classes")}
          >
            Classes
          </button>
          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            Bookings
          </button>
        </div>

        {/* ===================== STATS ===================== */}
        {activeTab === "stats" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h3>KPIs</h3>
              <p>Summary of bookings and attendance.</p>
            </div>

            {loadingStats && <p className="admin-muted">Loading KPIs...</p>}

            {!loadingStats && !hasStats && (
              <p className="admin-muted">No KPI data.</p>
            )}

            {hasStats && (
              <div className="admin-kpi-grid">
                {statsKpiCards.map((c) => (
                  <div key={c.label} className="admin-kpi-card">
                    <div className="admin-kpi-label">{c.label}</div>
                    <div className="admin-kpi-value">{c.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="admin-divider" />

            <div className="admin-section-header">
              <h3>Attendance Toggle</h3>
              <p>Toggle attended / not attended directly from statistics.</p>
            </div>

            {loadingGroups && <p className="admin-muted">Loading attendance...</p>}

            {!loadingGroups && bookingGroups.length === 0 && (
              <p className="admin-muted">No attendance data (bookingGroups empty).</p>
            )}

            {!loadingGroups &&
              bookingGroups.map((group) => (
                <div key={group.key} className="admin-stats-group">
                  <div className="admin-stats-group-header">
                    <h4>{group.classTitle}</h4>
                    <p className="admin-muted">
                      {formatDate(group.start_date)} – {formatDate(group.end_date)} ·{" "}
                      {group.trainer_name || "No trainer"}
                    </p>
                  </div>

                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Requested at</th>
                          <th className="th-center">Attendance</th>
                          <th>Status</th>
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
                                  (b.attendedbutton === true ? " attendance-switch--active" : "")
                                }
                                onClick={() => toggleAttendance(b)}
                                title={b.attendedbutton === true ? "Attended" : "Not attended"}
                                aria-label="Toggle attendance"
                              />
                            </td>

                            <td>
                              <span className={"status-pill status-" + b.status}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ===================== CLASSES ===================== */}
        {activeTab === "classes" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h3>Classes</h3>
              <p>Manage available classes and create sessions.</p>
            </div>

            {loadingClasses && <p className="admin-muted">Loading classes...</p>}

            {!loadingClasses && classes.length === 0 && (
              <p className="admin-muted">No classes yet.</p>
            )}

            {!loadingClasses && classes.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Trainer</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Modality</th>
                      <th>Seats</th>
                      <th className="th-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.title}</td>
                        <td>{c.trainer_name}</td>
                        <td>{formatDate(c.date_iso)}</td>
                        <td>{c.time_range}</td>
                        <td>{c.modality}</td>
                        <td>{c.spots_left}</td>
                        <td className="th-right">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditClass(c)}>
                            Edit
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

        {/* ===================== BOOKINGS ===================== */}
        {activeTab === "bookings" && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h3>Bookings</h3>
              <p>Review reservations.</p>
            </div>

            {loadingBookings && <p className="admin-muted">Loading bookings...</p>}

            {!loadingBookings && bookingsFlat.length === 0 && (
              <p className="admin-muted">No bookings list found (bookings array empty).</p>
            )}

            {!loadingBookings && bookingsFlat.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th className="th-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsFlat.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.email}</td>
                        <td>{formatDateTime(b.created_at)}</td>
                        <td>
                          <span className={"status-pill status-" + b.status}>{b.status}</span>
                        </td>
                        <td className="attendance-cell">
                          <span className={"mini-pill " + (b.attendedbutton ? "mini-pill--ok" : "mini-pill--off")}>
                            {b.attendedbutton === true ? "Yes" : b.attendedbutton === false ? "No" : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== CLASS MODAL ===================== */}
        {showClassModal && (
          <div className="admin-modal-backdrop" onClick={() => setShowClassModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3>{editingClass ? "Edit class" : "Create class"}</h3>
                <button className="admin-modal-close" onClick={() => setShowClassModal(false)}>
                  ✕
                </button>
              </div>

              {/* SCROLLER */}
              <div className="admin-modal-body admin-modal-body--scroll">
                {classError && <p className="form-message error">⚠️ {classError}</p>}

                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Title</label>
                    <input value={classTitle} onChange={(e) => setClassTitle(e.target.value)} />
                  </div>

                  <div className="admin-form-group">
                    <label>Trainer</label>
                    <input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
                  </div>

                  <div className="admin-form-group">
                    <label>Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>

                  <div className="admin-form-group">
                    <label>End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>

                  <div className="admin-form-group">
                    <label>Modality</label>
                    <select value={modality} onChange={(e) => setModality(e.target.value as any)}>
                      <option value="Online">Online</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Available seats</label>
                    <input
                      type="number"
                      min={0}
                      value={spotsLeft}
                      onChange={(e) => setSpotsLeft(Number(e.target.value))}
                    />
                  </div>

                  <div className="admin-form-group admin-form-group--full">
                    <label>Short description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                </div>

                <div className="admin-divider" />

                <div className="admin-section-header">
                  <h4>Add sessions</h4>
                  <p className="admin-muted">
                    Define start/end time for each session, then save. Times will be added to this class group.
                  </p>
                </div>

                <div className="admin-form-group">
                  <label>Number of sessions</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={sessionsCount}
                    onChange={(e) => setSessionsCount(Number(e.target.value))}
                  />
                </div>

                <div className="admin-sessions-grid">
                  {sessions.map((s, idx) => (
                    <div key={idx} className="admin-session-row">
                      <div className="admin-form-group">
                        <label>Session {idx + 1} start</label>
                        <input
                          type="time"
                          value={s.start_time}
                          onChange={(e) => updateSession(idx, "start_time", e.target.value)}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label>Session {idx + 1} end</label>
                        <input
                          type="time"
                          value={s.end_time}
                          onChange={(e) => updateSession(idx, "end_time", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowClassModal(false)}>
                  Cancel
                </button>

                <button className="btn btn-primary" onClick={saveClassWithSessions} disabled={savingClass}>
                  {savingClass ? "Saving..." : "Save"}
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
