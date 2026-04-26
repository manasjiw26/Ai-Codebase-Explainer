require('dotenv').config();
const PORT = process.env.PORT || 3000;
console.log("PORT FROM ENV:", process.env.PORT);

const express = require('express');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const analyseRoutes = require('./routes/analyse');

const app = express();

app.use(express.json());
app.use(logger);


app.use('/api/analyze', analyseRoutes);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.use(errorHandler);
// const PORT = 3000;
app.listen(PORT, () => {
    console.log(`server running at localhost: ${PORT}`);
});