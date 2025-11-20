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

// [수정] Papa.parse 임포트 제거
import regionDistrictData from '../data/regionsData.json';

const yTickFormatter = (value) => {
  if (value === 0) return '0';
  return `${value.toLocaleString()}`;
};

const monthTableHeaders = [
  '지역 (구)', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'
];

function GasStats() {
  
  const minMonth = "2020-01";
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const maxMonth = `${yyyy}-${mm}`;

  const [selectedRegion, setSelectedRegion] = useState('11');
  const [selectedMonth, setSelectedMonth] = useState(maxMonth);
  // [수정] allCsvData state 제거
  const [displayTableData, setDisplayTableData] = useState([]);
  const [dynamicChartData, setDynamicChartData] = useState([]);
  const [yAxisMax, setYAxisMax] = useState(0); // 1. [수정] 정상적으로 선언
  const [selectedEnergy, setSelectedEnergy] = useState('전기');

  // [수정] CSV 로드용 useEffect 제거
  
  const handleSearch = async () => { // 2. [수정] async 추가
    if (!regionDistrictData[selectedRegion]) {
      setDisplayTableData([]);
      setDynamicChartData([]);
      setYAxisMax(0);
      return;
    }

    const targetYear = parseInt(selectedMonth.split('-')[0], 10);
    const yearStart = targetYear * 100 + 1;
    const yearEnd = targetYear * 100 + 12;

    const GHG_ELECTRICITY_COEFF = 0.4541;
    const GHG_GAS_COEFF = 0.204;

    try {
      // 3. [수정] API 호출
      const response = await fetch(
        `/api/energy?cityId=${selectedRegion}`
      );
      if (!response.ok) {
        throw new Error('API 응답 실패.');
      }
      const apiResponse = await response.json();
      const allDataForCity = apiResponse.items; //

      // 4. [수정] JS에서 날짜 필터링 (API가 날짜 필터링을 지원하지 않음)
      // (EnergyVO가 DB 컬럼을 camelCase로 변환한다고 가정: YEAR_MONTH -> yearMonth)
      const filteredApiData = allDataForCity.filter(row => {
        if (!row.cityId || !row.yearMonth) return false;
        
        return String(row.cityId) === String(selectedRegion) &&
               row.yearMonth >= yearStart &&
               row.yearMonth <= yearEnd;
      });
      
      // 5. [수정] 모든 가공 로직을 try 블록 안으로 이동
      const monthlyTotals = new Array(12).fill(0);
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      const dataMap = new Map();
      const tableMonthlyTotalsEmissions = new Array(12).fill(0);

      const districtObject = regionDistrictData[selectedRegion].districts;

      Object.entries(districtObject).forEach(([guCode, guName]) => {
        dataMap.set(guCode, {
          gu: guName, 
          '1월': '-', '2월': '-', '3월': '-', '4월': '-', '5월': '-', '6월': '-',
          '7월': '-', '8월': '-', '9월': '-', '10월': '-', '11월': '-', '12월': '-'
        });
      });
      
      // 6. [수정] DB 스키마 및 EnergyVO에 맞게 컬럼명 변경
      filteredApiData.forEach(row => { // filteredCsvData -> filteredApiData
        const guCode = String(row.countyId).trim(); // COUNTY_ID -> countyId
        const month = row.yearMonth % 100;         // YEAR_MONTH -> yearMonth
        const monthIndex = month - 1;
        const monthKey = `${month}월`;

        const electricUsage = row.useElect || 0; // USE_ELECT -> useElect
        const gasUsage = row.useGas || 0;      // USE_GAS -> useGas
        let emissions = 0;

        if (selectedEnergy === '전기') {
          emissions = (electricUsage / 1000000) * GHG_ELECTRICITY_COEFF;
        } else if (selectedEnergy === '가스') {
          emissions = (gasUsage / 1000000) * GHG_GAS_COEFF;
        } else if (selectedEnergy === '전체') {
          const electricEmissions = (electricUsage / 1000000) * GHG_ELECTRICITY_COEFF;
          const gasEmissions = (gasUsage / 1000000) * GHG_GAS_COEFF;
          emissions = electricEmissions + gasEmissions;
        }

        if (emissions > 0 && monthIndex >= 0 && monthIndex < 12) {
            monthlyTotals[monthIndex] += emissions;
        }

        if (emissions === 0 && selectedEnergy !== '전체') return;

        const tableEmissions = parseFloat(emissions.toFixed(3));

        if (dataMap.has(guCode)) {
          const guData = dataMap.get(guCode);
          if (!isNaN(tableEmissions)) {
            const currentEmission = guData[monthKey] === '-' ? 0 : guData[monthKey];
            guData[monthKey] = currentEmission + tableEmissions;
            dataMap.set(guCode, guData);

            if (monthIndex >= 0 && monthIndex < 12) {
              tableMonthlyTotalsEmissions[monthIndex] += tableEmissions;
            }
          }
        }
      });

      const maxEmission = Math.max(...monthlyTotals);
      const calculatedYMax = (maxEmission > 0)
          ? Math.ceil(maxEmission * 1.1 * 100) / 100 
          : 1000;

      const newChartData = monthNames.map((name, index) => ({
        name: name,
        배출량: parseFloat(monthlyTotals[index].toFixed(2))
      }));

      setDynamicChartData(newChartData);
      setYAxisMax(calculatedYMax);

      const formattedTableData = Array.from(dataMap.values()).map(row => {
        const newRow = { ...row };
        monthNames.forEach(monthKey => {
          if (typeof newRow[monthKey] === 'number' && newRow[monthKey] > 0) {
            newRow[monthKey] = parseFloat(newRow[monthKey].toFixed(3));
          }
        });
        return newRow;
      });

      const regionName = regionDistrictData[selectedRegion]
        ? regionDistrictData[selectedRegion].name
        : '';

      const totalRow = { gu: `${regionName} 전체` };
      monthNames.forEach((name, index) => {
        const totalEmission = tableMonthlyTotalsEmissions[index];
        totalRow[name] = totalEmission > 0 ? parseFloat(totalEmission.toFixed(3)) : '-';
      });

      setDisplayTableData([totalRow, ...formattedTableData]);

    } catch (error) {
      console.error("API 데이터 조회 오류:", error);
      setDisplayTableData([]);
      setDynamicChartData([]);
      setYAxisMax(0);
    }
  };
  
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
            <option value="전기">전기에너지 배출량(tCO2eq)</option>
            <option value="가스">가스에너지 배출량(tCO2eq)</option>
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
        <h2>온실가스 배출량 통계</h2>
        
        {/* 11. 차트 섹션 */}
        <div className="chart-section">
          <h3>온실가스 배출량 추세</h3>
            <p>
              {/* [수정] 지역 이름이 나오도록 변경 */}
              {regionDistrictData[selectedRegion] ? regionDistrictData[selectedRegion].name : ''}의 {selectedMonth.split('-')[0]}년 {selectedEnergy} {selectedEnergy === '전체' ? '총' : ''} 소비량별 온실가스 배출량 추세를 보여줍니다
            </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={dynamicChartData}
                margin={{ top : 30, right: 30, left: 50, bottom: 5}}
              >
                <CartesianGrid strokeDasharray="3 3" />

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
                  tickFormatter={value => value.toLocaleString()}
                  domain={[0, yAxisMax]} // [수정] 주석 해제
                  tickCount={5}
                  tick={{ fontSize: 13 }}
                  label={{ value: '배출량(tCO2eq)', position: 'top', offset: 17, fontWeight: "bold", fontSize: 14, fill: "#333"}}
                />
                
                <Tooltip
                  formatter={(value) => [`${value.toLocaleString()} tCO2eq`, '온실가스 배출량']}
                />

                <Area
                  type="monotone"
                  dataKey="배출량"
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
          <p>선택된 필터에 따른 상세 배출량 통계입니다.</p>
          <div className="stats-table-container">
            {renderTableContent()}
          </div>
        </div>
        
      </main>
    </div>
  );
}

export default GasStats;