import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(value => value.replace(/^--/, '').split('=')));
const root = resolve(args.root || fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(args.port || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    let info = await stat(target);
    if (info.isDirectory()) { target = resolve(target, 'index.html'); info = await stat(target); }
    if (!info.isFile()) { response.writeHead(404).end('Not found'); return; }
    const headers = { 'Content-Type': mime[extname(target).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0, end = info.size - 1, status = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      if (!range[1]) { start = Math.max(0, info.size - Number(range[2])); }
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (start > end || start >= info.size) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = info.size ? end - start + 1 : 0;
    response.writeHead(status, headers);
    if (request.method === 'HEAD' || !info.size) { response.end(); return; }
    const stream = createReadStream(target, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}\nRoot: ${root}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
