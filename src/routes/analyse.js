const express = require('express');
const router = express.Router();
const { 
    startAnalysis, 
    getAnalysisStatus, 
    deleteAnalysis 
} = require('../controllers/analyseController');

// POST /api/analyze - Start a new analysis
router.post('/', startAnalysis);

// GET /api/analyze/:id - Check analysis status
router.get('/:id', getAnalysisStatus);

// DELETE /api/analyze/:id - Cancel an analysis
router.delete('/:id', deleteAnalysis);

module.exports = router;