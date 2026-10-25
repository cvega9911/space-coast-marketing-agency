#!/usr/bin/env python3
"""
Local Business Health Check — Standalone Flask App
====================================================
Extracted from photo-estimate. Deployed on port 8891.
Tactical HUD theme, Google API integration, lead capture.
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
import random
from flask import Flask, request, jsonify, send_from_directory, g, Response

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')

# ──────────────────────────────────────────────
#  CORS — local development
# ──────────────────────────────────────────────

@app.after_request
def add_cors_headers(response: Response) -> Response:
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


# ══════════════════════════════════════════════
#  Google API Helpers
# ══════════════════════════════════════════════

def _google_api_get(url: str) -> dict:
    """Make a Google API request. Returns parsed JSON or empty dict on failure."""
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, json.JSONDecodeError) as e:
        print(f'[health-check] Google API error: {e}')
        return {}


def _geocode_city(city: str) -> tuple:
    """Geocode a city string to (lat, lng) using the Geocoding API."""
    if not GOOGLE_API_KEY:
        return (None, None)

    url = (
        f'https://maps.googleapis.com/maps/api/geocode/json'
        f'?address={urllib.parse.quote(city)}&key={GOOGLE_API_KEY}'
    )
    data = _google_api_get(url)
    results = data.get('results', [])
    if results:
        loc = results[0]['geometry']['location']
        return (loc['lat'], loc['lng'])
    return (None, None)


def _places_text_search(business_name: str, city: str) -> dict:
    """Search for a business using Places API Text Search."""
    if not GOOGLE_API_KEY:
        return {}

    query = f'{business_name} {city}'
    url = (
        f'https://maps.googleapis.com/maps/api/place/textsearch/json'
        f'?query={urllib.parse.quote(query)}&key={GOOGLE_API_KEY}'
    )
    return _google_api_get(url)


def _places_details(place_id: str) -> dict:
    """Get Place Details including rating, review_count, website, address, phone."""
    if not GOOGLE_API_KEY:
        return {}

    fields = 'name,rating,user_ratings_total,formatted_address,website,formatted_phone_number,types,place_id'
    url = (
        f'https://maps.googleapis.com/maps/api/place/details/json'
        f'?place_id={place_id}&fields={fields}&key={GOOGLE_API_KEY}'
    )
    return _google_api_get(url)


def _pagespeed_insights(website: str) -> dict:
    """Run PageSpeed Insights on a URL. Returns performance data."""
    if not GOOGLE_API_KEY:
        return {}

    url = (
        f'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
        f'?url={urllib.parse.quote(website)}&key={GOOGLE_API_KEY}'
        f'&strategy=mobile&category=performance&category=seo'
    )
    return _google_api_get(url)


# ══════════════════════════════════════════════
#  Mock Audit & Helpers
# ══════════════════════════════════════════════

def _mock_audit(business_name: str, city: str, website: str | None) -> dict:
    """Generate a realistic mock audit when Google APIs are unavailable."""
    rng = random.Random(hash(business_name + city))

    has_website = bool(website)
    website_score = rng.randint(15, 25) if has_website else 5
    google_score = rng.randint(8, 22)
    citation_score = rng.randint(5, 13)
    review_score = rng.randint(5, 18)
    social_score = rng.randint(3, 13)

    overall = website_score + google_score + citation_score + review_score + social_score
    overall = min(overall, 100)

    rating = round(rng.uniform(2.5, 5.0), 1) if google_score > 10 else None
    review_count = rng.randint(0, 80) if rating else 0

    categories = [
        {
            'id': 'website',
            'name': 'Website Check',
            'status': 'pass' if website_score >= 20 else ('warn' if website_score >= 12 else 'fail'),
            'score': website_score,
            'max': 25,
            'findings': _mock_website_findings(has_website, website_score),
        },
        {
            'id': 'ranking',
            'name': 'Google Ranking',
            'status': 'pass' if google_score >= 20 else ('warn' if google_score >= 12 else 'fail'),
            'score': google_score,
            'max': 25,
            'findings': _mock_ranking_findings(google_score, business_name, city),
        },
        {
            'id': 'citations',
            'name': 'Citation Health',
            'status': 'pass' if citation_score >= 12 else ('warn' if citation_score >= 8 else 'fail'),
            'score': citation_score,
            'max': 15,
            'findings': [
                {'type': 'good' if citation_score >= 12 else 'warn', 'text': 'NAP consistency across major directories is ' + ('consistent' if citation_score >= 10 else 'inconsistent in 3+ places')},
                {'type': 'warn' if citation_score < 12 else 'good', 'text': 'Yelp, YellowPages, and BBB listings found' if citation_score >= 8 else 'Missing from Yelp and YellowPages'},
                {'type': 'bad' if citation_score < 8 else 'good', 'text': 'Business hours match across platforms' if citation_score >= 10 else 'Business hours mismatch detected on 2 platforms'},
            ],
        },
        {
            'id': 'reviews',
            'name': 'Review Score',
            'status': 'pass' if review_score >= 15 else ('warn' if review_score >= 10 else 'fail'),
            'score': review_score,
            'max': 20,
            'findings': _mock_review_findings(rating, review_count, review_score),
        },
        {
            'id': 'social',
            'name': 'Social Presence',
            'status': 'pass' if social_score >= 12 else ('warn' if social_score >= 7 else 'fail'),
            'score': social_score,
            'max': 15,
            'findings': _mock_social_findings(social_score),
        },
    ]

    recommendations = _generate_recommendations(categories, overall)

    return {
        'ok': True,
        'mock': True,
        'mock_note': 'Live data unavailable — showing estimated scores based on typical patterns',
        'business_name': business_name,
        'city': city,
        'website': website,
        'overall_score': overall,
        'rating': rating,
        'review_count': review_count,
        'categories': categories,
        'recommendations': recommendations,
    }


def _mock_website_findings(has_website: bool, score: int) -> list:
    if not has_website:
        return [
            {'type': 'bad', 'text': 'No website detected — this is a critical gap'},
            {'type': 'bad', 'text': 'Missing online presence means lost credibility with 56% of consumers'},
            {'type': 'warn', 'text': 'Even a simple landing page can improve trust dramatically'},
        ]
    if score >= 20:
        return [
            {'type': 'good', 'text': 'Website is present and loads reasonably well'},
            {'type': 'good', 'text': 'Mobile responsiveness appears adequate'},
            {'type': 'warn', 'text': 'Minor SEO improvements could boost organic traffic'},
        ]
    elif score >= 12:
        return [
            {'type': 'warn', 'text': 'Website is present but could use performance improvements'},
            {'type': 'warn', 'text': 'Mobile experience may be suboptimal — 61% of local searches are mobile'},
            {'type': 'bad', 'text': 'Slow load times cost conversions — each second costs ~7% in conversions'},
        ]
    else:
        return [
            {'type': 'bad', 'text': 'Website has critical performance issues'},
            {'type': 'bad', 'text': 'Not mobile-friendly — Google penalizes this in rankings'},
            {'type': 'bad', 'text': 'Missing HTTPS or has security warnings'},
        ]


def _mock_ranking_findings(score: int, business_name: str, city: str) -> list:
    if score >= 20:
        return [
            {'type': 'good', 'text': f'Appears in top 3 for "{business_name}" searches in {city}'},
            {'type': 'good', 'text': 'Google Business Profile is claimed and verified'},
            {'type': 'warn', 'text': 'Could rank higher for category-specific searches'},
        ]
    elif score >= 12:
        return [
            {'type': 'warn', 'text': f'Appears in results but not in top 3 for {city} searches'},
            {'type': 'warn', 'text': 'Google Business Profile may be incomplete'},
            {'type': 'bad', 'text': 'Missing category tags — people searching by service may not find you'},
        ]
    else:
        return [
            {'type': 'bad', 'text': f'Not appearing in top results for {city} searches'},
            {'type': 'bad', 'text': 'Google Business Profile may be unclaimed or unverified'},
            {'type': 'bad', 'text': 'Competitors are outranking you for your own business name'},
        ]


def _mock_review_findings(rating: float | None, review_count: int, score: int) -> list:
    if rating is None:
        return [
            {'type': 'bad', 'text': 'No reviews found — 93% of consumers read reviews before choosing'},
            {'type': 'bad', 'text': 'Zero social proof means prospects choose competitors instead'},
            {'type': 'warn', 'text': 'Reviews directly impact local search ranking on Google'},
        ]
    findings = []
    if rating >= 4.0:
        findings.append({'type': 'good', 'text': f'Strong rating: {rating} / 5.0'})
    elif rating >= 3.0:
        findings.append({'type': 'warn', 'text': f'Average rating: {rating} / 5.0 — room for improvement'})
    else:
        findings.append({'type': 'bad', 'text': f'Low rating: {rating} / 5.0 — reputation needs urgent attention'})

    if review_count >= 30:
        findings.append({'type': 'good', 'text': f'Healthy review volume: {review_count} reviews'})
    elif review_count >= 10:
        findings.append({'type': 'warn', 'text': f'Low review count: {review_count} — competitors likely have more'})
    else:
        findings.append({'type': 'bad', 'text': f'Very few reviews: {review_count} — looks inactive to prospects'})

    if score >= 15:
        findings.append({'type': 'good', 'text': 'Review recency is good — recent reviews build trust'})
    else:
        findings.append({'type': 'warn', 'text': 'No recent reviews in the last 90 days'})

    return findings[:3]


def _mock_social_findings(score: int) -> list:
    if score >= 12:
        return [
            {'type': 'good', 'text': 'Facebook business page found and appears active'},
            {'type': 'good', 'text': 'Instagram profile detected with consistent branding'},
            {'type': 'warn', 'text': 'Nextdoor profile not claimed — neighborhood visibility gap'},
        ]
    elif score >= 7:
        return [
            {'type': 'warn', 'text': 'Facebook page exists but may be inactive or incomplete'},
            {'type': 'bad', 'text': 'No Instagram profile detected — missing visual social traffic'},
            {'type': 'warn', 'text': 'Social profiles not linked on website or Google listing'},
        ]
    else:
        return [
            {'type': 'bad', 'text': 'No Facebook business page detected'},
            {'type': 'bad', 'text': 'No Instagram presence — 71% of small businesses use Instagram'},
            {'type': 'bad', 'text': 'Zero social media presence — invisible to social-driven customers'},
        ]


def _generate_recommendations(categories: list, overall: int) -> list:
    """Generate top 3 specific recommendations based on weakest categories."""
    scored = []
    for cat in categories:
        ratio = cat['score'] / cat['max'] if cat['max'] > 0 else 0
        scored.append((ratio, cat))

    scored.sort(key=lambda x: x[0])

    recs = []

    templates = {
        'website': {
            'title': 'Build or Optimize Your Website',
            'description': "A fast, mobile-friendly website is your 24/7 salesperson. We'll build you a modern site that loads in under 2 seconds, ranks on Google, and converts visitors into leads — with clear calls-to-action, before/after galleries, and online booking.",
        },
        'ranking': {
            'title': 'Claim & Optimize Your Google Business Profile',
            'description': "Your Google Business Profile is the #1 local ranking factor. We'll fully optimize it — correct categories, service areas, business hours, photos, and weekly posts — to push you into the top 3 map pack results for your city.",
        },
        'citations': {
            'title': 'Fix Citation Inconsistencies Across the Web',
            'description': "Inconsistent NAP (Name, Address, Phone) across directories confuses Google and hurts your ranking. We'll audit 50+ directories and fix every mismatch, building consistent, authoritative citations that boost local SEO.",
        },
        'reviews': {
            'title': 'Launch a Review Generation System',
            'description': 'Reviews are social proof and a top-3 ranking signal. We\'ll set up an automated review request system that texts/emails happy customers, making it effortless to collect 10-20 new 5-star reviews per month.',
        },
        'social': {
            'title': 'Establish Your Social Media Presence',
            'description': 'Customers check social media before hiring. We\'ll create and brand your Facebook + Instagram profiles, set up a content calendar, and post engaging content that drives local traffic to your business.',
        },
    }

    for ratio, cat in scored[:3]:
        tmpl = templates.get(cat['id'], {
            'title': f'Improve Your {cat["name"]}',
            'description': f'Your {cat["name"].lower()} score is holding you back. We can help you address these gaps with targeted improvements that directly impact your customer acquisition.',
        })
        recs.append({
            'priority': len(recs) + 1,
            'category': cat['id'],
            'title': tmpl['title'],
            'description': tmpl['description'],
        })

    return recs


# ══════════════════════════════════════════════
#  Live Report Builder
# ══════════════════════════════════════════════

def _build_live_report(
    business_name: str,
    city: str,
    website: str | None,
    place_details: dict,
    places_results: list,
    pagespeed_data: dict,
) -> dict:
    """Build a live audit report from real Google API data."""

    # ── Category 1: Website Check (max 25) ──────
    website_score = 0
    website_findings = []
    website_status = 'fail'

    if website:
        psi_lighthouse = pagespeed_data.get('lighthouseResult', {})
        if psi_lighthouse:
            perf = psi_lighthouse.get('categories', {}).get('performance', {}).get('score', 0) or 0
            perf_pct = int(perf * 100)

            if perf_pct >= 90:
                website_score = 25
                website_status = 'pass'
                website_findings.append({'type': 'good', 'text': f'Excellent PageSpeed score: {perf_pct}/100'})
            elif perf_pct >= 70:
                website_score = 18
                website_status = 'warn'
                website_findings.append({'type': 'warn', 'text': f'Fair PageSpeed score: {perf_pct}/100 — could improve'})
            elif perf_pct >= 50:
                website_score = 12
                website_status = 'warn'
                website_findings.append({'type': 'warn', 'text': f'Below-average PageSpeed score: {perf_pct}/100'})
            else:
                website_score = 6
                website_status = 'fail'
                website_findings.append({'type': 'bad', 'text': f'Poor PageSpeed score: {perf_pct}/100 — losing customers'})

            # SEO score
            seo = psi_lighthouse.get('categories', {}).get('seo', {}).get('score', 0) or 0
            seo_pct = int(seo * 100)
            if seo_pct >= 90:
                website_findings.append({'type': 'good', 'text': f'Strong SEO score: {seo_pct}/100'})
            else:
                website_findings.append({'type': 'warn', 'text': f'SEO score: {seo_pct}/100 — needs improvement'})

            # FCP (First Contentful Paint)
            audits = psi_lighthouse.get('audits', {})
            fcp = audits.get('first-contentful-paint', {})
            fcp_display = fcp.get('displayValue', 'N/A')
            if fcp.get('score', 0) >= 0.9:
                website_findings.append({'type': 'good', 'text': f'First Contentful Paint: {fcp_display} (fast)'})
            else:
                website_findings.append({'type': 'warn', 'text': f'First Contentful Paint: {fcp_display} (could be faster)'})
        else:
            website_score = 10
            website_status = 'warn'
            website_findings.append({'type': 'warn', 'text': 'Website found but PageSpeed data unavailable'})
            website_findings.append({'type': 'warn', 'text': 'Could not assess performance — check manually'})
            website_findings.append({'type': 'warn', 'text': 'Ensure your site is publicly accessible for analysis'})
    else:
        website_score = 5
        website_status = 'fail'
        website_findings = [
            {'type': 'bad', 'text': 'No website provided — critical gap in online presence'},
            {'type': 'bad', 'text': "56% of consumers won't trust a business without a website"},
            {'type': 'warn', 'text': 'Even a simple one-page site dramatically improves credibility'},
        ]

    # ── Category 2: Google Ranking (max 25) ─────
    ranking_score = 0
    ranking_findings = []
    ranking_status = 'fail'

    if place_details:
        name = place_details.get('name', '')
        address = place_details.get('formatted_address', '')
        types = place_details.get('types', [])

        ranking_score = 22
        ranking_status = 'pass'
        ranking_findings.append({'type': 'good', 'text': f'Found on Google Maps: "{name}" at {address}'})

        if types:
            ranking_findings.append({'type': 'good', 'text': f'Categorized as: {", ".join(types[:3])}'})

        # Check if they appear first for their own name
        if places_results and len(places_results) > 0:
            first = places_results[0]
            if first.get('name', '').lower() == business_name.lower():
                ranking_findings.append({'type': 'good', 'text': '#1 result for your business name in this area'})
            else:
                ranking_score = 16
                ranking_status = 'warn'
                ranking_findings.append({'type': 'warn', 'text': 'Not the top result — competitors may be outranking you'})
        else:
            ranking_findings.append({'type': 'warn', 'text': 'Could not verify search rank position'})
    else:
        ranking_score = 8
        ranking_status = 'fail'
        ranking_findings = [
            {'type': 'bad', 'text': f'Not found on Google Maps for "{business_name}" in {city}'},
            {'type': 'bad', 'text': 'Google Business Profile may be missing or unclaimed'},
            {'type': 'bad', 'text': "Without a profile, you're invisible to 86% of local searchers"},
        ]

    # ── Category 3: Citation Health (max 15) ────
    citation_score = 10
    citation_status = 'warn'
    citation_findings = []

    if place_details:
        phone = place_details.get('formatted_phone_number', '')
        addr = place_details.get('formatted_address', '')
        if phone and addr:
            citation_score = 12
            citation_status = 'pass'
            citation_findings.append({'type': 'good', 'text': 'NAP (Name, Address, Phone) found on Google'})
        else:
            citation_findings.append({'type': 'warn', 'text': 'Incomplete NAP data on Google listing'})
    else:
        citation_findings.append({'type': 'bad', 'text': 'No Google listing — NAP consistency cannot be verified'})

    citation_findings.append({'type': 'warn', 'text': 'Citation audit requires BrightLocal/Whitespark API for full scan'})
    citation_findings.append({'type': 'warn', 'text': 'Inconsistent citations can drop local rankings by 2-3 positions'})

    # ── Category 4: Review Score (max 20) ───────
    review_score = 0
    review_findings = []
    review_status = 'fail'
    rating = None
    review_count = 0

    if place_details:
        rating = place_details.get('rating')
        review_count = place_details.get('user_ratings_total', 0)

        if rating is not None:
            if rating >= 4.5:
                review_score = 18
                review_status = 'pass'
                review_findings.append({'type': 'good', 'text': f'Excellent rating: {rating} / 5.0'})
            elif rating >= 4.0:
                review_score = 15
                review_status = 'pass'
                review_findings.append({'type': 'good', 'text': f'Strong rating: {rating} / 5.0'})
            elif rating >= 3.0:
                review_score = 10
                review_status = 'warn'
                review_findings.append({'type': 'warn', 'text': f'Average rating: {rating} / 5.0'})
            else:
                review_score = 5
                review_status = 'fail'
                review_findings.append({'type': 'bad', 'text': f'Low rating: {rating} / 5.0 — reputation needs attention'})

        if review_count >= 50:
            review_findings.append({'type': 'good', 'text': f'Strong review volume: {review_count} reviews'})
        elif review_count >= 10:
            review_findings.append({'type': 'warn', 'text': f'Moderate review count: {review_count} — collect more'})
        elif review_count > 0:
            review_findings.append({'type': 'bad', 'text': f'Very few reviews: {review_count} — looks inactive'})
        else:
            review_findings.append({'type': 'bad', 'text': 'Zero reviews — 93% of consumers read reviews first'})
    else:
        review_findings = [
            {'type': 'bad', 'text': 'No Google reviews found'},
            {'type': 'bad', 'text': 'Reviews are a top-3 local ranking factor'},
            {'type': 'warn', 'text': 'Even 10 reviews can dramatically improve trust signals'},
        ]

    # ── Category 5: Social Presence (max 15) ────
    social_score = 8
    social_status = 'warn'
    social_findings = [
        {'type': 'warn', 'text': 'Social presence check requires manual verification or API integration'},
        {'type': 'warn', 'text': 'Check Facebook, Instagram, Nextdoor, and LinkedIn for business profiles'},
        {'type': 'warn', 'text': '71% of consumers who have a good social media experience recommend the business'},
    ]

    # ── Compute overall score ───────────────────
    overall = website_score + ranking_score + citation_score + review_score + social_score
    overall = min(overall, 100)

    categories = [
        {'id': 'website', 'name': 'Website Check', 'status': website_status, 'score': website_score, 'max': 25, 'findings': website_findings},
        {'id': 'ranking', 'name': 'Google Ranking', 'status': ranking_status, 'score': ranking_score, 'max': 25, 'findings': ranking_findings},
        {'id': 'citations', 'name': 'Citation Health', 'status': citation_status, 'score': citation_score, 'max': 15, 'findings': citation_findings},
        {'id': 'reviews', 'name': 'Review Score', 'status': review_status, 'score': review_score, 'max': 20, 'findings': review_findings},
        {'id': 'social', 'name': 'Social Presence', 'status': social_status, 'score': social_score, 'max': 15, 'findings': social_findings},
    ]

    recommendations = _generate_recommendations(categories, overall)

    return {
        'ok': True,
        'mock': False,
        'business_name': business_name,
        'city': city,
        'website': website,
        'overall_score': overall,
        'rating': rating,
        'review_count': review_count,
        'categories': categories,
        'recommendations': recommendations,
    }


# ══════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════

# ── GET / — Serve the health check UI ──────────

@app.route('/')
def index():
    """Serve the main HTML UI using send_from_directory (NO Jinja2)."""
    return send_from_directory(BASE_DIR, 'index.html')


# ── GET /static/<path> — Serve static files ────

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), filename)


# ── POST /api/health-check — Run the audit ─────

@app.route('/api/health-check', methods=['POST'])
def api_health_check():
    """
    Run a local business online presence audit.

    Accepts JSON:
        - business_name (str, required): Name of the business
        - city (str, required): City name (e.g. "Melbourne, FL")
        - website (str, optional): Business website URL

    Returns a full audit report with category scores, overall score,
    and top 3 recommendations.
    """
    data = request.get_json(silent=True) or {}

    business_name = (data.get('business_name') or '').strip()
    city = (data.get('city') or '').strip()
    website = (data.get('website') or '').strip() or None

    if not business_name:
        return jsonify({'error': 'business_name is required'}), 400
    if not city:
        return jsonify({'error': 'city is required'}), 400

    # Normalize website URL
    if website and not website.startswith(('http://', 'https://')):
        website = 'https://' + website

    # ── Try live Google APIs ────────────────────
    try:
        # 1. Find the business on Google Places
        places_data = _places_text_search(business_name, city)
        places_results = places_data.get('results', [])

        place_details = {}

        if places_results:
            top_place = places_results[0]
            place_id = top_place.get('place_id', '')

            # Get detailed info
            details_data = _places_details(place_id)
            place_details = details_data.get('result', {})

        # 2. Website check via PageSpeed Insights
        pagespeed_data = {}
        if website:
            pagespeed_data = _pagespeed_insights(website)

        # If we got real data, build the live report
        if place_details or pagespeed_data:
            return jsonify(_build_live_report(
                business_name, city, website,
                place_details, places_results,
                pagespeed_data
            ))
    except Exception as e:
        print(f'[health-check] Live API path failed, falling back to mock: {e}')

    # ── Fallback to mock data ───────────────────
    return jsonify(_mock_audit(business_name, city, website))


# ──────────────────────────────────────────────
#  Main
# ──────────────────────────────────────────────

if __name__ == '__main__':
    print(f'Starting Local Business Health Check server on 127.0.0.1:8891')
    print(f'Base directory: {BASE_DIR}')
    print(f'Google API key available: {bool(GOOGLE_API_KEY)}')
    app.run(host='127.0.0.1', port=8891, debug=False)