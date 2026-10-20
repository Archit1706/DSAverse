import RelatedPages from '@/components/RelatedPages';

export const metadata = {
    title: 'Trie Visualizer',
    description: 'Watch words inserted character by character into a Trie prefix tree, then search and test prefix matching.',
    keywords: ['trie', 'prefix tree', 'autocomplete', 'string search', 'word insert'],
    openGraph: {
        title: 'Trie Visualizer – DSAverse',
        description: 'Insert words character by character into a prefix tree, then watch search and prefix matching walk the edges.',
        images: [{ url: '/og-image.png' }],
    },
    alternates: { canonical: '/trees/trie' },
};
export default function Layout({ children }) {
    return (
        <>
            {children}
            <RelatedPages route="/trees/trie" />
        </>
    );
}
