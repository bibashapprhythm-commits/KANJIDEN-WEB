import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mcp } from '../lib/mcp.js'
import KanjiDetailPanel from '../components/KanjiDetailPanel.jsx'

const FALLBACK_COMPOUNDS = {
  '営': ['営業 (えいぎょう)', '営業中 (えいぎょうちゅう)', '経営 (けいえい)'],
  '定': ['定休日 (ていきゅうび)', '予定 (よてい)', '一定 (いってい)'],
  '業': ['業務 (ぎょうむ)', '営業 (えいぎょう)', '卒業 (そつぎょう)'],
  '確': ['確認 (かくにん)', '確実 (かくじつ)', '明確 (めいかく)'],
  '認': ['確認 (かくにん)', '認識 (にんしき)', '承認 (しょうにん)'],
  '全': ['全員 (ぜんいん)', '全体 (ぜんたい)', '完全 (かんぜん)'],
  '員': ['全員 (ぜんいん)', '店員 (てんいん)', '社員 (しゃいん)'],
  '午': ['午前 (ごぜん)', '午後 (ごご)'],
  '前': ['午前 (ごぜん)', '以前 (いぜん)', '前回 (ぜんかい)'],
  '休': ['休日 (きゅうじつ)', '定休日 (ていきゅうび)', '夏休み (なつやすみ)'],
  '挨': ['挨拶 (あいさつ)'],
  '拶': ['挨拶 (あいさつ)'],
  '朝': ['朝 (あさ)', '朝食 (ちょうしょく)', '今朝 (けさ)'],
  '福': ['福祉 (ふくし)', '幸福 (こうふく)'],
  '橋': ['橋 (はし)', '鉄橋 (てっきょう)'],
}

const MASTERY = {
  0: { color: '#64748b', label: 'new'      },
  1: { color: '#38bdf8', label: 'learning' },
  2: { color: '#818cf8', label: 'familiar' },
  3: { color: '#fbbf24', label: 'good'     },
  4: { color: '#34d399', label: 'strong'   },
  5: { color: '#4ade80', label: 'mastered' },
}

export default function CourseDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [sessions,   setSessions]   = useState([])
  const [sourceText, setSourceText] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [starting,   setStarting]   = useState(null)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const [pendingRes, sourceRes] = await Promise.allSettled([
      mcp.getPendingSession(),
      mcp.getSourceText(id),
    ])
    if (pendingRes.status === 'fulfilled' && pendingRes.value) {
      const all      = pendingRes.value.pending_course_sessions ?? []
      const filtered = all.filter(s => s.source_text_id === id)
      filtered.sort((a, b) => (a.course_phase ?? 0) - (b.course_phase ?? 0))
      setSessions(filtered)
    }
    if (sourceRes.status === 'fulfilled') setSourceText(sourceRes.value)
    setLoading(false)
  }

  function getCompounds(kanjiChar, vocabItems) {
    const fromCourse = vocabItems
      .filter(v => v.value?.includes(kanjiChar))
      .map(v => v.reading ? `${v.value} (${v.reading})` : v.value)
    if (fromCourse.length >= 2) return fromCourse.slice(0, 3)
    return FALLBACK_COMPOUNDS[kanjiChar] ?? []
  }

  if (loading) return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
      </header>
      <div style={s.loadMsg}>Loading course…</div>
    </div>
  )

  const activeSession  = sessions[0]
  const lockedSessions = sessions.slice(1)
  const courseName     = activeSession?.course_title ?? sourceText?.title ?? 'Course'
  const courseDesc     = activeSession?.course_description ?? ''
  const goalContent    = sourceText?.goal_content ?? null

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
          <span style={s.logoKanji} className="jp">漢</span>
          <span style={s.logoText}>KanjiDen</span>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.courseHeader}>
          <h1 style={s.courseTitle} className="jp">{courseName}</h1>
          {courseDesc && <div style={s.courseDesc}>{courseDesc}</div>}
          {activeSession && (
            <div style={s.courseMeta}>
              Phase {activeSession.course_phase} of {activeSession.course_total_phases}
              {(activeSession.items_count ?? 0) > 0 && ` · ${activeSession.items_count} items`}
            </div>
          )}
        </div>

        {/* Original text */}
        <div style={s.goalSection}>
          <div style={s.sectionLabel}>Original text</div>
          {goalContent ? (
            <div style={s.goalText} className="jp">{goalContent}</div>
          ) : (
            <div style={s.goalPlaceholder}>Original text will appear here once saved.</div>
          )}
        </div>

        {/* Active phase */}
        {activeSession && (
          <div style={s.phaseBlock}>
            <div style={s.phaseHeader}>
              <span style={s.phaseLabel}>
                Phase {activeSession.course_phase}
                {activeSession.params?.phase_label ? ` — ${activeSession.params.phase_label}` : ''}
              </span>
              <span style={s.phaseStatusActive}>ACTIVE</span>
            </div>
            <PhaseItems session={activeSession} getCompounds={getCompounds} />
            {(activeSession.items_count ?? 0) > 0 && (
              <button className="dash-btn" style={s.studyBtn}
                onClick={() => { setStarting(activeSession.id); navigate('/session/' + activeSession.id) }}
                disabled={!!starting}>
                {starting === activeSession.id
                  ? 'Loading…'
                  : `Study Phase ${activeSession.course_phase} — ${activeSession.items_count} items`}
              </button>
            )}
          </div>
        )}

        {/* Locked phases */}
        {lockedSessions.map(ls => (
          <div key={ls.id} style={s.phaseBlockLocked}>
            <div style={s.phaseHeader}>
              <span style={s.phaseLabel}>
                Phase {ls.course_phase}
                {ls.params?.phase_label ? ` — ${ls.params.phase_label}` : ''}
              </span>
              <span style={s.phaseStatusLocked}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 3 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Locked
              </span>
            </div>
            <div style={{ opacity: 0.45 }}>
              <PhaseItems session={ls} getCompounds={getCompounds} />
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div style={s.empty}>No pending phases found for this course.</div>
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

function PhaseItems({ session, getCompounds }) {
  const [expandedId, setExpandedId] = useState(null)

  const items    = session.items ?? []
  const kanji    = items.filter(i => i.item_type === 'kanji')
  const vocabAll = items.filter(i => i.item_type === 'kotoba')
  if (items.length === 0) return null

  function getRelatedFromSession(kanjiChar) {
    return vocabAll
      .filter(v => v.value?.includes(kanjiChar))
      .map(v => ({ ...v, reading_hiragana: v.reading, core_meaning: v.meaning }))
  }

  const expandedItem = kanji.find(i => i.id === expandedId) ?? null

  return (
    <div style={s.itemsList}>
      {kanji.length > 0 && (
        <>
          <div style={s.typeHeader}>KANJI</div>
          {kanji.map(item => {
            const on  = (item.onyomi  ?? []).map((k, i) => item.romaji_on?.[i]  ? `${k} (${item.romaji_on[i]})`  : k)
            const kun = (item.kunyomi ?? []).map((k, i) => item.romaji_kun?.[i] ? `${k} (${item.romaji_kun[i]})` : k)
            const compounds = getCompounds(item.value, vocabAll)
            const isExpanded = expandedId === item.id
            return (
              <div key={item.id}>
                <div
                  style={{ ...s.dRow, cursor: 'pointer', ...(isExpanded ? s.dRowExpanded : {}) }}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <span style={s.badgeK}>K</span>
                  <span className="jp" style={s.dChar}>{item.value}</span>
                  <div style={s.dInfo}>
                    <div style={s.dTop}>
                      <span style={s.dMeaning}>{item.meaning}</span>
                      <span style={s.dJlpt}>{item.jlpt_level}</span>
                      <MasteryDot level={item.mastery_level ?? 0} />
                    </div>
                    <div style={s.dReadings}>
                      <span style={s.rlabel}>On:</span>
                      <span className="jp" style={s.rtext}>{on.length  > 0 ? on.join(' · ')  : '—'}</span>
                      <span style={{ ...s.rlabel, marginLeft: 8 }}>Kun:</span>
                      <span className="jp" style={s.rtext}>{kun.length > 0 ? kun.join(' · ') : '—'}</span>
                    </div>
                    {compounds.length > 0 && (
                      <div style={s.compounds}>→ {compounds.join(' · ')}</div>
                    )}
                  </div>
                  <span style={s.expandCaret}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {isExpanded && (
                  <KanjiDetailPanel
                    item={{ ...item, core_meaning: item.meaning }}
                    relatedWords={getRelatedFromSession(item.value)}
                  />
                )}
              </div>
            )
          })}
        </>
      )}
      {vocabAll.length > 0 && (
        <>
          <div style={{ ...s.typeHeader, marginTop: kanji.length > 0 ? 10 : 0 }}>VOCAB</div>
          {vocabAll.map(item => (
            <div key={item.id} style={s.dRow}>
              <span style={s.badgeV}>V</span>
              <span className="jp" style={s.dChar}>{item.value}</span>
              <div style={s.dInfo}>
                <div style={s.dTop}>
                  <span className="jp" style={s.dReading}>{item.reading}</span>
                  {item.romaji && <span style={s.dRomaji}>/ {item.romaji}</span>}
                  <span style={s.dJlpt}>{item.jlpt_level}</span>
                  <MasteryDot level={item.mastery_level ?? 0} />
                </div>
                <div style={s.dMeaning}>{item.meaning}</div>
              </div>
            </div>
          ))}
        </>
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
  loadMsg:    { textAlign: 'center', padding: 60, color: 'var(--text2)' },
  empty:      { textAlign: 'center', color: 'var(--text2)', padding: 40, fontSize: 14 },
  main:       { flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 24 },

  courseHeader: { display: 'flex', flexDirection: 'column', gap: 4 },
  courseTitle:  { fontSize: 22, fontWeight: 700, lineHeight: 1.3 },
  courseDesc:   { fontSize: 13, color: 'var(--text2)', marginTop: 2 },
  courseMeta:   { fontSize: 12, color: 'var(--text3)', marginTop: 4 },

  goalSection:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 },
  sectionLabel:    { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.4 },
  goalText:        { fontSize: 18, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-wrap' },
  goalPlaceholder: { color: 'var(--text3)', fontSize: 13, fontStyle: 'italic' },

  phaseBlock:       { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  phaseBlockLocked: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  phaseHeader:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  phaseLabel:       { fontSize: 14, fontWeight: 700 },
  phaseStatusActive: { fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(78,203,141,0.25)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 },
  phaseStatusLocked: { display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 },

  studyBtn: { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },

  itemsList:  { display: 'flex', flexDirection: 'column' },
  typeHeader: { fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1.4, textTransform: 'uppercase', padding: '6px 0 4px', borderBottom: '1px solid var(--border)' },
  dRow:        { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border)' },
  dRowExpanded: { background: 'rgba(91,141,238,0.04)', borderRadius: '6px 6px 0 0' },
  expandCaret:  { fontSize: 9, color: 'var(--text3)', alignSelf: 'center', flexShrink: 0, marginLeft: 4 },
  badgeK:     { fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(91,141,238,0.15)', color: 'var(--blue)', flexShrink: 0, marginTop: 3, lineHeight: 1.5 },
  badgeV:     { fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(155,114,239,0.15)', color: 'var(--purple)', flexShrink: 0, marginTop: 3, lineHeight: 1.5 },
  dChar:      { fontSize: 22, color: 'var(--gold)', lineHeight: 1, flexShrink: 0, minWidth: 28, marginTop: 2 },
  dInfo:      { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  dTop:       { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dMeaning:   { fontSize: 13, color: 'var(--text)', fontWeight: 500 },
  dReading:   { fontSize: 13 },
  dRomaji:    { fontSize: 11, color: 'var(--text3)' },
  dJlpt:      { fontSize: 10, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 },
  dReadings:  { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rlabel:     { fontSize: 10, fontWeight: 700, color: 'var(--text3)', minWidth: 22 },
  rtext:      { fontSize: 12, color: 'var(--text2)' },
  compounds:  { fontSize: 11, color: 'var(--text3)' },
}
