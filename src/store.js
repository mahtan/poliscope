// Simple reactive store
export function createStore(initial) {
  let state = { ...initial }
  const listeners = new Set()

  return {
    get(key) { return key ? state[key] : state },
    set(update) {
      const prev = { ...state }
      state = { ...state, ...(typeof update === 'function' ? update(state) : update) }
      for (const fn of listeners) fn(state, prev)
    },
    subscribe(fn) {
      listeners.add(fn)
      fn(state, state)
      return () => listeners.delete(fn)
    },
  }
}

export const store = createStore({
  view: 'home',
  searchQuery: '',
  selectedDepute: null,
  selectedScrutin: null,
  deputes: [],
  scrutins: [],
  loading: false,
  error: null,
  suivis: JSON.parse(localStorage.getItem('poliscope_suivis') || '[]'),
})

// Persist suivis
store.subscribe((state) => {
  localStorage.setItem('poliscope_suivis', JSON.stringify(state.suivis))
})
