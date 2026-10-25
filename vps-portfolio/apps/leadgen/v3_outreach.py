#!/usr/bin/env python3
"""
v3_outreach.py — Presencify Lead Acquisition Engine v3
Combined audit generator, v3 email drafter, and morning briefing engine.

Implements the full v3 personalization rules:
- No generic compliments ("love your business" BANNED)
- Use only observable facts
- Evidence-based hooks (competitor gaps, review lags, site performance)
- Loom video scripts for 85+ opportunity leads
- 3-finding automated audit (PROBLEM / IMPACT / RECOMMENDED FIX)
"""

import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

log = logging.getLogger('v3_outreach')

# ═════════════════════════════════════════════════════════════
# CONFIG
# ═════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).resolve().parent

# OpenRouter
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')
if not OPENROUTER_KEY:
    env_file = Path('/home/jarvis/.openclaw/.env')
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith('OPENROUTER_API_KEY='):
                OPENROUTER_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                break

OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
DRAFT_MODEL = 'deepseek/deepseek-v4-pro'

# ═════════════════════════════════════════════════════════════
# AUDIT ENGINE (3-Finding Only)
# ═════════════════════════════════════════════════════════════

def generate_audit(lead: dict, enrichment: dict) -> list[dict]:
    """
    Generate a 3-finding audit per v3 spec.
    Format: PROBLEM / IMPACT / RECOMMENDED FIX
    Focus on issues most likely to create appointments.
    """
    findings = []

    website = (lead.get('website') or '').strip()
    biz = lead.get('biz', '')
    category = lead.get('category', '')
    competitor_avg = enrichment.get('competitor_avg_reviews', 50)
    review_count = enrichment.get('review_count', 0)

    # Finding 1: No website / bad website
    if not website:
        findings.append({
            'problem': f'{biz} has no website — customers searching for "{category} near me" cannot find you online',
            'impact': f'You are invisible to 85%+ of {category} customers who search Google before calling. Your competitors on page 1 are capturing every local lead.',
            'fix': f'A modern, fast-loading website optimized for "{category} in Brevard County" brings your business onto Google page 1 within 60 days.',
        })
    elif not enrichment.get('mobile_friendly', True) or enrichment.get('page_speed_slow', False):
        findings.append({
            'problem': f'Your website loads slowly or is not mobile-friendly — Google penalizes both in rankings',
            'impact': '53% of mobile users leave a site that takes over 3 seconds to load. Every slow-loading second costs you potential customers.',
            'fix': 'Rebuild your site with modern, lightweight design optimized for mobile-first loading and local SEO.',
        })
    else:
        findings.append({
            'problem': f'Your website is missing key content that helps {category} customers find and choose you',
            'impact': 'Without service-area pages and FAQ content, you are losing to competitors who answer customer questions directly on Google.',
            'fix': f'Add dedicated service pages for each {category} offering plus FAQ schema that gets featured in Google search results.',
        })

    # Finding 2: Review gap
    if competitor_avg > (review_count * 3) and review_count > 0:
        findings.append({
            'problem': f'Your competitors average {competitor_avg} Google reviews — you currently have {review_count}',
            'impact': f'Customers trust businesses with 50+ reviews 4x more. You are losing credibility (and calls) to competitors with {competitor_avg // max(review_count, 1)}x your review authority.',
            'fix': 'Implement an automated review request system that sends customers a 1-click Google review link after every job.',
        })
    elif review_count == 0 and competitor_avg > 0:
        findings.append({
            'problem': f'Your competitors average {competitor_avg} Google reviews — you have zero',
            'impact': 'Zero reviews signals to potential customers that you are unproven or new. Most will click past your listing to a competitor with social proof.',
            'fix': 'Launch a Google Business Profile and implement a review generation system to close the gap.',
        })
    else:
        findings.append({
            'problem': f'Your Google review profile is underperforming compared to your market position',
            'impact': f'Even strong businesses lose 15-30% of potential calls when their review count falls below local competitors.',
            'fix': 'Consistent review generation + GBP optimization can close this gap in 60-90 days.',
        })

    # Finding 3: GBP / SEO gap
    if not enrichment.get('has_aeo_geo', False):
        findings.append({
            'problem': 'Your website is not optimized for AI-powered search (Google AI Overviews, voice search)',
            'impact': '30%+ of local searches now surface AI-generated answers. Without structured content, your business is invisible in AI search results.',
            'fix': 'Add FAQ schema, service-area content, and GEO-optimized pages that feed AI search engines with your business information.',
        })
    else:
        findings.append({
            'problem': 'Conversion gaps: your site lacks clear calls-to-action and lead capture',
            'impact': 'Visitors who find your site leave without calling, booking, or requesting a quote — costing you qualified leads every day.',
            'fix': 'Add prominent click-to-call buttons, a contact form, and a free estimate request system that converts browsers into booked jobs.',
        })

    return findings[:3]


# ═════════════════════════════════════════════════════════════
# V3 EMAIL DRAFTING (Evidence-Based, No AI-isms)
# ═════════════════════════════════════════════════════════════

def build_v3_draft_prompt(lead: dict, enrichment: dict, scores: dict, findings: list = None) -> str:
    """
    Build a v3-spec personalized email drafting prompt.
    Uses ONLY observable facts. No generic compliments.
    Every personalization tied to evidence.
    """
    biz = lead.get('biz', 'this business')
    category = lead.get('category', '')
    website = (lead.get('website') or '').strip()
    notes = lead.get('notes', '')

    # Extract evidence from enrichment
    competitors = enrichment.get('competitors', [])
    competitor_avg = enrichment.get('competitor_avg_reviews', 0)
    last_review_days = enrichment.get('last_review_days', 999)
    review_count = enrichment.get('review_count', 0)
    page_speed_slow = enrichment.get('page_speed_slow', False)
    has_ssl = enrichment.get('has_ssl', True)
    triggers = enrichment.get('recent_triggers', [])
    years = enrichment.get('years_in_business', 0)
    is_multi_location = enrichment.get('is_multi_location', False)

    # Recommended package
    package = scores.get('recommended_package', 'Growth')
    package_price = {
        'Grand Opening': '$199 + $29/mo',
        'Starter': '$399 + $29/mo',
        'Growth': '$599 + $149/mo',
        'Presence+': '$199/mo',
        'Enterprise': '$2,500+',
    }.get(package, '$599/mo')

    # Build evidence bullets
    evidence = []

    # Competitor gap (best opener)
    if competitor_avg > 0 and review_count < competitor_avg * 0.5:
        evidence.append(f"their Google reviews: {review_count} vs competitors averaging {competitor_avg}")

    # Website state
    if not website:
        evidence.append(f"no website — invisible to {category} searches")
    elif page_speed_slow:
        evidence.append("website loads slowly on mobile")
    elif not has_ssl:
        evidence.append("website missing SSL security")

    # Review recency
    if last_review_days > 90 and review_count > 0:
        evidence.append(f"last Google review was {last_review_days} days ago")

    # Growth signals
    if triggers:
        evidence.append(f"noted: {', '.join(triggers[:2])}")

    # Years in business (credibility builder)
    if years >= 10:
        evidence.append(f"{years} years serving Brevard")

    evidence_lines = '\n'.join(f'- {e}' for e in evidence[:4]) if evidence else '- local {category} business'

    # Competitor mention
    competitor_mention = ''
    if competitors and competitor_avg > review_count * 2:
        comp_names = [c.get('name', '') for c in competitors[:2] if c.get('name')]
        if comp_names:
            competitor_mention = f'Competitors like {comp_names[0]} have {competitor_avg} reviews — you are at {review_count}.'

    # Build the full prompt
    prompt = f"""Write a short, genuine cold outreach email from Chris Vega at Presencify (presencify.co) — a local web design and marketing studio in Merritt Island, Florida.

BUSINESS:
Name: {biz}
Category: {category}
Website: {website or 'NO WEBSITE'}
Years in business: {years or 'Unknown'}
Notes: {notes}

WHAT WE OBSERVED (use these facts):
{evidence_lines}

COMPETITOR CONTEXT:
{competitor_mention}

V3 OUTREACH RULES — FOLLOW EXACTLY:
1. NEVER use: "Love your business," "Looks great," "Impressive," "I hope this email finds you well"
2. Use ONLY observable facts from the data provided above
3. Lead with a specific observation (review gap, website issue, competitor comparison)
4. Keep it 5-7 sentences. Direct and casual — write like Chris talks.
5. Use "I" — first person. Sounds like a real person, not a template.
6. No bullet points, no markdown, no lists
7. Mention ONE specific problem and how Presencify fixes it
8. The pitch: fast, modern websites + local SEO for Brevard businesses
9. Offer: free site audit or 15-minute call (not both — pick one based on context)
10. End naturally — no "I look forward to hearing from you"

PACKAGE TO RECOMMEND (don't mention price unless natural): {package}

SIGNATURE (always end with this):
Chris Vega
Presencify — Websites That Work for Brevard Businesses
chris@presencify.co | presencify.co
Free 15-min call: https://calendly.com/presencify
Or call/text: 321-328-5307

Return ONLY the email body text. No subject line, no markdown, no commentary."""
    return prompt


def build_v3_subject(lead: dict, enrichment: dict, body: str = '') -> str:
    """Generate a short, specific subject line from evidence."""
    biz = lead.get('biz', '')
    first_word = biz.split()[0] if biz else ''
    competitor_avg = enrichment.get('competitor_avg_reviews', 0)
    review_count = enrichment.get('review_count', 0)
    website = (lead.get('website') or '').strip()

    # Competitor gap subjects convert best
    if competitor_avg > review_count * 3 and review_count > 0:
        return f"{biz} — quick question about your Google reviews"

    if not website:
        return f"{first_word} — quick online presence question"

    return f"{biz} — quick website observation, {first_word}"


def _call_deepseek(prompt: str) -> str:
    """Call DeepSeek v4-pro for email drafting."""
    if not OPENROUTER_KEY:
        raise Exception("No OpenRouter API key")

    resp = requests.post(
        OPENROUTER_URL,
        headers={
            'Authorization': f'Bearer {OPENROUTER_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'model': DRAFT_MODEL,
            'messages': [
                {
                    'role': 'system',
                    'content': (
                        'You are a direct, evidence-based cold outreach copywriter for Presencify, '
                        'a Brevard County web design studio. Write like a real person — casual, local, expert. '
                        'Use ONLY observable facts. Never use generic compliments. '
                        'No "I hope this email finds you well." No "Love your business." '
                        'Every claim must be tied to specific evidence from the business data provided. '
                        '5-7 sentences max. Short and punchy.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.7,
            'max_tokens': 400,
        },
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    content = data['choices'][0]['message'].get('content', '')
    if not content:
        raise Exception(f"Empty response (finish: {data['choices'][0].get('finish_reason', '?')})")

    # Clean up
    content = content.strip()
    if content.startswith('```'):
        lines = content.split('\n')
        content = '\n'.join(lines[1:]) if len(lines) > 1 else content
        if content.endswith('```'):
            content = content[:-3]
    return content.strip()


# ═════════════════════════════════════════════════════════════
# LOOM VIDEO SCRIPT (85+ Opportunity Score Only)
# ═════════════════════════════════════════════════════════════

def generate_loom_script(lead: dict, enrichment: dict, findings: list) -> str:
    """
    Generate a 60-second Loom video script for 85+ opportunity leads.
    Format: Opening / Observation / Business Impact / Suggested Fix / CTA
    """
    biz = lead.get('biz', '')
    category = lead.get('category', '')
    website = (lead.get('website') or '').strip()
    competitor_avg = enrichment.get('competitor_avg_reviews', 0)
    review_count = enrichment.get('review_count', 0)

    finding_text = ''
    if findings:
        f = findings[0]
        finding_text = f"{f.get('problem', '')} — {f.get('impact', '')}"

    opening = f"Hey — quick 60-second video for {biz}. I looked at your online presence and found something I wanted to show you personally."

    observation = (
        f"I noticed {biz} {'has no website' if not website else 'has a website that could be working harder'} — "
        f"which means when someone Googles '{category} near me' in Brevard, you are missing out on most of those searches."
    )

    impact = (
        f"Your competitors average {competitor_avg} Google reviews. You are at {review_count}. "
        f"That difference is costing you calls and jobs every single day. "
        f"People trust businesses with more reviews — it is just how local search works now."
    )

    fix = (
        "I run Presencify here in Brevard — we build modern websites and fix local SEO "
        "so businesses like yours actually show up when people search. "
        "I have a free audit I can send over — takes me about 15 minutes — zero obligation."
    )

    cta = f"Want me to send it over? Just reply to this email or call me at 321-328-5307. Talk soon."

    return f"""LOOM SCRIPT (60 sec) — {biz}

OPENING:
{opening}

OBSERVATION:
{observation}

BUSINESS IMPACT:
{impact}

SUGGESTED FIX:
{fix}

CALL TO ACTION:
{cta}"""


# ═════════════════════════════════════════════════════════════
# MORNING BRIEFING (TOP 20)
# ═════════════════════════════════════════════════════════════

def generate_briefing(db) -> str:
    """
    Generate the TOP 20 morning briefing per v3 spec.
    Chris should be able to: Review → Send → Book Call in under 30 minutes.
    """
    # Import scoring engine locally to avoid circular import
    from scoring_engine import batch_score

    scored = batch_score(db)
    qualified = [s for s in scored if not s.is_rejected]
    top = qualified[:20]

    now = datetime.now()
    date_str = now.strftime('%A, %B %d, %Y')

    output = f"""# PRESENCIFY MORNING BRIEFING
## {date_str}

---

### TOP {len(top)} LEADS BY PRIORITY
*(Scored with Lead Acquisition Engine v3)*

"""

    for i, s in enumerate(top, 1):
        # Get lead data
        lead = db.execute("SELECT * FROM leads WHERE id=?", (s.lead_id,)).fetchone()
        lead = dict(lead) if lead else {}
        email = lead.get('email', '')
        website = lead.get('website', '')
        phone = lead.get('phone', '')

        priority_tag = '🔴' if s.priority_score >= 80 else ('🟡' if s.priority_score >= 50 else '⚪')

        output += f"""### {i}. {priority_tag} {s.biz} — Priority {s.priority_score}
**Category:** {s.category} | **Package:** {s.recommended_package}
**Scores:** Opp:{s.opportunity_score} | Close:{s.close_probability}% | Contact:{s.contactability_score}%
**Why:** {s.why_this_lead}

"""

        if s.opportunity_signals:
            output += f"**Top Signals:** {', '.join(s.opportunity_signals[:3])}\n"
        if email:
            output += f"**Email:** {email}  "
        if website:
            output += f"**Web:** {website}  "
        if phone:
            output += f"**Phone:** {phone}"
        output += "\n\n---\n\n"

    output += f"""### QUICK STATS
- Total Leads: {len(scored)}
- Qualified: {len(qualified)}
- High Priority (80+): {sum(1 for s in qualified if s.priority_score >= 80)}
- Medium Priority (50-79): {sum(1 for s in qualified if 50 <= s.priority_score < 80)}

---

*Generated by Lead Acquisition Engine v3 — {now.strftime('%H:%M ET')}*
*Review → Draft → Send → Book Call in 30 min*
"""

    return output


# ═════════════════════════════════════════════════════════════
# DRAFT BATCH
# ═════════════════════════════════════════════════════════════

def draft_v3_emails(db, lead_ids: list = None, max_batch: int = 10) -> list[dict]:
    """
    Draft v3 emails for a batch of leads. Returns list of drafts.
    Uses enrichment data for personalization.
    """
    from scoring_engine import batch_score, _build_audit_from_db

    if lead_ids is None:
        scored = batch_score(db)
        qualified = [s for s in scored if not s.is_rejected]
        lead_ids = [s.lead_id for s in qualified[:max_batch]]
    else:
        lead_ids = lead_ids[:max_batch]

    if not lead_ids:
        return []

    placeholders = ','.join('?' * len(lead_ids))
    rows = db.execute(
        f"SELECT * FROM leads WHERE id IN ({placeholders})",
        lead_ids
    ).fetchall()

    drafts = []
    for row in rows:
        lead = dict(row)

        # Parse enrichment
        enrichment = {}
        enrich_str = lead.get('enrichment_json', '')
        if enrich_str:
            try:
                enrichment = json.loads(enrich_str)
            except (json.JSONDecodeError, TypeError):
                pass

        # Score it
        audit_data = _build_audit_from_db(lead)
        audit_data.update(enrichment)
        from scoring_engine import score_lead
        scored = score_lead(lead, audit_data)

        # Generate audit findings
        findings = generate_audit(lead, enrichment)

        # Build prompt and draft
        scores_dict = {
            'opportunity_score': scored.opportunity_score,
            'recommended_package': scored.recommended_package,
        }
        prompt = build_v3_draft_prompt(lead, enrichment, scores_dict, findings)

        try:
            body = _call_deepseek(prompt)
        except Exception as e:
            log.error(f"Draft failed for {lead['biz']}: {e}")
            body = _fallback_v3_draft(lead, enrichment)

        subject = build_v3_subject(lead, enrichment, body)

        # Generate Loom script for 85+ opportunity leads
        loom_script = ''
        if scored.opportunity_score >= 85:
            loom_script = generate_loom_script(lead, enrichment, findings)

        drafts.append({
            'lead_id': lead['id'],
            'biz': lead['biz'],
            'category': lead['category'],
            'website': lead.get('website', ''),
            'email': lead.get('email', ''),
            'phone': lead.get('phone', ''),
            'subject': subject,
            'body': body,
            'priority_score': scored.priority_score,
            'opportunity_score': scored.opportunity_score,
            'recommended_package': scored.recommended_package,
            'why_this_lead': scored.why_this_lead,
            'audit_findings': findings,
            'loom_script': loom_script,
        })

    return drafts


def _fallback_v3_draft(lead: dict, enrichment: dict) -> str:
    """Fallback email draft when DeepSeek is unavailable."""
    biz = lead.get('biz', '')
    category = lead.get('category', '')
    website = (lead.get('website') or '').strip()
    competitor_avg = enrichment.get('competitor_avg_reviews', 50)

    if not website:
        return f"""Hey,

Quick introduction — I build websites for {category} businesses here in Brevard, and I noticed {biz} doesn't have one yet.

In 2026, most customers Google before they call. Without a site, you are invisible to those searches while your competitors capture every lead.

I can put together a free mockup of what your site could look like — takes me about 20 minutes and there is zero obligation.

Want me to send it over?

Chris Vega
Presencify — Websites That Work for Brevard Businesses
chris@presencify.co | presencify.co
Free 15-min call: https://calendly.com/presencify
Or call/text: 321-328-5307"""
    else:
        return f"""Hey,

I looked at {biz}'s online setup — noticed a few things that might be costing you {category} leads here in Brevard.

Your competitors are averaging {competitor_avg} Google reviews with optimized websites and local SEO dialed in. There are a few quick fixes that could close that gap.

I run Presencify, a small web studio right here in Merritt Island. Happy to send over a free audit with specific suggestions — no strings attached.

Interested?

Chris Vega
Presencify — Websites That Work for Brevard Businesses
chris@presencify.co | presencify.co
Free 15-min call: https://calendly.com/presencify
Or call/text: 321-328-5307"""


if __name__ == '__main__':
    import sqlite3
    logging.basicConfig(level=logging.INFO)

    db = sqlite3.connect(str(APP_DIR / 'leadgen.db'))
    db.row_factory = sqlite3.Row

    # Test: generate briefing
    print("=== MORNING BRIEFING ===")
    briefing = generate_briefing(db)
    print(briefing[:2000])
    print(f"\n... ({len(briefing)} chars total)")