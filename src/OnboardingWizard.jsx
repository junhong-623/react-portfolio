import { useState } from "react";
import { useI18n } from "./i18n";

const SKILL_OPTIONS = ["React", "Vue", "Angular", "TypeScript", "JavaScript", "Node.js", "Python", "GraphQL", "Docker", "AWS", "PostgreSQL", "MongoDB"];

const INITIAL_FORM = {
  firstName: "", lastName: "", email: "", phone: "",
  currentRole: "", company: "", experience: "", portfolio: "",
  skills: [], otherSkills: "",
  jobType: "Full-time", remote: "Yes", salaryMin: "", salaryMax: "", availability: "Immediately",
};

export default function OnboardingWizard() {
  const { t } = useI18n();
  const [step,      setStep]      = useState(0);
  const [form,      setForm]      = useState(INITIAL_FORM);
  const [errors,    setErrors]    = useState({});
  const [submitted, setSubmitted] = useState(false);

  const STEPS = [
    { id: "personal",    labelKey: "wiz.step.personal",   icon: "👤", descKey: "wiz.desc.personal"   },
    { id: "experience",  labelKey: "wiz.step.experience", icon: "💼", descKey: "wiz.desc.experience" },
    { id: "skills",      labelKey: "wiz.step.skills",     icon: "⚡", descKey: "wiz.desc.skills"     },
    { id: "preferences", labelKey: "wiz.step.prefs",      icon: "🎯", descKey: "wiz.desc.prefs"      },
    { id: "review",      labelKey: "wiz.step.review",     icon: "✅", descKey: "wiz.desc.review"     },
  ];

  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const toggleSkill = (skill) => setForm(f => ({
    ...f, skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
  }));

  const next = () => {
    const errs = validateStep(step, form, t);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const back   = () => { setErrors({}); setStep(s => s - 1); };
  const submit = () => { setSubmitted(true); };

  if (submitted) return <SuccessScreen form={form} onReset={() => { setForm(INITIAL_FORM); setStep(0); setSubmitted(false); }} t={t} />;

  const progressPct = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 680, margin: "0 auto" }}>

      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>{t("wiz.title")}</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>{t("wiz.stepOf", { n: step + 1, total: STEPS.length, desc: t(STEPS[step].descKey) })}</p>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div
              style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: i < step ? 16 : 14, fontWeight: 700, flexShrink: 0, background: i < step ? "var(--accent3)" : i === step ? "var(--accent)" : "var(--card)", border: `2px solid ${i <= step ? "transparent" : "var(--border)"}`, color: i <= step ? (i < step ? "#000" : "#fff") : "var(--muted)", transition: "all 0.3s", cursor: i < step ? "pointer" : "default" }}
              onClick={() => i < step && setStep(i)}
              title={t(s.labelKey)}
            >
              {i < step ? "✓" : s.icon}
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: "0 4px", background: i < step ? "var(--accent3)" : "var(--border)", transition: "background 0.3s" }} />}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", transition: "width 0.4s ease" }} />
      </div>

      {/* Step card */}
      <div key={step} className="fade-in" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: "32px 36px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 28 }}>{STEPS[step].icon}</span>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginTop: 8 }}>{t(STEPS[step].labelKey)}</h3>
        </div>
        {step === 0 && <StepPersonal   form={form} update={update} errors={errors} t={t} />}
        {step === 1 && <StepExperience form={form} update={update} errors={errors} t={t} />}
        {step === 2 && <StepSkills     form={form} toggleSkill={toggleSkill} update={update} t={t} />}
        {step === 3 && <StepPrefs      form={form} update={update} t={t} />}
        {step === 4 && <StepReview     form={form} onEdit={setStep} t={t} />}
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button onClick={back} disabled={step === 0}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 24px", cursor: step === 0 ? "default" : "pointer", fontSize: 15, color: step === 0 ? "var(--muted)" : "var(--text)", fontWeight: 500, opacity: step === 0 ? 0.5 : 1, transition: "all 0.18s" }}>
          {t("wiz.back")}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
            {t("wiz.continue")}
          </button>
        ) : (
          <button onClick={submit} style={{ background: "linear-gradient(90deg, var(--accent), var(--accent3))", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
            {t("wiz.submit")}
          </button>
        )}
      </div>
    </div>
  );
}

function StepPersonal({ form, update, errors, t }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Field label={t("wiz.firstName")} error={errors.firstName}><input value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="John" /></Field>
      <Field label={t("wiz.lastName")}  error={errors.lastName} ><input value={form.lastName}  onChange={e => update("lastName",  e.target.value)} placeholder="Doe"  /></Field>
      <Field label={t("wiz.email")} error={errors.email} style={{ gridColumn: "1 / -1" }}>
        <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="john@example.com" />
      </Field>
      <Field label={t("wiz.phone")} style={{ gridColumn: "1 / -1" }}>
        <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
      </Field>
    </div>
  );
}

function StepExperience({ form, update, errors, t }) {
  const expOptions = ["< 1 year", "1–2 years", "3–5 years", "5–8 years", "8+ years"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label={t("wiz.currentRole")} error={errors.currentRole}><input value={form.currentRole} onChange={e => update("currentRole", e.target.value)} placeholder="Frontend Developer" /></Field>
        <Field label={t("wiz.company")}><input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Acme Inc." /></Field>
      </div>
      <Field label={t("wiz.experience")} error={errors.experience}>
        <select value={form.experience} onChange={e => update("experience", e.target.value)}>
          <option value="">{t("wiz.expSelect")}</option>
          {expOptions.map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label={t("wiz.portfolio")}>
        <input type="url" value={form.portfolio} onChange={e => update("portfolio", e.target.value)} placeholder="https://github.com/…" />
      </Field>
    </div>
  );
}

function StepSkills({ form, toggleSkill, update, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>{t("wiz.selectSkills")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SKILL_OPTIONS.map(skill => {
            const selected = form.skills.includes(skill);
            return (
              <button key={skill} onClick={() => toggleSkill(skill)}
                style={{ background: selected ? "var(--accent)" : "var(--surface)", color: selected ? "#fff" : "var(--muted)", border: `1px solid ${selected ? "transparent" : "var(--border)"}`, borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: selected ? 600 : 400, transition: "all 0.18s" }}>
                {selected ? "✓ " : ""}{skill}
              </button>
            );
          })}
        </div>
        {form.skills.length > 0 && <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 8 }}>{t("wiz.selected", { n: form.skills.length })}</p>}
      </div>
      <Field label={t("wiz.otherSkills")}>
        <input value={form.otherSkills} onChange={e => update("otherSkills", e.target.value)} placeholder="Rust, WebAssembly, …" />
      </Field>
    </div>
  );
}

function StepPrefs({ form, update, t }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Field label={t("wiz.jobType")}>
        <select value={form.jobType} onChange={e => update("jobType", e.target.value)}>
          {["Full-time", "Part-time", "Contract", "Freelance"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label={t("wiz.remote")}>
        <select value={form.remote} onChange={e => update("remote", e.target.value)}>
          {["Yes", "No", "Hybrid"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label={t("wiz.salaryMin")}><input type="number" value={form.salaryMin} onChange={e => update("salaryMin", e.target.value)} placeholder="80000" /></Field>
      <Field label={t("wiz.salaryMax")}><input type="number" value={form.salaryMax} onChange={e => update("salaryMax", e.target.value)} placeholder="150000" /></Field>
      <Field label={t("wiz.availability")} style={{ gridColumn: "1 / -1" }}>
        <select value={form.availability} onChange={e => update("availability", e.target.value)}>
          {["Immediately", "2 weeks notice", "1 month notice", "3+ months"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
    </div>
  );
}

function StepReview({ form, onEdit, t }) {
  const sections = [
    { step: 0, titleKey: "wiz.rev.personal", items: [
      [t("wiz.rev.name"),  `${form.firstName} ${form.lastName}`],
      [t("wiz.rev.email"), form.email],
      [t("wiz.rev.phone"), form.phone || "—"],
    ]},
    { step: 1, titleKey: "wiz.rev.experience", items: [
      [t("wiz.rev.role"),      form.currentRole],
      [t("wiz.rev.company"),   form.company || "—"],
      [t("wiz.rev.exp"),       form.experience],
      [t("wiz.rev.portfolio"), form.portfolio || "—"],
    ]},
    { step: 2, titleKey: "wiz.rev.skills", items: [
      [t("wiz.rev.stack"), form.skills.length > 0 ? form.skills.join(", ") : t("wiz.rev.noneSelected")],
      [t("wiz.rev.other"), form.otherSkills || "—"],
    ]},
    { step: 3, titleKey: "wiz.rev.prefs", items: [
      [t("wiz.rev.type"),   form.jobType],
      [t("wiz.rev.remote"), form.remote],
      [t("wiz.rev.salary"), form.salaryMin && form.salaryMax ? `$${Number(form.salaryMin).toLocaleString()} – $${Number(form.salaryMax).toLocaleString()}` : "—"],
      [t("wiz.rev.avail"),  form.availability],
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 4 }}>{t("wiz.reviewNote")}</p>
      {sections.map(sec => (
        <div key={sec.titleKey} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{t(sec.titleKey)}</p>
            <button onClick={() => onEdit(sec.step)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>{t("wiz.edit")}</button>
          </div>
          {sec.items.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 12, padding: "4px 0", fontSize: 13 }}>
              <span style={{ color: "var(--muted)", minWidth: 90 }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SuccessScreen({ form, onReset, t }) {
  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 12 }}>{t("wiz.success.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 8 }}>{t("wiz.success.sub", { name: form.firstName })}</p>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>
        {t("wiz.success.match", { type: form.jobType.toLowerCase(), remote: form.remote === "Yes" ? t("wiz.success.remote") + " " : "" })}
      </p>
      <button onClick={onReset} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 28px", cursor: "pointer", fontSize: 15, color: "var(--text)", fontWeight: 500 }}>
        {t("wiz.success.reset")}
      </button>
    </div>
  );
}

function Field({ label, error, children, style }) {
  const inputStyle = {
    width: "100%", background: "var(--surface)",
    border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`,
    borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14,
    outline: "none", transition: "border-color 0.18s",
  };
  const child = children ? { ...children, props: { ...children.props, style: { ...inputStyle, ...children.props.style } } } : null;
  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      {child}
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function validateStep(step, form, t) {
  const errors = {};
  if (step === 0) {
    if (!form.firstName.trim()) errors.firstName = t("wiz.err.required");
    if (!form.lastName.trim())  errors.lastName  = t("wiz.err.required");
    if (!form.email.trim())     errors.email     = t("wiz.err.required");
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = t("wiz.err.email");
  }
  if (step === 1) {
    if (!form.currentRole.trim()) errors.currentRole = t("wiz.err.required");
    if (!form.experience)         errors.experience  = t("wiz.err.experience");
  }
  return errors;
}
