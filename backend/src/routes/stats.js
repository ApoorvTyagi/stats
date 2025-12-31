const express = require('express');
const router = express.Router();
const github = require('../services/github');

/**
 * GET /api/stats/aggregate
 * Get aggregate stats across ALL repositories user has contributed to
 */
router.get('/aggregate', async (req, res, next) => {
    try {
        const [prStats, mergeMetrics, contributedRepos] = await Promise.all([
            github.getAggregatePRStats(),
            github.getAggregateMergeMetrics(),
            github.getContributedRepos()
        ]);

        res.json({
            username: process.env.GITHUB_USERNAME,
            prStats,
            mergeMetrics: {
                unit: 'hours',
                ...mergeMetrics
            },
            contributedRepos: contributedRepos.slice(0, 10) // Top 10 repos
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/contributed-repos
 * List all repositories user has contributed PRs to
 */
router.get('/contributed-repos', async (req, res, next) => {
    try {
        const repos = await github.getContributedRepos();
        res.json({
            username: process.env.GITHUB_USERNAME,
            count: repos.length,
            repositories: repos
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/repos
 * List all repositories owned by the configured user
 */
router.get('/repos', async (req, res, next) => {
    try {
        const repos = await github.getRepositories();
        res.json({
            username: process.env.GITHUB_USERNAME,
            count: repos.length,
            repositories: repos
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/prs?repo=<repo-name>
 * Get PR statistics for a repository
 */
router.get('/prs', async (req, res, next) => {
    try {
        const { repo } = req.query;

        if (!repo) {
            return res.status(400).json({ error: 'repo query parameter is required' });
        }

        const repoFullName = repo.includes('/')
            ? repo
            : `${process.env.GITHUB_USERNAME}/${repo}`;

        const stats = await github.getPRStats(repoFullName);
        res.json({
            repository: repoFullName,
            stats
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/merge-times?repo=<repo-name>
 * Get merge time metrics for a repository
 */
router.get('/merge-times', async (req, res, next) => {
    try {
        const { repo } = req.query;

        if (!repo) {
            return res.status(400).json({ error: 'repo query parameter is required' });
        }

        const repoFullName = repo.includes('/')
            ? repo
            : `${process.env.GITHUB_USERNAME}/${repo}`;

        const metrics = await github.getMergeTimeMetrics(repoFullName);
        res.json({
            repository: repoFullName,
            unit: 'hours',
            metrics
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/stats/overview?repo=<repo-name>
 * Get overview of all stats for a single repository
 */
router.get('/overview', async (req, res, next) => {
    try {
        const { repo } = req.query;

        if (!repo) {
            return res.status(400).json({ error: 'repo query parameter is required' });
        }

        const repoFullName = repo.includes('/')
            ? repo
            : `${process.env.GITHUB_USERNAME}/${repo}`;

        const [prStats, mergeMetrics] = await Promise.all([
            github.getPRStats(repoFullName),
            github.getMergeTimeMetrics(repoFullName)
        ]);

        res.json({
            repository: repoFullName,
            prStats,
            mergeMetrics: {
                unit: 'hours',
                ...mergeMetrics
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

