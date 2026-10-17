export const metadata = {
    title: 'Segment Tree Visualizer',
    description: 'Build a segment tree from an array, then animate range-sum queries and point updates in O(log n).',
    keywords: ['segment tree', 'range query', 'point update', 'range sum', 'competitive programming'],
    openGraph: {
        title: 'Segment Tree Visualizer – DSAverse',
        description: 'Build a segment tree from an array, then animate O(log n) range-sum queries and point updates.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/trees/segment-tree' },
};
export default function Layout({ children }) { return children; }
