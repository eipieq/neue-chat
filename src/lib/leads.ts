export interface Lead {
  name?: string
  email: string
  sessionId?: string
  message?: string
}

export async function saveLead(lead: Lead) {
  console.log('Lead captured:', lead)

  // ── Airtable ──────────────────────────────────────────────────────────────
  // npm install airtable
  //
  // const Airtable = require('airtable')
  // const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  //   .base(process.env.AIRTABLE_BASE_ID!)
  // await base(process.env.AIRTABLE_TABLE_NAME || 'Leads').create([{
  //   fields: { Name: lead.name, Email: lead.email, Source: 'Website Chat' }
  // }])

  // ── Google Sheets ──────────────────────────────────────────────────────────
  // npm install googleapis
  //
  // const { google } = require('googleapis')
  // const auth = new google.auth.JWT(
  //   process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
  //   process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, '\n'),
  //   ['https://www.googleapis.com/auth/spreadsheets']
  // )
  // const sheets = google.sheets({ version: 'v4', auth })
  // await sheets.spreadsheets.values.append({
  //   spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  //   range: 'Sheet1!A:E', valueInputOption: 'USER_ENTERED',
  //   requestBody: { values: [[new Date().toISOString(), lead.name, lead.email, lead.message || '', lead.sessionId || '']] }
  // })
}
