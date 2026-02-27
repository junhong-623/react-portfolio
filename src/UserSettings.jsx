import { useState, useRef } from "react";
import { useAuth, DEFAULT_AVATAR } from "./AuthContext";
import { useI18n } from "./i18n";

export default function UserSettings() {
  const { profile, updateProfile, changePassword } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState("profile");

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>{t("set.title")}</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>{t("set.subtitle")}</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 12, padding: 4, border: "1px solid var(--border)", alignSelf: "flex-start" }}>
        {[["profile", t("set.profile")], ["security", t("set.security")]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: tab === id ? "var(--accent)" : "transparent", color: tab === id ? "#fff" : "var(--muted)", border: "none", borderRadius: 9, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileTab  profile={profile} updateProfile={updateProfile} t={t} />}
      {tab === "security" && <SecurityTab changePassword={changePassword} t={t} />}
    </div>
  );
}

function ProfileTab({ profile, updateProfile, t }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const fileRef = useRef();

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError(t("set.err.avatarSize")); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try { await updateProfile({ avatar: ev.target.result }); }
      catch { setError(t("set.err.avatarFail")); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (username.trim().length < 3) { setError(t("set.err.minChars")); return; }
    setSaving(true); setError("");
    try {
      await updateProfile({ username: username.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError(t("set.err.saveFail")); }
    finally { setSaving(false); }
  };

  const resetAvatar = async () => {
    try { await updateProfile({ avatar: DEFAULT_AVATAR }); }
    catch { setError(t("set.err.avatarFail")); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Avatar */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>{t("set.avatar")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={profile?.avatar || DEFAULT_AVATAR} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => fileRef.current.click()} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{t("set.uploadPhoto")}</button>
            <button onClick={resetAvatar} style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}>{t("set.resetAvatar")}</button>
            <p style={{ color: "var(--muted)", fontSize: 12 }}>{t("set.avatarHint")}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>
      </div>

      {/* Profile info */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{t("set.profileInfo")}</p>
        <div>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{t("set.username")}</label>
          <input value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />
        </div>
        {[[t("set.email"), profile?.email], [t("set.gender"), profile?.gender]].map(([label, val]) => (
          <div key={label}>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "var(--muted)" }}>{val || "—"}</div>
          </div>
        ))}
        {error && <p style={{ color: "var(--accent2)", fontSize: 13 }}>⚠ {error}</p>}
        <button onClick={handleSave} disabled={saving}
          style={{ background: saved ? "var(--accent3)" : "var(--accent)", color: saved ? "#000" : "#fff", border: "none", borderRadius: 10, padding: 11, cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all 0.3s" }}>
          {saved ? t("set.saved") : saving ? t("set.saving") : t("set.saveChanges")}
        </button>
      </div>
    </div>
  );
}

function SecurityTab({ changePassword, t }) {
  const [form,    setForm]    = useState({ old: "", new: "", confirm: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, general: undefined })); };

  const handleSubmit = async () => {
    const errs = {};
    if (!form.old)               errs.old     = t("set.err.required");
    if (form.new.length < 6)    errs.new     = t("set.err.pwMin");
    if (form.new !== form.confirm) errs.confirm = t("set.err.pwMatch");
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await changePassword(form.old, form.new);
      setSuccess(true);
      setForm({ old: "", new: "", confirm: "" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const msg = err.code === "auth/wrong-password" ? t("set.err.pwWrong") : t("set.err.pwFail");
      setErrors({ general: msg });
    } finally { setLoading(false); }
  };

  const inputStyle = (err) => ({
    width: "100%", background: "var(--surface)",
    border: `1px solid ${err ? "var(--accent2)" : "var(--border)"}`,
    borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none",
  });

  const fields = [
    ["old",     t("set.currentPw"), t("set.currentPwPh")],
    ["new",     t("set.newPw"),     t("set.newPwPh")],
    ["confirm", t("set.confirmPw"), t("set.confirmPwPh")],
  ];

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{t("set.changePw")}</p>
        <button onClick={() => setShowPw(v => !v)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>
          {showPw ? t("set.hidePw") : t("set.showPw")}
        </button>
      </div>

      {fields.map(([key, label, placeholder]) => (
        <div key={key}>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
          <input type={showPw ? "text" : "password"} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={inputStyle(errors[key])} />
          {errors[key] && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{errors[key]}</p>}
        </div>
      ))}

      {errors.general && (
        <div style={{ background: "rgba(248,124,139,0.12)", border: "1px solid var(--accent2)", borderRadius: 8, padding: "10px 14px", color: "var(--accent2)", fontSize: 13 }}>⚠ {errors.general}</div>
      )}
      {success && (
        <div style={{ background: "rgba(124,248,192,0.12)", border: "1px solid var(--accent3)", borderRadius: 8, padding: "10px 14px", color: "var(--accent3)", fontSize: 13 }}>{t("set.pwSuccess")}</div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: 11, cursor: "pointer", fontSize: 14, fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
        {loading ? t("set.updating") : t("set.updatePw")}
      </button>
    </div>
  );
}
