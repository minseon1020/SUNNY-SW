// src/components/HeatBoxMaplibre.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "./HeatBoxCard.css";
import { loadEnergyCSV } from "../services/energyCsvLoader";

/* ===== 유틸 ===== */
const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
const onlyDigits = (s) => String(s ?? "").replace(/\D+/g, "");
const fromYYYYMM = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}`;
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w가-힣]+/g, " ")
    .replace(/\s+/g, "")
    .trim();

const CANDS = {
  ym:   ["사용년월","기준년월","년월","yyyymm","ym","month","기간","연월","월(yyyymm)"],
  sgg5: ["시군구코드","sigcd","sggcd","adm_drcd","adm_cd5","sig_cd5","code"],
  law10:["법정동코드","법정동코드10자리","adm_cd","법정동","법정코드","hid_cd"],
  elec: ["전기사용량","전력사용량","전력","전력량","electricity","mwh","elec"],
  gas:  ["가스사용량","도시가스사용량","gas","gj","citygas","가스"],
};
const detect = (headers, wants) => {
  const H = headers.map((h) => [h, norm(h)]);
  for (const w of wants) {
    const hit = H.find(([, n]) => n === norm(w));
    if (hit) return hit[0];
  }
  for (const w of wants) {
    const hit = H.find(([, n]) => n.includes(norm(w)));
    if (hit) return hit[0];
  }
  return null;
};

// bbox 중심(빠르고 의존성 없음)
function bboxCenterOf(geom) {
  const collect = (coords, acc) => {
    for (const c of coords) {
      if (typeof c[0] === "number") {
        const [lng, lat] = c;
        acc.minX = Math.min(acc.minX, lng);
        acc.maxX = Math.max(acc.maxX, lng);
        acc.minY = Math.min(acc.minY, lat);
        acc.maxY = Math.max(acc.maxY, lat);
      } else {
        collect(c, acc);
      }
    }
  };
  if (!geom) return null;
  const acc = { minX: 999, maxX: -999, minY: 999, maxY: -999 };
  if (geom.type === "Polygon") collect(geom.coordinates, acc);
  else if (geom.type === "MultiPolygon") collect(geom.coordinates, acc);
  else return null;
  return [(acc.minX + acc.maxX) / 2, (acc.minY + acc.maxY) / 2];
}

export default function HeatBoxMaplibre({
  csvUrl    = "/data/전체_에너지_2020-2025_통합_v2.csv",
  sggGeoUrl = "/korea/sgg.json",
  forceYmKey, forceSggKey, forceElecKey, forceGasKey, // 강제 매핑
  autoPlay = true,
  intervalMs = 900,
}) {
  const [warn, setWarn] = useState("");
  const [metric, setMetric] = useState("elec"); // elec | gas
  const [normalize, setNormalize] = useState(true);

  const [months, setMonths] = useState([]); // ["YYYY-MM", ...]
  const [idx, setIdx] = useState(0);
  const [year, setYear] = useState("");
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);

  const years = useMemo(() => Array.from(new Set(months.map(m => m.slice(0,4)))), [months]);
  const yearMonths = useMemo(() => (year ? months.filter(m => m.startsWith(year)) : []), [months, year]);
  const currentMonth = months[idx] || "-";

  const centersRef = useRef(new Map());        // code5 -> [lng,lat]
  const bucketsRef = useRef({ elec: new Map(), gas: new Map() }); // ym -> [{lng,lat,value}]

  // 1) sgg.json 로드 → 중심좌표 계산
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(sggGeoUrl);
        const gj = await r.json();
        const map = new Map();
        for (const f of gj.features || []) {
          const p = f.properties || {};
          const raw = p.SIG_CD ?? p.SGG_CD ?? p.ADM_DR_CD ?? p.code ?? p.sig_cd ?? p.sgg_cd;
          if (!raw) continue;
          const code5 = String(raw).padStart(5, "0").slice(0, 5);
          const center = bboxCenterOf(f.geometry); // [lng,lat]
          if (center) map.set(code5, center);
        }
        centersRef.current = map;
        if (!map.size) setWarn("⚠ /korea/sgg.json에서 좌표를 계산하지 못했습니다.");
      } catch {
        setWarn("⚠ /korea/sgg.json 로드 실패");
      }
    })();
  }, [sggGeoUrl]);

  // 2) CSV 로드 → ym 버킷 구성
  useEffect(() => {
    (async () => {
      try {
        const rows = await loadEnergyCSV(csvUrl);
        if (!rows?.length) { setWarn("⚠ CSV가 비어 있거나 잘못되었습니다."); return; }

        const headers = Object.keys(rows[0]);
        const auto = {
          ymKey:   detect(headers, CANDS.ym),
          sgg5Key: detect(headers, CANDS.sgg5),
          law10Key: detect(headers, CANDS.law10),
          elecKey: detect(headers, CANDS.elec),
          gasKey:  detect(headers, CANDS.gas),
        };
        const ymKey   = forceYmKey  || auto.ymKey;
        const sgg5Key = forceSggKey || auto.sgg5Key || auto.law10Key;
        const elecKey = forceElecKey|| auto.elecKey;
        const gasKey  = forceGasKey || auto.gasKey;

        if (!ymKey || !sgg5Key || (!elecKey && !gasKey)) {
          setWarn("⚠ CSV 헤더 매핑 실패(사용년월/시군구코드/전력·가스). 강제 매핑 props 확인.");
          return;
        }

        const centers = centersRef.current;
        const elec = new Map();
        const gas  = new Map();
        const ymSet = new Set();

        for (const r of rows) {
          // ym
          const rawYM = r[ymKey];
          let ym = null;
          if (rawYM != null) {
            const d = onlyDigits(String(rawYM));
            if (d.length >= 6) ym = fromYYYYMM(d.slice(0, 6));
          }
          if (!ym) continue;
          ymSet.add(ym);

          // code5
          const code5 = onlyDigits(String(r[sgg5Key] ?? "")).slice(0, 5).padStart(5, "0");
          if (!code5) continue;
          const ll = centers.get(code5);
          if (!ll) continue;

          // 값
          const eRaw = r[elecKey];
          const gRaw = r[gasKey];
          const eVal = eRaw==null||eRaw==="" ? null : Number(String(eRaw).replace(/,/g,""));
          const gVal = gRaw==null||gRaw==="" ? null : Number(String(gRaw).replace(/,/g,""));

          if (Number.isFinite(eVal)) {
            if (!elec.has(ym)) elec.set(ym, []);
            elec.get(ym).push({ lng: ll[0], lat: ll[1], value: eVal });
          }
          if (Number.isFinite(gVal)) {
            if (!gas.has(ym)) gas.set(ym, []);
            gas.get(ym).push({ lng: ll[0], lat: ll[1], value: gVal });
          }
        }

        bucketsRef.current = { elec, gas };
        const ys = Array.from(ymSet).sort();
        setMonths(ys);
        setYear(ys[0]?.slice(0,4) || "");
        setIdx(0);
        setWarn(ys.length ? "" : "⚠ CSV에서 유효한 월 데이터를 찾지 못했습니다.");
      } catch (e) {
        console.error(e);
        setWarn("⚠ CSV 로드/파싱 실패");
      }
    })();
  }, [csvUrl, forceYmKey, forceSggKey, forceElecKey, forceGasKey]);

  // 3) 자동재생
  useEffect(() => {
    if (!playing || yearMonths.length === 0) return;
    const arr = yearMonths;
    const cur = months[idx];
    const localIdx = Math.max(0, arr.indexOf(cur));
    const step = Math.max(150, intervalMs / (speed || 1));
    const id = setInterval(() => {
      const nextLocal = (localIdx + 1) % arr.length;
      const nextYm = arr[nextLocal];
      const gi = months.findIndex((m) => m === nextYm);
      if (gi >= 0) setIdx(gi);
    }, step);
    return () => clearInterval(id);
  }, [playing, yearMonths, months, idx, intervalMs, speed]);

  // 4) 현재 월 → GeoJSON(정규화)
  const geojson = useMemo(() => {
    const src = bucketsRef.current[metric].get(currentMonth) || [];
    let maxV = 1;
    if (normalize && src.length) {
      maxV = src.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1;
    }
    const feats = src.map((d) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [d.lng, d.lat] },
      properties: { w: normalize ? Math.max(0.05, d.value / maxV) : d.value },
    }));
    return { type: "FeatureCollection", features: feats };
  }, [metric, normalize, currentMonth]);

  const heatPaint = useMemo(() => ({
    "heatmap-radius": [
      "interpolate", ["linear"], ["zoom"],
      5, 18, 7, 28, 10, 40
    ],
    "heatmap-intensity": 1.0,
    "heatmap-opacity": 0.9,
    "heatmap-weight": ["coalesce", ["get", "w"], 0],
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0.0, "rgba(47,128,237,0)",
      0.2, "rgb(86,204,242)",
      0.4, "rgb(255,209,102)",
      0.6, "rgb(252,163,17)",
      1.0, "rgb(230,57,70)"
    ],
  }), []);

  const jumpTo = (m) => {
    if (!year) return;
    const ym = `${year}-${pad2(m)}`;
    const gi = months.findIndex((x) => x === ym);
    if (gi >= 0) setIdx(gi);
  };
  const curMM = currentMonth !== "-" ? Number(currentMonth.slice(5, 7)) : 0;
  const monthHasData = useMemo(() => {
    const set = new Set(yearMonths);
    const has = {};
    for (let m = 1; m <= 12; m++) has[m] = set.has(`${year}-${pad2(m)}`);
    return has;
  }, [year, yearMonths]);

  return (
    <div className="heatbox-card">
      {/* 툴바 */}
      <div className="heatbox-toolbar">
        <div className="left">
          <button className="hb-btn" onClick={() => setPlaying(v => !v)}>{playing ? "⏸ 정지" : "▶ 재생"}</button>
          <button className="hb-btn ghost" onClick={() => {
            if (yearMonths.length === 0) return;
            const arr = yearMonths, local = Math.max(0, arr.indexOf(currentMonth));
            const prev = (local - 1 + arr.length) % arr.length;
            const ym = arr[prev];
            const gi = months.findIndex(m => m === ym);
            if (gi >= 0) setIdx(gi);
          }}>◀ 이전</button>
          <button className="hb-btn ghost" onClick={() => {
            if (yearMonths.length === 0) return;
            const arr = yearMonths, local = Math.max(0, arr.indexOf(currentMonth));
            const next = (local + 1) % arr.length;
            const ym = arr[next];
            const gi = months.findIndex(m => m === ym);
            if (gi >= 0) setIdx(gi);
          }}>다음 ▶</button>
          <span className="month">{currentMonth}</span>
        </div>
        <div className="right">
          <label className="hb-field">지표
            <select value={metric} onChange={e => setMetric(e.target.value)}>
              <option value="elec">전력</option>
              <option value="gas">가스</option>
            </select>
          </label>
          <label className="hb-field">정규화
            <input type="checkbox" checked={normalize} onChange={e => setNormalize(e.target.checked)} />
          </label>
          <label className="hb-field">속도
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </label>
          <label className="hb-field">연도
            <select value={year} onChange={(e) => {
              setYear(e.target.value);
              const first = months.find(m => m.startsWith(e.target.value));
              if (first) setIdx(months.findIndex(m => m === first));
            }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* 범례 */}
      <div className="heatbox-legend">
        <span>낮음</span>
        <i style={{ background: "linear-gradient(90deg,#2f80ed,#56ccf2,#ffd166,#fca311,#e63946)" }} />
        <span>높음</span>
      </div>

      {/* MapLibre */}
      <div style={{ height: "100%", width: "100%" }}>
        <Map
          initialViewState={{ longitude: 127.8, latitude: 36.3, zoom: 6.2, minZoom: 5.8, maxZoom: 13 }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          reuseMaps
          style={{ height: "100%", width: "100%" }}
        >
          <NavigationControl position="bottom-right" />
          <Source id="heat-src" type="geojson" data={geojson} />
          <Layer id="heat-lyr" type="heatmap" source="heat-src" paint={heatPaint} />
        </Map>
      </div>

      {/* 타임라인 */}
      <div className="hb-timeline">
        <button className="hb-play" onClick={() => setPlaying(v=>!v)} aria-label="재생/정지">
          {playing ? "⏸" : "▶"}
        </button>
        <div className="hb-months">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const has = monthHasData[m];
            const active = has && m === curMM && currentMonth.startsWith(year);
            return (
              <button
                key={m}
                className={`hb-m ${active ? "active" : ""}`}
                disabled={!has}
                onClick={() => jumpTo(m)}
                title={has ? `${year}-${pad2(m)}` : "데이터 없음"}
              >
                {m}월
              </button>
            );
          })}
        </div>
      </div>

      {warn && <div className="hb-warn">{warn}</div>}
    </div>
  );
}
