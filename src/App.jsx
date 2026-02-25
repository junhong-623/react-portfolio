/**
 * App.jsx — 主入口文件
 *
 * 职责：
 * 1. 管理全局 Dark Mode 状态
 * 2. 管理当前页面（用 state 代替 react-router，保持单文件部署简单）
 * 3. 渲染导航栏 + 对应页面组件
 *
 * 面试亮点：
 * - Context API 传递 theme（避免 prop drilling）
 * - CSS variables 切换 dark/light，性能比 className 切换好
 */

import { useState, createContext, useContext } from "react";
import Dashboard from "./Dashboard";
import TaskManager from "./TaskManager";
import JobSearch from "./JobSearch";
import OnboardingWizard from "./OnboardingWizard";

// ─── Theme Context ──────────────────────────────────────────────────────────
// 用 Context 让所有子组件都能读到当前主题色，不需要一层层传 props
export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// 主题色盘：dark / light 各自一套 CSS 变量值
const themes = {
  dark: {
    "--bg":       "#0d0d14",
    "--surface":  "#13131f",
    "--card":     "#1a1a2a",
    "--border":   "#2a2a42",
    "--text":     "#e8e8f5",
    "--muted":    "#6868a0",
    "--accent":   "#8b7cf8",
    "--accent2":  "#f87c8b",
    "--accent3":  "#7cf8c0",
    "--shadow":   "0 4px 24px rgba(0,0,0,0.5)",
  },
  light: {
    "--bg":       "#f2f1fa",
    "--surface":  "#ffffff",
    "--card":     "#faf9ff",
    "--border":   "#dddaf5",
    "--text":     "#18182e",
    "--muted":    "#8080b8",
    "--accent":   "#6a56f0",
    "--accent2":  "#f0566a",
    "--accent3":  "#3dd68c",
    "--shadow":   "0 4px 24px rgba(100,90,200,0.1)",
  },
};

// 导航菜单定义（label + icon + component）
const PAGES = [
  { id: "home",     label: "Home",       icon: "⬡" },
  { id: "dashboard",label: "Dashboard",  icon: "◈" },
  { id: "tasks",    label: "Tasks",      icon: "◫" },
  { id: "jobs",     label: "Job Search", icon: "◎" },
  { id: "wizard",   label: "Onboarding", icon: "◉" },
];

export default function App() {
  // 当前页面 state，默认显示 home
  const [page, setPage] = useState("home");
  // Dark mode toggle state
  const [isDark, setIsDark] = useState(true);

  const theme = themes[isDark ? "dark" : "light"];

  // 把主题变量注入到 :root，所有子组件直接用 var(--accent) 等
  const rootStyle = Object.entries(theme).reduce(
    (acc, [k, v]) => ({ ...acc, [k]: v }),
    {}
  );

  return (
    // ThemeContext.Provider 包裹整个 app，传递 isDark 和切换函数
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d), theme }}>
      <div style={{ ...rootStyle, minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', sans-serif", transition: "background 0.3s, color 0.3s" }}>

        <GlobalStyles />

        {/* ── 顶部导航栏 ── */}
        <Navbar page={page} setPage={setPage} isDark={isDark} />

        {/* ── 页面内容区 ── */}
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          {page === "home"      && <HomePage setPage={setPage} />}
          {page === "dashboard" && <Dashboard />}
          {page === "tasks"     && <TaskManager />}
          {page === "jobs"      && <JobSearch />}
          {page === "wizard"    && <OnboardingWizard />}
        </main>
      </div>
    </ThemeContext.Provider>
  );
}

// ─── Navbar Component ────────────────────────────────────────────────────────
function Navbar({ page, setPage, isDark }) {
  const { toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      backdropFilter: "blur(12px)",
      padding: "0 24px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>

        {/* Logo */}
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--accent)", letterSpacing: "-0.5px" }}>
          DevPortfolio
        </span>

        {/* Desktop nav links */}
        <div style={{ display: "flex", gap: 4 }} className="desktop-nav">
          {PAGES.map(p => (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              style={{
                background: page === p.id ? "var(--accent)" : "transparent",
                color: page === p.id ? "#fff" : "var(--muted)",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: page === p.id ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "6px 14px",
            cursor: "pointer",
            color: "var(--text)",
            fontSize: 16,
            transition: "all 0.2s",
          }}
          title="Toggle dark mode"
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}

// ─── Home Page ───────────────────────────────────────────────────────────────
function HomePage({ setPage }) {
  const cards = [
    { id: "dashboard", icon: "◈", title: "Dashboard", desc: "Revenue charts, KPI cards, filterable data — built with Recharts + useState for sorting/filtering.", tags: ["Recharts", "useState", "Data Viz"] },
    { id: "tasks",     icon: "◫", title: "Task Manager", desc: "Full CRUD — add, edit, delete, filter tasks. Shows component composition and state management.", tags: ["CRUD", "useReducer", "LocalStorage"] },
    { id: "jobs",      icon: "◎", title: "Job Search", desc: "Real-time search with debounce, multi-filter UI, and conditional rendering.", tags: ["Debounce", "Filter", "Search"] },
    { id: "wizard",    icon: "◉", title: "Onboarding Wizard", desc: "Multi-step form with validation, progress tracking, and complex state flow.", tags: ["Multi-step", "Validation", "State Flow"] },
  ];

  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 0 48px" }}>
        <div style={{ display: "inline-block", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "var(--accent)", marginBottom: 20, fontWeight: 500 }}>
          React Portfolio · 2024
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16, letterSpacing: "-1.5px" }}>
          Four modules.<br />
          <span style={{ color: "var(--accent)" }}>One showcase.</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 18, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
          A portfolio app demonstrating React patterns: state management, data visualisation, real-time search, and form wizards.
        </p>
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setPage(c.id)}
            className="card-hover"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              cursor: "pointer",
              textAlign: "left",
              color: "var(--text)",
              animationDelay: `${i * 80}ms`,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{ fontSize: 28, display: "block", marginBottom: 12, color: "var(--accent)" }}>{c.icon}</span>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{c.title}</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{c.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {c.tags.map(t => (
                <span key={t} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
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
