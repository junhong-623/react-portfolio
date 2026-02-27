import { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "./i18n";

const JOBS = [
  { id: 1,  title: "Senior React Developer",   company: "Stripe",      location: "Remote",        type: "Full-time", salary: "$140k–$180k", tags: ["React", "TypeScript", "GraphQL"],       logo: "💳" },
  { id: 2,  title: "Frontend Engineer",         company: "Vercel",      location: "San Francisco", type: "Full-time", salary: "$120k–$160k", tags: ["Next.js", "React", "CSS"],               logo: "▲"  },
  { id: 3,  title: "UI Engineer",               company: "Linear",      location: "Remote",        type: "Full-time", salary: "$130k–$170k", tags: ["React", "Figma", "Design Systems"],      logo: "◈"  },
  { id: 4,  title: "Full Stack Developer",      company: "Supabase",    location: "Remote",        type: "Contract",  salary: "$100–$150/hr", tags: ["React", "Node.js", "PostgreSQL"],       logo: "⚡" },
  { id: 5,  title: "React Native Engineer",     company: "Notion",      location: "New York",      type: "Full-time", salary: "$135k–$165k", tags: ["React Native", "TypeScript", "Mobile"],  logo: "📝" },
  { id: 6,  title: "Frontend Architect",        company: "Figma",       location: "San Francisco", type: "Full-time", salary: "$160k–$200k", tags: ["React", "WebGL", "Performance"],         logo: "✦"  },
  { id: 7,  title: "Product Engineer",          company: "Loom",        location: "Remote",        type: "Part-time", salary: "$90k–$120k",  tags: ["React", "Python", "Video"],              logo: "🎥" },
  { id: 8,  title: "JavaScript Developer",      company: "Cloudflare",  location: "Austin",        type: "Full-time", salary: "$110k–$145k", tags: ["JavaScript", "Workers", "Edge"],         logo: "🌐" },
  { id: 9,  title: "Software Engineer II",      company: "GitHub",      location: "Remote",        type: "Full-time", salary: "$150k–$190k", tags: ["React", "Ruby", "API"],                  logo: "🐙" },
  { id: 10, title: "Mobile Frontend Engineer",  company: "Airbnb",      location: "New York",      type: "Full-time", salary: "$145k–$185k", tags: ["React Native", "iOS", "Android"],        logo: "🏠" },
  { id: 11, title: "Platform Engineer",         company: "Shopify",     location: "Toronto",       type: "Full-time", salary: "$120k–$155k", tags: ["React", "GraphQL", "Ruby"],              logo: "🛍️"},
  { id: 12, title: "Frontend Intern",           company: "OpenAI",      location: "San Francisco", type: "Internship",salary: "$50–$70/hr",  tags: ["React", "Python", "ML"],                logo: "🤖" },
];

const ALL_TYPES     = ["All", "Full-time", "Contract", "Part-time", "Internship"];
const ALL_LOCATIONS = ["All", "Remote", "San Francisco", "New York", "Austin", "Toronto"];
const TYPE_COLORS   = {
  "Full-time":  { bg: "rgba(124,248,192,0.15)", color: "#7cf8c0" },
  "Contract":   { bg: "rgba(248,200,124,0.15)", color: "#f8c87c" },
  "Part-time":  { bg: "rgba(139,124,248,0.15)", color: "#8b7cf8" },
  "Internship": { bg: "rgba(248,124,139,0.15)", color: "#f87c8b" },
};

export default function JobSearch() {
  const { t } = useI18n();
  const [query,      setQuery] = useState("");
  const [typeFilter, setType]  = useState("All");
  const [locFilter,  setLoc]   = useState("All");
  const [tagFilter,  setTag]   = useState("");
  const [debouncedQuery, setDebounced] = useState("");
  const [saved, setSaved] = useState(new Set());

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return JOBS.filter(job => {
      const matchQuery = !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.tags.some(tg => tg.toLowerCase().includes(q));
      const matchType  = typeFilter === "All" || job.type === typeFilter;
      const matchLoc   = locFilter  === "All" || job.location === locFilter;
      const matchTag   = !tagFilter || job.tags.includes(tagFilter);
      return matchQuery && matchType && matchLoc && matchTag;
    });
  }, [debouncedQuery, typeFilter, locFilter, tagFilter]);

  const toggleSave   = useCallback(id => setSaved(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }), []);
  const clearFilters = () => { setQuery(""); setType("All"); setLoc("All"); setTag(""); };
  const isFiltered   = query || typeFilter !== "All" || locFilter !== "All" || tagFilter;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>{t("jobs.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {t("jobs.subtitle", { n: filtered.length, total: JOBS.length })}
            {debouncedQuery !== query && <span style={{ color: "var(--accent)", marginLeft: 8, fontSize: 12 }}>{t("jobs.searching")}</span>}
          </p>
        </div>
        {saved.size > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
            {t("jobs.saved", { n: saved.size })}
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 16 }}>🔍</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("jobs.searchPh")}
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px 12px 42px", color: "var(--text)", fontSize: 15, outline: "none", transition: "border-color 0.18s" }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"} />
          {query && <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>×</button>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <FilterSelect label={t("jobs.type")}     value={typeFilter} onChange={setType} options={ALL_TYPES} />
          <FilterSelect label={t("jobs.location")} value={locFilter}  onChange={setLoc}  options={ALL_LOCATIONS} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["React", "TypeScript", "Remote"].map(tag => (
              <button key={tag} onClick={() => setTag(tagFilter === tag ? "" : tag)}
                style={{ background: tagFilter === tag ? "var(--accent)" : "var(--surface)", color: tagFilter === tag ? "#fff" : "var(--muted)", border: `1px solid ${tagFilter === tag ? "transparent" : "var(--border)"}`, borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 13, transition: "all 0.18s" }}>
                #{tag}
              </button>
            ))}
          </div>
          {isFiltered && (
            <button onClick={clearFilters} style={{ marginLeft: "auto", background: "transparent", color: "var(--accent2)", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
              {t("jobs.clearAll")}
            </button>
          )}
        </div>
      </div>

      {/* Job List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>{t("jobs.noFound")}</p>
          <p style={{ fontSize: 14, marginBottom: 20 }}>{t("jobs.noFoundSub")}</p>
          <button onClick={clearFilters} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 600 }}>
            {t("jobs.clearFilters")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(job => (
            <div key={job.id} className="card-hover"
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {job.logo}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}><Highlight text={job.title} query={debouncedQuery} /></p>
                <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
                  <Highlight text={job.company} query={debouncedQuery} /> · {job.location} · {job.salary}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {job.tags.map(tag => (
                    <span key={tag} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                <span style={{ background: (TYPE_COLORS[job.type]||{}).bg, color: (TYPE_COLORS[job.type]||{}).color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>{job.type}</span>
                <button onClick={() => toggleSave(job.id)} title={saved.has(job.id) ? t("jobs.removeSaved") : t("jobs.saveJob")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: saved.has(job.id) ? "var(--accent2)" : "var(--muted)", transition: "color 0.18s, transform 0.18s", transform: saved.has(job.id) ? "scale(1.2)" : "scale(1)" }}>
                  {saved.has(job.id) ? "♥" : "♡"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>{text.slice(0, idx)}<mark style={{ background: "var(--accent)", color: "#fff", borderRadius: 3, padding: "0 2px" }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
