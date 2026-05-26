const MCP_URL     = import.meta.env.VITE_MCP_URL
const GATEWAY_KEY = import.meta.env.VITE_GATEWAY_KEY

async function callTool(toolName, args = {}) {
  const res = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ gateway_key: GATEWAY_KEY, ...args }),
  })
  if (!res.ok) throw new Error(`Tool ${toolName} failed: ${res.status}`)
  return res.json()
}

async function callGet(path, params = {}) {
  const url = new URL(`${MCP_URL}${path}`)
  url.searchParams.set('gateway_key', GATEWAY_KEY)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export const mcp = {
  createSession:     (args) => callTool('create_session',      args),
  createCourse:      (args) => callTool('create_course',       args),
  processQuizAnswer: (args) => callTool('process_quiz_answer', args),
  completeSession:   (args) => callTool('complete_session',    args),
  getProgress:       (args) => callTool('get_progress',        args ?? {}),
  getWeakWords:      (args) => callTool('get_weak_words',      args ?? {}),
  getDueToday:       (args) => callTool('get_due_today',       args ?? {}),
  getPendingSession: ()     => callTool('get_pending_session', {}),
  getNewItems:       (args) => callTool('get_new_items',       args ?? {}),
  getSession:        (sessionId) => callTool('get_session', { session_id: sessionId }),
  getItems:          (args) => callGet('/items', args ?? {}),
}
