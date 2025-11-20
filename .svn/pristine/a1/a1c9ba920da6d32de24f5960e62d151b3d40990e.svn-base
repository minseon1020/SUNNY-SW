import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import GasEmission from './pages/GasEmission';
import UsageStats from './pages/UsageStats';
import GasStats from './pages/GasStats';
import EnergyUsage from './pages/EnergyUsage';
import PredictScenario from "./pages/PredictScenario";
import "./App.css";

function App() {
  return (
    <Router>
      {/* 상단 메뉴 */}
      <Header />

      {/* 페이지 본문 */}
      <main className="pt-20 min-h-[80vh] bg-[#fffbea]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="scenario" element={<PredictScenario />} />
          <Route path="gas-emission" element={<GasEmission />} />
          <Route path="energy-usage" element={<EnergyUsage />} />
          <Route path="usage-stats" element={<UsageStats />} />
          <Route path="gas-stats" element={<GasStats />} />
        </Routes>
      </main>

      {/* 하단 푸터 */}
      <Footer />
    </Router>
  );
}

export default App;
