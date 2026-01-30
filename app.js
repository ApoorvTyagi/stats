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
  reposBarChart: document.getElementById('reposBarChart'),
  toggleRepoDetails: document.getElementById('toggleRepoDetails'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage'),
  
  // Activity Timeline elements
  activityChart: document.getElementById('activityChart'),
  activityPeriod: document.getElementById('activityPeriod'),
  totalCreated: document.getElementById('totalCreated'),
  totalMerged: document.getElementById('totalMerged'),
  totalReviewed: document.getElementById('totalReviewed'),
  trendCreated: document.getElementById('trendCreated'),
  trendMerged: document.getElementById('trendMerged'),
  trendReviewed: document.getElementById('trendReviewed'),
  
  // Day of Week elements
  dayOfWeekChart: document.getElementById('dayOfWeekChart'),
  dayOfWeekPlaceholder: document.getElementById('dayOfWeekPlaceholder'),
  
  // Reviews elements
  reviewsContainer: document.getElementById('reviewsContainer'),
  reviewsPlaceholder: document.getElementById('reviewsPlaceholder'),
  totalReviews: document.getElementById('totalReviews'),
  approvedReviews: document.getElementById('approvedReviews'),
  changesReviews: document.getElementById('changesReviews'),
  commentedReviews: document.getElementById('commentedReviews'),
  donutApproved: document.getElementById('donutApproved'),
  donutChanges: document.getElementById('donutChanges'),
  donutCommented: document.getElementById('donutCommented'),
  donutTotal: document.getElementById('donutTotal')
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
    
    // Setup toggle for repo details
    setupRepoDetailsToggle();

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
 * Setup toggle for repository details view
 */
function setupRepoDetailsToggle() {
  if (elements.toggleRepoDetails && elements.reposGrid) {
    elements.toggleRepoDetails.addEventListener('click', () => {
      const isExpanded = elements.reposGrid.classList.contains('expanded');
      
      if (isExpanded) {
        elements.reposGrid.classList.remove('expanded');
        elements.reposGrid.classList.add('collapsed');
        elements.toggleRepoDetails.classList.remove('expanded');
        elements.toggleRepoDetails.querySelector('span').textContent = 'Show detailed view';
      } else {
        elements.reposGrid.classList.remove('collapsed');
        elements.reposGrid.classList.add('expanded');
        elements.toggleRepoDetails.classList.add('expanded');
        elements.toggleRepoDetails.querySelector('span').textContent = 'Hide detailed view';
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

    // Update top repos (both bar chart and grid)
    updateTopRepos(data.contributedRepos);
    updateReposBarChart(data.contributedRepos);
    
    // Update day of week chart from aggregate data
    updateDayOfWeekChart(data.activityByDay);
    
    // Fetch reviews data from new endpoint
    loadReviewsData();
    
    // Fetch activity timeline from new endpoint
    loadActivityData();

  } catch (error) {
    showError('Could not load stats: ' + error.message);
    resetStats();
  }
}

/**
 * Load reviews data from /api/reviews endpoint
 */
async function loadReviewsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews?username=${encodeURIComponent(GITHUB_USERNAME)}`);
    
    if (response.ok) {
      const reviewsData = await response.json();
      updateReviewsSection(reviewsData);
    } else {
      console.warn('Reviews API returned status:', response.status);
      updateReviewsSection(null);
    }
  } catch (error) {
    console.warn('Failed to load reviews:', error.message);
    updateReviewsSection(null);
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
  
  // Update period text
  if (elements.activityPeriod) {
    const periodMap = {
      '3months': '3 months',
      '6months': '6 months',
      '1year': '1 year'
    };
    elements.activityPeriod.textContent = periodMap[activityData.period] || activityData.period;
  }
  
  // Update totals
  if (activityData.totals) {
    if (elements.totalCreated) animateValue(elements.totalCreated, activityData.totals.created || 0);
    if (elements.totalMerged) animateValue(elements.totalMerged, activityData.totals.merged || 0);
    if (elements.totalReviewed) animateValue(elements.totalReviewed, activityData.totals.reviewed || 0);
  }
  
  // Update trends
  if (activityData.trend) {
    updateTrendIndicator(elements.trendCreated, activityData.trend.created);
    updateTrendIndicator(elements.trendMerged, activityData.trend.merged);
    updateTrendIndicator(elements.trendReviewed, activityData.trend.reviewed);
  }
  
  // Render chart
  renderActivityChart(activityData.timeline);
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
 * Render activity timeline chart
 */
function renderActivityChart(timeline) {
  if (!elements.activityChart || !timeline || timeline.length === 0) return;
  
  // Find max value for scaling
  const maxValue = Math.max(
    ...timeline.map(w => Math.max(w.created || 0, w.merged || 0, w.reviewed || 0)),
    1
  );
  
  const chartHeight = 160; // pixels for bar area
  
  // Generate bar groups
  const barsHtml = timeline.map((week, index) => {
    const createdHeight = ((week.created || 0) / maxValue) * chartHeight;
    const mergedHeight = ((week.merged || 0) / maxValue) * chartHeight;
    const reviewedHeight = ((week.reviewed || 0) / maxValue) * chartHeight;
    
    // Format date for label (show month for first week of each month)
    const date = new Date(week.date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const showLabel = index === 0 || date.getDate() <= 7;
    const label = showLabel ? monthNames[date.getMonth()] : '';
    
    // Format tooltip date
    const tooltipDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `
      <div class="activity-bar-group">
        <div class="activity-bar-tooltip">
          <div class="tooltip-date">Week of ${tooltipDate}</div>
          <div class="tooltip-row created">Created: ${week.created || 0}</div>
          <div class="tooltip-row merged">Merged: ${week.merged || 0}</div>
          <div class="tooltip-row reviewed">Reviewed: ${week.reviewed || 0}</div>
        </div>
        <div class="activity-bars">
          <div class="activity-bar created" style="height: ${Math.max(createdHeight, 2)}px"></div>
          <div class="activity-bar merged" style="height: ${Math.max(mergedHeight, 2)}px"></div>
          <div class="activity-bar reviewed" style="height: ${Math.max(reviewedHeight, 2)}px"></div>
        </div>
        ${label ? `<span class="activity-bar-label">${label}</span>` : ''}
      </div>
    `;
  }).join('');
  
  // Generate Y-axis labels
  const yAxisHtml = `
    <div class="activity-chart-yaxis">
      <span class="yaxis-label">${maxValue}</span>
      <span class="yaxis-label">${Math.round(maxValue / 2)}</span>
      <span class="yaxis-label">0</span>
    </div>
  `;
  
  elements.activityChart.innerHTML = `
    ${yAxisHtml}
    <div class="activity-chart-inner" style="margin-left: 35px;">
      ${barsHtml}
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
 * Update horizontal bar chart for repositories
 */
function updateReposBarChart(repos) {
  if (!elements.reposBarChart) return;
  
  if (!repos || repos.length === 0) {
    elements.reposBarChart.innerHTML = `
      <div class="chart-placeholder">
        <span>No contributed repositories found</span>
      </div>
    `;
    return;
  }
  
  // Sort by merged count (descending)
  const sortedRepos = [...repos].sort((a, b) => b.mergedCount - a.mergedCount);
  
  // Take top 10
  const topRepos = sortedRepos.slice(0, 10);
  
  // Find max for scaling
  const maxMerged = Math.max(...topRepos.map(r => r.mergedCount));
  
  elements.reposBarChart.innerHTML = topRepos.map(repo => {
    const percentage = maxMerged > 0 ? (repo.mergedCount / maxMerged) * 100 : 0;
    const repoName = repo.fullName.split('/')[1] || repo.fullName;
    
    return `
      <div class="repo-bar-item">
        <span class="repo-bar-name" title="${repo.fullName}">${repoName}</span>
        <div class="repo-bar-track">
          <div class="repo-bar-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="repo-bar-count">${repo.mergedCount}</span>
      </div>
    `;
  }).join('');
}

/**
 * Update day of week activity chart
 */
function updateDayOfWeekChart(activityData) {
  if (!elements.dayOfWeekChart) return;
  
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
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const values = dayKeys.map(key => activityData[key] || 0);
  const maxValue = Math.max(...values, 1);
  
  const dayBars = elements.dayOfWeekChart.querySelectorAll('.day-bar');
  
  dayBars.forEach((bar, index) => {
    const value = values[index];
    const percentage = (value / maxValue) * 80; // Max 80% height
    
    const fill = bar.querySelector('.day-bar-fill');
    const valueEl = bar.querySelector('.day-value');
    
    if (fill) {
      fill.style.setProperty('--fill-height', `${percentage}%`);
    }
    if (valueEl) {
      valueEl.textContent = value;
    }
  });
}

/**
 * Update code reviews section
 */
function updateReviewsSection(reviewsData) {
  if (!elements.reviewsContainer) return;
  
  // If no data from backend, show placeholder
  if (!reviewsData) {
    // Keep the placeholder visible
    if (elements.reviewsPlaceholder) {
      elements.reviewsPlaceholder.style.display = 'flex';
    }
    return;
  }
  
  // Hide placeholder when we have data
  if (elements.reviewsPlaceholder) {
    elements.reviewsPlaceholder.style.display = 'none';
  }
  
  const { totalReviews = 0, approvals = 0, changesRequested = 0, comments = 0 } = reviewsData;
  
  // Update stat values
  if (elements.totalReviews) animateValue(elements.totalReviews, totalReviews);
  if (elements.approvedReviews) animateValue(elements.approvedReviews, approvals);
  if (elements.changesReviews) animateValue(elements.changesReviews, changesRequested);
  if (elements.commentedReviews) animateValue(elements.commentedReviews, comments);
  
  // Update donut chart
  if (elements.donutTotal) elements.donutTotal.textContent = totalReviews;
  
  // Calculate percentages for donut segments
  const total = approvals + changesRequested + comments;
  if (total > 0) {
    const circumference = 314.159; // 2 * PI * 50
    
    const approvalPercent = approvals / total;
    const changesPercent = changesRequested / total;
    const commentPercent = comments / total;
    
    // Approved segment
    if (elements.donutApproved) {
      const approvalDash = approvalPercent * circumference;
      elements.donutApproved.style.strokeDasharray = `${approvalDash} ${circumference}`;
      elements.donutApproved.style.strokeDashoffset = '0';
    }
    
    // Changes segment (starts after approved)
    if (elements.donutChanges) {
      const changesDash = changesPercent * circumference;
      const changesOffset = -approvalPercent * circumference;
      elements.donutChanges.style.strokeDasharray = `${changesDash} ${circumference}`;
      elements.donutChanges.style.strokeDashoffset = changesOffset;
    }
    
    // Comments segment (starts after approved + changes)
    if (elements.donutCommented) {
      const commentDash = commentPercent * circumference;
      const commentOffset = -(approvalPercent + changesPercent) * circumference;
      elements.donutCommented.style.strokeDasharray = `${commentDash} ${circumference}`;
      elements.donutCommented.style.strokeDashoffset = commentOffset;
    }
  }
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
  if (elements.reposBarChart) {
    elements.reposBarChart.innerHTML = `
      <div class="chart-placeholder">
        <span>Unable to load chart</span>
      </div>
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
  if (elements.totalReviewed) elements.totalReviewed.textContent = '-';
  
  // Reviews
  if (elements.totalReviews) elements.totalReviews.textContent = '-';
  if (elements.approvedReviews) elements.approvedReviews.textContent = '-';
  if (elements.changesReviews) elements.changesReviews.textContent = '-';
  if (elements.commentedReviews) elements.commentedReviews.textContent = '-';
  if (elements.donutTotal) elements.donutTotal.textContent = '-';
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
