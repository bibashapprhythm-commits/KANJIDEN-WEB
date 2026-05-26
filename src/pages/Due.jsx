import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'

const MASTERY = {
  0: { color: '#64748b', label: 'new'      },
  1: { color: '#38bdf8', label: 'learning' },
  2: { color: '#818cf8', label: 'familiar' },
  3: { color: '#fbbf24', label: 'good'     },
  4: { color: '#34d399', label: 'strong'   },
  5: { color: '#4ade80', label: 'mastered' },
}

export default function Due() {
  const navigate = useNavigate()
  const [items,    setItems]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    mcp.getDueToday({})
      .then(r => { setItems(r?.items ?? []); setLoading(false) })
      .catch(()  => { setItems([]);           setLoading(false) })
  }, [])

  const allItems   = items ?? []
  const kanjiItems = allItems.filter(i => i.item_type === 'kanji')
  const vocabItems = allItems.filter(i => i.item_type === 'kotoba')

  const levelSet = useMemo(() => {
    const s = new Set()
    allItems.forEach(i => { if (i.jlpt_level) s.add(i.jlpt_level) })
    return s
  }, [allItems])

  const displayedKanji = useMemo(() => {
    if (filter === 'vocab')  return []
    if (filter === 'kanji')  return kanjiItems
    if (filter === 'all')    return kanjiItems
    return kanjiItems.filter(i => i.jlpt_level === filter)
  }, [filter, kanjiItems])

  const displayedVocab = useMemo(() => {
    if (filter === 'kanji')  return []
    if (filter === 'vocab')  return vocabItems
    if (filter === 'all')    return vocabItems
    return vocabItems.filter(i => i.jlpt_level === filter)
  }, [filter, vocabItems])

  async function startSession(type) {
    setStarting(type)
    try {
      const args = type === 'all'
        ? { source: 'due', count: allItems.length }
        : { source: 'due', count: type === 'kanji' ? kanjiItems.length : vocabItems.length,
            type: type === 'kanji' ? 'kanji' : 'kotoba' }
      const result = await mcp.createSession(args)
      if (result?.success) navigate('/session/' + result.session_id)
      else alert(result?.message ?? 'Could not create session')
    } catch (e) { alert('Error: ' + e.message) }
    setStarting(null)
  }

  const levelFilters = ['N5', 'N4', 'N3', 'N2', 'N1'].filter(l => levelSet.has(l))

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
        {loading ? (
          <div style={s.loadMsg}>Loading due items…</div>
        ) : (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>Due Today — {allItems.length} items</h1>
              <div style={s.pageSub}>
                {kanjiItems.length > 0 && `${kanjiItems.length} kanji`}
                {kanjiItems.length > 0 && vocabItems.length > 0 && ' · '}
                {vocabItems.length > 0 && `${vocabItems.length} vocab`}
              </div>
            </div>

            <div style={s.filters}>
              {[
                { key: 'all',   label: 'All'   },
                { key: 'kanji', label: 'Kanji' },
                { key: 'vocab', label: 'Vocab' },
                ...levelFilters.map(l => ({ key: l, label: l })),
              ].map(f => (
                <button key={f.key} className="dash-btn"
                  style={{ ...s.filterBtn, ...(filter === f.key ? s.filterActive : {}) }}
                  onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>

            {displayedKanji.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionDivider}>KANJI ({displayedKanji.length})</div>
                {displayedKanji.map(item => <KanjiRow key={item.id} item={item} />)}
              </div>
            )}

            {displayedVocab.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionDivider}>VOCAB ({displayedVocab.length})</div>
                {displayedVocab.map(item => <VocabRow key={item.id} item={item} />)}
              </div>
            )}

            {allItems.length === 0 && (
              <div style={s.empty}>Nothing due today.</div>
            )}

            {allItems.length > 0 && (
              <div style={s.studyActions}>
                <button className="dash-btn" style={s.studyBtn}
                  onClick={() => startSession('all')} disabled={!!starting}>
                  {starting === 'all' ? 'Starting…' : `Study all ${allItems.length}`}
                </button>
                {kanjiItems.length > 0 && (
                  <button className="dash-btn" style={s.studyBtnSec}
                    onClick={() => startSession('kanji')} disabled={!!starting}>
                    {starting === 'kanji' ? 'Starting…' : `Kanji only — ${kanjiItems.length}`}
                  </button>
                )}
                {vocabItems.length > 0 && (
                  <button className="dash-btn" style={s.studyBtnSec}
                    onClick={() => startSession('vocab')} disabled={!!starting}>
                    {starting === 'vocab' ? 'Starting…' : `Vocab only — ${vocabItems.length}`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function MasteryDot({ level }) {
  const m = MASTERY[level] ?? MASTERY[0]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: m.color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

function KanjiRow({ item }) {
  const onReadings  = (item.onyomi  ?? []).map((k, i) => item.romaji_on?.[i]  ? `${k} (${item.romaji_on[i]})`  : k)
  const kunReadings = (item.kunyomi ?? []).map((k, i) => item.romaji_kun?.[i] ? `${k} (${item.romaji_kun[i]})` : k)

  return (
    <div style={s.itemRow}>
      <span className="jp" style={s.itemChar}>{item.value}</span>
      <div style={s.itemInfo}>
        <div style={s.itemTop}>
          <span style={s.itemMeaning}>{item.meaning}</span>
          <span style={s.itemJlpt}>{item.jlpt_level}</span>
          <MasteryDot level={item.mastery_level ?? 0} />
        </div>
        <div style={s.itemReadings}>
          <span style={s.rlabel}>On:</span>
          <span className="jp" style={s.rtext}>{onReadings.length  > 0 ? onReadings.join(' · ')  : '—'}</span>
          <span style={{ ...s.rlabel, marginLeft: 8 }}>Kun:</span>
          <span className="jp" style={s.rtext}>{kunReadings.length > 0 ? kunReadings.join(' · ') : '—'}</span>
        </div>
      </div>
    </div>
  )
}

function VocabRow({ item }) {
  return (
    <div style={s.itemRow}>
      <span className="jp" style={s.itemChar}>{item.value}</span>
      <div style={s.itemInfo}>
        <div style={s.itemTop}>
          <span className="jp" style={s.itemReading}>{item.reading}</span>
          {item.romaji && <span style={s.itemRomaji}>/ {item.romaji}</span>}
          <span style={s.itemJlpt}>{item.jlpt_level}</span>
          <MasteryDot level={item.mastery_level ?? 0} />
        </div>
        <div style={s.itemMeaning}>{item.meaning}</div>
      </div>
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
  main:       { flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 },
  loadMsg:    { color: 'var(--text2)', fontSize: 14, textAlign: 'center', padding: 40 },
  empty:      { textAlign: 'center', color: 'var(--text2)', padding: 40 },

  pageHeader: { display: 'flex', flexDirection: 'column', gap: 4 },
  pageTitle:  { fontSize: 20, fontWeight: 700 },
  pageSub:    { fontSize: 13, color: 'var(--text2)' },

  filters:      { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterBtn:    { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' },
  filterActive: { background: 'var(--gold-dim)', borderColor: 'var(--gold)', color: 'var(--gold)' },

  section:       { display: 'flex', flexDirection: 'column' },
  sectionDivider:{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1.4, textTransform: 'uppercase', padding: '8px 0 6px', borderBottom: '2px solid var(--border)' },

  itemRow:      { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  itemChar:     { fontSize: 28, color: 'var(--gold)', lineHeight: 1, flexShrink: 0, minWidth: 36, textAlign: 'center', marginTop: 2 },
  itemInfo:     { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  itemTop:      { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemMeaning:  { fontSize: 14, color: 'var(--text)', fontWeight: 500 },
  itemReading:  { fontSize: 14 },
  itemRomaji:   { fontSize: 12, color: 'var(--text3)' },
  itemJlpt:     { fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 },
  itemReadings: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rlabel:       { fontSize: 11, fontWeight: 700, color: 'var(--text3)', minWidth: 24 },
  rtext:        { fontSize: 13, color: 'var(--text2)' },

  studyActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, paddingTop: 16, borderTop: '2px solid var(--border)' },
  studyBtn:     { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  studyBtnSec:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' },
}
