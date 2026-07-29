function buildPriorityMap(files) {
    const priorityMap = {
        core: [],
        supporting: [],
        optional: []
    };

    files.forEach(file => {
        const normalizedPath = file.path.replace(/\\/g, '/').toLowerCase();
        let score = 0;

        if (normalizedPath.endsWith('/package.json') || normalizedPath.endsWith('/requirements.txt') || normalizedPath.endsWith('/pyproject.toml') || normalizedPath.endsWith('/go.mod')) {
            score += 100;
        }

        if (normalizedPath.includes('/readme') || normalizedPath.endsWith('/readme.md') || normalizedPath.endsWith('/readme.txt')) {
            score += 95;
        }

        if (
            normalizedPath.endsWith('/server.js') || normalizedPath.endsWith('/index.js') || normalizedPath.endsWith('/app.js') ||
            normalizedPath.endsWith('/main.js') || normalizedPath.endsWith('/main.ts') || normalizedPath.endsWith('/main.py') ||
            normalizedPath.endsWith('/main.go') || normalizedPath.endsWith('/main.java') || normalizedPath.endsWith('/main.rb')
        ) {
            score += 90;
        }

        if (normalizedPath.includes('/routes/') || normalizedPath.includes('/controllers/') || normalizedPath.includes('/models/') || normalizedPath.includes('/services/') || normalizedPath.includes('/middleware/') || normalizedPath.includes('/utils/')) {
            score += 70;
        }

        if (normalizedPath.includes('/config') || normalizedPath.includes('/docker') || normalizedPath.includes('/src/')) {
            score += 20;
        }

        if (normalizedPath.includes('/test') || normalizedPath.includes('/spec') || normalizedPath.includes('/__tests__/')) {
            score -= 20;
        }

        if (score >= 90) {
            priorityMap.core.push({ ...file, priority: score });
        } else if (score >= 60) {
            priorityMap.supporting.push({ ...file, priority: score });
        } else {
            priorityMap.optional.push({ ...file, priority: score });
        }
    });

    return priorityMap;
}

function selectImportantFiles(files, limit = 30) {
    const priorityMap = buildPriorityMap(files);
    const prioritizedFiles = [
        ...priorityMap.core,
        ...priorityMap.supporting,
        ...priorityMap.optional
    ].sort((a, b) => b.priority - a.priority);

    return prioritizedFiles.slice(0, limit).map(file => ({
        ...file,
        priority: file.priority
    }));
}

module.exports = {
    buildPriorityMap,
    selectImportantFiles
};
