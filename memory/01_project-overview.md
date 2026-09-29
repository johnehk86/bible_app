# 01. 프로젝트 개요 — 말씀암송 앱

> 분석 기준일: 2026-09-29

## 한 줄 요약
한국어-아랍어 이중 언어 성경 암송 웹 앱. React 18 + Vite 5, 서버 없이 정적 배포. 추후 Android(WebView/Capacitor)로 래핑 예정.

## 폴더 구조 (프로젝트 루트: `D:\01_WorkPlace\260_Bible_App_Project`)
```
260_Bible_App_Project/
├─ bible-app-spec.md          # Phase 1 요구사항 문서 (files/ 안에도 동일본 있음)
├─ files/                     # 원본 자료
│  ├─ DA 1단계 암송구절(한국어-아랍어).xlsx   # 원본 텍스트 (한국어/아랍어/한글음가, 시트별 구절)
│  └─ DA 1단계 암송구절(아랍어) 음원/        # 원본 mp3 13개 (한글 파일명)
├─ files.zip, *.mp3           # 원본 사본 (루트에 굴러다니는 파일)
├─ memory/                    # ← 이 분석 문서들
└─ app/                       # 실제 앱 코드
   ├─ index.html              # Google Fonts(Noto Sans KR, Noto Naskh Arabic) 로드
   ├─ vite.config.js          # base: './' (상대경로 빌드 → 앱 래핑 대비)
   ├─ package.json            # react, react-dom / vite, @vitejs/plugin-react 만 사용
   ├─ public/assets/          # mp3 13개(영문 파일명) + bg-landscape.jpg
   ├─ dist/                   # 빌드 결과물 (2026-09-24 빌드)
   └─ src/
      ├─ main.jsx             # StrictMode + createRoot
      ├─ App.jsx              # 화면 전환(상태 기반 라우팅)
      ├─ index.css            # 전역 리셋 + CSS 변수(다크 테마)
      ├─ data/verses.js       # PASSAGES(13개 구절), SPEED_OPTIONS
      ├─ screens/
      │  ├─ HomeScreen.jsx         (+ .module.css)
      │  ├─ PassageListScreen.jsx  (+ .module.css)
      │  └─ MemorizationScreen.jsx (+ .module.css)
      └─ components/
         └─ AudioPlayer.jsx        (+ .module.css)
```

## 실행 방법
```bash
cd app
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
```

## 기술 스택
- React 18.3 (함수형 컴포넌트 + hooks, 외부 상태관리/라우터 없음)
- Vite 5.4
- CSS Modules (`*.module.css`) + 전역 CSS 변수
- HTML5 `<audio>` API (재생/배속/탐색)
- `localStorage` (절별 타임스탬프 저장)
- 테스트, 린터, TypeScript, git 없음

## 관련 문서
- [02_architecture.md](02_architecture.md) — 화면 흐름 / 컴포넌트 구조
- [03_data-model.md](03_data-model.md) — verses.js 데이터 구조, 구절 목록
- [04_features.md](04_features.md) — 오디오 플레이어, 하이라이트, 타이밍 맞추기
- [05_ui-design.md](05_ui-design.md) — 디자인 토큰, 레이아웃
- [06_issues-and-roadmap.md](06_issues-and-roadmap.md) — 발견된 버그/개선점, 로드맵
