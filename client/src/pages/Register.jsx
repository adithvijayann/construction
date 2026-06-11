import { Building2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "contractor"
  });
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
      await register(form);
      navigate("/projects", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">
            <Building2 size={23} />
          </span>
          <span>
            <strong>SiteLog</strong>
            <small>Construction Daily Log</small>
          </span>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Start logging</span>
            <h1>Create account</h1>
          </div>

          <label>
            Name
            <input name="name" value={form.name} onChange={update} autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={8} value={form.password} onChange={update} autoComplete="new-password" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            <UserPlus size={18} />
            {submitting ? "Creating account" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
};
