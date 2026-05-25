import { useState } from 'react'
import Session from './pages/Session.jsx'
import Home    from './pages/Home.jsx'
import Levels  from './pages/Levels.jsx'
import Browse  from './pages/Browse.jsx'

export default function App() {
  const [page,      setPage]      = useState('home')
  const [sessionId, setSessionId] = useState(null)
  const [browseInit, setBrowseInit] = useState({ level: 'N5', type: 'kanji' })

  const goToSession = (id) => { setSessionId(id); setPage('session') }
  const goToPage    = (pg, params) => {
    if (params) setBrowseInit(params)
    setPage(pg)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {page === 'home'    && <Home    onStartSession={goToSession} onNav={goToPage} />}
      {page === 'session' && <Session sessionId={sessionId} onBack={() => setPage('home')} />}
      {page === 'levels'  && <Levels  onStartSession={goToSession} onNav={goToPage} />}
      {page === 'browse'  && <Browse  onStartSession={goToSession} onNav={goToPage} initLevel={browseInit.level} initType={browseInit.type} />}
    </div>
  )
}
