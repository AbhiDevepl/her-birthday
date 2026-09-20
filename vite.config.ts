import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import { parse as parseUrl } from 'node:url';

function vercelServerlessDevPlugin(): Plugin {
  return {
    name: 'vercel-serverless-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const parsed = parseUrl(req.url || '', true);
        const pathname = parsed.pathname || '';

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        try {
          let handlerModule: any = null;

          if (pathname === '/api/health') {
            handlerModule = await import('./api/health');
          } else if (pathname === '/api/visitors') {
            handlerModule = await import('./api/visitors');
          } else if (pathname === '/api/reverse-geocode') {
            handlerModule = await import('./api/reverse-geocode');
          } else if (pathname === '/api/admin/login') {
            handlerModule = await import('./api/admin/login');
          } else if (pathname === '/api/admin/logout') {
            handlerModule = await import('./api/admin/logout');
          } else if (pathname === '/api/admin/me') {
            handlerModule = await import('./api/admin/me');
          } else if (pathname === '/api/admin/visitors') {
            handlerModule = await import('./api/admin/visitors');
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
            return;
          }

          // Augment req with query params
          (req as any).query = parsed.query;

          // Parse JSON body for mutation requests
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            try {
              (req as any).body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              (req as any).body = bodyStr;
            }
          }

          // Augment res with helper methods (status, json)
          (res as any).status = function (statusCode: number) {
            res.statusCode = statusCode;
            return res;
          };
          (res as any).json = function (data: any) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(data));
            return res;
          };

          const handler = handlerModule.default || handlerModule;
          await handler(req, res);
        } catch (err: any) {
          console.error('[DEV VERCEL API ERROR]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelServerlessDevPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
