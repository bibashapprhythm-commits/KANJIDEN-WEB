import { useState, useEffect } from 'react'
import { mcp } from '../lib/mcp.js'
import SessionPreviewPanel   from '../components/SessionPreviewPanel.jsx'
import StudyPreviewModal     from '../components/StudyPreviewModal.jsx'
import LevelDrillDownModal   from '../components/LevelDrillDownModal.jsx'

const LEVELS = ['N5', 'N4', 'N3', 'N2']
const TYPES  = ['kanji', 'kotoba']

const LEVEL_ACCENT = {
  N5: { bg: 'rgba(78,203,141,0.1)', border: 'rgba(78,203,141,0.25)', text: '#4ecb8d' },
  N4: { bg: 'rgba(91,141,238,0.1)', border: 'rgba(91,141,238,0.25)', text: '#5b8dee' },
  N3: { bg: 'rgba(212,168,67,0.1)', border: 'rgba(212,168,67,0.25)', text: '#d4a843' },
  N2: { bg: 'rgba(224,92,106,0.1)', border: 'rgba(224,92,106,0.25)', text: '#e05c6a' },
}

export default function Home({ onStartSession, onNav }) {
  const [levelData,        setLevelData]        = useState({})
  const [pendingCourses,   setPendingCourses]   = useState([])
  const [pendingRegular,   setPendingRegular]   = useState(null)
  const [modal,            setModal]            = useState(null)   // course order modal
  const [studyModal,       setStudyModal]       = useState(null)   // quick study preview modal
  const [drillDown,        setDrillDown]        = useState(null)   // { level, tab } → LevelDrillDownModal
  const [orderBy,          setOrderBy]          = useState('radical')
  const [courseCreating,   setCourseCreating]   = useState(false)
  const [isExpandedRegular, setIsExpandedRegular] = useState(false)
  const [expandedCourses,  setExpandedCourses]  = useState({})    // { [id]: bool }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const pending = await mcp.getPendingSession()
      if (pending) {
        setPendingCourses(pending.pending_course_sessions ?? [])
        setPendingRegular(pending.pending_regular_session ?? null)
      }
    } catch {}

    const calls = LEVELS.flatMap(level =>
      TYPES.map(type => {
        const key = `${level}_${type}`
        setLevelData(prev => ({ ...prev, [key]: { loading: true } }))
        return mcp.getProgress({ level, type })
          .then(result => {
            const stats = type === 'kanji' ? result.kanji : result.kotoba
            setLevelData(prev => ({
              ...prev,
              [key]: {
                loading:       false,
                mastered:      (stats?.strong ?? 0) + (stats?.mastered ?? 0),
                total:         result?.overall?.curriculum_total ?? 0,
                due:           stats?.due_today ?? 0,
                newCount:      stats?.new ?? 0,
                learningCount: stats?.learning ?? 0,
                familiarCount: stats?.familiar ?? 0,
                goodCount:     stats?.good ?? 0,
                strongCount:   stats?.strong ?? 0,
                masteredCount: stats?.mastered ?? 0,
              },
            }))
          })
          .catch(() => setLevelData(prev => ({ ...prev, [key]: { loading: false, error: true } })))
      })
    )
    await Promise.all(calls)
  }

  async function startCourse() {
    if (!modal) return
    setCourseCreating(true)
    try {
      const result = await mcp.createCourse({ level: modal.level, type: modal.type, order_by: orderBy })
      if (result?.success) { setModal(null); onStartSession(result.session_id) }
      else alert(result?.message ?? 'Could not create course')
    } catch (e) { alert('Error: ' + e.message) }
    setCourseCreating(false)
  }

  const toggleCourse = (id) =>
    setExpandedCourses(prev => ({ ...prev, [id]: !prev[id] }))

  const allStats = LEVELS.flatMap(l => TYPES.map(t => levelData[`${l}_${t}`] ?? {}))
  const totalItems    = allStats.reduce((s, d) => s + (d.total ?? 0), 0)
  const totalMastered = allStats.reduce((s, d) => s + (d.mastered ?? 0), 0)
  const totalDue      = LEVELS.reduce((sum, lvl) =>
    sum + TYPES.reduce((s, tp) => s + (levelData[`${lvl}_${tp}`]?.due ?? 0), 0), 0)
  const overallPct    = totalItems > 0 ? Math.round(totalMastered / totalItems * 100) : 0

  // Approximate new items count for the quick-study modal
  const totalNewApprox = allStats.reduce((s, d) => {
    if (d.loading || d.error) return s
    return s + Math.max(0,
      (d.total ?? 0) - (d.learningCount ?? 0) - (d.familiarCount ?? 0) -
      (d.goodCount ?? 0) - (d.strongCount ?? 0) - (d.masteredCount ?? 0)
    )
  }, 0)

  const anyBusy   = courseCreating
  const anyLoading = LEVELS.some(l => TYPES.some(t => levelData[`${l}_${t}`]?.loading))

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <div style={s.headerRight}>
          {totalDue > 0 && (
            <div style={s.dueBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {totalDue} due
            </div>
          )}
          <button className="dash-btn" style={s.navBtn} onClick={() => onNav?.('levels')}>Levels</button>
          <button className="dash-btn" style={s.navBtn} onClick={() => onNav?.('browse')}>Browse</button>
        </div>
      </header>

      <main style={s.main}>
        {/* ── Overview Stats ─────────────────────────────────────────────── */}
        {!anyLoading && (
          <div style={s.statsRow}>
            <div className="dash-card" style={s.statCard}>
              <span style={s.statValue}>{totalItems}</span>
              <span style={s.statLabel}>Total items</span>
            </div>
            <div className="dash-card" style={s.statCard}>
              <span style={{...s.statValue, color:'var(--green)'}}>{totalMastered}</span>
              <span style={s.statLabel}>Mastered</span>
            </div>
            <div className="dash-card" style={s.statCard}>
              <span style={{...s.statValue, color: totalDue > 0 ? 'var(--gold)' : 'var(--text2)'}}>{totalDue}</span>
              <span style={s.statLabel}>Due today</span>
            </div>
            <div className="dash-card" style={s.statCard}>
              <span style={{...s.statValue, color: overallPct > 50 ? 'var(--green)' : overallPct > 20 ? 'var(--gold)' : 'var(--text2)'}}>
                {overallPct}%
              </span>
              <span style={s.statLabel}>Progress</span>
            </div>
          </div>
        )}

        {/* ── JLPT Mastery ──────────────────────────────────────────────── */}
        <section>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>JLPT Mastery</h2>
            {!anyLoading && <span style={s.sectionCount}>{totalMastered}/{totalItems}</span>}
          </div>
          <div style={s.grid2}>
            {LEVELS.map(level => (
              <LevelCard
                key={level}
                level={level}
                kanjiData={levelData[`${level}_kanji`]}
                kotobaData={levelData[`${level}_kotoba`]}
                onStart={(type) => { setOrderBy('radical'); setModal({ level, type }) }}
                anyBusy={anyBusy}
                onDrillDown={(tab) => setDrillDown({ level, tab })}
              />
            ))}
          </div>
        </section>

        {/* ── Pending Courses ───────────────────────────────────────────── */}
        {pendingCourses.length > 0 && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Pending Courses</h2>
              <span style={s.sectionCount}>{pendingCourses.length}</span>
            </div>
            <div style={s.pendingList}>
              {pendingCourses.map(session => {
                const itemCount = session.items_count ?? session.items?.length ?? 0
                const expanded  = !!expandedCourses[session.id]
                return (
                  <div key={session.id} className="dash-card" style={s.courseCard}>
                    <div style={s.courseLeft}>
                      <div style={s.courseIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      </div>
                      <div style={s.courseInfo}>
                        <div style={s.courseName}>
                          {session.params?.course_name ?? 'Course'}
                          {itemCount > 0 && <span style={s.itemCountBadge}> · {itemCount} items</span>}
                        </div>
                        <div style={s.courseMeta}>
                          <span style={{
                            ...s.metaBadge,
                            background: LEVEL_ACCENT[session.params?.level]?.bg ?? 'var(--bg3)',
                            borderColor: LEVEL_ACCENT[session.params?.level]?.border ?? 'var(--border)',
                            color: LEVEL_ACCENT[session.params?.level]?.text ?? 'var(--text2)',
                          }}>
                            {session.params?.level ?? '—'}
                          </span>
                          <span style={{
                            ...s.metaBadge,
                            background: 'var(--blue-dim)',
                            borderColor: 'rgba(91,141,238,0.25)',
                            color: 'var(--blue)',
                          }}>
                            {session.params?.type ?? '—'}
                          </span>
                          {session.params?.order_by && (
                            <span style={{...s.metaBadge, background: 'var(--bg3)', color: 'var(--text3)', fontSize: 11}}>
                              {session.params.order_by}
                            </span>
                          )}
                          <span style={s.metaDate}>{timeAgo(session.created_at)}</span>
                        </div>
                        {/* Preview toggle */}
                        {itemCount > 0 && (
                          <button
                            className="dash-btn"
                            style={s.previewToggle}
                            onClick={() => toggleCourse(session.id)}
                          >
                            {expanded ? '▲ Hide' : '▼ Preview items'}
                          </button>
                        )}
                        {expanded && itemCount > 0 && (
                          <div style={s.previewWrap}>
                            <SessionPreviewPanel items={session.items} />
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="dash-btn" style={s.continueBtn} onClick={() => onStartSession(session.id)}>
                      Continue
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Pending Regular Session ──────────────────────────────────── */}
        {pendingRegular && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Session Ready</h2>
            </div>
            <div className="dash-card" style={s.sessionCard}>
              <div style={s.sessionLeft}>
                <div style={s.sessionIcon}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.sessionTitle}>Review Session</div>
                  <div style={s.sessionMeta}>
                    <span>{pendingRegular.items?.length ?? 0} items</span>
                    <Dot />
                    <span>{pendingRegular.params?.source ?? 'mixed'}</span>
                    {pendingRegular.params?.level && (
                      <>
                        <Dot />
                        <span>{pendingRegular.params.level}</span>
                      </>
                    )}
                  </div>
                  {/* Preview toggle */}
                  {(pendingRegular.items?.length ?? 0) > 0 && (
                    <button
                      className="dash-btn"
                      style={s.previewToggle}
                      onClick={() => setIsExpandedRegular(v => !v)}
                    >
                      {isExpandedRegular ? '▲ Hide' : '▼ Preview items'}
                    </button>
                  )}
                  {isExpandedRegular && (pendingRegular.items?.length ?? 0) > 0 && (
                    <div style={{ ...s.previewWrap, marginTop: 8 }}>
                      <SessionPreviewPanel items={pendingRegular.items} />
                    </div>
                  )}
                </div>
              </div>
              <button className="dash-btn" style={s.resumeBtn} onClick={() => onStartSession(pendingRegular.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Resume
              </button>
            </div>
          </section>
        )}

        {/* ── Quick Study ──────────────────────────────────────────────── */}
        <section>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Quick Study</h2>
          </div>
          <div style={s.quickGrid}>
            {[
              { src: 'due',  label: 'Review Due',  desc: `${totalDue} cards`,    icon: 'M12 6v6l4 2',                                            accent: 'var(--gold)' },
              { src: 'weak', label: 'Weak Items',  desc: 'Low mastery',           icon: 'M12 9v2m0 4h.01',                                        accent: 'var(--red)'  },
              { src: 'new',  label: 'New Items',   desc: 'Never reviewed',        icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', accent: 'var(--blue)' },
            ].map(btn => (
              <button key={btn.src} className="dash-card dash-btn" style={s.quickBtn} disabled={anyBusy}
                onClick={() => setStudyModal({ source: btn.src })}>
                <div style={{...s.quickIcon, borderColor: btn.accent + '33', color: btn.accent}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={btn.icon}/></svg>
                </div>
                <div style={s.quickLabel}>{btn.label}</div>
                <div style={s.quickDesc}>{btn.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <div style={{height:40}} />
      </main>

      {/* ── Course ordering modal ────────────────────────────────────────── */}
      {modal && (
        <div style={s.overlay} onClick={() => !courseCreating && setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Start Course</div>
            <div style={s.modalSub}>{modal.level} · {modal.type === 'kanji' ? 'Kanji' : 'Kotoba'}</div>
            <div style={s.modalLabel}>Order by</div>
            <div style={s.orderBtns}>
              {(modal.type === 'kanji'
                ? [['radical','By Radical'],['difficulty','By Difficulty'],['level','By Level']]
                : [['difficulty','By Difficulty'],['level','By Level']]
              ).map(([val, label]) => (
                <button key={val} disabled={courseCreating}
                  className="dash-btn" style={{ ...s.orderBtn, ...(orderBy === val ? s.orderBtnActive : {}) }}
                  onClick={() => setOrderBy(val)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="dash-btn" style={s.startBtn} onClick={startCourse} disabled={courseCreating}>
              {courseCreating ? 'Creating…' : 'Start →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Study Preview Modal ────────────────────────────────────── */}
      {studyModal && (
        <StudyPreviewModal
          source={studyModal.source}
          newItemsCount={totalNewApprox}
          onClose={() => setStudyModal(null)}
          onStart={(sessionId) => { setStudyModal(null); onStartSession(sessionId) }}
        />
      )}

      {/* ── Level Drill-Down Modal ───────────────────────────────────────── */}
      {drillDown && (
        <LevelDrillDownModal
          level={drillDown.level}
          initialTab={drillDown.tab}
          onClose={() => setDrillDown(null)}
          onNav={onNav}
          onStartSession={onStartSession}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LevelCard({ level, kanjiData, kotobaData, onStart, anyBusy, onDrillDown }) {
  const kM = kanjiData?.mastered  ?? 0
  const kT = kanjiData?.total     ?? 0
  const vM = kotobaData?.mastered ?? 0
  const vT = kotobaData?.total    ?? 0
  const kDue = kanjiData?.due ?? 0
  const vDue = kotobaData?.due ?? 0
  const totalM = kM + vM
  const totalT = kT + vT
  const loading = kanjiData?.loading ?? kotobaData?.loading

  if (loading) return <SkeletonCard accent={LEVEL_ACCENT[level]} />
  if (kanjiData?.error && kotobaData?.error) return <ErrorCard level={level} />

  return (
    <div className="dash-card" style={s.levelCard}>
      <div style={s.levelTop}>
        <span style={{
          ...s.levelBadge, cursor: 'pointer',
          background: LEVEL_ACCENT[level].bg,
          borderColor: LEVEL_ACCENT[level].border,
          color: LEVEL_ACCENT[level].text,
        }} onClick={() => onDrillDown?.('all')}>{level}</span>
        <div style={s.levelStats}>
          <span style={s.levelRatio}>{totalM}/{totalT}</span>
        </div>
      </div>
      {totalT > 0 && (
        <div style={{ cursor: 'pointer' }} onClick={() => onDrillDown?.('all')} title={`View ${level} item details`}>
          <StackedMasteryBar kanjiData={kanjiData} kotobaData={kotobaData} />
        </div>
      )}
      <div style={s.typeRows}>
        <TypeRow label="Kanji"  data={kanjiData}  onStart={() => onStart('kanji')}  anyBusy={anyBusy}
          onLabelClick={() => onDrillDown?.('kanji')} onDueClick={() => onDrillDown?.('due')} />
        <TypeRow label="Words"  data={kotobaData} onStart={() => onStart('kotoba')} anyBusy={anyBusy}
          onLabelClick={() => onDrillDown?.('kotoba')} onDueClick={() => onDrillDown?.('due')} />
      </div>
    </div>
  )
}

function StackedMasteryBar({ kanjiData, kotobaData }) {
  const kT = kanjiData?.total ?? 0
  const vT = kotobaData?.total ?? 0
  const total = kT + vT
  if (total === 0) return null

  const sum = (field) => (kanjiData?.[field] ?? 0) + (kotobaData?.[field] ?? 0)
  const learning = sum('learningCount')
  const familiar = sum('familiarCount')
  const good     = sum('goodCount')
  const strong   = sum('strongCount')
  const mastered = sum('masteredCount')
  const newCount = Math.max(0, total - learning - familiar - good - strong - mastered)

  const segments = [
    { key: 'new',      count: newCount,  color: '#475569' },
    { key: 'learning', count: learning,  color: '#38bdf8' },
    { key: 'familiar', count: familiar,  color: '#818cf8' },
    { key: 'good',     count: good,      color: '#fbbf24' },
    { key: 'strong',   count: strong,    color: '#34d399' },
    { key: 'mastered', count: mastered,  color: '#4ade80' },
  ]

  const getWidth = (count) => {
    if (count <= 0) return 0
    const raw = (count / total) * 100
    return raw < 2 ? 2 : raw
  }

  const masteryParts = [
    { label: 'learning', count: learning },
    { label: 'familiar', count: familiar },
    { label: 'good',     count: good     },
    { label: 'strong',   count: strong   },
    { label: 'mastered', count: mastered },
  ].filter(p => p.count > 0).map(p => `${p.count} ${p.label}`)

  const summaryParts = [
    kT > 0 ? `${kT} kanji` : null,
    vT > 0 ? `${vT} vocab` : null,
    ...masteryParts,
  ].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ height: 6, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'var(--border)' }}>
        {segments.map(seg => {
          const w = getWidth(seg.count)
          if (w === 0) return null
          return (
            <div key={seg.key} style={{
              width: `${w}%`,
              height: '100%',
              background: seg.color,
              flexShrink: 0,
              transition: 'width 0.5s ease',
            }} />
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
        {summaryParts.join(' · ')}
      </div>
    </div>
  )
}

function TypeRow({ label, data, onStart, anyBusy, onLabelClick, onDueClick }) {
  const loading  = data?.loading  ?? true
  const mastered = data?.mastered ?? 0
  const total    = data?.total    ?? 0
  const due      = data?.due      ?? 0
  const pct      = total > 0 ? Math.min(100, Math.round(mastered / total * 100)) : 0
  const allDone  = !loading && total > 0 && mastered >= total

  return (
    <div style={s.typeRow}>
      <span style={{ ...s.typeLabel, cursor: onLabelClick ? 'pointer' : 'default' }}
        onClick={onLabelClick} title={`View ${label.toLowerCase()} items`}>{label}</span>
      <div style={s.typeBody}>
        {loading ? (
          <div style={{padding: '6px 0'}}>
            <div style={{height:12, width:'70%', borderRadius:4, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
          </div>
        ) : total > 0 ? (
          <>
            <div style={s.typeTop}>
              <span style={s.typeCount}>{mastered}/{total}</span>
              {due > 0 && <span style={{ ...s.typeDue, cursor: 'pointer', textDecoration: 'underline dotted rgba(212,168,67,0.4)' }}
                onClick={onDueClick} title="View due items">{due} due</span>}
              {allDone && <span style={s.typeDone}>✓</span>}
            </div>
            <div style={s.typeBar}>
              <div style={{...s.typeBarFill, width: `${pct}%`, background: allDone ? 'var(--green)' : 'var(--gold)'}} />
            </div>
          </>
        ) : (
          <div style={s.typeEmpty}>Not started</div>
        )}
      </div>
      <div style={s.typeAction}>
        {!loading && total > 0 && !allDone && (
            <button className="dash-btn" style={s.startBtnSmall} onClick={onStart} disabled={anyBusy}>Start</button>
        )}
      </div>
    </div>
  )
}

function SkeletonCard({ accent }) {
  return (
    <div className="dash-card" style={{...s.levelCard, gap: 12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{width:48, height:22, borderRadius:6, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
        <div style={{width:60, height:16, borderRadius:4, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
      </div>
      <div style={{height:4, borderRadius:4, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
      <div style={{height:32, borderRadius:6, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
      <div style={{height:32, borderRadius:6, background:'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)', backgroundSize:'400px 100%', animation:'shimmer 1.5s infinite linear'}} />
    </div>
  )
}

function ErrorCard({ level }) {
  return (
    <div className="dash-card" style={{...s.levelCard, alignItems:'center', padding:'28px 20px', gap: 8}}>
      <span style={{fontSize:24, opacity:0.4}}>⚠</span>
      <span style={{color:'var(--text3)', fontSize:13}}>Could not load {level} data</span>
      <button style={{...s.startBtnSmall, marginTop:4}} onClick={() => window.location.reload()}>Retry</button>
    </div>
  )
}

function Dot() {
  return <span style={{color:'var(--text3)', margin:'0 4px'}}>·</span>
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const N = {
  headerHeight: 56,
  maxWidth: 960,
  cardRadius: 14,
  cardRadius2: 10,
  transition: 'all 0.15s ease',
}

const s = {
  // ── Layout ───────────────────────────────────────────────────────────────
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: N.headerHeight,
    padding: '0 24px',
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoKanji: {
    fontSize: 26,
    color: 'var(--gold)',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 2.5,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    color: 'var(--text2)',
    transition: N.transition,
    cursor: 'pointer',
  },
  dueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(224,92,106,0.1)',
    color: 'var(--red)',
    border: '1px solid rgba(224,92,106,0.25)',
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  main: {
    flex: 1,
    maxWidth: N.maxWidth,
    width: '100%',
    margin: '0 auto',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },

  // ── Section headers ─────────────────────────────────────────────────────
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    background: 'var(--bg3)',
    padding: '2px 10px',
    borderRadius: 10,
  },

  // ── Stats overview ──────────────────────────────────────────────────────
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  statCard: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: N.cardRadius,
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Level grid ──────────────────────────────────────────────────────────
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },

  levelCard: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: N.cardRadius,
    padding: '18px 18px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition: 'border-color 0.15s',
  },
  levelTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 6,
    border: '1px solid',
    lineHeight: 1.4,
  },
  levelStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  levelRatio: {
    fontSize: 12,
    color: 'var(--text2)',
    fontVariantNumeric: 'tabular-nums',
  },

  typeRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    marginTop: 2,
  },
  typeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderTop: '1px solid var(--border)',
  },
  typeLabel: {
    width: 48,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text3)',
    flexShrink: 0,
  },
  typeBody: {
    flex: 1,
    minWidth: 0,
  },
  typeTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  typeCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    fontVariantNumeric: 'tabular-nums',
  },
  typeDue: {
    fontSize: 11,
    color: 'var(--gold)',
    fontWeight: 500,
  },
  typeDone: {
    fontSize: 11,
    color: 'var(--green)',
    fontWeight: 700,
  },
  typeEmpty: {
    fontSize: 11,
    color: 'var(--text3)',
    padding: '4px 0',
  },
  typeBar: {
    height: 3,
    background: 'var(--border)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  typeBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  typeAction: {
    flexShrink: 0,
    marginLeft: 4,
  },
  startBtnSmall: {
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text2)',
    cursor: 'pointer',
    transition: N.transition,
    whiteSpace: 'nowrap',
  },

  // ── Pending courses ─────────────────────────────────────────────────────
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  courseCard: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: N.cardRadius2,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    transition: N.transition,
  },
  courseLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'var(--gold-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  courseInfo: {
    minWidth: 0,
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemCountBadge: {
    fontWeight: 400,
    color: 'var(--text3)',
    fontSize: 13,
  },
  courseMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '1px 8px',
    borderRadius: 4,
    border: '1px solid',
    lineHeight: 1.5,
  },
  metaDate: {
    fontSize: 11,
    color: 'var(--text3)',
    marginLeft: 2,
  },
  previewToggle: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text3)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0 0',
    marginTop: 4,
    textAlign: 'left',
  },
  previewWrap: {
    marginTop: 6,
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
  },
  continueBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: N.transition,
    flexShrink: 0,
  },

  // ── Pending session ─────────────────────────────────────────────────────
  sessionCard: {
    background: 'linear-gradient(135deg, var(--bg2) 0%, rgba(212,168,67,0.04) 100%)',
    border: '1px solid rgba(212,168,67,0.25)',
    borderRadius: N.cardRadius,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sessionLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(212,168,67,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--gold)',
  },
  sessionMeta: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    color: 'var(--text2)',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  resumeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--gold)',
    color: '#000',
    border: 'none',
    borderRadius: 9,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: N.transition,
    flexShrink: 0,
  },

  // ── Quick study ─────────────────────────────────────────────────────────
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  quickBtn: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: N.cardRadius2,
    padding: '18px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    transition: N.transition,
    color: 'var(--text)',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickLabel: {
    fontWeight: 600,
    fontSize: 13,
  },
  quickDesc: {
    color: 'var(--text3)',
    fontSize: 11,
  },

  // ── Course order modal ──────────────────────────────────────────────────
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 20,
  },
  modalBox: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    width: '100%',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 700,
  },
  modalSub: {
    color: 'var(--text2)',
    fontSize: 14,
    marginTop: -8,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  orderBtns: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderBtn: {
    flex: 1,
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 8px',
    fontSize: 13,
    color: 'var(--text)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: N.transition,
  },
  orderBtnActive: {
    borderColor: 'var(--gold)',
    color: 'var(--gold)',
    background: 'var(--gold-dim)',
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
    transition: N.transition,
  },
}
