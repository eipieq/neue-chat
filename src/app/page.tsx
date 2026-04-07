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
      setMessages(m => [...m.slice(0, -1), {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      }])
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
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-2xl flex flex-col h-[680px]">

        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
          <Avatar>
            <AvatarFallback>NW</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-none">Neue World</p>
            <p className="text-xs text-muted-foreground mt-1">Digital design & Webflow agency · Dubai</p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Online
          </Badge>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                <div>
                  <p className="font-semibold">How can we help?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask about our services, team, or past work.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {STARTERS.map(s => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs h-7"
                      onClick={() => send(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-col gap-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[10px]">NW</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : msg.content === '' && streaming ? (
                        <span className="flex gap-1 items-center h-4">
                          {[0, 1, 2].map(n => (
                            <span
                              key={n}
                              className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: `${n * 0.15}s` }}
                            />
                          ))}
                        </span>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
        </CardContent>

        {leadCaptured && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center py-1">
            ✓ Lead captured
          </p>
        )}

        <Separator />

        <CardFooter className="pt-3 gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything…"
            disabled={streaming}
            rows={1}
            className="resize-none min-h-9 max-h-32 overflow-y-auto"
            autoFocus
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </CardFooter>

      </Card>
    </div>
  )
}
