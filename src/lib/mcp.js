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


export const mcp = {
  createSession:     (args) => callTool('create_session',      args),
  processQuizAnswer: (args) => callTool('process_quiz_answer', args),
  completeSession:   (args) => callTool('complete_session',    args),
  getProgress:       ()     => callTool('get_progress',        {}),
  getWeakWords:      (args) => callTool('get_weak_words',      args ?? {}),
  getDueToday:       (args) => callTool('get_due_today',       args ?? {}),
  getPendingSession: ()     => callTool('get_pending_session', {}),
  getSession: (sessionId) => callTool('get_session', { session_id: sessionId }),
}