/**
 * TaskManager.jsx — 升级版：按日期分组 + 时长记录 + 每日任务图表
 *
 * 新功能：
 * 1. 任务按创建日期分组，每组可以收起/展开（accordion）
 * 2. 完成任务时弹出时长输入（分钟），存入 Firestore
 * 3. BarChart 对比每天完成的任务数量 + 总花费时长
 * 4. 图表 tab 切换：Tasks count vs Time spent
 *
 * 面试亮点：
 * - useMemo 把任务按日期分组（O(n) 一次遍历）
 * - useState Set 管理哪些日期组是展开的
 * - Firestore updateDoc 写入 completedAt + duration
 * - Recharts BarChart + ComposedChart 双指标展示
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

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 把 Firestore Timestamp 或毫秒转成 "YYYY-MM-DD" */
function toDateKey(ts) {
  const ms = ts?.toMillis?.() ?? ts ?? Date.now();
  return new Date(ms).toLocaleDateString("en-CA"); // "2024-01-15"
}

/** 把 "YYYY-MM-DD" 转成更友好的显示文字 */
function formatDateLabel(dateKey) {
  const date  = new Date(dateKey + "T00:00:00");
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  if (dateKey === today)     return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

/** 分钟数转成 "Xh Ym" 显示 */
function fmtDuration(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}`.trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaskManager() {
  const { user } = useAuth();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("All");  // All / Active / Done
  const [view,    setView]    = useState("list");  // "list" | "chart"

  // 记录哪些日期组是"展开"的（默认今天展开，其他收起）
  const [expanded, setExpanded] = useState(() => new Set([new Date().toLocaleDateString("en-CA")]));

  // 完成弹窗：{ taskId, taskText }
  const [completeModal, setCompleteModal] = useState(null);

  // ── Firestore 实时监听 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "tasks", user.uid, "items"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // ── Firestore 操作 ────────────────────────────────────────────────────────
  const addTask = (text, priority) =>
    addDoc(collection(db, "tasks", user.uid, "items"), {
      text, priority, done: false,
      createdAt: serverTimestamp(),
    });

  /**
   * 完成任务：打开弹窗让用户输入时长
   * 如果已经 done → 直接取消完成（不需要时长）
   */
  const handleToggle = (task) => {
    if (task.done) {
      // 取消完成：清除 duration 和 completedAt
      updateDoc(doc(db, "tasks", user.uid, "items", task.id), {
        done: false, duration: null, completedAt: null,
      });
    } else {
      // 标记完成：弹出时长输入
      setCompleteModal({ taskId: task.id, taskText: task.text });
    }
  };

  /** 确认完成 + 保存时长 */
  const confirmComplete = async (taskId, durationMins) => {
    await updateDoc(doc(db, "tasks", user.uid, "items", taskId), {
      done: true,
      duration: durationMins || null,     // 分钟数，可以为空
      completedAt: serverTimestamp(),
    });
    setCompleteModal(null);
  };

  const deleteTask = (id) =>
    deleteDoc(doc(db, "tasks", user.uid, "items", id));

  const editTask = (id, text, priority) =>
    updateDoc(doc(db, "tasks", user.uid, "items", id), { text, priority });

  // ── 数据处理 ─────────────────────────────────────────────────────────────

  /**
   * useMemo：把任务按日期分组成 array of { dateKey, label, tasks[] }
   * 只在 tasks 或 filter 变化时重新计算
   */
  const groupedByDate = useMemo(() => {
    const filtered = tasks.filter(t =>
      filter === "All"    ? true :
      filter === "Done"   ? t.done :
                            !t.done
    );

    // 按日期分组：Map<dateKey, Task[]>
    const map = new Map();
    for (const task of filtered) {
      const key = toDateKey(task.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }

    // 转成 array，按日期倒序（最新在上）
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, tasks]) => ({ dateKey, label: formatDateLabel(dateKey), tasks }));
  }, [tasks, filter]);

  /**
   * useMemo：图表数据——每天完成数量 + 总时长
   * 只看有 completedAt 的任务（即真正完成过的）
   */
  const chartData = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!t.done) continue;
      const key = toDateKey(t.completedAt || t.createdAt);
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabel(key), count: 0, minutes: 0 });
      map.get(key).count++;
      map.get(key).minutes += t.duration || 0;
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // 最近 14 天
  }, [tasks]);

  const toggleExpand = (dateKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(dateKey) ? next.delete(dateKey) : next.add(dateKey);
      return next;
    });
  };

  const expandAll   = () => setExpanded(new Set(groupedByDate.map(g => g.dateKey)));
  const collapseAll = () => setExpanded(new Set());

  // ── 统计 ──────────────────────────────────────────────────────────────────
  const doneCount     = tasks.filter(t => t.done).length;
  const totalCount    = tasks.length;
  const totalMins     = tasks.reduce((s, t) => s + (t.duration || 0), 0);
  const progressPct   = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <Spinner />
    </div>
  );

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── 标题 + View 切换 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Task Manager</h2>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {doneCount}/{totalCount} done
            {totalMins > 0 && <span style={{ marginLeft: 10 }}>· {fmtDuration(totalMins)} logged</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          {[["list", "📋 List"], ["chart", "📊 Chart"]].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)}
              style={{ background: view === id ? "var(--accent)" : "transparent", color: view === id ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI 卡片 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }} className="mobile-stack">
        {[
          { label: "Total Tasks",    value: totalCount,                        color: "var(--text)"    },
          { label: "Completed",      value: doneCount,                         color: "var(--accent3)" },
          { label: "In Progress",    value: totalCount - doneCount,            color: "var(--accent)"  },
          { label: "Time Logged",    value: fmtDuration(totalMins) || "—",     color: "var(--accent2)" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>{progressPct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", borderRadius: 4, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* ── CHART VIEW ── */}
      {view === "chart" && (
        <DailyChart data={chartData} />
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          <TaskForm onAdd={addTask} />

          {/* Filter + expand controls */}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
              {["All", "Active", "Done"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s" }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={expandAll}   style={ghostBtn}>Expand all</button>
              <button onClick={collapseAll} style={ghostBtn}>Collapse all</button>
            </div>
          </div>

          {/* Date Groups */}
          {groupedByDate.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
              <p>{tasks.length === 0 ? "No tasks yet. Add one above!" : "Nothing matches this filter."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groupedByDate.map(group => (
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

      {/* ── Complete Modal（时长输入） ── */}
      {completeModal && (
        <CompleteModal
          taskText={completeModal.taskText}
          onConfirm={(mins) => confirmComplete(completeModal.taskId, mins)}
          onCancel={() => setCompleteModal(null)}
        />
      )}
    </div>
  );
}

// ─── DateGroup Component ───────────────────────────────────────────────────────
/**
 * 每个日期组：标题行（点击收起/展开）+ 任务列表
 */
function DateGroup({ group, isExpanded, onToggleExpand, onToggleTask, onDelete, onEdit }) {
  const doneInGroup  = group.tasks.filter(t => t.done).length;
  const totalInGroup = group.tasks.length;
  const groupMins    = group.tasks.reduce((s, t) => s + (t.duration || 0), 0);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>

      {/* ── Group Header（点击收起/展开） ── */}
      <button
        onClick={onToggleExpand}
        style={{
          width: "100%", background: "transparent", border: "none", cursor: "pointer",
          padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
          color: "var(--text)", textAlign: "left",
        }}
      >
        {/* 展开箭头 */}
        <span style={{ fontSize: 12, color: "var(--muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
          ▶
        </span>

        {/* 日期标题 */}
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, flex: 1 }}>
          {group.label}
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
            {new Date(group.dateKey + "T00:00:00").toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </span>

        {/* 统计 pills */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Pill color="var(--accent3)">{doneInGroup}/{totalInGroup} done</Pill>
          {groupMins > 0 && <Pill color="var(--accent2)">⏱ {fmtDuration(groupMins)}</Pill>}
        </div>
      </button>

      {/* ── Task List（收起时高度为 0，平滑动画） ── */}
      <div style={{
        maxHeight: isExpanded ? "9999px" : 0,
        overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {group.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task)}
              onDelete={() => onDelete(task.id)}
              onEdit={(text, priority) => onEdit(task.id, text, priority)}
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
  const [editText, setEditText]   = useState(task.text);
  const [editPrio, setEditPrio]   = useState(task.priority);

  const saveEdit = async () => {
    if (editText.trim()) await onEdit(editText.trim(), editPrio);
    setIsEditing(false);
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "11px 14px",
      display: "flex", alignItems: "center", gap: 10,
      opacity: task.done ? 0.65 : 1, transition: "opacity 0.2s",
    }}>

      {/* Checkbox */}
      <button onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: task.done ? "var(--accent3)" : "transparent",
          border: `2px solid ${task.done ? "var(--accent3)" : "var(--border)"}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.18s",
        }}>
        {task.done && <span style={{ color: "#000", fontSize: 11, fontWeight: 800 }}>✓</span>}
      </button>

      {isEditing ? (
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input autoFocus value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setIsEditing(false); }}
            style={{ flex: 1, background: "var(--card)", border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 10px", color: "var(--text)", fontSize: 13, outline: "none" }} />
          <select value={editPrio} onChange={e => setEditPrio(e.target.value)}
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 8px", color: "var(--text)", fontSize: 12 }}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={saveEdit} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, textDecoration: task.done ? "line-through" : "none", marginBottom: task.duration ? 2 : 0 }}>
              {task.text}
            </p>
            {/* 时长显示（完成后） */}
            {task.done && task.duration && (
              <p style={{ fontSize: 11, color: "var(--muted)" }}>⏱ {fmtDuration(task.duration)}</p>
            )}
          </div>

          {/* Priority badge */}
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: PRIORITY_COLORS[task.priority] + "28", color: PRIORITY_COLORS[task.priority], flexShrink: 0 }}>
            {task.priority}
          </span>

          {!task.done && (
            <button onClick={() => setIsEditing(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, padding: "3px 5px" }}>✎</button>
          )}
          <button onClick={onDelete} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent2)", fontSize: 14, padding: "3px 5px" }}>✕</button>
        </>
      )}
    </div>
  );
}

// ─── CompleteModal ────────────────────────────────────────────────────────────
/**
 * 完成任务时的弹窗：让用户输入花了多少分钟
 * 可以跳过（直接完成，不记录时长）
 */
function CompleteModal({ taskText, onConfirm, onCancel }) {
  const [mins, setMins] = useState("");

  const handleConfirm = () => onConfirm(mins ? parseInt(mins, 10) : null);

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 32px", width: "100%", maxWidth: 380 }}>

        <p style={{ fontSize: 22, textAlign: "center", marginBottom: 12 }}>✅</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 6, textAlign: "center" }}>
          Task Complete!
        </p>
        <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
          "{taskText}"
        </p>

        {/* 时长输入 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 8, fontWeight: 500 }}>
            How long did it take? <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              autoFocus
              type="number"
              min="1"
              value={mins}
              onChange={e => setMins(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              placeholder="e.g. 45"
              style={{
                flex: 1, background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none",
              }}
            />
            <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 500 }}>minutes</span>
          </div>
          {/* 快速选择常用时长 */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[15, 30, 45, 60, 90, 120].map(n => (
              <button key={n} onClick={() => setMins(String(n))}
                style={{
                  background: mins === String(n) ? "var(--accent)" : "var(--card)",
                  color: mins === String(n) ? "#fff" : "var(--muted)",
                  border: `1px solid ${mins === String(n) ? "transparent" : "var(--border)"}`,
                  borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                  transition: "all 0.15s",
                }}>
                {n < 60 ? `${n}m` : `${n/60}h`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: "10px", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(null)}
            style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px", cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
            Skip
          </button>
          <button onClick={handleConfirm}
            style={{ flex: 1, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            Save ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DailyChart ───────────────────────────────────────────────────────────────
/**
 * 每日任务图表：两个 tab——完成数量 vs 花费时长
 */
function DailyChart({ data }) {
  const [metric, setMetric] = useState("count"); // "count" | "minutes"

  if (data.length === 0) {
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
        <p>Complete some tasks to see your daily chart!</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18 }}>Daily Progress</p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Last {data.length} days with activity</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
          <button onClick={() => setMetric("count")}
            style={{ background: metric === "count" ? "var(--accent)" : "transparent", color: metric === "count" ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s" }}>
            Tasks Done
          </button>
          <button onClick={() => setMetric("minutes")}
            style={{ background: metric === "minutes" ? "var(--accent)" : "transparent", color: metric === "minutes" ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s" }}>
            Time Spent
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barSize={data.length > 7 ? 20 : 32}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => metric === "minutes" ? `${v}m` : v}
          />
          <Tooltip content={<ChartTooltip metric={metric} />} />
          <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              // 今天用 accent 颜色，其他用 accent3
              <Cell
                key={i}
                fill={entry.label === "Today" ? "var(--accent)" : "var(--accent3)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
        {[
          { label: "Total completed", value: data.reduce((s, d) => s + d.count, 0) + " tasks" },
          { label: "Time logged",     value: fmtDuration(data.reduce((s, d) => s + d.minutes, 0)) || "—" },
          { label: "Best day",        value: data.reduce((best, d) => d.count > (best?.count ?? 0) ? d : best, null)?.label || "—" },
          { label: "Avg per day",     value: (data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1) + " tasks" },
        ].map((s, i) => (
          <div key={i} style={{ flex: "1 1 120px" }}>
            <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 2 }}>{s.label}</p>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TaskForm ─────────────────────────────────────────────────────────────────
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
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 22px" }}>
      <p style={{ fontWeight: 700, marginBottom: 12, fontFamily: "'Syne', sans-serif", fontSize: 15 }}>Add New Task</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text}
          onChange={e => { setText(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="What needs to be done today?"
          disabled={adding}
          style={{ flex: 1, background: "var(--surface)", border: `1px solid ${error ? "var(--accent2)" : "var(--border)"}`, borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none" }}
        />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 10px", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={handleSubmit} disabled={adding}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: adding ? "default" : "pointer", fontWeight: 600, fontSize: 14, opacity: adding ? 0.7 : 1 }}>
          {adding ? "…" : "Add"}
        </button>
      </div>
      {error && <p style={{ color: "var(--accent2)", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Pill({ color, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: color + "22", color, flexShrink: 0 }}>
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--accent3)" }}>
        {metric === "minutes" ? `⏱ ${fmtDuration(val)}` : `✅ ${val} task${val !== 1 ? "s" : ""} done`}
      </p>
    </div>
  );
}

const ghostBtn = {
  background: "transparent", border: "1px solid var(--border)",
  borderRadius: 7, padding: "5px 12px", cursor: "pointer",
  color: "var(--muted)", fontSize: 12,
};

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </>
  );
}
