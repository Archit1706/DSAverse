export const metadata = {
    title: 'Open Hash Tables (Separate Chaining) Visualizer',
    description: 'Visualize separate chaining: watch keys hash to slots, collide, and extend a chain instead of hunting for free space. See how the load factor drives average chain length and lookup cost.',
    keywords: ['open hashing', 'separate chaining', 'hash table', 'collision resolution', 'load factor', 'chain length', 'hash function', 'data structure visualization'],
    openGraph: {
        title: 'Open Hash Tables (Separate Chaining) – DSAverse',
        description: 'Watch keys hash into slots and collisions extend a chain, with the load factor driving every lookup.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/open-hash-tables' },
};
export default function Layout({ children }) { return children; }
