# VPS Portfolio: Four Flask Apps on an Ubuntu Server

From 2025 into 2026 I ran four Python web apps for my marketing agency on one DigitalOcean Ubuntu server, which I managed over SSH. This folder has the code and the configs I used to deploy them. I've since shut the server down and moved everything to my own hardware at home, so think of this as a reference copy.

## The apps

| App | Lines of Python | What it did | Built with |
| --- | --- | --- | --- |
| `apps/leadgen/` | ~2,800 | Found local businesses, scored how good a fit they were, filled in details from their website and search results, and drafted outreach | Flask, SQLite, SendGrid |
| `apps/photo-estimate/` | ~1,300 | A customer uploads a photo of the job and gets a rough estimate for one of 8 trades | Flask, SQLite, AI vision model |
| `apps/command-center/` | ~1,150 | My private dashboard for keeping track of leads, follow-ups, and the sales pipeline | Flask, SQLite, vanilla JS |
| `apps/health-check/` | ~650 | A free check of a local business's website and Google listing | Flask, Google Places API, PageSpeed Insights API |

That's ~6,000 lines of Python in total, plus the HTML and JavaScript for the front ends.

## How it ran

```
Internet
   |  HTTPS (443)
   v
nginx (reverse proxy, one server block per subdomain)
   |  proxy_pass to 127.0.0.1:<port>
   v
Flask app (systemd service, one per app)
   |
   v
SQLite database (one per app)
```

- Each app only listened on localhost, each on its own port (8090, 8890, 8891, and 8897). The only thing facing the internet was nginx, so the only way to reach an app was through it.
- nginx sent each subdomain to the right app (configs are in [`deploy-configs/`](deploy-configs/)). The command center and lead gen had Let's Encrypt certificates, with plain HTTP redirected to HTTPS. The configs for the two public tools are HTTP only, and if I set them up again I'd put certificates on those too. The health check lives on now as a tool on my agency's website, [spacecoastmarketingagency.com](https://spacecoastmarketingagency.com).
- systemd ran each app as a service ([`deploy-configs/*.service`](deploy-configs/)). They started on boot, restarted themselves if they crashed, and logged to the journal, so `journalctl -u <service>` showed what each one was doing.
- Most secrets lived in a `.env` file per app that systemd loaded with `EnvironmentFile=`. A few were hardcoded at first, which I cleaned up before publishing (see below).
- The private apps used a PIN login (also from an environment variable) with signed session cookies.
- Emails went out through the SendGrid API.

## Cleaning it up before making it public

Before I flipped this repo to public I went back through the code and the git history:

- Moved the tokens and the PIN hash that were hardcoded into environment variables.
- Deleted every `.env` file, database, and backup file.
- Took out all the real lead data. `apps/leadgen/lead_data.py` is empty on purpose, since the original had contact info for real businesses.
- Squashed the history so the old secrets don't show up in any commit.
- Rotated the chat bot token. The SendGrid, OpenRouter, and Google API keys were only ever in the `.env` files, which never got committed, and they've all been shut off since.

## Running one yourself

1. Make a virtual environment and install Flask: `python3 -m venv venv && . venv/bin/activate && pip install flask requests`
2. Set whatever environment variables the app reads with `os.environ`. The command center, for example, needs `DOJO_PIN`.
3. Run `python app.py`. It starts on `127.0.0.1` on the port from the list above.
4. To put it online, set up nginx in front of it with a config like the ones in [`deploy-configs/`](deploy-configs/), and add a systemd unit.

## What I'd do differently

Looking back, there are a few things I'd change:

- Run each app under its own service account, and use a real WSGI server like gunicorn instead of Flask's built-in one.
- Back up the SQLite databases on a schedule instead of hoping nothing went wrong.
- Script the whole setup, or use Docker Compose like I did later in my [Pi-hole lab](https://github.com/cvega9911/pihole-unbound-dns-lab), so the whole server could be rebuilt from a few files.

## Other folders

- `openclaw-dashboard/`: a status dashboard and a small Python HTTP server for an automation project that ran on the same server.
- `space-command-deliverables/`: HTML playbooks I wrote for the agency. These are sales and marketing documents, not code.
