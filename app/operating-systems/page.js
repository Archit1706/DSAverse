import Link from 'next/link';
import {
    ArrowLeft, MonitorCog, GanttChart, RefreshCw, Layers, Boxes, Landmark, Waypoints, Disc3,
    Zap, PackagePlus, UtensilsCrossed, Cpu, MemoryStick, ShieldCheck, Workflow, FolderTree, Container, Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the
    // suffix. Spelling it out here would double it.
    title: 'Operating Systems',
    description: 'Interactive visualizations of the algorithms inside an operating system: CPU scheduling, page replacement, memory allocation, deadlock avoidance and detection, disk scheduling, and synchronization.',
};

/* Cards come in three flavours:
     - built here          -> links to /operating-systems/<slug>
     - covered elsewhere   -> `href` + `coveredIn` link out to the existing page
     - not built yet       -> available: false, renders as a dead Coming Soon card
   Built pages are listed in the order of data/algorithmCategories.js; the
   Under the Hood explainers sit next to the topic they introduce. */
const algorithms = [
    {
        name: 'Processes vs Threads',
        slug: 'processes-vs-threads',
        href: '/under-the-hood/processes-vs-threads',
        coveredIn: 'Under the Hood',
        icon: Workflow,
        description: 'The units a scheduler hands the CPU to: separate address spaces, the process control block, and what threads share.',
        time: 'fork: O(1) CoW',
        space: 'separate AS',
        pattern: 'OS Scheduling',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'CPU Scheduling',
        slug: 'cpu-scheduling',
        icon: GanttChart,
        description: 'FCFS, SJF, SRTF and Priority on the same workload — watch the Gantt chart grow and the average waiting time move.',
        time: 'O(n log n)',
        space: 'O(n)',
        pattern: 'Scheduling Policy',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Round Robin Scheduling',
        slug: 'round-robin-scheduling',
        icon: RefreshCw,
        description: 'A ready queue that cycles every time quantum. Shrink the quantum and response improves while context switches pile up.',
        time: 'O(1) per dispatch',
        space: 'O(n) queue',
        pattern: 'Time Slicing',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Virtual Memory and Paging',
        slug: 'virtual-memory-and-paging',
        href: '/under-the-hood/virtual-memory-and-paging',
        coveredIn: 'Under the Hood',
        icon: MemoryStick,
        description: 'Page tables, the TLB and page faults — the machinery that page replacement has to manage when RAM runs out.',
        time: 'O(1) TLB hit',
        space: '4KB pages',
        pattern: 'MMU + Page Table',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Page Replacement',
        slug: 'page-replacement',
        icon: Layers,
        description: 'FIFO, LRU and Optimal deciding which frame to evict — including the reference string where more frames cause more faults.',
        time: 'O(n·f)',
        space: 'O(f) frames',
        pattern: 'Eviction Policy',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Memory Allocation',
        slug: 'memory-allocation',
        icon: Boxes,
        description: 'First, best, worst and next fit carving holes in memory until a request fails with enough space free — then compaction.',
        time: 'O(h) per request',
        space: 'O(h) hole list',
        pattern: 'Contiguous Allocation',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: "Banker's Algorithm",
        slug: 'bankers-algorithm',
        icon: Landmark,
        description: 'Allocation, Max, Need and Available — the safety check that finds a safe sequence before any request is granted.',
        time: 'O(m·n²)',
        space: 'O(m·n)',
        pattern: 'Deadlock Avoidance',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Deadlock Detection',
        slug: 'deadlock-detection',
        icon: Waypoints,
        description: 'Collapse a resource-allocation graph into a wait-for graph and walk it for a cycle, with the four Coffman conditions on screen.',
        time: 'O(V + E)',
        space: 'O(V)',
        pattern: 'Cycle Detection',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Disk Scheduling',
        slug: 'disk-scheduling',
        icon: Disc3,
        description: 'FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK plotted as head movement across the cylinders, with total seek distance.',
        time: 'O(n log n)',
        space: 'O(n)',
        pattern: 'Seek Optimisation',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'How a File System Works',
        slug: 'how-a-file-system-works',
        href: '/under-the-hood/how-a-file-system-works',
        coveredIn: 'Under the Hood',
        icon: FolderTree,
        description: 'Blocks, inodes, directory entries and journaling — what sits above the disk head that disk scheduling moves.',
        time: 'O(depth) lookup',
        space: '4 KB blocks',
        pattern: 'Inode + Journal',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Multithreading',
        slug: 'multithreading',
        href: '/under-the-hood/multithreading',
        coveredIn: 'Under the Hood',
        icon: Cpu,
        description: 'Time slicing, a first race condition, mutex locks and a two-lock deadlock — the overview the next three pages go deeper on.',
        time: 'O(1) ctx switch',
        space: '1–8 MB/thread',
        pattern: 'Shared Memory',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Race Conditions',
        slug: 'race-conditions',
        icon: Zap,
        description: 'Two threads run counter++ as load, add, store. Explore all twenty interleavings, then make them all correct with a mutex.',
        time: 'C(2k, k) interleavings',
        space: 'O(1) shared',
        pattern: 'Critical Section',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Producer-Consumer',
        slug: 'producer-consumer',
        icon: PackagePlus,
        description: 'A bounded buffer guarded by empty, full and mutex semaphores — producers and consumers blocking and waking each other.',
        time: 'O(1) per operation',
        space: 'O(N) buffer',
        pattern: 'Semaphores',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'Dining Philosophers',
        slug: 'dining-philosophers',
        icon: UtensilsCrossed,
        description: 'Five philosophers grab their left fork and deadlock. Number the forks, take the lower one first, and the cycle cannot close.',
        time: 'O(1) per pick-up',
        space: 'O(n) forks',
        pattern: 'Resource Ordering',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'System Calls and Kernel Mode',
        slug: 'system-calls-and-kernel-mode',
        href: '/under-the-hood/system-calls-and-kernel-mode',
        coveredIn: 'Under the Hood',
        icon: ShieldCheck,
        description: 'Protection rings and the trap into the kernel — how a process asks the OS for anything on this page.',
        time: '~50–200 ns',
        space: 'ring 3 → 0',
        pattern: 'Trap + Dispatch',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'CPU Cache Hierarchy',
        slug: 'cpu-cache-hierarchy',
        href: '/under-the-hood/cpu-cache-hierarchy',
        coveredIn: 'Under the Hood',
        icon: MonitorCog,
        description: 'L1, L2 and L3 cache lines and locality — the same hit-or-miss question page replacement asks, one level closer to the core.',
        time: 'L1: ~4 cycles',
        space: '64-byte lines',
        pattern: 'Cache Hierarchy',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'How Containers Work',
        slug: 'how-containers-work',
        href: '/under-the-hood/how-containers-work',
        coveredIn: 'Under the Hood',
        icon: Container,
        description: 'Namespaces and cgroups: isolation built from the kernel features a scheduler and memory manager already have.',
        time: 'ms startup',
        space: 'shared layers',
        pattern: 'Namespaces + cgroups',
        difficulty: 'Intermediate',
        available: true,
    },
];

/* The usual translucent badges vanish on a yellow header, so these sit on a
   dark backing. */
const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-slate-950/75 text-green-300';
    if (d === 'Intermediate') return 'bg-slate-950/75 text-yellow-300';
    return 'bg-slate-950/75 text-red-300';
};

export default function OperatingSystemsPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-yellow-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <MonitorCog className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Operating Systems</h1>
                        <p className="text-xl text-yellow-50 max-w-3xl mx-auto">
                            An operating system is a set of policies for sharing one machine. Watch a scheduler build its
                            Gantt chart, page frames fill and evict, a disk head sweep, and threads race, block and deadlock.
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
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-yellow-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-yellow-500 to-amber-600 p-6 ${!algo.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                            {algo.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{algo.name}</h3>
                                    {algo.coveredIn && (
                                        <span className="text-xs text-yellow-50/90">Covered in {algo.coveredIn}</span>
                                    )}
                                    {!algo.available && (
                                        <span className="text-xs text-yellow-50/80">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Time</span>
                                            <code className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded text-xs">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded text-xs">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded text-xs">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {!algo.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium group-hover:text-yellow-300 transition-colors">
                                            {algo.coveredIn ? `Open in ${algo.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={algo.href ?? `/operating-systems/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Operating Systems?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Every Program Runs Inside One', body: 'Your code never owns the CPU, the memory or the disk — it is lent them. Knowing the lending rules explains latency spikes, out-of-memory kills and why a busy machine feels slow.' },
                            { title: 'Policies Are Trade-offs', body: 'No scheduler, eviction policy or disk algorithm wins everywhere. Running them side by side on the same input shows exactly what each one gives up.' },
                            { title: 'Concurrency Bugs Hide in Interleavings', body: 'Race conditions and deadlocks appear only under some orderings of perfectly correct-looking code. Stepping through those orderings is the fastest way to learn to see them.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-yellow-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
