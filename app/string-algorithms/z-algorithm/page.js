import Link from 'next/link';
import { ArrowLeft, Construction, AlignLeft } from 'lucide-react';

export default function ZAlgorithmPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-fuchsia-600 to-pink-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/string-algorithms" className="flex items-center text-white hover:text-fuchsia-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to String Algorithms
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <AlignLeft className="h-10 w-10" />Z-Algorithm
                        </h1>
                        <p className="text-xl text-fuchsia-100 mb-6 max-w-3xl mx-auto">
                            Computes Z[i] — the length of the longest match between a prefix and the substring at position i.
                            Enables linear-time pattern matching by concatenating pattern + $ + text.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Z-Array</div>
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
                        An interactive step-by-step visualization for the Z-Algorithm is currently being built.
                        You will be able to watch the Z-box shrink and extend as each Z[i] value is computed.
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
