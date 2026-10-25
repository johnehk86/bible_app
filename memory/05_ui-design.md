# 05. UI / 디자인 (v2, 2026-10-25)

참고 앱(malsseum-app)의 `index.css` 를 그대로 가져옴 — v1 의 Sanctuary(딥 차콜 + 샴페인 골드) 토큰에 **밝은 테마**가 추가된 버전.

## 테마
- 어두운(기본): surface `#111319`, primary `#ffe09d`, primary-container `#e5c378`
- 밝은(`prefers-color-scheme: light`, 시스템 설정 따름): 한지 `#f6f1e7` + 짙은 금 `#8a6113`
- 색칠 토큰: `--read`(읽은 글자), `--unread`, `--dimmed`, `--loop-bg`, `--mask`
- 반투명 막: `--bar-bg`, `--card-bg`, `--player-bg`, 상단 금빛 광원 `.zenith`(전역 클래스)
- index.html 의 `theme-color` 도 테마별 2개

## 글꼴
- `--font-serif` Noto Serif KR (제목, 장절, 한국어 뜻)
- `--font-sans` Plus Jakarta Sans + Noto Sans KR (라벨, 버튼, 발음)
- `--font-arabic` Noto Naskh Arabic (우리 추가) — 본문 23px / line-height 2.05

## 본문 절 묶음 (Karaoke.module.css, 우리 버전)
- 왼쪽 36px 절 번호 버튼(테두리), 오른쪽 정렬 아랍어, 그 아래 발음(13px, outline 색), 한국어(명조 16px)
- 현재 절: 왼쪽 2px 금선 + 왼→오 옅은 금빛 그라데이션, 한국어 글자색 진하게
- 절 사이 옅은 구분선, 구간 밖 절은 opacity 0.4

## 레이아웃
- 모바일 우선, 최대 폭은 참고 앱 CSS 기준(카드형 섹션), 하단 고정 플레이어
- 터치 영역 36~44px 이상, focus-visible 금색 외곽선, prefers-reduced-motion 대응
