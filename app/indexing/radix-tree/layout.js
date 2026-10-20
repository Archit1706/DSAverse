import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Radix Tree Visualizer – Compressing a Trie',
    description: 'Visualize a radix tree built by collapsing a trie\'s single-child chains into one labelled edge. Watch the node count fall and see why path compression pays off on sparse key sets.',
    keywords: ['radix tree', 'patricia trie', 'path compression', 'compressed trie', 'prefix tree', 'string index', 'tree visualization'],
    openGraph: {
        title: 'Radix Tree Visualizer – DSAverse',
        description: 'Collapse a trie\'s single-child chains into one edge and watch the node count drop.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/indexing/radix-tree' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/indexing/radix-tree" />
        </>
    );
}
