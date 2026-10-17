export const metadata = {
    title: 'Ternary Search Tree Visualizer – Three-Way Branching',
    description: 'Visualize a ternary search tree: one character per node with lower, equal and higher children. See how three-way branching trades a little speed for a large memory saving over a wide trie.',
    keywords: ['ternary search tree', 'TST', 'three-way branching', 'trie alternative', 'string index', 'prefix search', 'tree visualization'],
    openGraph: {
        title: 'Ternary Search Tree Visualizer – DSAverse',
        description: 'One character per node and three children — the memory-frugal middle ground between a BST and a trie.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/ternary-search-tree' },
};
export default function Layout({ children }) { return children; }
