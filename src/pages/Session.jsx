import { useState, useEffect, useRef } from 'react'
import { mcp } from '../lib/mcp.js'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHASES = { LOADING: 'loading', READING: 'reading', QUIZ: 'quiz', RESULTS: 'results' }

function pickQuestionType(item) {
  const perf = item.perf_by_type ?? {}
  const type = item.item_type

  // Available types per item type
  const available = type === 'kanji'
    ? ['meaning', 'onyomi', 'kunyomi', 'reading']
    : ['meaning', 'reading']

  // Pick weakest type with enough data, otherwise pick meaning
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

  // Build question text and correct answer
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

  // Build 3 wrong options from other items
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
      i.item_type === 'kanji' ? (i.romaji_on?.[0] ?? i.meaning) : (i.romaji ?? i.meaning)
    )
  }

  // Pad wrongs if not enough
  while (wrongs.length < 3) wrongs.push('—')

  const options = shuffle([correct, ...wrongs.slice(0, 3)])

  return { question, correct, options, qType }
}

// ── Components ────────────────────────────────────────────────────────────────

function ReadingCard({ item, index, total, onNext, onPrev, onStart }) {
  const isKanji = item.item_type === 'kanji'
  const display = item.value

  return (
    <div style={s.phase}>
      <div style={s.phaseHeader}>
        <span style={s.phaseTag}>Reading</span>
        <span style={s.cardNum}>{index + 1} / {total}</span>
      </div>

      <div style={s.readCard}>
        <div style={s.readKanji} className="jp">{display}</div>

        {isKanji && item.onyomi?.length > 0 && (
          <div style={s.readRow}>
            <span style={s.tag}>音</span>
            <span style={s.jp}>{item.onyomi.join('・')}</span>
            <span style={s.romaji}>({item.romaji_on?.join(', ')})</span>
          </div>
        )}
        {isKanji && item.kunyomi?.length > 0 && (
          <div style={s.readRow}>
            <span style={{...s.tag, background:'var(--blue-dim)', color:'var(--blue)'}}>訓</span>
            <span style={s.jp}>{item.kunyomi.join('・')}</span>
            <span style={s.romaji}>({item.romaji_kun?.join(', ')})</span>
          </div>
        )}
        {!isKanji && (
          <div style={s.readRow}>
            <span style={s.jp}>{item.reading}</span>
            <span style={s.romaji}>/ {item.romaji}</span>
          </div>
        )}

        <div style={s.meaning}>{item.meaning}</div>

        <div style={s.tags}>
          {item.jlpt_level && item.jlpt_level !== 'unknown' && (
            <span style={s.jlptTag}>{item.jlpt_level}</span>
          )}
          {item.exam_important  && <span style={s.tagPill}>📝 exam</span>}
          {item.daily_important && <span style={s.tagPill}>🗣️ daily</span>}
          {item.seen_in_texts > 1 && (
            <span style={s.tagPill}>seen {item.seen_in_texts}×</span>
          )}
        </div>
      </div>

      <div style={s.readNav}>
        <button style={s.navBtn} onClick={onPrev} disabled={index === 0}>← Prev</button>
        {index < total - 1
          ? <button style={s.navBtn} onClick={onNext}>Next →</button>
          : <button style={s.startBtn} onClick={onStart}>Start Flashcards →</button>
        }
      </div>
    </div>
  )
}

function QuizCard({ item, sessionId, allItems, onAnswer, cardNum, total }) {
  const [selected, setSelected]   = useState(null)
  const [revealed, setRevealed]   = useState(false)
  const [rating, setRating]       = useState(null)
  const startTime                 = useRef(Date.now())
  const { question, correct, options, qType } = buildQuestion(item, allItems)
  const isKanji = item.item_type === 'kanji'
  const display = item.value

  function handlePick(opt) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
  }

  async function handleRate(r) {
    setRating(r)
    const ms = Date.now() - startTime.current
    await mcp.processQuizAnswer({
      session_id:    sessionId,
      item_type:     item.item_type,
      item_id:       item.id,
      correct:       selected === correct,
      rating:        r,
      question_type: qType,
      user_answer:   selected,
      correct_answer: correct,
      response_ms:   ms,
    })
    onAnswer({ item, selected, correct, rating: r, correct: selected === correct })
  }

  const isCorrect = selected === correct

  return (
    <div style={s.phase}>
      <div style={s.phaseHeader}>
        <span style={s.phaseTag}>Flashcard</span>
        <span style={s.cardNum}>{cardNum} / {total}</span>
      </div>

      <div style={s.quizCard}>
        <div style={s.quizKanji} className="jp">{display}</div>
        <div style={s.quizQ}>{question}</div>

        {!revealed ? (
          <div style={s.options}>
            {options.map(opt => (
              <button key={opt} style={s.option} onClick={() => handlePick(opt)}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Result */}
            <div style={s.options}>
              {options.map(opt => {
                let bg = 'var(--bg3)'
                let border = 'var(--border)'
                let color = 'var(--text)'
                if (opt === correct) { bg = 'var(--green-dim)'; border = 'var(--green)'; color = 'var(--green)' }
                else if (opt === selected && opt !== correct) { bg = 'var(--red-dim)'; border = 'var(--red)'; color = 'var(--red)' }
                return (
                  <div key={opt} style={{...s.option, background: bg, borderColor: border, color, cursor: 'default'}}>
                    {opt}
                    {opt === correct && ' ✓'}
                    {opt === selected && opt !== correct && ' ✗'}
                  </div>
                )
              })}
            </div>

            {/* Full card reveal */}
            <div style={s.reveal}>
              <div style={s.revealKanji} className="jp">{display}</div>
              {isKanji && item.onyomi?.length > 0 && (
                <div style={s.readRow}>
                  <span style={s.tag}>音</span>
                  <span className="jp">{item.onyomi.join('・')}</span>
                  <span style={s.romaji}>({item.romaji_on?.join(', ')})</span>
                </div>
              )}
              {isKanji && item.kunyomi?.length > 0 && (
                <div style={s.readRow}>
                  <span style={{...s.tag, background:'var(--blue-dim)', color:'var(--blue)'}}>訓</span>
                  <span className="jp">{item.kunyomi.join('・')}</span>
                  <span style={s.romaji}>({item.romaji_kun?.join(', ')})</span>
                </div>
              )}
              {!isKanji && (
                <div style={s.readRow}>
                  <span className="jp">{item.reading}</span>
                  <span style={s.romaji}>/ {item.romaji}</span>
                </div>
              )}
              <div style={s.meaning}>{item.meaning}</div>
            </div>

            {/* Rating buttons */}
            {!rating && (
              <div style={s.ratings}>
                <div style={s.ratingsLabel}>How did it feel?</div>
                <div style={s.ratingRow}>
                  {[
                    { r: 'again', label: 'Again', color: '#e05c6a', desc: 'Forgot' },
                    { r: 'hard',  label: 'Hard',  color: '#d4a843', desc: 'Struggled' },
                    { r: 'good',  label: 'Good',  color: '#5b8dee', desc: 'Got it' },
                    { r: 'easy',  label: 'Easy',  color: '#4ecb8d', desc: 'Too easy' },
                  ].map(({ r, label, color, desc }) => (
                    <button key={r} style={{...s.ratingBtn, borderColor: color, color}}
                      onClick={() => handleRate(r)}>
                      <span style={s.ratingLabel}>{label}</span>
                      <span style={{...s.ratingDesc, color: color + '99'}}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {rating && (
              <div style={s.ratedMsg}>
                Rated <strong>{rating}</strong> · Next card loading...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Results({ answers, onStudyAgain, onHome }) {
  const correct = answers.filter(a => a.correct).length
  const total   = answers.length
  const pct     = Math.round((correct / total) * 100)

  const wrong = answers.filter(a => !a.correct)

  return (
    <div style={s.phase}>
      <div style={s.resultsHeader}>
        <div style={s.resultsBig}>{pct}%</div>
        <div style={s.resultsScore}>{correct} / {total} correct</div>
        <div style={s.resultsSub}>
          {pct >= 80 ? '🎌 Excellent!' : pct >= 60 ? '💡 Good progress' : '📖 Keep practicing'}
        </div>
      </div>

      {wrong.length > 0 && (
        <div style={s.wrongList}>
          <div style={s.sectionLabel}>Needs more practice</div>
          {wrong.map((a, i) => (
            <div key={i} style={s.wrongItem}>
              <span style={s.wrongKanji} className="jp">
                {a.item.value}
              </span>
              <span style={s.wrongMeaning}>{a.item.meaning}</span>
              <span style={s.wrongRating}>{a.rating}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.resultActions}>
        <button style={s.startBtn} onClick={onStudyAgain}>Study Again</button>
        <button style={s.navBtn}   onClick={onHome}>← Home</button>
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
      // Session complete — MCP handles all writes
      setTimeout(async () => {
        const correct = newAnswers.filter(a => a.correct).length
        await mcp.completeSession({
          session_id:    session.id,
          answers:       newAnswers.map(a => ({ item_id: a.item.id, correct: a.correct, rating: a.rating })),
          marks_percent: Math.round((correct / newAnswers.length) * 100),
        })
        setPhase(PHASES.RESULTS)
      }, 800)
    }
  }

  if (phase === PHASES.LOADING) {
    return (
      <div style={s.fullCenter}>
        <div style={s.loadingText}>Loading session...</div>
      </div>
    )
  }

  return (
    <div style={s.sessionPage}>
      {/* Top bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div style={s.topBarTitle} className="jp">漢字Den</div>
        <div style={s.topBarPhase}>{phase}</div>
      </div>

      {/* Progress bar */}
      {phase === PHASES.QUIZ && (
        <div style={s.progressTrack}>
          <div style={{...s.progressFill, width: `${((quizIdx) / items.length) * 100}%`}} />
        </div>
      )}

      <div style={s.sessionMain}>
        {phase === PHASES.READING && items[readIdx] && (
          <ReadingCard
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
            onStudyAgain={() => { setPhase(PHASES.READING); setReadIdx(0); setQuizIdx(0); setAnswers([]) }}
            onHome={onBack}
          />
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  sessionPage: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  topBar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' },
  backBtn:     { background: 'none', color: 'var(--text2)', fontSize: 14, padding: '4px 0' },
  topBarTitle: { fontSize: 18, color: 'var(--gold)', fontWeight: 600 },
  topBarPhase: { fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 },
  progressTrack: { height: 3, background: 'var(--border)', position: 'relative' },
  progressFill:  { height: '100%', background: 'var(--gold)', transition: 'width .4s ease' },
  sessionMain: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' },
  fullCenter:  { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: 'var(--text2)' },

  phase:       { width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 20 },
  phaseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  phaseTag:    { fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 },
  cardNum:     { fontSize: 13, color: 'var(--text2)' },

  // Reading
  readCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' },
  readKanji: { fontSize: 72, color: 'var(--gold)', lineHeight: 1, textShadow: '0 0 40px rgba(212,168,67,0.3)' },
  readRow:   { display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 },
  tag:       { background: 'var(--gold-dim)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  romaji:    { color: 'var(--text2)', fontSize: 13 },
  meaning:   { fontSize: 18, fontWeight: 600, color: 'var(--text)' },
  tags:      { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  jlptTag:   { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  tagPill:   { background: 'var(--bg3)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20, fontSize: 12, color: 'var(--text2)' },
  readNav:   { display: 'flex', gap: 10, justifyContent: 'space-between' },

  // Quiz
  quizCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 },
  quizKanji: { fontSize: 64, color: 'var(--gold)', textAlign: 'center', lineHeight: 1, textShadow: '0 0 30px rgba(212,168,67,0.25)' },
  quizQ:     { textAlign: 'center', color: 'var(--text2)', fontSize: 15 },
  options:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  option:    { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 10px', fontSize: 14, fontWeight: 500, color: 'var(--text)', textAlign: 'center', transition: 'all .15s' },

  reveal:      { background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' },
  revealKanji: { fontSize: 32, color: 'var(--gold)' },

  ratings:      { display: 'flex', flexDirection: 'column', gap: 8 },
  ratingsLabel: { fontSize: 12, color: 'var(--text3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  ratingRow:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 },
  ratingBtn:    { background: 'var(--bg3)', border: '1px solid', borderRadius: 10, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .15s' },
  ratingLabel:  { fontWeight: 700, fontSize: 13 },
  ratingDesc:   { fontSize: 10 },
  ratedMsg:     { textAlign: 'center', color: 'var(--text2)', fontSize: 13 },

  // Results
  resultsHeader: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 },
  resultsBig:    { fontSize: 64, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 },
  resultsScore:  { fontSize: 18, color: 'var(--text)' },
  resultsSub:    { fontSize: 14, color: 'var(--text2)' },
  wrongList:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  sectionLabel:  { fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  wrongItem:     { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' },
  wrongKanji:    { fontSize: 24, color: 'var(--red)', minWidth: 40 },
  wrongMeaning:  { flex: 1, color: 'var(--text)', fontSize: 14 },
  wrongRating:   { color: 'var(--text2)', fontSize: 12, background: 'var(--bg3)', padding: '2px 8px', borderRadius: 6 },
  resultActions: { display: 'flex', flexDirection: 'column', gap: 10 },

  // Shared buttons
  navBtn:   { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 },
  startBtn: { background: 'var(--gold)', color: '#000', border: 'none', padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700 },
}
