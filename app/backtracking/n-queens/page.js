import Link from 'next/link';
import { ArrowLeft, Construction, Crown } from 'lucide-react';

export default function NQueensBacktrackingPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link href="/backtracking" className="flex items-center text-white hover:text-indigo-200 transition-colors mb-6 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Backtracking
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
                            <Crown className="h-10 w-10" />N-Queens
                        </h1>
                        <p className="text-xl text-indigo-100 mb-6 max-w-3xl mx-auto">
                            Place N queens on an N×N chessboard so no two queens attack each other.
                            Backtracking places one queen per row, pruning columns and diagonals with conflicts.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">Time: O(n!)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Space: O(n²)</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Constraint Propagation</div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">Advanced</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 py-24 text-center">
                <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 p-12">
                    <Construction className="h-14 w-14 text-indigo-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-3">Visualizer Coming Soon</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        An interactive N-Queens backtracking visualizer is currently being built here.
                        You will be able to watch queens placed and removed row by row with attack-conflict highlighting.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/backtracking"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            <ArrowLeft className="h-4 w-4" />Back to Backtracking
                        </Link>
                        <Link href="/recursion/n-queens"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors font-medium">
                            View Recursion version
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
