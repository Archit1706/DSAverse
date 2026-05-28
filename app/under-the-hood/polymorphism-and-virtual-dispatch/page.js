"use client";
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

export default function PolymorphismAndVirtualDispatchPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-12 max-w-lg">
                <Construction className="h-12 w-12 text-zinc-500 mx-auto mb-5" />
                <h1 className="text-2xl font-bold text-white mb-3">Polymorphism and Virtual Dispatch</h1>
                <p className="text-slate-400 mb-2 leading-relaxed">
                    C++ vtables in memory, vptr layout, the virtual function dispatch chain, and the cost difference between virtual and non-virtual calls.
                </p>
                <p className="text-zinc-600 text-sm mb-8">Coming soon — this visualizer is under construction.</p>
                <Link href="/under-the-hood"
                    className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Under the Hood
                </Link>
            </div>
        </div>
    );
}
