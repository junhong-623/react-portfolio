/**
 * TaskManager.jsx — 全功能 CRUD 模块
 *
 * 面试亮点：
 * 1. useReducer 管理复杂 state（比多个 useState 更结构化）
 * 2. localStorage 持久化（刷新不丢数据）
 * 3. 组件拆分：TaskList, TaskItem, TaskForm, FilterBar
 * 4. inline 编辑（click-to-edit）
 * 5. 筛选（All / Active / Done）+ 优先级标签
 */

import { useReducer, useState, useEffect } from "react";

// ─── Types & Initial State ────────────────────────────────────────────────────
const PRIORITIES = ["Low", "Medium", "High"];
const PRIORITY_COLORS = { Low: "#7cf8c0", Medium: "#f8c87c", High: "#f87c8b" };

// 初始示例任务
const SEED_TASKS = [
  { id: 1, text: "Set up React project with Vite", done: true,  priority: "High",   createdAt: Date.now() - 86400000 },
  { id: 2, text: "Build Dashboard component",       done: true,  priority: "High",   createdAt: Date.now() - 72000000 },
  { id: 3, text: "Implement dark mode toggle",       done: false, priority: "Medium", createdAt: Date.now() - 36000000 },
  { id: 4, text: "Write README for GitHub",          done: false, priority: "Low",    createdAt: Date.now() - 3600000  },
  { id: 5, text: "Deploy to Vercel",                 done: false, priority: "Medium", createdAt: Date.now()            },
];

// ─── Reducer ─────────────────────────────────────────────────────────────────
/**
 * useReducer 模式：所有 state 变更都通过 dispatch(action) 触发
 * 好处：逻辑集中、可测试、状态变化可预测
 */
function taskReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [
        { id: Date.now(), text: action.text, done: false, priority: action.priority, createdAt: Date.now() },
        ...state,
      ];
    case "TOGGLE":
      return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
    case "DELETE":
      return state.filter(t => t.id !== action.id);
    case "EDIT":
      return state.map(t => t.id === action.id ? { ...t, text: action.text, priority: action.priority } : t);
    case "CLEAR_DONE":
      return state.filter(t => !t.done);
    default:
      return state;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaskManager() {
  // 从 localStorage 读取已保存的任务，若没有则用种子数据
  const [tasks, dispatch] = useReducer(
    taskReducer,
    null,
    () => {
      try {
        const saved = localStorage.getItem("portfolio_tasks");
        return saved ? JSON.parse(saved) : SEED_TASKS;
      } catch { return SEED_TASKS; }
    }
  );

  const [filter, setFilter] = useState("All"); // "All" | "Active" | "Done"
  const [sortBy, setSortBy] = useState("date"); // "date" | "priority"

  // 每次 tasks 变化都存到 localStorage
  useEffect(() => {
    localStorage.setItem("portfolio_tasks", JSON.stringify(tasks));
  }, [tasks]);

  // 根据 filter & sortBy 计算显示列表
  const visibleTasks = tasks
    .filter(t => filter === "All" ? true : filter === "Done" ? t.done : !t.done)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order = { High: 0, Medium: 1, Low: 2 };
        return order[a.priority] - order[b.priority];
      }
      return b.createdAt - a.createdAt; // 最新在前
    });

  const doneCount   = tasks.filter(t => t.done).length;
  const totalCount  = tasks.length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── 标题 ── */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Task Manager</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>{doneCount} of {totalCount} tasks completed</p>
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>{progressPct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progressPct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent3))",
            borderRadius: 4, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* ── Add Task Form ── */}
      <TaskForm onAdd={(text, priority) => dispatch({ type: "ADD", text, priority })} />

      {/* ── Filter & Sort Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          {["All", "Active", "Done"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--muted)",
                border: "none", borderRadius: 7,
                padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500,
                transition: "all 0.18s",
              }}
            >
              {f} {f === "All" ? `(${totalCount})` : f === "Done" ? `(${doneCount})` : `(${totalCount - doneCount})`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Sort */}
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Sort:</span>
          {["date", "priority"].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                background: sortBy === s ? "var(--surface)" : "transparent",
                color: sortBy === s ? "var(--text)" : "var(--muted)",
                border: `1px solid ${sortBy === s ? "var(--border)" : "transparent"}`,
                borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 13,
                transition: "all 0.18s",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          {/* Clear done tasks */}
          {doneCount > 0 && (
            <button
              onClick={() => dispatch({ type: "CLEAR_DONE" })}
              style={{ background: "transparent", color: "var(--accent2)", border: "1px solid var(--accent2)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 13 }}
            >
              Clear done ({doneCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Task List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            {filter === "Done" ? "No completed tasks yet 🎯" : "All done! 🎉"}
          </div>
        ) : (
          visibleTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => dispatch({ type: "TOGGLE", id: task.id })}
              onDelete={() => dispatch({ type: "DELETE", id: task.id })}
              onEdit={(text, priority) => dispatch({ type: "EDIT", id: task.id, text, priority })}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── TaskForm Component ───────────────────────────────────────────────────────
/** 新增任务表单：controlled inputs + 基础验证 */
function TaskForm({ onAdd }) {
  const [text, setText]         = useState("");
  const [priority, setPriority] = useState("Medium");
  const [error, setError]       = useState("");

  const handleSubmit = () => {
    if (!text.trim()) { setError("Task text cannot be empty"); return; }
    onAdd(text.trim(), priority);
    setText("");
    setError("");
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
      <p style={{ fontWeight: 600, marginBottom: 14, fontFamily: "'Syne', sans-serif" }}>Add New Task</p>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={e => { setText(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="What needs to be done?"
          style={{
            flex: 1, background: "var(--surface)", border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`,
            borderRadius: 10, padding: "10px 16px", color: "var(--text)", fontSize: 14, outline: "none",
          }}
        />
        {/* Priority selector */}
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 14, cursor: "pointer",
          }}
        >
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button
          onClick={handleSubmit}
          style={{
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
            transition: "opacity 0.18s",
          }}
        >
          Add
        </button>
      </div>
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

// ─── TaskItem Component ───────────────────────────────────────────────────────
/** 单个任务行：支持 inline 编辑 */
function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText]   = useState(task.text);
  const [editPrio, setEditPrio]   = useState(task.priority);

  const saveEdit = () => {
    if (editText.trim()) { onEdit(editText.trim(), editPrio); }
    setIsEditing(false);
  };

  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12,
        opacity: task.done ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: task.done ? "var(--accent3)" : "transparent",
          border: `2px solid ${task.done ? "var(--accent3)" : "var(--border)"}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.18s",
        }}
      >
        {task.done && <span style={{ color: "#000", fontSize: 12, fontWeight: 800 }}>✓</span>}
      </button>

      {/* Task text — editable */}
      {isEditing ? (
        <div style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setIsEditing(false); }}
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--accent)",
              borderRadius: 8, padding: "6px 12px", color: "var(--text)", fontSize: 14, outline: "none",
            }}
          />
          <select
            value={editPrio}
            onChange={e => setEditPrio(e.target.value)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--text)", fontSize: 13 }}
          >
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={saveEdit} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: 14, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span>
          {/* Priority badge */}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
            background: PRIORITY_COLORS[task.priority] + "30",
            color: PRIORITY_COLORS[task.priority],
            flexShrink: 0,
          }}>
            {task.priority}
          </span>
          {/* Actions */}
          <button onClick={() => setIsEditing(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 15, padding: "4px 6px" }} title="Edit">✎</button>
          <button onClick={onDelete} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent2)", fontSize: 15, padding: "4px 6px" }} title="Delete">✕</button>
        </>
      )}
    </div>
  );
}
