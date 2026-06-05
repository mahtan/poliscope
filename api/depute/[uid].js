// Vercel Serverless Function — GET /api/depute/:uid
// Returns deputy details + recent vote history
import https from 'https'
import AdmZip from 'adm-zip'

const CSV_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_csv_opendata/liste_deputes_libre_office.csv'
const SCRUTINS_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip'

let cache = { csv: null, paUidMap: null, scrutins: null, time: 0 }
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

const DEPUTES_JSON_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip'

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

function buildPaUidMap(jsonZip) {
  const zip = new AdmZip(jsonZip)
  const map = {}
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.endsWith('.json')) continue
    try {
      const obj = JSON.parse(entry.getData().toString('utf-8'))
      const a = obj?.acteur
      if (!a) continue
      const paUid = a.uid?.['#text'] || a.uid
      if (!paUid) continue
      const ident = a.etatCivil?.ident || {}
      const key = `${ident.prenom || ''}|${ident.nom || ''}`.toLowerCase()
      map[key] = paUid
      map[paUid] = paUid // Also store by PA ID itself
    } catch {}
  }
  return map
}

function findDeputeVotes(paUid, scrutins) {
  const votes = []
  for (const s of scrutins.slice(0, 300)) {
    const groupes = s.ventilationVotes?.organe?.groupes?.groupe
    if (!groupes) continue

    const grpList = Array.isArray(groupes) ? groupes : [groupes]
    let position = null

    for (const grp of grpList) {
      const dn = grp.vote?.decompteNominatif
      if (!dn) continue

      for (const [key, posName] of Object.entries({
        pours: 'pour', contres: 'contre', abstentions: 'abstention'
      })) {
        const votant = dn[key]?.votant
        if (!votant) continue
        const list = Array.isArray(votant) ? votant : [votant]
        if (list.some((v) => v && (v.acteurRef === paUid))) {
          position = posName
          break
        }
      }
      if (position) break
    }

    // Also check miseAuPoint corrections
    if (!position) {
      const mise = s.miseAuPoint || {}
      for (const [key, posName] of Object.entries({
        pours: 'pour', contres: 'contre', abstentions: 'abstention'
      })) {
        const list = mise[key]
        if (list) {
          const arr = Array.isArray(list) ? list : [list]
          if (arr.some((v) => v && v.acteurRef === paUid)) {
            position = posName
            break
          }
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
    // Fetch all data (CSV + deputes JSON for PA UID + scrutins)
    if (!cache.csv || now - cache.time > CACHE_TTL) {
      const [csvBuf, depJsonZip, scrZips] = await Promise.all([
        fetchBuffer(CSV_URL),
        fetchBuffer(DEPUTES_JSON_URL),
        fetchBuffer(SCRUTINS_URL),
      ])
      const csv = parseCSV(csvBuf.toString('utf-8'))
      const paUidMap = buildPaUidMap(depJsonZip)

      const zip = new AdmZip(scrZips)
      const scrEntries = zip.getEntries().filter((e) => e.entryName.endsWith('.json'))
      const scrutins = scrEntries.map((e) => {
        try { return JSON.parse(e.getData().toString('utf-8')).scrutin }
        catch { return null }
      }).filter(Boolean)

      scrutins.sort((a, b) => (a.dateScrutin < b.dateScrutin) ? 1 : -1)

      cache = { csv, paUidMap, scrutins, time: now }
    }

    // Find deputy and resolve PA UID
    const depute = cache.csv.find((d) => d.uid === uid)
    if (!depute) {
      return res.status(404).json({ error: 'Depute not found' })
    }

    // Resolve PA-prefixed UID for vote lookup
    const nameKey = `${depute.prenom || ''}|${depute.nom || ''}`.toLowerCase()
    const paUid = cache.paUidMap[nameKey] || ''

    // Find votes using PA UID
    const votes = paUid ? findDeputeVotes(paUid, cache.scrutins) : []

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
