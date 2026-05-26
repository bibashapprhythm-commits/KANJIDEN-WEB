import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'

export default function Progress() {
  const navigate    = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mcp.getProgress({})
      .then(p => { setData(p); setLoading(false) })
      .catch(()  => setLoading(false))
  }, [])

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate('/')}>← Back</button>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
      </header>
      <main style={s.main}>
        <h1 style={s.pageTitle}>Your Progress</h1>
        {loading
          ? <div style={s.loadMsg}>Loading…</div>
          : !data
            ? <div style={s.loadMsg}>Could not load progress.</div>
            : <ProgressContent data={data} />
        }
      </main>
    </div>
  )
}

function ProgressContent({ data }) {
  const k = data.kanji  ?? {}
  const v = data.kotoba ?? {}
  const o = data.overall ?? {}

  const totalKanji = k.total ?? 0
  const totalVocab = v.total ?? 0
  const totalItems = totalKanji + totalVocab

  const seg = (field) => (k[field] ?? 0) + (v[field] ?? 0)
  const newCount      = seg('new')
  const learningCount = seg('learning')
  const familiarCount = seg('familiar')
  const goodCount     = seg('good')
  const strongCount   = seg('strong')
  const masteredCount = seg('mastered')

  const segments = [
    { key: 'new',      count: newCount,      color: '#475569', label: 'new'      },
    { key: 'learning', count: learningCount, color: '#38bdf8', label: 'learning' },
    { key: 'familiar', count: familiarCount, color: '#818cf8', label: 'familiar' },
    { key: 'good',     count: goodCount,     color: '#fbbf24', label: 'good'     },
    { key: 'strong',   count: strongCount,   color: '#34d399', label: 'strong'   },
    { key: 'mastered', count: masteredCount, color: '#4ade80', label: 'mastered' },
  ].filter(seg => seg.count > 0)

  const getWidth = (count) => {
    if (count <= 0 || totalItems === 0) return 0
    const raw = (count / totalItems) * 100
    return raw < 2 ? 2 : raw
  }

  const byJlpt     = data.by_jlpt ?? {}
  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'].filter(l => (byJlpt[l]?.total ?? 0) > 0)

  const kCorrect = k.times_correct ?? 0
  const kWrong   = k.times_wrong   ?? 0
  const vCorrect = v.times_correct ?? 0
  const vWrong   = v.times_wrong   ?? 0
  const kAcc = (kCorrect + kWrong) > 0 ? Math.round(kCorrect / (kCorrect + kWrong) * 100) : null
  const vAcc = (vCorrect + vWrong) > 0 ? Math.round(vCorrect / (vCorrect + vWrong) * 100) : null

  return (
    <div style={s.content}>
      {/* Overview */}
      <div className="dash-card" style={s.card}>
        <div style={s.cardTitle}>Studying</div>
        <div style={s.overviewRow}>
          <span style={s.bigNum}>{totalItems}</span>
          <span style={s.bigLabel}>items</span>
          {(totalKanji > 0 || totalVocab > 0) && (
            <span style={s.subInfo}>
              {totalKanji > 0 && `${totalKanji} kanji`}
              {totalKanji > 0 && totalVocab > 0 && ' · '}
              {totalVocab > 0 && `${totalVocab} vocab`}
            </span>
          )}
        </div>
        {(o.due_today ?? 0) > 0 && (
          <div style={s.dueNote}>{o.due_today} due today</div>
        )}
      </div>

      {/* Mastery bar */}
      {totalItems > 0 && segments.length > 0 && (
        <div className="dash-card" style={s.card}>
          <div style={s.cardTitle}>Mastery Distribution</div>
          <div style={s.barTrack}>
            {segments.map(seg => (
              <div key={seg.key} style={{ width: `${getWidth(seg.count)}%`, height: '100%', background: seg.color, flexShrink: 0, transition: 'width 0.5s ease' }} />
            ))}
          </div>
          <div style={s.legend}>
            {segments.map(seg => (
              <span key={seg.key} style={s.legendItem}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, display: 'inline-block', flexShrink: 0 }} />
                {seg.label} {seg.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* JLPT breakdown */}
      {jlptLevels.length > 0 && (
        <div className="dash-card" style={s.card}>
          <div style={s.cardTitle}>By JLPT Level</div>
          <div style={s.jlptTable}>
            {jlptLevels.map(level => {
              const d = byJlpt[level]
              return (
                <div key={level} style={s.jlptRow}>
                  <span style={s.jlptBadge}>{level}</span>
                  <span style={s.jlptTotal}>{d.total ?? 0} items</span>
                  <span style={s.jlptSub}>
                    {(d.kanji ?? 0) > 0 && `${d.kanji} kanji`}
                    {(d.kanji ?? 0) > 0 && (d.kotoba ?? 0) > 0 && ' · '}
                    {(d.kotoba ?? 0) > 0 && `${d.kotoba} vocab`}
                  </span>
                  {(d.due_today ?? 0) > 0 && (
                    <span style={s.jlptDue}>{d.due_today} due</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Accuracy */}
      {(kAcc !== null || vAcc !== null) && (
        <div className="dash-card" style={s.card}>
          <div style={s.cardTitle}>Accuracy</div>
          <div style={s.accRows}>
            {kAcc !== null && (
              <div style={s.accRow}>
                <span style={s.accLabel}>Kanji</span>
                <span style={s.accPct}>{kAcc}%</span>
                <span style={s.accSub}>{kCorrect} correct · {kWrong} wrong</span>
              </div>
            )}
            {vAcc !== null && (
              <div style={s.accRow}>
                <span style={s.accLabel}>Vocab</span>
                <span style={s.accPct}>{vAcc}%</span>
                <span style={s.accSub}>{vCorrect} correct · {vWrong} wrong</span>
              </div>
            )}
          </div>
          {data.weakest_question_type && (
            <div style={s.weakest}>Weakest type: {data.weakest_question_type}</div>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  page:       { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  header:     { display: 'flex', alignItems: 'center', height: 56, padding: '0 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn:    { background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', padding: '6px 0' },
  logoKanji:  { fontSize: 22, color: 'var(--gold)', lineHeight: 1 },
  logoText:   { fontSize: 14, fontWeight: 600, letterSpacing: 2 },
  loadMsg:    { color: 'var(--text2)', textAlign: 'center', padding: 40 },
  main:       { flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 700 },
  content:    { display: 'flex', flexDirection: 'column', gap: 16 },

  card:      { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.4 },

  overviewRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  bigNum:      { fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 },
  bigLabel:    { fontSize: 14, color: 'var(--text2)' },
  subInfo:     { fontSize: 13, color: 'var(--text3)', marginLeft: 4 },
  dueNote:     { fontSize: 13, color: 'var(--gold)', marginTop: -4 },

  barTrack:   { height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', background: 'var(--border)' },
  legend:     { display: 'flex', gap: 12, flexWrap: 'wrap' },
  legendItem: { fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 },

  jlptTable: { display: 'flex', flexDirection: 'column', gap: 0 },
  jlptRow:   { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  jlptBadge: { fontSize: 12, fontWeight: 700, padding: '2px 8px', background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 5, flexShrink: 0 },
  jlptTotal: { fontSize: 13, fontWeight: 600, color: 'var(--text)', flexShrink: 0 },
  jlptSub:   { fontSize: 12, color: 'var(--text3)', flex: 1 },
  jlptDue:   { fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 4, padding: '1px 7px' },

  accRows:  { display: 'flex', flexDirection: 'column', gap: 8 },
  accRow:   { display: 'flex', alignItems: 'center', gap: 12 },
  accLabel: { width: 48, fontSize: 13, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 },
  accPct:   { fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  accSub:   { fontSize: 12, color: 'var(--text3)' },
  weakest:  { fontSize: 12, color: 'var(--text3)' },
}
