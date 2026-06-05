import { store } from './store.js'
import {
  fetchDeputes, fetchScrutins, fetchDeputeDetail,
  getGroupInfo, formatDate, formatDateRelative,
} from './api.js'

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const el = document.createElement('header')
  el.className = 'sticky top-0 z-50 glass border-b border-white/5'
  el.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <button class="flex items-center gap-2 hover:opacity-80 transition" data-nav="home">
        <span class="text-2xl">🔭</span>
        <span class="text-xl font-bold tracking-tight">Poliscope</span>
        <span class="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">beta</span>
      </button>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="live-dot"></span> Live
        </span>
        <button class="text-sm text-gray-400 hover:text-white transition flex items-center gap-1.5" data-nav="suivis">
          <span>⭐</span>
          <span data-follow-count>${store.get('suivis').length}</span>
        </button>
      </div>
    </div>
  `
  el.querySelector('[data-nav="home"]').onclick = () => store.set({ view: 'home' })
  el.querySelector('[data-nav="suivis"]').onclick = () => store.set({ view: 'suivis' })
  return el
}

// ─── Navigation ───────────────────────────────────────────
export function NavBar(showBack) {
  const nav = document.createElement('nav')
  nav.className = 'glass border-b border-white/5'
  nav.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 flex gap-6 text-sm">
      ${showBack
        ? `<button class="nav-btn py-3 text-amber-400 border-b-2 border-amber-500 transition" data-nav="back">
             ← Retour
           </button>`
        : ['🏠 Accueil', '🗺️ Carte', '📊 Votes', '⚔️ Comparer', '📡 Flux']
            .map((label, i) =>
              `<button class="nav-btn py-3 border-b-2 border-transparent hover:border-amber-500/50 transition text-gray-400" data-view="${['home','carte','scrutins','comparer','flux'][i]}">
                ${label}
               </button>`
            ).join('')
      }
    </div>
  `
  if (showBack) {
    nav.querySelector('[data-nav="back"]').onclick = () => store.set({ view: 'home', selectedDepute: null })
  } else {
    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => store.set({ view: btn.dataset.view, selectedDepute: null })
    })
    // Mark active
    const view = store.get().view
    nav.querySelectorAll('.nav-btn').forEach((btn) => {
      if (btn.dataset.view === view) {
        btn.classList.add('border-amber-500', 'text-amber-400')
        btn.classList.remove('border-transparent', 'text-gray-400')
      }
    })
  }
  return nav
}

// ─── Home View ────────────────────────────────────────────
export function HomeView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'

  store.set({ loading: true })
  Promise.all([fetchDeputes(), fetchScrutins(20)])
    .then(([deputes, scrutins]) => store.set({ deputes, scrutins, loading: false }))
    .catch(() => store.set({ error: 'Impossible de charger les données', loading: false }))

  section.innerHTML = `
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">
        L'Assemblée <span class="text-amber-400 heat-glow">en direct</span>
      </h1>
      <p class="text-gray-400">577 députés. Des votes. Des lois. Suis tout ça depuis ton canapé.</p>
    </div>

    <div class="relative mb-8">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
      <input type="text" id="search-depute"
        class="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3.5 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition"
        placeholder="Cherche un député, un département, un groupe..." />
    </div>

    <div id="home-skeleton" class="space-y-4">
      ${Array(6).fill('').map(() => `
        <div class="glass rounded-xl p-5 animate-pulse">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-white/5"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-white/5 rounded w-48"></div>
              <div class="h-3 bg-white/5 rounded w-32"></div>
            </div>
            <div class="h-6 w-16 bg-white/5 rounded-full"></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="home-results" class="card-grid hidden"></div>

    <div id="home-scrutins" class="mt-12 hidden"></div>
  `

  const searchInput = section.querySelector('#search-depute')
  const resultsDiv = section.querySelector('#home-results')
  const skeleton = section.querySelector('#home-skeleton')

  searchInput.addEventListener('input', () => {
    store.set({ searchQuery: searchInput.value.toLowerCase().trim() })
  })

  store.subscribe((state) => {
    const q = state.searchQuery
    if (q.length < 2) {
      resultsDiv.classList.add('hidden')
      skeleton.classList.remove('hidden')
      return
    }

    skeleton.classList.add('hidden')
    resultsDiv.classList.remove('hidden')

    const filtered = state.deputes
      .filter(d => {
        const nom = (d.nom || '').toLowerCase()
        const groupe = (d.groupe || '').toLowerCase()
        const groupeAbr = (d.groupeAbrege || '').toLowerCase()
        const dept = (d.departement || '').toLowerCase()
        return nom.includes(q) || groupe.includes(q) || groupeAbr.includes(q) || dept.includes(q)
      })
      .slice(0, 30)

    resultsDiv.innerHTML = filtered.map(d => DeputeCard(d)).join('')

    // Wire up click handlers
    resultsDiv.querySelectorAll('[data-depute]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.follow-btn')) return
        store.set({ view: 'detail-depute', selectedDepute: el.dataset.depute })
      })
    })
  })

  setTimeout(async () => {
    const scrutinsDiv = section.querySelector('#home-scrutins')
    const state = store.get()
    if (state.scrutins.length > 0) {
      scrutinsDiv.classList.remove('hidden')
      scrutinsDiv.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">📊 Derniers scrutins</h2>
        <div class="space-y-2">
          ${state.scrutins.slice(0, 8).map(s => ScrutinRow(s)).join('')}
        </div>
        <button class="mt-4 text-sm text-amber-400 hover:text-amber-300 transition" data-nav="scrutins">
          Voir tous les scrutins →
        </button>
      `
      scrutinsDiv.querySelector('[data-nav="scrutins"]').onclick = () => store.set({ view: 'scrutins' })
    }
  }, 100)

  return section
}

// ─── Depute Card ──────────────────────────────────────────
export function DeputeCard(d) {
  const grp = getGroupInfo(d.groupe, d.groupeAbrege)
  return `
    <div class="glass glass-hover rounded-xl p-4 cursor-pointer fade-in" data-depute="${d.uid}">
      <div class="flex items-start gap-3">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
             style="background: ${grp.color}">
          ${(d.prenom || '?')[0]}${(d.nom || '?')[0]}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">${d.prenom || ''} ${d.nom || 'Inconnu'}</div>
          <div class="text-xs text-gray-400 mt-0.5">${d.departement || ''}${d.circo ? ' • ' + d.circo + 'e circ.' : ''}</div>
          <span class="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
                style="background: ${grp.color}20; color: ${grp.color}; border: 1px solid ${grp.color}30">
            ${grp.short}
          </span>
        </div>
        <button class="text-lg opacity-30 hover:opacity-100 transition follow-btn" data-id="${d.uid}">
          ☆
        </button>
      </div>
    </div>
  `
}

// ─── Scrutin Row ──────────────────────────────────────────
export function ScrutinRow(s) {
  return `
    <div class="glass glass-hover rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer fade-in" data-scrutin="${s.uid}">
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">${s.titre || s.objet || 'Scrutin'}</div>
        <div class="text-xs text-gray-400 mt-0.5">${formatDate(s.dateScrutin || s.date)}</div>
      </div>
      <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300 shrink-0 ml-3">
        ${s.nbVotants || '?'} votants
      </span>
    </div>
  `
}

// ─── Detail Depute View ───────────────────────────────────
export function DetailDeputeView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'
  const uid = store.get().selectedDepute

  // Show loading skeleton
  section.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="text-4xl mb-4 animate-pulse">🔭</div>
        <div class="text-gray-500">Chargement du député...</div>
      </div>
    </div>
  `

  // Load data
  fetchDeputeDetail(uid).then((data) => {
    const grp = getGroupInfo(data.groupe, data.groupeAbrege)
    const stats = data.stats || {}
    const pcPour = stats.totalVotes ? Math.round((stats.pour / stats.totalVotes) * 100) : 0
    const pcContre = stats.totalVotes ? Math.round((stats.contre / stats.totalVotes) * 100) : 0
    const pcAbst = stats.totalVotes ? Math.round((stats.abstention / stats.totalVotes) * 100) : 0

    section.innerHTML = `
      <div class="flex items-start gap-6 mb-8">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-lg"
             style="background: ${grp.color}">
          ${data.prenom[0]}${data.nom[0]}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-3xl font-bold">${data.prenom} ${data.nom}</h1>
            <span class="px-3 py-1 rounded-full text-sm font-medium"
                  style="background: ${grp.color}20; color: ${grp.color}; border: 1px solid ${grp.color}40">
              ${grp.short}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
            ${data.departement ? `<span>📍 ${data.departement}${data.circo ? ` — ${data.circo}e circonscription` : ''}</span>` : ''}
            ${data.region ? `<span>🗺️ ${data.region}</span>` : ''}
            ${data.profession ? `<span>💼 ${data.profession}</span>` : ''}
          </div>
        </div>
        <button class="text-lg opacity-50 hover:opacity-100 transition follow-btn text-amber-400" data-id="${data.uid}">
          ${store.get('suivis').includes(data.uid) ? '⭐' : '☆'}
        </button>
      </div>

      ${stats.totalVotes > 0 ? `
        <div class="grid grid-cols-3 gap-3 mb-8">
          <div class="glass rounded-xl p-4 text-center">
            <div class="text-2xl font-bold text-green-400">${stats.pour}</div>
            <div class="text-xs text-gray-400 mt-1">Pour</div>
            <div class="w-full gauge-bar mt-2">
              <div class="gauge-fill bg-green-500" style="width:${pcPour}%"></div>
            </div>
          </div>
          <div class="glass rounded-xl p-4 text-center">
            <div class="text-2xl font-bold text-red-400">${stats.contre}</div>
            <div class="text-xs text-gray-400 mt-1">Contre</div>
            <div class="w-full gauge-bar mt-2">
              <div class="gauge-fill bg-red-500" style="width:${pcContre}%"></div>
            </div>
          </div>
          <div class="glass rounded-xl p-4 text-center">
            <div class="text-2xl font-bold text-gray-400">${stats.abstention}</div>
            <div class="text-xs text-gray-400 mt-1">Abstention</div>
            <div class="w-full gauge-bar mt-2">
              <div class="gauge-fill bg-gray-500" style="width:${pcAbst}%"></div>
            </div>
          </div>
        </div>
      ` : `
        <div class="glass rounded-xl p-6 mb-8 text-center text-sm text-gray-500">
          ⏳ Statistiques de vote en cours de chargement...
        </div>
      `}

      <h2 class="text-xl font-bold mb-4">📋 Derniers votes</h2>
      <div class="space-y-2">
        ${(data.votes || []).length > 0
          ? data.votes.slice(0, 30).map(v => `
              <div class="glass rounded-lg px-4 py-3 flex items-center gap-3 fade-in">
                <span class="text-lg">
                  ${v.position === 'pour' ? '✅' : v.position === 'contre' ? '❌' : '⏸️'}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate">${v.titre || 'Scrutin'}</div>
                  <div class="text-xs text-gray-500 mt-0.5">${formatDateRelative(v.dateScrutin)}</div>
                </div>
              </div>
            `).join('')
          : '<div class="text-center py-8 text-gray-500">Aucun vote trouvé — les données individuelles sont en cours de chargement</div>'
        }
      </div>
    `

    // Wire up follow button
    section.querySelector('.follow-btn').onclick = () => {
      const suivis = store.get().suivis
      if (suivis.includes(uid)) {
        store.set({ suivis: suivis.filter((id) => id !== uid) })
      } else {
        store.set({ suivis: [...suivis, uid] })
      }
    }
  }).catch((err) => {
    section.innerHTML = `
      <div class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="text-4xl mb-4">😵</div>
          <div class="text-red-400">Erreur : ${err.message}</div>
          <button class="mt-4 text-sm text-amber-400 hover:underline" data-nav="home">← Retour</button>
        </div>
      </div>
    `
    section.querySelector('[data-nav="home"]').onclick = () => store.set({ view: 'home' })
  })

  return section
}

// ─── Carte View ───────────────────────────────────────────
export function CarteView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">🗺️ La carte politique</h2>
    <p class="text-gray-400 mb-6">Trouve ton député par département ou circonscription.</p>
    <div class="glass rounded-xl p-6 text-center">
      <div class="text-5xl mb-4">🗺️</div>
      <p class="text-gray-400">Carte interactive — bientôt disponible</p>
      <p class="text-xs text-gray-500 mt-2">Sélectionne un département pour voir ses députés</p>
    </div>
  `
  return section
}

// ─── Scrutins View ────────────────────────────────────────
export function ScrutinsView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'

  store.set({ loading: true })
  fetchScrutins(100)
    .then(scrutins => store.set({ scrutins, loading: false }))
    .catch(() => store.set({ error: 'Erreur chargement scrutins', loading: false }))

  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">📊 Les scrutins</h2>
    <p class="text-gray-400 mb-6">Tous les votes importants de l'Assemblée.</p>
    <div id="scrutins-list" class="space-y-2">
      <div class="text-center py-12 text-gray-500 animate-pulse">Chargement...</div>
    </div>
  `

  // Subscribe (clean up later if needed)
  const unsub = store.subscribe((state) => {
    const list = section.querySelector('#scrutins-list')
    if (!list || state.loading) return
    if (state.scrutins.length === 0) {
      list.innerHTML = '<div class="text-center py-12 text-gray-500">Aucun scrutin trouvé</div>'
      return
    }
    list.innerHTML = state.scrutins.map(s => ScrutinRow(s)).join('')
    list.querySelectorAll('[data-scrutin]').forEach(el => {
      el.onclick = () => store.set({ view: 'detail-scrutin', selectedScrutin: el.dataset.scrutin })
    })
  })

  // Clean up on destroy
  setTimeout(() => unsub && unsub(), 100)

  return section
}

// ─── Comparer View ────────────────────────────────────────
export function ComparerView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">⚔️ Comparateur</h2>
    <p class="text-gray-400 mb-6">Mets deux députés côte à côte et vois qui est le plus actif.</p>
    <div class="grid grid-cols-2 gap-4">
      <div class="glass rounded-xl p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Député A</p>
        <input type="text" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Recherche..." />
      </div>
      <div class="glass rounded-xl p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Député B</p>
        <input type="text" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Recherche..." />
      </div>
    </div>
    <div class="glass rounded-xl p-8 mt-6 text-center text-gray-500">
      <div class="text-4xl mb-2">⚔️</div>
      <p>Sélectionne deux députés pour les comparer</p>
    </div>
  `
  return section
}

// ─── Flux View ────────────────────────────────────────────
export function FluxView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">📡 Flux en direct</h2>
    <p class="text-gray-400 mb-6">L'activité parlementaire en temps réel.</p>
    <div class="space-y-3">
      ${[
        { time: '14:32', text: 'Scrutin public sur l\'article 1er du projet de loi...', type: 'vote' },
        { time: '14:15', text: 'Discussion générale — Réforme des institutions', type: 'seance' },
        { time: '13:45', text: 'Dépôt d\'un amendement par le groupe LFI', type: 'amendement' },
        { time: '11:30', text: 'Question au gouvernement — Politique budgétaire', type: 'qag' },
        { time: '10:00', text: 'Ouverture de la séance publique', type: 'seance' },
      ].map(item => `
        <div class="glass rounded-lg px-4 py-3 flex items-start gap-3 fade-in">
          <span class="text-xs text-gray-500 w-10 shrink-0 mt-0.5">${item.time}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-400 shrink-0 mt-0.5">
            ${item.type === 'vote' ? '📊' : item.type === 'seance' ? '🎤' : item.type === 'amendement' ? '📝' : '❓'}
          </span>
          <span class="text-sm text-gray-300">${item.text}</span>
        </div>
      `).join('')}
    </div>
    <div class="mt-6 text-center">
      <span class="text-xs text-gray-500">Simulation pour la démo</span>
    </div>
  `
  return section
}

// ─── Suivis View ──────────────────────────────────────────
export function SuivisView() {
  const section = document.createElement('section')
  section.className = 'max-w-6xl mx-auto px-4 py-8 fade-in'
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">⭐ Députés suivis</h2>
    <p class="text-gray-400 mb-6">Tes députés favoris, sous surveillance.</p>
    <div id="suivis-list">
      <div class="text-center py-12 text-gray-500">Tu ne suis personne pour le moment</div>
    </div>
  `

  const unsub = store.subscribe((state) => {
    const list = section.querySelector('#suivis-list')
    if (!list) return
    if (state.suivis.length === 0) {
      list.innerHTML = '<div class="text-center py-12 text-gray-500">Tu ne suis personne pour le moment</div>'
    } else {
      // Find followed deputies from store
      const followed = state.deputes.filter(d => state.suivis.includes(d.uid))
      if (followed.length > 0) {
        list.innerHTML = `<div class="card-grid">${followed.map(d => DeputeCard(d)).join('')}</div>`
        list.querySelectorAll('[data-depute]').forEach(el => {
          el.addEventListener('click', (e) => {
            if (e.target.closest('.follow-btn')) return
            store.set({ view: 'detail-depute', selectedDepute: el.dataset.depute })
          })
        })
      } else {
        list.innerHTML = '<div class="text-center py-12 text-gray-500">Chargement des députés suivis...</div>'
      }
    }
  })

  setTimeout(() => unsub && unsub(), 100)
  return section
}
