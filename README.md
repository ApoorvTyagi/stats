# GitHub Stats Dashboard

A beautiful, modern dashboard to view your GitHub PR statistics and merge time metrics.

🔗 **Live**: [tyagiapoorv.github.io/stats](https://tyagiapoorv.github.io/stats/)

## Features

- 📊 **PR Statistics** - View total, open, merged, and closed PRs
- ⏱️ **Merge Time Metrics** - Track Average, P50, P95, and P99 merge times
- 📈 **Visual Chart** - See merge time distribution at a glance
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
├── app.js                # Frontend logic
├── index.html            # Dashboard UI
├── index.css             # Premium styling
├── 404.html              # SPA routing for GitHub Pages
├── CONTRIBUTING.md       # Contribution guidelines
└── README.md
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

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Hosting**: GitHub Pages

> **Note**: The backend is hosted separately in a private repository for security purposes.

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- 🐛 Reporting bugs
- ✨ Requesting features
- 🔧 Submitting pull requests

## License

[MIT](https://github.com/tyagiapoorv/stats/blob/main/LICENSE)
