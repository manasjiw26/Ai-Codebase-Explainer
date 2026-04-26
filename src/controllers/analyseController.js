const { cloneRepository, cleanupRepository } = require('../services/repoClone');
const { traverseDirectory } = require('../services/fileTraverser');
const { isValidURL } = require('../utils/URL_Validation');

const startAnalysis = async (req, res, next) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return res.status(400).json({ error: 'repoUrl is required' });
        }

        if (!isValidURL(repoUrl)) {
            return res.status(400).json({ error: 'Invalid GitHub repository URL' });
        }

        // Trigger cloning
        const targetDir = await cloneRepository(repoUrl);

        res.status(202).json({
            message: 'Analysis started',
            repoUrl,
            tempPath: targetDir // Helpful for debugging for now
        });
        traverseDirectory(targetDir).then(stats => {
            console.log('Analysis complete:', stats);
        }).catch(err => {
            console.error('Error during analysis:', err);
        }).finally(() => {
            cleanupRepository(targetDir);
        });

        // cleanupRepository(targetDir);
    } catch (err) {
        next(err);
    }
};

const getAnalysisStatus = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ status: 'pending', id });
};

const deleteAnalysis = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ status: 'Analysis cancelled', id });
};

module.exports = {
    startAnalysis,
    getAnalysisStatus,
    deleteAnalysis
};
