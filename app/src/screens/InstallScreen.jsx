import { useState } from 'react'
import { useInstall, isIOS, isAndroid, inAppBrowser, openInExternalBrowser } from '../pwa.js'
import styles from './InstallScreen.module.css'

const ANDROID_STEPS = [
  <>크롬(Chrome) 브라우저로 이 주소에 접속</>,
  <>오른쪽 위 <strong>메뉴(⋮)</strong> 터치</>,
  <><strong>“앱 설치”</strong> 또는 <strong>“홈 화면에 추가”</strong> 선택</>,
  <><strong>“설치”</strong>를 누르면 완료!</>,
]

const IOS_STEPS = [
  <><strong>사파리(Safari)</strong>로 이 주소에 접속</>,
  <>화면 아래 <strong>공유 버튼</strong> <ShareIcon /> 터치</>,
  <>목록을 내려 <strong>“홈 화면에 추가”</strong> 선택</>,
  <>오른쪽 위 <strong>“추가”</strong>를 누르면 완료!</>,
]

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 00-.66-.38l-1.87 3.23a11.5 11.5 0 00-9.82 0L5.22 5.92a.38.38 0 00-.66.38L6.4 9.48A10.8 10.8 0 001 18h22a10.8 10.8 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.96-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.43-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.27z" />
    </svg>
  )
}

function Guide({ title, icon, steps, mine }) {
  return (
    <section className={`${styles.section} ${mine ? styles.sectionMine : ''}`}>
      <h3 className={styles.sectionTitle}>
        <span className={styles.sectionIcon}>{icon}</span>
        {title}
        {mine && <span className={styles.mineBadge}>내 기기</span>}
      </h3>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={i} className={styles.step}>
            <span className={styles.stepNum}>{i + 1}</span>
            <span className={styles.stepText}>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function InstallScreen({ onBack }) {
  const { canPrompt, promptInstall, installed } = useInstall()
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const url = window.location.origin + window.location.pathname

  const handleInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') setMessage('설치되었습니다! 홈 화면에서 말씀암송을 찾아보세요.')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const android = <Guide key="a" title="안드로이드 (크롬)" icon={<AndroidIcon />} steps={ANDROID_STEPS} mine={isAndroid} />
  const ios = <Guide key="i" title="아이폰 · 아이패드 (사파리)" icon={<AppleIcon />} steps={IOS_STEPS} mine={isIOS} />
  const guides = isIOS ? [ios, android] : [android, ios]

  return (
    <div className={styles.container}>
      <div className={styles.zenith} aria-hidden="true" />

      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className={styles.barTitle}>앱 설치</span>
        <div style={{ width: 40 }} />
      </header>

      <main className={styles.content}>
        {/* Hero */}
        <div className={styles.hero}>
          <img src="./icons/icon-192.png" alt="" className={styles.appIcon} />
          <h1 className={styles.title}>말씀암송 앱 설치</h1>
          <p className={styles.subtitle}>
            홈 화면에 추가하면 앱처럼 바로 열리고,<br />한 번 들은 구절은 인터넷 없이도 들을 수 있어요.
          </p>
        </div>

        {/* 상태별 메인 액션 */}
        {installed ? (
          <div className={styles.statusCard}>
            <span className={styles.statusIcon}>✓</span>
            <div>
              <p className={styles.statusTitle}>이미 설치되어 있어요</p>
              <p className={styles.statusDesc}>홈 화면의 말씀암송 아이콘으로 실행하세요.</p>
            </div>
          </div>
        ) : inAppBrowser ? (
          <div className={styles.warnCard}>
            <p className={styles.statusTitle}>{inAppBrowser} 안에서는 설치할 수 없어요</p>
            <p className={styles.statusDesc}>
              {isIOS
                ? '오른쪽 아래(또는 위) ⋯ 메뉴에서 “Safari로 열기”를 선택한 뒤 아래 방법을 따라 해 주세요.'
                : '아래 버튼으로 크롬에서 연 뒤 설치해 주세요.'}
            </p>
            {!isIOS && (
              <button className={styles.primaryBtn} onClick={openInExternalBrowser}>
                크롬으로 열기
              </button>
            )}
          </div>
        ) : canPrompt ? (
          <button className={styles.primaryBtn} onClick={handleInstall}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            지금 설치하기
          </button>
        ) : null}

        {message && <p className={styles.message}>{message}</p>}

        {/* 설치 방법 */}
        {guides}

        {/* QR */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </span>
            QR 코드로 접속
          </h3>
          <div className={styles.qrBox}>
            <img
              className={styles.qr}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=0&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=111319`}
              alt="앱 주소 QR 코드"
            />
            <p className={styles.qrHint}>휴대폰 카메라로 스캔하면 바로 열려요</p>
          </div>
        </section>

        {/* 링크 공유 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            링크 공유
          </h3>
          <div className={styles.shareRow}>
            <input className={styles.shareInput} value={url} readOnly onFocus={e => e.target.select()} />
            <button className={styles.copyBtn} onClick={copyLink}>{copied ? '복사됨 ✓' : '복사'}</button>
          </div>
        </section>
      </main>
    </div>
  )
}
