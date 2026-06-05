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

// Groups mapping (visible colors for the UI)
export const GROUPES = {
  'groupe-lfi': { label: 'LFI - NFP', color: '#cc4125', short: 'LFI' },
  'groupe-eco': { label: 'Écologiste - NFP', color: '#e06666', short: 'ÉCO' },
  'groupe-soc': { label: 'Socialiste - NFP', color: '#e69138', short: 'SOC' },
  'groupe-dem': { label: 'Démocrate (MoDem)', color: '#f6b26b', short: 'DEM' },
  'groupe-hor': { label: 'Horizons', color: '#8e7cc3', short: 'HOR' },
  'groupe-ren': { label: 'Renaissance', color: '#6d9eeb', short: 'REN' },
  'groupe-modem': { label: 'MoDem', color: '#3c78d8', short: 'MODEM' },
  'groupe-lr': { label: 'LR', color: '#38761d', short: 'LR' },
  'groupe-droite': { label: 'Droite Républicaine', color: '#134f5c', short: 'DR' },
  'groupe-rn': { label: 'RN', color: '#741b47', short: 'RN' },
  'groupe-liot': { label: 'LIOT', color: '#999999', short: 'LIOT' },
  'groupe-ni': { label: 'Non-Inscrit', color: '#666666', short: 'NI' },
  'groupe-uddi': { label: 'UDI', color: '#674ea7', short: 'UDI' },
  'groupe-gdr': { label: 'GDR', color: '#a50000', short: 'GDR' },
  'groupe-epr': { label: 'Ensemble', color: '#4a86e8', short: 'EPR' },
}

const GROUP_ALIASES = [
  { match: (g) => /lfi|insoumis/i.test(g), group: 'groupe-lfi' },
  { match: (g) => /(?:écolog?|ecolo|e.e|g.e)/i.test(g), group: 'groupe-eco' },
  { match: (g) => /soc|socialiste|ps /i.test(g), group: 'groupe-soc' },
  { match: (g) => /modem|démocrate|dem/i.test(g), group: 'groupe-dem' },
  { match: (g) => /horizons/i.test(g), group: 'groupe-hor' },
  { match: (g) => /renaissance|re/i.test(g), group: 'groupe-ren' },
  { match: (g) => /epr|ensemble/i.test(g), group: 'groupe-epr' },
  { match: (g) => /lr |républicain/i.test(g), group: 'groupe-lr' },
  { match: (g) => /rn |rassemblement/i.test(g), group: 'groupe-rn' },
  { match: (g) => /liot|libertés/i.test(g), group: 'groupe-liot' },
  { match: (g) => /ni |non-inscrit/i.test(g), group: 'groupe-ni' },
  { match: (g) => /udi/i.test(g), group: 'groupe-uddi' },
  { match: (g) => /gdr|démocrate.*républicain/i.test(g), group: 'groupe-gdr' },
]

export function getGroupInfo(groupe) {
  if (!groupe) return GROUPES['groupe-ni']
  for (const alias of GROUP_ALIASES) {
    if (alias.match(groupe)) return GROUPES[alias.group]
  }
  // Try direct key match (lowercase, no accents)
  const normalized = groupe
    .toLowerCase()
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/[^a-z0-9]/g, '')
  const keys = Object.keys(GROUPES)
  for (const key of keys) {
    if (key.includes(normalized)) return GROUPES[key]
    const short = GROUPES[key].short.toLowerCase()
    if (normalized.includes(short)) return GROUPES[key]
  }
  return { label: groupe, color: '#888888', short: groupe.slice(0, 4).toUpperCase() }
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
