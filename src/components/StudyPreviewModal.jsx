import { useState, useEffect, useMemo } from 'react'
import { mcp } from '../lib/mcp.js'
import SessionPreviewPanel from './SessionPreviewPanel.jsx'

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1']
const SOURCE_LABELS = { due: 'Review Due', weak: 'Weak Items', new: 'New Items' }

export default function StudyPreviewModal({ source, newItemsCount = 0, onClose, onStart }) {
  const [items,    setItems]    = useState(null)   // null = not yet fetched / unavailable
  const [loading,  setLoading]  = useState(source !== 'new')
  const [count,    setCount]    = useState(20)
  const [levels,   setLevels]   = useState([])     // [] = All
  const [type,     setType]     = useState('both')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (source === 'new') {
      fetchNewItems()
    } else {
      fetchSourceItems()
    }
  }, [])

  async function fetchSourceItems() {
    setLoading(true)
    try {
      const result = source === 'due'
        ? await mcp.getDueToday({})
        : await mcp.getWeakWords({})
      const loaded = result?.items ?? []
      setItems(loaded)
      setCount(Math.max(5, Math.min(20, Math.ceil(loaded.length / 5) * 5)))
    } catch {
      setItems([])
    }
    setLoading(false)
  }

  async function fetchNewItems() {
    setLoading(true)
    try {
      const result = await mcp.getNewItems({})
      const loaded = result?.items ?? []
      setItems(loaded)
      setCount(Math.max(5, Math.min(20, Math.ceil(loaded.length / 5) * 5)))
    } catch {
      // getNewItems not yet deployed — fall back to count-only display
      setItems(null)
    }
    setLoading(false)
  }

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items
      .filter(i => levels.length === 0 || levels.includes(i.jlpt_level))
      .filter(i => type === 'both' || i.item_type === (type === 'kanji' ? 'kanji' : 'kotoba'))
  }, [items, levels, type])

  const baseCount   = source === 'new' && items === null ? newItemsCount : filteredItems.length
  const sliderMax   = Math.max(baseCount, 5)
  const effectiveCount = Math.min(count, sliderMax)

  const toggleLevel = (l) =>
    setLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])

  async function handleStart() {
    setStarting(true)
    try {
      const args = {
        source,
        count: effectiveCount,
        type,
        ...(levels.length === 1 ? { level: levels[0] } : {}),
      }
      const result = await mcp.createSession(args)
      if (result?.success) {
        onStart(result.session_id)
        onClose()
      } else {
        alert(result?.message ?? 'No items found')
        setStarting(false)
      }
    } catch (e) {
      alert('Error: ' + e.message)
      setStarting(false)
    }
  }

  // Summary strip
  const kanjiCount = (items ?? []).filter(i => i.item_type === 'kanji').length
  const vocabCount = (items ?? []).filter(i => i.item_type === 'kotoba').length
  const levelCounts = {}
  for (const item of (items ?? [])) {
    if (item.jlpt_level) levelCounts[item.jlpt_level] = (levelCounts[item.jlpt_level] ?? 0) + 1
  }
  const lvlStr = LEVEL_ORDER.filter(l => levelCounts[l] > 0).map(l => `${l}:${levelCounts[l]}`).join('  ')

  let summaryStr
  if (loading) {
    summaryStr = 'Loading…'
  } else if (source === 'new' && items === null) {
    summaryStr = `~${newItemsCount} new items available`
  } else {
    const parts = [
      `${(items ?? []).length} items`,
      kanjiCount > 0 && `${kanjiCount} kanji`,
      vocabCount > 0 && `${vocabCount} vocab`,
    ].filter(Boolean)
    summaryStr = [parts.join(' · '), lvlStr].filter(Boolean).join(' · ')
  }

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.box} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={m.header}>
          <span style={m.title}>{SOURCE_LABELS[source] ?? source}</span>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Summary strip */}
        <div style={m.summary}>{summaryStr}</div>

        {/* Item preview */}
        {loading && (
          <div style={m.loadingRow}>Loading items…</div>
        )}
        {!loading && items !== null && (
          <div style={m.listWrap}>
            <SessionPreviewPanel items={filteredItems} maxVisible={10} />
          </div>
        )}

        {/* Count slider */}
        <div style={m.section}>
          <div style={m.label}>Items: <strong>{effectiveCount}</strong></div>
          <input
            type="range"
            min={5}
            max={sliderMax}
            step={5}
            value={Math.min(count, sliderMax)}
            onChange={e => setCount(Number(e.target.value))}
            style={m.slider}
          />
          <div style={m.sliderEdges}>
            <span>5</span>
            <span>{sliderMax}</span>
          </div>
        </div>

        {/* Level pills */}
        <div style={m.section}>
          <div style={m.label}>Level</div>
          <div style={m.pillRow}>
            {['All', ...LEVEL_ORDER].map(l => {
              const isAll    = l === 'All'
              const isActive = isAll ? levels.length === 0 : levels.includes(l)
              return (
                <button
                  key={l}
                  style={{ ...m.pill, ...(isActive ? m.pillActive : {}) }}
                  onClick={() => isAll ? setLevels([]) : toggleLevel(l)}
                >{l}</button>
              )
            })}
          </div>
        </div>

        {/* Type toggle */}
        <div style={m.section}>
          <div style={m.label}>Type</div>
          <div style={m.pillRow}>
            {[['both', 'Both'], ['kanji', 'Kanji'], ['kotoba', 'Vocab']].map(([val, lbl]) => (
              <button
                key={val}
                style={{ ...m.pill, ...(type === val ? m.pillActive : {}) }}
                onClick={() => setType(val)}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* Start */}
        <button
          style={{ ...m.startBtn, ...(starting || effectiveCount === 0 ? m.startBtnDisabled : {}) }}
          onClick={handleStart}
          disabled={starting || effectiveCount === 0}
        >
          {starting ? 'Creating…' : `Start ${effectiveCount} items →`}
        </button>
      </div>
    </div>
  )
}

const m = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 20,
  },
  box: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 22px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text3)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
  },
  summary: {
    fontSize: 12,
    color: 'var(--text2)',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    lineHeight: 1.5,
  },
  loadingRow: {
    fontSize: 13,
    color: 'var(--text3)',
    textAlign: 'center',
    padding: '12px 0',
  },
  listWrap: {
    maxHeight: 220,
    overflowY: 'auto',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slider: {
    width: '100%',
    accentColor: 'var(--gold)',
    cursor: 'pointer',
  },
  sliderEdges: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text3)',
  },
  pillRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  pill: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  pillActive: {
    background: 'var(--gold-dim)',
    borderColor: 'var(--gold)',
    color: 'var(--gold)',
  },
  startBtn: {
    background: 'var(--gold)',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    marginTop: 2,
  },
  startBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
}
