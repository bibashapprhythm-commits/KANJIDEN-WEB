import { useState, useEffect, useRef } from 'react'
import { mcp } from '../lib/mcp.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHASES = { LOADING: 'loading', READING: 'reading', QUIZ: 'quiz', RESULTS: 'results' }

// Adaptive font size: kanji always large, kotoba scales with char count
function displaySize(isKanji, value) {
  if (isKanji) return 120
  const len = value?.length ?? 1
  if (len <= 2) return 72
  if (len <= 4) return 52
  return 40
}

function pickQuestionType(item) {
  const perf = item.perf_by_type ?? {}
  const type = item.item_type

  const available = type === 'kanji'
    ? ['meaning', 'onyomi', 'kunyomi', 'reading']
    : ['meaning', 'reading']

  let worst = 'meaning', worstRatio = 1
  for (const t of available) {
    const p = perf[t]
    if (!p) continue
    const total = p.correct + p.wrong
    if (total < 2) continue
    const ratio = p.correct / total
    if (ratio < worstRatio) { worstRatio = ratio; worst = t }
  }
  return worst
}

function buildQuestion(item, allItems) {
  const qType = pickQuestionType(item)

  let question = '', correct = ''
  if (qType === 'meaning') {
    question = `What does ${item.value} mean?`
    correct  = item.meaning
  } else if (qType === 'onyomi') {
    question = `What is the on-yomi (音読み) of ${item.value}?`
    correct  = item.onyomi?.[0] ?? item.meaning
  } else if (qType === 'kunyomi') {
    question = `What is the kun-yomi (訓読み) of ${item.value}?`
    correct  = item.kunyomi?.[0] ?? item.meaning
  } else if (qType === 'reading') {
    question = `How do you read ${item.value}?`
    correct = item.item_type === 'kanji'
      ? (item.romaji_on?.[0] ?? item.romaji_kun?.[0] ?? item.meaning)
      : item.romaji
  }

  const others  = allItems.filter(i => i.id !== item.id)
  const shuffle = arr => arr.sort(() => Math.random() - 0.5)
  let wrongs = []

  if (qType === 'meaning') {
    wrongs = shuffle(others).slice(0, 3).map(i => i.meaning)
  } else if (qType === 'onyomi') {
    wrongs = shuffle(others.filter(i => i.onyomi?.length)).slice(0, 3).map(i => i.onyomi?.[0] ?? i.meaning)
  } else if (qType === 'kunyomi') {
    wrongs = shuffle(others.filter(i => i.kunyomi?.length)).slice(0, 3).map(i => i.kunyomi?.[0] ?? i.meaning)
  } else if (qType === 'reading') {
    wrongs = shuffle(others).slice(0, 3).map(i =>
      i.item_type === 'kanji' ? (i.romaji_on?.[0] ?? i.romaji_kun?.[0] ?? i.meaning) : (i.romaji ?? i.meaning)
    )
  }

  while (wrongs.length < 3) wrongs.push('—')

  const options = shuffle([correct, ...wrongs.slice(0, 3)])

  return { question, correct, options, qType }
}

// ── ReadingCard ───────────────────────────────────────────────────────────────
function ReadingCard({ item, index, total, onNext, onPrev, onStart }) {
  const isKanji = item.item_type === 'kanji'
  const display = item.value
  const fs = displaySize(isKanji, display)

  return (
    <div style={s.phase} className="phase-enter">
      <div style={s.phaseHeader}>
        <span style={s.phaseTag}>Study · {isKanji ? 'Kanji' : 'Kotoba'}</span>
        <span style={s.cardNum}>{index + 1} / {total}</span>
      </div>

      <div style={s.readCard}>
        <div style={{ ...s.readKanji, fontSize: fs }} className="jp">{display}</div>

        <div style={s.readDivider} />

        {isKanji && item.onyomi?.length > 0 && (
          <div style={s.readRow}>
            <span style={s.tag}>音</span>
            <span className="jp" style={s.kana}>{item.onyomi.join('・')}</span>
            {item.romaji_on?.length > 0 && (
              <span style={s.romaji}>({item.romaji_on.join(', ')})</span>
            )}
          </div>
        )}
        {isKanji && item.kunyomi?.length > 0 && (
          <div style={s.readRow}>
            <span style={{ ...s.tag, background: 'var(--blue-dim)', color: 'var(--blue)' }}>訓</span>
            <span className="jp" style={s.kana}>{item.kunyomi.join('・')}</span>
            {item.romaji_kun?.length > 0 && (
              <span style={s.romaji}>({item.romaji_kun.join(', ')})</span>
            )}
          </div>
        )}
        {!isKanji && (
          <div style={s.readRow}>
            <span className="jp" style={s.kana}>{item.reading}</span>
            <span style={s.romaji}>/ {item.romaji}</span>
          </div>
        )}

        <div style={s.meaning}>{item.meaning}</div>

        {item.jlpt_level && item.jlpt_level !== 'unknown' && (
          <div style={s.tags}>
            <span style={s.jlptTag}>{item.jlpt_level}</span>
          </div>
        )}
      </div>

      <div style={s.readNav}>
        <button className="nav-btn-el" style={s.navBtn} onClick={onPrev} disabled={index === 0}>
          ← Prev
        </button>
        {index < total - 1
          ? <button className="nav-btn-el" style={s.navBtn} onClick={onNext}>Next →</button>
          : <button style={s.startBtn} onClick={onStart}>Begin Flashcards →</button>
        }
      </div>
    </div>
  )
}

// ── QuizCard ──────────────────────────────────────────────────────────────────
function QuizCard({ item, sessionId, allItems, onAnswer, cardNum, total }) {
  const [selected, setSelected]   = useState(null)
  const [revealed, setRevealed]   = useState(false)
  const [rating, setRating]       = useState(null)
  const startTime                 = useRef(Date.now())
  const { question, correct, options, qType } = buildQuestion(item, allItems)
  const isKanji = item.item_type === 'kanji'
  const display = item.value
  const fs = displaySize(isKanji, display)

  function handlePick(opt) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
  }

  async function handleRate(r) {
    setRating(r)
    const ms = Date.now() - startTime.current
    await mcp.processQuizAnswer({
      session_id:     sessionId,
      item_type:      item.item_type,
      item_id:        item.id,
      correct:        selected === correct,
      rating:         r,
      question_type:  qType,
      user_answer:    selected,
      correct_answer: correct,
      response_ms:    ms,
    })
    onAnswer({ item, selected, correct, rating: r, correct: selected === correct })
  }

  return (
    <div style={s.phase} className="phase-enter">
      <div style={s.phaseHeader}>
        <span style={s.phaseTag}>Flashcard</span>
        <span style={s.cardNum}>{cardNum} / {total}</span>
      </div>

      <div style={s.quizCard}>
        <div style={{ ...s.quizKanji, fontSize: fs }} className="jp">{display}</div>
        <div style={s.quizQ}>{question}</div>

        {!revealed ? (
          <div style={s.options}>
            {options.map(opt => (
              <button key={opt} className="opt-btn" style={s.option} onClick={() => handlePick(opt)}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div style={s.options}>
              {options.map(opt => {
                let bg = 'var(--bg3)', border = 'var(--border)', color = 'var(--text)'
                if (opt === correct) { bg = 'var(--green-dim)'; border = 'var(--green)'; color = 'var(--green)' }
                else if (opt === selected && opt !== correct) { bg = 'var(--red-dim)'; border = 'var(--red)'; color = 'var(--red)' }
                return (
                  <div key={opt} style={{ ...s.option, background: bg, borderColor: border, color, cursor: 'default' }}>
                    {opt}
                    {opt === correct && ' ✓'}
                    {opt === selected && opt !== correct && ' ✗'}
                  </div>
                )
              })}
            </div>

            {/* Full card reveal */}
            <div style={s.reveal}>
              <div style={{ ...s.revealKanji, fontSize: Math.round(fs * 0.55) }} className="jp">{display}</div>
              {isKanji && item.onyomi?.length > 0 && (
                <div style={s.readRow}>
                  <span style={s.tag}>音</span>
                  <span className="jp" style={s.kana}>{item.onyomi.join('・')}</span>
                  {item.romaji_on?.length > 0 && <span style={s.romaji}>({item.romaji_on.join(', ')})</span>}
                </div>
              )}
              {isKanji && item.kunyomi?.length > 0 && (
                <div style={s.readRow}>
                  <span style={{ ...s.tag, background: 'var(--blue-dim)', color: 'var(--blue)' }}>訓</span>
                  <span className="jp" style={s.kana}>{item.kunyomi.join('・')}</span>
                  {item.romaji_kun?.length > 0 && <span style={s.romaji}>({item.romaji_kun.join(', ')})</span>}
                </div>
              )}
              {!isKanji && (
                <div style={s.readRow}>
                  <span className="jp" style={s.kana}>{item.reading}</span>
                  <span style={s.romaji}>/ {item.romaji}</span>
                </div>
              )}
              <div style={s.revealMeaning}>{item.meaning}</div>
            </div>

            {/* Self-grading */}
            {!rating ? (
              <div style={s.ratings}>
                <div style={s.ratingsLabel}>How did it feel?</div>
                <div style={s.ratingRow}>
                  {[
                    { r: 'again', label: 'Again', color: '#e05c6a', desc: 'Forgot' },
                    { r: 'hard',  label: 'Hard',  color: '#d4a843', desc: 'Struggled' },
                    { r: 'good',  label: 'Good',  color: '#5b8dee', desc: 'Got it' },
                    { r: 'easy',  label: 'Easy',  color: '#4ecb8d', desc: 'Too easy' },
                  ].map(({ r, label, color, desc }) => (
                    <button key={r} className="rate-btn" style={{ ...s.ratingBtn, borderColor: color, color }}
                      onClick={() => handleRate(r)}>
                      <span style={s.ratingLabel}>{label}</span>
                      <span style={{ ...s.ratingDesc, color: color + 'aa' }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={s.ratedMsg}>
                Rated <strong>{rating}</strong> — next card loading…
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({ answers, onStudyAgain, onHome }) {
  const correct = answers.filter(a => a.correct).length
  const total   = answers.length
  const pct     = Math.round((correct / total) * 100)
  const wrong   = answers.filter(a => !a.correct)

  const verdict =
    pct >= 90 ? 'Excellent session' :
    pct >= 75 ? 'Good progress' :
    pct >= 55 ? 'Keep at it' :
    'More practice needed'

  return (
    <div style={s.phase} className="phase-enter">
      <div style={s.resultsHeader}>
        <div style={s.resultsBig}>{pct}%</div>
        <div style={s.resultsScore}>{correct} / {total} correct</div>
        <div style={s.resultsSub}>{verdict}</div>
      </div>

      {wrong.length > 0 && (
        <div style={s.wrongList}>
          <div style={s.sectionLabel}>Review these again</div>
          {wrong.map((a, i) => (
            <div key={i} style={{
              ...s.wrongItem,
              borderBottom: i < wrong.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={s.wrongKanji} className="jp">{a.item.value}</span>
              <div style={s.wrongInfo}>
                <div style={s.wrongMeaning}>{a.item.meaning}</div>
                {a.item.reading && (
                  <div style={s.wrongReading} className="jp">{a.item.reading}</div>
                )}
              </div>
              <span style={s.wrongRating}>{a.rating}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.resultActions}>
        <button style={s.startBtn} onClick={onStudyAgain}>Study Again</button>
        <button className="nav-btn-el" style={s.navBtn} onClick={onHome}>← Home</button>
      </div>
    </div>
  )
}

// ── Main Session Page ─────────────────────────────────────────────────────────
export default function Session({ sessionId, onBack }) {
  const [phase, setPhase]     = useState(PHASES.LOADING)
  const [session, setSession] = useState(null)
  const [items, setItems]     = useState([])
  const [readIdx, setReadIdx] = useState(0)
  const [quizIdx, setQuizIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const completedRef          = useRef(false)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  async function loadSession() {
    setPhase(PHASES.LOADING)
    try {
      const data = sessionId
        ? await mcp.getSession(sessionId)
        : await mcp.getPendingSession()
      if (!data) { onBack(); return }
      setSession(data)
      setItems(data.items ?? [])
      setPhase(PHASES.READING)
    } catch {
      onBack()
    }
  }

  function handleAnswer(result) {
    const newAnswers = [...answers, result]
    setAnswers(newAnswers)
    if (quizIdx < items.length - 1) {
      setTimeout(() => setQuizIdx(q => q + 1), 600)
    } else {
      setTimeout(async () => {
        if (completedRef.current) { setPhase(PHASES.RESULTS); return }
        completedRef.current = true
        const correct = newAnswers.filter(a => a.correct).length
        await mcp.completeSession({
          session_id:    session.id,
          marks_percent: Math.round((correct / newAnswers.length) * 100),
        })
        setPhase(PHASES.RESULTS)
      }, 800)
    }
  }

  if (phase === PHASES.LOADING) {
    return (
      <div style={s.fullCenter}>
        <div style={s.loadingText}>Loading session…</div>
      </div>
    )
  }

  const progress = phase === PHASES.QUIZ
    ? Math.round((quizIdx / items.length) * 100)
    : phase === PHASES.RESULTS ? 100 : 0

  return (
    <div style={s.sessionPage}>
      {/* Top bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div style={s.topBarTitle} className="jp">漢字Den</div>
        <div style={s.topBarMeta}>
          {phase === PHASES.QUIZ && (
            <span style={s.topBarCount}>{quizIdx + 1}/{items.length}</span>
          )}
          <span style={s.topBarPhase}>{phase}</span>
        </div>
      </div>

      {/* Progress bar — visible during quiz and results */}
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      <div style={s.sessionMain}>
        {phase === PHASES.READING && items[readIdx] && (
          <ReadingCard
            key={readIdx}
            item={items[readIdx]}
            index={readIdx}
            total={items.length}
            onNext={() => setReadIdx(i => i + 1)}
            onPrev={() => setReadIdx(i => i - 1)}
            onStart={() => { setPhase(PHASES.QUIZ); setQuizIdx(0) }}
          />
        )}

        {phase === PHASES.QUIZ && items[quizIdx] && (
          <QuizCard
            key={items[quizIdx].id + quizIdx}
            item={items[quizIdx]}
            sessionId={session?.id}
            allItems={items}
            onAnswer={handleAnswer}
            cardNum={quizIdx + 1}
            total={items.length}
          />
        )}

        {phase === PHASES.RESULTS && (
          <Results
            answers={answers}
            onStudyAgain={() => {
              completedRef.current = false
              setPhase(PHASES.READING)
              setReadIdx(0)
              setQuizIdx(0)
              setAnswers([])
            }}
            onHome={onBack}
          />
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  sessionPage:  { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },

  // Top bar
  topBar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 },
  backBtn:     { background: 'none', color: 'var(--text2)', fontSize: 13, padding: '6px 0', letterSpacing: 0.2 },
  topBarTitle: { fontSize: 15, color: 'var(--gold)', fontWeight: 700, letterSpacing: 3 },
  topBarMeta:  { display: 'flex', alignItems: 'center', gap: 10 },
  topBarCount: { fontSize: 13, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' },
  topBarPhase: { fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2 },

  // Progress bar
  progressTrack: { height: 4, background: 'var(--border)' },
  progressFill:  { height: '100%', background: 'var(--gold)', transition: 'width .5s ease', boxShadow: '0 0 10px rgba(212,168,67,0.5)' },

  sessionMain: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 52px' },
  fullCenter:  { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'var(--text2)', fontSize: 15 },

  // Phase shell — wider, more breathing room
  phase:      { width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 28 },
  phaseHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  phaseTag:   { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2 },
  cardNum:    { fontSize: 13, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' },

  // ── Reading card ────────────────────────────────────────────────────────────
  readCard:   { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '52px 40px 44px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' },
  readKanji:  { color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 60px rgba(212,168,67,0.3)', marginBottom: 8 },
  readDivider:{ width: 40, height: 1, background: 'var(--border2)', margin: '4px 0 8px' },
  readRow:    { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 },
  tag:        { background: 'var(--gold-dim)', color: 'var(--gold)', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, flexShrink: 0, letterSpacing: 0.3 },
  kana:       { fontSize: 17 },
  romaji:     { color: 'var(--text3)', fontSize: 13 },
  meaning:    { fontSize: 21, fontWeight: 600, color: 'var(--text)', marginTop: 10, lineHeight: 1.45 },
  tags:       { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  jlptTag:    { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(224,92,106,0.3)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  readNav:    { display: 'flex', gap: 10, justifyContent: 'space-between' },

  // ── Quiz card ────────────────────────────────────────────────────────────────
  quizCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 28px 40px', display: 'flex', flexDirection: 'column', gap: 24 },
  quizKanji: { color: 'var(--gold)', textAlign: 'center', lineHeight: 1, textShadow: '0 0 50px rgba(212,168,67,0.28)', marginBottom: 4 },
  quizQ:     { textAlign: 'center', color: 'var(--text2)', fontSize: 16, lineHeight: 1.5 },

  // Options — larger touch targets
  options:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  option:    { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 12px', fontSize: 15, fontWeight: 500, color: 'var(--text)', textAlign: 'center', minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.4, transition: 'border-color .15s, background .15s' },

  // Reveal panel
  reveal:        { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  revealKanji:   { color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 30px rgba(212,168,67,0.25)', marginBottom: 4 },
  revealMeaning: { fontSize: 17, fontWeight: 600, color: 'var(--text)', marginTop: 4 },

  // Self-grading controls
  ratings:      { display: 'flex', flexDirection: 'column', gap: 10 },
  ratingsLabel: { fontSize: 11, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 },
  ratingRow:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 },
  ratingBtn:    { background: 'var(--bg3)', border: '1px solid', borderRadius: 12, padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 68, justifyContent: 'center', transition: 'all .12s' },
  ratingLabel:  { fontWeight: 700, fontSize: 14 },
  ratingDesc:   { fontSize: 11 },
  ratedMsg:     { textAlign: 'center', color: 'var(--text2)', fontSize: 14, padding: '8px 0' },

  // ── Results ──────────────────────────────────────────────────────────────────
  resultsHeader: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 },
  resultsBig:    { fontSize: 80, fontWeight: 700, color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 40px rgba(212,168,67,0.3)' },
  resultsScore:  { fontSize: 18, fontWeight: 500, color: 'var(--text)' },
  resultsSub:    { fontSize: 14, color: 'var(--text2)' },

  wrongList:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', flexDirection: 'column' },
  sectionLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  wrongItem:    { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' },
  wrongKanji:   { fontSize: 30, color: 'var(--red)', minWidth: 44, textAlign: 'center', lineHeight: 1 },
  wrongInfo:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  wrongMeaning: { color: 'var(--text)', fontSize: 14 },
  wrongReading: { color: 'var(--text2)', fontSize: 13 },
  wrongRating:  { color: 'var(--text2)', fontSize: 12, background: 'var(--bg3)', padding: '3px 10px', borderRadius: 6, flexShrink: 0 },

  resultActions: { display: 'flex', flexDirection: 'column', gap: 10 },

  // ── Shared buttons ────────────────────────────────────────────────────────────
  navBtn:   { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '13px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, transition: 'border-color .15s' },
  startBtn: { background: 'var(--gold)', color: '#000', border: 'none', padding: '16px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, width: '100%', letterSpacing: 0.3 },
}
