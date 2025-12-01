import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@alonsoalonsolaw.com"); // <-- opcional, para probar directo
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
      // 1) Obtener cookie CSRF de Sanctum (IMPORTANTE usar withCredentials)
      await api.get("/sanctum/csrf-cookie", { withCredentials: true });

      // 2) Login contra Breeze
      await api.post(
        "/login",
        { email, password },
        { withCredentials: true }
      );

      // 3) Preguntarle al backend quién soy
      const userRes = await api.get("/api/user", { withCredentials: true });

      console.log("Usuario logueado:", userRes.data);

      if (!userRes.data.is_admin) {
        setError("Este usuario no es administrador.");
        await api.post("/logout", {}, { withCredentials: true });
        return;
      }

      onLogin();
      navigate("/admin");
    } catch (err: any) {
      console.error("Error en login:", err);

      // Si Laravel manda errores de validación, los mostramos
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
