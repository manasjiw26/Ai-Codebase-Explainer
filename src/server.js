require('dotenv').config();
const PORT = process.env.PORT || 3000;
console.log("PORT FROM ENV:", process.env.PORT);
const { cloneRepository } = require('./services/repoClone');


const express = require('express');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const analyseRoutes = require('./routes/analyse');

const app = express();

app.use(express.json());
app.use(logger);
app.get('/clone', async (req, res) => {
    const repositoryUrl = req.query.repositoryUrl || req.query.repoUrl || req.body.repositoryUrl || req.body.repoUrl;
    if (!repositoryUrl) {
        return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    try {
        await cloneRepository(repositoryUrl);
        res.status(200).json({ message: 'Repository cloned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clone repository', details: error.message });
    }
});



app.use('/api/analyze', analyseRoutes);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.use(errorHandler);
// const PORT = 3000;
app.listen(PORT, () => {
    console.log(`server running at localhost: ${PORT}`);
});