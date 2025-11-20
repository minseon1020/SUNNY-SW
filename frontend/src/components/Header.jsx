// src/components/Header.jsx
// 상단 헤더: 로고 + 네비게이션(메뉴 3개, 드롭다운)

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

// assets 폴더의 로고 이미지 사용 (파일명은 프로젝트에 맞게 변경 가능)
import logo from "../assets/sun.png"; // 예: logo.png, sun.png 등

export default function Header() {
  // 'main' | 'status' | 'stat' | null
  const [openMenu, setOpenMenu] = useState(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // 메뉴 토글 (클릭 이벤트 전파 중단)
  const toggleMenu = (menu, e) => {
    e.stopPropagation();
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // 링크 클릭 시 드롭다운 닫기
  const closeAnd = (cb) => (e) => {
    setOpenMenu(null);
    if (typeof cb === "function") cb(e);
  };

  return (
    <header className="header">
      {/* 왼쪽: 로고 + 타이틀 */}
      <div className="header-left">
        <img src={logo} alt="에너지 로고" className="logo" />
        <div className="site-info">
          <h2>NSE</h2>
          <p>Nationwide Sunny Energy</p>
        </div>
      </div>

      {/* 오른쪽: 내비게이션 */}
      <nav className="nav">
        <ul>
          {/* 메인 */}
          <li className="dropdown nav-item" onClick={(e) => toggleMenu("main", e)}>
            <span className="dropdown-title">메인</span>
            {openMenu === "main" && (
              <div className="dropdown-area">
                <div className="dropdown-menu">
                  <ul>
                    <li>
                      <Link to="/" onClick={closeAnd()}>
                        대시보드
                      </Link>
                    </li>
                    <li>
                      <Link to="/scenario" onClick={closeAnd()}>
                        온실가스 예측 시나리오
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </li>

          {/* 에너지 현황 */}
          <li className="dropdown nav-item" onClick={(e) => toggleMenu("status", e)}>
            <span className="dropdown-title">에너지 현황</span>
            {openMenu === "status" && (
              <div className="dropdown-area">
                <div className="dropdown-menu">
                  <ul>
                    <li>
                      <Link to="/energy-usage" onClick={closeAnd()}>
                        에너지 사용량 현황
                      </Link>
                    </li>
                    <li>
                      <Link to="/gas-emission" onClick={closeAnd()}>
                        온실가스 배출량 현황
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </li>

          {/* 에너지 통계 */}
          <li className="dropdown nav-item" onClick={(e) => toggleMenu("stat", e)}>
            <span className="dropdown-title">에너지 통계</span>
            {openMenu === "stat" && (
              <div className="dropdown-area">
                <div className="dropdown-menu">
                  <ul>
                    <li>
                      <Link to="/usage-stats" onClick={closeAnd()}>
                        에너지 사용량 통계
                      </Link>
                    </li>
                    <li>
                      <Link to="/gas-stats" onClick={closeAnd()}>
                        온실가스 배출량 통계
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
