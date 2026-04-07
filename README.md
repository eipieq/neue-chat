# Neue World Chat

A conversational AI chat assistant for the Neue World agency website. Visitors can ask about services, the team, pricing, and past work — and the assistant captures qualified leads silently along the way.

Built with Next.js 16, OpenAI streaming, and shadcn/ui. Ships as both a hosted page and an embeddable widget for Webflow.

## Features

- **Streaming chat** — token-by-token responses via OpenAI `gpt-4o-mini` over SSE
- **Strict guardrails** — only answers questions about Neue World, design, Webflow, and the agency's services
- **Per-session token limit** — each visitor capped at ~4,000 tokens, then prompted to book a strategy call
- **Silent lead capture** — the model emits a hidden `<LEAD_CAPTURE>` tag with name + email when buying intent is detected
- **Markdown rendering** — bold, italic, lists, and underlined links in assistant replies
- **Embeddable widget** — single `<script>` tag drops a floating chat button onto any site (built for Webflow)

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Base UI primitives) |
| Icons | Phosphor Icons |
| Markdown | react-markdown |
| AI | OpenAI SDK (`gpt-4o-mini`, streaming) |
| Hosting | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your OPENAI_API_KEY
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for chat completions |
| `AIRTABLE_API_KEY` | No | Optional — for lead storage in Airtable |
| `AIRTABLE_BASE_ID` | No | Airtable base ID |
| `AIRTABLE_TABLE_NAME` | No | Airtable table name (default: `Leads`) |
| `GOOGLE_SHEETS_ID` | No | Optional — alternative lead storage in Google Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | Service account email |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | Service account private key |

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Streaming chat endpoint (SSE)
│   │   └── lead/route.ts      # Lead save endpoint
│   ├── globals.css            # Tailwind + shadcn theme tokens
│   ├── layout.tsx             # Root layout (Geist fonts)
│   └── page.tsx               # Chat UI
├── components/ui/             # shadcn components
└── lib/
    ├── knowledge.ts           # System prompt & knowledge base
    ├── leads.ts               # Lead storage adapters
    └── utils.ts               # cn() utility

public/
└── widget.js                  # Embeddable chat widget for Webflow
```

## Embedding the widget

Drop this snippet into the **Footer Code** of any Webflow project (Project Settings → Custom Code):

```html
<script src="https://your-vercel-url.vercel.app/widget.js"
        data-api="https://your-vercel-url.vercel.app"></script>
```

The widget renders a floating chat button bottom-right and opens a panel on click. It enforces the same token limit client-side and falls back to the strategy-call CTA when reached.

## Customising the assistant

Edit `src/lib/knowledge.ts` to update:

- Tone, voice, and response style
- Topic guardrails (what the assistant will and won't answer)
- Services, pricing, team bios, case studies
- Lead capture instructions
- Contact links

The full system prompt is rebuilt on every request — no caching, so changes take effect immediately on save.

## Lead capture

The model is instructed to silently emit a hidden tag whenever it captures a name and email:

```
<LEAD_CAPTURE>
{"name": "Alex Doe", "email": "alex@example.com"}
</LEAD_CAPTURE>
```

The server parses and strips this tag from the response (it's never shown to the visitor) and forwards the lead to `saveLead()` in `src/lib/leads.ts`. Default behaviour is `console.log` — wire up Airtable or Google Sheets in that file when ready.

## Deploy

Push to `main` and Vercel auto-deploys.

```bash
git push
```

Set `OPENAI_API_KEY` in **Project Settings → Environment Variables** before the first deploy.

## License

Private — Neue World © 2026
