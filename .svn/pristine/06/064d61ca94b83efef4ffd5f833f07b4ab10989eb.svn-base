// src/services/energyCsvLoader.js
// PapaParse 기반: BOM/HTML 가드/빈줄/따옴표/구분자 자동 처리 + 숫자 자동 변환

import Papa from "papaparse";

export async function loadEnergyCSV(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);

  // 텍스트 로드 + BOM 제거
  const text = (await res.text()).replace(/^\uFEFF/, "");

  // HTML을 잘못 읽는 경우(경로 오류) 바로 감지
  const sniff = text.slice(0, 200).toLowerCase();
  if (sniff.includes("<!doctype") || sniff.includes("<html")) {
    throw new Error("CSV_URL_RETURNED_HTML");
  }

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: true, // 숫자/불리언 자동 변환
    transformHeader: (h) =>
      String(h)
        .replace(/\([^)]*\)/g, "") // (MWh), (GJ) 같은 단위 제거
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
  });

  const rows = Array.isArray(parsed.data) ? parsed.data : [];

  // "1,234" 같은 쉼표숫자도 숫자로 바꿔 주고 싶다면(선택)
  for (const r of rows) {
    for (const k in r) {
      const v = r[k];
      if (typeof v === "string" && /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(v)) {
        r[k] = Number(v.replace(/,/g, ""));
      }
    }
  }

  if (rows.length) {
    console.info("[CSV] headers =", parsed.meta.fields);
    console.info("[CSV] first row =", rows[0]);
  } else {
    console.warn("[CSV] parsed rows = 0");
  }

  return rows;
}
