# Space Coast Marketing Agency

Code from a local digital marketing agency I started for small businesses in Brevard County, Florida. The agency is still active as a freelance endeavor, since my current focus is the pivot to IT. I'm keeping the code public as a record of what I built and learned.

## What is here

**Website (`app/`, `lib/`)**
Next.js 14, React, and Tailwind site deployed on Vercel. It has service, pricing, blog, and privacy pages, a contact form that sends email through Resend, and a free website audit tool with a simple per-IP rate limit.

**VPS portfolio (`vps-portfolio/`)**
Four Python Flask apps (about 5,700 lines) that I ran on an Ubuntu server: a lead-tracking CRM, a lead scoring and outreach pipeline, a photo-to-estimate tool, and a local business SEO health check. The folder also has the nginx and systemd configs I used to run them, an agent status dashboard, and the 19 HTML playbooks I wrote for the agency. Its own README has the details and restore steps.

## Notes

- Secrets, databases, and real lead data were removed before publishing. Config files use placeholders such as `${DISCORD_BOT_TOKEN}`.
- The business phone number and emails in the sample pages and outreach templates were the agency's public contact details.
- Nothing here is set up to run as is. You would need to supply your own API keys and environment variables.
