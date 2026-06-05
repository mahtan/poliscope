// Vercel Serverless Function — GET /api/deputes
import https from 'https'
import AdmZip from 'adm-zip'

const DEPUTES_URL =
  'https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip'

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

function extractDepute(entry) {
  try {
    const obj = JSON.parse(entry.getData().toString('utf-8'))
    const a = obj?.acteur
    if (!a) return null

    const ident = a.etatCivil?.ident || {}
    const naissance = a.etatCivil?.infoNaissance || {}

    const mandats = a.mandats?.mandat || []
    const mandat = Array.isArray(mandats)
      ? mandats.find((m) => m?.viMoDe?.dateFin === null || m?.viMoDe?.dateFin === '')
      : null

    let groupe = 'Non-Inscrit'
    if (mandat) {
      const orgRef = mandat.organes?.organeRef
      if (typeof orgRef === 'string') groupe = orgRef
      else if (orgRef?.['#text']) groupe = orgRef['#text']
    }

    return {
      uid: a.uid?.['#text'] || a.uid || '',
      prenom: ident.prenom || '',
      nom: ident.nom || '',
      civ: ident.civ || '',
      trigramme: ident.trigramme || '',
      dateNaissance: naissance.dateNais || '',
      departement: naissance.depNais || '',
      groupe,
      mandat: mandat ? {
        libelle: mandat.libelle || '',
        libelleAbrege: mandat.libelleAbrege || '',
        dateDebut: mandat.viMoDe?.dateDebut || '',
        legislature: mandat.legislature || '',
      } : null,
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
    return res.json(cache)
  }

  try {
    const zipBuf = await fetchBuffer(DEPUTES_URL)
    const zip = new AdmZip(zipBuf)
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.json'))

    const deputes = entries.map(extractDepute).filter(Boolean)

    cache = { deputes, count: deputes.length }
    cacheTime = now

    res.json(cache)
  } catch (err) {
    console.error('API /deputes:', err)
    res.status(500).json({ error: err.message })
  }
}
