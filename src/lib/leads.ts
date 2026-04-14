import Airtable from 'airtable'

export interface Lead {
  name?: string
  email: string
  source?: string
  sessionId?: string
  message?: string
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID!)

export async function saveLead(lead: Lead) {
  console.log('Lead captured:', lead)

  await base(process.env.AIRTABLE_TABLE_NAME || 'Leads').create([{
    fields: {
      Name: lead.name || '',
      Email: lead.email,
      Source: lead.source || 'Website Chat',
      'Session ID': lead.sessionId || '',
      'Captured At': new Date().toISOString().split('T')[0],
    },
  }])
}
