function normalizeGitHubRepoUrl(url) {
    if (!url || typeof url !== 'string') return '';

    const trimmed = url.trim();
    const withoutQuery = trimmed.split(/[?#]/, 1)[0];
    const normalized = withoutQuery.replace(/^https?:\/\/(www\.)?github\.com\//i, 'https://github.com/');
    const match = normalized.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/i);

    if (!match) {
        return '';
    }

    return `https://github.com/${match[1]}/${match[2]}`.replace(/\.git$/i, '');
}

function isValidURL(url) {
    return Boolean(normalizeGitHubRepoUrl(url));
}

module.exports = { isValidURL, normalizeGitHubRepoUrl };