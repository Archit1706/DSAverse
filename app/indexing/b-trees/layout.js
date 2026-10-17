export const metadata = {
    title: 'B-Tree Visualizer – Node Splits and Promotion',
    description: 'Visualize a B-tree growing: keys fill wide nodes, overflowing nodes split, and the median key is promoted to the parent. See why a B-tree stays shallow and every leaf ends at the same depth.',
    keywords: ['B-tree', 'node split', 'median promotion', 'balanced tree', 'database index', 'disk block', 'fanout', 'order m', 'tree visualization'],
    openGraph: {
        title: 'B-Tree Visualizer – DSAverse',
        description: 'Watch overflowing nodes split and promote their median key, growing the tree upward instead of downward.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/b-trees' },
};
export default function Layout({ children }) { return children; }
