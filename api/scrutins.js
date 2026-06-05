// Vercel Serverless Function — GET /api/scrutins
import https from 'https'
import AdmZip from 'adm-zip'

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

function extractScrutin(entry) {
  try {
    const obj = JSON.parse(entry.getData().toString('utf-8'))
    const s = obj?.scrutin
    if (!s) return null

    const decompte = s.syntheseVote?.decompte || {}
    const pour = parseInt(decompte.pour || '0', 10)
    const contre = parseInt(decompte.contre || '0', 10)
    const abstention = parseInt(decompte.abstentions || '0', 10)
    const nbVotants = parseInt(s.syntheseVote?.nombreVotants || '0', 10)

    return {
      uid: s.uid || '',
      numero: s.numero || '',
      titre: s.titre || '',
      objet: s.objet || '',
      dateScrutin: s.dateScrutin || '',
      sort: s.sort || '',
      legislature: s.legislature || '',
      demandeur: s.demandeur || '',
      nbVotants,
      votes: { pour, contre, abstention },
    }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json({ scrutins: cache, count: cache.length, cached: true })
  }

  try {
    const zipBuf = await fetchBuffer(SCRUTINS_URL)
    const zip = new AdmZip(zipBuf)
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.json'))

    const scrutins = entries.map(extractScrutin).filter(Boolean)

    // Sort by date descending (newest first)
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
