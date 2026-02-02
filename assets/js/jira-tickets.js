/**
 * JIRA Tickets Dashboard - Frontend Application
 * View assigned, reported, and watched JIRA tickets
 * Grouped by status with pagination
 */

// Configuration
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api/jira';
const DEFAULT_JIRA_USERNAME = 'apoorv.tyagi@paypay-corp.co.jp';
const TICKETS_PER_PAGE = 10;

// Status categories in display order
const STATUS_CATEGORIES = ['Open', 'In Progress', 'Blocked', 'Done'];
const STATUS_KEY_MAP = {
  'Open': 'open',
  'In Progress': 'inProgress',
  'Blocked': 'blocked',
  'Done': 'done'
};

/**
 * Get JIRA username from URL or use default
 */
function getJiraUsername() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('username') || DEFAULT_JIRA_USERNAME;
}

const JIRA_USERNAME = getJiraUsername();

// State
let currentTab = 'assigned';
let expandedStatus = null; // Currently expanded status section

// Data structure for grouped tickets
let ticketsData = {
  assigned: { 
    summary: { open: 0, inProgress: 0, blocked: 0, done: 0 },
    groups: {
      Open: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      'In Progress': { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Blocked: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Done: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false }
    },
    summaryLoaded: false
  },
  reported: { 
    summary: { open: 0, inProgress: 0, blocked: 0, done: 0 },
    groups: {
      Open: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      'In Progress': { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Blocked: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Done: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false }
    },
    summaryLoaded: false
  },
  watching: { 
    summary: { open: 0, inProgress: 0, blocked: 0, done: 0 },
    groups: {
      Open: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      'In Progress': { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Blocked: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false },
      Done: { tickets: [], page: 1, totalItems: 0, totalPages: 0, hasMore: false, loaded: false }
    },
    summaryLoaded: false
  }
};

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),
  ticketCount: document.getElementById('ticketCount'),
  statusAccordion: document.getElementById('statusAccordion'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage'),
  // Tab counts
  assignedCount: document.getElementById('assignedCount'),
  reportedCount: document.getElementById('reportedCount'),
  watchingCount: document.getElementById('watchingCount')
};

/**
 * Initialize the page
 */
async function init() {
  showLoading(true);

  try {
    // Set user info (using GitHub avatar as fallback)
    const githubUsername = getGitHubUsername();
    elements.userAvatar.src = `https://github.com/${githubUsername}.png`;
    elements.username.textContent = JIRA_USERNAME;

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = `https://github.com/${githubUsername}.png`;
    }

    // Update back link
    updateBackLink();

    // Setup event listeners
    setupEventListeners();

    // Load initial tab summary (counts only)
    await loadSummary('assigned');
    
    // Render the accordion with counts
    renderStatusAccordion();
    
    // Load other tab summaries in background
    loadSummary('reported');
    loadSummary('watching');

  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Get GitHub username for avatar
 */
function getGitHubUsername() {
  // Try to extract from path or use default
  const pathname = window.location.pathname;
  const match = pathname.match(/\/stats\/([^\/]+)\//i);
  
  // Known reserved paths that are NOT usernames
  const reservedPaths = ['pages', 'assets'];
  
  if (match && match[1] && !reservedPaths.includes(match[1].toLowerCase())) {
    return match[1];
  }
  
  return 'tyagiapoorv';
}

/**
 * Update back link to go to main dashboard
 */
function updateBackLink() {
  const backLink = document.querySelector('.back-link');
  if (backLink) {
    const githubUsername = getGitHubUsername();
    // Default username 'tyagiapoorv' should go to /stats/
    if (githubUsername !== 'tyagiapoorv') {
      backLink.href = `/stats/${githubUsername}/`;
    } else {
      backLink.href = '/stats/';
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/**
 * Switch between tabs
 */
async function switchTab(tab) {
  if (tab === currentTab) return;

  currentTab = tab;
  expandedStatus = null; // Collapse any expanded section

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Load summary if not already loaded
  if (!ticketsData[tab].summaryLoaded) {
    showLoading(true);
    await loadSummary(tab);
    showLoading(false);
  }
  
  // Render accordion for the new tab
  renderStatusAccordion();
}

/**
 * Load summary (counts only) from API
 */
async function loadSummary(tab) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/tickets/grouped?username=${encodeURIComponent(JIRA_USERNAME)}&type=${tab}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    ticketsData[tab].summary = data.summary || { open: 0, inProgress: 0, blocked: 0, done: 0 };
    ticketsData[tab].summaryLoaded = true;

    // Update tab count (total of all statuses)
    const total = Object.values(ticketsData[tab].summary).reduce((a, b) => a + b, 0);
    updateTabCount(tab, total);

    // If this is the current tab, re-render accordion
    if (tab === currentTab) {
      renderStatusAccordion();
    }

  } catch (error) {
    console.error(`Failed to load ${tab} summary:`, error);
    ticketsData[tab].summaryLoaded = true;
    ticketsData[tab].error = error.message;
    
    if (tab === currentTab) {
      showError('Failed to load ticket summary: ' + error.message);
    }
  }
}

/**
 * Load tickets for a specific status with pagination
 */
async function loadTicketsByStatus(status, page = 1, append = false) {
  const group = ticketsData[currentTab].groups[status];
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/tickets/grouped?username=${encodeURIComponent(JIRA_USERNAME)}&type=${currentTab}&status=${encodeURIComponent(status)}&page=${page}&limit=${TICKETS_PER_PAGE}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const pagination = data.data?.pagination || {};
    const tickets = data.data?.tickets || [];

    if (append) {
      group.tickets = [...group.tickets, ...tickets];
    } else {
      group.tickets = tickets;
    }
    
    group.page = pagination.page || page;
    group.totalItems = pagination.totalItems || 0;
    group.totalPages = pagination.totalPages || 0;
    group.hasMore = pagination.hasMore || false;
    group.loaded = true;

    // Re-render the expanded section
    renderTicketsForStatus(status);

  } catch (error) {
    console.error(`Failed to load ${status} tickets:`, error);
    group.loaded = true;
    group.error = error.message;
    renderTicketsForStatus(status);
  }
}

/**
 * Update tab count badge
 */
function updateTabCount(tab, count) {
  const countElements = {
    assigned: elements.assignedCount,
    reported: elements.reportedCount,
    watching: elements.watchingCount
  };

  if (countElements[tab]) {
    countElements[tab].textContent = count;
  }
}

/**
 * Render the status accordion
 */
function renderStatusAccordion() {
  const data = ticketsData[currentTab];
  const summary = data.summary;
  
  // Calculate total count
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  elements.ticketCount.textContent = total;

  let html = '';
  
  STATUS_CATEGORIES.forEach(status => {
    const key = STATUS_KEY_MAP[status];
    const count = summary[key] || 0;
    const isExpanded = expandedStatus === status;
    const group = data.groups[status];
    
    html += `
      <div class="status-accordion-item" data-status="${escapeHtml(status)}">
        <button class="status-accordion-header ${isExpanded ? 'expanded' : ''}" 
                data-status="${escapeHtml(status)}"
                onclick="toggleStatusSection('${escapeHtml(status)}')">
          <div class="status-header-left">
            <span class="status-expand-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </span>
            <span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(status)}</span>
          </div>
          <span class="status-count">${count}</span>
        </button>
        <div class="status-accordion-content ${isExpanded ? 'expanded' : ''}" id="content-${key}">
          ${isExpanded ? renderStatusContent(status, group) : ''}
        </div>
      </div>
    `;
  });

  elements.statusAccordion.innerHTML = html;
}

/**
 * Render content for a specific status section
 */
function renderStatusContent(status, group) {
  if (!group.loaded) {
    return `
      <div class="status-loading">
        <div class="spinner"></div>
        <span>Loading tickets...</span>
      </div>
    `;
  }

  if (group.error) {
    return `
      <div class="status-error">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>${escapeHtml(group.error)}</span>
      </div>
    `;
  }

  if (!group.tickets || group.tickets.length === 0) {
    return `
      <div class="status-empty">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.35h1.78v1.7A4.36 4.36 0 0 0 12.47 22v-9.57a.84.84 0 0 0-.84-.84H2z"/>
        </svg>
        <span>No ${status.toLowerCase()} tickets</span>
      </div>
    `;
  }

  let html = `<div class="status-tickets-list">`;
  html += group.tickets.map(ticket => createTicketCard(ticket)).join('');
  html += `</div>`;

  // Pagination info and Load More button
  html += `
    <div class="status-pagination">
      <span class="pagination-info">
        Showing ${group.tickets.length} of ${group.totalItems} tickets
      </span>
      ${group.hasMore ? `
        <button class="load-more-btn" onclick="loadMoreTickets('${escapeHtml(status)}')">
          Load More
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `;

  return html;
}

/**
 * Re-render tickets for a specific status
 */
function renderTicketsForStatus(status) {
  const key = STATUS_KEY_MAP[status];
  const contentEl = document.getElementById(`content-${key}`);
  const group = ticketsData[currentTab].groups[status];
  
  if (contentEl) {
    contentEl.innerHTML = renderStatusContent(status, group);
  }
}

/**
 * Toggle a status section expand/collapse
 */
async function toggleStatusSection(status) {
  const wasExpanded = expandedStatus === status;
  
  // Collapse current section
  if (wasExpanded) {
    expandedStatus = null;
    renderStatusAccordion();
    return;
  }
  
  // Expand new section
  expandedStatus = status;
  
  const group = ticketsData[currentTab].groups[status];
  
  // If not loaded yet, load first page
  if (!group.loaded) {
    renderStatusAccordion(); // Show loading state
    await loadTicketsByStatus(status, 1, false);
  } else {
    renderStatusAccordion();
  }
}

/**
 * Load more tickets for a status section
 */
async function loadMoreTickets(status) {
  const group = ticketsData[currentTab].groups[status];
  const nextPage = group.page + 1;
  
  // Show loading state on button
  const btn = document.querySelector(`.status-accordion-item[data-status="${status}"] .load-more-btn`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner-small"></span>
      Loading...
    `;
  }
  
  await loadTicketsByStatus(status, nextPage, true);
}

/**
 * Create a ticket card HTML
 */
function createTicketCard(ticket) {
  const dueDateInfo = getDueDateInfo(ticket.dueDate);
  
  return `
    <a href="${escapeHtml(ticket.url)}" target="_blank" rel="noopener noreferrer" 
       class="ticket-card" data-priority="${escapeHtml(ticket.priority)}">
      <div class="ticket-card-header">
        <div class="ticket-key-type">
          <span class="ticket-key">${escapeHtml(ticket.key)}</span>
          <span class="ticket-type" data-type="${escapeHtml(ticket.type)}">
            ${getTypeIcon(ticket.type)}
            ${escapeHtml(ticket.type)}
          </span>
        </div>
        <div class="ticket-status-priority">
          <span class="ticket-status" data-status="${escapeHtml(ticket.status)}">
            ${escapeHtml(ticket.status)}
          </span>
          <span class="ticket-priority" data-priority="${escapeHtml(ticket.priority)}">
            ${getPriorityIcon(ticket.priority)}
            ${escapeHtml(ticket.priority)}
          </span>
        </div>
      </div>
      <h3 class="ticket-summary">${escapeHtml(ticket.summary)}</h3>
      <div class="ticket-meta">
        <span class="ticket-project">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          ${escapeHtml(ticket.project)}
        </span>
        <span class="ticket-assignee">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          ${escapeHtml(ticket.assignee)}
        </span>
        <span class="ticket-date">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          Updated ${formatDate(ticket.updatedAt)}
        </span>
        ${ticket.dueDate ? `
          <span class="ticket-due ${dueDateInfo.class}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
            </svg>
            Due ${dueDateInfo.text}
          </span>
        ` : ''}
      </div>
      <div class="ticket-footer">
        <span class="ticket-comments">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
          </svg>
          ${ticket.commentCount || 0} comments
        </span>
        <span class="ticket-link">
          Open in JIRA
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </span>
      </div>
    </a>
  `;
}

/**
 * Get type icon SVG
 */
function getTypeIcon(type) {
  const icons = {
    Bug: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/></svg>',
    Story: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>',
    Task: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    Epic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>'
  };
  return icons[type] || icons.Task;
}

/**
 * Get priority icon SVG
 */
function getPriorityIcon(priority) {
  const icons = {
    Critical: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
    High: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>',
    Medium: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 12h8v2H8z"/></svg>',
    Low: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>'
  };
  return icons[priority] || icons.Medium;
}

/**
 * Get due date info with appropriate class
 */
function getDueDateInfo(dueDate) {
  if (!dueDate) return { text: '', class: '' };

  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, class: 'overdue' };
  } else if (diffDays === 0) {
    return { text: 'today', class: 'soon' };
  } else if (diffDays === 1) {
    return { text: 'tomorrow', class: 'soon' };
  } else if (diffDays <= 3) {
    return { text: `in ${diffDays} days`, class: 'soon' };
  } else {
    return { text: formatDueDate(dueDate), class: '' };
  }
}

/**
 * Format due date for display
 */
function formatDueDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      return `${diffMinutes} min ago`;
    }
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
 * Render error state in accordion
 */
function renderError(message) {
  elements.statusAccordion.innerHTML = `
    <div class="status-error">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

/**
 * Animate a numeric value change
 */
function animateValue(element, newValue) {
  if (!element) return;

  const currentValue = parseInt(element.textContent) || 0;
  const duration = 400;
  const steps = 15;
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
 * Show/hide loading overlay
 */
function showLoading(show) {
  if (typeof LoadingScreen !== 'undefined') {
    if (show) {
      LoadingScreen.show();
    } else {
      LoadingScreen.hide();
    }
  } else {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('active', show);
    }
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
