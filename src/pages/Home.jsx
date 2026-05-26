import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'
import LevelDrillDownModal from '../components/LevelDrillDownModal.jsx'

export default function Home() {
  const navigate = useNavigate()
  const [progressData,          setProgressData]          = useState(null)
  const [contentCourseGroups,   setContentCourseGroups]   = useState({})
  const [genericCourseSessions, setGenericCourseSessions] = useState([])
  const [pendingRegular,        setPendingRegular]        = useState(null)
  const [drillDown,             setDrillDown]             = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const prog = await mcp.getProgress({})
      setProgressData(prog)
    } catch {}

    try {
      const pending = await mcp.getPendingSession()
      if (pending) {
        setPendingRegular(pending.pending_regular_session ?? null)
        const courses        = pending.pending_course_sessions ?? []
        const contentSessions = courses.filter(s => s.source_text_id !== null)
        const genericSessions  = courses.filter(s => s.source_text_id === null)
        const groups = {}
        for (const s of contentSessions) {
          if (!groups[s.source_text_id]) groups[s.source_text_id] = []
          groups[s.source_text_id].push(s)
        }
        Object.values(groups).forEach(g =>
          g.sort((a, b) => (a.course_phase ?? 0) - (b.course_phase ?? 0))
        )
        setContentCourseGroups(groups)
        setGenericCourseSessions(genericSessions)
      }
    } catch {}
  }

  const totalItems    = progressData?.overall?.total     ?? 0
  const totalMastered = progressData?.overall?.mastered  ?? 0
  const totalDue      = progressData?.overall?.due_today ?? 0
  const streak        = progressData?.overall?.streak    ?? 0
  const byJlpt        = progressData?.by_jlpt            ?? {}

  const contentGroupList  = Object.values(contentCourseGroups)
  const hasActiveCourses  = contentGroupList.length > 0 || genericCourseSessions.length > 0 || !!pendingRegular
  const activeCourseCount = contentGroupList.length + genericCourseSessions.length + (pendingRegular ? 1 : 0)

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
        <div style={s.headerRight}>
          {totalDue > 0 && (
            <div style={s.dueBadge} onClick={() => navigate('/due')} role="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {totalDue} due
            </div>
          )}
          <button className="dash-btn" style={s.navBtn} onClick={() => navigate('/levels')}>Levels</button>
          <button className="dash-btn" style={s.navBtn} onClick={() => navigate('/browse')}>Browse</button>
        </div>
      </header>

      <main style={s.main}>

        {/* ── Section A: Active Courses ─────────────────────────────────── */}
        {hasActiveCourses && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Active Courses</h2>
              <span style={s.sectionCount}>{activeCourseCount}</span>
            </div>
            <div style={s.pendingList}>
              {contentGroupList.map(group => (
                <ContentCourseCard
                  key={group[0].source_text_id}
                  sessions={group}
                  onView={() => navigate('/courses/' + group[0].source_text_id)}
                />
              ))}
              {genericCourseSessions.map(session => (
                <GenericCourseCard
                  key={session.id}
                  session={session}
                  onView={() => navigate('/session/' + session.id)}
                />
              ))}
              {pendingRegular && (
                <RegularSessionCard
                  session={pendingRegular}
                  onResume={() => navigate('/session/' + pendingRegular.id)}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Section B: Due Today ──────────────────────────────────────── */}
        {progressData && totalDue > 0 && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Due Today</h2>
            </div>
            <DueTodayCard
              total={totalDue}
              kanjiDue={progressData?.kanji?.due_today  ?? 0}
              vocabDue={progressData?.kotoba?.due_today ?? 0}
              byJlpt={byJlpt}
              onSeeAll={() => navigate('/due')}
            />
          </section>
        )}

        {/* ── Section C: Quick Stats ────────────────────────────────────── */}
        {progressData && (
          <section>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Quick Stats</h2>
            </div>
            <div className="dash-card" style={s.statsCard}>
              <div style={s.statsRow}>
                <div style={s.stat}>
                  <span style={s.statNum}>{totalItems}</span>
                  <span style={s.statLbl}>studying</span>
                </div>
                <span style={s.dot}>·</span>
                <div style={s.stat}>
                  <span style={s.statNum}>{totalMastered}</span>
                  <span style={s.statLbl}>mastered</span>
                </div>
                {streak > 0 && (
                  <>
                    <span style={s.dot}>·</span>
                    <div style={s.stat}>
                      <span style={s.statNum}>{streak}</span>
                      <span style={s.statLbl}>day streak</span>
                    </div>
                  </>
                )}
              </div>
              <div style={s.exploreRow}>
                <span style={s.exploreLbl}>Explore by topic →</span>
                {[['directions','Directions'],['numbers','Numbers'],['time','Time'],['body','Body parts']].map(([tag, label]) => (
                  <button key={tag} style={s.exploreChip} onClick={() => navigate(`/browse?cluster=${tag}`)}>
                    {label}
                  </button>
                ))}
              </div>
              <button className="dash-btn" style={s.progressLink} onClick={() => navigate('/progress')}>
                Full progress →
              </button>
            </div>
          </section>
        )}

        <div style={{ height: 40 }} />
      </main>

      {drillDown && (
        <LevelDrillDownModal
          level={drillDown.level}
          initialTab={drillDown.tab}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DueTodayCard({ total, kanjiDue, vocabDue, byJlpt, onSeeAll }) {
  const jlptParts = ['N5', 'N4', 'N3', 'N2', 'N1']
    .filter(l => (byJlpt[l]?.due_today ?? 0) > 0)
    .map(l => `${l}: ${byJlpt[l].due_today}`)
    .join('  ')

  return (
    <div className="dash-card" style={s.dueCard}>
      <div style={s.dueLeft}>
        <div style={s.dueTitleRow}>
          <span style={s.dueTitle}>Due Today</span>
          <span style={{ ...s.dueTotal, color: total > 0 ? 'var(--gold)' : 'var(--text2)' }}>{total} items</span>
        </div>
        <div style={s.dueMeta}>
          {kanjiDue > 0 && `${kanjiDue} kanji`}
          {kanjiDue > 0 && vocabDue > 0 && ' · '}
          {vocabDue > 0 && `${vocabDue} vocab`}
          {jlptParts && <span style={{ marginLeft: 10, color: 'var(--text3)' }}>{jlptParts}</span>}
        </div>
      </div>
      <button className="dash-btn" style={s.seeAllBtn} onClick={onSeeAll}>
        See what's due →
      </button>
    </div>
  )
}

function ContentCourseCard({ sessions, onView }) {
  const active      = sessions[0]
  const lockedCount = sessions.length - 1

  return (
    <div className="dash-card" style={s.courseCard}>
      <div style={s.courseLeft}>
        <div style={{ ...s.courseIcon, background: 'rgba(91,141,238,0.12)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div style={s.courseInfo}>
          <div style={s.courseName} className="jp">{active.course_title ?? 'Content Course'}</div>
          {active.course_description && (
            <div style={s.courseDesc}>{active.course_description}</div>
          )}
          <div style={s.courseMeta}>
            {(active.course_total_phases ?? 1) > 1 && (
              <span style={s.phaseBadge}>Phase {active.course_phase} of {active.course_total_phases}</span>
            )}
            {(active.items_count ?? 0) > 0 && (
              <span style={s.metaDetail}>{active.items_count} items</span>
            )}
            {(active.items_due ?? 0) > 0 && (
              <span style={{ ...s.metaDetail, color: 'var(--gold)' }}>{active.items_due} due</span>
            )}
          </div>
        </div>
      </div>
      <button className="dash-btn" style={s.viewBtn} onClick={onView}>
        View Course →
      </button>
    </div>
  )
}

function GenericCourseCard({ session, onView }) {
  const itemCount = session.items_count ?? session.items?.length ?? 0
  return (
    <div className="dash-card" style={s.courseCard}>
      <div style={s.courseLeft}>
        <div style={s.courseIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div style={s.courseInfo}>
          <div style={s.courseName}>{session.params?.course_name ?? 'Course'}</div>
          <div style={s.courseMeta}>
            {itemCount > 0 && <span style={s.metaDetail}>{itemCount} items</span>}
            <span style={s.metaDate}>{timeAgo(session.created_at)}</span>
          </div>
        </div>
      </div>
      <button className="dash-btn" style={s.viewBtn} onClick={onView}>
        View Session →
      </button>
    </div>
  )
}

function RegularSessionCard({ session, onResume }) {
  const itemCount = session.items?.length ?? 0
  return (
    <div className="dash-card" style={s.courseCard}>
      <div style={s.courseLeft}>
        <div style={{ ...s.courseIcon, background: 'rgba(212,168,67,0.12)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div style={s.courseInfo}>
          <div style={s.courseName}>Review Session</div>
          <div style={s.courseMeta}>
            {itemCount > 0 && <span style={s.metaDetail}>{itemCount} items</span>}
            {session.params?.source && <span style={s.metaDetail}>{session.params.source}</span>}
          </div>
        </div>
      </div>
      <button className="dash-btn" style={s.resumeBtn} onClick={onResume}>
        Resume →
      </button>
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  page:       { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 24px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logoKanji:  { fontSize: 26, color: 'var(--gold)', lineHeight: 1 },
  logoText:   { fontSize: 16, fontWeight: 600, letterSpacing: 2.5 },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 8 },
  navBtn:     { background: 'transparent', border: '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' },
  dueBadge:   { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(224,92,106,0.1)', color: 'var(--red)', border: '1px solid rgba(224,92,106,0.25)', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  main:          { flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 28 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.4 },
  sectionCount:  { fontSize: 12, fontWeight: 600, color: 'var(--text2)', background: 'var(--bg3)', padding: '2px 10px', borderRadius: 10 },

  pendingList: { display: 'flex', flexDirection: 'column', gap: 8 },
  courseCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  courseLeft:  { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 },
  courseIcon:  { width: 38, height: 38, borderRadius: 10, background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  courseInfo:  { minWidth: 0, flex: 1 },
  courseName:  { fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  courseDesc:  { fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  courseMeta:  { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  phaseBadge:  { fontSize: 11, fontWeight: 600, padding: '1px 7px', background: 'var(--blue-dim)', border: '1px solid rgba(91,141,238,0.25)', color: 'var(--blue)', borderRadius: 4 },
  metaDetail:  { fontSize: 12, color: 'var(--text3)' },
  metaDate:    { fontSize: 11, color: 'var(--text3)' },

  viewBtn:   { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  resumeBtn: { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },

  dueCard:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dueLeft:    { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
  dueTitleRow:{ display: 'flex', alignItems: 'center', gap: 10 },
  dueTitle:   { fontSize: 14, fontWeight: 600 },
  dueTotal:   { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  dueMeta:    { fontSize: 12, color: 'var(--text2)' },
  seeAllBtn:  { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },

  statsCard:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  statsRow:     { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stat:         { display: 'flex', alignItems: 'baseline', gap: 4 },
  statNum:      { fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  statLbl:      { fontSize: 13, color: 'var(--text2)' },
  dot:          { color: 'var(--text3)', fontSize: 16 },
  progressLink: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' },
  exploreRow:  { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' },
  exploreLbl:  { fontSize: 12, color: 'var(--text3)', flexShrink: 0 },
  exploreChip: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontWeight: 500 },
}
