#!/usr/bin/env python3
import sys, os
# DOJO PAUSED by Chris — systemd will keep restarting but this exits immediately.
# Revert this line when dojo is reactivated.
if os.environ.get('DOJO_ACTIVE') != 'true':
    sys.exit(0)
"""
dojo_server.py — THE DOJO static server + approval proxy + task intake
Binds 127.0.0.1:8899 (Cloudflare tunnel points here).

Routes:
  GET  /              → index.html
  GET  /agent_status.js → live agent status
  POST /approve       → fire-and-forget: notifies Musashi via Discord DM
  POST /task          → Socrates task intake: queue + wake Musashi (auth required)
  GET  /health        → {"ok":true}
"""
import http.server
import json
import logging
import os
import subprocess
import threading
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path
import hmac
import hashlib
import time as _time

SERVE_DIR         = Path('/home/jarvis/dojo-serve')
PORT              = 8899
HOST              = '127.0.0.1'
OPENCLAW          = '/home/jarvis/.nvm/versions/node/v24.16.0/bin/openclaw'
NODE_BIN          = '/home/jarvis/.nvm/versions/node/v24.16.0/bin'
CHRIS_ID          = '<DISCORD_USER_ID>'   # Discord user ID
LOG_FILE          = '/home/jarvis/dojo_server.log'
MISSION_QUEUE     = Path('/home/jarvis/.openclaw/workspace/mission_queue.json')

# Socrates task intake auth token (localhost only — Socrates on same VPS)
TASK_AUTH_TOKEN   = os.environ["TASK_AUTH_TOKEN"]

# ── Server-side PIN gate auth ─────────────────────────────────────────────
PIN_HASH       = os.environ["DOJO_PIN_HASH"]
PIN_SALT       = 'dojo-musashi-2026'
AUTH_SECRET_FILE = Path('/home/jarvis/.dojo_auth_secret')
SESSION_TTL    = 86400 * 7   # 7 days
MAX_ATTEMPTS   = 5
LOCKOUT_BASE   = 60          # seconds, escalates: 60, 300, 900, 3600

# Per-IP rate limiting (cleared on restart — acceptable for home use)
_rate_limits = {}  # ip -> {"fails": int, "locked_until": float, "escalation": int}

def _load_auth_secret():
    """Load or generate the HMAC secret for signing auth tokens."""
    if AUTH_SECRET_FILE.exists():
        return AUTH_SECRET_FILE.read_text().strip()
    import secrets
    s = secrets.token_hex(32)
    AUTH_SECRET_FILE.write_text(s)
    AUTH_SECRET_FILE.chmod(0o600)
    return s

AUTH_SECRET = _load_auth_secret()

def _make_token(client_ip):
    """Return a signed token string: {expires}:{hmac_hex}"""
    expires = int(_time.time()) + SESSION_TTL
    # Bind to /24 for reasonable IP mobility
    ip_prefix = '.'.join(client_ip.split('.')[:3])
    payload = f"{expires}:{ip_prefix}"
    sig = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{expires}:{sig}"

def _verify_token(token_str, client_ip):
    """Check token validity. Returns True if valid and not expired."""
    try:
        parts = token_str.split(':')
        if len(parts) != 2:
            return False
        expires = int(parts[0])
        sig     = parts[1]
        if _time.time() > expires:
            return False
        ip_prefix = '.'.join(client_ip.split('.')[:3])
        payload = f"{expires}:{ip_prefix}"
        expected = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        return hmac.compare_digest(sig, expected)
    except (ValueError, IndexError):
        return False

def _check_rate(ip):
    """Check rate limit for IP. Returns (allowed: bool, remaining: int, locked_seconds: int)."""
    now = _time.time()
    entry = _rate_limits.get(ip)
    if entry and entry.get('locked_until', 0) > now:
        locked_secs = int(entry['locked_until'] - now)
        return False, 0, locked_secs
    remaining = MAX_ATTEMPTS - (entry['fails'] if entry else 0)
    return True, max(0, remaining), 0

def _record_fail(ip):
    """Record a failed attempt. Locks out on threshold with escalating timeouts."""
    now = _time.time()
    entry = _rate_limits.get(ip, {'fails': 0, 'locked_until': 0, 'escalation': 0})
    entry['fails'] += 1
    if entry['fails'] >= MAX_ATTEMPTS:
        esc = entry.get('escalation', 0)
        lockout = LOCKOUT_BASE * (4 ** esc)  # 60, 240, 960, 3840
        entry['locked_until'] = now + lockout
        entry['escalation'] = min(esc + 1, 3)  # cap escalation at 3
        entry['fails'] = 0  # reset for next round
    else:
        entry['locked_until'] = 0
    _rate_limits[ip] = entry

def _reset_rate(ip):
    """Clear rate limit on successful auth."""
    _rate_limits.pop(ip, None)
# ──────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    filename=LOG_FILE, level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s', datefmt='%Y-%m-%d %H:%M UTC'
)

CLEAN_ENV = {
    **os.environ,
    'HOME': '/home/jarvis',
    'PATH': f'{NODE_BIN}:/usr/local/bin:/usr/bin:/bin',
}


def notify_musashi(mission: str, action: str):
    """Fire-and-forget: notify Musashi AND trigger execution for approvals."""
    verb  = 'APPROVED ✅' if action == 'approve' else 'REJECTED ✖️'
    emoji = '⚔️' if action == 'approve' else '🚫'

    if action == 'approve':
        execute_msg = (
            f'⚔️ DOJO DASHBOARD — MISSION APPROVED BY CHRIS\n\n'
            f'**Mission:** {mission}\n\n'
            f'This approval was just received from the Dojo Dashboard. '
            f'Execute this mission NOW. Do not wait for further instructions. '
            f'When complete, update agent_status.json to move this to completed, '
            f'post results to Discord channel <DISCORD_CHANNEL_ID_2>, '
            f'and run node /home/jarvis/regen_status.js.'
        )
        try:
            result = subprocess.run(
                [OPENCLAW, 'agent', '--message', execute_msg, '--agent', 'main'],
                capture_output=True, text=True, timeout=120, env=CLEAN_ENV
            )
            if result.returncode == 0:
                logging.info(f'Mission execution triggered: {mission}')
            else:
                logging.error(f'Execution trigger failed (rc={result.returncode}): {result.stderr[:200]}')
        except Exception as e:
            logging.error(f'Execution trigger error: {e}')
    else:
        msg = (
            f'{emoji} **DOJO DASHBOARD — MISSION {verb}**\n\n'
            f'**Mission:** {mission}\n'
            f'**Decision:** Rejected via Dojo Dashboard.'
        )
        try:
            result = subprocess.run(
                [OPENCLAW, 'message', 'send',
                 '--channel', 'discord',
                 '--target', f'user:{CHRIS_ID}',
                 '--message', msg],
                capture_output=True, text=True, timeout=30, env=CLEAN_ENV
            )
            if result.returncode == 0:
                logging.info(f'Rejection DM sent: {mission}')
            else:
                logging.warning(f'Rejection DM failed (rc={result.returncode}): {result.stderr[:200]}')
        except Exception as e:
            logging.error(f'Rejection DM error: {e}')

    logging.info(f'Approval processed: {action} — {mission!r}')


def queue_task(task_id: str, payload: dict):
    """Write task to mission_queue.json and wake Musashi via openclaw agent."""
    # 1. Write to queue (with file lock via read-modify-write)
    try:
        if MISSION_QUEUE.exists():
            queue_data = json.loads(MISSION_QUEUE.read_text())
        else:
            queue_data = {
                'schema': 'dojo.mission_queue.v1',
                'lastUpdated': '',
                'missions': []
            }

        queue_data['lastUpdated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        queue_data['missions'].append({
            'id': task_id,
            'status': 'queued',
            'queuedAt': queue_data['lastUpdated'],
            **payload
        })
        MISSION_QUEUE.write_text(json.dumps(queue_data, indent=2))
        logging.info(f'Task queued: {task_id} from={payload.get("from","?")} mission={payload.get("mission","?")!r}')
    except Exception as e:
        logging.error(f'Queue write error: {e}')

    # 2. Wake Musashi immediately via openclaw agent --message
    try:
        from_agent = payload.get('from', 'unknown')
        mission    = payload.get('mission', '(no mission text)')
        priority   = payload.get('priority', 'normal')
        context    = payload.get('context', '')
        callback   = payload.get('callback', '')

        wake_msg = (
            f'⚔️ INCOMING TASK FROM {from_agent.upper()} [task_id={task_id}]\n\n'
            f'**Mission:** {mission}\n'
            f'**Priority:** {priority}\n'
        )
        if context:
            wake_msg += f'**Context:** {context}\n'
        if callback:
            wake_msg += f'**Callback:** {callback}\n'
        wake_msg += (
            f'\nThis task was dispatched programmatically by {from_agent} and written to mission_queue.json. '
            f'Acknowledge receipt, then execute. On completion, update the task status in mission_queue.json '
            f'(set status="completed", add completedAt timestamp and result summary).'
        )

        proc = subprocess.Popen(
            [OPENCLAW, 'agent', '--message', wake_msg, '--agent', 'main'],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=CLEAN_ENV
        )
        try:
            stdout, stderr = proc.communicate(timeout=600)
            if proc.returncode == 0:
                logging.info(f'Musashi woken for task {task_id}')
            else:
                logging.error(f'Wake failed (rc={proc.returncode}): {stderr[:200]}')
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate()
            logging.warning(
                f'Wake timed out after 600s for task {task_id} — '
                f'agent may still be running independently. Check mission_queue.json for completion.'
            )
    except Exception as e:
        logging.error(f'Wake error: {e}')


class DojoHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass  # suppress per-request noise

    # ── helpers ──────────────────────────────────────────────────────────────

    def send_json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, name):
        file_path = SERVE_DIR / name
        try:
            data = file_path.read_bytes()
        except Exception as e:
            self.send_json(500, {'error': str(e)})
            return
        ct = ('text/html; charset=utf-8' if name.endswith('.html')
              else 'application/javascript')
        self.send_response(200)
        self.send_header('Content-Type', ct)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return self.rfile.read(length) if length else b''

    def check_task_auth(self):
        """Returns True if Authorization header matches TASK_AUTH_TOKEN."""
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth[len('Bearer '):]
            return token == TASK_AUTH_TOKEN
        return False

    def _get_client_ip(self):
        """Get real client IP, respecting nginx X-Real-IP / X-Forwarded-For headers."""
        x_real = self.headers.get('X-Real-IP', '')
        if x_real:
            return x_real.strip()
        x_fwd = self.headers.get('X-Forwarded-For', '')
        if x_fwd:
            return x_fwd.split(',')[0].strip()
        return self.client_address[0]

    # ── routes ───────────────────────────────────────────────────────────────

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path.rstrip('/')
        if path in ('', '/'):
            self.send_file('index.html')
        elif path == '/agent_status.js':
            self.send_file('agent_status.js')
        elif path == '/health':
            self.send_json(200, {'ok': True, 'service': 'dojo-server'})
        elif path == '/verify':
            self._handle_verify()
        else:
            self.send_json(404, {'error': 'not found'})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path.rstrip('/')

        if path == '/approve':
            self._handle_approve()
        elif path == '/task':
            self._handle_task()
        elif path == '/auth':
            self._handle_auth()
        else:
            self.send_json(404, {'error': 'not found'})

    def _handle_approve(self):
        raw = self.read_body()
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            self.send_json(400, {'error': 'invalid JSON'})
            return

        mission = str(body.get('mission', '')).strip()
        action  = str(body.get('action',  '')).strip().lower()

        if not mission or action not in ('approve', 'reject'):
            self.send_json(400, {'error': 'need mission (str) and action (approve|reject)'})
            return

        self.send_json(200, {'ok': True, 'action': action, 'mission': mission})
        logging.info(f'Approval received: {action} — {mission!r}')

        t = threading.Thread(target=notify_musashi, args=(mission, action), daemon=True)
        t.start()

    def _handle_auth(self):
        """Server-side PIN validation with rate limiting. Sets signed cookie on success."""
        client_ip = self._get_client_ip()

        # Rate limit check
        allowed, remaining, locked_secs = _check_rate(client_ip)
        if not allowed:
            self.send_json(429, {
                'ok': False, 'error': 'locked',
                'locked_seconds': locked_secs,
                'message': f'Too many attempts. Try again in {locked_secs}s.'
            })
            logging.warning(f'AUTH locked — IP={client_ip} locked_secs={locked_secs}')
            return

        raw = self.read_body()
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            self.send_json(400, {'ok': False, 'error': 'invalid JSON'})
            return

        pin = str(body.get('pin', '')).strip()
        if not pin or len(pin) != 6 or not pin.isdigit():
            self.send_json(400, {'ok': False, 'error': 'pin must be 6 digits'})
            return

        # Validate PIN
        pin_input = PIN_SALT + pin
        pin_hash = hashlib.sha256(pin_input.encode()).hexdigest()

        if hmac.compare_digest(pin_hash, PIN_HASH):
            # Success — issue token
            _reset_rate(client_ip)
            token = _make_token(client_ip)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            # Set HttpOnly cookie for session persistence
            cookie = (
                f'dojo_auth={token}; Path=/; Max-Age={SESSION_TTL}; '
                f'SameSite=Strict; HttpOnly'
            )
            self.send_header('Set-Cookie', cookie)
            body = json.dumps({'ok': True, 'message': 'Access granted'}).encode()
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            logging.info(f'AUTH success — IP={client_ip}')
        else:
            _record_fail(client_ip)
            allowed2, remaining2, locked_secs2 = _check_rate(client_ip)
            resp = {'ok': False, 'error': 'wrong pin', 'remaining': remaining2}
            if locked_secs2:
                resp['locked_seconds'] = locked_secs2
                resp['error'] = 'locked'
            self.send_json(401, resp)
            logging.warning(f'AUTH fail — IP={client_ip} remaining={remaining2}')

    def _handle_verify(self):
        """Verify that the client holds a valid auth cookie."""
        client_ip = self._get_client_ip()
        cookies = self.headers.get('Cookie', '')
        token = None
        for c in cookies.split(';'):
            c = c.strip()
            if c.startswith('dojo_auth='):
                token = c[len('dojo_auth='):]
                break
        if token and _verify_token(token, client_ip):
            self.send_json(200, {'ok': True})
        else:
            self.send_json(401, {'ok': False})

    def _handle_task(self):
        # Auth check
        if not self.check_task_auth():
            self.send_json(401, {'error': 'unauthorized', 'hint': 'Authorization: Bearer <token> required'})
            logging.warning(f'Unauthorized /task attempt from {self.client_address[0]}')
            return

        raw = self.read_body()
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            self.send_json(400, {'error': 'invalid JSON'})
            return

        # Required: mission
        mission = str(body.get('mission', '')).strip()
        if not mission:
            self.send_json(400, {
                'error': 'missing required field: mission',
                'schema': {
                    'mission':  'string (required) — what to do',
                    'from':     'string (optional) — sender agent name, default "socrates"',
                    'priority': 'string (optional) — low|normal|high, default "normal"',
                    'context':  'string (optional) — additional context or data',
                    'callback': 'string (optional) — URL for result POST-back'
                }
            })
            return

        task_id = str(uuid.uuid4())
        payload = {
            'from':     str(body.get('from',     'socrates')).strip(),
            'mission':  mission,
            'priority': str(body.get('priority', 'normal')).strip(),
            'context':  str(body.get('context',  '')).strip(),
            'callback': str(body.get('callback', '')).strip(),
        }

        # Respond immediately
        self.send_json(202, {
            'ok':      True,
            'task_id': task_id,
            'status':  'queued',
            'message': 'Task queued and Musashi waking'
        })

        # Queue + wake in background
        t = threading.Thread(target=queue_task, args=(task_id, payload), daemon=True)
        t.start()

    def do_HEAD(self):
        self.do_GET()


if __name__ == '__main__':
    os.chdir(SERVE_DIR)
    logging.info(f'Dojo server starting on {HOST}:{PORT}')
    import socket
    server = http.server.ThreadingHTTPServer((HOST, PORT), DojoHandler)
    server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    print(f'Dojo server listening on {HOST}:{PORT}', flush=True)
    server.serve_forever()
