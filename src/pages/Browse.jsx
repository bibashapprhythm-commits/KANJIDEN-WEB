import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'
import KanjiDetailPanel from '../components/KanjiDetailPanel.jsx'

const N5_CLUSTERS = [
  {
    tag: 'numbers',
    label: 'Numbers',
    emoji: '🔢',
    description: 'The counting foundation — master these and you can read prices, dates, floors, and phone numbers.',
    pairs: [],
  },
  {
    tag: 'time',
    label: 'Time & Calendar',
    emoji: '🕐',
    description: "Time words appear in every schedule, every date, every deadline. 年月日時分 are the five you'll see daily.",
    pairs: [['前','後'],['新','古'],['今','週']],
  },
  {
    tag: 'directions',
    label: 'Directions & Position',
    emoji: '🧭',
    description: 'Position pairs cut learning in half — 上/下, 左/右, 前/後, 中/外. Cardinal directions 東西南北 appear on every station exit.',
    pairs: [['上','下'],['左','右'],['前','後'],['中','外'],['東','西'],['南','北']],
  },
  {
    tag: 'nature',
    label: 'Nature & Elements',
    emoji: '🌿',
    description: '山川水火木土 form the basis of hundreds of compound words.',
    pairs: [['山','川'],['火','水'],['木','土']],
  },
  {
    tag: 'body',
    label: 'Body Parts',
    emoji: '👁️',
    description: '口手足目耳 — these appear in idioms, directions, and everyday expressions.',
    pairs: [['手','足'],['目','耳']],
  },
  {
    tag: 'people',
    label: 'People & Family',
    emoji: '👨‍👩‍👧',
    description: '人男女子父母友 — the core people words. 子 appears in hundreds of compound words.',
    pairs: [['男','女'],['父','母']],
  },
  {
    tag: 'school',
    label: 'School & Learning',
    emoji: '📚',
    description: "学校語書読聞 — you're literally using these kanji right now.",
    pairs: [['書','読'],['聞','話']],
  },
  {
    tag: 'actions',
    label: 'Core Actions',
    emoji: '⚡',
    description: '行来見出入話 — the most common verbs. Master these and you can follow basic instructions anywhere.',
    pairs: [['行','来'],['出','入'],['飲','食']],
  },
]

const LEVELS = ['N5', 'N4', 'N3', 'N2']

export default function Browse() {
  const navigate                    = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [clusterData,   setClusterData]   = useState({})   // tag → { items, loading, error }
  const [activeCluster, setActiveCluster] = useState(null)  // cluster config object
  const [selectedKanji, setSelectedKanji] = useState(null)
  const [relatedWords,  setRelatedWords]  = useState([])
  const [loadingWords,  setLoadingWords]  = useState(false)
  const [addedItems,    setAddedItems]    = useState({})     // itemId → sessionId
  const [addingItem,    setAddingItem]    = useState(null)

  // Fetch all N5 cluster data on mount
  useEffect(() => {
    for (const cluster of N5_CLUSTERS) {
      setClusterData(prev => ({ ...prev, [cluster.tag]: { items: [], loading: true } }))
      mcp.getItemsByTag(cluster.tag, 'N5').then(result => {
        setClusterData(prev => ({ ...prev, [cluster.tag]: { items: result.items ?? [], loading: false } }))
      }).catch(() => {
        setClusterData(prev => ({ ...prev, [cluster.tag]: { items: [], loading: false, error: true } }))
      })
    }
  }, [])

  // Open cluster from URL param on mount
  useEffect(() => {
    const tag = searchParams.get('cluster')
    if (tag) {
      const found = N5_CLUSTERS.find(c => c.tag === tag)
      if (found) setActiveCluster(found)
    }
  }, [])  // eslint-disable-line

  function openCluster(cluster) {
    setActiveCluster(cluster)
    setSelectedKanji(null)
    setRelatedWords([])
    setSearchParams({ cluster: cluster.tag })
  }

  function closeCluster() {
    setActiveCluster(null)
    setSelectedKanji(null)
    setRelatedWords([])
    setSearchParams({})
  }

  async function selectKanji(item) {
    setSelectedKanji(item)
    setRelatedWords([])
    setLoadingWords(true)
    try {
      const result = await mcp.getRelatedWords(item.value)
      setRelatedWords(result.items ?? [])
    } catch {}
    setLoadingWords(false)
  }

  async function addToQueue(item) {
    setAddingItem(item.id)
    try {
      const result = await mcp.createSession({ item_ids: [item.id] })
      if (result?.success) {
        setAddedItems(prev => ({ ...prev, [item.id]: result.session_id }))
      } else {
        alert(result?.message ?? 'Could not add to queue')
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setAddingItem(null)
  }

  const clusterItems = activeCluster ? (clusterData[activeCluster.tag]?.items ?? []) : []

  // ── Cluster detail view ────────────────────────────────────────────────────
  if (activeCluster) {
    const { pairs, emoji, label } = activeCluster
    const pairBanner = pairs.length > 0
      ? pairs.map(([a, b]) => `${a}/${b}`).join(' · ')
      : null

    return (
      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.backBtnSmall} onClick={() => navigate(-1)}>← Back</button>
            <span style={s.logoKanji} className="jp">漢</span>
            <span style={s.logoText}>KanjiDen</span>
          </div>
          <nav style={s.nav}>
            <button style={s.navBtn} onClick={() => navigate('/')}>Home</button>
            <button style={s.navBtn} onClick={() => navigate('/levels')}>Levels</button>
            <button style={{ ...s.navBtn, ...s.navActive }}>Browse</button>
            <button style={s.navBtn} onClick={() => navigate('/progress')}>Progress</button>
          </nav>
        </header>

        <main style={s.main}>
          <div style={s.detailNav}>
            <button style={s.backBtn} onClick={closeCluster}>← All clusters</button>
          </div>

          <div style={s.detailTitle}>
            <span style={s.detailEmoji}>{emoji}</span>
            <h1 style={s.detailLabel}>{label}</h1>
            <span style={s.detailCount}>{clusterItems.length} kanji</span>
          </div>

          {pairBanner && (
            <div style={s.pairBanner}>
              💡 Learn these as pairs: {pairBanner}
            </div>
          )}

          {/* Tile grid */}
          <div style={s.tileGrid}>
            {clusterItems.map(item => {
              const mastered = item.mastery_level >= 3
              const inProg   = item.in_progress && !mastered
              const isSelected = selectedKanji?.id === item.id
              return (
                <button
                  key={item.id}
                  style={{
                    ...s.tile,
                    ...(isSelected ? s.tileSelected : {}),
                    ...(mastered ? s.tileMastered : inProg ? s.tileInProg : {}),
                  }}
                  onClick={() => selectKanji(item)}
                >
                  <span className="jp" style={s.tileChar}>{item.value}</span>
                  <span style={s.tileMeaning}>{item.core_meaning}</span>
                  {item.in_progress && (
                    <span style={{
                      ...s.tileDot,
                      background: ['#64748b','#38bdf8','#818cf8','#fbbf24','#34d399','#4ade80'][item.mastery_level ?? 0]
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {selectedKanji && (
            <div style={s.detailPanelWrap}>
              {loadingWords ? (
                <div style={s.loadingWords}>Loading…</div>
              ) : (
                <KanjiDetailPanel
                  item={selectedKanji}
                  relatedWords={relatedWords}
                  onAddToQueue={addToQueue}
                  adding={addingItem === selectedKanji.id}
                  added={!!addedItems[selectedKanji.id]}
                />
              )}
              {addedItems[selectedKanji.id] && (
                <button
                  style={s.studyNowBtn}
                  onClick={() => navigate('/session/' + addedItems[selectedKanji.id])}
                >
                  Study now →
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── Cluster grid view ──────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <nav style={s.nav}>
          <button style={s.navBtn} onClick={() => navigate('/')}>Home</button>
          <button style={s.navBtn} onClick={() => navigate('/levels')}>Levels</button>
          <button style={{ ...s.navBtn, ...s.navActive }}>Browse</button>
          <button style={s.navBtn} onClick={() => navigate('/progress')}>Progress</button>
        </nav>
      </header>

      <main style={s.main}>
        <div style={s.pageHead}>
          <h1 style={s.pageTitle}>Explore Kanji by Theme</h1>
          <div style={s.pageDesc}>Learn by topic, not by test level. Pick a cluster, explore the characters, study what you don't know.</div>
        </div>

        {/* Level tabs */}
        <div style={s.levelTabs}>
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              style={{ ...s.levelTab, ...(lvl === 'N5' ? s.levelTabActive : s.levelTabDim) }}
              disabled={lvl !== 'N5'}
            >
              {lvl}{lvl !== 'N5' && <span style={s.comingSoon}> · soon</span>}
            </button>
          ))}
        </div>

        {/* Cluster cards grid */}
        <div style={s.grid}>
          {N5_CLUSTERS.map(cluster => {
            const cd      = clusterData[cluster.tag]
            const items   = cd?.items ?? []
            const loading = cd?.loading ?? true
            const mastered = items.filter(i => i.mastery_level >= 3).length
            const inProg   = items.filter(i => i.in_progress && i.mastery_level < 3).length
            const previewChars = items.slice(0, 12).map(i => i.value).join('')

            return (
              <div key={cluster.tag} className="dash-card" style={s.clusterCard}>
                <div style={s.cardTop}>
                  <span style={s.cardEmoji}>{cluster.emoji}</span>
                  <div style={s.cardTitleBlock}>
                    <div style={s.cardLabel}>{cluster.label}</div>
                    {!loading && items.length > 0 && (
                      <div style={s.cardProgress}>
                        {mastered > 0 && <span style={s.progressMastered}>{mastered} mastered</span>}
                        {inProg   > 0 && <span style={s.progressInProg}>{inProg} in progress</span>}
                        {mastered === 0 && inProg === 0 && <span style={s.progressNew}>{items.length} new</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="jp" style={s.previewChars}>{loading ? '…' : previewChars}</div>
                <div style={s.cardDesc}>{cluster.description}</div>
                <button className="dash-btn" style={s.exploreBtn} onClick={() => openCluster(cluster)}>
                  Explore →
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ height: 40 }} />
      </main>
    </div>
  )
}

const s = {
  page:   { minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 24px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logoKanji:  { fontSize: 26, color: 'var(--gold)', lineHeight: 1 },
  logoText:   { fontSize: 16, fontWeight: 600, letterSpacing: 2.5 },
  nav:        { display: 'flex', gap: 4 },
  navBtn:     { background: 'transparent', border: '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' },
  navActive:  { border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)' },
  backBtnSmall: { background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', padding: '4px 0', marginRight: 4 },

  main: { maxWidth: 900, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 },

  pageHead:  { display: 'flex', flexDirection: 'column', gap: 6 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageDesc:  { fontSize: 14, color: 'var(--text2)' },

  levelTabs: { display: 'flex', gap: 6 },
  levelTab:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' },
  levelTabActive: { background: 'var(--gold-dim)', borderColor: 'var(--gold)', color: 'var(--gold)' },
  levelTabDim:    { opacity: 0.4, cursor: 'not-allowed' },
  comingSoon:     { fontSize: 10, fontWeight: 400 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },

  clusterCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop:      { display: 'flex', alignItems: 'flex-start', gap: 10 },
  cardEmoji:    { fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 },
  cardTitleBlock: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  cardLabel:    { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  cardProgress: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  progressMastered: { fontSize: 11, color: 'var(--green)', fontWeight: 600 },
  progressInProg:   { fontSize: 11, color: 'var(--blue)', fontWeight: 600 },
  progressNew:      { fontSize: 11, color: 'var(--text3)' },

  previewChars: { fontSize: 18, color: 'var(--gold)', letterSpacing: 2, lineHeight: 1.5 },
  cardDesc:     { fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, flex: 1 },
  exploreBtn:   { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', marginTop: 4 },

  // Detail view
  detailNav:   { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn:     { background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', padding: '4px 0' },
  detailTitle: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  detailEmoji: { fontSize: 28 },
  detailLabel: { fontSize: 22, fontWeight: 700, margin: 0 },
  detailCount: { fontSize: 13, color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 10px' },

  pairBanner: { fontSize: 13, color: 'var(--text2)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', lineHeight: 1.5 },

  tileGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 76, minHeight: 76, borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--bg2)', cursor: 'pointer', position: 'relative', padding: '8px 4px', gap: 4,
  },
  tileSelected: { border: '2px solid var(--blue)', background: 'var(--blue-dim)' },
  tileMastered: { border: '1px solid rgba(78,203,141,0.3)', background: 'rgba(78,203,141,0.06)' },
  tileInProg:   { border: '1px solid rgba(91,141,238,0.3)' },
  tileChar:     { fontSize: 24, color: 'var(--gold)', lineHeight: 1 },
  tileMeaning:  { fontSize: 9, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.2, maxWidth: 68 },
  tileDot:      { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%' },

  detailPanelWrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  loadingWords:    { color: 'var(--text2)', fontSize: 13, padding: '16px 0' },
  studyNowBtn:     { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}
