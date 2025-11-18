import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { diMiddleware, errorHandler } from './middleware/index.js';

const app = new Hono();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', errorHandler);
app.use('*', cors());
app.use('*', diMiddleware());

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// ルートエンドポイント
app.get('/', (c) => {
  return c.json({
    name: 'Rox API',
    version: '0.1.0',
    description: 'Lightweight ActivityPub server with Misskey API compatibility',
  });
});

// TODO: Phase 1でAPIルートを追加
// app.route('/api', apiRoutes);

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Rox API server starting on port ${port}`);
console.log(`📊 Database: ${process.env.DB_TYPE || 'postgres'}`);
console.log(`💾 Storage: ${process.env.STORAGE_TYPE || 'local'}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

export default {
  port,
  fetch: app.fetch,
};
