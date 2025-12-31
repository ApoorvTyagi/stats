# GitHub Stats Dashboard Backend

## Setup

1. Copy `.env.example` to `.env` and add your GitHub Personal Access Token
2. Run `npm install`
3. Run `npm run dev` to start the development server

## API Endpoints

- `GET /api/stats/repos` - List repositories
- `GET /api/stats/prs?repo=<repo-name>` - Get PR statistics
- `GET /api/stats/merge-times?repo=<repo-name>` - Get merge time metrics
