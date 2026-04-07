'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const SESSION_ID = Math.random().toString(36).slice(2, 9)
const LEAD_RE = /<LEAD_CAPTURE>[\s\S]*?<\/LEAD_CAPTURE>/g

const STARTERS = [
  'What services do you offer?',
  'How much does a website cost?',
  'Who is on the team?',
  'Show me some past work',
  'How do I get started?',
]

function clean(text: string) {
  return text.replace(LEAD_RE, '').trim()
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, sessionId: SESSION_ID }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.chunk) {
              fullText += parsed.chunk
              if (/<LEAD_CAPTURE>/.test(fullText) && !leadCaptured) {
                setLeadCaptured(true)
                setTimeout(() => setLeadCaptured(false), 5000)
              }
              setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: fullText }])
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }, [messages, streaming, leadCaptured])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col w-full max-w-2xl mx-auto border-x border-border">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">N</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-none">Neue World</p>
            <p className="text-xs text-muted-foreground mt-0.5">Digital design & Webflow agency · Dubai</p>
          </div>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Online
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center py-16">
              <div>
                <p className="text-2xl font-semibold tracking-tight">neue world</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Ask about our services, team, past work, or how to get started.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col gap-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">N</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm max-w-[82%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-card border border-border rounded-tl-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.content === '' && streaming ? (
                      <span className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(n => (
                          <span key={n} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${n * 0.15}s` }} />
                        ))}
                      </span>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{clean(msg.content)}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Lead notice */}
        {leadCaptured && (
          <div className="mx-5 mb-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2 flex items-center gap-2">
            <span>✓</span> Lead captured
          </div>
        )}

        {/* Input */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything…"
              disabled={streaming}
              rows={1}
              className="resize-none min-h-[44px] max-h-36 overflow-y-auto"
              autoFocus
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
