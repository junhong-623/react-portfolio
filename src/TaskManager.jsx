/**
 * TaskManager.jsx
 *
 * 逻辑：
 * - 任务发布后进入 "Pending" 区（未完成）
 * - 完成时记录 completedAt，然后按完成日期分组显示
 * - 日期 filter 按钮：快速跳到某天
 * - Chart：只显示每天完成数量（柱状图），移除时间对比
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const PRIORITIES      = ["Low", "Medium", "High"];
const PRIORITY_COLORS = { Low: "#7cf8c0", Medium: "#f8c87c", High: "#f87c8b" };

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateKey(ts) {
  const ms = ts?.toMillis?.() ?? ts ?? Date.now();
  return new Date(ms).toLocaleDateString("en-CA");
}

function formatDateLabel(dateKey) {
  const today     = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  if (dateKey === today)     return "Today";
  if (dateKey === yesterday) return "Yesterday";
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDuration(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks,         setTasks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState("list");      // "list" | "chart"
  const [activeDateKey, setActiveDateKey] = useState(null);        // date filter; null = show all
  const [completeModal, setCompleteModal] = useState(null);

  // which completed-date groups are expanded
  const todayKey = new Date().toLocaleDateString("en-CA");
  const [expanded, setExpanded] = useState(() => new Set([todayKey]));

  // ── Firestore ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tasks", user.uid, "items"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const addTask = (text, priority) =>
    addDoc(collection(db, "tasks", user.uid, "items"), {
      text, priority, done: false, createdAt: serverTimestamp(),
    });

  const handleToggle = (task) => {
    if (task.done) {
      updateDoc(doc(db, "tasks", user.uid, "items", task.id), {
        done: false, duration: null, completedAt: null,
      });
    } else {
      setCompleteModal({ taskId: task.id, taskText: task.text });
    }
  };

  const confirmComplete = async (taskId, durationMins) => {
    const completedDateKey = new Date().toLocaleDateString("en-CA");
    await updateDoc(doc(db, "tasks", user.uid, "items", taskId), {
      done: true,
      duration: durationMins || null,
      completedAt: serverTimestamp(),
    });
    // auto-expand the date group the task just landed in
    setExpanded(prev => new Set([...prev, completedDateKey]));
    setCompleteModal(null);
  };

  const deleteTask = (id) => deleteDoc(doc(db, "tasks", user.uid, "items", id));
  const editTask   = (id, text, priority) =>
    updateDoc(doc(db, "tasks", user.uid, "items", id), { text, priority });

  // ── derived data ───────────────────────────────────────────────────────────

  const pending = useMemo(() => tasks.filter(t => !t.done), [tasks]);

  /** completed tasks grouped by completedAt date, sorted newest first */
  const completedGroups = useMemo(() => {
    const done = tasks.filter(t => t.done);
    const map  = new Map();
    for (const t of done) {
      const key = toDateKey(t.completedAt || t.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({ dateKey, label: formatDateLabel(dateKey), items }));
  }, [tasks]);

  /** all unique completed dates for filter buttons */
  const dateKeys = useMemo(() => completedGroups.map(g => g.dateKey), [completedGroups]);

  /** filtered groups for display */
  const visibleGroups = useMemo(() => {
    if (!activeDateKey) return completedGroups;
    return completedGroups.filter(g => g.dateKey === activeDateKey);
  }, [completedGroups, activeDateKey]);

  /** chart data: completed count per day */
  const chartData = useMemo(() =>
    completedGroups
      .slice()
      .reverse()          // oldest first for chart
      .slice(-14)
      .map(g => ({
        label: formatDateLabel(g.dateKey),
        date:  g.dateKey,
        count: g.items.length,
      })),
    [completedGroups]
  );

  const toggleExpand  = (key) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const expandAll   = () => setExpanded(new Set(dateKeys));
  const collapseAll = () => setExpanded(new Set());

  // stats
  const doneCount   = tasks.filter(t => t.done).length;
  const totalCount  = tasks.length;
  const totalMins   = tasks.reduce((s, t) => s + (t.duration || 0), 0);
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner /></div>
  );

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Task Manager</h2>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {doneCount}/{totalCount} done
            {totalMins > 0 && <span style={{ marginLeft: 8 }}>· {fmtDuration(totalMins)} logged</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          {[["list","📋 List"],["chart","📊 Chart"]].map(([id,lbl]) => (
            <button key={id} onClick={() => setView(id)}
              style={{ background: view===id ? "var(--accent)" : "transparent", color: view===id ? "#fff" : "var(--muted)", border:"none", borderRadius:7, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:500, transition:"all 0.18s" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }} className="mobile-stack">
        {[
          { label:"Total",       value:totalCount,                    color:"var(--text)"    },
          { label:"Completed",   value:doneCount,                     color:"var(--accent3)" },
          { label:"Pending",     value:totalCount-doneCount,          color:"var(--accent)"  },
          { label:"Time Logged", value:fmtDuration(totalMins)||"—",   color:"var(--accent2)" },
        ].map((k,i) => (
          <div key={i} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 18px" }}>
            <p style={{ color:"var(--muted)", fontSize:12, marginBottom:4 }}>{k.label}</p>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Overall Progress</span>
          <span style={{ fontSize:14, color:"var(--accent)", fontWeight:700 }}>{progressPct}%</span>
        </div>
        <div style={{ height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progressPct}%`, background:"linear-gradient(90deg,var(--accent),var(--accent3))", borderRadius:4, transition:"width 0.5s ease" }} />
        </div>
      </div>

      {/* ── CHART VIEW ── */}
      {view === "chart" && <DailyChart data={chartData} />}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          {/* Add task */}
          <TaskForm onAdd={addTask} />

          {/* ── PENDING section ── */}
          <Section
            title="Pending"
            badge={pending.length}
            badgeColor="var(--accent)"
            defaultOpen
          >
            {pending.length === 0 ? (
              <Empty icon="🎉" text="All done! Nothing pending." />
            ) : (
              pending.map(task => (
                <TaskItem key={task.id} task={task}
                  onToggle={() => handleToggle(task)}
                  onDelete={() => deleteTask(task.id)}
                  onEdit={(t,p) => editTask(task.id,t,p)}
                />
              ))
            )}
          </Section>

          {/* ── COMPLETED section ── */}
          {completedGroups.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {/* Date filter bar */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16 }}>Completed</p>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    <DateBtn active={!activeDateKey} onClick={() => setActiveDateKey(null)}>All</DateBtn>
                    {dateKeys.map(dk => (
                      <DateBtn key={dk} active={activeDateKey===dk} onClick={() => setActiveDateKey(activeDateKey===dk ? null : dk)}>
                        {formatDateLabel(dk)}
                      </DateBtn>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={expandAll}   style={ghostBtn}>↕ All</button>
                    <button onClick={collapseAll} style={ghostBtn}>↕ None</button>
                  </div>
                </div>
              </div>

              {/* Date groups */}
              {visibleGroups.map(group => (
                <DateGroup
                  key={group.dateKey}
                  group={group}
                  isExpanded={expanded.has(group.dateKey)}
                  onToggleExpand={() => toggleExpand(group.dateKey)}
                  onToggleTask={handleToggle}
                  onDelete={deleteTask}
                  onEdit={editTask}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Complete Modal ── */}
      {completeModal && (
        <CompleteModal
          taskText={completeModal.taskText}
          onConfirm={mins => confirmComplete(completeModal.taskId, mins)}
          onCancel={() => setCompleteModal(null)}
        />
      )}
    </div>
  );
}

// ─── Section (collapsible) ────────────────────────────────────────────────────
function Section({ title, badge, badgeColor, defaultOpen=false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:"100%", background:"transparent", border:"none", cursor:"pointer", padding:"14px 18px", display:"flex", alignItems:"center", gap:10, color:"var(--text)", textAlign:"left" }}>
        <span style={{ fontSize:11, color:"var(--muted)", transition:"transform 0.2s", transform:open?"rotate(90deg)":"rotate(0)", display:"inline-block" }}>▶</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, flex:1 }}>{title}</span>
        {badge != null && (
          <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20, background:badgeColor+"22", color:badgeColor }}>{badge}</span>
        )}
      </button>
      <div style={{ maxHeight:open?"9999px":0, overflow:"hidden", transition:"max-height 0.3s ease" }}>
        <div style={{ padding:"0 12px 12px", display:"flex", flexDirection:"column", gap:6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── DateGroup ────────────────────────────────────────────────────────────────
function DateGroup({ group, isExpanded, onToggleExpand, onToggleTask, onDelete, onEdit }) {
  const groupMins = group.items.reduce((s,t) => s+(t.duration||0), 0);
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
      <button onClick={onToggleExpand}
        style={{ width:"100%", background:"transparent", border:"none", cursor:"pointer", padding:"13px 18px", display:"flex", alignItems:"center", gap:10, color:"var(--text)", textAlign:"left" }}>
        <span style={{ fontSize:11, color:"var(--muted)", transition:"transform 0.2s", transform:isExpanded?"rotate(90deg)":"rotate(0)", display:"inline-block" }}>▶</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, flex:1 }}>{group.label}</span>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <Pill color="var(--accent3)">{group.items.length} done</Pill>
          {groupMins > 0 && <Pill color="var(--accent2)">⏱ {fmtDuration(groupMins)}</Pill>}
        </div>
      </button>
      <div style={{ maxHeight:isExpanded?"9999px":0, overflow:"hidden", transition:"max-height 0.3s ease" }}>
        <div style={{ padding:"0 12px 12px", display:"flex", flexDirection:"column", gap:6 }}>
          {group.items.map(task => (
            <TaskItem key={task.id} task={task}
              onToggle={() => onToggleTask(task)}
              onDelete={() => onDelete(task.id)}
              onEdit={(t,p) => onEdit(task.id,t,p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText,  setEditText]  = useState(task.text);
  const [editPrio,  setEditPrio]  = useState(task.priority);

  const saveEdit = async () => {
    if (editText.trim()) await onEdit(editText.trim(), editPrio);
    setIsEditing(false);
  };

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"11px 14px", display:"flex", alignItems:"center", gap:10, opacity:task.done?0.65:1, transition:"opacity 0.2s" }}>
      <button onClick={onToggle}
        style={{ width:20, height:20, borderRadius:6, flexShrink:0, background:task.done?"var(--accent3)":"transparent", border:`2px solid ${task.done?"var(--accent3)":"var(--border)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.18s" }}>
        {task.done && <span style={{ color:"#000", fontSize:11, fontWeight:800 }}>✓</span>}
      </button>

      {isEditing ? (
        <div style={{ flex:1, display:"flex", gap:6, flexWrap:"wrap" }}>
          <input autoFocus value={editText} onChange={e=>setEditText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setIsEditing(false);}}
            style={{ flex:1, minWidth:100, background:"var(--card)", border:"1px solid var(--accent)", borderRadius:7, padding:"5px 10px", color:"var(--text)", fontSize:14, outline:"none" }} />
          <select value={editPrio} onChange={e=>setEditPrio(e.target.value)}
            style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:7, padding:"5px 8px", color:"var(--text)", fontSize:13 }}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
          <button onClick={saveEdit} style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>Save</button>
          <button onClick={()=>setIsEditing(false)} style={{ background:"transparent", color:"var(--muted)", border:"1px solid var(--border)", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:12 }}>✕</button>
        </div>
      ) : (
        <>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, textDecoration:task.done?"line-through":"none" }}>{task.text}</p>
            {task.done && task.duration && <p style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>⏱ {fmtDuration(task.duration)}</p>}
          </div>
          <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:PRIORITY_COLORS[task.priority]+"28", color:PRIORITY_COLORS[task.priority], flexShrink:0 }}>
            {task.priority}
          </span>
          {!task.done && (
            <button onClick={()=>setIsEditing(true)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:14, padding:"3px 5px" }}>✎</button>
          )}
          <button onClick={onDelete} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--accent2)", fontSize:14, padding:"3px 5px" }}>✕</button>
        </>
      )}
    </div>
  );
}

// ─── CompleteModal ────────────────────────────────────────────────────────────
function CompleteModal({ taskText, onConfirm, onCancel }) {
  const [mins, setMins] = useState("");
  return (
    <div onClick={onCancel} style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"24px", width:"100%", maxWidth:360 }}>
        <p style={{ fontSize:22, textAlign:"center", marginBottom:8 }}>✅</p>
        <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, textAlign:"center", marginBottom:4 }}>Task Complete!</p>
        <p style={{ color:"var(--muted)", fontSize:13, textAlign:"center", marginBottom:18, lineHeight:1.5 }}>"{taskText}"</p>

        <label style={{ fontSize:13, color:"var(--muted)", display:"block", marginBottom:8, fontWeight:500 }}>
          How long did it take? <span style={{ fontWeight:400 }}>(optional)</span>
        </label>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <input autoFocus type="number" min="1" value={mins} onChange={e=>setMins(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onConfirm(mins?parseInt(mins,10):null)}
            placeholder="e.g. 45"
            style={{ flex:1, background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", color:"var(--text)", fontSize:16, outline:"none" }} />
          <span style={{ color:"var(--muted)", fontSize:14 }}>min</span>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:18 }}>
          {[15,30,45,60,90,120].map(n=>(
            <button key={n} onClick={()=>setMins(String(n))}
              style={{ background:mins===String(n)?"var(--accent)":"var(--card)", color:mins===String(n)?"#fff":"var(--muted)", border:`1px solid ${mins===String(n)?"transparent":"var(--border)"}`, borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:12, transition:"all 0.15s" }}>
              {n<60?`${n}m`:`${n/60}h`}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ flex:1, background:"transparent", border:"1px solid var(--border)", borderRadius:10, padding:"10px", cursor:"pointer", color:"var(--muted)", fontSize:14 }}>Cancel</button>
          <button onClick={()=>onConfirm(null)} style={{ flex:1, background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", cursor:"pointer", color:"var(--text)", fontSize:14 }}>Skip</button>
          <button onClick={()=>onConfirm(mins?parseInt(mins,10):null)} style={{ flex:1, background:"var(--accent)", color:"#fff", border:"none", borderRadius:10, padding:"10px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Save ✓</button>
        </div>
      </div>
    </div>
  );
}

// ─── DailyChart ───────────────────────────────────────────────────────────────
function DailyChart({ data }) {
  if (data.length === 0) {
    return (
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:40, textAlign:"center", color:"var(--muted)" }}>
        <p style={{ fontSize:32, marginBottom:8 }}>📊</p>
        <p>Complete some tasks to see your daily chart!</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d=>d.count));

  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:"20px 24px" }}>
      <div style={{ marginBottom:20 }}>
        <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:18 }}>Daily Completed Tasks</p>
        <p style={{ color:"var(--muted)", fontSize:13 }}>Last {data.length} active days</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={data.length > 7 ? 18 : 28}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill:"var(--muted)", fontSize:12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill:"var(--muted)", fontSize:12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" radius={[6,6,0,0]}>
            {data.map((d,i) => (
              <Cell key={i}
                fill={d.count===maxCount ? "var(--accent)" : "var(--accent3)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div style={{ display:"flex", gap:16, marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)", flexWrap:"wrap" }}>
        {[
          { label:"Total completed", value:`${data.reduce((s,d)=>s+d.count,0)} tasks` },
          { label:"Best day",        value:`${data.reduce((b,d)=>d.count>b.count?d:b,data[0]).label} (${data.reduce((b,d)=>d.count>b.count?d:b,data[0]).count})` },
          { label:"Daily average",   value:`${(data.reduce((s,d)=>s+d.count,0)/data.length).toFixed(1)} tasks` },
        ].map((s,i) => (
          <div key={i} style={{ flex:"1 1 120px" }}>
            <p style={{ color:"var(--muted)", fontSize:12, marginBottom:2 }}>{s.label}</p>
            <p style={{ fontWeight:700, fontSize:15 }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TaskForm ─────────────────────────────────────────────────────────────────
function TaskForm({ onAdd }) {
  const [text,     setText]     = useState("");
  const [priority, setPriority] = useState("Medium");
  const [error,    setError]    = useState("");
  const [adding,   setAdding]   = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) { setError("Task text cannot be empty"); return; }
    setAdding(true);
    try { await onAdd(text.trim(), priority); setText(""); setError(""); }
    finally { setAdding(false); }
  };

  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:"18px 20px" }}>
      <p style={{ fontWeight:700, marginBottom:12, fontFamily:"'Syne',sans-serif", fontSize:15 }}>Add New Task</p>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <input value={text} onChange={e=>{setText(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
          placeholder="What needs to be done?" disabled={adding}
          style={{ flex:"1 1 180px", background:"var(--surface)", border:`1px solid ${error?"var(--accent2)":"var(--border)"}`, borderRadius:10, padding:"10px 14px", color:"var(--text)", fontSize:16, outline:"none" }} />
        <select value={priority} onChange={e=>setPriority(e.target.value)}
          style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", color:"var(--text)", fontSize:14, cursor:"pointer" }}>
          {PRIORITIES.map(p=><option key={p}>{p}</option>)}
        </select>
        <button onClick={handleSubmit} disabled={adding}
          style={{ background:"var(--accent)", color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:adding?"default":"pointer", fontWeight:600, fontSize:14, opacity:adding?0.7:1 }}>
          {adding ? "…" : "Add"}
        </button>
      </div>
      {error && <p style={{ color:"var(--accent2)", fontSize:12, marginTop:6 }}>{error}</p>}
    </div>
  );
}

// ─── shared UI ────────────────────────────────────────────────────────────────
function DateBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ background:active?"var(--accent)":"var(--card)", color:active?"#fff":"var(--muted)", border:`1px solid ${active?"transparent":"var(--border)"}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:active?600:400, transition:"all 0.18s", whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

function Pill({ color, children }) {
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:color+"22", color, flexShrink:0 }}>
      {children}
    </span>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"24px 0", color:"var(--muted)" }}>
      <p style={{ fontSize:28, marginBottom:6 }}>{icon}</p>
      <p style={{ fontSize:14 }}>{text}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontSize:13 }}>
      <p style={{ fontWeight:600, marginBottom:4 }}>{label}</p>
      <p style={{ color:"var(--accent3)" }}>✅ {v} task{v!==1?"s":""} completed</p>
    </div>
  );
}

const ghostBtn = {
  background:"transparent", border:"1px solid var(--border)", borderRadius:7,
  padding:"4px 10px", cursor:"pointer", color:"var(--muted)", fontSize:12,
};

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </>
  );
}
