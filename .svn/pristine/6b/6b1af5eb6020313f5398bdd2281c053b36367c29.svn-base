// src/pages/EnergyUsage.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./EnergyUsage.module.css";
import HeatBoxSimple from "../components/HeatBoxSimple";

/* ------------------------- 내부 유틸: API prefix 안전 조립 ------------------------- */
function buildApiPrefix(apiBase) {
  const base = (apiBase ?? "").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

/* ------------------------- 내부 유틸: YEAR_MONTH 정규화 ------------------------- */
function ymToYYYYMM(x) {
  const m = String(x ?? "").match(/(\d{4})\D*?(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}${m[2].padStart(2, "0")}`;
}

/* ------------------------- 국가 월별 합계 로드 (전기/가스) ------------------------- */
async function fetchCountryMonthly({ apiBase, year }) {
  const prefix = buildApiPrefix(apiBase);

  const tryUrls = [
    `${prefix}/energy/country?year=${year}`,
    `${prefix}/energy/country`,
    `${prefix}/energy?cityId=0&countyId=0`,
  ];

  let items = null;
  for (const url of tryUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : null;
      if (items && items.length) break;
    } catch {
      // try next
    }
  }

  if (!items) return { elec: Array(12).fill(0), gas: Array(12).fill(0) };

  const elec = Array(12).fill(0);
  const gas = Array(12).fill(0);

  for (const row of items) {
    const flat = flatten(row);
    const ym = ymToYYYYMM(pick(flat, ["YEAR_MONTH", "yearMonth", "YM", "ym"]));
    if (!ym || ym.slice(0, 4) !== String(year)) continue;

    const mm = Number(ym.slice(4, 6));
    if (!Number.isFinite(mm) || mm < 1 || mm > 12) continue;

    const e = num(
      pick(flat, ["USE_ELECT", "useElect", "ELEC", "elec", "ELEC_KWH"])
    );
    const g = num(
      pick(flat, ["USE_GAS", "useGas", "GAS", "gas", "GAS_M3"])
    );

    elec[mm - 1] += e;
    gas[mm - 1] += g;
  }

  return { elec, gas };
}

/* ------------------------- 소도구 ------------------------- */
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function pick(obj, keys) {
  for (const k of keys) if (k in obj) return obj[k];
}

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/* ------------------------- 미니 차트 컴포넌트 ------------------------- */

// 값 축약 표시용 포맷터 (지금은 사용 안 하지만 남겨둠)
function formatValue(v) {
  const n = Number(v) || 0;
  if (n === 0) return "";

  const abs = Math.abs(n);
  let value = n;
  let suffix = "";

  if (abs >= 100_000_000) {
    // 1억 이상 → 억
    value = n / 100_000_000;
    suffix = "억";
  } else if (abs >= 10_000) {
    // 1만 이상 → 만
    value = n / 10_000;
    suffix = "만";
  } else if (abs >= 1_000) {
    // 1천 이상 → 천
    value = n / 1_000;
    suffix = "천";
  }

  let s = value.toFixed(1);
  if (s.endsWith(".0")) s = s.slice(0, -2);

  return `${s}${suffix}`;
}

/* ------------------------- 미니 차트 컴포넌트 ------------------------- */
function ChartMini({
  title,
  unit,
  data,
  color = "#2a84ff",
  onClick,
  active = false,
}) {
  // 원 데이터 → 숫자 배열
  const values = (data || []).map((v) => Number(v) || 0);
  const rawMax = Math.max(1, ...values);

  // 단위 스케일 자동 결정
  const getScale = (max) => {
    if (max >= 1e12) return { factor: 1e12, suffix: "조" }; // 1조
    if (max >= 1e8) return { factor: 1e8, suffix: "억" }; // 1억
    if (max >= 1e4) return { factor: 1e4, suffix: "만" }; // 1만
    return { factor: 1, suffix: "" };
  };

  const { factor, suffix } = getScale(rawMax);

  // 스케일 적용된 값들
  const scaledValues = values.map((v) => v / factor);
  const max = Math.max(1, ...scaledValues);
  const months = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  const displayUnit = suffix ? `${suffix}${unit}` : unit; // 예: 억MWh (또는 kWh)

  return (
    <div
      onClick={onClick}
      style={{
        border: active ? "1px solid #f97316" : "1px solid #e6e8ef",
        boxShadow: active ? "0 0 0 1px rgba(249, 115, 22, 0.25)" : "none",
        borderRadius: 12,
        padding: "14px 14px 12px",
        background: "#fff",
        marginTop: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        {title}{" "}
        <span style={{ color: "#889", fontWeight: 500 }}>({displayUnit})</span>
      </div>

      {/* 높이를 넉넉하게 확보해서 숫자가 안 잘리게 */}
      <div
        style={{
          height: 190,
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        {scaledValues.map((v, i) => {
          const ratio = max > 0 ? v / max : 0;
          const barHeight = Math.round(ratio * 130); // 막대 최대 130px

          const label =
            v > 0
              ? v.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })
              : "";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                minWidth: 12,
              }}
            >
              {/* 값 라벨 */}
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  marginBottom: 4,
                  minHeight: 14,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>

              {/* 막대 */}
              <div
                title={`${months[i]}월: ${label}`}
                style={{
                  width: 16,
                  height: barHeight,
                  borderRadius: 4,
                  background: color,
                  opacity: 0.9,
                  transition: "height 0.2s ease",
                }}
              />

              {/* 월 표시 */}
              <div
                style={{
                  fontSize: 10,
                  color: "#777",
                  marginTop: 4,
                }}
              >
                {months[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================================================================== */

export default function EnergyUsage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [metric, setMetric] = useState("elec"); // 'elec' | 'gas'

  const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

  const years = useMemo(() => {
    const end = now.getFullYear();
    const start = end - 5;
    return Array.from({ length: end - start + 1 }, (_, i) => end - i);
  }, [now]);

  const [elecMonthly, setElecMonthly] = useState(Array(12).fill(0));
  const [gasMonthly, setGasMonthly] = useState(Array(12).fill(0));
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setChartLoading(true);
        const res = await fetchCountryMonthly({ apiBase: API_BASE, year });
        if (!alive) return;
        setElecMonthly(res.elec);
        setGasMonthly(res.gas);
      } finally {
        if (alive) setChartLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE, year]);

  return (
    <div className={styles.wrap}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>에너지 사용량 현황</h1>
          <p>
            전국 에너지 월별 사용량을 월 단위로 확인하여 에너지 사용량 빈도를
            시각적으로 알기 쉽게 확인할 수 있습니다.
          </p>
        </header>

        <div className={styles.layout}>
          {/* 왼쪽: 필터 + (전기/가스) 2개 그래프 */}
          <aside className={styles.side}>
            <div className={styles.filterCard}>
              <div className={styles.cardTitle}>날짜 범위 선택</div>
              <div className={styles.formRow}>
                <label className={styles.label}>연도</label>
                <select
                  className={styles.selectBig}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.sep} />

              <div className={styles.cardTitle}>데이터 필터</div>
              <div className={styles.formRow}>
                <label className={styles.label}>에너지원</label>
                <select
                  className={styles.select}
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  <option value="elec">전기(kWh)</option>
                  <option value="gas">가스(m³)</option>
                </select>
              </div>
            </div>

            {/* 좌측 미니 그래프 2개 */}
            <div style={{ marginTop: 8 }}>
              <ChartMini
                title="전기 사용량 통계"
                unit="MWh (또는 kWh)"
                data={elecMonthly}
                color="#2a84ff"
                onClick={() => setMetric("elec")}
                active={metric === "elec"}
              />
              <ChartMini
                title="가스 사용량 통계"
                unit="천m³ (또는 m³)"
                data={gasMonthly}
                color="#ff7a00"
                onClick={() => setMetric("gas")}
                active={metric === "gas"}
              />
              {chartLoading && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  월별 합계 로딩 중…
                </div>
              )}
            </div>
          </aside>

          {/* 오른쪽: 지도 카드 */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3>지역별 에너지 사용량</h3>
              <div className={styles.cardSub}></div>
            </div>

            <div className={styles.panel} style={{ height: 720 }}>
              <HeatBoxSimple
                apiBase={API_BASE}
                year={year}
                metric={metric} // 🔥 전기/가스 기준
                autoPlay={true}
                intervalMs={900}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
