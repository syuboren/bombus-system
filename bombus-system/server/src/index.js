/**
 * Onboarding API Server
 */

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支援大型 Base64 PDF

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function start() {
    try {
        await initDatabase();

        // Routes (loaded after DB init)
        const templatesRouter = require('./routes/templates');
        const submissionsRouter = require('./routes/submissions');
        const employeeRouter = require('./routes/employee');
        const approvalsRouter = require('./routes/approvals');

        app.use('/api/onboarding/templates', templatesRouter);
        app.use('/api/onboarding/sign', submissionsRouter);
        app.use('/api/employee', employeeRouter);
        app.use('/api/manager/approvals', approvalsRouter);

        app.listen(PORT, () => {
            console.log(`🚀 Onboarding API Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

module.exports = app;
