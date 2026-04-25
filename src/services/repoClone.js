const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function cloneRepository(repositoryUrl) {
    const targetDir = path.join(process.cwd(), 'tempRepo');

    return new Promise((resolve, reject) => {
        // Clear existing directory if it exists
        if (fs.existsSync(targetDir)) {
            try {
                fs.rmSync(targetDir, { recursive: true, force: true });
            } catch (err) {
                return reject(new Error(`Failed to clear existing directory: ${err.message}`));
            }
        }

        exec(`git clone ${repositoryUrl} tempRepo`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error cloning repository: ${error.message}`);
                return reject(error);
            }
            // Git progress is sent to stderr, so we only log it unless we want to be strict
            if (stderr) {
                console.log(`Git output: ${stderr}`);
            }
            console.log(`Repository cloned successfully: ${stdout}`);
            resolve(stdout);
        });
    });
}

module.exports = { cloneRepository };