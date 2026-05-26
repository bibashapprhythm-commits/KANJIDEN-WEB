import { useState } from 'react'

const MASTERY_LABEL = ['New', 'Learning', 'Familiar', 'Good', 'Strong', 'Mastered']
const MASTERY_COLOR = ['#64748b', '#38bdf8', '#818cf8', '#fbbf24', '#34d399', '#4ade80']

const TEACHING_TIPS = {
  '前': '前 (before) + 後 (after): 午前 ごぜん = AM, 午後 ごご = PM — appear on every train schedule.',
  '後': '前 (before) + 後 (after): 午前 ごぜん = AM, 午後 ごご = PM — appear on every train schedule.',
  '午': '午前 ごぜん = before noon (AM), 午後 ごご = after noon (PM). 午 itself means noon.',
  '上': '上 (up) ↔ 下 (down). 上手 じょうず = skilled, 下手 へた = unskilled — reversed expectation.',
  '下': '上 (up) ↔ 下 (down). 下手 へた = unskilled — the character literally means "low hand."',
  '左': '左 (left) ↔ 右 (right). 左折 させつ = turn left, 右折 うせつ = turn right.',
  '右': '左 (left) ↔ 右 (right). 左折 させつ = turn left, 右折 うせつ = turn right.',
  '東': 'Station exits: 東口 ひがしぐち · 西口 にしぐち · 南口 みなみぐち · 北口 きたぐち.',
  '西': 'Station exits: 東口 ひがしぐち · 西口 にしぐち · 南口 みなみぐち · 北口 きたぐち.',
  '南': 'Station exits: 東口 ひがしぐち · 西口 にしぐち · 南口 みなみぐち · 北口 きたぐち.',
  '北': 'Station exits: 東口 ひがしぐち · 西口 にしぐち · 南口 みなみぐち · 北口 きたぐち.',
  '中': '中 (inside/middle) ↔ 外 (outside). 中国 ちゅうごく = China, 中心 ちゅうしん = center.',
  '外': '中 (inside) ↔ 外 (outside). 外国 がいこく = foreign country, 外出 がいしゅつ = going out.',
  '男': '男の子 おとこのこ = boy, 女の子 おんなのこ = girl. 子 appended makes them children.',
  '女': '男 (man) ↔ 女 (woman). 女性 じょせい = female, 女の子 おんなのこ = girl.',
  '父': '父 ちち = (my) father. お父さん おとうさん = (your) father or Dad.',
  '母': '母 はは = (my) mother. お母さん おかあさん = (your) mother or Mom.',
  '書': '書く かく = to write ↔ 読む よむ = to read — the fundamental learning pair.',
  '読': '読む よむ = to read ↔ 書く かく = to write — the fundamental learning pair.',
  '聞': '聞く きく = to listen/hear/ask. 聞き手 ききて = listener, 聞こえる きこえる = can be heard.',
  '行': '行く いく = to go (away from you) ↔ 来る くる = to come (toward you). Direction matters.',
  '来': '来る くる = to come (toward speaker) ↔ 行く いく = to go (away). Direction matters.',
  '出': '出る でる = to exit ↔ 入る はいる = to enter. 出口 でぐち = exit, 入口 いりぐち = entrance.',
  '入': '入る はいる = to enter ↔ 出る でる = to exit. 入口 いりぐち = entrance, 出口 でぐち = exit.',
  '山': '山 やま (mountain) + 川 かわ (river) = 山川 やまかわ (mountains and rivers, landscape).',
  '川': '山 やま (mountain) + 川 かわ (river) = 山川 やまかわ (mountains and rivers, landscape).',
  '火': '火 ひ (fire) ↔ 水 みず (water). 火曜日 かようび = Tuesday, 水曜日 すいようび = Wednesday.',
  '水': '水 みず (water) ↔ 火 ひ (fire). 水曜日 すいようび = Wednesday. 水 is also a radical.',
  '木': '木 き (tree/wood) ↔ 土 つち (soil/earth). 木曜日 もくようび = Thursday.',
  '土': '土 つち (soil) ↔ 木 き (tree). 土曜日 どようび = Saturday. 土台 どだい = foundation.',
}

export default function KanjiDetailPanel({ item, relatedWords = [], onAddToQueue, adding, added }) {
  const [tab, setTab] = useState('words')

  if (!item) return null

  const on  = (item.onyomi  ?? []).map((k, i) => item.romaji_on?.[i]  ? `${k} (${item.romaji_on[i]})`  : k)
  const kun = (item.kunyomi ?? []).map((k, i) => item.romaji_kun?.[i] ? `${k} (${item.romaji_kun[i]})` : k)

  const tip      = TEACHING_TIPS[item.value]
  const ext      = item.meaning_extended ?? ''
  const hasExample = ext.includes('「') || ext.includes('例') || (ext.length > 20 && /[。．！？]/.test(ext))

  const mastery = item.mastery_level ?? 0
  const masteryColor = MASTERY_COLOR[mastery]
  const masteryLabel = MASTERY_LABEL[mastery]
  const meaning  = item.core_meaning ?? item.meaning ?? ''

  const showWords    = relatedWords.length > 0
  const showExamples = hasExample
  const showTabs     = showWords || showExamples

  return (
    <div style={s.panel}>
      {/* Header: char + meaning + mastery */}
      <div style={s.header}>
        <span className="jp" style={s.char}>{item.value}</span>
        <div style={s.headerMeta}>
          <div style={s.meaning}>{meaning}</div>
          {(kun.length > 0 || on.length > 0) && (
            <div style={s.headerReading} className="jp">
              {kun.length > 0 ? kun[0].replace(/\s*\(.*?\)/, '') : ''}
              {kun.length > 0 && on.length > 0 ? ' / ' : ''}
              {on.length > 0 ? on[0].replace(/\s*\(.*?\)/, '') : ''}
            </div>
          )}
        </div>
        <div style={{ ...s.masteryPill, color: masteryColor }}>
          <span style={{ ...s.masteryDot, background: masteryColor }} />
          {masteryLabel}
        </div>
      </div>

      {/* Readings */}
      {on.length > 0 && (
        <div style={s.readingRow}>
          <span style={s.readingLbl}>ON'YOMI</span>
          <div style={s.pills}>
            {on.map((r, i) => <span key={i} className="jp" style={s.pillBlue}>{r}</span>)}
          </div>
        </div>
      )}
      {kun.length > 0 && (
        <div style={s.readingRow}>
          <span style={s.readingLbl}>KUN'YOMI</span>
          <div style={s.pills}>
            {kun.map((r, i) => <span key={i} className="jp" style={s.pillGreen}>{r}</span>)}
          </div>
        </div>
      )}

      {/* Mnemonic */}
      {item.mnemonic && (
        <div style={s.mnemonic}>💡 {item.mnemonic}</div>
      )}

      {/* Tabs: Words / Examples */}
      {showTabs && (
        <>
          <div style={s.tabRow}>
            {showWords && (
              <button
                style={{ ...s.tabBtn, ...(tab === 'words' ? s.tabActive : {}) }}
                onClick={() => setTab('words')}>Words</button>
            )}
            {showExamples && (
              <button
                style={{ ...s.tabBtn, ...(tab === 'examples' ? s.tabActive : {}) }}
                onClick={() => setTab('examples')}>Examples</button>
            )}
          </div>

          {tab === 'words' && showWords && (
            <div style={s.wordList}>
              {relatedWords.map((w, i) => (
                <div key={w.id ?? i} style={s.wordRow}>
                  <span className="jp" style={s.wordVal}>{w.value}</span>
                  <span className="jp" style={s.wordRead}>{w.reading_hiragana ?? w.reading ?? ''}</span>
                  {(w.romaji) && <span style={s.wordRomaji}>{w.romaji}</span>}
                  <span style={s.wordMeaning}>{w.core_meaning ?? w.meaning ?? ''}</span>
                  {w.jlpt_level && <span style={s.wordJlpt}>{w.jlpt_level}</span>}
                </div>
              ))}
            </div>
          )}

          {tab === 'examples' && showExamples && (
            <div style={s.exampleBlock} className="jp">{ext}</div>
          )}
        </>
      )}

      {/* Teaching tip */}
      {tip && (
        <div style={s.tipBlock}>
          <div style={s.tipBar} />
          <span style={s.tipText}>{tip}</span>
        </div>
      )}

      {/* Add to queue / mastery status */}
      {onAddToQueue && (
        <div style={s.actionRow}>
          {(added || item.in_progress) ? (
            <div style={s.alreadyIn}>
              <span style={{ ...s.masteryDot, background: masteryColor }} />
              {masteryLabel}
              {(item.review_count ?? 0) > 0 && ` · ${item.review_count} reviews`}
            </div>
          ) : (
            <button style={s.addBtn} onClick={() => onAddToQueue(item)} disabled={adding}>
              {adding ? 'Adding…' : `+ Add ${item.value} to study queue`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', marginTop: 8 },

  header:     { display: 'flex', alignItems: 'flex-start', gap: 14 },
  char:       { fontSize: 38, color: 'var(--gold)', lineHeight: 1, flexShrink: 0, marginTop: 2 },
  headerMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  meaning:    { fontSize: 16, fontWeight: 600, color: 'var(--text)' },
  headerReading: { fontSize: 14, color: 'var(--text2)' },
  masteryPill:{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, flexShrink: 0 },
  masteryDot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },

  readingRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  readingLbl: { fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: 0.8, minWidth: 72, flexShrink: 0 },
  pills:      { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pillBlue:   { fontSize: 13, padding: '3px 10px', borderRadius: 20, background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(91,141,238,0.25)' },
  pillGreen:  { fontSize: 13, padding: '3px 10px', borderRadius: 20, background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(78,203,141,0.25)' },

  mnemonic: { fontSize: 13, color: 'var(--text2)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 },

  tabRow:    { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 },
  tabBtn:    { background: 'none', border: 'none', borderBottom: '2px solid transparent', borderRadius: 0, padding: '6px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text3)', cursor: 'pointer', marginBottom: -1 },
  tabActive: { color: 'var(--text)', borderBottomColor: 'var(--gold)' },

  wordList: { display: 'flex', flexDirection: 'column', gap: 0 },
  wordRow:  { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  wordVal:  { fontSize: 16, color: 'var(--gold)', fontWeight: 600, minWidth: 40 },
  wordRead: { fontSize: 13, color: 'var(--text2)' },
  wordRomaji: { fontSize: 11, color: 'var(--text3)' },
  wordMeaning: { fontSize: 13, color: 'var(--text)', flex: 1 },
  wordJlpt: { fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' },

  exampleBlock: { fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, background: 'var(--bg2)', borderRadius: 8, padding: '10px 14px' },

  tipBlock: { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' },
  tipBar:   { width: 3, minHeight: 32, background: 'var(--gold)', borderRadius: 2, flexShrink: 0, marginTop: 2 },
  tipText:  { fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, flex: 1 },

  actionRow: { marginTop: 4 },
  addBtn:    { width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  alreadyIn: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', padding: '8px 0' },
}
