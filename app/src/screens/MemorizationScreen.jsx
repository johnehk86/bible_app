import { useState, useRef, useEffect } from 'react'
import AudioPlayer from '../components/AudioPlayer.jsx'
import styles from './MemorizationScreen.module.css'

// 사용자가 조절한 절 시작 시간 저장 (v2: 자동 계산 타이밍 도입 — 예전 timestamps_* 값은 무시)
const timingKey = (id) => `timing_v2_${id}`
const STEP = 0.5 // −/+ 버튼 한 번에 움직이는 초

const autoStarts = (passage) => passage.verses.map(v => v.start ?? 0)

function loadStarts(passage) {
  try {
    const saved = JSON.parse(localStorage.getItem(timingKey(passage.id)))
    if (Array.isArray(saved) && saved.length === passage.verses.length && saved.every(n => typeof n === 'number')) {
      return saved
    }
  } catch {}
  return autoStarts(passage)
}

function saveStarts(passage, starts) {
  try {
    const isAuto = starts.every((s, i) => s === autoStarts(passage)[i])
    if (isAuto) localStorage.removeItem(timingKey(passage.id))
    else localStorage.setItem(timingKey(passage.id), JSON.stringify(starts))
  } catch {}
}

// 절 i 의 끝 = 데이터의 end(발췌 구절) 또는 다음 절 시작
function verseEnd(passage, starts, i) {
  const end = passage.verses[i].end
  if (end !== undefined) return end === null ? Infinity : Math.max(end, starts[i] + 0.5)
  return i + 1 < starts.length ? starts[i + 1] : Infinity
}

// 현재 시간에 해당하는 절 (없으면 null — 발췌 구절에서 본문에 없는 절을 읽는 중)
function getActiveIndex(t, passage, starts) {
  let idx = null
  for (let i = 0; i < starts.length; i++) if (t >= starts[i] - 0.05) idx = i
  if (idx != null && t >= verseEnd(passage, starts, idx)) return null
  return idx
}

const fmt = (sec) => {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

export default function MemorizationScreen({ passage, onBack }) {
  const [starts, setStarts] = useState(() => loadStarts(passage))
  const [activeIndex, setActiveIndex] = useState(null)
  const [time, setTime] = useState(0)
  const [adjusting, setAdjusting] = useState(false)
  const playerRef = useRef(null)
  const startsRef = useRef(starts)
  startsRef.current = starts

  const isExcerpt = passage.verses.some(v => v.end !== undefined)
  // 연속 구절의 첫 절은 항상 음원 처음(0초)부터
  const firstLocked = !isExcerpt
  const modified = starts.some((s, i) => s !== autoStarts(passage)[i])

  useEffect(() => {
    setStarts(loadStarts(passage))
    setActiveIndex(null)
    setAdjusting(false)
  }, [passage.id])

  const handleTimeUpdate = (t) => {
    setTime(t)
    // 자동 스크롤 없음 — 사용자가 보고 있는 위치(한국어/아랍어)를 그대로 유지
    setActiveIndex(t === 0 ? null : getActiveIndex(t, passage, startsRef.current))
  }

  // 타이밍 값 변경 (앞뒤 절 순서가 뒤집히지 않게 제한)
  const setStart = (i, value) => {
    setStarts(prev => {
      const next = [...prev]
      let v = Math.round(value * 10) / 10
      if (!isExcerpt) {
        const lo = i > 0 ? prev[i - 1] + 0.3 : 0
        const hi = i + 1 < prev.length ? prev[i + 1] - 0.3 : Infinity
        v = Math.min(Math.max(v, lo), hi)
      }
      next[i] = Math.max(0, v)
      saveStarts(passage, next)
      return next
    })
  }

  const resetAuto = () => {
    const auto = autoStarts(passage)
    setStarts(auto)
    saveStarts(passage, auto)
  }

  const playVerse = (i) => playerRef.current?.playFrom(Math.max(0, starts[i] - 0.1))
  const playOnlyVerse = (i) => {
    const end = verseEnd(passage, starts, i)
    playerRef.current?.playRange(Math.max(0, starts[i] - 0.1), end === Infinity ? null : end)
  }

  const verseClass = (i) =>
    activeIndex === null ? '' : activeIndex === i ? styles.verseActive : styles.verseInactive

  return (
    <div className={styles.container}>
      <div className={styles.zenith} aria-hidden="true" />

      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className={styles.reference}>{passage.reference}</span>
        {!adjusting ? (
          <button className={styles.adjustBtn} onClick={() => setAdjusting(true)}>
            <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            타이밍
          </button>
        ) : (
          <button className={`${styles.adjustBtn} ${styles.adjustDone}`} onClick={() => setAdjusting(false)}>
            완료
          </button>
        )}
      </header>

      {/* 타이밍 조절 안내 */}
      {adjusting && (
        <div className={styles.adjustBanner}>
          <p className={styles.adjustTitle}>타이밍 조절</p>
          <p className={styles.adjustDesc}>
            <b>▶</b>로 한 절씩 들어보고, 글자 색이 늦게 바뀌면 <b>−</b>, 빨리 바뀌면 <b>+</b>를 누르세요.
            재생 중에 <b>지금</b>을 누르면 그 순간이 절 시작이 돼요.
          </p>
          <div className={styles.adjustFoot}>
            <span className={styles.adjustSaved}>{modified ? '✓ 자동 저장됨' : '자동 계산값 사용 중'}</span>
            {modified && (
              <button className={styles.resetBtn} onClick={resetAuto}>자동값으로 되돌리기</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <main className={styles.content}>
        <section className={styles.hero}>
          <span className={styles.heroEyebrow}>말씀암송 · {passage.verses.length}절</span>
          <h1 className={styles.heroTitle}>{passage.reference}</h1>
          <p className={styles.heroAr} dir="rtl" lang="ar">{passage.referenceAr}</p>
          {!adjusting && <p className={styles.heroHint}>구절을 누르면 그 절부터 들려드려요</p>}
        </section>

        {/* Korean — 절별 */}
        <section className={styles.block}>
          <span className={styles.langBadge}>한국어</span>
          <div className={styles.verseList}>
            {passage.verses.map((v, i) => {
              const locked = firstLocked && i === 0
              return (
                <div key={`ko-${v.verse}`} className={adjusting ? styles.verseAdjustWrap : undefined}>
                  <p
                    className={`${styles.koVerse} ${verseClass(i)}`}
                    onClick={() => !adjusting && playVerse(i)}
                  >
                    <span className={styles.verseNum}>{v.verse}</span>
                    {v.ko}
                  </p>

                  {adjusting && (
                    <div className={styles.tuner}>
                      <button className={styles.tunerPlay} onClick={() => playOnlyVerse(i)} aria-label={`${v.verse}절 듣기`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5.14v14l11-7-11-7z" /></svg>
                        듣기
                      </button>
                      <div className={styles.tunerTime}>
                        <button
                          className={styles.tunerStep}
                          onClick={() => setStart(i, starts[i] - STEP)}
                          disabled={locked}
                          aria-label="0.5초 앞당기기"
                        >−</button>
                        <span className={styles.tunerValue}>{locked ? '처음' : fmt(starts[i])}</span>
                        <button
                          className={styles.tunerStep}
                          onClick={() => setStart(i, starts[i] + STEP)}
                          disabled={locked}
                          aria-label="0.5초 늦추기"
                        >+</button>
                      </div>
                      <button
                        className={styles.tunerNow}
                        onClick={() => setStart(i, playerRef.current?.getCurrentTime() ?? time)}
                        disabled={locked || time === 0}
                        title="현재 재생 위치를 이 절의 시작으로"
                      >
                        지금
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerIcon}>✦</span>
        </div>

        {/* Arabic — 절별 */}
        <section className={styles.block}>
          <span className={styles.langBadge} style={{ alignSelf: 'flex-end' }}>عربي</span>
          <div className={styles.verseList} dir="rtl" lang="ar">
            {passage.verses.map((v, i) => (
              <p
                key={`ar-${v.verse}`}
                className={`${styles.arVerse} ${verseClass(i)}`}
                onClick={() => !adjusting && playVerse(i)}
              >
                {v.ar}
                <span className={styles.verseNumAr}>{v.verse}</span>
              </p>
            ))}
          </div>
        </section>
      </main>

      {/* Audio Player */}
      <footer className={styles.playerWrap}>
        {isExcerpt && time > 0 && activeIndex === null && (
          <p className={styles.offTextHint}>♪ 지금은 화면에 없는 절을 읽고 있어요</p>
        )}
        <AudioPlayer ref={playerRef} audioFile={passage.audioFile} onTimeUpdate={handleTimeUpdate} />
      </footer>
    </div>
  )
}
