/**
 * Onboarding API Server (Multi-Tenant SaaS)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./db');
const { initPlatformDB } = require('./db/platform-db');
const { tenantDBManager } = require('./db/tenant-db-manager');
const { authMiddleware } = require('./middleware/auth');
const { tenantMiddleware } = require('./middleware/tenant');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Angular SPA 需要
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 1000, // 每 IP 最多 1000 次
    message: { error: 'TooManyRequests', message: '請求過於頻繁，請稍後再試' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT || '100', 10),
    message: { error: 'TooManyRequests', message: '登入嘗試過於頻繁，請稍後再試' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支援大型 Base64 PDF
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function start() {
    try {
        // 初始化既有資料庫（向後相容）
        await initDatabase();

        // 初始化多租戶基礎設施
        await initPlatformDB();
        await tenantDBManager.init();
        console.log('🏢 Multi-tenant infrastructure initialized');

        // 確保 Demo 租戶與平台管理員存在（自動修復 platform.db 資料遺失）
        const { getPlatformDB } = require('./db/platform-db');
        const platformDB = getPlatformDB();
        const demoTenant = platformDB.queryOne(
            "SELECT id FROM tenants WHERE slug = 'demo'"
        );
        if (!demoTenant) {
            console.log('⚠️  Demo 租戶不存在，自動執行完整遷移...');
            const { migrateDemoData } = require('./db/migrate-demo');
            await migrateDemoData();
            console.log('✅ Demo 租戶自動遷移完成');
        } else {
            // 租戶存在但平台管理員可能遺失
            const platformAdmin = platformDB.queryOne(
                'SELECT id FROM platform_admins LIMIT 1'
            );
            if (!platformAdmin) {
                console.log('⚠️  平台管理員不存在，自動修復...');
                const { seedPlatformData } = require('./db/migrate-demo');
                await seedPlatformData(platformDB);
                console.log('✅ 平台管理員已重建');
            }
        }

        // Auth Routes（公開，不需認證）
        const authRouter = require('./routes/auth');
        app.use('/api/auth', authLimiter, authRouter);

        // Platform Management Routes（需 Platform Admin）
        const platformRouter = require('./routes/platform');
        app.use('/api/platform', platformRouter);

        // Tenant Admin Routes（需租戶認證 + 管理員角色）
        const tenantAdminRouter = require('./routes/tenant-admin');
        app.use('/api/tenant-admin', tenantAdminRouter);

        // Audit Log Routes（需認證）
        const auditRouter = require('./routes/audit');
        app.use('/api/audit', auditRouter);

        // Routes (loaded after DB init)
        const templatesRouter = require('./routes/templates');
        const submissionsRouter = require('./routes/submissions');
        const employeeRouter = require('./routes/employee');
        const approvalsRouter = require('./routes/approvals');

        app.use('/api/onboarding/templates', authMiddleware, tenantMiddleware, templatesRouter);
        app.use('/api/onboarding/sign', authMiddleware, tenantMiddleware, submissionsRouter);
        app.use('/api/employee', authMiddleware, tenantMiddleware, employeeRouter);

        // Batch Import Routes
        const batchImportRouter = require('./routes/batch-import');
        app.use('/api/employee/batch-import', authMiddleware, tenantMiddleware, batchImportRouter);

        app.use('/api/manager/approvals', authMiddleware, tenantMiddleware, approvalsRouter);

        // Jobs Routes
        const jobsRouter = require('./routes/jobs');
        app.use('/api/jobs', authMiddleware, tenantMiddleware, jobsRouter);

        // Recruitment Routes
        const recruitmentRouter = require('./routes/recruitment');
        app.use('/api/recruitment', authMiddleware, tenantMiddleware, recruitmentRouter);

        // Meeting Management Routes
        const meetingsRouter = require('./routes/meetings');
        app.use('/api/meetings', authMiddleware, tenantMiddleware, meetingsRouter);

        // Upload Route
        const uploadRouter = require('./routes/upload.js');
        app.use('/api/upload', authMiddleware, tenantMiddleware, uploadRouter);

        // Serve Static Uploads
        const path = require('path');
        app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

        // Talent Pool Routes
        const talentPoolRouter = require('./routes/talent-pool');
        app.use('/api/talent-pool', authMiddleware, tenantMiddleware, talentPoolRouter);

        // Integration Routes
        const integration104Router = require('./routes/integration/104');
        app.use('/api/integration/104', authMiddleware, tenantMiddleware, integration104Router);

        // Competency Assessment Routes (職能評估系統)
        const competencyRouter = require('./routes/competency');
        const monthlyCheckTemplatesRouter = require('./routes/monthly-check-templates');
        const weeklyReportsRouter = require('./routes/weekly-reports');
        const quarterlyReviewsRouter = require('./routes/quarterly-reviews');

        app.use('/api', authMiddleware, tenantMiddleware, competencyRouter); // 包含 /monthly-checks, /competency-stats
        app.use('/api/monthly-check-templates', authMiddleware, tenantMiddleware, monthlyCheckTemplatesRouter);
        app.use('/api/weekly-reports', authMiddleware, tenantMiddleware, weeklyReportsRouter);
        app.use('/api/quarterly-reviews', authMiddleware, tenantMiddleware, quarterlyReviewsRouter);
        app.use('/api/satisfaction-questions', authMiddleware, tenantMiddleware, quarterlyReviewsRouter);

        // Export Routes (Excel 匯出)
        const exportRouter = require('./routes/export');
        app.use('/api/export', authMiddleware, tenantMiddleware, exportRouter);

        // HR Onboarding Routes (候選人轉員工)
        const hrOnboardingRouter = require('./routes/hr-onboarding');
        app.use('/api/hr/onboarding', authMiddleware, tenantMiddleware, hrOnboardingRouter);

        // Grade Matrix Routes (職等職級矩陣)
        const gradeMatrixRouter = require('./routes/grade-matrix');
        app.use('/api/grade-matrix', authMiddleware, tenantMiddleware, gradeMatrixRouter);

        // Job Descriptions (職務說明書)
        const jobDescriptionsRouter = require('./routes/job-descriptions');
        app.use('/api/job-descriptions', authMiddleware, tenantMiddleware, jobDescriptionsRouter);

        // Competency Management Routes (職能基準庫管理)
        const competencyManagementRouter = require('./routes/competency-management');
        app.use('/api/competency-mgmt', authMiddleware, tenantMiddleware, competencyManagementRouter);

        // Organization Management Routes (組織管理)
        const organizationRouter = require('./routes/organization');
        app.use('/api/organization', authMiddleware, tenantMiddleware, organizationRouter);

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
