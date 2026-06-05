// Vercel Serverless Function — GET /api/scrutins
import https from 'https'
import zlib from 'node:zlib'

const SCRUTINS_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip'

let cache = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

function parseConcatenatedJSON(text) {
  const objects = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '{') {
      let depth = 0
      let j = i
      while (j < text.length) {
        if (text[j] === '{') depth++
        else if (text[j] === '}') {
          depth--
          if (depth === 0) break
        }
        j++
      }
      try {
        objects.push(JSON.parse(text.slice(i, j + 1)))
      } catch {}
      i = j + 1
    } else {
      i++
    }
  }
  return objects
}

function extractScrutin(obj) {
  const s = obj?.scrutin
  if (!s) return null

  // Count votes by position
  const votes = s.votes?.vote || []
  const voteCount = Array.isArray(votes) ? votes.length : 0
  const pour = Array.isArray(votes)
    ? votes.filter((v) => v?.position === 'pour' || v?.position === 'favorable').length
    : 0
  const contre = Array.isArray(votes)
    ? votes.filter((v) => v?.position === 'contre' || v?.position === 'défavorable').length
    : 0
  const abstention = Array.isArray(votes)
    ? votes.filter((v) => v?.position === 'abstention').length
    : 0

  return {
    uid: s.uid || '',
    numero: s.numero || '',
    titre: s.titre || '',
    objet: s.objet || '',
    dateScrutin: s.dateScrutin || '',
    sort: s.sort || '',
    legislature: s.legislature || '',
    demandeur: s.demandeur || '',
    nbVotants: voteCount,
    votes: {
      pour,
      contre,
      abstention,
    },
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json({
      scrutins: cache,
      count: cache.length,
      cached: true,
    })
  }

  try {
    const zipBuf = await fetchBuffer(SCRUTINS_URL)
    const jsonBuf = zlib.unzipSync(zipBuf)
    const objects = parseConcatenatedJSON(jsonBuf.toString('utf-8'))
    const scrutins = objects.map(extractScrutin).filter(Boolean)

    // Sort by date descending, newest first
    scrutins.sort((a, b) => {
      if (a.dateScrutin < b.dateScrutin) return 1
      if (a.dateScrutin > b.dateScrutin) return -1
      return 0
    })

    cache = scrutins
    cacheTime = now

    res.json({ scrutins, count: scrutins.length, cached: false })
  } catch (err) {
    console.error('API /scrutins:', err)
    res.status(500).json({ error: err.message })
  }
}
