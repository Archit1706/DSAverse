import Link from 'next/link';
import { ArrowLeft, Monitor, Globe, Zap, Code2, Cpu, Layers, Construction } from 'lucide-react';

export const metadata = {
    title: 'Under the Hood | DSAverse',
    description: 'Visualize what really happens inside computers — DNS resolution, TCP/TLS handshakes, Python bytecode, CPU caches, garbage collection, and more.',
};

const tracks = [
    {
        id: 'language-runtimes',
        name: 'Language Runtimes',
        desc: 'How source code becomes execution',
        icon: Code2,
        color: 'zinc',
        algorithms: [
            {
                name: 'Python Execution Pipeline',
                slug: 'python-execution-pipeline',
                description: 'Source → Tokens → AST → Bytecode → CPython VM → Memory Model → GIL. Every layer visualized step by step.',
                complexity: 'Source → Bytecode',
                space: '6 stages',
                pattern: 'Interpreter',
                difficulty: 'Intermediate',
                available: true,
            },
            {
                name: 'C++ Execution Pipeline',
                slug: 'cpp-execution-pipeline',
                description: 'Preprocessor → Compiler → Assembler → Linker → Loader → CPU. See why compiled code runs 50× faster than Python.',
                complexity: 'Source → Machine',
                space: '6 stages',
                pattern: 'Compiler',
                difficulty: 'Advanced',
                available: true,
            },
            {
                name: 'Python Memory Model',
                slug: 'python-memory-model',
                description: 'PyObject internals, reference counting, the small int cache, closures, and LEGB name resolution — all animated.',
                complexity: 'Heap + Stack',
                space: 'refcount',
                pattern: 'Reference Count',
                difficulty: 'Intermediate',
                available: true,
            },
            {
                name: 'Garbage Collection',
                slug: 'garbage-collection',
                description: 'Reference counting, cyclic GC, mark-and-sweep, and generational collection. How memory gets reclaimed automatically.',
                complexity: 'O(n) scan',
                space: 'O(n)',
                pattern: 'Mark & Sweep',
                difficulty: 'Intermediate',
                available: true,
            },
        ],
    },
    {
        id: 'concurrency',
        name: 'Concurrency',
        desc: 'Threads, async, and parallelism',
        icon: Zap,
        color: 'zinc',
        algorithms: [
            {
                name: 'Async Await and Event Loop',
                slug: 'async-await-and-event-loop',
                description: 'The event loop as a spinning wheel. Task queues, microtask vs macrotask, how await suspends a coroutine without blocking the thread.',
                complexity: 'O(1) per task',
                space: 'O(n) queue',
                pattern: 'Event Loop',
                difficulty: 'Intermediate',
                available: true,
            },
            {
                name: 'Multithreading',
                slug: 'multithreading',
                description: 'Thread creation, time slicing, race conditions, mutex locks, and deadlock — each animated with the classic counter and dining philosophers examples.',
                complexity: 'O(1) ctx switch',
                space: '1–8 MB/thread',
                pattern: 'Shared Memory',
                difficulty: 'Advanced',
                available: true,
            },
            {
                name: 'Processes vs Threads',
                slug: 'processes-vs-threads',
                description: 'Virtual address spaces, the process control block, fork() semantics, and why threads share heap but not stack.',
                complexity: 'fork: O(1) CoW',
                space: 'separate AS',
                pattern: 'OS Scheduling',
                difficulty: 'Intermediate',
                available: true,
            },
        ],
    },
    {
        id: 'web',
        name: 'The Web',
        desc: 'Networks, protocols, and browsers',
        icon: Globe,
        color: 'zinc',
        algorithms: [
            {
                name: 'What Happens When You Search a URL',
                slug: 'what-happens-when-you-search-a-url',
                description: 'DNS resolution → TCP handshake → TLS handshake → HTTP request → server pipeline → HTTP response → browser rendering. All 8 acts animated.',
                complexity: '~300ms cold',
                space: '8 stages',
                pattern: 'Full Stack',
                difficulty: 'Intermediate',
                available: true,
            },
            {
                name: 'HTTPS and TLS',
                slug: 'https-and-tls',
                description: 'Certificate chains, Diffie-Hellman key exchange, the paint-mixing analogy, and why TLS 1.3 needs only 1 round trip.',
                complexity: '1 RTT (TLS 1.3)',
                space: 'O(1)',
                pattern: 'Asymmetric → Symmetric',
                difficulty: 'Advanced',
                available: false,
            },
            {
                name: 'How a REST API Works',
                slug: 'how-a-rest-api-works',
                description: 'HTTP verbs, status codes, request/response cycle, JSON serialization, authentication headers, and REST constraints visualized.',
                complexity: 'O(1) request',
                space: 'stateless',
                pattern: 'Request/Response',
                difficulty: 'Beginner',
                available: true,
            },
        ],
    },
    {
        id: 'oop',
        name: 'Object-Oriented Programming',
        desc: 'Memory layout, dispatch, and patterns',
        icon: Layers,
        color: 'zinc',
        algorithms: [
            {
                name: 'Classes Objects and Memory',
                slug: 'classes-objects-and-memory',
                description: 'How classes and instances live in memory. Python __dict__, __class__ pointer, method lookup chain, and metaclasses.',
                complexity: 'O(1) lookup',
                space: '__dict__',
                pattern: 'Object Model',
                difficulty: 'Intermediate',
                available: false,
            },
            {
                name: 'Inheritance and MRO',
                slug: 'inheritance-and-mro',
                description: 'C3 linearization step by step. Why MRO exists (diamond problem), how super() walks the chain, and what multiple inheritance really does.',
                complexity: 'O(n) MRO',
                space: 'O(n)',
                pattern: 'C3 Linearization',
                difficulty: 'Advanced',
                available: false,
            },
            {
                name: 'Polymorphism and Virtual Dispatch',
                slug: 'polymorphism-and-virtual-dispatch',
                description: 'C++ vtables in memory. How virtual function calls follow the vptr → vtable → function pointer chain. Non-virtual vs virtual call cost.',
                complexity: 'O(1) + 1 deref',
                space: 'vptr per object',
                pattern: 'vtable',
                difficulty: 'Advanced',
                available: false,
            },
            {
                name: 'Composition vs Inheritance',
                slug: 'composition-vs-inheritance',
                description: '"Is-a" vs "has-a". Fragile base class problem animated. Why swapping a component is impossible with deep inheritance but trivial with composition.',
                complexity: 'design tradeoff',
                space: 'comparable',
                pattern: 'HAS-A > IS-A',
                difficulty: 'Intermediate',
                available: false,
            },
        ],
    },
    {
        id: 'systems',
        name: 'Systems',
        desc: 'OS, CPU, databases, and version control',
        icon: Cpu,
        color: 'zinc',
        algorithms: [
            {
                name: 'Virtual Memory and Paging',
                slug: 'virtual-memory-and-paging',
                description: 'Virtual address space layout, page tables, TLB, page faults, and why every process thinks it has 4GB of RAM.',
                complexity: 'O(1) TLB hit',
                space: '4KB pages',
                pattern: 'MMU + Page Table',
                difficulty: 'Advanced',
                available: true,
            },
            {
                name: 'CPU Cache Hierarchy',
                slug: 'cpu-cache-hierarchy',
                description: 'L1/L2/L3 cache lines, spatial locality, cache misses vs hits, and why column-major array access kills performance.',
                complexity: 'L1: ~4 cycles',
                space: '64-byte lines',
                pattern: 'Cache Hierarchy',
                difficulty: 'Advanced',
                available: true,
            },
            {
                name: 'How a Database Query Executes',
                slug: 'how-a-database-query-executes',
                description: 'SQL → Parser → Planner → Optimizer → Executor. Index scan vs full scan animated. Why the query planner chooses what it chooses.',
                complexity: 'O(log n) index',
                space: 'O(n) full scan',
                pattern: 'Cost-Based Opt.',
                difficulty: 'Intermediate',
                available: true,
            },
            {
                name: 'How Git Works Internally',
                slug: 'how-git-works-internally',
                description: 'Blob, tree, and commit objects. SHA-1 content addressing. Branches as sticky notes on commits. Merge vs rebase as DAG transformations.',
                complexity: 'O(1) branch',
                space: 'O(commits)',
                pattern: 'DAG + Content Hash',
                difficulty: 'Intermediate',
                available: true,
            },
        ],
    },
];

function getDifficultyColor(d) {
    if (d === 'Beginner') return 'bg-green-500/20 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
}

export default function UnderTheHoodPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-zinc-300 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Monitor className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Under the Hood</h1>
                        <p className="text-xl text-zinc-200 max-w-2xl mx-auto">
                            CS Internals — visualized. From DNS lookups to CPU caches, from Python bytecode to virtual memory.
                            See exactly what happens at every layer of the stack.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tracks */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
                {tracks.map(track => {
                    const TrackIcon = track.icon;
                    return (
                        <section key={track.id}>
                            {/* Track header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700">
                                    <TrackIcon className="h-4.5 w-4.5 text-zinc-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{track.name}</h2>
                                    <p className="text-sm text-zinc-500">{track.desc}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {track.algorithms.map(algo => {
                                    const card = (
                                        <div className={`h-full flex flex-col bg-slate-900/70 rounded-2xl border overflow-hidden transition-colors group ${
                                            algo.available
                                                ? 'border-slate-700/50 hover:border-zinc-500/50'
                                                : 'border-slate-800/50 opacity-60 cursor-not-allowed'
                                        }`}>
                                            <div className="bg-gradient-to-br from-zinc-600 to-slate-700 p-5">
                                                <div className="flex items-center justify-between">
                                                    {algo.available
                                                        ? <Monitor className="h-7 w-7 text-white" />
                                                        : <Construction className="h-7 w-7 text-zinc-300/70" />
                                                    }
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                                        {algo.difficulty}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mt-3 leading-tight">{algo.name}</h3>
                                            </div>
                                            <div className="flex-1 flex flex-col p-5 gap-4">
                                                <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                                <div className="mt-auto space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Complexity</span>
                                                        <code className="bg-zinc-500/15 text-zinc-400 px-2 py-0.5 rounded text-xs">{algo.complexity}</code>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Pattern</span>
                                                        <code className="bg-zinc-500/15 text-zinc-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                                    </div>
                                                </div>
                                                {algo.available ? (
                                                    <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium group-hover:text-white transition-colors">
                                                        Start Visualization →
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">Coming Soon</span>
                                                )}
                                            </div>
                                        </div>
                                    );

                                    return algo.available ? (
                                        <Link key={algo.slug} href={`/under-the-hood/${algo.slug}`} className="h-full flex flex-col">
                                            {card}
                                        </Link>
                                    ) : (
                                        <div key={algo.slug} className="h-full flex flex-col">
                                            {card}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Why section */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why CS Internals?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            {
                                title: 'Interview Depth',
                                body: 'Senior engineers get asked what happens when you search a URL, how Python\'s GIL works, or what a race condition looks like. These visualizers build the mental models interviewers expect.',
                            },
                            {
                                title: 'Debug Faster',
                                body: 'Understanding DNS caching explains why a config change takes time to propagate. Knowing Python\'s reference counting explains why circular references can leak memory. Internals prevent mysterious bugs.',
                            },
                            {
                                title: 'Write Better Code',
                                body: 'Knowing about CPU cache lines makes you write cache-friendly array traversals. Understanding the event loop makes async code obvious. Seeing a vtable makes polymorphism intuitive.',
                            },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-zinc-300 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
