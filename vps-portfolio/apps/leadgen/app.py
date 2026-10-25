#!/usr/bin/env python3
"""
leadgen.py — Presencify Lead Generation Outreach Tool
Serves leadgen.presencify.co via Flask + nginx reverse proxy.
Binds 127.0.0.1:8090.

Features:
  - HMAC cookie auth (reuses dojo auth secret)
  - SQLite-backed lead database (imported from LEAD_LIST.md)
  - AI-powered email drafting per lead (DeepSeek v4-pro)
  - Approve/reject pipeline → SMTP send on approval
  - Batch capped at 10 per session
"""
import hashlib
import hmac
import json
import logging
import os
import sqlite3
import subprocess
import time as _time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import requests
from flask import Flask, g, jsonify, make_response, redirect, render_template, request, url_for

# ── Config ──────────────────────────────────────────────────────────────
APP_DIR          = Path(__file__).resolve().parent
DB_PATH          = APP_DIR / 'leadgen.db'
AUTH_SECRET_FILE = Path('/home/jarvis/.dojo_auth_secret')
AUTH_SECRET      = AUTH_SECRET_FILE.read_text().strip() if AUTH_SECRET_FILE.exists() else None
SESSION_TTL      = 86400 * 7       # 7 days
PIN_HASH         = os.environ["DOJO_PIN_HASH"]
PIN_SALT         = 'dojo-musashi-2026'
MAX_BATCH        = 10              # Hard cap per batch
HOST             = '127.0.0.1'
PORT             = 8090

# OpenRouter API key — reuse existing dojo key from ~/.openclaw/.env
# Falls back to dedicated .openrouter_key file or env var
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')
if not OPENROUTER_KEY:
    _dojo_env = Path('/home/jarvis/.openclaw/.env')
    if _dojo_env.exists():
        for _line in _dojo_env.read_text().splitlines():
            if _line.startswith('OPENROUTER_API_KEY='):
                OPENROUTER_KEY = _line.split('=', 1)[1].strip().strip('"').strip("'")
                break
if not OPENROUTER_KEY:
    _local_key = APP_DIR / '.openrouter_key'
    if _local_key.exists():
        OPENROUTER_KEY = _local_key.read_text().strip()
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
DRAFT_MODEL    = 'deepseek/deepseek-v4-pro'

# SendGrid API key — from .env file (replaces msmtp for outbound)
SENDGRID_KEY = os.environ.get('SENDGRID_API_KEY', '')
if not SENDGRID_KEY:
    _env = APP_DIR / '.env'
    if _env.exists():
        for _line in _env.read_text().splitlines():
            if "SENDGRID" in _line and "=" in _line:
                SENDGRID_KEY = _line.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39))
SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send'

logging.basicConfig(level=logging.INFO, format='%(asctime)s [leadgen] %(message)s')
log = logging.getLogger('leadgen')

app = Flask(__name__)
app.secret_key = AUTH_SECRET or os.urandom(32).hex()

# ── CORS ─────────────────────────────────────────────────────────────────
@app.after_request
def add_cors(response):
    """Allow public POST from SpaceCoastMarketingAgency sites for lead capture."""
    origin = request.headers.get('Origin', '')
    allowed = (
        'https://spacecoastmarketingagency.com',
        'https://www.spacecoastmarketingagency.com',
        'https://command.spacecoastmarketing.co',
        'https://spacecoastmarketing.co',
        'https://presencify.co',
        'https://www.presencify.co',
        'http://localhost:3000',
        'http://localhost:8000',
    )
    if origin in allowed:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
    return response

# ── Database ────────────────────────────────────────────────────────────

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(str(DB_PATH))
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db:
        db.close()

def init_db():
    """Create tables if they don't exist."""
    db = sqlite3.connect(str(DB_PATH))
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS leads (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            biz         TEXT    NOT NULL,
            category    TEXT    NOT NULL,
            phone       TEXT    DEFAULT '',
            website     TEXT    DEFAULT '',
            status      TEXT    DEFAULT 'UNKNOWN',   -- NONE, FB, BAD, GOOD, UNKNOWN
            priority    TEXT    DEFAULT 'medium',     -- high, medium, low
            notes       TEXT    DEFAULT '',
            outreach    TEXT    DEFAULT 'not-contacted', -- not-contacted, emailed, called, meeting, won, lost
            contacted_at TEXT   DEFAULT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS outreach_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id     INTEGER NOT NULL,
            action      TEXT    NOT NULL,   -- drafted, approved, sent, rejected, bounced
            email_to    TEXT    DEFAULT '',
            email_subject TEXT  DEFAULT '',
            email_body  TEXT    DEFAULT '',
            result      TEXT    DEFAULT '', -- SMTP response or error
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (lead_id) REFERENCES leads(id)
        );
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_outreach ON leads(outreach);
        CREATE INDEX IF NOT EXISTS idx_log_lead ON outreach_log(lead_id);
        CREATE TABLE IF NOT EXISTS email_events (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            email        TEXT    NOT NULL,
            event_type   TEXT    NOT NULL,
            sg_event_id  TEXT    DEFAULT '',
            payload      TEXT    DEFAULT '{}',
            created_at   TEXT    DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
        CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
    """)
    db.commit()
    db.close()
    log.info("Database initialized")

# ── Auth ────────────────────────────────────────────────────────────────

def _make_token(client_ip):
    expires = int(_time.time()) + SESSION_TTL
    ip_prefix = '.'.join(client_ip.split('.')[:3])
    payload = f"{expires}:{ip_prefix}"
    sig = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{expires}:{sig}"

def _verify_token(token_str, client_ip):
    try:
        parts = token_str.split(':')
        if len(parts) != 2:
            return False
        expires, sig = int(parts[0]), parts[1]
        if _time.time() > expires:
            return False
        ip_prefix = '.'.join(client_ip.split('.')[:3])
        payload = f"{expires}:{ip_prefix}"
        expected = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        return hmac.compare_digest(sig, expected)
    except (ValueError, IndexError):
        return False

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('leadgen_token')
        client_ip = request.headers.get('X-Real-IP', request.remote_addr)
        if token and _verify_token(token, client_ip):
            return f(*args, **kwargs)
        # API requests return 401, page requests redirect to login
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Unauthorized'}), 401
        return redirect(url_for('login_page'))
    return decorated

# ── Routes: Auth ────────────────────────────────────────────────────────

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    pin = data.get('pin', '')
    hashed = hashlib.sha256((PIN_SALT + pin).encode()).hexdigest()
    if hashed == PIN_HASH:
        client_ip = request.headers.get('X-Real-IP', request.remote_addr)
        token = _make_token(client_ip)
        resp = jsonify({'ok': True})
        resp.set_cookie('leadgen_token', token, max_age=SESSION_TTL, httponly=True, secure=True, samesite='Lax')
        return resp
    return jsonify({'ok': False, 'error': 'Invalid PIN'}), 401

# ── Routes: Pages ───────────────────────────────────────────────────────

@app.route('/')
@login_required
def index():
    return render_template('index.html')

# ── Routes: API - Leads ─────────────────────────────────────────────────

@app.route('/api/leads')
@login_required
def api_leads():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM leads ORDER BY "
        "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/leads/<int:lead_id>/stage', methods=['PUT'])
@login_required
def api_update_stage(lead_id):
    data = request.get_json() or {}
    new_stage = data.get('outreach', '')
    valid_stages = ['not-contacted', 'emailed', 'called', 'meeting', 'won', 'lost']
    if new_stage not in valid_stages:
        return jsonify({'error': f'Invalid stage: {new_stage}'}), 400

    db = get_db()
    if new_stage in ('emailed', 'called', 'meeting'):
        db.execute(
            "UPDATE leads SET outreach=?, contacted_at=datetime('now') WHERE id=?",
            (new_stage, lead_id)
        )
    else:
        db.execute("UPDATE leads SET outreach=? WHERE id=?", (new_stage, lead_id))
    db.commit()
    return jsonify({'ok': True, 'outreach': new_stage})

# ── Routes: API - Email Drafting ────────────────────────────────────────

def build_draft_prompt(lead):
    """Build a DeepSeek prompt for personalized cold outreach email."""
    has_website = lead['website'] and lead['website'].strip()
    has_phone = lead['phone'] and lead['phone'].strip()
    website_line = f"Their website: {lead['website']}" if has_website else "They don't have a website."
    phone_line = f"Their phone: {lead['phone']}" if has_phone else ""

    return f"""Write a short, genuine cold outreach email from Chris Vega at Presencify (presencify.co) — a web design studio in Merritt Island, Florida. Presencify builds modern, fast websites for Brevard County small businesses.

BUSINESS:
Name: {lead['biz']}
Category: {lead['category']}
{website_line}
{phone_line}
Notes: {lead['notes']}

RULES:
- Keep it 4-6 sentences max. Short and punchy.
- Sound like a real person, not a template. No "I hope this email finds you well."
- Lead with something specific about THEIR business (use the name and category and notes).
- The pitch: fast, affordable websites for Brevard businesses. Mention a free mockup or audit offer.
- Sign as: Chris Vega, Presencify
- Never use brackets, placeholders, or [insert here].
- If they have a website, offer a free audit with specific observations.
- If they don't have a website, pitch a free mockup.

Return ONLY the email body text. No subject line, no markdown, no commentary."""


@app.route('/api/draft-emails', methods=['POST'])
@login_required
def api_draft_emails():
    """Draft personalized emails for selected leads. Capped at MAX_BATCH."""
    data = request.get_json() or {}
    lead_ids = data.get('lead_ids', [])
    if not lead_ids:
        # Default: pick up to MAX_BATCH highest-priority not-contacted leads
        db = get_db()
        rows = db.execute(
            "SELECT id FROM leads WHERE outreach='not-contacted' "
            "ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id "
            "LIMIT ?", (MAX_BATCH,)
        ).fetchall()
        lead_ids = [r['id'] for r in rows]
    else:
        lead_ids = lead_ids[:MAX_BATCH]

    if not lead_ids:
        return jsonify({'error': 'No leads to draft for'}), 400

    db = get_db()
    placeholders = ','.join('?' * len(lead_ids))
    leads = db.execute(f"SELECT * FROM leads WHERE id IN ({placeholders})", lead_ids).fetchall()

    drafts = []
    for lead in leads:
        lead_dict = dict(lead)
        prompt = build_draft_prompt(lead_dict)

        try:
            body = _call_deepseek(prompt)
        except Exception as e:
            log.error(f"DeepSeek call failed for lead {lead['id']}: {e}")
            body = _fallback_draft(lead_dict)

        # Generate a subject from the body
        subject = _extract_subject(body, lead_dict)

        # Log the draft
        db.execute(
            "INSERT INTO outreach_log (lead_id, action, email_subject, email_body) VALUES (?, 'drafted', ?, ?)",
            (lead['id'], subject, body)
        )
        db.commit()

        drafts.append({
            'lead_id': lead['id'],
            'biz': lead['biz'],
            'category': lead['category'],
            'phone': lead['phone'],
            'website': lead['website'],
            'email': lead['email'] if 'email' in lead.keys() else '',
            'status': lead['status'],
            'notes': lead['notes'],
            'subject': subject,
            'body': body,
        })

    return jsonify({'drafts': drafts, 'count': len(drafts)})

def _call_deepseek(prompt):
    """Call DeepSeek v4-pro via OpenRouter for email drafting."""
    if not OPENROUTER_KEY:
        raise Exception("No OpenRouter API key configured")

    resp = requests.post(
        OPENROUTER_URL,
        headers={
            'Authorization': f'Bearer {OPENROUTER_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': DRAFT_MODEL,
            'messages': [
                {'role': 'system', 'content': 'You are a direct, genuine cold outreach copywriter. Write like a real person, not a template. Short emails only.'},
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.7,
            'max_tokens': 400,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    content = data['choices'][0]['message'].get('content')
    if not content:
        raise Exception(f"DeepSeek returned empty content (finish_reason: {data['choices'][0].get('finish_reason', 'unknown')})")
    content = content.strip()
    # Strip any markdown code fences
    if content.startswith('```'):
        lines = content.split('\n')
        content = '\n'.join(lines[1:]) if len(lines) > 1 else content
        if content.endswith('```'):
            content = content[:-3]
    return content.strip()

def _fallback_draft(lead):
    """Fallback email when DeepSeek is unavailable."""
    fname = lead['biz'].split(' ')[0]
    has_web = lead.get('website') and lead['website'].strip()

    if has_web:
        return f"""Hey {fname},

I checked out {lead['website']} — noticed a few quick things that could help {lead['biz']} show up better in local searches and bring in more customers from Merritt Island.

I run Presencify, a small web design studio right here in Brevard. Happy to send over a free audit with specific suggestions — no strings attached.

Interested?

Chris Vega
Presencify.co"""
    else:
        return f"""Hey {fname},

Quick intro — I build websites for {lead['category'].lower()} businesses here in Merritt Island, and I noticed {lead['biz']} isn't online yet.

In 2026, most customers search before they call. I can put together a free mockup of what your site could look like — takes me about 20 minutes, zero obligation.

Want me to send it over?

Chris Vega
Presencify.co"""

def _extract_subject(body, lead):
    """Generate a short subject line from the email or context."""
    fname = lead['biz'].split(' ')[0]
    has_web = lead.get('website') and lead['website'].strip()

    if has_web:
        return f"{lead['biz']} — quick website observation, {fname}"
    else:
        return f"Quick intro — {lead['biz']} online presence"

# ── Routes: API - Send ──────────────────────────────────────────────────

@app.route('/api/send-email', methods=['POST'])
@login_required
def api_send_email():
    """Send an approved email via msmtp. Logs result."""
    data = request.get_json() or {}
    lead_id = data.get('lead_id')
    to_email = data.get('to_email', '')
    subject = data.get('subject', '')
    body = data.get('body', '')

    if not lead_id or not to_email or not body:
        return jsonify({'error': 'lead_id, to_email, and body are required'}), 400

    db = get_db()

    # Check batch limit — count emails sent in the last hour
    sent_count = db.execute(
        "SELECT COUNT(*) as cnt FROM outreach_log WHERE action='sent' "
        "AND created_at > datetime('now', '-1 hour')"
    ).fetchone()['cnt']

    if sent_count >= MAX_BATCH:
        return jsonify({'error': f'Batch limit reached ({MAX_BATCH} per hour). Wait before sending more.'}), 429

    # Build the full email for msmtp
    from_addr = 'chris@presencify.co'
    from_name = 'Chris Vega'
    email_text = f"From: {from_addr}\nTo: {to_email}\nSubject: {subject}\n\n{body}"

    # Try SendGrid first, fall back to msmtp
    send_error = None
    sent_via = None

    if SENDGRID_KEY:
        try:
            sg_resp = requests.post(
                SENDGRID_URL,
                headers={
                    'Authorization': f'Bearer {SENDGRID_KEY}',
                    'Content-Type': 'application/json',
                },
                json={
                    'personalizations': [{'to': [{'email': to_email}]}],
                    'from': {'email': from_addr, 'name': from_name},
                    'subject': subject,
                    'content': [{'type': 'text/plain', 'value': body}],
                    'tracking_settings': {
                        'open_tracking': {'enable': True},
                        'click_tracking': {'enable': True, 'enable_text': False},
                    },
                },
                timeout=15,
            )
            if sg_resp.status_code in (200, 201, 202):
                sent_via = 'sendgrid'
                log.info(f"Email sent via SendGrid to lead {lead_id} ({to_email})")
            else:
                send_error = f"SendGrid: {sg_resp.status_code} — {sg_resp.text[:200]}"
                log.warning(f"SendGrid failed for lead {lead_id}: {send_error}")
        except Exception as e:
            send_error = f"SendGrid error: {str(e)[:200]}"
            log.warning(f"SendGrid exception for lead {lead_id}: {e}")

    # Fall back to msmtp if SendGrid failed or isn't configured
    if not sent_via:
        try:
            result = subprocess.run(
                ['msmtp', '-a', 'presencify', to_email],
                input=email_text,
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode == 0:
                sent_via = 'msmtp'
                log.info(f"Email sent via msmtp to lead {lead_id} ({to_email})")
            else:
                send_error = send_error or f"msmtp: {result.stderr.strip()[:200]}"
        except subprocess.TimeoutExpired:
            send_error = send_error or 'msmtp: timeout'
        except FileNotFoundError:
            send_error = send_error or 'msmtp: not installed'

    if sent_via:
        db.execute(
            "INSERT INTO outreach_log (lead_id, action, email_to, email_subject, email_body, result) VALUES (?, 'sent', ?, ?, ?, ?)",
            (lead_id, to_email, subject, body, f'OK via {sent_via}')
        )
        db.execute("UPDATE leads SET outreach='emailed', contacted_at=datetime('now') WHERE id=?", (lead_id,))
        db.commit()
        log.info(f"Email sent to lead {lead_id} ({to_email}) via {sent_via}")
        return jsonify({'ok': True, 'message': f'Email sent successfully via {sent_via}', 'via': sent_via})
    else:
        error_msg = send_error or 'No sending method available'
        db.execute(
            "INSERT INTO outreach_log (lead_id, action, email_to, email_subject, email_body, result) VALUES (?, 'bounced', ?, ?, ?, ?)",
            (lead_id, to_email, subject, body, error_msg[:500])
        )
        db.commit()
        log.error(f"Send failed for lead {lead_id}: {error_msg}")
        return jsonify({'ok': False, 'error': error_msg[:200]}), 500

# ── Routes: API - Reject ────────────────────────────────────────────────

@app.route('/api/reject-draft', methods=['POST'])
@login_required
def api_reject_draft():
    """Log a rejected draft so we know it needs a rewrite."""
    data = request.get_json() or {}
    lead_id = data.get('lead_id')

    if not lead_id:
        return jsonify({'error': 'lead_id required'}), 400

    db = get_db()
    db.execute(
        "INSERT INTO outreach_log (lead_id, action, result) VALUES (?, 'rejected', 'User rejected draft')",
        (lead_id,)
    )
    db.commit()
    return jsonify({'ok': True})

# ── Routes: SendGrid Webhook ─────────────────────────────────────────

@app.route('/webhook/sendgrid', methods=['POST'])
def webhook_sendgrid():
    """Receive SendGrid event notifications for open/click/bounce/spam tracking."""
    events = request.get_json(force=True) or []
    if isinstance(events, dict):
        # SendGrid sometimes sends a single event object instead of array
        events = [events]
    db = get_db()
    for ev in events:
        email = ev.get('email', '')
        event_type = ev.get('event', '')
        sg_event_id = ev.get('sg_event_id', '')
        if not email or not event_type:
            continue
        db.execute(
            "INSERT INTO email_events (email, event_type, sg_event_id, payload, created_at) "
            "VALUES (?, ?, ?, ?, datetime('now'))",
            (email, event_type, sg_event_id, json.dumps(ev))
        )
        # If bounced/spam/unsubscribed, flag the lead
        if event_type in ('bounce', 'dropped', 'spamreport', 'unsubscribed'):
            db.execute(
                "UPDATE leads SET outreach=? WHERE id IN "
                "(SELECT lead_id FROM outreach_log WHERE email_to=? ORDER BY id DESC LIMIT 1)",
                (f'flagged_{event_type}', email)
            )
    db.commit()
    return '', 200

# ── Routes: API - Sent ──────────────────────────────────────────────

@app.route('/api/sent')
@login_required
def api_sent():
    """Return all sent emails with event stats for the Sent tab."""
    db = get_db()
    rows = db.execute("""
        SELECT
            l.id AS lead_id,
            l.biz,
            l.category,
            ol.email_subject,
            ol.email_to,
            ol.created_at AS sent_at,
            ol.result,
            (SELECT COUNT(*) FROM email_events WHERE email=ol.email_to AND event_type='open') AS opens,
            (SELECT COUNT(*) FROM email_events WHERE email=ol.email_to AND event_type='click') AS clicks,
            (SELECT COUNT(*) FROM email_events WHERE email=ol.email_to AND event_type IN ('bounce','dropped')) AS bounces,
            (SELECT COUNT(*) FROM email_events WHERE email=ol.email_to AND event_type='spamreport') AS spam_reports
        FROM outreach_log ol
        JOIN leads l ON l.id = ol.lead_id
        WHERE ol.action = 'sent'
        ORDER BY ol.created_at DESC
        LIMIT 100
    """).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/sent/<email>/events')
@login_required
def api_sent_events(email):
    """Return all event history for a specific sent email address."""
    db = get_db()
    rows = db.execute(
        "SELECT event_type, sg_event_id, payload, created_at "
        "FROM email_events WHERE email=? ORDER BY created_at DESC",
        (email,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])

# ── Routes: API - Stats ─────────────────────────────────────────────────

@app.route('/api/stats')
@login_required
def api_stats():
    db = get_db()
    total = db.execute("SELECT COUNT(*) as cnt FROM leads").fetchone()['cnt']
    contacted = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE outreach != 'not-contacted'").fetchone()['cnt']
    meetings = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE outreach IN ('meeting', 'won')").fetchone()['cnt']
    sent_today = db.execute(
        "SELECT COUNT(*) as cnt FROM outreach_log WHERE action='sent' AND date(created_at)=date('now')"
    ).fetchone()['cnt']

    total_sent = db.execute("SELECT COUNT(*) as cnt FROM outreach_log WHERE action='sent'").fetchone()['cnt']
    total_opens = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type='open'").fetchone()['cnt']
    total_clicks = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type='click'").fetchone()['cnt']
    total_bounces = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type IN ('bounce','dropped')").fetchone()['cnt']
    total_spam = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type='spamreport'").fetchone()['cnt']

    return jsonify({
        'total': total,
        'contacted': contacted,
        'meetings': meetings,
        'sent_today': sent_today,
        'total_sent': total_sent,
        'opens': total_opens,
        'clicks': total_clicks,
        'bounces': total_bounces,
        'spam': total_spam,
        'open_rate': round((total_opens / total_sent * 100), 1) if total_sent > 0 else 0,
    })

# ── Routes: API - Import Leads ──────────────────────────────────────────

@app.route('/api/import-leads', methods=['POST'])
@login_required
def api_import_leads():
    """One-shot import of leads from the hardcoded list. Idempotent (checks biz name)."""
    from lead_data import LEADS as LEAD_DATA
    db = get_db()
    imported = 0
    skipped = 0
    for lead in LEAD_DATA:
        existing = db.execute("SELECT id FROM leads WHERE biz=?", (lead['biz'],)).fetchone()
        if existing:
            skipped += 1
            continue
        db.execute(
            "INSERT INTO leads (biz, category, phone, website, status, priority, notes) VALUES (?,?,?,?,?,?,?)",
            (lead['biz'], lead['cat'], lead.get('phone', ''), lead.get('web', ''),
             lead.get('status', 'UNKNOWN'), lead.get('priority', 'medium'), lead.get('notes', ''))
        )
        imported += 1
    db.commit()
    return jsonify({'imported': imported, 'skipped': skipped, 'total': imported + skipped})

# ── Routes: V3 LEAD ACQUISITION ENGINE ─────────────────────────────────

@app.route('/api/v3/enrich', methods=['POST'])
@login_required
def api_v3_enrich():
    """Run enrichment engine on leads. Accepts lead_ids in body, or enriches all."""
    from enrichment_engine import enrich_batch
    data = request.get_json() or {}
    lead_ids = data.get('lead_ids', None)
    scrape = data.get('scrape', True)

    db = get_db()
    result = enrich_batch(db, lead_ids=lead_ids, scrape_websites=scrape)
    return jsonify(result)


@app.route('/api/v3/score', methods=['POST'])
@login_required
def api_v3_score():
    """Score leads with v3 engine and persist scores to DB."""
    from scoring_engine import batch_score
    data = request.get_json() or {}
    lead_ids = data.get('lead_ids', None)

    db = get_db()
    scored = batch_score(db, lead_ids=lead_ids)

    # Persist scores to DB
    for s in scored:
        db.execute(
            """UPDATE leads SET
                opportunity_score=?, revenue_opportunity_score=?,
                close_probability=?, contactability_score=?,
                priority_score=?, recommended_package=?,
                why_this_lead=?
            WHERE id=?""",
            (s.opportunity_score, s.revenue_opportunity_score,
             s.close_probability, s.contactability_score,
             s.priority_score, s.recommended_package,
             s.why_this_lead, s.lead_id)
        )
    db.commit()

    return jsonify({
        'scored': len(scored),
        'qualified': sum(1 for s in scored if not s.is_rejected),
        'rejected': sum(1 for s in scored if s.is_rejected),
        'top': [{
            'lead_id': s.lead_id, 'biz': s.biz, 'priority_score': s.priority_score,
            'recommended_package': s.recommended_package, 'why': s.why_this_lead,
        } for s in scored[:10] if not s.is_rejected],
    })


@app.route('/api/v3/leads')
@login_required
def api_v3_leads():
    """Return leads with v3 scoring data, sorted by priority descending."""
    db = get_db()
    rows = db.execute(
        """SELECT * FROM leads
           WHERE priority_score > 0 OR outreach='not-contacted'
           ORDER BY priority_score DESC, id
           LIMIT 100"""
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/v3/draft', methods=['POST'])
@login_required
def api_v3_draft():
    """Draft v3 personalized emails using enrichment and audit data."""
    from v3_outreach import draft_v3_emails
    data = request.get_json() or {}
    lead_ids = data.get('lead_ids', None)
    max_batch = min(data.get('max_batch', 10), 10)

    db = get_db()
    drafts = draft_v3_emails(db, lead_ids=lead_ids, max_batch=max_batch)

    # Log drafts to outreach_log
    for d in drafts:
        db.execute(
            "INSERT INTO outreach_log (lead_id, action, email_subject, email_body) VALUES (?, 'drafted', ?, ?)",
            (d['lead_id'], d['subject'], d['body'])
        )
    db.commit()

    return jsonify({'drafts': drafts, 'count': len(drafts)})


@app.route('/api/v3/briefing')
@login_required
def api_v3_briefing():
    """Generate TOP 20 morning briefing."""
    from v3_outreach import generate_briefing
    db = get_db()
    briefing = generate_briefing(db)
    return jsonify({'briefing': briefing, 'format': 'markdown'})


@app.route('/api/v3/audit/<int:lead_id>')
@login_required
def api_v3_audit(lead_id):
    """Generate 3-finding audit for a single lead."""
    from v3_outreach import generate_audit
    import json as _json

    db = get_db()
    lead = db.execute("SELECT * FROM leads WHERE id=?", (lead_id,)).fetchone()
    if not lead:
        return jsonify({'error': 'Lead not found'}), 404

    lead_dict = dict(lead)
    enrichment = {}
    if lead_dict.get('enrichment_json'):
        try:
            enrichment = _json.loads(lead_dict['enrichment_json'])
        except (_json.JSONDecodeError, TypeError):
            pass

    findings = generate_audit(lead_dict, enrichment)

    # Store audit
    db.execute(
        "UPDATE leads SET audit_json=? WHERE id=?",
        (_json.dumps(findings), lead_id)
    )
    db.commit()

    return jsonify({
        'lead_id': lead_id,
        'biz': lead_dict['biz'],
        'findings': findings,
    })


@app.route('/api/v3/stats')
@login_required
def api_v3_stats():
    """v3-aware stats dashboard."""
    db = get_db()
    total = db.execute("SELECT COUNT(*) as cnt FROM leads").fetchone()['cnt']
    scored = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE priority_score > 0").fetchone()['cnt']
    qualified = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE priority_score >= 15").fetchone()['cnt']
    high_priority = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE priority_score >= 80").fetchone()['cnt']
    meetings = db.execute("SELECT COUNT(*) as cnt FROM leads WHERE outreach IN ('meeting', 'won')").fetchone()['cnt']
    sent_today = db.execute(
        "SELECT COUNT(*) as cnt FROM outreach_log WHERE action='sent' AND date(created_at)=date('now')"
    ).fetchone()['cnt']

    total_sent = db.execute("SELECT COUNT(*) as cnt FROM outreach_log WHERE action='sent'").fetchone()['cnt']
    total_opens = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type='open'").fetchone()['cnt']
    total_clicks = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type='click'").fetchone()['cnt']
    total_bounces = db.execute("SELECT COUNT(DISTINCT email) as cnt FROM email_events WHERE event_type IN ('bounce','dropped')").fetchone()['cnt']

    return jsonify({
        'total': total,
        'scored': scored,
        'qualified': qualified,
        'high_priority': high_priority,
        'meetings': meetings,
        'sent_today': sent_today,
        'total_sent': total_sent,
        'opens': total_opens,
        'clicks': total_clicks,
        'bounces': total_bounces,
        'open_rate': round((total_opens / total_sent * 100), 1) if total_sent > 0 else 0,
    })

# ── Routes: Public Lead Capture ────────────────────────────────────────

LEADS_CSV = Path('/home/jarvis/presencify/leads/website-inquiries.csv')

@app.route('/api/capture-lead', methods=['POST', 'OPTIONS'])
def capture_lead():
    """Public endpoint: receives lead capture from presencify.co form."""
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data = request.get_json(force=True)
        email = (data.get('email') or '').strip().lower()
        if not email or '@' not in email:
            return jsonify({'ok': False, 'error': 'Valid email required'}), 400

        LEADS_CSV.parent.mkdir(parents=True, exist_ok=True)
        first_write = not LEADS_CSV.exists()
        with open(LEADS_CSV, 'a', newline='') as f:
            import csv
            w = csv.writer(f)
            if first_write:
                w.writerow(['email', 'industry', 'city', 'website_url', 'source', 'timestamp'])
            w.writerow([
                email,
                data.get('industry', ''),
                data.get('city', ''),
                data.get('website_url', ''),
                'website-capture',
                datetime.now(timezone.utc).isoformat()
            ])
        log.info(f"Lead captured: {email}")
        # ── Also insert into leads table ──
        try:
            db = sqlite3.connect(str(DB_PATH))
            db.row_factory = sqlite3.Row
            db.execute("""
                INSERT INTO leads (biz, category, phone, website, status, priority, notes, outreach)
                VALUES (?, ?, ?, ?, 'NEW', 'medium', 'Website lead capture via audit tool', 'not-contacted')
            """, (
                email,
                data.get('industry', ''),
                '',
                data.get('website_url', ''),
            ))
            db.commit()
            db.close()
            log.info(f"Lead also saved to CRM: {email}")
        except Exception as db_err:
            log.warning(f"CRM insert failed (non-fatal): {db_err}")
        return jsonify({'ok': True, 'message': 'Got it! Your audit results are on the way.'})
    except Exception as e:
        log.error(f"Lead capture failed: {e}")
        return jsonify({'ok': False, 'error': 'Server error'}), 500


@app.route('/health')
def health():
    return jsonify({'ok': True, 'service': 'leadgen'})

# ── Main ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if not AUTH_SECRET:
        log.error("AUTH_SECRET not loaded — ~/.dojo_auth_secret must exist")
        raise SystemExit(1)

    init_db()
    log.info(f"Leadgen starting on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False, threaded=True)