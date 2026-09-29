# 02. 아키텍처 / 화면 흐름

## 화면 전환 (App.jsx)
라우터 라이브러리 없이 `useState`로 화면을 전환한다.

```
state: screen ('home' | 'memorization-list' | 'memorization'), selectedPassage

HomeScreen ──[말씀암송 카드]──▶ PassageListScreen ──[구절 선택]──▶ MemorizationScreen
    ▲                               │  ▲                                │
    └──────────[뒤로]───────────────┘  └─────────────[뒤로]─────────────┘
```

- `handleSelectPassage(id)` : `PASSAGES.find(p => p.id === id)` → `selectedPassage` 설정 → `'memorization'`
- 브라우저 뒤로가기/URL 연동 없음 (history API 미사용). Android 래핑 시 하드웨어 back 버튼 처리 필요.
- 화면이 바뀌면 이전 화면 컴포넌트는 언마운트됨 → 오디오도 같이 정리됨.

## 컴포넌트별 역할

### HomeScreen (`src/screens/HomeScreen.jsx`)
- props: `onNavigate(screenName)`, `onSelectPassage(id)`
- 골드 zenith 광원 + 금빛 테두리 카드 (배경 이미지는 제거됨)
  - `말씀암송` → `onNavigate('memorization-list')`
  - `기도문` → `disabled`, "Soon" 배지 (Phase 1 미구현)
- 하단 인용: 시편 119:105
- 리디자인(2026-09-29) 후: 브랜드 바 → 히어로 → **오늘의 말씀** 배너(`onSelectPassage`로 암송 화면 직행) → 메뉴 카드 → 푸터

### PassageListScreen (`src/screens/PassageListScreen.jsx`)
- props: `onSelect(id)`, `onBack()`
- `PASSAGES`를 검색어(`query`)와 구약/신약 필터(`filter`)로 거른 뒤 카드로 표시

### MemorizationScreen (`src/screens/MemorizationScreen.jsx`)
- props: `passage`, `onBack()`
- 구성: 상단바(뒤로 / 참조 / 타이밍 버튼) → (캘리브레이션 배너) → 한국어 절 목록 → 구분선(✦) → 아랍어 절 목록(`dir="rtl"`) → 하단 고정 AudioPlayer
- 상태:
  - `activeIndex` : 현재 하이라이트 중인 절 (null = 하이라이트 없음)
  - `calibrating` : 타이밍 맞추기 모드 여부
  - `timestamps` : 절별 시작 시간 배열
  - `markedCount` : 캘리브레이션 중 탭한 횟수
  - `currentTimeRef` : 최신 재생 시간 (리렌더 없이 참조)
  - `verseRefs` : 한국어 절 DOM ref (자동 스크롤용)
- 자세한 동작은 [04_features.md](04_features.md)

### AudioPlayer (`src/components/AudioPlayer.jsx`)
- props: `audioFile`, `onTimeUpdate(time)`
- `<audio preload="metadata">` + 진행바 + 재생/일시정지 + 배속 버튼
- 부모에게 `onTimeUpdate`로 시간 전달 (재생 종료 시 `0` 전달 → 하이라이트 해제)

## 데이터 흐름
```
verses.js (PASSAGES) ──▶ App ──passage──▶ MemorizationScreen
                                             │  timestamps ◀── localStorage `timestamps_<id>`
                                             ▼
                                         AudioPlayer ──onTimeUpdate(t)──▶ MemorizationScreen
                                                                             └ getActiveVerseIndex → activeIndex → 하이라이트/스크롤
```
