const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const DRAIN_MS = 3000;
let shuttingDown = false;
let server;

const JWT_PUBLIC_KEY = (process.env.USERNODE_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');
const APP_AUDIENCE = process.env.USERNODE_APP_ID
  ? `usernode:app:${process.env.USERNODE_APP_ID}`
  : null;
const PUBLIC_API_PATHS = new Set(['/health']);
const PLATFORM_ORIGIN = (process.env.USERNODE_PLATFORM_ORIGIN || 'https://my.onhomeroom.com')
  .replace(/\/+$/, '');

app.use(express.json());

// In production the platform edge serves these files. This proxy keeps the
// same relative paths working when the app runs directly with Node.
app.get(/^\/usernode-(?:bridge|native|tailwind)\//, async (req, res) => {
  try {
    const upstream = await fetch(PLATFORM_ORIGIN + req.path);
    if (!upstream.ok) return res.sendStatus(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.type(type);
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.warn(`Hosted asset fetch failed: ${error.message}`);
    return res.sendStatus(502);
  }
});

app.use((req, res, next) => {
  const token = req.query.token || req.headers['x-usernode-token'];
  if (token && JWT_PUBLIC_KEY && APP_AUDIENCE) {
    try {
      const claims = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'usernode',
        audience: APP_AUDIENCE,
      });
      if (claims && claims.pur === 'iframe') req.user = claims;
    } catch {
      // Invalid or expired tokens fall through to the normal auth response.
    }
  }

  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.has(req.path)) return next();
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  }
  return next();
});

app.get('/health', (_req, res) => {
  res.status(shuttingDown ? 503 : 200).json({ status: shuttingDown ? 'draining' : 'ok' });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('*', (req, res) => {
  if (!req.user) {
    const deepPath = /^\/[A-Za-z0-9\-._~!$&()*+,;=:@\/%?]*$/.test(req.originalUrl)
      ? `?path=${encodeURIComponent(req.originalUrl)}`
      : '';
    if (req.get('sec-fetch-dest') === 'document') {
      return res.redirect(302, `${PLATFORM_ORIGIN}/app/pourover-coffee-51aef8/full${deepPath}`);
    }
    return res.status(401).send(`<!doctype html><meta charset=utf-8><title>Open in Homeroom</title>
<body style="font-family:system-ui;background:#2c211a;color:#f4efe6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="max-width:24rem;padding:2rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.5rem">Open Pourover Coffee inside Homeroom</h1>
    <p style="color:#cbb9a9;font-size:0.9rem;margin:0 0 1.25rem">Homeroom securely signs you in before opening the recipe timer.</p>
    <a href="${PLATFORM_ORIGIN}/app/pourover-coffee-51aef8/full${deepPath}" style="display:inline-block;padding:0.65rem 1rem;background:#b95332;color:white;border-radius:999px;text-decoration:none;font-size:0.9rem">Open in Homeroom</a>
  </div>
</body>`);
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining`);
  await new Promise((resolve) => {
    const deadline = setTimeout(() => {
      server.closeAllConnections?.();
      resolve();
    }, DRAIN_MS);
    deadline.unref?.();
    server.close(() => {
      clearTimeout(deadline);
      resolve();
    });
    server.closeIdleConnections?.();
  });
  process.exit(0);
}

server = app.listen(port, () => console.log(`Listening on :${port}`));
server.keepAliveTimeout = 75_000;

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
