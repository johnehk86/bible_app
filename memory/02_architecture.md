# 02. 아키텍처 / 화면 흐름 (v2, 2026-10-25)

## 화면 전환 (`App.jsx`)
라우터 없이 `nav` 상태 + `history.pushState/popstate` (휴대폰 뒤로가기 = 이전 화면).
```
nav = { screen: 'list' } | { screen: 'passage', id, fromList } | { screen: 'continuous', stage } | { screen: 'install' }

ListScreen ──구절──▶ PassageScreen ──이전/다음(replaceState)──▶ PassageScreen
    │ └─연속듣기──▶ ContinuousScreen ──"이 구절만 따로 반복"──▶ PassageScreen
    └─앱 설치──▶ InstallScreen
```
- 시작 시 `fetch('./data/passages.json')` → 모든 구절을 `all`(단계 순 → JSON 순)로 펼침, `stageName` 부여
- 새로고침해도 `history.state` 로 현재 화면 복원
- v1 의 HomeScreen(오늘의 말씀, 기도문 Soon 카드)은 없앰 — 목록이 첫 화면

## 화면
| 화면 | 역할 |
|------|------|
| ListScreen | 진행도 ✓n/전체, 앱 설치 버튼(미설치 시), 이어서 암송하기, 단계 탭(단계 2개 이상일 때만), 전체 연속듣기, 구절 목록(번호·장절·아랍어 장절·한국어 미리보기·절 수·완료 배지) |
| PassageScreen | 본문(Karaoke) + 구간 반복 카드 + 반복 설정 + 더보기(보기·단어 가리기·타이밍 맞추기) + 이전/다음 + 하단 Player. 완료 표시 토글, Media Session, 키보드 |
| ContinuousScreen | 한 단계를 1번부터 차례로, 구절마다 1~3번, 끝나면 처음부터. `<audio>` 하나의 src 를 바꿔 가며 재생. 재생 순서 목록, 이전/다음, 잠금화면 다음/이전 트랙 |
| InstallScreen | v1 그대로 (안드로이드 원클릭 설치, 아이폰 안내, 인앱 브라우저 대응, QR) |

## 핵심 모듈 (`src/lib`)
- `looper.js` — `<audio>` 래퍼 클래스. 모드 stopped/playing/paused/gap, 구간(range), 반복 횟수, 쉬는 시간, 속도(preservesPitch). rAF 로 끝점 검사(정확), 화면 꺼지면 timeupdate. `subscribe()` 로 React 갱신, `onDone` 은 연속듣기에서 다음 구절로
- `align.js` — 쉼 감지(`detectSpeech`) + 말소리 덩어리 ↔ 단어 DP(`alignWords`) + **`alignAuto`(우리 추가: 맨 앞 장절 제목 읽기 제거)**
- `text.js` — **우리 버전**: 아랍어 단어 나누기, 단어 길이 = 한국어 발음 음절 수
- `timing.js` — 브라우저 디코드·분석 캐시, `applyMarks`(절 시작에 맞춰 단어 시간 보정), **`timesFromStarts`(우리 추가: 분석 전 절 시작만으로 시간 생성)**, `snapToOnset`, `wordAt`
- `storage.js` — localStorage 래퍼, 키 앞 `bible:`
- `mask.js` — 단어 가리기 (끔/조금/많이/전부, 구절별 고정 순서)

## 컴포넌트
- `Karaoke` — 절마다 [절 번호 버튼 · 아랍어(단어 span, RTL) · 발음 · 한국어]. 처음 한 번 렌더 후 rAF 로 class 만 갱신 (r 읽음, c 읽는 중 --p 오른쪽부터, o 구간 밖, m 가림, active 현재 절, verseOut 구간 밖 절)
- `Player` — 진행바(절 경계 눈금, 구간 금색 띠, A·B 손잡이 드래그), 여기부터/정지/재생/여기까지, 상태 문구("3번째 / ∞")
- `Segmented` — 선택 버튼 묶음
