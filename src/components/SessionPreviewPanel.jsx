export default function SessionPreviewPanel({ items, maxVisible = 8 }) {
  if (!items || items.length === 0) return null

  const kanjiCount = items.filter(i => i.item_type === 'kanji').length
  const vocabCount = items.filter(i => i.item_type === 'kotoba').length

  const levelCounts = {}
  for (const item of items) {
    if (item.jlpt_level) levelCounts[item.jlpt_level] = (levelCounts[item.jlpt_level] ?? 0) + 1
  }
  const levelStr = ['N5', 'N4', 'N3', 'N2', 'N1']
    .filter(l => levelCounts[l] > 0)
    .map(l => `${l}:${levelCounts[l]}`)
    .join('  ')

  const typeParts = [
    kanjiCount > 0 ? `${kanjiCount} kanji` : null,
    vocabCount > 0 ? `${vocabCount} words` : null,
  ].filter(Boolean)

  const summary = [typeParts.join(' · '), levelStr].filter(Boolean).join(' · ')

  const visible = items.slice(0, maxVisible)
  const extra   = items.length - visible.length

  return (
    <div style={sp.wrap}>
      <div style={sp.summary}>{summary}</div>
      {visible.map((item, i) => (
        <ItemRow key={item.id ?? i} item={item} />
      ))}
      {extra > 0 && (
        <div style={sp.more}>+{extra} more</div>
      )}
    </div>
  )
}

function ItemRow({ item }) {
  const isKanji = item.item_type === 'kanji'
  return (
    <div style={sp.row}>
      <span style={{ ...sp.badge, ...(isKanji ? sp.badgeK : sp.badgeV) }}>
        {isKanji ? 'K' : 'V'}
      </span>
      <span className="jp" style={sp.char}>{item.item ?? item.value}</span>
      <span style={sp.dot}>·</span>
      <span style={sp.meaning}>{item.meaning}</span>
      {item.jlpt_level && <span style={sp.level}>{item.jlpt_level}</span>}
    </div>
  )
}

const sp = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  summary: {
    fontSize: 11,
    color: 'var(--text3)',
    marginBottom: 5,
    lineHeight: 1.4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 0',
    borderTop: '1px solid var(--border)',
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: 3,
    flexShrink: 0,
    lineHeight: 1.5,
  },
  badgeK: {
    background: 'rgba(91,141,238,0.15)',
    color: 'var(--blue)',
  },
  badgeV: {
    background: 'rgba(155,114,239,0.15)',
    color: 'var(--purple)',
  },
  char: {
    fontSize: 14,
    flexShrink: 0,
    lineHeight: 1,
  },
  dot: {
    color: 'var(--text3)',
    flexShrink: 0,
    fontSize: 11,
  },
  meaning: {
    fontSize: 12,
    color: 'var(--text2)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  level: {
    fontSize: 10,
    color: 'var(--text3)',
    flexShrink: 0,
  },
  more: {
    fontSize: 11,
    color: 'var(--text3)',
    padding: '4px 2px',
    borderTop: '1px solid var(--border)',
  },
}
