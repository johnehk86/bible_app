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

const stages = [buildDA(), buildNav()]
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
    const auto = alignAuto(words, segs)
    const duration = samples.length / sampleRate
    p.duration = Math.round(duration * 10) / 10
    if (!auto) { warnings.push(`${p.ref}: 자동 맞추기 실패`); continue }
    const starts = p.verses.map((_, vi) => auto.times[words.findIndex(w => w.verseIndex === vi)].start)
    // 녹음 맨 앞에서 장절 제목을 읽으면 첫 절은 제목 뒤에서 시작 (제목이 없으면 0초)
    p.verses.forEach((v, vi) => {
      if (v.startFixed) return
      v.start = vi === 0 && !auto.introEnd ? 0 : Math.max(0, Math.round((starts[vi] - 0.12) * 10) / 10)
    })
    console.log(`  ${p.ref.padEnd(16)} ${duration.toFixed(1)}s  ${auto.introEnd ? `제목 ~${auto.introEnd.toFixed(1)}s  ` : ''}절 시작: ${p.verses.map(v => `${v.n}:${v.start}${v.startFixed ? '*' : ''}`).join(' ')}`)
  }
} else {
  // 타이밍 계산을 건너뛰면 이전 값 유지
  for (const p of all) {
    const o = prevById.get(p.id)
    if (!o) continue
    p.duration = o.duration
    p.verses.forEach((v, i) => { if (v.start == null && String(o.verses[i]?.n) === String(v.n)) v.start = o.verses[i].start })
  }
}

const out = {
  title: '아랍어 성경 암송',
  translation: '한국어 개역개정(DA)·개역한글(네비게이토) · 아랍어 Van Dyck · 엑셀에서 옮김, 오타 가능',
  stages,
}
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 1) + '\n')
console.log(`\n✓ ${path.relative(process.cwd(), OUT_JSON)} — ${stages.map(s => `${s.name} ${s.passages.length}구절`).join(', ')}`)
if (warnings.length) console.log('\n확인할 것:\n' + warnings.map(w => '  · ' + w).join('\n'))
