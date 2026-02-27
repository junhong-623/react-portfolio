/**
 * App.jsx — 主入口
 */
import { useState, createContext, useContext, useEffect, lazy, Suspense, startTransition } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { useI18n, LANGUAGES } from "./i18n.jsx";

const AuthPages        = lazy(() => import("./AuthPages"));
const Dashboard        = lazy(() => import("./Dashboard"));
const TaskManager      = lazy(() => import("./TaskManager"));
const JobSearch        = lazy(() => import("./JobSearch"));
const OnboardingWizard = lazy(() => import("./OnboardingWizard"));
const Savings          = lazy(() => import("./Savings"));
const UserSettings     = lazy(() => import("./UserSettings"));
const CurrencyExchange = lazy(() => import("./CurrencyExchange"));

// ─── Theme ────────────────────────────────────────────────────────────────────
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

const PAGES = [
  { id: "home",      labelKey: "nav.home",       icon: "⬡",  auth: false },
  { id: "dashboard", labelKey: "nav.dashboard",  icon: "◈",  auth: false },
  { id: "savings",   labelKey: "nav.savings",    icon: "💰", auth: true  },
  { id: "tasks",     labelKey: "nav.tasks",      icon: "◫",  auth: true  },
  { id: "jobs",      labelKey: "nav.jobs",       icon: "◎",  auth: false },
  { id: "currency",  labelKey: "nav.currency",   icon: "💱", auth: false },
  { id: "wizard",    labelKey: "nav.onboarding", icon: "◉",  auth: false },
];

function PageLoader() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"80px 0" }}>
      <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function Root() {
  return <AuthProvider><App /></AuthProvider>;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [page,      setPage]      = useState("home");
  const [isDark,    setIsDark]    = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const { user } = useAuth();

  const theme     = themes[isDark ? "dark" : "light"];
  const rootStyle = Object.fromEntries(Object.entries(theme));
  const bgColor   = isDark ? "#0d0d14" : "#f2f1fa";

  useEffect(() => {
    document.documentElement.style.background = bgColor;
    document.body.style.background            = bgColor;
    const meta = document.getElementById("theme-color-meta");
    if (meta) meta.setAttribute("content", bgColor);
  }, [isDark, bgColor]);

  const safePage           = PAGES.find(p => p.id === page)?.auth && !user ? "home" : page;
  // const handleLoginSuccess = () => { setShowLogin(false); setPage("home"); };
  const handleLoginSuccess = () => {
    startTransition(() => {
      setShowLogin(false);
      setPage("home");
    });
  };
  // const openLogin          = () => setShowLogin(true);
  const openLogin = () => {
    startTransition(() => {
      setShowLogin(true);
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(d => !d), theme }}>
      <div style={{ ...rootStyle, minHeight:"100vh", background:"var(--bg)", color:"var(--text)", fontFamily:"'DM Sans', sans-serif", transition:"background 0.3s, color 0.3s" }}>
        <GlobalStyles isDark={isDark} />
        <Navbar page={safePage} setPage={setPage} isDark={isDark} openLogin={openLogin} />
        <main style={{ maxWidth:1200, margin:"0 auto", padding:"32px 24px" }}>
          <Suspense fallback={<PageLoader />}>
            {safePage === "home"      && <HomePage setPage={setPage} openLogin={openLogin} />}
            {safePage === "dashboard" && <Dashboard />}
            {safePage === "savings"   && <Savings />}
            {safePage === "tasks"     && <TaskManager />}
            {safePage === "jobs"      && <JobSearch />}
            {safePage === "currency"  && <CurrencyExchange />}
            {safePage === "wizard"    && <OnboardingWizard />}
            {safePage === "settings"  && <UserSettings />}
          </Suspense>
        </main>

        {showLogin && !user && (
          <div onClick={() => setShowLogin(false)}
            style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, position:"relative" }}>
              <button onClick={() => setShowLogin(false)}
                style={{ position:"absolute", top:-14, right:-14, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"50%", width:32, height:32, cursor:"pointer", color:"var(--muted)", fontSize:16, zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                ✕
              </button>
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
  const { toggle }                = useTheme();
  const { user, profile, logout } = useAuth();
  const { t, lang, setLang }      = useI18n();
  const [dropOpen, setDropOpen]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [isMobile, setIsMobile]   = useState(window.innerWidth <= 768);

  useEffect(() => {
    const fn = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    if (!dropOpen) return;
    const fn = (e) => { if (!e.target.closest("[data-userdrop]")) setDropOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [dropOpen]);

  const handleLogout = async () => { await logout(); setPage("home"); setDropOpen(false); setMenuOpen(false); };
  // const navigate     = (id) => { setPage(id); setMenuOpen(false); setDropOpen(false); };
  const navigate = (id) => {
    startTransition(() => {
      setPage(id);
    });

    setMenuOpen(false);
    setDropOpen(false);
  };
  return (
    <>
      <nav style={{ position:"sticky", top:0, zIndex:200, background:"var(--surface)", borderBottom:"1px solid var(--border)", backdropFilter:"blur(12px)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", height:56, padding:"0 16px", gap:8 }}>

          {/* Logo */}
          <span onClick={() => navigate("home")}
            style={{ fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:18, color:"var(--accent)", letterSpacing:"-0.5px", cursor:"pointer", flexShrink:0 }}>
            DevPortfolio
          </span>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display:"flex", gap:2, flex:1, marginLeft:8 }}>
              {PAGES.map(p => {
                const locked = p.auth && !user;
                return (
                  <button key={p.id} onClick={() => locked ? openLogin() : navigate(p.id)}
                    style={{ background: page===p.id ? "var(--accent)" : "transparent", color: page===p.id ? "#fff" : locked ? "var(--border)" : "var(--muted)", border:"none", borderRadius:8, padding:"6px 12px", cursor: locked?"not-allowed":"pointer", fontFamily:"'DM Sans', sans-serif", fontSize:13, fontWeight: page===p.id?600:400, transition:"all 0.2s", display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
                    {t(p.labelKey)}
                    {locked && <span style={{ fontSize:9 }}>🔒</span>}
                  </button>
                );
              })}
            </div>
          )}

          {isMobile && <div style={{ flex:1 }} />}

          {/* Right controls */}
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>

            {/* Desktop + not logged in: standalone lang + dark toggle */}
            {!isMobile && !user && (
              <>
                <LangSwitcher />
                <button onClick={toggle}
                  style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, padding:"5px 10px", cursor:"pointer", color:"var(--text)", fontSize:14 }}>
                  {isDark ? "☀️" : "🌙"}
                </button>
              </>
            )}

            {/* User dropdown (logged in) — lang + dark live inside here */}
            {user ? (
              <div style={{ position:"relative" }} data-userdrop>
                <button onClick={() => setDropOpen(v => !v)}
                  style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, padding:"3px 8px 3px 3px", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  <img src={profile?.avatar||""} alt="avatar" style={{ width:26, height:26, borderRadius:"50%", objectFit:"cover", background:"var(--border)" }} />
                  {!isMobile && <span style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{profile?.username||"User"}</span>}
                  <span style={{ color:"var(--muted)", fontSize:9 }}>▼</span>
                </button>

                {dropOpen && (
                  <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, minWidth:200, boxShadow:"var(--shadow)", zIndex:999, overflow:"hidden" }}>
                    {/* User info */}
                    <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
                      <p style={{ fontSize:13, fontWeight:700 }}>{profile?.username}</p>
                      <p style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{profile?.email}</p>
                    </div>
                    {/* Language */}
                    <div style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                      <p style={{ fontSize:10, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", padding:"0 16px 6px" }}>{t("lang.label")}</p>
                      {LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => setLang(l.code)}
                          style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 16px", background: lang===l.code?"var(--accent)18":"transparent", border:"none", color: lang===l.code?"var(--accent)":"var(--text)", cursor:"pointer", fontSize:13, fontWeight: lang===l.code?700:400 }}>
                          <span>{l.flag}</span><span>{l.name}</span>
                          {lang===l.code && <span style={{ marginLeft:"auto", fontSize:11 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                    {/* Dark mode */}
                    <button onClick={toggle}
                      style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px", background:"transparent", border:"none", color:"var(--text)", cursor:"pointer", fontSize:13, borderBottom:"1px solid var(--border)" }}>
                      <span>{isDark ? "☀️" : "🌙"}</span>
                      <span>{isDark ? "Light mode" : "Dark mode"}</span>
                    </button>
                    <DropItem onClick={() => { navigate("settings"); setDropOpen(false); }}>⚙️ {t("nav.settings")}</DropItem>
                    <DropItem onClick={handleLogout} danger>🚪 {t("nav.signOut")}</DropItem>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={openLogin}
                style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}>
                {t("nav.signIn")}
              </button>
            )}

            {/* Hamburger (mobile only) */}
            {isMobile && (
              <button onClick={() => setMenuOpen(v => !v)}
                style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 8px", cursor:"pointer", color:"var(--text)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", width:36, height:36 }}>
                {menuOpen ? "✕" : "☰"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {isMobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"fixed", top:56, left:0, right:0, zIndex:160, background:"var(--surface)", borderBottom:"1px solid var(--border)", boxShadow:"0 8px 32px rgba(0,0,0,0.3)", animation:"slideDown 0.2s ease", overflowY:"auto", maxHeight:"calc(100vh - 56px)" }}>

            {/* User info */}
            {user && (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px 14px", borderBottom:"1px solid var(--border)" }}>
                <img src={profile?.avatar||""} alt="" style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--accent)" }} />
                <div>
                  <p style={{ fontWeight:700, fontSize:15 }}>{profile?.username}</p>
                  <p style={{ color:"var(--muted)", fontSize:12 }}>{profile?.email}</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding:"8px 0" }}>
              {PAGES.map(p => {
                const locked = p.auth && !user;
                const active = page === p.id;
                return (
                  <button key={p.id} onClick={() => locked ? (openLogin(), setMenuOpen(false)) : navigate(p.id)}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 20px", background: active?"var(--accent)18":"transparent", border:"none", borderLeft:`3px solid ${active?"var(--accent)":"transparent"}`, color: locked?"var(--border)": active?"var(--accent)":"var(--text)", cursor: locked?"not-allowed":"pointer", fontSize:15, fontWeight: active?700:400, textAlign:"left" }}>
                    <span style={{ width:22, textAlign:"center", fontSize:16 }}>{p.icon}</span>
                    {t(p.labelKey)}
                    {locked && <span style={{ marginLeft:"auto", fontSize:12 }}>🔒</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ height:1, background:"var(--border)" }} />

            {/* Settings + logout */}
            {user && (
              <>
                <button onClick={() => navigate("settings")}
                  style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 20px", background:"transparent", border:"none", color:"var(--text)", cursor:"pointer", fontSize:15, textAlign:"left" }}>
                  <span style={{ width:22, textAlign:"center" }}>⚙️</span>{t("nav.settings")}
                </button>
                <button onClick={handleLogout}
                  style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 20px", background:"transparent", border:"none", color:"var(--accent2)", cursor:"pointer", fontSize:15, textAlign:"left" }}>
                  <span style={{ width:22, textAlign:"center" }}>🚪</span>{t("nav.signOut")}
                </button>
                <div style={{ height:1, background:"var(--border)" }} />
              </>
            )}

            {/* Language selector */}
            <div style={{ padding:"12px 20px" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{t("lang.label")}</p>
              <div style={{ display:"flex", gap:8 }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    style={{ flex:1, background: lang===l.code?"var(--accent)":"var(--card)", color: lang===l.code?"#fff":"var(--muted)", border:`1px solid ${lang===l.code?"transparent":"var(--border)"}`, borderRadius:10, padding:"10px 4px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:20 }}>{l.flag}</span>
                    <span style={{ fontSize:11, fontWeight:600 }}>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark mode */}
            <button onClick={toggle}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 20px", background:"transparent", border:"none", color:"var(--text)", cursor:"pointer", fontSize:15, textAlign:"left" }}>
              <span style={{ width:22, textAlign:"center" }}>{isDark?"☀️":"🌙"}</span>
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            {/* Sign in */}
            {!user && (
              <div style={{ padding:"8px 20px 16px" }}>
                <button onClick={() => { openLogin(); setMenuOpen(false); }}
                  style={{ width:"100%", background:"var(--accent)", color:"#fff", border:"none", borderRadius:12, padding:"13px", cursor:"pointer", fontSize:15, fontWeight:700 }}>
                  {t("nav.signIn")} / {t("auth.register")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─── DropItem ─────────────────────────────────────────────────────────────────
function DropItem({ onClick, children, danger }) {
  return (
    <button onClick={onClick}
      style={{ display:"block", width:"100%", padding:"10px 16px", background:"transparent", border:"none", textAlign:"left", color: danger?"var(--accent2)":"var(--text)", cursor:"pointer", fontSize:13, transition:"background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}

// ─── LangSwitcher (desktop / not logged in) ───────────────────────────────────
function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen]   = useState(false);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, padding:"5px 10px", cursor:"pointer", color:"var(--text)", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
        <span>{current.flag}</span>
        <span style={{ fontSize:11 }}>{current.label}</span>
        <span style={{ fontSize:8, color:"var(--muted)" }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:290 }} />
          <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, minWidth:130, boxShadow:"var(--shadow)", zIndex:300, overflow:"hidden" }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", background: lang===l.code?"var(--accent)18":"transparent", border:"none", color: lang===l.code?"var(--accent)":"var(--text)", cursor:"pointer", fontSize:13, fontWeight: lang===l.code?700:400, textAlign:"left" }}
                onMouseEnter={e => { if (lang!==l.code) e.currentTarget.style.background="var(--card)"; }}
                onMouseLeave={e => { if (lang!==l.code) e.currentTarget.style.background="transparent"; }}>
                <span style={{ fontSize:16 }}>{l.flag}</span>
                <span>{l.name}</span>
                {lang===l.code && <span style={{ marginLeft:"auto", fontSize:11 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
function HomePage({ setPage, openLogin }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();

  const cards = [
    { id:"dashboard", icon:"◈",  titleKey:"nav.dashboard",  descKey:"mod.dashboard.desc", tags:["Recharts","useMemo","Data Viz"],       auth:false },
    { id:"savings",   icon:"💰", titleKey:"nav.savings",    descKey:"mod.savings.desc",   tags:["Firestore","Charts","Finance"],         auth:true  },
    { id:"tasks",     icon:"◫",  titleKey:"nav.tasks",      descKey:"mod.tasks.desc",     tags:["Firestore","onSnapshot","CRUD"],        auth:true  },
    { id:"jobs",      icon:"◎",  titleKey:"nav.jobs",       descKey:"mod.jobs.desc",      tags:["Debounce","Filter","useCallback"],      auth:false },
    { id:"currency",  icon:"💱", titleKey:"nav.currency",   descKey:"mod.currency.desc",  tags:["Live Rates","Frankfurter","Scraping"],  auth:false },
    { id:"wizard",    icon:"◉",  titleKey:"nav.onboarding", descKey:"mod.wizard.desc",    tags:["Multi-step","Validation","Wizard"],     auth:false },
  ];

  return (
    <div className="fade-in">
      {user && (
        <div style={{ background:"linear-gradient(135deg,var(--accent)22,var(--accent3)11)", border:"1px solid var(--accent)44", borderRadius:16, padding:"18px 24px", marginBottom:32, display:"flex", alignItems:"center", gap:14 }}>
          <img src={profile?.avatar} alt="" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--accent)" }} />
          <div>
            <p style={{ fontFamily:"'Syne', sans-serif", fontWeight:700, fontSize:18 }}>{t("home.welcome",{name:profile?.username})}</p>
            <p style={{ color:"var(--muted)", fontSize:14 }}>{t("home.welcomeSub")}</p>
          </div>
        </div>
      )}

      {!user && (
        <div style={{ textAlign:"center", padding:"60px 0 48px" }}>
          <div style={{ display:"inline-block", background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, padding:"6px 16px", fontSize:13, color:"var(--accent)", marginBottom:20, fontWeight:500 }}>
            {t("home.badge")}
          </div>
          <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:"clamp(32px,5vw,56px)", fontWeight:800, lineHeight:1.1, marginBottom:16, letterSpacing:"-1.5px" }}>
            {t("home.hero1")}<br /><span style={{ color:"var(--accent)" }}>{t("home.hero2")}</span>
          </h1>
          <p style={{ color:"var(--muted)", fontSize:16, maxWidth:480, margin:"0 auto 32px", lineHeight:1.6 }}>
            {t("home.subtitle")}
          </p>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>
        {cards.map((c, i) => {
          const locked = c.auth && !user;
          return (
            <button key={c.id} onClick={() => locked ? openLogin() : setPage(c.id)}
              className="card-hover"
              style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:24, cursor:"pointer", textAlign:"left", color:"var(--text)", animationDelay:`${i*80}ms`, transition:"border-color 0.2s,box-shadow 0.2s", opacity: locked?0.8:1 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.boxShadow="var(--shadow)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <span style={{ fontSize:26, color:"var(--accent)" }}>{c.icon}</span>
                {locked && <span style={{ fontSize:11, background:"var(--accent2)22", color:"var(--accent2)", padding:"3px 8px", borderRadius:6, fontWeight:600 }}>{t("home.locked")}</span>}
              </div>
              <h3 style={{ fontFamily:"'Syne', sans-serif", fontWeight:700, fontSize:17, marginBottom:8 }}>{t(c.titleKey)}</h3>
              <p style={{ color:"var(--muted)", fontSize:13, lineHeight:1.6, marginBottom:14 }}>{t(c.descKey)}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {c.tags.map(tag => (
                  <span key={tag} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, padding:"3px 9px", fontSize:11, color:"var(--accent)", fontWeight:500 }}>{tag}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {!user && (
        <div style={{ textAlign:"center", marginTop:48 }}>
          <p style={{ color:"var(--muted)", marginBottom:16, fontSize:15 }}>{t("home.ctaNote")}</p>
          <button onClick={openLogin}
            style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:12, padding:"13px 36px", cursor:"pointer", fontSize:16, fontWeight:700 }}>
            {t("home.cta")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── GlobalStyles ─────────────────────────────────────────────────────────────
function GlobalStyles({ isDark }) {
  const bg = isDark ? "#0d0d14" : "#f2f1fa";
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      :root { color-scheme: ${isDark ? "dark" : "light"}; }
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
      html, body { background:${bg}; min-height:100%; overscroll-behavior-y:none; }
      button { font-family:'DM Sans',sans-serif; }
      input, textarea, select { font-family:'DM Sans',sans-serif; font-size:16px; }
      .fade-in { animation:fadeIn 0.45s ease forwards; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
      @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
      .card-hover { transition:transform 0.2s ease,box-shadow 0.2s ease,border-color 0.2s ease; }
      .card-hover:hover { transform:translateY(-4px); }
      ::-webkit-scrollbar { width:5px; }
      ::-webkit-scrollbar-track { background:var(--surface); }
      ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
      @media (max-width:768px) {
        main { padding:20px 14px !important; }
        .mobile-stack { grid-template-columns:1fr !important; }
        .recharts-wrapper { overflow:hidden; }
        button { min-height:36px; }
        .txn-form-grid { grid-template-columns:1fr 1fr !important; }
      }
      @media (max-width:480px) {
        main { padding:16px 12px !important; }
        .txn-form-grid { grid-template-columns:1fr !important; }
        input, textarea, select { font-size:16px !important; }
      }
    `}</style>
  );
}
