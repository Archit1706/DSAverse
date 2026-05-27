import Link from 'next/link';
import { ArrowLeft, Construction, ToggleLeft } from 'lucide-react';

export default function PowerOfTwoPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/bit-manipulation" className="flex items-center text-white hover:text-teal-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Bit Manipulation
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <ToggleLeft className="h-10 w-10" />Power of Two
                        </h1>
                        <p className="text-xl text-teal-100 mb-6 max-w-3xl mx-auto">
                            Check if a number is a power of two with a single bitwise AND.
                            Powers of two have exactly one set bit — <code className="bg-white/20 px-2 rounded">n &amp; (n−1) == 0</code> in O(1).
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(1)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Single Set Bit</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Beginner</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 py-24 text-center">
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-12">
                    <Construction className="h-14 w-14 text-teal-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">Visualizer Coming Soon</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        An interactive step-by-step visualization for Power of Two is currently being built.
                        You will be able to enter any number and see how n &amp; (n−1) reveals whether exactly one bit is set.
                    </p>
                    <Link href="/bit-manipulation"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
                        <ArrowLeft className="h-4 w-4" />Back to Bit Manipulation
                    </Link>
                </div>
            </div>
        </div>
    );
}
