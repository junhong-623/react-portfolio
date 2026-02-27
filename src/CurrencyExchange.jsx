/**
 * CurrencyExchange.jsx
 *
 * Section 1 — Converter (Frankfurter / ECB, updates daily)
 *   • 9 currencies with flag emoji
 *   • Bidirectional input, unit-aware (CNY×100, JPY/THB/KRW×1000)
 *   • Swap flips the pair but klCurrency always stays = the non-MYR side
 *
 * Section 2 — All-rates grid (MYR always as base, regardless of converter direction)
 *
 * Section 3 — KL Money Changer table (only when MYR is one side)
 *   • Fetched via Vercel proxy → klmoneychanger.com
 *   • klCurrency never changes on swap — table stays stable
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "./i18n";

// ─── Currency metadata ────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "MYR", flag: "🇲🇾", nameKey: "cur.MYR" },
  { code: "USD", flag: "🇺🇸", nameKey: "cur.USD" },
  { code: "JPY", flag: "🇯🇵", nameKey: "cur.JPY" },
  { code: "CNY", flag: "🇨🇳", nameKey: "cur.CNY" },
  { code: "SGD", flag: "🇸🇬", nameKey: "cur.SGD" },
  { code: "THB", flag: "🇹🇭", nameKey: "cur.THB" },
  { code: "KRW", flag: "🇰🇷", nameKey: "cur.KRW" },
  { code: "HKD", flag: "🇭🇰", nameKey: "cur.HKD" },
  { code: "AUD", flag: "🇦🇺", nameKey: "cur.AUD" },
];

// Display unit — how many units of this currency = "1 block"
// Affects both the quick-amount chips and the rate display line
const UNIT = { JPY: 1000, CNY: 100, THB: 1000, KRW: 1000 };
const unitOf = (code) => UNIT[code] ?? 1;

// KL money changer only covers these MYR pairs
const KL_SUPPORTED = new Set(["USD", "JPY", "CNY", "SGD", "THB", "KRW", "HKD", "AUD"]);

const PROXY_BASE = "https://vercel-proxy-chi-coral.vercel.app/api/rates";
const FX_BASE    = "https://api.frankfurter.app";

const currencyMap = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format to at most `d` decimals, strip trailing zeros */
const fmt = (n, d = 4) => n == null ? "" : parseFloat(n.toFixed(d)).toString();

/** Quick-amount presets per currency */
const quickAmounts = (code) => {
  const u = unitOf(code);
  if (u === 1000) return [1000, 5000, 10000, 50000];
  if (u === 100)  return [100, 500, 1000, 5000];
  return [1, 10, 100, 1000];
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CurrencyExchange() {
  const { t } = useI18n();

  // Converter pair
  const [from,      setFrom]      = useState("MYR");
  const [to,        setTo]        = useState("JPY");
  const [fromVal,   setFromVal]   = useState(() => String(unitOf("MYR")));
  const [toVal,     setToVal]     = useState("");
  const [rate,      setRate]      = useState(null);   // raw from→to rate (per 1 unit)
  const [rateDate,  setRateDate]  = useState("");
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError,   setFxError]   = useState("");

  // KL money changer — always tracks the non-MYR currency, independent of swap
  const [klCurrency, setKlCurrency] = useState("JPY");
  const [klData,     setKlData]     = useState([]);
  const [klLoading,  setKlLoading]  = useState(false);
  const [klError,    setKlError]    = useState("");

  const lastEdited = useRef("from");

  // ── Derive the "foreign" (non-MYR) currency from current pair ──────────────
  // This stays JPY even if user swaps to JPY→MYR
  const foreignCurrency = from === "MYR" ? to : to === "MYR" ? from : null;
  const showKL = foreignCurrency && KL_SUPPORTED.has(foreignCurrency);

  // ── Fetch live rate ─────────────────────────────────────────────────────────
  const fetchRate = useCallback(async (f, t2) => {
    if (f === t2) { setRate(1); setRateDate(""); return; }
    setFxLoading(true); setFxError("");
    try {
      const res  = await fetch(`${FX_BASE}/latest?from=${f}&to=${t2}`);
      const data = await res.json();
      if (data.rates?.[t2] != null) {
        setRate(data.rates[t2]);
        setRateDate(data.date || "");
      } else setFxError(t("cx.rateUnavailable"));
    } catch { setFxError(t("cx.fetchFailed")); }
    finally  { setFxLoading(false); }
  }, [t]);

  // ── Fetch KL money changer ──────────────────────────────────────────────────
  const fetchKL = useCallback(async (cur) => {
    if (!KL_SUPPORTED.has(cur)) return;
    setKlLoading(true); setKlError(""); setKlCurrency(cur);
    try {
      const res  = await fetch(`${PROXY_BASE}?n=${cur}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setKlData(data.data || []);
    } catch (e) {
      setKlError(e.message || t("cx.fetchFailed"));
      setKlData([]);
    } finally { setKlLoading(false); }
  }, [t]);

  // ── When pair changes → reload FX; when foreign side changes → reload KL ───
  useEffect(() => { fetchRate(from, to); }, [from, to, fetchRate]);

  useEffect(() => {
    if (foreignCurrency) fetchKL(foreignCurrency);
    else { setKlData([]); setKlCurrency(""); }
  }, [foreignCurrency, fetchKL]);

  // ── Recalculate the passive side when rate arrives ──────────────────────────
  useEffect(() => {
    if (rate == null) return;
    if (lastEdited.current === "from") {
      const n = parseFloat(fromVal);
      setToVal(isNaN(n) ? "" : fmt(n * rate));
    } else {
      const n = parseFloat(toVal);
      setFromVal(isNaN(n) ? "" : fmt(n / rate));
    }
  }, [rate]); // eslint-disable-line

  // ── Input handlers ──────────────────────────────────────────────────────────
  const handleFromChange = (v) => {
    lastEdited.current = "from";
    setFromVal(v);
    if (rate != null) {
      const n = parseFloat(v);
      setToVal(isNaN(n) ? "" : fmt(n * rate));
    }
  };

  const handleToChange = (v) => {
    lastEdited.current = "to";
    setToVal(v);
    if (rate != null) {
      const n = parseFloat(v);
      setFromVal(isNaN(n) ? "" : fmt(n / rate));
    }
  };

  // Swap: flip pair + amounts, but klCurrency is derived from foreignCurrency so it updates automatically
  const handleSwap = () => {
    setFrom(to); setTo(from);
    setFromVal(toVal); setToVal(fromVal);
    lastEdited.current = "from";
  };

  // ── Unit-aware rate display ─────────────────────────────────────────────────
  // e.g. for JPY (unit=1000): show "1000 JPY = X MYR" instead of "1 JPY = 0.028 MYR"
  const unitFrom = unitOf(from);
  const unitTo   = unitOf(to);
  // Display: unitFrom [from] = (rate * unitFrom / unitTo) * unitTo [to]
  // Simplify: just show unitFrom → rate*unitFrom converted
  const displayRate = rate != null ? fmt(rate * unitFrom, 4) : null;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>
          {t("cx.title")}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>{t("cx.subtitle")}</p>
      </div>

      {/* ── Converter card ── */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "28px 24px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "var(--accent)", opacity: 0.05, pointerEvents: "none" }} />

        {/* Rate line */}
        <div style={{ marginBottom: 24, minHeight: 26 }}>
          {fxLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Spinner size={13} />
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{t("cx.fetching")}</span>
            </div>
          )}
          {!fxLoading && displayRate && !fxError && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {unitFrom > 1 ? unitFrom : 1} {currencyMap[from]?.flag} {from} =
              </span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: "var(--accent)" }}>
                {displayRate} {currencyMap[to]?.flag} {to}
              </span>
              {rateDate && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>· ECB {rateDate}</span>
              )}
            </div>
          )}
          {fxError && <span style={{ fontSize: 13, color: "var(--accent2)" }}>⚠ {fxError}</span>}
        </div>

        {/* Two-side converter */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }} className="mobile-stack">
          <ConverterSide
            value={fromVal}
            onChange={handleFromChange}
            currency={from}
            onCurrencyChange={(c) => { setFrom(c); lastEdited.current = "from"; }}
            exclude={to}
            t={t}
          />

          {/* Swap button */}
          <button
            onClick={handleSwap}
            title={t("cx.swap")}
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
              background: "var(--surface)", border: "1px solid var(--border)",
              cursor: "pointer", fontSize: 18, color: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", marginBottom: 2,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--accent)"; }}
          >
            ⇄
          </button>

          <ConverterSide
            value={toVal}
            onChange={handleToChange}
            currency={to}
            onCurrencyChange={(c) => { setTo(c); lastEdited.current = "from"; }}
            exclude={from}
            t={t}
          />
        </div>

        {/* Quick-amount chips for the FROM side */}
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("cx.quick")}:</span>
          {quickAmounts(from).map(n => (
            <button
              key={n}
              onClick={() => handleFromChange(String(n))}
              style={{
                background: fromVal === String(n) ? "var(--accent)" : "var(--surface)",
                color:      fromVal === String(n) ? "#fff"          : "var(--muted)",
                border: `1px solid ${fromVal === String(n) ? "transparent" : "var(--border)"}`,
                borderRadius: 20, padding: "4px 14px",
                cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.18s",
              }}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* ── All-rates grid — always MYR as base ── */}
      <AllRatesGrid myrBase to={to} setTo={setTo} t={t} />

      {/* ── KL Money Changer section ── */}
      {showKL && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                {t("cx.klTitle")}
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                🇲🇾 {t("cx.klNote")}
              </p>
            </div>
            <button
              onClick={() => fetchKL(klCurrency)}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                fontSize: 13, color: "var(--muted)",
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                transition: "border-color 0.18s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {klLoading ? <Spinner size={12} /> : "↻"} {t("cx.refresh")}
            </button>
          </div>

          {klError && (
            <div style={{ background: "rgba(248,124,139,0.1)", border: "1px solid var(--accent2)", borderRadius: 12, padding: "12px 16px", color: "var(--accent2)", fontSize: 13, marginBottom: 14 }}>
              ⚠ {klError}
            </div>
          )}

          {klLoading && !klData.length
            ? <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
            : klData.length > 0
              ? <MoneyChangerTable data={klData} currency={klCurrency} myrIsSelling={from === "MYR"} t={t} />
              : !klLoading && !klError
                ? <p style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 14 }}>{t("cx.noStoreRates")} {klCurrency}</p>
                : null
          }
        </div>
      )}
    </div>
  );
}

// ─── ConverterSide ────────────────────────────────────────────────────────────

function ConverterSide({ value, onChange, currency, onCurrencyChange, exclude, t }) {
  const info = currencyMap[currency];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>

      {/* Selector */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 20, lineHeight: 1, pointerEvents: "none" }}>
          {info?.flag}
        </span>
        <select
          value={currency}
          onChange={e => onCurrencyChange(e.target.value)}
          style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "10px 36px 10px 44px",
            color: "var(--text)", fontSize: 14, fontWeight: 600,
            cursor: "pointer", outline: "none", appearance: "none", transition: "border-color 0.18s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        >
          {CURRENCIES.filter(c => c.code !== exclude).map(c => (
            <option key={c.code} value={c.code}>
              {c.flag}  {c.code}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 11, pointerEvents: "none" }}>▾</span>
      </div>

      {/* Amount */}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "14px 16px",
          color: "var(--text)", fontSize: 24, fontWeight: 700,
          fontFamily: "'Syne', sans-serif", outline: "none", transition: "border-color 0.18s",
        }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
      />

      <span style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 2 }}>
        {info?.flag} {t(info?.nameKey)}
      </span>
    </div>
  );
}

// ─── AllRatesGrid ─────────────────────────────────────────────────────────────
/**
 * Always shows MYR as the base currency regardless of converter direction.
 * This way the grid is stable and not affected by swap.
 */
function AllRatesGrid({ to, setTo, t }) {
  const [rates,   setRates]   = useState({});
  const [loading, setLoading] = useState(false);

  // Always fetch from MYR
  useEffect(() => {
    setLoading(true);
    const others = CURRENCIES.filter(c => c.code !== "MYR").map(c => c.code).join(",");
    fetch(`${FX_BASE}/latest?from=MYR&to=${others}`)
      .then(r => r.json())
      .then(d => { setRates(d.rates || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const targets = CURRENCIES.filter(c => c.code !== "MYR");

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        🇲🇾 {t("cx.gridLabel")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {targets.map(c => {
          const rawRate = rates[c.code];
          const unit    = unitOf(c.code);
          // Scale the rate to the display unit (e.g. show per 1000 JPY, not per 1 JPY)
          const displayR = rawRate != null ? fmt(rawRate * unit, 4) : null;
          const isActive = c.code === to;

          return (
            <button
              key={c.code}
              onClick={() => setTo(c.code)}
              style={{
                background: isActive ? "var(--accent)" : "var(--card)",
                border: `1px solid ${isActive ? "transparent" : "var(--border)"}`,
                borderRadius: 14, padding: "14px 16px",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.18s",
                color: isActive ? "#fff" : "var(--text)",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 6, lineHeight: 1 }}>{c.flag}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: isActive ? 1 : 0.8 }}>{c.code}</span>
                {unit > 1 && (
                  <span style={{ fontSize: 9, opacity: 0.55, fontWeight: 500 }}>/{unit}</span>
                )}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
                {loading
                  ? <span style={{ opacity: 0.3 }}>—</span>
                  : displayR ?? "—"
                }
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MoneyChangerTable ────────────────────────────────────────────────────────
/**
 * myrIsSelling: true  = user spends MYR to buy foreign → highlight SELL col (lower = better)
 *              false = user sells foreign to get MYR  → highlight BUY col  (higher = better)
 * klCurrency never changes on swap, so this table is always stable.
 */
function MoneyChangerTable({ data, currency, myrIsSelling, t }) {
  const flag         = currencyMap[currency]?.flag ?? "";
  const highlightCol = myrIsSelling ? "sell" : "buy";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 120px 120px 130px",
        padding: "11px 20px", background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        {[
          t("cx.colChanger"),
          `${t("cx.colBuy")} (MYR)${highlightCol === "buy"  ? " ★" : ""}`,
          `${t("cx.colSell")} (MYR)${highlightCol === "sell" ? " ★" : ""}`,
          t("cx.colUpdated"),
        ].map((h, i) => (
          <span key={i} style={{
            fontSize: 11, fontWeight: 700, color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            textAlign: i === 0 ? "left" : "right",
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {data.map((row, i) => {
        const isBest    = i === 0;
        const bestColor = highlightCol === "buy" ? "rgba(124,248,192,0.06)" : "rgba(139,124,248,0.06)";
        return (
          <div
            key={row.name + i}
            style={{
              display: "grid", gridTemplateColumns: "1fr 120px 120px 130px",
              padding: "13px 20px",
              borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none",
              background: isBest ? bestColor : "transparent",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
            onMouseLeave={e => e.currentTarget.style.background = isBest ? bestColor : "transparent"}
          >
            {/* Name + unit badge */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {isBest && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                    background: highlightCol === "buy" ? "var(--accent3)" : "var(--accent)",
                    color: highlightCol === "buy" ? "#000" : "#fff",
                    borderRadius: 4, padding: "2px 6px",
                  }}>
                    {t("cx.best")}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.name}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {t("cx.per")} {row.unit} {flag} {currency}
              </span>
            </div>

            {/* Buy */}
            <div style={{ textAlign: "right", alignSelf: "center" }}>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                color: highlightCol === "buy" ? "var(--accent3)" : "var(--text)",
              }}>
                {row.buy.toFixed(4)}
              </span>
            </div>

            {/* Sell */}
            <div style={{ textAlign: "right", alignSelf: "center" }}>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                color: highlightCol === "sell" ? "var(--accent)" : "var(--text)",
              }}>
                {row.sell.toFixed(4)}
              </span>
            </div>

            {/* Updated */}
            <div style={{ textAlign: "right", alignSelf: "center" }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{row.updated}</span>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ padding: "9px 20px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 11, color: "var(--muted)" }}>
          ★ {highlightCol === "buy" ? t("cx.footerBuy") : t("cx.footerSell")}
          &nbsp;·&nbsp; {t("cx.footerDisclaimer")}
        </p>
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <>
      <style>{`@keyframes cx-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: size, height: size, flexShrink: 0,
        border: "2px solid var(--border)", borderTopColor: "var(--accent)",
        borderRadius: "50%", animation: "cx-spin 0.7s linear infinite",
      }} />
    </>
  );
}
