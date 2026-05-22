# Kanjiden-web

React + Vite study website for KanjiDen.

Deployed on Vercel: `https://kanjiden-web.vercel.app`

---

## What This Does

A **view-only** dashboard that displays Bibs's Japanese study data. All interaction happens in the Claude agent chat — this site just visualizes the state.

No direct Supabase calls. All data comes through the MCP server.

---

## Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Overview — due today, mastery summary, recent activity |
| Session | `/session` | Active study session view |

> More pages coming in Step 6: Results, Weak items, Stats

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in VITE_MCP_URL
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_MCP_URL` | MCP server URL (`https://kanjiden-mcp-production.up.railway.app/mcp`) |

---

## Project Structure

```
src/
├── App.jsx           # Root component, routing
├── main.jsx          # Vite entry point
├── index.css         # Global styles
├── lib/
│   └── mcp.js        # MCP client — all data fetching goes here
└── pages/
    ├── Home.jsx       # Dashboard / overview
    └── Session.jsx    # Study session view
```

---

## Rules

- **No direct Supabase calls** — all data via `src/lib/mcp.js`
- This site is view-only — the Claude agent handles all writes
- Gateway key is never exposed to the frontend — MCP server handles auth

---

## Deploy (Vercel)

Vercel auto-deploys from the `main` branch.

Set `VITE_MCP_URL` in Vercel dashboard under Environment Variables.
