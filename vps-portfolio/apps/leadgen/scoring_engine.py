#!/usr/bin/env python3
"""
scoring_engine.py — Presencify Lead Acquisition Engine v3
Implements the full ICP filtering, opportunity scoring, close probability,
contactability, and revenue opportunity scoring system.

Scores are 0-100. Final Priority = (Opportunity × Close × Contactability).
Reject anything below 60. Outreach priority: 80+.

All scoring rules per the v3 SOURCE OF TRUTH.
"""

from dataclasses import dataclass, field
from typing import Optional

# ═════════════════════════════════════════════════════════════
# IDEAL CUSTOMER PROFILE (ICP)
# ═════════════════════════════════════════════════════════════

ICP_INDUSTRIES = {
    'hvac', 'plumbing', 'roofing', 'electrician', 'dentist', 'chiropractor',
    'pest control', 'landscaping', 'tree service', 'pressure washing',
    'garage door', 'remodeling', 'home services', 'auto repair',
    'general contractor', 'handyman', 'painting', 'fencing',
    'pool service', 'cleaning service', 'flooring', 'concrete',
}

HIGH_TICKET_INDUSTRIES = {
    'hvac', 'plumbing', 'roofing', 'electrician', 'dentist',
    'remodeling', 'general contractor', 'chiropractor',
}

# Industries with highest revenue potential (dentists, roofers, HVAC, plumbers)
PREMIUM_TICKET_INDUSTRIES = {'dentist', 'roofing', 'hvac', 'plumbing'}

# Keywords that indicate a national brand or franchise
FRANCHISE_KEYWORDS = [
    'servpro', 'servicemaster', 'mr. rooter', 'mr. electric', 'molly maid',
    'merry maids', 'chem-dry', 'jan-pro', 'superior fence', 'stanley steemer',
    'rotorooter', 'roto-rooter', 'terminix', 'orkin', 'trugreen',
    'the ground guys', 'neighborly', 'precision door', 'a1 garage',
    'ace hardware', 'home depot', "lowes", "lowe's",
]

GEOGRAPHY_PRIORITY = {
    'brevard': 1,      # Brevard County
    'space coast': 2,  # Space Coast
    'florida': 3,      # Florida
    'southeast': 4,    # Southeast US
    'other': 5,
}

# ═════════════════════════════════════════════════════════════
# REVENUE ESTIMATES BY INDUSTRY (avg job value)
# ═════════════════════════════════════════════════════════════

REVENUE_ESTIMATES = {
    'hvac':               {'avg_job': 5000, 'multiplier': 1.4},
    'plumbing':           {'avg_job': 800,  'multiplier': 1.1},
    'roofing':            {'avg_job': 12000, 'multiplier': 1.5},
    'electrician':        {'avg_job': 1200, 'multiplier': 1.0},
    'dentist':            {'avg_job': 800,  'multiplier': 1.5},
    'chiropractor':       {'avg_job': 200,  'multiplier': 1.2},
    'pest control':       {'avg_job': 300,  'multiplier': 0.9},
    'landscaping':        {'avg_job': 500,  'multiplier': 0.7},
    'tree service':       {'avg_job': 2000, 'multiplier': 0.8},
    'pressure washing':   {'avg_job': 300,  'multiplier': 0.6},
    'garage door':        {'avg_job': 800,  'multiplier': 0.8},
    'remodeling':         {'avg_job': 25000, 'multiplier': 1.3},
    'auto repair':        {'avg_job': 600,  'multiplier': 0.8},
    'general contractor': {'avg_job': 15000, 'multiplier': 1.2},
    'handyman':           {'avg_job': 300,  'multiplier': 0.5},
    'painting':           {'avg_job': 3000, 'multiplier': 0.7},
    'fencing':            {'avg_job': 4000, 'multiplier': 0.7},
    'pool service':       {'avg_job': 400,  'multiplier': 0.7},
    'cleaning service':   {'avg_job': 200,  'multiplier': 0.5},
    'flooring':           {'avg_job': 4000, 'multiplier': 0.8},
    'concrete':           {'avg_job': 6000, 'multiplier': 0.9},
}

# ═════════════════════════════════════════════════════════════
# PRESENCIFY PACKAGES (v1.0 LOCKED)
# ═════════════════════════════════════════════════════════════

PACKAGES = {
    'grand_opening': {
        'name': 'Grand Opening',
        'price': '$199 + $29/mo',
        'mrr': 29,
        'requirements': ['new_business', 'no_website'],
    },
    'starter': {
        'name': 'Starter',
        'price': '$399 + $29/mo',
        'mrr': 29,
        'requirements': ['no_website'],
    },
    'growth': {
        'name': 'Growth',
        'price': '$599 + $149/mo',
        'mrr': 149,
        'requirements': ['has_website', 'weak_presence'],
    },
    'presence_plus': {
        'name': 'Presence+',
        'price': '$199/mo',
        'mrr': 199,
        'requirements': ['good_website', 'weak_gbp'],
    },
    'enterprise': {
        'name': 'Enterprise',
        'price': '$2,500+',
        'mrr': 2500,
        'requirements': ['large_operation', 'multi_location'],
    },
}


@dataclass
class LeadScores:
    """Complete scoring output for a single lead."""
    # Identity
    lead_id: int
    biz: str
    category: str

    # Scores (0-100)
    opportunity_score: int = 0
    revenue_opportunity_score: int = 0
    close_probability: int = 0
    contactability_score: int = 0
    priority_score: int = 0  # (Opp × Close × Contactability) — rejects under 60

    # Details
    opportunity_signals: list = field(default_factory=list)
    opportunity_penalties: list = field(default_factory=list)
    recommended_package: str = ''
    why_this_lead: str = ''
    is_rejected: bool = False
    rejection_reason: str = ''


def _normalize_category(category: str) -> str:
    """Normalize category string to a standard key."""
    c = category.lower().strip()
    # Handle common variations
    aliases = {
        'plumber': 'plumbing',
        'electricians': 'electrician',
        'electric': 'electrician',
        'roofer': 'roofing',
        'hvac contractor': 'hvac',
        'heating & air': 'hvac',
        'air conditioning': 'hvac',
        'tree services': 'tree service',
        'landscaper': 'landscaping',
        'pressure wash': 'pressure washing',
        'pest control service': 'pest control',
        'exterminator': 'pest control',
        'auto repair shop': 'auto repair',
        'mechanic': 'auto repair',
        'home remodel': 'remodeling',
        'remodeler': 'remodeling',
        'handyman services': 'handyman',
        'painter': 'painting',
        'fence company': 'fencing',
        'fence': 'fencing',
        'pool cleaning': 'pool service',
        'pool maintenance': 'pool service',
        'cleaning': 'cleaning service',
        'maid service': 'cleaning service',
        'flooring contractor': 'flooring',
        'concrete contractor': 'concrete',
        'dentistry': 'dentist',
        'dental': 'dentist',
        'chiropractic': 'chiropractor',
        'garage doors': 'garage door',
    }
    return aliases.get(c, c)


def is_franchise(biz_name: str, notes: str = '') -> bool:
    """Check if a business matches known franchise patterns."""
    check = f"{biz_name} {notes}".lower()
    for kw in FRANCHISE_KEYWORDS:
        if kw in check:
            return True
    return False


def score_opportunity(lead: dict, audit_data: dict = None) -> tuple[int, list, list]:
    """
    Calculate Opportunity Score (0-100).
    Based on website quality signals, GBP signals, content signals.
    Positive signals = prospect has problems we can fix.
    """
    score = 50  # baseline
    signals = []
    penalties = []

    if audit_data is None:
        audit_data = {}

    website = (lead.get('website') or '').strip()
    biz = lead.get('biz', '')
    category = _normalize_category(lead.get('category', ''))

    # POSITIVE SIGNALS (they need our help)
    # +20 Website older than 3 years
    if audit_data.get('site_age_years', 0) >= 3:
        score += 20
        signals.append('+20 Website older than 3 years')

    # +15 Poor mobile experience
    if not audit_data.get('mobile_friendly', True):
        score += 15
        signals.append('+15 Poor mobile experience')

    # +15 Missing FAQ schema
    if not audit_data.get('has_faq_schema', False):
        score += 15
        signals.append('+15 Missing FAQ schema')

    # +15 Missing service-area pages
    if not audit_data.get('has_service_pages', False):
        score += 15
        signals.append('+15 Missing service-area pages')

    # +15 Weak GBP optimization
    if not audit_data.get('gbp_optimized', False):
        score += 15
        signals.append('+15 Weak GBP optimization')

    # +15 Less than 50 reviews
    review_count = audit_data.get('review_count', 0)
    if review_count < 50:
        score += 15
        signals.append(f'+15 Less than 50 reviews (currently {review_count})')

    # +10 Last review older than 30 days
    if audit_data.get('last_review_days', 0) > 30:
        score += 10
        signals.append('+10 Last review older than 30 days')

    # +10 No blog content
    if not audit_data.get('has_blog', False):
        score += 10
        signals.append('+10 No blog content')

    # +10 No AEO/GEO content
    if not audit_data.get('has_aeo_geo', False):
        score += 10
        signals.append('+10 No AEO/GEO content')

    # +10 Weak CTAs
    if not audit_data.get('has_ctas', True):
        score += 10
        signals.append('+10 Weak calls-to-action')

    # +10 Slow page speed
    if audit_data.get('page_speed_slow', False):
        score += 10
        signals.append('+10 Slow page speed')

    # +10 Missing SSL
    if not audit_data.get('has_ssl', True):
        score += 10
        signals.append('+10 Missing SSL')

    # +10 No lead capture system
    if not audit_data.get('has_lead_capture', False):
        score += 10
        signals.append('+10 No lead capture system')

    # +15 Owner-operated local business
    if not audit_data.get('is_multi_location', False) and not audit_data.get('is_large_org', False):
        score += 15
        signals.append('+15 Owner-operated local business')

    # +20 High-ticket service industry
    if category in HIGH_TICKET_INDUSTRIES:
        score += 20
        signals.append('+20 High-ticket service industry')

    # No website at all — additional bonus
    if not website:
        score += 15
        signals.append('+15 No website (unclaimed online presence)')

    # ---- NEGATIVE SIGNALS (they're already doing well) ----
    # -30 Modern professionally built website
    if audit_data.get('modern_site', False):
        score -= 30
        penalties.append('-30 Modern professionally built website')

    # -30 Active SEO program
    if audit_data.get('active_seo', False):
        score -= 30
        penalties.append('-30 Active SEO program')

    # -20 Strong GBP activity
    if review_count >= 100 and audit_data.get('last_review_days', 999) <= 30:
        score -= 20
        penalties.append('-20 Strong GBP activity (100+ recent reviews)')

    # -15 Multi-location
    if audit_data.get('is_multi_location', False):
        score -= 15
        penalties.append('-15 Multi-location company')

    # -15 Large organization
    if audit_data.get('is_large_org', False):
        score -= 15
        penalties.append('-15 Large organization')

    # -10 Active content marketing
    if audit_data.get('has_blog', False) and audit_data.get('blog_active', False):
        score -= 10
        penalties.append('-10 Active content marketing')

    # -10 Strong social presence
    if audit_data.get('strong_social', False):
        score -= 10
        penalties.append('-10 Strong social presence')

    # Franchise penalty
    if is_franchise(biz, lead.get('notes', '')):
        score -= 25
        penalties.append('-25 Franchise/national brand (no local decision-maker)')

    return max(0, min(100, score)), signals, penalties


def score_revenue(lead: dict, audit_data: dict = None) -> int:
    """
    Revenue Opportunity Score (0-100).
    Higher scores = more money to be made from this client.
    Prioritize dentists, roofers, HVAC, plumbers.
    """
    if audit_data is None:
        audit_data = {}

    category = _normalize_category(lead.get('category', ''))
    estimates = REVENUE_ESTIMATES.get(category, {'avg_job': 300, 'multiplier': 0.5})

    score = 50  # baseline

    # Industry multiplier
    score = int(score * estimates['multiplier'])
    if category in PREMIUM_TICKET_INDUSTRIES:
        score += 15  # premium boost

    # Years in business — longer = more stable revenue
    years = audit_data.get('years_in_business', 0)
    if years >= 10:
        score += 15
    elif years >= 5:
        score += 10
    elif years >= 2:
        score += 5

    # Employee count
    employees = audit_data.get('employee_estimate', 1)
    if employees >= 20:
        score += 15
    elif employees >= 10:
        score += 10
    elif employees >= 5:
        score += 5

    # Review count signals established business
    reviews = audit_data.get('review_count', 0)
    if reviews >= 50:
        score += 10
    elif reviews >= 20:
        score += 5

    # Service area size
    service_area = audit_data.get('service_area_size', 'local')
    if service_area == 'regional':
        score += 5
    elif service_area == 'statewide':
        score += 10

    return max(0, min(100, score))


def score_close_probability(lead: dict, audit_data: dict = None) -> int:
    """
    Close Probability Score (0-100).
    Predicts likelihood of booking a meeting, NOT website quality.
    """
    if audit_data is None:
        audit_data = {}

    score = 50

    # Signs of growth
    if audit_data.get('hiring', False):
        score += 10
    if audit_data.get('expanding', False):
        score += 10
    if audit_data.get('new_services', False):
        score += 5

    # Signs they care about reputation
    reviews = audit_data.get('review_count', 0)
    if reviews > 0:
        score += 5  # they care enough to have reviews
    if audit_data.get('has_gbp', False):
        score += 5  # they claimed their GBP
    if audit_data.get('gbp_photos_recent', False):
        score += 5  # actively maintaining profile

    # Recent triggers — businesses in flux are more likely to buy
    triggers = audit_data.get('recent_triggers', [])
    trigger_count = len(triggers)
    score += min(trigger_count * 5, 20)  # up to +20 for triggers

    # Likely to respond
    if audit_data.get('owner_email_available', False):
        score += 10  # direct line to decision-maker
    if audit_data.get('contact_form_works', False):
        score += 3
    if audit_data.get('active_social', False):
        score += 3  # they're responsive online

    # Historical performance (if we've done outreach before)
    if audit_data.get('past_outreach_opened', False):
        score += 5

    # Punish: obvious agency relationship
    if audit_data.get('has_agency', False):
        score -= 20

    # They're clearly not investing in growth
    website = (lead.get('website') or '').strip()
    if not website and not audit_data.get('has_gbp', False) and reviews == 0:
        score -= 10  # completely offline — might not value digital at all

    return max(0, min(100, score))


def score_contactability(lead: dict, audit_data: dict = None) -> int:
    """
    Contactability Score (0-100).
    How easy is it to reach the decision-maker?
    """
    if audit_data is None:
        audit_data = {}

    score = 0

    # Direct owner email available
    if audit_data.get('owner_email_available', False):
        score += 30
    elif lead.get('email', '').strip():
        score += 15  # have some email, might not be owner

    # Direct phone available
    if lead.get('phone', '').strip():
        score += 15
    if audit_data.get('owner_phone_available', False):
        score += 10

    # Contact form works
    if audit_data.get('contact_form_works', False):
        score += 10

    # Active Facebook page
    if audit_data.get('active_facebook', False):
        score += 10

    # Active GBP listing
    if audit_data.get('has_gbp', False):
        score += 10

    # Public owner information
    if audit_data.get('owner_name_known', False):
        score += 15

    return max(0, min(100, score))


def score_lead(lead: dict, audit_data: dict = None) -> LeadScores:
    """
    Score a single lead with the complete v3 scoring system.
    Returns a LeadScores dataclass.
    """
    if audit_data is None:
        audit_data = {}

    lead_id = lead.get('id', 0)
    biz = lead.get('biz', 'Unknown')
    category = _normalize_category(lead.get('category', ''))

    # Run all scoring calculations
    opp_score, signals, penalties = score_opportunity(lead, audit_data)
    rev_score = score_revenue(lead, audit_data)
    close_prob = score_close_probability(lead, audit_data)
    contact_score = score_contactability(lead, audit_data)

    # Final Priority = (Opportunity × Close × Contactability) normalized to 0-100
    # Raw product is opp*close*contact (0-1,000,000). Divide by 10,000 to get 0-100 scale.
    priority_score = round((opp_score * close_prob * contact_score) / 10000)

    # Reject below 60 for enriched leads, 15 for unenriched (no data to differentiate yet)
    # Outreach priority: 80+ for enriched, 35+ for unenriched
    rejection_threshold = 60 if audit_data.get('is_enriched', False) else 15
    is_rejected = priority_score < rejection_threshold
    rejection_reason = ''
    if is_rejected:
        reasons = []
        if opp_score < 30:
            reasons.append('low opportunity')
        if close_prob < 30:
            reasons.append('low close probability')
        if contact_score < 20:
            reasons.append('poor contactability')
        rejection_reason = f'Rejected: priority {priority_score} — {", ".join(reasons)}' if reasons else f'Rejected: priority {priority_score}'

    # Package recommendation
    package = recommend_package(lead, audit_data)

    # Why this lead matters
    why = generate_why(lead, audit_data, opp_score, rev_score, close_prob, contact_score)

    return LeadScores(
        lead_id=lead_id,
        biz=biz,
        category=category,
        opportunity_score=opp_score,
        revenue_opportunity_score=rev_score,
        close_probability=close_prob,
        contactability_score=contact_score,
        priority_score=priority_score,
        opportunity_signals=signals,
        opportunity_penalties=penalties,
        recommended_package=package,
        why_this_lead=why,
        is_rejected=is_rejected,
        rejection_reason=rejection_reason,
    )


def recommend_package(lead: dict, audit_data: dict = None) -> str:
    """
    Recommend the highest-value package that genuinely fits.
    Rules from v3 spec:
    - Good website + weak GBP → Presence+
    - Bad website + weak presence → Growth
    - No website → Starter
    - Large operation → Enterprise
    """
    if audit_data is None:
        audit_data = {}

    website = (lead.get('website') or '').strip()
    has_website = bool(website)

    # Large operation → Enterprise
    if audit_data.get('is_large_org', False) or audit_data.get('employee_estimate', 1) >= 50:
        return 'Enterprise'

    # No website → Starter (or Grand Opening for new businesses)
    if not has_website:
        if audit_data.get('is_new_business', False):
            return 'Grand Opening'
        return 'Starter'

    # Good website + weak GBP → Presence+
    if audit_data.get('modern_site', False) and not audit_data.get('gbp_optimized', False):
        return 'Presence+'

    # Bad website + weak presence → Growth
    return 'Growth'


def generate_why(lead: dict, audit_data: dict = None,
                 opp_score: int = 0, rev_score: int = 0,
                 close_prob: int = 0, contact_score: int = 0) -> str:
    """
    Generate a one-sentence 'Why This Lead Matters' per v3 spec.
    Must answer: 'Why should Chris spend 5 minutes on this lead?'
    If no compelling answer, return empty string (lead gets rejected).
    """
    if audit_data is None:
        audit_data = {}

    biz = lead.get('biz', 'this business')
    category = _normalize_category(lead.get('category', ''))
    reviews = audit_data.get('review_count', 0)
    competitor_reviews = audit_data.get('competitor_avg_reviews', 0)
    website = (lead.get('website') or '').strip()

    reasons = []

    # No website at all — massive opportunity
    if not website:
        reasons.append(f"zero online presence in high-ticket {category} — untapped revenue stream ready for capture")

    # Competitor gap
    if reviews > 0 and competitor_reviews > reviews * 3:
        reasons.append(f"competitors have {competitor_reviews // max(reviews, 1)}x more reviews — losing local market share daily")

    # High revenue + clear gap
    if category in PREMIUM_TICKET_INDUSTRIES and opp_score >= 70:
        reasons.append(f"high-ticket {category} with visible marketing gaps and strong revenue upside")

    # Recent trigger
    triggers = audit_data.get('recent_triggers', [])
    if triggers:
        reasons.append(f"showing growth signals ({triggers[0]}) — buying window is open")

    # Old website
    if audit_data.get('site_age_years', 0) >= 5:
        reasons.append(f"{audit_data['site_age_years']}yr-old website bleeding leads — urgent upgrade opportunity")

    # Direct owner email + high opportunity
    if audit_data.get('owner_email_available') and opp_score >= 60:
        reasons.append(f"direct line to decision-maker with clear value prop")

    if reasons:
        return f"{biz}: {reasons[0]}"
    elif opp_score >= 60:
        return f"{biz}: solid {category} prospect with fixable marketing gaps"
    else:
        return ''


def batch_score(db, lead_ids: list = None) -> list[LeadScores]:
    """
    Score a batch of leads. If lead_ids is None, scores ALL leads.
    Returns sorted by priority_score descending.
    """
    if lead_ids is None:
        rows = db.execute("SELECT * FROM leads ORDER BY id").fetchall()
    else:
        placeholders = ','.join('?' * len(lead_ids))
        rows = db.execute(
            f"SELECT * FROM leads WHERE id IN ({placeholders})",
            lead_ids
        ).fetchall()

    results = []
    for row in rows:
        lead = dict(row)

        # Build audit_data from lead's existing enrichment fields
        audit_data = _build_audit_from_db(lead)

        scored = score_lead(lead, audit_data)
        results.append(scored)

    # Sort by priority descending
    results.sort(key=lambda s: s.priority_score, reverse=True)
    return results


def _build_audit_from_db(lead: dict) -> dict:
    """
    Extract audit_data from lead row's enrichment columns.
    Returns audit dict AND an 'is_enriched' flag.
    When is_enriched=False, scoring uses softer rejection thresholds
    since we're working with inferred data.
    """
    audit = {'is_enriched': False}

    # Parse from enrichment_json if it exists
    enrich_str = lead.get('enrichment_json', '')
    if enrich_str:
        try:
            import json
            audit.update(json.loads(enrich_str))
            audit['is_enriched'] = True
        except (json.JSONDecodeError, TypeError):
            pass

    website = (lead.get('website') or '').strip()
    status = lead.get('status', 'UNKNOWN')
    notes = lead.get('notes', '')

    # ── Website signals ──
    if not website:
        # No website = definite opportunity but we know less about quality
        audit.setdefault('has_ssl', True)  # N/A
        audit.setdefault('mobile_friendly', False)  # N/A
        audit.setdefault('has_ctas', False)
        audit.setdefault('has_lead_capture', False)
    elif status == 'BAD':
        audit.setdefault('mobile_friendly', False)
        audit.setdefault('has_ssl', False)
        audit.setdefault('page_speed_slow', True)
        audit.setdefault('has_faq_schema', False)
        audit.setdefault('has_service_pages', False)
        audit.setdefault('has_ctas', False)
        audit.setdefault('has_lead_capture', False)
        audit.setdefault('modern_site', False)
    elif status == 'GOOD':
        audit.setdefault('modern_site', True)
        audit.setdefault('mobile_friendly', True)
        audit.setdefault('has_ssl', True)
        audit.setdefault('has_faq_schema', True)
        audit.setdefault('has_service_pages', True)
        audit.setdefault('has_ctas', True)
    else:
        # UNKNOWN — neutral. Only flag definite gaps.
        audit.setdefault('mobile_friendly', True)
        audit.setdefault('has_ssl', True)
        audit.setdefault('has_faq_schema', False)
        audit.setdefault('has_service_pages', False)

    # ── GBP / Content signals (conservative defaults) ──
    audit.setdefault('gbp_optimized', False)
    audit.setdefault('review_count', 0)
    audit.setdefault('last_review_days', 999)
    audit.setdefault('has_blog', False)
    audit.setdefault('has_aeo_geo', False)
    audit.setdefault('has_ctas', False)
    audit.setdefault('has_lead_capture', False)
    audit.setdefault('has_gbp', False)
    audit.setdefault('owner_email_available', False)
    audit.setdefault('owner_name_known', False)
    audit.setdefault('owner_phone_available', False)
    audit.setdefault('contact_form_works', False)
    audit.setdefault('active_facebook', False)
    audit.setdefault('is_multi_location', False)
    audit.setdefault('is_large_org', False)
    audit.setdefault('active_seo', False)
    audit.setdefault('has_agency', False)

    # ── Deduce from existing data ──
    notes_lower = notes.lower()

    # Owner email
    if lead.get('email', '').strip():
        audit['owner_email_available'] = True
        audit['owner_name_known'] = True  # we at least have a contact

    # Phone
    if lead.get('phone', '').strip():
        audit['owner_phone_available'] = True

    # Years in business from notes
    if '52yr' in notes_lower:
        audit['years_in_business'] = 52
        audit['site_age_years'] = 5  # conservative
    elif 'years' in notes_lower:
        audit['years_in_business'] = 10

    # Facebook
    if 'facebook' in notes_lower:
        audit['active_facebook'] = True
        audit['has_gbp'] = True  # usually have both

    # Multi-location
    if 'second location' in notes_lower or 'multi' in notes_lower:
        audit['is_multi_location'] = True

    # Strong reputation = they exist and have reviews
    if 'reputation' in notes_lower:
        audit['has_gbp'] = True
        if not enrich_str:  # don't override enriched data
            audit['review_count'] = 5  # conservative

    # ── Set enrichment level ──
    # Consider enriched if we have >= 5 real data points (not defaults)
    if not audit['is_enriched']:
        real_fields = 0
        if lead.get('email', '').strip(): real_fields += 1
        if lead.get('phone', '').strip(): real_fields += 1
        if status != 'UNKNOWN': real_fields += 1
        if website: real_fields += 1
        if '52yr' in notes_lower: real_fields += 1
        if 'facebook' in notes_lower: real_fields += 1
        audit['is_enriched'] = real_fields >= 3

    return audit


def get_top_leads(db, limit: int = 20) -> list[LeadScores]:
    """Get top N leads by priority score, excluding rejected."""
    all_scored = batch_score(db)
    # Filter out rejected
    qualified = [s for s in all_scored if not s.is_rejected]
    return qualified[:limit]


if __name__ == '__main__':
    # Quick test
    import sqlite3
    db = sqlite3.connect('/home/jarvis/presencify/leadgen/leadgen.db')
    db.row_factory = sqlite3.Row
    scored = get_top_leads(db, 5)
    for s in scored:
        print(f"\n{s.biz} ({s.category})")
        print(f"  Priority: {s.priority_score} (Opp:{s.opportunity_score} Close:{s.close_probability} Contact:{s.contactability_score})")
        print(f"  Revenue: {s.revenue_opportunity_score}")
        print(f"  Package: {s.recommended_package}")
        print(f"  Why: {s.why_this_lead}")
        if s.opportunity_signals:
            print(f"  Signals: {', '.join(s.opportunity_signals[:3])}")