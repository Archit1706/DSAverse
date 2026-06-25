"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Database, FileSearch, GitBranch, Gauge, Table, Search, HardDrive,
    ChevronRight, ChevronDown, CheckCircle, XCircle, Key, Layers, ListOrdered, Filter,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'The Query',   icon: Database     },
    { id: 2, label: 'Parser',      icon: FileSearch   },
    { id: 3, label: 'Logical Plan',icon: GitBranch    },
    { id: 4, label: 'Optimizer',   icon: Gauge        },
    { id: 5, label: 'Full Scan',   icon: Table        },
    { id: 6, label: 'Index Scan',  icon: Search       },
    { id: 7, label: 'Execution',   icon: Layers       },
    { id: 8, label: 'Result',      icon: ListOrdered  },
];

// ── Full-scan row grid (Act 5) ──────────────────────────────────────────────────
const SCAN_CELLS = 28;
const MATCH_IDX = [4, 11, 19, 25]; // rows where city = 'Paris'

// ── Logical / physical plan operators ───────────────────────────────────────────
const LOGICAL_PLAN = [
    { id: 'limit',   icon: ListOrdered, label: 'Limit 20',                 kind: 'logical' },
    { id: 'sort',    icon: ListOrdered, label: 'Sort  (name ↑)',           kind: 'logical' },
    { id: 'project', icon: Layers,      label: 'Project  (name, city)',    kind: 'logical' },
    { id: 'filter',  icon: Filter,      label: "Filter  (city = 'Paris')", kind: 'logical' },
    { id: 'scan',    icon: Table,       label: 'Scan  users',              kind: 'logical' },
];
const PHYSICAL_PLAN = [
    { id: 'limit', icon: ListOrdered, label: 'Limit 20',              rows: '20 rows' },
    { id: 'sort',  icon: ListOrdered, label: 'Sort  (name ↑)',        rows: '~2,000 rows' },
    { id: 'iscan', icon: Search,      label: 'Index Scan  city_idx',  rows: '~2,000 rows' },
];

// ── B-tree (Act 6) ──────────────────────────────────────────────────────────────
function BTree({ active = [], fetch = false }) {
    const on = id => active.includes(id);
    const nodeFill = id => on(id) ? '#3f3f46' : '#1e293b';
    const nodeStroke = id => on(id) ? '#e4e4e7' : '#475569';
    const nodeText = id => on(id) ? '#ffffff' : '#94a3b8';
    const Node = ({ id, x, y, w, label }) => (
        <g opacity={active.length && !on(id) ? 0.5 : 1}>
            <rect x={x - w / 2} y={y - 16} width={w} height="32" rx="6" fill={nodeFill(id)} stroke={nodeStroke(id)} strokeWidth="2" />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill={nodeText(id)} fontFamily="monospace">{label}</text>
        </g>
    );
    return (
        <svg viewBox="0 0 420 250" width="100%" className="max-h-[330px]">
            <defs>
                <marker id="dbah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>
            {/* edges root → level1 */}
            <line x1="210" y1="46" x2="80"  y2="96" stroke={on('n1') ? '#22c55e' : '#475569'} strokeWidth="1.6" />
            <line x1="210" y1="46" x2="210" y2="96" stroke={on('n2') ? '#22c55e' : '#475569'} strokeWidth="1.6" />
            <line x1="210" y1="46" x2="330" y2="96" stroke={on('n3') ? '#22c55e' : '#475569'} strokeWidth="2.4" />

            <Node id="root" x={210} y={30} w={86} label="G | P" />
            <Node id="n1" x={80}  y={112} w={70} label="A – F" />
            <Node id="n2" x={210} y={112} w={70} label="G – O" />
            <Node id="n3" x={330} y={112} w={92} label="P – Z" />

            {/* leaf detail under n3 */}
            <g opacity={on('n3') ? 1 : 0.35}>
                <rect x={262} y={150} width={136} height={34} rx="6" fill={fetch ? '#14532d' : '#1e293b'} stroke={fetch ? '#22c55e' : '#64748b'} strokeWidth="1.6" />
                <text x={330} y={171} textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="monospace">…Oslo · Paris · Rome…</text>
            </g>

            {/* fetch arrows to heap rows */}
            {fetch && (
                <>
                    <line x1="330" y1="186" x2="330" y2="206" stroke="#22c55e" strokeWidth="1.6" markerEnd="url(#dbah)" />
                    <rect x={250} y={208} width={160} height={34} rx="6" fill="#14532d" stroke="#22c55e" strokeWidth="1.4" />
                    <text x={330} y={229} textAnchor="middle" fontSize="10" fill="#bbf7d0" fontFamily="monospace">heap: 4 matching rows fetched</text>
                </>
            )}
            <text x={70} y={232} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">B+tree on city</text>
        </svg>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, phase, data, explanation) => steps.push({ act, actName, phase, ...data, explanation });

    // ═══ ACT 1: The Query ═══
    s(1, 'The Query', 'sql', {
        sql: [
            { x: 'SELECT name, city', t: 'kw' },
            { x: 'FROM users', t: 'kw' },
            { x: "WHERE city = 'Paris'", t: 'kw' },
            { x: 'ORDER BY name', t: 'kw' },
            { x: 'LIMIT 20;', t: 'kw' },
        ],
    }, 'We will follow one SQL query from text to result. SQL is declarative: you describe WHAT you want — the 20 alphabetically-first users in Paris — not HOW to get it. The database is free to choose any execution strategy that produces the correct answer. Turning this "what" into an efficient "how" is the whole job of the query engine.');

    s(1, 'The Query', 'schema', {
        table: {
            name: 'users', rows: '1,000,000',
            cols: [
                { name: 'id', type: 'int', pk: true },
                { name: 'name', type: 'text' },
                { name: 'city', type: 'text', idx: true },
                { name: 'age', type: 'int' },
            ],
        },
    }, 'Here is the table. users has 1,000,000 rows. Crucially, there is a secondary index on the city column (a B+tree). That index is the difference between scanning a million rows and jumping straight to the handful we need — but as we will see, the database does not always use it. The optimizer decides.');

    // ═══ ACT 2: Parser ═══
    s(2, 'Parsing', 'tokenize', {
        tokens: ['SELECT', 'name', ',', 'city', 'FROM', 'users', 'WHERE', 'city', '=', "'Paris'", 'ORDER BY', 'name', 'LIMIT', '20'],
    }, 'First the parser tokenizes the raw string: it scans the characters and groups them into tokens — keywords (SELECT, FROM, WHERE), identifiers (name, city, users), operators (=), and literals (\'Paris\', 20). This is the same lexing step every language front-end performs.');

    s(2, 'Parsing', 'parse_tree', {
        ast: [
            { d: 0, x: 'SelectStmt' },
            { d: 1, x: 'targets: [name, city]' },
            { d: 1, x: 'from: users' },
            { d: 1, x: "where: city = 'Paris'" },
            { d: 1, x: 'orderBy: name' },
            { d: 1, x: 'limit: 20' },
        ],
    }, 'The parser then checks the tokens against SQL grammar and builds a parse tree (AST). A misplaced keyword or missing comma is rejected here with a syntax error — before the database does any real work.');

    s(2, 'Parsing', 'validate', {
        checks: [
            { ok: true, txt: "table 'users' exists" },
            { ok: true, txt: "columns name, city exist" },
            { ok: true, txt: "city is text — comparable to 'Paris'" },
            { ok: true, txt: 'user has SELECT permission' },
        ],
    }, 'Next, semantic analysis (binding) resolves every name against the catalog: does the table exist? Do the columns exist and have compatible types? Does the user have permission? This is where "column does not exist" or "permission denied" errors come from. The validated tree is now ready to be planned.');

    // ═══ ACT 3: Logical Plan ═══
    s(3, 'Logical Plan', 'tree', {
        plan: 'logical', activeOp: null,
    }, 'The validated query becomes a logical plan — a tree of relational-algebra operators. Read it bottom-up: scan the users table, filter rows where city = \'Paris\', project the name and city columns, sort by name, and take the first 20. This tree says WHAT to compute but not HOW — e.g. "Scan users" does not yet say whether to use the index. That is still the optimizer\'s call.');

    // ═══ ACT 4: Optimizer ═══
    s(4, 'Cost-Based Optimizer', 'stats', {
        statsRows: [
            { k: 'Total rows in users', v: '1,000,000' },
            { k: "Estimated rows matching city='Paris'", v: '~2,000' },
            { k: 'Selectivity', v: '0.2%' },
            { k: 'Index on city', v: 'yes (B+tree)' },
        ],
    }, 'The optimizer is cost-based: it estimates the work of competing plans and picks the cheapest. To estimate, it uses statistics collected about the data — row counts, and histograms of column values. From the histogram it predicts city=\'Paris\' matches about 2,000 of the 1,000,000 rows: a selectivity of 0.2%. That tiny fraction is the key input to the decision.');

    s(4, 'Cost-Based Optimizer', 'candidates', {
        candidates: [
            { id: 'seq', name: 'Seq Scan + Filter', reads: 'read all 1,000,000 rows', cost: 14250, w: 100, color: 'orange' },
            { id: 'idx', name: 'Index Scan (city_idx)', reads: 'B+tree lookup → ~2,000 rows', cost: 410, w: 8, color: 'green' },
        ],
    }, 'It enumerates physical plans for the same logical query. Plan A: a sequential scan reading every row and applying the filter. Plan B: an index scan that uses the B+tree on city to jump to matching rows. Each gets an estimated cost — a unit that blends disk page reads and CPU work. Plan A must touch all 1M rows; Plan B only ~2,000.');

    s(4, 'Cost-Based Optimizer', 'decision', {
        candidates: [
            { id: 'seq', name: 'Seq Scan + Filter', reads: 'read all 1,000,000 rows', cost: 14250, w: 100, color: 'orange', rejected: true },
            { id: 'idx', name: 'Index Scan (city_idx)', reads: 'B+tree lookup → ~2,000 rows', cost: 410, w: 8, color: 'green', chosen: true },
        ],
    }, 'Cost 410 beats 14,250, so the optimizer chooses the Index Scan. But this is not automatic! If \'Paris\' matched 60% of the table, thousands of scattered random index lookups would cost MORE than one fast sequential read — and the optimizer would correctly pick the Seq Scan instead. This is why an index is sometimes ignored: the planner chose based on selectivity, not on whether an index merely exists.');

    // ═══ ACT 5: Full Scan (the rejected plan, shown for contrast) ═══
    s(5, 'Full Table Scan', 'sweep1', { scanned: 10 },
        'To appreciate the choice, picture the plan the optimizer rejected: a sequential scan. It reads the table page by page, row by row, from the start — testing city = \'Paris\' on every single one. Here it has checked the first rows; matches light up green, the vast majority are discarded.');
    s(5, 'Full Table Scan', 'sweep2', { scanned: 20 },
        'It keeps going. There is no shortcut — the scan cannot know where the Paris rows are without looking at each one. For 1,000,000 rows that is 1,000,000 comparisons and a read of every data page from disk. Cost grows linearly: O(n).');
    s(5, 'Full Table Scan', 'done', { scanned: SCAN_CELLS, summary: true },
        'Scan complete: 4 matches found out of 28 rows shown (≈2,000 out of 1,000,000 in reality). 99.8% of the work was wasted reading rows we threw away. For a highly selective filter, this is exactly the waste an index avoids — which is why the optimizer rejected this plan.');

    // ═══ ACT 6: Index Scan (the chosen plan) ═══
    s(6, 'Index Scan', 'root', { active: ['root'], fetch: false },
        'Now the chosen plan. The index is a B+tree whose keys are city values, kept in sorted order. The scan starts at the root and compares: \'Paris\' ≥ \'P\', so it descends to the rightmost child. One comparison just eliminated two-thirds of the tree.');
    s(6, 'Index Scan', 'leaf', { active: ['root', 'n3'], fetch: false },
        'A B+tree is shallow and wide — even a billion keys is only ~4 levels deep, so locating any key takes a handful of page reads: O(log n). The descent lands in the leaf page holding the P–Z range, where \'Paris\' sits between \'Oslo\' and \'Rome\' in sorted order.');
    s(6, 'Index Scan', 'fetch', { active: ['root', 'n3'], fetch: true },
        'The leaf entries for \'Paris\' carry pointers to the actual table rows. The engine follows them to fetch just those ~2,000 rows from the heap — never touching the other 998,000. Total work: ~3 page reads to descend the tree plus the matching rows. That is the O(log n + matches) win the optimizer predicted.');

    // ═══ ACT 7: Execution ═══
    s(7, 'Execution', 'iterator', { plan: 'physical', activeOp: 'iscan' },
        'The chosen physical plan now runs. Most engines use the iterator (Volcano) model: each operator exposes next(), and a parent pulls rows from its child on demand. Limit calls Sort, which calls Index Scan. Rows are produced lazily and flow upward through the tree — no operator materializes the whole table.');
    s(7, 'Execution', 'buffer', { buffer: true },
        'Underneath, reads go through the buffer pool — an in-memory cache of disk pages. If the B+tree pages and heap rows are already cached (a "warm" cache), the query touches RAM (~100 ns/page) instead of disk (~100 µs–10 ms/page) — often a 1,000×+ difference. This is why the first run of a query is slow and repeats are fast, and why DB servers are configured with huge amounts of RAM.');

    // ═══ ACT 8: Result ═══
    s(8, 'The Result', 'rows', {
        result: [
            { name: 'Amélie Laurent', city: 'Paris' },
            { name: 'Bruno Martin',   city: 'Paris' },
            { name: 'Camille Roche',  city: 'Paris' },
            { name: 'Élise Bernard',  city: 'Paris' },
            { name: '… 16 more',      city: '' },
        ],
        takeaways: [
            'Cost-based optimizer picks the cheapest plan, not a fixed one',
            'Statistics (selectivity) drive the index-vs-scan choice',
            'Indexes are ignored when they would cost more than a scan',
            'EXPLAIN ANALYZE shows the real chosen plan + timings',
        ],
    }, 'The 20 rows are sorted by name, the Limit stops the Sort early, and the result streams back to the client — in a few milliseconds instead of the hundreds a full scan would need. The lasting lesson: SQL says what you want; the cost-based optimizer, armed with statistics, decides how. Run EXPLAIN ANALYZE on any query to see exactly which plan it chose and why.');

    return steps;
}

// ── Scenes ────────────────────────────────────────────────────────────────────
function SceneQuery({ step }) {
    if (step.phase === 'sql') {
        return (
            <div className="py-8 w-full max-w-md mx-auto">
                <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-slate-800/60 text-[10px] font-mono text-slate-500 flex items-center gap-1.5"><Database className="h-3 w-3" /> query.sql</div>
                    <pre className="p-4 text-[13px] font-mono leading-relaxed">
                        {step.sql.map((l, i) => {
                            const kw = l.x.match(/^(SELECT|FROM|WHERE|ORDER BY|LIMIT)/)?.[0] || '';
                            const rest = l.x.slice(kw.length);
                            return <div key={i}><span className="text-fuchsia-400 font-semibold">{kw}</span><span className="text-slate-300">{rest}</span></div>;
                        })}
                    </pre>
                </div>
            </div>
        );
    }
    const t = step.table;
    return (
        <div className="py-8 w-full max-w-sm mx-auto">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50">
                    <div className="flex items-center gap-2"><Table className="h-4 w-4 text-cyan-400" /><span className="font-mono font-semibold text-slate-200">{t.name}</span></div>
                    <span className="text-[11px] text-slate-500 font-mono">{t.rows} rows</span>
                </div>
                <div className="divide-y divide-slate-800/60">
                    {t.cols.map(c => (
                        <div key={c.name} className="flex items-center justify-between px-4 py-2 text-sm">
                            <span className="font-mono text-slate-300">{c.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 font-mono">{c.type}</span>
                                {c.pk && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"><Key className="h-2.5 w-2.5" />PK</span>}
                                {c.idx && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30"><Search className="h-2.5 w-2.5" />index</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SceneParser({ step }) {
    if (step.phase === 'tokenize') {
        return (
            <div className="flex flex-wrap gap-1.5 justify-center py-8 w-full">
                {step.tokens.map((t, i) => {
                    const isKw = /^(SELECT|FROM|WHERE|ORDER BY|LIMIT)$/.test(t);
                    const isLit = /^'.*'$|^\d+$/.test(t);
                    return <span key={i} className={`px-2 py-1 rounded-md text-xs font-mono border ${
                        isKw ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300'
                        : isLit ? 'bg-green-500/10 border-green-500/30 text-green-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'}`}>{t}</span>;
                })}
            </div>
        );
    }
    if (step.phase === 'parse_tree') {
        return (
            <div className="py-8 w-full max-w-sm mx-auto rounded-xl border border-slate-700/60 bg-slate-950/60 p-4 font-mono text-xs">
                {step.ast.map((n, i) => (
                    <div key={i} className="text-slate-300" style={{ paddingLeft: `${n.d * 18}px` }}>
                        <span className="text-slate-600">{n.d > 0 ? '└─ ' : ''}</span>{n.x}
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2 py-8 w-full max-w-md mx-auto">
            {step.checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/5 text-green-300 text-xs">
                    <CheckCircle className="h-4 w-4 shrink-0" />{c.txt}
                </div>
            ))}
        </div>
    );
}

function PlanTree({ ops, activeOp, physical }) {
    return (
        <div className="flex flex-col gap-1.5 py-6 w-full max-w-md mx-auto">
            {ops.map((op, i) => {
                const Icon = op.icon;
                const isActive = op.id === activeOp;
                return (
                    <div key={op.id} style={{ marginLeft: `${i * 18}px` }} className="flex items-center gap-2">
                        {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-700 -ml-3 rotate-[-45deg]" />}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 transition-all ${
                            isActive ? 'border-zinc-400/60 bg-zinc-500/20 scale-[1.02]' : 'border-slate-700/60 bg-slate-900/50'
                        }`}>
                            <Icon className={`h-4 w-4 shrink-0 ${op.id === 'iscan' || op.id === 'scan' ? 'text-green-400' : 'text-slate-400'}`} />
                            <span className="text-xs font-mono text-slate-200 flex-1">{op.label}</span>
                            {op.rows && <span className="text-[10px] text-slate-500 font-mono">{op.rows}</span>}
                        </div>
                    </div>
                );
            })}
            <div className="flex items-center gap-1.5 justify-center mt-2 text-[10px] text-slate-600">
                <ChevronDown className="h-3 w-3 rotate-180" /> rows flow upward {physical ? '(pulled on demand)' : ''}
            </div>
        </div>
    );
}

function SceneOptimizer({ step }) {
    if (step.phase === 'stats') {
        return (
            <div className="py-8 w-full max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-3"><Gauge className="h-4 w-4 text-zinc-300" /><span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Table statistics</span></div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 divide-y divide-slate-800/60">
                    {step.statsRows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="text-slate-400 text-xs">{r.k}</span>
                            <span className="font-mono text-slate-200 text-xs">{r.v}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-3 py-6 w-full">
            {step.candidates.map(c => (
                <div key={c.id} className={`rounded-xl border p-4 transition-all ${
                    c.chosen ? 'border-green-500/50 bg-green-500/10'
                    : c.rejected ? 'border-slate-700/60 bg-slate-900/40 opacity-60'
                    : 'border-slate-700/60 bg-slate-900/50'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${c.color === 'green' ? 'text-green-300' : 'text-orange-300'}`}>{c.name}</span>
                        {c.chosen && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40"><CheckCircle className="h-3 w-3" />chosen</span>}
                        {c.rejected && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400"><XCircle className="h-3 w-3" />rejected</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2 font-mono">{c.reads}</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-900/60 rounded h-5 overflow-hidden">
                            <div className={`h-full rounded ${c.color === 'green' ? 'bg-green-500' : 'bg-orange-500'} transition-all duration-500`} style={{ width: `${c.w}%` }} />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-300 w-20 text-right">cost {c.cost.toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SceneFullScan({ step }) {
    return (
        <div className="flex flex-col items-center gap-4 py-6 w-full">
            <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: SCAN_CELLS }).map((_, i) => {
                    const isMatch = MATCH_IDX.includes(i);
                    const scanned = i < step.scanned;
                    const isCurrent = i === step.scanned - 1;
                    let cls = 'bg-slate-800/40 border-slate-800 text-slate-700';
                    if (scanned) cls = isMatch ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-800 border-slate-700 text-slate-600';
                    if (isCurrent) cls += ' ring-2 ring-yellow-400/60';
                    return (
                        <div key={i} className={`w-9 h-7 rounded border flex items-center justify-center text-[9px] font-mono transition-all ${cls}`}>
                            {scanned ? (isMatch ? 'Paris' : '·') : ''}
                        </div>
                    );
                })}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">{step.scanned} / {SCAN_CELLS} rows read · sequential</div>
            {step.summary && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <Table className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-orange-300">4 matches · 24 rows read and discarded · O(n)</span>
                </div>
            )}
        </div>
    );
}

function SceneIndexScan({ step }) {
    return (
        <div className="py-2 w-full">
            <BTree active={step.active} fetch={step.fetch} />
        </div>
    );
}

function SceneExecution({ step }) {
    if (step.buffer) {
        return (
            <div className="flex flex-col items-center justify-center gap-5 py-8 w-full">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl border border-green-500/40 bg-green-500/10">
                        <Layers className="h-6 w-6 text-green-400" />
                        <span className="text-xs font-semibold text-green-300">Buffer pool (RAM)</span>
                        <span className="text-[10px] text-slate-500 font-mono">~100 ns / page</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                        <span className="text-[10px] text-slate-600">miss ↓</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl border border-slate-600/50 bg-slate-900/50">
                        <HardDrive className="h-6 w-6 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-300">Disk</span>
                        <span className="text-[10px] text-slate-500 font-mono">~100 µs–10 ms / page</span>
                    </div>
                </div>
                <p className="text-xs text-slate-500 text-center max-w-sm">Warm cache → query hits RAM, 1,000×+ faster than disk. First run is cold and slow; repeats are fast.</p>
            </div>
        );
    }
    return <PlanTree ops={PHYSICAL_PLAN} activeOp={step.activeOp} physical />;
}

function SceneResult({ step }) {
    return (
        <div className="flex flex-col gap-4 py-6 w-full">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden max-w-sm mx-auto w-full">
                <div className="grid grid-cols-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                    <span>name</span><span>city</span>
                </div>
                {step.result.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 px-4 py-1.5 text-xs font-mono text-slate-300 border-b border-slate-800/40 last:border-0">
                        <span>{r.name}</span><span className="text-green-400">{r.city}</span>
                    </div>
                ))}
            </div>
            <div className="text-center text-[11px] text-green-400 font-mono">20 rows · ~3 ms (index scan)</div>
            <div className="max-w-md mx-auto w-full space-y-1.5">
                {step.takeaways.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <CheckCircle className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />{t}
                    </div>
                ))}
            </div>
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1) return <SceneQuery step={step} />;
    if (step.act === 2) return <SceneParser step={step} />;
    if (step.act === 3) return <PlanTree ops={LOGICAL_PLAN} activeOp={step.activeOp} />;
    if (step.act === 4) return <SceneOptimizer step={step} />;
    if (step.act === 5) return <SceneFullScan step={step} />;
    if (step.act === 6) return <SceneIndexScan step={step} />;
    if (step.act === 7) return <SceneExecution step={step} />;
    if (step.act === 8) return <SceneResult step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'A query has an index on the filtered column, yet the optimizer uses a full table scan. Why might that be correct?',
        options: [
            'Indexes only work on integer columns',
            'The filter matches a large fraction of rows, so scattered index lookups would cost more than one sequential scan',
            'The index was disabled by the parser',
            'Full scans are always faster than index scans',
        ],
        correct: 1,
        explanation: 'Cost-based optimizers weigh selectivity. If a predicate matches most of the table, doing thousands of random index lookups (and row fetches) costs more than a single sequential read. The optimizer correctly prefers the scan — having an index does not force its use.',
    },
    {
        question: 'What does the cost-based optimizer primarily use to estimate how many rows a filter will match?',
        options: [
            'The order of columns in the SELECT clause',
            'The length of the SQL string',
            'Statistics about the data — row counts and value histograms',
            'The number of indexes on the table',
        ],
        correct: 2,
        explanation: 'The optimizer relies on collected statistics — table row counts and per-column histograms — to estimate selectivity. Stale statistics lead to bad estimates and bad plans, which is why databases periodically run ANALYZE / update statistics.',
    },
    {
        question: 'Why does an index scan on a B+tree find matching rows in roughly O(log n) instead of O(n)?',
        options: [
            'It loads the whole table into RAM first',
            'The B+tree is sorted and shallow, so a few comparisons descend straight to the matching leaf',
            'It skips the WHERE clause',
            'Indexes store the answer to every possible query',
        ],
        correct: 1,
        explanation: 'A B+tree keeps keys sorted and is wide and shallow (even billions of keys are only a few levels deep). Each step down eliminates a large fraction of the tree, so locating a key takes a handful of page reads — O(log n) — instead of scanning every row.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand how the query engine thinks!' : 'Review the explanations to reinforce the concepts.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Question {quizState.current + 1} / {QUIZ.length}</div>
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
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
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

export default function HowADatabaseQueryExecutesPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1100);
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How a Database Query Executes</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                SQL → parser → planner → cost-based optimizer → executor — and why the planner picks index scan over full scan
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
                                    <ActIcon className="h-3 w-3" />{act.label}
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
                    {/* Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Stage {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 min-h-[340px] flex items-center">
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
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Pipeline reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Query lifecycle</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { st: 1, label: 'SQL text',     note: 'declarative' },
                                    { st: 2, label: 'Parser',       note: 'tokens → AST' },
                                    { st: 3, label: 'Logical plan', note: 'relational algebra' },
                                    { st: 4, label: 'Optimizer',    note: 'cost-based choice' },
                                    { st: 5, label: 'Full scan',    note: 'O(n) — rejected' },
                                    { st: 6, label: 'Index scan',   note: 'O(log n) — chosen' },
                                    { st: 7, label: 'Executor',     note: 'iterator model' },
                                    { st: 8, label: 'Result set',   note: '20 rows' },
                                ].map(row => (
                                    <div key={row.st} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step?.act === row.st ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[10px] text-right">{row.note}</span>
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
