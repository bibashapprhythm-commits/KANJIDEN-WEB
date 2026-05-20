import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { mcp } from '../lib/mcp.js'

const MASTERY_LABELS = ['🆕','📖','🔍','💡','⭐','🎌']
const MASTERY_NAMES  = ['New','Learning','Familiar','Good','Strong','Mastered']

export default function Home({ onStartSession }) {
  const [stats, setStats]           = useState(null)
  const [pendingSession, setPending] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load stats
      const progress = await mcp.getProgress()
      setStats(progress)

      console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('ANON KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20))

      // Check for pending session
      const { data } = await supabase
        .from('sessions')
        .select('id, date, params, items')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setPending(data)
    } catch {}
    setLoading(false)
  }

  async function quickStart(source, label) {
    setCreating(source)
    try {
      const result = await mcp.createSession({ source, type: 'both', count: 10 })
      if (result?.success) onStartSession(result.session_id)
    } catch (e) {
      alert('Could not create session: ' + e.message)
    }
    setCreating(null)
  }

  const total    = (stats?.overall?.total ?? 0)
  const mastered = (stats?.overall?.mastered ?? 0)
  const due      = (stats?.overall?.due_today ?? 0)
  const pct      = total > 0 ? Math.round((mastered / total) * 100) : 0

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <div style={s.headerRight}>
          {due > 0 && (
            <div style={s.dueBadge}>
              {due} due today
            </div>
          )}
        </div>
      </header>

      <main style={s.main}>
        {loading ? (
          <div style={s.loading}>Loading your deck...</div>
        ) : (
          <>
            {/* Pending session banner */}
            {pendingSession && (
              <div style={s.pendingBanner}>
                <div style={s.pendingInfo}>
                  <span style={s.pendingIcon}>📋</span>
                  <div>
                    <div style={s.pendingTitle}>Session ready</div>
                    <div style={s.pendingMeta}>
                      {pendingSession.items?.length ?? 0} items · {pendingSession.params?.source ?? 'mixed'}
                    </div>
                  </div>
                </div>
                <button style={s.resumeBtn} onClick={() => onStartSession(pendingSession.id)}>
                  Resume →
                </button>
              </div>
            )}

            {/* Stats ring */}
            <div style={s.statsCard}>
              <div style={s.ringWrap}>
                <svg width="120" height="120" style={s.ring}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke="var(--gold)" strokeWidth="8"
                    strokeDasharray={`${pct * 3.14} 314`}
                    strokeDashoffset="78.5"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={s.ringInner}>
                  <div style={s.ringPct}>{pct}%</div>
                  <div style={s.ringLabel}>mastered</div>
                </div>
              </div>
              <div style={s.statsGrid}>
                <Stat label="Total" value={total} />
                <Stat label="Mastered" value={mastered} color="var(--gold)" />
                <Stat label="Due Today" value={due} color="var(--red)" />
                <Stat label="Kanji" value={stats?.kanji?.total ?? 0} />
                <Stat label="Kotoba" value={stats?.kotoba?.total ?? 0} />
                <Stat label="Strong" value={(stats?.kanji?.strong ?? 0) + (stats?.kotoba?.strong ?? 0)} color="var(--green)" />
              </div>
            </div>

            {/* Mastery breakdown */}
            {total > 0 && (
              <div style={s.masteryRow}>
                {[0,1,2,3,4,5].map(lvl => {
                  const count = (stats?.kanji?.[MASTERY_NAMES[lvl].toLowerCase()] ?? 0)
                              + (stats?.kotoba?.[MASTERY_NAMES[lvl].toLowerCase()] ?? 0)
                  if (!count) return null
                  return (
                    <div key={lvl} style={s.masteryPill}>
                      <span style={s.masteryEmoji}>{MASTERY_LABELS[lvl]}</span>
                      <span style={s.masteryCount}>{count}</span>
                      <span style={s.masteryName}>{MASTERY_NAMES[lvl]}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick start */}
            <div style={s.section}>
              <div style={s.sectionTitle}>Quick Study</div>
              <div style={s.quickGrid}>
                {[
                  { source: 'due',       label: '📅 Review Due',      desc: `${due} cards scheduled` },
                  { source: 'weak',      label: '🎯 Weak Words',      desc: 'Low mastery items' },
                  { source: 'new',       label: '✨ New Words',        desc: 'Never reviewed' },
                  { source: 'today',     label: '🌅 Today\'s Words',   desc: 'Added today' },
                ].map(btn => (
                  <button
                    key={btn.source}
                    style={s.quickBtn}
                    disabled={!!creating}
                    onClick={() => quickStart(btn.source, btn.label)}
                  >
                    <div style={s.quickLabel}>{creating === btn.source ? 'Creating...' : btn.label}</div>
                    <div style={s.quickDesc}>{btn.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Empty state */}
            {total === 0 && (
              <div style={s.empty}>
                <div style={s.emptyKanji} className="jp">始</div>
                <div style={s.emptyTitle}>No cards yet</div>
                <div style={s.emptyDesc}>
                  Paste Japanese text in your KanjiDen Claude Project<br/>
                  and say <strong>MemoLearning</strong> to add cards.
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={s.stat}>
      <div style={{ ...s.statVal, color: color ?? 'var(--text)' }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

const s = {
  page:   { minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 },
  logo:   { display: 'flex', alignItems: 'center', gap: 8 },
  logoKanji: { fontSize: 28, color: 'var(--gold)', lineHeight: 1 },
  logoText:  { fontSize: 18, fontWeight: 600, letterSpacing: 2 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  dueBadge: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 },
  main:   { maxWidth: 640, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 },
  loading: { textAlign: 'center', color: 'var(--text2)', padding: 60 },

  pendingBanner: { background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  pendingInfo:   { display: 'flex', alignItems: 'center', gap: 12 },
  pendingIcon:   { fontSize: 24 },
  pendingTitle:  { fontWeight: 600, fontSize: 15 },
  pendingMeta:   { color: 'var(--text2)', fontSize: 13 },
  resumeBtn:     { background: 'var(--gold)', color: '#000', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14 },

  statsCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' },
  ringWrap:  { position: 'relative', flexShrink: 0 },
  ring:      { transform: 'rotate(-90deg)' },
  ringInner: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  ringPct:   { fontSize: 22, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 },
  ringLabel: { fontSize: 11, color: 'var(--text2)', marginTop: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 20px', flex: 1 },
  stat:      { display: 'flex', flexDirection: 'column', gap: 2 },
  statVal:   { fontSize: 22, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 12, color: 'var(--text2)' },

  masteryRow:   { display: 'flex', gap: 8, flexWrap: 'wrap' },
  masteryPill:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 },
  masteryEmoji: { fontSize: 14 },
  masteryCount: { fontWeight: 700, fontSize: 14 },
  masteryName:  { color: 'var(--text2)', fontSize: 12 },

  section:      { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 },
  quickGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  quickBtn:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'left', transition: 'all .15s', color: 'var(--text)' },
  quickLabel:   { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  quickDesc:    { color: 'var(--text2)', fontSize: 12 },

  empty:      { textAlign: 'center', padding: '48px 24px' },
  emptyKanji: { fontSize: 64, color: 'var(--gold)', lineHeight: 1, marginBottom: 16, opacity: 0.4 },
  emptyTitle: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  emptyDesc:  { color: 'var(--text2)', lineHeight: 1.7 },
}
