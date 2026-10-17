export const metadata = {
    title: 'Closest Pair of Points',
    description: 'Visualize the geometric divide & conquer algorithm: split the point set by a vertical line, recurse on each half, then check the δ-wide strip for cross-half pairs.',
    keywords: ['closest pair of points', 'geometric algorithm', 'divide and conquer', 'O(n log n)', 'computational geometry', 'visualization'],
    openGraph: {
        title: 'Closest Pair of Points – DSAverse',
        description: 'Geometric divide and conquer: split the points by a vertical line, recurse on each half, then scan the strip for cross-half pairs.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/divide-and-conquer/closest-pair-of-points' },
};

export default function Layout({ children }) {
    return children;
}
