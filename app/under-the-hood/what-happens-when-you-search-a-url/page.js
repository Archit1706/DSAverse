"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Globe, Shield, Server, Monitor, CheckCircle, XCircle, ChevronRight,
    Lock, Wifi, Database, Layers,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Parse URL',  icon: Globe   },
    { id: 2, label: 'DNS',        icon: Globe   },
    { id: 3, label: 'TCP',        icon: Wifi    },
    { id: 4, label: 'TLS',        icon: Lock    },
    { id: 5, label: 'HTTP Req',   icon: ChevronRight },
    { id: 6, label: 'Server',     icon: Server  },
    { id: 7, label: 'HTTP Res',   icon: Monitor },
    { id: 8, label: 'Render',     icon: Layers  },
];

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];

    // ═══ ACT 1: Parse URL ═══
    steps.push({
        act: 1, actName: 'Browser Parses URL', phase: 'url_breakdown',
        urlParts: [
            { text: 'https', label: 'Scheme', desc: 'Encrypted HTTP (TLS)', color: 'blue'   },
            { text: '://',   label: null,      desc: null,                  color: 'slate'  },
            { text: 'example.com', label: 'Host',  desc: 'Domain name',    color: 'green'  },
            { text: '/search',     label: 'Path',  desc: 'Resource path',  color: 'orange' },
            { text: '?q=hello',    label: 'Query', desc: 'Query string',   color: 'purple' },
        ],
        explanation: 'The browser starts by parsing the URL into structural components: scheme (https — meaning TLS-encrypted), host (example.com — who to connect to), path (/search — what resource), and query string (?q=hello — parameters). The scheme also tells the browser which port to use by default (443 for https).',
    });

    steps.push({
        act: 1, actName: 'Browser Parses URL', phase: 'cache_check',
        caches: [
            { name: 'Memory Cache',   time: '~0ms',     status: 'miss', desc: 'In-RAM, fastest. Cleared on tab close.' },
            { name: 'Disk Cache',     time: '~5ms',     status: 'miss', desc: 'HTTP cache on disk. Survives restarts.' },
            { name: 'Service Worker', time: 'varies',   status: 'miss', desc: 'App-level cache. Not registered here.' },
            { name: 'Network',        time: '100–500ms', status: 'next', desc: 'All caches miss — must go to the network.' },
        ],
        explanation: 'Before any network request, the browser checks caches in order from fastest to slowest. A memory cache hit returns in <1ms; a network fetch takes 100–500ms. On a first visit all caches miss, so we proceed to DNS resolution.',
    });

    // ═══ ACT 2: DNS ═══
    const dnsHopData = [
        { id: 'browser', label: 'Browser DNS Cache', sub: 'Built-in browser cache', status: 'miss',
          expl: 'Chrome and Firefox maintain their own DNS cache separate from the OS. Recently visited domains are stored here until their TTL (time-to-live) expires. No entry for example.com — miss.' },
        { id: 'os',      label: 'OS DNS Cache',       sub: 'DNS Client service',     status: 'miss',
          expl: 'The operating system maintains a system-wide DNS cache shared across all apps. On Windows this is the DNS Client service; on macOS, mDNSResponder. Still no match — miss.' },
        { id: 'resolver',label: 'Recursive Resolver', sub: '8.8.8.8 (Google DNS)',   status: 'querying',
          expl: 'The OS asks the configured recursive resolver — usually your ISP\'s server or a public one like Google (8.8.8.8) or Cloudflare (1.1.1.1). This resolver has its own cache and does the heavy lifting of finding the answer.' },
        { id: 'root',    label: 'Root Nameserver',    sub: 'a.root-servers.net (.)',  status: 'querying',
          expl: 'The recursive resolver contacts a Root Nameserver. There are 13 root server addresses globally (a-m.root-servers.net), operated by ICANN and other organizations. They don\'t know example.com\'s IP, but they know which servers manage .com.' },
        { id: 'tld',     label: 'TLD Nameserver',     sub: '.com — Verisign',         status: 'querying',
          expl: 'The .com TLD (top-level domain) nameserver, operated by Verisign, handles all .com domains. It doesn\'t have example.com\'s IP address either, but it knows the authoritative nameservers for the example.com zone.' },
        { id: 'auth',    label: 'Authoritative NS',   sub: 'ns1.example.com',         status: 'found',
          expl: 'The authoritative nameserver is the definitive source for example.com\'s DNS records. It returns the A record: example.com → 93.184.216.34. This answer is now cached at every hop with the record\'s TTL.' },
        { id: 'result',  label: 'IP Address Resolved', sub: '93.184.216.34',          status: 'complete',
          expl: 'DNS resolution complete. IP 93.184.216.34 is returned and cached at every level (browser, OS, resolver) with a TTL typically between 300s and 86400s. Total DNS time for an uncached lookup: 50–200ms — before a single byte of HTTP data moves.' },
    ];

    dnsHopData.forEach((hop, i) => {
        steps.push({
            act: 2, actName: 'DNS Resolution', phase: `dns_${i + 1}`,
            hops: dnsHopData.slice(0, i + 1).map(h => ({ id: h.id, label: h.label, sub: h.sub, status: h.status })),
            explanation: hop.expl,
        });
    });

    // ═══ ACT 3: TCP Handshake ═══
    const tcpStepData = [
        {
            packets: [{ dir: 'c2s', label: 'SYN', detail: 'seq=0',         color: 'blue',  active: true  }],
            connected: false,
            expl: 'The client sends a SYN (synchronize) packet to 93.184.216.34:443. This tells the server the client wants to open a connection and shares the client\'s starting sequence number (ISN = 0 here). The client enters SYN_SENT state.',
        },
        {
            packets: [
                { dir: 'c2s', label: 'SYN',     detail: 'seq=0',         color: 'blue',  active: false },
                { dir: 's2c', label: 'SYN-ACK', detail: 'seq=0, ack=1',  color: 'green', active: true  },
            ],
            connected: false,
            expl: 'The server receives SYN and replies with SYN-ACK: it acknowledges the client\'s sequence (ack=client_seq+1=1) and sends its own starting sequence number. The server enters SYN_RECEIVED state. This packet proves the server received our SYN.',
        },
        {
            packets: [
                { dir: 'c2s', label: 'SYN',     detail: 'seq=0',         color: 'blue',  active: false },
                { dir: 's2c', label: 'SYN-ACK', detail: 'seq=0, ack=1',  color: 'green', active: false },
                { dir: 'c2s', label: 'ACK',     detail: 'ack=1',         color: 'blue',  active: true  },
            ],
            connected: false,
            expl: 'The client acknowledges the server\'s sequence number with an ACK packet. Both sides have now proven they can send and receive. Sequence numbers are synchronized. This three-way design ensures both directions of the channel are verified before any data flows.',
        },
        {
            packets: [
                { dir: 'c2s', label: 'SYN',     detail: 'seq=0',         color: 'blue',  active: false },
                { dir: 's2c', label: 'SYN-ACK', detail: 'seq=0, ack=1',  color: 'green', active: false },
                { dir: 'c2s', label: 'ACK',     detail: 'ack=1',         color: 'blue',  active: false },
            ],
            connected: true,
            expl: 'TCP connection established. Both client and server are in ESTABLISHED state with synchronized sequence numbers. Typical round-trip time: ~20ms to a nearby CDN PoP, ~150ms across continents. This adds latency before any HTTP data can flow — one reason HTTP/3 over QUIC was invented.',
        },
    ];

    tcpStepData.forEach((s, i) => {
        steps.push({ act: 3, actName: 'TCP Handshake', phase: `tcp_${i + 1}`, packets: s.packets, connected: s.connected, explanation: s.expl });
    });

    // ═══ ACT 4: TLS Handshake ═══
    const tlsStepData = [
        {
            phase: 'client_hello',
            messages: [{ dir: 'c2s', label: 'Client Hello', detail: 'TLS 1.3 · cipher suites · random nonce · SNI', color: 'blue', active: true }],
            certChain: null, dhViz: null, encrypted: false,
            expl: 'The client sends a Client Hello: TLS version (1.3), a list of cipher suites it supports (e.g., AES-256-GCM-SHA384), a random nonce, and SNI (Server Name Indication) so the server knows which certificate to serve. SNI is why one IP can host thousands of HTTPS sites.',
        },
        {
            phase: 'server_hello',
            messages: [
                { dir: 'c2s', label: 'Client Hello', detail: 'TLS 1.3 · cipher suites · SNI', color: 'blue', active: false },
                { dir: 's2c', label: 'Server Hello + Certificate', detail: 'Chosen cipher · X.509 cert · DH key share', color: 'green', active: true },
            ],
            certChain: null, dhViz: null, encrypted: false,
            expl: 'The server replies with: chosen cipher suite (TLS_AES_256_GCM_SHA384), its X.509 certificate, and its Diffie-Hellman key share. In TLS 1.3, the server sends all of this in a single flight — already saving a round trip vs TLS 1.2.',
        },
        {
            phase: 'cert_validation',
            messages: [
                { dir: 'c2s', label: 'Client Hello', detail: '', color: 'blue', active: false },
                { dir: 's2c', label: 'Server Hello + Cert', detail: '', color: 'green', active: false },
            ],
            certChain: [
                { label: 'example.com', sub: 'End-entity certificate', valid: true, leaf: true },
                { label: 'DigiCert TLS RSA SHA256', sub: 'Intermediate CA', valid: true },
                { label: 'DigiCert Global Root CA', sub: 'Root CA — trusted by browser', valid: true, root: true },
            ],
            dhViz: null, encrypted: false,
            expl: 'The browser validates the certificate chain. The server\'s certificate must be signed by an intermediate CA, which must be signed by a root CA in the browser\'s built-in trust store (~150 trusted roots). Each signature is cryptographically verified. If any link is invalid, the connection aborts with ERR_CERT_AUTHORITY_INVALID.',
        },
        {
            phase: 'key_exchange',
            messages: [
                { dir: 'c2s', label: 'Client Hello', detail: '', color: 'blue', active: false },
                { dir: 's2c', label: 'Server Hello + Cert', detail: '', color: 'green', active: false },
                { dir: 'c2s', label: 'Client Finished', detail: 'DH key share · verify data', color: 'blue', active: true },
            ],
            certChain: null,
            dhViz: {
                clientPriv: '#3b82f6', serverPriv: '#10b981', shared: '#8b5cf6',
                label: 'DH Key Exchange — the paint mixing analogy',
            },
            encrypted: false,
            expl: 'Diffie-Hellman key exchange: both sides exchanged public DH key shares in the Hello messages. Each side combines their private key with the other\'s public share to derive the same shared secret — without ever transmitting the secret over the wire. Like mixing paint: public colors are shared, private colors stay hidden, yet both end up with the same final color.',
        },
        {
            phase: 'encrypted',
            messages: [
                { dir: 'c2s', label: 'Client Hello', detail: '', color: 'blue', active: false },
                { dir: 's2c', label: 'Server Hello + Cert', detail: '', color: 'green', active: false },
                { dir: 'c2s', label: 'Client Finished', detail: 'DH key share', color: 'blue', active: false },
                { dir: 's2c', label: 'Server Finished', detail: '1 round trip total ✓', color: 'green', active: false },
            ],
            certChain: null, dhViz: null, encrypted: true,
            expl: 'TLS 1.3 handshake complete in just 1 round trip (TLS 1.2 needed 2). Session keys are derived from the DH shared secret + both random nonces. All subsequent data is encrypted with AES-256-GCM — an AEAD cipher that provides both encryption and integrity. The browser padlock is now active.',
        },
    ];

    tlsStepData.forEach((s) => {
        steps.push({ act: 4, actName: 'TLS Handshake', ...s, explanation: s.expl });
    });

    // ═══ ACT 5: HTTP Request ═══
    steps.push({
        act: 5, actName: 'HTTP Request', phase: 'request_line',
        lines: [
            { type: 'method', text: 'GET /search?q=hello HTTP/1.1', comment: 'method  path+query  version' },
        ],
        explanation: 'The HTTP request starts with the request line: GET (retrieving a resource — no body), the path and query string, and the HTTP version. HTTP/1.1 means persistent connections and chunked transfer. For HTTPS with a modern browser, HTTP/2 or HTTP/3 is more likely, but the semantics are the same.',
    });

    steps.push({
        act: 5, actName: 'HTTP Request', phase: 'headers',
        lines: [
            { type: 'method',  text: 'GET /search?q=hello HTTP/1.1', comment: '' },
            { type: 'header',  key: 'Host',            value: 'example.com',               comment: 'Required for virtual hosting' },
            { type: 'header',  key: 'Accept',           value: 'text/html,application/xhtml+xml', comment: 'Preferred content types' },
            { type: 'header',  key: 'Accept-Encoding',  value: 'gzip, deflate, br',         comment: 'Compression algorithms supported' },
            { type: 'header',  key: 'Accept-Language',  value: 'en-US,en;q=0.9',            comment: 'Language preference' },
            { type: 'header',  key: 'User-Agent',       value: 'Mozilla/5.0 (Chrome/120)',  comment: 'Browser identification' },
            { type: 'header',  key: 'Cookie',           value: 'session=abc123; pref=dark', comment: 'Session state' },
            { type: 'header',  key: 'Connection',       value: 'keep-alive',                comment: 'Reuse TCP connection' },
        ],
        explanation: 'Request headers provide context the server needs: Host is required (one server IP can serve thousands of domains), Accept tells the server what formats the browser understands, Cookie carries session tokens, and Connection: keep-alive allows the TCP connection to be reused for subsequent requests.',
    });

    steps.push({
        act: 5, actName: 'HTTP Request', phase: 'sent',
        lines: [
            { type: 'method',    text: 'GET /search?q=hello HTTP/1.1', comment: '' },
            { type: 'header',    key: 'Host',           value: 'example.com'    },
            { type: 'header',    key: 'Accept-Encoding',value: 'gzip, deflate, br' },
            { type: 'header',    key: 'Cookie',          value: 'session=abc123' },
            { type: 'separator', text: '(blank line — end of headers, no body for GET)' },
        ],
        sent: true,
        explanation: 'The complete request is sent through the encrypted TLS tunnel as a stream of TCP segments. The blank line after headers signals the end of the request. Data travels across IP packets through routers to 93.184.216.34 — each router inspects only the IP header, not the encrypted content inside.',
    });

    // ═══ ACT 6: Server Processing ═══
    const serverStepData = [
        {
            active: 'cdn',
            nodes: [
                { id: 'cdn', label: 'CDN Edge',      sub: 'London PoP',       color: 'cyan',   state: 'active' },
                { id: 'lb',  label: 'Load Balancer', sub: 'HAProxy',          color: 'blue',   state: 'waiting' },
                { id: 'web', label: 'Web Server',    sub: 'nginx 1.25',       color: 'green',  state: 'waiting' },
                { id: 'app', label: 'App Server',    sub: 'Node.js 20',       color: 'yellow', state: 'waiting' },
                { id: 'db',  label: 'Database',      sub: 'PostgreSQL 16',    color: 'orange', state: 'waiting' },
            ],
            expl: 'The request arrives at the nearest CDN (Content Delivery Network) edge node — in this case a London PoP (Point of Presence) just 5ms away. CDNs cache static and dynamic responses. On cache hit, the response returns immediately without touching the origin servers. On miss, the request is forwarded.',
        },
        {
            active: 'lb',
            nodes: [
                { id: 'cdn', label: 'CDN Edge',      sub: 'London PoP',       color: 'cyan',   state: 'done' },
                { id: 'lb',  label: 'Load Balancer', sub: 'HAProxy',          color: 'blue',   state: 'active' },
                { id: 'web', label: 'Web Server',    sub: 'nginx 1.25',       color: 'green',  state: 'waiting' },
                { id: 'app', label: 'App Server',    sub: 'Node.js 20',       color: 'yellow', state: 'waiting' },
                { id: 'db',  label: 'Database',      sub: 'PostgreSQL 16',    color: 'orange', state: 'waiting' },
            ],
            expl: 'CDN cache miss — the request reaches the load balancer at the origin. It distributes incoming requests across multiple web servers using algorithms like least-connections or round-robin. The load balancer also handles health checks — it stops routing to unhealthy servers automatically.',
        },
        {
            active: 'web',
            nodes: [
                { id: 'cdn', label: 'CDN Edge',      sub: 'London PoP',       color: 'cyan',   state: 'done' },
                { id: 'lb',  label: 'Load Balancer', sub: 'HAProxy',          color: 'blue',   state: 'done' },
                { id: 'web', label: 'Web Server',    sub: 'nginx 1.25',       color: 'green',  state: 'active' },
                { id: 'app', label: 'App Server',    sub: 'Node.js 20',       color: 'yellow', state: 'waiting' },
                { id: 'db',  label: 'Database',      sub: 'PostgreSQL 16',    color: 'orange', state: 'waiting' },
            ],
            expl: 'nginx receives the request. For static assets (images, CSS, JS), nginx serves directly from disk in microseconds. For dynamic requests like /search, nginx acts as a reverse proxy — forwarding to the application server. nginx also handles SSL termination, gzip compression, rate limiting, and connection pooling.',
        },
        {
            active: 'app',
            nodes: [
                { id: 'cdn', label: 'CDN Edge',      sub: 'London PoP',       color: 'cyan',   state: 'done' },
                { id: 'lb',  label: 'Load Balancer', sub: 'HAProxy',          color: 'blue',   state: 'done' },
                { id: 'web', label: 'Web Server',    sub: 'nginx 1.25',       color: 'green',  state: 'done' },
                { id: 'app', label: 'App Server',    sub: 'Node.js 20',       color: 'yellow', state: 'active' },
                { id: 'db',  label: 'Database',      sub: 'PostgreSQL 16',    color: 'orange', state: 'waiting' },
            ],
            expl: 'The Node.js app server executes business logic: authenticates the session cookie, validates the query parameter (sanitizes against SQL injection), then queries the database. Node.js is single-threaded but non-blocking — while waiting for the DB it can process other requests via the event loop.',
        },
        {
            active: 'db',
            nodes: [
                { id: 'cdn', label: 'CDN Edge',      sub: 'London PoP',       color: 'cyan',   state: 'done' },
                { id: 'lb',  label: 'Load Balancer', sub: 'HAProxy',          color: 'blue',   state: 'done' },
                { id: 'web', label: 'Web Server',    sub: 'nginx 1.25',       color: 'green',  state: 'done' },
                { id: 'app', label: 'App Server',    sub: 'Node.js 20',       color: 'yellow', state: 'done' },
                { id: 'db',  label: 'Database',      sub: 'PostgreSQL 16',    color: 'orange', state: 'active' },
            ],
            dbQuery: "SELECT id, title, url FROM pages WHERE to_tsvector(content) @@ plainto_tsquery('hello') LIMIT 10;",
            indexHit: true,
            expl: 'PostgreSQL executes the full-text search query using a GIN index on the content vector — returning 10 rows in ~1ms. Without the index, a sequential scan of 10M rows would take ~10 seconds. The query planner chose the index because the indexed column is selective enough to make the random I/O worthwhile.',
        },
    ];

    serverStepData.forEach((s, i) => {
        steps.push({ act: 6, actName: 'Server Processing', phase: `server_${i + 1}`, nodes: s.nodes, dbQuery: s.dbQuery || null, indexHit: s.indexHit || false, explanation: s.expl });
    });

    // ═══ ACT 7: HTTP Response ═══
    steps.push({
        act: 7, actName: 'HTTP Response', phase: 'status',
        statusCode: 200, statusText: 'OK',
        lines: [{ type: 'status', text: 'HTTP/1.1 200 OK' }],
        explanation: 'The server sends the response starting with the status line. 200 OK means the request succeeded and the body contains the requested resource. Other codes: 301/302 (redirect — follow Location header), 304 (not modified — use browser cache), 401 (unauthorized), 404 (not found), 500 (server error).',
    });

    steps.push({
        act: 7, actName: 'HTTP Response', phase: 'headers',
        statusCode: 200, statusText: 'OK',
        lines: [
            { type: 'status', text: 'HTTP/1.1 200 OK' },
            { type: 'header', key: 'Content-Type',              value: 'text/html; charset=utf-8',   comment: 'Body is UTF-8 HTML' },
            { type: 'header', key: 'Content-Encoding',          value: 'gzip',                       comment: '70% smaller on wire' },
            { type: 'header', key: 'Content-Length',            value: '4823',                       comment: 'Compressed byte count' },
            { type: 'header', key: 'Cache-Control',             value: 'max-age=3600',               comment: 'Cache for 1 hour' },
            { type: 'header', key: 'ETag',                      value: '"abc123def456"',             comment: 'Resource fingerprint' },
            { type: 'header', key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains', comment: 'HTTPS-only for 1 year' },
            { type: 'header', key: 'X-Frame-Options',           value: 'DENY',                       comment: 'Block iframe embedding' },
            { type: 'header', key: 'X-Content-Type-Options',    value: 'nosniff',                    comment: 'No MIME sniffing' },
        ],
        explanation: 'Response headers carry critical metadata: Content-Encoding: gzip means the body is compressed (4,823 bytes on wire vs 12,400 uncompressed — 61% saving), Cache-Control tells the browser to cache for 3600 seconds, ETag is a fingerprint for conditional requests, and security headers (HSTS, X-Frame-Options) protect against common attacks.',
    });

    steps.push({
        act: 7, actName: 'HTTP Response', phase: 'body',
        statusCode: 200,
        bodyRaw: 12400,
        bodyCompressed: 4823,
        bodyPreview: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Search Results — example.com</title>\n  <link rel="stylesheet" href="/styles.css">\n</head>\n<body>\n  <header>...</header>\n  <main>\n    <h1>Results for "hello"</h1>\n    <!-- 10 result cards -->\n  </main>\n  <script src="/app.js"></script>\n</body>\n</html>`,
        explanation: 'The response body is the HTML document — compressed from 12,400 to 4,823 bytes (61% reduction) using gzip. The browser starts parsing the HTML immediately as it streams in, before the full response is received. This streaming parse is why you sometimes see page structure appear before images load.',
    });

    // ═══ ACT 8: Browser Rendering ═══
    const renderStages = ['dom', 'cssom', 'render_tree', 'layout', 'paint', 'composite'];
    const renderStepData = [
        {
            activeStage: 'dom', completed: [],
            expl: 'The HTML parser builds the DOM (Document Object Model) tree top-to-bottom as the HTML streams in. Parser encounters <link rel="stylesheet"> → sends CSS download request. Parser hits <script src="/app.js"> without async/defer → parsing STOPS completely until the script downloads and executes. This is why render-blocking scripts hurt performance.',
        },
        {
            activeStage: 'cssom', completed: ['dom'],
            expl: 'The CSS download finishes and the browser builds the CSSOM (CSS Object Model) — a tree of all CSS rules with specificity resolved. CSSOM construction BLOCKS rendering: the browser will not paint anything until all stylesheets are processed. This prevents the Flash of Unstyled Content (FOUC). Inline styles and media queries are resolved here.',
        },
        {
            activeStage: 'render_tree', completed: ['dom', 'cssom'],
            expl: 'DOM and CSSOM are combined into the Render Tree — containing only visible elements with their computed styles. display:none elements are excluded entirely. visibility:hidden elements are included (they occupy space but are transparent). Each render tree node has its computed style (color, font, border, etc.).',
        },
        {
            activeStage: 'layout', completed: ['dom', 'cssom', 'render_tree'],
            expl: 'Layout (also called Reflow) calculates the exact geometry — position and size — of every element in the render tree. The browser solves a constraint system involving flexbox, grid, percentages, viewport units, and text wrapping. This is the most CPU-intensive phase for complex pages. Layout triggered by JS causes "forced reflow" that can drop frames.',
        },
        {
            activeStage: 'paint', completed: ['dom', 'cssom', 'render_tree', 'layout'],
            expl: 'Paint converts the render tree with computed geometry into a rasterized pixel image. The browser draws text, backgrounds, borders, images, shadows layer by layer. Elements with 3D transforms, opacity transitions, or will-change get promoted to their own GPU compositor layers, skipping rasterization on future repaints.',
        },
        {
            activeStage: 'composite', completed: ['dom', 'cssom', 'render_tree', 'layout', 'paint'],
            expl: 'The compositor thread combines all paint layers on the GPU and sends the final frame to the display at 60 fps (16.67ms per frame). CSS animations on transform/opacity run entirely on the compositor — they never touch the main thread and are always smooth. First meaningful paint is typically 500ms–2s on a real connection. The page is visible.',
        },
    ];

    renderStepData.forEach((s) => {
        steps.push({ act: 8, actName: 'Browser Rendering', activeStage: s.activeStage, completedStages: s.completed, explanation: s.expl });
    });

    return steps;
}

// ── Scenes ────────────────────────────────────────────────────────────────────

function SceneUrlBreakdown({ step }) {
    const colorMap = {
        blue:   { text: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/40' },
        green:  { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/40' },
        orange: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
        purple: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40' },
        slate:  { text: 'text-slate-500',  bg: '',                  border: '' },
    };
    return (
        <div className="flex flex-col gap-8 items-center justify-center h-full py-8">
            <div className="flex flex-wrap items-end justify-center gap-0 font-mono text-xl md:text-2xl">
                {step.urlParts.map((p, i) => {
                    const c = colorMap[p.color];
                    if (!p.label) return <span key={i} className="text-slate-500">{p.text}</span>;
                    return (
                        <div key={i} className="flex flex-col items-center mx-1">
                            <span className={`px-2 py-1 rounded-lg border font-bold ${c.text} ${c.bg} ${c.border}`}>{p.text}</span>
                            <div className="w-px h-3 bg-slate-700 mt-1" />
                            <span className={`text-[11px] font-medium ${c.text}`}>{p.label}</span>
                            <span className="text-[10px] text-slate-600 mt-0.5">{p.desc}</span>
                        </div>
                    );
                })}
            </div>
            <div className="text-xs text-slate-600 font-mono">https://example.com/search?q=hello</div>
        </div>
    );
}

function SceneCacheCheck({ step }) {
    const statusIcon = (s) => s === 'miss' ? <XCircle className="h-4 w-4 text-red-500" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />;
    const statusLabel = (s) => s === 'miss' ? 'MISS' : 'NETWORK';
    const statusColor = (s) => s === 'miss' ? 'text-red-400' : 'text-zinc-300';
    return (
        <div className="flex flex-col gap-3 py-6">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2 text-center">Cache check order</p>
            {step.caches.map((c, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                    c.status === 'next'
                        ? 'border-zinc-500/50 bg-zinc-800/50'
                        : 'border-slate-800/60 bg-slate-900/40'
                }`}>
                    {statusIcon(c.status)}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-200">{c.name}</span>
                            <span className={`text-xs font-bold font-mono ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                    </div>
                    <span className="text-xs text-slate-600 font-mono shrink-0">{c.time}</span>
                </div>
            ))}
        </div>
    );
}

function SceneDNS({ step }) {
    const statusColor = {
        miss:     'border-red-500/40     bg-red-500/5    text-red-400',
        querying: 'border-yellow-500/50  bg-yellow-500/10 text-yellow-400',
        found:    'border-green-500/50   bg-green-500/10  text-green-400',
        complete: 'border-zinc-400/60    bg-zinc-500/20   text-zinc-200',
    };
    const statusBadge = { miss: 'MISS', querying: 'QUERYING', found: 'FOUND', complete: 'RESOLVED' };
    return (
        <div className="flex flex-col items-center gap-0 py-4">
            {step.hops.map((hop, i) => (
                <div key={hop.id} className="flex flex-col items-center">
                    <div className={`flex items-center justify-between gap-3 w-72 px-4 py-2.5 rounded-xl border text-sm transition-all ${statusColor[hop.status]}`}>
                        <div className="min-w-0">
                            <div className="font-semibold text-slate-200 truncate">{hop.label}</div>
                            <div className="text-[10px] text-slate-500">{hop.sub}</div>
                        </div>
                        <span className="text-[10px] font-bold shrink-0">{statusBadge[hop.status]}</span>
                    </div>
                    {i < step.hops.length - 1 && (
                        <div className="flex flex-col items-center">
                            <div className="w-px h-3 bg-slate-700" />
                            <div className="text-slate-600 text-[10px]">↓</div>
                            <div className="w-px h-3 bg-slate-700" />
                        </div>
                    )}
                </div>
            ))}
            {step.hops[step.hops.length - 1]?.status === 'complete' && (
                <div className="mt-4 px-5 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                    <div className="text-xs text-green-500 font-semibold uppercase tracking-widest">IP Resolved</div>
                    <div className="text-lg font-mono font-bold text-green-400 mt-0.5">93.184.216.34</div>
                </div>
            )}
        </div>
    );
}

function SceneTCP({ step }) {
    const dirColor = (c) => c === 'blue'
        ? { arrow: 'text-blue-400', line: 'bg-blue-500', badge: 'bg-blue-500/20 border-blue-500/40 text-blue-300' }
        : { arrow: 'text-green-400', line: 'bg-green-500', badge: 'bg-green-500/20 border-green-500/40 text-green-300' };

    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-between items-center mb-2 px-4">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">CLIENT</span>
                    <span className="text-[10px] text-slate-600 font-mono">192.168.1.1</span>
                </div>
                <div className="flex-1 h-px border-t border-dashed border-slate-700 mx-4" />
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                        <Server className="h-5 w-5 text-green-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">SERVER</span>
                    <span className="text-[10px] text-slate-600 font-mono">93.184.216.34</span>
                </div>
            </div>

            <div className="space-y-3 px-2">
                {step.packets.map((pkt, i) => {
                    const c = dirColor(pkt.color);
                    const isC2S = pkt.dir === 'c2s';
                    return (
                        <div key={i} className={`relative flex items-center gap-2 ${isC2S ? 'flex-row' : 'flex-row-reverse'} ${pkt.active ? 'opacity-100' : 'opacity-50'}`}>
                            <span className={`text-[10px] font-mono ${c.arrow} w-20 ${isC2S ? 'text-right' : 'text-left'} shrink-0`}>{pkt.detail}</span>
                            <div className="flex-1 relative flex items-center">
                                <div className={`flex-1 h-px ${c.line} ${pkt.active ? 'opacity-100' : 'opacity-30'}`} />
                                <div className={`absolute ${isC2S ? 'right-0' : 'left-0'} text-xs ${c.arrow}`}>{isC2S ? '►' : '◄'}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${c.badge} ${pkt.active ? 'scale-105' : ''} w-20 text-center shrink-0`}>{pkt.label}</span>
                        </div>
                    );
                })}
            </div>

            {step.connected && (
                <div className="mt-2 mx-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                    <div>
                        <div className="text-sm font-semibold text-green-400">Connection Established</div>
                        <div className="text-xs text-slate-500">Both sides ESTABLISHED · Sequence numbers synchronized</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SceneTLS({ step }) {
    const dirColor = (c) => c === 'blue'
        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
        : 'bg-green-500/20 border-green-500/40 text-green-300';

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
                {step.messages.map((msg, i) => {
                    const isC2S = msg.dir === 'c2s';
                    return (
                        <div key={i} className={`flex items-center gap-2 ${isC2S ? '' : 'flex-row-reverse'} ${msg.active ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${dirColor(msg.color)} ${msg.active ? 'scale-105' : ''} max-w-[200px]`}>
                                <div>{msg.label}</div>
                                {msg.detail && <div className="text-[10px] font-normal mt-0.5 opacity-70">{msg.detail}</div>}
                            </div>
                            <div className={`flex-1 flex items-center ${isC2S ? '' : 'flex-row-reverse'}`}>
                                <div className={`flex-1 h-px ${msg.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'} ${msg.active ? 'opacity-80' : 'opacity-20'}`} />
                                <div className={`text-xs ${msg.color === 'blue' ? 'text-blue-400' : 'text-green-400'} ${msg.active ? 'opacity-100' : 'opacity-20'}`}>
                                    {isC2S ? '►' : '◄'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {step.certChain && (
                <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold text-center mb-2">Certificate Chain</p>
                    {step.certChain.map((cert, i) => (
                        <div key={i} className="flex items-center gap-3">
                            {i > 0 && <div className="ml-4 w-px h-3 bg-slate-700" />}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${
                                cert.root ? 'border-green-500/40 bg-green-500/5' : 'border-slate-700 bg-slate-900/50'
                            }`}>
                                <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${cert.root ? 'text-green-400' : 'text-zinc-400'}`} />
                                <div>
                                    <div className="text-xs font-medium text-slate-200">{cert.label}</div>
                                    <div className="text-[10px] text-slate-500">{cert.sub}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {step.dhViz && (
                <div className="mt-2 p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold text-center mb-3">{step.dhViz.label}</p>
                    <div className="flex items-center justify-center gap-3 text-sm">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full border-2 border-blue-500/50" style={{ background: step.dhViz.clientPriv + '40' }} />
                            <span className="text-[10px] text-slate-500">Client private</span>
                        </div>
                        <span className="text-slate-600">+</span>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full border-2 border-green-500/50" style={{ background: step.dhViz.serverPriv + '40' }} />
                            <span className="text-[10px] text-slate-500">Server public</span>
                        </div>
                        <span className="text-slate-600">=</span>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full border-2 border-purple-500/60" style={{ background: step.dhViz.shared + '50' }} />
                            <span className="text-[10px] text-purple-400">Shared secret</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center mt-2">Server does the same → both get identical shared secret without transmitting it</p>
                </div>
            )}

            {step.encrypted && (
                <div className="mt-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                    <Lock className="h-5 w-5 text-green-400 shrink-0" />
                    <div>
                        <div className="text-sm font-semibold text-green-400">Encrypted Channel Active</div>
                        <div className="text-xs text-slate-500">AES-256-GCM · TLS 1.3 · 1 round trip total</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SceneHTTPRequest({ step }) {
    return (
        <div className="flex flex-col gap-2 py-4 font-mono text-sm">
            {step.lines.map((line, i) => {
                if (line.type === 'method') return (
                    <div key={i} className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <span className="text-blue-300 font-bold">{line.text}</span>
                        {line.comment && <span className="text-slate-600 text-xs ml-3"># {line.comment}</span>}
                    </div>
                );
                if (line.type === 'header') return (
                    <div key={i} className="px-3 py-1.5 rounded-lg hover:bg-slate-800/30 flex items-baseline gap-2">
                        <span className="text-zinc-400 min-w-0 shrink-0">{line.key}:</span>
                        <span className="text-slate-300">{line.value}</span>
                        {line.comment && <span className="text-slate-600 text-xs ml-auto shrink-0"># {line.comment}</span>}
                    </div>
                );
                if (line.type === 'separator') return (
                    <div key={i} className="px-3 py-1 text-slate-600 text-xs italic border-t border-slate-800/50">{line.text}</div>
                );
                return null;
            })}
            {step.sent && (
                <div className="mt-3 px-3 py-2 bg-zinc-500/10 border border-zinc-500/20 rounded-lg flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs text-zinc-400">Request sent over TLS tunnel → 93.184.216.34:443</span>
                </div>
            )}
        </div>
    );
}

const nodeColor = {
    cyan:   { ring: 'border-cyan-500/50',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   glow: 'shadow-cyan-500/20'   },
    blue:   { ring: 'border-blue-500/50',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   glow: 'shadow-blue-500/20'   },
    green:  { ring: 'border-green-500/50',  bg: 'bg-green-500/10',  text: 'text-green-400',  glow: 'shadow-green-500/20'  },
    yellow: { ring: 'border-yellow-500/50', bg: 'bg-yellow-500/10', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    orange: { ring: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
};

function SceneServer({ step }) {
    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
                {step.nodes.map((node, i) => {
                    const c = nodeColor[node.color];
                    const isActive = node.state === 'active';
                    const isDone   = node.state === 'done';
                    return (
                        <div key={node.id} className="flex items-center gap-2">
                            <div className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all text-center min-w-[80px] ${
                                isActive
                                    ? `${c.ring} ${c.bg} shadow-lg ${c.glow} scale-110`
                                    : isDone
                                    ? 'border-slate-700 bg-slate-900/30 opacity-50'
                                    : 'border-slate-800/60 bg-slate-900/20 opacity-40'
                            }`}>
                                {isDone ? <CheckCircle className="h-4 w-4 text-slate-500 mb-1" /> : <Server className={`h-4 w-4 ${isActive ? c.text : 'text-slate-600'} mb-1`} />}
                                <span className={`text-xs font-semibold ${isActive ? c.text : 'text-slate-400'}`}>{node.label}</span>
                                <span className="text-[10px] text-slate-600">{node.sub}</span>
                            </div>
                            {i < step.nodes.length - 1 && (
                                <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            {step.dbQuery && (
                <div className="mx-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl font-mono text-xs">
                    <div className="text-slate-500 mb-1 text-[10px] uppercase tracking-widest">Query</div>
                    <div className="text-orange-300 break-all">{step.dbQuery}</div>
                    {step.indexHit && (
                        <div className="mt-2 flex items-center gap-1.5 text-green-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px]">GIN index scan · ~1ms · 10 rows returned</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SceneHTTPResponse({ step }) {
    const statusBg = step.statusCode === 200 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400';
    return (
        <div className="flex flex-col gap-3 py-4">
            {step.statusCode && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${statusBg}`}>
                    <span className="text-3xl font-bold font-mono">{step.statusCode}</span>
                    <div>
                        <div className="font-semibold">{step.statusText}</div>
                        <div className="text-xs opacity-70">HTTP/1.1 status line</div>
                    </div>
                </div>
            )}
            <div className="font-mono text-sm space-y-1">
                {(step.lines || []).filter(l => l.type !== 'status').map((line, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg hover:bg-slate-800/30 flex items-baseline gap-2">
                        <span className="text-zinc-400 shrink-0">{line.key}:</span>
                        <span className="text-slate-300 min-w-0">{line.value}</span>
                        {line.comment && <span className="text-slate-600 text-xs ml-auto shrink-0"># {line.comment}</span>}
                    </div>
                ))}
            </div>
            {step.bodyRaw && (
                <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-500">Response body (gzip compressed)</span>
                        <span className="text-green-400 font-mono">{step.bodyRaw.toLocaleString()}B → {step.bodyCompressed.toLocaleString()}B</span>
                    </div>
                    <pre className="text-[11px] text-slate-400 overflow-hidden leading-relaxed whitespace-pre-wrap font-mono">{step.bodyPreview}</pre>
                </div>
            )}
        </div>
    );
}

const RENDER_STAGES = [
    { id: 'dom',         label: 'DOM',          sub: 'HTML → Node tree'    },
    { id: 'cssom',       label: 'CSSOM',        sub: 'CSS → Style tree'    },
    { id: 'render_tree', label: 'Render Tree',  sub: 'DOM ∩ CSSOM'         },
    { id: 'layout',      label: 'Layout',       sub: 'Geometry + positions'},
    { id: 'paint',       label: 'Paint',        sub: 'Pixels on layers'    },
    { id: 'composite',   label: 'Composite',    sub: 'GPU → display'       },
];

function SceneRender({ step }) {
    return (
        <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-wrap items-center justify-center gap-1">
                {RENDER_STAGES.map((stage, i) => {
                    const isActive    = stage.id === step.activeStage;
                    const isCompleted = step.completedStages.includes(stage.id);
                    return (
                        <div key={stage.id} className="flex items-center gap-1">
                            <div className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all text-center ${
                                isActive
                                    ? 'border-zinc-400/60 bg-zinc-500/20 scale-110 shadow-lg shadow-zinc-500/10'
                                    : isCompleted
                                    ? 'border-green-700/40 bg-green-500/5 opacity-60'
                                    : 'border-slate-800 bg-slate-900/20 opacity-30'
                            }`}>
                                {isCompleted
                                    ? <CheckCircle className="h-4 w-4 text-green-500 mb-1" />
                                    : <Layers className={`h-4 w-4 mb-1 ${isActive ? 'text-zinc-300' : 'text-slate-600'}`} />
                                }
                                <span className={`text-xs font-bold ${isActive ? 'text-zinc-200' : isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>{stage.label}</span>
                                <span className="text-[10px] text-slate-600 mt-0.5">{stage.sub}</span>
                            </div>
                            {i < RENDER_STAGES.length - 1 && (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            {step.activeStage === 'dom' && (
                <div className="mx-4 p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl font-mono text-[11px] text-slate-400 leading-relaxed">
                    {`<html>\n  <head>...</head>\n  <body>\n    <header>▌ parsing...\n    <main>\n      ...`}
                </div>
            )}

            {step.activeStage === 'composite' && (
                <div className="mx-4 p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-xl text-center">
                    <div className="text-zinc-300 font-semibold text-sm">First Meaningful Paint</div>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">~500ms</div>
                    <div className="text-xs text-slate-500 mt-1">DNS + TCP + TLS + Server + Render</div>
                </div>
            )}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1 && step.phase === 'url_breakdown') return <SceneUrlBreakdown step={step} />;
    if (step.act === 1 && step.phase === 'cache_check')   return <SceneCacheCheck   step={step} />;
    if (step.act === 2) return <SceneDNS  step={step} />;
    if (step.act === 3) return <SceneTCP  step={step} />;
    if (step.act === 4) return <SceneTLS  step={step} />;
    if (step.act === 5) return <SceneHTTPRequest  step={step} />;
    if (step.act === 6) return <SceneServer       step={step} />;
    if (step.act === 7) return <SceneHTTPResponse step={step} />;
    if (step.act === 8) return <SceneRender       step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What is the correct order of DNS resolution for a completely uncached domain?',
        options: [
            'Browser cache → OS cache → TLD nameserver → Root nameserver',
            'Browser cache → OS cache → Recursive resolver → Root → TLD → Authoritative',
            'Root nameserver → TLD nameserver → Authoritative → Browser',
            'ISP resolver → Root nameserver → Authoritative → OS cache',
        ],
        correct: 1,
        explanation: 'DNS resolution always checks local caches first (browser, then OS), then delegates to a recursive resolver which queries Root → TLD → Authoritative in that order.',
    },
    {
        question: 'What does the TCP three-way handshake accomplish before HTTP data is sent?',
        options: [
            'It establishes the TLS encryption keys for HTTPS',
            'It determines which HTTP version to use (1.1 vs 2)',
            'It proves bidirectional connectivity and synchronizes sequence numbers',
            'It verifies the server\'s SSL certificate',
        ],
        correct: 2,
        explanation: 'The three-way handshake (SYN → SYN-ACK → ACK) proves both client→server and server→client communication works, and synchronizes sequence numbers for reliable ordered delivery. TLS (encryption) happens afterward.',
    },
    {
        question: 'Which type of HTML resource blocks the browser\'s HTML parser while it downloads and executes?',
        options: [
            '<link rel="stylesheet"> CSS files',
            '<img> image tags',
            '<script> tags without async or defer',
            '<video> elements',
        ],
        correct: 2,
        explanation: 'A <script> without async or defer forces the HTML parser to stop completely until the script downloads and executes. This is why scripts are often placed at the bottom of <body> or given the defer attribute. CSS blocks rendering but not parsing; images and video are non-blocking.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand the full request lifecycle!' : 'Review the explanations to reinforce the concepts.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">
                    Retake Quiz
                </button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Question {quizState.current + 1} / {QUIZ.length}
            </div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(s => ({ ...s, selected: i, answered: true, score: correct ? s.score + 1 : s.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>
                            {opt}
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">
                    {q.explanation}
                </div>
            )}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(s => ({ ...s, complete: true }));
                    else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function UrlSearchPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(900);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || STEPS.length === 0) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct  = Math.round(((currentStep + 1) / STEPS.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/under-the-hood" className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Under the Hood
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                What Happens When You Search a URL
                            </h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                All 8 stages — from keypres to painted pixels — animated step by step
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">
                                {currentStep + 1} / {STEPS.length}
                            </div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Act timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone    = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const firstStepOfAct = STEPS.findIndex(s => s.act === act.id);
                                    if (firstStepOfAct >= 0) { setCurrentStep(firstStepOfAct); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : isDone
                                            ? 'bg-white/5 text-zinc-400 border border-white/10'
                                            : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <ActIcon className="h-3 w-3" />
                                    {act.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            {/* Main 2-col layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Visualization panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            {/* Panel header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                        Act {step?.act} of 8
                                    </span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>

                            <div className="px-5 min-h-[320px]">
                                <VisualizationPanel step={step} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 bg-slate-900/50 border border-slate-800/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Reset">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Previous">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Next">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="200" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Explanation */}
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Timeline stats */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Typical timing</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { label: 'DNS (cold)',     time: '50–200ms',   act: 2 },
                                    { label: 'TCP handshake', time: '20–150ms',   act: 3 },
                                    { label: 'TLS handshake', time: '50–200ms',   act: 4 },
                                    { label: 'Server TTFB',   time: '50–300ms',   act: 6 },
                                    { label: 'First paint',   time: '200–800ms',  act: 8 },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between px-2 py-1 rounded-lg transition-colors ${step?.act === row.act ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono">{row.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
