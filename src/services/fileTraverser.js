const fs = require('fs');
const path = require('path');

const ignoreList = ['node_modules', '.git', 'dist', 'coverage', 'logs','build', '__pycache__', '.next', 'coverage'];

const stats = {
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    fileTypes: {},
};
async function traverseDirectory(dirPath) {
    const files = await fs.promises.readdir(dirPath , {withFileTypes: true});
    for (const file of files) {        if (ignoreList.includes(file.name)) {
            continue;
        }
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            stats.totalDirectories++;
            await traverseDirectory(fullPath);
        } else if (file.isFile()) {
            stats.totalFiles++;
            const fileSize = (await fs.promises.stat(fullPath)).size;
            stats.totalSize += fileSize;
            const ext = path.extname(file.name).toLowerCase() || 'no_extension';
            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
        }
    }
    return stats; 
    
}

module.exports = {
    traverseDirectory
};