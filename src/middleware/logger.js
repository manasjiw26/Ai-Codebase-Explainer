
const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    // Bright cyan color so it's impossible to miss in the terminal
    console.log('\x1b[36m%s\x1b[0m', `\n>>> [${timestamp}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('\x1b[36m    Body:\x1b[0m', JSON.stringify(req.body));
    }
    next(); // Must be called or the request will hang here
};
module.exports = logger;