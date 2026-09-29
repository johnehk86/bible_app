# 04. 핵심 기능 동작 분석

## 1. 오디오 플레이어 (`components/AudioPlayer.jsx`)
| 기능 | 구현 |
|------|------|
| 재생/일시정지 | `togglePlay()` → `audio.play()/pause()` 후 `isPlaying` 토글 |
| 진행바 | `progress = currentTime / duration * 100` → fill 너비 + thumb 위치 |
| 탐색(seek) | 진행바 `onClick` / `onTouchStart` / `onTouchMove` → 클릭 x 좌표 비율로 `audio.currentTime` 설정 |
| 드래그 | 터치에서만 `isDragging` 사용 (마우스 드래그 미지원) |
| 배속 | `SPEED_OPTIONS` 버튼 → `audio.playbackRate = s` |
| 시간 표시 | `formatTime()` → `m:ss` |
| 종료 | `ended` 이벤트 → `isPlaying=false`, `onTimeUpdate(0)` |

- 이벤트 리스너는 `useEffect([isDragging, onTimeUpdate])`에서 등록/해제.
  `onTimeUpdate`(부모의 `handleTimeUpdate`)는 `timestamps`가 바뀔 때마다 새로 만들어지므로 리스너도 재등록됨.
- 반복 재생(loop), 구간 반복, 이전/다음 절 이동 기능은 없음.

## 2. 절 하이라이트 (가라오케 방식) — `MemorizationScreen.jsx`
Spec상 Phase 1에서는 보류였으나 **이미 구현되어 있음**.

```js
getActiveVerseIndex(currentTime, timestamps)
  // currentTime >= timestamps[i] 를 만족하는 마지막 i 반환
```
- `handleTimeUpdate(time)`:
  - `time === 0` → `activeIndex = null` (하이라이트 해제 = 모든 절 보통 표시)
  - 그 외 → 활성 절 계산, 절이 바뀌었고 해당 한국어 절이 화면 하단 180px 영역 아래에 있으면 `scrollIntoView({block:'center'})`
- 표시: 활성 절 `styles.verseActive`, 나머지 `styles.verseInactive` (한국어/아랍어 모두 같은 인덱스로 동기화)
- 자동 스크롤은 **한국어 절 기준**만 (아랍어 절 ref 없음)

## 3. 타이밍 맞추기 (캘리브레이션) — `MemorizationScreen.jsx`
사용자가 오디오를 들으며 각 절 시작 시점에 탭하여 timestamp를 기록하는 기능.

흐름:
1. 상단 우측 시계 아이콘 → `startCalibrating()`
   - `timestamps = [0, null, null, ...]`, `markedCount = 0`
2. 배너: "🎵 재생 후, 각 절이 들릴 때 해당 절을 탭하세요  (n / 절수-1 완료)"
3. 한국어 절 탭 → `markVerse(i)`: `currentTimeRef.current`를 소수점 1자리로 반올림하여 `timestamps[i]`에 기록, `markedCount++`
   - 첫 절(i=0)은 탭 무시 (항상 0초)
   - 표시: 첫 절 `verseCalFirst`, 기록됨 `verseCalMarked`(✓ + "12.3s"), 미기록 `verseCalPending`("탭")
4. 우측 버튼:
   - `markedCount < 절수-1` → "취소" → `cancelCalibrating()` (저장된 값 복원)
   - 다 채우면 "완료" → `finishCalibrating()`:
     null 남은 절은 `이전값 + 1`로 채움 → `localStorage['timestamps_<id>']`에 저장
5. 다음 진입 시 `loadTimestamps(passage)`: localStorage 값 우선, 없으면 verses.js의 `timestamp`

> 저장 위치가 **브라우저 localStorage**라서 기기/브라우저마다 따로 저장됨.
> 확정된 타이밍은 개발자가 verses.js에 옮겨 적어야 모든 사용자에게 적용됨.
