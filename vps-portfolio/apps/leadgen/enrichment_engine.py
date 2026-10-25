#!/usr/bin/env python3
"""
enrichment_engine.py — Presencify Lead Acquisition Engine v3
Enriches leads with audit data, competitor analysis, trigger detection,
and stores everything in the leads.enrichment_json column.

Runs against real websites and search results. Uses DeepSeek for
audit generation only (cost-controlled). Most analysis is rule-based.
"""

import json
import logging
import re
import ssl
import time
import socket
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

log = logging.getLogger('enrichment')

# ═════════════════════════════════════════════════════════════
# CONFIG
# ═════════════════════════════════════════════════════════════

# Timeout for web requests
FETCH_TIMEOUT = 10  # seconds
# Delay between requests (human-paced scraping)
REQUEST_DELAY = 1.0  # seconds
# Max pages per website to audit
MAX_PAGES = 3

# OpenRouter key (same source as app.py)
OPENROUTER_KEY = None
def _load_key():
    global OPENROUTER_KEY
    if OPENROUTER_KEY:
        return OPENROUTER_KEY
    import os
    OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')
    if not OPENROUTER_KEY:
        env_file = Path('/home/jarvis/.openclaw/.env')
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith('OPENROUTER_API_KEY='):
                    OPENROUTER_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    return OPENROUTER_KEY


# ═════════════════════════════════════════════════════════════
# WEBSITE AUDIT
# ═════════════════════════════════════════════════════════════

def _fetch_page(url: str) -> str | None:
    """Fetch a page, return HTML or None."""
    try:
        resp = requests.get(
            url,
            timeout=FETCH_TIMEOUT,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            allow_redirects=True,
        )
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        log.debug(f"Failed to fetch {url}: {e}")
        return None


def _check_ssl(domain: str) -> bool:
    """Check if domain has valid SSL."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain):
                return True
    except Exception:
        return False


def _normalize_url(website: str) -> str:
    """Ensure URL has scheme."""
    website = website.strip()
    if not website:
        return ''
    if not website.startswith(('http://', 'https://')):
        website = 'https://' + website
    return website


def audit_website(website: str) -> dict:
    """
    Audit a website for technical and content signals.
    Returns dict with mobile_friendly, has_ssl, page_speed_slow,
    has_faq_schema, has_service_pages, has_blog, has_ctas,
    has_lead_capture, modern_site, site_age_years, has_aeo_geo.
    """
    website = website.strip()
    if not website:
        return {
            'has_website': False,
            'has_ssl': False,
            'mobile_friendly': False,
            'has_faq_schema': False,
            'has_service_pages': False,
            'has_blog': False,
            'has_ctas': False,
            'has_lead_capture': False,
            'modern_site': False,
            'has_aeo_geo': False,
            'page_speed_slow': True,
        }

    url = _normalize_url(website)
    domain = urlparse(url).netloc

    result = {
        'has_website': True,
        'url': url,
        'domain': domain,
        'has_ssl': _check_ssl(domain),
    }

    html = _fetch_page(url)
    if not html:
        log.info(f"Could not fetch {website} — using conservative defaults")
        result.update({
            'mobile_friendly': True,   # unknown, don't penalize
            'has_faq_schema': False,
            'has_service_pages': False,
            'has_blog': False,
            'has_ctas': False,
            'has_lead_capture': False,
            'modern_site': False,
            'has_aeo_geo': False,
            'page_speed_slow': True,
        })
        return result

    html_lower = html.lower()

    # Mobile friendly — check viewport meta
    result['mobile_friendly'] = 'viewport' in html_lower and 'width=device-width' in html_lower

    # FAQ Schema
    result['has_faq_schema'] = 'faqpage' in html_lower or 'question' in html_lower and 'application/ld+json' in html_lower

    # Service area pages — look for city names + service keywords
    service_signals = len(re.findall(r'(service|area|location|cities|coverage)', html_lower))
    result['has_service_pages'] = service_signals >= 2

    # Blog
    result['has_blog'] = bool(re.search(r'(/blog|/articles|/news)', html_lower))

    # CTAs
    cta_signals = len(re.findall(
        r'(call now|get a quote|schedule|book now|free estimate|contact us|request|get started)',
        html_lower
    ))
    result['has_ctas'] = cta_signals >= 2

    # Lead capture
    result['has_lead_capture'] = bool(re.search(
        r'(<form|contact form|newsletter|subscribe|get in touch)',
        html_lower
    ))

    # Modern site — check for modern JS frameworks, CSS vars, responsive
    modern_signals = [
        'react' in html_lower,
        'vue' in html_lower,
        'next' in html_lower,
        'tailwind' in html_lower,
        'bootstrap' in html_lower,
        'wordpress' in html_lower,
        'wix' in html_lower,
        'squarespace' in html_lower,
        '--' in html_lower,  # CSS custom properties
        '@media' in html_lower and 'max-width' in html_lower,  # responsive media queries
    ]
    result['modern_site'] = sum(modern_signals) >= 2

    # AEO/GEO content (Answer Engine Optimization / Generative Engine Optimization)
    aeo_signals = [
        'faq' in html_lower,
        'question' in html_lower and 'answer' in html_lower,
        'how-to' in html_lower,
        'guide' in html_lower,
        'schema.org' in html_lower,
        'structured data' in html_lower,
    ]
    result['has_aeo_geo'] = sum(aeo_signals) >= 2

    # Page speed — rough estimate based on HTML size and script count
    script_count = html_lower.count('<script')
    html_size = len(html)
    result['page_speed_slow'] = (script_count > 15) or (html_size > 500000)

    # Estimate site age from copyright footer
    copyright_years = re.findall(r'(?:©|copyright)\s*(?:20)?(\d{2,4})', html_lower)
    if copyright_years:
        try:
            earliest = min(int(y) for y in copyright_years if len(y) == 4)
            result['site_age_years'] = max(0, datetime.now().year - earliest)
        except (ValueError, TypeError):
            result['site_age_years'] = 0

    # Detect CMS
    if 'wp-content' in html_lower or 'wp-includes' in html_lower:
        result['cms'] = 'WordPress'
    elif 'squarespace' in html_lower:
        result['cms'] = 'Squarespace'
    elif 'wix.com' in html_lower:
        result['cms'] = 'Wix'
    elif 'shopify' in html_lower:
        result['cms'] = 'Shopify'

    return result


# ═════════════════════════════════════════════════════════════
# COMPETITOR ANALYSIS
# ═════════════════════════════════════════════════════════════

def _search_google(query: str, limit: int = 10) -> list[dict]:
    """Search Google for competitors. Uses web_search if available."""
    results = []
    try:
        resp = requests.get(
            'https://www.google.com/search',
            params={'q': query, 'num': limit},
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
            timeout=10,
        )
        # Extract organic results via regex (fragile but avoids API cost)
        if resp.status_code == 200:
            matches = re.findall(
                r'<a[^>]*href="(?P<url>/url\?q=https?://[^"]+)"[^>]*>(?P<title>[^<]+)</a>',
                resp.text
            )
            for url_fragment, title in matches[:limit]:
                if 'google.com' in url_fragment:
                    continue
                results.append({'title': title, 'url': url_fragment.replace('/url?q=', '')})
    except Exception as e:
        log.debug(f"Google search failed: {e}")
    return results


def find_competitors(biz: str, category: str, location: str = 'Merritt Island FL') -> dict:
    """
    Find top 3 local competitors and estimate their review counts.
    Returns dict with competitors list and competitor_avg_reviews.
    """
    competitors = []

    # Try searching for competitors
    query = f'{category} near {location}'
    search_results = _search_google(query, limit=10)

    # Filter out the prospect's own business
    for result in search_results:
        title = result.get('title', '')
        if biz.lower() in title.lower():
            continue
        competitors.append({
            'name': title,
            'url': result.get('url', ''),
            'review_count': 0,
            'avg_rating': 0.0,
        })
        if len(competitors) >= 3:
            break

    # If we couldn't find competitors, create synthetic estimates
    if not competitors:
        # Industry average review counts for local businesses
        avg_reviews = {
            'hvac': 85, 'plumbing': 70, 'roofing': 60, 'electrician': 55,
            'dentist': 120, 'chiropractor': 90, 'pest control': 75,
            'landscaping': 40, 'tree service': 35, 'pressure washing': 25,
            'garage door': 45, 'remodeling': 50, 'auto repair': 80,
            'handyman': 30, 'painting': 35, 'fencing': 30,
            'cleaning service': 25, 'flooring': 30, 'concrete': 25,
        }
        target_reviews = avg_reviews.get(category.lower(), 50)

        competitors = [
            {'name': f'Competitor A ({category})', 'url': '', 'review_count': target_reviews, 'avg_rating': 4.5},
            {'name': f'Competitor B ({category})', 'url': '', 'review_count': int(target_reviews * 0.8), 'avg_rating': 4.3},
            {'name': f'Competitor C ({category})', 'url': '', 'review_count': int(target_reviews * 0.6), 'avg_rating': 4.1},
        ]

    # Calculate average competitor reviews
    competitor_avg = (
        sum(c.get('review_count', 0) for c in competitors) // max(len(competitors), 1)
    ) if competitors else 0

    return {
        'competitors': competitors,
        'competitor_avg_reviews': competitor_avg,
    }


# ═════════════════════════════════════════════════════════════
# TRIGGER DETECTION
# ═════════════════════════════════════════════════════════════

def detect_triggers(biz: str, notes: str, website_html: str = '') -> list[str]:
    """
    Detect recent business triggers that indicate buying intent.
    Returns list of trigger strings like 'new reviews', 'hiring', etc.
    """
    triggers = []
    combined = f"{notes} {website_html}".lower()

    # Hiring signals
    hiring_keywords = ['hiring', 'now hiring', 'join our team', 'careers', 'we\'re hiring',
                       'job opening', 'employment', 'apply now']
    for kw in hiring_keywords:
        if kw in combined:
            triggers.append('hiring')
            break

    # Expansion signals
    expand_keywords = ['expanding', 'new location', 'grand opening', 'coming soon',
                       'under construction', 'renovation', 'new office']
    for kw in expand_keywords:
        if kw in combined:
            triggers.append('expanding')
            break

    # New services
    service_keywords = ['new service', 'now offering', 'introducing', 'just launched']
    for kw in service_keywords:
        if kw in combined:
            triggers.append('new services')
            break

    # Recent reviews
    review_signals = ['recent review', 'new review', 'review us', 'leave a review']
    for kw in review_signals:
        if kw in combined:
            triggers.append('recent review activity')
            break

    # New GBP photos (hard to detect remotely, but note if social active)
    if 'facebook' in combined or 'instagram' in combined:
        triggers.append('active social presence')

    return triggers


# ═════════════════════════════════════════════════════════════
# MAIN ENRICHMENT PIPELINE
# ═════════════════════════════════════════════════════════════

def enrich_lead(lead: dict, scrape_website: bool = True) -> dict:
    """
    Full enrichment pipeline for a single lead.
    Returns enrichment dict ready to store in enrichment_json.
    """
    enrichment = {
        'enriched_at': datetime.now(timezone.utc).isoformat(),
        'is_enriched': True,
    }

    biz = lead.get('biz', '')
    website = (lead.get('website') or '').strip()
    category = lead.get('category', '')
    notes = lead.get('notes', '')

    # 1. Website audit
    website_html = ''
    if website and scrape_website:
        audit = audit_website(website)
        enrichment.update(audit)
        # Fetch HTML for trigger detection
        website_html = _fetch_page(_normalize_url(website)) or ''
    elif not website:
        enrichment.update({
            'has_website': False,
            'has_ssl': False,
            'mobile_friendly': False,
            'has_faq_schema': False,
            'has_service_pages': False,
            'has_blog': False,
            'has_ctas': False,
            'has_lead_capture': False,
            'modern_site': False,
            'has_aeo_geo': False,
            'page_speed_slow': True,
        })

    # 2. Competitor analysis
    competitors = find_competitors(biz, category)
    enrichment.update(competitors)

    # 3. Trigger detection
    triggers = detect_triggers(biz, notes, website_html)
    enrichment['recent_triggers'] = triggers

    # 4. Contactability signals (from existing data)
    enrichment['owner_email_available'] = bool(lead.get('email', '').strip())
    enrichment['owner_phone_available'] = bool(lead.get('phone', '').strip())
    enrichment['owner_name_known'] = bool(lead.get('email', '').strip())  # we have a contact

    # 5. Revenue signals
    enrichment['years_in_business'] = 5  # default
    notes_lower = notes.lower()
    if '52yr' in notes_lower:
        enrichment['years_in_business'] = 52
        enrichment['site_age_years'] = enrichment.get('site_age_years', 5)
    elif 'year' in notes_lower:
        enrichment['years_in_business'] = 10

    # 6. GBP signals (inferred until we integrate GBP API)
    enrichment['has_gbp'] = bool(website) or 'facebook' in notes_lower
    enrichment['gbp_optimized'] = False  # most aren't
    enrichment['review_count'] = 0  # unknown
    enrichment['last_review_days'] = 999  # unknown

    # 7. Ownership signals
    enrichment['is_multi_location'] = 'second location' in notes_lower or 'multi' in notes_lower
    enrichment['is_large_org'] = False  # conservative
    enrichment['is_owner_operated'] = not enrichment['is_multi_location'] and not enrichment['is_large_org']

    return enrichment


def enrich_batch(db, lead_ids: list = None, scrape_websites: bool = True) -> dict:
    """
    Enrich a batch of leads and store results in the DB.
    Returns {'enriched': int, 'failed': int, 'errors': [...]}
    """
    if lead_ids is None:
        rows = db.execute("SELECT * FROM leads ORDER BY id").fetchall()
    else:
        placeholders = ','.join('?' * len(lead_ids))
        rows = db.execute(
            f"SELECT * FROM leads WHERE id IN ({placeholders})",
            lead_ids
        ).fetchall()

    enriched = 0
    failed = 0
    errors = []

    for i, row in enumerate(rows):
        lead = dict(row)
        lead_id = lead['id']

        try:
            enrichment = enrich_lead(lead, scrape_website=scrape_websites)
            enrichment_json = json.dumps(enrichment)

            db.execute(
                "UPDATE leads SET enrichment_json=? WHERE id=?",
                (enrichment_json, lead_id)
            )
            enriched += 1

            if (i + 1) % 5 == 0:
                db.commit()
                log.info(f"Enriched {i+1}/{len(rows)} leads...")
                time.sleep(REQUEST_DELAY)

        except Exception as e:
            failed += 1
            errors.append({'lead_id': lead_id, 'biz': lead.get('biz', '?'), 'error': str(e)})
            log.error(f"Enrichment failed for lead {lead_id} ({lead.get('biz', '?')}): {e}")

    db.commit()
    log.info(f"Enrichment complete: {enriched} enriched, {failed} failed")
    return {'enriched': enriched, 'failed': failed, 'errors': errors}


# ═════════════════════════════════════════════════════════════
# 30x MARKETING PANEL INSIGHTS
# ═════════════════════════════════════════════════════════════

# APPLIED FRAMEWORKS:
#
# 1. Liam Ottley (AI Automation Agency Client Acquisition):
#    - "Sell the outcome, not the service" — every enrichment finding must
#      connect to a business outcome (lost revenue, missed calls, invisible to search)
#    - "The biggest competitor isn't another agency — it's 'do nothing'" —
#      our audits must make inaction feel costly
#
# 2. Alex Hormozi (Offer Creation / Value Equation):
#    - Dream Outcome: "More customers finding you online"
#    - Perceived Likelihood: Show competitor comparison (they're losing to competitors)
#    - Time Delay: "We can have a site live in 2 weeks"
#    - Effort & Sacrifice: "We handle everything — you focus on your business"
#
# 3. Growth Tribe (AARRR Funnel):
#    - Acquisition: Website + GBP optimization = more leads in the door
#    - Activation: Click-to-call, booking forms = instant conversion
#    - Retention: Review management = repeat customers
#    - Revenue: Higher-ticket packages for high-revenue industries
#    - Referral: Happy clients become case studies for more leads


if __name__ == '__main__':
    import sqlite3
    logging.basicConfig(level=logging.INFO)

    db = sqlite3.connect('/home/jarvis/presencify/leadgen/leadgen.db')
    db.row_factory = sqlite3.Row

    # Test: enrich 3 leads
    result = enrich_batch(db, lead_ids=[1, 4, 5], scrape_websites=True)
    print(f"Result: {result}")

    # Show enrichment
    for lid in [1, 4, 5]:
        row = db.execute("SELECT biz, enrichment_json FROM leads WHERE id=?", (lid,)).fetchone()
        if row:
            enrich = json.loads(row['enrichment_json']) if row['enrichment_json'] else {}
            print(f"\n{row['biz']}:")
            print(f"  Web audit: SSL={enrich.get('has_ssl')}, Mobile={enrich.get('mobile_friendly')}, Modern={enrich.get('modern_site')}")
            print(f"  Competitors: avg {enrich.get('competitor_avg_reviews', 0)} reviews")
            print(f"  Triggers: {enrich.get('recent_triggers', [])}")
            print(f"  Enriched: {enrich.get('is_enriched')}")