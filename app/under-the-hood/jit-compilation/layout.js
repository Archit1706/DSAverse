export const metadata = {
    title: 'JIT Compilation',
    description: 'Visualize just-in-time compilation — profiling counters finding hot code, tiered compilation, type feedback and inline caches, speculative optimization with guards, and deoptimization when an assumption breaks.',
    keywords: ['jit', 'just in time compilation', 'tiered compilation', 'type feedback', 'inline cache', 'speculative optimization', 'deoptimization', 'v8', 'jvm', 'warmup'],
    openGraph: {
        title: 'JIT Compilation – DSAverse',
        description: 'Hot-loop profiling, tiered compilation, inline caches, speculative optimization, and deoptimization.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/under-the-hood/jit-compilation' },
};
export default function Layout({ children }) { return children; }
