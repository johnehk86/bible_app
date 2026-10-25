// 자동 맞추기 점검: mp3를 풀어서 앱과 같은 align 을 돌리고 결과를 출력한다.
//   npm run check-align              → 전체 구절 요약 (절 시작, 절별 발화 속도 편차)
//   npm run check-align -- jn_1_1-18 → 한 구절의 단어별 시간
// 절별 속도(초/음절)가 다른 절보다 크게 다르면 그 절 경계가 의심스럽다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MPEGDecoder } from 'mpg123-decoder'
import { tokenize } from '../src/lib/text.js'
import { detectSpeech, alignAuto } from '../src/lib/align.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/passages.json'), 'utf8'))
const all = data.stages.flatMap(s => s.passages)
const only = process.argv[2]

for (const p of all) {
  if (only && p.id !== only) continue
  if (!p.audio) { console.log(p.id, '(녹음 없음)'); continue }
  const decoder = new MPEGDecoder()
  await decoder.ready
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(path.join(root, p.audio))))
  decoder.free()
  const samples = channelData[0]
  const words = tokenize(p.verses)
  const segs = detectSpeech(samples, sampleRate)
  const auto = alignAuto(words, segs)
  const times = auto?.times
  if (!times) { console.log(p.id, '정렬 실패'); continue }

  const verses = p.verses.map((v, vi) => {
    const idx = words.map((w, i) => i).filter(i => words[i].verseIndex === vi)
    const start = times[idx[0]].start
    const end = times[idx[idx.length - 1]].end
    const syl = idx.reduce((a, i) => a + words[i].syl, 0)
    return { n: v.n, start, end, rate: (end - start) / syl, data: v.start }
  })
  const rates = verses.map(v => v.rate)
  const med = [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)]
  const odd = verses.filter(v => v.rate / med > 1.35 || med / v.rate > 1.35)
  console.log(`${p.id.padEnd(13)} ${p.ref.padEnd(16)} 제목 ${auto.introEnd ? auto.introEnd.toFixed(1) + 's' : '없음'}  절 ${verses.length}  속도 ${(1 / med).toFixed(1)}음절/초` +
    (odd.length ? `  ⚠ 속도가 튀는 절: ${odd.map(v => `${v.n}(${(v.rate / med).toFixed(2)}x)`).join(' ')}` : '  ✓'))

  if (only) {
    verses.forEach(v => console.log(`  ${v.n}절  ${v.start.toFixed(1)}–${v.end.toFixed(1)}s  속도 ${(v.rate / med).toFixed(2)}x  (데이터 start=${v.data})`))
    words.forEach((w, i) => console.log(`    ${times[i].start.toFixed(2).padStart(6)}–${times[i].end.toFixed(2).padStart(6)}  ${w.text}${w.verseEnd ? '  ⏎' : ''}`))
  }
}
