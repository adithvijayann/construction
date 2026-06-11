import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { api } from "../api/http.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const Profile = () => {
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canChangePassword = user?.role && user.role !== "admin";

  const updatePasswordField = (event) => {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/auth/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="content-stack">
      <div className="toolbar">
        <div>
          <span className="eyebrow">Profile</span>
          <h2>Account settings</h2>
        </div>
        <StatusBadge value={user?.role} />
      </div>
      <div className="panel detail-panel">
        <div className="detail-card">
          <UserRound size={20} />
          <span>
            <small>Name</small>
            <strong>{user?.name}</strong>
          </span>
        </div>
        <div className="detail-card">
          <Mail size={20} />
          <span>
            <small>Email</small>
            <strong>{user?.email}</strong>
          </span>
        </div>
        <div className="detail-card">
          <ShieldCheck size={20} />
          <span>
            <small>Status</small>
            <strong>{user?.status || "active"}</strong>
          </span>
        </div>
      </div>

      {canChangePassword ? (
        <form className="panel form-grid compact-form" onSubmit={changePassword}>
          <div className="panel-heading wide-field">
            <h3>Change password</h3>
            <KeyRound size={18} />
          </div>
          {error ? <p className="form-error wide-field">{error}</p> : null}
          {notice ? <p className="form-success wide-field">{notice}</p> : null}
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={updatePasswordField}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={updatePasswordField}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={updatePasswordField}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            <KeyRound size={18} />
            {saving ? "Changing" : "Change password"}
          </button>
        </form>
      ) : null}
    </section>
  );
};
