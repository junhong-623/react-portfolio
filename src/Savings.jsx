/**
 * Savings.jsx — 个人储蓄 & 支出追踪模块
 *
 * 面试亮点：
 * 1. Firestore CRUD（实时 onSnapshot）
 * 2. Recharts：AreaChart 资产走势 + BarChart 月度收支 + PieChart 分类
 * 3. 多维度数据计算（总资产、月存款、支出分布）
 * 4. useMemo 缓存图表数据
 * 5. 日期分组（按月汇总）
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// 消费分类
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];
const CAT_COLORS  = ["#8b7cf8","#f87c8b","#7cf8c0","#f8c87c","#7cc4f8","#f8a87c","#c87cf8"];

export default function Savings() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [filter, setFilter]             = useState("all"); // "all" | "income" | "expense"

  // 实时监听 savings/{uid}/transactions
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "savings", user.uid, "transactions"),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addTxn = async (txn) => {
    await addDoc(collection(db, "savings", user.uid, "transactions"), {
      ...txn,
      date: serverTimestamp(),
      timestamp: Date.now(), // 用于前端排序（serverTimestamp 写入前是 null）
    });
  };

  const deleteTxn = (id) => deleteDoc(doc(db, "savings", user.uid, "transactions", id));

  /**
   * useMemo：计算汇总数据
   * 包含：总收入、总支出、净资产、按月分组数据、分类分布
   */
  const stats = useMemo(() => {
    const income  = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // 按月汇总（用于 BarChart）
    const monthMap = {};
    transactions.forEach(t => {
      const dateMs = t.date?.toMillis?.() ?? t.timestamp ?? Date.now();
      const key = new Date(dateMs).toLocaleDateString("en", { month: "short", year: "2-digit" });
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "income")  monthMap[key].income  += t.amount;
      if (t.type === "expense") monthMap[key].expense += t.amount;
    });
    const monthData = Object.values(monthMap).slice(-6).reverse(); // 最近 6 个月

    // 资产走势（累计 balance）
    const sorted  = [...transactions].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    let running = 0;
    const balanceData = sorted.map(t => {
      running += t.type === "income" ? t.amount : -t.amount;
      const dateMs = t.date?.toMillis?.() ?? t.timestamp ?? Date.now();
      return {
        date: new Date(dateMs).toLocaleDateString("en", { month: "short", day: "numeric" }),
        balance: running,
      };
    });

    // 支出分类分布
    const catMap = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
    });
    const catData = Object.entries(catMap).map(([name, value], i) => ({
      name, value, color: CAT_COLORS[CATEGORIES.indexOf(name) % CAT_COLORS.length],
    }));

    return { income, expense, balance, monthData, balanceData, catData };
  }, [transactions]);

  const visible = transactions.filter(t => filter === "all" ? true : t.type === filter);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner /></div>;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Personal Savings</h2>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>Track your income & expenses</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: showForm ? "var(--card)" : "var(--accent)", color: showForm ? "var(--muted)" : "#fff", border: showForm ? "1px solid var(--border)" : "none", borderRadius: 10, padding: "10px 22px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {showForm ? "✕ Close" : "+ Add Transaction"}
        </button>
      </div>

      {/* Add Form — 不自动关闭，方便连续输入 */}
      {showForm && <TransactionForm onAdd={addTxn} />}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { label: "Net Balance", value: stats.balance, color: stats.balance >= 0 ? "var(--accent3)" : "var(--accent2)", prefix: "$" },
          { label: "Total Income",  value: stats.income,  color: "var(--accent3)", prefix: "$" },
          { label: "Total Expense", value: stats.expense, color: "var(--accent2)", prefix: "$" },
          { label: "Transactions",  value: transactions.length, color: "var(--accent)", prefix: "" },
        ].map((k, i) => (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 22px" }}>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 24, color: k.color }}>
              {k.prefix}{typeof k.value === "number" ? k.value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {transactions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="mobile-stack">

          {/* Balance Trend */}
          <ChartCard title="Balance Trend" subtitle="Cumulative net balance">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.balanceData}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b7cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b7cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<SavingsTooltip />} />
                <Area type="monotone" dataKey="balance" stroke="#8b7cf8" strokeWidth={2.5} fill="url(#balGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Monthly Income vs Expense */}
          <ChartCard title="Monthly Overview" subtitle="Income vs expenses by month">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.monthData} barSize={12}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<SavingsTooltip />} />
                <Bar dataKey="income"  fill="#7cf8c0" radius={[4,4,0,0]} />
                <Bar dataKey="expense" fill="#f87c8b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Expense by Category */}
          {stats.catData.length > 0 && (
            <ChartCard title="Spending by Category" subtitle="Expense breakdown">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={stats.catData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" strokeWidth={0}>
                      {stats.catData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {stats.catData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>${d.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18 }}>Transactions</p>
          <div style={{ display: "flex", gap: 4, background: "var(--card)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
            {["all", "income", "expense"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "#fff" : "var(--muted)", border: "none", borderRadius: 7, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.18s", textTransform: "capitalize" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p>
            <p>No transactions yet. Add one to get started!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map(txn => (
              <TxnRow key={txn.id} txn={txn} onDelete={() => deleteTxn(txn.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Form ─────────────────────────────────────────────────────────
function TransactionForm({ onAdd }) {
  const [form, setForm]     = useState({ type: "expense", amount: "", category: "Food", note: "" });
  const [error, setError]   = useState("");
  const [adding, setAdding] = useState(false);
  const [flash, setFlash]   = useState(""); // 短暂成功提示（"Saved!"）

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Please enter a valid amount"); return; }
    setAdding(true); setError("");
    try {
      await onAdd({ ...form, amount: amt, category: form.type === "income" ? "Income" : form.category });
      // 重置金额和备注，保留 type 和 category，方便连续输入同类交易
      setForm(f => ({ ...f, amount: "", note: "" }));
      setFlash("✓ Saved!");
      setTimeout(() => setFlash(""), 1800); // 1.8 秒后消失
    } finally {
      setAdding(false);
    }
  };

  const inputStyle = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none" };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 26px" }}>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 18 }}>New Transaction</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }} className="mobile-stack txn-form-grid">

        {/* Type */}
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Type</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["income", "expense"].map(t => (
              <button key={t} type="button" onClick={() => set("type", t)}
                style={{ flex: 1, background: form.type === t ? (t === "income" ? "var(--accent3)" : "var(--accent2)") : "var(--surface)", color: form.type === t ? "#000" : "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 4px", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize", transition: "all 0.18s" }}>
                {t === "income" ? "↑ Income" : "↓ Expense"}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Amount ($)</label>
          <input type="number" min="0" step="0.01" value={form.amount} onChange={e => { set("amount", e.target.value); setError(""); }} placeholder="0.00" style={inputStyle} />
        </div>

        {/* Category (only for expense) */}
        {form.type === "expense" && (
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Note */}
        <div>
          <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>Note (optional)</label>
          <input value={form.note} onChange={e => set("note", e.target.value)} placeholder="e.g. Groceries at AEON" style={inputStyle} />
        </div>
      </div>

      {error && <p style={{ color: "var(--accent2)", fontSize: 13, marginTop: 10 }}>⚠ {error}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button onClick={handleSubmit} disabled={adding}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 28px", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: adding ? 0.7 : 1 }}>
          {adding ? "Saving…" : "Save Transaction"}
        </button>
        {/* 成功 flash：短暂显示后消失，不关闭表单 */}
        {flash && (
          <span style={{ color: "var(--accent3)", fontWeight: 700, fontSize: 14, animation: "fadeIn 0.2s ease" }}>
            {flash}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxnRow({ txn, onDelete }) {
  const dateMs  = txn.date?.toMillis?.() ?? txn.timestamp ?? Date.now();
  const dateStr = new Date(dateMs).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      {/* Icon */}
      <div style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, background: txn.type === "income" ? "rgba(124,248,192,0.15)" : "rgba(248,124,139,0.15)" }}>
        {txn.type === "income" ? "↑" : "↓"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{txn.note || txn.category}</p>
        <p style={{ color: "var(--muted)", fontSize: 12 }}>{txn.category} · {dateStr}</p>
      </div>

      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: txn.type === "income" ? "var(--accent3)" : "var(--accent2)", flexShrink: 0 }}>
        {txn.type === "income" ? "+" : "-"}${txn.amount.toFixed(2)}
      </p>

      <button onClick={onDelete} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, padding: "4px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{title}</p>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function SavingsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>${Number(p.value).toFixed(2)}</strong>
        </p>
      ))}
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
