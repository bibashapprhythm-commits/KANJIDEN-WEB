import { useState, useEffect, useCallback } from 'react'
import { mcp } from '../lib/mcp.js'

const LEVELS = ['N5', 'N4', 'N3', 'N2']
const TYPES  = ['kanji', 'kotoba']

const MASTERY_LABEL = ['New', 'Learning', 'Familiar', 'Good', 'Strong', 'Mastered']
const MASTERY_COLOR = [
  'var(--text3)',   // New
  'var(--blue)',    // Learning
  'var(--purple)',  // Familiar
  'var(--gold)',    // Good
  'var(--green)',   // Strong
  'var(--green)',   // Mastered
]

export default function Browse({ onStartSession, onNav, initLevel = 'N5', initType = 'kanji' }) {
  const [level,    setLevel]    = useState(initLevel)
  const [type,     setType]     = useState(initType)
  const [orderBy,  setOrderBy]  = useState('priority')
  const [page,     setPage]     = useState(1)
  const [data,     setData]     = useState(null)   // { items, total, page, page_size }
  const [loading,  setLoading]  = useState(false)
  const [creating, setCreating] = useState(null)   // item.id being started

  const load = useCallback(async (lvl, tp, ord, pg) => {
    setLoading(true)
    try {
      const result = await mcp.getItems({ level: lvl, type: tp, order_by: ord, page: pg, page_size: 50 })
      setData(result)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(level, type, orderBy, page) }, [level, type, orderBy, page, load])

  function changeLevel(lvl) { setLevel(lvl); setPage(1) }
  function changeType(tp)   { setType(tp);   setPage(1) }
  function changeOrder(ord) { setOrderBy(ord); setPage(1) }

  async function learnItem(item) {
    setCreating(item.id)
    try {
      const result = await mcp.createSession({ item_ids: [item.id] })
      if (result?.success) onStartSession(result.session_id)
      else alert(result?.message ?? 'No session created')
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setCreating(null)
  }

  const totalPages = data ? Math.ceil(data.total / (data.page_size ?? 50)) : 1
  const items      = data?.items ?? []

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <nav style={s.nav}>
          <button style={s.navBtn} onClick={() => onNav('home')}>Home</button>
          <button style={s.navBtn} onClick={() => onNav('levels')}>Levels</button>
          <button style={{ ...s.navBtn, ...s.navActive }}>Browse</button>
        </nav>
      </header>

      <main style={s.main}>
        {/* Selectors */}
        <div style={s.selectors}>
          <div style={s.tabGroup}>
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                style={{ ...s.tab, ...(level === lvl ? s.tabActive : {}) }}
                onClick={() => changeLevel(lvl)}
              >{lvl}</button>
            ))}
          </div>
          <div style={s.tabGroup}>
            {TYPES.map(tp => (
              <button
                key={tp}
                style={{ ...s.tab, ...(type === tp ? s.tabActive : {}) }}
                onClick={() => changeType(tp)}
              >{tp === 'kanji' ? 'Kanji' : 'Kotoba'}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Character</th>
                <th style={s.th}>Reading</th>
                <th style={s.th}>Meaning</th>
                <th style={s.th}>JLPT</th>
                <th style={{ ...s.th, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => changeOrder(type === 'kanji' ? 'stroke_count' : 'priority')}
                    title={type === 'kanji' ? 'Sort by stroke count' : ''}>
                  {type === 'kanji' ? `Strokes${orderBy === 'stroke_count' ? ' ↑' : ''}` : 'Level'}
                </th>
                <th style={s.th}>Mastery</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {loading && !items.length ? (
                <tr><td colSpan={7} style={s.emptyCell}>Loading…</td></tr>
              ) : !items.length ? (
                <tr><td colSpan={7} style={s.emptyCell}>No items found.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={s.row}>
                  <td style={s.tdChar}>
                    <span className="jp" style={s.char}>{item.value}</span>
                  </td>
                  <td style={s.td}>
                    <span className="jp" style={s.reading}>{item.reading_hiragana ?? '—'}</span>
                  </td>
                  <td style={s.tdMeaning}>{item.core_meaning}</td>
                  <td style={s.td}>
                    {item.jlpt_level
                      ? <span style={s.jlptBadge}>{item.jlpt_level}</span>
                      : <span style={s.na}>—</span>}
                  </td>
                  <td style={s.td}>
                    <span style={s.na}>{type === 'kanji' ? (item.stroke_count ?? '—') : (item.jlpt_level ?? '—')}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.masteryPill, color: MASTERY_COLOR[item.mastery_level] }}>
                      {MASTERY_LABEL[item.mastery_level]}
                    </span>
                  </td>
                  <td style={s.tdAction}>
                    <button
                      style={s.learnBtn}
                      disabled={!!creating}
                      onClick={() => learnItem(item)}
                    >
                      {creating === item.id ? '…' : 'Learn'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={s.pageBtn} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={s.pageInfo}>
              {data?.total ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, data.total)} of ${data.total}` : ''}
            </span>
            <button style={s.pageBtn} disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </main>
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

  main:      { maxWidth: 860, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 },

  selectors: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  tabGroup:  { display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  tab:       { background: 'transparent', border: 'none', padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text2)', cursor: 'pointer' },
  tabActive: { background: 'var(--bg3)', color: 'var(--text)', fontWeight: 600 },

  tableWrap: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '12px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' },
  td:        { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  tdChar:    { padding: '12px 14px', borderBottom: '1px solid var(--border)', width: 60 },
  tdMeaning: { padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text2)', maxWidth: 220 },
  tdAction:  { padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' },
  row:       { transition: 'background 0.1s' },

  char:      { fontSize: 24, color: 'var(--gold)' },
  reading:   { fontSize: 14 },
  jlptBadge: { background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 },
  na:        { color: 'var(--text3)', fontSize: 13 },
  masteryPill: { fontSize: 12, fontWeight: 600 },
  learnBtn:  { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer' },

  emptyCell: { textAlign: 'center', padding: '40px', color: 'var(--text2)', fontSize: 14 },

  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pageBtn:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'var(--text)', cursor: 'pointer' },
  pageInfo:   { color: 'var(--text2)', fontSize: 13 },
}
