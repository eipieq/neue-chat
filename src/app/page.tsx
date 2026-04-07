'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowUp, CircleNotch, Sparkle } from '@phosphor-icons/react'

type Message = { role: 'user' | 'assistant'; content: string }

const SESSION_ID = Math.random().toString(36).slice(2, 9)
const LEAD_RE = /<LEAD_CAPTURE>[\s\S]*?<\/LEAD_CAPTURE>/g
const STARTERS = [
  'What services do you offer?',
  'How much does a website cost?',
  'Show me past work',
  'How do I get started?',
]

function clean(text: string) {
  return text.replace(LEAD_RE, '').trim()
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
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

      if (res.status === 429) {
        setMessages(m => [...m.slice(0, -1), {
          role: 'assistant',
          content: "You've reached the conversation limit. [Book a strategy call](https://app.cal.com/jayantrao/30min) to talk to the team directly.",
        }])
        return
      }

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
              setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: fullText }])
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(m => [...m.slice(0, -1), {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      }])
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }, [messages, streaming])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-muted/40 via-background to-muted/40 flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-2xl flex flex-col h-[calc(100vh-2rem)] sm:h-[720px] shadow-2xl shadow-black/5 border-border/60 overflow-hidden gap-0 py-0">

        {/* Header */}
        <CardHeader className="flex flex-row items-center gap-3.5 space-y-0 px-6 py-5 bg-card">
          <div className="relative">
            <Avatar className="size-10 ring-2 ring-background">
              <AvatarFallback className="bg-foreground text-background font-semibold text-sm tracking-tight">
                NW
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold leading-none tracking-tight">Neue World</p>
            <p className="text-xs text-muted-foreground leading-none truncate">
              Digital design & Webflow agency
            </p>
          </div>
          <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider px-2 py-1">
            Online
          </Badge>
        </CardHeader>

        <Separator />

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0 bg-muted/20">
          <ScrollArea className="h-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 min-h-[440px]">
                <div className="size-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg shadow-foreground/10 mb-5">
                  <Sparkle weight="fill" className="size-5" />
                </div>
                <p className="text-base font-semibold tracking-tight mb-2">How can we help?</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-7">
                  Ask about our services, team, pricing, or past work — we usually reply in seconds.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {STARTERS.map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-normal h-8 px-3.5 bg-background hover:bg-accent transition-all"
                      onClick={() => send(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-6 pt-6 pb-8 flex flex-col gap-6">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-foreground text-background text-[10px] font-semibold">
                          NW
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`px-4 py-3 text-sm leading-relaxed max-w-[82%] shadow-sm [overflow-wrap:anywhere] ${
                        msg.role === 'user'
                          ? 'bg-foreground text-background rounded-2xl rounded-tr-md'
                          : 'bg-card text-card-foreground rounded-2xl rounded-tl-md border border-border/60'
                      }`}
                    >
                      {msg.content === '' && streaming ? (
                        <span className="flex gap-1 items-center h-5">
                          {[0, 1, 2].map(n => (
                            <span
                              key={n}
                              className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                              style={{ animationDelay: `${n * 0.15}s` }}
                            />
                          ))}
                        </span>
                      ) : msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{clean(msg.content)}</p>
                      ) : (
                        <div
                          className="space-y-3
                                     [&_p]:leading-relaxed
                                     [&_strong]:font-semibold [&_strong]:text-foreground
                                     [&_em]:italic
                                     [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:text-foreground hover:[&_a]:opacity-70
                                     [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                                     [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                                     [&_li]:leading-relaxed
                                     [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                                     [&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-tight
                                     [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:tracking-tight
                                     [&_h3]:text-sm [&_h3]:font-semibold"
                        >
                          <ReactMarkdown>{clean(msg.content)}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} className="h-px" />
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <Separator />

        {/* Input */}
        <CardFooter className="p-4 bg-card">
          <div
            className="group w-full rounded-2xl border border-border/60 bg-muted/30 shadow-sm transition-all
                       focus-within:bg-background focus-within:border-foreground/20
                       focus-within:ring-4 focus-within:ring-foreground/5
                       hover:border-border"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message Neue World…"
              disabled={streaming}
              rows={1}
              className="resize-none min-h-[52px] max-h-40 px-4 pt-3.5 pb-2 text-[15px] leading-relaxed
                         border-0 bg-transparent shadow-none rounded-2xl
                         focus-visible:ring-0 focus-visible:ring-offset-0
                         placeholder:text-muted-foreground/60"
              autoFocus
            />
            <div className="flex items-center justify-end px-2 pb-2">
              <Button
                size="icon"
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                className="size-8 rounded-lg transition-all
                           disabled:opacity-30
                           enabled:shadow-md enabled:shadow-foreground/10
                           enabled:hover:scale-105 active:scale-95"
                aria-label="Send message"
              >
                {streaming ? (
                  <CircleNotch className="size-4 animate-spin" weight="bold" />
                ) : (
                  <ArrowUp className="size-4" weight="bold" />
                )}
              </Button>
            </div>
          </div>
        </CardFooter>

      </Card>
    </div>
  )
}
