// API layer — connects to our Vercel serverless backend

const API = '/api'

export async function fetchDeputes() {
  const res = await fetch(`${API}/deputes`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur API')
  return data.deputes || []
}

export async function fetchScrutins(limit = 50) {
  const res = await fetch(`${API}/scrutins`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur API')
  const scrutins = data.scrutins || []
  return limit ? scrutins.slice(0, limit) : scrutins
}

export async function fetchDeputeDetail(uid) {
  const res = await fetch(`${API}/depute/${uid}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur API')
  return data
}

// Group colors
export const GROUPES = {
  'LFI':  { label: 'LFI - NFP',       color: '#cc4125', short: 'LFI' },
  'GDR':  { label: 'GDR',              color: '#a50000', short: 'GDR' },
  'ÉCO':  { label: 'Écologiste - NFP', color: '#e06666', short: 'ÉCO' },
  'SOC':  { label: 'Socialiste - NFP', color: '#e69138', short: 'SOC' },
  'DEM':  { label: 'Démocrate (MoDem)',color: '#f6b26b', short: 'DEM' },
  'HOR':  { label: 'Horizons',         color: '#8e7cc3', short: 'HOR' },
  'EPR':  { label: 'Ensemble pour la République', color: '#6d9eeb', short: 'EPR' },
  'MODEM':{ label: 'MoDem',            color: '#3c78d8', short: 'MODEM' },
  'LR':   { label: 'LR',               color: '#38761d', short: 'LR' },
  'DR':   { label: 'Droite Républicaine', color: '#134f5c', short: 'DR' },
  'RN':   { label: 'Rassemblement National', color: '#741b47', short: 'RN' },
  'LIOT': { label: 'LIOT',             color: '#999999', short: 'LIOT' },
  'NI':   { label: 'Non-Inscrit',      color: '#666666', short: 'NI' },
  'UDI':  { label: 'UDI',              color: '#674ea7', short: 'UDI' },
}

export function getGroupInfo(groupe, groupeAbrege) {
  const abr = groupeAbrege || ''
  if (GROUPES[abr]) return GROUPES[abr]

  if (!groupe) return GROUPES['NI']
  const g = groupe.toLowerCase()
  if (g.includes('lfi') || g.includes('insoumis')) return GROUPES['LFI']
  if (g.includes('gauche démocrate')) return GROUPES['GDR']
  if (g.includes('écolog') || g.includes('ecolo')) return GROUPES['ÉCO']
  if (g.includes('socialiste')) return GROUPES['SOC']
  if (g.includes('démocrate') && !g.includes('républicain')) return GROUPES['DEM']
  if (g.includes('modem')) return GROUPES['MODEM']
  if (g.includes('horizons')) return GROUPES['HOR']
  if (g.includes('ensemble')) return GROUPES['EPR']
  if (g.includes('républicain') || g.includes('lr')) return GROUPES['LR']
  if (g.includes('rassemblement')) return GROUPES['RN']
  if (g.includes('liot') || g.includes('libertés') || g.includes('liberte')) return GROUPES['LIOT']
  if (g.includes('udi')) return GROUPES['UDI']
  if (g.includes('non-inscrit')) return GROUPES['NI']

  return { label: groupe, color: '#888888', short: (groupeAbrege || groupe).slice(0, 4).toUpperCase() }
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateRelative(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
