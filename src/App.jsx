/**
 * App.jsx — 主入口
 *
 * 新增功能：
 * 1. AuthProvider 包裹整个 app
 * 2. 未登录时显示 AuthPages（Login/Register）
 * 3. Navbar 显示用户头像 + 用户名 + 登出按钮
 * 4. Protected Routes：Savings/Tasks 需要登录
 * 5. 新增 Savings + Settings 页面
 */

import { useState, createContext, useContext } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPages from "./AuthPages";
import Dashboard from "./Dashboard";
import TaskManager from "./TaskManager";
import JobSearch from "./JobSearch";
import OnboardingWizard from "./OnboardingWizard";
import Savings from "./Savings";
import UserSettings from "./UserSettings";

// ─── Theme Context ────────────────────────────────────────────────────────────
export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const themes = {
  dark: {
    "--bg":      "#0d0d14", "--surface": "#13131f", "--card":   "#1a1a2a",
    "--border":  "#2a2a42", "--text":    "#e8e8f5", "--muted":  "#6868a0",
    "--accent":  "#8b7cf8", "--accent2": "#f87c8b", "--accent3":"#7cf8c0",
    "--shadow":  "0 4px 24px rgba(0,0,0,0.5)",
  },
  light: {
    "--bg":      "#f2f1fa", "--surface": "#ffffff", "--card":   "#faf9ff",
    "--border":  "#dddaf5", "--text":    "#18182e", "--muted":  "#8080b8",
    "--accent":  "#6a56f0", "--accent2": "#f0566a", "--accent3":"#3dd68c",
    "--shadow":  "0 4px 24px rgba(100,90,200,0.1)",
  },
};

// 所有导航页面定义
const PAGES = [
  { id: "home",      label: "Home",      icon: "⬡",  auth: false },
  { id: "dashboard", label: "Dashboard", icon: "◈",  auth: false },
  { id: "savings",   label: "Savings",   icon: "💰", auth: true  }, // 需要登录
  { id: "tasks",     label: "Tasks",     icon: "◫",  auth: true  }, // 需要登录
  { id: "jobs",      label: "Jobs",      icon: "◎",  auth: false },
  { id: "wizard",    label: "Onboarding",icon: "◉",  auth: false },
];

// ─── Root (wraps with providers) ─────────────────────────────────────────────
export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const [page, setPage]     = useState("home");
  const [isDark, setIsDark] = useState(true);
  const [showLogin, setShowLogin] = useState(false); // 控制登录 modal
  const { user }            = useAuth();

  const theme    = themes[isDark ? "dark" : "light"];
  const rootStyle = Object.fromEntries(Object.entries(theme));

  // 如果访问需要 auth 的页面但未登录 → 留在 home
  const safePage = PAGES.find(p => p.id === page)?.auth && !user ? "home" : page;

  // 登录成功后关闭 modal，跳回 home
  const handleLoginSuccess = () => {
    setShowLogin(false);
    setPage("home");
  };

  // 打开登录 modal（从 Navbar Sign In 或 locked card 触发）
  const openLogin = () => setShowLogin(true);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d), theme }}>
      <div style={{ ...rootStyle, minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", transition: "background 0.3s, color 0.3s" }}>
        <GlobalStyles />
        <Navbar page={safePage} setPage={setPage} isDark={isDark} openLogin={openLogin} />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          {safePage === "home"      && <HomePage setPage={setPage} openLogin={openLogin} />}
          {safePage === "dashboard" && <Dashboard />}
          {safePage === "savings"   && <Savings />}
          {safePage === "tasks"     && <TaskManager />}
          {safePage === "jobs"      && <JobSearch />}
          {safePage === "wizard"    && <OnboardingWizard />}
          {safePage === "settings"  && <UserSettings />}
        </main>

        {/* ── 登录 Modal：放在最顶层，position:fixed 才能真正居中 ── */}
        {showLogin && !user && (
          <div
            onClick={() => setShowLogin(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 999,
              background: "rgba(0,0,0,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
            }}
          >
            {/* 阻止点击内部时关闭 modal */}
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, position: "relative" }}>
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowLogin(false)}
                style={{
                  position: "absolute", top: -14, right: -14,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "50%", width: 32, height: 32,
                  cursor: "pointer", color: "var(--muted)", fontSize: 16, zIndex: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
              {/* 传入 onSuccess 回调，登录/注册成功后自动关闭 */}
              <AuthPages onSuccess={handleLoginSuccess} />
            </div>
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, isDark, openLogin }) {
  const { toggle }          = useTheme();
  const { user, profile, logout } = useAuth();
  const [dropOpen, setDropOpen]   = useState(false);

  const handleLogout = async () => {
    await logout();
    setPage("home");
    setDropOpen(false);
  };

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--surface)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, height: 60, padding: "0 24px" }}>

        {/* Logo */}
        <span
          onClick={() => setPage("home")}
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--accent)", letterSpacing: "-0.5px", cursor: "pointer", marginRight: 8, flexShrink: 0 }}
        >
          DevPortfolio
        </span>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 2, flex: 1, flexWrap: "wrap" }}>
          {PAGES.map(p => {
            const locked = p.auth && !user;
            return (
              <button
                key={p.id}
                onClick={() => locked ? openLogin() : setPage(p.id)}
                title={locked ? "Login required" : p.label}
                style={{
                  background: page === p.id ? "var(--accent)" : "transparent",
                  color: page === p.id ? "#fff" : locked ? "var(--border)" : "var(--muted)",
                  border: "none", borderRadius: 8, padding: "7px 13px", cursor: locked ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: page === p.id ? 600 : 400,
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {p.label}
                {locked && <span style={{ fontSize: 10 }}>🔒</span>}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Dark mode */}
          <button onClick={toggle}
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", cursor: "pointer", color: "var(--text)", fontSize: 15 }}>
            {isDark ? "☀️" : "🌙"}
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropOpen(v => !v)}
                style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 10px 4px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                <img
                  src={profile?.avatar || ""}
                  alt="avatar"
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", background: "var(--border)" }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{profile?.username || "User"}</span>
                <span style={{ color: "var(--muted)", fontSize: 10 }}>▼</span>
              </button>

              {dropOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 12, minWidth: 160, boxShadow: "var(--shadow)", zIndex: 999,
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{profile?.username}</p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{profile?.email}</p>
                  </div>
                  <DropItem onClick={() => { setPage("settings"); setDropOpen(false); }}>⚙️ Settings</DropItem>
                  <DropItem onClick={handleLogout} danger>🚪 Sign Out</DropItem>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLogin}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 20, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

    </nav>
  );
}

function DropItem({ onClick, children, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", padding: "10px 16px",
        background: "transparent", border: "none", textAlign: "left",
        color: danger ? "var(--accent2)" : "var(--text)", cursor: "pointer", fontSize: 13,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {children}
    </button>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ setPage, openLogin }) {
  const { user, profile } = useAuth();

  const cards = [
    { id: "dashboard", icon: "◈", title: "Dashboard",      desc: "Revenue charts, KPI cards, filterable data — Recharts + state management.",   tags: ["Recharts", "useMemo", "Data Viz"],    auth: false },
    { id: "savings",   icon: "💰", title: "Personal Savings", desc: "Track income & expenses. Charts, categories, balance trend — per user data.", tags: ["Firestore", "Charts", "Finance"],      auth: true  },
    { id: "tasks",     icon: "◫", title: "Task Manager",   desc: "Full CRUD synced to Firebase. Real-time across devices, per-user data.",        tags: ["Firestore", "onSnapshot", "CRUD"],    auth: true  },
    { id: "jobs",      icon: "◎", title: "Job Search",     desc: "Real-time search with debounce, multi-filter UI, conditional rendering.",       tags: ["Debounce", "Filter", "useCallback"],  auth: false },
    { id: "wizard",    icon: "◉", title: "Onboarding Wizard", desc: "Multi-step form with per-step validation and complex state flow.",           tags: ["Multi-step", "Validation", "Wizard"], auth: false },
  ];

  return (
    <div className="fade-in">
      {/* Welcome back banner */}
      {user && (
        <div style={{ background: "linear-gradient(135deg, var(--accent)22, var(--accent3)11)", border: "1px solid var(--accent)44", borderRadius: 16, padding: "18px 24px", marginBottom: 32, display: "flex", alignItems: "center", gap: 14 }}>
          <img src={profile?.avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18 }}>Welcome back, {profile?.username}! 👋</p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Ready to pick up where you left off?</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ textAlign: "center", padding: user ? "20px 0 40px" : "60px 0 48px" }}>
        {!user && (
          <>
            <div style={{ display: "inline-block", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "var(--accent)", marginBottom: 20, fontWeight: 500 }}>
              React + Firebase Portfolio · 2024
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1.5px" }}>
              Five modules.<br /><span style={{ color: "var(--accent)" }}>One showcase.</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
              A portfolio app with Firebase auth, real-time Firestore, data visualisation, and more.
            </p>
          </>
        )}
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {cards.map((c, i) => {
          const locked = c.auth && !user;
          return (
            <button
              key={c.id}
              onClick={() => locked ? openLogin() : setPage(c.id)}
              className="card-hover"
              style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
                padding: 24, cursor: "pointer", textAlign: "left", color: "var(--text)",
                animationDelay: `${i * 80}ms`, transition: "border-color 0.2s, box-shadow 0.2s",
                opacity: locked ? 0.8 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 26, color: "var(--accent)" }}>{c.icon}</span>
                {locked && <span style={{ fontSize: 11, background: "var(--accent2)22", color: "var(--accent2)", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>🔒 Login required</span>}
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{c.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>{c.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {c.tags.map(t => (
                  <span key={t} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 9px", fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA for non-logged in */}
      {!user && (
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 15 }}>Sign in to unlock Tasks and Savings with your personal data.</p>
          <button
            onClick={openLogin}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 36px", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
          >
            Get Started →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Global Styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--bg); }
      button { font-family: 'DM Sans', sans-serif; }
      input, textarea, select { font-family: 'DM Sans', sans-serif; }
      .fade-in { animation: fadeIn 0.45s ease forwards; }
      @keyframes fadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
      .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .card-hover:hover { transform: translateY(-4px); }
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: var(--surface); }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    `}</style>
  );
}
