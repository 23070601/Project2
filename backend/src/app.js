const express = require('express');
const path = require('path'); // THÊM DÒNG NÀY
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const classroomsRoutes = require('./modules/classrooms/classrooms.routes');
const assetsRoutes = require('./modules/assets/assets.routes');
const faultReportsRoutes = require('./modules/faultReports/faultReports.routes');
const workOrdersRoutes = require('./modules/workOrders/workOrders.routes');
const confirmationsRoutes = require('./modules/confirmations/confirmations.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const qrcodesRoutes = require('./modules/qrcodes/qrcodes.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const { normalizeRequestBody } = require('./shared/utils/requestNormalizer');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email', 'X-User-Role'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Email', 'X-User-Role', 'x-user-role', 'x-user-id', 'x-user-email'],
}));
app.use(express.json({ limit: '5mb' }));
app.use(normalizeRequestBody);
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// THÊM DÒNG NÀY ĐỂ SERVE FILE UPLOADS
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend static files (cho QR code scan)
app.use('/frontend', express.static(path.join(__dirname, '../../frontend')));

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Toàn bộ API prefix bằng /api/v1 để tách bạch version cho sau này
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/classrooms`, classroomsRoutes);
app.use(`${API_PREFIX}/assets`, assetsRoutes);
app.use(`${API_PREFIX}/fault-reports`, faultReportsRoutes);
app.use(`${API_PREFIX}/work-orders`, workOrdersRoutes);
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/workOrders', workOrdersRoutes);
app.use(`${API_PREFIX}/confirmations`, confirmationsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/qrcodes`, qrcodesRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;