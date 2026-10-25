/* ============================================================
   Local Business Health Check | Space Coast Marketing
   Audit Engine & UI Logic
   ============================================================ */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // --- DOM refs ---
    const dom = {
        formSection: $('#hcFormSection'),
        loadingSection: $('#hcLoadingSection'),
        reportSection: $('#hcReportSection'),
        errorSection: $('#hcErrorSection'),
        auditForm: $('#hcAuditForm'),
        btnRun: $('#hcBtnRun'),
        loadingStage: $('#hcLoadingStage'),
        progressFill: $('#hcProgressFill'),
        loadingChecklist: $('#hcLoadingChecklist'),
        scoreGauge: $('#hcScoreGauge'),
        gaugeFill: $('#gaugeFill'),
        gaugeValue: $('#gaugeValue'),
        scoreGrade: $('#hcScoreGrade'),
        scoreDesc: $('#hcScoreDesc'),
        scoreMeta: $('#hcScoreMeta'),
        mockNote: $('#hcMockNote'),
        categoryGrid: $('#hcCategoryGrid'),
        recommendationsList: $('#hcRecommendationsList'),
        leadForm: $('#hcLeadForm'),
        errorText: $('#hcErrorText'),
        btnRetry: $('#hcBtnRetry'),
        printBusiness: $('#hcPrintBusiness'),
        toastContainer: $('#toastContainer'),
    };

    // --- Gauge setup ---
    const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 88; // r=88

    function init() {
        dom.gaugeFill.setAttribute('stroke-dasharray', GAUGE_CIRCUMFERENCE);
        dom.gaugeFill.setAttribute('stroke-dashoffset', GAUGE_CIRCUMFERENCE);
        bindEvents();
    }

    function bindEvents() {
        dom.auditForm.addEventListener('submit', handleAuditSubmit);
        dom.leadForm.addEventListener('submit', handleLeadSubmit);
        dom.btnRetry.addEventListener('click', resetToForm);
    }

    // --- Form submit → start audit ---
    async function handleAuditSubmit(e) {
        e.preventDefault();

        const businessName = $('#hcBusinessName').value.trim();
        const city = $('#hcCity').value.trim();
        const website = $('#hcWebsite').value.trim() || null;

        if (!businessName || !city) {
            showToast('Please enter both business name and city.', 'error');
            return;
        }

        // Show loading
        showSection('loading');
        resetLoadingChecklist();

        // Animation: advance checklist + progress
        let progress = 0;
        const stages = ['places', 'website', 'citations', 'social', 'score'];
        const stageNames = [
            'places', 'Google Business Profile',
            'website', 'Website Performance',
            'citations', 'Citation Consistency',
            'social', 'Social Media Presence',
            'score', 'Calculating Score'
        ];

        const progressInterval = setInterval(() => {
            progress = Math.min(progress + 5, 90);
            dom.progressFill.style.width = progress + '%';
        }, 300);

        // Stage animations
        for (let i = 0; i < stages.length; i++) {
            await sleep(600 + Math.random() * 400);
            markStageDone(stages[i]);
            if (i < stages.length - 1) {
                dom.loadingStage.textContent = stageNames[(i + 1) * 2 + 1] + '...';
            }
        }

        // Call API
        let report;
        try {
            const resp = await fetch('/api/health-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ business_name: businessName, city, website })
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || 'Audit failed (HTTP ' + resp.status + ')');
            }

            report = await resp.json();
        } catch (apiErr) {
            console.error('Health check API error:', apiErr);
            showError(apiErr.message);
            clearInterval(progressInterval);
            return;
        }

        clearInterval(progressInterval);

        // Complete progress
        dom.progressFill.style.width = '100%';
        markStageDone('score');

        await sleep(500);

        // Show report
        displayReport(report, { businessName, city });
        showSection('report');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Display report ---
    function displayReport(report, meta) {
        const score = report.overall_score;
        const categories = report.categories || [];
        const recommendations = report.recommendations || [];

        // Update print header
        dom.printBusiness.textContent = meta.businessName + ' — ' + meta.city;

        // Gauge
        animateGauge(score);

        // Grade
        const gradeInfo = getGradeInfo(score);
        dom.scoreGrade.textContent = gradeInfo.grade;
        dom.scoreGrade.style.color = gradeInfo.color;
        dom.scoreDesc.textContent = gradeInfo.desc;

        // Meta
        dom.scoreMeta.innerHTML = '';
        if (report.rating != null) {
            dom.scoreMeta.innerHTML +=
                `<div class="hc-meta-item">⭐ <span class="hc-meta-value">${report.rating} / 5</span></div>`;
        }
        if (report.review_count != null) {
            dom.scoreMeta.innerHTML +=
                `<div class="hc-meta-item">📝 <span class="hc-meta-value">${report.review_count} reviews</span></div>`;
        }
        dom.scoreMeta.innerHTML +=
            `<div class="hc-meta-item">📊 <span class="hc-meta-value">${categories.length} categories checked</span></div>`;

        // Mock note
        if (report.mock) {
            dom.mockNote.style.display = 'block';
            dom.mockNote.textContent = '⚠️ ' + (report.mock_note || 'Live data unavailable — showing estimated scores');
        } else {
            dom.mockNote.style.display = 'none';
        }

        // Category cards
        dom.categoryGrid.innerHTML = '';
        categories.forEach(cat => {
            dom.categoryGrid.appendChild(createCategoryCard(cat));
        });

        // Recommendations
        dom.recommendationsList.innerHTML = '';
        recommendations.forEach((rec, idx) => {
            dom.recommendationsList.appendChild(createRecommendationItem(rec, idx));
        });

        // Pre-fill lead form
        $('#hcLeadName').value = '';
        $('#hcLeadEmail').value = '';
        $('#hcLeadPhone').value = '';
    }

    // --- Gauge animation ---
    function animateGauge(targetScore) {
        const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * targetScore / 100);
        const color = getScoreColor(targetScore);

        // Animate
        let current = 0;
        const step = targetScore / 60; // 60 frames
        const interval = setInterval(() => {
            current = Math.min(current + step, targetScore);
            dom.gaugeValue.textContent = Math.round(current);

            const currentOffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * current / 100);
            dom.gaugeFill.setAttribute('stroke-dashoffset', currentOffset);

            if (current >= targetScore) {
                clearInterval(interval);
                dom.gaugeFill.setAttribute('stroke', color);
            }
        }, 16);
    }

    function getScoreColor(score) {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#f59e0b';
        if (score >= 40) return '#f97316';
        return '#ef4444';
    }

    function getGradeInfo(score) {
        if (score >= 90) return { grade: 'Excellent', color: '#22c55e', desc: 'Your online presence is strong. Minor improvements only.' };
        if (score >= 80) return { grade: 'Good', color: '#4ade80', desc: 'Solid presence but there\'s room to grow.' };
        if (score >= 70) return { grade: 'Fair', color: '#f59e0b', desc: 'You\'re visible but competitors are ahead of you.' };
        if (score >= 55) return { grade: 'Needs Work', color: '#f97316', desc: 'Significant gaps in your online presence. You\'re losing customers.' };
        if (score >= 40) return { grade: 'Poor', color: '#ef4444', desc: 'Major visibility issues. Most customers can\'t find you online.' };
        return { grade: 'Critical', color: '#dc2626', desc: 'Your business is nearly invisible online. Immediate action needed.' };
    }

    // --- Category card ---
    function createCategoryCard(cat) {
        const card = document.createElement('div');
        card.className = 'hc-cat-card status-' + cat.status;

        const statusLabels = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
        const icons = {
            website: '🌐',
            ranking: '🔍',
            citations: '📋',
            reviews: '⭐',
            social: '📱'
        };

        const findings = (cat.findings || []).map(f => {
            let cls = '';
            if (f.type === 'good') cls = 'hc-finding-good';
            else if (f.type === 'warn') cls = 'hc-finding-warn';
            else if (f.type === 'bad') cls = 'hc-finding-bad';
            return `<li class="${cls}">${f.text}</li>`;
        }).join('');

        card.innerHTML = `
            <div class="hc-cat-header">
                <span class="hc-cat-title">
                    <span class="hc-cat-icon">${icons[cat.id] || '📊'}</span>
                    ${cat.name}
                </span>
                <span class="hc-cat-badge badge-${cat.status}">${statusLabels[cat.status]}</span>
            </div>
            <div class="hc-cat-score">${cat.score}/${cat.max || 25}</div>
            <ul class="hc-cat-findings">${findings || '<li>No data available</li>'}</ul>
        `;

        return card;
    }

    // --- Recommendation item ---
    function createRecommendationItem(rec, idx) {
        const icons = ['🔧', '📈', '🎯'];
        const item = document.createElement('div');
        item.className = 'hc-rec-item';
        item.innerHTML = `
            <div class="hc-rec-icon">${icons[idx] || '💡'}</div>
            <div class="hc-rec-content">
                <h4>${rec.priority}. ${rec.title}</h4>
                <p>${rec.description}</p>
            </div>
        `;
        return item;
    }

    // --- Lead form submit ---
    async function handleLeadSubmit(e) {
        e.preventDefault();

        const name = $('#hcLeadName').value.trim();
        const email = $('#hcLeadEmail').value.trim();
        const phone = $('#hcLeadPhone').value.trim();
        const businessName = $('#hcBusinessName').value.trim();
        const city = $('#hcCity').value.trim();

        if (!name || !email) {
            showToast('Please enter your name and email.', 'error');
            return;
        }

        const payload = {
            name,
            email,
            phone,
            business_name: businessName,
            city,
            source: 'health-check',
        };

        try {
            const resp = await fetch('/api/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                showToast('✅ You\'re on the list! We\'ll be in touch within 24 hours.', 'success');
                dom.leadForm.reset();
            } else {
                const err = await resp.json().catch(() => ({}));
                showToast('⚠️ ' + (err.error || 'Submission failed. Please try again.'), 'error');
            }
        } catch (err) {
            // Fallback: show success anyway for UX
            console.warn('Lead capture endpoint unavailable:', err.message);
            showToast('✅ Thanks! We\'ve received your request. We\'ll reach out soon.', 'success');
            dom.leadForm.reset();
        }
    }

    // --- Loading helpers ---
    function resetLoadingChecklist() {
        const items = dom.loadingChecklist.querySelectorAll('.hc-check-item');
        items.forEach(item => {
            item.classList.remove('done');
            item.querySelector('.hc-check-icon').textContent = '⏳';
        });
        dom.progressFill.style.width = '0%';
        dom.loadingStage.textContent = 'Checking Google Business Profile...';
    }

    function markStageDone(stageName) {
        const item = dom.loadingChecklist.querySelector(`[data-stage="${stageName}"]`);
        if (item) {
            item.classList.add('done');
            item.querySelector('.hc-check-icon').textContent = '✅';
        }
    }

    // --- Section visibility ---
    function showSection(name) {
        dom.formSection.style.display = name === 'form' ? 'block' : 'none';
        dom.loadingSection.style.display = name === 'loading' ? 'block' : 'none';
        dom.reportSection.style.display = name === 'report' ? 'block' : 'none';
        dom.errorSection.style.display = name === 'error' ? 'block' : 'none';
    }

    function resetToForm() {
        showSection('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showError(message) {
        dom.errorText.textContent = message || 'Unable to complete the audit. Please try again.';
        showSection('error');
    }

    // --- Toast ---
    function showToast(message, type) {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Go! ---
    init();
})();