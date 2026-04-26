const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Clones a GitHub repository into a unique temporary directory.
 * @param {string} repoUrl - The URL of the GitHub repository.
 * @returns {Promise<string>} - The absolute path to the cloned repository.
 */
async function cloneRepository(repoUrl) {
    // Double-check validation (defensive programming)
    const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
    if (!pattern.test(repoUrl)) {
        throw new Error('Invalid GitHub URL');
    }

    // Create a unique directory name
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const targetDir = path.join(os.tmpdir(), `repo-${repoName}-${Date.now()}`);

    try {
        console.log(`Cloning ${repoUrl} into ${targetDir}...`);
        
        // Execute the clone command
        // Note: Using targetDir as the second argument ensures it clones into that specific unique folder
        await execAsync(`git clone ${repoUrl} ${targetDir}`);
        
        console.log(`Repository cloned successfully to ${targetDir}`);
        return targetDir;
    } catch (error) {
        console.error(`Git clone failed: ${error.message}`);
        throw new Error(`Failed to clone repository: ${error.message}`);
    }
}

module.exports = { cloneRepository };