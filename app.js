/**
 * GitHub Stats Dashboard - Frontend Application
 * Aggregate view across all contributed repositories
 */

// Configuration - Update this URL after deploying backend to Vercel
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api';
const DEFAULT_USERNAME = 'tyagiapoorv';


/**
 * Check if current URL is for open-prs page and redirect properly
 */
function checkAndRedirectOpenPRsRoute() {
  const pathname = window.location.pathname;
  
  // Check if URL contains open-prs (e.g., /stats/username/open-prs.html)
  if (pathname.includes('open-prs')) {
    // Extract username from path like /stats/username/open-prs.html
    const match = pathname.match(/\/stats\/([^\/]+)\/open-prs/i);
    const username = match ? match[1] : null;
    
    // Redirect to the proper open-prs page with query parameter
    if (username && username !== DEFAULT_USERNAME) {
      window.location.replace(`/stats/open-prs.html?user=${encodeURIComponent(username)}`);
    } else {
      window.location.replace('/stats/open-prs.html');
    }
    return true; // Indicate we're redirecting
  }
  return false;
}

function getUsernameFromPath() {
  const pathname = window.location.pathname;
  
  // Remove /stats/ prefix first
  let path = pathname.replace(/^\/stats\/?/, '');
  
  // Remove trailing slash and/or index.html
  path = path.replace(/\/?(?:index\.html)?$/, '');
  
  // Remove any remaining trailing slashes
  path = path.replace(/\/+$/, '');
  
  // If empty or is a known page name, return default
  if (!path || ['index.html', 'open-prs.html', 'open-prs'].includes(path.toLowerCase())) {
    return DEFAULT_USERNAME;
  }
  
  // If path contains a slash, take only the first segment (the username)
  const segments = path.split('/');
  const username = segments[0];
  
  // Final check - if it's a known page, return default
  if (['index.html', 'open-prs.html', 'open-prs'].includes(username.toLowerCase())) {
    return DEFAULT_USERNAME;
  }
  
  return username;
}

// Check if this is an open-prs route - if so, redirect and stop
const isRedirecting = checkAndRedirectOpenPRsRoute();

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
  toastMessage: document.getElementById('toastMessage'),
  
  // Activity Timeline elements
  activityChart: document.getElementById('activityChart'),
  totalCreated: document.getElementById('totalCreated'),
  totalMerged: document.getElementById('totalMerged'),
  trendCreated: document.getElementById('trendCreated'),
  trendMerged: document.getElementById('trendMerged'),
  
  // Day of Week elements
  dayOfWeekChart: document.getElementById('dayOfWeekChart'),
  dayOfWeekPlaceholder: document.getElementById('dayOfWeekPlaceholder')
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
      // Navigate to open PRs page with username as query parameter
      if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
        window.location.href = `/stats/open-prs.html?user=${encodeURIComponent(GITHUB_USERNAME)}`;
      } else {
        window.location.href = '/stats/open-prs.html';
      }
    });

    // Add keyboard accessibility
    elements.openPRsCard.setAttribute('tabindex', '0');
    elements.openPRsCard.setAttribute('role', 'link');
    elements.openPRsCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
          window.location.href = `/stats/open-prs.html?user=${encodeURIComponent(GITHUB_USERNAME)}`;
        } else {
          window.location.href = '/stats/open-prs.html';
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
    // Fetch aggregate stats first (required)
    const aggregateResponse = await fetch(`${API_BASE_URL}/aggregate?username=${encodeURIComponent(GITHUB_USERNAME)}`);

    if (!aggregateResponse.ok) {
      throw new Error('Failed to fetch aggregate stats');
    }

    const data = await aggregateResponse.json();

    // Update PR stats
    updatePRStats(data.prStats);

    // Update merge time metrics
    updateMergeMetrics(data.mergeMetrics);

    // Update chart
    updateChart(data.mergeMetrics);

    // Update top repos
    updateTopRepos(data.contributedRepos);
    
    // Update day of week chart from aggregate data
    updateDayOfWeekChart(data.activityByDay);
    
    // Fetch activity timeline from new endpoint
    loadActivityData();

  } catch (error) {
    showError('Could not load stats: ' + error.message);
    resetStats();
  }
}

/**
 * Load activity timeline from /api/activity endpoint
 */
async function loadActivityData() {
  try {
    const response = await fetch(`${API_BASE_URL}/activity?username=${encodeURIComponent(GITHUB_USERNAME)}`);
    
    if (response.ok) {
      const activityData = await response.json();
      updateActivityTimeline(activityData);
    } else {
      console.warn('Activity API returned status:', response.status);
    }
  } catch (error) {
    console.warn('Failed to load activity:', error.message);
  }
}

/**
 * Update activity timeline (from /api/activity endpoint)
 */
function updateActivityTimeline(activityData) {
  if (!activityData || !activityData.timeline) {
    if (elements.activityChart) {
      elements.activityChart.innerHTML = `
        <div class="chart-placeholder">
          <span>No activity data available</span>
        </div>
      `;
    }
    return;
  }
  
  // Get only last 4 weeks
  const last4Weeks = activityData.timeline.slice(-4);
  
  // Calculate totals for last 4 weeks only
  const totals = last4Weeks.reduce((acc, week) => {
    acc.created += week.created || 0;
    acc.merged += week.merged || 0;
    return acc;
  }, { created: 0, merged: 0 });
  
  // Update totals
  if (elements.totalCreated) animateValue(elements.totalCreated, totals.created);
  if (elements.totalMerged) animateValue(elements.totalMerged, totals.merged);
  
  // Update trends
  if (activityData.trend) {
    updateTrendIndicator(elements.trendCreated, activityData.trend.created);
    updateTrendIndicator(elements.trendMerged, activityData.trend.merged);
  }
  
  // Render chart with last 4 weeks only
  renderActivityChart(last4Weeks);
}

/**
 * Update trend indicator element
 */
function updateTrendIndicator(element, trendValue) {
  if (!element) return;
  
  const trendEl = element.querySelector('.trend-value');
  if (!trendEl) return;
  
  element.classList.remove('up', 'down', 'neutral');
  
  if (trendValue > 0) {
    element.classList.add('up');
    trendEl.textContent = `↑ ${Math.round(trendValue)}%`;
  } else if (trendValue < 0) {
    element.classList.add('down');
    trendEl.textContent = `↓ ${Math.abs(Math.round(trendValue))}%`;
  } else {
    element.classList.add('neutral');
    trendEl.textContent = '—';
  }
}

/**
 * Render activity timeline chart - horizontal bar layout
 */
function renderActivityChart(timeline) {
  if (!elements.activityChart || !timeline || timeline.length === 0) return;
  
  // Find max value for scaling
  const maxCreated = Math.max(...timeline.map(w => w.created || 0), 1);
  const maxMerged = Math.max(...timeline.map(w => w.merged || 0), 1);
  const maxValue = Math.max(maxCreated, maxMerged);
  
  // Generate rows for each week
  const rowsHtml = timeline.map((week) => {
    const createdPercent = ((week.created || 0) / maxValue) * 100;
    const mergedPercent = ((week.merged || 0) / maxValue) * 100;
    
    // Format date for label
    const date = new Date(week.date);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `
      <div class="activity-row">
        <span class="activity-row-label">${label}</span>
        <div class="activity-row-bars">
          <div class="activity-row-bar-wrapper">
            <div class="activity-row-bar created" style="width: ${Math.max(createdPercent, 2)}%"></div>
            <span class="activity-row-value">${week.created || 0}</span>
          </div>
          <div class="activity-row-bar-wrapper">
            <div class="activity-row-bar merged" style="width: ${Math.max(mergedPercent, 2)}%"></div>
            <span class="activity-row-value">${week.merged || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  elements.activityChart.innerHTML = `
    <div class="activity-chart-horizontal">
      ${rowsHtml}
    </div>
  `;
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
 * Update day of week activity chart - horizontal bars
 */
function updateDayOfWeekChart(activityData) {
  if (!elements.dayOfWeekChart) {
    console.warn('dayOfWeekChart element not found');
    return;
  }
  
  // If no data from backend, show placeholder
  if (!activityData) {
    // Keep the placeholder visible
    if (elements.dayOfWeekPlaceholder) {
      elements.dayOfWeekPlaceholder.style.display = 'flex';
    }
    return;
  }
  
  // Hide placeholder when we have data
  if (elements.dayOfWeekPlaceholder) {
    elements.dayOfWeekPlaceholder.style.display = 'none';
  }
  
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const values = dayKeys.map(key => activityData[key] || 0);
  const maxValue = Math.max(...values, 1);
  
  const dayRows = elements.dayOfWeekChart.querySelectorAll('.day-row');
  
  if (dayRows.length === 0) {
    console.warn('No day-row elements found');
    return;
  }
  
  dayRows.forEach((row, index) => {
    const value = values[index] || 0;
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    
    const fill = row.querySelector('.day-row-fill');
    const valueEl = row.querySelector('.day-row-value');
    
    if (fill) {
      fill.style.width = `${Math.max(percentage, 2)}%`;
    }
    if (valueEl) {
      valueEl.textContent = value;
    }
  });
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
  // PR Stats
  if (elements.totalPRs) elements.totalPRs.textContent = '-';
  if (elements.openPRs) elements.openPRs.textContent = '-';
  if (elements.mergedPRs) elements.mergedPRs.textContent = '-';
  if (elements.closedPRs) elements.closedPRs.textContent = '-';
  
  // Merge Metrics
  if (elements.avgTime) elements.avgTime.textContent = '-';
  if (elements.p50Time) elements.p50Time.textContent = '-';
  if (elements.p95Time) elements.p95Time.textContent = '-';
  if (elements.p99Time) elements.p99Time.textContent = '-';
  
  // Chart
  if (elements.chart) {
    elements.chart.innerHTML = `
      <div class="chart-placeholder">
        <span>Unable to load chart</span>
      </div>
    `;
  }
  if (elements.chartLegend) elements.chartLegend.innerHTML = '';
  
  // Repos
  if (elements.reposGrid) {
    elements.reposGrid.innerHTML = `
      <div class="repo-placeholder">Unable to load repositories</div>
    `;
  }
  
  // Activity Timeline
  if (elements.activityChart) {
    elements.activityChart.innerHTML = `
      <div class="chart-placeholder">
        <span>Unable to load activity</span>
      </div>
    `;
  }
  if (elements.totalCreated) elements.totalCreated.textContent = '-';
  if (elements.totalMerged) elements.totalMerged.textContent = '-';
}

/**
 * Show/hide loading overlay (uses shared LoadingScreen module)
 */
function showLoading(show) {
  if (show) {
    LoadingScreen.show();
  } else {
    LoadingScreen.hide();
  }
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

// Initialize on DOM ready (only if not redirecting)
document.addEventListener('DOMContentLoaded', () => {
  if (!isRedirecting) {
    init();
  }
});
