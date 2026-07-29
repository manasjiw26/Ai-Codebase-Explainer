function buildRepositoryContext(files) {
    const normalizedFiles = files.map(file => ({
        path: file.path.replace(/\\/g, '/'),
        content: file.content || ''
    }));

    const packageFiles = normalizedFiles.filter(file => /package\.json$/i.test(file.path) || /requirements\.txt$/i.test(file.path) || /pyproject\.toml$/i.test(file.path) || /go\.mod$/i.test(file.path));
    const entryFiles = normalizedFiles.filter(file => /(^|\/)(server|index|app|main)\.(js|ts|jsx|tsx|py|go|java|rb)$/i.test(file.path));
    const routeFiles = normalizedFiles.filter(file => /\/routes\//i.test(file.path) || /\/controllers\//i.test(file.path) || /\/middleware\//i.test(file.path) || /\/services\//i.test(file.path));
    const coreServiceFiles = normalizedFiles.filter(file => /\/services\//i.test(file.path) || /\/utils\//i.test(file.path) || /\/models\//i.test(file.path));

    const summarizeFile = (file) => ({
        path: file.path,
        preview: file.content.slice(0, 1200)
    });

    return {
        packageInfo: packageFiles.map(summarizeFile),
        routeSummary: routeFiles.map(summarizeFile),
        mainEntryFiles: entryFiles.map(summarizeFile),
        coreServiceFiles: coreServiceFiles.map(summarizeFile)
    };
}

module.exports = {
    buildRepositoryContext
};
