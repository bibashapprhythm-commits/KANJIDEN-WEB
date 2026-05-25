import { useState, useEffect } from 'react'
import { mcp } from '../lib/mcp.js'

const LEVELS = ['N5', 'N4', 'N3', 'N2']

export default function Levels({ onStartSession, onNav }) {
  const [data,     setData]     = useState({})
  const [modal,    setModal]    = useState(null)   // { level, type }
  const [orderBy,  setOrderBy]  = useState('radical')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    for (const level of LEVELS) {
      for (const type of ['kanji', 'kotoba']) {
        const key = `${level}_${type}`
        setData(prev => ({ ...prev, [key]: { loading: true } }))
        mcp.getProgress({ level, type }).then(result => {
          const stats = type === 'kanji' ? result.kanji : result.kotoba
          setData(prev => ({
            ...prev,
            [key]: {
              loading:  false,
              mastered: stats?.mastered ?? 0,
              total:    result?.overall?.curriculum_total ?? 0,
              due:      stats?.due_today ?? 0,
            },
          }))
        }).catch(() => {
          setData(prev => ({ ...prev, [key]: { loading: false, error: true } }))
        })
      }
    }
  }, [])

  async function startCourse() {
    if (!modal) return
    setCreating(true)
    try {
      const result = await mcp.createCourse({ level: modal.level, type: modal.type, order_by: orderBy })
      if (result?.success) {
        setModal(null)
        onStartSession(result.session_id)
      } else {
        alert(result?.message ?? 'Could not create course')
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setCreating(false)
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <nav style={s.nav}>
          <button style={s.navBtn} onClick={() => onNav('home')}>Home</button>
          <button style={{ ...s.navBtn, ...s.navActive }}>Levels</button>
          <button style={s.navBtn} onClick={() => onNav('browse')}>Browse</button>
        </nav>
      </header>

      <main style={s.main}>
        <div style={s.pageTitle}>JLPT Levels</div>
        <div style={s.pageDesc}>Structured courses for each level and item type.</div>

        <div style={s.cards}>
          {LEVELS.map(level => (
            <LevelCard
              key={level}
              level={level}
              data={data}
              onStart={(type) => { setOrderBy('radical'); setModal({ level, type }) }}
            />
          ))}
        </div>
      </main>

      {/* Order modal */}
      {modal && (
        <div style={s.overlay} onClick={() => !creating && setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Start Course</div>
            <div style={s.modalSub}>{modal.level} {modal.type === 'kanji' ? 'Kanji' : 'Kotoba'}</div>
            <div style={s.modalLabel}>Order by</div>
            <div style={s.orderBtns}>
              {(modal.type === 'kanji'
                ? [['radical', 'By Radical'], ['difficulty', 'By Difficulty'], ['level', 'By Level']]
                : [['difficulty', 'By Difficulty'], ['level', 'By Level']]
              ).map(([val, label]) => (
                <button
                  key={val}
                  style={{ ...s.orderBtn, ...(orderBy === val ? s.orderBtnActive : {}) }}
                  onClick={() => setOrderBy(val)}
                  disabled={creating}
                >
                  {label}
                </button>
              ))}
            </div>
            <button style={s.startBtn} onClick={startCourse} disabled={creating}>
              {creating ? 'Creating…' : 'Start →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LevelCard({ level, data, onStart }) {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.levelBadge}>{level}</span>
      </div>
      <TypeRow label="Kanji"  rowData={data[`${level}_kanji`]}  onStart={() => onStart('kanji')}  />
      <TypeRow label="Kotoba" rowData={data[`${level}_kotoba`]} onStart={() => onStart('kotoba')} />
    </div>
  )
}

function TypeRow({ label, rowData, onStart }) {
  const loading  = rowData?.loading  ?? true
  const mastered = rowData?.mastered ?? 0
  const total    = rowData?.total    ?? 0
  const allDone  = !loading && total > 0 && mastered >= total
  const pct      = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0

  return (
    <div style={s.typeRow}>
      <div style={s.typeLabel}>{label}</div>
      <div style={s.typeMiddle}>
        {loading ? (
          <div style={s.typeCount}>—</div>
        ) : (
          <>
            <div style={s.typeCount}>{mastered} / {total} mastered</div>
            <div style={s.bar}>
              <div style={{ ...s.barFill, width: `${pct}%`, background: allDone ? 'var(--green)' : 'var(--gold)' }} />
            </div>
          </>
        )}
      </div>
      <div style={s.typeAction}>
        {allDone ? (
          <span style={s.completeBadge}>Complete ✓</span>
        ) : (
          <button style={s.startCourseBtn} onClick={onStart} disabled={loading || total === 0}>
            Start Course
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  page:   { minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 },
  logo:   { display: 'flex', alignItems: 'center', gap: 8 },
  logoKanji: { fontSize: 28, color: 'var(--gold)', lineHeight: 1 },
  logoText:  { fontSize: 18, fontWeight: 600, letterSpacing: 2 },
  nav:       { display: 'flex', gap: 4 },
  navBtn:    { background: 'transparent', border: '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' },
  navActive: { border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)' },

  main:      { maxWidth: 700, margin: '0 auto', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageDesc:  { color: 'var(--text2)', fontSize: 14, marginTop: -16 },

  cards: { display: 'flex', flexDirection: 'column', gap: 12 },
  card:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  levelBadge: { background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 6, padding: '2px 10px', fontSize: 13, fontWeight: 700 },

  typeRow:    { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  typeLabel:  { width: 52, fontSize: 13, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 },
  typeMiddle: { flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 },
  typeCount:  { fontSize: 13, color: 'var(--text)' },
  bar:        { height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 4, transition: 'width 0.6s ease' },
  typeAction: { flexShrink: 0 },
  startCourseBtn: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text)', cursor: 'pointer' },
  completeBadge:  { fontSize: 13, color: 'var(--green)', fontWeight: 600 },

  // Modal
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 28px 24px', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 },
  modalTitle:{ fontSize: 18, fontWeight: 700 },
  modalSub:  { color: 'var(--text2)', fontSize: 14, marginTop: -8 },
  modalLabel:{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 },
  orderBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  orderBtn:  { flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 8px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'center' },
  orderBtnActive: { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'var(--gold-dim)' },
  startBtn:  { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
}
