// 아랍어 본문을 단어(띄어쓰기 단위)로 나누고, 단어마다 "말하는 길이"의 근사치(syl)를 매긴다.
//
// 녹음은 아랍어 낭독이다. 모음 부호가 없는 아랍어(DA 엑셀)는 글자 수가 발음 길이를 잘 나타내지 못하므로,
// 절마다 있는 "한국어 발음"(예: 이슈마 야 이스라이룰)의 음절 수를 그 절의 길이로 쓴다.
//  - 발음 단어 수 = 아랍어 단어 수 → 단어별로 그 발음의 음절 수
//  - 다르면 → 절 전체 발음 음절 수를 아랍어 글자 수 비율로 나눔
//  - 발음이 없고 모음 부호가 있으면(네비게이토 엑셀) → 모음 부호 수 = 음절 수

const HANGUL = /[가-힣]/g
const LATIN = /[A-Za-z]/g
const DIGIT = /[0-9٠-٩]/g
const AR_LETTER = /[ء-يٱ-ۓ]/g
const PUNCT_END = /[,.;:!?،؛。…」』")\]]$/

export function koSyllables(word) {
  const h = (word.match(HANGUL) || []).length
  const l = (word.match(LATIN) || []).length * 0.4
  const d = (word.match(DIGIT) || []).length * 1.5
  return h + l + d
}

export function arLetters(word) {
  return (word.match(AR_LETTER) || []).length
}

// 모음 부호(Tashkeel)가 있는 아랍어: 짧은 모음(fatha·damma·kasra)과 tanwin 하나가 음절 하나
const HARAKA = /[ً-ِٰ]/g
export function arSyllables(word) {
  return (word.match(HARAKA) || []).length
}

const splitWords = (s) => (s || '').split(/\s+/).filter(Boolean)

// 한 줄(아랍어 + 그 발음)의 단어별 길이
function lineSyllables(arText, pronText) {
  const ar = splitWords(arText)
  const pron = splitWords(pronText)
  const pronSyl = pron.map(koSyllables)
  const lineSyl = pronSyl.reduce((a, b) => a + b, 0)
  const letters = ar.map(arLetters)
  const totalLetters = letters.reduce((a, b) => a + b, 0) || 1
  const sameCount = pron.length === ar.length && pronSyl.every(s => s > 0)
  const harakat = ar.map(arSyllables)
  const vowelled = harakat.reduce((a, b) => a + b, 0) >= totalLetters * 0.4
  return ar.map((text, k) => {
    let syl
    if (sameCount) syl = pronSyl[k]
    else if (lineSyl > 0) syl = (lineSyl * letters[k]) / totalLetters
    else if (vowelled) syl = harakat[k] // 발음은 없지만 모음 부호가 있으면 그 수로
    else syl = letters[k] / 1.6 // 둘 다 없으면 글자 수로 근사
    return { text, syl }
  })
}

// passage.verses → 아랍어 단어 목록 (화면 표시와 정렬에 같은 목록을 쓴다)
// { text, verseIndex, part, syl, verseEnd, punct }
//   part: 0 = 본 표현, 1.. = 다른 형태(v.alts, 기도문). 녹음은 본 표현 → 다른 형태 순서로 읽는다
export function tokenize(verses) {
  const words = []
  verses.forEach((v, vi) => {
    const lines = [{ ar: v.ar, pron: v.pron }, ...(v.alts || [])]
    const start = words.length
    lines.forEach((line, part) => {
      for (const { text, syl } of lineSyllables(line.ar, line.pron)) {
        words.push({
          text,
          verseIndex: vi,
          part,
          // 녹음에서 빠진 줄: 시간을 거의 주지 않음 (색칠되지 않음)
          syl: v.noAudio ? 0.05 : Math.max(0.5, syl),
          verseEnd: false,
          punct: PUNCT_END.test(text),
        })
      }
      // 본 표현과 다른 형태 사이에는 보통 쉼이 있다 → 줄 끝을 문장부호처럼 취급
      if (part < lines.length - 1 && words.length > start) words[words.length - 1].punct = true
    })
    if (words.length > start) words[words.length - 1].verseEnd = true
  })
  return words
}
