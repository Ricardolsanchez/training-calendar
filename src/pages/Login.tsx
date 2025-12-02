import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@alonsoalonsolaw.com"); // opcional para pruebas
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // 1) Login por token contra tu endpoint /api/admin/login
      const res = await api.post("/api/admin/login", {
        email,
        password,
      });

      const { token, user } = res.data;

      // Si por alguna razón no es admin, limpiamos cualquier token
      if (!user?.is_admin) {
        localStorage.removeItem("admin_token");
        delete api.defaults.headers.common["Authorization"];
        setError("Este usuario no es administrador.");
        return;
      }

      // 2) Guardar token y configurarlo en axios
      localStorage.setItem("admin_token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log("Usuario admin logueado:", user);

      // 3) Avisar al padre y navegar al panel
      onLogin();
      navigate("/admin");
    } catch (err: any) {
      console.error("Error en login:", err);

      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.password?.[0];

      setError(
        backendMsg || "Credenciales inválidas o error al iniciar sesión."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <span className="login-badge">Admin panel</span>
          <h1 className="login-title">Inicia sesión</h1>
          <p className="login-subtitle">
            Solo los usuarios administradores pueden acceder al panel de
            gestión de reservas.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          aria-busy={isSubmitting}
        >
          <div className="login-field">
            <label htmlFor="email" className="login-label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@alonsoalonsolaw.com"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Contraseña
            </label>
            <div className="login-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <p className="login-hint">
            Usa las credenciales asignadas al administrador del sistema.
          </p>

          {error && (
            <div className="login-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "Entrar al panel"}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="login-secondary"
            onClick={() => navigate("/")}
          >
            ← Volver al calendario
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
