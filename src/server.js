require('dotenv').config();
const PORT = process.env.PORT || 3000;
console.log("PORT FROM ENV:", process.env.PORT);

const express = require('express');
const mongoose = require('mongoose');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const analyseRoutes = require('./routes/analyse');

const app = express();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB Connection Error:', err));

app.use(express.json());
app.use(logger);

console.log('\n🚀 Routes initialized:');
console.log('   POST   /api/analyze - Start analysis');
console.log('   GET    /api/analyze/:id - Get status');
console.log('   DELETE /api/analyze/:id - Cancel analysis');
console.log('   GET    /health - Health check\n');

app.use('/api/analyze', analyseRoutes);
app.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.use(errorHandler);
// const PORT = 3000;
app.listen(PORT, () => {
    console.log(`server running at localhost: ${PORT}`);
});