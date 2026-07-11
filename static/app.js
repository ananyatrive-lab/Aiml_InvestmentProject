// Groundwork Dashboard Client Engine

// State variables
let startups = [];
let modelMetrics = null;
let cohortAverages = {};
let activeTab = 'overview';

// User Profile & Activity Tracking State
let practiceTotalGuesses = 0;
let practiceCorrectGuesses = 0;
let userPortfolio = []; 
let userActionHistory = [
    { text: "Initialized Groundwork Client Engine", time: new Date().toLocaleTimeString() }
];

// Pagination state
let currentPage = 1;
let pageSize = 10;
let filteredStartups = [];

// Chart references
let sectorChart = null;
let importanceChart = null;
let modalChart = null;
let benchmarkChart = null;

// Dynamic URL helper: fallback to local server IP if opened as a local file (file://)
const getApiUrl = (path) => {
    const origin = window.location.origin;
    if (!origin || origin.startsWith('file') || origin === 'null') {
        return `http://127.0.0.1:8000${path}`;
    }
    return path;
};

// Tour state
let currentTourStep = 0;
const tourSteps = [
    {
        title: "Welcome to Groundwork!",
        text: "This dashboard uses Random Forest Machine Learning models to analyze startup data. We will guide you through how to vet startups like an expert venture capitalist."
    },
    {
        title: "Overview Analytics",
        text: "Here you can see the high-level screening statistics, sector distributions, and top opportunities identified by our AI models. Check out the line charts below to see typical success vs. failure trajectories."
    },
    {
        title: "Startup Directory & Explorer",
        text: "In the 'Startup Explorer' tab, you can search, filter by sector/stage, and sort the list of startups. Click 'Analyze' to view benchmarking charts comparing startups to averages."
    },
    {
        title: "Vetting & Prediction Engine",
        text: "Use the 'Prediction Engine' to input details for any startup. Hover over info (i) icons to read clear explanations of technical metrics (like LTV/CAC or Churn) before submitting."
    },
    {
        title: "Practice Arena & Glossary",
        text: "Before investing real capital, practice in our 'Practice Arena'! Guess the outcomes of 6 realistic business cases, review correct answers, and study our technical glossary."
    }
];

// Presets data
const presets = {
    genai: {
        sector: 'AI', stage: 'Seed', tam: 35.0, team_size: 15,
        revenue: 15000, burn_rate: 80000, total_raised: 2000000,
        founder_score: 8.5, nps: 60, yoy_growth: 280, mom_growth: 22,
        cac: 250, ltv: 1200, churn: 1.5, traffic_growth: 45, competitors: 15
    },
    saas: {
        sector: 'SaaS', stage: 'Series A', tam: 12.0, team_size: 24,
        revenue: 85000, burn_rate: 60000, total_raised: 4500000,
        founder_score: 7.0, nps: 45, yoy_growth: 85, mom_growth: 6.5,
        cac: 120, ltv: 620, churn: 2.2, traffic_growth: 12, competitors: 5
    },
    ecom: {
        sector: 'E-Commerce', stage: 'Seed', tam: 4.5, team_size: 8,
        revenue: 30000, burn_rate: 45000, total_raised: 600000,
        founder_score: 4.0, nps: 10, yoy_growth: 15, mom_growth: 1.2,
        cac: 45, ltv: 75, churn: 6.5, traffic_growth: 3, competitors: 18
    },
    biotech: {
        sector: 'HealthTech', stage: 'Series A', tam: 45.0, team_size: 18,
        revenue: 5000, burn_rate: 120000, total_raised: 8000000,
        founder_score: 9.0, nps: 50, yoy_growth: 200, mom_growth: 15.0,
        cac: 800, ltv: 4500, churn: 0.8, traffic_growth: 8.0, competitors: 3
    }
};

// Glossary Data
const glossaryData = [
    { term: 'TAM', title: 'Total Addressable Market', jargon: 'Gross addressable demand volume', desc: 'The maximum total annual revenue potential available to a firm if 100% market share is captured in their product area.', analogy: 'The total size of the entire market cake.' },
    { term: 'Burn Rate', title: 'Monthly Burn Rate', jargon: 'Negative cash flow velocity', desc: 'The rate at which a company spends its cash reserves to cover operating expenses before generating positive operational cash flow.', analogy: 'How fast fuel is consumed to keep the ship moving.' },
    { term: 'Runway', title: 'Capital Runway', jargon: 'Solvency horizon in months', desc: 'The number of months a company can operate before running out of money, calculated as current capital reserves divided by monthly burn rate.', analogy: 'The time remaining before the plane runs out of fuel.' },
    { term: 'LTV / CAC', title: 'Lifetime Value to CAC Ratio', jargon: 'Unit economic return coefficient', desc: 'The ratio measuring the lifetime gross margin yield of a single customer relative to the sales and marketing spend required to acquire them. Target ratio is > 3.0x.', analogy: 'The weight of the fish caught divided by the cost of the bait.' },
    { term: 'Churn Rate', title: 'Customer Attrition Rate', jargon: 'Contractual attrition velocity', desc: 'The percentage of customers or subscribers who cancel their contracts or stop buying from the company in a given monthly period.', analogy: 'How fast water is leaking out of the bottom of the bucket.' },
    { term: 'NPS', title: 'Net Promoter Score', jargon: 'Brand advocacy index', desc: 'A customer satisfaction metric ranging from -100 to +100 based on how likely customers are to recommend the product to others. High PMF is indicated by > 40.', analogy: 'The volume of cheers from the audience.' },
    { term: 'YoY Growth', title: 'Year-over-Year Growth', jargon: 'Annual ARR compounding velocity', desc: 'The percentage increase in revenue or active users compared to the exact same period in the previous year.', analogy: 'How fast a tree grows taller each year.' }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// App Initialization
async function initApp() {
    try {
        await Promise.all([
            fetchStartups(),
            fetchModelMetrics()
        ]);
        
        calculateCohortAverages();
        updateOverviewTab();
        updateExplorerTab();
        updateModelDiagnostics();
        buildGlossary();
        
        if (!localStorage.getItem('tourCompleted')) {
            startTour();
        }
        
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
            
            navItems.forEach(nav => nav.classList.remove('active'));
            button.classList.add('active');
        });
    });

    document.getElementById('search-input').addEventListener('input', () => {
        currentPage = 1;
        updateExplorerTab();
    });
    document.getElementById('filter-sector').addEventListener('change', () => {
        currentPage = 1;
        updateExplorerTab();
    });
    document.getElementById('filter-stage').addEventListener('change', () => {
        currentPage = 1;
        updateExplorerTab();
    });
    document.getElementById('sort-by').addEventListener('change', () => {
        currentPage = 1;
        updateExplorerTab();
    });

    setupSliderValueListener('founder_score');
    setupSliderValueListener('nps');

    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.getAttribute('data-preset');
            loadPreset(key);
        });
    });

    const predictorForm = document.getElementById('predictor-form');
    predictorForm.addEventListener('submit', handlePredictSubmit);

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target.id === 'detail-modal') closeModal();
    });

    document.getElementById('open-full-glossary-btn').addEventListener('click', openGlossaryModal);
    document.getElementById('glossary-close-btn').addEventListener('click', closeGlossaryModal);
    document.getElementById('glossary-modal').addEventListener('click', (e) => {
        if (e.target.id === 'glossary-modal') closeGlossaryModal();
    });

    document.getElementById('start-tour-btn').addEventListener('click', startTour);
    document.getElementById('tour-next-btn').addEventListener('click', nextTourStep);
    document.getElementById('tour-skip-btn').addEventListener('click', skipTour);

    // Dynamic Profile Modal bindings
    document.getElementById('profile-trigger').addEventListener('click', openProfileModal);
    document.getElementById('profile-close-btn').addEventListener('click', closeProfileModal);
    document.getElementById('profile-modal').addEventListener('click', (e) => {
        if (e.target.id === 'profile-modal') closeProfileModal();
    });

    // Chatbot Submit bindings
    const chatForm = document.getElementById('chat-input-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
}

async function fetchStartups() {
    const response = await fetch(getApiUrl('/api/startups'));
    if (!response.ok) throw new Error("Failed to fetch startups");
    startups = await response.json();
}

async function fetchModelMetrics() {
    const response = await fetch(getApiUrl('/api/metrics'));
    if (!response.ok) throw new Error("Failed to fetch model metrics");
    modelMetrics = await response.json();
}

function calculateCohortAverages() {
    if (!startups.length) return;
    
    const sum = startups.reduce((acc, curr) => {
        acc.founder_score += curr.founder_score;
        acc.yoy_growth += curr.yoy_growth;
        acc.ltv_cac += curr.ltv_cac;
        acc.tam += curr.tam;
        acc.nps += curr.nps;
        return acc;
    }, { founder_score: 0, yoy_growth: 0, ltv_cac: 0, tam: 0, nps: 0 });

    const count = startups.length;
    cohortAverages = {
        founder_score: sum.founder_score / count,
        yoy_growth: sum.yoy_growth / count,
        ltv_cac: sum.ltv_cac / count,
        tam: sum.tam / count,
        nps: sum.nps / count
    };
}

function switchTab(tabName) {
    activeTab = tabName;
    
    const titles = {
        overview: 'Groundwork Dashboard',
        explorer: 'Startup Explorer Directory',
        predictor: 'Predictive Intelligence Engine',
        practice: 'Investment Practice Arena',
        analytics: 'Machine Learning Diagnostics',
        about: 'About Groundwork',
        chatbot: 'AI Investment Copilot'
    };
    
    const pageTitle = titles[tabName] || 'Groundwork';
    document.getElementById('page-title').innerText = pageTitle;
    logUserAction(`Navigated to ${pageTitle} panel`);
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'overview') {
        renderSectorDistributionChart();
        renderHistoricalBenchmarkChart();
    } else if (tabName === 'analytics') {
        renderFeatureImportanceChart();
    } else if (tabName === 'chatbot') {
        buildQuickTags();
        const chatWindow = document.getElementById('chat-messages-window');
        if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

function updateOverviewTab() {
    if (!startups.length) return;
    
    document.getElementById('stat-total').innerText = startups.length.toLocaleString();
    
    const topStartups = startups.filter(s => s.growth_class === 'High');
    document.getElementById('stat-top-picks').innerText = topStartups.length;
    
    const topPercent = ((topStartups.length / startups.length) * 100).toFixed(1);
    document.getElementById('stat-top-percent').innerText = `${topPercent}% of cohort`;
    
    if (modelMetrics) {
        document.getElementById('stat-accuracy').innerText = `${(modelMetrics.classifier_accuracy * 100).toFixed(1)}%`;
    }
    
    const avgTAM = startups.reduce((sum, curr) => sum + curr.tam, 0) / startups.length;
    document.getElementById('stat-avg-tam').innerText = `$${avgTAM.toFixed(1)}B`;
    
    const topListContainer = document.getElementById('top-startups-list');
    topListContainer.innerHTML = '';
    
    const sortedPicks = [...startups]
        .sort((a, b) => b.growth_score - a.growth_score || b.roi - a.roi)
        .slice(0, 5);
        
    sortedPicks.forEach((startup, index) => {
        const item = document.createElement('div');
        item.className = 'top-startup-item';
        item.onclick = () => openStartupModal(startup.startup_id);
        
        item.innerHTML = `
            <div class="top-startup-meta">
                <div class="top-rank-badge">#${index + 1}</div>
                <div>
                    <h4 class="top-company-id">${startup.startup_id}</h4>
                    <p class="top-company-metrics">${startup.sector} • ${startup.stage} • Raised: $${(startup.total_raised / 1e6).toFixed(2)}M</p>
                </div>
            </div>
            <div class="top-score-sec">
                <div class="top-score-value">
                    <p class="top-score-num">${startup.growth_score}%</p>
                    <p class="top-score-lbl">Growth Pot.</p>
                </div>
                <div class="top-score-value" style="margin-left: 20px;">
                    <p class="top-score-num" style="color: var(--accent);">${startup.roi}x</p>
                    <p class="top-score-lbl">Proj. ROI</p>
                </div>
            </div>
        `;
        topListContainer.appendChild(item);
    });
    
    renderSectorDistributionChart();
    renderHistoricalBenchmarkChart();
}

function updateExplorerTab() {
    const tableBody = document.getElementById('startups-table-body');
    if (!startups.length) return;
    
    const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
    const sectorVal = document.getElementById('filter-sector').value;
    const stageVal = document.getElementById('filter-stage').value;
    const sortVal = document.getElementById('sort-by').value;
    
    filteredStartups = startups.filter(s => {
        const matchesSearch = s.startup_id.toLowerCase().includes(searchVal) || s.stage.toLowerCase().includes(searchVal);
        const matchesSector = sectorVal === 'All' || s.sector === sectorVal;
        const matchesStage = stageVal === 'All' || s.stage === stageVal;
        return matchesSearch && matchesSector && matchesStage;
    });
    
    const [sortField, sortDirection] = sortVal.split('-');
    filteredStartups.sort((a, b) => {
        let fieldA = a[sortField];
        let fieldB = b[sortField];
        
        if (sortDirection === 'asc') {
            return fieldA > fieldB ? 1 : -1;
        } else {
            return fieldA < fieldB ? 1 : -1;
        }
    });
    
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedItems = filteredStartups.slice(startIdx, startIdx + pageSize);
    
    tableBody.innerHTML = '';
    
    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" class="text-center">No startups matching active filter constraints.</td></tr>`;
        updatePagination(0);
        return;
    }
    
    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        const badgeClass = item.growth_class.toLowerCase();
        
        tr.innerHTML = `
            <td><strong>${item.startup_id}</strong></td>
            <td>${item.sector}</td>
            <td>${item.stage}</td>
            <td>$${item.tam.toFixed(1)}B</td>
            <td>${item.founder_score}/10</td>
            <td>${item.yoy_growth.toFixed(1)}%</td>
            <td>${item.ltv_cac.toFixed(1)}x</td>
            <td>${item.runway.toFixed(1)} mos</td>
            <td><strong>${item.roi}x</strong></td>
            <td><span class="badge-tier ${badgeClass}">${item.growth_score}% (${item.growth_class})</span></td>
            <td>
                <button class="action-btn" onclick="openStartupModal('${item.startup_id}')">
                    <i class="fa-solid fa-chart-simple"></i> Analyze
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    updatePagination(filteredStartups.length);
}

function updatePagination(totalItems) {
    const paginationContainer = document.getElementById('table-pagination');
    paginationContainer.innerHTML = '';
    
    if (totalItems === 0) return;
    
    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'pagination-text';
    textSpan.innerText = `Showing ${startItem}-${endItem} of ${totalItems} startups`;
    paginationContainer.appendChild(textSpan);
    
    const btnsDiv = document.createElement('div');
    btnsDiv.className = 'pagination-btns';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
    prevBtn.onclick = () => {
        currentPage--;
        updateExplorerTab();
    };
    btnsDiv.appendChild(prevBtn);
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${currentPage === i ? 'active' : ''}`;
        pageBtn.innerText = i;
        pageBtn.onclick = () => {
            currentPage = i;
            updateExplorerTab();
        };
        btnsDiv.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
    nextBtn.onclick = () => {
        currentPage++;
        updateExplorerTab();
    };
    btnsDiv.appendChild(nextBtn);
    
    paginationContainer.appendChild(btnsDiv);
}

function setupSliderValueListener(id) {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(`${id}_val`);
    slider.addEventListener('input', () => {
        valSpan.innerText = slider.value;
    });
}

function loadPreset(key) {
    const data = presets[key];
    if (!data) return;
    
    Object.keys(data).forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            input.value = data[field];
            const valSpan = document.getElementById(`${field}_val`);
            if (valSpan) valSpan.innerText = data[field];
        }
    });
}

async function handlePredictSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const predictBtn = document.getElementById('predict-btn');
    
    const payload = {
        sector: form.sector.value,
        stage: form.stage.value,
        founder_score: parseFloat(form.founder_score.value),
        team_size: parseInt(form.team_size.value),
        tam: parseFloat(form.tam.value),
        competitors: parseInt(form.competitors.value),
        revenue: parseFloat(form.revenue.value),
        burn_rate: parseFloat(form.burn_rate.value),
        total_raised: parseFloat(form.total_raised.value),
        yoy_growth: parseFloat(form.yoy_growth.value),
        mom_growth: parseFloat(form.mom_growth.value),
        cac: parseFloat(form.cac.value),
        ltv: parseFloat(form.ltv.value),
        nps: parseFloat(form.nps.value),
        churn: parseFloat(form.churn.value),
        traffic_growth: parseFloat(form.traffic_growth.value)
    };
    
    const placeholder = document.getElementById('results-placeholder');
    const output = document.getElementById('results-output');
    
    placeholder.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <h4>Simulating Groundwork Model</h4>
            <p>Evaluating financial indicators and pipeline regressions...</p>
        </div>
    `;
    placeholder.classList.remove('hidden');
    output.classList.add('hidden');
    
    predictBtn.disabled = true;
    predictBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Assessing...`;
    
    try {
        const response = await fetch(getApiUrl('/api/predict'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error("Prediction API request failed.");
        const results = await response.json();
        
        placeholder.classList.add('hidden');
        output.classList.remove('hidden');
        
        document.getElementById('res-score').innerText = `${results.success_score.toFixed(1)}%`;
        document.getElementById('res-growth-class').innerText = `${results.growth_class} Growth Tier`;
        document.getElementById('res-roi').innerText = `${results.predicted_roi.toFixed(1)}x`;
        document.getElementById('res-runway').innerText = results.runway.toFixed(1);
        document.getElementById('res-ltv-cac').innerText = `${results.ltv_cac.toFixed(1)}x`;
        
        const recBadge = document.getElementById('res-recommendation');
        recBadge.innerText = results.recommendation.toUpperCase();
        recBadge.style.backgroundColor = results.rec_color + '1A';
        recBadge.style.color = results.rec_color;
        recBadge.style.border = `1px solid ${results.rec_color}`;
        document.getElementById('res-rec-container').style.borderLeftColor = results.rec_color;
        document.getElementById('res-rec-details').innerText = results.rec_details;
        
        const strengthsList = document.getElementById('res-strengths');
        strengthsList.innerHTML = '';
        results.strengths.forEach(str => {
            const li = document.createElement('li');
            li.innerHTML = str;
            strengthsList.appendChild(li);
        });
        
        const risksList = document.getElementById('res-risks');
        risksList.innerHTML = '';
        results.risks.forEach(risk => {
            const li = document.createElement('li');
            li.innerHTML = risk;
            risksList.appendChild(li);
        });
        
    } catch (err) {
        console.error(err);
        placeholder.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 40px; margin-bottom: 12px;"></i>
            <h4>Prediction Pipeline Error</h4>
            <p>Could not connect to Groundwork inference engine. Ensure model training is completed.</p>
            <div style="margin-top: 10px; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; font-size: 11px; font-family: monospace; color: var(--danger); text-align: left; overflow-x: auto;">
                Error: ${err.message}<br>
                ${err.stack ? err.stack.split('\n')[0] : ''}
            </div>
        `;
    } finally {
        predictBtn.disabled = false;
        predictBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Run AI Assessment`;
    }
}

function updateModelDiagnostics() {
    if (!modelMetrics) return;
    
    document.getElementById('diag-clf-acc').innerText = `${(modelMetrics.classifier_accuracy * 100).toFixed(2)}%`;
    document.getElementById('diag-reg-mae').innerText = `${modelMetrics.regressor_mae.toFixed(3)}x`;
    document.getElementById('diag-reg-r2').innerText = `${(modelMetrics.regressor_r2 * 100).toFixed(1)}%`;
    
    renderFeatureImportanceChart();
}

function openStartupModal(startupId) {
    const startup = startups.find(s => s.startup_id === startupId);
    if (!startup) return;
    
    document.getElementById('modal-company-id').innerText = startup.startup_id;
    document.getElementById('modal-company-sector').innerText = startup.sector;
    document.getElementById('modal-company-stage').innerText = startup.stage;
    document.getElementById('modal-company-location').innerText = startup.location;
    
    document.getElementById('modal-score').innerText = `${startup.growth_score.toFixed(1)}%`;
    document.getElementById('modal-growth-class').innerText = `${startup.growth_class} Potential`;
    document.getElementById('modal-roi').innerText = `${startup.roi.toFixed(1)}x`;
    
    document.getElementById('modal-revenue').innerText = `$${startup.revenue.toLocaleString()}`;
    document.getElementById('modal-burn').innerText = `$${startup.burn_rate.toLocaleString()}`;
    document.getElementById('modal-runway').innerText = `${startup.runway.toFixed(1)} mos`;
    document.getElementById('modal-ltvcac').innerText = `${startup.ltv_cac.toFixed(1)}x`;
    document.getElementById('modal-growth').innerText = `${startup.yoy_growth.toFixed(1)}%`;
    document.getElementById('modal-raised').innerText = `$${startup.total_raised.toLocaleString()}`;
    
    document.getElementById('modal-team').innerText = startup.team_size;
    document.getElementById('modal-tam-val').innerText = `$${startup.tam.toFixed(1)}B`;
    document.getElementById('modal-nps').innerText = startup.nps;
    document.getElementById('modal-churn').innerText = `${startup.churn.toFixed(1)}%`;
    document.getElementById('modal-founder').innerText = `${startup.founder_score}/10`;
    document.getElementById('modal-competitors').innerText = startup.competitors;
    
    let rec = "";
    let color = "";
    let details = "";
    
    if (startup.growth_score >= 75.0 && startup.roi >= 4.0) {
        rec = "Strong Buy";
        color = "#10B981";
        details = "This startup demonstrates elite unit economics, a large addressable market, and strong founder scoring. The risk-adjusted return profile is exceptionally high.";
    } else if (startup.growth_score >= 50.0 && startup.roi >= 1.8) {
        rec = "Buy";
        color = "#3B82F6";
        details = "Solid indicators across core metrics. Moderate runway risk or competition may exist, but the growth vector points to a viable return on capital.";
    } else if (startup.growth_score >= 35.0 || startup.roi >= 1.0) {
        rec = "Hold";
        color = "#F59E0B";
        details = "Promising signs, but unit economics (e.g., LTV/CAC) or founder metrics are average. Wait for further validation or milestones before investing.";
    } else {
        rec = "Pass";
        color = "#EF4444";
        details = "High burn rate, low customer efficiency, or restricted runway. The data suggests a high probability of capital loss; investment is not recommended at this stage.";
    }
    
    const recBadge = document.getElementById('modal-recommendation');
    recBadge.innerText = rec.toUpperCase();
    recBadge.style.backgroundColor = color + '1A';
    recBadge.style.color = color;
    recBadge.style.border = `1px solid ${color}`;
    document.getElementById('modal-rec-details').innerText = details;
    
    renderModalComparisonChart(startup);
    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('detail-modal').classList.add('hidden');
}

function buildGlossary() {
    const list = document.getElementById('glossary-full-list');
    if (!list) return;
    
    list.innerHTML = '';
    glossaryData.forEach(item => {
        const block = document.createElement('div');
        block.className = 'glossary-item-full';
        block.innerHTML = `
            <h4>${item.term} <span>${item.title}</span></h4>
            <p><strong>Jargon:</strong> ${item.jargon}</p>
            <p>${item.desc}</p>
            <em><strong>Analogy:</strong> ${item.analogy}</em>
        `;
        list.appendChild(block);
    });
}

function openGlossaryModal() {
    document.getElementById('glossary-modal').classList.remove('hidden');
}

function closeGlossaryModal() {
    document.getElementById('glossary-modal').classList.add('hidden');
}

// Guided Tour (Tutorial) Functions
function startTour() {
    currentTourStep = 0;
    document.getElementById('tour-overlay').classList.remove('hidden');
    showTourStep();
}

function showTourStep() {
    const step = tourSteps[currentTourStep];
    document.getElementById('tour-step-num').innerText = currentTourStep + 1;
    document.getElementById('tour-title').innerText = step.title;
    document.getElementById('tour-text').innerText = step.text;
    
    if (currentTourStep === 1) switchTab('overview');
    if (currentTourStep === 2) switchTab('explorer');
    if (currentTourStep === 3) switchTab('predictor');
    if (currentTourStep === 4) switchTab('practice');
}

function nextTourStep() {
    currentTourStep++;
    if (currentTourStep < tourSteps.length) {
        showTourStep();
    } else {
        skipTour();
    }
}

function skipTour() {
    document.getElementById('tour-overlay').classList.add('hidden');
    localStorage.setItem('tourCompleted', 'true');
    switchTab('overview');
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-tab') === 'overview') nav.classList.add('active');
    });
}

// Practice Arena Quiz Submissions
function submitPracticeGuess(caseId, guess) {
    const optionsDiv = document.getElementById(`options-c${caseId}`);
    const explainDiv = document.getElementById(`explain-c${caseId}`);
    
    optionsDiv.classList.add('hidden');
    explainDiv.classList.remove('hidden');
    
    let isCorrect = false;
    let title = "";
    let content = "";
    let correctAns = "";
    
    if (caseId === 1) {
        correctAns = "Decline (Pass)";
        if (guess === 'Pass') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "Although 180% YoY Growth is remarkable, a 9.5% Monthly Churn implies losing ~70% of customer accounts every year. The LTV/CAC ratio is 1.2x, meaning marketing expenses are barely recovered. High growth built on high churn represents a 'leaky bucket' business that destroys capital. Correct move is to Decline (Pass).";
    } else if (caseId === 2) {
        correctAns = "Invest (Buy)";
        if (guess === 'Buy') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "DeepTech operations (like fusion energy or quantum devices) have zero revenue in early stages due to heavy engineering R&D. However, a 24-month runway is excellent. With a $85B massive TAM and a 9.5/10 founder index, this represents high conviction. Asymmetric return profiles justify investing. Correct move is to Invest (Buy).";
    } else if (caseId === 3) {
        correctAns = "Invest (Buy)";
        if (guess === 'Buy') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "While 35% YoY growth is moderate, the unit economics are elite. A 4.8x LTV/CAC represents exceptional marketing efficiency. The churn of 0.5% translates to stable customer retention. The company compiles assets capital-efficiently, showing high return probability. Correct move is to Invest (Buy).";
    } else if (caseId === 4) {
        correctAns = "Invest (Buy)";
        if (guess === 'Buy') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "At Series B, a startup must prove it can expand market share efficiently. A 3.5x LTV/CAC is a solid indicator of unit economic stability. Churn is low at 1.2% monthly, and YoY growth is high (75%) for a later stage business. The 15-month runway is healthy for a scaleup targeting cash break-even. Correct move is to Invest (Buy).";
    } else if (caseId === 5) {
        correctAns = "Decline (Pass)";
        if (guess === 'Pass') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "Slow YoY growth (8%) for a seed-stage startup is an extreme warning sign. Added to inefficient unit economics (LTV/CAC = 1.5x, Churn = 5.5%) and dangerously low capital runway (6 months), this company is highly likely to default. Correct move is to Decline (Pass).";
    } else if (caseId === 6) {
        correctAns = "Invest (Buy)";
        if (guess === 'Buy') isCorrect = true;
        title = isCorrect ? "CORRECT DECISION!" : "WRONG DECISION.";
        content = "CleanTech grid infrastructure represents a large TAM sector ($28B). A YoY Growth of 95% is robust for Series A, unit economics are highly profitable (LTV/CAC = 4.2x, Churn = 1.0%), and the cash runway is exceptional (30 months). This company has very low risk of failure. Correct move is to Invest (Buy).";
    }
    
    explainDiv.className = `practice-explanation ${isCorrect ? 'correct' : 'incorrect'}`;
    explainDiv.innerHTML = `
        <h5 style="font-size: 14px; font-weight: 800; text-transform: uppercase;">
            <i class="fa-solid ${isCorrect ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> ${title}
        </h5>
        <div style="margin: 8px 0; padding: 6px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; background: rgba(255,255,255,0.05); display: inline-block;">
            Correct Answer: <span style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">${correctAns}</span>
        </div>
        <p style="margin-top: 6px;">${content}</p>
    `;

    // Dynamic user profile stats tracking
    practiceTotalGuesses++;
    if (isCorrect) {
        practiceCorrectGuesses++;
    }
    
    // Add to user holdings portfolio if they chose to Invest (Buy)
    if (guess === 'Buy') {
        const caseName = document.querySelector(`[data-case-id="${caseId}"] h4`).innerText;
        const exists = userPortfolio.some(p => p.id === `CASE-${caseId}`);
        if (!exists) {
            let roiEst = 1.0;
            if (caseId === 2) roiEst = 8.5;
            if (caseId === 3) roiEst = 4.8;
            if (caseId === 4) roiEst = 3.5;
            if (caseId === 6) roiEst = 4.2;
            
            userPortfolio.push({
                id: `CASE-${caseId}`,
                name: caseName,
                roi: roiEst
            });
            logUserAction(`Added ${caseName} to Portfolio`);
        }
    }
    
    logUserAction(`Guessed ${guess.toUpperCase()} on Case #${caseId} (${isCorrect ? 'Correct' : 'Incorrect'})`);
}

// Chart.js renderers

// Sector Doughnut chart (Overview)
function renderSectorDistributionChart() {
    const canvas = document.getElementById('sectorDistributionChart');
    if (!canvas || !startups.length) return;
    
    const counts = startups.reduce((acc, curr) => {
        acc[curr.sector] = (acc[curr.sector] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    
    if (sectorChart) sectorChart.destroy();
    
    sectorChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#8B5CF6', '#06B6D4', '#6366F1', '#10B981', 
                    '#F59E0B', '#EF4444', '#EC4899'
                ],
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9CA3AF',
                        font: { size: 10, family: 'Plus Jakarta Sans' },
                        boxWidth: 12
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Feature Importance chart (Analytics)
function renderFeatureImportanceChart() {
    const canvas = document.getElementById('importanceChart');
    if (!canvas || !modelMetrics) return;
    
    const imps = modelMetrics.feature_importances;
    
    const labelMapping = {
        'founder_score': 'Founder Experience Score',
        'yoy_growth': 'YoY Revenue Growth',
        'ltv_cac': 'LTV / CAC Ratio',
        'tam': 'Total Addressable Market (TAM)',
        'runway': 'Capital Runway (Months)',
        'nps': 'Net Promoter Score (NPS)',
        'traffic_growth': 'Website Traffic Growth',
        'burn_rate': 'Monthly Burn Rate',
        'revenue': 'Monthly Revenue',
        'total_raised': 'Total Funding Raised',
        'churn': 'Customer Churn Rate',
        'cac': 'Customer Acquisition Cost',
        'team_size': 'Core Team Size',
        'mom_growth': 'MoM Growth Rate',
        'competitors': 'Competitor Density',
        'ltv': 'Customer Lifetime Value',
        'sector': 'Industry Sector',
        'stage': 'Funding Stage'
    };
    
    const sorted = [...imps].slice(0, 8);
    const labels = sorted.map(item => labelMapping[item[0]] || item[0]);
    const values = sorted.map(item => item[1] * 100);
    
    if (importanceChart) importanceChart.destroy();
    
    importanceChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Metric Weight (%)',
                data: values,
                backgroundColor: 'rgba(139, 92, 246, 0.65)',
                borderColor: '#8B5CF6',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#9CA3AF', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Plus Jakarta Sans', size: 11 } }
                }
            }
        }
    });
}

// Modal comparative benchmarks chart
function renderModalComparisonChart(startup) {
    const canvas = document.getElementById('modalComparisonChart');
    if (!canvas || !cohortAverages.founder_score) return;
    
    const metricsKeys = ['founder_score', 'yoy_growth', 'ltv_cac', 'tam', 'nps'];
    const displayLabels = ['Founder Score', 'YoY Growth', 'LTV / CAC', 'TAM Size', 'NPS Index'];
    
    const normalizedValues = metricsKeys.map(key => {
        let val = startup[key];
        let avg = cohortAverages[key];
        
        if (key === 'nps') {
            val += 100;
            avg += 100;
        }
        
        return avg > 0 ? val / avg : 0;
    });
    
    const colors = normalizedValues.map(val => {
        if (val >= 1.2) return 'rgba(16, 185, 129, 0.7)';
        if (val < 0.75) return 'rgba(239, 68, 68, 0.7)';
        return 'rgba(245, 158, 11, 0.7)';
    });
    
    const borders = colors.map(c => c.replace('0.7', '1.0'));
    
    if (modalChart) modalChart.destroy();
    
    modalChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                data: normalizedValues,
                backgroundColor: colors,
                borderColor: borders,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)}x of Cohort Avg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#9CA3AF' },
                    suggestedMax: 2.0
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Plus Jakarta Sans', size: 12 } }
                }
            }
        }
    });
}

// Valuation benchmarks line chart (Overview)
function renderHistoricalBenchmarkChart() {
    const canvas = document.getElementById('historicalBenchmarkChart');
    if (!canvas) return;
    
    const months = Array.from({ length: 13 }, (_, i) => `Month ${i * 3}`);
    
    const unicornData = [100, 150, 220, 350, 500, 800, 1200, 1800, 2600, 3500, 4800, 6500, 9000];
    const linearAliveData = [100, 115, 130, 150, 175, 200, 230, 265, 300, 340, 380, 420, 460];
    const failureData = [100, 120, 140, 150, 130, 95, 60, 30, 10, 0, 0, 0, 0];
    
    if (benchmarkChart) benchmarkChart.destroy();
    
    benchmarkChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Unicorn Path (Hyper-Growth)',
                    data: unicornData,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: false
                },
                {
                    label: 'Default Alive (Sustainable Linear)',
                    data: linearAliveData,
                    borderColor: '#06B6D4',
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    borderWidth: 2.5,
                    tension: 0.2,
                    fill: false
                },
                {
                    label: 'Failure Path (Write-Off / Depleted)',
                    data: failureData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 2,
                    tension: 0.25,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9CA3AF',
                        font: { size: 10, family: 'Plus Jakarta Sans' },
                        boxWidth: 10
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#9CA3AF', font: { size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#9CA3AF', font: { size: 9 } },
                    type: 'logarithmic'
                }
            }
        }
    });
}

// ==========================================
// NEW: USER PROFILE LOGIC
// ==========================================
function logUserAction(actionText) {
    userActionHistory.unshift({ text: actionText, time: new Date().toLocaleTimeString() });
    if (userActionHistory.length > 20) userActionHistory.pop();
    updateProfileModalData();
}

function openProfileModal() {
    updateProfileModalData();
    document.getElementById('profile-modal').classList.remove('hidden');
    logUserAction("Opened User Profile panel");
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
}

function updateProfileModalData() {
    const scoreText = document.getElementById('profile-practice-score');
    const summaryText = document.getElementById('profile-practice-summary');
    if (practiceTotalGuesses === 0) {
        scoreText.innerText = "0%";
        summaryText.innerText = "0 correct out of 0 guessed";
    } else {
        const accuracy = Math.round((practiceCorrectGuesses / practiceTotalGuesses) * 100);
        scoreText.innerText = `${accuracy}%`;
        summaryText.innerText = `${practiceCorrectGuesses} correct out of ${practiceTotalGuesses} guessed`;
    }
    
    document.getElementById('profile-holdings-count').innerText = userPortfolio.length;
    
    const holdingsList = document.getElementById('profile-holdings-list');
    holdingsList.innerHTML = '';
    if (userPortfolio.length === 0) {
        holdingsList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">No active investments yet. Practice investing in the Arena to build your portfolio.</div>`;
    } else {
        userPortfolio.forEach(item => {
            const div = document.createElement('div');
            div.className = 'holding-card';
            div.innerHTML = `
                <div>
                    <strong style="font-size:13px; color: var(--text-main);">${item.name}</strong>
                    <p style="font-size:11px; color: var(--accent); margin-top:2px;">Asset ID: ${item.id}</p>
                </div>
                <span class="badge-tier high" style="font-size: 11px; padding: 2px 6px;">ROI: ${item.roi.toFixed(1)}x</span>
            `;
            holdingsList.appendChild(div);
        });
    }
    
    const historyList = document.getElementById('profile-history-list');
    historyList.innerHTML = '';
    userActionHistory.forEach(act => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span>${act.text}</span>
            <span class="history-time">${act.time}</span>
        `;
        historyList.appendChild(div);
    });
}

// ==========================================
// NEW: AI CHATBOT COPILOT LOGIC
// ==========================================
const quickTagsData = [
    "What is LTV/CAC?",
    "Explain Burn Rate",
    "How does Groundwork work?",
    "Tell me about Churn",
    "What is safe runway?",
    "Explain Funding Stages"
];

function buildQuickTags() {
    const container = document.getElementById('chat-quick-tags');
    if (!container) return;
    container.innerHTML = '';
    quickTagsData.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'action-btn secondary';
        btn.style.fontSize = '11px';
        btn.style.padding = '6px 12px';
        btn.innerText = tag;
        btn.type = 'button';
        btn.onclick = () => sendQuickMessage(tag);
        container.appendChild(btn);
    });
}

function sendQuickMessage(text) {
    const input = document.getElementById('chat-user-input');
    if (input) {
        input.value = text;
        const form = document.getElementById('chat-input-form');
        const event = new Event('submit', { cancelable: true });
        form.dispatchEvent(event);
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-user-input');
    const queryText = input.value.trim();
    if (!queryText) return;
    
    input.value = '';
    appendChatMessage('user', queryText);
    
    const typingIndicator = appendChatTypingIndicator();
    
    try {
        const response = await fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: queryText })
        });
        
        typingIndicator.remove();
        
        if (!response.ok) throw new Error("Failed to communicate with chat backend.");
        const data = await response.json();
        
        appendChatMessage('bot', data.reply);
        
        if (data.suggestions && data.suggestions.length > 0) {
            updateQuickTags(data.suggestions);
        }
        
    } catch (err) {
        typingIndicator.remove();
        console.error(err);
        appendChatMessage('bot', `⚠️ **Error:** Could not connect to the chat assistant. ${err.message}`);
    }
}

function appendChatMessage(sender, text) {
    const chatWindow = document.getElementById('chat-messages-window');
    if (!chatWindow) return;
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '12px';
    wrapper.style.maxWidth = '80%';
    
    if (sender === 'user') {
        wrapper.style.alignSelf = 'flex-end';
        wrapper.style.flexDirection = 'row-reverse';
    } else {
        wrapper.style.alignSelf = 'flex-start';
    }
    
    const avatar = document.createElement('div');
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '16px';
    avatar.style.flexShrink = '0';
    
    if (sender === 'user') {
        avatar.style.background = 'rgba(139, 92, 246, 0.1)';
        avatar.style.border = '1px solid var(--primary)';
        avatar.style.color = 'var(--primary-light)';
        avatar.innerHTML = `<i class="fa-solid fa-user-astronaut"></i>`;
    } else {
        avatar.style.background = 'rgba(6, 182, 212, 0.1)';
        avatar.style.border = '1px solid var(--accent)';
        avatar.style.color = 'var(--accent)';
        avatar.innerHTML = `<i class="fa-solid fa-robot"></i>`;
    }
    
    const bubble = document.createElement('div');
    bubble.className = `chat-message-bubble ${sender}`;
    
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>')
        .replace(/\n/g, '<br>');
    
    bubble.innerHTML = formattedText;
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function appendChatTypingIndicator() {
    const chatWindow = document.getElementById('chat-messages-window');
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '12px';
    wrapper.style.maxWidth = '80%';
    wrapper.style.alignSelf = 'flex-start';
    
    const avatar = document.createElement('div');
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = 'rgba(6, 182, 212, 0.1)';
    avatar.style.border = '1px solid var(--accent)';
    avatar.style.color = 'var(--accent)';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '16px';
    avatar.style.flexShrink = '0';
    avatar.innerHTML = `<i class="fa-solid fa-robot"></i>`;
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-message-bubble bot';
    bubble.innerHTML = `
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    return wrapper;
}

function updateQuickTags(suggestions) {
    const container = document.getElementById('chat-quick-tags');
    if (!container) return;
    container.innerHTML = '';
    suggestions.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'action-btn secondary';
        btn.style.fontSize = '11px';
        btn.style.padding = '6px 12px';
        btn.innerText = tag;
        btn.type = 'button';
        btn.onclick = () => sendQuickMessage(tag);
        container.appendChild(btn);
    });
}

