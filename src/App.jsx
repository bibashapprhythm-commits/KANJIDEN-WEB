import { useState } from 'react'
import Session from './pages/Session.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  const [page, setPage] = useState('home')
  const [sessionId, setSessionId] = useState(null)

  const goToSession = (id) => {
    setSessionId(id)
    setPage('session')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {page === 'home'    && <Home    onStartSession={goToSession} />}
      {page === 'session' && <Session sessionId={sessionId} onBack={() => setPage('home')} />}
    </div>
  )
}
