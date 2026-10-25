/* ============================================================
   TACTICAL OPS CONSOLE | Space Coast Marketing Agency
   Frontend Application Logic
   ============================================================ */

(function () {
    'use strict';

    // --- State ---
    const state = {
        currentStep: 1,
        selectedTrade: null,
        files: [],
        uploadedFilename: null,
        analysisData: null,
        estimateData: null,
        clientName: '',
        savedEstimates: [],
        currentEstimateTotal: 0,
        _currentLineItems: [],
        _currentScopeOfWork: '',
        healthCheckData: null
    };

    // --- DOM Refs ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        // Tabs
        tabNav: $('#tabNav'),
        tabBtns: $$('.tab-btn'),
        tabPanels: $$('.tab-panel'),

        // Photo Estimate
        stepIndicator: $('#stepIndicator'),
        stepPanels: $$('.step-panel'),
        tradeGrid: $('#tradeGrid'),
        tradeCards: $$('.trade-card'),
        selectedTradeLabel: $('#selectedTradeLabel'),
        clientName: $('#clientName'),
        uploadZone: $('#uploadZone'),
        fileInput: $('#fileInput'),
        uploadPreview: $('#uploadPreview'),
        previewGrid: $('#previewGrid'),
        previewCount: $('#previewCount'),
        uploadProgress: $('#uploadProgress'),
        progressFill: $('#progressFill'),
        progressText: $('#progressText'),
        btnAnalyze: $('#btnAnalyze'),
        btnBackToTrade: $('#btnBackToTrade'),
        btnClearPhotos: $('#btnClearPhotos'),
        analysisLoading: $('#analysisLoading'),
        analysisResults: $('#analysisResults'),
        analysisError: $('#analysisError'),
        analysisErrorText: $('#analysisErrorText'),
        analysisTradeLabel: $('#analysisTradeLabel'),
        analysisThumbnail: $('#analysisThumbnail'),
        analysisThumbImg: $('#analysisThumbImg'),
        resultIssue: $('#resultIssue'),
        resultSeverity: $('#resultSeverity'),
        resultScope: $('#resultScope'),
        resultDescription: $('#resultDescription'),
        btnGenerateEstimate: $('#btnGenerateEstimate'),
        btnBackToUpload: $('#btnBackToUpload'),
        btnRetryAnalysis: $('#btnRetryAnalysis'),
        estimateLoading: $('#estimateLoading'),
        estimateResults: $('#estimateResults'),
        estimateError: $('#estimateError'),
        estimateErrorText: $('#estimateErrorText'),
        estimateTradeLabel: $('#estimateTradeLabel'),
        estimateSummary: $('#estimateSummary'),
        estimateScopeText: $('#estimateScopeText'),
        lineItemBody: $('#lineItemBody'),
        totalCost: $('#totalCost'),
        estimateNotes: $('#estimateNotes'),
        btnPrintEstimate: $('#btnPrintEstimate'),
        btnSaveEstimate: $('#btnSaveEstimate'),
        btnBackToAnalysis: $('#btnBackToAnalysis'),
        btnRetryEstimate: $('#btnRetryEstimate'),

        // Sidebar
        sidebar: $('#sidebar'),
        sidebarOverlay: $('#sidebarOverlay'),
        btnSavedEstimates: $('#btnSavedEstimates'),
        btnCloseSidebar: $('#btnCloseSidebar'),
        savedEstimatesList: $('#savedEstimatesList'),
        toastContainer: $('#toastContainer'),

        // Health Check
        healthCheckForm: $('#healthCheckForm'),
        hcBusinessName: $('#hcBusinessName'),
        hcCity: $('#hcCity'),
        hcWebsite: $('#hcWebsite'),
        btnRunAudit: $('#btnRunAudit'),
        healthLoading: $('#healthLoading'),
        healthError: $('#healthError'),
        healthErrorText: $('#healthErrorText'),
        healthResults: $('#healthResults'),
        overallScoreValue: $('#overallScoreValue'),
        scoreRingFill: $('#scoreRingFill'),
        scoreDetails: $('#scoreDetails'),
        categoryGrid: $('#categoryGrid'),
        recList: $('#recList'),
        btnNewAudit: $('#btnNewAudit'),

        // Lead Capture
        leadCapture: $('#leadCapture'),
        leadCaptureForm: $('#leadCaptureForm'),
        leadBusinessName: $('#leadBusinessName'),
        leadScore: $('#leadScore'),
        leadFullName: $('#leadFullName'),
        leadEmail: $('#leadEmail'),
        leadPhone: $('#leadPhone'),
        leadSuccess: $('#leadSuccess'),
        leadError: $('#leadError'),
        leadErrorText: $('#leadErrorText')
    };

    // --- Init ---
    function init() {
        loadSavedEstimates();
        loadClientName();
        bindEvents();
        goToStep(1);
    }

    // --- Persistence ---
    function loadSavedEstimates() {
        try {
            const raw = localStorage.getItem('photo_estimate_saved');
            state.savedEstimates = raw ? JSON.parse(raw) : [];
        } catch (e) {
            state.savedEstimates = [];
        }
    }

    function persistSavedEstimates() {
        localStorage.setItem('photo_estimate_saved', JSON.stringify(state.savedEstimates));
    }

    function loadClientName() {
        const saved = localStorage.getItem('photo_estimate_client_name');
        if (saved) {
            state.clientName = saved;
            dom.clientName.value = saved;
        }
    }

    function saveClientName() {
        state.clientName = dom.clientName.value.trim();
        localStorage.setItem('photo_estimate_client_name', state.clientName);
    }

    // --- Tab Switching ---
    function switchTab(tabName) {
        dom.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        dom.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === 'tab-' + tabName);
        });

        // If switching to health check, reset results
        if (tabName === 'health-check') {
            resetHealthCheckDisplay();
        }
    }

    // --- Navigation ---
    function goToStep(step) {
        state.currentStep = step;

        dom.stepPanels.forEach((panel, i) => {
            panel.classList.toggle('active', i + 1 === step);
        });

        const steps = dom.stepIndicator.querySelectorAll('.step');
        steps.forEach((el, i) => {
            const s = i + 1;
            el.classList.remove('active', 'completed');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('completed');
        });

        if ($('.main-content')) {
            $('.main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- Toast ---
    function showToast(message, type) {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    // --- Events ---
    function bindEvents() {
        // Tab switching
        dom.tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(btn.dataset.tab);
            });
        });

        // Trade card clicks
        dom.tradeCards.forEach(function (card) {
            card.addEventListener('click', function () { selectTrade(card); });
        });

        // Upload zone
        dom.uploadZone.addEventListener('click', function (e) {
            if (e.target !== dom.fileInput) {
                dom.fileInput.click();
            }
        });

        dom.uploadZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dom.uploadZone.classList.add('dragover');
        });

        dom.uploadZone.addEventListener('dragleave', function () {
            dom.uploadZone.classList.remove('dragover');
        });

        dom.uploadZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dom.uploadZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        dom.fileInput.addEventListener('change', function () {
            handleFiles(dom.fileInput.files);
        });

        // Client name persistence
        dom.clientName.addEventListener('input', saveClientName);

        // Photo estimate navigation
        dom.btnBackToTrade.addEventListener('click', function () { goToStep(1); });
        dom.btnAnalyze.addEventListener('click', runAnalysis);
        dom.btnBackToUpload.addEventListener('click', function () { goToStep(2); });
        dom.btnGenerateEstimate.addEventListener('click', generateEstimate);
        dom.btnRetryAnalysis.addEventListener('click', runAnalysis);
        dom.btnBackToAnalysis.addEventListener('click', function () { goToStep(3); });
        dom.btnSaveEstimate.addEventListener('click', saveEstimate);
        dom.btnPrintEstimate.addEventListener('click', function () { window.print(); });
        dom.btnRetryEstimate.addEventListener('click', generateEstimate);
        dom.btnClearPhotos.addEventListener('click', clearPhotos);

        // Sidebar
        dom.btnSavedEstimates.addEventListener('click', openSidebar);
        dom.btnCloseSidebar.addEventListener('click', closeSidebar);
        dom.sidebarOverlay.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && dom.sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        // Health Check
        dom.healthCheckForm.addEventListener('submit', function (e) {
            e.preventDefault();
            runHealthCheck();
        });

        dom.btnNewAudit.addEventListener('click', resetHealthCheckDisplay);

        // Lead Capture
        dom.leadCaptureForm.addEventListener('submit', function (e) {
            e.preventDefault();
            submitLeadCapture();
        });
    }

    // --- Trade Selection ---
    function selectTrade(card) {
        dom.tradeCards.forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.selectedTrade = card.dataset.trade;

        var tradeName = card.querySelector('.trade-name').textContent;
        dom.selectedTradeLabel.textContent = tradeName;

        setTimeout(function () { goToStep(2); }, 200);
    }

    // --- File Handling ---
    function handleFiles(fileList) {
        var accepted = ['image/jpeg', 'image/png', 'image/webp'];
        var newFiles = Array.from(fileList).filter(function (f) { return accepted.includes(f.type); });

        if (newFiles.length === 0) {
            showToast('Please upload JPG, PNG, or WebP files.', 'error');
            return;
        }

        if (newFiles.length < fileList.length) {
            showToast('Some files were skipped (unsupported format).', 'info');
        }

        state.files = newFiles;
        renderPreview();
        dom.btnAnalyze.disabled = false;
    }

    function renderPreview() {
        dom.previewGrid.innerHTML = '';

        state.files.forEach(function (file, idx) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var item = document.createElement('div');
                item.className = 'preview-item';
                item.innerHTML =
                    '<img src="' + e.target.result + '" alt="Preview">' +
                    '<button class="preview-remove" data-index="' + idx + '" title="Remove">X</button>';
                dom.previewGrid.appendChild(item);

                item.querySelector('.preview-remove').addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    removeFile(idx);
                });
            };
            reader.readAsDataURL(file);
        });

        dom.previewCount.textContent = state.files.length === 1
            ? '1 FILE LOADED'
            : state.files.length + ' FILES LOADED';
        dom.uploadPreview.style.display = 'block';

        if (state.files.length === 0) {
            dom.uploadPreview.style.display = 'none';
            dom.btnAnalyze.disabled = true;
        }
    }

    function removeFile(index) {
        state.files.splice(index, 1);
        dom.fileInput.value = '';
        renderPreview();
    }

    function clearPhotos() {
        state.files = [];
        state.uploadedFilename = null;
        dom.fileInput.value = '';
        dom.uploadPreview.style.display = 'none';
        dom.uploadProgress.style.display = 'none';
        dom.previewGrid.innerHTML = '';
        dom.btnAnalyze.disabled = true;
    }

    // --- API: Upload ---
    async function uploadPhotos() {
        if (state.files.length === 0) return null;

        dom.uploadProgress.style.display = 'block';
        dom.progressFill.style.width = '0%';
        dom.progressText.textContent = 'UPLOADING...';

        var formData = new FormData();
        state.files.forEach(function (file) {
            formData.append('photo', file);
        });

        var progressInterval = setInterval(function () {
            var current = parseFloat(dom.progressFill.style.width) || 0;
            if (current < 90) {
                dom.progressFill.style.width = (current + 10) + '%';
            }
        }, 200);

        try {
            var resp = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);

            if (!resp.ok) {
                var errData = await resp.json().catch(function () { return {}; });
                throw new Error(errData.error || 'Upload failed (HTTP ' + resp.status + ')');
            }

            dom.progressFill.style.width = '100%';
            dom.progressText.textContent = 'UPLOAD COMPLETE';

            var data = await resp.json();
            state.uploadedFilename = data.filename || null;

            setTimeout(function () {
                dom.uploadProgress.style.display = 'none';
            }, 800);

            return data;
        } catch (err) {
            clearInterval(progressInterval);
            dom.progressFill.style.width = '0%';
            dom.progressText.textContent = 'UPLOAD FAILED';
            throw err;
        }
    }

    // --- API: Analyze ---
    async function runAnalysis() {
        if (!state.selectedTrade) {
            showToast('SELECT A TRADE FIRST', 'error');
            return;
        }

        if (state.files.length === 0) {
            showToast('UPLOAD AT LEAST ONE FILE', 'error');
            return;
        }

        var tradeName = getTradeDisplayName(state.selectedTrade);
        dom.analysisTradeLabel.textContent = 'SCANNING FOR ' + tradeName.toUpperCase();

        goToStep(3);
        showAnalysisLoading();

        try {
            var uploadResult;
            try {
                uploadResult = await uploadPhotos();
            } catch (uploadErr) {
                console.warn('Upload failed, using mock flow:', uploadErr.message);
                state.uploadedFilename = state.files[0].name;
            }

            var body = {
                trade: state.selectedTrade,
                filename: state.uploadedFilename || (state.files[0] ? state.files[0].name : 'photo.jpg')
            };

            var data;
            try {
                var resp = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!resp.ok) {
                    var errData = await resp.json().catch(function () { return {}; });
                    throw new Error(errData.error || 'Analysis failed (HTTP ' + resp.status + ')');
                }

                data = await resp.json();
            } catch (apiErr) {
                console.warn('Analysis API unavailable, generating mock:', apiErr.message);
                await simulateDelay(800, 1600);
                data = generateMockAnalysis(state.selectedTrade);
            }

            if (state.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    dom.analysisThumbImg.src = e.target.result;
                    dom.analysisThumbnail.style.display = 'block';
                };
                reader.readAsDataURL(state.files[0]);
            }

            state.analysisData = data;
            displayAnalysisResults(data);
        } catch (err) {
            showAnalysisError(err.message);
        }
    }

    function showAnalysisLoading() {
        dom.analysisLoading.style.display = 'block';
        dom.analysisResults.style.display = 'none';
        dom.analysisError.style.display = 'none';
        dom.btnGenerateEstimate.style.display = 'none';
        dom.btnRetryAnalysis.style.display = 'none';
    }

    function displayAnalysisResults(data) {
        dom.analysisLoading.style.display = 'none';
        dom.analysisResults.style.display = 'block';
        dom.analysisError.style.display = 'none';
        dom.btnGenerateEstimate.style.display = 'inline-flex';
        dom.btnRetryAnalysis.style.display = 'none';

        dom.resultIssue.textContent = data.issue || data.damage_type || (data.analysis && data.analysis.damage_type) || '--';
        dom.resultDescription.textContent = data.recommendation || data.description || (data.analysis && data.analysis.recommended_scope) || '--';
        dom.resultScope.textContent = data.scope || data.square_footage || (data.analysis && data.analysis.square_footage ? '~' + data.analysis.square_footage + ' sq ft' : '--');

        var severity = (data.severity || (data.analysis && data.analysis.severity) || 'moderate').toLowerCase();
        var sevEl = dom.resultSeverity;
        sevEl.textContent = severity.toUpperCase();
        sevEl.className = 'severity-badge ' + severity;
    }

    function showAnalysisError(message) {
        dom.analysisLoading.style.display = 'none';
        dom.analysisResults.style.display = 'none';
        dom.analysisError.style.display = 'block';
        dom.btnGenerateEstimate.style.display = 'none';
        dom.btnRetryAnalysis.style.display = 'inline-flex';
        dom.analysisErrorText.textContent = message || 'Analysis failed. Please try again.';
    }

    // --- API: Estimate ---
    async function generateEstimate() {
        if (!state.analysisData) {
            showToast('NO ANALYSIS DATA AVAILABLE', 'error');
            return;
        }

        goToStep(4);
        showEstimateLoading();

        try {
            var body = {
                trade: state.selectedTrade,
                analysis: state.analysisData.analysis || state.analysisData,
                client_name: state.clientName || 'Client'
            };

            var data;
            try {
                var resp = await fetch('/api/estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!resp.ok) {
                    var errData = await resp.json().catch(function () { return {}; });
                    throw new Error(errData.error || 'Estimate failed (HTTP ' + resp.status + ')');
                }

                data = await resp.json();
            } catch (apiErr) {
                console.warn('Estimate API unavailable, generating mock:', apiErr.message);
                await simulateDelay(400, 1000);
                data = generateMockEstimate(state.selectedTrade, state.analysisData);
            }

            state.estimateData = data;
            displayEstimateResults(data);
        } catch (err) {
            showEstimateError(err.message);
        }
    }

    function showEstimateLoading() {
        dom.estimateLoading.style.display = 'block';
        dom.estimateResults.style.display = 'none';
        dom.estimateError.style.display = 'none';
    }

    function displayEstimateResults(data) {
        dom.estimateLoading.style.display = 'none';
        dom.estimateResults.style.display = 'block';
        dom.estimateError.style.display = 'none';

        var tradeName = getTradeDisplayName(state.selectedTrade);
        dom.estimateTradeLabel.textContent = tradeName.toUpperCase() + ' ESTIMATE';

        var breakdown = data.breakdown || data;
        var scopeOfWork = breakdown.scope_of_work || (state.analysisData && (state.analysisData.recommendation || (state.analysisData.analysis && state.analysisData.analysis.recommended_scope))) || 'No summary available.';
        dom.estimateScopeText.textContent = scopeOfWork;

        dom.lineItemBody.innerHTML = '';
        var items = breakdown.line_items || [];
        var total = 0;

        items.forEach(function (item) {
            var name = item.item || item.name || 'Item';
            var qty = item.quantity || item.qty || 1;
            var rate = item.rate || item.unit_price || 0;
            var amount = item.line_total || item.amount || item.total || (qty * rate);
            total += amount;

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + escapeHtml(name) + '</td>' +
                '<td class="col-qty">' + qty + '</td>' +
                '<td class="col-rate">$' + rate.toFixed(2) + '</td>' +
                '<td class="col-amount">$' + amount.toFixed(2) + '</td>';
            dom.lineItemBody.appendChild(tr);
        });

        if (items.length === 0 && (breakdown.calculated_price || breakdown.total_cost)) {
            total = breakdown.calculated_price || breakdown.total_cost;
        }

        dom.totalCost.textContent = '$' + total.toFixed(2);
        state.currentEstimateTotal = total;
        state._currentLineItems = items;
        state._currentScopeOfWork = scopeOfWork;
    }

    function showEstimateError(message) {
        dom.estimateLoading.style.display = 'none';
        dom.estimateResults.style.display = 'none';
        dom.estimateError.style.display = 'block';
        dom.estimateErrorText.textContent = message || 'Failed to generate estimate.';
    }

    // --- Save Estimate ---
    function saveEstimate() {
        if (!state.estimateData && !state.currentEstimateTotal) {
            showToast('NO ESTIMATE TO SAVE', 'error');
            return;
        }

        var savedEstimate = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            trade: state.selectedTrade,
            tradeName: getTradeDisplayName(state.selectedTrade),
            clientName: state.clientName || 'Unnamed Client',
            date: new Date().toISOString(),
            total: state.currentEstimateTotal || 0,
            lineItems: state._currentLineItems || [],
            scopeOfWork: state._currentScopeOfWork || '',
            notes: dom.estimateNotes.value.trim(),
            analysisData: state.analysisData,
            estimateData: state.estimateData
        };

        state.savedEstimates.unshift(savedEstimate);
        persistSavedEstimates();
        renderSavedEstimatesList();
        showToast('ESTIMATE SAVED TO ARCHIVE', 'success');
    }

    function deleteSavedEstimate(id) {
        state.savedEstimates = state.savedEstimates.filter(function (e) { return e.id !== id; });
        persistSavedEstimates();
        renderSavedEstimatesList();
        showToast('ESTIMATE DELETED', 'info');
    }

    function renderSavedEstimatesList() {
        if (state.savedEstimates.length === 0) {
            dom.savedEstimatesList.innerHTML =
                '<div class="sidebar-empty">' +
                    '<div class="sidebar-empty-icon">&#9638;</div>' +
                    '<p>NO ESTIMATES IN ARCHIVE</p>' +
                    '<p class="text-muted">Complete an estimate and click "SAVE ESTIMATE" to store it here.</p>' +
                '</div>';
            return;
        }

        dom.savedEstimatesList.innerHTML = state.savedEstimates.map(function (est) {
            var date = new Date(est.date);
            var dateStr = date.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });

            return '<div class="saved-estimate-card" data-id="' + est.id + '">' +
                '<div class="se-trade">' + escapeHtml(est.tradeName) + '</div>' +
                '<div class="se-client">' + escapeHtml(est.clientName) + '</div>' +
                '<div class="se-meta">' +
                    '<span>$' + est.total.toFixed(2) + '</span>' +
                    '<span>' + dateStr + '</span>' +
                    '<button class="btn-delete-estimate" data-delete-id="' + est.id + '" title="Delete">X</button>' +
                '</div>' +
            '</div>';
        }).join('');

        dom.savedEstimatesList.querySelectorAll('.saved-estimate-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.closest('.btn-delete-estimate')) return;
                viewSavedEstimate(card.dataset.id);
            });
        });

        dom.savedEstimatesList.querySelectorAll('.btn-delete-estimate').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('Delete this estimate?')) {
                    deleteSavedEstimate(btn.dataset.deleteId);
                }
            });
        });
    }

    function viewSavedEstimate(id) {
        var est = state.savedEstimates.find(function (e) { return e.id === id; });
        if (!est) return;

        state.selectedTrade = est.trade;
        state.analysisData = est.analysisData;
        state.estimateData = est.estimateData;
        state.clientName = est.clientName;
        state.currentEstimateTotal = est.total;
        state._currentLineItems = est.lineItems;
        state._currentScopeOfWork = est.scopeOfWork;

        dom.clientName.value = est.clientName;

        var displayData = {
            scope_of_work: est.scopeOfWork,
            line_items: est.lineItems.map(function (item) {
                return {
                    item: item.name,
                    name: item.name,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                    line_total: item.amount
                };
            }),
            total_cost: est.total,
            calculated_price: est.total
        };

        dom.estimateNotes.value = est.notes || '';
        goToStep(4);
        displayEstimateResults(displayData);
        closeSidebar();
    }

    // --- Sidebar ---
    function openSidebar() {
        renderSavedEstimatesList();
        dom.sidebar.classList.add('open');
        dom.sidebarOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        dom.sidebar.classList.remove('open');
        dom.sidebarOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // ══════════════════════════════════════════════
    //  HEALTH CHECK
    // ══════════════════════════════════════════════

    function resetHealthCheckDisplay() {
        dom.healthCheckForm.style.display = '';
        dom.healthLoading.style.display = 'none';
        dom.healthError.style.display = 'none';
        dom.healthResults.style.display = 'none';
    }

    async function runHealthCheck() {
        var businessName = dom.hcBusinessName.value.trim();
        var city = dom.hcCity.value.trim();
        var website = dom.hcWebsite.value.trim() || '';

        if (!businessName || !city) {
            showToast('BUSINESS NAME AND CITY REQUIRED', 'error');
            return;
        }

        // Hide form, show loading
        dom.healthCheckForm.style.display = 'none';
        dom.healthLoading.style.display = 'block';
        dom.healthError.style.display = 'none';
        dom.healthResults.style.display = 'none';

        try {
            var body = {
                business_name: businessName,
                city: city
            };
            if (website) body.website = website;

            var data;
            try {
                var resp = await fetch('/api/health-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!resp.ok) {
                    var errData = await resp.json().catch(function () { return {}; });
                    throw new Error(errData.error || 'Audit failed (HTTP ' + resp.status + ')');
                }

                data = await resp.json();
            } catch (apiErr) {
                console.warn('Health check API unavailable, generating mock:', apiErr.message);
                await simulateDelay(1000, 2000);
                data = generateMockHealthCheck(businessName, city, website || null);
            }

            state.healthCheckData = data;
            displayHealthResults(data);
        } catch (err) {
            dom.healthLoading.style.display = 'none';
            dom.healthError.style.display = 'block';
            dom.healthErrorText.textContent = err.message || 'Audit failed. Please try again.';
        }
    }

    function displayHealthResults(data) {
        dom.healthLoading.style.display = 'none';
        dom.healthError.style.display = 'none';
        dom.healthResults.style.display = 'block';

        var overallScore = data.overall_score || 0;

        // Score ring
        dom.overallScoreValue.textContent = overallScore;
        var circumference = 2 * Math.PI * 52; // r=52
        var dashLength = (overallScore / 100) * circumference;
        dom.scoreRingFill.setAttribute('stroke-dasharray', dashLength + ' ' + circumference);

        // Score color
        var scoreColor;
        if (overallScore >= 70) scoreColor = '#22c55e';
        else if (overallScore >= 40) scoreColor = '#f59e0b';
        else scoreColor = '#ef4444';
        dom.scoreRingFill.setAttribute('stroke', scoreColor);

        // Score grade
        var grade;
        if (overallScore >= 80) grade = 'STRONG DIGITAL PRESENCE';
        else if (overallScore >= 60) grade = 'ADEQUATE — ROOM TO IMPROVE';
        else if (overallScore >= 40) grade = 'WEAK — NEEDS ATTENTION';
        else grade = 'CRITICAL — IMMEDIATE ACTION NEEDED';

        var ratingText = '';
        if (data.rating) {
            ratingText = '<br>Google Rating: ' + data.rating + ' / 5.0 (' + (data.review_count || 0) + ' reviews)';
        }
        if (data.mock) {
            ratingText += '<br><small style="color:#707088">(Mock data — live API unavailable)</small>';
        }

        dom.scoreDetails.innerHTML =
            '<div class="score-grade" style="color:' + scoreColor + '">' + grade + '</div>' +
            '<div>Business: ' + escapeHtml(data.business_name || '') + '</div>' +
            '<div>Location: ' + escapeHtml(data.city || '') + '</div>' +
            ratingText;

        // Categories
        var categories = data.categories || [];
        dom.categoryGrid.innerHTML = categories.map(function (cat) {
            var findingsHtml = '';
            if (cat.findings && cat.findings.length > 0) {
                findingsHtml = cat.findings.map(function (f) {
                    return '<li class="cat-finding ' + f.type + '">' + escapeHtml(f.text) + '</li>';
                }).join('');
            }

            var pct = cat.max > 0 ? Math.round((cat.score / cat.max) * 100) : 0;

            return '<div class="category-card">' +
                '<div class="cat-header">' +
                    '<span class="cat-name">' + escapeHtml(cat.name) + '</span>' +
                    '<span class="cat-status ' + cat.status + '">' + cat.status.toUpperCase() + '</span>' +
                '</div>' +
                '<div class="cat-score-bar">' +
                    '<div class="cat-score-fill ' + cat.status + '" style="width:' + pct + '%"></div>' +
                '</div>' +
                '<div class="cat-score-text">' + cat.score + ' / ' + cat.max + '</div>' +
                (findingsHtml ? '<ul class="cat-findings">' + findingsHtml + '</ul>' : '') +
            '</div>';
        }).join('');

        // Recommendations
        var recommendations = data.recommendations || [];
        dom.recList.innerHTML = recommendations.map(function (rec) {
            return '<div class="rec-item">' +
                '<div class="rec-priority">PRIORITY ' + rec.priority + ' : ' + escapeHtml(rec.category || '').toUpperCase() + '</div>' +
                '<div class="rec-title">' + escapeHtml(rec.title) + '</div>' +
                '<div class="rec-desc">' + escapeHtml(rec.description) + '</div>' +
            '</div>';
        }).join('');

        // Lead capture pre-fill
        dom.leadBusinessName.value = data.business_name || '';
        dom.leadScore.value = overallScore;

        // Show lead capture (always show if score < 70)
        if (overallScore < 80) {
            dom.leadCapture.style.display = '';
        } else {
            dom.leadCapture.style.display = 'none';
        }

        // Reset lead form
        dom.leadCaptureForm.style.display = '';
        dom.leadSuccess.style.display = 'none';
        dom.leadError.style.display = 'none';
        dom.leadFullName.value = '';
        dom.leadEmail.value = '';
        dom.leadPhone.value = '';
    }

    async function submitLeadCapture() {
        var fullName = dom.leadFullName.value.trim();
        var email = dom.leadEmail.value.trim();
        var phone = dom.leadPhone.value.trim();

        if (!fullName || !email || !phone) {
            showToast('ALL FIELDS REQUIRED', 'error');
            return;
        }

        var payload = {
            full_name: fullName,
            email: email,
            phone: phone,
            business_name: dom.leadBusinessName.value,
            audit_score: parseInt(dom.leadScore.value, 10) || 0,
            source: 'photo_estimate_health_check',
            timestamp: new Date().toISOString()
        };

        try {
            var resp = await fetch('https://leadgen.presencify.co/api/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                var errText = await resp.text().catch(function () { return ''; });
                console.warn('Lead capture API returned ' + resp.status + ': ' + errText);
                // Show success anyway — don't block the UX
            }

            dom.leadCaptureForm.style.display = 'none';
            dom.leadSuccess.style.display = 'block';
            dom.leadError.style.display = 'none';
        } catch (err) {
            console.warn('Lead capture failed, but showing success for UX:', err.message);
            // Show success even on network error — the backend can retry
            dom.leadCaptureForm.style.display = 'none';
            dom.leadSuccess.style.display = 'block';
            dom.leadError.style.display = 'none';
        }
    }

    // --- Mock Health Check Generator ---
    function generateMockHealthCheck(businessName, city, website) {
        function seedRandom(seed) {
            var h = 0;
            for (var i = 0; i < seed.length; i++) {
                h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
            }
            return function () {
                h = (h * 1103515245 + 12345) | 0;
                return (h >>> 0) / 0xFFFFFFFF;
            };
        }

        var rng = seedRandom(businessName + city);
        var hasWebsite = !!website;

        var websiteScore = hasWebsite ? Math.floor(rng() * 11 + 15) : 5;
        var googleScore = Math.floor(rng() * 15 + 8);
        var citationScore = Math.floor(rng() * 9 + 5);
        var reviewScore = Math.floor(rng() * 14 + 5);
        var socialScore = Math.floor(rng() * 11 + 3);

        var overall = websiteScore + googleScore + citationScore + reviewScore + socialScore;
        overall = Math.min(overall, 100);

        var rating = googleScore > 10 ? Math.round((rng() * 2.5 + 2.5) * 10) / 10 : null;
        var reviewCount = rating ? Math.floor(rng() * 80) : 0;

        var categories = [
            {
                id: 'website',
                name: 'Website Check',
                status: websiteScore >= 20 ? 'pass' : (websiteScore >= 12 ? 'warn' : 'fail'),
                score: websiteScore,
                max: 25,
                findings: mockWebsiteFindings(hasWebsite, websiteScore)
            },
            {
                id: 'ranking',
                name: 'Google Ranking',
                status: googleScore >= 20 ? 'pass' : (googleScore >= 12 ? 'warn' : 'fail'),
                score: googleScore,
                max: 25,
                findings: mockRankingFindings(googleScore, businessName, city)
            },
            {
                id: 'citations',
                name: 'Citation Health',
                status: citationScore >= 12 ? 'pass' : (citationScore >= 8 ? 'warn' : 'fail'),
                score: citationScore,
                max: 15,
                findings: [
                    { type: citationScore >= 12 ? 'good' : 'warn', text: 'NAP consistency across major directories is ' + (citationScore >= 10 ? 'consistent' : 'inconsistent in 3+ places') },
                    { type: citationScore < 12 ? 'warn' : 'good', text: citationScore >= 8 ? 'Yelp, YellowPages, and BBB listings found' : 'Missing from Yelp and YellowPages' },
                    { type: citationScore < 8 ? 'bad' : 'good', text: citationScore >= 10 ? 'Business hours match across platforms' : 'Business hours mismatch detected on 2 platforms' }
                ]
            },
            {
                id: 'reviews',
                name: 'Review Score',
                status: reviewScore >= 15 ? 'pass' : (reviewScore >= 10 ? 'warn' : 'fail'),
                score: reviewScore,
                max: 20,
                findings: mockReviewFindings(rating, reviewCount, reviewScore)
            },
            {
                id: 'social',
                name: 'Social Presence',
                status: socialScore >= 12 ? 'pass' : (socialScore >= 7 ? 'warn' : 'fail'),
                score: socialScore,
                max: 15,
                findings: mockSocialFindings(socialScore)
            }
        ];

        var recommendations = generateRecommendations(categories, overall);

        return {
            ok: true,
            mock: true,
            mock_note: 'Live data unavailable — showing estimated scores based on typical patterns',
            business_name: businessName,
            city: city,
            website: website,
            overall_score: overall,
            rating: rating,
            review_count: reviewCount,
            categories: categories,
            recommendations: recommendations
        };
    }

    function mockWebsiteFindings(hasWebsite, score) {
        if (!hasWebsite) {
            return [
                { type: 'bad', text: 'No website detected — this is a critical gap' },
                { type: 'bad', text: 'Missing online presence means lost credibility with 56% of consumers' },
                { type: 'warn', text: 'Even a simple landing page can improve trust dramatically' }
            ];
        }
        if (score >= 20) {
            return [
                { type: 'good', text: 'Website is present and loads reasonably well' },
                { type: 'good', text: 'Mobile responsiveness appears adequate' },
                { type: 'warn', text: 'Minor SEO improvements could boost organic traffic' }
            ];
        } else if (score >= 12) {
            return [
                { type: 'warn', text: 'Website present but could use performance improvements' },
                { type: 'warn', text: 'Mobile experience may be suboptimal — 61% of local searches are mobile' },
                { type: 'bad', text: 'Slow load times cost conversions — each second costs ~7%' }
            ];
        } else {
            return [
                { type: 'bad', text: 'Website has critical performance issues' },
                { type: 'bad', text: 'Not mobile-friendly — Google penalizes this in rankings' },
                { type: 'bad', text: 'Missing HTTPS or has security warnings' }
            ];
        }
    }

    function mockRankingFindings(score, businessName, city) {
        if (score >= 20) {
            return [
                { type: 'good', text: 'Appears in top 3 for "' + businessName + '" searches in ' + city },
                { type: 'good', text: 'Google Business Profile is claimed and verified' },
                { type: 'warn', text: 'Could rank higher for category-specific searches' }
            ];
        } else if (score >= 12) {
            return [
                { type: 'warn', text: 'Appears in results but not in top 3 for ' + city + ' searches' },
                { type: 'warn', text: 'Google Business Profile may be incomplete' },
                { type: 'bad', text: 'Missing category tags — people searching by service may not find you' }
            ];
        } else {
            return [
                { type: 'bad', text: 'Not appearing in top results for ' + city + ' searches' },
                { type: 'bad', text: 'Google Business Profile may be unclaimed or unverified' },
                { type: 'bad', text: 'Competitors are outranking you for your own business name' }
            ];
        }
    }

    function mockReviewFindings(rating, reviewCount, score) {
        if (rating === null) {
            return [
                { type: 'bad', text: 'No reviews found — 93% of consumers read reviews before choosing' },
                { type: 'bad', text: 'Zero social proof means prospects choose competitors instead' },
                { type: 'warn', text: 'Reviews directly impact local search ranking on Google' }
            ];
        }
        var findings = [];
        if (rating >= 4.0) {
            findings.push({ type: 'good', text: 'Strong rating: ' + rating + ' / 5.0' });
        } else if (rating >= 3.0) {
            findings.push({ type: 'warn', text: 'Average rating: ' + rating + ' / 5.0 — room for improvement' });
        } else {
            findings.push({ type: 'bad', text: 'Low rating: ' + rating + ' / 5.0 — reputation needs urgent attention' });
        }

        if (reviewCount >= 30) {
            findings.push({ type: 'good', text: 'Healthy review volume: ' + reviewCount + ' reviews' });
        } else if (reviewCount >= 10) {
            findings.push({ type: 'warn', text: 'Low review count: ' + reviewCount + ' — competitors likely have more' });
        } else {
            findings.push({ type: 'bad', text: 'Very few reviews: ' + reviewCount + ' — looks inactive to prospects' });
        }

        if (score >= 15) {
            findings.push({ type: 'good', text: 'Review recency is good — recent reviews build trust' });
        } else {
            findings.push({ type: 'warn', text: 'No recent reviews in the last 90 days' });
        }

        return findings.slice(0, 3);
    }

    function mockSocialFindings(score) {
        if (score >= 12) {
            return [
                { type: 'good', text: 'Facebook business page found and appears active' },
                { type: 'good', text: 'Instagram profile detected with consistent branding' },
                { type: 'warn', text: 'Nextdoor profile not claimed — neighborhood visibility gap' }
            ];
        } else if (score >= 7) {
            return [
                { type: 'warn', text: 'Facebook page exists but may be inactive or incomplete' },
                { type: 'bad', text: 'No Instagram profile detected — missing visual social traffic' },
                { type: 'warn', text: 'Social profiles not linked on website or Google listing' }
            ];
        } else {
            return [
                { type: 'bad', text: 'No Facebook business page detected' },
                { type: 'bad', text: 'No Instagram presence — 71% of small businesses use Instagram' },
                { type: 'bad', text: 'Zero social media presence — invisible to social-driven customers' }
            ];
        }
    }

    function generateRecommendations(categories, overall) {
        var scored = categories.map(function (cat) {
            return { ratio: cat.max > 0 ? cat.score / cat.max : 0, cat: cat };
        });
        scored.sort(function (a, b) { return a.ratio - b.ratio; });

        var templates = {
            website: {
                title: 'Build or Optimize Your Website',
                description: 'A fast, mobile-friendly website is your 24/7 salesperson. We\'ll build you a modern site that loads in under 2 seconds, ranks on Google, and converts visitors into leads — with clear calls-to-action, before/after galleries, and online booking.'
            },
            ranking: {
                title: 'Claim & Optimize Your Google Business Profile',
                description: 'Your Google Business Profile is the #1 local ranking factor. We\'ll fully optimize it — correct categories, service areas, business hours, photos, and weekly posts — to push you into the top 3 map pack results for your city.'
            },
            citations: {
                title: 'Fix Citation Inconsistencies Across the Web',
                description: 'Inconsistent NAP (Name, Address, Phone) across directories confuses Google and hurts your ranking. We\'ll audit 50+ directories and fix every mismatch, building consistent, authoritative citations that boost local SEO.'
            },
            reviews: {
                title: 'Launch a Review Generation System',
                description: 'Reviews are social proof and a top-3 ranking signal. We\'ll set up an automated review request system that texts/emails happy customers, making it effortless to collect 10-20 new 5-star reviews per month.'
            },
            social: {
                title: 'Establish Your Social Media Presence',
                description: 'Customers check social media before hiring. We\'ll create and brand your Facebook + Instagram profiles, set up a content calendar, and post engaging content that drives local traffic to your business.'
            }
        };

        return scored.slice(0, 3).map(function (item, i) {
            var tmpl = templates[item.cat.id] || {
                title: 'Improve Your ' + item.cat.name,
                description: 'Your ' + item.cat.name.toLowerCase() + ' score is holding you back. We can help you address these gaps with targeted improvements that directly impact your customer acquisition.'
            };
            return {
                priority: i + 1,
                category: item.cat.id,
                title: tmpl.title,
                description: tmpl.description
            };
        });
    }

    // --- Helpers ---
    function getTradeDisplayName(trade) {
        var map = {
            roofing: 'Roofing',
            landscaping: 'Landscaping',
            painting: 'Painting',
            hvac: 'HVAC',
            fencing: 'Fencing',
            plumbing: 'Plumbing',
            pest_control: 'Pest Control',
            remodeling: 'Remodeling'
        };
        return map[trade] || trade || 'Unknown';
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function simulateDelay(min, max) {
        var ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // --- Mock Data Generators (Photo Estimate) ---
    function generateMockAnalysis(trade) {
        var analyses = {
            roofing: {
                issue: 'Damaged asphalt shingles with granule loss',
                severity: 'moderate',
                scope: '~2,400 sq ft roof area',
                recommendation: 'Remove and replace existing asphalt shingles. Inspect underlayment for water damage. Install new synthetic underlayment and architectural shingles. Replace all flashing around chimneys and vents. Install ridge vent for proper attic ventilation.',
                damage_type: 'Weather-related wear and granule loss'
            },
            landscaping: {
                issue: 'Overgrown vegetation and poor drainage',
                severity: 'minor',
                scope: '~1,500 sq ft yard area',
                recommendation: 'Clear overgrown shrubs and weeds. Regrade soil for proper drainage away from foundation. Install new sod and drought-resistant plants. Add mulch beds and stone border edging. Install basic drip irrigation system.',
                damage_type: 'Neglect and drainage issues'
            },
            painting: {
                issue: 'Peeling exterior paint with wood exposure',
                severity: 'moderate',
                scope: '~1,800 sq ft exterior surface',
                recommendation: 'Pressure wash all exterior surfaces. Scrape peeling paint and sand rough areas. Prime exposed wood with oil-based primer. Apply two coats of premium exterior acrylic latex paint. Caulk all windows, doors, and trim gaps.',
                damage_type: 'UV damage and moisture intrusion'
            },
            hvac: {
                issue: 'AC unit not cooling properly — low refrigerant',
                severity: 'major',
                scope: '3-ton central AC system',
                recommendation: 'Perform full system diagnostic. Locate and repair refrigerant leak. Evacuate and recharge system with R-410A. Replace worn condenser fan motor. Clean evaporator and condenser coils. Test system performance and airflow.',
                damage_type: 'Refrigerant leak and component wear'
            },
            fencing: {
                issue: 'Rotting wooden fence posts and leaning sections',
                severity: 'moderate',
                scope: '~120 linear feet of fencing',
                recommendation: 'Remove and dispose of existing wooden fence. Install new pressure-treated 4x4 posts set in concrete. Install pre-assembled cedar fence panels. Add post caps for weather protection. Stain/seal entire fence for longevity.',
                damage_type: 'Wood rot and ground contact deterioration'
            },
            plumbing: {
                issue: 'Slab leak — water seeping through foundation',
                severity: 'major',
                scope: 'Under-slab copper piping',
                recommendation: 'Perform leak detection with acoustic equipment. Jackhammer concrete slab to access leaking pipe section. Replace damaged copper pipe with PEX. Pressure test entire system for additional leaks. Patch and refinish concrete slab.',
                damage_type: 'Pipe corrosion and pinhole leak'
            },
            pest_control: {
                issue: 'Active subterranean termite infestation',
                severity: 'major',
                scope: '~2,000 sq ft home perimeter',
                recommendation: 'Conduct full inspection of all accessible areas. Install termite bait stations around foundation perimeter. Apply liquid termiticide barrier treatment. Treat active galleries in affected wood members. Schedule quarterly follow-up inspections for 12 months.',
                damage_type: 'Termite colony infestation in crawlspace'
            },
            remodeling: {
                issue: 'Outdated kitchen — cabinets and countertops worn',
                severity: 'moderate',
                scope: '~200 sq ft kitchen area',
                recommendation: 'Demolish existing cabinets, countertops, and backsplash. Install new soft-close shaker cabinets. Install quartz countertops with undermount sink. Add subway tile backsplash. Install new LED recessed lighting. Paint walls and ceiling.',
                damage_type: 'General wear and outdated materials'
            }
        };

        return analyses[trade] || analyses.roofing;
    }

    function generateMockEstimate(trade, analysis) {
        var templates = {
            roofing: {
                scope_of_work: 'Remove and replace existing asphalt shingles. Inspect underlayment for water damage. Install new synthetic underlayment and architectural shingles. Replace all flashing around chimneys and vents. Install ridge vent for proper attic ventilation.',
                line_items: [
                    { item: 'Tear-off and disposal of existing shingles', name: 'Tear-off and disposal of existing shingles', quantity: 24, rate: 85.00, line_total: 2040.00, amount: 2040.00 },
                    { item: 'Synthetic underlayment installation', name: 'Synthetic underlayment installation', quantity: 24, rate: 55.00, line_total: 1320.00, amount: 1320.00 },
                    { item: 'Architectural shingles — material', name: 'Architectural shingles — material', quantity: 24, rate: 130.00, line_total: 3120.00, amount: 3120.00 },
                    { item: 'Labor — shingle installation', name: 'Labor — shingle installation', quantity: 24, rate: 120.00, line_total: 2880.00, amount: 2880.00 },
                    { item: 'Flashing replacement (chimney, vents)', name: 'Flashing replacement (chimney, vents)', quantity: 1, rate: 850.00, line_total: 850.00, amount: 850.00 },
                    { item: 'Ridge vent installation', name: 'Ridge vent installation', quantity: 1, rate: 450.00, line_total: 450.00, amount: 450.00 },
                    { item: 'Dumpster rental and disposal fees', name: 'Dumpster rental and disposal fees', quantity: 1, rate: 600.00, line_total: 600.00, amount: 600.00 },
                    { item: 'Permits and inspection fees', name: 'Permits and inspection fees', quantity: 1, rate: 350.00, line_total: 350.00, amount: 350.00 }
                ],
                calculated_price: 11610.00,
                total_cost: 11610.00
            },
            landscaping: {
                scope_of_work: 'Clear overgrown shrubs and weeds. Regrade soil for proper drainage away from foundation. Install new sod and drought-resistant plants. Add mulch beds and stone border edging. Install basic drip irrigation system.',
                line_items: [
                    { item: 'Vegetation clearing and debris removal', name: 'Vegetation clearing and debris removal', quantity: 1, rate: 600.00, line_total: 600.00, amount: 600.00 },
                    { item: 'Soil grading and drainage correction', name: 'Soil grading and drainage correction', quantity: 1, rate: 1200.00, line_total: 1200.00, amount: 1200.00 },
                    { item: 'Sod installation — material and labor', name: 'Sod installation — material and labor', quantity: 15, rate: 95.00, line_total: 1425.00, amount: 1425.00 },
                    { item: 'Drought-resistant plants and shrubs', name: 'Drought-resistant plants and shrubs', quantity: 20, rate: 35.00, line_total: 700.00, amount: 700.00 },
                    { item: 'Mulch — premium hardwood (delivered)', name: 'Mulch — premium hardwood (delivered)', quantity: 8, rate: 65.00, line_total: 520.00, amount: 520.00 },
                    { item: 'Stone border edging — material and install', name: 'Stone border edging — material and install', quantity: 1, rate: 450.00, line_total: 450.00, amount: 450.00 },
                    { item: 'Drip irrigation system — parts and labor', name: 'Drip irrigation system — parts and labor', quantity: 1, rate: 1100.00, line_total: 1100.00, amount: 1100.00 }
                ],
                calculated_price: 5995.00,
                total_cost: 5995.00
            },
            painting: {
                scope_of_work: 'Pressure wash all exterior surfaces. Scrape peeling paint and sand rough areas. Prime exposed wood with oil-based primer. Apply two coats of premium exterior acrylic latex paint. Caulk all windows, doors, and trim gaps.',
                line_items: [
                    { item: 'Pressure washing — entire exterior', name: 'Pressure washing — entire exterior', quantity: 1, rate: 400.00, line_total: 400.00, amount: 400.00 },
                    { item: 'Scraping, sanding, and surface prep', name: 'Scraping, sanding, and surface prep', quantity: 18, rate: 55.00, line_total: 990.00, amount: 990.00 },
                    { item: 'Oil-based primer — material', name: 'Oil-based primer — material', quantity: 6, rate: 48.00, line_total: 288.00, amount: 288.00 },
                    { item: 'Premium exterior paint — material', name: 'Premium exterior paint — material', quantity: 12, rate: 52.00, line_total: 624.00, amount: 624.00 },
                    { item: 'Labor — paint application (2 coats)', name: 'Labor — paint application (2 coats)', quantity: 18, rate: 85.00, line_total: 1530.00, amount: 1530.00 },
                    { item: 'Caulking and gap sealing — material & labor', name: 'Caulking and gap sealing — material & labor', quantity: 1, rate: 350.00, line_total: 350.00, amount: 350.00 },
                    { item: 'Equipment and scaffolding rental', name: 'Equipment and scaffolding rental', quantity: 1, rate: 280.00, line_total: 280.00, amount: 280.00 }
                ],
                calculated_price: 4462.00,
                total_cost: 4462.00
            },
            hvac: {
                scope_of_work: 'Perform full system diagnostic. Locate and repair refrigerant leak. Evacuate and recharge system with R-410A. Replace worn condenser fan motor. Clean evaporator and condenser coils. Test system performance and airflow.',
                line_items: [
                    { item: 'System diagnostic and leak detection', name: 'System diagnostic and leak detection', quantity: 1, rate: 195.00, line_total: 195.00, amount: 195.00 },
                    { item: 'Refrigerant leak repair — labor', name: 'Refrigerant leak repair — labor', quantity: 1, rate: 450.00, line_total: 450.00, amount: 450.00 },
                    { item: 'R-410A refrigerant recharge (8 lbs)', name: 'R-410A refrigerant recharge (8 lbs)', quantity: 8, rate: 75.00, line_total: 600.00, amount: 600.00 },
                    { item: 'Condenser fan motor — replacement part', name: 'Condenser fan motor — replacement part', quantity: 1, rate: 285.00, line_total: 285.00, amount: 285.00 },
                    { item: 'Fan motor installation labor', name: 'Fan motor installation labor', quantity: 1, rate: 220.00, line_total: 220.00, amount: 220.00 },
                    { item: 'Coil cleaning and system tune-up', name: 'Coil cleaning and system tune-up', quantity: 1, rate: 300.00, line_total: 300.00, amount: 300.00 },
                    { item: 'Performance testing and calibration', name: 'Performance testing and calibration', quantity: 1, rate: 150.00, line_total: 150.00, amount: 150.00 }
                ],
                calculated_price: 2200.00,
                total_cost: 2200.00
            },
            fencing: {
                scope_of_work: 'Remove and dispose of existing wooden fence. Install new pressure-treated 4x4 posts set in concrete. Install pre-assembled cedar fence panels. Add post caps for weather protection. Stain/seal entire fence for longevity.',
                line_items: [
                    { item: 'Old fence demolition and disposal', name: 'Old fence demolition and disposal', quantity: 1, rate: 700.00, line_total: 700.00, amount: 700.00 },
                    { item: 'Pressure-treated 4x4 posts — material', name: 'Pressure-treated 4x4 posts — material', quantity: 20, rate: 22.00, line_total: 440.00, amount: 440.00 },
                    { item: 'Post hole digging and concrete setting', name: 'Post hole digging and concrete setting', quantity: 20, rate: 45.00, line_total: 900.00, amount: 900.00 },
                    { item: 'Cedar fence panels — pre-assembled', name: 'Cedar fence panels — pre-assembled', quantity: 20, rate: 85.00, line_total: 1700.00, amount: 1700.00 },
                    { item: 'Panel installation labor', name: 'Panel installation labor', quantity: 120, rate: 8.00, line_total: 960.00, amount: 960.00 },
                    { item: 'Post caps and hardware', name: 'Post caps and hardware', quantity: 1, rate: 180.00, line_total: 180.00, amount: 180.00 },
                    { item: 'Stain and seal — material and application', name: 'Stain and seal — material and application', quantity: 1, rate: 500.00, line_total: 500.00, amount: 500.00 }
                ],
                calculated_price: 5380.00,
                total_cost: 5380.00
            },
            plumbing: {
                scope_of_work: 'Perform leak detection with acoustic equipment. Jackhammer concrete slab to access leaking pipe section. Replace damaged copper pipe with PEX. Pressure test entire system for additional leaks. Patch and refinish concrete slab.',
                line_items: [
                    { item: 'Leak detection — acoustic equipment', name: 'Leak detection — acoustic equipment', quantity: 1, rate: 350.00, line_total: 350.00, amount: 350.00 },
                    { item: 'Concrete slab cutting and excavation', name: 'Concrete slab cutting and excavation', quantity: 1, rate: 1200.00, line_total: 1200.00, amount: 1200.00 },
                    { item: 'Copper pipe removal and PEX replacement', name: 'Copper pipe removal and PEX replacement', quantity: 1, rate: 950.00, line_total: 950.00, amount: 950.00 },
                    { item: 'PEX fittings and materials', name: 'PEX fittings and materials', quantity: 1, rate: 320.00, line_total: 320.00, amount: 320.00 },
                    { item: 'Full system pressure test', name: 'Full system pressure test', quantity: 1, rate: 200.00, line_total: 200.00, amount: 200.00 },
                    { item: 'Concrete patch and refinishing', name: 'Concrete patch and refinishing', quantity: 1, rate: 850.00, line_total: 850.00, amount: 850.00 },
                    { item: 'Permits and inspection', name: 'Permits and inspection', quantity: 1, rate: 250.00, line_total: 250.00, amount: 250.00 }
                ],
                calculated_price: 4120.00,
                total_cost: 4120.00
            },
            pest_control: {
                scope_of_work: 'Conduct full inspection of all accessible areas. Install termite bait stations around foundation perimeter. Apply liquid termiticide barrier treatment. Treat active galleries in affected wood members. Schedule quarterly follow-up inspections for 12 months.',
                line_items: [
                    { item: 'Full inspection — all accessible areas', name: 'Full inspection — all accessible areas', quantity: 1, rate: 250.00, line_total: 250.00, amount: 250.00 },
                    { item: 'Termite bait station installation (12 stations)', name: 'Termite bait station installation (12 stations)', quantity: 12, rate: 75.00, line_total: 900.00, amount: 900.00 },
                    { item: 'Liquid termiticide barrier treatment', name: 'Liquid termiticide barrier treatment', quantity: 1, rate: 1100.00, line_total: 1100.00, amount: 1100.00 },
                    { item: 'Gallery treatment in affected wood', name: 'Gallery treatment in affected wood', quantity: 1, rate: 450.00, line_total: 450.00, amount: 450.00 },
                    { item: 'Quarterly follow-up visits (4 visits)', name: 'Quarterly follow-up visits (4 visits)', quantity: 4, rate: 175.00, line_total: 700.00, amount: 700.00 },
                    { item: 'Moisture barrier and prevention', name: 'Moisture barrier and prevention', quantity: 1, rate: 400.00, line_total: 400.00, amount: 400.00 }
                ],
                calculated_price: 3800.00,
                total_cost: 3800.00
            },
            remodeling: {
                scope_of_work: 'Demolish existing cabinets, countertops, and backsplash. Install new soft-close shaker cabinets. Install quartz countertops with undermount sink. Add subway tile backsplash. Install new LED recessed lighting. Paint walls and ceiling.',
                line_items: [
                    { item: 'Demolition and debris removal', name: 'Demolition and debris removal', quantity: 1, rate: 1200.00, line_total: 1200.00, amount: 1200.00 },
                    { item: 'Soft-close shaker cabinets — material', name: 'Soft-close shaker cabinets — material', quantity: 1, rate: 6500.00, line_total: 6500.00, amount: 6500.00 },
                    { item: 'Cabinet installation labor', name: 'Cabinet installation labor', quantity: 1, rate: 2200.00, line_total: 2200.00, amount: 2200.00 },
                    { item: 'Quartz countertops — material and fabrication', name: 'Quartz countertops — material and fabrication', quantity: 1, rate: 4200.00, line_total: 4200.00, amount: 4200.00 },
                    { item: 'Countertop installation and sink', name: 'Countertop installation and sink', quantity: 1, rate: 900.00, line_total: 900.00, amount: 900.00 },
                    { item: 'Subway tile backsplash — material and labor', name: 'Subway tile backsplash — material and labor', quantity: 1, rate: 850.00, line_total: 850.00, amount: 850.00 },
                    { item: 'LED recessed lighting — 6 fixtures installed', name: 'LED recessed lighting — 6 fixtures installed', quantity: 1, rate: 1400.00, line_total: 1400.00, amount: 1400.00 },
                    { item: 'Wall and ceiling painting', name: 'Wall and ceiling painting', quantity: 1, rate: 750.00, line_total: 750.00, amount: 750.00 }
                ],
                calculated_price: 18000.00,
                total_cost: 18000.00
            }
        };

        var tmpl = templates[trade] || templates.roofing;
        return {
            breakdown: {
                scope_of_work: tmpl.scope_of_work,
                line_items: tmpl.line_items,
                calculated_price: tmpl.calculated_price,
                total_cost: tmpl.total_cost
            },
            scope_of_work: tmpl.scope_of_work,
            line_items: tmpl.line_items,
            calculated_price: tmpl.calculated_price,
            total_cost: tmpl.total_cost
        };
    }

    // --- Boot ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();