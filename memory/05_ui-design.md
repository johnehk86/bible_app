# 05. UI / 디자인 — "Sanctuary" 테마

> 2026-09-29 리디자인: 기존 보라색 다크 테마 → 사용자가 준 "Sanctuary" 레퍼런스(Tailwind HTML) 기반의
> **딥 차콜 + 샴페인 골드** 테마로 변경. Tailwind는 쓰지 않고 토큰만 CSS 변수로 옮겨 CSS Modules 유지 (오프라인 래핑 고려).

## 디자인 토큰 (`src/index.css` `:root`)
| 그룹 | 변수 | 값 |
|------|------|----|
| 표면 | `--surface` / `--surface-lowest` / `--surface-low` | `#111319` / `#0c0e14` / `#191b22` |
|  | `--surface-container` / `--surface-high` / `--surface-highest` | `#1e1f26` / `#282a30` / `#33343b` |
| 골드 | `--primary` / `--primary-container` / `--primary-dim` | `#ffe09d` / `#e5c378` / `#e4c277` |
|  | `--on-primary` (골드 위 글자) / `--tertiary` | `#3f2e00` / `#f1e3a9` |
| 텍스트 | `--on-surface` / `--on-surface-variant` | `#e2e2eb` / `#d0c5b4` |
|  | `--outline` / `--outline-variant` | `#999080` / `#4d4639` |
| 테두리 | `--gild` / `--gild-active` / `--gild-soft` | 골드 rgba 0.22 / 0.45 / 0.10 |
| 광채 | `--glow` | 금빛 바깥 + 안쪽 box-shadow |
| 폰트 | `--font-serif` / `--font-sans` / `--font-arabic` | Noto Serif KR / Plus Jakarta Sans(+Noto Sans KR) / Noto Naskh Arabic |
| 기타 | `--radius` / `--radius-sm` / `--gutter` | 16px / 12px / 24px |

- 제목, 장절, **한국어 본문은 명조(Noto Serif KR)**, 라벨과 버튼은 Plus Jakarta Sans
- 아랍어 본문 색은 `--tertiary`(연한 금색)
- `theme-color: #111319`

## 공통 시각 요소
- **zenith**: 화면 상단에 고정된 금빛 radial-gradient 광원 (`.zenith`, 각 화면에 있음)
- **gilded card**: 반투명 `surface-container` + blur(12px) + `--gild` 테두리 → hover 시 `--gild-active` + `--glow`
- **골드 CTA**: `primary-container → primary-dim` 그라데이션, 글자 `--on-primary`
- 상단바: sticky, `rgba(17,19,25,0.8)` + blur, 아이콘은 골드 원형 버튼
- 레이아웃: 모든 화면 `max-width: 480px` 중앙 정렬, 아이콘은 인라인 SVG 유지 (Material Symbols 미사용)

## 화면별
- **홈**: 브랜드 바(말씀암송, 한국어 · عربي 칩) → 히어로 문구 → **오늘의 말씀** 배너(날짜 기준 `dayOfYear % PASSAGES.length`, "암송 시작하기" 버튼은 바로 암송 화면으로 이동) → 둘러보기 카드(말씀암송 N편 / 기도문 Soon) → 시편 119:105
  - 배경 이미지(`bg-landscape.jpg`)는 더 이상 사용하지 않음 (파일은 public/assets에 남아 있음)
- **구절 목록 (말씀 서고)**: 제목 + "N편 수록" → **검색창**(장절/한국어 본문 `includes`) → **필터 칩** 전체/구약/신약(id 접두어 `deut_`, `ps_` = 구약) → 카드(구약/신약 태그, No.xx, 아랍어 장절, 명조 장절, 2줄 미리보기, 아랍어 낭독 · 총 N절)
- **암송 화면**: 상단바 → 히어로(말씀암송 · N절 / 골드 장절 / 아랍어 장절) → 한국어 카드 → ✦ 구분선 → 아랍어 카드 → 하단 고정 플레이어
  - 활성 절: 골드 글자 + 은은한 골드 배경 + 안쪽 2px 골드 바 + 글로우 (아랍어는 오른쪽 바)
  - 비활성 절: `rgba(226,226,235,0.3)`
  - 캘리브레이션 배너: sticky(상단바 아래) 골드 테두리 카드, "완료/취소" 버튼은 골드 알약
- **오디오 플레이어**: 골드 테두리 유리 카드 + 골드 헤일로, 골드 그라데이션 원형 재생 버튼, 발광하는 골드 진행바/썸, 배속은 세그먼트 컨트롤(선택 시 골드 알약)
