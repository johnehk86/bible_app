import { useState } from 'react'
import { PASSAGES } from '../data/verses.js'
import styles from './PassageListScreen.module.css'

const OT_PREFIXES = ['deut_', 'ps_']
const getTestament = (id) => (OT_PREFIXES.some(p => id.startsWith(p)) ? '구약' : '신약')

const FILTERS = ['전체', '구약', '신약']

export default function PassageListScreen({ onSelect, onBack }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('전체')

  const q = query.trim()
  const filtered = PASSAGES
    .map((p, i) => ({ ...p, no: i + 1 }))
    .filter(p => filter === '전체' || getTestament(p.id) === filter)
    .filter(p => !q || p.reference.includes(q) || p.verses.some(v => v.ko.includes(q)))

  return (
    <div className={styles.container}>
      <div className={styles.zenith} aria-hidden="true" />

      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="뒤로">
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className={styles.barTitle}>말씀암송</span>
        <div style={{ width: 40 }} />
      </header>

      <main className={styles.content}>
        {/* Title */}
        <div className={styles.heading}>
          <div className={styles.headingRow}>
            <h1 className={styles.title}>말씀 서고</h1>
            <span className={styles.countBadge}>{PASSAGES.length}편 수록</span>
          </div>
          <p className={styles.subtitle}>암송할 구절을 선택하세요</p>
        </div>

        {/* Search */}
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="성경 장절, 키워드 검색..."
          />
        </div>

        {/* Filter chips */}
        <div className={styles.chips}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className={styles.empty}>검색 결과가 없습니다</p>
        ) : (
          <ul className={styles.list}>
            {filtered.map(passage => (
              <li key={passage.id}>
                <button className={styles.item} onClick={() => onSelect(passage.id)}>
                  <div className={styles.itemHead}>
                    <div className={styles.tags}>
                      <span className={styles.tag}>{getTestament(passage.id)}</span>
                      <span className={styles.itemNo}>No. {String(passage.no).padStart(2, '0')}</span>
                    </div>
                    <span className={styles.itemAr} dir="rtl" lang="ar">{passage.referenceAr}</span>
                  </div>

                  <h3 className={styles.itemRef}>{passage.reference}</h3>
                  <p className={styles.itemPreview}>{passage.verses[0].ko}</p>

                  <div className={styles.itemFoot}>
                    <div className={styles.meta}>
                      <span className={styles.metaItem}>
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14" className={styles.metaIconGold}>
                          <path d="M4 14v-2a8 8 0 0116 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <rect x="3" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                          <rect x="17" y="14" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                        아랍어 낭독
                      </span>
                      <span className={styles.metaItem}>
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                          <path d="M12 6.5C10.2 5.2 7.6 4.5 4 4.5v13c3.6 0 6.2.7 8 2 1.8-1.3 4.4-2 8-2v-13c-3.6 0-6.2.7-8 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                        총 {passage.verses.length}절
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" className={styles.chevron}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
