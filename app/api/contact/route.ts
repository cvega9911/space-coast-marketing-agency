import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
  const resend = new Resend(apiKey)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, businessName, phone, email, interest } = body as Record<string, string>

  if (!name || !email || !phone) {
    return NextResponse.json({ error: 'name, email, and phone are required' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from:    'SCMA Contact <noreply@spacecoastmarketingagency.com>',
      to:      ['info@spacecoastmarketingagency.com'],
      reply_to: email,
      subject: `New inquiry from ${name} — ${businessName ?? 'unknown business'}`,
      text: [
        `Name: ${name}`,
        `Business: ${businessName ?? '—'}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Interest: ${interest ?? '—'}`,
      ].join('\n'),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
