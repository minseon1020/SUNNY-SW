// src/pages/GasEmission.jsx
// 에너지 사용량 페이지(EnergyUsage.jsx)를 그대로 가져와서
// 온실가스 배출량(전기/가스) 기준으로 바꾼 버전

import React, { useEffect, useMemo, useState } from "react";
import styles from "./EnergyUsage.module.css";      // 레이아웃은 그대로 재사용
import HeatBoxSimple from "../components/HeatBoxSimple";

//  온실가스 계수 
// 단위: tCO2eq / MWh  (전기는 kWh를 MWh로 맞춰서 사용했다고 가정)
const GHG_ELECTRICITY_COEFF = 0.4541;   // 전기
const GHG_GAS_COEFF = 0.202;           // 도시가스

//  내부 유틸: API prefix 
function buildApiPrefix(apiBase) {
  const base = (apiBase ?? "").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

// YEAR_MONTH 정규화
function ymToYYYYMM(x) {
  const m = String(x ?? "").match(/(\d{4})\D*?(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}${m[2].padStart(2, "0")}`;
}

// 소도구
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

// 국가 월별 에너지 합계 로드
// EnergyUsage.jsx 의 fetchCountryMonthly 를 그대로 복사한 함수 
async function fetchCountryEnergyMonthly({ apiBase, year }) {
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
      // 다음 URL 시도
    }
  }

  if (!items) return { elec: Array(12).fill(0), gas: Array(12).fill(0) };

  const elec = Array(12).fill(0); // 전기사용량(MWh)
  const gas = Array(12).fill(0);  // 가스사용량(MWh 또는 환산값)

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

//  미니 차트 컴포넌트 
function ChartMini({
  title,
  unit,
  data,
  color = "#2a84ff",
  onClick,
  active = false,
}) {
  const values = (data || []).map((v) => Number(v) || 0);
  const rawMax = Math.max(1, ...values);

  const getScale = (max) => {
    if (max >= 1e6) return { factor: 1e6, suffix: "백만" };
    if (max >= 1e4) return { factor: 1e4, suffix: "만" };
    return { factor: 1, suffix: "" };
  };

  const { factor, suffix } = getScale(rawMax);
  const scaledValues = values.map((v) => v / factor);
  const max = Math.max(1, ...scaledValues);
  const months = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  const displayUnit = suffix ? `${suffix}${unit}` : unit;

  return (
    <div
      onClick={onClick}
      style={{
        border: active ? "1px solid #f97316" : "1px solid #e6e8ef",
        boxShadow: active ? "0 0 0 1px rgba(249,115,22,0.25)" : "none",
        borderRadius: 12,
        padding: "14px 14px 12px",
        background: "#fff",
        marginTop: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color .15s ease, box-shadow .15s ease",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        {title}{" "}
        <span style={{ color: "#889", fontWeight: 500 }}>({displayUnit})</span>
      </div>

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
          const barHeight = Math.round(ratio * 130);

          const label =
            v > 0
              ? v.toLocaleString(undefined, { maximumFractionDigits: 1 })
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


export default function GasEmission() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [source, setSource] = useState("elec"); // 'elec' | 'gas'

  const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

  const years = useMemo(() => {
    const end = now.getFullYear();
    const start = end - 5;
    return Array.from({ length: end - start + 1 }, (_, i) => end - i);
  }, [now]);

  const [elecMonthly, setElecMonthly] = useState(Array(12).fill(0)); // 천 tCO2eq
  const [gasMonthly, setGasMonthly] = useState(Array(12).fill(0));   // 천 tCO2eq
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setChartLoading(true);

        // 1) 에너지 사용량 월 합계(MWh) 불러오기
        const res = await fetchCountryEnergyMonthly({
          apiBase: API_BASE,
          year,
        });
        if (!alive) return;

        // 2) 온실가스 배출량으로 환산 (단위: "천 tCO2eq")
        const elecGHG = res.elec.map(
          (v) => (v * GHG_ELECTRICITY_COEFF) / 1000
        );
        const gasGHG = res.gas.map(
          (v) => (v * GHG_GAS_COEFF) / 1000
        );

        setElecMonthly(elecGHG);
        setGasMonthly(gasGHG);
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
        {/* 상단 타이틀 */}
        <header className={styles.header}>
          <h1>온실가스 배출량 현황</h1>
          <p>
            전국 에너지 사용 데이터를 바탕으로 월별·지역별 온실가스 배출량
            패턴을 시각적으로 확인할 수 있습니다.
          </p>
        </header>

        <div className={styles.layout}>
          {/* 왼쪽: 필터 + 그래프 2개 */}
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
                <label className={styles.label}>배출원</label>
                <select
                  className={styles.select}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="elec">전기(tCO2eq)</option>
                  <option value="gas">가스(tCO2eq)</option>
                </select>
              </div>
            </div>

            {/* 온실가스 미니 그래프 2개 */}
            <div style={{ marginTop: 8 }}>
              <ChartMini
                title="전기 부문 온실가스 배출량 통계"
                unit="천 tCO₂eq"
                data={elecMonthly}
                color="#2a84ff"
                onClick={() => setSource("elec")}
                active={source === "elec"}
              />
              <ChartMini
                title="가스 부문 온실가스 배출량 통계"
                unit="천 tCO₂eq"
                data={gasMonthly}
                color="#ff7a00"
                onClick={() => setSource("gas")}
                active={source === "gas"}
              />
              {chartLoading && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  온실가스 배출량 합계 로딩 중…
                </div>
              )}
            </div>
          </aside>

          {/* 오른쪽: 히트박스 지도 */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3>지역별 온실가스 배출량 (히트박스)</h3>
              <div className={styles.cardSub}></div>
            </div>

            <div className={styles.panel} style={{ height: 720 }}>
              {/*  HeatBoxSimple 그대로 사용 → EnergyUsage 페이지와 동일한 재생 로직 */}
              <HeatBoxSimple
                year={year}
                metric={source}   // 'elec' | 'gas'
                autoPlay={true}   // 페이지 들어오면 바로 자동 재생
                intervalMs={900}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
