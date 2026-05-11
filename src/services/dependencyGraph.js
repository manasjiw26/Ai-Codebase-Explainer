const path = require('path');

/**
 * Builds a dependency graph from a list of analyzed files.
 * @param {Array} parsedFiles - Array of files containing .path and .imports
 * @returns {Object} A map of file paths to their local dependencies
 */
function buildDependencyGraph(parsedFiles) {
    const graph = {};

    parsedFiles.forEach(file => {
        // Skip files that couldn't be parsed (e.g. Python, HTML, binary files)
        // where imports was never populated by the AST parser
        if (!file.imports) return;

        // We only care about local imports (ones starting with '.' or '..')
        // We ignore external packages like 'express' or 'mongoose'
        const localImports = file.imports
            .filter(imp => imp.source.startsWith('.'))
            .map(imp => imp.source);

        // We use just the file name (e.g., 'index.js') for a cleaner graph
        const fileName = path.basename(file.path);

        graph[fileName] = localImports;
    });

    return graph;
}

module.exports = {
    buildDependencyGraph
};
