import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../services/api";
import "../styles/Login.css";

// Steps: "login" | "sendotp" | "verifyotp" | "resetpassword"
export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("login");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Forgot password
  const [fpEmail, setFpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const otpRefs = useRef([]);

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ── Login ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      if (data.role === "Admin") {
        navigate("/admin");
      } else if (data.role === "Team Manager") {
        navigate("/manager");
      } else if (data.role === "Employee") {
        navigate("/employee");
      } else {
        setError("Access denied. No dashboard available for your role.");
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password. Please check your details and try again."));
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ───────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!fpEmail) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/forgotpassword/sendotp", { email: fpEmail });
      setSuccess(data.message || "OTP sent to your email.");
      setStep("verifyotp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Input Handling ─────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP ─────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    const otpStr = otp.join("");
    if (otpStr.length < 6) { setError("Please enter the full 6-digit OTP."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/forgotpassword/verifyotp", { email: fpEmail, otp: otpStr });
      setSuccess(data.message || "OTP verified.");
      setStep("resetpassword");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/forgotpassword/resetpassword", {
        email: fpEmail,
        newpassword: newPassword,
      });
      setSuccess(data.message || "Password reset successfully.");
      setTimeout(() => {
        setStep("login");
        setFpEmail(""); setOtp(["","","","","",""]); setNewPassword(""); setConfirmPassword("");
        clearMessages();
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = { login: 0, sendotp: 1, verifyotp: 2, resetpassword: 3 };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">T</div>
          <span className="login-logo-text">TaskFlow</span>
        </div>

        {/* Step dots (only in forgot password flow) */}
        {step !== "login" && (
          <div className="step-indicator">
            {["sendotp", "verifyotp", "resetpassword"].map((s, i) => (
              <div
                key={s}
                className={`step-dot ${stepIndex[step] - 1 >= i ? "active" : ""}`}
              />
            ))}
          </div>
        )}

        {/* Messages */}
        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {/* ── LOGIN ── */}
        {step === "login" && (
          <>
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to your TaskFlow account</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="login-forgot">
                <button type="button" onClick={() => { clearMessages(); setStep("sendotp"); }}>
                  Forgot password?
                </button>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        )}

        {/* ── SEND OTP ── */}
        {step === "sendotp" && (
          <>
            <h2 className="login-title">Reset password</h2>
            <p className="login-subtitle">Enter your email and we'll send you a one-time code.</p>
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </form>
            <button className="step-back" onClick={() => { clearMessages(); setStep("login"); }}>
              ← Back to sign in
            </button>
          </>
        )}

        {/* ── VERIFY OTP ── */}
        {step === "verifyotp" && (
          <>
            <h2 className="login-title">Enter OTP</h2>
            <p className="login-subtitle">We sent a 6-digit code to <strong>{fpEmail}</strong></p>
            <form onSubmit={handleVerifyOtp}>
              <div className="otp-inputs">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    ref={el => otpRefs.current[i] = el}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
            </form>
            <button className="step-back" onClick={() => { clearMessages(); setStep("sendotp"); }}>
              ← Resend OTP
            </button>
          </>
        )}

        {/* ── RESET PASSWORD ── */}
        {step === "resetpassword" && (
          <>
            <h2 className="login-title">New password</h2>
            <p className="login-subtitle">Choose a strong new password for your account.</p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}