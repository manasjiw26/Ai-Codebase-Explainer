function isValidURL(url) {
    const githubRepoRegex = /^(https?:\/\/github\.com\/|git@github\.com:)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\.git)?$/;
    return githubRepoRegex.test(url);
}

module.exports = { isValidURL };