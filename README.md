# GitHub Stats Dashboard

A beautiful, modern dashboard to view your GitHub PR statistics and merge time metrics.

🔗 **Live Demo**: [tyagiapoorv.github.io/stats](https://tyagiapoorv.github.io/stats/)

> **Note**: The backend code has been moved to a private repository. The `backend/` folder in this repo contains only placeholder files for reference. (Good enough to work)

## Features

- 📊 **PR Statistics** - View total, open, merged, and closed PRs
- ⏱️ **Merge Time Metrics** - Track Average, P50, P95, and P99 merge times
- 📈 **Visual Chart** - See merge time distribution at a glance
- 👤 **Dynamic Username** - View stats for any GitHub user via URL
- 🎨 **Premium Dark Theme** - Glassmorphism effects and smooth animations
- 🔄 **Caching** - 3 Hours cache to avoid GitHub rate limits
- 📱 **Responsive Design** - Works on desktop and mobile

## Usage

Visit the dashboard with a GitHub username in the URL:

```
https://tyagiapoorv.github.io/stats/<username>
```

**Examples:**
- `https://tyagiapoorv.github.io/stats/tyagiapoorv` - View stats for tyagiapoorv
- `https://tyagiapoorv.github.io/stats/octocat` - View stats for octocat
- `https://tyagiapoorv.github.io/stats/` - Defaults to tyagiapoorv

## Project Structure

```
stats/
├── backend/              # Placeholder (actual code in private repo)
│   └── ...
├── app.js                # Frontend logic
├── index.html            # Dashboard UI
├── index.css             # Premium styling
└── README.md
```

## Local Development (Frontend Only)

Serve the frontend files locally:

```bash
# Option 1: Using Node.js serve
npx serve . -p 8080

# Option 2: Using Python
python -m http.server 8080

# Option 3: Using VS Code Live Server extension
```

Then open `http://localhost:8080` in your browser.

## API Endpoints

The backend exposes the following API endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats/aggregate` | Aggregate stats across all contributed repos |
| `GET /api/stats/contributed-repos` | List repositories user has contributed to |
| `GET /api/stats/repos` | List all repositories |
| `GET /api/stats/prs?repo=<name>` | Get PR statistics for specific repo |
| `GET /api/stats/merge-times?repo=<name>` | Get merge time metrics for specific repo |
| `GET /api/stats/overview?repo=<name>` | Get combined stats for specific repo |
| `GET /` | Health check |

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express, Axios (private repo)
- **Hosting**: GitHub Pages (frontend), Vercel (backend)

## License

[MIT](https://github.com/tyagiapoorv/stats/blob/main/LICENSE)
