import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'

const MASTERY_LABEL = ['New', 'Learning', 'Familiar', 'Stable', 'Strong', 'Mastered']
const MASTERY_DESC  = ['Never reviewed', 'Early reviews', 'Building stability', 'Consistently correct', 'Well known', 'Fully mastered']
const MASTERY_COLOR = ['var(--text3)', 'var(--blue)', 'var(--purple)', 'var(--gold)', '#34d399', 'var(--green)']
const MASTERY_BG    = ['transparent', 'rgba(56,189,248,0.12)', 'rgba(129,140,248,0.12)', 'rgba(251,191,36,0.12)', 'rgba(52,211,153,0.12)', 'rgba(74,222,128,0.12)']

const ORDER_OPTIONS = [
  { key: 'priority',      label: 'Default' },
  { key: 'stroke_count',  label: 'Stroke count' },
  { key: 'frequency_rank',label: 'Frequency' },
  { key: 'mastery_asc',   label: 'Mastery ↑' },
  { key: 'mastery_desc',  label: 'Mastery ↓' },
  { key: 'due_first',     label: 'Due first' },
]

const SERVER_SORTS = new Set(['priority', 'stroke_count', 'frequency_rank'])
const PAGE_SIZE = 50

export default function LevelDrillDownModal({ level, initialTab = 'all', onClose }) {
  const navigate = useNavigate()
  const [kanjiItems,  setKanjiItems]  = useState([])
  const [kotobaItems, setKotobaItems] = useState([])
  const [kanjiTotal,  setKanjiTotal]  = useState(0)
  const [kotobaTotal, setKotobaTotal] = useState(0)
  const [kanjiPage,   setKanjiPage]   = useState(0)
  const [kotobaPage,  setKotobaPage]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [studying,    setStudying]    = useState(null)
  const [orderBy,     setOrderBy]     = useState('priority')
  const [activeTab,   setActiveTab]   = useState(initialTab)
  const [query,       setQuery]       = useState('')
  const [showLegend,  setShowLegend]  = useState(false)
  const listRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]
  const isDue = (item) => item.next_review && item.next_review <= today && item.mastery_level > 0 && item.mastery_level < 5

  // ── Fetch initial data ─────────────────────────────────────────────────
  useEffect(() => {
    let dead = false
    async function load() {
      setLoading(true)
      setKanjiPage(0); setKotobaPage(0)
      setKanjiItems([]); setKotobaItems([])
      const serverSort = SERVER_SORTS.has(orderBy) ? orderBy : 'priority'
      const [kanjiRes, kotobaRes] = await Promise.all([
        mcp.getItems({ level, type: 'kanji', order_by: serverSort, page: 1, page_size: PAGE_SIZE }).catch(() => ({ items: [], total: 0 })),
        mcp.getItems({ level, type: 'kotoba', order_by: serverSort, page: 1, page_size: PAGE_SIZE }).catch(() => ({ items: [], total: 0 })),
      ])
      if (dead) return
      setKanjiItems(kanjiRes.items ?? [])
      setKanjiTotal(kanjiRes.total ?? 0)
      setKotobaItems(kotobaRes.items ?? [])
      setKotobaTotal(kotobaRes.total ?? 0)
      setKanjiPage(1)
      setKotobaPage(1)
      setLoading(false)
    }
    load()
    return () => { dead = true }
  }, [level, orderBy])

  // ── Load more (paginated) ─────────────────────────────────────────────
  async function loadMore(type) {
    setLoadingMore(true)
    const serverSort = SERVER_SORTS.has(orderBy) ? orderBy : 'priority'
    const isKanji = type === 'kanji'
    const nextPage = isKanji ? kanjiPage + 1 : kotobaPage + 1
    const res = await mcp.getItems({ level, type, order_by: serverSort, page: nextPage, page_size: PAGE_SIZE }).catch(() => ({ items: [] }))
    if (isKanji) {
      setKanjiItems(prev => [...prev, ...(res.items ?? [])])
      setKanjiPage(nextPage)
    } else {
      setKotobaItems(prev => [...prev, ...(res.items ?? [])])
      setKotobaPage(nextPage)
    }
    setLoadingMore(false)
  }

  // ── Sorts items client-side when sort is not server-backed ────────────
  function sortItems(items) {
    const sorted = [...items]
    switch (orderBy) {
      case 'mastery_asc':  sorted.sort((a, b) => a.mastery_level - b.mastery_level); break
      case 'mastery_desc': sorted.sort((a, b) => b.mastery_level - a.mastery_level); break
      case 'due_first':    sorted.sort((a, b) => { const dA = isDue(a) ? 0 : 1; const dB = isDue(b) ? 0 : 1; return dA - dB || a.mastery_level - b.mastery_level }); break
    }
    return sorted
  }

  // ── Filter + search ───────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (item) => !q || item.value?.toLowerCase().includes(q) || (item.reading_hiragana ?? '').toLowerCase().includes(q) || (item.core_meaning ?? '').toLowerCase().includes(q)

    const kanji = sortItems(kanjiItems).filter(matches)
    const kotoba = sortItems(kotobaItems).filter(matches)

    switch (activeTab) {
      case 'kanji':      return kanji
      case 'kotoba':     return kotoba
      case 'new':        return [...kanji, ...kotoba].filter(i => i.mastery_level === 0)
      case 'inprogress': return [...kanji, ...kotoba].filter(i => i.mastery_level >= 1 && i.mastery_level <= 4)
      case 'due':        return [...kanji, ...kotoba].filter(isDue)
      case 'done':       return [...kanji, ...kotoba].filter(i => i.mastery_level >= 5)
      default:           return [...kanji, ...kotoba]
    }
  }, [kanjiItems, kotobaItems, activeTab, orderBy, query])

  // ── Summary stats (based on loaded items) ────────────────────────────
  const stats = useMemo(() => {
    const all = [...kanjiItems, ...kotobaItems]
    return {
      total:       kanjiTotal + kotobaTotal,
      loaded:      all.length,
      notStarted:  all.filter(i => i.mastery_level === 0).length,
      inProgress:  all.filter(i => i.mastery_level >= 1 && i.mastery_level <= 4).length,
      learning:    all.filter(i => i.mastery_level >= 1 && i.mastery_level <= 3).length,
      strong:      all.filter(i => i.mastery_level === 4).length,
      mastered:    all.filter(i => i.mastery_level >= 5).length,
      due:         all.filter(isDue).length,
    }
  }, [kanjiItems, kotobaItems, kanjiTotal, kotobaTotal])

  const hasMoreKanji  = kanjiItems.length < kanjiTotal
  const hasMoreKotoba = kotobaItems.length < kotobaTotal

  // ── Study single item ─────────────────────────────────────────────────
  async function studyItem(item) {
    setStudying(item.id)
    try {
      const result = await mcp.createSession({
        level: item.jlpt_level || level,
        type:  item.item_type,
        source: 'all',
        count: 1,
      })
      if (result?.success) navigate('/session/' + result.session_id)
      else alert(result?.message ?? 'No session created')
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setStudying(null)
  }

  // ── Legend popover ────────────────────────────────────────────────────
  const legendEl = showLegend && (
    <div style={legendBox}>
      {MASTERY_LABEL.map((label, i) => (
        <div key={i} style={legendRow}>
          <span style={{ ...legendDot, background: MASTERY_COLOR[i] }} />
          <span style={legendLabel}>
            <strong>{label}</strong> — {MASTERY_DESC[i]}
          </span>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div style={drillOverlay} onClick={onClose}>
        <div style={drillBox} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading {level} items…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={drillOverlay} onClick={onClose}>
      <div style={drillBox} onClick={e => e.stopPropagation()}>
        {/* ═══ Header ════════════════════════════════════════════════════ */}
        <div style={drillHeader}>
          <div style={drillHeaderLeft}>
            <span style={drillLevelBadge}>{level}</span>
            <span style={drillTitle}>Item Details</span>
            <span style={drillCount}>{stats.total} total</span>
          </div>
          <div style={drillHeaderRight}>
            <button className="dash-btn" style={drillBrowseBtn} onClick={() => { onClose?.(); navigate('/browse') }}>Browse all</button>
            <button className="dash-btn" style={drillCloseBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ═══ Summary bar (clickable stats) ══════════════════════════════ */}
        <div style={drillSummary}>
          <div style={drillSummaryStat} onClick={() => setActiveTab('all')} title="Show all items">
            <span style={drillSummaryVal}>{stats.total}</span>
            <span style={drillSummaryLabel}>Total</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('kanji')} title="Show kanji only">
            <span style={{ ...drillSummaryVal, color: 'var(--gold)' }}>{kanjiItems.length}</span>
            <span style={drillSummaryLabel}>Kanji</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('kotoba')} title="Show words only">
            <span style={{ ...drillSummaryVal, color: 'var(--blue)' }}>{kotobaItems.length}</span>
            <span style={drillSummaryLabel}>Words</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('new')} title="Show not started">
            <span style={{ ...drillSummaryVal, color: 'var(--text3)' }}>{stats.notStarted}</span>
            <span style={drillSummaryLabel}>Not started</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('inprogress')} title="Show in progress (Learning to Strong)">
            <span style={{ ...drillSummaryVal, color: 'var(--blue)' }}>{stats.learning}</span>
            <span style={drillSummaryLabel}>In progress</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('done')} title="Show mastered">
            <span style={{ ...drillSummaryVal, color: 'var(--green)' }}>{stats.mastered}</span>
            <span style={drillSummaryLabel}>Mastered</span>
          </div>
          <div style={drillSummaryStat} onClick={() => setActiveTab('due')} title="Show due for review">
            <span style={{ ...drillSummaryVal, color: 'var(--gold)' }}>{stats.due}</span>
            <span style={drillSummaryLabel}>Due</span>
          </div>
        </div>

        {/* ═══ Mini bar (Not started / In progress / Mastered) ══════════ */}
        <div style={drillMiniBar}>
          {[
            { count: stats.notStarted, color: '#475569' },
            { count: stats.inProgress, color: '#38bdf8' },
            { count: stats.mastered,   color: '#4ade80' },
          ].map((seg, i) => {
            const pct = stats.total > 0 ? (seg.count / stats.total) * 100 : 0
            return pct > 0 ? <div key={i} style={{ width: `${pct}%`, height: '100%', background: seg.color, flexShrink: 0 }} /> : null
          })}
        </div>

        {/* ═══ Search + Filters + Sort toolbar ═══════════════════════════ */}
        <div style={drillToolbar}>
          <div style={drillSearchWrap}>
            <svg style={drillSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              style={drillSearchInput}
              placeholder="Search character, reading, meaning…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button style={drillClearBtn} onClick={() => setQuery('')}>✕</button>}
          </div>
          <div style={drillToolbarRight}>
            <div style={drillOrderGroup}>
              <select style={drillOrderSelect} value={orderBy} onChange={e => setOrderBy(e.target.value)}>
                {ORDER_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div style={drillLegendWrap}>
              <button className="dash-btn" style={drillLegendBtn} onClick={() => setShowLegend(v => !v)} onBlur={() => setTimeout(() => setShowLegend(false), 200)}>?</button>
              {legendEl}
            </div>
          </div>
        </div>

        {/* ═══ Tab filters ════════════════════════════════════════════════ */}
        <div style={drillTabsRow}>
          {[
            { key: 'all',        label: `All` },
            { key: 'kanji',      label: `Kanji (${kanjiItems.length})` },
            { key: 'kotoba',     label: `Words (${kotobaItems.length})` },
            { key: 'new',        label: `New (${stats.notStarted})` },
            { key: 'inprogress', label: `Active (${stats.inProgress})` },
            { key: 'done',       label: `Done (${stats.mastered})` },
            { key: 'due',        label: `Due (${stats.due})` },
          ].filter(t => {
            if (t.key === 'new')        return stats.notStarted > 0
            if (t.key === 'inprogress') return stats.inProgress > 0
            if (t.key === 'done')       return stats.mastered > 0
            if (t.key === 'due')        return stats.due > 0
            return true
          }).map(t => (
            <button key={t.key} className="dash-btn"
              style={{ ...drillTab, ...(activeTab === t.key ? drillTabActive : {}) }}
              onClick={() => setActiveTab(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {/* ═══ Item list ══════════════════════════════════════════════════ */}
        <div ref={listRef} style={drillList}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
              {query ? 'No items match your search.' : 'No items in this view.'}
            </div>
          ) : filteredItems.map(item => (
            <div key={item.id} style={drillCard}>
              <div style={drillCardLeft}>
                <span className="jp" style={drillChar}>{item.value}</span>
                <div style={drillCardInfo}>
                  <div style={drillCardTop}>
                    <span className="jp" style={drillReading}>{item.reading_hiragana ?? '—'}</span>
                    <span style={drillTypeBadge}>{item.item_type === 'kanji' ? '漢' : '語'}</span>
                  </div>
                  <div style={drillMeaning}>{item.core_meaning}</div>
                  <div style={drillCardSub}>
                    <span style={drillSub}>{item.review_count} reviews</span>
                    {(item.times_correct > 0 || item.times_wrong > 0) && (
                      <>
                        <span style={drillSubSep}>·</span>
                        <span style={drillSub}>{Math.round(item.times_correct / Math.max(item.times_correct + item.times_wrong, 1) * 100)}% acc.</span>
                      </>
                    )}
                    {item.next_review && isDue(item) && (
                      <><span style={drillSubSep}>·</span><span style={{ ...drillSub, color: 'var(--gold)' }}>Due {timeAgo(item.next_review)}</span></>
                    )}
                  </div>
                </div>
              </div>
              <div style={drillCardRight}>
                <span style={{
                  ...drillMasteryPill,
                  color: MASTERY_COLOR[item.mastery_level],
                  background: MASTERY_BG[item.mastery_level],
                }}>
                  {MASTERY_LABEL[item.mastery_level]}
                </span>
                {isDue(item) && <span style={drillDueBadge}>Due</span>}
                <button
                  className="dash-btn"
                  style={drillStudyBtn}
                  disabled={studying === item.id}
                  onClick={() => studyItem(item)}
                >
                  {studying === item.id ? '…' : item.mastery_level >= 5 ? 'Review' : 'Study'}
                </button>
              </div>
            </div>
          ))}

          {/* ── Load more ──────────────────────────────────────────── */}
          {activeTab === 'kanji' && hasMoreKanji && (
            <div style={loadMoreWrap}>
              <button className="dash-btn" style={loadMoreBtn} disabled={loadingMore} onClick={() => loadMore('kanji')}>
                {loadingMore ? 'Loading…' : `Load more kanji (${kanjiItems.length}/${kanjiTotal})`}
              </button>
            </div>
          )}
          {activeTab === 'kotoba' && hasMoreKotoba && (
            <div style={loadMoreWrap}>
              <button className="dash-btn" style={loadMoreBtn} disabled={loadingMore} onClick={() => loadMore('kotoba')}>
                {loadingMore ? 'Loading…' : `Load more words (${kotobaItems.length}/${kotobaTotal})`}
              </button>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'new' || activeTab === 'inprogress' || activeTab === 'due' || activeTab === 'done') && (hasMoreKanji || hasMoreKotoba) && (
            <div style={loadMoreWrap}>
              {hasMoreKanji && (
                <button className="dash-btn" style={loadMoreBtn} disabled={loadingMore} onClick={() => loadMore('kanji')}>
                  {loadingMore ? 'Loading…' : `Load more kanji (${kanjiItems.length}/${kanjiTotal})`}
                </button>
              )}
              {hasMoreKotoba && (
                <button className="dash-btn" style={{ ...loadMoreBtn, marginLeft: hasMoreKanji ? 8 : 0 }} disabled={loadingMore} onClick={() => loadMore('kotoba')}>
                  {loadingMore ? 'Loading…' : `Load more words (${kotobaItems.length}/${kotobaTotal})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Styles ───────────────────────────────────────────────────────────────────────
const drillOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  zIndex: 100, padding: '40px 20px', overflowY: 'auto',
}

const drillBox = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  width: '100%', maxWidth: 760,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  marginTop: 20,
}

const drillHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: '1px solid var(--border)',
  flexShrink: 0,
}

const drillHeaderLeft = { display: 'flex', alignItems: 'center', gap: 10 }
const drillHeaderRight = { display: 'flex', alignItems: 'center', gap: 6 }

const drillLevelBadge = {
  fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
  border: '1px solid var(--gold)', color: 'var(--gold)',
  background: 'rgba(212,168,67,0.1)', lineHeight: 1.4,
}

const drillTitle = { fontSize: 15, fontWeight: 600 }
const drillCount = { fontSize: 11, color: 'var(--text3)', fontWeight: 400 }

const drillBrowseBtn = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '5px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer',
}

const drillCloseBtn = {
  background: 'transparent', border: 'none', fontSize: 18, color: 'var(--text3)',
  cursor: 'pointer', padding: '2px 6px',
}

const drillSummary = {
  display: 'flex', padding: '10px 16px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg3)', flexShrink: 0,
}

const drillSummaryStat = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  cursor: 'pointer', padding: '2px 0', borderRadius: 4,
  transition: 'background 0.15s',
}

const drillSummaryVal = {
  fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
}

const drillSummaryLabel = {
  fontSize: 9, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5,
}

const drillMiniBar = {
  height: 3, flexShrink: 0, display: 'flex', overflow: 'hidden',
}

const drillToolbar = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 14px', borderBottom: '1px solid var(--border)',
  flexShrink: 0,
}

const drillSearchWrap = {
  position: 'relative', flex: 1, minWidth: 0,
}

const drillSearchIcon = {
  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text3)', pointerEvents: 'none',
}

const drillSearchInput = {
  width: '100%', padding: '7px 30px 7px 32px',
  background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 12, color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box',
}

const drillClearBtn = {
  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', color: 'var(--text3)',
  cursor: 'pointer', fontSize: 12, padding: '2px 4px',
}

const drillToolbarRight = {
  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
}

const drillOrderGroup = {
  display: 'flex', alignItems: 'center', gap: 4,
}

const drillOrderSelect = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '5px 8px', fontSize: 11, color: 'var(--text)',
  cursor: 'pointer', outline: 'none',
}

const drillLegendWrap = { position: 'relative' }

const drillLegendBtn = {
  width: 24, height: 24, borderRadius: '50%',
  background: 'var(--bg3)', border: '1px solid var(--border)',
  color: 'var(--text3)', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const legendBox = {
  position: 'absolute', top: '100%', right: 0, marginTop: 6,
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 14px', minWidth: 200,
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 10,
}

const legendRow = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
}

const legendDot = {
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
}

const legendLabel = { fontSize: 11, color: 'var(--text2)' }

const drillTabsRow = {
  display: 'flex', gap: 4, padding: '6px 14px',
  borderBottom: '1px solid var(--border)', flexShrink: 0,
  flexWrap: 'wrap',
}

const drillTab = {
  background: 'transparent', border: '1px solid transparent',
  borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500,
  color: 'var(--text2)', cursor: 'pointer',
}

const drillTabActive = {
  background: 'var(--bg3)', borderColor: 'var(--border)',
  color: 'var(--text)', fontWeight: 600,
}

const drillList = {
  flex: 1, overflowY: 'auto', padding: '2px 0', maxHeight: '55vh',
}

const drillCard = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '9px 14px', gap: 10,
  borderBottom: '1px solid var(--border)',
}

const drillCardLeft = {
  display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1,
}

const drillChar = {
  fontSize: 20, width: 30, textAlign: 'center', flexShrink: 0,
  color: 'var(--gold)', lineHeight: 1.2,
}

const drillCardInfo = { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }

const drillCardTop = {
  display: 'flex', alignItems: 'center', gap: 5,
}

const drillReading = { fontSize: 13, fontWeight: 500 }

const drillTypeBadge = {
  fontSize: 9, fontWeight: 700,
  background: 'var(--bg3)', color: 'var(--text3)',
  borderRadius: 3, padding: '1px 5px', lineHeight: 1.3,
}

const drillMeaning = {
  fontSize: 12, color: 'var(--text2)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}

const drillCardSub = {
  display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  fontSize: 10, color: 'var(--text3)', marginTop: 1,
}

const drillSub = {}
const drillSubSep = {}

const drillCardRight = {
  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
}

const drillMasteryPill = {
  fontSize: 10, fontWeight: 600, padding: '2px 7px',
  borderRadius: 4, minWidth: 48, textAlign: 'center',
}

const drillDueBadge = {
  fontSize: 9, fontWeight: 700, color: 'var(--gold)',
  background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.2)',
  borderRadius: 4, padding: '1px 5px',
}

const drillStudyBtn = {
  background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6,
  padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text)',
  cursor: 'pointer', whiteSpace: 'nowrap',
}

const loadMoreWrap = {
  display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 14px',
}

const loadMoreBtn = {
  background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 600,
  color: 'var(--text2)', cursor: 'pointer',
}
