export const metadata = {
    title: 'Path Compression',
    description: 'Visualize path compression in Union-Find: after find(x), every node on the path points directly to the root, dramatically flattening tall trees.',
    keywords: ['path compression', 'union find', 'disjoint set', 'tree flattening', 'amortized', 'visualization'],
    openGraph: {
        title: 'Path Compression – DSAverse',
        description: 'After find(x), every node on the path points straight at the root, flattening a tall tree in a single pass.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/union-find/path-compression' },
};
export default function Layout({ children }) { return children; }
