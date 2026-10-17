export const metadata = {
    title: 'Splay Tree Visualizer – Zig, Zig-Zig and Zig-Zag',
    description: 'Visualize a splay tree rotating every accessed node to the root. Step through the zig, zig-zig and zig-zag cases and watch a repeated lookup get progressively cheaper.',
    keywords: ['splay tree', 'splaying', 'zig zig', 'zig zag', 'self-adjusting tree', 'amortised analysis', 'locality of reference', 'tree visualization'],
    openGraph: {
        title: 'Splay Tree Visualizer – DSAverse',
        description: 'Every access rotates its node to the root, so the keys you use most become the cheapest to reach.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/splay-trees' },
};
export default function Layout({ children }) { return children; }
