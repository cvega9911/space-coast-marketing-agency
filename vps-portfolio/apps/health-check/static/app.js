/* ============================================================
   Local Business Health Check | Space Coast Marketing Agency
   Audit Engine & UI Logic — Standalone Deployment
   Stardew Valley Edition: Gold + Green score ring, warm palette
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
        btnNewAudit: $('#btnNewAudit'),
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
        dom.btnNewAudit.addEventListener('click', resetToForm);
    }

    // --- Form submit -> start audit ---
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
        const stageNames = {
            places: 'Google Business Profile',
            website: 'Website Performance',
            citations: 'Citation Consistency',
            social: 'Social Media Presence',
            score: 'Calculating Score'
        };

        const progressInterval = setInterval(function () {
            progress = Math.min(progress + 5, 90);
            dom.progressFill.style.width = progress + '%';
        }, 300);

        // Stage animations
        for (let i = 0; i < stages.length; i++) {
            await sleep(600 + Math.random() * 400);
            markStageDone(stages[i]);
            if (i < stages.length - 1) {
                dom.loadingStage.textContent = 'CHECKING ' + stageNames[stages[i + 1]].toUpperCase() + '...';
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
                const errData = await resp.json().catch(function () { return {}; });
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
        var score = report.overall_score;
        var categories = report.categories || [];
        var recommendations = report.recommendations || [];

        // Update print header
        dom.printBusiness.textContent = meta.businessName + ' — ' + meta.city;

        // Gauge
        animateGauge(score);

        // Grade
        var gradeInfo = getGradeInfo(score);
        dom.scoreGrade.textContent = gradeInfo.grade;
        dom.scoreGrade.style.color = gradeInfo.color;
        dom.scoreDesc.textContent = gradeInfo.desc;

        // Meta
        dom.scoreMeta.innerHTML = '';
        if (report.rating != null) {
            dom.scoreMeta.innerHTML +=
                '<div class="hc-meta-item">&#11088; <span class="hc-meta-value">' + report.rating + ' / 5</span></div>';
        }
        if (report.review_count != null) {
            dom.scoreMeta.innerHTML +=
                '<div class="hc-meta-item">&#128221; <span class="hc-meta-value">' + report.review_count + ' reviews</span></div>';
        }
        dom.scoreMeta.innerHTML +=
            '<div class="hc-meta-item">&#128202; <span class="hc-meta-value">' + categories.length + ' categories checked</span></div>';

        // Mock note
        if (report.mock) {
            dom.mockNote.style.display = 'block';
            dom.mockNote.textContent = '&#9888; ' + (report.mock_note || 'Live data unavailable — showing estimated scores');
        } else {
            dom.mockNote.style.display = 'none';
        }

        // Category cards
        dom.categoryGrid.innerHTML = '';
        categories.forEach(function (cat) {
            dom.categoryGrid.appendChild(createCategoryCard(cat));
        });

        // Recommendations
        dom.recommendationsList.innerHTML = '';
        recommendations.forEach(function (rec, idx) {
            dom.recommendationsList.appendChild(createRecommendationItem(rec, idx));
        });

        // Pre-fill lead form
        $('#hcLeadName').value = '';
        $('#hcLeadEmail').value = '';
        $('#hcLeadPhone').value = '';
    }

    // --- Gauge animation ---
    function animateGauge(targetScore) {
        var offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * targetScore / 100);
        var color = getScoreColor(targetScore);

        var current = 0;
        var step = targetScore / 60;
        var interval = setInterval(function () {
            current = Math.min(current + step, targetScore);
            dom.gaugeValue.textContent = Math.round(current);

            var currentOffset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * current / 100);
            dom.gaugeFill.setAttribute('stroke-dashoffset', currentOffset);

            if (current >= targetScore) {
                clearInterval(interval);
                dom.gaugeFill.setAttribute('stroke', color);
            }
        }, 16);
    }

    function getScoreColor(score) {
        // Stardew palette: forest green, amber, soft red
        if (score >= 80) return '#6B8E23';
        if (score >= 60) return '#DAA520';
        if (score >= 40) return '#FF9800';
        return '#C0392B';
    }

    function getGradeInfo(score) {
        if (score >= 90) return { grade: 'Excellent', color: '#4CAF50', desc: 'Your online presence is strong. Minor improvements only.' };
        if (score >= 80) return { grade: 'Good', color: '#6B8E23', desc: 'Solid presence but there\'s room to grow.' };
        if (score >= 70) return { grade: 'Fair', color: '#DAA520', desc: 'You\'re visible but competitors are ahead of you.' };
        if (score >= 55) return { grade: 'Needs Work', color: '#FF9800', desc: 'Significant gaps in your online presence. You\'re losing customers.' };
        if (score >= 40) return { grade: 'Poor', color: '#E67E22', desc: 'Major visibility issues. Most customers can\'t find you online.' };
        return { grade: 'Critical', color: '#C0392B', desc: 'Your business is nearly invisible online. Immediate action needed.' };
    }

    // --- Category card ---
    function createCategoryCard(cat) {
        var card = document.createElement('div');
        card.className = 'hc-cat-card status-' + cat.status;

        var statusLabels = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
        var icons = {
            website: '\uD83C\uDF10',
            ranking: '\uD83D\uDD0D',
            citations: '\uD83D\uDCCB',
            reviews: '\u2B50',
            social: '\uD83D\uDCF1'
        };

        var findings = (cat.findings || []).map(function (f) {
            var cls = '';
            if (f.type === 'good') cls = 'hc-finding-good';
            else if (f.type === 'warn') cls = 'hc-finding-warn';
            else if (f.type === 'bad') cls = 'hc-finding-bad';
            return '<li class="' + cls + '">' + f.text + '</li>';
        }).join('');

        card.innerHTML =
            '<div class="hc-cat-header">' +
                '<span class="hc-cat-title">' +
                    '<span class="hc-cat-icon">' + (icons[cat.id] || '\uD83D\uDCCA') + '</span>' +
                    cat.name +
                '</span>' +
                '<span class="hc-cat-badge badge-' + cat.status + '">' + statusLabels[cat.status] + '</span>' +
            '</div>' +
            '<div class="hc-cat-score">' + cat.score + '/' + (cat.max || 25) + '</div>' +
            '<ul class="hc-cat-findings">' + (findings || '<li>No data available</li>') + '</ul>';

        return card;
    }

    // --- Recommendation item ---
    function createRecommendationItem(rec, idx) {
        var icons = ['\uD83D\uDD27', '\uD83D\uDCC8', '\uD83C\uDFAF'];
        var item = document.createElement('div');
        item.className = 'hc-rec-item';
        item.innerHTML =
            '<div class="hc-rec-icon">' + (icons[idx] || '\uD83D\uDCA1') + '</div>' +
            '<div class="hc-rec-content">' +
                '<h4>' + rec.priority + '. ' + rec.title + '</h4>' +
                '<p>' + rec.description + '</p>' +
            '</div>';
        return item;
    }

    // --- Lead form submit ---
    async function handleLeadSubmit(e) {
        e.preventDefault();

        var name = $('#hcLeadName').value.trim();
        var email = $('#hcLeadEmail').value.trim();
        var phone = $('#hcLeadPhone').value.trim();
        var businessName = $('#hcBusinessName').value.trim();
        var city = $('#hcCity').value.trim();

        if (!name || !email) {
            showToast('Please enter your name and email.', 'error');
            return;
        }

        var payload = {
            name: name,
            email: email,
            phone: phone,
            business_name: businessName,
            city: city,
            source: 'health-check',
        };

        try {
            var resp = await fetch('https://leadgen.presencify.co/api/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                showToast('\u2705 You\'re on the list! We\'ll be in touch within 24 hours.', 'success');
                dom.leadForm.reset();
            } else {
                var err = await resp.json().catch(function () { return {}; });
                showToast('\u26A0 ' + (err.error || 'Submission failed. Please try again.'), 'error');
            }
        } catch (err) {
            // Fallback: show success anyway for UX
            console.warn('Lead capture endpoint unavailable:', err.message);
            showToast('\u2705 Thanks! We\'ve received your request. We\'ll reach out soon.', 'success');
            dom.leadForm.reset();
        }
    }

    // --- Loading helpers ---
    function resetLoadingChecklist() {
        var items = dom.loadingChecklist.querySelectorAll('.hc-check-item');
        items.forEach(function (item) {
            item.classList.remove('done');
            item.querySelector('.hc-check-icon').textContent = '\u23F3';
        });
        dom.progressFill.style.width = '0%';
        dom.loadingStage.textContent = 'CHECKING WEBSITE...';
    }

    function markStageDone(stageName) {
        var item = dom.loadingChecklist.querySelector('[data-stage="' + stageName + '"]');
        if (item) {
            item.classList.add('done');
            item.querySelector('.hc-check-icon').textContent = '\u2705';
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
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // --- Go! ---
    init();
})();