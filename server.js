/* eslint-disable @typescript-eslint/no-require-imports */
// Custom HTTP server wrapper around Next.js (started by ark-shared/start.sh on the production host).
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// Bind to loopback by default: the reverse proxy (Apache/Plesk) talks to 127.0.0.1:$PORT.
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = Number(process.env.PORT) || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer(async (req, res) => {
        try {
            // Pass `true` so the query portion of the URL is parsed as well.
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    })
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, hostname, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
