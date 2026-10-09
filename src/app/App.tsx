import { APP_SUBTITLE, APP_TITLE } from './appInfo'

// Phase 0 placeholder. Application features are implemented from Phase 3.
function App() {
  return (
    <main className="app">
      <h1>{APP_TITLE}</h1>
      <p>{APP_SUBTITLE}</p>
      <p className="app__note">開発環境の準備中です（Phase 0）。</p>
    </main>
  )
}

export default App
