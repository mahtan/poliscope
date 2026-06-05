// Vercel Serverless Function — GET /api/depute/:uid
// Returns deputy details + recent vote history
import https from 'https'
import AdmZip from 'adm-zip'

const CSV_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_csv_opendata/liste_deputes_libre_office.csv'
const SCRUTINS_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip'

let cache = { csv: null, scrutins: null, time: 0 }
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

  const results = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i])
    if (fields.length < 9) continue
    results.push({
      uid: fields[0], prenom: fields[1], nom: fields[2],
      region: fields[3], departement: fields[4], circo: fields[5],
      profession: fields[6], groupe: fields[7], groupeAbrege: fields[8],
    })
  }
  return results
}

function findDepute(uid, scrutins) {
  // Scrutins: find all votes by this deputy
  const votes = []
  for (const s of scrutins.slice(0, 200)) {
    const mise = s.miseAuPoint || {}
    const dysf = mise.dysfonctionnement || {}

    // Check pours, contres, abstentions arrays for this deputy
    const checkList = (list) => {
      if (!list) return false
      const items = Array.isArray(list) ? list : [list]
      return items.some((v) => v?.acteurRef === uid || v?.acteurRef?.['#text'] === uid)
    }

    let position = null
    if (checkList(mise.pours)) position = 'pour'
    else if (checkList(mise.contres)) position = 'contre'
    else if (checkList(mise.abstentions)) position = 'abstention'

    // If not in miseAuPoint, check decompositionNominatifs
    if (!position) {
      const vv = s.ventilationVotes?.organe?.groupes?.groupe
      if (vv) {
        const groupes = Array.isArray(vv) ? vv : [vv]
        for (const g of groupes) {
          const vote = g.vote
          if (!vote) continue
          for (const pos of ['pours', 'contres', 'abstentions']) {
            const nominatif = vote.decompteNominatif?.[pos]?.votant
            if (!nominatif) continue
            const votants = Array.isArray(nominatif) ? nominatif : [nominatif]
            if (votants.some((v) => v?.acteurRef === uid)) {
              position = pos === 'pours' ? 'pour' : pos === 'contres' ? 'contre' : 'abstention'
              break
            }
          }
          if (position) break
        }
      }
    }

    if (position) {
      votes.push({
        uid: s.uid,
        titre: s.titre,
        dateScrutin: s.dateScrutin,
        position,
        sort: s.sort,
        nbVotants: s.syntheseVote?.nombreVotants,
      })
    }
  }

  return votes
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const uid = req.query.uid

  if (!uid) {
    return res.status(400).json({ error: 'Missing depute UID' })
  }

  const now = Date.now()

  try {
    // Fetch CSV (always, or from cache)
    if (!cache.csv || now - cache.time > CACHE_TTL) {
      const [csvBuf, scrZips] = await Promise.all([
        fetchBuffer(CSV_URL),
        fetchBuffer(SCRUTINS_URL),
      ])
      const csv = parseCSV(csvBuf.toString('utf-8'))
      const zip = new AdmZip(scrZips)
      const scrEntries = zip.getEntries().filter((e) => e.entryName.endsWith('.json'))

      const scrutins = scrEntries.map((e) => {
        try { return JSON.parse(e.getData().toString('utf-8')).scrutin }
        catch { return null }
      }).filter(Boolean)

      // Sort by date desc
      scrutins.sort((a, b) => (a.dateScrutin < b.dateScrutin) ? 1 : -1)

      cache = { csv, scrutins, time: now }
    }

    // Find deputy
    const depute = cache.csv.find((d) => d.uid === uid)
    if (!depute) {
      return res.status(404).json({ error: 'Depute not found' })
    }

    // Find votes
    const votes = findDepute(uid, cache.scrutins)

    // Stats
    const totalVotes = votes.length
    const pour = votes.filter((v) => v.position === 'pour').length
    const contre = votes.filter((v) => v.position === 'contre').length
    const abstention = votes.filter((v) => v.position === 'abstention').length

    res.json({
      ...depute,
      stats: { totalVotes, pour, contre, abstention },
      votes: votes.slice(0, 50),
    })
  } catch (err) {
    console.error('API /depute/[uid]:', err)
    res.status(500).json({ error: err.message })
  }
}
