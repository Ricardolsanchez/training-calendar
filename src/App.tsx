import { Routes, Route } from "react-router-dom";
import BookingCalendar from "./components/BookingCalendar";
import Login from "./pages/Login";
import AdminPanel from "./components/AdminPanel";

const App: React.FC = () => {
  // más adelante aquí manejaremos isAuthenticated y admin panel
  const handleLogin = () => {
    console.log("Admin logged in (frontend)"); // placeholder por ahora
  };

  return (
    <Routes>
      {/* Página pública con el calendario */}
      <Route path="/" element={<BookingCalendar />} />

      {/* Pantalla de login de admin */}
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/admin" element={<AdminPanel />} />  
    </Routes>
  );
};

export default App;