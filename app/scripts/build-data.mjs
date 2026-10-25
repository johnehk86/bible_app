// 엑셀(DA 1단계 암송구절) → public/data/passages.json + public/audio/*.mp3
//
//   npm run data                     엑셀 읽기 + 음원 복사 + 절 타이밍 자동 계산
//   npm run data -- --no-align       타이밍 계산은 건너뜀 (본문만 갱신)
//   npm run data -- 경로/파일.xlsx    다른 엑셀 파일 사용
//
// 엑셀 형식 (시트 하나 = 구절 하나, 시트 순서 = 암송 순서):
//   시트 이름   "신명기 6장 4-9절", "시편 23편 1-6절", "갈라디아서 2장 20절"
//   4행부터     A: 성경 구절(신명기 6:4)  B: 한국어  C: 아랍어  D: 아랍어 한국어 발음
//
// 절 시작 시간(start)을 손으로 고정하고 싶으면 passages.json 에서 그 절에 "startFixed": true 를 넣는다.
// 다음에 이 스크립트를 다시 돌려도 그 값은 바뀌지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { tokenize } from '../src/lib/text.js'
import { detectSpeech, alignAuto } from '../src/lib/align.js'

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(APP, '..', 'files', 'DA 1단계 암송구절(아랍어) 음원')
const OUT_JSON = path.join(APP, 'public', 'data', 'passages.json')
const OUT_AUDIO = path.join(APP, 'public', 'audio')

// 성경 이름 → id 약어, 아랍어 이름
const BOOKS = {
  '신명기': { abbr: 'deut', ar: 'تثنية' },
  '시편': { abbr: 'ps', ar: 'مزامير' },
  '마태복음': { abbr: 'mat', ar: 'متى' },
  '요한복음': { abbr: 'jn', ar: 'يوحنا' },
  '로마서': { abbr: 'rom', ar: 'رومية' },
  '고린도전서': { abbr: '1cor', ar: '١ كورنثوس' },
  '고린도후서': { abbr: '2cor', ar: '٢ كورنثوس' },
  '갈라디아서': { abbr: 'gal', ar: 'غلاطية' },
  '데살로니가전서': { abbr: '1thess', ar: '١ تسالونيكي' },
}

// 음원 파일 찾기: 원본 폴더의 한글 파일 이름에서 성경 이름(또는 줄임말)과 장 번호로 고른다
const BOOK_ALIASES = { '마태복음': ['마태복음', '마'], '요한복음': ['요한복음', '요'], '고린도전서': ['고린도전서', '고전'] }

const args = process.argv.slice(2)
const noAlign = args.includes('--no-align')
const xlsxArg = args.find(a => a.endsWith('.xlsx'))

// ── 아주 작은 zip 읽기 (xlsx = zip) ──
function unzip(buf) {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('zip 형식이 아니에요')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = {}
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const csize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const lNameLen = buf.readUInt16LE(local + 26)
    const lExtraLen = buf.readUInt16LE(local + 28)
    const data = buf.subarray(local + 30 + lNameLen + lExtraLen, local + 30 + lNameLen + lExtraLen + csize)
    files[name] = method === 8 ? zlib.inflateRawSync(data) : data
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const xmlDecode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function readXlsx(file) {
  const z = unzip(fs.readFileSync(file))
  const txt = (n) => z[n]?.toString('utf8') ?? ''
  const shared = [...txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => xmlDecode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')))
  const rels = Object.fromEntries([...txt('xl/_rels/workbook.xml.rels').matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map(m => [m[1], m[2]]))
  const sheets = [...txt('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)]
    .map(m => ({ name: xmlDecode(m[1]), path: 'xl/' + rels[m[2]].replace(/^\/?xl\//, '') }))
  return sheets.map(s => {
    const rows = []
    for (const row of txt(s.path).matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = {}
      for (const c of row[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const [, col, attrs, inner = ''] = c
        let v
        if (/t="s"/.test(attrs)) v = shared[+(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])]
        else if (/t="inlineStr"/.test(attrs)) v = xmlDecode([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join(''))
        else v = xmlDecode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '')
        if (v != null && String(v).trim() !== '') cells[col] = String(v).trim()
      }
      rows.push({ r: +row[1], ...cells })
    }
    return { name: s.name, rows }
  })
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const arNum = (n) => String(n).replace(/\d/g, d => AR_DIGITS[d])

function parseSheetName(name) {
  // "신명기 6장 4-9절" / "시편 23편 1-6절" / "갈라디아서 2장 20절"
  const m = /^\s*(\S+)\s+(\d+)\s*[장편]\s*(\d+)(?:\s*[-~]\s*(\d+))?\s*절/.exec(name)
  if (!m) throw new Error(`시트 이름을 이해하지 못했어요: "${name}"`)
  const [, book, ch, a, b] = m
  if (!BOOKS[book]) throw new Error(`모르는 성경 이름: "${book}" (scripts/build-data.mjs 의 BOOKS 에 추가하세요)`)
  return { book, ch: +ch, first: +a, last: b ? +b : +a }
}

function findAudio(book, ch, srcFiles) {
  const names = BOOK_ALIASES[book] || [book]
  return srcFiles.find(f => {
    if (!f.endsWith('.mp3')) return false
    const m = /^(\S+?)\s*(\d+)\s*[장편]/.exec(f)
    return m && names.includes(m[1]) && +m[2] === ch
  })
}

// ── 1) 엑셀 → 구절 목록 ──
const srcFiles = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR) : []
const xlsx = xlsxArg || (srcFiles.find(f => f.endsWith('.xlsx')) && path.join(SRC_DIR, srcFiles.find(f => f.endsWith('.xlsx'))))
if (!xlsx || !fs.existsSync(xlsx)) throw new Error(`엑셀 파일을 찾지 못했어요: ${xlsx || SRC_DIR}`)
console.log('엑셀:', path.relative(process.cwd(), xlsx))

const prev = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : null
const prevById = new Map((prev?.stages || []).flatMap(s => s.passages).map(p => [p.id, p]))

fs.mkdirSync(OUT_AUDIO, { recursive: true })
const warnings = []
const passages = readXlsx(xlsx).map((sheet, idx) => {
  const { book, ch, first, last } = parseSheetName(sheet.name)
  const { abbr, ar } = BOOKS[book]
  const range = first === last ? `${first}` : `${first}-${last}`
  const id = `${abbr}_${ch}_${range}`

  const verses = sheet.rows
    .filter(r => r.r >= 4 && (r.B || r.C))
    .map(r => {
      const n = +(/:\s*(\d+)/.exec(r.A || '')?.[1])
      if (r.A && !r.A.startsWith(book)) warnings.push(`${sheet.name} ${r.r}행: 성경 이름이 "${r.A}" — ${book}(으)로 처리`)
      for (const [col, label] of [['B', '한국어'], ['C', '아랍어'], ['D', '발음']]) {
        if (!r[col]) warnings.push(`${sheet.name} ${r.r}행: ${label} 칸이 비어 있어요`)
      }
      return { n, ko: r.B || '', ar: r.C || '', pron: r.D || '' }
    })
  const nums = verses.map(v => v.n)
  const expected = Array.from({ length: last - first + 1 }, (_, k) => first + k)
  if (nums.join() !== expected.join()) warnings.push(`${sheet.name}: 절 번호 ${nums.join(',')} ≠ 시트 이름의 범위 ${first}-${last}`)

  // 음원 복사 (내용이 다를 때만)
  const srcAudio = findAudio(book, ch, srcFiles)
  let audio = null
  if (srcAudio) {
    const dst = path.join(OUT_AUDIO, `${id}.mp3`)
    const srcBuf = fs.readFileSync(path.join(SRC_DIR, srcAudio))
    if (!fs.existsSync(dst) || !srcBuf.equals(fs.readFileSync(dst))) {
      fs.writeFileSync(dst, srcBuf)
      console.log(`  음원 복사: ${srcAudio} → audio/${id}.mp3`)
    }
    audio = `audio/${id}.mp3`
  } else {
    warnings.push(`${sheet.name}: 음원 파일을 찾지 못했어요 (녹음 없음으로 표시)`)
  }

  // 손으로 고정한 절 시작 시간은 유지
  const old = prevById.get(id)
  verses.forEach((v, i) => {
    const o = old?.verses?.[i]
    if (o?.startFixed && o.n === v.n) { v.start = o.start; v.startFixed = true }
  })

  return {
    id,
    no: idx + 1,
    ref: `${book} ${ch}:${range}`,
    refAr: `${ar} ${arNum(ch)}: ${arNum(range)}`,
    audio,
    verses,
  }
})

// ── 2) 절 타이밍 자동 계산 (녹음의 쉼 + 발음 길이 맞추기, 앱과 같은 align.js) ──
if (!noAlign) {
  const { MPEGDecoder } = await import('mpg123-decoder')
  for (const p of passages) {
    if (!p.audio) continue
    const decoder = new MPEGDecoder()
    await decoder.ready
    const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(path.join(APP, 'public', p.audio))))
    decoder.free()
    const samples = channelData[0]
    const words = tokenize(p.verses)
    const segs = detectSpeech(samples, sampleRate)
    const auto = alignAuto(words, segs)
    const times = auto?.times
    const duration = samples.length / sampleRate
    p.duration = Math.round(duration * 10) / 10
    if (!times) { warnings.push(`${p.ref}: 자동 맞추기 실패`); continue }
    const starts = p.verses.map((_, vi) => times[words.findIndex(w => w.verseIndex === vi)].start)
    // 녹음 맨 앞에서 장절 제목을 읽으면 첫 절은 제목 뒤에서 시작 (제목이 없으면 0초)
    p.verses.forEach((v, vi) => {
      if (v.startFixed) return
      v.start = vi === 0 && !auto.introEnd ? 0 : Math.max(0, Math.round((starts[vi] - 0.12) * 10) / 10)
    })
    console.log(`  ${p.ref.padEnd(16)} ${duration.toFixed(1)}s  ${auto.introEnd ? `제목 ~${auto.introEnd.toFixed(1)}s  ` : ''}절 시작: ${p.verses.map(v => `${v.n}:${v.start}${v.startFixed ? '*' : ''}`).join(' ')}`)
  }
} else if (prev) {
  // 타이밍 계산을 건너뛰면 이전 값 유지
  for (const p of passages) {
    const o = prevById.get(p.id)
    if (!o) continue
    p.duration = o.duration
    p.verses.forEach((v, i) => { if (v.start == null && o.verses[i]?.n === v.n) v.start = o.verses[i].start })
  }
}

const out = {
  title: 'DA 1단계 암송구절',
  translation: '한국어 개역개정 · 아랍어 Van Dyck · 발음은 한국어 표기 (엑셀에서 옮김, 오타 가능)',
  stages: [{ stage: 1, name: 'DA 1단계', passages }],
}
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 1) + '\n')
console.log(`\n✓ ${path.relative(process.cwd(), OUT_JSON)} — 구절 ${passages.length}개, 절 ${passages.reduce((a, p) => a + p.verses.length, 0)}개`)
if (warnings.length) console.log('\n확인할 것:\n' + warnings.map(w => '  · ' + w).join('\n'))
