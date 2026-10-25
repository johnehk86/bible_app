import { memo, useEffect, useRef } from 'react'
import { wordAt } from '../lib/timing.js'
import styles from './Karaoke.module.css'

// 말씀 본문 + 소리를 따라 글자 색칠하기 (녹음 = 아랍어 낭독)
//
// 절마다 한 묶음: 절 번호 · 아랍어(단어별 색칠, 오른쪽→왼쪽) · 발음 · 한국어 뜻
// 화면은 처음에 한 번만 그리고, 재생 중에는 매 프레임 "바뀐 단어의 class 만" 직접 고친다.
//   r = 이번 반복에서 이미 읽은 단어   c = 지금 읽는 단어 (--p 만큼 오른쪽부터 칠함)
//   o = 반복 구간 밖 (흐리게)          m = 가린 단어 (읽으면 드러남)

const LEAD = 0.04 // 소리보다 아주 살짝 먼저 칠해야 눈에는 딱 맞게 보임

function Karaoke({ verses, words, times, looper, range, masked, showKo = true, showPron = true, onWordTap, onVerseTap }) {
  // onVerseTap 이 없으면 절 번호는 누를 수 없는 그냥 숫자 (연속듣기 화면)
  const spansRef = useRef([])
  const versesRef = useRef([])

  // 반복 구간 밖 단어·절 흐리게
  useEffect(() => {
    const spans = spansRef.current
    const outVerse = verses.map(() => true)
    spans.forEach((el, i) => {
      if (!el) return
      const out = !!(range && times && (times[i].end <= range.start + 0.05 || times[i].start >= range.end - 0.05))
      el.classList.toggle(styles.o, out)
      if (!out) outVerse[words[i].verseIndex] = false
    })
    versesRef.current.forEach((el, vi) => el?.classList.toggle(styles.verseOut, !!(range && times && outVerse[vi])))
  }, [range, times, verses, words])

  // 매 프레임 색칠
  useEffect(() => {
    if (!times || !looper) return
    const spans = spansRef.current
    const verseEls = versesRef.current
    let raf = 0
    let lastCur = -2
    let lastFirst = -2
    let lastVerse = -1
    let lastPct = -1

    const paint = () => {
      raf = requestAnimationFrame(paint)
      const t = looper.time + LEAD
      const stopped = looper.mode === 'stopped'
      const cur = stopped ? -1 : wordAt(times, t)
      // 반복 구간의 첫 단어부터 칠함 (구간을 다시 시작하면 색도 처음부터)
      let first = Math.max(0, wordAt(times, looper.start + 0.06))
      if (times[first].end <= looper.start + 0.05) first++
      const inWord = cur >= 0 && t < times[cur].end + 0.05

      if (cur !== lastCur || first !== lastFirst) {
        for (let i = 0; i < spans.length; i++) {
          const el = spans[i]
          if (!el) continue
          const read = cur >= 0 && i >= first && (i < cur || (i === cur && !inWord))
          el.classList.toggle(styles.r, read)
          el.classList.toggle(styles.c, i === cur && inWord)
        }
        lastCur = cur
        lastFirst = first
        lastPct = -1
      }

      // 지금 읽는 단어: 오른쪽부터 부분 색칠
      if (cur >= 0 && inWord) {
        const w = times[cur]
        const pct = Math.round(Math.min(1, Math.max(0, (t - w.start) / Math.max(0.05, w.end - w.start))) * 100)
        if (pct !== lastPct) {
          spans[cur]?.style.setProperty('--p', pct + '%')
          lastPct = pct
        }
      }

      // 지금 읽는 절 강조 (절의 마지막 단어가 끝나고 다음 절이 시작되기 전까지 유지)
      const v = cur >= 0 ? words[cur].verseIndex : -1
      if (v !== lastVerse) {
        if (lastVerse >= 0) verseEls[lastVerse]?.classList.remove(styles.active)
        if (v >= 0) verseEls[v]?.classList.add(styles.active)
        lastVerse = v
      }
    }
    raf = requestAnimationFrame(paint)
    return () => {
      cancelAnimationFrame(raf)
      verseEls.forEach(el => el?.classList.remove(styles.active))
    }
  }, [times, looper, words])

  const handleClick = (e) => {
    const el = e.target.closest('[data-i]')
    if (el) onWordTap?.(Number(el.dataset.i))
  }

  // 절별로 단어 묶기
  let wi = 0
  return (
    <div className={styles.text} onClick={handleClick}>
      {verses.map((v, vi) => {
        const items = []
        while (wi < words.length && words[wi].verseIndex === vi) {
          const i = wi
          items.push(
            <span
              key={i}
              data-i={i}
              ref={el => (spansRef.current[i] = el)}
              className={`${styles.w} ${masked.has(i) ? styles.m : ''}`}
            >
              {words[i].text}
            </span>,
            ' ',
          )
          wi++
        }
        return (
          <div key={v.n} className={styles.verse} ref={el => (versesRef.current[vi] = el)}>
            {onVerseTap ? (
              <button
                type="button"
                className={styles.num}
                onClick={(e) => { e.stopPropagation(); onVerseTap(vi) }}
                aria-label={`${v.n}절만 반복`}
                disabled={!times}
              >
                {v.n}
              </button>
            ) : (
              <span className={`${styles.num} ${styles.numStatic}`}>{v.n}</span>
            )}
            <p className={styles.ar} dir="rtl" lang="ar">{items}</p>
            {showPron && v.pron && <p className={styles.pron} lang="ko">{v.pron}</p>}
            {showKo && v.ko && <p className={styles.ko} lang="ko">{v.ko}</p>}
          </div>
        )
      })}
    </div>
  )
}

export default memo(Karaoke)
