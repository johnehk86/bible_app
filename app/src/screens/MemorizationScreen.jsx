import { useState, useCallback, useRef, useEffect } from 'react'
import AudioPlayer from '../components/AudioPlayer.jsx'
import styles from './MemorizationScreen.module.css'

// localStorage 키
const tsKey = (id) => `timestamps_${id}`

// 저장된 타임스탬프 불러오기 (없으면 verses 원본값 사용)
function loadTimestamps(passage) {
  try {
    const saved = localStorage.getItem(tsKey(passage.id))
    if (saved) return JSON.parse(saved)
  } catch {}
  return passage.verses.map(v => v.timestamp ?? 0)
}

// 현재 재생 시간으로 활성 절 인덱스 계산
function getActiveVerseIndex(currentTime, timestamps) {
  let active = 0
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] != null && currentTime >= timestamps[i]) {
      active = i
    }
  }
  return active
}

export default function MemorizationScreen({ passage, onBack }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [calibrating, setCalibrating] = useState(false)
  const [timestamps, setTimestamps] = useState(() => loadTimestamps(passage))
  const [markedCount, setMarkedCount] = useState(0)
  const currentTimeRef = useRef(0)
  const verseRefs = useRef([])

  // 구절이 바뀌면 타임스탬프 다시 로드
  useEffect(() => {
    setTimestamps(loadTimestamps(passage))
    setActiveIndex(null)
    setCalibrating(false)
    setMarkedCount(0)
  }, [passage.id])

  // 타이밍 맞추기 모드 시작
  const startCalibrating = () => {
    setCalibrating(true)
    setMarkedCount(0)
    // 첫 절은 항상 0초
    const initial = passage.verses.map((_, i) => i === 0 ? 0 : null)
    setTimestamps(initial)
  }

  // 캘리브레이션 완료
  const finishCalibrating = () => {
    // null 남은 절은 이전 값으로 채우기
    const filled = [...timestamps]
    for (let i = 1; i < filled.length; i++) {
      if (filled[i] == null) filled[i] = filled[i - 1] + 1
    }
    setTimestamps(filled)
    localStorage.setItem(tsKey(passage.id), JSON.stringify(filled))
    setCalibrating(false)
    setActiveIndex(null)
  }

  // 캘리브레이션 취소
  const cancelCalibrating = () => {
    setTimestamps(loadTimestamps(passage))
    setCalibrating(false)
    setMarkedCount(0)
  }

  // 절 탭 — 캘리브레이션 모드에서 현재 시간 기록
  const markVerse = (i) => {
    if (!calibrating) return
    // 첫 절은 항상 0
    if (i === 0) return
    const t = Math.round(currentTimeRef.current * 10) / 10
    setTimestamps(prev => {
      const next = [...prev]
      next[i] = t
      return next
    })
    setMarkedCount(prev => prev + 1)
  }

  const handleTimeUpdate = useCallback((time) => {
    currentTimeRef.current = time
    if (time === 0) {
      setActiveIndex(null)
      return
    }
    const ts = timestamps.map(t => t ?? 0)
    const idx = getActiveVerseIndex(time, ts)
    setActiveIndex(prev => {
      if (prev !== idx) {
        const el = verseRefs.current[idx]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.bottom > window.innerHeight - 180) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
      return idx
    })
  }, [timestamps])

  const needsMoreMarks = passage.verses.length > 1 && markedCount < passage.verses.length - 1

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
        {!calibrating ? (
          <button className={styles.calibrateBtn} onClick={startCalibrating} title="타이밍 맞추기">
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <button
            className={`${styles.calibrateBtn} ${styles.calibrateDone}`}
            onClick={needsMoreMarks ? cancelCalibrating : finishCalibrating}
          >
            {needsMoreMarks ? '취소' : '완료'}
          </button>
        )}
      </header>

      {/* 캘리브레이션 안내 배너 */}
      {calibrating && (
        <div className={styles.calibrateBanner}>
          <span>🎵 재생 후, 각 절이 들릴 때 해당 절을 탭하세요</span>
          <span className={styles.calibrateCount}>
            {markedCount} / {passage.verses.length - 1} 완료
          </span>
        </div>
      )}

      {/* Content */}
      <main className={styles.content}>
        {/* Hero — 장절 제목 */}
        <section className={styles.hero}>
          <span className={styles.heroEyebrow}>말씀암송 · {passage.verses.length}절</span>
          <h1 className={styles.heroTitle}>{passage.reference}</h1>
          <p className={styles.heroAr} dir="rtl" lang="ar">{passage.referenceAr}</p>
        </section>

        {/* Korean — 절별 */}
        <section className={styles.block}>
          <span className={styles.langBadge}>한국어</span>
          <div className={styles.verseList}>
            {passage.verses.map((v, i) => {
              const isMarked = calibrating && timestamps[i] != null
              const isFirst = i === 0
              return (
                <p
                  key={`ko-${v.verse}`}
                  ref={el => verseRefs.current[i] = el}
                  className={`${styles.koVerse} ${
                    calibrating
                      ? isFirst
                        ? styles.verseCalFirst
                        : isMarked
                          ? styles.verseCalMarked
                          : styles.verseCalPending
                      : activeIndex === null
                        ? ''
                        : activeIndex === i
                          ? styles.verseActive
                          : styles.verseInactive
                  }`}
                  onClick={() => markVerse(i)}
                >
                  <span className={styles.verseNum}>
                    {calibrating && !isFirst && (
                      isMarked
                        ? <span className={styles.checkMark}>✓</span>
                        : <span className={styles.tapMark}>탭</span>
                    )}
                    {(!calibrating || isFirst) && v.verse}
                  </span>
                  {v.ko}
                  {calibrating && timestamps[i] != null && !isFirst && (
                    <span className={styles.tsLabel}>{timestamps[i]}s</span>
                  )}
                </p>
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
                className={`${styles.arVerse} ${
                  calibrating
                    ? ''
                    : activeIndex === null
                      ? ''
                      : activeIndex === i
                        ? styles.verseActive
                        : styles.verseInactive
                }`}
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
        <AudioPlayer audioFile={passage.audioFile} onTimeUpdate={handleTimeUpdate} />
      </footer>
    </div>
  )
}
