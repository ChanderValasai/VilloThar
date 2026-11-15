import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { env } from './server/src/config/env.ts';
import { readDb } from './server/src/models/database.ts';
import { adminRoutes } from './server/src/routes/adminRoutes.ts';
import { authRoutes } from './server/src/routes/authRoutes.ts';
import { captiveRoutes } from './server/src/routes/captiveRoutes.ts';
import { customerRoutes } from './server/src/routes/customerRoutes.ts';
import { publicRoutes } from './server/src/routes/publicRoutes.ts';

async function startServer() {
  // Ensure database baseline is initialized on startup
  await readDb();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'villothar-platform', timestamp: new Date().toISOString() });
  });

  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/captive', captiveRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (env.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`VilloThar server listening on http://0.0.0.0:${env.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VilloThar server:', err);
  process.exit(1);
});
