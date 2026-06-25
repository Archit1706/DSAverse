"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Globe, Server, Send, RefreshCw, CheckCircle, XCircle, ChevronRight,
    Database, Lock, FileJson, Boxes, Shield, Key, Code2, User, ListChecks,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'What is REST', icon: Globe },
    { id: 2, label: 'Resources',    icon: Boxes },
    { id: 3, label: 'Verbs',        icon: ListChecks },
    { id: 4, label: 'Request',      icon: Send },
    { id: 5, label: 'Server',       icon: Server },
    { id: 6, label: 'Response',     icon: FileJson },
    { id: 7, label: 'Status Codes', icon: Code2 },
    { id: 8, label: 'Stateless',    icon: RefreshCw },
];

// ── Shared data ─────────────────────────────────────────────────────────────────
const VERBS = [
    { method: 'GET',    crud: 'Read',    safe: true,  idempotent: true,  color: 'blue',   example: 'GET /users/42',
      desc: 'Retrieve a resource or a collection. GET never changes server state — it is "safe". Fetching the same URL a thousand times returns the same thing and breaks nothing.' },
    { method: 'POST',   crud: 'Create',  safe: false, idempotent: false, color: 'green',
      example: 'POST /users', desc: 'Create a new resource inside a collection. POST is NOT idempotent — sending it twice creates two resources. This is why double-clicking "Submit" can place two orders.' },
    { method: 'PUT',    crud: 'Replace', safe: false, idempotent: true,  color: 'orange',
      example: 'PUT /users/42', desc: 'Replace a resource entirely with the body you send. PUT is idempotent — applying the same full replacement twice leaves the resource in the same final state.' },
    { method: 'PATCH',  crud: 'Update',  safe: false, idempotent: false, color: 'yellow',
      example: 'PATCH /users/42', desc: 'Partially update a resource — change only the fields you send. Whether PATCH is idempotent depends on the operation (e.g. "increment" is not).' },
    { method: 'DELETE', crud: 'Delete',  safe: false, idempotent: true,  color: 'red',
      example: 'DELETE /users/42', desc: 'Remove a resource. DELETE is idempotent — deleting something that is already gone still leaves it gone, so repeating the call is harmless.' },
];

const STATUS_FAMILIES = [
    { code: '1xx', name: 'Informational', color: 'slate',
      examples: [{ c: 100, t: 'Continue' }, { c: 101, t: 'Switching Protocols' }],
      desc: 'Rarely seen in everyday REST work. The request was received and the client should continue. Most APIs never send a 1xx explicitly.' },
    { code: '2xx', name: 'Success', color: 'green',
      examples: [{ c: 200, t: 'OK' }, { c: 201, t: 'Created' }, { c: 204, t: 'No Content' }],
      desc: 'The request succeeded. 200 OK for a normal read, 201 Created after a POST that made a new resource (with a Location header), 204 No Content for a successful DELETE that returns no body.' },
    { code: '3xx', name: 'Redirection', color: 'blue',
      examples: [{ c: 301, t: 'Moved Permanently' }, { c: 304, t: 'Not Modified' }],
      desc: 'Further action is needed. 301 means the resource lives at a new URL (follow Location); 304 Not Modified tells the client its cached copy is still fresh — saving bandwidth.' },
    { code: '4xx', name: 'Client Error', color: 'orange',
      examples: [{ c: 400, t: 'Bad Request' }, { c: 401, t: 'Unauthorized' }, { c: 403, t: 'Forbidden' }, { c: 404, t: 'Not Found' }],
      desc: 'YOU made a mistake. 400 malformed body, 401 not authenticated (no/invalid token), 403 authenticated but not allowed, 404 the resource does not exist. Fixing the request fixes the error.' },
    { code: '5xx', name: 'Server Error', color: 'red',
      examples: [{ c: 500, t: 'Internal Server Error' }, { c: 503, t: 'Service Unavailable' }],
      desc: 'The SERVER broke. 500 is an unhandled exception in the backend; 503 means the server is overloaded or down for maintenance. The same request might succeed later — the client did nothing wrong.' },
];

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];

    // ═══ ACT 1: What is REST ═══
    steps.push({
        act: 1, actName: 'Client & Server', phase: 'concept',
        flow: { request: false, response: false },
        explanation: 'A REST API is a contract between a client (a browser, a mobile app, another server) and a server. Think of a restaurant: you (the client) never walk into the kitchen. You give the waiter a structured order; the kitchen prepares it; the waiter brings back a structured result. The API is that waiter — a uniform way to ask for things and get answers.',
    });
    steps.push({
        act: 1, actName: 'Client & Server', phase: 'request_response',
        flow: { request: true, response: true },
        explanation: 'Every interaction is one request and one response over HTTP. The client sends a request (what it wants), the server sends back a response (the result + a status). There is no long-lived conversation — each request is a complete, self-contained question.',
    });
    steps.push({
        act: 1, actName: 'The 4 REST Ideas', phase: 'principles',
        principles: [
            { icon: 'Boxes',  title: 'Resources', body: 'Everything is a "thing" with a URL: a user, an order, a photo.' },
            { icon: 'Code2',  title: 'Representations', body: 'Resources travel as JSON — a text format both sides understand.' },
            { icon: 'ListChecks', title: 'Uniform verbs', body: 'A small fixed set of HTTP methods does every operation.' },
            { icon: 'RefreshCw',  title: 'Stateless', body: 'The server remembers nothing between requests — each stands alone.' },
        ],
        explanation: 'REST stands for REpresentational State Transfer. In practice it boils down to four ideas: data is modelled as resources, each addressed by a URL; resources are transferred as representations (usually JSON); a uniform set of HTTP verbs operates on them; and every request is stateless. Master these four and REST is no longer mysterious.',
    });

    // ═══ ACT 2: Resources & URLs ═══
    steps.push({
        act: 2, actName: 'Anatomy of an Endpoint', phase: 'url_breakdown',
        urlParts: [
            { text: 'https://api.example.com', label: 'Base URL', desc: 'The API host', color: 'slate' },
            { text: '/v1',       label: 'Version',     desc: 'API version',        color: 'blue'   },
            { text: '/users',    label: 'Collection',  desc: 'All users',          color: 'green'  },
            { text: '/42',       label: 'Resource ID', desc: 'One specific user',  color: 'orange' },
            { text: '/posts',    label: 'Sub-resource',desc: "That user's posts",  color: 'purple' },
            { text: '?sort=new', label: 'Query',       desc: 'Filter / sort',      color: 'pink'   },
        ],
        explanation: 'A REST endpoint is just a structured URL. /v1 pins the API version so old clients keep working. /users is a collection. /42 drills into one specific user. /posts nests that user\'s posts. The ?query string filters, sorts, or paginates without changing which resource you are addressing.',
    });
    steps.push({
        act: 2, actName: 'Collections vs Items', phase: 'collection_vs_item',
        pairs: [
            { url: '/users',     kind: 'Collection', desc: 'The whole set of users. GET lists them; POST adds one.', icon: 'Boxes' },
            { url: '/users/42',  kind: 'Single item', desc: 'One user identified by id 42. GET reads it; PUT/PATCH edits it; DELETE removes it.', icon: 'User' },
        ],
        explanation: 'URLs name things, not actions. A plural noun like /users is a collection; appending an id like /users/42 addresses one item. The same URL supports different operations depending on the verb — you never need /getUser or /deleteUser. The noun stays in the URL; the verb is the HTTP method.',
    });
    steps.push({
        act: 2, actName: 'Nouns, Not Verbs', phase: 'good_vs_bad',
        examples: [
            { bad: 'GET /getUser?id=42',       good: 'GET /users/42',    note: 'The verb belongs in the method, not the path.' },
            { bad: 'POST /createUser',          good: 'POST /users',      note: 'POST to the collection means "create one here".' },
            { bad: 'POST /deleteUser?id=42',    good: 'DELETE /users/42', note: 'Use the DELETE method, not a "delete" path.' },
            { bad: 'GET /users/42/getPosts',    good: 'GET /users/42/posts', note: 'Sub-resources are nouns too.' },
        ],
        explanation: 'A common beginner mistake is putting actions in the URL (/getUser, /createUser). RESTful design keeps URLs as nouns and lets the HTTP verb express the action. This makes the whole API predictable: once you know the resource, you already know its endpoints.',
    });

    // ═══ ACT 3: HTTP Verbs ═══
    VERBS.forEach((v, i) => {
        steps.push({
            act: 3, actName: 'Verbs Map to CRUD', phase: `verb_${v.method}`,
            activeVerb: v.method,
            explanation: `${v.method} → ${v.crud}. ${v.desc}`,
        });
    });

    // ═══ ACT 4: Anatomy of a Request ═══
    steps.push({
        act: 4, actName: 'The Request Line', phase: 'request_line',
        lines: [{ type: 'method', text: 'POST /v1/users HTTP/1.1', comment: 'verb  path  http-version' }],
        explanation: 'We will create a user, so the request starts with POST and the collection URL /v1/users. The first line of every HTTP request is the request line: the verb, the path, and the protocol version. This single line already tells the server "create a new user".',
    });
    steps.push({
        act: 4, actName: 'Request Headers', phase: 'headers',
        lines: [
            { type: 'method', text: 'POST /v1/users HTTP/1.1', comment: '' },
            { type: 'header', key: 'Host',          value: 'api.example.com',     comment: 'Which API host' },
            { type: 'header', key: 'Authorization', value: 'Bearer eyJhbGc...',    comment: 'Who you are (token)' },
            { type: 'header', key: 'Content-Type',  value: 'application/json',     comment: 'Body format I am sending' },
            { type: 'header', key: 'Accept',        value: 'application/json',     comment: 'Format I want back' },
        ],
        explanation: 'Headers carry metadata about the request. Authorization carries a token proving who you are — REST is stateless, so this is sent on every request. Content-Type tells the server the body is JSON; Accept says "please answer in JSON too". These two headers negotiate the data format both sides speak.',
    });
    steps.push({
        act: 4, actName: 'Request Body', phase: 'body',
        lines: [
            { type: 'method', text: 'POST /v1/users HTTP/1.1', comment: '' },
            { type: 'header', key: 'Content-Type', value: 'application/json' },
            { type: 'header', key: 'Authorization', value: 'Bearer eyJhbGc...' },
            { type: 'separator', text: '(blank line — headers end, body begins)' },
        ],
        bodyJson: `{\n  "name": "Ada Lovelace",\n  "email": "ada@example.com",\n  "role": "engineer"\n}`,
        explanation: 'GET and DELETE usually have no body, but POST, PUT, and PATCH carry one. Here the body is a JSON object describing the user to create. A blank line separates headers from the body — the server reads headers until that blank line, then knows the rest is payload.',
    });
    steps.push({
        act: 4, actName: 'Request Sent', phase: 'sent',
        lines: [
            { type: 'method', text: 'POST /v1/users HTTP/1.1', comment: '' },
            { type: 'header', key: 'Authorization', value: 'Bearer eyJhbGc...' },
            { type: 'header', key: 'Content-Type', value: 'application/json' },
            { type: 'separator', text: '{ "name": "Ada Lovelace", ... }' },
        ],
        sent: true,
        explanation: 'The complete request — line, headers, blank line, JSON body — travels over the network (usually over HTTPS, so it is encrypted) to api.example.com. The client now waits for exactly one response. Time to see what the server does with it.',
    });

    // ═══ ACT 5: Server pipeline ═══
    const serverData = [
        { active: 'router', expl: 'The router matches the incoming method + path (POST /v1/users) to a handler. This is the API\'s switchboard: GET /users/42 and POST /users go to completely different code, even though the path looks similar. No match here would mean a 404.' },
        { active: 'auth',   expl: 'Authentication middleware inspects the Authorization header. It verifies the Bearer token\'s signature and expiry. No token or an invalid one → the pipeline stops immediately with 401 Unauthorized — the controller never even runs.' },
        { active: 'validate', expl: 'Validation checks the JSON body: is "email" present and well-formed? Is "name" non-empty? If the body is malformed or missing required fields, the server short-circuits with 400 Bad Request and a helpful error message. Never trust client input.' },
        { active: 'controller', expl: 'The controller holds the business logic: it decides a new user should be created, perhaps hashes a password, applies rules ("email must be unique"), and prepares to persist the data. This is the only layer that knows what the request actually means.' },
        { active: 'db', expl: 'The controller asks the database to INSERT the new user row. The database assigns a primary key (id = 42), enforces constraints (unique email), and returns the stored record. This is where state actually changes — everything before this was just preparation.' },
        { active: 'serializer', expl: 'The serializer turns the database record back into a clean JSON representation — hiding internal fields (like the password hash) and shaping the output to match the API contract. This JSON becomes the response body the client receives.' },
    ];
    const SERVER_NODES = [
        { id: 'router',     label: 'Router',     sub: 'method + path', color: 'cyan'   },
        { id: 'auth',       label: 'Auth',       sub: 'verify token',  color: 'blue'   },
        { id: 'validate',   label: 'Validate',   sub: 'check body',    color: 'green'  },
        { id: 'controller', label: 'Controller', sub: 'business logic',color: 'yellow' },
        { id: 'db',         label: 'Database',   sub: 'persist',       color: 'orange' },
        { id: 'serializer', label: 'Serialize',  sub: '→ JSON',        color: 'purple' },
    ];
    serverData.forEach((s, i) => {
        const activeIdx = SERVER_NODES.findIndex(n => n.id === s.active);
        steps.push({
            act: 5, actName: 'Inside the Server', phase: `server_${s.active}`,
            nodes: SERVER_NODES.map((n, idx) => ({
                ...n,
                state: idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'waiting',
            })),
            explanation: s.expl,
        });
    });

    // ═══ ACT 6: Anatomy of a Response ═══
    steps.push({
        act: 6, actName: 'The Status Line', phase: 'status',
        statusCode: 201, statusText: 'Created',
        explanation: 'The server replies. The status line comes first: 201 Created. Not just 200 OK — 201 specifically means "your POST succeeded and a new resource now exists". The status code is the single most important part of the response: it tells the client what happened before it even looks at the body.',
    });
    steps.push({
        act: 6, actName: 'Response Headers', phase: 'headers',
        statusCode: 201, statusText: 'Created',
        lines: [
            { type: 'header', key: 'Content-Type',  value: 'application/json',          comment: 'Body is JSON' },
            { type: 'header', key: 'Location',      value: '/v1/users/42',              comment: 'URL of the new resource' },
            { type: 'header', key: 'Content-Length', value: '118',                       comment: 'Body size in bytes' },
        ],
        explanation: 'Response headers describe the answer. Content-Type confirms the body is JSON. After a 201 Created, the Location header gives the URL of the brand-new resource (/v1/users/42) — the client now knows exactly where to GET it later. Headers are the metadata; the body is the data.',
    });
    steps.push({
        act: 6, actName: 'Response Body', phase: 'body',
        statusCode: 201, statusText: 'Created',
        bodyJson: `{\n  "id": 42,\n  "name": "Ada Lovelace",\n  "email": "ada@example.com",\n  "role": "engineer",\n  "createdAt": "2026-06-24T10:30:00Z"\n}`,
        explanation: 'The body is the created resource as JSON — now including server-generated fields the client did not send: the new id (42) and a createdAt timestamp. Notice there is no password or internal field: the serializer only exposed what the API contract promises. The client can now use id 42 to fetch, update, or delete this user.',
    });

    // ═══ ACT 7: Status codes ═══
    ['2xx', '3xx', '4xx', '5xx'].forEach(code => {
        const fam = STATUS_FAMILIES.find(f => f.code === code);
        steps.push({
            act: 7, actName: 'Reading Status Codes', phase: `status_${code}`,
            activeFamily: code,
            explanation: `${fam.code} — ${fam.name}. ${fam.desc}`,
        });
    });

    // ═══ ACT 8: Statelessness ═══
    steps.push({
        act: 8, actName: 'Every Request Stands Alone', phase: 'req_a',
        requests: [
            { id: 'A', method: 'GET', path: '/v1/users/42', token: true, active: true },
        ],
        explanation: 'Statelessness is REST\'s superpower. Request A arrives carrying its own Authorization token. The server authenticates it, answers it, and then forgets everything — it keeps no session, no memory of who just called. Each request must carry everything the server needs to handle it.',
    });
    steps.push({
        act: 8, actName: 'Every Request Stands Alone', phase: 'req_b',
        requests: [
            { id: 'A', method: 'GET',  path: '/v1/users/42', token: true, active: false },
            { id: 'B', method: 'PATCH', path: '/v1/users/42', token: true, active: true },
        ],
        explanation: 'A moment later request B arrives. The server has no recollection of request A — so B must include the token again. This feels repetitive, but it is exactly what makes REST scale: because no request depends on server memory, ANY server can handle ANY request.',
    });
    steps.push({
        act: 8, actName: 'Why Statelessness Scales', phase: 'scaling',
        scaling: true,
        explanation: 'Since each request is self-contained, you can put many identical servers behind a load balancer. Request A might hit server 1 and request B server 3 — it does not matter, because neither server needs to remember anything. This horizontal scaling — just add more servers — is why REST powers the modern web. State lives in the database and in the client\'s token, never in the server\'s memory.',
    });

    return steps;
}

// ── Scene helpers ───────────────────────────────────────────────────────────────
const urlColorMap = {
    blue:   { text: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/40' },
    green:  { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/40' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/40' },
    pink:   { text: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/40' },
    slate:  { text: 'text-slate-400',  bg: 'bg-slate-400/5',   border: 'border-slate-700/60' },
};

const verbColorMap = {
    blue:   { text: 'text-blue-300',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40'   },
    green:  { text: 'text-green-300',  bg: 'bg-green-500/15',  border: 'border-green-500/40'  },
    orange: { text: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40' },
    yellow: { text: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' },
    red:    { text: 'text-red-300',    bg: 'bg-red-500/15',    border: 'border-red-500/40'    },
};

const famColorMap = {
    slate:  { text: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-600/50'  },
    green:  { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/40'  },
    blue:   { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/40'   },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40' },
    red:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/40'    },
};

const principleIcons = { Boxes, Code2, ListChecks, RefreshCw };
const pairIcons = { Boxes, User };

// ── Scenes ────────────────────────────────────────────────────────────────────
function SceneConcept({ step }) {
    if (step.phase === 'principles') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6">
                {step.principles.map((p, i) => {
                    const Icon = principleIcons[p.icon] || Boxes;
                    return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                            <div className="w-9 h-9 rounded-lg bg-zinc-500/15 border border-zinc-600/50 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-zinc-300" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-200">{p.title}</div>
                                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.body}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    // concept / request_response
    return (
        <div className="flex flex-col items-center justify-center h-full py-10 gap-6">
            <div className="flex items-center justify-between w-full max-w-lg gap-4">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
                        <User className="h-7 w-7 text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200">Client</span>
                    <span className="text-[10px] text-slate-600">browser / app</span>
                </div>

                <div className="flex-1 flex flex-col gap-3 px-2">
                    <div className={`flex items-center gap-1 transition-opacity ${step.flow.request ? 'opacity-100' : 'opacity-20'}`}>
                        <span className="text-[10px] font-mono text-blue-400 shrink-0">request</span>
                        <div className="flex-1 h-px bg-blue-500/60" />
                        <Send className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className={`flex flex-row-reverse items-center gap-1 transition-opacity ${step.flow.response ? 'opacity-100' : 'opacity-20'}`}>
                        <span className="text-[10px] font-mono text-green-400 shrink-0">response</span>
                        <div className="flex-1 h-px bg-green-500/60" />
                        <FileJson className="h-3.5 w-3.5 text-green-400" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/40 flex items-center justify-center">
                        <Server className="h-7 w-7 text-green-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200">Server</span>
                    <span className="text-[10px] text-slate-600">the API</span>
                </div>
            </div>
            {step.phase === 'concept' && (
                <div className="text-xs text-slate-600 font-mono text-center max-w-sm">
                    You never touch the kitchen — the API is the waiter between you and the data.
                </div>
            )}
        </div>
    );
}

function SceneUrlBreakdown({ step }) {
    return (
        <div className="flex flex-col gap-8 items-center justify-center h-full py-8">
            <div className="flex flex-wrap items-end justify-center gap-0 font-mono text-sm md:text-base">
                {step.urlParts.map((p, i) => {
                    const c = urlColorMap[p.color];
                    return (
                        <div key={i} className="flex flex-col items-center mx-1 mb-2">
                            <span className={`px-2 py-1 rounded-lg border font-bold ${c.text} ${c.bg} ${c.border}`}>{p.text}</span>
                            <div className="w-px h-3 bg-slate-700 mt-1" />
                            <span className={`text-[11px] font-medium ${c.text}`}>{p.label}</span>
                            <span className="text-[10px] text-slate-600 mt-0.5">{p.desc}</span>
                        </div>
                    );
                })}
            </div>
            <div className="text-[11px] text-slate-600 font-mono break-all text-center">
                https://api.example.com/v1/users/42/posts?sort=new
            </div>
        </div>
    );
}

function SceneCollectionVsItem({ step }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8">
            {step.pairs.map((p, i) => {
                const Icon = pairIcons[p.icon] || Boxes;
                return (
                    <div key={i} className="flex flex-col gap-2 px-4 py-4 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-zinc-300" />
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{p.kind}</span>
                        </div>
                        <code className="text-base font-mono font-bold text-zinc-200">{p.url}</code>
                        <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                    </div>
                );
            })}
        </div>
    );
}

function SceneGoodVsBad({ step }) {
    return (
        <div className="flex flex-col gap-2 py-6">
            <div className="grid grid-cols-2 gap-2 px-1 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold flex items-center gap-1"><XCircle className="h-3 w-3" /> Avoid</span>
                <span className="text-[10px] uppercase tracking-widest text-green-500 font-semibold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> RESTful</span>
            </div>
            {step.examples.map((ex, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                    <code className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300/80 text-xs font-mono line-through decoration-red-500/40">{ex.bad}</code>
                    <code className="px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20 text-green-300 text-xs font-mono">{ex.good}</code>
                </div>
            ))}
        </div>
    );
}

function SceneVerbs({ step }) {
    return (
        <div className="flex flex-col gap-2 py-4">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                <span className="col-span-2">Method</span>
                <span className="col-span-2">CRUD</span>
                <span className="col-span-4">Example</span>
                <span className="col-span-2 text-center">Safe</span>
                <span className="col-span-2 text-center">Idempotent</span>
            </div>
            {VERBS.map(v => {
                const c = verbColorMap[v.color];
                const isActive = v.method === step.activeVerb;
                return (
                    <div key={v.method} className={`grid grid-cols-2 sm:grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl border transition-all ${
                        isActive ? `${c.border} ${c.bg} scale-[1.02]` : 'border-slate-800/60 bg-slate-900/30 opacity-50'
                    }`}>
                        <span className={`col-span-1 sm:col-span-2 font-mono font-bold text-sm ${isActive ? c.text : 'text-slate-400'}`}>{v.method}</span>
                        <span className="col-span-1 sm:col-span-2 text-xs text-slate-300">{v.crud}</span>
                        <code className="col-span-2 sm:col-span-4 text-[11px] font-mono text-slate-500">{v.example}</code>
                        <span className="col-span-1 sm:col-span-2 flex sm:justify-center">
                            {v.safe ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-slate-600" />}
                        </span>
                        <span className="col-span-1 sm:col-span-2 flex sm:justify-center">
                            {v.idempotent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-slate-600" />}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function SceneHTTPMessage({ step }) {
    const isResponse = step.act === 6;
    const statusBg = step.statusCode >= 200 && step.statusCode < 300
        ? 'bg-green-500/10 border-green-500/30 text-green-400'
        : 'bg-red-500/10 border-red-500/30 text-red-400';
    return (
        <div className="flex flex-col gap-2 py-4 font-mono text-sm">
            {isResponse && step.statusCode && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-1 ${statusBg}`}>
                    <span className="text-3xl font-bold">{step.statusCode}</span>
                    <div>
                        <div className="font-semibold">{step.statusText}</div>
                        <div className="text-xs opacity-70 font-sans">HTTP/1.1 status line</div>
                    </div>
                </div>
            )}
            {(step.lines || []).map((line, i) => {
                if (line.type === 'method') return (
                    <div key={i} className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <span className="text-blue-300 font-bold">{line.text}</span>
                        {line.comment && <span className="text-slate-600 text-xs ml-3 font-sans"># {line.comment}</span>}
                    </div>
                );
                if (line.type === 'header') return (
                    <div key={i} className="px-3 py-1.5 rounded-lg hover:bg-slate-800/30 flex items-baseline gap-2">
                        <span className="text-zinc-400 shrink-0">{line.key}:</span>
                        <span className="text-slate-300 min-w-0 break-all">{line.value}</span>
                        {line.comment && <span className="text-slate-600 text-xs ml-auto shrink-0 font-sans"># {line.comment}</span>}
                    </div>
                );
                if (line.type === 'separator') return (
                    <div key={i} className="px-3 py-1 text-slate-600 text-xs italic border-t border-slate-800/50 font-sans">{line.text}</div>
                );
                return null;
            })}
            {step.bodyJson && (
                <div className="mt-1 p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-sans">JSON {isResponse ? 'response' : 'request'} body</div>
                    <pre className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{step.bodyJson}</pre>
                </div>
            )}
            {step.sent && (
                <div className="mt-2 px-3 py-2 bg-zinc-500/10 border border-zinc-500/20 rounded-lg flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-sans">Request sent over HTTPS → api.example.com</span>
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
    purple: { ring: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
};
const nodeIcons = { router: ChevronRight, auth: Shield, validate: CheckCircle, controller: Code2, db: Database, serializer: FileJson };

function SceneServer({ step }) {
    return (
        <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
                {step.nodes.map((node, i) => {
                    const c = nodeColor[node.color];
                    const isActive = node.state === 'active';
                    const isDone   = node.state === 'done';
                    const Icon = nodeIcons[node.id] || Server;
                    return (
                        <div key={node.id} className="flex items-center gap-1.5">
                            <div className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all text-center min-w-[78px] ${
                                isActive ? `${c.ring} ${c.bg} shadow-lg ${c.glow} scale-110`
                                : isDone ? 'border-slate-700 bg-slate-900/30 opacity-50'
                                : 'border-slate-800/60 bg-slate-900/20 opacity-40'
                            }`}>
                                {isDone ? <CheckCircle className="h-4 w-4 text-slate-500 mb-1" /> : <Icon className={`h-4 w-4 mb-1 ${isActive ? c.text : 'text-slate-600'}`} />}
                                <span className={`text-xs font-semibold ${isActive ? c.text : 'text-slate-400'}`}>{node.label}</span>
                                <span className="text-[10px] text-slate-600">{node.sub}</span>
                            </div>
                            {i < step.nodes.length - 1 && <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />}
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-[11px] text-slate-600 font-mono">request flows left → right; any layer can reject early</p>
        </div>
    );
}

function SceneStatusCodes({ step }) {
    return (
        <div className="flex flex-col gap-2.5 py-4">
            {STATUS_FAMILIES.map(fam => {
                const c = famColorMap[fam.color];
                const isActive = fam.code === step.activeFamily;
                return (
                    <div key={fam.code} className={`px-4 py-3 rounded-xl border transition-all ${
                        isActive ? `${c.border} ${c.bg} scale-[1.02]` : 'border-slate-800/60 bg-slate-900/30 opacity-45'
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold text-lg ${isActive ? c.text : 'text-slate-500'}`}>{fam.code}</span>
                            <span className={`text-sm font-semibold ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{fam.name}</span>
                            <div className="ml-auto flex flex-wrap gap-1.5 justify-end">
                                {fam.examples.map(ex => (
                                    <span key={ex.c} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isActive ? `${c.border} ${c.text}` : 'border-slate-800 text-slate-600'}`}>
                                        {ex.c} {ex.t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SceneStateless({ step }) {
    return (
        <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-3">
                {(step.requests || []).map(req => (
                    <div key={req.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        req.active ? 'border-zinc-400/60 bg-zinc-500/15 scale-[1.02]' : 'border-slate-800/60 bg-slate-900/30 opacity-50'
                    }`}>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/40 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-blue-400">{req.id}</span>
                        </div>
                        <code className="text-sm font-mono text-slate-200">{req.method} {req.path}</code>
                        {req.token && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 shrink-0">
                                <Key className="h-3 w-3" /> Bearer token
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {step.phase === 'req_b' && (
                <div className="px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-center">
                    <span className="text-xs text-slate-500">Server memory between requests: </span>
                    <span className="text-xs font-mono text-red-400">∅ nothing</span>
                </div>
            )}

            {step.scaling && (
                <div className="flex flex-col gap-3 mt-1">
                    <div className="flex items-center justify-center gap-2">
                        <div className="px-3 py-2 rounded-lg bg-zinc-500/15 border border-zinc-600/50 text-xs text-zinc-300 font-medium">Load Balancer</div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        {['Server 1', 'Server 2', 'Server 3'].map((s, i) => (
                            <div key={s} className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                                <Server className="h-4 w-4 text-green-400" />
                                <span className="text-[10px] text-slate-400">{s}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-[11px] text-slate-600">Any server handles any request — just add more to scale.</p>
                </div>
            )}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1) return <SceneConcept step={step} />;
    if (step.act === 2 && step.phase === 'url_breakdown')       return <SceneUrlBreakdown step={step} />;
    if (step.act === 2 && step.phase === 'collection_vs_item')  return <SceneCollectionVsItem step={step} />;
    if (step.act === 2 && step.phase === 'good_vs_bad')         return <SceneGoodVsBad step={step} />;
    if (step.act === 3) return <SceneVerbs step={step} />;
    if (step.act === 4) return <SceneHTTPMessage step={step} />;
    if (step.act === 5) return <SceneServer step={step} />;
    if (step.act === 6) return <SceneHTTPMessage step={step} />;
    if (step.act === 7) return <SceneStatusCodes step={step} />;
    if (step.act === 8) return <SceneStateless step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'Which HTTP verb should create a brand-new resource in a collection?',
        options: ['GET', 'POST', 'PUT', 'DELETE'],
        correct: 1,
        explanation: 'POST to a collection (e.g. POST /users) creates a new resource. It is not idempotent — sending it twice creates two resources. GET reads, PUT replaces an existing resource, DELETE removes one.',
    },
    {
        question: 'A request fails with 401 Unauthorized. Whose problem is it, and why?',
        options: [
            'The server crashed — it is a server-side bug',
            'The client — authentication failed (missing or invalid token)',
            'The network dropped the connection',
            'The resource was permanently moved',
        ],
        correct: 1,
        explanation: '401 is in the 4xx family — client errors. It means the request was not authenticated: no token, an expired token, or an invalid one. Fixing the Authorization header fixes it. (5xx codes are the server\'s fault.)',
    },
    {
        question: 'What does it mean that REST is "stateless"?',
        options: [
            'The server never stores any data anywhere',
            'Each request must carry everything the server needs; the server keeps no memory between requests',
            'The client cannot send data, only receive it',
            'Responses are never cached',
        ],
        correct: 1,
        explanation: 'Stateless means the server holds no session memory between requests — each request is self-contained (e.g. it carries its own auth token). Data still lives in the database; it is the per-client conversation state that the server does not keep. This is what lets any server handle any request.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand how REST APIs work!' : 'Review the explanations to reinforce the concepts.'}
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

export default function HowARestApiWorksPage() {
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
                                How a REST API Works
                            </h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                From a URL to JSON and back — resources, verbs, requests, status codes, and statelessness, step by step
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
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
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-zinc-400 border border-white/10'
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

                        {/* Quick reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">CRUD ↔ verb cheat sheet</p>
                            <div className="space-y-1.5 text-xs">
                                {VERBS.map(v => (
                                    <div key={v.method} className={`flex justify-between px-2 py-1 rounded-lg transition-colors ${step?.act === 3 && step?.activeVerb === v.method ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span className="font-mono font-semibold">{v.method}</span>
                                        <span>{v.crud}</span>
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
