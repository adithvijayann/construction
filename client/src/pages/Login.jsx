import { Building2, HelpCircle, LockKeyhole, LogIn, Mail, UserCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(form);
      navigate("/projects", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <header className="auth-header">
        <div className="auth-header-brand">
          <Building2 size={25} />
          <strong>Industrial Integrity</strong>
        </div>
        <div className="auth-header-actions">
          <button className="auth-icon-button" type="button" title="Help">
            <HelpCircle size={21} />
          </button>
          <button className="auth-icon-button" type="button" title="Account">
            <UserCircle size={21} />
          </button>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-photo-layer" aria-hidden="true" />
        <section className="auth-panel industrial-login-card" aria-label="Login">
          <div className="auth-logo-panel">
            <span className="auth-logo-mark">
              <Building2 size={34} />
            </span>
            <strong>SiteLog</strong>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-title">
              <h1>Secure Login</h1>
              <p>Access your project logs and equipment reports</p>
            </div>

            <label className="auth-field">
              <span>Email Address</span>
              <div className="auth-input-shell">
                <Mail size={19} />
                <input name="email" type="email" autoComplete="email" placeholder="name@company.com" value={form.email} onChange={update} required />
              </div>
            </label>

            <label className="auth-field">
              <span className="auth-field-heading">
                <span>Password</span>
                <a href="#forgot">Forgot Password?</a>
              </span>
              <div className="auth-input-shell">
                <LockKeyhole size={19} />
                <input name="password" type="password" autoComplete="current-password" placeholder="Password" value={form.password} onChange={update} required />
              </div>
            </label>

            <label className="auth-checkbox">
              <input type="checkbox" />
              <span>Keep me logged in for session security</span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="auth-submit" type="submit" disabled={submitting}>
              <span>{submitting ? "Authenticating" : "Authenticate"}</span>
              <LogIn size={19} />
            </button>
          </form>

          <p className="auth-switch">Contractor accounts are created by the admin.</p>
        </section>
      </main>

      <footer className="auth-footer">
        <div>
          <strong>Industrial Integrity Systems</strong>
          <span>|</span>
          <span>2026</span>
        </div>
        <nav aria-label="Legal links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#support">Support Center</a>
          <a href="#contact">Contact Us</a>
        </nav>
      </footer>
    </div>
  );
};
