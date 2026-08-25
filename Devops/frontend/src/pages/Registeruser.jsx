import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../services/api";

const ROLES = ["Admin", "Team Manager", "Employee"];

function normalizeIndianPhone(value) {
  const compact = value.replace(/[\s()-]/g, "");
  const national = compact.startsWith("+91") ? compact.slice(3) : compact;
  return /^[6-9]\d{9}$/.test(national) ? national : null;
}

export default function RegisterUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    Fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    phone: "",
  });

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const validate = () => {
    if (!form.Fname.trim())            return "First name is required.";
    if (!form.lname.trim())            return "Last name is required.";
    if (!form.email.trim())            return "Email is required.";
    if (!form.role)                    return "Please select a role.";
    if (!form.phone.trim())            return "Phone number is required.";
    if (!normalizeIndianPhone(form.phone.trim())) return "Enter a valid 10-digit Indian mobile number.";
    if (!form.password)                return "Password is required.";
    if (form.password.length < 6)      return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    const err = validate();
    if (err) { setError(err); return; }
    const normalizedPhone = normalizeIndianPhone(form.phone.trim());

    setLoading(true);
    try {
      await api.post("/register", {
        Fname:    form.Fname.trim(),
        lname:    form.lname.trim(),
        email:    form.email.trim(),
        password: form.password,
        role:     form.role,
        phone:    normalizedPhone,
      });

      setSuccess("User registered successfully!");
      setForm({ Fname:"", lname:"", email:"", password:"", confirmPassword:"", role:"", phone:"" });

      setTimeout(() => navigate("/admin/teams"), 1500);

    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't create the account right now. Please try again later."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Register User</h1>
          <p>Create a new Admin, Manager, or Employee account.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate("/admin")}>
          ← Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header">
          <h2>User Details</h2>
        </div>

        <div style={{ padding: "24px 22px" }}>
          {error && <div className="error-msg">{error}</div>}
          {success && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              color: "#15803D", borderRadius: "var(--radius-sm)",
              padding: "10px 14px", fontSize: 13, marginBottom: 16
            }}>
              {success}
            </div>
          )}

          <form className="modal-form" onSubmit={handleSubmit}>
            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-group">
                <label>First Name <span style={{ color: "var(--color-danger)" }}>*</span></label>
                <input
                  name="Fname"
                  placeholder="John"
                  value={form.Fname}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Last Name <span style={{ color: "var(--color-danger)" }}>*</span></label>
                <input
                  name="lname"
                  placeholder="Doe"
                  value={form.lname}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input
                name="email"
                type="email"
                placeholder="john.doe@company.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* Role + Phone row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="form-group">
                <label>Role <span style={{ color: "var(--color-danger)" }}>*</span></label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="">— Select role —</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Phone <span style={{ color: "var(--color-danger)" }}>*</span></label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {/* Role badge preview */}
            {form.role && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Role preview: </span>
                <span className={`badge ${
                  form.role === "Admin"        ? "badge-blue" :
                  form.role === "Team Manager" ? "badge-green" : "badge-gray"
                }`}>
                  {form.role}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate("/admin")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-accent"
                disabled={loading}
              >
                {loading ? "Registering…" : "Register User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}