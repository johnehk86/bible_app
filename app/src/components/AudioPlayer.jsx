import { useState, useRef, useEffect } from 'react'
import { SPEED_OPTIONS } from '../data/verses.js'
import styles from './AudioPlayer.module.css'

export default function AudioPlayer({ audioFile, onTimeUpdate }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdateHandler = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.(audio.currentTime)
      }
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      onTimeUpdate?.(0)
    }

    audio.addEventListener('timeupdate', onTimeUpdateHandler)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdateHandler)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [isDragging, onTimeUpdate])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSpeedChange = (s) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const newTime = ratio * duration
    setCurrentTime(newTime)
    onTimeUpdate?.(newTime)
    if (audioRef.current) audioRef.current.currentTime = newTime
  }

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
          onClick={handleSeek}
          onTouchStart={(e) => { setIsDragging(true); handleSeek(e) }}
          onTouchMove={handleSeek}
          onTouchEnd={() => setIsDragging(false)}
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
}
