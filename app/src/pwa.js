import { useEffect, useState } from 'react'

// ── 설치 프롬프트 (Android Chrome / Edge / 데스크톱 Chrome) ──
// beforeinstallprompt 는 페이지 로드 직후 한 번만 오므로, 화면이 뜨기 전에 모듈 로드 시점부터 잡아둔다.
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

// ── 환경 판별 ──
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

export const isIOS =
  /iPad|iPhone|iPod/.test(ua) ||
  (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isAndroid = /Android/i.test(ua)

// 카카오톡·네이버·인스타그램 등 앱 내장 브라우저 — 여기서는 설치가 안 됨
export const inAppBrowser = (() => {
  if (/KAKAOTALK/i.test(ua)) return '카카오톡'
  if (/NAVER\(inapp/i.test(ua)) return '네이버'
  if (/Instagram/i.test(ua)) return '인스타그램'
  if (/FBAN|FBAV/i.test(ua)) return '페이스북'
  if (/\bLine\//i.test(ua)) return '라인'
  return null
})()

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// 카카오톡 인앱 브라우저 → 기본 브라우저로 열기 (카카오톡 공식 스킴)
export function openInExternalBrowser() {
  const url = window.location.href
  if (/KAKAOTALK/i.test(ua)) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
    return true
  }
  if (isAndroid) {
    // 그 외 안드로이드 인앱 브라우저 → 크롬 인텐트
    const noScheme = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;end`
    return true
  }
  return false
}

export function useInstall() {
  const [, force] = useState(0)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const update = () => force((n) => n + 1)
    listeners.add(update)
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      listeners.delete(update)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable'
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    force((n) => n + 1)
    if (outcome === 'accepted') setInstalled(true)
    return outcome // 'accepted' | 'dismissed'
  }

  return { canPrompt: !!deferredPrompt, promptInstall, installed }
}
