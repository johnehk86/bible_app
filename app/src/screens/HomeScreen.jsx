import { PASSAGES } from '../data/verses.js'
import styles from './HomeScreen.module.css'

// 날짜마다 바뀌는 오늘의 말씀
function getTodayPassage() {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return PASSAGES[dayOfYear % PASSAGES.length]
}

export default function HomeScreen({ onNavigate, onSelectPassage }) {
  const today = getTodayPassage()
  const firstVerse = today.verses[0]

  return (
    <div className={styles.container}>
      {/* Celestial zenith glow */}
      <div className={styles.zenith} aria-hidden="true" />

      {/* Top app bar */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M12 6.5C10.2 5.2 7.6 4.5 4 4.5v13c3.6 0 6.2.7 8 2 1.8-1.3 4.4-2 8-2v-13c-3.6 0-6.2.7-8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M12 6.5v13" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className={styles.brandName}>말씀암송</span>
        </div>
        <span className={styles.langChip}>한국어 · عربي</span>
      </header>

      <main className={styles.content}>
        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>DA 1단계 암송</p>
          <h1 className={styles.title}>하나님의 말씀을<br />마음에 새기다</h1>
          <p className={styles.subtitle}>거룩한 침묵 속에서 심비에 새기는 은혜의 말씀</p>
        </section>

        {/* Featured: 오늘의 말씀 */}
        <section className={styles.featured}>
          <div className={styles.halo1} aria-hidden="true" />
          <div className={styles.halo2} aria-hidden="true" />

          <div className={styles.featuredInner}>
            <div className={styles.featuredHead}>
              <span className={styles.featuredBadge}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
                </svg>
                오늘의 말씀
              </span>
              <span className={styles.featuredAr} dir="rtl" lang="ar">{today.referenceAr}</span>
            </div>

            <h2 className={styles.featuredTitle}>{today.reference}</h2>

            <blockquote className={styles.quote}>
              “{firstVerse.ko}”
              <span className={styles.quoteRef}>— {today.reference.split(':')[0]}:{firstVerse.verse}</span>
            </blockquote>

            <div className={styles.featuredFoot}>
              <span className={styles.featuredMeta}>
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <path d="M4 14v-2a8 8 0 0116 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <rect x="3" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="17" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                아랍어 낭독 수록
              </span>
              <button className={styles.ctaBtn} onClick={() => onSelectPassage(today.id)}>
                암송 시작하기
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className={styles.menu}>
          <h2 className={styles.sectionTitle}>둘러보기</h2>

          <button className={styles.card} onClick={() => onNavigate('memorization-list')}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>말씀암송</span>
              <span className={styles.cardDesc}>한국어 · 아랍어 이중 언어 암송</span>
            </div>
            <span className={styles.countBadge}>{PASSAGES.length}편</span>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18" className={styles.chevron}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <button className={`${styles.card} ${styles.cardDisabled}`} disabled>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>기도문</span>
              <span className={styles.cardDesc}>준비중입니다</span>
            </div>
            <span className={styles.soonBadge}>Soon</span>
          </button>
        </section>

        <footer className={styles.footer}>
          <span className={styles.footerOrnament}>✦</span>
          <p className={styles.footerQuote}>“주의 말씀은 내 발에 등이요 내 길에 빛이니이다”</p>
          <p className={styles.footerRef}>시편 119:105</p>
        </footer>
      </main>
    </div>
  )
}
