"use client";

import React, { useState } from 'react';
import { X, RefreshCw, Check, AlertCircle, Settings2 } from 'lucide-react';

/* ── Layout ──────────────────────────────────────────────── */
export function layoutNodes(nodeCount) {
    if (nodeCount === 0) return [];
    const cx = 270, cy = 180;
    const r = nodeCount <= 3 ? 90 : nodeCount <= 6 ? 140 : nodeCount <= 9 ? 165 : 175;
    return Array.from({ length: nodeCount }, (_, i) => ({
        id: i,
        x: Math.round(cx + r * Math.cos((2 * Math.PI * i) / nodeCount - Math.PI / 2)),
        y: Math.round(cy + r * Math.sin((2 * Math.PI * i) / nodeCount - Math.PI / 2)),
    }));
}

/* ── Parsers ─────────────────────────────────────────────── */
/* `directed` defaults to false so every existing caller (BFS, DFS, Dijkstra,
   Connected Components, Prim, Kruskal) keeps the undirected behaviour it was
   written against. Only Floyd-Warshall and the topological sorts opt in. */
function buildAdj(nodeCount, edges, weighted, directed = false) {
    const adj = {};
    for (let i = 0; i < nodeCount; i++) adj[i] = [];
    for (const e of edges) {
        if (weighted) {
            const [a, b, w] = e;
            adj[a].push([b, w]);
            if (!directed) adj[b].push([a, w]);
        } else {
            const [a, b] = e;
            if (!adj[a].includes(b)) adj[a].push(b);
            if (!directed && !adj[b].includes(a)) adj[b].push(a);
        }
    }
    return adj;
}

/** Kahn's algorithm, used only to reject cyclic input for the topo sorts. */
export function hasCycle(nodeCount, adj) {
    const indeg = new Array(nodeCount).fill(0);
    for (let i = 0; i < nodeCount; i++) {
        for (const nb of adj[i] ?? []) indeg[Array.isArray(nb) ? nb[0] : nb]++;
    }
    const queue = [];
    for (let i = 0; i < nodeCount; i++) if (indeg[i] === 0) queue.push(i);
    let seen = 0;
    while (queue.length) {
        const n = queue.shift();
        seen++;
        for (const nb of adj[n] ?? []) {
            const t = Array.isArray(nb) ? nb[0] : nb;
            if (--indeg[t] === 0) queue.push(t);
        }
    }
    return seen !== nodeCount;
}

function parseEdgeList(text, weighted, directed) {
    const parts = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    const nodeSet = new Set();
    const edges = [];
    for (const part of parts) {
        if (weighted) {
            const m = part.match(/^(\d+)[-–](\d+):(\d+(?:\.\d+)?)$/);
            if (!m) continue;
            const [, a, b, w] = m;
            edges.push([+a, +b, +w]);
            nodeSet.add(+a); nodeSet.add(+b);
        } else {
            const m = part.match(/^(\d+)[-–](\d+)$/);
            if (!m) continue;
            const [, a, b] = m;
            edges.push([+a, +b]);
            nodeSet.add(+a); nodeSet.add(+b);
        }
    }
    if (!nodeSet.size) return null;
    const nodeCount = Math.max(...nodeSet) + 1;
    return { nodeCount, edges, adj: buildAdj(nodeCount, edges, weighted, directed) };
}

function parseAdjList(text, weighted, directed) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const nodeSet = new Set();
    const rawAdj = {};
    for (const line of lines) {
        const m = line.match(/^(\d+)\s*[:\s]\s*(.*)$/);
        if (!m) continue;
        const node = +m[1];
        nodeSet.add(node);
        rawAdj[node] = [];
        const rest = m[2].trim();
        if (!rest) continue;
        if (weighted) {
            for (const tok of rest.split(/[\s,]+/).filter(Boolean)) {
                const pm = tok.match(/^(\d+):(\d+(?:\.\d+)?)$/);
                if (pm) { rawAdj[node].push([+pm[1], +pm[2]]); nodeSet.add(+pm[1]); }
            }
        } else {
            for (const nb of rest.split(/[\s,]+/).filter(Boolean).map(Number)) {
                rawAdj[node].push(nb); nodeSet.add(nb);
            }
        }
    }
    if (!nodeSet.size) return null;
    const nodeCount = Math.max(...nodeSet) + 1;
    for (let i = 0; i < nodeCount; i++) if (!rawAdj[i]) rawAdj[i] = [];

    const seen = new Set();
    const edges = [];
    for (const [nStr, neighbors] of Object.entries(rawAdj)) {
        const n = +nStr;
        for (const nb of neighbors) {
            const [a, b, w] = weighted ? [n, nb[0], nb[1]] : [n, nb, null];
            // Undirected input lists each edge from both ends, so collapse
            // a-b and b-a. Directed input must keep them as distinct edges.
            const key = directed ? `${a}->${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`;
            if (!seen.has(key)) { seen.add(key); edges.push(weighted ? [a, b, w] : [a, b]); }
        }
    }
    return { nodeCount, edges, adj: rawAdj };
}

function parseMatrix(text, weighted, directed) {
    const lines = text.trim().split('\n')
        .map(l => l.trim().split(/[\s,\t]+/).map(Number).filter(v => !isNaN(v)))
        .filter(l => l.length);
    if (!lines.length) return null;
    const n = lines.length;
    const edges = [];
    const adj = {};
    for (let i = 0; i < n; i++) adj[i] = [];
    for (let i = 0; i < n; i++) {
        // Undirected reads only the upper triangle and mirrors it; directed
        // reads the whole matrix, where cell [i][j] means i -> j alone.
        for (let j = directed ? 0 : i + 1; j < n; j++) {
            if (directed && i === j) continue;
            const v = lines[i]?.[j] ?? 0;
            if (!v) continue;
            if (weighted) {
                edges.push([i, j, v]);
                adj[i].push([j, v]);
                if (!directed) adj[j].push([i, v]);
            } else {
                edges.push([i, j]);
                adj[i].push(j);
                if (!directed) adj[j].push(i);
            }
        }
    }
    return { nodeCount: n, edges, adj };
}

export function parseGraphInput(text, format, weighted = false, directed = false) {
    try {
        const cleaned = text.trim();
        if (!cleaned) return null;
        switch (format) {
            case 'edgelist': return parseEdgeList(cleaned, weighted, directed);
            case 'adjlist':  return parseAdjList(cleaned, weighted, directed);
            case 'matrix':   return parseMatrix(cleaned, weighted, directed);
            default:         return null;
        }
    } catch { return null; }
}

/* ── Example data ────────────────────────────────────────── */
const EXAMPLES = {
    edgelist: {
        unweighted: '0-1, 0-2, 1-3, 1-4, 2-4, 2-5, 3-6, 4-6, 5-6',
        weighted:   '0-1:4, 0-2:2, 1-3:5, 1-4:10, 2-4:3, 2-5:8, 3-6:2, 4-6:7, 5-6:6',
    },
    adjlist: {
        unweighted: '0: 1 2\n1: 0 3 4\n2: 0 4 5\n3: 1 6\n4: 1 2 6\n5: 2 6\n6: 3 4 5',
        weighted:   '0: 1:4 2:2\n1: 0:4 3:5 4:10\n2: 0:2 4:3 5:8\n3: 1:5 6:2\n4: 1:10 2:3 6:7\n5: 2:8 6:6\n6: 3:2 4:7 5:6',
    },
    matrix: {
        unweighted: '0 1 1 0 0 0 0\n1 0 0 1 1 0 0\n1 0 0 0 1 1 0\n0 1 0 0 0 0 1\n0 1 1 0 0 0 1\n0 0 1 0 0 0 1\n0 0 0 1 1 1 0',
        weighted:   '0 4 2 0 0 0 0\n4 0 0 5 10 0 0\n2 0 0 0 3 8 0\n0 5 0 0 0 0 2\n0 10 3 0 0 0 7\n0 0 8 0 0 0 6\n0 0 0 2 7 6 0',
    },
};

/* Directed examples are acyclic, so they work for the topological sorts as
   well as Floyd-Warshall. Each entry reads strictly a -> b. */
const DIRECTED_EXAMPLES = {
    edgelist: {
        unweighted: '0-1, 0-2, 1-3, 2-3, 3-4, 3-5, 4-6, 5-6',
        weighted:   '0-1:4, 0-2:2, 1-3:5, 2-3:3, 3-4:2, 3-5:8, 4-6:7, 5-6:6',
    },
    adjlist: {
        unweighted: '0: 1 2\n1: 3\n2: 3\n3: 4 5\n4: 6\n5: 6\n6:',
        weighted:   '0: 1:4 2:2\n1: 3:5\n2: 3:3\n3: 4:2 5:8\n4: 6:7\n5: 6:6\n6:',
    },
    matrix: {
        unweighted: '0 1 1 0 0 0 0\n0 0 0 1 0 0 0\n0 0 0 1 0 0 0\n0 0 0 0 1 1 0\n0 0 0 0 0 0 1\n0 0 0 0 0 0 1\n0 0 0 0 0 0 0',
        weighted:   '0 4 2 0 0 0 0\n0 0 0 5 0 0 0\n0 0 0 3 0 0 0\n0 0 0 0 2 8 0\n0 0 0 0 0 0 7\n0 0 0 0 0 0 6\n0 0 0 0 0 0 0',
    },
};

/* ── Modal ────────────────────────────────────────────────── */
export function GraphCustomizer({ open, onClose, onApply, weighted = false, directed = false, requireAcyclic = false }) {
    const [format, setFormat] = useState('edgelist');
    const [text, setText]     = useState('');
    const [error, setError]   = useState('');

    if (!open) return null;

    const handleApply = () => {
        setError('');
        const result = parseGraphInput(text, format, weighted, directed);
        if (!result) { setError('Could not parse input. Check the format and try again.'); return; }
        if (result.nodeCount < 2) { setError('Graph must have at least 2 nodes.'); return; }
        if (result.nodeCount > 12) { setError('Limit to 12 nodes for a clear visualization.'); return; }
        if (!result.edges.length) { setError('No edges found. Add at least one edge.'); return; }
        // A topological order only exists for a DAG, so reject a cycle here
        // rather than letting the visualizer produce a partial ordering.
        if (requireAcyclic && hasCycle(result.nodeCount, result.adj)) {
            setError('This graph contains a cycle, so it has no topological order. Remove the cycle and try again.');
            return;
        }
        onApply(result);
        onClose();
    };

    const examples = directed ? DIRECTED_EXAMPLES : EXAMPLES;
    const exampleText = weighted ? examples[format].weighted : examples[format].unweighted;

    const loadExample = () => {
        setText(exampleText);
        setError('');
    };

    const formats = [
        {
            id: 'edgelist', label: 'Edge List',
            hint: weighted ? '0-1:4, 0-2:2' : '0-1, 0-2, 1-3',
        },
        {
            id: 'adjlist', label: 'Adjacency List',
            hint: weighted ? '0: 1:4 2:2' : '0: 1 2\n1: 0 3',
        },
        {
            id: 'matrix', label: 'Adj. Matrix',
            hint: 'n×n grid of values',
        },
    ];

    const hints = {
        edgelist: weighted
            ? { rule: 'node1-node2:weight, node1-node2:weight …', eg: '0-1:4, 0-2:2, 1-3:5', note: 'Undirected — each edge listed once.' }
            : { rule: 'node1-node2, node1-node2 …', eg: '0-1, 0-2, 1-3, 2-4', note: 'Undirected — each edge listed once.' },
        adjlist: weighted
            ? { rule: 'node: neighbor:weight neighbor:weight', eg: '0: 1:4 2:2\n1: 0:4 3:5', note: 'One node per line. 0-indexed.' }
            : { rule: 'node: neighbor neighbor …', eg: '0: 1 2\n1: 0 3 4', note: 'One node per line. 0-indexed.' },
        matrix: weighted
            ? { rule: 'n×n space-separated grid', eg: '0 4 2\n4 0 5\n2 5 0', note: 'Non-zero values are edge weights. 0 = no edge.' }
            : { rule: 'n×n space-separated grid', eg: '0 1 1\n1 0 0\n1 0 0', note: '1 = connected, 0 = no edge.' },
    };

    const h = hints[format];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 bg-slate-800/60">
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-base font-bold text-white">Custom Graph Builder</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
                    {/* Format tabs */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Input Format</label>
                        <div className="grid grid-cols-3 gap-2">
                            {formats.map(f => (
                                <button key={f.id} onClick={() => { setFormat(f.id); setError(''); }}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${format === f.id
                                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                    }`}>
                                    <div className="text-xs font-semibold">{f.label}</div>
                                    <div className="text-xs opacity-60 mt-0.5 font-mono truncate">{f.hint}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Textarea */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Graph Data</label>
                            <button onClick={loadExample} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2">
                                Load example
                            </button>
                        </div>
                        <textarea
                            value={text}
                            onChange={e => { setText(e.target.value); setError(''); }}
                            className="w-full h-32 px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-mono resize-none focus:outline-none focus:border-cyan-500 placeholder-slate-600 leading-relaxed"
                            placeholder={exampleText}
                            spellCheck={false}
                        />
                        {directed && (
                            <p className="mt-2 text-xs text-slate-500">
                                Edges are <strong className="text-slate-400">directed</strong>: <code className="text-slate-400">0-1</code> means 0 → 1 only.
                                {format === 'matrix' && ' The whole matrix is read, so cell [i][j] is the edge i → j.'}
                                {requireAcyclic && ' The graph must be acyclic — a cycle has no topological order.'}
                            </p>
                        )}
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                            </div>
                        )}
                    </div>

                    {/* Format help */}
                    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 text-xs space-y-1.5">
                        <div className="font-semibold text-slate-300">{h.rule}</div>
                        <pre className="text-slate-400 bg-slate-900/60 rounded px-2 py-1.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">{h.eg}</pre>
                        <div className="text-slate-500">{h.note} Nodes must be 0-indexed integers. Max 12 nodes.</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <button onClick={() => { onApply(null); onClose(); }}
                            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5">
                            <RefreshCw className="h-4 w-4" />Reset to default
                        </button>
                        <div className="flex gap-2">
                            <button onClick={onClose}
                                className="px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:border-slate-500 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleApply}
                                className="px-4 py-1.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5">
                                <Check className="h-4 w-4" />Apply Graph
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
