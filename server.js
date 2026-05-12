/**
 * server.js — Local development server for Patelwadi Ganesh Mitramandal
 *
 * Serves the static site files AND provides:
 *   POST /api/submit-passbook  — accepts { name, amount, userId, submittedAt }
 *   GET  /api/receipts         — lists all submitted receipts
 *
 * Run:  node server.js
 * URL:  http://localhost:3000
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const url     = require('url');

const PORT          = 3000;
const RECEIPTS_FILE = path.join(__dirname, 'receipts.json');
const UPLOADS_DIR   = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('📁 Created uploads/ directory');
}

// ─── In-memory receipt store ────────────────────────────────────────────────
let receipts = [];

// Load existing receipts from disk (if any)
if (fs.existsSync(RECEIPTS_FILE)) {
    try {
        receipts = JSON.parse(fs.readFileSync(RECEIPTS_FILE, 'utf8'));
        console.log(`📂 Loaded ${receipts.length} existing receipt(s) from receipts.json`);
    } catch (e) {
        console.warn('⚠️  Could not parse receipts.json — starting fresh.');
    }
}

function saveReceipts() {
    fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(receipts, null, 2), 'utf8');
}

// ─── MIME type map ───────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html',
    '.css' : 'text/css',
    '.js'  : 'text/javascript',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf' : 'application/pdf',
    '.ico' : 'image/x-icon',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sendJSON(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type' : 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end',  ()    => {
            try { resolve(JSON.parse(raw)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

/**
 * Read raw request body as a Buffer (needed for binary file data).
 */
function readRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end',  ()    => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/**
 * Pure-Node multipart/form-data parser.
 * Returns an array of: { name, filename, contentType, data (Buffer) }
 */
function parseMultipart(bodyBuffer, boundary) {
    const parts = [];
    const boundaryBuf  = Buffer.from('--' + boundary);
    const CRLF         = Buffer.from('\r\n');
    const CRLFCRLF     = Buffer.from('\r\n\r\n');

    let pos = bodyBuffer.indexOf(boundaryBuf);
    if (pos === -1) return parts;

    while (true) {
        pos += boundaryBuf.length;          // move past boundary marker

        // Check for final boundary (ends with '--')
        if (bodyBuffer[pos] === 0x2D && bodyBuffer[pos + 1] === 0x2D) break;

        // Skip the \r\n after the boundary line
        if (bodyBuffer[pos] === 0x0D && bodyBuffer[pos + 1] === 0x0A) pos += 2;

        // Find the header/body separator (\r\n\r\n)
        const headerEnd = bodyBuffer.indexOf(CRLFCRLF, pos);
        if (headerEnd === -1) break;

        const headerStr = bodyBuffer.slice(pos, headerEnd).toString('utf8');
        pos = headerEnd + 4;                // skip \r\n\r\n

        // Find the next boundary
        const nextBoundary = bodyBuffer.indexOf(boundaryBuf, pos);
        if (nextBoundary === -1) break;

        // Part data ends 2 bytes before the next boundary (trailing \r\n)
        const dataEnd = nextBoundary - 2;
        const data    = bodyBuffer.slice(pos, dataEnd);
        pos           = nextBoundary;

        // Parse headers
        const nameMatch     = headerStr.match(/name="([^"]+)"/i);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
        const ctMatch       = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

        parts.push({
            name       : nameMatch        ? nameMatch[1]        : null,
            filename   : filenameMatch    ? filenameMatch[1]    : null,
            contentType: ctMatch          ? ctMatch[1].trim()   : 'application/octet-stream',
            data,
        });
    }
    return parts;
}

// ─── Server ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsed  = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // CORS pre-flight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
        });
        return res.end();
    }

    // ── POST /api/submit-passbook ──────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/submit-passbook') {
        try {
            const body = await readBody(req);
            const { name, amount, userId, submittedAt } = body;

            // Validate required fields
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return sendJSON(res, 400, { message: 'Donor name is required.' });
            }
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                return sendJSON(res, 400, { message: 'A positive donation amount is required.' });
            }

            // Build receipt record
            const receipt = {
                receiptId  : `RCP-${Date.now()}`,
                name       : name.trim(),
                amount     : Number(amount),
                userId     : userId || null,
                submittedAt: submittedAt || new Date().toISOString(),
                status     : 'pending_review',
            };

            receipts.push(receipt);
            saveReceipts();

            console.log(`✅ Receipt saved: ${receipt.receiptId} | ${receipt.name} | ₹${receipt.amount}`);
            return sendJSON(res, 200, {
                success  : true,
                receiptId: receipt.receiptId,
                message  : 'Receipt submitted successfully.',
            });

        } catch (err) {
            console.error('Receipt submission error:', err.message);
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── GET /api/receipts ─────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/receipts') {
        return sendJSON(res, 200, { receipts });
    }

    // ── PUT /api/receipts/:id  (edit a record) ───────────────────────
    if (req.method === 'PUT' && pathname.startsWith('/api/receipts/')) {
        const id  = decodeURIComponent(pathname.replace('/api/receipts/', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        try {
            const body = await readBody(req);
            if (body.name   !== undefined) receipts[idx].name   = String(body.name).trim();
            if (body.amount !== undefined) receipts[idx].amount = Number(body.amount);
            if (body.status !== undefined) receipts[idx].status = String(body.status);
            if (body.passbookFile !== undefined) {
                receipts[idx].passbookFile = body.passbookFile;
                receipts[idx].passbookUrl  = body.passbookFile ? `/uploads/${body.passbookFile}` : null;
            }
            receipts[idx].updatedAt = new Date().toISOString();
            saveReceipts();
            console.log(`✏️  Receipt updated: ${receipts[idx].receiptId}`);
            return sendJSON(res, 200, { success: true, receipt: receipts[idx] });
        } catch (err) {
            return sendJSON(res, 400, { message: err.message || 'Bad request.' });
        }
    }

    // ── DELETE /api/receipts/:id ────────────────────────────────────
    if (req.method === 'DELETE' && pathname.startsWith('/api/receipts/')) {
        const id  = decodeURIComponent(pathname.replace('/api/receipts/', ''));
        const idx = receipts.findIndex(r => r.receiptId === id);
        if (idx === -1) return sendJSON(res, 404, { message: 'Receipt not found.' });
        const [removed] = receipts.splice(idx, 1);
        saveReceipts();
        console.log(`🗑️  Receipt deleted: ${removed.receiptId}`);
        return sendJSON(res, 200, { success: true });
    }

    // ── POST /api/upload-passbook ─────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/upload-passbook') {
        try {
            const contentType = req.headers['content-type'] || '';
            const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
            if (!boundaryMatch) {
                return sendJSON(res, 400, { message: 'Missing multipart boundary.' });
            }
            const boundary = boundaryMatch[1].trim();

            const rawBody = await readRawBody(req);
            const parts   = parseMultipart(rawBody, boundary);

            // Find the file part (field name: 'passbook')
            const filePart = parts.find(p => p.name === 'passbook' && p.filename);
            if (!filePart) {
                return sendJSON(res, 400, { message: 'No file received. Please select a passbook file.' });
            }

            // Validate size (5 MB)
            if (filePart.data.length > 5 * 1024 * 1024) {
                return sendJSON(res, 400, { message: 'File exceeds the 5 MB limit.' });
            }

            // Sanitise filename and make it unique
            const safeName   = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniqueName = `${Date.now()}_${safeName}`;
            const savePath   = path.join(UPLOADS_DIR, uniqueName);

            fs.writeFileSync(savePath, filePart.data);
            console.log(`📎 File saved: uploads/${uniqueName} (${(filePart.data.length / 1024).toFixed(1)} KB)`);

            // Link to receipt if receiptId was supplied as a form field
            const receiptIdPart = parts.find(p => p.name === 'receiptId' && !p.filename);
            const receiptId     = receiptIdPart ? receiptIdPart.data.toString('utf8').trim() : null;
            let linkedReceiptId = null;
            if (receiptId) {
                const idx = receipts.findIndex(r => r.receiptId === receiptId);
                if (idx !== -1) {
                    receipts[idx].passbookFile = uniqueName;
                    receipts[idx].passbookUrl  = `/uploads/${uniqueName}`;
                    receipts[idx].updatedAt    = new Date().toISOString();
                    saveReceipts();
                    linkedReceiptId = receiptId;
                    console.log(`🔗 Passbook linked to receipt: ${receiptId}`);
                }
            }

            return sendJSON(res, 200, {
                success         : true,
                fileName        : uniqueName,
                size            : filePart.data.length,
                linkedReceiptId : linkedReceiptId,
                message         : 'File uploaded successfully.',
            });
        } catch (err) {
            console.error('File upload error:', err.message);
            return sendJSON(res, 500, { message: 'Server error during upload: ' + err.message });
        }
    }

    // ── GET /api/uploads ─────────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/uploads') {
        try {
            const files = fs.readdirSync(UPLOADS_DIR).map(name => {
                const stat = fs.statSync(path.join(UPLOADS_DIR, name));
                return { name, size: stat.size, uploadedAt: stat.mtime };
            });
            return sendJSON(res, 200, { files });
        } catch (err) {
            return sendJSON(res, 500, { message: 'Could not list uploads.' });
        }
    }

    // ── Static file serving ───────────────────────────────────────────────
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Try appending .html
            const withHtml = filePath + '.html';
            fs.readFile(withHtml, (err2, data2) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('404 Not Found');
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data2);
            });
            return;
        }

        const ext      = path.extname(filePath).toLowerCase();
        const mimeType = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('🕉️  Patelwadi Ganesh Mitramandal — Local Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐  Site:        http://localhost:${PORT}`);
    console.log(`📋  GET receipts: http://localhost:${PORT}/api/receipts`);
    console.log(`📬  POST receipt: http://localhost:${PORT}/api/submit-passbook`);
    console.log(`✏️   PUT receipt:  http://localhost:${PORT}/api/receipts/:id`);
    console.log(`🗑️   DEL receipt:  http://localhost:${PORT}/api/receipts/:id`);
    console.log(`📎  POST upload:  http://localhost:${PORT}/api/upload-passbook`);
    console.log(`🗂️   GET uploads:  http://localhost:${PORT}/api/uploads`);
    console.log(`💾  Files dir:   ${UPLOADS_DIR}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
});
