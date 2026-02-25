/**
 * TaskManager.jsx — CRUD + Firebase Firestore
 *
 * 面试亮点：
 * 1. Firestore 实时监听 onSnapshot：任何设备更改任务都实时同步
 * 2. 每个用户数据隔离：tasks/{uid}/items/{taskId}
 * 3. Optimistic update + loading state
 * 4. 加载状态处理
 */

import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const PRIORITIES = ["Low", "Medium", "High"];
const PRIORITY_COLORS = { Low: "#7cf8c0", Medium: "#f8c87c", High: "#f87c8b" };

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");
  const [sortBy, setSortBy]   = useState("date");

  /**
   * onSnapshot：实时监听 Firestore
   * 路径：tasks/{uid}/items（每个用户有自己的子集合，数据互相隔离）
   */
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, "tasks", user.uid, "items");
    const q      = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(data);
      setLoading(false);
    });

    return unsubscribe; // 组件卸载时停止监听
  }, [user]);

  const addTask    = (text, priority) =>
    addDoc(collection(db, "tasks", user.uid, "items"), { text, priority, done: false, createdAt: serverTimestamp() });
  const toggleTask = (id, done) =>
    updateDoc(doc(db, "tasks", user.uid, "items", id), { done: !done });
  const deleteTask = (id) =>
    deleteDoc(doc(db, "tasks", user.uid, "items", id));
  const editTask   = (id, text, priority) =>
    updateDoc(doc(db, "tasks", user.uid, "items", id), { text, priority });
  const clearDone  = () =>
    Promise.all(tasks.filter(t => t.done).map(t => deleteDoc(doc(db, "tasks", user.uid, "items", t.id))));

  const visibleTasks = tasks
    .filter(t => filter === "All" ? true : filter === "Done" ? t.done : !t.done)
    .sort((a, b) => {
      if (sortBy === "priority") {
        return ({ High: 0, Medium: 1, Low: 2 }[a.priority]) - ({ High: 0, Medium: 1, Low: 2 }[b.priority]);
      }
      return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    });

  const doneCount   = tasks.filter(t => t.done).length;
  const totalCount  = tasks.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner /></div>;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Task Manager</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>{doneCount} of {totalCount} tasks completed</p>
      </div>

      {/* Progress Bar */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>{progressPct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", borderRadius: 4, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <TaskForm onAdd={addTask} />

      {/* Filter & Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          {["All", "Active", "Done"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s" }}>
              {f} ({f === "All" ? totalCount : f === "Done" ? doneCount : totalCount - doneCount})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Sort:</span>
          {["date", "priority"].map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              style={{ background: sortBy === s ? "var(--surface)" : "transparent", color: sortBy === s ? "var(--text)" : "var(--muted)", border: `1px solid ${sortBy === s ? "var(--border)" : "transparent"}`, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 13, transition: "all 0.18s" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {doneCount > 0 && (
            <button onClick={clearDone}
              style={{ background: "transparent", color: "var(--accent2)", border: "1px solid var(--accent2)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 13 }}>
              Clear done ({doneCount})
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            {tasks.length === 0 ? <><p style={{ fontSize: 32, marginBottom: 8 }}>📝</p><p>No tasks yet. Add one above!</p></> : "Nothing to show here."}
          </div>
        ) : (
          visibleTasks.map(task => (
            <TaskItem key={task.id} task={task}
              onToggle={() => toggleTask(task.id, task.done)}
              onDelete={() => deleteTask(task.id)}
              onEdit={(text, priority) => editTask(task.id, text, priority)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskForm({ onAdd }) {
  const [text, setText]         = useState("");
  const [priority, setPriority] = useState("Medium");
  const [error, setError]       = useState("");
  const [adding, setAdding]     = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) { setError("Task text cannot be empty"); return; }
    setAdding(true);
    try { await onAdd(text.trim(), priority); setText(""); setError(""); }
    finally { setAdding(false); }
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
      <p style={{ fontWeight: 600, marginBottom: 14, fontFamily: "'Syne', sans-serif" }}>Add New Task</p>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={text} onChange={e => { setText(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="What needs to be done?" disabled={adding}
          style={{ flex: 1, background: "var(--surface)", border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`, borderRadius: 10, padding: "10px 16px", color: "var(--text)", fontSize: 14, outline: "none" }} />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 14, cursor: "pointer" }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={handleSubmit} disabled={adding}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: adding ? "default" : "pointer", fontWeight: 600, fontSize: 14, opacity: adding ? 0.7 : 1 }}>
          {adding ? "…" : "Add"}
        </button>
      </div>
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText]   = useState(task.text);
  const [editPrio, setEditPrio]   = useState(task.priority);

  const saveEdit = async () => {
    if (editText.trim()) await onEdit(editText.trim(), editPrio);
    setIsEditing(false);
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, opacity: task.done ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <button onClick={onToggle}
        style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: task.done ? "var(--accent3)" : "transparent", border: `2px solid ${task.done ? "var(--accent3)" : "var(--border)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}>
        {task.done && <span style={{ color: "#000", fontSize: 12, fontWeight: 800 }}>✓</span>}
      </button>
      {isEditing ? (
        <div style={{ flex: 1, display: "flex", gap: 8 }}>
          <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setIsEditing(false); }}
            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: 8, padding: "6px 12px", color: "var(--text)", fontSize: 14, outline: "none" }} />
          <select value={editPrio} onChange={e => setEditPrio(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--text)", fontSize: 13 }}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={saveEdit} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: 14, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: PRIORITY_COLORS[task.priority] + "30", color: PRIORITY_COLORS[task.priority], flexShrink: 0 }}>{task.priority}</span>
          <button onClick={() => setIsEditing(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 15, padding: "4px 6px" }}>✎</button>
          <button onClick={onDelete} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent2)", fontSize: 15, padding: "4px 6px" }}>✕</button>
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}
