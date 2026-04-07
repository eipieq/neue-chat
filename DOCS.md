# Neue World Chatbot — How It Works & Build Plan

---

## What This Is

A conversational AI widget embedded on the Neue World website. Visitors can ask questions about services, pricing, the team, and past work. When a visitor shows buying intent, the bot naturally collects their name and email and saves them as a lead.

It's built as a lightweight backend API + a vanilla JS embed that drops into Webflow with a single `<script>` tag.

---

## Architecture

```
Webflow site (visitor)
    │
    │  POST /chat  { messages[], sessionId }
    ▼
Express backend (Railway / Render)
    │
    ├─ Injects knowledge base as system prompt
    ├─ Calls Anthropic API (Claude Haiku) — streaming
    ├─ Streams SSE chunks back to the widget
    └─ Parses <LEAD_CAPTURE> tags → saves lead
          │
          └─ leads.json (dev) → Airtable / Google Sheets (prod)
```

**Stateless backend.** The full conversation history is sent by the client on every request. The server holds no session state — it just calls Anthropic and streams the response back. Simple to scale, easy to reason about.

---

## File Map

```
neue-chat/
├── src/
│   ├── server.js        Main Express app
│   ├── knowledge.js     System prompt — everything Claude knows about Neue World
│   └── leads.js         Lead storage — file (dev), Airtable or Sheets (prod)
├── .env.example         Environment variable template
├── .gitignore
└── package.json
```

---

## How Each Piece Works

### `src/knowledge.js` — The Brain

A single string injected as Claude's `system` prompt on every request. It contains:

- **Services** — what Neue World offers and how each service is described
- **Team** — each person's name and role
- **Portfolio** — case studies with outcomes (fill in the real ones)
- **Pricing** — ranges and signals to send people to a discovery call
- **FAQs** — common questions answered in Neue World's voice
- **Lead capture instructions** — tells Claude when to ask for name/email and how to output the `<LEAD_CAPTURE>` tag

This is the file you'll edit most. No code changes required to update what the bot knows — just edit this file and redeploy.

### `src/server.js` — The API

Two main endpoints:

**`POST /chat`**
1. Receives `{ messages: [{role, content}], sessionId }` from the widget
2. Sanitizes the messages array
3. Opens an SSE stream response
4. Calls `client.messages.stream()` with the knowledge base as the system prompt
5. Forwards each text chunk to the client as `data: {"chunk": "..."}\n\n`
6. After the full response, scans for a `<LEAD_CAPTURE>{"name":"...","email":"..."}` tag
7. If found, calls `saveLead()` asynchronously (non-blocking)
8. Sends `data: [DONE]\n\n` to signal completion

**`POST /lead`**
- Direct lead submission endpoint (for the widget to call if it needs to capture explicitly)
- Accepts `{ name, email, sessionId, message }`
- Calls `saveLead()`

**`GET /health`**
- Returns `{"ok": true}` — used by Railway/Render to confirm the service is up

### `src/leads.js` — Lead Storage

`saveLead()` is a single async function. Currently writes to `leads.json` in the project root (fine for dev/testing).

Two commented-out implementations are ready to uncomment:
- **Airtable** — `npm install airtable`, set env vars, uncomment
- **Google Sheets** — `npm install googleapis`, add service account credentials, uncomment

### Lead Capture Flow (how Claude captures leads)

Claude is instructed in the system prompt to watch for high-intent phrases (pricing questions, "I want to start a project", etc.) and respond naturally by asking for name and email. Once collected, it outputs a special tag in its response:

```
<LEAD_CAPTURE>
{"name": "Jane Smith", "email": "jane@example.com"}
</LEAD_CAPTURE>
```

The server strips this from what gets streamed to the user (the widget never shows raw JSON). The tag is parsed server-side and the lead is saved. This keeps the flow entirely invisible to the visitor.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | From console.anthropic.com |
| `PORT` | No | Defaults to 3001 |
| `ALLOWED_ORIGINS` | Yes (prod) | Comma-separated list of allowed domains |
| `AIRTABLE_API_KEY` | If using Airtable | — |
| `AIRTABLE_BASE_ID` | If using Airtable | — |
| `AIRTABLE_TABLE_NAME` | If using Airtable | Defaults to "Leads" |
| `GOOGLE_SHEETS_ID` | If using Sheets | — |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | If using Sheets | — |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | If using Sheets | Private key (newlines as `\n`) |

---

## Complete Build Plan

### Phase 1 — Backend (done)

- [x] Express server with `/chat`, `/lead`, `/health`
- [x] Anthropic streaming via SSE
- [x] Knowledge base system prompt
- [x] Lead capture via `<LEAD_CAPTURE>` tag parsing
- [x] Dev lead storage (leads.json)
- [x] CORS configuration
- [x] `.env.example`, `.gitignore`

### Phase 2 — Knowledge Base (next)

- [ ] Fill in real case studies (client, what was built, results)
- [ ] Confirm all team bios are accurate
- [ ] Confirm pricing ranges with Ajay
- [ ] Add real booking link for discovery calls
- [ ] Add real contact email
- [ ] Test responses against 10–15 real visitor questions

### Phase 3 — Lead Storage

- [ ] Decide on Airtable vs Google Sheets
- [ ] Set up the table/sheet with columns: Date, Name, Email, Session ID, First Message
- [ ] Uncomment + configure the right integration in `leads.js`
- [ ] Test end-to-end: chat → intent → lead saved in sheet

### Phase 4 — Webflow Widget

- [ ] Build the chat widget in vanilla JS (single file)
  - Floating button (bottom-right), expands to panel
  - Sends full `messages[]` array on each turn
  - Reads SSE stream, appends chunks as they arrive
  - Renders basic markdown (bold, line breaks, links)
  - Stores `messages[]` and `sessionId` in `sessionStorage`
  - Strips `<LEAD_CAPTURE>` tags before displaying Claude's response
- [ ] Style to match Neue World brand
- [ ] Wrap in a `<script>` tag that works as a Webflow embed

### Phase 5 — Deployment

- [ ] Create Railway (or Render) project
- [ ] Connect GitHub repo
- [ ] Set all production environment variables
- [ ] Set `ALLOWED_ORIGINS` to the live Webflow domain
- [ ] Deploy and confirm `/health` returns 200
- [ ] Add `<script>` embed to Webflow on staging
- [ ] Test full flow: load page → chat → ask about pricing → give name/email → confirm lead appears in sheet

### Phase 6 — Polish & Monitoring (post-launch)

- [ ] Add email notification on new lead (e.g. Resend or nodemailer)
- [ ] Log conversations (optional, privacy considerations)
- [ ] Review first 50 conversations — tune system prompt based on where it goes wrong
- [ ] Add rate limiting to `/chat` (e.g. `express-rate-limit`) to prevent abuse
- [ ] Consider a session ID on the backend if you want conversation history persistence

---

## Running Locally

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

npm run dev
# Server runs on http://localhost:3001
```

Test the chat endpoint:

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -N \
  -d '{"messages": [{"role": "user", "content": "What services do you offer?"}]}'
```

---

## Deploying to Railway

1. Push this repo to GitHub
2. New project → Deploy from GitHub repo
3. Set environment variables in the Railway dashboard
4. Railway auto-detects Node.js and runs `npm start`
5. Get the generated domain (e.g. `neue-chat.up.railway.app`) — this is your API base URL for the widget
