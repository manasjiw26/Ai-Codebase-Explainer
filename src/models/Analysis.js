const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
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
