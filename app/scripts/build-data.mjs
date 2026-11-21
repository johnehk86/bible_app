// 원본 자료(엑셀 + mp3) → public/data/passages.json + public/audio/*.mp3
//
//   npm run data                 엑셀 읽기 + 음원 복사 + 절 타이밍 자동 계산
//   npm run data -- --no-align   타이밍 계산은 건너뜀 (본문만 갱신, 이전 타이밍 유지)
//
// 원본 폴더 (../files/):
//   [단계 1] DA 1단계 암송구절(아랍어) 음원/
//     엑셀: 시트 하나 = 구절 하나, 시트 순서 = 암송 순서
//       시트 이름 "신명기 6장 4-9절" · 4행부터 A 장절(신명기 6:4) B 한국어 C 아랍어 D 아랍어 한국어 발음
//     mp3: 파일 이름에 성경 이름(줄임말 가능)과 장 번호 — "마 5장 1절부터 16절까지.mp3"
//   [단계 2] 네비 게이토 성경 암송 구절(아랍어) 음원/
//     엑셀: 첫 시트는 안내, 그다음 주제 시트 7개 ("1. 하나님을 알아감" …)
//       3행부터 A 번호 B 분류 C 장절 "요한복음 1:1,14 (يوحنا 1: 1، 14)" D 한국어(개역한글) E 아랍어(모음 부호 포함)
//     mp3: 주제 폴더("1. 하나님을 알아감/") 안에 "갈라디아서 4장 6절.mp3", "에베소서 6장 10절에서 11절.mp3"
//     → 녹음이 있는 항목만 앱에 넣는다 (녹음을 추가하고 다시 돌리면 자동으로 늘어남)
//   [단계 3] 이집트 암미에 기도문/
//     이집트 암미에 기도문 음성 파일/ 안에 엑셀(Egyptian_Arabic_Prayers_*.xlsx) + mp3
//     엑셀: 시트 = 장(1~8), 시트 안 "📌 패턴 N" 으로 패턴 구분, 번호 없는 줄 = 위 표현의 다른 형태
//     mp3: "7. 요청의 기도(패턴 1,1-14번까지).mp3" → 7장 패턴 1 의 1~14번
//     → 음원 하나 = 단원 하나, 표현 한 줄 = 절 하나 (화면에는 "표현"으로 표시)
//
// 절 시작 시간(start)을 손으로 고정하고 싶으면 passages.json 에서 그 절에 "startFixed": true 를 넣는다.
// 다음에 이 스크립트를 다시 돌려도 그 값은 바뀌지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readXlsx } from './xlsx.mjs'
import { tokenize } from '../src/lib/text.js'
import { detectSpeech, alignAuto } from '../src/lib/align.js'

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILES = path.join(APP, '..', 'files')
const DA_DIR = path.join(FILES, 'DA 1단계 암송구절(아랍어) 음원')
const NAV_DIR = path.join(FILES, '네비 게이토 성경 암송 구절(아랍어) 음원')
const PRAYER_AUDIO_DIR = path.join(FILES, '이집트 암미에 기도문', '이집트 암미에 기도문 음성 파일')
const OUT_JSON = path.join(APP, 'public', 'data', 'passages.json')
const OUT_AUDIO = path.join(APP, 'public', 'audio')

// 성경 이름 → id 약어, 아랍어 이름 (새 책이 나오면 여기에 추가)
const BOOKS = {
  '신명기': { abbr: 'deut', ar: 'تثنية' },
  '시편': { abbr: 'ps', ar: 'مزامير' },
  '잠언': { abbr: 'prov', ar: 'أمثال' },
  '마태복음': { abbr: 'mat', ar: 'متى' },
  '누가복음': { abbr: 'lk', ar: 'لوقا' },
  '요한복음': { abbr: 'jn', ar: 'يوحنا' },
  '로마서': { abbr: 'rom', ar: 'رومية' },
  '고린도전서': { abbr: '1cor', ar: '١ كورنثوس' },
  '고린도후서': { abbr: '2cor', ar: '٢ كورنثوس' },
  '갈라디아서': { abbr: 'gal', ar: 'غلاطية' },
  '에베소서': { abbr: 'eph', ar: 'أفسس' },
  '빌립보서': { abbr: 'phil', ar: 'فيلبي' },
  '데살로니가전서': { abbr: '1thess', ar: '١ تسالونيكي' },
  '데살로니가후서': { abbr: '2thess', ar: '٢ تسالونيكي' },
  '디모데후서': { abbr: '2tim', ar: '٢ تيموثاوس' },
  '히브리서': { abbr: 'heb', ar: 'العبرانيين' },
  '야고보서': { abbr: 'jas', ar: 'يعقوب' },
  '베드로전서': { abbr: '1pet', ar: '١ بطرس' },
  '요한일서': { abbr: '1jn', ar: '١ يوحنا' },
}
// 파일 이름에 쓰인 줄임말
const SHORT = { '마': '마태복음', '요': '요한복음', '고전': '고린도전서' }

// 파일 이름이 잘못 붙은 녹음 (파일 → 실제 장절). 녹음 길이·내용으로 확인한 것만 적는다.
const AUDIO_REF_FIX = {
  // "4장 9절"(짧은 한 줄)이 아니라 엑셀 7주제의 4:2("너는 말씀을 전파하라…")를 읽은 녹음
  '7. 제자 삼는 자/디모데후서 4장 9절.mp3': '디모데후서 4:2',
}

const noAlign = process.argv.includes('--no-align')
const warnings = []
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const arNum = (s) => String(s).replace(/\d/g, d => AR_DIGITS[d])
const bookOf = (name) => {
  const book = SHORT[name] || name
  if (!BOOKS[book]) throw new Error(`모르는 성경 이름: "${name}" (scripts/build-data.mjs 의 BOOKS 에 추가하세요)`)
  return book
}

const prev = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : null
const prevById = new Map((prev?.stages || []).flatMap(s => s.passages).map(p => [p.id, p]))
fs.mkdirSync(OUT_AUDIO, { recursive: true })

// 음원을 public/audio/<id>.mp3 로 복사 (내용이 다를 때만)
function copyAudio(src, id) {
  const dst = path.join(OUT_AUDIO, `${id}.mp3`)
  const buf = fs.readFileSync(src)
  if (!fs.existsSync(dst) || !buf.equals(fs.readFileSync(dst))) {
    fs.writeFileSync(dst, buf)
    console.log(`  음원 복사: ${path.relative(FILES, src)} → audio/${id}.mp3`)
  }
  return `audio/${id}.mp3`
}

// 손으로 고정한 절 시작 시간은 유지
function keepFixed(id, verses) {
  const old = prevById.get(id)
  verses.forEach((v, i) => {
    const o = old?.verses?.[i]
    if (o?.startFixed && String(o.n) === String(v.n)) { v.start = o.start; v.startFixed = true }
  })
}

const findXlsx = (dir) => {
  const f = fs.existsSync(dir) && fs.readdirSync(dir).find(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
  if (!f) throw new Error(`엑셀 파일을 찾지 못했어요: ${dir}`)
  console.log('엑셀:', path.relative(FILES, path.join(dir, f)))
  return path.join(dir, f)
}

// ── 단계 1: DA 1단계 ──
function buildDA() {
  const files = fs.readdirSync(DA_DIR)
  const passages = readXlsx(findXlsx(DA_DIR)).map((sheet, idx) => {
    const m = /^\s*(\S+)\s+(\d+)\s*[장편]\s*(\d+)(?:\s*[-~]\s*(\d+))?\s*절/.exec(sheet.name)
    if (!m) throw new Error(`시트 이름을 이해하지 못했어요: "${sheet.name}"`)
    const book = bookOf(m[1])
    const ch = +m[2]
    const first = +m[3]
    const last = m[4] ? +m[4] : first
    const range = first === last ? `${first}` : `${first}-${last}`
    const id = `${BOOKS[book].abbr}_${ch}_${range}`

    const verses = sheet.rows
      .filter(r => r.r >= 4 && (r.B || r.C))
      .map(r => {
        if (r.A && !r.A.startsWith(book)) warnings.push(`DA "${sheet.name}" ${r.r}행: 장절 칸이 "${r.A}" — ${book}(으)로 처리`)
        for (const [col, label] of [['B', '한국어'], ['C', '아랍어'], ['D', '발음']]) {
          if (!r[col]) warnings.push(`DA "${sheet.name}" ${r.r}행: ${label} 칸이 비어 있어요`)
        }
        return { n: +(/:\s*(\d+)/.exec(r.A || '')?.[1]), ko: r.B || '', ar: r.C || '', pron: r.D || '' }
      })
    const expected = Array.from({ length: last - first + 1 }, (_, k) => first + k)
    if (verses.map(v => v.n).join() !== expected.join()) {
      warnings.push(`DA "${sheet.name}": 절 번호 ${verses.map(v => v.n).join(',')} ≠ 시트 이름의 범위 ${range}`)
    }

    const audioFile = files.find(f => {
      const a = /^(\S+?)\s*(\d+)\s*[장편]/.exec(f)
      return f.endsWith('.mp3') && a && (SHORT[a[1]] || a[1]) === book && +a[2] === ch
    })
    if (!audioFile) warnings.push(`DA "${sheet.name}": 음원 파일을 찾지 못했어요 (녹음 없음으로 표시)`)
    keepFixed(id, verses)
    return {
      id,
      no: idx + 1,
      ref: `${book} ${ch}:${range}`,
      refAr: `${BOOKS[book].ar} ${arNum(ch)}: ${arNum(range)}`,
      audio: audioFile ? copyAudio(path.join(DA_DIR, audioFile), id) : null,
      verses,
    }
  })
  return { stage: 1, name: 'DA 1단계', passages }
}

// ── 단계 2: 네비게이토 (녹음이 있는 항목만) ──
function buildNav() {
  const sheets = readXlsx(findXlsx(NAV_DIR)).filter(s => /^\d+\./.test(s.name)) // 주제 시트만
  const entries = sheets.flatMap(sheet => {
    const topicNo = parseInt(sheet.name, 10)
    return sheet.rows
      .filter(r => r.r >= 3 && /^\d+$/.test(r.A || '') && r.C)
      .map(r => {
        const [, refKo, refAr = ''] = /^(.*?)\s*(?:\((.*)\))?\s*$/.exec(r.C)
        const m = /^(\S+)\s+(\d+):([\d,\-\s]+)$/.exec(refKo.trim())
        if (!m) { warnings.push(`네비 "${sheet.name}" ${r.A}번: 장절 "${r.C}" 형식을 이해하지 못했어요`); return null }
        return {
          topicNo, group: sheet.name, num: +r.A,
          topic: (r.B || '').replace(/\s*\r?\n\s*/g, ' ').trim(),
          book: m[1], ch: +m[2], vs: m[3].replace(/\s/g, ''),
          ref: refKo.trim(), refAr: arNum(refAr.trim()),
          ko: r.D || '', ar: (r.E || '').replace(/\s*\r?\n\s*/g, ' ').trim(),
        }
      })
      .filter(Boolean)
  })

  // 주제 폴더 안의 mp3 → 엑셀 항목
  const used = []
  for (const dir of fs.readdirSync(NAV_DIR).filter(d => fs.statSync(path.join(NAV_DIR, d)).isDirectory())) {
    const topicNo = parseInt(dir, 10)
    for (const file of fs.readdirSync(path.join(NAV_DIR, dir)).filter(f => f.endsWith('.mp3'))) {
      const key = `${dir}/${file}`
      let book, ch, first
      if (AUDIO_REF_FIX[key]) {
        const f = /^(\S+)\s+(\d+):(\d+)/.exec(AUDIO_REF_FIX[key])
        ;[book, ch, first] = [f[1], +f[2], f[3]]
      } else {
        const f = /^(\S+?)\s*(\d+)\s*[장편]\s*(\d+)\s*절/.exec(file)
        if (!f) { warnings.push(`네비 음원 "${key}": 파일 이름에서 장절을 찾지 못했어요`); continue }
        ;[book, ch, first] = [SHORT[f[1]] || f[1], +f[2], f[3]]
      }
      const hit = entries.find(e => e.topicNo === topicNo && e.book === book && e.ch === ch && e.vs.split(/[,\-]/)[0] === first)
        || entries.find(e => e.book === book && e.ch === ch && e.vs.split(/[,\-]/)[0] === first)
      if (!hit) { warnings.push(`네비 음원 "${key}": 엑셀에서 짝이 되는 구절을 찾지 못했어요`); continue }
      if (AUDIO_REF_FIX[key]) warnings.push(`네비 음원 "${key}" → ${hit.ref} 로 연결 (파일 이름 보정)`)
      used.push({ ...hit, src: path.join(NAV_DIR, dir, file) })
    }
  }
  used.sort((a, b) => a.topicNo - b.topicNo || a.num - b.num)

  const passages = used.map((e, idx) => {
    bookOf(e.book)
    const id = `nav_${BOOKS[e.book].abbr}_${e.ch}_${e.vs.replace(/,/g, '-')}`
    const verses = [{ n: e.vs.replace(/,/g, '-'), ko: e.ko, ar: e.ar, pron: '' }]
    keepFixed(id, verses)
    return {
      id,
      no: idx + 1,
      group: e.group,
      topic: e.topic,
      ref: `${e.book} ${e.ch}:${e.vs.replace(/,/g, '-')}`,
      refAr: e.refAr || `${BOOKS[e.book].ar} ${arNum(e.ch)}: ${arNum(e.vs)}`,
      audio: copyAudio(e.src, id),
      verses,
    }
  })
  console.log(`  네비게이토: 엑셀 ${entries.length}항목 중 녹음 있는 ${passages.length}개`)
  return { stage: 2, name: '네비게이토', passages }
}

// ── 단계 3: 이집트 암미야(구어체) 기도문 ──
// 엑셀: 음성 파일 폴더의 Egyptian_Arabic_Prayers_*.xlsx — 시트 = 장(1~8), 시트 안 "📌 패턴 N: ..." 으로 패턴 구분
//   표: A 순서(번호) B 한국어 의미 C 이집트 구어체 아랍어 D 한글 발음. 번호가 없는 줄 = 바로 위 표현의 다른 형태
// 음원: "7. 요청의 기도(패턴 1,1-14번까지).mp3" → 7장 · 패턴 1 · 1~14번. "7-10. ….mp3" → 7장 패턴 10
//   패턴이 하나뿐인 장(1, 3, 5, 8)은 파일 이름에 패턴이 없다
// → 음원 하나 = 단원 하나, 표현 한 줄 = 절 하나 (화면에는 "표현"). 다른 형태는 그 표현의 alts
function buildPrayer() {
  const xlsx = fs.readdirSync(PRAYER_AUDIO_DIR).find(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
  if (!xlsx) throw new Error(`기도문 엑셀을 찾지 못했어요: ${PRAYER_AUDIO_DIR}`)
  console.log('엑셀:', path.relative(FILES, path.join(PRAYER_AUDIO_DIR, xlsx)))
  // 아랍어 정리: 구어체 표시 "(ع)" 빼기, 따로 떨어진 문장부호·빗금은 앞 단어에 붙이기
  const cleanAr = (s) => (s || '').replace(/\(ع\)\s*/g, '').replace(/\s+([!?؟.,،:؛/])/g, '$1').replace(/\s+/g, ' ').trim()
  const cellText = (r) => Object.entries(r).filter(([k]) => k !== 'r').map(([, v]) => v).join(' ')
  // 패턴 문형에서 아랍어 부분만: 처음 나오는 한글 앞까지 자르고 끝에 남은 ( / 기호 정리
  //   "بِنْقَدِّمْ لِك (أَوْ بَاقَدِّمْ لِك) + اسم / 동명사 (빈갓딤 리크 …)" → "بِنْقَدِّمْ لِك (أَوْ بَاقَدِّمْ لِك) + اسم"
  const arabicFormula = (s) => {
    const k = s.search(/[가-힣]/)
    return (k < 0 ? s : s.slice(0, k)).replace(/[\s(/[+]+$/, '').trim()
  }

  // 장 → { title, patterns: [{ no, title, formula, items: [{ n, ko, ar, pron, alts }] }] }
  const chapters = new Map()
  for (const sheet of readXlsx(path.join(PRAYER_AUDIO_DIR, xlsx))) {
    const ch = parseInt(sheet.name, 10)
    if (!ch) continue
    const chapter = { title: sheet.name.trim(), patterns: [] }
    let pat = null
    for (const r of sheet.rows) {
      const text = cellText(r)
      if (text.includes('📌')) {
        // "📌 패턴 1: 명사에 대한 감사 (...)  |  بَاشْكُرَكْ عَلَى + اسم (바슈쿠락 알라 + 명사)"
        const [ko, ar = ''] = text.replace('📌', '').split('|').map(s => s.trim())
        const no = +(/패턴\s*(\d+)/.exec(ko)?.[1] || 0)
        pat = { no, title: ko.replace(/^패턴\s*\d+\s*:\s*/, '').trim(), formula: arabicFormula(ar), items: [] }
        chapter.patterns.push(pat)
        continue
      }
      if (!pat || !r.C) continue
      if (/^\d+$/.test(r.A || '')) {
        pat.items.push({ n: +r.A, ko: r.B || '', ar: cleanAr(r.C), pron: r.D || '', alts: [] })
      } else if (pat.items.length) {
        pat.items[pat.items.length - 1].alts.push({ ar: cleanAr(r.C), pron: r.D || '' })
      }
    }
    chapters.set(ch, chapter)
  }

  const audioFiles = fs.readdirSync(PRAYER_AUDIO_DIR).filter(f => f.endsWith('.mp3'))
  const units = audioFiles.map(file => {
    const m = /^(\d+)(?:-(\d+))?\./.exec(file)
    if (!m) { warnings.push(`기도문 음원 "${file}": 앞 번호를 찾지 못했어요`); return null }
    const ch = +m[1]
    const note = /\(([^)]*)\)\s*\.mp3$/.exec(file)?.[1] || ''
    const patNo = m[2] ? +m[2] : +(/패턴\s*(\d+)/.exec(note)?.[1] || 0)
    const range = /(\d+)\s*[-~]\s*(\d+)\s*번/.exec(note)
    const chapter = chapters.get(ch)
    const pat = chapter?.patterns.find(p => p.no === patNo) || (chapter?.patterns.length === 1 ? chapter.patterns[0] : null)
    if (!pat) { warnings.push(`기도문 음원 "${file}": 엑셀에서 ${ch}장 패턴 ${patNo || '?'} 을 찾지 못했어요`); return null }
    const from = range ? +range[1] : 1
    const to = range ? +range[2] : Infinity
    const items = pat.items.filter(it => it.n >= from && it.n <= to)
    if (!items.length) { warnings.push(`기도문 음원 "${file}": 표현이 없어요`); return null }
    return { file, ch, pat, from, to: range ? to : null, items }
  }).filter(Boolean)
    .sort((a, b) => a.ch - b.ch || a.pat.no - b.pat.no || a.from - b.from)

  const passages = units.map((u, i) => {
    const chapter = chapters.get(u.ch)
    const multi = chapter.patterns.length > 1
    const rangeLabel = u.to ? ` (${u.from}~${u.to}번)` : ''
    const id = `pray_${u.ch}${u.pat.no ? `_p${u.pat.no}` : ''}${u.to ? `_${u.from}-${u.to}` : ''}`
    const verses = u.items.map(it => {
      const v = { n: it.n, ko: it.ko, ar: it.ar, pron: it.pron }
      if (it.alts.length) v.alts = it.alts
      return v
    })
    keepFixed(id, verses)
    return {
      id,
      no: i + 1,
      unit: '표현',
      group: chapter.title,
      ref: multi ? `${u.ch}. 패턴 ${u.pat.no}${rangeLabel}` : `${chapter.title}${rangeLabel}`,
      topic: multi ? u.pat.title : undefined,
      formula: u.pat.formula || undefined,
      audio: copyAudio(path.join(PRAYER_AUDIO_DIR, u.file), id),
      verses,
    }
  })
  // 쓰지 않은 패턴 (녹음이 없는 패턴)
  for (const [ch, chapter] of chapters) {
    for (const p of chapter.patterns) {
      const covered = units.filter(u => u.ch === ch && u.pat === p).flatMap(u => u.items.map(it => it.n))
      const missing = p.items.filter(it => !covered.includes(it.n)).map(it => it.n)
      if (missing.length) warnings.push(`기도문 ${ch}장 패턴 ${p.no || '-'}: 녹음이 없는 표현 ${missing.join(',')}번`)
    }
  }
  console.log(`  기도문: 단원 ${passages.length}개, 표현 ${passages.reduce((a, p) => a + p.verses.length, 0)}개`)
  return { stage: 3, name: '암미야 기도문', passages }
}

// 녹음과 글이 맞는지 판정 (기도문용)
//  - 발화 속도가 3~7 음절/초 밖이면 → 반복해서 읽었거나(느림) 일부를 건너뜀(빠름)
//  - 0.4초 넘는 쉼으로 나눈 말소리 묶음이 표현 수보다 적으면 → 빠진 표현이 있음
//    (짧은 표현 목록은 1초 미만의 쉼으로 이어 읽는 경우가 많아 0.9초 기준은 너무 엄격했음)
//  - 맞춘 결과에서 다른 표현보다 1.5배 넘게 빠르거나 느린 표현이 30% 넘으면 → 경계가 엉킴
function timingQuality(verses, words, segs, times) {
  const groups = []
  for (const [a, b] of segs) {
    const g = groups[groups.length - 1]
    if (g && a - g.end < 0.4) { g.end = b; g.speech += b - a } else groups.push({ end: b, speech: b - a })
  }
  const G = groups.filter(g => g.speech >= 0.25).length
  const N = verses.filter(v => !v.noAudio).length
  const speech = segs.reduce((acc, [a, b]) => acc + b - a, 0)
  const rate = words.reduce((acc, w) => acc + w.syl, 0) / speech
  const rates = verses.map((v, vi) => {
    if (v.noAudio) return null
    const idx = words.map((_, i) => i).filter(i => words[i].verseIndex === vi)
    return (times[idx[idx.length - 1]].end - times[idx[0]].start) / idx.reduce((acc, i) => acc + words[i].syl, 0)
  }).filter(Boolean)
  const med = [...rates].sort((a, b) => a - b)[rates.length >> 1]
  const odd = rates.filter(r => r / med > 1.5 || med / r > 1.5).length / rates.length
  if (rate < 3) return { ok: false, why: `느림 ${rate.toFixed(1)}음절/초 — 반복 낭독으로 보임` }
  if (rate > 7) return { ok: false, why: `빠름 ${rate.toFixed(1)}음절/초 — 빠진 표현이 있어 보임` }
  if (G < N - Math.max(1, Math.round(N * 0.15))) return { ok: false, why: `말소리 묶음 ${G}개 < 표현 ${N}개 — 빠진 표현이 있어 보임` }
  if (odd > 0.3) return { ok: false, why: `표현 경계가 고르지 않음 (${Math.round(odd * 100)}%)` }
  return { ok: true }
}

const stages = [buildDA(), buildNav(), buildPrayer()]
const all = stages.flatMap(s => s.passages)

// ── 절 타이밍 자동 계산 (녹음의 쉼 + 발음 길이 맞추기, 앱과 같은 align.js) ──
if (!noAlign) {
  const { MPEGDecoder } = await import('mpg123-decoder')
  for (const p of all) {
    if (!p.audio) continue
    const decoder = new MPEGDecoder()
    await decoder.ready
    const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(path.join(APP, 'public', p.audio))))
    decoder.free()
    const samples = channelData[0]
    const words = tokenize(p.verses)
    const segs = detectSpeech(samples, sampleRate)
    const auto = alignAuto(words, segs, { intro: p.unit !== '표현' })
    const duration = samples.length / sampleRate
    p.duration = Math.round(duration * 10) / 10
    if (!auto) { warnings.push(`${p.ref}: 자동 맞추기 실패`); continue }
    const starts = p.verses.map((_, vi) => auto.times[words.findIndex(w => w.verseIndex === vi)].start)
    // 녹음 맨 앞에서 장절 제목을 읽으면 첫 절은 제목 뒤에서 시작 (제목이 없으면 0초)
    p.verses.forEach((v, vi) => {
      if (v.startFixed) return
      v.start = vi === 0 && !auto.introEnd ? 0 : Math.max(0, Math.round((starts[vi] - 0.12) * 10) / 10)
    })
    // 기도문 녹음은 표현을 반복해 읽거나 일부를 건너뛴 단원이 있다 → 자동 색칠을 믿을 수 있는지 판정
    let note = ''
    if (p.unit === '표현' && !p.verses.some(v => v.startFixed)) {
      const q = timingQuality(p.verses, words, segs, auto.times)
      if (!q.ok) {
        p.autoTiming = false
        p.verses.forEach(v => { delete v.start })
        note = `  ⚠ 자동 색칠 끔 (${q.why})`
      }
    }
    console.log(`  ${p.ref.padEnd(16)} ${duration.toFixed(1)}s  ${auto.introEnd ? `제목 ~${auto.introEnd.toFixed(1)}s  ` : ''}${note || `절 시작: ${p.verses.map(v => `${v.n}:${v.start}${v.startFixed ? '*' : ''}`).join(' ')}`}`)
  }
} else {
  // 타이밍 계산을 건너뛰면 이전 값 유지
  for (const p of all) {
    const o = prevById.get(p.id)
    if (!o) continue
    p.duration = o.duration
    if (o.autoTiming === false) p.autoTiming = false
    p.verses.forEach((v, i) => { if (v.start == null && String(o.verses[i]?.n) === String(v.n)) v.start = o.verses[i].start })
  }
}

const out = {
  title: '아랍어 성경 암송 · 기도문',
  translation: '한국어 개역개정(DA)·개역한글(네비게이토) · 아랍어 Van Dyck · 기도문은 이집트 구어체(암미야) · 엑셀에서 옮김, 오타 가능',
  stages,
}
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 1) + '\n')
console.log(`\n✓ ${path.relative(process.cwd(), OUT_JSON)} — ${stages.map(s => `${s.name} ${s.passages.length}구절`).join(', ')}`)
if (warnings.length) console.log('\n확인할 것:\n' + warnings.map(w => '  · ' + w).join('\n'))
