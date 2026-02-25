/**
 * AuthPages.jsx — 登录 & 注册 & 忘记密码
 *
 * 更新：
 * 1. 登录支持 username 或 email（自动判断）
 * 2. 新增 Forgot Password 流程（Firebase sendPasswordResetEmail）
 */

import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthPages({ onSuccess }) {
  // tab: "login" | "register" | "forgot"
  const [tab, setTab] = useState("login");

  return (
    <div style={{ width: "100%" }}>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: "var(--accent)", letterSpacing: "-1px" }}>
          DevPortfolio
        </span>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
          {tab === "login" ? "Welcome back 👋" : tab === "register" ? "Create your account" : "Reset your password"}
        </p>
      </div>

      {/* Tab switcher — 只在 login/register 显示 */}
      {tab !== "forgot" && (
        <div style={{ display: "flex", background: "var(--card)", borderRadius: 12, padding: 4, border: "1px solid var(--border)", marginBottom: 20 }}>
          {["login", "register"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--muted)", border: "none", borderRadius: 9, padding: "10px 0", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
      )}

      {/* Form card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: "24px 28px" }}>
        {tab === "login"    && <LoginForm    onSwitch={() => setTab("register")} onForgot={() => setTab("forgot")} onSuccess={onSuccess} />}
        {tab === "register" && <RegisterForm onSwitch={() => setTab("login")}    onSuccess={onSuccess} />}
        {tab === "forgot"   && <ForgotForm   onBack={() => setTab("login")} />}
      </div>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onForgot, onSuccess }) {
  const { login } = useAuth();
  // 字段改名为 identifier，同时接受 username 或 email
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPw, setShowPw]         = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!identifier || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      await login(identifier, password); // AuthContext 内部处理 username vs email
      onSuccess?.();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Username or Email field */}
      <AuthField
        label="Username or Email"
        value={identifier}
        onChange={setIdentifier}
        placeholder="john123 or john@example.com"
      />
      <AuthField
        label="Password"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        suffix={
          <button type="button" onClick={() => setShowPw(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>
            {showPw ? "Hide" : "Show"}
          </button>
        }
      />

      {/* Forgot password link */}
      <div style={{ textAlign: "right", marginTop: -8 }}>
        <button type="button" onClick={onForgot}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13 }}>
          Forgot password?
        </button>
      </div>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <SubmitBtn loading={loading}>{loading ? "Signing in…" : "Sign In"}</SubmitBtn>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
        No account?{" "}
        <button type="button" onClick={onSwitch}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Register here
        </button>
      </p>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch, onSuccess }) {
  const { register } = useAuth();
  const [form, setForm]       = useState({ username: "", email: "", password: "", confirm: "", gender: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const errs = {};
    if (!form.username.trim() || form.username.length < 3) errs.username = "At least 3 characters";
    if (/\s/.test(form.username))                          errs.username = "No spaces allowed";
    if (!/\S+@\S+\.\S+/.test(form.email))                 errs.email    = "Invalid email";
    if (form.password.length < 6)                         errs.password = "At least 6 characters";
    if (form.password !== form.confirm)                   errs.confirm  = "Passwords don't match";
    if (!form.gender)                                     errs.gender   = "Please select gender";
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form);
      onSuccess?.();
    } catch (err) {
      setErrors({ general: friendlyError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AuthField label="Username" value={form.username} onChange={v => set("username", v)} placeholder="cooldev42 (no spaces)" error={errors.username} />
      <AuthField label="Email" type="email" value={form.email} onChange={v => set("email", v)} placeholder="you@example.com" error={errors.email} />
      <AuthField
        label="Password" type={showPw ? "text" : "password"}
        value={form.password} onChange={v => set("password", v)} placeholder="Min. 6 characters"
        error={errors.password}
        suffix={
          <button type="button" onClick={() => setShowPw(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>
            {showPw ? "Hide" : "Show"}
          </button>
        }
      />
      <AuthField label="Confirm Password" type={showPw ? "text" : "password"} value={form.confirm} onChange={v => set("confirm", v)} placeholder="Repeat password" error={errors.confirm} />

      {/* Gender */}
      <div>
        <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>Gender</label>
        <div style={{ display: "flex", gap: 6 }}>
          {["Male", "Female", "Other", "Prefer not to say"].map(g => (
            <button key={g} type="button" onClick={() => set("gender", g)}
              style={{ flex: 1, background: form.gender === g ? "var(--accent)" : "var(--surface)", color: form.gender === g ? "#fff" : "var(--muted)", border: `1px solid ${form.gender === g ? "transparent" : "var(--border)"}`, borderRadius: 8, padding: "8px 4px", cursor: "pointer", fontSize: 11, fontWeight: 500, transition: "all 0.18s" }}>
              {g}
            </button>
          ))}
        </div>
        {errors.gender && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{errors.gender}</p>}
      </div>

      {errors.general && <ErrorMsg>{errors.general}</ErrorMsg>}

      <SubmitBtn loading={loading}>{loading ? "Creating account…" : "Create Account"}</SubmitBtn>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
        Already have an account?{" "}
        <button type="button" onClick={onSwitch}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Sign in
        </button>
      </p>
    </form>
  );
}

// ─── Forgot Password Form ─────────────────────────────────────────────────────
/**
 * ForgotForm：
 * 1. 输入 email 或 username
 * 2. 调用 forgotPassword() → Firebase 发重置邮件
 * 3. 显示成功提示（用户去邮箱点链接即可）
 */
function ForgotForm({ onBack }) {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [sent, setSent]             = useState(false); // 是否已发送成功

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) { setError("Please enter your username or email"); return; }
    setLoading(true); setError("");
    try {
      await forgotPassword(identifier.trim());
      setSent(true); // 切换到成功状态
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // 发送成功 → 显示提示
  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <p style={{ fontSize: 36, marginBottom: 14 }}>📬</p>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check your inbox!</p>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          A password reset link has been sent. Click the link in the email to set a new password.
        </p>
        <button onClick={onBack}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          ← Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
        Enter your username or email and we'll send you a reset link.
      </p>
      <AuthField
        label="Username or Email"
        value={identifier}
        onChange={v => { setIdentifier(v); setError(""); }}
        placeholder="john123 or john@example.com"
      />

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <SubmitBtn loading={loading}>{loading ? "Sending…" : "Send Reset Link"}</SubmitBtn>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
        Remember it?{" "}
        <button type="button" onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          Back to Sign In
        </button>
      </p>
    </form>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function AuthField({ label, type = "text", value, onChange, placeholder, error, suffix }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <div style={{ position: "relative", display: "flex" }}>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, background: "var(--surface)",
            border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`,
            borderRadius: 10, padding: "11px 14px", color: "var(--text)", fontSize: 14, outline: "none",
            paddingRight: suffix ? 70 : 14, transition: "border-color 0.18s",
          }}
          onFocus={e => !error && (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => !error && (e.target.style.borderColor = "var(--border)")}
        />
        {suffix && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>{suffix}</div>
        )}
      </div>
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function SubmitBtn({ children, loading }) {
  return (
    <button type="submit" disabled={loading}
      style={{ background: loading ? "var(--border)" : "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", cursor: loading ? "default" : "pointer", fontSize: 15, fontWeight: 700, transition: "background 0.2s", marginTop: 4 }}>
      {children}
    </button>
  );
}

function ErrorMsg({ children }) {
  return (
    <div style={{ background: "rgba(248,124,139,0.12)", border: "1px solid var(--accent2)", borderRadius: 8, padding: "10px 14px", color: "var(--accent2)", fontSize: 13 }}>
      ⚠ {children}
    </div>
  );
}

/** Firebase error code → 友好提示 */
function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No account found with that username or email.",
    "auth/wrong-password":        "Incorrect password.",
    "auth/email-already-in-use":  "This email is already registered.",
    "auth/username-taken":        "This username is already taken.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "Invalid email address.",
    "auth/invalid-credential":    "Incorrect username/email or password.",
    "auth/too-many-requests":     "Too many attempts. Please try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

