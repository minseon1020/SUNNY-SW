import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

// ----------------------------------------
// 📌 온실가스 배출계수 (IPCC 기준 예시)
// ----------------------------------------
const ELEC_CO2_FACTOR = 0.4541;
const GAS_CO2_FACTOR = 0.202;

// 숫자 포맷 (3자리 콤마용 – 축 범위엔 영향 없음)
const formatNumber = (v) => {
  if (v == null || isNaN(v)) return "0";
  return Number(v).toLocaleString("ko-KR");
};

// ----------------------------------------
// 📌 공통 월별 평균 계산 (시군구 개별값 기준)
// ----------------------------------------
function makeMonthlyAverage(data, getVal, label = "UNKNOWN") {
  console.log(`\n===== [makeMonthlyAverage: ${label}] =====`);
  console.log(`▶ 입력 데이터 개수: ${data.length}`);

  const groups = {};

  data.forEach((d, idx) => {
    const ym = String(d.yearMonth).trim();
    const v = getVal(d);

    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(v);

    if (idx < 5) {
      console.log(
        `  - sample[${idx}]: ym=${ym}, value=${v}, cityId=${d.cityId}, countyId=${d.countyId}`
      );
    }
  });

  console.log(`▶ 그룹핑된 월 개수: ${Object.keys(groups).length}`);
  console.log(`▶ 월 목록(앞 10개):`, Object.keys(groups).slice(0, 10));

  const avg = {};

  Object.keys(groups)
    .sort()
    .forEach((ym) => {
      const arr = groups[ym];
      const monthlyAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
      avg[ym] = monthlyAvg;

      console.log(
        `   ➤ ${label} | ${ym} | count=${arr.length} | sum=${arr.reduce(
          (a, b) => a + b,
          0
        )} | avg=${monthlyAvg}`
      );
    });

  console.log(`===== [END makeMonthlyAverage: ${label}] =====\n`);

  return avg;
}

// ----------------------------------------
// 📌 전국 평균 = 전국 월별합계 / 전국 시군구 수
// ----------------------------------------
function makeNationalSigunguAverage(nationalData, sigunguCount, getVal) {
  console.log("\n===== [makeNationalSigunguAverage 시작] =====");
  console.log("▶ 전국 시군구 수:", sigunguCount);

  const natAvg = {};

  nationalData.forEach((d) => {
    const ym = String(d.yearMonth).trim();
    const total = getVal(d); // 전국 월합계 (전기 or 가스 or CO2)

    natAvg[ym] = total / sigunguCount;

    console.log(
      `   ➤ 전국평균 | ${ym} | 월합=${total} / ${sigunguCount} = ${natAvg[ym]}`
    );
  });

  console.log("===== [END makeNationalSigunguAverage] =====\n");

  return natAvg;
}

// --------------------------------------------------------
//  📌 Main Component
// --------------------------------------------------------
export default function ChartSection({
  selectedRegion,
  selectedRegionData,
  nationalData, // 132건 = 전국 월별 합계 데이터
  sidoData, // 시도 전체 시군구 데이터(수백~수천건)
  energyType, // 'electric' | 'gas'
  mainTab, // 'energy' | 'co2'
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!selectedRegionData || selectedRegionData.length === 0) return;

    // ----------------------------
    // 1) 필터링
    // ----------------------------
    const raw = selectedRegionData.items || selectedRegionData;

    const clean = raw.filter((d) => {
      const ym = Number(String(d.yearMonth).trim());
      return ym >= 202001 && ym <= 202506;
    });

    if (clean.length === 0) return;

    // ★ 모든 월 생성
    const labels = [];
    for (let y = 2020; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}${String(m).padStart(2, "0")}`;
        labels.push(ym);
        if (ym === "202506") break;
      }
    }

    // ----------------------------
    // 2) 값 선택 함수 (에너지 / CO2)
    // ----------------------------

    // 에너지 사용량 (기존 로직 그대로)
    const getEnergyVal = (d) =>
      energyType === "electric"
        ? Number(d.useElect || 0)
        : Number(d.useGas || 0);

    // 탄소배출량 = 사용량 × 배출계수
    const getCo2Val = (d) => {
      const energy = getEnergyVal(d);
      const factor =
        energyType === "electric" ? ELEC_CO2_FACTOR : GAS_CO2_FACTOR;
      return energy * factor;
    };

    // mainTab 에 따라 실제 사용하는 함수 선택
    const getVal = mainTab === "co2" ? getCo2Val : getEnergyVal;

    let values = [];
    let compareValues = [];

    // ==========================================================
    // ★ 2-1) 단위 텍스트 정의
    // ==========================================================
    let unitLabel = ""; // 범례용 긴 문구
    let unitShort = ""; // 툴팁 / Y축에 붙일 짧은 단위

    if (mainTab === "co2") {
      unitLabel = "온실가스 배출량 (tCO₂)";
      unitShort = "tCO₂";
    } else if (energyType === "electric") {
      unitLabel = "전기 사용량 (MWh)";
      unitShort = "MWh";
    } else {
      unitLabel = "가스 사용량 (천㎥)";
      unitShort = "천㎥";
    }

    // ==========================================================
    // 3) 전국 / 시도 / 시군구 구분하여 평균계산
    // ==========================================================

    // ① 전국 선택
    if (!selectedRegion) {
      const natAvg = makeMonthlyAverage(
        nationalData,
        getVal,
        mainTab === "co2" ? "전국 CO2" : "전국 사용량"
      );
      values = labels.map((ym) => natAvg[ym] ?? 0);
      compareValues = []; // 비교 없음
    }

    // ② 시도 선택 (countyId 없음)
    else if (!selectedRegion.countyId) {
      // 2-1) 시도 전체 평균
      const sidoAvg = makeMonthlyAverage(
        sidoData,
        getVal,
        mainTab === "co2"
          ? `${selectedRegion.cityName} CO2`
          : `${selectedRegion.cityName} 사용량`
      );
      values = labels.map((ym) => sidoAvg[ym] ?? 0);

      // 2-2) 전국 시군구 수 계산
      const sigunguCount = 253; // 기본값

      // 2-3) 전국 시군구 평균
      const natAvg = makeNationalSigunguAverage(
        nationalData,
        sigunguCount,
        getVal
      );
      compareValues = labels.map((ym) => natAvg[ym] ?? 0);
    }

    // ③ 시군구 선택
    else {
      const countyId = Number(selectedRegion.countyId);

      // 개별 시군구 값
      const singleMap = {};
      clean.forEach((d) => {
        if (Number(d.countyId) === countyId) {
          singleMap[d.yearMonth] = getVal(d);
        }
      });
      values = labels.map((ym) => singleMap[ym] ?? 0);

      // 시도 평균 비교
      const sidoAvg = makeMonthlyAverage(
        sidoData,
        getVal,
        mainTab === "co2"
          ? `${selectedRegion.cityName} CO2`
          : `${selectedRegion.cityName} 사용량`
      );
      compareValues = labels.map((ym) => sidoAvg[ym] ?? 0);
    }

    // ==========================================================
    // 4) 차트 생성  (축 범위는 그대로, 색 + 모션만 변경)
    // ==========================================================
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext("2d");

    const baseLabel = !selectedRegion
      ? "전국"
      : selectedRegion.countyId
      ? selectedRegion.countyName
      : selectedRegion.cityName;

    // ★ 범례 라벨도 단위 포함해서
    const metricLabel = unitLabel;
    const regionLabel = `${baseLabel} ${metricLabel}`;
    const compareLabel = !selectedRegion
      ? ""
      : !selectedRegion.countyId
      ? `전국 평균 ${metricLabel}`
      : `${selectedRegion.cityName} 평균 ${metricLabel}`;

    // 🔹 디자인만 조정한 datasets
    const datasets = [];

    if (compareValues.length > 0) {
      // 파란 실선 + 회색 영역 (평균)
      datasets.push({
        label: compareLabel,
        data: compareValues,
        borderColor: "#60a5fa",
        backgroundColor: "rgba(148, 163, 184, 0.35)", // 연회색 영역
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
      });

      // 주황 점선 + 살구색 영역 (선택 지역)
      datasets.push({
        label: regionLabel,
        data: values,
        borderColor: "#fb923c",
        backgroundColor: "rgba(252, 211, 77, 0.25)", // 연살구
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 2,
        pointHoverRadius: 4,
      });
    } else {
      // 비교값 없을 때: 파스텔 블루 영역 하나
      datasets.push({
        label: regionLabel,
        data: values,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(191, 219, 254, 0.4)",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
      });
    }

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        // 🌀 모션 추가 (축 범위엔 영향 X)
        animation: {
          duration: 900,
          easing: "easeOutCubic",
        },
        animations: {
          y: {
            duration: 900,
            easing: "easeOutCubic",
            from: (ctx) => {
              if (ctx.type === "data" && ctx.mode === "default") {
                const yScale = ctx.chart.scales.y;
                return yScale.getPixelForValue(0); // 0선에서 위로 올라오는 연출
              }
              return undefined;
            },
          },
          x: {
            duration: 700,
            easing: "easeOutQuad",
          },
        },

        interaction: {
          mode: "index",
          intersect: false,
        },

        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "center",
            labels: {
              boxWidth: 24,
              boxHeight: 12,
              padding: 16,
              color: "#4b5563",
              font: {
                size: 12,
                family:
                  "'Noto Sans KR', system-ui, -apple-system, BlinkMacSystemFont",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            borderRadius: 8,
            padding: 10,
            titleColor: "#e5e7eb",
            bodyColor: "#f9fafb",
            displayColors: true,
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || "";
                const value = ctx.parsed.y;
                // ★ 숫자 뒤에도 단위 표시
                return `${label}: ${formatNumber(value)} ${unitShort}`;
              },
            },
          },
        },

        // ❗축 범위 로직 그대로 + Y축 제목에 단위 표시
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: unitShort, // MWh / 천㎥ / tCO₂
            },
          },
        },
      },
    });
  }, [
    selectedRegion,
    selectedRegionData,
    nationalData,
    sidoData,
    energyType,
    mainTab,
  ]);

  return (
    <div style={{ width: "100%", height: "420px", paddingTop: "8px" }}>
      <canvas ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
