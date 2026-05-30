import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createReadStream, existsSync, statSync } from 'node:fs';

const port = Number(process.env.PORT ?? 10000);
const distDir = resolve('dist');
const apiTarget = process.env.API_PROXY_TARGET;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function getStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const requestedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(distDir, requestedPath);

  if (!filePath.startsWith(distDir)) return null;
  if (existsSync(filePath) && statSync(filePath).isFile()) return filePath;

  return join(distDir, 'index.html');
}

async function proxyApi(req, res, url) {
  if (!apiTarget) {
    send(res, 500, 'API_PROXY_TARGET is not configured');
    return;
  }

  const targetUrl = new URL(`${url.pathname}${url.search}`, apiTarget);
  const headers = new Headers(req.headers);
  headers.set('host', targetUrl.host);
  headers.set('x-forwarded-host', req.headers.host ?? '');
  headers.set('x-forwarded-proto', 'https');
  headers.delete('connection');

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method ?? '') ? undefined : req,
    duplex: 'half',
  });

  res.writeHead(response.status, Object.fromEntries(response.headers));

  if (response.body) {
    for await (const chunk of response.body) {
      res.write(chunk);
    }
  }

  res.end();
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      await proxyApi(req, res, url);
      return;
    }

    const filePath = getStaticPath(url.pathname);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }

    const extension = extname(filePath);
    res.writeHead(200, {
      'content-type': mimeTypes[extension] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    send(res, 500, 'Internal Server Error');
  }
}).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
