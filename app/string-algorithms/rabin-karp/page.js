import Link from 'next/link';
import { ArrowLeft, Construction, Hash } from 'lucide-react';

export default function RabinKarpPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/string-algorithms" className="flex items-center text-white hover:text-fuchsia-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to String Algorithms
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Hash className="h-10 w-10" />Rabin-Karp
                        </h1>
                        <p className="text-xl text-fuchsia-100 mb-6 max-w-3xl mx-auto">
                            Uses a rolling hash to slide a window across the text in O(1) per step.
                            Hash matches trigger full verification; hash mismatches skip comparison entirely.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n + m) avg</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Rolling Hash</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Intermediate</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 py-24 text-center">
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-12">
                    <Construction className="h-14 w-14 text-fuchsia-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">Visualizer Coming Soon</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        An interactive step-by-step visualization for Rabin-Karp is currently being built.
                        You will be able to watch the rolling hash update as the window slides, and see hash collisions trigger character-by-character checks.
                    </p>
                    <Link href="/string-algorithms"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors font-medium">
                        <ArrowLeft className="h-4 w-4" />Back to String Algorithms
                    </Link>
                </div>
            </div>
        </div>
    );
}
