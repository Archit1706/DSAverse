import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
    Compass, Home, BookOpen, ArrowRight,
    BarChart2, Search, Network, Cpu,
} from 'lucide-react';

export const metadata = {
    title: "Page Not Found",
    description: "That route does not exist on DSAverse. Browse the algorithm visualizers or head back to the homepage.",
    robots: { index: false, follow: true },
};

/* A few high-traffic destinations, so a bad URL is still one click from content */
const POPULAR = [
    {
        name: 'Sorting',
        href: '/sorting',
        desc: 'Bubble, Merge, Quick, Heap and five more',
        icon: BarChart2,
        grad: 'from-orange-600 to-amber-700',
        accent: 'text-orange-400',
    },
    {
        name: 'Searching',
        href: '/searching',
        desc: 'Binary, Jump, Interpolation and Ternary search',
        icon: Search,
        grad: 'from-red-600 to-rose-700',
        accent: 'text-red-400',
    },
    {
        name: 'Graph Algorithms',
        href: '/graph-algorithms',
        desc: 'BFS, DFS, Dijkstra, MSTs and topological sort',
        icon: Network,
        grad: 'from-cyan-600 to-sky-700',
        accent: 'text-cyan-400',
    },
    {
        name: 'Under the Hood',
        href: '/under-the-hood',
        desc: 'How runtimes, memory and the web actually work',
        icon: Cpu,
        grad: 'from-zinc-600 to-slate-700',
        accent: 'text-zinc-300',
    },
];

export default function NotFound() {
    return (
        <>
            <Navbar />
            <main className="pt-16">
                <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center px-4 py-16">
                    <div className="w-full max-w-3xl">

                        {/* Headline */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 mb-6 shadow-xl shadow-indigo-950/50">
                                <Compass className="h-8 w-8 text-white" />
                            </div>
                            <p className="text-7xl sm:text-8xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent leading-none">
                                404
                            </p>
                            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
                                This route has no visualizer
                            </h1>
                            <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                                The page you are looking for does not exist, or it may have moved.
                                Check the URL, or pick up one of the tracks below.
                            </p>
                        </div>

                        {/* Primary actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
                            <Link
                                href="/"
                                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 transition-all duration-200 hover:scale-105"
                            >
                                <Home className="h-4 w-4" />
                                Back to Homepage
                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                            <Link
                                href="/cheatsheet"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-200 bg-slate-900/70 border border-slate-700 hover:border-indigo-400 hover:text-white transition-all duration-200"
                            >
                                <BookOpen className="h-4 w-4" />
                                Complexity Cheatsheet
                            </Link>
                        </div>

                        {/* Popular sections */}
                        <div className="bg-slate-900/70 border-t border-slate-700/50 rounded-2xl p-6">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-5 text-center">
                                Popular sections
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {POPULAR.map(({ name, href, desc, icon: Icon, grad, accent }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="group flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/70 transition-all duration-200"
                                    >
                                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center`}>
                                            <Icon className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-semibold text-sm ${accent} group-hover:text-white transition-colors duration-200`}>
                                                {name}
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                                                {desc}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
