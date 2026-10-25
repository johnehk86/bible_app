# 01. 프로젝트 개요 — 말씀암송 (한국어 · 아랍어)

> 마지막 업데이트: 2026-10-25 (v2 전면 개편)

## 한 줄 요약
아랍어 낭독을 듣고 구간을 반복하며 성경 구절을 외우는 PWA. React 18 + Vite 5, 서버 없음.
배포: GitHub `johnehk86/bible_app` → Cloudflare Pages (https://bible-app-3ta.pages.dev, 루트 디렉터리 `app`).

## 연혁
- 2026-09: v1 — 홈/구절 목록/암송 화면, 골드(Sanctuary) 테마, PWA, 절 타이밍 자동 계산
- **2026-10-25: v2** — 사용자가 새 엑셀(`DA 1단계 암송구절(한국어-아랍어)_수정 (2).xlsx`)을 줌 + 참고 앱
  `D:\01_WorkPlace\280_IDEA\02_bible_app\malsseum-app` 의 디자인·기능(구간 반복, 연속듣기 등)을 옮겨 **새로 구성**
  - 참고 앱은 우리 v1 의 디자인을 이어받아 발전시킨 한국어 낭독 앱 (밝은 테마, Looper, A·B 손잡이, 연속듣기, 단어 가리기)

## 폴더 구조
```
260_Bible_App_Project/
├─ files/DA 1단계 암송구절(아랍어) 음원/   ← 원본 단계 1 (엑셀 + mp3 13개). git 제외
├─ files/네비 게이토 성경 암송 구절(아랍어) 음원/ ← 원본 단계 2 (엑셀 229항목 + 주제 폴더 7개 mp3 28개). git 제외
├─ files/이집트 암미에 기도문/            ← 원본 단계 3 (엑셀 1·2부 + mp3 29개 + 교재 사진). git 제외
├─ data/                                    ← 사용자가 처음 둔 압축 자료(같은 내용). git 제외, 미사용
├─ memory/                                  ← 이 문서들
└─ app/                                     ← 앱 (README.md 에 사용법·데이터 수정법 상세)
   ├─ public/data/passages.json   본문 (npm run data 로 생성)
   ├─ public/audio/<id>.mp3       녹음
   ├─ public/sw.js, manifest, icons, _headers
   ├─ scripts/build-data.mjs      엑셀 → JSON + 음원 복사 + 절 타이밍
   ├─ scripts/check-align.mjs     타이밍 점검
   └─ src/
      ├─ App.jsx                  화면 전환 (history 연동)
      ├─ lib/  looper · align · text · timing · storage · mask · format
      ├─ components/  Karaoke · Player · Segmented
      ├─ screens/  ListScreen · PassageScreen · ContinuousScreen · InstallScreen
      └─ pwa.js                   설치 프롬프트/기기 판별
```

## 명령
```bash
cd app
npm run dev / build / preview
npm run data           # 엑셀 바꾼 뒤 실행
npm run check-align    # 타이밍 점검
```

## 관련 문서
- [02_architecture.md](02_architecture.md) — 화면 흐름 / 컴포넌트
- [03_data-model.md](03_data-model.md) — passages.json, 엑셀 변환, 구절 목록
- [04_features.md](04_features.md) — 구간 반복, 연속듣기, 글자 색칠·타이밍
- [05_ui-design.md](05_ui-design.md) — 디자인 토큰 (어두운/밝은 테마)
- [06_issues-and-roadmap.md](06_issues-and-roadmap.md) — 이슈, 데이터 오타, 할 일
- [07_pwa-install.md](07_pwa-install.md) — 앱 설치(PWA), 서비스 워커
- [08_prayer.md](08_prayer.md) — 이집트 암미야 기도문 (단계 3), 자동 색칠 판정
