/**
 * JIRA Tickets Dashboard - Frontend Application
 * View assigned, reported, and watched JIRA tickets
 */

// Configuration
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api/jira';
const DEFAULT_JIRA_USERNAME = 'apoorv.tyagi@paypay-corp.co.jp';

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
let ticketsData = {
  assigned: { tickets: [], stats: null, loaded: false },
  reported: { tickets: [], stats: null, loaded: false },
  watching: { tickets: [], stats: null, loaded: false }
};

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),
  ticketCount: document.getElementById('ticketCount'),
  ticketsList: document.getElementById('ticketsList'),
  searchInput: document.getElementById('searchInput'),
  priorityFilter: document.getElementById('priorityFilter'),
  typeFilter: document.getElementById('typeFilter'),
  sortSelect: document.getElementById('sortSelect'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage'),
  // Stats
  statOpen: document.getElementById('statOpen'),
  statInProgress: document.getElementById('statInProgress'),
  statBlocked: document.getElementById('statBlocked'),
  statDone: document.getElementById('statDone'),
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

    // Load initial tab data
    await loadTickets('assigned');
    
    // Load other tabs in background
    loadTickets('reported');
    loadTickets('watching');

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
  return match ? match[1] : 'tyagiapoorv';
}

/**
 * Update back link to go to main dashboard
 */
function updateBackLink() {
  const backLink = document.querySelector('.back-link');
  if (backLink) {
    const githubUsername = getGitHubUsername();
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

  // Search and filters
  elements.searchInput.addEventListener('input', filterAndRenderTickets);
  elements.priorityFilter.addEventListener('change', filterAndRenderTickets);
  elements.typeFilter.addEventListener('change', filterAndRenderTickets);
  elements.sortSelect.addEventListener('change', filterAndRenderTickets);
}

/**
 * Switch between tabs
 */
async function switchTab(tab) {
  if (tab === currentTab) return;

  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Load data if not already loaded
  if (!ticketsData[tab].loaded) {
    showLoading(true);
    await loadTickets(tab);
    showLoading(false);
  } else {
    filterAndRenderTickets();
    updateStats(ticketsData[tab].stats);
  }
}

/**
 * Load tickets from API
 */
async function loadTickets(tab) {
  const endpoints = {
    assigned: '/tickets/open',
    reported: '/tickets/reported',
    watching: '/tickets/watching'
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoints[tab]}?username=${encodeURIComponent(JIRA_USERNAME)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    ticketsData[tab] = {
      tickets: data.tickets || [],
      stats: data.stats || null,
      loaded: true
    };

    // Update tab count
    updateTabCount(tab, data.totalCount || 0);

    // If this is the current tab, render
    if (tab === currentTab) {
      filterAndRenderTickets();
      updateStats(data.stats);
    }

  } catch (error) {
    console.error(`Failed to load ${tab} tickets:`, error);
    
    ticketsData[tab] = {
      tickets: [],
      stats: null,
      loaded: true,
      error: error.message
    };

    if (tab === currentTab) {
      renderError(error.message);
    }
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
 * Update stats display
 */
function updateStats(stats) {
  if (!stats) {
    elements.statOpen.textContent = '-';
    elements.statInProgress.textContent = '-';
    elements.statBlocked.textContent = '-';
    elements.statDone.textContent = '-';
    return;
  }

  animateValue(elements.statOpen, stats.open || 0);
  animateValue(elements.statInProgress, stats.inProgress || 0);
  animateValue(elements.statBlocked, stats.blocked || 0);
  animateValue(elements.statDone, stats.done || 0);
}

/**
 * Filter and render tickets based on current filters
 */
function filterAndRenderTickets() {
  const data = ticketsData[currentTab];
  
  if (!data.loaded || data.error) {
    if (data.error) {
      renderError(data.error);
    }
    return;
  }

  let tickets = [...data.tickets];

  // Apply search filter
  const searchTerm = elements.searchInput.value.toLowerCase();
  if (searchTerm) {
    tickets = tickets.filter(ticket => {
      const key = (ticket.key || '').toLowerCase();
      const summary = (ticket.summary || '').toLowerCase();
      const project = (ticket.project || '').toLowerCase();
      const assignee = (ticket.assignee || '').toLowerCase();
      return key.includes(searchTerm) || 
             summary.includes(searchTerm) || 
             project.includes(searchTerm) ||
             assignee.includes(searchTerm);
    });
  }

  // Apply priority filter
  const priorityFilter = elements.priorityFilter.value;
  if (priorityFilter) {
    tickets = tickets.filter(ticket => ticket.priority === priorityFilter);
  }

  // Apply type filter
  const typeFilter = elements.typeFilter.value;
  if (typeFilter) {
    tickets = tickets.filter(ticket => ticket.type === typeFilter);
  }

  // Apply sorting
  tickets = sortTickets(tickets, elements.sortSelect.value);

  // Update count
  elements.ticketCount.textContent = tickets.length;

  // Render
  renderTicketsList(tickets);
}

/**
 * Sort tickets based on selected option
 */
function sortTickets(tickets, sortBy) {
  const sorted = [...tickets];
  const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };

  switch (sortBy) {
    case 'updated':
      sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      break;
    case 'created':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'priority':
      sorted.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
      break;
    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * Render the tickets list
 */
function renderTicketsList(tickets) {
  if (!tickets || tickets.length === 0) {
    elements.ticketsList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.35h1.78v1.7A4.36 4.36 0 0 0 12.47 22v-9.57a.84.84 0 0 0-.84-.84H2z"/>
        </svg>
        <h3>No tickets found</h3>
        <p>There are no tickets matching your current filters.</p>
      </div>
    `;
    return;
  }

  elements.ticketsList.innerHTML = tickets.map(ticket => createTicketCard(ticket)).join('');
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
 * Render error state
 */
function renderError(message) {
  elements.ticketsList.innerHTML = `
    <div class="ticket-placeholder error">
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
