import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import 'chartjs-adapter-date-fns';
import 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { callback } from 'chart.js/helpers';

// Chart.js에 zoom 플러그인 등록
Chart.register(zoomPlugin);

// [수정] 예측 데이터 시작/종료일
const PREDICT_MIN_STR = "2025-07-01";
const PREDICT_MAX_STR = "2030-12-01";
const ACTUAL_DATA_CUTOFF_YEARMONTH = 202507; // 예측 데이터 시작 기준

function parseYearMonth(ym) {
  if (!ym) return null;
  const s = String(ym);
  if (s.length !== 6) return null;
  return `${s.substring(0, 4)}-${s.substring(4, 6)}`;
}

const getChartOptions = (energyType) => {
  const unit = 'MWh'; // 단위 통일
  const initMin = new Date(PREDICT_MIN_STR).valueOf();
  const initMax = new Date(PREDICT_MAX_STR).valueOf();

  return {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
    scales: {
      x: {
        type: 'time',
        min: initMin, // [수정]
        max: initMax,
        time: {
          unit: 'month',
          stepSize: 4,
          tooltipFormat: 'yyyy-MM', 
          displayFormats: {
            month: 'yyyy-MM'
          }
        },
        ticks: {
        },
        title: { display: true, text: '기간' },
      },
      y: {
        title: { 
          display: true, 
          text: `사용량 (${unit})`,
        },
        ticks: {
          callback: (value) => value.toLocaleString(),
        },
      },
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()} MWh`;
          }
        }
      }
    },
  };
};

/**
 * 에너지 예측 차트 컴포넌트
 */
function EnergyForecast({ selectedRegion }) {
  // [수정] 실제 데이터(actualData) 상태 제거, 예측 데이터만 사용
  const [predictData, setPredictData] = useState([]); // PredictEnergyVO[]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [isNational, setIsNational] = useState(true);
  const [energyType, setEnergyType] = useState('electric'); // 탭 상태
  
  /** ✅ 1) selectedRegion이 바뀔 때마다 실행 */
  useEffect(() => {
    const fetchPredictData = async () => {
      setLoading(true);
      setErr(null);
      setPredictData([]); // 예측 데이터 초기화

      let cityId = 0;
      let countyId = 0;

      if (selectedRegion) {
        cityId = selectedRegion.cityId || 0;
        countyId = selectedRegion.countyId || 0;
        setIsNational(false);
      } else {
        setIsNational(true);
      }
      
      try {
        // [수정] 예측 데이터 API만 호출
        const predictRes = await fetch(`/api/predict-energy?cityId=${cityId}&countyId=${countyId}`);

        if (!predictRes.ok) {
          throw new Error("예측 데이터 서버 응답 오류");
        }

        const predictJson = await predictRes.json();
        setPredictData(predictJson.items || []); // PredictEnergyVO[]

      } catch (err) {
        console.error("예측 데이터 로드 오류:", err);
        setErr(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictData();
  }, [selectedRegion]);

  /** ✅ 2) [수정] Chart.js 데이터 구조로 변환 (예측 전용 Area 차트) */
  const chartData = useMemo(() => {
    const dataMap = new Map();

    // 1. 예측 데이터(PredictEnergyVO)만 매핑
    predictData.forEach(row => {
      dataMap.set(row.yearMonth, {
        x: parseYearMonth(row.yearMonth), // x축 시간
        predictElect: row.preElect,
        predictGas: row.preGas,
        yearMonth: row.yearMonth
      });
    });
    
    // 2. Map을 배열로 변환하고 정렬
    const combinedData = Array.from(dataMap.values())
      .filter(d => d.x && d.yearMonth) // 날짜 파싱 성공한 것만
      .sort((a, b) => new Date(a.x) - new Date(b.x));

    const dataKeyPredict = energyType === 'electric' ? 'predictElect' : 'predictGas';
    const label = energyType === 'electric' ? '전기' : '가스';

    // 3. [수정] "예측" 데이터만 필터링
    const predictPoints = combinedData
      .filter(d => d[dataKeyPredict] != null && d.yearMonth >= ACTUAL_DATA_CUTOFF_YEARMONTH) // 예측 데이터가 있는 항목만
      .map(d => ({ x: d.x, y: d[dataKeyPredict] }));
      
    // 4. [수정] Area 차트용 색상 정의
    const predictColor = energyType === 'electric' ? '#FF6384' : '#FF9F40'; // 예측(전기)=빨강, 예측(가스)=주황
    const predictBackgroundColor = energyType === 'electric' ? 'rgba(255, 99, 132, 0.2)' : 'rgba(255, 159, 64, 0.2)'; // 반투명 배경

    return {
      datasets: [
        // [수정] "실제" 데이터셋 제거, "예측" 데이터셋만 남김
        {
          label: `${label} 사용량 예측(MWh)`,
          data: predictPoints, // "예측" 데이터만 사용
          borderColor: predictColor,
          backgroundColor: predictBackgroundColor, // [수정] 반투명 배경색
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: true,     // [추가]
          tension: 0.3, // [추가] 부드러운 곡선
        }
      ]
    };

  }, [predictData, energyType]); // [수정] actualData 의존성 제거

  /** ✅ 3) Chart.js 옵션 (useMemo) */
  const chartOptions = useMemo(() => getChartOptions(energyType), [energyType]);

  // ▼▼▼ 렌더링(JSX) 부분 ▼▼▼
  return (
    <>
      <h3>
        {isNational
          ? "전국 총합"
          : `${selectedRegion?.cityName || ""} ${selectedRegion?.countyName || ""}`.trim()}
        ~2030 에너지 예측
      </h3>
      <div className="sub-tabs">
        <button
          className={energyType === "electric" ? "active" : ""}
          onClick={() => setEnergyType("electric")}
        >
          ⚡ 전기 예측
        </button>
        <button
          className={energyType === "gas" ? "active" : ""}
          onClick={() => setEnergyType("gas")}
        >
          🔥 가스 예측
        </button>
      </div>

      {/* [수정 완료] height: 300으로 유지 */}
      <div className="chart-container" style={{ height: 300 }}>
        {loading && <div className="chart-placeholder">데이터 로딩 중...</div>}
        {err && <div className="chart-placeholder">오류: {err}</div>}
        {!loading && !err && chartData.datasets[0].data.length === 0 && (
          <div className="chart-placeholder">데이터가 없습니다.</div>
        )}
        {!loading && !err && chartData.datasets[0].data.length > 0 && (
            <Line data={chartData} options={chartOptions} />
        )}
      </div>
      
      {/* [수정 완료] 줌 리셋 버튼 제거 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: '0 10px' }}>
      </div>
    </>
  );
}

export default EnergyForecast;