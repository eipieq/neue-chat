import { saveLead } from '@/lib/leads'

export async function POST(req: Request) {
  const { name, email, sessionId, message } = await req.json()
  if (!email) return Response.json({ error: 'email is required' }, { status: 400 })
  await saveLead({ name, email, sessionId, message })
  return Response.json({ ok: true })
}
