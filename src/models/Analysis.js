const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed'],
        default: 'queued'
    },
    progress: {
        type: Number,
        default: 0
    },
    errorMessage: {
        type: String
    },
    summary: {
        type: String
    },
    entryPoint: {
        type: String
    },
    architecture: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
