/**
 * Dashboard.jsx — 数据可视化模块
 *
 * 面试亮点：
 * 1. Recharts 图表（AreaChart, BarChart, PieChart）
 * 2. useState 管理筛选 & 排序逻辑
 * 3. useMemo 缓存过滤后的数据，避免重复计算（性能优化）
 * 4. 自定义 Tooltip 组件
 * 5. 响应式布局
 */

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useTheme } from "./App";

// ─── Mock 数据 ────────────────────────────────────────────────────────────────
const MONTHLY_DATA = [
  { month: "Jan", revenue: 42000, expenses: 28000, profit: 14000, users: 1200 },
  { month: "Feb", revenue: 51000, expenses: 31000, profit: 20000, users: 1450 },
  { month: "Mar", revenue: 47000, expenses: 29000, profit: 18000, users: 1380 },
  { month: "Apr", revenue: 63000, expenses: 35000, profit: 28000, users: 1900 },
  { month: "May", revenue: 58000, expenses: 33000, profit: 25000, users: 1750 },
  { month: "Jun", revenue: 72000, expenses: 38000, profit: 34000, users: 2100 },
  { month: "Jul", revenue: 69000, expenses: 36000, profit: 33000, users: 2050 },
  { month: "Aug", revenue: 81000, expenses: 41000, profit: 40000, users: 2400 },
];

const CATEGORY_DATA = [
  { name: "Engineering", value: 38, color: "#8b7cf8" },
  { name: "Design",      value: 22, color: "#f87c8b" },
  { name: "Marketing",   value: 18, color: "#7cf8c0" },
  { name: "Operations",  value: 22, color: "#f8c87c" },
];

// KPI 卡片数据
const KPI = [
  { label: "Total Revenue",   value: "$584k",  change: "+18.2%", up: true },
  { label: "Net Profit",      value: "$212k",  change: "+24.6%", up: true },
  { label: "Active Users",    value: "14,230", change: "+9.1%",  up: true },
  { label: "Churn Rate",      value: "2.4%",   change: "-0.8%",  up: false },
];

export default function Dashboard() {
  // 控制显示哪些月份（前 N 个月）
  const [monthRange, setMonthRange] = useState(8);
  // 控制 BarChart 排序方式
  const [sortBy, setSortBy] = useState("month"); // "month" | "revenue" | "profit"
  // 控制显示哪个指标在 AreaChart
  const [metric, setMetric] = useState("revenue");

  const { isDark } = useTheme();
  const gridColor = isDark ? "#2a2a42" : "#e0ddf5";
  const textColor  = isDark ? "#6868a0" : "#8080b8";

  /**
   * useMemo：只有当 monthRange 或 sortBy 变化时才重新计算
   * 避免每次 render 都重新 sort/slice（性能优化）
   */
  const filteredData = useMemo(() => {
    const sliced = MONTHLY_DATA.slice(0, monthRange);
    if (sortBy === "month") return sliced;
    return [...sliced].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [monthRange, sortBy]);

  const areaData = useMemo(() => MONTHLY_DATA.slice(0, monthRange), [monthRange]);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── 页面标题 ── */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Analytics Dashboard</h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>Financial overview & team breakdown</p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {KPI.map((k, i) => (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 26, marginBottom: 4 }}>{k.value}</p>
            <span style={{ fontSize: 13, fontWeight: 600, color: k.up ? "var(--accent3)" : "var(--accent2)" }}>
              {k.up ? "▲" : "▼"} {k.change}
            </span>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        {/* 月份范围筛选 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Months:</span>
          {[4, 6, 8].map(n => (
            <FilterBtn key={n} active={monthRange === n} onClick={() => setMonthRange(n)}>{n}M</FilterBtn>
          ))}
        </div>

        {/* 排序按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Sort:</span>
          {["month", "revenue", "profit"].map(s => (
            <FilterBtn key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterBtn>
          ))}
        </div>

        {/* 指标选择 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Metric:</span>
          {["revenue", "expenses", "profit", "users"].map(m => (
            <FilterBtn key={m} active={metric === m} onClick={() => setMetric(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </FilterBtn>
          ))}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Area Chart — 单指标趋势 */}
        <ChartCard title="Trend Over Time" subtitle={`Showing: ${metric}`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b7cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b7cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey={metric} stroke="#8b7cf8" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar Chart — 多指标对比 + 排序 */}
        <ChartCard title="Revenue vs Expenses" subtitle="Sortable by revenue or profit">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredData} barSize={14}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue"  fill="#8b7cf8" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" fill="#f87c8b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Pie Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title="Team Distribution" subtitle="Headcount by department">
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                  {CATEGORY_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            {/* 图例 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CATEGORY_DATA.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{d.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, marginLeft: "auto" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Summary stats */}
        <ChartCard title="Quick Stats" subtitle="Last 8 months">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
            {[
              { label: "Avg Monthly Revenue", value: `$${(MONTHLY_DATA.reduce((a,d) => a + d.revenue, 0) / MONTHLY_DATA.length / 1000).toFixed(0)}k` },
              { label: "Best Month",           value: "August — $81k" },
              { label: "Total Profit",          value: `$${(MONTHLY_DATA.reduce((a,d) => a + d.profit, 0) / 1000).toFixed(0)}k` },
              { label: "User Growth",           value: "+100% since Jan" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>{s.label}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

/** FilterBtn — 可切换激活状态的小按钮 */
function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--accent)" : "var(--card)",
        color: active ? "#fff" : "var(--muted)",
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
        borderRadius: 8, padding: "5px 12px", cursor: "pointer",
        fontSize: 13, fontWeight: active ? 600 : 400,
        transition: "all 0.18s",
      }}
    >
      {children}
    </button>
  );
}

/** ChartCard — 图表外框 */
function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{title}</p>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>{subtitle}</p>
      {children}
    </div>
  );
}

/** CustomTooltip — 自定义 Recharts tooltip 样式 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" && p.value > 1000
            ? `$${(p.value/1000).toFixed(0)}k`
            : p.value}
          </strong>
        </p>
      ))}
    </div>
  );
}
