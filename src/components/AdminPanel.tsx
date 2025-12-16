import React, { useEffect, useState } from "react";
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
};

type Booking = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  attendedbutton: boolean | null;
  status: string;
};

type BookingGroup = {
  key: string;
  classTitle: string;
  start_date: string;
  end_date: string;
  trainer_name: string | null;
  requests: Booking[];
};

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  // KPIs
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Booking groups (attendance toggle lives here)
  const [bookingGroups, setBookingGroups] = useState<BookingGroup[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  /* ================================
     FETCHERS
  ================================= */

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get("/api/admin/stats/kpis");
      setKpis(res.data.kpis);
    } catch (e) {
      console.error("Error loading stats", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const res = await api.get("/api/admin/bookings");

      // 👇 backend ya devuelve agrupado
      setBookingGroups(res.data.bookingGroups || []);
    } catch (e) {
      console.error("Error loading bookings", e);
    } finally {
      setLoadingBookings(false);
    }
  };

  /* ================================
     EFFECTS
  ================================= */

  useEffect(() => {
    if (activeTab === "stats") {
      fetchStats();
      fetchBookings(); // 👈 CLAVE: sin esto NO aparece el toggle
    }
  }, [activeTab]);

  /* ================================
     ACTIONS
  ================================= */

  const toggleAttendance = async (booking: Booking) => {
    try {
      const newValue = booking.attendedbutton !== true;

      await api.put(`/api/admin/bookings/${booking.id}/attendance`, {
        attendedbutton: newValue,
      });

      // 🔄 actualizar UI sin refetch completo
      setBookingGroups((prev) =>
        prev.map((g) => ({
          ...g,
          requests: g.requests.map((b) =>
            b.id === booking.id
              ? { ...b, attendedbutton: newValue }
              : b
          ),
        }))
      );
    } catch (e) {
      console.error("Error toggling attendance", e);
    }
  };

  /* ================================
     HELPERS
  ================================= */

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US");

  /* ================================
     RENDER
  ================================= */

  return (
    <div className="admin-page">
      <div className="admin-card">
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

        {/* =======================
            STATS TAB
        ======================= */}
        {activeTab === "stats" && (
          <>
            {/* KPIs */}
            {loadingStats && <p>Loading KPIs…</p>}

            {kpis && (
              <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                  <h4>Total bookings</h4>
                  <strong>{kpis.total_bookings}</strong>
                </div>

                <div className="admin-kpi-card">
                  <h4>Classes created</h4>
                  <strong>{kpis.total_classes_created}</strong>
                </div>

                <div className="admin-kpi-card">
                  <h4>Accepted</h4>
                  <strong>{kpis.accepted_total}</strong>
                </div>

                <div className="admin-kpi-card">
                  <h4>Attended</h4>
                  <strong>{kpis.attended_total}</strong>
                </div>

                <div className="admin-kpi-card">
                  <h4>Not attended</h4>
                  <strong>{kpis.not_attended_total}</strong>
                </div>

                <div className="admin-kpi-card">
                  <h4>Not marked</h4>
                  <strong>{kpis.not_marked_total}</strong>
                </div>
              </div>
            )}

            {/* BOOKINGS + ATTENDANCE */}
            <div className="admin-table-wrapper">
              {loadingBookings && <p>Loading attendance…</p>}

              {!loadingBookings && bookingGroups.length === 0 && (
                <p>No attendance data.</p>
              )}

              {bookingGroups.map((group) => (
                <div key={group.key} className="admin-stats-group">
                  <div className="admin-stats-group-header">
                    <h3>{group.classTitle}</h3>
                    <p>
                      {formatDate(group.start_date)} –{" "}
                      {formatDate(group.end_date)} ·{" "}
                      {group.trainer_name || "No trainer"}
                    </p>
                  </div>

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
                                (b.attendedbutton === true
                                  ? " attendance-switch--active"
                                  : "")
                              }
                              onClick={() => toggleAttendance(b)}
                              title={
                                b.attendedbutton
                                  ? "Attended"
                                  : "Not attended"
                              }
                            />
                          </td>

                          <td>{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Otros tabs los mantienes igual */}
      </div>
    </div>
  );
};

export default AdminPanel;
