import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "./PredictScenario.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GHG_ELECTRICITY_COEFF = 0.4541;
const GHG_GAS_COEFF = 0.202;
const TARGET_REDUCTION_RATIO = 0.3;

const sliderConfig = {
  min: -50,
  max: 50,
  step: 1,
};

const normalizeCityId = (cityId) => {
  if (cityId == null || cityId === "") {
    return null;
  }
  const numeric = Number(cityId);
  if (Number.isNaN(numeric)) {
    return null;
  }
  if (numeric === 0) {
    return 0;
  }
  if (numeric >= 1000) {
    return Math.floor(numeric / 1000);
  }
  return numeric;
};

const parseYearMonth = (value) => {
  const stringified = String(value ?? "");
  if (stringified.length !== 6) {
    return { label: stringified, year: null, month: null };
  }
  const year = Number(stringified.slice(0, 4));
  const month = Number(stringified.slice(4));
  const label = `${year}-${String(month).padStart(2, "0")}`;
  return { label, year, month };
};

const calcGhG = (elect, gas) => {
  const electricity = Number(elect ?? 0);
  const gasUse = Number(gas ?? 0);
  return electricity * GHG_ELECTRICITY_COEFF + gasUse * GHG_GAS_COEFF;
};

const toIdParams = ({ cityId, countyId }) => {
  const params = new URLSearchParams();
  if (countyId) {
    params.append("countyId", countyId);
    return params;
  }
  if (cityId) {
    params.append("cityId", cityId);
  }
  return params;
};

const groupByLabel = (records, electKey, gasKey) => {
  return records
    .map((item) => {
      const { label, year, month } = parseYearMonth(item.yearMonth);
      return {
        label,
        year,
        month,
        electricity: Number(item[electKey] ?? 0),
        gas: Number(item[gasKey] ?? 0),
      };
    })
    .filter((item) => item.year != null)
    .sort((a, b) => (a.label > b.label ? 1 : -1));
};

function PredictScenario() {
  const [cityId, setCityId] = useState("0");
  const [countyId, setCountyId] = useState("0");
  const [electricityRate, setElectricityRate] = useState(0);
  const [gasRate, setGasRate] = useState(0);
  const [actualRaw, setActualRaw] = useState([]);
  const [predictedRaw, setPredictedRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const actualParams = toIdParams({ cityId, countyId });
        const predictParams = toIdParams({ cityId, countyId });
        const [actualRes, predictRes] = await Promise.all([
          fetch(`/api/energy${actualParams.toString() ? `?${actualParams.toString()}` : ""}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }),
          fetch(
            `/api/predict-energy${predictParams.toString() ? `?${predictParams.toString()}` : ""}`,
            {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            }
          ),
        ]);

        if (!actualRes.ok) {
          throw new Error("에너지 데이터 조회 오류");
        }
        if (!predictRes.ok) {
          throw new Error("예측 데이터 조회 오류");
        }

        const actualJson = await actualRes.json();
        const predictJson = await predictRes.json();
        setActualRaw(Array.isArray(actualJson.items) ? actualJson.items : []);
        setPredictedRaw(Array.isArray(predictJson.items) ? predictJson.items : []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          console.error(fetchError);
          setError(fetchError.message || "데이터를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [cityId, countyId]);

  const actualSeries = useMemo(
    () =>
      groupByLabel(actualRaw, "useElect", "useGas").filter((item) => {
        if (item.year == null) {
          return false;
        }
        if (item.year < 2025) {
          return true;
        }
        if (item.year === 2025) {
          const month = item.month ?? 0;
          return month <= 6;
        }
        return false;
      }),
    [actualRaw]
  );

  const actualWithGhG = useMemo(
    () =>
      actualSeries.map((item) => ({
        ...item,
        ghg: calcGhG(item.electricity, item.gas),
      })),
    [actualSeries]
  );

  const lastActual = useMemo(
    () => (actualWithGhG.length > 0 ? actualWithGhG[actualWithGhG.length - 1] : null),
    [actualWithGhG]
  );

  const predictedSeries = useMemo(
    () => groupByLabel(predictedRaw, "preElect", "preGas"),
    [predictedRaw]
  );

  const baselinePredicted = useMemo(() => {
    const list = predictedSeries
      .map((item) => ({
        ...item,
        ghg: calcGhG(item.electricity, item.gas),
      }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));

    if (lastActual) {
      const hasBoundary = list.some((item) => item.label === lastActual.label);
      if (!hasBoundary) {
        list.unshift({
          label: lastActual.label,
          year: lastActual.year,
          month: lastActual.month,
          electricity: lastActual.electricity,
          gas: lastActual.gas,
          ghg: lastActual.ghg,
        });
      }
    }

    return list;
  }, [predictedSeries, lastActual]);

  const adjustedPredicted = useMemo(() => {
    const electFactor = 1 + electricityRate / 100;
    const gasFactor = 1 + gasRate / 100;
    const list = predictedSeries
      .map((item) => {
        const adjustedElectricity = item.electricity * electFactor;
        const adjustedGas = item.gas * gasFactor;
        return {
          ...item,
          adjustedElectricity,
          adjustedGas,
          ghg: calcGhG(adjustedElectricity, adjustedGas),
        };
      })
      .sort((a, b) => (a.label > b.label ? 1 : -1));

    if (lastActual) {
      const hasBoundary = list.some((item) => item.label === lastActual.label);
      if (!hasBoundary) {
        list.unshift({
          label: lastActual.label,
          year: lastActual.year,
          month: lastActual.month,
          adjustedElectricity: lastActual.electricity,
          adjustedGas: lastActual.gas,
          ghg: lastActual.ghg,
        });
      }
    }

    return list;
  }, [predictedSeries, electricityRate, gasRate, lastActual]);

  const labels = useMemo(() => {
    const labelSet = new Set([
      ...actualWithGhG.map((item) => item.label),
      ...baselinePredicted.map((item) => item.label),
      ...adjustedPredicted.map((item) => item.label),
    ]);
    return Array.from(labelSet).sort((a, b) => (a > b ? 1 : -1));
  }, [actualWithGhG, baselinePredicted, adjustedPredicted]);

  const labelKeyMap = useMemo(() => {
    const map = new Map();
    labels.forEach((label) => {
      const [yearStr, monthStr] = label.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        map.set(label, year * 100 + month);
      }
    });
    return map;
  }, [labels]);

  const baselineMap = useMemo(() => {
    const map = new Map();
    baselinePredicted.forEach((item) => map.set(item.label, item));
    return map;
  }, [baselinePredicted]);

  const adjustedMap = useMemo(() => {
    const map = new Map();
    adjustedPredicted.forEach((item) => map.set(item.label, item));
    return map;
  }, [adjustedPredicted]);

  const lastActualKey = useMemo(() => {
    if (!lastActual || lastActual.year == null || lastActual.month == null) {
      return null;
    }
    return lastActual.year * 100 + lastActual.month;
  }, [lastActual]);

  const chartData = useMemo(() => {
    const datasets = [
      {
        label: "실제 배출량 (2020~2025)",
        data: labels.map((label) => {
          const key = labelKeyMap.get(label);
          if (lastActualKey != null && key != null && key > lastActualKey) {
            return null;
          }
          const found = actualWithGhG.find((item) => item.label === label);
          return found ? found.ghg : null;
        }),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.25)",
        borderWidth: 2,
        tension: 0,
        spanGaps: false,
        pointRadius: 3,
      },
      {
        label: "예측 배출량 (원본)",
        data: labels.map((label) => baselineMap.get(label)?.ghg ?? null),
        borderColor: "#fbbf24",
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        tension: 0.3,
        cubicInterpolationMode: "monotone",
        spanGaps: true,
      },
      {
        label: "예측 배출량 (조정 후)",
        data: labels.map((label) => adjustedMap.get(label)?.ghg ?? null),
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.15)",
        borderWidth: 2,
        borderDash: [8, 6],
        pointRadius: 3,
        tension: 0.3,
        cubicInterpolationMode: "monotone",
        spanGaps: true,
      },
    ];
    return {
      labels,
      datasets,
    };
  }, [labels, labelKeyMap, lastActualKey, actualWithGhG, baselineMap, adjustedMap]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y ?? 0;
              return `${context.dataset.label}: ${value.toLocaleString("ko-KR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} tCO₂`;
            },
          },
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "온실가스 배출량 (tCO₂)",
          },
          ticks: {
            callback: (value) =>
              Number(value).toLocaleString("ko-KR", {
                maximumFractionDigits: 0,
              }),
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30,
          },
        },
      },
    }),
    []
  );

  const stats = useMemo(() => {
    const totalPredictedGhG = adjustedPredicted.reduce((sum, item) => sum + item.ghg, 0);
    const totalActualGhG = actualWithGhG.reduce((sum, item) => sum + item.ghg, 0);
    const lastActual = actualWithGhG[actualWithGhG.length - 1]?.ghg ?? totalActualGhG;
    const target2030 = lastActual * (1 - TARGET_REDUCTION_RATIO);

    const predicted2030 = adjustedPredicted
      .filter((item) => item.year === 2030)
      .reduce((sum, item) => sum + item.ghg, 0);

    const delta = predicted2030 - target2030;
    const achievement = target2030 > 0 ? (target2030 / (predicted2030 || target2030)) * 100 : 0;

    const totalElectricity = adjustedPredicted.reduce(
      (sum, item) => sum + item.adjustedElectricity,
      0
    );
    const totalGas = adjustedPredicted.reduce((sum, item) => sum + item.adjustedGas, 0);
    const totalEnergy = totalElectricity + totalGas;
    const electricityPortion = totalEnergy ? (totalElectricity / totalEnergy) * 100 : 0;
    const gasPortion = totalEnergy ? (totalGas / totalEnergy) * 100 : 0;

    return {
      totalPredictedGhG,
      target2030,
      predicted2030,
      delta,
      achievement,
      electricityPortion,
      gasPortion,
    };
  }, [adjustedPredicted, actualWithGhG]);

  const handleReset = () => {
    setElectricityRate(0);
    setGasRate(0);
  };

  const handleApplyRegion = (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const nextCity = form.get("cityId")?.trim();
    const nextCounty = form.get("countyId")?.trim();
    setCityId(nextCity || "");
    setCountyId(nextCounty || "");
  };

  const handleNationwide = () => {
    setCityId("0");
    setCountyId("0");
    if (formRef.current) {
      formRef.current.cityId.value = "0";
      formRef.current.countyId.value = "0";
    }
  };

  return (
    <section className={styles["scenario-page"]}>
      <header className={styles["scenario-header"]}>
        <h1>온실가스 예측 시나리오</h1>
        <p>
          전력과 도시가스 사용량 조정에 따른 미래 온실가스 배출 시나리오를 탐색해 보세요.
          실측(2020~2025)과 예측(2025~2030) 데이터를 하나의 시각화로 비교할 수 있습니다.
        </p>
      </header>

      <form ref={formRef} className={styles["scenario-controls"]} onSubmit={handleApplyRegion}>
        <div className={styles["control-group"]}>
          <label htmlFor="cityId">시 코드</label>
          <input
            id="cityId"
            name="cityId"
            type="number"
            placeholder="예: 11000 (선택 사항)"
            defaultValue={cityId}
          />
          <p className={styles["helper-text"]}>
            다섯 자리 코드를 입력하면 자동으로 행정 코드에 맞게 조회합니다. 비워두면 전국 평균을 사용합니다.
          </p>
        </div>

        <div className={styles["control-group"]}>
          <label htmlFor="countyId">군/구 코드</label>
          <input
            id="countyId"
            name="countyId"
            type="number"
            placeholder="예: 11140 (선택 사항)"
            defaultValue={countyId}
          />
          <p className={styles["helper-text"]}>
            군/구 코드를 입력하면 해당 구역 기준으로 데이터를 조회합니다. 입력 시 시 코드는 무시됩니다.
          </p>
        </div>

        <div className={styles["slider-wrapper"]}>
          <div className={styles["slider-header"]}>
            <span>전기 사용량 증감률</span>
            <span className={styles["slider-value"]}>
              {electricityRate > 0 ? "+" : ""}
              {electricityRate}%
            </span>
          </div>
          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step}
            value={electricityRate}
            onChange={(e) => setElectricityRate(Number(e.target.value))}
          />
        </div>

        <div className={styles["slider-wrapper"]}>
          <div className={styles["slider-header"]}>
            <span>가스 사용량 증감률</span>
            <span className={styles["slider-value"]}>
              {gasRate > 0 ? "+" : ""}
              {gasRate}%
            </span>
          </div>
          <input
            type="range"
            min={sliderConfig.min}
            max={sliderConfig.max}
            step={sliderConfig.step}
            value={gasRate}
            onChange={(e) => setGasRate(Number(e.target.value))}
          />
        </div>

        <div className={styles["control-group"]}>
          <label>설정</label>
          <button className={styles["reset-button"]} type="submit">
            구역 데이터 불러오기
          </button>
          <button
            className={styles["reset-button"]}
            type="button"
            onClick={handleReset}
            style={{ backgroundColor: "#d9480f" }}
          >
            초기값으로 되돌리기
          </button>
          <button
            className={styles["reset-button"]}
            type="button"
            onClick={handleNationwide}
            style={{ backgroundColor: "#0f5132" }}
          >
            전국 데이터 보기
          </button>
        </div>
      </form>

      {loading && <div className={styles["loading-box"]}>데이터를 불러오는 중입니다...</div>}
      {error && <div className={styles["error-box"]}>{error}</div>}

      <div className={styles["scenario-main"]}>
        <div className={styles["chart-card"]}>
          <div className={styles["chart-header"]}>
            <h2>온실가스 배출량 추세</h2>
            <p>
              실측 데이터와 슬라이더 조정에 따른 예측 데이터를 한눈에 비교할 수 있습니다. 2025년 이후
              예측 값은 전력/가스 사용량 조정 비율에 따라 실시간으로 업데이트됩니다.
            </p>
            <div className={styles["chart-meta"]}>
              <span>실측 마지막 월: <strong>{lastActual?.label ?? "데이터 없음"}</strong></span>
              <span>실측 데이터 개수: {actualWithGhG.length}</span>
              <span>예측 데이터 개수: {baselinePredicted.length}</span>
            </div>
          </div>
          <div className={styles["chart-wrapper"]} style={{ height: "420px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className={styles["stats-grid"]}>
          <div className={styles["stat-card"]}>
            <h3>예측 기간 총 배출량</h3>
            <div className={styles["stat-value"]}>
              {stats.totalPredictedGhG.toLocaleString("ko-KR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              tCO₂
            </div>
            <p className={styles["helper-text"]}>2025~2030년 누적 예상 배출량</p>
          </div>

          <div className={styles["stat-card"]}>
            <h3>2030년 목표 대비</h3>
            <div className={styles["stat-value"]}>
              {stats.delta >= 0 ? "+" : ""}
              {stats.delta.toLocaleString("ko-KR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              tCO₂
            </div>
            <p className={styles["stat-diff"]}>
              목표 배출량:{" "}
              <span className={styles["stat-highlight"]}>
                {stats.target2030.toLocaleString("ko-KR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                tCO₂
              </span>
            </p>
            <p className={styles["helper-text"]}>
              달성률: {stats.achievement.toFixed(1)}%
            </p>
          </div>

          <div className={styles["stat-card"]}>
            <h3>에너지원별 비중</h3>
            <div className={styles["distribution-bar"]}>
              <span
                style={{
                  width: `${stats.electricityPortion}%`,
                  background: "#2563eb",
                }}
              />
              <span
                style={{
                  width: `${stats.gasPortion}%`,
                  background: "#f97316",
                }}
              />
            </div>
            <p className={styles["stat-diff"]}>
              전기 {stats.electricityPortion.toFixed(1)}% · 가스 {stats.gasPortion.toFixed(1)}%
            </p>
            <p className={styles["helper-text"]}>
              예측 기간 전체 에너지 사용량 기준 비중입니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PredictScenario;


