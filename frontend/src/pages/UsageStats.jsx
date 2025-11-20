import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import regionDistrictData from '../data/regionsData.json';

const yTickFormatter = (value) => {
  if (value === 0) return '0';
  return `${value / 1000000}MWh`;
};

const monthTableHeaders = [
  '지역 (구)', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'
];

function UsageStats() {
  
  const minMonth = "2020-01";
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const maxMonth = `${yyyy}-${mm}`;

  const [selectedRegion, setSelectedRegion] = useState('11');
  const [selectedMonth, setSelectedMonth] = useState(maxMonth);
  const [displayTableData, setDisplayTableData] = useState([]);
  const [dynamicChartData, setDynamicChartData] = useState([]);
  const [yAxisMax, setYAxisMax] = useState(0);
  const [selectedEnergy, setSelectedEnergy] = useState('전기');
  
  // Papa.parse, allCsvData, useEffect는 모두 제거되었습니다.

const handleSearch = async () => {
    if (!regionDistrictData[selectedRegion]) {
      setDisplayTableData([]);
      setDynamicChartData([]);
      setYAxisMax(0);
      return;
    }

    const targetYear = parseInt(selectedMonth.split('-')[0], 10);
    const yearStart = targetYear * 100 + 1;
    const yearEnd = targetYear * 100 + 12;

    try {
      // 1. [수정] EnergyController.java에 정의된 /api/energy 호출
      const response = await fetch(
        `/api/energy?cityId=${selectedRegion}` // countyId는 제거 (시(city)만 보냄)
      );

      if (!response.ok) {
        throw new Error('API 응답 실패.');
      }

      const apiResponse = await response.json();
      const allDataForCity = apiResponse.items; // API가 "items" 키로 데이터를 줌

      // 2. [수정] API가 날짜 필터링을 안 하므로, JS에서 직접 필터링
      // (EnergyVO가 DB 컬럼을 camelCase로 변환한다고 가정: YEAR_MONTH -> yearMonth)
      const filteredApiData = allDataForCity.filter(row => {
        if (!row.cityId || !row.yearMonth) return false;
        
        return String(row.cityId) === String(selectedRegion) &&
               row.yearMonth >= yearStart &&
               row.yearMonth <= yearEnd;
      });

      // 3. [수정] 모든 데이터 가공 로직이 try { ... } 블록 안으로 이동
      const monthlyTotals = new Array(12).fill(0);
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      const dataMap = new Map();
      const tableMonthlyTotalsKWh = new Array(12).fill(0);

      const districtObject = regionDistrictData[selectedRegion].districts;

      Object.entries(districtObject).forEach(([guCode, guName]) => {
        dataMap.set(guCode, { // key: "48121"
          gu: guName, // value: "창원시 의창구"
          '1월': '-', '2월': '-', '3월': '-', '4월': '-', '5월': '-', '6월': '-',
          '7월': '-', '8월': '-', '9월': '-', '10월': '-', '11월': '-', '12월': '-'
        });
      });

      const isDataAvailableForChart = (selectedEnergy !== '전체');

      // 4. [수정] DB 스키마 및 EnergyVO에 맞게 컬럼명 변경
      filteredApiData.forEach(row => {
        // [중요] API의 row.countyId (예: 48121)
        const guCode = String(row.countyId).trim(); 
        
        const month = row.yearMonth % 100; // API의 row.yearMonth
        const monthIndex = month - 1;
        const monthKey = `${month}월`;

        const electricUsage = row.useElect || 0; // API의 row.useElect
        const gasUsage = row.useGas || 0;      // API의 row.useGas

        let usageWh;

        if (selectedEnergy === '전기') {
          usageWh = electricUsage;
        } else if (selectedEnergy === '가스') {
          usageWh = gasUsage;
        } else {
          usageWh = undefined;
        }

        if (isDataAvailableForChart && usageWh !== undefined && monthIndex >= 0 && monthIndex < 12) {
            monthlyTotals[monthIndex] += usageWh;
        }
        
        const tableUsageWh = (selectedEnergy === '전기') ? electricUsage : gasUsage;

        // '전체'가 아니고, 해당 에너지 데이터가 없으면 이 행은 스킵
        if (usageWh === undefined && selectedEnergy !== '전체') return;

        const usageInKWh = Math.round(tableUsageWh / 1000);

        // [중요] dataMap.has(guCode)
        // 이 check가 성공해야 `image_49223a.png` 같은 문제가 해결됩니다.
        // `regionsData.json`의 key와 `row.countyId`가 일치해야 합니다.
        if (dataMap.has(guCode)) {
          const guData = dataMap.get(guCode);
          if (!isNaN(usageInKWh) && usageInKWh > 0) { 
            const currentUsage = guData[monthKey] === '-' ? 0 : guData[monthKey];
            guData[monthKey] = currentUsage + usageInKWh;
            dataMap.set(guCode, guData); // dataMap 업데이트

            if (monthIndex >= 0 && monthIndex < 12) {
              tableMonthlyTotalsKWh[monthIndex] += usageInKWh; // 총계 업데이트
            }
          }
        }
      });

      // 5. [수정] 모든 state 업데이트 로직도 try 블록의 마지막에 위치
      const maxUsage = Math.max(...monthlyTotals);
      const calculatedYMax = isDataAvailableForChart
          ? Math.ceil((maxUsage * 1.1) / 1000000) * 1000000
          : 1000000;

      const newChartData = monthNames.map((name, index) => ({
        name: name,
        사용량: monthlyTotals[index]
      }));

      setDynamicChartData(newChartData);
      setYAxisMax(calculatedYMax);

      const regionName = regionDistrictData[selectedRegion]
        ? regionDistrictData[selectedRegion].name
        : '';

      const totalRow = { gu: `${regionName} 전체` };
      monthNames.forEach((name, index) => {
        const totalKWh = tableMonthlyTotalsKWh[index];
        totalRow[name] = totalKWh > 0 ? totalKWh : '-';
      });

      setDisplayTableData([totalRow, ...Array.from(dataMap.values())]);

    } catch (error) {
      console.error("API 데이터 조회 오류:", error);
      setDisplayTableData([]);
      setDynamicChartData([]);
      setYAxisMax(0);
    }
  }; // <-- handleSearch 함수가 여기서 닫혀야 합니다.
  
  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  const renderTableContent = () => {
    // ... (renderTableContent 로직은 기존과 동일) ...
    return (
      <table className="stats-table">
        <thead>
          <tr>
            {monthTableHeaders.map(header => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayTableData.map((row, index) => (
            <tr 
              key={row.gu}
              style={{
                fontWeight: index === 0 ? 'bold' : 'normal',
                backgroundColor: index === 0 ? '#f9f9f9' : 'transparent'
              }}
            >
              <td>{row.gu}</td>
              {monthTableHeaders.slice(1).map(monthKey => (
                <td key={monthKey}>
                  {typeof row[monthKey] === 'number'
                    ? row[monthKey].toLocaleString()
                    : row[monthKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ... (return JSX 부분은 기존과 동일) ...
  return (
    <div className="stats-sidebar-layout">
      
      {/* 9. 왼쪽 사이드바 */}
      <aside className="stats-sidebar">
        <div className="sidebar-section">
          <h4>날짜 범위 선택</h4>
          <input
            type="month"
            className="stats-input"
            min={minMonth}
            max={maxMonth}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        
        <div className="sidebar-section">
          <h4>데이터 필터</h4>
          <label>에너지원</label>
          <select 
            className="stats-input"
            value={selectedEnergy}
            onChange={(e) => setSelectedEnergy(e.target.value)}
          >
            <option>전체</option>
            <option value="전기">전기에너지(MWh)</option>
            <option value="가스">가스에너지(MWh)</option>
          </select>
          <label>지역</label>
          <select 
            className="stats-input"
            value={selectedRegion}
            onChange={handleRegionChange}
          >
            {Object.keys(regionDistrictData).map(regionCode => (
              <option key={regionCode} value={regionCode}>
                {regionDistrictData[regionCode].name}
              </option>
            ))}
          </select>
        </div>

        <div className="sidebar-section">
          <button className="stats-button-primary" onClick={handleSearch}>데이터 조회</button>
        </div>
      </aside>

      {/* 10. 오른쪽 메인 콘텐츠 */}
      <main className="main-content">
        <h2>에너지 사용량 통계</h2>

        {/* 11. 차트 섹션 */}
        <div className="chart-section">
          <h3>월별 에너지 소비 추세</h3>
            <p>
              {regionDistrictData[selectedRegion] ? regionDistrictData[selectedRegion].name : '...'}의 {selectedMonth.split('-')[0]}년 {selectedEnergy === ' 전체' ? ' 에너지 데이터를 선택해 주세요.' : selectedEnergy + ' 소비량 변화를 보여줍니다'}
            </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={dynamicChartData}
                margin={{ top : 30, right: 30, left: 50, bottom: 5}}
              >
                <CartesianGrid strokeDasharray="3 3"/>

                <XAxis
                  dataKey="name"
                  scale="point"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yTickFormatter}
                  domain={[0, yAxisMax]}
                  tickCount={5}
                  tick={{ fontSize: 13 }}
                  label={{ value: '사용량(MWh)', position: 'top', offset: 17, fontWeight: "bold", fontSize: 14, fill: "#333"}}
                />
                
                <Tooltip
                  formatter={(value) => [`${(value / 1000).toLocaleString()} kWh`, '사용량']}
                />

                <Area
                  type="monotone"
                  dataKey="사용량"
                  stroke="#ffbb40"
                  fill="#ffd54f"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4, fill: '#ffbb40' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 13. 테이블 섹션 */}
        <div className="table-section">
          <h3>
            {(!regionDistrictData[selectedRegion])
              ? '상세 에너지 소비 데이터'
              : `${regionDistrictData[selectedRegion].name} ${selectedMonth.split('-')[0]}년 구별 상세 데이터`
            }
          </h3>
          <p>선택된 필터에 따른 상세 에너지 소비 내역입니다.</p>
          <div className="stats-table-container">
            {renderTableContent()}
          </div>
        </div>
        
      </main>
    </div>
  );
}

export default UsageStats;