import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { SPEED_OPTIONS } from '../data/verses.js'
import styles from './AudioPlayer.module.css'

// ref 로 외부 제어 가능:
//   playFrom(t)          — t초로 이동해 재생
//   playRange(t, end)    — t초부터 재생하다 end초에서 자동 정지 (한 절만 듣기)
//   getCurrentTime()
const AudioPlayer = forwardRef(function AudioPlayer({ audioFile, onTimeUpdate }, ref) {
  const audioRef = useRef(null)
  const stopAtRef = useRef(null)
  const draggingRef = useRef(false)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  onTimeUpdateRef.current = onTimeUpdate

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
    audio.play().catch(() => {}) // 실패하면 'play' 이벤트가 안 오므로 버튼 상태도 그대로
  }

  useImperativeHandle(ref, () => ({
    playFrom(t) {
      stopAtRef.current = null
      seek(t)
      play()
    },
    playRange(t, end) {
      stopAtRef.current = end
      seek(t)
      play()
    },
    getCurrentTime: () => audioRef.current?.currentTime ?? 0,
  }))

  // 재생 상태는 실제 audio 이벤트로만 동기화
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const t = audio.currentTime
      if (stopAtRef.current != null && t >= stopAtRef.current) {
        stopAtRef.current = null
        audio.pause()
      }
      if (!draggingRef.current) setCurrentTime(t)
      onTimeUpdateRef.current?.(t)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onMeta = () => setDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      stopAtRef.current = null
      onTimeUpdateRef.current?.(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('seeked', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    if (audio.readyState >= 1) setDuration(audio.duration)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('seeked', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioFile])

  const seek = (t) => {
    const audio = audioRef.current
    if (!audio) return
    const d = audio.duration || duration || 0
    const nt = Math.max(0, d ? Math.min(t, d - 0.05) : t)
    audio.currentTime = nt
    setCurrentTime(nt)
    onTimeUpdateRef.current?.(nt)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    stopAtRef.current = null
    if (audio.paused) play()
    else audio.pause()
  }

  const handleSpeedChange = (s) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  // 진행바: 마우스·터치 모두 포인터 이벤트로 처리 (드래그 탐색 지원)
  const seekFromPointer = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    stopAtRef.current = null
    seek(ratio * duration)
  }
  const onPointerDown = (e) => {
    draggingRef.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    seekFromPointer(e)
  }
  const onPointerMove = (e) => { if (draggingRef.current) seekFromPointer(e) }
  const onPointerUp = () => { draggingRef.current = false }

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className={styles.player}>
      <audio ref={audioRef} src={audioFile} preload="metadata" />

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div
          className={styles.progressBar}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            <div className={styles.progressThumb} style={{ left: `${progress}%` }} />
          </div>
        </div>
        <div className={styles.timeRow}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className={styles.controls}>
        <button className={styles.playBtn} onClick={togglePlay} aria-label={isPlaying ? '일시정지' : '재생'}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          )}
        </button>

        <div className={styles.speedGroup}>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              className={`${styles.speedBtn} ${speed === s ? styles.speedActive : ''}`}
              onClick={() => handleSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})

export default AudioPlayer
