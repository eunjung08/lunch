/**
 * NEIS Open API (학교정보/급식) 기반 단일 페이지 앱
 * - schoolInfo: 학교 검색
 * - mealServiceDietInfo: 급식 조회
 *
 * 주의: 프론트엔드에 API KEY를 넣으면 노출됩니다.
 * 실제 서비스라면 서버 프록시를 두는 것을 권장합니다.
 */

// 사용자가 준 키(데모용). 필요시 본인 키로 교체하세요.
const NEIS_API_KEY = "8d3c0212208c462a9a16af9a97e1c52d";
const NEIS_BASE = "https://open.neis.go.kr/hub";

const STORAGE_KEY = "lunch.selectedSchool.v1";

const $ = (id) => document.getElementById(id);

const els = {
  schoolQuery: $("schoolQuery"),
  searchBtn: $("searchBtn"),
  schoolSelect: $("schoolSelect"),
  schoolError: $("schoolError"),
  schoolSelectedMeta: $("schoolSelectedMeta"),

  dateInput: $("dateInput"),
  prevDayBtn: $("prevDayBtn"),
  todayBtn: $("todayBtn"),
  nextDayBtn: $("nextDayBtn"),
  fetchMealBtn: $("fetchMealBtn"),
  datePickerBtn: $("datePickerBtn"),

  status: $("status"),
  mealEmpty: $("mealEmpty"),
  mealResult: $("mealResult"),
  mealSchool: $("mealSchool"),
  mealDate: $("mealDate"),
  mealMenu: $("mealMenu"),
  mealNutrition: $("mealNutrition"),
  mealOrigin: $("mealOrigin"),
};

function setStatus(msg) {
  els.status.textContent = msg ?? "";
}

function setError(msg) {
  els.schoolError.textContent = msg ?? "";
}

function yyyyMmDdToYmd(dateStr) {
  // input[type=date] => YYYY-MM-DD
  return (dateStr || "").replaceAll("-", "");
}

function ymdToHuman(ymd) {
  if (!ymd || ymd.length !== 8) return "";
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(dateStr, deltaDays) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function fetchNeis(endpoint, params) {
  const url = new URL(`${NEIS_BASE}/${endpoint}`);
  const finalParams = {
    KEY: NEIS_API_KEY,
    Type: "json",
    pIndex: "1",
    pSize: "100",
    ...params,
  };
  Object.entries(finalParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    throw new Error(`요청 실패: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data;
}

function getNeisRows(data, rootName) {
  // NEIS JSON 형태: { rootName: [ { head: [...] }, { row: [...] } ] }
  const root = data?.[rootName];
  const rowContainer = Array.isArray(root) ? root.find((x) => x?.row) : null;
  const rows = rowContainer?.row;
  return Array.isArray(rows) ? rows : [];
}

function getNeisResultCode(data, rootName) {
  const root = data?.[rootName];
  const head = Array.isArray(root) ? root.find((x) => x?.head) : null;
  const result = head?.head?.find((x) => x?.RESULT)?.RESULT;
  const code = result?.CODE;
  const message = result?.MESSAGE;
  return { code, message };
}

function formatSchoolOptionLabel(row) {
  const name = row.SCHUL_NM ?? "";
  const address = row.ORG_RDNMA ?? row.ORG_RDNDA ?? "";
  const office = row.ATPT_OFCDC_SC_NM ?? "";
  return `${name} · ${office}${address ? ` · ${address}` : ""}`;
}

function saveSelectedSchool(school) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(school));
  } catch {
    // ignore
  }
}

function loadSelectedSchool() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.SCHUL_NM &&
      parsed.ATPT_OFCDC_SC_CODE &&
      parsed.SD_SCHUL_CODE
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setSchoolSelectOptions(rows, selectedKey) {
  els.schoolSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = rows.length ? "학교를 선택하세요" : "검색 결과가 없습니다";
  els.schoolSelect.appendChild(placeholder);

  for (const row of rows) {
    const opt = document.createElement("option");
    const key = `${row.ATPT_OFCDC_SC_CODE}|${row.SD_SCHUL_CODE}`;
    opt.value = key;
    opt.textContent = formatSchoolOptionLabel(row);
    opt.dataset.school = JSON.stringify({
      SCHUL_NM: row.SCHUL_NM,
      ATPT_OFCDC_SC_NM: row.ATPT_OFCDC_SC_NM,
      ATPT_OFCDC_SC_CODE: row.ATPT_OFCDC_SC_CODE,
      SD_SCHUL_CODE: row.SD_SCHUL_CODE,
      ORG_RDNMA: row.ORG_RDNMA ?? "",
    });
    if (selectedKey && selectedKey === key) opt.selected = true;
    els.schoolSelect.appendChild(opt);
  }

  els.schoolSelect.disabled = rows.length === 0;
}

function getSelectedSchool() {
  const opt = els.schoolSelect.selectedOptions?.[0];
  if (!opt) return null;
  const schoolJson = opt.dataset.school;
  if (!schoolJson) return null;
  try {
    return JSON.parse(schoolJson);
  } catch {
    return null;
  }
}

function renderSelectedMeta(school) {
  if (!school) {
    els.schoolSelectedMeta.textContent = "";
    return;
  }
  const parts = [
    school.ATPT_OFCDC_SC_NM ? `교육청: ${school.ATPT_OFCDC_SC_NM}` : null,
    school.ORG_RDNMA ? `주소: ${school.ORG_RDNMA}` : null,
  ].filter(Boolean);
  els.schoolSelectedMeta.textContent = parts.join(" · ");
}

function normalizeMenuItems(ddishNm) {
  // DDISH_NM: "쌀밥<br/>국(1.5.6.)<br/>..."
  const raw = String(ddishNm || "");
  if (!raw) return [];

  return raw
    .replaceAll("<br/>", "\n")
    .replaceAll("<br />", "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " "));
}

function clearMeal() {
  els.mealResult.hidden = true;
  els.mealEmpty.hidden = false;
  els.mealMenu.innerHTML = "";
  els.mealNutrition.textContent = "";
  els.mealOrigin.textContent = "";
  els.mealSchool.textContent = "";
  els.mealDate.textContent = "";
}

function renderMeal({ school, ymd, row }) {
  const menu = normalizeMenuItems(row?.DDISH_NM);
  const cal = row?.CAL_INFO ? String(row.CAL_INFO).trim() : "";
  const ntr = row?.NTR_INFO ? String(row.NTR_INFO).trim() : "";
  const origin = row?.ORPLC_INFO ? String(row.ORPLC_INFO).trim() : "";

  els.mealSchool.textContent = school?.SCHUL_NM ?? "";
  els.mealDate.textContent = ymdToHuman(ymd);

  els.mealMenu.innerHTML = "";
  if (menu.length === 0) {
    const li = document.createElement("li");
    li.textContent = "등록된 메뉴 정보가 없습니다.";
    els.mealMenu.appendChild(li);
  } else {
    for (const item of menu) {
      const li = document.createElement("li");
      li.textContent = item;
      els.mealMenu.appendChild(li);
    }
  }

  const nutritionText = [cal ? `칼로리: ${cal}` : null, ntr ? `영양정보:\n${ntr}` : null]
    .filter(Boolean)
    .join("\n\n");
  els.mealNutrition.textContent = nutritionText || "제공 정보가 없습니다.";

  els.mealOrigin.textContent = origin || "제공 정보가 없습니다.";

  els.mealEmpty.hidden = true;
  els.mealResult.hidden = false;
}

async function searchSchools(query) {
  const data = await fetchNeis("schoolInfo", {
    SCHUL_NM: query,
  });

  const { code, message } = getNeisResultCode(data, "schoolInfo");
  if (code && code !== "INFO-000") {
    // INFO-200: 해당하는 데이터가 없습니다. (빈 결과)
    if (code === "INFO-200") return [];
    throw new Error(message || `학교 검색 오류(${code})`);
  }

  const rows = getNeisRows(data, "schoolInfo");
  return rows;
}

async function fetchMeal({ officeCode, schoolCode, ymd }) {
  const data = await fetchNeis("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: ymd,
  });

  const { code, message } = getNeisResultCode(data, "mealServiceDietInfo");
  if (code && code !== "INFO-000") {
    if (code === "INFO-200") return null;
    throw new Error(message || `급식 조회 오류(${code})`);
  }

  const rows = getNeisRows(data, "mealServiceDietInfo");
  if (!rows.length) return null;

  // 일반적으로 1건이지만, 조식/중식/석식 등 다건일 수 있음.
  // 우선 첫 번째 건(중식이 보통) 표시.
  return rows[0];
}

function syncFetchButtonState() {
  const school = getSelectedSchool();
  const date = els.dateInput.value;
  els.fetchMealBtn.disabled = !school || !date;
}

async function handleSearch() {
  const q = els.schoolQuery.value.trim();
  setError("");
  clearMeal();
  renderSelectedMeta(null);

  if (q.length < 2) {
    setError("학교명은 2글자 이상 입력해 주세요.");
    els.schoolSelect.disabled = true;
    els.schoolSelect.innerHTML = `<option value="">학교를 검색해 주세요</option>`;
    syncFetchButtonState();
    return;
  }

  try {
    setStatus("학교 검색 중…");
    els.searchBtn.disabled = true;
    els.schoolSelect.disabled = true;

    const rows = await searchSchools(q);
    setSchoolSelectOptions(rows);
    if (!rows.length) {
      setError("검색 결과가 없습니다. 다른 키워드로 검색해 보세요.");
    }
    setStatus(rows.length ? "학교를 선택해 주세요." : "");
  } catch (e) {
    setError(e?.message || "학교 검색 중 오류가 발생했습니다.");
    setStatus("");
  } finally {
    els.searchBtn.disabled = false;
    syncFetchButtonState();
  }
}

async function handleFetchMeal() {
  setStatus("");
  const school = getSelectedSchool();
  const dateStr = els.dateInput.value;
  const ymd = yyyyMmDdToYmd(dateStr);

  if (!school) {
    setStatus("학교를 먼저 선택해 주세요.");
    return;
  }
  if (!ymd) {
    setStatus("날짜를 먼저 선택해 주세요.");
    return;
  }

  try {
    setStatus("급식 조회 중…");
    els.fetchMealBtn.disabled = true;
    clearMeal();

    const row = await fetchMeal({
      officeCode: school.ATPT_OFCDC_SC_CODE,
      schoolCode: school.SD_SCHUL_CODE,
      ymd,
    });

    if (!row) {
      setStatus("해당 날짜에 등록된 급식 정보가 없습니다.");
      return;
    }

    saveSelectedSchool(school);
    renderMeal({ school, ymd, row });
    setStatus("조회 완료");
  } catch (e) {
    setStatus(e?.message || "급식 조회 중 오류가 발생했습니다.");
  } finally {
    syncFetchButtonState();
  }
}

function init() {
  els.dateInput.value = todayStr();
  clearMeal();
  syncFetchButtonState();

  els.searchBtn.addEventListener("click", handleSearch);
  els.schoolQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  els.schoolSelect.addEventListener("change", () => {
    const school = getSelectedSchool();
    renderSelectedMeta(school);
    syncFetchButtonState();
    clearMeal();
  });

  els.dateInput.addEventListener("change", () => {
    syncFetchButtonState();
    clearMeal();
  });

  els.prevDayBtn.addEventListener("click", () => {
    if (!els.dateInput.value) els.dateInput.value = todayStr();
    els.dateInput.value = addDays(els.dateInput.value, -1);
    syncFetchButtonState();
    clearMeal();
  });

  els.todayBtn.addEventListener("click", () => {
    els.dateInput.value = todayStr();
    syncFetchButtonState();
    clearMeal();
  });

  els.nextDayBtn.addEventListener("click", () => {
    if (!els.dateInput.value) els.dateInput.value = todayStr();
    els.dateInput.value = addDays(els.dateInput.value, 1);
    syncFetchButtonState();
    clearMeal();
  });

  els.fetchMealBtn.addEventListener("click", handleFetchMeal);

  if (els.datePickerBtn) {
    els.datePickerBtn.addEventListener("click", () => {
      const input = els.dateInput;
      if (!input) return;
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    });
  }

  // 로컬 저장된 학교가 있으면, 안내 문구만 띄우고 빠른 재검색을 돕습니다.
  const saved = loadSelectedSchool();
  if (saved?.SCHUL_NM) {
    els.schoolQuery.value = saved.SCHUL_NM;
    setStatus("이전에 선택한 학교가 있어요. 검색 후 다시 선택해 주세요.");
  }
}

init();
