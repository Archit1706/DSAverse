"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Database, FileText, FolderTree, GitCommit, GitBranch, GitMerge, GitFork,
    Hash, Copy, Tag, ChevronRight, CheckCircle, Box,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Snapshots',  icon: Database   },
    { id: 2, label: 'Blobs',      icon: FileText   },
    { id: 3, label: 'Trees',      icon: FolderTree },
    { id: 4, label: 'Commits',    icon: GitCommit  },
    { id: 5, label: 'Staging',    icon: Box        },
    { id: 6, label: 'Branches',   icon: GitBranch  },
    { id: 7, label: 'Merge',      icon: GitMerge   },
    { id: 8, label: 'Rebase',     icon: GitFork    },
];

// ── Commit DAG (Acts 4, 6, 7, 8) ────────────────────────────────────────────────
const REF_COLOR = { main: '#22c55e', feature: '#f97316', HEAD: '#e4e4e7' };

function shorten(ax, ay, bx, by, r) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    return { sx: ax + ux * r, sy: ay + uy * r, ex: bx - ux * r, ey: by - uy * r };
}

function CommitGraph({ commits = [], edges = [], refs = [] }) {
    const node = id => commits.find(c => c.id === id);
    const fillFor = (st) => st === 'new' ? '#14532d' : st === 'merge' ? '#3b0764' : st === 'ghost' ? '#1e293b' : '#1e293b';
    const strokeFor = (st) => st === 'new' ? '#22c55e' : st === 'merge' ? '#a855f7' : st === 'ghost' ? '#475569' : '#64748b';

    // group refs by commit for stacking
    const slotByRef = {};
    const counts = {};
    refs.forEach(r => { counts[r.at] = (counts[r.at] || 0); slotByRef[r.name + r.at] = counts[r.at]++; });

    return (
        <svg viewBox="0 0 440 230" width="100%" className="max-h-[330px]">
            <defs>
                <marker id="gah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* edges: child → parent */}
            {edges.map((e, i) => {
                const a = node(e.from), b = node(e.to);
                if (!a || !b) return null;
                const { sx, sy, ex, ey } = shorten(a.x, a.y, b.x, b.y, 20);
                const ghost = a.state === 'ghost' || b.state === 'ghost';
                return <line key={i} x1={sx} y1={sy} x2={ex} y2={ey} stroke={ghost ? '#3f3f46' : '#64748b'}
                    strokeWidth="1.8" markerEnd="url(#gah)" opacity={ghost ? 0.4 : 1} strokeDasharray={ghost ? '4 3' : '0'} />;
            })}

            {/* commits */}
            {commits.map(c => (
                <g key={c.id} opacity={c.state === 'ghost' ? 0.4 : 1}>
                    <circle cx={c.x} cy={c.y} r="18" fill={fillFor(c.state)} stroke={strokeFor(c.state)} strokeWidth="2" />
                    <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold"
                        fill={c.state === 'new' ? '#bbf7d0' : c.state === 'merge' ? '#e9d5ff' : '#cbd5e1'} fontFamily="monospace">{c.short}</text>
                </g>
            ))}

            {/* ref tags */}
            {refs.map((r, i) => {
                const c = node(r.at);
                if (!c) return null;
                const slot = slotByRef[r.name + r.at];
                const ty = c.y - 34 - slot * 22;
                const col = REF_COLOR[r.color] || '#94a3b8';
                const w = r.name.length * 7 + 16;
                return (
                    <g key={i}>
                        <line x1={c.x} y1={c.y - 18} x2={c.x} y2={ty + 9} stroke={col} strokeWidth="1.2" opacity="0.6" />
                        <rect x={c.x - w / 2} y={ty - 9} width={w} height="18" rx="4" fill={col + '22'} stroke={col} strokeWidth="1.3" />
                        <text x={c.x} y={ty + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill={col} fontFamily="monospace">{r.name}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, phase, data, explanation) => steps.push({ act, actName, phase, ...data, explanation });

    // ═══ ACT 1: Snapshots ═══
    s(1, 'Snapshots, Not Diffs', 'snapshots', {
        snapshots: true,
    }, 'Most version-control systems store a list of changes (diffs) per file over time. Git is different: each commit is a full snapshot of every file. To stay efficient, files that did not change between snapshots are not re-stored — both snapshots simply point to the same content. That single idea — content stored once and referenced by many — is the heart of Git, and it is enabled by content addressing.');

    s(1, 'Snapshots, Not Diffs', 'objects', {
        objTypes: [
            { icon: 'blob',   name: 'blob',   desc: 'the raw contents of one file' },
            { icon: 'tree',   name: 'tree',   desc: 'a directory: names → blobs & trees' },
            { icon: 'commit', name: 'commit', desc: 'a snapshot: tree + parent + author + message' },
            { icon: 'tag',    name: 'tag',    desc: 'a named, annotated pointer to a commit' },
        ],
    }, 'Under the hood, Git is a key-value store of immutable objects living in .git/objects. There are four object types: blob, tree, commit, and tag. The key for every object is the SHA-1 hash of its own contents. This makes Git a "content-addressable filesystem" — you look things up not by where they are, but by what they contain.');

    // ═══ ACT 2: Blobs ═══
    s(2, 'Blobs', 'hash', {
        blob: { content: 'hello\\n', sha: 'ce01362' },
    }, 'A blob stores the raw bytes of a file — no filename, no metadata, just content. Git prepends a small header ("blob <size>\\0") and runs SHA-1 over the result, producing a 40-hex-character id (shown here shortened to 7). The content "hello" always hashes to ce01362…. Change one byte and the hash changes completely — so the id is a fingerprint that also detects corruption.');

    s(2, 'Blobs', 'dedup', {
        dedup: { sha: 'ce01362', files: ['greeting.txt', 'copy.txt', 'src/hello.txt'] },
    }, 'Content addressing gives deduplication for free. Three different files with identical content all hash to the same id, so Git stores the bytes exactly once and every reference points to that single blob. This is also why renaming or moving a file is cheap — the blob is unchanged; only the tree that names it differs.');

    // ═══ ACT 3: Trees ═══
    s(3, 'Trees', 'tree', {
        tree: {
            sha: '9c8d7e6',
            entries: [
                { mode: '100644', type: 'blob', sha: 'a1b2c3d', name: 'README.md' },
                { mode: '100644', type: 'blob', sha: 'ce01362', name: 'greeting.txt' },
                { mode: '040000', type: 'tree', sha: 'f4e5d6c', name: 'src' },
            ],
        },
    }, 'A tree turns content into a directory. It is a sorted list of entries, each with a mode (file permissions), a type (blob or tree), the child object\'s SHA, and a name. Filenames live here, in the tree — not in the blob. A tree can reference sub-trees, so the whole directory hierarchy is captured.');

    s(3, 'Trees', 'snapshot', {
        treeGraph: true,
    }, 'Because a tree points to blobs and other trees, a single top-level tree SHA captures an entire project\'s directory structure at one moment. And since every id is derived from content, two trees are identical if and only if their contents are identical — all the way down. This is the snapshot a commit will point to.');

    // ═══ ACT 4: Commits ═══
    s(4, 'Commits', 'object', {
        commitObj: {
            sha: 'c3d4e5f',
            tree: '9c8d7e6',
            parent: 'b2c3d4e',
            author: 'Ada <ada@dev>',
            message: 'Add greeting',
        },
    }, 'A commit ties it all together. It records: the top-level tree (the snapshot), the parent commit(s) it came from, author and committer with timestamps, and a message. Hash all of that and you get the commit\'s own id. Because the commit includes its parent\'s id, and the parent includes ITS parent, the entire history is cryptographically chained — you cannot alter an old commit without changing every id after it.');

    s(4, 'Commits', 'chain', {
        graph: {
            commits: [
                { id: 'A', x: 90,  y: 110, short: 'a1b2c3d' },
                { id: 'B', x: 220, y: 110, short: 'b2c3d4e' },
                { id: 'C', x: 350, y: 110, short: 'c3d4e5f' },
            ],
            edges: [{ from: 'B', to: 'A' }, { from: 'C', to: 'B' }],
            refs: [{ name: 'main', at: 'C', color: 'main' }, { name: 'HEAD', at: 'C', color: 'HEAD' }],
        },
    }, 'Each commit points back to its parent, forming a chain — more generally a Directed Acyclic Graph (DAG), since a merge can have two parents. Arrows point from child to parent (Git history is traversed backwards). This DAG, plus the object store it references, IS your repository. Everything else — branches, tags, HEAD — is just labels on this graph.');

    // ═══ ACT 5: Staging ═══
    s(5, 'The Three Areas', 'working', {
        areas: { active: 'work', fileState: 'modified' },
    }, 'Day to day, files move through three areas. The working directory is your actual files on disk. The staging area (the "index") is a draft of your next commit. The repository (.git) is the permanent object store. Right now greeting.txt is edited in the working directory but Git has not been told about it yet.');

    s(5, 'The Three Areas', 'add', {
        areas: { active: 'stage', fileState: 'staged' },
    }, 'git add greeting.txt copies the file into the staging area — and immediately writes its blob into .git/objects. The object exists now, even before you commit. The index records "this blob, at this path" as part of the next snapshot. (This is why git add after every edit matters: the index is a deliberate, curated draft.)');

    s(5, 'The Three Areas', 'commit', {
        areas: { active: 'repo', fileState: 'committed' },
    }, 'git commit takes the staged snapshot, writes a tree object from the index, then writes a commit object pointing to that tree and the current commit as parent. The working directory and index are now "clean" — they match the new commit. Three areas, two commands, and the immutable object graph grows by a few entries.');

    // ═══ ACT 6: Branches ═══
    s(6, 'Branches & HEAD', 'pointer', {
        graph: {
            commits: [
                { id: 'A', x: 90,  y: 120, short: 'a1b2c3d' },
                { id: 'B', x: 220, y: 120, short: 'b2c3d4e' },
                { id: 'C', x: 350, y: 120, short: 'c3d4e5f' },
            ],
            edges: [{ from: 'B', to: 'A' }, { from: 'C', to: 'B' }],
            refs: [{ name: 'main', at: 'C', color: 'main' }, { name: 'HEAD', at: 'C', color: 'HEAD' }],
        },
    }, 'A branch is astonishingly simple: it is a 41-byte file under .git/refs/heads containing a commit SHA. main is just a sticky note reading "c3d4e5f". HEAD is another pointer that usually points at the current branch. There is no copying, no heavy structure — a branch is one pointer into the DAG.');

    s(6, 'Branches & HEAD', 'create', {
        graph: {
            commits: [
                { id: 'A', x: 90,  y: 120, short: 'a1b2c3d' },
                { id: 'B', x: 220, y: 120, short: 'b2c3d4e' },
                { id: 'C', x: 350, y: 120, short: 'c3d4e5f' },
            ],
            edges: [{ from: 'B', to: 'A' }, { from: 'C', to: 'B' }],
            refs: [
                { name: 'main', at: 'C', color: 'main' },
                { name: 'feature', at: 'C', color: 'feature' },
                { name: 'HEAD', at: 'C', color: 'HEAD' },
            ],
        },
    }, 'git branch feature creates a new branch by writing one more 41-byte file pointing at the same commit C. That is the entire cost — O(1), no matter how large the repo. This is why Git branching is famously cheap and why feature-branch workflows are the norm. git checkout feature just moves HEAD to point at feature.');

    s(6, 'Branches & HEAD', 'advance', {
        graph: {
            commits: [
                { id: 'A', x: 70,  y: 120, short: 'a1b2c3d' },
                { id: 'B', x: 180, y: 120, short: 'b2c3d4e' },
                { id: 'C', x: 290, y: 120, short: 'c3d4e5f' },
                { id: 'D', x: 390, y: 70,  short: 'd4e5f6a', state: 'new' },
            ],
            edges: [{ from: 'B', to: 'A' }, { from: 'C', to: 'B' }, { from: 'D', to: 'C' }],
            refs: [
                { name: 'main', at: 'C', color: 'main' },
                { name: 'feature', at: 'D', color: 'feature' },
                { name: 'HEAD', at: 'D', color: 'HEAD' },
            ],
        },
    }, 'Now commit on feature. Git writes commit D (parent = C) and then does the only mutation branching needs: it updates the feature pointer from C to D. main still points at C — the two branches have diverged. Committing is "create an immutable object, then move a pointer forward".');

    // ═══ ACT 7: Merge ═══
    s(7, 'Merge', 'diverged', {
        graph: {
            commits: [
                { id: 'C', x: 110, y: 115, short: 'c3d4e5f' },
                { id: 'D', x: 250, y: 65,  short: 'd4e5f6a' },
                { id: 'E', x: 250, y: 165, short: 'e5f6a7b' },
            ],
            edges: [{ from: 'D', to: 'C' }, { from: 'E', to: 'C' }],
            refs: [{ name: 'main', at: 'D', color: 'main' }, { name: 'feature', at: 'E', color: 'feature' }],
        },
    }, 'Two branches have diverged from a common ancestor C: main advanced to D, feature to E. To combine them, Git finds the merge base (C) and performs a three-way merge of C, D, and E. If the two sides changed different lines, it merges automatically; if they changed the same lines, you get a merge conflict to resolve by hand.');

    s(7, 'Merge', 'commit', {
        graph: {
            commits: [
                { id: 'C', x: 90,  y: 115, short: 'c3d4e5f' },
                { id: 'D', x: 220, y: 65,  short: 'd4e5f6a' },
                { id: 'E', x: 220, y: 165, short: 'e5f6a7b' },
                { id: 'M', x: 360, y: 115, short: 'm6a7b8c', state: 'merge' },
            ],
            edges: [{ from: 'D', to: 'C' }, { from: 'E', to: 'C' }, { from: 'M', to: 'D' }, { from: 'M', to: 'E' }],
            refs: [{ name: 'main', at: 'M', color: 'main' }, { name: 'feature', at: 'E', color: 'feature' }],
        },
    }, 'A merge creates a new merge commit M with TWO parents — D and E — and main advances to it. Nothing in history is rewritten: D and E keep their original ids, and the DAG honestly records that two lines of work joined here. (If feature were simply ahead of main with no divergence, Git would skip M entirely and just slide the pointer forward — a "fast-forward".)');

    // ═══ ACT 8: Rebase ═══
    s(8, 'Rebase', 'before', {
        graph: {
            commits: [
                { id: 'C', x: 110, y: 115, short: 'c3d4e5f' },
                { id: 'D', x: 250, y: 65,  short: 'd4e5f6a' },
                { id: 'E', x: 250, y: 165, short: 'e5f6a7b' },
            ],
            edges: [{ from: 'D', to: 'C' }, { from: 'E', to: 'C' }],
            refs: [{ name: 'main', at: 'D', color: 'main' }, { name: 'feature', at: 'E', color: 'feature' }],
        },
    }, 'Rebase solves the same problem — combining diverged work — but with a different philosophy. Same starting point: main at D, feature at E, both from C. Instead of joining them with a merge commit, rebase will REPLAY feature\'s commits on top of main, producing a straight line.');

    s(8, 'Rebase', 'replay', {
        graph: {
            commits: [
                { id: 'C', x: 70,  y: 150, short: 'c3d4e5f' },
                { id: 'D', x: 190, y: 150, short: 'd4e5f6a' },
                { id: 'E', x: 250, y: 60,  short: 'e5f6a7b', state: 'ghost' },
                { id: 'E2', x: 320, y: 150, short: "e9f0a1b", state: 'new' },
            ],
            edges: [{ from: 'D', to: 'C' }, { from: 'E', to: 'C' }, { from: 'E2', to: 'D' }],
            refs: [{ name: 'main', at: 'D', color: 'main' }, { name: 'feature', at: 'E2', color: 'feature' }],
        },
    }, 'git rebase main (from feature) takes the changes in E and re-applies them onto D as a brand-new commit E\' — with a NEW id, because its parent changed and the id is content-derived. The old E becomes unreachable (faded) and is eventually garbage-collected. History is now linear, with no merge commit.');

    s(8, 'Rebase', 'compare', {
        compare: [
            { name: 'Merge', pts: ['Preserves true history (a DAG)', 'Adds a merge commit', 'Non-destructive — ids unchanged', 'Best for shared/public branches'] },
            { name: 'Rebase', pts: ['Rewrites into a clean line', 'No merge commit', 'New commit ids (history rewritten)', 'Avoid on branches others have pulled'] },
        ],
    }, 'Same end content, two different histories. Merge records what actually happened, branches and all; rebase rewrites the story into a tidy line. The golden rule: never rebase commits that others have already based work on — because rebase invents new ids, it would split your collaborators\' history from yours. Merge for shared branches, rebase for cleaning up your own local work.');

    return steps;
}

// ── Scenes ────────────────────────────────────────────────────────────────────
const objTypeIcon = { blob: FileText, tree: FolderTree, commit: GitCommit, tag: Tag };

function SceneSnapshots({ step }) {
    if (step.phase === 'objects') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6 w-full">
                {step.objTypes.map((o, i) => {
                    const Icon = objTypeIcon[o.icon] || Box;
                    return (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/50">
                            <div className="w-9 h-9 rounded-lg bg-zinc-500/15 border border-zinc-600/50 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-zinc-300" />
                            </div>
                            <div>
                                <code className="text-sm font-mono font-semibold text-slate-200">{o.name}</code>
                                <div className="text-[11px] text-slate-500 mt-0.5">{o.desc}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-5 py-8 w-full">
            {[
                { label: 'Other VCS — store diffs', items: ['Δ v1', 'Δ v2', 'Δ v3'], color: 'orange' },
                { label: 'Git — store snapshots (shared content)', items: ['snap 1', 'snap 2', 'snap 3'], color: 'green' },
            ].map((row, ri) => (
                <div key={ri}>
                    <div className={`text-xs font-semibold uppercase tracking-widest mb-2 ${row.color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{row.label}</div>
                    <div className="flex items-center gap-2">
                        {row.items.map((it, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`px-3 py-3 rounded-lg border text-xs font-mono ${row.color === 'green' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-orange-500/40 bg-orange-500/10 text-orange-300'}`}>{it}</div>
                                {i < row.items.length - 1 && <ChevronRight className="h-4 w-4 text-slate-600" />}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SceneBlob({ step }) {
    if (step.phase === 'hash') {
        return (
            <div className="flex flex-col items-center justify-center gap-5 py-10 w-full">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                        <div className="px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-950/60 font-mono text-sm text-slate-300">"{step.blob.content}"</div>
                        <span className="text-[10px] text-slate-600">file content</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Hash className="h-5 w-5 text-zinc-400" />
                        <span className="text-[9px] text-slate-600 mt-0.5">SHA-1</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-500/40 bg-green-500/10">
                            <FileText className="h-4 w-4 text-green-400" />
                            <code className="font-mono text-sm font-bold text-green-300">{step.blob.sha}</code>
                        </div>
                        <span className="text-[10px] text-slate-600">blob object</span>
                    </div>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">git hash-object → {step.blob.sha}…</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center gap-5 py-10 w-full">
            <div className="flex flex-col gap-2 items-center">
                {step.dedup.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <code className="text-xs font-mono text-slate-300 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60 w-32 text-center">{f}</code>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-500/40 bg-green-500/10">
                <Copy className="h-4 w-4 text-green-400" />
                <code className="font-mono text-sm font-bold text-green-300">{step.dedup.sha}</code>
                <span className="text-[11px] text-slate-500">· one blob, stored once</span>
            </div>
        </div>
    );
}

function SceneTree({ step }) {
    if (step.phase === 'snapshot') {
        return (
            <div className="flex flex-col items-center gap-1.5 py-6 w-full">
                <div className="px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 font-mono text-xs text-purple-300">tree 9c8d7e6 · /</div>
                <div className="text-slate-600">↓</div>
                <div className="flex gap-2">
                    <div className="px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 font-mono text-[11px] text-green-300">blob · README.md</div>
                    <div className="px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 font-mono text-[11px] text-green-300">blob · greeting.txt</div>
                    <div className="px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 font-mono text-[11px] text-purple-300">tree · src/</div>
                </div>
                <div className="text-slate-600">↓</div>
                <div className="flex gap-2">
                    <div className="px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 font-mono text-[11px] text-green-300">blob · main.c</div>
                    <div className="px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 font-mono text-[11px] text-green-300">blob · util.c</div>
                </div>
                <p className="text-[11px] text-slate-600 mt-3">One top-level tree SHA = the entire project snapshot</p>
            </div>
        );
    }
    return (
        <div className="py-6 w-full max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-2">
                <FolderTree className="h-4 w-4 text-purple-400" />
                <code className="text-sm font-mono text-purple-300">tree {step.tree.sha}</code>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 overflow-hidden font-mono text-xs">
                {step.tree.entries.map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800/50 last:border-0">
                        <span className="col-span-3 text-slate-500">{e.mode}</span>
                        <span className={`col-span-2 ${e.type === 'tree' ? 'text-purple-400' : 'text-green-400'}`}>{e.type}</span>
                        <span className="col-span-4 text-slate-500">{e.sha}</span>
                        <span className="col-span-3 text-slate-200">{e.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SceneCommit({ step }) {
    if (step.phase === 'chain') return <CommitGraph {...step.graph} />;
    const c = step.commitObj;
    return (
        <div className="py-6 w-full max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-2">
                <GitCommit className="h-4 w-4 text-zinc-300" />
                <code className="text-sm font-mono text-zinc-200">commit {c.sha}</code>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-4 font-mono text-xs space-y-1.5">
                <div><span className="text-slate-500 inline-block w-16">tree</span><span className="text-purple-300">{c.tree}</span></div>
                <div><span className="text-slate-500 inline-block w-16">parent</span><span className="text-zinc-300">{c.parent}</span></div>
                <div><span className="text-slate-500 inline-block w-16">author</span><span className="text-slate-300">{c.author}</span></div>
                <div className="pt-2 border-t border-slate-800/60 text-slate-200">{c.message}</div>
            </div>
        </div>
    );
}

const AREA_DEFS = [
    { id: 'work',  label: 'Working Directory', sub: 'your files on disk' },
    { id: 'stage', label: 'Staging (Index)',   sub: 'draft of next commit' },
    { id: 'repo',  label: 'Repository (.git)',  sub: 'permanent objects' },
];
const fileStateStyle = {
    modified:  { txt: 'modified',  cls: 'border-orange-500/50 bg-orange-500/10 text-orange-300' },
    staged:    { txt: 'staged',    cls: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' },
    committed: { txt: 'committed', cls: 'border-green-500/50 bg-green-500/10 text-green-300' },
};

function SceneAreas({ step }) {
    const { active, fileState } = step.areas;
    const fs = fileStateStyle[fileState];
    return (
        <div className="flex flex-col gap-4 py-8 w-full">
            <div className="grid grid-cols-3 gap-2">
                {AREA_DEFS.map(a => {
                    const isActive = a.id === active;
                    return (
                        <div key={a.id} className={`flex flex-col rounded-xl border p-3 min-h-[120px] transition-all ${
                            isActive ? 'border-zinc-400/60 bg-zinc-500/15' : 'border-slate-700/60 bg-slate-900/40'
                        }`}>
                            <div className="text-[11px] font-semibold text-slate-300">{a.label}</div>
                            <div className="text-[10px] text-slate-500 mb-2">{a.sub}</div>
                            {isActive && (
                                <div className={`mt-auto px-2 py-1.5 rounded-lg border text-[11px] font-mono text-center ${fs.cls}`}>
                                    greeting.txt
                                    <div className="text-[9px] opacity-80">{fs.txt}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
                <span className={active === 'stage' ? 'text-yellow-400' : ''}>git add</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className={active === 'repo' ? 'text-green-400' : ''}>git commit</span>
            </div>
        </div>
    );
}

function SceneCompare({ step }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6 w-full">
            {step.compare.map((c, i) => (
                <div key={i} className={`rounded-xl border p-4 ${c.name === 'Merge' ? 'border-purple-500/40 bg-purple-500/5' : 'border-orange-500/40 bg-orange-500/5'}`}>
                    <div className={`flex items-center gap-2 mb-3 text-sm font-bold ${c.name === 'Merge' ? 'text-purple-300' : 'text-orange-300'}`}>
                        {c.name === 'Merge' ? <GitMerge className="h-4 w-4" /> : <GitFork className="h-4 w-4" />}{c.name}
                    </div>
                    <div className="space-y-1.5">
                        {c.pts.map((p, j) => (
                            <div key={j} className="flex items-start gap-2 text-[11px] text-slate-400">
                                <CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-slate-500" />{p}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1) return <SceneSnapshots step={step} />;
    if (step.act === 2) return <SceneBlob step={step} />;
    if (step.act === 3) return <SceneTree step={step} />;
    if (step.act === 4) return <SceneCommit step={step} />;
    if (step.act === 5) return <SceneAreas step={step} />;
    if (step.act === 6) return <CommitGraph {...step.graph} />;
    if (step.act === 7) return <CommitGraph {...step.graph} />;
    if (step.act === 8) return step.compare ? <SceneCompare step={step} /> : <CommitGraph {...step.graph} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What is a Git branch, physically?',
        options: [
            'A full copy of the repository at a point in time',
            'A small file containing one commit SHA — a movable pointer into the DAG',
            'A compressed diff of all changes since main',
            'A list of every file that changed on the branch',
        ],
        correct: 1,
        explanation: 'A branch is just a ~41-byte ref file holding a commit id. Creating one is O(1) regardless of repo size, which is why Git branching is so cheap. Committing writes a new object and moves that pointer forward.',
    },
    {
        question: 'Why do two files with identical content share a single blob object?',
        options: [
            'Git compresses duplicate filenames',
            'Objects are addressed by the SHA-1 of their content, so identical content yields the same id',
            'Blobs store filenames, so duplicates merge',
            'Git only allows one copy of any file',
        ],
        correct: 1,
        explanation: 'Git is content-addressed: an object\'s key is the hash of its bytes. Identical content hashes to the same id, so it is stored once and referenced everywhere. Filenames live in tree objects, not blobs — which is also why renames are cheap.',
    },
    {
        question: 'How does rebase differ from merge at the object level?',
        options: [
            'Rebase deletes the repository and re-clones it',
            'Rebase creates a two-parent merge commit; merge does not',
            'Rebase replays commits onto a new base, creating new commit ids (rewriting history); merge adds a merge commit and leaves ids unchanged',
            'They are identical; only the command name differs',
        ],
        correct: 2,
        explanation: 'Merge creates a new merge commit with two parents and preserves the original commits and their ids. Rebase re-applies your commits onto a new base — since a commit id is derived from its content (including its parent), the replayed commits get new ids, rewriting history. Never rebase commits others have pulled.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand Git\'s object model!' : 'Review the explanations to reinforce the concepts.'}
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

export default function HowGitWorksInternallyPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How Git Works Internally</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Blobs, trees &amp; commits · SHA-1 content addressing · branches as pointers · merge vs rebase as DAG transforms
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
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 8</span>
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

                        {/* Object model reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Git internals</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [1], label: 'Object store', note: '.git/objects' },
                                    { acts: [2], label: 'blob', note: 'file content' },
                                    { acts: [3], label: 'tree', note: 'directory' },
                                    { acts: [4], label: 'commit', note: 'snapshot + parent' },
                                    { acts: [5], label: 'index', note: 'staging area' },
                                    { acts: [6], label: 'ref', note: 'branch pointer' },
                                    { acts: [7], label: 'merge commit', note: '2 parents' },
                                    { acts: [8], label: 'rebase', note: 'replay → new ids' },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step && row.acts.includes(step.act) ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
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
