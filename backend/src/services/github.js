const axios = require('axios');
const cache = require('../utils/cache');

const GITHUB_API = 'https://api.github.com';

/**
 * Create authenticated GitHub API client
 */
function getClient() {
    const token = process.env.GITHUB_TOKEN;
    return axios.create({
        baseURL: GITHUB_API,
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    });
}

/**
 * Get user's repositories
 */
async function getRepositories() {
    const cacheKey = 'repos';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const username = process.env.GITHUB_USERNAME;
    const client = getClient();

    const repos = [];
    let page = 1;

    while (true) {
        const response = await client.get(`/users/${username}/repos`, {
            params: { per_page: 100, page, sort: 'updated' }
        });

        repos.push(...response.data);

        if (response.data.length < 100) break;
        page++;
    }

    const result = repos.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        updatedAt: repo.updated_at
    }));

    cache.set(cacheKey, result);
    return result;
}

/**
 * Get ALL pull requests authored by user across all repositories
 * Uses GitHub Search API to find PRs by author
 */
async function getAllAuthoredPRs() {
    const cacheKey = 'all-authored-prs';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const username = process.env.GITHUB_USERNAME;
    const client = getClient();
    const allPRs = [];
    let page = 1;

    // Search for all PRs authored by user
    while (true) {
        try {
            const response = await client.get('/search/issues', {
                params: {
                    q: `author:${username} type:pr`,
                    per_page: 100,
                    page,
                    sort: 'created',
                    order: 'desc'
                }
            });

            const prs = response.data.items.map(pr => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                createdAt: pr.created_at,
                closedAt: pr.closed_at,
                // pull_request object indicates if merged
                mergedAt: pr.pull_request?.merged_at || null,
                user: pr.user.login,
                url: pr.html_url,
                repository: pr.repository_url.split('/').slice(-2).join('/')
            }));

            allPRs.push(...prs);

            // GitHub Search API has a limit of 1000 results
            if (response.data.items.length < 100 || allPRs.length >= 1000) break;
            page++;

            // Rate limiting - small delay between pages
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error fetching PRs:', error.message);
            break;
        }
    }

    // Fetch merge status for each PR (search API doesn't include merged_at)
    const enrichedPRs = await enrichPRsWithMergeStatus(allPRs);

    cache.set(cacheKey, enrichedPRs);
    return enrichedPRs;
}

/**
 * Enrich PRs with actual merge status by fetching from PR endpoint
 */
async function enrichPRsWithMergeStatus(prs) {
    const client = getClient();
    const enriched = [];

    for (const pr of prs) {
        try {
            // Only fetch details for closed PRs to check if merged
            if (pr.state === 'closed' && !pr.mergedAt) {
                const response = await client.get(`/repos/${pr.repository}/pulls/${pr.number}`);
                pr.mergedAt = response.data.merged_at;
            }
            enriched.push(pr);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
            // If we can't fetch details, still include the PR
            enriched.push(pr);
        }
    }

    return enriched;
}

/**
 * Get aggregate PR statistics across all repos
 */
async function getAggregatePRStats() {
    const prs = await getAllAuthoredPRs();

    const open = prs.filter(pr => pr.state === 'open');
    const closed = prs.filter(pr => pr.state === 'closed' && !pr.mergedAt);
    const merged = prs.filter(pr => pr.mergedAt);

    // Get unique repos contributed to
    const repos = [...new Set(prs.map(pr => pr.repository))];

    return {
        total: prs.length,
        open: open.length,
        closed: closed.length,
        merged: merged.length,
        repositories: repos.length
    };
}

/**
 * Get aggregate merge time metrics across all repos
 */
async function getAggregateMergeMetrics() {
    const prs = await getAllAuthoredPRs();
    const merged = prs.filter(pr => pr.mergedAt);

    if (merged.length === 0) {
        return {
            count: 0,
            average: null,
            p50: null,
            p95: null,
            p99: null
        };
    }

    // Calculate merge times in hours
    const mergeTimes = merged.map(pr => {
        const created = new Date(pr.createdAt);
        const mergedAt = new Date(pr.mergedAt);
        return (mergedAt - created) / (1000 * 60 * 60); // Convert to hours
    }).sort((a, b) => a - b);

    // Calculate percentiles
    const percentile = (arr, p) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    };

    const average = mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length;

    return {
        count: merged.length,
        average: Math.round(average * 100) / 100,
        p50: Math.round(percentile(mergeTimes, 50) * 100) / 100,
        p95: Math.round(percentile(mergeTimes, 95) * 100) / 100,
        p99: Math.round(percentile(mergeTimes, 99) * 100) / 100
    };
}

/**
 * Get list of all repos user has contributed to
 */
async function getContributedRepos() {
    const prs = await getAllAuthoredPRs();
    const repoMap = new Map();

    for (const pr of prs) {
        if (!repoMap.has(pr.repository)) {
            repoMap.set(pr.repository, {
                fullName: pr.repository,
                prCount: 0,
                mergedCount: 0
            });
        }
        const repo = repoMap.get(pr.repository);
        repo.prCount++;
        if (pr.mergedAt) repo.mergedCount++;
    }

    return Array.from(repoMap.values())
        .sort((a, b) => b.prCount - a.prCount);
}

/**
 * Get pull requests for a repository (kept for compatibility)
 */
async function getPullRequests(repoFullName, state = 'all') {
    const cacheKey = `prs:${repoFullName}:${state}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const client = getClient();
    const prs = [];
    let page = 1;

    while (true) {
        const response = await client.get(`/repos/${repoFullName}/pulls`, {
            params: { state, per_page: 100, page }
        });

        prs.push(...response.data);

        if (response.data.length < 100) break;
        page++;
    }

    const result = prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at,
        closedAt: pr.closed_at,
        user: pr.user.login,
        url: pr.html_url
    }));

    cache.set(cacheKey, result);
    return result;
}

/**
 * Calculate PR statistics for a single repo
 */
async function getPRStats(repoFullName) {
    const prs = await getPullRequests(repoFullName);

    const open = prs.filter(pr => pr.state === 'open');
    const closed = prs.filter(pr => pr.state === 'closed' && !pr.mergedAt);
    const merged = prs.filter(pr => pr.mergedAt);

    return {
        total: prs.length,
        open: open.length,
        closed: closed.length,
        merged: merged.length
    };
}

/**
 * Calculate merge time metrics for a single repo (in hours)
 */
async function getMergeTimeMetrics(repoFullName) {
    const prs = await getPullRequests(repoFullName);
    const merged = prs.filter(pr => pr.mergedAt);

    if (merged.length === 0) {
        return {
            count: 0,
            average: null,
            p50: null,
            p95: null,
            p99: null
        };
    }

    // Calculate merge times in hours
    const mergeTimes = merged.map(pr => {
        const created = new Date(pr.createdAt);
        const mergedAt = new Date(pr.mergedAt);
        return (mergedAt - created) / (1000 * 60 * 60); // Convert to hours
    }).sort((a, b) => a - b);

    // Calculate percentiles
    const percentile = (arr, p) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    };

    const average = mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length;

    return {
        count: merged.length,
        average: Math.round(average * 100) / 100,
        p50: Math.round(percentile(mergeTimes, 50) * 100) / 100,
        p95: Math.round(percentile(mergeTimes, 95) * 100) / 100,
        p99: Math.round(percentile(mergeTimes, 99) * 100) / 100
    };
}

module.exports = {
    getRepositories,
    getPullRequests,
    getPRStats,
    getMergeTimeMetrics,
    getAllAuthoredPRs,
    getAggregatePRStats,
    getAggregateMergeMetrics,
    getContributedRepos
};
