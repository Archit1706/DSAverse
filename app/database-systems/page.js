import Link from 'next/link';
import { ArrowLeft, Database, Layers, GitBranch, Lock, History, ScrollText, Table2, Merge, ListOrdered, Sigma, Cpu, ListTree, Table, Construction } from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the
    // suffix. Spelling it out here would double it.
    title: 'Database Systems',
    description: 'Interactive visualizations of transactions, concurrency control, crash recovery, schema design and query processing — the machinery inside every relational database.',
};

/* Cards come in three flavours:
     - built here          -> links to /database-systems/<slug>
     - covered elsewhere   -> `href` + `coveredIn` link out to the existing page
     - not built yet       -> available: false, renders as a dead Coming Soon card
   Most of these are not algorithms with a Big-O, so `time` and `space` hold
   a short descriptor instead, the way Under the Hood does. The built pages
   follow the order of data/algorithmCategories.js. */
const algorithms = [
    {
        name: 'Transaction Isolation Levels',
        slug: 'transaction-isolation-levels',
        icon: Layers,
        description: 'Two transactions on one timeline. Switch from Read Uncommitted to Serializable and watch dirty reads, non-repeatable reads, phantoms and lost updates disappear.',
        time: 'Per-level read rules',
        space: 'Lock table',
        pattern: 'Isolation',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Serializability',
        slug: 'serializability',
        icon: GitBranch,
        description: 'Find the conflicting operations in a schedule, draw the precedence graph edge by edge, and read the equivalent serial order off it — unless there is a cycle.',
        time: 'O(n²) pairs',
        space: 'O(T²) graph',
        pattern: 'Precedence Graph',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Two-Phase Locking',
        slug: 'two-phase-locking',
        icon: Lock,
        description: 'Shared and exclusive locks in a lock table: a growing phase, a lock point, a shrinking phase — and the deadlocks and cascading aborts that strict 2PL deals with.',
        time: 'Waits on conflict',
        space: 'Lock table',
        pattern: 'Pessimistic Locking',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'MVCC',
        slug: 'mvcc',
        icon: History,
        description: 'Every update writes a new version. Each transaction reads from its own snapshot, readers never block writers, and old versions wait for garbage collection.',
        time: 'Chain walk per read',
        space: 'O(versions)',
        pattern: 'Snapshot Isolation',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Write-Ahead Logging',
        slug: 'write-ahead-logging',
        icon: ScrollText,
        description: 'Log records with LSNs are forced to disk before the pages they describe. Then the power fails, and recovery redoes history and undoes the losers.',
        time: 'O(log length) recovery',
        space: 'Append-only log',
        pattern: 'Crash Recovery',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Normalization',
        slug: 'normalization',
        icon: Table2,
        description: 'A messy table, its functional dependencies and its update, insert and delete anomalies — then the table splitting apart through 1NF, 2NF, 3NF and BCNF.',
        time: 'Closure per FD',
        space: 'Lossless splits',
        pattern: 'Schema Design',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'How a Database Query Executes',
        slug: 'how-a-database-query-executes',
        href: '/under-the-hood/how-a-database-query-executes',
        coveredIn: 'Under the Hood',
        icon: Cpu,
        description: 'Parser, logical plan, cost-based optimizer, full scan against index scan, and the iterator model that pulls rows up to the client.',
        time: 'Parse → plan → execute',
        space: 'Buffer pool',
        pattern: 'Query Pipeline',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Join Algorithms',
        slug: 'join-algorithms',
        icon: Merge,
        description: 'Nested-loop, hash join and sort-merge join on the same two tables, counting every comparison to see which one wins and why.',
        time: 'O(nm) / O(n+m) / O(n log n)',
        space: 'O(1) / O(m) / O(n+m)',
        pattern: 'Join Strategy',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'SQL Query Order',
        slug: 'sql-query-order',
        icon: ListOrdered,
        description: 'Rows flowing through FROM, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY and LIMIT in logical order — which is why a SELECT alias cannot appear in WHERE.',
        time: 'Logical pipeline',
        space: 'Intermediate tables',
        pattern: 'Query Semantics',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Relational Algebra',
        slug: 'relational-algebra',
        icon: Sigma,
        description: 'Selection, projection, join, union, difference and rename on small tables, evaluating an expression tree from the leaves up.',
        time: 'Bottom-up evaluation',
        space: 'One relation per node',
        pattern: 'Expression Tree',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'LSM Trees',
        slug: 'lsm-trees',
        icon: Database,
        description: 'Writes land in a memtable, flush to immutable SSTables and compact into larger levels; reads check newest first and skip tables with Bloom filters.',
        time: 'O(1) write, O(levels) read',
        space: 'O(n) + filters',
        pattern: 'Log-Structured Storage',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'B Trees',
        slug: 'b-trees',
        href: '/indexing/b-trees',
        coveredIn: 'Indexing',
        icon: ListTree,
        description: 'The update-in-place index that LSM trees are measured against: wide nodes that split and promote keys to stay shallow.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Split / Promote',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'B+ Trees',
        slug: 'b-plus-trees',
        href: '/indexing/b-plus-trees',
        coveredIn: 'Indexing',
        icon: Table,
        description: 'The structure under almost every primary key: values live in linked leaves, so a range scan walks sideways.',
        time: 'O(log n)',
        space: 'O(n)',
        pattern: 'Linked Leaves',
        difficulty: 'Advanced',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function DatabaseSystemsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-teal-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-blue-200 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Database className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Database Systems</h1>
                        <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                            A database promises that your data stays correct while thousands of transactions run at once
                            and the power can fail at any moment. Watch the machinery that keeps that promise.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.available ? algo.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-blue-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-blue-500 to-teal-600 p-6 ${!algo.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                            {algo.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{algo.name}</h3>
                                    {algo.coveredIn && (
                                        <span className="text-xs text-blue-100/80">Covered in {algo.coveredIn}</span>
                                    )}
                                    {!algo.available && (
                                        <span className="text-xs text-blue-100/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Time</span>
                                            <code className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-xs text-right">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-xs text-right">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded text-xs text-right">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {!algo.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
                                            {algo.coveredIn ? `Open in ${algo.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={algo.href ?? `/database-systems/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Database Internals?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Bugs Hide In The Interleaving', body: 'Most concurrency bugs in application code are an isolation level doing exactly what it promised. Knowing which anomalies each level allows tells you when you need a stronger one, or a FOR UPDATE.' },
                            { title: 'Durability Is A Protocol', body: 'A commit returns once a log record is on disk, not the data. Write-ahead logging and its recovery pass are why a crash a millisecond later loses nothing you were promised.' },
                            { title: 'The Schema Shapes Every Query', body: 'Normal forms remove the redundancy that causes update anomalies, and the join and storage choices underneath decide whether the queries that put the data back together are fast.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-blue-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
