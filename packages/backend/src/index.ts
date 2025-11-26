import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { diMiddleware, errorHandler, securityHeaders } from './middleware/index.js';
import usersRoute from './routes/users.js';
import authRoute from './routes/auth.js';
import driveRoute from './routes/drive.js';
import notesRoute from './routes/notes.js';
import reactionsRoute from './routes/reactions.js';
import followingRoute from './routes/following.js';
import actorRoute from './routes/ap/actor.js';
import webfingerRoute from './routes/ap/webfinger.js';
import inboxRoute from './routes/ap/inbox.js';
import outboxRoute from './routes/ap/outbox.js';
import followersRoute from './routes/ap/followers.js';
import followingAPRoute from './routes/ap/following.js';
import noteAPRoute from './routes/ap/note.js';
import nodeinfoRoute from './routes/ap/nodeinfo.js';
import proxyRoute from './routes/proxy.js';
import healthRoute from './routes/health.js';
import packageJson from '../../../package.json';
import { ReceivedActivitiesCleanupService } from './services/ReceivedActivitiesCleanupService.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', errorHandler);
app.use('*', securityHeaders());
app.use('*', cors());
app.use('*', diMiddleware());

// Health check routes
app.route('/health', healthRoute);

// ルートエンドポイント
app.get('/', (c) => {
  return c.json({
    name: 'Rox API',
    version: packageJson.version,
    description: 'Lightweight ActivityPub server with Misskey API compatibility',
  });
});

// APIルート
app.route('/api/users', usersRoute);
app.route('/api/auth', authRoute);
app.route('/api/drive', driveRoute);
app.route('/api/notes', notesRoute);
app.route('/api/notes/reactions', reactionsRoute);
app.route('/api/following', followingRoute);

// Media Proxy
app.route('/proxy', proxyRoute);

// ActivityPubルート
app.route('/', webfingerRoute); // /.well-known/webfinger
app.route('/', nodeinfoRoute); // /.well-known/nodeinfo, /nodeinfo/*
app.route('/users', actorRoute); // /users/:username
app.route('/', inboxRoute); // /users/:username/inbox
app.route('/users', outboxRoute); // /users/:username/outbox
app.route('/users', followersRoute); // /users/:username/followers
app.route('/users', followingAPRoute); // /users/:username/following
app.route('/', noteAPRoute); // /notes/:id

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`🚀 Rox API server starting on port ${port}`);
console.log(`📊 Database: ${process.env.DB_TYPE || 'postgres'}`);
console.log(`💾 Storage: ${process.env.STORAGE_TYPE || 'local'}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Start cleanup service for received activities
const cleanupService = new ReceivedActivitiesCleanupService({
  retentionDays: 7,
  intervalMs: 24 * 60 * 60 * 1000, // 24 hours
});
cleanupService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing cleanup service');
  cleanupService.stop();
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing cleanup service');
  cleanupService.stop();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
