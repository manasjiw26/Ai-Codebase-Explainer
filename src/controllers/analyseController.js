const { cloneRepository } = require('../services/repoClone');
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
