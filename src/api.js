// API layer for Assemblée Nationale data
const BASE = 'https://datan.assemblee-nationale.fr/api/v1'

export async function fetchDeputes() {
  const res = await fetch(`${BASE}/acteurs?limit=1000`)
  const data = await res.json()
  return data.acteurs || []
}

export async function fetchDeputeDetails(uid) {
  const res = await fetch(`${BASE}/acteurs/${uid}`)
  const data = await res.json()
  return data.acteur
}

export async function fetchScrutins(limit = 50) {
  const res = await fetch(`${BASE}/scrutins?limit=${limit}&sort=dateScrutin:desc`)
  const data = await res.json()
  return data.scrutins || []
}

export async function fetchScrutinDetails(uid) {
  const res = await fetch(`${BASE}/scrutins/${uid}`)
  const data = await res.json()
  return data.scrutin
}

// Groups mapping
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
}

function guessGroup(groupe) {
  if (!groupe) return GROUPES['groupe-ni']
  const g = groupe.toLowerCase()
  if (g.includes('lfi') || g.includes('insoumis')) return GROUPES['groupe-lfi']
  if (g.includes('écologiste') || g.includes('ecolo')) return GROUPES['groupe-eco']
  if (g.includes('socialiste')) return GROUPES['groupe-soc']
  if (g.includes('démocrate') || g.includes('modem')) return GROUPES['groupe-modem']
  if (g.includes('horizons')) return GROUPES['groupe-hor']
  if (g.includes('renaissance')) return GROUPES['groupe-ren']
  if (g.includes('républicain') || g.includes('lr')) return GROUPES['groupe-lr']
  if (g.includes('rassemblement') || g.includes('rn')) return GROUPES['groupe-rn']
  if (g.includes('liot')) return GROUPES['groupe-liot']
  if (g.includes('non-inscrit') || g.includes('ni')) return GROUPES['groupe-ni']
  return { label: groupe, color: '#888888', short: groupe.slice(0, 4).toUpperCase() }
}

export function getGroupInfo(groupe) {
  return guessGroup(groupe)
}

// Circonscriptions mapping (simplified)
const CIRCO_JSON = {
  "01": { name: "Ain", seats: 5 },
  "02": { name: "Aisne", seats: 5 },
  "03": { name: "Allier", seats: 3 },
  "04": { name: "Alpes-de-Haute-Provence", seats: 2 },
  "05": { name: "Hautes-Alpes", seats: 2 },
  "06": { name: "Alpes-Maritimes", seats: 9 },
  "07": { name: "Ardèche", seats: 3 },
  "08": { name: "Ardennes", seats: 3 },
  "09": { name: "Ariège", seats: 2 },
  "10": { name: "Aube", seats: 3 },
  "11": { name: "Aude", seats: 3 },
  "12": { name: "Aveyron", seats: 3 },
  "13": { name: "Bouches-du-Rhône", seats: 16 },
  "14": { name: "Calvados", seats: 6 },
  "15": { name: "Cantal", seats: 2 },
  "16": { name: "Charente", seats: 3 },
  "17": { name: "Charente-Maritime", seats: 5 },
  "18": { name: "Cher", seats: 3 },
  "19": { name: "Corrèze", seats: 2 },
  "2A": { name: "Corse-du-Sud", seats: 2 },
  "2B": { name: "Haute-Corse", seats: 2 },
  "21": { name: "Côte-d'Or", seats: 5 },
  "22": { name: "Côtes-d'Armor", seats: 5 },
  "23": { name: "Creuse", seats: 1 },
  "24": { name: "Dordogne", seats: 4 },
  "25": { name: "Doubs", seats: 5 },
  "26": { name: "Drôme", seats: 4 },
  "27": { name: "Eure", seats: 5 },
  "28": { name: "Eure-et-Loir", seats: 4 },
  "29": { name: "Finistère", seats: 8 },
  "30": { name: "Gard", seats: 6 },
  "31": { name: "Haute-Garonne", seats: 10 },
  "32": { name: "Gers", seats: 2 },
  "33": { name: "Gironde", seats: 12 },
  "34": { name: "Hérault", seats: 9 },
  "35": { name: "Ille-et-Vilaine", seats: 8 },
  "36": { name: "Indre", seats: 2 },
  "37": { name: "Indre-et-Loire", seats: 5 },
  "38": { name: "Isère", seats: 10 },
  "39": { name: "Jura", seats: 3 },
  "40": { name: "Landes", seats: 3 },
  "41": { name: "Loir-et-Cher", seats: 3 },
  "42": { name: "Loire", seats: 6 },
  "43": { name: "Haute-Loire", seats: 2 },
  "44": { name: "Loire-Atlantique", seats: 10 },
  "45": { name: "Loiret", seats: 6 },
  "46": { name: "Lot", seats: 2 },
  "47": { name: "Lot-et-Garonne", seats: 3 },
  "48": { name: "Lozère", seats: 1 },
  "49": { name: "Maine-et-Loire", seats: 7 },
  "50": { name: "Manche", seats: 4 },
  "51": { name: "Marne", seats: 5 },
  "52": { name: "Haute-Marne", seats: 2 },
  "53": { name: "Mayenne", seats: 3 },
  "54": { name: "Meurthe-et-Moselle", seats: 6 },
  "55": { name: "Meuse", seats: 2 },
  "56": { name: "Morbihan", seats: 6 },
  "57": { name: "Moselle", seats: 9 },
  "58": { name: "Nièvre", seats: 2 },
  "59": { name: "Nord", seats: 21 },
  "60": { name: "Oise", seats: 7 },
  "61": { name: "Orne", seats: 3 },
  "62": { name: "Pas-de-Calais", seats: 12 },
  "63": { name: "Puy-de-Dôme", seats: 5 },
  "64": { name: "Pyrénées-Atlantiques", seats: 6 },
  "65": { name: "Hautes-Pyrénées", seats: 2 },
  "66": { name: "Pyrénées-Orientales", seats: 4 },
  "67": { name: "Bas-Rhin", seats: 9 },
  "68": { name: "Haut-Rhin", seats: 6 },
  "69": { name: "Rhône", seats: 14 },
  "70": { name: "Haute-Saône", seats: 2 },
  "71": { name: "Saône-et-Loire", seats: 5 },
  "72": { name: "Sarthe", seats: 5 },
  "73": { name: "Savoie", seats: 4 },
  "74": { name: "Haute-Savoie", seats: 6 },
  "75": { name: "Paris", seats: 18 },
  "76": { name: "Seine-Maritime", seats: 10 },
  "77": { name: "Seine-et-Marne", seats: 11 },
  "78": { name: "Yvelines", seats: 12 },
  "79": { name: "Deux-Sèvres", seats: 3 },
  "80": { name: "Somme", seats: 5 },
  "81": { name: "Tarn", seats: 3 },
  "82": { name: "Tarn-et-Garonne", seats: 2 },
  "83": { name: "Var", seats: 8 },
  "84": { name: "Vaucluse", seats: 5 },
  "85": { name: "Vendée", seats: 5 },
  "86": { name: "Vienne", seats: 4 },
  "87": { name: "Haute-Vienne", seats: 3 },
  "88": { name: "Vosges", seats: 4 },
  "89": { name: "Yonne", seats: 3 },
  "90": { name: "Territoire-de-Belfort", seats: 2 },
  "91": { name: "Essonne", seats: 10 },
  "92": { name: "Hauts-de-Seine", seats: 13 },
  "93": { name: "Seine-Saint-Denis", seats: 12 },
  "94": { name: "Val-de-Marne", seats: 11 },
  "95": { name: "Val-d'Oise", seats: 10 },
  "971": { name: "Guadeloupe", seats: 4 },
  "972": { name: "Martinique", seats: 4 },
  "973": { name: "Guyane", seats: 2 },
  "974": { name: "La Réunion", seats: 7 },
  "975": { name: "Saint-Pierre-et-Miquelon", seats: 1 },
  "976": { name: "Mayotte", seats: 2 },
  "977": { name: "Saint-Barthélemy", seats: 1 },
  "978": { name: "Saint-Martin", seats: 1 },
  "986": { name: "Wallis-et-Futuna", seats: 1 },
  "987": { name: "Polynésie Française", seats: 3 },
  "988": { name: "Nouvelle-Calédonie", seats: 2 },
  "989": { name: "Clipperton", seats: 0 },
}

export function getDepartement(code) {
  return CIRCO_JSON[code.padStart(2, '0')] || null
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
