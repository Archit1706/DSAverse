export const metadata = {
    title: 'B+ Tree Visualizer – Linked Leaves and Range Scans',
    description: 'Visualize a B+ tree: every value lives in a leaf, internal nodes hold only separators, and the leaves form a linked list. Watch a split copy its key upward and a range scan walk sideways.',
    keywords: ['B+ tree', 'linked leaves', 'range scan', 'database index', 'separator key', 'copy up', 'clustered index', 'tree visualization'],
    openGraph: {
        title: 'B+ Tree Visualizer – DSAverse',
        description: 'All values in linked leaves, so a range scan walks sideways instead of climbing back up the tree.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/b-plus-trees' },
};
export default function Layout({ children }) { return children; }
