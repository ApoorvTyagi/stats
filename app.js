/**
 * GitHub Stats Dashboard - Frontend Application
 * Aggregate view across all contributed repositories
 */

// Configuration - Update this URL after deploying backend to Vercel
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api';
const DEFAULT_USERNAME = 'tyagiapoorv';


function getUsernameFromPath() {
  const pathname = window.location.pathname;
  
  // Extract username from path: /stats/{username}/ or /stats/{username}/index.html
  // Match pattern: /stats/{username} where username is not index.html or empty
  const match = pathname.match(/\/stats\/([^\/]+?)(?:\/(?:index\.html)?)?$/i);
  if (match && match[1] && match[1].toLowerCase() !== 'index.html') {
    return match[1];
  }
  
  // Fallback: Remove /stats/ prefix, index.html, and slashes
  const pathAfterStats = pathname
    .replace(/^\/stats\/?/, '')
    .replace(/\/?index\.html$/i, '')
    .replace(/^\/+|\/+$/g, '');
  
  // If result is empty or is just 'index.html', return default
  if (!pathAfterStats || pathAfterStats.toLowerCase() === 'index.html') {
    return DEFAULT_USERNAME;
  }
  
  return pathAfterStats;
}

const GITHUB_USERNAME = getUsernameFromPath();

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),

  totalPRs: document.getElementById('totalPRs'),
  openPRs: document.getElementById('openPRs'),
  openPRsCard: document.getElementById('openPRsCard'),
  mergedPRs: document.getElementById('mergedPRs'),
  closedPRs: document.getElementById('closedPRs'),
  avgTime: document.getElementById('avgTime'),
  p50Time: document.getElementById('p50Time'),
  p95Time: document.getElementById('p95Time'),
  p99Time: document.getElementById('p99Time'),
  chart: document.getElementById('chart'),
  chartLegend: document.getElementById('chartLegend'),
  reposGrid: document.getElementById('reposGrid'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage')
};

/**
 * Initialize the dashboard
 */
async function init() {
  showLoading(true);

  try {
    // Set user info
    elements.userAvatar.src = `https://github.com/${GITHUB_USERNAME}.png`;
    elements.username.textContent = GITHUB_USERNAME;

    // Update favicon dynamically
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = `https://github.com/${GITHUB_USERNAME}.png`;
    }

    // Setup click handler for Open PRs card
    setupOpenPRsCardClick();

    // Load aggregate stats
    await loadAggregateStats();
  } catch (error) {
    showError('Failed to initialize dashboard: ' + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Setup click handler for Open PRs card to navigate to open PRs page
 */
function setupOpenPRsCardClick() {
  if (elements.openPRsCard) {
    elements.openPRsCard.addEventListener('click', () => {
      // Navigate to open PRs page with username preserved
      const basePath = '/stats/';
      if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
        window.location.href = `${basePath}${GITHUB_USERNAME}/open-prs.html`;
      } else {
        window.location.href = `${basePath}open-prs.html`;
      }
    });

    // Add keyboard accessibility
    elements.openPRsCard.setAttribute('tabindex', '0');
    elements.openPRsCard.setAttribute('role', 'link');
    elements.openPRsCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const basePath = '/stats/';
        if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
          window.location.href = `${basePath}${GITHUB_USERNAME}/open-prs.html`;
        } else {
          window.location.href = `${basePath}open-prs.html`;
        }
      }
    });
  }
}

/**
 * Load aggregate stats across all repositories
 */
async function loadAggregateStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/aggregate?username=${encodeURIComponent(GITHUB_USERNAME)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch aggregate stats');
    }

    const data = await response.json();



    // Update PR stats
    updatePRStats(data.prStats);

    // Update merge time metrics
    updateMergeMetrics(data.mergeMetrics);

    // Update chart
    updateChart(data.mergeMetrics);

    // Update top repos
    updateTopRepos(data.contributedRepos);

  } catch (error) {
    showError('Could not load stats: ' + error.message);
    resetStats();
  }
}

/**
 * Update PR statistics display
 */
/**
 * Safely set text content for an element
 */
function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

/**
 * Update PR statistics display
 */
function updatePRStats(stats) {
  animateValue(elements.totalPRs, stats.total);
  animateValue(elements.openPRs, stats.open);
  animateValue(elements.mergedPRs, stats.merged);
  animateValue(elements.closedPRs, stats.closed);
}

/**
 * Update merge time metrics display
 */
function updateMergeMetrics(metrics) {
  const formatTime = (hours) => {
    if (hours === null || hours === undefined) return '-';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  setText(elements.avgTime, formatTime(metrics.average));
  setText(elements.p50Time, formatTime(metrics.p50));
  setText(elements.p95Time, formatTime(metrics.p95));
  setText(elements.p99Time, formatTime(metrics.p99));
}

/**
 * Update the chart visualization
 */
function updateChart(metrics) {
  if (!elements.chart) return;

  if (!metrics.count || metrics.count === 0) {
    elements.chart.innerHTML = `
      <div class="chart-placeholder">
        <span>No merged PRs to display</span>
      </div>
    `;
    if (elements.chartLegend) elements.chartLegend.innerHTML = '';
    return;
  }

  // ... rest of chart logic
  const values = [
    { label: 'AVG', value: metrics.average, color: 'linear-gradient(180deg, #a78bfa, #667eea)' },
    { label: 'P50', value: metrics.p50, color: 'linear-gradient(180deg, #4facfe, #00f2fe)' },
    { label: 'P95', value: metrics.p95, color: 'linear-gradient(180deg, #ffc107, #d29922)' },
    { label: 'P99', value: metrics.p99, color: 'linear-gradient(180deg, #f85149, #ff6b6b)' }
  ];

  const maxValue = Math.max(...values.map(v => v.value));
  const chartHeight = 160;

  elements.chart.innerHTML = values.map(item => {
    const height = (item.value / maxValue) * chartHeight;
    const formattedValue = formatTimeShort(item.value);

    return `
      <div class="chart-bar">
        <div class="bar" style="height: ${height}px; background: ${item.color};">
          <span class="bar-value">${formattedValue}</span>
        </div>
        <span class="bar-label">${item.label}</span>
      </div>
    `;
  }).join('');

  if (elements.chartLegend) {
    elements.chartLegend.innerHTML = `
      <div class="legend-item">
        <span class="legend-color" style="background: #a78bfa;"></span>
        <span>Average</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #4facfe;"></span>
        <span>Median (P50)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #ffc107;"></span>
        <span>95th Percentile</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #f85149;"></span>
        <span>99th Percentile</span>
      </div>
    `;
  }
}

/**
 * Update top contributed repositories
 */
function updateTopRepos(repos) {
  if (!elements.reposGrid) return;

  if (!repos || repos.length === 0) {
    elements.reposGrid.innerHTML = `
      <div class="repo-placeholder">No contributed repositories found</div>
    `;
    return;
  }

  // Sort by total PRs (descending), then by merged PRs (descending)
  const sortedRepos = [...repos].sort((a, b) => {
    if (b.prCount !== a.prCount) {
      return b.prCount - a.prCount;
    }
    return b.mergedCount - a.mergedCount;
  });

  elements.reposGrid.innerHTML = sortedRepos.map(repo => `
    <div class="repo-card">
      <div class="repo-name">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 9H2V7h2v2zm0 4H2v-2h2v2zm0 4H2v-2h2v2zm16-8V7H6v2h14zm0 4v-2H6v2h14zm0 4v-2H6v2h14z"/>
        </svg>
        <span>${repo.fullName.split('/')[1]}</span>
      </div>
      <div class="repo-stats">
        <span class="repo-stat">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
          </svg>
          ${repo.prCount} PRs
        </span>
        <span class="repo-stat merged">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          ${repo.mergedCount} Merged
        </span>
      </div>
    </div>
  `).join('');
}

/**
 * Format time value for display
 */
function formatTimeShort(hours) {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/**
 * Animate a numeric value change
 */
function animateValue(element, newValue) {
  if (!element) return;

  const currentValue = parseInt(element.textContent) || 0;
  const duration = 500;
  const steps = 20;
  const increment = (newValue - currentValue) / steps;
  let current = currentValue;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current += increment;
    element.textContent = Math.round(current);

    if (step >= steps) {
      element.textContent = newValue;
      clearInterval(timer);
    }
  }, duration / steps);
}

/**
 * Reset stats to default state
 */
function resetStats() {

  elements.totalPRs.textContent = '-';
  elements.openPRs.textContent = '-';
  elements.mergedPRs.textContent = '-';
  elements.closedPRs.textContent = '-';
  elements.avgTime.textContent = '-';
  elements.p50Time.textContent = '-';
  elements.p95Time.textContent = '-';
  elements.p99Time.textContent = '-';
  elements.chart.innerHTML = `
    <div class="chart-placeholder">
      <span>Unable to load chart</span>
    </div>
  `;
  elements.chartLegend.innerHTML = '';
  elements.reposGrid.innerHTML = `
    <div class="repo-placeholder">Unable to load repositories</div>
  `;
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  elements.loadingOverlay.classList.toggle('active', show);
}

/**
 * Show error toast
 */
function showError(message) {
  elements.toastMessage.textContent = message;
  elements.errorToast.classList.add('active');

  // Auto-hide after 5 seconds
  setTimeout(hideToast, 5000);
}

/**
 * Hide error toast
 */
function hideToast() {
  elements.errorToast.classList.remove('active');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
