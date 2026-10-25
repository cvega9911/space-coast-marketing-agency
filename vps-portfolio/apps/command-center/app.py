"""
Space Coast Marketing — Command Center Backend
Flask + SQLite CRM with pipeline, cadence tracking, interaction logging.
Space station themed. No Presencify branding — Space Coast Marketing only.
"""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, make_response, g

app = Flask(__name__)
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "command.db"

# ── Config ──────────────────────────────────────────────
PIN = os.environ["DOJO_PIN"]
SECRET = os.environ.get("DOJO_SECRET", secrets.token_hex(32))
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 60
RATE_WINDOW = 60

# ── Rate limiting ───────────────────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
_lock_store: dict[str, float] = {}


def _cleanup_store():
    now = time.time()
    for ip in list(_rate_store):
        _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_WINDOW]
        if not _rate_store[ip]:
            del _rate_store[ip]
    for ip in list(_lock_store):
        if now >= _lock_store[ip]:
            del _lock_store[ip]


def _hmac_sign(value: str) -> str:
    return hmac.new(SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def _verify_session() -> bool:
    cookie = request.cookies.get("dojo_auth")
    if not cookie:
        return False
    try:
        # Format: timestamp:nonce.signature
        token, sig = cookie.rsplit(".", 1)
        if not hmac.compare_digest(sig, _hmac_sign(token)):
            return False
        ts = int(token.split(":")[0])
        if time.time() - ts > 86400:
            return False
        return True
    except (ValueError, IndexError):
        return False


def _require_auth():
    """Decorator alternative — check auth before routes that need it."""
    if not _verify_session():
        return jsonify({"error": "unauthorized"}), 401
    return None


# ── Database ─────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(str(DB_PATH))
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db:
        db.close()


def init_db():
    db = sqlite3.connect(str(DB_PATH))
    db.executescript("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            company TEXT DEFAULT '',
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            status TEXT DEFAULT 'lead',           -- lead, contacted, proposal, won, lost
            deal_value REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            stage_updated_at TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            type TEXT NOT NULL,                   -- email, call, meeting, note
            direction TEXT DEFAULT 'outbound',    -- outbound, inbound
            notes TEXT DEFAULT '',
            outcome TEXT DEFAULT '',              -- positive, neutral, negative, no_response
            scheduled_date TEXT,
            completed_date TEXT,
            status TEXT DEFAULT 'pending',        -- pending, completed, skipped
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS cadence_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            step_number INTEGER NOT NULL,
            type TEXT NOT NULL,                   -- email, call, meeting
            day_offset INTEGER NOT NULL,           -- days from deal start
            scheduled_date TEXT,
            status TEXT DEFAULT 'pending',        -- pending, completed, skipped
            notes TEXT DEFAULT '',
            interaction_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS pipeline_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            from_stage TEXT,
            to_stage TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions(client_id);
        CREATE INDEX IF NOT EXISTS idx_cadence_client ON cadence_steps(client_id);
        CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

        CREATE TABLE IF NOT EXISTS lead_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL UNIQUE,
            notes TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS web_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            company TEXT DEFAULT '',
            message TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            source TEXT DEFAULT 'website',
            source_url TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            client_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
        );
    """)
    db.commit()
    # Migrations — add columns that may not exist in older DBs
    _migrate_db(db)
    db.close()


def _migrate_db(db):
    """Add columns that may be missing from older schema versions."""
    migrations = [
        ("cadence_steps", "notes", "TEXT DEFAULT ''"),
        ("web_leads", "notes", "TEXT DEFAULT ''"),
    ]
    for table, col, col_type in migrations:
        try:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists


# ── Auth Routes ─────────────────────────────────────────

@app.route("/auth", methods=["POST"])
def auth():
    _cleanup_store()
    ip = request.remote_addr or "unknown"

    if ip in _lock_store and time.time() < _lock_store[ip]:
        remaining = int(_lock_store[ip] - time.time())
        return jsonify({"ok": False, "error": "locked", "locked_seconds": remaining}), 429

    if _verify_session():
        return jsonify({"ok": True})

    data = request.get_json(silent=True) or {}
    submitted_pin = str(data.get("pin", ""))

    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_WINDOW]
    attempts = len(_rate_store[ip])

    if submitted_pin == PIN:
        _rate_store.pop(ip, None)
        _lock_store.pop(ip, None)
        token = f"{int(now)}:{secrets.token_hex(8)}"
        sig = _hmac_sign(token)
        cookie_value = f"{token}.{sig}"
        resp = make_response(jsonify({"ok": True}))
        resp.set_cookie("dojo_auth", cookie_value, max_age=86400,
                        httponly=True, secure=True, samesite="Lax")
        return resp

    _rate_store[ip].append(now)
    attempts += 1
    remaining = MAX_ATTEMPTS - attempts

    if remaining <= 0:
        _lock_store[ip] = now + LOCKOUT_SECONDS
        _rate_store.pop(ip, None)
        return jsonify({"ok": False, "error": "locked", "locked_seconds": LOCKOUT_SECONDS}), 429

    return jsonify({"ok": False, "remaining": remaining}), 401


@app.route("/health")
def health():
    return jsonify({"status": "ok", "station": "Space Coast Marketing Command"})


# ── Client Routes ───────────────────────────────────────

def _client_row(row):
    """Convert sqlite3.Row to dict."""
    return dict(row) if row else None


def _clients_list(rows):
    return [dict(r) for r in rows]


@app.route("/api/clients", methods=["GET"])
def list_clients():
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    status_filter = request.args.get("status", "")
    if status_filter:
        rows = db.execute("SELECT * FROM clients WHERE status=? ORDER BY updated_at DESC", (status_filter,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM clients ORDER BY updated_at DESC").fetchall()
    return jsonify(_clients_list(rows))


@app.route("/api/clients", methods=["POST"])
def create_client():
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    data = request.get_json(force=True)
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400

    cur = db.execute(
        """INSERT INTO clients (name, company, email, phone, status, deal_value, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, data.get("company", ""), data.get("email", ""), data.get("phone", ""),
         data.get("status", "lead"), data.get("deal_value", 0), data.get("notes", ""))
    )
    db.commit()

    # Log pipeline history
    db.execute("INSERT INTO pipeline_history (client_id, from_stage, to_stage) VALUES (?, NULL, 'lead')", (cur.lastrowid,))
    db.commit()

    # Auto-generate cadence
    _generate_cadence(db, cur.lastrowid)

    row = db.execute("SELECT * FROM clients WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(_client_row(row)), 201


@app.route("/api/clients/<int:client_id>", methods=["GET"])
def get_client(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    row = db.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404

    client = _client_row(row)

    # Attach interactions
    interactions = db.execute(
        "SELECT * FROM interactions WHERE client_id=? ORDER BY scheduled_date DESC, created_at DESC", (client_id,)
    ).fetchall()
    client["interactions"] = _clients_list(interactions)

    # Attach cadence
    cadence = db.execute(
        "SELECT * FROM cadence_steps WHERE client_id=? ORDER BY day_offset ASC", (client_id,)
    ).fetchall()
    client["cadence"] = _clients_list(cadence)

    # Attach pipeline history
    history = db.execute(
        "SELECT * FROM pipeline_history WHERE client_id=? ORDER BY created_at DESC", (client_id,)
    ).fetchall()
    client["pipeline_history"] = _clients_list(history)

    return jsonify(client)


@app.route("/api/clients/<int:client_id>", methods=["PATCH"])
def update_client(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    data = request.get_json(force=True)

    # Check stage change for history
    old = db.execute("SELECT status FROM clients WHERE id=?", (client_id,)).fetchone()
    if not old:
        return jsonify({"error": "not found"}), 404

    fields = []
    values = []
    for key in ["name", "company", "email", "phone", "status", "deal_value", "notes"]:
        if key in data:
            fields.append(f"{key}=?")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "no fields to update"}), 400

    fields.append("updated_at=datetime('now')")
    values.append(client_id)
    db.execute(f"UPDATE clients SET {', '.join(fields)} WHERE id=?", values)

    # Stage change logging
    if "status" in data and data["status"] != old["status"]:
        db.execute(
            "INSERT INTO pipeline_history (client_id, from_stage, to_stage, notes) VALUES (?, ?, ?, ?)",
            (client_id, old["status"], data["status"], data.get("stage_note", ""))
        )

    db.commit()
    row = db.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
    return jsonify(_client_row(row))


@app.route("/api/clients/<int:client_id>", methods=["DELETE"])
def delete_client(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    db.execute("DELETE FROM clients WHERE id=?", (client_id,))
    db.commit()
    return jsonify({"ok": True})


# ── Interaction Routes ──────────────────────────────────

@app.route("/api/clients/<int:client_id>/interactions", methods=["POST"])
def log_interaction(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    data = request.get_json(force=True)

    cur = db.execute(
        """INSERT INTO interactions (client_id, type, direction, notes, outcome, scheduled_date, completed_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (client_id, data.get("type", "note"), data.get("direction", "outbound"),
         data.get("notes", ""), data.get("outcome", ""),
         data.get("scheduled_date"), data.get("completed_date", datetime.now().isoformat()),
         data.get("status", "completed"))
    )

    # If there's a matching cadence step, mark it done
    if data.get("cadence_step_id"):
        db.execute(
            "UPDATE cadence_steps SET status='completed', interaction_id=? WHERE id=? AND client_id=?",
            (cur.lastrowid, data["cadence_step_id"], client_id)
        )

    db.execute("UPDATE clients SET updated_at=datetime('now') WHERE id=?", (client_id,))
    db.commit()

    row = db.execute("SELECT * FROM interactions WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(_client_row(row)), 201

@app.route("/api/clients/<int:client_id>/interactions", methods=["GET"])
def get_interactions(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    rows = db.execute(
        "SELECT * FROM interactions WHERE client_id=? ORDER BY completed_date DESC, created_at DESC", 
        (client_id,)
    ).fetchall()
    return jsonify(_clients_list(rows))


# ── Pipeline Stats ──────────────────────────────────────

@app.route("/api/pipeline", methods=["GET"])
def pipeline_stats():
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()

    # Count by stage
    stages = db.execute("""
        SELECT status, COUNT(*) as count, SUM(deal_value) as total_value
        FROM clients
        GROUP BY status
    """).fetchall()

    # Revenue
    won = db.execute("SELECT SUM(deal_value) as total FROM clients WHERE status='won'").fetchone()
    total_pipeline = db.execute("SELECT SUM(deal_value) as total FROM clients WHERE status NOT IN ('won','lost')").fetchone()

    # Funnel
    funnel = {
        "lead": db.execute("SELECT COUNT(*) FROM clients WHERE status='lead'").fetchone()[0],
        "contacted": db.execute("SELECT COUNT(*) FROM clients WHERE status='contacted'").fetchone()[0],
        "proposal": db.execute("SELECT COUNT(*) FROM clients WHERE status='proposal'").fetchone()[0],
        "won": db.execute("SELECT COUNT(*) FROM clients WHERE status='won'").fetchone()[0],
        "lost": db.execute("SELECT COUNT(*) FROM clients WHERE status='lost'").fetchone()[0],
    }

    # Upcoming cadence
    today = datetime.now().strftime("%Y-%m-%d")
    upcoming = db.execute("""
        SELECT cs.*, c.name as client_name, c.company as client_company
        FROM cadence_steps cs
        JOIN clients c ON cs.client_id = c.id
        WHERE cs.status='pending' AND cs.scheduled_date >= ?
        ORDER BY cs.scheduled_date ASC
        LIMIT 10
    """, (today,)).fetchall()

    return jsonify({
        "stages": [dict(r) for r in stages],
        "revenue_won": won["total"] or 0,
        "pipeline_value": total_pipeline["total"] or 0,
        "funnel": funnel,
        "upcoming_cadence": [dict(r) for r in upcoming],
    })


# ── Cadence Engine ──────────────────────────────────────

def _generate_cadence(db, client_id):
    """Generate a 12-step alternating cadence starting from today."""
    today = datetime.now()
    cadence_pattern = [
        (1, "email", 1),     # Day 1: Email
        (2, "call", 3),      # Day 3: Call
        (3, "email", 5),     # Day 5: Email
        (4, "call", 7),      # Day 7: Call
        (5, "email", 9),     # Day 9: Email
        (6, "call", 11),     # Day 11: Call
        (7, "email", 13),    # Day 13: Email
        (8, "call", 15),     # Day 15: Call
        (9, "email", 17),    # Day 17: Email
        (10, "call", 19),    # Day 19: Call
        (11, "email", 21),   # Day 21: Email
        (12, "call", 23),    # Day 23: Call
    ]
    for step_num, ctype, day_offset in cadence_pattern:
        scheduled = today + timedelta(days=day_offset)
        db.execute(
            "INSERT INTO cadence_steps (client_id, step_number, type, day_offset, scheduled_date) VALUES (?, ?, ?, ?, ?)",
            (client_id, step_num, ctype, day_offset, scheduled.strftime("%Y-%m-%d"))
        )


@app.route("/api/clients/<int:client_id>/cadence/reset", methods=["POST"])
def reset_cadence(client_id):
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    db.execute("DELETE FROM cadence_steps WHERE client_id=?", (client_id,))
    _generate_cadence(db, client_id)
    db.commit()
    rows = db.execute("SELECT * FROM cadence_steps WHERE client_id=? ORDER BY day_offset", (client_id,)).fetchall()
    return jsonify(_clients_list(rows))


# ── Agent Status ────────────────────────────────────────

@app.route("/api/agents", methods=["GET"])
def agent_status():
    """Return current agent status (bridged from dojo or cached)."""
    # For now: static snapshot matching the dojo dashboard
    return jsonify({
        "agents": [
            {"id": "socrates", "name": "SOCRATES", "role": "Co-Foreman — Intelligence & Learning",
             "state": "idle", "color": "#c8e8ff", "station": "command"},
            {"id": "amaterasu", "name": "AMATERASU", "role": "Solar Activation — Outreach & First Dollar",
             "state": "idle", "color": "#ffaa44", "station": "command"},
            {"id": "tengu", "name": "TENGU", "role": "Trend Oracle — Future Intelligence",
             "state": "idle", "color": "#00e5ff", "station": "roaming"},
            {"id": "kage", "name": "KAGE", "role": "Shadow — Intelligence & Research",
             "state": "idle", "color": "#3c8cff", "station": "roaming"},
            {"id": "prometheus", "name": "PROMETHEUS", "role": "SEO/AEO Fulfillment — Fire-Bringer",
             "state": "idle", "color": "#ff6600", "station": "command"},
            {"id": "daedalus", "name": "DAEDALUS", "role": "Builder — Development & Deployment",
             "state": "idle", "color": "#ffd700", "station": "command"},
        ]
    })


# ── Static Files ────────────────────────────────────────

NIGHTLY_DIR = Path("/home/jarvis/nightly-builds")
DELIVERABLES_DIR = Path("/home/jarvis/space-command-deliverables")


@app.route("/nightly/<date>/<path:filename>")
def serve_nightly_file(date, filename):
    """Serve nightly build files — HTML, CSS, JS."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    return send_from_directory(str(NIGHTLY_DIR / date), filename)

@app.route("/")
def index():
    return send_from_directory(str(BASE_DIR / "static"), "command.html")


@app.route("/deliverables/")
@app.route("/deliverables/<path:filename>")
def serve_deliverables(filename="index.html"):
    return send_from_directory(str(DELIVERABLES_DIR), filename)


# ── Leadgen Integration ─────────────────────────────────

LEADGEN_DB = Path("/home/jarvis/presencify/leadgen/leadgen.db")


@app.route("/api/leadgen/stats")
def leadgen_stats():
    """Pull consolidated stats from leadgen DB."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    try:
        import sqlite3
        ldb = sqlite3.connect(str(LEADGEN_DB))
        ldb.row_factory = sqlite3.Row

        total = ldb.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        by_status = ldb.execute(
            "SELECT outreach as status, COUNT(*) as count FROM leads GROUP BY outreach"
        ).fetchall()
        by_priority = ldb.execute(
            "SELECT priority, COUNT(*) as count FROM leads GROUP BY priority"
        ).fetchall()
        by_category = ldb.execute(
            "SELECT category, COUNT(*) as count FROM leads GROUP BY category ORDER BY count DESC"
        ).fetchall()
        emails_sent = ldb.execute(
            "SELECT COUNT(*) FROM outreach_log WHERE action='email_sent'"
        ).fetchone()[0]
        emails_opened = ldb.execute(
            "SELECT COUNT(DISTINCT email) FROM email_events WHERE event_type='open'"
        ).fetchone()[0]

        # Recent leads
        recent = ldb.execute(
            "SELECT id, biz, category, phone, website, status, priority, outreach, opportunity_score, "
            "revenue_opportunity_score, created_at, email "
            "FROM leads ORDER BY created_at DESC LIMIT 20"
        ).fetchall()

        ldb.close()

        return jsonify({
            "total_leads": total,
            "emails_sent": emails_sent,
            "emails_opened": emails_opened,
            "open_rate": round(emails_opened / max(emails_sent, 1) * 100, 1),
            "by_status": [dict(r) for r in by_status],
            "by_priority": [dict(r) for r in by_priority],
            "by_category": [dict(r) for r in by_category],
            "recent": [dict(r) for r in recent],
        })
    except Exception as e:
        return jsonify({"error": str(e), "total_leads": 0}), 500


@app.route("/api/leadgen/leads")
def leadgen_leads():
    """Pull lead list from leadgen DB."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    try:
        import sqlite3
        ldb = sqlite3.connect(str(LEADGEN_DB))
        ldb.row_factory = sqlite3.Row

        status = request.args.get("status", "")
        limit = min(int(request.args.get("limit", 50)), 200)

        if status:
            rows = ldb.execute(
                "SELECT * FROM leads WHERE outreach=? ORDER BY created_at DESC LIMIT ?",
                (status, limit)
            ).fetchall()
        else:
            rows = ldb.execute(
                "SELECT * FROM leads ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()

        ldb.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/leadgen/notes/<int:lead_id>", methods=["GET", "POST"])
def leadgen_notes(lead_id):
    """Get or save notes for a lead."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    if request.method == "GET":
        row = db.execute("SELECT notes FROM lead_notes WHERE lead_id=?", (lead_id,)).fetchone()
        return jsonify({"lead_id": lead_id, "notes": row["notes"] if row else ""})
    else:
        data = request.get_json(force=True)
        notes = data.get("notes", "")
        db.execute(
            "INSERT INTO lead_notes (lead_id, notes, updated_at) VALUES (?, ?, datetime('now')) "
            "ON CONFLICT(lead_id) DO UPDATE SET notes=excluded.notes, updated_at=datetime('now')",
            (lead_id, notes)
        )
        db.commit()
        return jsonify({"ok": True, "lead_id": lead_id})


# ── CORS Support (for website form POSTs) ──────────────

@app.after_request
def add_cors(response):
    origin = request.headers.get('Origin', '')
    if origin in (
        'https://spacecoastmarketingagency.com',
        'https://www.spacecoastmarketingagency.com',
        'https://presencify.co',
        'https://www.presencify.co',
        'https://spacecoastmarketing.co',
        'https://www.spacecoastmarketing.co',
    ):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Max-Age'] = '86400'
    return response


# ── Web Leads (Public Form Capture) ────────────────────

@app.route("/api/web-lead", methods=["POST", "OPTIONS"])
def capture_web_lead():
    """Public endpoint — no auth. Receives form submissions from marketing site."""
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    company = (data.get("company") or "").strip()
    message = (data.get("message") or "").strip()
    source = (data.get("source") or "website").strip()
    source_url = (data.get("source_url") or "").strip()

    if not name and not email:
        return jsonify({"ok": False, "error": "name or email required"}), 400

    db = get_db()
    db.execute(
        """INSERT INTO web_leads (name, email, phone, company, message, source, source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, email, phone, company, message, source, source_url)
    )
    db.commit()

    return jsonify({"ok": True, "message": "Got it! We'll be in touch shortly."}), 201


@app.route("/api/web-leads", methods=["GET"])
def list_web_leads():
    """Authenticated — returns all web leads sorted by recency."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    db = get_db()
    status_filter = request.args.get("status", "")
    limit = min(int(request.args.get("limit", 50)), 200)

    if status_filter:
        rows = db.execute(
            "SELECT * FROM web_leads WHERE status=? ORDER BY created_at DESC LIMIT ?",
            (status_filter, limit)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM web_leads ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

    return jsonify([dict(r) for r in rows])


@app.route("/api/web-leads/<int:lead_id>/promote", methods=["POST"])
def promote_web_lead(lead_id):
    """Convert a web lead into a CRM client with auto-generated cadence."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    db = get_db()
    wl = db.execute("SELECT * FROM web_leads WHERE id=?", (lead_id,)).fetchone()
    if not wl:
        return jsonify({"error": "not found"}), 404

    if wl["status"] == "promoted":
        return jsonify({"error": "already promoted", "client_id": wl["client_id"]}), 409

    # Create CRM client — include web lead notes
    cur = db.execute(
        """INSERT INTO clients (name, company, email, phone, status, notes)
           VALUES (?, ?, ?, ?, 'lead', ?)""",
        (wl["name"], wl["company"] or "", wl["email"] or "", wl["phone"] or "",
         f"Web lead from {wl['source']}. Original message: {wl['message']}\n\nWeb lead notes: {wl['notes']}"[:500] if wl["notes"] else f"Web lead from {wl['source']}. Original message: {wl['message']}"[:500])
    )
    client_id = cur.lastrowid

    # Log pipeline history
    db.execute(
        "INSERT INTO pipeline_history (client_id, from_stage, to_stage, notes) VALUES (?, NULL, 'lead', ?)",
        (client_id, f"Promoted from web lead #{lead_id}")
    )

    # Auto-generate cadence
    _generate_cadence(db, client_id)

    # Update web lead status
    db.execute(
        "UPDATE web_leads SET status='promoted', client_id=? WHERE id=?",
        (client_id, lead_id)
    )
    db.commit()

    row = db.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
    return jsonify({"ok": True, "client": _client_row(row), "web_lead_id": lead_id}), 201


@app.route("/api/web-leads/<int:lead_id>/status", methods=["PATCH"])
def update_web_lead_status(lead_id):
    """Mark a web lead as viewed, contacted, or archived."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    db = get_db()
    data = request.get_json(force=True)
    new_status = data.get("status", "").strip()
    valid = {"new", "viewed", "contacted", "archived"}

    if new_status not in valid:
        return jsonify({"error": f"invalid status. use: {', '.join(valid)}"}), 400

    db.execute("UPDATE web_leads SET status=? WHERE id=?", (new_status, lead_id))
    db.commit()

    return jsonify({"ok": True, "status": new_status})


@app.route("/api/web-leads/<int:lead_id>/notes", methods=["GET", "POST"])
def web_lead_notes(lead_id):
    """Get or save notes for a web lead."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    if request.method == "GET":
        row = db.execute("SELECT notes FROM web_leads WHERE id=?", (lead_id,)).fetchone()
        return jsonify({"lead_id": lead_id, "notes": row["notes"] if row else ""})
    else:
        data = request.get_json(force=True)
        notes = data.get("notes", "")
        db.execute("UPDATE web_leads SET notes=? WHERE id=?", (notes, lead_id))
        db.commit()
        return jsonify({"ok": True, "lead_id": lead_id})


@app.route("/api/cadence/<int:step_id>/notes", methods=["POST"])
def cadence_step_notes(step_id):
    """Save notes on a cadence step."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    db = get_db()
    data = request.get_json(force=True)
    notes = data.get("notes", "")
    db.execute("UPDATE cadence_steps SET notes=? WHERE id=?", (notes, step_id))
    db.commit()
    return jsonify({"ok": True, "step_id": step_id})


# ── Analytics (GA4 Framework) ──────────────────────────

ANALYTICS_DIR = BASE_DIR / "data"
ANALYTICS_FILE = ANALYTICS_DIR / "analytics.json"


def _load_analytics():
    """Load analytics from JSON file. Swap to GA4 API call here once OAuth is set up."""
    try:
        if ANALYTICS_FILE.exists():
            return json.loads(ANALYTICS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        pass
    # Default placeholder — wire to real GA4 Data API (v1beta) here
    return {
        "source": "placeholder",
        "note": "Wire to GA4 Data API via google-api-python-client after OAuth setup.",
        "period": "Last 30 days",
        "page_views": 0,
        "sessions": 0,
        "users": 0,
        "avg_engagement_time": "0m 0s",
        "bounce_rate": 0,
        "conversion_rate": 0,
        "top_pages": [],
        "traffic_sources": {"organic": 0, "direct": 0, "referral": 0, "social": 0},
        "devices": {"desktop": 0, "mobile": 0, "tablet": 0},
        "daily_views": [],
        "form_submissions": 0,
    }


@app.route("/api/analytics", methods=["GET"])
def analytics_data():
    """Return site analytics. Placeholder JSON until GA4 OAuth is wired in."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    data = _load_analytics()
    # Also count web leads as form submissions
    db = get_db()
    data["form_submissions"] = db.execute("SELECT COUNT(*) FROM web_leads").fetchone()[0]
    return jsonify(data)


@app.route("/api/analytics/refresh", methods=["POST"])
def refresh_analytics():
    """Trigger a GA4 data pull. Placeholder until OAuth is set up."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    # TODO: Call GA4 Data API here once google_token.json exists
    return jsonify({"ok": True, "source": "placeholder", "message": "GA4 OAuth not yet configured. Data is placeholder."})


@app.route("/api/nightly", methods=["GET"])
def nightly_builds():
    """Return nightly build history and cron status."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    builds_dir = Path("/home/jarvis/nightly-builds")
    history = []
    if builds_dir.exists():
        for d in sorted(builds_dir.iterdir(), reverse=True):
            if d.is_dir():
                summary_file = d / "SUMMARY.md"
                summary = ""
                if summary_file.exists():
                    summary = summary_file.read_text()[:300]
                history.append({
                    "date": d.name,
                    "summary": summary,
                    "files": [f.name for f in d.iterdir() if f.is_file()],
                    "has_error": "error" in summary.lower() or "failed" in summary.lower(),
                })

    # Last 14 days
    return jsonify({
        "history": history[:14],
        "cron_job_id": "91b67eefe798",
        "cron_name": "Nightly CRM Upgrade",
        "schedule": "0 8 * * * (4 AM ET)",
    })


@app.route("/api/nightly/<date>", methods=["GET"])
def nightly_build_detail(date):
    """Return full summary for a specific build date."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    summary_file = Path(f"/home/jarvis/nightly-builds/{date}/SUMMARY.md")
    if summary_file.exists():
        return jsonify({"date": date, "summary": summary_file.read_text()})
    return jsonify({"error": "not found"}), 404


# ── Init ────────────────────────────────────────────────

init_db()


# ── Email Drafting (DeepSeek via OpenRouter) ────────────

def _get_openrouter_key():
    """Read OpenRouter API key from dojo .env."""
    env_file = Path("/home/jarvis/.openclaw/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def _get_sendgrid_key():
    """Read SendGrid API key from leadgen .env."""
    env_file = Path("/home/jarvis/presencify/leadgen/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("SENDGRID_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


@app.route("/api/leadgen/draft-email", methods=["POST"])
def draft_email():
    """Generate a personalized outreach email for a lead using DeepSeek."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    data = request.get_json(force=True)
    lead_id = data.get("lead_id")
    if not lead_id:
        return jsonify({"error": "lead_id required"}), 400

    # Load lead from leadgen DB
    try:
        import sqlite3
        ldb = sqlite3.connect(str(LEADGEN_DB))
        ldb.row_factory = sqlite3.Row
        lead = ldb.execute("SELECT * FROM leads WHERE id=?", (lead_id,)).fetchone()
        ldb.close()
        if not lead:
            return jsonify({"error": "lead not found"}), 404
    except Exception as e:
        return jsonify({"error": f"DB error: {e}"}), 500

    api_key = _get_openrouter_key()
    if not api_key:
        return jsonify({"error": "OpenRouter API key not configured"}), 500

    # Build prompt
    biz = lead["biz"] or "this business"
    category = lead["category"] or "local business"
    why = lead["why_this_lead"] or ""
    website = lead["website"] or ""

    prompt = f"""Write a personalized cold outreach email for a {category} business called "{biz}" in Brevard County, Florida.
{f'Website: {website}' if website else 'No website found — this is a key pain point.'}
{f'Why they need help: {why}' if why else ''}

Rules:
- Use "Hi [First Name]," if name is known, otherwise "Hi there,"
- Keep it 3-4 short paragraphs max
- Be casual, direct, local — like a neighbor, not a sales rep
- Mention specific pain points if known
- End with a soft call to action (reply, call, or visit site)
- Signature: Chris Vega, Space Coast Marketing | chris@spacecoastmarketingagency.com | 321-328-5307
- No AI-isms, no "I'd love to", no "in today's competitive landscape"

Return ONLY the email with Subject line first, like:
Subject: [subject line]

[email body]"""

    try:
        import urllib.request
        req_body = json.dumps({
            "model": "deepseek/deepseek-chat",
            "messages": [
                {"role": "system", "content": "You write authentic cold outreach emails for a local marketing agency. Be direct, casual, and helpful. Never sound like AI."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        }).encode()

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=req_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            content = result["choices"][0]["message"]["content"]
            return jsonify({"ok": True, "lead_id": lead_id, "draft": content})

    except Exception as e:
        return jsonify({"error": f"Drafting failed: {e}", "draft": _fallback_draft(lead)}), 200


def _fallback_draft(lead):
    """Fallback template when AI is unavailable."""
    biz = lead["biz"] or "there"
    category = lead["category"] or "business"
    return f"""Subject: Quick question about your {category} marketing

Hi there,

I came across {biz} and noticed an opportunity to help you get found by more local customers searching online.

I run Space Coast Marketing — we help Brevard {category} businesses like yours show up on Google, ChatGPT, and local search so you're the first one they call. Most of our clients had no website or an outdated one when we started.

Would you be open to a quick chat? No pressure — just want to see if we can help.

Chris Vega
Space Coast Marketing
chris@spacecoastmarketingagency.com | 321-328-5307"""


@app.route("/api/leadgen/send-email", methods=["POST"])
def send_email():
    """Send an email via SendGrid."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    data = request.get_json(force=True)
    lead_id = data.get("lead_id")
    to_email = data.get("to_email", "").strip()
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()

    if not to_email or not subject or not body:
        return jsonify({"error": "to_email, subject, and body required"}), 400

    sg_key = _get_sendgrid_key()
    if not sg_key:
        return jsonify({"error": "SendGrid API key not configured"}), 500

    try:
        import urllib.request
        req_body = json.dumps({
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": "chris@spacecoastmarketingagency.com", "name": "Chris Vega"},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        }).encode()

        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=req_body,
            headers={
                "Authorization": f"Bearer {sg_key}",
                "Content-Type": "application/json",
            }
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            # Log to outreach_log
            if lead_id and status in (200, 201, 202):
                try:
                    import sqlite3
                    ldb = sqlite3.connect(str(LEADGEN_DB))
                    ldb.execute(
                        "INSERT INTO outreach_log (lead_id, action, email_to, email_subject, email_body, result) VALUES (?, 'email_sent', ?, ?, ?, 'sent')",
                        (lead_id, to_email, subject, body[:500])
                    )
                    ldb.execute("UPDATE leads SET outreach='emailed', contacted_at=datetime('now') WHERE id=?", (lead_id,))
                    ldb.commit()
                    ldb.close()
                except Exception:
                    pass

            return jsonify({"ok": True, "status": status})

    except urllib.error.HTTPError as e:
        return jsonify({"error": f"SendGrid: {e.code} — {e.read().decode()[:200]}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

LEADGEN_URL = "http://127.0.0.1:8090"


@app.route("/api/proxy/leadgen/<path:subpath>", methods=["GET", "POST", "PATCH", "OPTIONS"])
def proxy_leadgen(subpath):
    """Proxy requests to leadgen backend. Avoids CORS — same origin as CRM."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    import urllib.request

    url = f"{LEADGEN_URL}/{subpath}"
    if request.query_string:
        url += f"?{request.query_string.decode()}"

    body = request.get_data()
    headers = {"Content-Type": request.content_type or "application/json"}

    try:
        req = urllib.request.Request(url, data=body, headers=headers, method=request.method)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read(), resp.status, {"Content-Type": resp.headers.get("Content-Type", "application/json")}
    except urllib.error.HTTPError as e:
        return e.read(), e.code, {"Content-Type": "application/json"}
    except Exception as e:
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8897, debug=False)