/**
 * UserSettings.jsx — 用户设置页
 *
 * 功能：
 * 1. 更换头像（上传图片 → 转成 base64 → 存 Firestore）
 * 2. 修改用户名
 * 3. 修改密码（需要输入旧密码验证）
 * 4. 显示账户信息（邮箱、注册时间、性别）
 */

import { useState, useRef } from "react";
import { useAuth, DEFAULT_AVATAR } from "./AuthContext";

export default function UserSettings() {
  const { profile, updateProfile, changePassword } = useAuth();
  const [tab, setTab] = useState("profile"); // "profile" | "security"

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Settings</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>Manage your account</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 12, padding: 4, border: "1px solid var(--border)", alignSelf: "flex-start" }}>
        {[["profile", "👤 Profile"], ["security", "🔒 Security"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? "var(--accent)" : "transparent",
              color: tab === id ? "#fff" : "var(--muted)",
              border: "none", borderRadius: 9, padding: "8px 20px",
              cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileTab  profile={profile} updateProfile={updateProfile} />}
      {tab === "security" && <SecurityTab changePassword={changePassword} />}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ profile, updateProfile }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef();

  /** 上传头像：读取文件 → base64 → 存 Firestore */
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB"); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await updateProfile({ avatar: ev.target.result });
      } catch { setError("Failed to update avatar"); }
    };
    reader.readAsDataURL(file); // 转 base64
  };

  const handleSave = async () => {
    if (username.trim().length < 3) { setError("Username must be at least 3 characters"); return; }
    setSaving(true); setError("");
    try {
      await updateProfile({ username: username.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const resetAvatar = async () => {
    try { await updateProfile({ avatar: DEFAULT_AVATAR }); }
    catch { setError("Failed to reset avatar"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Avatar section */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px" }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Avatar</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Avatar preview */}
          <div style={{ position: "relative" }}>
            <img
              src={profile?.avatar || DEFAULT_AVATAR}
              alt="avatar"
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => fileRef.current.click()}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Upload Photo
            </button>
            <button
              onClick={resetAvatar}
              style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}
            >
              Reset to Default
            </button>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>JPG, PNG — max 2MB</p>
          </div>
          {/* Hidden file input */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>
      </div>

      {/* Profile info */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>Profile Info</p>

        <div>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>Username</label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            style={{
              width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none",
            }}
          />
        </div>

        {/* Read-only fields */}
        {[["Email", profile?.email], ["Gender", profile?.gender]].map(([label, val]) => (
          <div key={label}>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "var(--muted)" }}>
              {val || "—"}
            </div>
          </div>
        ))}

        {error && <p style={{ color: "var(--accent2)", fontSize: 13 }}>⚠ {error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? "var(--accent3)" : "var(--accent)", color: saved ? "#000" : "#fff",
            border: "none", borderRadius: 10, padding: "11px", cursor: "pointer",
            fontSize: 14, fontWeight: 700, transition: "all 0.3s",
          }}
        >
          {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ changePassword }) {
  const [form, setForm]   = useState({ old: "", new: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, general: undefined })); };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.old)              errs.old     = "Required";
    if (form.new.length < 6)   errs.new     = "At least 6 characters";
    if (form.new !== form.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await changePassword(form.old, form.new);
      setSuccess(true);
      setForm({ old: "", new: "", confirm: "" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.code === "auth/wrong-password" ? "Current password is incorrect." : "Failed to change password.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (err) => ({
    width: "100%", background: "var(--surface)",
    border: `1px solid ${err ? "var(--accent2)" : "var(--border)"}`,
    borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none",
  });

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>Change Password</p>
        <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>
          {showPw ? "Hide" : "Show"} passwords
        </button>
      </div>

      {[["old", "Current Password", "Your current password"], ["new", "New Password", "Min. 6 characters"], ["confirm", "Confirm New Password", "Repeat new password"]].map(([key, label, placeholder]) => (
        <div key={key}>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
          <input
            type={showPw ? "text" : "password"}
            value={form[key]}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            style={inputStyle(errors[key])}
          />
          {errors[key] && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{errors[key]}</p>}
        </div>
      ))}

      {errors.general && (
        <div style={{ background: "rgba(248,124,139,0.12)", border: "1px solid var(--accent2)", borderRadius: 8, padding: "10px 14px", color: "var(--accent2)", fontSize: 13 }}>
          ⚠ {errors.general}
        </div>
      )}

      {success && (
        <div style={{ background: "rgba(124,248,192,0.12)", border: "1px solid var(--accent3)", borderRadius: 8, padding: "10px 14px", color: "var(--accent3)", fontSize: 13 }}>
          ✓ Password changed successfully!
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: "var(--accent)", color: "#fff", border: "none",
          borderRadius: 10, padding: "11px", cursor: "pointer",
          fontSize: 14, fontWeight: 700, opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Updating…" : "Update Password"}
      </button>
    </div>
  );
}
