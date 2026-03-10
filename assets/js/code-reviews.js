/**
 * GitHub Stats Dashboard - Code Review Metrics Page
 */

// Configuration
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api';
const DEFAULT_USERNAME = 'tyagiapoorv';
const MAX_RECENT_REVIEWS = 5;

function getUsernameFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  if (userParam) return userParam;

  const pathname = window.location.pathname;
  const match = pathname.match(/\/stats\/([^\/]+)\/code-reviews/i);
  const reservedPaths = ['pages', 'assets'];

  if (match && match[1] && !reservedPaths.includes(match[1].toLowerCase())) {
    return match[1];
  }

  return DEFAULT_USERNAME;
}

const GITHUB_USERNAME = getUsernameFromURL();

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),
  totalReviewed: document.getElementById('totalReviewed'),
  approved: document.getElementById('approved'),
  changesRequested: document.getElementById('changesRequested'),
  commented: document.getElementById('commented'),
  totalApproved: document.getElementById('totalApproved'),
  outcomesMerged: document.getElementById('outcomesMerged'),
  outcomesClosed: document.getElementById('outcomesClosed'),
  stillOpen: document.getElementById('stillOpen'),
  pendingCountBadge: document.getElementById('pendingCountBadge'),
  pendingList: document.getElementById('pendingList'),
  recentReviewsList: document.getElementById('recentReviewsList'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage'),

  // Date filter elements
  filterFromMonth: document.getElementById('filterFromMonth'),
  filterFromYear: document.getElementById('filterFromYear'),
  filterToMonth: document.getElementById('filterToMonth'),
  filterToYear: document.getElementById('filterToYear'),
  applyDateFilter: document.getElementById('applyDateFilter')
};

/**
 * Initialize the page
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

    // Update back link
    const backLink = document.querySelector('.back-link');
    if (backLink) {
      const basePath = '/stats/';
      if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
        backLink.href = `${basePath}${GITHUB_USERNAME}/`;
      } else {
        backLink.href = basePath;
      }
    }

    // Setup date filter
    setupDateFilter();

    // Load code review metrics
    await loadCodeReviewMetrics();
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Initialize the date filter dropdowns and apply button
 */
function setupDateFilter() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Default: From = November 2025, To = current month/year
  const defaultFromMonth = 10; // November (0-indexed)
  const defaultFromYear = 2025;
  const defaultToMonth = currentMonth;
  const defaultToYear = currentYear;

  // Populate month selects
  [elements.filterFromMonth, elements.filterToMonth].forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    months.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = name;
      select.appendChild(opt);
    });
  });

  // Populate year selects (2022 to 2026)
  const startYear = 2022;
  const endYear = 2026;
  [elements.filterFromYear, elements.filterToYear].forEach(select => {
    if (!select) return;
    select.innerHTML = '';
    for (let y = startYear; y <= endYear; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    }
  });

  // Set defaults
  if (elements.filterFromMonth) elements.filterFromMonth.value = defaultFromMonth;
  if (elements.filterFromYear) elements.filterFromYear.value = defaultFromYear;
  if (elements.filterToMonth) elements.filterToMonth.value = defaultToMonth;
  if (elements.filterToYear) elements.filterToYear.value = defaultToYear;

  // Store the current filter range
  window.dateFilterRange = {
    fromMonth: defaultFromMonth + 1,
    fromYear: defaultFromYear,
    toMonth: defaultToMonth + 1,
    toYear: defaultToYear
  };

  // Apply button handler - re-fetches data with new date range
  if (elements.applyDateFilter) {
    elements.applyDateFilter.addEventListener('click', async () => {
      const fromMonth = parseInt(elements.filterFromMonth.value);
      const fromYear = parseInt(elements.filterFromYear.value);
      const toMonth = parseInt(elements.filterToMonth.value);
      const toYear = parseInt(elements.filterToYear.value);

      if (fromYear > toYear || (fromYear === toYear && fromMonth > toMonth)) {
        showError('"From" date cannot be after "To" date');
        return;
      }

      window.dateFilterRange = {
        fromMonth: fromMonth + 1,
        fromYear: fromYear,
        toMonth: toMonth + 1,
        toYear: toYear
      };

      // Re-fetch all data with new date filter
      showLoading(true);
      try {
        await loadCodeReviewMetrics();
      } finally {
        showLoading(false);
      }
    });
  }
}

/**
 * Build date filter query params string for API calls
 * Returns e.g. "&fromDate=11-2025&toDate=03-2026"
 */
function getDateFilterParams() {
  const range = window.dateFilterRange;
  if (!range) return '';
  const fromMonth = String(range.fromMonth).padStart(2, '0');
  const toMonth = String(range.toMonth).padStart(2, '0');
  return `&fromDate=${fromMonth}-${range.fromYear}&toDate=${toMonth}-${range.toYear}`;
}

/**
 * Load code review metrics from API
 */
async function loadCodeReviewMetrics() {
  try {
    const response = await fetch(`${API_BASE_URL}/code-review-metrics?username=${encodeURIComponent(GITHUB_USERNAME)}${getDateFilterParams()}`);

    if (!response.ok) {
      let errorMessage = 'Failed to fetch code review metrics';
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (parseError) { }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Populate review metrics
    populateReviewMetrics(data.reviewMetrics);

    // Populate approved outcomes
    populateApprovedOutcomes(data.approvedOutcomes);

    // Populate pending reviews
    populatePendingReviews(data.pendingReviewsCount, data.pendingReviews);

    // Populate recent reviews (only first 5)
    populateRecentReviews(data.recentReviews);

  } catch (error) {
    const displayMessage = error.message || 'Unable to load code review metrics';
    showError(displayMessage);
    elements.recentReviewsList.innerHTML = `
      <div class="pr-placeholder error">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>${escapeHtml(displayMessage)}</span>
      </div>
    `;
  }
}

/**
 * Populate review metrics stat cards
 */
function populateReviewMetrics(metrics) {
  if (!metrics) return;
  elements.totalReviewed.textContent = metrics.totalReviewed ?? '-';
  elements.approved.textContent = metrics.approved ?? '-';
  elements.changesRequested.textContent = metrics.changesRequested ?? '-';
  elements.commented.textContent = metrics.commented ?? '-';
}

/**
 * Populate approved outcomes stat cards
 */
function populateApprovedOutcomes(outcomes) {
  if (!outcomes) return;
  elements.totalApproved.textContent = outcomes.totalApproved ?? '-';
  elements.outcomesMerged.textContent = outcomes.merged ?? '-';
  elements.outcomesClosed.textContent = outcomes.closed ?? '-';
  elements.stillOpen.textContent = outcomes.stillOpen ?? '-';
}

/**
 * Populate pending reviews
 */
function populatePendingReviews(count, reviews) {
  const badge = elements.pendingCountBadge;
  badge.textContent = count ?? 0;

  if (!count || count === 0) {
    badge.classList.add('zero');
    elements.pendingList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <span>No pending reviews — you're all caught up! 🎉</span>
      </div>
    `;
    return;
  }

  badge.classList.remove('zero');

  if (!reviews || reviews.length === 0) {
    elements.pendingList.innerHTML = `
      <div class="empty-state">
        <span>${count} pending review${count !== 1 ? 's' : ''} (details not available)</span>
      </div>
    `;
    return;
  }

  elements.pendingList.innerHTML = reviews.map(pr => renderReviewCard(pr, true)).join('');
}

/**
 * Populate recent reviews (limit to MAX_RECENT_REVIEWS)
 */
function populateRecentReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    elements.recentReviewsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <span>No recent reviews found</span>
      </div>
    `;
    return;
  }

  const limited = reviews.slice(0, MAX_RECENT_REVIEWS);
  elements.recentReviewsList.innerHTML = limited.map(pr => renderReviewCard(pr, false)).join('');
}

/**
 * Render a single review card
 */
function renderReviewCard(pr, isPending) {
  const reviewStateBadge = getReviewStateBadge(pr.reviewState);
  const prStateBadge = getPRStateBadge(pr.prState, pr.merged);

  return `
    <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="review-card${isPending ? ' pending' : ''}">
      <div class="review-card-header">
        <div class="review-card-left">
          ${reviewStateBadge}
          <span class="review-number">#${pr.number}</span>
        </div>
        ${prStateBadge}
      </div>
      <h3 class="review-title">${escapeHtml(pr.title)}</h3>
      <div class="review-meta">
        <span class="review-repo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9H2V7h2v2zm0 4H2v-2h2v2zm0 4H2v-2h2v2zm16-8V7H6v2h14zm0 4v-2H6v2h14zm0 4v-2H6v2h14z"/>
          </svg>
          ${escapeHtml(pr.repository)}
        </span>
        <span class="review-date">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          ${formatDate(pr.reviewedAt)}
        </span>
      </div>
      <div class="review-footer">
        <span class="review-author">
          <img src="https://github.com/${pr.author}.png" alt="${escapeHtml(pr.author)}" class="author-avatar">
          ${escapeHtml(pr.author)}
        </span>
      </div>
    </a>
  `;
}

/**
 * Get review state badge HTML
 */
function getReviewStateBadge(state) {
  const states = {
    'APPROVED': {
      cls: 'approved',
      label: 'Approved',
      icon: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
    },
    'CHANGES_REQUESTED': {
      cls: 'changes-requested',
      label: 'Changes Requested',
      icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z"/>'
    },
    'COMMENTED': {
      cls: 'commented',
      label: 'Commented',
      icon: '<path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>'
    }
  };

  const config = states[state] || { cls: 'commented', label: state || 'Unknown', icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>' };

  return `
    <span class="review-state-badge ${config.cls}">
      <svg viewBox="0 0 24 24" fill="currentColor">${config.icon}</svg>
      ${config.label}
    </span>
  `;
}

/**
 * Get PR state badge HTML
 */
function getPRStateBadge(prState, merged) {
  if (merged) {
    return `
      <span class="pr-state-badge merged">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 20.41L18.41 19 15 15.59 13.59 17 17 20.41zM7.5 8H11v5.59L5.59 19 7 20.41l6-6V8h3.5L12 3.5 7.5 8z"/>
        </svg>
        Merged
      </span>
    `;
  }

  if (prState === 'open') {
    return `
      <span class="pr-state-badge pr-open">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        Open
      </span>
    `;
  }

  return `
    <span class="pr-state-badge pr-closed">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
      Closed
    </span>
  `;
}

/**
 * Format date to relative time
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
