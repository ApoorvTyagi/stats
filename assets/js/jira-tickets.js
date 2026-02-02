/**
 * JIRA Tickets Dashboard - Frontend Application
 * View assigned JIRA tickets with analytics charts
 */

// Configuration
const API_BASE_URL = 'https://stg.paypay-corp.co.jp/stats1/api/jira';
const DEFAULT_JIRA_USERNAME = 'apoorv.tyagi@paypay-corp.co.jp';
const TICKETS_PER_PAGE = 10;

// Status colors for charts (matching filter categories)
const STATUS_COLORS = {
  'To Do': '#58A6FF',
  'Not Needed': '#6B7280',
  'Reviewing': '#A371F7',
  'In Progress': '#D29922',
  'Done': '#43E97B',
  'Others': '#F85149'
};

// Known statuses from BE for each filter category
const KNOWN_STATUSES = ['To Do', 'Not Needed', 'Reviewing', 'In Progress', 'Done'];

/**
 * Get JIRA username from URL or use default
 */
function getJiraUsername() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('username') || DEFAULT_JIRA_USERNAME;
}

/**
 * Get GitHub username for avatar
 */
function getGitHubUsername() {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/stats\/([^\/]+)\//i);
  const reservedPaths = ['pages', 'assets'];
  
  if (match && match[1] && !reservedPaths.includes(match[1].toLowerCase())) {
    return match[1];
  }
  return 'tyagiapoorv';
}

const JIRA_USERNAME = getJiraUsername();

// State
let allTickets = [];
let filteredTickets = [];
let currentStatusFilter = 'In Progress';
let currentPage = 1;
let statusCounts = {};

// DOM Elements
const elements = {
  userAvatar: document.getElementById('userAvatar'),
  username: document.getElementById('username'),
  ticketCount: document.getElementById('ticketCount'),
  ticketsList: document.getElementById('ticketsList'),
  sortSelect: document.getElementById('sortSelect'),
  statusPieChart: document.getElementById('statusPieChart'),
  statusLegend: document.getElementById('statusLegend'),
  monthlyChart: document.getElementById('monthlyChart'),
  paginationControls: document.getElementById('paginationControls'),
  paginationInfo: document.getElementById('paginationInfo'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorToast: document.getElementById('errorToast'),
  toastMessage: document.getElementById('toastMessage'),
  // Status filter elements
  statusFilters: document.getElementById('statusFilters'),
  countToDo: document.getElementById('countToDo'),
  countNotNeeded: document.getElementById('countNotNeeded'),
  countReviewing: document.getElementById('countReviewing'),
  countInProgress: document.getElementById('countInProgress'),
  countDone: document.getElementById('countDone'),
  countOthers: document.getElementById('countOthers')
};

/**
 * Initialize the page
 */
async function init() {
  showLoading(true);

  try {
    // Set user info
    const githubUsername = getGitHubUsername();
    elements.userAvatar.src = `https://github.com/${githubUsername}.png`;
    elements.username.textContent = githubUsername;

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = `https://github.com/${githubUsername}.png`;
    }

    // Update back link
    updateBackLink();

    // Setup event listeners
    setupEventListeners();

    // Load all tickets
    await loadAllTickets();

  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  } finally {
    showLoading(false);
  }
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
  // Status filter buttons
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => filterByStatus(btn.dataset.status));
  });

  // Sort select
  elements.sortSelect.addEventListener('change', () => {
    currentPage = 1;
    sortAndRenderTickets();
  });

  // Load more button
  elements.loadMoreBtn.addEventListener('click', loadMoreTickets);
}

/**
 * Load all tickets from API
 */
async function loadAllTickets() {
  try {
    // Fetch all assigned tickets (we'll get all pages)
    const response = await fetch(
      `${API_BASE_URL}/tickets/grouped?username=${encodeURIComponent(JIRA_USERNAME)}&type=assigned`
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch tickets';
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Collect all tickets from all status groups
    allTickets = [];
    
    // If the API returns grouped data, flatten it
    if (data.data && data.data.tickets) {
      allTickets = data.data.tickets;
    } else if (data.tickets) {
      allTickets = data.tickets;
    } else {
      // Try to fetch from each status group
      await fetchAllStatusGroups();
    }

    // Calculate status counts
    calculateStatusCounts();
    
    // Update filter counts
    updateStatusFilterCounts();

    // Apply initial filter
    applyFilters();

    // Render charts
    renderStatusPieChart();
    renderMonthlyChart();

  } catch (error) {
    const displayMessage = error.message || 'Failed to load tickets';
    showError(displayMessage);
    elements.ticketsList.innerHTML = `
      <div class="tickets-error">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>${escapeHtml(displayMessage)}</span>
      </div>
    `;
    renderEmptyCharts();
  }
}

/**
 * Fetch tickets from all status groups
 */
async function fetchAllStatusGroups() {
  const statuses = ['Open', 'In Progress', 'Blocked', 'Done'];
  
  for (const status of statuses) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tickets/grouped?username=${encodeURIComponent(JIRA_USERNAME)}&type=assigned&status=${encodeURIComponent(status)}&limit=100`
      );
      
      if (response.ok) {
        const data = await response.json();
        const tickets = data.data?.tickets || [];
        allTickets = [...allTickets, ...tickets];
      }
    } catch (e) {
      console.warn(`Failed to fetch ${status} tickets:`, e);
    }
  }
}

/**
 * Calculate status counts from all tickets
 */
function calculateStatusCounts() {
  statusCounts = {
    'To Do': 0,
    'Not Needed': 0,
    'Reviewing': 0,
    'In Progress': 0,
    'Done': 0,
    'Others': 0
  };

  allTickets.forEach(ticket => {
    const status = ticket.status || '';
    // Map statuses to our filter categories based on BE statuses
    if (status === 'To Do') {
      statusCounts['To Do']++;
    } else if (status === 'Not Needed') {
      statusCounts['Not Needed']++;
    } else if (status === 'Reviewing') {
      statusCounts['Reviewing']++;
    } else if (status === 'In Progress') {
      statusCounts['In Progress']++;
    } else if (status === 'Done') {
      statusCounts['Done']++;
    } else {
      // Any status that doesn't match goes to Others
      statusCounts['Others']++;
    }
  });
}

/**
 * Update status filter count badges
 */
function updateStatusFilterCounts() {
  if (elements.countToDo) elements.countToDo.textContent = statusCounts['To Do'] || 0;
  if (elements.countNotNeeded) elements.countNotNeeded.textContent = statusCounts['Not Needed'] || 0;
  if (elements.countReviewing) elements.countReviewing.textContent = statusCounts['Reviewing'] || 0;
  if (elements.countInProgress) elements.countInProgress.textContent = statusCounts['In Progress'] || 0;
  if (elements.countDone) elements.countDone.textContent = statusCounts['Done'] || 0;
  if (elements.countOthers) elements.countOthers.textContent = statusCounts['Others'] || 0;
}

/**
 * Filter tickets by status
 */
function filterByStatus(status) {
  currentStatusFilter = status;
  currentPage = 1;

  // Update active button
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });

  // Apply combined filters
  applyFilters();
}

/**
 * Apply status filter
 */
function applyFilters() {
  // Start with all tickets and apply status filter
  filteredTickets = allTickets.filter(ticket => {
    const status = ticket.status || '';
    switch (currentStatusFilter) {
      case 'To Do':
        return status === 'To Do';
      case 'Not Needed':
        return status === 'Not Needed';
      case 'Reviewing':
        return status === 'Reviewing';
      case 'In Progress':
        return status === 'In Progress';
      case 'Done':
        return status === 'Done';
      case 'Others':
        // Any status that doesn't match known statuses
        return !KNOWN_STATUSES.includes(status);
      default:
        return true;
    }
  });

  // Update count display
  elements.ticketCount.textContent = filteredTickets.length;

  // Sort and render
  sortAndRenderTickets();
}

/**
 * Sort and render tickets
 */
function sortAndRenderTickets() {
  const sortBy = elements.sortSelect.value;
  
  // Sort tickets
  const sorted = [...filteredTickets].sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'priority':
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      case 'status':
        return getStatusWeight(a.status) - getStatusWeight(b.status);
      default:
        return 0;
    }
  });

  // Paginate
  const displayedTickets = sorted.slice(0, currentPage * TICKETS_PER_PAGE);
  const hasMore = displayedTickets.length < sorted.length;

  // Render
  renderTicketsList(displayedTickets);
  updatePagination(displayedTickets.length, sorted.length, hasMore);
}

/**
 * Get priority weight for sorting
 */
function getPriorityWeight(priority) {
  const weights = {
    'Critical': 1,
    'Highest': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Lowest': 5
  };
  return weights[priority] || 3;
}

/**
 * Get status weight for sorting
 */
function getStatusWeight(status) {
  const weights = {
    'In Progress': 1,
    'Reviewing': 2,
    'To Do': 3,
    'Not Needed': 4,
    'Done': 5,
    // Legacy statuses for backward compatibility
    'Blocked': 1,
    'In Review': 2,
    'Code Review': 2,
    'Open': 3,
    'Resolved': 5,
    'Closed': 6
  };
  return weights[status] || 4;
}

/**
 * Load more tickets
 */
function loadMoreTickets() {
  currentPage++;
  sortAndRenderTickets();
}

/**
 * Update pagination controls
 */
function updatePagination(displayed, total, hasMore) {
  elements.paginationControls.style.display = total > 0 ? 'flex' : 'none';
  elements.paginationInfo.textContent = `Showing ${displayed} of ${total}`;
  elements.loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
}

/**
 * Render tickets list
 */
function renderTicketsList(tickets) {
  if (!tickets || tickets.length === 0) {
    elements.ticketsList.innerHTML = `
      <div class="tickets-empty">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.35h1.78v1.7A4.36 4.36 0 0 0 12.47 22v-9.57a.84.84 0 0 0-.84-.84H2z"/>
        </svg>
        <span>No ${currentTypeFilter === 'all' ? '' : currentTypeFilter + ' '}tickets found</span>
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
 * Render status pie chart
 */
function renderStatusPieChart() {
  const pieStatusCounts = {
    'To Do': 0,
    'Not Needed': 0,
    'Reviewing': 0,
    'In Progress': 0,
    'Done': 0,
    'Others': 0
  };
  
  // Count by the new status categories
  allTickets.forEach(ticket => {
    const status = ticket.status || '';
    if (status === 'To Do') {
      pieStatusCounts['To Do']++;
    } else if (status === 'Not Needed') {
      pieStatusCounts['Not Needed']++;
    } else if (status === 'Reviewing') {
      pieStatusCounts['Reviewing']++;
    } else if (status === 'In Progress') {
      pieStatusCounts['In Progress']++;
    } else if (status === 'Done') {
      pieStatusCounts['Done']++;
    } else {
      pieStatusCounts['Others']++;
    }
  });

  const total = allTickets.length;
  
  if (total === 0) {
    renderEmptyPieChart();
    return;
  }

  // Calculate percentages and angles, filter out zero counts
  const data = Object.entries(pieStatusCounts)
    .filter(([status, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
      color: STATUS_COLORS[status] || '#666'
    }));

  // Create SVG pie chart
  let currentAngle = 0;
  const paths = data.map(item => {
    const angle = (item.percentage / 100) * 360;
    const path = createPieSlice(currentAngle, angle, item.color);
    currentAngle += angle;
    return path;
  }).join('');

  elements.statusPieChart.innerHTML = `
    <div class="pie-chart-wrapper">
      <svg class="pie-chart-svg" viewBox="0 0 100 100">
        ${paths}
      </svg>
      <div class="pie-chart-center">
        <div class="pie-chart-total">${total}</div>
        <div class="pie-chart-label">Total</div>
      </div>
    </div>
  `;

  // Render legend
  elements.statusLegend.innerHTML = data.map(item => `
    <div class="legend-item">
      <span class="legend-color" style="background: ${item.color};"></span>
      <span>${item.status}: ${item.count}</span>
    </div>
  `).join('');
}

/**
 * Create a pie slice path
 */
function createPieSlice(startAngle, angle, color) {
  const cx = 50;
  const cy = 50;
  const r = 40;
  const innerR = 25; // Donut hole

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + angle) * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const x3 = cx + innerR * Math.cos(endRad);
  const y3 = cy + innerR * Math.sin(endRad);
  const x4 = cx + innerR * Math.cos(startRad);
  const y4 = cy + innerR * Math.sin(startRad);

  const largeArc = angle > 180 ? 1 : 0;

  return `
    <path d="M ${x1} ${y1}
             A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
             L ${x3} ${y3}
             A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
             Z"
          fill="${color}"
          stroke="var(--bg-primary)"
          stroke-width="1"/>
  `;
}

/**
 * Render monthly distribution bar chart
 */
function renderMonthlyChart() {
  const monthCounts = {};
  const now = new Date();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[key] = 0;
  }

  // Count tickets by creation month
  allTickets.forEach(ticket => {
    if (ticket.createdAt) {
      const date = new Date(ticket.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.hasOwnProperty(key)) {
        monthCounts[key]++;
      }
    }
  });

  const entries = Object.entries(monthCounts);
  const maxCount = Math.max(...Object.values(monthCounts), 1);

  if (entries.length === 0) {
    renderEmptyBarChart();
    return;
  }

  const rows = entries.map(([month, count]) => {
    const percentage = (count / maxCount) * 100;
    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, parseInt(monthNum) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
    
    return `
      <div class="bar-chart-row">
        <span class="bar-chart-label">${monthName}</span>
        <div class="bar-chart-track">
          <div class="bar-chart-fill" style="width: ${Math.max(percentage, 2)}%"></div>
          <span class="bar-chart-value">${count}</span>
        </div>
      </div>
    `;
  }).join('');

  elements.monthlyChart.innerHTML = `<div class="bar-chart">${rows}</div>`;
}

/**
 * Render empty charts
 */
function renderEmptyCharts() {
  renderEmptyPieChart();
  renderEmptyBarChart();
}

function renderEmptyPieChart() {
  elements.statusPieChart.innerHTML = `
    <div class="chart-placeholder">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z"/>
      </svg>
      <span>No data available</span>
    </div>
  `;
  elements.statusLegend.innerHTML = '';
}

function renderEmptyBarChart() {
  elements.monthlyChart.innerHTML = `
    <div class="chart-placeholder">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
      <span>No data available</span>
    </div>
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
    Epic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>',
    'Sub-task': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>'
  };
  return icons[type] || icons.Task;
}

/**
 * Get priority icon SVG
 */
function getPriorityIcon(priority) {
  const icons = {
    Critical: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
    Highest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
    High: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>',
    Medium: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 12h8v2H8z"/></svg>',
    Low: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
    Lowest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>'
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
