# lunch (전국 급식 메뉴)

전국 학교 급식 메뉴를 **학교 검색 + 날짜 선택**으로 빠르게 조회할 수 있는 **반응형 웹앱**입니다.

## 기능

- **학교 검색**: 학교명으로 검색 후 목록에서 선택
- **날짜별 급식 조회**: 날짜 선택(전날/오늘/다음날 버튼 포함)
- **급식 정보 표시**
  - 메뉴(알레르기 정보는 원문 그대로 포함될 수 있음)
  - 칼로리/영양정보(제공 시)
  - 원산지 정보(제공 시)

## 사용 기술

- HTML / CSS / JavaScript (Vanilla)
- 데이터: NEIS(교육행정정보시스템) Open API

## 실행 방법 (로컬)

정적 페이지이므로 아래 중 하나로 실행하면 됩니다.

### 1) VS Code / Cursor Live Server

- `index.html` 우클릭 → **Open with Live Server**

### 2) Python 간단 서버

프로젝트 폴더에서:

```bash
python -m http.server 5500
```

브라우저에서 `http://localhost:5500` 접속

## NEIS API KEY 설정

현재는 데모를 위해 `app.js`에 `NEIS_API_KEY`가 들어있습니다.

- 파일: `app.js`
- 변수: `NEIS_API_KEY`

주의: **프론트엔드에 KEY를 넣으면 노출됩니다.** 실서비스라면 서버 프록시(백엔드)로 감싸는 방식을 권장합니다.

## 파일 구성

- `index.html`: 화면(UI)
- `styles.css`: 반응형 스타일
- `app.js`: 학교 검색/급식 조회 로직

## 참고

- 학교 검색: `schoolInfo`
- 급식 조회: `mealServiceDietInfo`

