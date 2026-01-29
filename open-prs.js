/**
 * GitHub Stats Dashboard - Open Pull Requests Page
 */

// Configuration
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api';
const DEFAULT_USERNAME = 'tyagiapoorv';

function getUsernameFromPath() {
  const pathname = window.location.pathname;
  // Remove /stats/ prefix and open-prs.html, and any leading/trailing slashes
  const pathAfterStats = pathname
    .replace(/^\/stats\/?/, '')
    .replace(/open-prs\.html\/?$/, '')
    .replace(/^\/+|\/+$/g, '');
  return pathAfterStats || DEFAULT_USERNAME;
}

const GITHUB_USERNAME = getUsernameFromPath();

// Store all PRs for filtering
let allOpenPRs = [];

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),
  prCount: document.getElementById('prCount'),
  prList: document.getElementById('prList'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage')
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

    // Update back link to include username - go back to /stats/{username}/
    const backLink = document.querySelector('.back-link');
    if (backLink) {
      // Build the correct path back to the user's dashboard
      const basePath = '/stats/';
      if (GITHUB_USERNAME !== DEFAULT_USERNAME) {
        backLink.href = `${basePath}${GITHUB_USERNAME}/`;
      } else {
        backLink.href = basePath;
      }
    }

    // Load open PRs
    await loadOpenPRs();

    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Setup event listeners for search and sort
 */
function setupEventListeners() {
  elements.searchInput.addEventListener('input', filterAndRenderPRs);
  elements.sortSelect.addEventListener('change', filterAndRenderPRs);
}

/**
 * Load open pull requests from API
 */
async function loadOpenPRs() {
  try {
    const response = await fetch(`${API_BASE_URL}/open-prs?username=${encodeURIComponent(GITHUB_USERNAME)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch open pull requests');
    }

    const data = await response.json();
    allOpenPRs = data.pullRequests || [];

    // Update count
    elements.prCount.textContent = allOpenPRs.length;

    // Render the list
    filterAndRenderPRs();

  } catch (error) {
    showError('Could not load open pull requests: ' + error.message);
    elements.prList.innerHTML = `
      <div class="pr-placeholder error">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>Unable to load pull requests</span>
      </div>
    `;
  }
}

/**
 * Filter and render PRs based on search and sort
 */
function filterAndRenderPRs() {
  const searchTerm = elements.searchInput.value.toLowerCase();
  const sortBy = elements.sortSelect.value;

  // Filter PRs
  let filteredPRs = allOpenPRs.filter(pr => {
    const title = (pr.title || '').toLowerCase();
    const repo = (pr.repository || '').toLowerCase();
    const author = (pr.author || '').toLowerCase();
    return title.includes(searchTerm) || repo.includes(searchTerm) || author.includes(searchTerm);
  });

  // Sort PRs
  filteredPRs = sortPRs(filteredPRs, sortBy);

  // Update count
  elements.prCount.textContent = filteredPRs.length;

  // Render
  renderPRList(filteredPRs);
}

/**
 * Sort PRs based on selected option
 */
function sortPRs(prs, sortBy) {
  const sorted = [...prs];

  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'repo':
      sorted.sort((a, b) => (a.repository || '').localeCompare(b.repository || ''));
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * Render the PR list
 */
function renderPRList(prs) {
  if (!prs || prs.length === 0) {
    elements.prList.innerHTML = `
      <div class="pr-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <span>No open pull requests found</span>
      </div>
    `;
    return;
  }

  elements.prList.innerHTML = prs.map(pr => `
    <a href="${pr.url}" target="_blank" rel="noopener noreferrer" class="pr-card">
      <div class="pr-card-header">
        <div class="pr-status">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
          <span>Open</span>
        </div>
        <span class="pr-number">#${pr.number}</span>
      </div>
      <h3 class="pr-title">${escapeHtml(pr.title)}</h3>
      <div class="pr-meta">
        <span class="pr-repo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9H2V7h2v2zm0 4H2v-2h2v2zm0 4H2v-2h2v2zm16-8V7H6v2h14zm0 4v-2H6v2h14zm0 4v-2H6v2h14z"/>
          </svg>
          ${escapeHtml(pr.repository)}
        </span>
        <span class="pr-date">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          ${formatDate(pr.createdAt)}
        </span>
      </div>
      <div class="pr-footer">
        <span class="pr-author">
          <img src="https://github.com/${pr.author}.png" alt="${escapeHtml(pr.author)}" class="author-avatar">
          ${escapeHtml(pr.author)}
        </span>
        <span class="pr-comments" title="Comments">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
          </svg>
          ${pr.comments || 0}
        </span>
      </div>
    </a>
  `).join('');
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
