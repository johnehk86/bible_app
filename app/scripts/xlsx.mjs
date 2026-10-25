// 아주 작은 xlsx 읽기 (외부 라이브러리 없음): xlsx = zip 안의 XML
import fs from 'node:fs'
import zlib from 'node:zlib'

// zip 풀기 → { 파일이름: Buffer }
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

// 시트 목록 → [{ name, rows: [{ r: 행번호, A: ..., B: ... }] }]
export function readXlsx(file) {
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

