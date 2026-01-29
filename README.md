# GitHub Stats Dashboard

A beautiful, modern dashboard to view your GitHub PR statistics and merge time metrics across all contributed repositories.

🔗 **Live**: [tyagiapoorv.github.io/stats](https://tyagiapoorv.github.io/stats/)

## Features

### Core Dashboard
- 📊 **PR Statistics** - View total, open, merged, and closed PRs across all repositories
- ⏱️ **Merge Time Metrics** - Track Average, P50, P95, and P99 merge times
- 📈 **Visual Chart** - See merge time distribution at a glance
- 🗂️ **Top Repositories** - View your most contributed repositories sorted by PR count

### Open Pull Requests Page
- 📋 **Detailed PR List** - View all open pull requests in one place
- 🔍 **Search & Filter** - Search PRs by title, repository, or author
- 🔄 **Sorting** - Sort by newest, oldest, or by repository
- 🔗 **Quick Links** - Click any PR to open it directly on GitHub


## Usage

Visit the dashboard with a GitHub username in the URL:

```
https://tyagiapoorv.github.io/stats/<username>
```

**Examples:**
- `https://tyagiapoorv.github.io/stats/tyagiapoorv` - View stats for tyagiapoorv
- `https://tyagiapoorv.github.io/stats/octocat` - View stats for octocat

### Navigating to Open PRs
Click on the "Open" PR card in the dashboard to view all open pull requests, or navigate directly:
```
https://tyagiapoorv.github.io/stats/open-prs.html?user=<username>
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

> **Note**: The backend API is hosted separately for security purposes.

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- 🐛 Reporting bugs
- ✨ Requesting features
- 🔧 Submitting pull requests

## License

[MIT](https://github.com/tyagiapoorv/stats/blob/main/LICENSE)
