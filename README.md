# GitHub Stats Dashboard

A beautiful, modern dashboard to view your GitHub PR statistics, merge time metrics, and JIRA tickets across all contributed repositories.

🔗 **Live**: [apoorvtyagi.github.io/stats/](https://apoorvtyagi.github.io/stats/)

## Features

### Core Dashboard
- 📊 **PR Statistics** - View total, open, merged, and closed PRs across all repositories
- ⏱️ **Merge Time Metrics** - Track Average, P50, P95, and P99 merge times
- 📈 **Merge Time Distribution** - Visual chart showing merge time percentiles
- 🗂️ **Top Repositories** - Horizontal bar chart showing top 5 repositories by merged PRs

### Activity Timeline
- 📅 **Weekly Activity** - View PR activity over the last 4 weeks
- 📊 **Created vs Merged** - Side-by-side comparison of PRs created and merged each week
- 📈 **Trend Indicators** - See percentage change compared to the previous period
- 💡 **Interactive Tooltips** - Hover over bars to see detailed weekly stats

### Day of Week Analysis
- 📆 **Activity Patterns** - See which days you're most active creating PRs
- 🎨 **Visual Heatmap** - Color-coded bars showing activity distribution

### Open Pull Requests Page
- 📋 **Detailed PR List** - View all open pull requests in one place
- 🔍 **Search & Filter** - Search PRs by title, repository, or author
- 🔄 **Sorting** - Sort by newest, oldest, or by repository
- 🔗 **Quick Links** - Click any PR to open it directly on GitHub
- ✨ **Clickable Open Card** - Click the "Open" stat card on the dashboard to navigate directly

### JIRA Tickets Page
- 🎫 **Ticket Views** - Three tabs to view tickets:
  - **Assigned to Me** - Tickets assigned to you
  - **Reported by Me** - Tickets you created
  - **Watching** - Tickets you're watching
- 📊 **Stats Overview** - Quick view of Open, In Progress, Blocked, and Done counts
- 🔍 **Search & Filter** - Search tickets and filter by priority or type
- 🔄 **Sorting** - Sort by updated date, created date, priority, or due date
- 🎨 **Visual Indicators** - Color-coded priority levels and status badges
- ⏰ **Due Date Alerts** - Overdue and upcoming due dates highlighted
- 🔗 **Quick Links** - Click any ticket to open it directly in JIRA


## Usage

Visit the dashboard with a GitHub username in the URL:

```
https://apoorvtyagi.github.io/stats/<username>
```

**Examples:**
- `https://apoorvtyagi.github.io/stats/apoorvtyagi` - View stats for apoorvtyagi
- `https://apoorvtyagi.github.io/stats/octocat` - View stats for octocat

### Navigating to Open PRs
Click on the "Open" PR card in the dashboard to view all open pull requests, or navigate directly:
```
https://apoorvtyagi.github.io/stats/open-prs.html?user=<username>
```

### Navigating to JIRA Tickets
Click on the "JIRA" link in the header navigation, or navigate directly:
```
https://apoorvtyagi.github.io/stats/jira-tickets.html?username=<jira-username>
```

## Project Structure

```
stats/
├── index.html            # Main dashboard page
├── index.css             # Global styles and theme
├── app.js                # Dashboard logic
├── open-prs.html         # Open pull requests page
├── open-prs.css          # Open PRs page styles
├── open-prs.js           # Open PRs page logic
├── jira-tickets.html     # JIRA tickets page
├── jira-tickets.css      # JIRA tickets page styles
├── jira-tickets.js       # JIRA tickets page logic
├── loading-screen.js     # Modular loading screen module
├── 404.html              # SPA routing for GitHub Pages
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # MIT License
└── README.md
```

## Loading Screen Module

The loading screen is built as a reusable module (`loading-screen.js`) that can be customized:

```javascript
// Add custom facts
LoadingScreen.addFact("Your custom fact here!");

// Add custom loading messages
LoadingScreen.addMessage("Processing your data...");

// Change rotation interval (default: 3000ms)
LoadingScreen.setRotationInterval(5000);

// Get a random tip for display elsewhere
const tip = LoadingScreen.getRandomTip();
```

## Local Development

Serve the frontend files locally:

```bash
# Option 1: Using Node.js serve
npx serve . -p 8080

# Option 2: Using Python
python -m http.server 8080

# Option 3: Using VS Code Live Server extension
```

Then open `http://localhost:8080` in your browser.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Design**: Glassmorphism, CSS Grid, CSS Variables
- **Hosting**: GitHub Pages


## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- 🐛 Reporting bugs
- ✨ Requesting features
- 🔧 Submitting pull requests

## License

[MIT](https://github.com/apoorvtyagi/stats/blob/main/LICENSE)
