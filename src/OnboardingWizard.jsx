/**
 * OnboardingWizard.jsx — 多步骤表单模块
 *
 * 面试亮点：
 * 1. 复杂 state 流转：步骤管理 + 每步数据 + 验证错误
 * 2. 每步独立验证逻辑（在进入下一步前检查）
 * 3. 可随时返回上一步，数据不丢失
 * 4. 最终汇总展示（Summary step）
 * 5. 动画过渡 + 进度条
 * 6. 无障碍：keyboard 可操作
 */

import { useState } from "react";

// ─── 步骤定义 ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "personal",   label: "Personal",   icon: "👤", desc: "Basic info" },
  { id: "experience", label: "Experience", icon: "💼", desc: "Work history" },
  { id: "skills",     label: "Skills",     icon: "⚡", desc: "Your stack" },
  { id: "preferences",label: "Prefs",      icon: "🎯", desc: "Job preferences" },
  { id: "review",     label: "Review",     icon: "✅", desc: "Final check" },
];

// 所有技能选项
const SKILL_OPTIONS = ["React", "Vue", "Angular", "TypeScript", "JavaScript", "Node.js", "Python", "GraphQL", "Docker", "AWS", "PostgreSQL", "MongoDB"];

// 初始表单数据结构（集中管理，方便维护）
const INITIAL_FORM = {
  // Step 1
  firstName: "", lastName: "", email: "", phone: "",
  // Step 2
  currentRole: "", company: "", experience: "", portfolio: "",
  // Step 3
  skills: [], otherSkills: "",
  // Step 4
  jobType: "Full-time", remote: "Yes", salaryMin: "", salaryMax: "", availability: "Immediately",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const [step, setStep]       = useState(0);        // 当前步骤 index
  const [form, setForm]       = useState(INITIAL_FORM);  // 所有表单数据
  const [errors, setErrors]   = useState({});        // 当前步骤的验证错误
  const [submitted, setSubmitted] = useState(false); // 是否已提交

  /** 更新单个字段：使用 key 动态更新，保留其他字段 */
  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    // 输入时清除该字段的错误（实时反馈）
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  /** 技能多选 toggle */
  const toggleSkill = (skill) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter(s => s !== skill)
        : [...f.skills, skill],
    }));
  };

  /** 进入下一步前先验证当前步骤 */
  const next = () => {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return; // 有错误，不前进
    }
    setErrors({});
    setStep(s => s + 1);
  };

  const back = () => { setErrors({}); setStep(s => s - 1); };

  const submit = () => {
    // 这里可以 fetch POST 到后端，这里简单 simulate
    console.log("Submitting form:", form);
    setSubmitted(true);
  };

  if (submitted) return <SuccessScreen form={form} onReset={() => { setForm(INITIAL_FORM); setStep(0); setSubmitted(false); }} />;

  const progressPct = Math.round(((step) / (STEPS.length - 1)) * 100);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 680, margin: "0 auto" }}>

      {/* ── 标题 ── */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Profile Setup</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>Step {step + 1} of {STEPS.length} — {STEPS[step].desc}</p>
      </div>

      {/* ── Step Indicators ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: i < step ? 16 : 14, fontWeight: 700, flexShrink: 0,
                background: i < step ? "var(--accent3)" : i === step ? "var(--accent)" : "var(--card)",
                border: `2px solid ${i <= step ? "transparent" : "var(--border)"}`,
                color: i <= step ? (i < step ? "#000" : "#fff") : "var(--muted)",
                transition: "all 0.3s",
                cursor: i < step ? "pointer" : "default", // 可点回已完成的步骤
              }}
              onClick={() => i < step && setStep(i)}
              title={s.label}
            >
              {i < step ? "✓" : s.icon}
            </div>
            {/* Step connector line */}
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 4px", background: i < step ? "var(--accent3)" : "var(--border)", transition: "background 0.3s" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", transition: "width 0.4s ease" }} />
      </div>

      {/* ── Step Content Card ── */}
      <div
        key={step} // key 变化时强制重新 mount，触发 fade-in 动画
        className="fade-in"
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: "32px 36px" }}
      >
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 28 }}>{STEPS[step].icon}</span>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginTop: 8 }}>{STEPS[step].label}</h3>
        </div>

        {/* 根据步骤渲染不同表单 */}
        {step === 0 && <StepPersonal   form={form} update={update} errors={errors} />}
        {step === 1 && <StepExperience form={form} update={update} errors={errors} />}
        {step === 2 && <StepSkills     form={form} toggleSkill={toggleSkill} update={update} />}
        {step === 3 && <StepPrefs      form={form} update={update} />}
        {step === 4 && <StepReview     form={form} onEdit={setStep} />}
      </div>

      {/* ── Navigation Buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button
          onClick={back}
          disabled={step === 0}
          style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "12px 24px", cursor: step === 0 ? "default" : "pointer", fontSize: 15,
            color: step === 0 ? "var(--muted)" : "var(--text)", fontWeight: 500,
            opacity: step === 0 ? 0.5 : 1, transition: "all 0.18s",
          }}
        >
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 32px", cursor: "pointer",
              fontSize: 15, fontWeight: 600, transition: "opacity 0.18s",
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={submit}
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent3))", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 32px", cursor: "pointer",
              fontSize: 15, fontWeight: 700, letterSpacing: "0.3px",
            }}
          >
            Submit Profile 🚀
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────
function StepPersonal({ form, update, errors }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Field label="First Name *" error={errors.firstName}>
        <input value={form.firstName} onChange={e => update("firstName", e.target.value)} placeholder="John" />
      </Field>
      <Field label="Last Name *" error={errors.lastName}>
        <input value={form.lastName}  onChange={e => update("lastName",  e.target.value)} placeholder="Doe" />
      </Field>
      <Field label="Email *" error={errors.email} style={{ gridColumn: "1 / -1" }}>
        <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="john@example.com" />
      </Field>
      <Field label="Phone" style={{ gridColumn: "1 / -1" }}>
        <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
      </Field>
    </div>
  );
}

// ─── Step 2: Experience ───────────────────────────────────────────────────────
function StepExperience({ form, update, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Current Role *" error={errors.currentRole}>
          <input value={form.currentRole} onChange={e => update("currentRole", e.target.value)} placeholder="Frontend Developer" />
        </Field>
        <Field label="Company">
          <input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Acme Inc." />
        </Field>
      </div>
      <Field label="Years of Experience *" error={errors.experience}>
        <select value={form.experience} onChange={e => update("experience", e.target.value)}>
          <option value="">Select…</option>
          {["< 1 year", "1–2 years", "3–5 years", "5–8 years", "8+ years"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="Portfolio / GitHub URL">
        <input type="url" value={form.portfolio} onChange={e => update("portfolio", e.target.value)} placeholder="https://github.com/…" />
      </Field>
    </div>
  );
}

// ─── Step 3: Skills ───────────────────────────────────────────────────────────
function StepSkills({ form, toggleSkill, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Select all that apply</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SKILL_OPTIONS.map(skill => {
            const selected = form.skills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                style={{
                  background: selected ? "var(--accent)" : "var(--surface)",
                  color: selected ? "#fff" : "var(--muted)",
                  border: `1px solid ${selected ? "transparent" : "var(--border)"}`,
                  borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: selected ? 600 : 400,
                  transition: "all 0.18s",
                }}
              >
                {selected ? "✓ " : ""}{skill}
              </button>
            );
          })}
        </div>
        {form.skills.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 8 }}>{form.skills.length} selected</p>
        )}
      </div>
      <Field label="Other skills (comma separated)">
        <input value={form.otherSkills} onChange={e => update("otherSkills", e.target.value)} placeholder="Rust, WebAssembly, …" />
      </Field>
    </div>
  );
}

// ─── Step 4: Preferences ──────────────────────────────────────────────────────
function StepPrefs({ form, update }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Field label="Job Type">
        <select value={form.jobType} onChange={e => update("jobType", e.target.value)}>
          {["Full-time", "Part-time", "Contract", "Freelance"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="Remote Preference">
        <select value={form.remote} onChange={e => update("remote", e.target.value)}>
          {["Yes", "No", "Hybrid"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
      <Field label="Min Salary (USD)">
        <input type="number" value={form.salaryMin} onChange={e => update("salaryMin", e.target.value)} placeholder="80000" />
      </Field>
      <Field label="Max Salary (USD)">
        <input type="number" value={form.salaryMax} onChange={e => update("salaryMax", e.target.value)} placeholder="150000" />
      </Field>
      <Field label="Availability" style={{ gridColumn: "1 / -1" }}>
        <select value={form.availability} onChange={e => update("availability", e.target.value)}>
          {["Immediately", "2 weeks notice", "1 month notice", "3+ months"].map(v => <option key={v}>{v}</option>)}
        </select>
      </Field>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────
function StepReview({ form, onEdit }) {
  const sections = [
    { step: 0, title: "Personal", items: [
      ["Name",  `${form.firstName} ${form.lastName}`],
      ["Email", form.email],
      ["Phone", form.phone || "—"],
    ]},
    { step: 1, title: "Experience", items: [
      ["Role",       form.currentRole],
      ["Company",    form.company || "—"],
      ["Experience", form.experience],
      ["Portfolio",  form.portfolio || "—"],
    ]},
    { step: 2, title: "Skills", items: [
      ["Stack", form.skills.length > 0 ? form.skills.join(", ") : "None selected"],
      ["Other", form.otherSkills || "—"],
    ]},
    { step: 3, title: "Preferences", items: [
      ["Type",         form.jobType],
      ["Remote",       form.remote],
      ["Salary",       form.salaryMin && form.salaryMax ? `$${Number(form.salaryMin).toLocaleString()} – $${Number(form.salaryMax).toLocaleString()}` : "—"],
      ["Availability", form.availability],
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 4 }}>Please review your information before submitting.</p>
      {sections.map(sec => (
        <div key={sec.title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{sec.title}</p>
            <button onClick={() => onEdit(sec.step)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Edit</button>
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

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ form, onReset }) {
  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 12 }}>You're all set!</h2>
      <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 8 }}>
        Welcome, {form.firstName}! Your profile has been submitted.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 32 }}>
        We'll match you with {form.jobType.toLowerCase()} {form.remote === "Yes" ? "remote" : ""} opportunities.
      </p>
      <button
        onClick={onReset}
        style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 28px", cursor: "pointer", fontSize: 15, color: "var(--text)", fontWeight: 500,
        }}
      >
        ← Start Over
      </button>
    </div>
  );
}

// ─── Reusable Field Component ─────────────────────────────────────────────────
/**
 * Field：统一表单字段的 label + input + error 样式
 * 用 children 接受任意 input/select，避免重复代码
 */
function Field({ label, error, children, style }) {
  const inputStyle = {
    width: "100%", background: "var(--surface)",
    border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`,
    borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14,
    outline: "none", transition: "border-color 0.18s",
  };

  // 给 children 自动注入 style（避免每个 input 重复写）
  const child = children
    ? { ...children, props: { ...children.props, style: { ...inputStyle, ...children.props.style } } }
    : null;

  return (
    <div style={style}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      {child}
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────
/** 每步的验证规则（返回 errors 对象） */
function validateStep(step, form) {
  const errors = {};
  if (step === 0) {
    if (!form.firstName.trim()) errors.firstName = "Required";
    if (!form.lastName.trim())  errors.lastName  = "Required";
    if (!form.email.trim())     errors.email     = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email format";
  }
  if (step === 1) {
    if (!form.currentRole.trim()) errors.currentRole = "Required";
    if (!form.experience)         errors.experience  = "Please select experience level";
  }
  return errors;
}
