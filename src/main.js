import { store } from './store.js'
import {
  Header,
  NavBar,
  HomeView,
  DetailDeputeView,
  CarteView,
  ScrutinsView,
  ComparerView,
  FluxView,
  SuivisView,
} from './components.js'

const app = document.getElementById('app')

// View renderer
const views = {
  home: HomeView,
  'detail-depute': DetailDeputeView,
  carte: CarteView,
  scrutins: ScrutinsView,
  comparer: ComparerView,
  flux: FluxView,
  suivis: SuivisView,
}

function render() {
  const state = store.get()
  app.innerHTML = ''

  const isDetail = state.view === 'detail-depute' || state.view === 'detail-scrutin'

  app.appendChild(Header())
  app.appendChild(NavBar(isDetail))

  const viewFn = views[state.view]
  if (viewFn) {
    app.appendChild(viewFn())
  }

  // Update follow count
  const countEl = app.querySelector('[data-follow-count]')
  if (countEl) countEl.textContent = store.get('suivis').length
}

// Initial render
render()

// Re-render on view changes
store.subscribe((state, prev) => {
  if (state.view !== prev.view || state.suivis.length !== prev.suivis.length) {
    render()
  }
})
