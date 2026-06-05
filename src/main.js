import { store } from './store.js'
import {
  Header,
  NavBar,
  HomeView,
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
  carte: CarteView,
  scrutins: ScrutinsView,
  comparer: ComparerView,
  flux: FluxView,
  suivis: SuivisView,
}

function render() {
  const state = store.get()
  app.innerHTML = ''

  app.appendChild(Header())
  app.appendChild(NavBar())

  const viewFn = views[state.view]
  if (viewFn) {
    app.appendChild(viewFn())
  }

  // Update follow count in header
  const countEl = app.querySelector('[data-follow-count]')
  if (countEl) countEl.textContent = state.suivis.length
}

// Initial render
render()

// Re-render on state changes
store.subscribe((state, prev) => {
  // Only re-render on view changes or follow count
  if (state.view !== prev.view || state.suivis.length !== prev.suivis.length) {
    render()
  }
})
