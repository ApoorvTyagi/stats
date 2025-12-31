# GitHub Stats Dashboard

A beautiful, modern dashboard to view your GitHub PR statistics and merge time metrics.

![Dashboard Preview](frontend/preview.png)

## Features

- 📊 **PR Statistics** - View total, open, merged, and closed PRs
- ⏱️ **Merge Time Metrics** - Track Average, P50, P95, and P99 merge times
- 📈 **Visual Chart** - See merge time distribution at a glance
- 🎨 **Premium Dark Theme** - Glassmorphism effects and smooth animations
- 🔄 **Caching** - 5-minute cache to avoid GitHub rate limits
- 📱 **Responsive Design** - Works on desktop and mobile

## Project Structure

```
github-stats-dashboard/
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js           # Express server
│       ├── routes/stats.js    # API endpoints
│       ├── services/github.js # GitHub API integration
│       └── utils/cache.js     # In-memory cache
├── frontend/
│   ├── index.html             # Dashboard UI
│   ├── index.css              # Premium styling
│   └── app.js                 # Frontend logic
└── README.md
```

## Setup

### 1. Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate a new token with `repo` scope (or `public_repo` for public repos only)
3. Copy the token

### 2. Configure Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env and add your token
# GITHUB_TOKEN=your_token_here
# GITHUB_USERNAME=tyagiapoorv

# Install dependencies
npm install

# Start the server
npm run dev
```

### 3. Run Frontend

You can serve the frontend using any static file server:

```bash
# Option 1: Using Python
cd frontend
python -m http.server 8080

# Option 2: Using Node.js serve
npx serve frontend -p 8080

# Option 3: Using VS Code Live Server extension
```

### 4. Open Dashboard

Navigate to `http://localhost:8080` in your browser.

## Deployment

### Backend (Vercel)

1. Push this code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and import the repository
3. Set the **Root Directory** to `backend`
4. Add Environment Variables:
   - `GITHUB_TOKEN`: Your Personal Access Token
   - `GITHUB_USERNAME`: Your GitHub username
5. Deploy! You'll get a URL like `https://your-project.vercel.app`

### Frontend (GitHub Pages)

1. Update `frontend/app.js`:
   ```javascript
   const API_BASE_URL = 'https://your-project.vercel.app/api';
   ```
2. In your GitHub repo settings, go to **Pages**
3. Select the branch and folder (e.g., `main` branch, `/frontend` folder if possible, or deploy from a separate branch)
4. Your site will be live at `https://username.github.io/repo-name`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats/repos` | List all repositories |
| `GET /api/stats/prs?repo=<name>` | Get PR statistics |
| `GET /api/stats/merge-times?repo=<name>` | Get merge time metrics |
| `GET /api/stats/overview?repo=<name>` | Get combined stats |
| `GET /health` | Health check |

## Technologies

- **Backend**: Node.js, Express, Axios
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Design**: Modern dark theme with glassmorphism

## License

MIT
