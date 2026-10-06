import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const SITE_DIR = path.resolve(__dirname, '_site');
const BASE_PATH = '/Guides';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];

    // Redirect root to /Guides/
    if (reqUrl === '/' || reqUrl === '') {
        res.writeHead(302, { Location: BASE_PATH + '/' });
        res.end();
        return;
    }

    // Strip /Guides prefix
    let relativePath = reqUrl;
    if (relativePath.startsWith(BASE_PATH)) {
        relativePath = relativePath.slice(BASE_PATH.length);
    }

    if (relativePath === '' || relativePath === '/') {
        relativePath = '/index.html';
    }

    let filePath = path.join(SITE_DIR, relativePath);

    // If directory, look for index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // If file doesn't exist, try appending .html
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`\n🚀 Local server running!`);
    console.log(`- Home:            http://localhost:${PORT}/Guides/`);
    console.log(`- Allowed Content: http://localhost:${PORT}/Guides/allowed-content/`);
    console.log(`Press Ctrl+C to stop.\n`);
});
