const fs = require('fs');
const path = require('path');

const ignoreList = ['node_modules', '.git', 'dist', 'coverage', 'logs', 'build', '__pycache__', '.next', 'coverage'];

// --- NEW DAY 6 FILTERING CONFIG ---
const includeExtensions = ['.js', '.ts', '.py', '.java', '.go', '.rb', '.rs', '.cpp', '.c', '.jsx', '.tsx'];
const excludeExtensions = ['.min.js', '.map', '.lock', '.log'];
const MAX_FILE_SIZE = 100 * 1024; // 100KB in bytes
// ----------------------------------

function shouldProcessFile(file, size) {
    const ext = path.extname(file.name).toLowerCase();
    return (
        includeExtensions.includes(ext) &&
        !excludeExtensions.includes(ext) &&
        size <= MAX_FILE_SIZE
    );
}

async function traverseDirectory(dirPath, stats = {
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    fileTypes: {},
    fileContents: []
}) {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
        if (ignoreList.includes(file.name)) {
            continue;
        }
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            stats.totalDirectories++;
            await traverseDirectory(fullPath, stats);
        } else if (file.isFile()) {
            stats.totalFiles++;
            const fileSize = (await fs.promises.stat(fullPath)).size;
            stats.totalSize += fileSize;
            if (shouldProcessFile(file, fileSize)) {
                const content = await fs.promises.readFile(fullPath, 'utf8');
                stats.fileContents.push({
                    path: fullPath,
                    content: content,
                    size: fileSize
                });
            }
            const ext = path.extname(file.name).toLowerCase() || 'no_extension';
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
        }
    }
    return stats;

}

module.exports = {
    traverseDirectory
};