// Vercel Serverless Function — GET /api/deputes
// Sources data from Assemblée Nationale open data CSV (with group info)
import https from 'https'

const CSV_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_csv_opendata/liste_deputes_libre_office.csv'

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

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header respecting quotes
  function parseLine(line) {
    const fields = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  const results = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i])
    if (fields.length < 9) continue

    results.push({
      uid: fields[0] || '',
      prenom: fields[1] || '',
      nom: fields[2] || '',
      region: fields[3] || '',
      departement: fields[4] || '',
      circo: fields[5] || '',
      profession: fields[6] || '',
      groupe: fields[7] || fields[8] || 'Non-Inscrit',
      groupeAbrege: fields[8] || fields[7] || 'NI',
    })
  }

  return results
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL) {
    return res.json(cache)
  }

  try {
    const buf = await fetchBuffer(CSV_URL)
    const deputes = parseCSV(buf.toString('utf-8'))

    cache = { deputes, count: deputes.length }
    cacheTime = now

    res.json(cache)
  } catch (err) {
    console.error('API /deputes:', err)
    res.status(500).json({ error: err.message })
  }
}
